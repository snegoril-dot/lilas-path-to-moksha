import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { createLovableAiGatewayProvider, GURU_SYSTEM_PROMPT } from "@/lib/ai-gateway.server";
import { BOARD, getLoka } from "@/lib/lila-board";
import { getCellExperience } from "@/lib/cell-experience";

const DAILY_LIMIT = 10;
const BURST_WINDOW_MS = 60_000; // 1 минута
const BURST_MAX = 6; // не более 6 сообщений в минуту от одного пользователя
const FALLBACK_MSG = "Гуру сейчас молчит. Попробуй вернуться к вопросу чуть позже.";
const LIMIT_MSG = `Вы достигли дневного лимита сообщений Гуру (${DAILY_LIMIT}/день). Пожалуйста, попробуйте завтра.`;
const BURST_MSG = "Слишком много сообщений подряд. Сделай паузу и попробуй через минуту.";

// In-memory sliding window per user. Worker-instance-scoped:
// защищает от burst в рамках одного воркера, дневной лимит остаётся в БД.
const burstBuckets = new Map<string, number[]>();
function checkBurst(userId: string): boolean {
  const now = Date.now();
  const arr = burstBuckets.get(userId) ?? [];
  const fresh = arr.filter((t) => now - t < BURST_WINDOW_MS);
  if (fresh.length >= BURST_MAX) {
    burstBuckets.set(userId, fresh);
    return false;
  }
  fresh.push(now);
  burstBuckets.set(userId, fresh);
  // мягкий GC чтоб мапа не росла
  if (burstBuckets.size > 5000) {
    for (const [k, v] of burstBuckets) {
      if (!v.some((t) => now - t < BURST_WINDOW_MS)) burstBuckets.delete(k);
    }
  }
  return true;
}

const messagePartSchema = z.object({
  type: z.string(),
  text: z.string().max(1000).optional(),
}).passthrough();

const uiMessageSchema = z.object({
  id: z.string().optional(),
  role: z.enum(["system", "user", "assistant"]),
  parts: z.array(messagePartSchema).max(64),
}).passthrough();

const bodySchema = z.object({
  messages: z.array(uiMessageSchema).min(1).max(50),
  cell: z.number().int().min(1).max(72).optional(),
  sankalpa: z.string().max(500).optional(),
  eventKind: z.enum(["normal", "snake", "ladder", "moksha", "waiting"]).optional(),
  includeLastReflection: z.string().max(1200).optional(),
  recentPath: z
    .array(
      z.object({
        cell: z.number().int().min(0).max(72),
        kind: z.string().max(32),
        to: z.number().int().min(0).max(72).optional(),
      }),
    )
    .max(32)
    .optional(),
});

function totalMessageChars(messages: z.infer<typeof uiMessageSchema>[]) {
  let n = 0;
  for (const m of messages) {
    for (const p of m.parts) {
      if (typeof p.text === "string") n += p.text.length;
    }
  }
  return n;
}

function log(status: string, extra: Record<string, unknown> = {}) {
  try {
    console.log(
      JSON.stringify({ scope: "guru.chat", status, at: new Date().toISOString(), ...extra }),
    );
  } catch {
    // noop
  }
}

export const Route = createFileRoute("/api/guru/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // 1. Auth: bearer token required
        const authHeader = request.headers.get("Authorization") ?? "";
        const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
        if (!token) {
          log("unauthorized_no_token");
          return Response.json({ error: "unauthorized" }, { status: 401 });
        }

        const SUPABASE_URL = process.env.SUPABASE_URL;
        const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
        if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
          log("misconfigured_supabase");
          return Response.json({ error: "server_not_configured" }, { status: 500 });
        }

        const userClient = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const { data: userData, error: userErr } = await userClient.auth.getUser();
        if (userErr || !userData?.user) {
          log("unauthorized_invalid_token");
          return Response.json({ error: "unauthorized" }, { status: 401 });
        }
        const userId = userData.user.id;

        // 1.5. Burst rate limit (in-memory sliding window)
        if (!checkBurst(userId)) {
          log("burst_limited", { userId });
          return Response.json({ error: BURST_MSG }, { status: 429 });
        }



        // 2. Validate payload
        let raw: unknown;
        try {
          raw = await request.json();
        } catch {
          log("bad_json", { userId });
          return Response.json({ error: "invalid_payload" }, { status: 400 });
        }
        const parsed = bodySchema.safeParse(raw);
        if (!parsed.success) {
          log("invalid_payload", { userId });
          return Response.json({ error: "invalid_payload" }, { status: 400 });
        }
        const body = parsed.data;
        if (totalMessageChars(body.messages) > 8000) {
          log("payload_too_large", { userId });
          return Response.json({ error: "payload_too_large" }, { status: 413 });
        }
        // last user message length check (single message max 1000)
        const lastUser = [...body.messages].reverse().find((m) => m.role === "user");
        const lastText =
          lastUser?.parts.map((p) => (typeof p.text === "string" ? p.text : "")).join("") ?? "";
        if (!lastText.trim()) {
          log("empty_message", { userId });
          return Response.json({ error: "message_required" }, { status: 400 });
        }
        if (lastText.length > 1000) {
          log("message_too_long", { userId });
          return Response.json({ error: "message_too_long" }, { status: 400 });
        }

        // 3. Rate limit via service-role RPC
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: rl, error: rlErr } = await supabaseAdmin.rpc("increment_guru_usage", {
          _user_id: userId,
          _limit: DAILY_LIMIT,
        });
        if (rlErr) {
          log("rate_limit_error", { userId, err: rlErr.message });
          // fail closed on limiter error to protect costs
          return Response.json({ error: FALLBACK_MSG }, { status: 503 });
        }
        const row = Array.isArray(rl) ? rl[0] : rl;
        if (!row?.allowed) {
          log("rate_limited", { userId, cell: body.cell });
          return Response.json({ error: LIMIT_MSG }, { status: 429 });
        }

        // 4. AI call
        const key = process.env.LOVABLE_API_KEY;
        if (!key) {
          log("no_ai_key", { userId });
          return Response.json({ error: FALLBACK_MSG }, { status: 503 });
        }

        const cell = body.cell ? BOARD[body.cell - 1] : null;
        const loka = body.cell ? getLoka(body.cell) : null;
        const exp = body.cell ? getCellExperience(body.cell) : null;
        const eventLabel =
          body.eventKind === "snake"
            ? "Игрок только что упал по змее — это возврат к неосознанному качеству, не наказание."
            : body.eventKind === "ladder"
              ? "Игрок только что поднялся по стреле — активировалось качество сознания."
              : body.eventKind === "moksha"
                ? "Игрок достиг Мокши (клетка 68). Это освобождение — говори тихо и глубоко."
                : body.eventKind === "waiting"
                  ? "Игрок ещё ждёт входа в игру (нужна шестёрка)."
                  : "Обычный ход на клетке — помоги увидеть её как зеркало.";

        const context = [
          GURU_SYSTEM_PROMPT,
          eventLabel,
          cell
            ? `Клетка ${cell.id} — «${cell.name}».\nМудрость: ${cell.wisdom}`
            : "Игрок ещё не воплощён на доске.",
          exp
            ? `Краткий смысл: ${exp.shortMeaning}\nВопрос для рефлексии: ${exp.reflectionQuestion}\nПрактика на сегодня: ${exp.dailyPractice}`
            : "",
          loka ? `Активный план сознания: ${loka.name}. ${loka.hint}.` : "",
          body.sankalpa ? `Санкальпа игрока: «${body.sankalpa}».` : "Санкальпа не задана — не додумывай её.",
          body.recentPath && body.recentPath.length
            ? `Недавний путь (только для контекста, не пересказывай его): ${body.recentPath
                .slice(-8)
                .map((p) => `${p.cell}${p.to ? `→${p.to}` : ""}(${p.kind})`)
                .join(", ")}`
            : "",
          body.includeLastReflection
            ? `Игрок явно попросил учесть свою последнюю заметку: «${body.includeLastReflection}». Опирайся на неё бережно.`
            : "",
        ]
          .filter(Boolean)
          .join("\n\n");

        try {
          const gateway = createLovableAiGatewayProvider(key);
          const result = streamText({
            model: gateway("google/gemini-3-flash-preview"),
            system: context,
            messages: await convertToModelMessages(body.messages as UIMessage[]),
            onError: (err) => {
              log("ai_stream_error", {
                userId,
                cell: body.cell,
                err: err instanceof Error ? err.message : String(err),
              });
            },
          });
          log("ok", { userId, cell: body.cell });
          return result.toUIMessageStreamResponse();
        } catch (e) {
          log("ai_error", {
            userId,
            cell: body.cell,
            err: e instanceof Error ? e.message : "unknown",
          });
          return Response.json({ error: FALLBACK_MSG }, { status: 502 });
        }
      },
    },
  },
});

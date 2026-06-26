import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

// --- Save reflection (with optional AI insight) ---
const SaveReflectionInput = z.object({
  sessionId: z.string().uuid().nullable().optional(),
  cell: z.number().int().min(1).max(72),
  userText: z.string().max(800),
  withAi: z.boolean().default(false),
  prompt: z.string().max(400).optional(),
  sankalpa: z.string().max(400).optional(),
});

export const saveReflection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SaveReflectionInput.parse(d))
  .handler(async ({ data, context }) => {
    let aiReflection: string | null = null;

    if (data.withAi) {
      const key = process.env.LOVABLE_API_KEY;
      if (key) {
        const { BOARD, getLoka } = await import("@/lib/lila-board");
        const { createLovableAiGatewayProvider, GURU_SYSTEM_PROMPT } = await import(
          "@/lib/ai-gateway.server"
        );
        const { generateText } = await import("ai");
        const cell = BOARD[data.cell - 1];
        const loka = getLoka(data.cell);
        const gateway = createLovableAiGatewayProvider(key);
        try {
          const res = await generateText({
            model: gateway("google/gemini-3-flash-preview"),
            system: GURU_SYSTEM_PROMPT,
            prompt: [
              `Игрок только что прошёл через клетку ${cell.id} — «${cell.name}» (${cell.wisdom}).`,
              loka ? `План сознания: ${loka.name}.` : "",
              data.sankalpa ? `Его Санкальпа: «${data.sankalpa}».` : "",
              data.prompt ? `Вопрос: ${data.prompt}` : "",
              `Заметка игрока: «${data.userText || "(пусто)"}».`,
              "Дай мягкий отклик 3–5 предложений и заверши одним встречным вопросом.",
            ]
              .filter(Boolean)
              .join("\n"),
          });
          aiReflection = res.text;
        } catch (e) {
          console.error("[saveReflection] AI failed", e);
        }
      }
    }

    const { data: row, error } = await context.supabase
      .from("journal_entries")
      .insert({
        user_id: context.userId,
        session_id: data.sessionId ?? null,
        cell: data.cell,
        prompt: data.prompt ?? null,
        user_text: data.userText,
        ai_reflection: aiReflection,
        kind: "reflection",
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

// --- Journal list ---
export const getJournal = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ limit: z.number().int().min(1).max(100).default(50) }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("journal_entries")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

// --- Save game session summary ---
const SaveSessionInput = z.object({
  sankalpa: z.string().max(400).optional(),
  result: z.enum(["moksha", "abandoned", "in_progress"]),
  movesCount: z.number().int().min(0),
  path: z
    .array(
      z.object({
        cell: z.number().int(),
        kind: z.string(),
        to: z.number().int().optional(),
      })
    )
    .max(500)
    .default([]),
});

export const saveSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SaveSessionInput.parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("game_sessions")
      .insert({
        user_id: context.userId,
        sankalpa: data.sankalpa ?? null,
        result: data.result,
        moves_count: data.movesCount,
        path: data.path,
        finished_at: data.result === "in_progress" ? null : new Date().toISOString(),
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

// --- All sessions of the current user (for achievements) ---
export const getMySessions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("game_sessions")
      .select("id, result, moves_count, started_at, finished_at, sankalpa, path")
      .order("started_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return data ?? [];
  });


// --- Weekly recommendations ---
function startOfWeekIso(d = new Date()): string {
  const date = new Date(d);
  const day = (date.getUTCDay() + 6) % 7; // Mon=0
  date.setUTCDate(date.getUTCDate() - day);
  return date.toISOString().slice(0, 10);
}

export const getLatestWeekly = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("weekly_recommendations")
      .select("*")
      .order("week_start", { ascending: false })
      .limit(10);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const PracticeSchema = z.object({
  title: z.string(),
  description: z.string(),
  daily_minutes: z.number().int().min(1).max(120),
});

export const generateWeekly = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const week = startOfWeekIso();

    // Rate-limit: one per week per user (replace allowed).
    const sinceIso = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: sessions } = await context.supabase
      .from("game_sessions")
      .select("sankalpa, result, moves_count, path, started_at")
      .gte("started_at", sinceIso)
      .order("started_at", { ascending: false })
      .limit(20);
    const { data: journal } = await context.supabase
      .from("journal_entries")
      .select("cell, user_text, ai_reflection, kind, created_at")
      .gte("created_at", sinceIso)
      .order("created_at", { ascending: false })
      .limit(30);

    if (!sessions || sessions.length === 0) {
      throw new Error("Сначала заверши хотя бы одну партию, чтобы получить рекомендации.");
    }

    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("AI gateway is not configured");

    const { createLovableAiGatewayProvider, GURU_SYSTEM_PROMPT } = await import(
      "@/lib/ai-gateway.server"
    );
    const { generateText } = await import("ai");
    const gateway = createLovableAiGatewayProvider(key);

    const summary = {
      sessionsCount: sessions.length,
      sankalpas: [...new Set(sessions.map((s) => s.sankalpa).filter(Boolean))],
      moksha: sessions.filter((s) => s.result === "moksha").length,
      paths: sessions.slice(0, 5).map((s) => s.path),
      notes: (journal ?? []).slice(0, 10).map((j) => ({
        cell: j.cell,
        text: j.user_text,
      })),
    };

    let parsed: { summary: string; focus_loka: string; practices: z.infer<typeof PracticeSchema>[] };
    try {
      const res = await generateText({
        model: gateway("google/gemini-3-flash-preview"),
        system:
          GURU_SYSTEM_PROMPT +
          "\n\nВ этом ответе верни ТОЛЬКО валидный JSON без markdown, по схеме: " +
          '{"summary": string, "focus_loka": string, "practices": [{"title": string, "description": string, "daily_minutes": number}]}',
        prompt:
          "На основе истории игр (JSON ниже) дай еженедельный план духовной практики на 7 дней. " +
          "Определи доминирующий план сознания (loka), на котором игрок задерживается, " +
          "и предложи 3–4 практики. summary — 2–3 предложения наставления. " +
          "focus_loka — короткое название плана.\n\nИстория:\n" +
          JSON.stringify(summary, null, 2),
      });
      const raw = res.text.trim().replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
      const obj = JSON.parse(raw);
      parsed = {
        summary: String(obj.summary ?? ""),
        focus_loka: String(obj.focus_loka ?? ""),
        practices: z.array(PracticeSchema).parse(obj.practices ?? []),
      };
    } catch (e) {
      throw new Error(e instanceof Error ? e.message : "AI generation failed");
    }

    const { data: row, error } = await context.supabase
      .from("weekly_recommendations")
      .upsert(
        {
          user_id: context.userId,
          week_start: week,
          summary: parsed.summary,
          focus_loka: parsed.focus_loka,
          practices: parsed.practices,
        },
        { onConflict: "user_id,week_start" }
      )
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

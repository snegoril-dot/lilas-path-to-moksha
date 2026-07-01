/**
 * Cron endpoint: рассылает напоминания об активных практиках клетки.
 *
 * Вызывается каждые 5 минут через pg_cron / внешний cron.
 * Защищено shared-secret заголовком `x-cron-secret`.
 *
 * Правила:
 *   - Пользователь включил `practice_reminders.enabled = true`.
 *   - У профиля есть `telegram_id` (иначе слать некуда).
 *   - Есть активная сессия (status='active') с `due_at` в окне
 *     [now() − 6h, now() + 30m].
 *   - `reminder_sent_at` пуст (одно напоминание на сессию).
 */
import { createFileRoute } from "@tanstack/react-router";
import { createSupabaseServerAdminClient } from "@/integrations/supabase/client.server";
import { BOARD } from "@/lib/lila-board";
import { pickReminderCopy } from "@/content/reminder-copy";

const TELEGRAM_API = "https://api.telegram.org";

async function sendTelegramMessage(token: string, chatId: number, text: string) {
  const res = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    }),
  });
  return res.ok;
}

async function handle(request: Request) {
  const secret = process.env.PRACTICE_CRON_SECRET;
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!secret || !token) {
    return Response.json({ ok: false, error: "not_configured" }, { status: 500 });
  }
  if (request.headers.get("x-cron-secret") !== secret) {
    return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  const supabase = createSupabaseServerAdminClient();
  const now = Date.now();
  const from = new Date(now - 6 * 60 * 60 * 1000).toISOString();
  const to = new Date(now + 30 * 60 * 1000).toISOString();

  const { data: sessions, error } = await supabase
    .from("practice_sessions")
    .select("id, user_id, cell_id, due_at")
    .eq("status", "active")
    .is("reminder_sent_at", null)
    .not("due_at", "is", null)
    .gte("due_at", from)
    .lte("due_at", to)
    .limit(200);

  if (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
  if (!sessions?.length) {
    return Response.json({ ok: true, sent: 0, checked: 0 });
  }

  const userIds = Array.from(new Set(sessions.map((s) => s.user_id)));
  const [{ data: prefs }, { data: profiles }] = await Promise.all([
    supabase.from("practice_reminders").select("user_id, enabled").in("user_id", userIds),
    supabase.from("profiles").select("id, telegram_id").in("id", userIds),
  ]);

  const prefsMap = new Map(prefs?.map((p) => [p.user_id, p.enabled]) ?? []);
  const chatMap = new Map(profiles?.map((p) => [p.id, p.telegram_id]) ?? []);

  let sent = 0;
  for (const s of sessions) {
    if (!prefsMap.get(s.user_id)) continue;
    const chatId = chatMap.get(s.user_id);
    if (!chatId) continue;

    const cell = BOARD[s.cell_id - 1];
    if (!cell) continue;

    const due = s.due_at ? new Date(s.due_at).getTime() : now;
    const kind = due <= now ? "due_now" : "due_soon";
    const copy = pickReminderCopy(kind, s.cell_id, cell.name);
    const text = `<b>${copy.title}</b>\n\n${copy.body}`;

    const okSend = await sendTelegramMessage(token, chatId, text);
    if (okSend) {
      sent += 1;
      await supabase
        .from("practice_sessions")
        .update({ reminder_sent_at: new Date().toISOString() })
        .eq("id", s.id);
    }
  }

  return Response.json({ ok: true, sent, checked: sessions.length });
}

export const Route = createFileRoute("/api/public/practice/send-reminders")({
  server: {
    handlers: {
      GET: ({ request }) => handle(request),
      POST: ({ request }) => handle(request),
    },
  },
});

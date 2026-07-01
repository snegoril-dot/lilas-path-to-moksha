/**
 * Cron endpoint: рассылает еженедельный дайджест — «Что показала тебе неделя».
 *
 * Логика:
 *   - `practice_reminders.enabled = true` и `profiles.telegram_id != null`.
 *   - За последние 7 дней у пользователя ≥ 1 записи в journal_entries.
 *   - Идемпотентность: не слать чаще раза в 6 дней (по analytics_events).
 *
 * Рекомендуемое расписание: воскресенье 18:00 UTC (`0 18 * * 0`).
 * Защита: заголовок `x-cron-secret`.
 */
import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendTelegramMessage } from "@/lib/telegram-notify.server";

const EVENT = "weekly_digest_sent";
const COOLDOWN_MS = 6 * 24 * 60 * 60 * 1000;

async function handle(request: Request) {
  const secret = process.env.PRACTICE_CRON_SECRET;
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!secret || !token) {
    return Response.json({ ok: false, error: "not_configured" }, { status: 500 });
  }
  if (request.headers.get("x-cron-secret") !== secret) {
    return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  const supabase = supabaseAdmin;
  const sinceIso = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: rows, error } = await supabase
    .from("journal_entries")
    .select("user_id, cell, created_at")
    .gte("created_at", sinceIso)
    .limit(2000);
  if (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }

  const byUser = new Map<string, Set<number>>();
  for (const r of rows ?? []) {
    if (!r.user_id || !r.cell) continue;
    let set = byUser.get(r.user_id);
    if (!set) {
      set = new Set();
      byUser.set(r.user_id, set);
    }
    set.add(r.cell);
  }
  if (byUser.size === 0) {
    return Response.json({ ok: true, sent: 0, checked: 0 });
  }

  const userIds = Array.from(byUser.keys());
  const [{ data: prefs }, { data: profiles }, { data: recent }] = await Promise.all([
    supabase.from("practice_reminders").select("user_id, enabled").in("user_id", userIds),
    supabase.from("profiles").select("id, telegram_id").in("id", userIds),
    supabase
      .from("analytics_events")
      .select("user_id, created_at")
      .eq("event_name", EVENT)
      .gte("created_at", new Date(Date.now() - COOLDOWN_MS).toISOString())
      .in("user_id", userIds),
  ]);

  const prefsMap = new Map((prefs ?? []).map((p) => [p.user_id, Boolean(p.enabled)]));
  const chatMap = new Map<string, number>(
    (profiles ?? [])
      .filter((p): p is { id: string; telegram_id: number } => typeof p.telegram_id === "number")
      .map((p) => [p.id, p.telegram_id]),
  );
  const alreadySent = new Set((recent ?? []).map((r) => r.user_id).filter(Boolean) as string[]);

  let sent = 0;
  for (const [userId, cells] of byUser) {
    if (!prefsMap.get(userId)) continue;
    if (alreadySent.has(userId)) continue;
    const chatId = chatMap.get(userId);
    if (!chatId) continue;

    const cellCount = cells.size;
    const cellsPreview = Array.from(cells).slice(0, 3).join(" · ");
    const text =
      `<b>Что показала тебе неделя</b>\n\n` +
      `За 7 дней ты прошёл ${cellCount} ${cellCount === 1 ? "клетку" : "клеток"}` +
      (cellsPreview ? ` (${cellsPreview}).` : ".") +
      `\n\nОткрой недельный обзор — там заметки, шкала резонанса и приглашение к следующему шагу.`;

    const ok = await sendTelegramMessage(chatId, text);
    if (ok) {
      sent += 1;
      await (supabase as any).from("analytics_events").insert({
        user_id: userId,
        event_name: EVENT,
        metadata: { cell_count: cellCount },
      });
    }
  }

  return Response.json({ ok: true, sent, checked: byUser.size });
}

export const Route = createFileRoute("/api/public/weekly/send-digest")({
  server: {
    handlers: {
      GET: ({ request }) => handle(request),
      POST: ({ request }) => handle(request),
    },
  },
});

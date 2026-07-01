// Server-only helper: send an alert message to admin Telegram chat.
// Requires env:
//   TELEGRAM_BOT_TOKEN — bot token
//   ADMIN_TG_CHAT_ID   — numeric chat id of the admin/ops channel
// Silent no-op if either is missing so healthchecks don't cascade-fail.

const TELEGRAM_API = "https://api.telegram.org";

export async function notifyAdmin(text: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.ADMIN_TG_CHAT_ID;
  if (!token || !chatId) return false;
  try {
    const res = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: text.slice(0, 3500),
        disable_web_page_preview: true,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

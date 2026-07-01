/**
 * Отправка push-уведомлений через Telegram Bot API.
 * Server-only: использует TELEGRAM_BOT_TOKEN.
 */
const TELEGRAM_API = "https://api.telegram.org";

export async function sendTelegramMessage(
  chatId: number,
  text: string,
  opts?: { silent?: boolean },
): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return false;
  try {
    const res = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
        disable_notification: opts?.silent === true,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Найти telegram_id пользователя и проверить, что уведомления включены.
 * Возвращает chatId либо null.
 */
export async function resolveNotifiableChatId(
  supabase: {
    from: (t: string) => {
      select: (c: string) => {
        eq: (col: string, val: string) => {
          maybeSingle: () => Promise<{ data: { telegram_id: number | null } | null }>;
        };
      };
    };
  },
  userId: string,
  opts?: { requireEnabled?: boolean },
): Promise<number | null> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("telegram_id")
    .eq("id", userId)
    .maybeSingle();
  const chatId = profile?.telegram_id;
  if (typeof chatId !== "number") return null;

  if (opts?.requireEnabled) {
    const { data: pref } = await (supabase as any)
      .from("practice_reminders")
      .select("enabled")
      .eq("user_id", userId)
      .maybeSingle();
    if (pref && pref.enabled === false) return null;
  }
  return chatId;
}

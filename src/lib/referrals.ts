/**
 * Клиентские хелперы реферальной программы.
 * Реферальный код = первые 12 символов sha-256 от user_id (детерминировано).
 * Сама выдача +7 дней Deep Guru — только на сервере (см. referrals.functions.ts).
 */

const BOT_USERNAME =
  (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_TELEGRAM_BOT_USERNAME ??
  "lila_moksha_bot";

async function sha256Hex(input: string): Promise<string> {
  const enc = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function getRefCode(userId: string): Promise<string> {
  return (await sha256Hex(`lila-ref:${userId}`)).slice(0, 12);
}

export async function getReferralLink(userId: string): Promise<string> {
  const code = await getRefCode(userId);
  return `https://t.me/${BOT_USERNAME}?startapp=ref_${code}`;
}

export function parseRefFromStartParam(param: string | null | undefined): string | null {
  if (!param) return null;
  const m = /^ref_([0-9a-f]{6,32})$/i.exec(param);
  return m ? m[1].toLowerCase() : null;
}

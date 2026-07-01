import { createHmac } from "crypto";

export interface TelegramUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  photo_url?: string;
  allows_write_to_pm?: boolean;
}

export interface ValidatedInitData {
  user: TelegramUser;
  auth_date: number;
  query_id?: string;
  start_param?: string;
}

export type ValidationError =
  | "missing"
  | "malformed"
  | "no_hash"
  | "no_user"
  | "bad_signature"
  | "expired";

export interface ValidationResult {
  ok: boolean;
  data?: ValidatedInitData;
  error?: ValidationError;
}

/**
 * Validate Telegram Mini App initData per
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 *
 * @param initData Raw `window.Telegram.WebApp.initData` string.
 * @param botToken Bot token from @BotFather.
 * @param maxAgeSeconds Reject payloads older than this many seconds. Default 24h.
 */
export function validateTelegramInitData(
  initData: string,
  botToken: string,
  maxAgeSeconds = 86400,
): ValidationResult {
  if (!initData) return { ok: false, error: "missing" };
  if (!botToken) return { ok: false, error: "malformed" };

  let params: URLSearchParams;
  try {
    params = new URLSearchParams(initData);
  } catch {
    return { ok: false, error: "malformed" };
  }

  const hash = params.get("hash");
  if (!hash) return { ok: false, error: "no_hash" };

  // Build data_check_string: all fields except hash, sorted alphabetically, joined by \n.
  const pairs: string[] = [];
  params.forEach((value, key) => {
    if (key === "hash") return;
    pairs.push(`${key}=${value}`);
  });
  pairs.sort();
  const dataCheckString = pairs.join("\n");

  const secretKey = createHmac("sha256", "WebAppData").update(botToken).digest();
  const computed = createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

  if (computed !== hash) return { ok: false, error: "bad_signature" };

  const authDate = Number(params.get("auth_date") ?? "0");
  if (!authDate || Number.isNaN(authDate)) return { ok: false, error: "malformed" };
  const nowSec = Math.floor(Date.now() / 1000);
  if (nowSec - authDate > maxAgeSeconds) return { ok: false, error: "expired" };

  const userRaw = params.get("user");
  if (!userRaw) return { ok: false, error: "no_user" };
  let user: TelegramUser;
  try {
    user = JSON.parse(userRaw);
  } catch {
    return { ok: false, error: "malformed" };
  }
  if (typeof user.id !== "number") return { ok: false, error: "no_user" };

  return {
    ok: true,
    data: {
      user,
      auth_date: authDate,
      query_id: params.get("query_id") ?? undefined,
      start_param: params.get("start_param") ?? undefined,
    },
  };
}

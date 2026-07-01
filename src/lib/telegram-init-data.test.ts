import { describe, it, expect } from "vitest";
import { createHmac } from "crypto";
import { validateTelegramInitData } from "./telegram-init-data";

const BOT_TOKEN = "123456:TEST-BOT-TOKEN";

function sign(fields: Record<string, string>, token = BOT_TOKEN): string {
  const pairs = Object.entries(fields)
    .map(([k, v]) => `${k}=${v}`)
    .sort();
  const dataCheckString = pairs.join("\n");
  const secret = createHmac("sha256", "WebAppData").update(token).digest();
  const hash = createHmac("sha256", secret).update(dataCheckString).digest("hex");
  const params = new URLSearchParams({ ...fields, hash });
  return params.toString();
}

const nowSec = () => Math.floor(Date.now() / 1000);

describe("validateTelegramInitData", () => {
  it("accepts a correctly signed payload", () => {
    const initData = sign({
      auth_date: String(nowSec()),
      user: JSON.stringify({ id: 42, first_name: "Arjuna", username: "arjuna" }),
      query_id: "AAH-test",
    });
    const res = validateTelegramInitData(initData, BOT_TOKEN);
    expect(res.ok).toBe(true);
    expect(res.data?.user.id).toBe(42);
    expect(res.data?.user.username).toBe("arjuna");
  });

  it("rejects missing initData", () => {
    expect(validateTelegramInitData("", BOT_TOKEN)).toEqual({ ok: false, error: "missing" });
  });

  it("rejects payload without hash", () => {
    const params = new URLSearchParams({ auth_date: "1", user: "{}" });
    expect(validateTelegramInitData(params.toString(), BOT_TOKEN).error).toBe("no_hash");
  });

  it("rejects a bad signature", () => {
    const initData = sign({
      auth_date: String(nowSec()),
      user: JSON.stringify({ id: 1 }),
    }, "other-token");
    expect(validateTelegramInitData(initData, BOT_TOKEN).error).toBe("bad_signature");
  });

  it("rejects tampered fields", () => {
    const initData = sign({
      auth_date: String(nowSec()),
      user: JSON.stringify({ id: 1 }),
    });
    const tampered = initData.replace("%22id%22%3A1", "%22id%22%3A999");
    expect(validateTelegramInitData(tampered, BOT_TOKEN).error).toBe("bad_signature");
  });

  it("rejects expired payloads", () => {
    const initData = sign({
      auth_date: String(nowSec() - 60 * 60 * 25),
      user: JSON.stringify({ id: 1 }),
    });
    expect(validateTelegramInitData(initData, BOT_TOKEN).error).toBe("expired");
  });

  it("rejects payload with no user field", () => {
    const initData = sign({ auth_date: String(nowSec()) });
    expect(validateTelegramInitData(initData, BOT_TOKEN).error).toBe("no_user");
  });
});

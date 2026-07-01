/**
 * Серверная сторона рефералов: сопоставляет ref-код с реферером и выдаёт
 * ему +7 дней DEEP_GURU. Идемпотентно (UNIQUE referred_user_id).
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createHash } from "crypto";

function refCodeFor(userId: string): string {
  return createHash("sha256").update(`lila-ref:${userId}`).digest("hex").slice(0, 12);
}

export const claimReferral = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ refCode: z.string().min(6).max(32) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const code = data.refCode.toLowerCase();

    // Уже привязан?
    const { data: existing } = await supabaseAdmin
      .from("referrals")
      .select("id")
      .eq("referred_user_id", context.userId)
      .maybeSingle();
    if (existing) return { ok: true, alreadyClaimed: true as const };

    // Найти реферера. Перебираем недавних пользователей — оптимальнее хранить
    // ref_code в profiles, но для MVP хватит поиска по user_id.
    // Реализация через RPC-функцию была бы чище; здесь простая проверка:
    // ищем среди последних 5000 профилей.
    const { data: candidates } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .limit(5000);
    let referrerId: string | null = null;
    for (const c of (candidates ?? []) as { id: string }[]) {
      if (refCodeFor(c.id) === code) {
        referrerId = c.id;
        break;
      }
    }
    if (!referrerId || referrerId === context.userId) {
      return { ok: false, reason: "not_found" as const };
    }

    const { error: refErr } = await supabaseAdmin.from("referrals").insert({
      referrer_user_id: referrerId,
      referred_user_id: context.userId,
      ref_code: code,
      rewarded_at: new Date().toISOString(),
    });
    if (refErr) throw new Error(refErr.message);

    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    await supabaseAdmin.from("user_entitlements").insert({
      user_id: referrerId,
      feature: "deep_guru",
      status: "active",
      source: "referral_bonus",
      expires_at: expires,
    });

    return { ok: true, alreadyClaimed: false as const, referrerId };
  });

export const getReferralStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({}).default({}).parse(d ?? {}))
  .handler(async ({ context }) => {
    const { count } = await context.supabase
      .from("referrals")
      .select("id", { count: "exact", head: true })
      .eq("referrer_user_id", context.userId);
    return { invited: count ?? 0 };
  });

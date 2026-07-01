/**
 * Админские действия: список покупок, поиск пользователя,
 * ручная выдача entitlement, бан. Все проверяют роль admin.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(supabase: any, userId: string): Promise<void> {
  const { data, error } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (error || data !== true) {
    throw new Response("Forbidden", { status: 403 });
  }
}

export const listRecentPurchases = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ limit: z.number().int().min(1).max(500).default(100) }).default({ limit: 100 }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("stars_payments")
      .select("id, user_id, product_id, stars_amount, telegram_payment_charge_id, created_at, refunded_at")
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const lookupUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ query: z.string().min(1).max(200) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const q = data.query.trim();
    // Try uuid, then telegram_id numeric
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(q);
    let query = supabaseAdmin
      .from("profiles")
      .select("id, telegram_id, first_name, last_name, username, banned_at, created_at")
      .limit(20);
    if (isUuid) query = query.eq("id", q);
    else if (/^\d+$/.test(q)) query = query.eq("telegram_id", Number(q));
    else query = query.or(`username.ilike.%${q}%,first_name.ilike.%${q}%,last_name.ilike.%${q}%`);
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);

    const results = await Promise.all(
      (rows ?? []).map(async (p: any) => {
        const [{ data: ents }, { data: pays }] = await Promise.all([
          supabaseAdmin
            .from("user_entitlements")
            .select("feature, status, expires_at, source")
            .eq("user_id", p.id),
          supabaseAdmin
            .from("stars_payments")
            .select("stars_amount")
            .eq("user_id", p.id)
            .is("refunded_at", null),
        ]);
        const spend = (pays ?? []).reduce((s: number, r: any) => s + Number(r.stars_amount || 0), 0);
        return {
          profile: {
            user_id: p.id as string,
            telegram_id: p.telegram_id as number | null,
            display_name: (p.first_name || p.username || p.last_name || null) as string | null,
            banned_at: p.banned_at as string | null,
            created_at: p.created_at as string,
          },
          entitlements: (ents ?? []).map((e: any) => ({ feature_key: e.feature, ...e })),
          totalStars: spend,
        };
      }),
    );
    return results;
  });

export const adminGrantEntitlement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        targetUserId: z.string().uuid(),
        feature: z.string().min(1).max(64),
        days: z.number().int().min(0).max(3650).default(30),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("admin_grant_entitlement", {
      _target_user_id: data.targetUserId,
      _feature: data.feature,
      _days: data.days,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminBanUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ targetUserId: z.string().uuid(), banned: z.boolean() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("admin_ban_user", {
      _target_user_id: data.targetUserId,
      _banned: data.banned,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminRevokeEntitlementByCharge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ chargeId: z.string().min(1), userId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("user_entitlements")
      .update({ status: "refunded" })
      .eq("user_id", data.userId)
      .eq("stars_charge_id", data.chargeId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

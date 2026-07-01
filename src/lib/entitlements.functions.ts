/**
 * Серверные функции для Telegram Stars и user_entitlements.
 *
 * - listEntitlements: возвращает активные фичи пользователя.
 * - createStarsInvoice: делает createInvoiceLink через Bot API.
 * - restorePurchases: перечитывает user_entitlements (клиентская синхронизация).
 *
 * Реальное начисление entitlements происходит в webhook на событии
 * successful_payment (см. src/routes/api/public/telegram/webhook.ts).
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  STARS_PRODUCTS,
  findProductById,
  buildEntitlements,
  type UserEntitlements,
} from "@/lib/entitlements";

const TELEGRAM_API = "https://api.telegram.org";

async function loadEntitlements(supabase: any, userId: string): Promise<UserEntitlements> {
  const { data } = await supabase
    .from("user_entitlements")
    .select("feature, status, expires_at")
    .eq("user_id", userId);
  return buildEntitlements(userId, data ?? []);
}

export const listEntitlements = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({}).default({}).parse(d ?? {}))
  .handler(async ({ context }) => loadEntitlements(context.supabase, context.userId));

export const restorePurchases = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({}).default({}).parse(d ?? {}))
  .handler(async ({ context }) => loadEntitlements(context.supabase, context.userId));

export const createStarsInvoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ productId: z.string().min(1) }).parse(d))
  .handler(async ({ data, context }) => {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) throw new Error("TELEGRAM_BOT_TOKEN is not configured");

    const product = findProductById(data.productId);
    if (!product) throw new Error("Unknown product");

    // Payload связывает платёж с пользователем; проверяется в webhook.
    const payload = `${product.id}:${context.userId}`;

    const res = await fetch(`${TELEGRAM_API}/bot${token}/createInvoiceLink`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: product.title,
        description: product.description,
        payload,
        currency: "XTR",
        prices: [{ label: product.title, amount: product.stars }],
      }),
    });
    const body = (await res.json()) as { ok: boolean; result?: string; description?: string };
    if (!body.ok || !body.result) {
      throw new Error(body.description || "createInvoiceLink failed");
    }
    return { url: body.result, product };
  });

export const getLastPayment = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({}).default({}).parse(d ?? {}))
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("stars_payments")
      .select("product_id, stars_amount, telegram_payment_charge_id, created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return data ?? null;
  });

export const listMyPurchases = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({}).default({}).parse(d ?? {}))
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("stars_payments")
      .select("id, product_id, stars_amount, telegram_payment_charge_id, created_at, refunded_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(50);
    return data ?? [];
  });

export const STARS_CATALOG = STARS_PRODUCTS;

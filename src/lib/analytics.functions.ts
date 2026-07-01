/**
 * Админские аналитические запросы (воронка, DAU/MAU/ARPPU).
 * Проверка роли admin выполняется внутри SQL-функций (SECURITY DEFINER + has_role).
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getFunnelStats = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({ days: z.number().int().min(1).max(365).default(30) })
      .default({ days: 30 })
      .parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    const to = new Date();
    const from = new Date(to.getTime() - data.days * 24 * 60 * 60 * 1000);
    const { data: rows, error } = await context.supabase.rpc("admin_funnel_stats", {
      _from: from.toISOString(),
      _to: to.toISOString(),
    });
    if (error) throw new Error(error.message);
    const map = new Map<string, number>();
    for (const r of (rows ?? []) as { step: string; users: number }[]) {
      map.set(r.step, Number(r.users) || 0);
    }
    const install = map.get("install") ?? 0;
    const sankalpa = map.get("sankalpa") ?? 0;
    const first = map.get("first_roll") ?? 0;
    const five = map.get("five_rolls") ?? 0;
    const purchase = map.get("purchase") ?? 0;
    const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 1000) / 10 : 0);
    return {
      days: data.days,
      steps: [
        { key: "install", label: "Открыли", users: install, conv: 100 },
        { key: "sankalpa", label: "Санкальпа", users: sankalpa, conv: pct(sankalpa, install) },
        { key: "first_roll", label: "Первый бросок", users: first, conv: pct(first, sankalpa) },
        { key: "five_rolls", label: "5 бросков", users: five, conv: pct(five, first) },
        { key: "purchase", label: "Покупка", users: purchase, conv: pct(purchase, five) },
      ],
    };
  });

export const getGrowthStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({}).default({}).parse(d ?? {}))
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("admin_growth_stats");
    if (error) throw new Error(error.message);
    const row = (data ?? [])[0] as
      | {
          dau: number;
          wau: number;
          mau: number;
          revenue_7d: number;
          revenue_30d: number;
          arppu_30d: number;
        }
      | undefined;
    return {
      dau: Number(row?.dau ?? 0),
      wau: Number(row?.wau ?? 0),
      mau: Number(row?.mau ?? 0),
      revenue7d: Number(row?.revenue_7d ?? 0),
      revenue30d: Number(row?.revenue_30d ?? 0),
      arppu30d: Number(row?.arppu_30d ?? 0),
    };
  });

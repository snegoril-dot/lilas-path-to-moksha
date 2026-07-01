import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Настройки напоминаний о практике клетки.
 * Одна строка на пользователя в public.practice_reminders (PK = user_id).
 */

export const getReminderPrefs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({}).default({}).parse(d ?? {}))
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("practice_reminders")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    return {
      enabled: data?.enabled ?? false,
      morningSankalpaEnabled: data?.morning_sankalpa_enabled ?? false,
    };
  });

export const setReminderPrefs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        enabled: z.boolean().optional(),
        morningSankalpaEnabled: z.boolean().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const patch: Record<string, unknown> = { user_id: userId };
    if (typeof data.enabled === "boolean") patch.enabled = data.enabled;
    if (typeof data.morningSankalpaEnabled === "boolean")
      patch.morning_sankalpa_enabled = data.morningSankalpaEnabled;
    const { error } = await supabase
      .from("practice_reminders")
      .upsert(patch, { onConflict: "user_id" });
    if (error) throw error;
    return { ok: true };
  });

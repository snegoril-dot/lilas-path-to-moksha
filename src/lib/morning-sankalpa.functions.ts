import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const SaveInput = z.object({
  text: z.string().min(1).max(400),
  question: z.string().max(400).optional(),
});

// Сохраняем ответ на Утреннюю Санкальпу в общую историю.
export const saveMorningSankalpa = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SaveInput.parse(d))
  .handler(async ({ data, context }) => {
    const combined = data.question ? `${data.question}\n\n${data.text}` : data.text;
    const { data: row, error } = await context.supabase
      .from("sankalpa_history")
      .insert({
        user_id: context.userId,
        text: combined.slice(0, 1200),
        source: "morning",
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

// Проверяем, есть ли уже ответ за сегодня — чтобы не дублировать карточку.
export const getTodayMorningSankalpa = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const { data, error } = await context.supabase
      .from("sankalpa_history")
      .select("id, text, created_at, source")
      .eq("source", "morning")
      .gte("created_at", start.toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ?? null;
  });

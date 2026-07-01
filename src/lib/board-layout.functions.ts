import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Json } from "@/integrations/supabase/types";

const BOARD_LAYOUT_KEY = "lila_board_layout_v1";

const cellRectSchema = z.object({
  xPct: z.number().finite(),
  yPct: z.number().finite(),
  wPct: z.number().finite().positive(),
  hPct: z.number().finite().positive(),
});

export const boardLayoutPayloadSchema = z.object({
  version: z.number().int().min(1).default(2),
  aspectW: z.number().finite().positive(),
  aspectH: z.number().finite().positive(),
  gapPct: z.number().finite().min(0).max(10),
  padPct: z.number().finite().min(0).max(10),
  sizePct: z.number().finite().min(1).max(300).optional(),
  cellRects: z.record(z.string(), cellRectSchema),
});

export type BoardLayoutPayload = z.infer<typeof boardLayoutPayloadSchema>;

export const getPublishedBoardLayout = createServerFn({ method: "GET" })
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("app_settings")
      .select("value")
      .eq("key", BOARD_LAYOUT_KEY)
      .maybeSingle();
    if (error || !data?.value) return null;
    const parsed = boardLayoutPayloadSchema.safeParse(data.value);
    return parsed.success ? parsed.data : null;
  });

export const savePublishedBoardLayout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ layout: boardLayoutPayloadSchema }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin, error: roleError } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (roleError || isAdmin !== true) throw new Response("Forbidden", { status: 403 });

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("app_settings")
      .upsert({
        key: BOARD_LAYOUT_KEY,
        value: data.layout as Json,
        updated_by: context.userId,
        updated_at: new Date().toISOString(),
      }, { onConflict: "key" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
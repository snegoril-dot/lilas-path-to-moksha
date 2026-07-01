import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { validateTelegramInitData } from "@/lib/telegram-init-data";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/api/auth/telegram")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const botToken = process.env.TELEGRAM_BOT_TOKEN;
        if (!botToken) {
          return Response.json(
            { error: "server_not_configured", message: "TELEGRAM_BOT_TOKEN is not set" },
            { status: 503 },
          );
        }

        let body: { initData?: string };
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "invalid_json" }, { status: 400 });
        }

        const result = validateTelegramInitData(body.initData ?? "", botToken);
        if (!result.ok || !result.data) {
          return Response.json({ error: result.error ?? "invalid" }, { status: 401 });
        }

        // Caller must be authenticated (anon or otherwise) so we can link telegram_id → auth uid.
        const authHeader = request.headers.get("authorization") ?? "";
        const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
        if (!token) {
          return Response.json({ error: "no_session" }, { status: 401 });
        }

        const supabase = createClient<Database>(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_PUBLISHABLE_KEY!,
          { auth: { persistSession: false, autoRefreshToken: false } },
        );
        const { data: userData, error: userErr } = await supabase.auth.getUser(token);
        if (userErr || !userData.user) {
          return Response.json({ error: "invalid_session" }, { status: 401 });
        }
        const uid = userData.user.id;
        const tg = result.data.user;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { error: upErr } = await supabaseAdmin
          .from("profiles")
          .upsert(
            {
              id: uid,
              telegram_id: tg.id,
              username: tg.username ?? null,
              first_name: tg.first_name ?? null,
              last_name: tg.last_name ?? null,
              language_code: tg.language_code ?? null,
              photo_url: tg.photo_url ?? null,
              is_premium: tg.is_premium ?? false,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "id" },
          );
        if (upErr) {
          return Response.json({ error: "db_error", detail: upErr.message }, { status: 500 });
        }

        return Response.json({
          ok: true,
          profile: {
            telegram_id: tg.id,
            username: tg.username ?? null,
            first_name: tg.first_name ?? null,
            last_name: tg.last_name ?? null,
            language_code: tg.language_code ?? null,
            photo_url: tg.photo_url ?? null,
            is_premium: tg.is_premium ?? false,
          },
          auth_date: result.data.auth_date,
        });
      },
    },
  },
});

/**
 * Public healthcheck: GET /api/public/healthcheck
 *
 * - Pings DB (cheap count on analytics_events with head:true).
 * - Returns 200 { ok:true, db_ms, ts } when healthy.
 * - Returns 503 and pings admin Telegram when DB errors.
 *
 * Wire an external uptime monitor (UptimeRobot / BetterStack, 1-min interval)
 * to this URL. Optionally schedule from pg_cron every 5 min for an in-DB pulse.
 */
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/healthcheck")({
  server: {
    handlers: {
      GET: async () => {
        const started = Date.now();
        let dbOk = false;
        let dbError: string | null = null;
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { error } = await supabaseAdmin
            .from("analytics_events")
            .select("id", { head: true, count: "exact" })
            .limit(1);
          if (error) dbError = error.message;
          else dbOk = true;
        } catch (e) {
          dbError = e instanceof Error ? e.message : String(e);
        }
        const dbMs = Date.now() - started;

        if (!dbOk) {
          const { notifyAdmin } = await import("@/lib/admin-notify.server");
          void notifyAdmin(`🚨 healthcheck: DB down (${dbMs}ms) — ${dbError ?? "unknown"}`);
          return Response.json(
            { ok: false, db_ok: false, db_ms: dbMs, error: dbError, ts: new Date().toISOString() },
            { status: 503 },
          );
        }

        return Response.json({
          ok: true,
          db_ok: true,
          db_ms: dbMs,
          ts: new Date().toISOString(),
        });
      },
    },
  },
});

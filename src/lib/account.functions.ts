/**
 * Удаление аккаунта и всех связанных данных пользователя (GDPR / «право на забвение»).
 *
 * Требует авторизованного пользователя. Удаляет строки во всех таблицах,
 * где есть user_id / id пользователя, и затем сам auth-аккаунт.
 * После вызова клиент должен разлогинить пользователя.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Таблицы, где ключ — user_id. Порядок не важен, всё чистится параллельно.
const USER_ID_TABLES = [
  "analytics_events",
  "beta_feedback",
  "game_sessions",
  "guru_usage",
  "journal_entries",
  "practice_journal_entries",
  "practice_reminders",
  "practice_sessions",
  "referrals",
  "sankalpa_history",
  "stars_payments",
  "user_entitlements",
  "user_roles",
  "weekly_recommendations",
] as const;

export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const userId = context.userId;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1. Данные из прикладных таблиц.
    await Promise.all(
      USER_ID_TABLES.map((table) =>
        supabaseAdmin.from(table).delete().eq("user_id", userId),
      ),
    );

    // 2. Профиль (ключ — id).
    await supabaseAdmin.from("profiles").delete().eq("id", userId);

    // 3. Сам auth-пользователь. Ошибка не критична — данные уже стёрты.
    try {
      await supabaseAdmin.auth.admin.deleteUser(userId);
    } catch (e) {
      console.error("auth.admin.deleteUser failed", e);
    }

    return { ok: true as const };
  });

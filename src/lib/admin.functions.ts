import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Серверная проверка роли admin через SECURITY DEFINER функцию has_role.
 * Используется как источник истины для доступа к отладочным инструментам.
 * Возвращает false при любой ошибке — принцип «закрыто по умолчанию».
 */
export const checkIsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (error) return { isAdmin: false };
    return { isAdmin: data === true };
  });

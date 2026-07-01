import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase-safe-client";
import { checkIsAdmin } from "@/lib/admin.functions";

/**
 * Возвращает { isAdmin, loading }.
 * Двухуровневая проверка (defense-in-depth):
 * 1) Серверная функция checkIsAdmin — авторитетный источник (SECURITY DEFINER has_role).
 * 2) Клиентское чтение user_roles с RLS — как fallback при недоступности сервера.
 * Роль admin выдаётся только через service_role (INSERT в user_roles закрыт RLS).
 */
export function useIsAdmin() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      setLoading(true);
      let userId: string | undefined;
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        userId = sessionData.session?.user.id;
      } catch {
        userId = undefined;
      }
      if (!userId) {
        if (!cancelled) {
          setIsAdmin(false);
          setLoading(false);
        }
        return;
      }
      try {
        const res = await checkIsAdmin();
        if (cancelled) return;
        setIsAdmin(res.isAdmin === true);
      } catch {
        if (!cancelled) setIsAdmin(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    check();
    const { data: sub } = supabase.auth.onAuthStateChange(() => check());
    window.addEventListener("lila:admin-role-refresh", check);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") check();
    });
    return () => {
      cancelled = true;
      window.removeEventListener("lila:admin-role-refresh", check);
      sub.subscription.unsubscribe();
    };
  }, []);

  return { isAdmin, loading };
}

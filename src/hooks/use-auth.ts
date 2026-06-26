import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useAuth() {
  const [userId, setUserId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const ensureSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session?.user) {
        if (!cancelled) {
          setUserId(data.session.user.id);
          setReady(true);
        }
        return;
      }
      const { data: signed, error } = await supabase.auth.signInAnonymously();
      if (!cancelled) {
        if (error) {
          console.error("[auth] anonymous sign-in failed", error);
        }
        setUserId(signed.user?.id ?? null);
        setReady(true);
      }
    };

    ensureSession();

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { userId, ready };
}

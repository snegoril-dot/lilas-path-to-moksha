import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

function tgLog(message: string) {
  try {
    const tg = (window as unknown as {
      Telegram?: { WebApp?: { sendData?: (d: string) => void } };
    }).Telegram?.WebApp;
    // Не спамим сервером — только консоль + отладочный канал WebApp при наличии.
    // eslint-disable-next-line no-console
    console.info(`[auth] ${message}`);
    void tg;
  } catch {
    /* noop */
  }
}

function isSecurityError(e: unknown): boolean {
  if (!e) return false;
  const err = e as { name?: string; message?: string };
  return err.name === "SecurityError" || /SecurityError|storage/i.test(err.message ?? "");
}

export function useAuth() {
  const [userId, setUserId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    tgLog("init");

    const ensureSession = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (data.session?.user) {
          tgLog(`session restored user=${data.session.user.id.slice(0, 8)}`);
          if (!cancelled) {
            setUserId(data.session.user.id);
            setReady(true);
          }
          return;
        }
        tgLog("no session — signing in anonymously");
        const { data: signed, error } = await supabase.auth.signInAnonymously();
        if (!cancelled) {
          if (error) {
            console.error("[auth] anonymous sign-in failed", error);
            tgLog(`anon sign-in failed: ${error.message}`);
          } else {
            tgLog(`anon sign-in ok user=${signed?.user?.id?.slice(0, 8) ?? "?"}`);
          }
          setUserId(signed?.user?.id ?? null);
          setReady(true);
        }
      } catch (e) {
        // Telegram iOS WKWebView может блокировать localStorage/куки —
        // в этом случае supabase-клиент кидает исключение. Не блокируем UI:
        // отпускаем ready=true, приложение будет работать без сессии.
        console.error("[auth] session init failed", e);
        tgLog(
          isSecurityError(e)
            ? "SecurityError: storage blocked (Prevent Cross-Site Tracking?)"
            : `init failed: ${(e as Error)?.message ?? "unknown"}`,
        );
        if (!cancelled) setReady(true);
      }
    };

    ensureSession();

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      tgLog(`onAuthStateChange ${event} user=${session?.user?.id?.slice(0, 8) ?? "-"}`);
      setUserId(session?.user?.id ?? null);
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { userId, ready };
}

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase-safe-client";
import { recordDiagnostic, reportClientCrash, setAuthDiagnosticState } from "@/lib/telegram-diagnostics";

function tgLog(message: string) {
  try {
    recordDiagnostic("auth", message);
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
    setAuthDiagnosticState({ authReady: false, userId: null, stage: "init" });
    const releaseTimer = window.setTimeout(() => {
      if (!cancelled) {
        tgLog("auth timeout — continue without blocking UI");
        setAuthDiagnosticState({ authReady: true, stage: "timeout_guest", timedOut: true });
        setReady(true);
      }
    }, 3500);

    const ensureSession = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (data.session?.user) {
          tgLog(`session restored user=${data.session.user.id.slice(0, 8)}`);
          setAuthDiagnosticState({
            authReady: true,
            userId: data.session.user.id,
            stage: "session_restored",
            hasSession: true,
            timedOut: false,
          });
          if (!cancelled) {
            setUserId(data.session.user.id);
            setReady(true);
          }
          window.clearTimeout(releaseTimer);
          return;
        }
        tgLog("no session — signing in anonymously");
        setAuthDiagnosticState({ stage: "anonymous_sign_in", hasSession: false, anonAttempted: true });
        const { data: signed, error } = await supabase.auth.signInAnonymously();
        if (!cancelled) {
          if (error) {
            console.error("[auth] anonymous sign-in failed", error);
            tgLog(`anon sign-in failed: ${error.message}`);
            setAuthDiagnosticState({
              authReady: true,
              stage: "anonymous_failed_guest",
              anonOk: false,
              lastError: error.message,
            });
          } else {
            tgLog(`anon sign-in ok user=${signed?.user?.id?.slice(0, 8) ?? "?"}`);
            setAuthDiagnosticState({
              authReady: true,
              userId: signed?.user?.id ?? null,
              stage: "anonymous_ok",
              anonOk: true,
              timedOut: false,
            });
          }
          setUserId(signed?.user?.id ?? null);
          setReady(true);
        }
        window.clearTimeout(releaseTimer);
      } catch (e) {
        // Telegram iOS WKWebView может блокировать localStorage/куки —
        // в этом случае supabase-клиент кидает исключение. Не блокируем UI:
        // отпускаем ready=true, приложение будет работать без сессии.
        console.error("[auth] session init failed", e);
        reportClientCrash("auth_init_failed", e, { authReady: true });
        tgLog(
          isSecurityError(e)
            ? "SecurityError: storage blocked (Prevent Cross-Site Tracking?)"
            : `init failed: ${(e as Error)?.message ?? "unknown"}`,
        );
        setAuthDiagnosticState({
          authReady: true,
          stage: isSecurityError(e) ? "security_error_guest" : "auth_error_guest",
          securityError: isSecurityError(e),
          lastError: (e as Error)?.message ?? "unknown",
        });
        if (!cancelled) setReady(true);
        window.clearTimeout(releaseTimer);
      }
    };

    ensureSession();

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      tgLog(`onAuthStateChange ${event} user=${session?.user?.id?.slice(0, 8) ?? "-"}`);
      setAuthDiagnosticState({
        authReady: true,
        userId: session?.user?.id ?? null,
        stage: `auth_event_${event}`,
        hasSession: !!session,
      });
      setUserId(session?.user?.id ?? null);
    });
    return () => {
      cancelled = true;
      window.clearTimeout(releaseTimer);
      sub.subscription.unsubscribe();
    };
  }, []);

  return { userId, ready };
}

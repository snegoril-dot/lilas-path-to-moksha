import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase-safe-client";
import { getTg } from "@/hooks/use-telegram";

export interface TelegramProfile {
  telegram_id: number;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  language_code: string | null;
  photo_url: string | null;
  is_premium: boolean;
}

export type TelegramAuthStatus =
  | "idle"
  | "loading"
  | "authenticated"
  | "dev_mode"
  | "error";

interface State {
  status: TelegramAuthStatus;
  profile: TelegramProfile | null;
  error: string | null;
}

/**
 * Reads Telegram Mini App initData and verifies it server-side.
 * Never trusts initDataUnsafe — the server re-hashes with the bot token.
 * Outside Telegram (dev), returns status "dev_mode" with no profile.
 */
export function useTelegramAuth(authReady: boolean) {
  const [state, setState] = useState<State>({
    status: "idle",
    profile: null,
    error: null,
  });

  useEffect(() => {
    if (!authReady) return;
    let cancelled = false;

    const run = async () => {
      setState((s) => ({ ...s, status: "loading" }));

      let initData = "";
      const startedAt = Date.now();
      while (!cancelled && Date.now() - startedAt < 2500) {
        const tg = getTg();
        initData = (tg as unknown as { initData?: string } | undefined)?.initData ?? "";
        if (initData) break;
        await new Promise((resolve) => window.setTimeout(resolve, 100));
      }

      if (!initData) {
        if (!cancelled) {
          setState({
            status: "dev_mode",
            profile: null,
            error: null,
          });
        }
        return;
      }

      try {
        const { data: sess } = await supabase.auth.getSession();
        const token = sess.session?.access_token;
        if (!token) throw new Error("no_supabase_session");

        const res = await fetch("/api/auth/telegram", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ initData }),
        });
        const json = await res.json();
        if (!res.ok || !json.ok) {
          throw new Error(json.error ?? `http_${res.status}`);
        }
        if (!cancelled) {
          setState({
            status: "authenticated",
            profile: json.profile as TelegramProfile,
            error: null,
          });
          window.dispatchEvent(new CustomEvent("lila:telegram-authenticated", { detail: json.profile }));
          window.dispatchEvent(new CustomEvent("lila:admin-role-refresh"));
        }
      } catch (e) {
        if (!cancelled) {
          setState({
            status: "error",
            profile: null,
            error: e instanceof Error ? e.message : String(e),
          });
        }
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [authReady]);

  return state;
}

// Lightweight, privacy-preserving analytics.
// Fires and forgets — must never throw or block gameplay.
// NEVER pass Sankalpa text, reflections, Guru replies, or journal content.

import { supabase } from "@/integrations/supabase/client";

export type AnalyticsEventName =
  | "app_opened"
  | "onboarding_started"
  | "onboarding_completed"
  | "sankalpa_submitted"
  | "first_roll"
  | "entered_board"
  | "dice_rolled"
  | "cell_landed"
  | "snake_triggered"
  | "ladder_triggered"
  | "reflection_opened"
  | "reflection_saved"
  | "guru_opened"
  | "guru_message_sent"
  | "journal_opened"
  | "session_paused"
  | "session_resumed"
  | "moksha_reached"
  | "share_preview_opened"
  | "share_completed"
  | "new_session_started"
  | "feedback_opened"
  | "feedback_submitted"
  | "guru_path_analysis_requested"
  | "guru_path_analysis_saved"
  | "practice_started"
  | "practice_step_checked"
  | "practice_completed"
  | "practice_abandoned"
  | "journal_entry_added"
  | "weekly_review_opened"
  | "weekly_resonance_set"
  | "morning_sankalpa_shown"
  | "morning_sankalpa_saved"
  | "sankalpa_history_opened"
  | "quiet_mode_toggled"
  | "deep_link_opened";


export interface TrackMeta {
  cell?: number | null;
  dice?: number | null;
  sessionId?: string | null;
  /** Small non-sensitive extras (counts, flags, enums). No user text. */
  extra?: Record<string, string | number | boolean | null>;
}

const ANON_KEY = "lila.analytics.anon_id";
const SESSION_MEM_KEY = "lila.analytics.session_id";
const APP_VERSION =
  (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_APP_VERSION ??
  "dev";

function safeUUID(): string {
  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      return crypto.randomUUID();
    }
  } catch {}
  return `a_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

function getAnonId(): string {
  if (typeof window === "undefined") return "ssr";
  try {
    let id = window.localStorage.getItem(ANON_KEY);
    if (!id) {
      id = safeUUID();
      window.localStorage.setItem(ANON_KEY, id);
    }
    return id;
  } catch {
    return "anon";
  }
}

function getSessionId(): string {
  if (typeof window === "undefined") return "ssr";
  try {
    let id = window.sessionStorage.getItem(SESSION_MEM_KEY);
    if (!id) {
      id = safeUUID();
      window.sessionStorage.setItem(SESSION_MEM_KEY, id);
    }
    return id;
  } catch {
    return "session";
  }
}

function detectPlatform(): "telegram" | "browser" {
  try {
    if (typeof window !== "undefined" && (window as unknown as { Telegram?: unknown }).Telegram) {
      return "telegram";
    }
  } catch {}
  return "browser";
}

/**
 * Defensive sanitizer: analytics `extra` must never carry user free-text.
 * Strips string values longer than 40 chars and drops keys that look like
 * private content (sankalpa, reflection, note, message, insight, journal, text, content).
 */
const FORBIDDEN_EXTRA_KEYS = /(sankalpa|reflect|note|message|insight|journal|text|content|body|prompt)/i;
function sanitizeExtra(
  extra: Record<string, string | number | boolean | null> | undefined,
): Record<string, string | number | boolean | null> {
  if (!extra) return {};
  const out: Record<string, string | number | boolean | null> = {};
  for (const [k, v] of Object.entries(extra)) {
    if (FORBIDDEN_EXTRA_KEYS.test(k)) continue;
    if (typeof v === "string" && v.length > 40) continue;
    out[k] = v;
  }
  return out;
}

/**
 * Fire-and-forget analytics event. Safe to call from any render path.
 * Errors are swallowed; gameplay must never depend on this.
 */
export function trackEvent(name: AnalyticsEventName, meta: TrackMeta = {}): void {
  if (typeof window === "undefined") return;
  // Defer to next tick so we never delay UI.
  queueMicrotask(async () => {
    try {
      const { data: userRes } = await supabase.auth.getUser().catch(() => ({ data: { user: null } as { user: null } }));
      const user = userRes?.user ?? null;
      const payload = {
        user_id: user?.id ?? null,
        anon_id: user ? null : getAnonId(),
        session_id: meta.sessionId ?? getSessionId(),
        event_name: name,
        cell: meta.cell ?? null,
        dice: meta.dice ?? null,
        platform: detectPlatform(),
        app_version: APP_VERSION,
        metadata: sanitizeExtra(meta.extra),
      };
      await supabase.from("analytics_events").insert(payload as never);
    } catch {
      // silent
    }
  });
}


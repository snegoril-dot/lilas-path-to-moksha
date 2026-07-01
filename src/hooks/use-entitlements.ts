import { useCallback, useEffect, useState } from "react";
import { listEntitlements } from "@/lib/entitlements.functions";
import {
  canUseFeature,
  type FeatureId,
  type UserEntitlements,
} from "@/lib/entitlements";

const ENT_CHANGED = "lila:entitlements-changed";
const PAYWALL_OPEN = "lila:paywall-open";

/** Fire globally after successful purchase / restore to refresh all consumers. */
export function notifyEntitlementsChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(ENT_CHANGED));
  }
}

/** Any component can request the paywall; SettingsSheet listens and opens it. */
export function openPaywallGlobal(from?: string) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(PAYWALL_OPEN, { detail: { from } }));
  }
}

export function onPaywallOpen(cb: (from?: string) => void) {
  const handler = (e: Event) => {
    const detail = (e as CustomEvent).detail as { from?: string } | undefined;
    cb(detail?.from);
  };
  window.addEventListener(PAYWALL_OPEN, handler);
  return () => window.removeEventListener(PAYWALL_OPEN, handler);
}

/**
 * Loads user entitlements and refreshes on ENT_CHANGED events.
 * SSR-safe: returns null until the first fetch resolves in the browser.
 */
export function useEntitlements() {
  const [ent, setEnt] = useState<UserEntitlements | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listEntitlements({ data: {} });
      setEnt(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const handler = () => void refresh();
    window.addEventListener(ENT_CHANGED, handler);
    return () => window.removeEventListener(ENT_CHANGED, handler);
  }, [refresh]);

  const has = useCallback(
    (f: FeatureId) => canUseFeature(ent, f),
    [ent],
  );

  return { ent, loading, error, refresh, has };
}

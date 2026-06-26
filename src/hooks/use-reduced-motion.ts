import { useEffect, useState } from "react";

/**
 * Returns true when the user (or Telegram client) prefers reduced motion.
 * Combines `prefers-reduced-motion` media query with Telegram WebApp settings
 * if available.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const tg = (
      window as unknown as {
        Telegram?: {
          WebApp?: {
            reduceMotion?: boolean;
            accessibility?: { reduceMotion?: boolean };
          };
        };
      }
    ).Telegram?.WebApp;

    const compute = () =>
      Boolean(
        mq.matches ||
          tg?.reduceMotion ||
          tg?.accessibility?.reduceMotion,
      );

    setReduced(compute());
    const handler = () => setReduced(compute());
    mq.addEventListener?.("change", handler);
    return () => mq.removeEventListener?.("change", handler);
  }, []);

  return reduced;
}

import { useEffect, useState } from "react";

type TgWebApp = {
  reduceMotion?: boolean;
  accessibility?: { reduceMotion?: boolean };
  onEvent?: (event: string, cb: () => void) => void;
  offEvent?: (event: string, cb: () => void) => void;
};

/**
 * Returns true when the user (or Telegram client) prefers reduced motion.
 * Reacts immediately to:
 *  - system `prefers-reduced-motion` media query changes
 *  - Telegram WebApp events: `themeChanged`, `accessibilityChanged`, `viewportChanged`
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const tg = (window as unknown as { Telegram?: { WebApp?: TgWebApp } })
      .Telegram?.WebApp;

    const compute = () =>
      Boolean(
        mq.matches || tg?.reduceMotion || tg?.accessibility?.reduceMotion,
      );

    const handler = () => setReduced(compute());
    handler();

    mq.addEventListener?.("change", handler);
    const tgEvents = ["themeChanged", "accessibilityChanged", "viewportChanged"];
    tgEvents.forEach((e) => tg?.onEvent?.(e, handler));

    return () => {
      mq.removeEventListener?.("change", handler);
      tgEvents.forEach((e) => tg?.offEvent?.(e, handler));
    };
  }, []);

  return reduced;
}

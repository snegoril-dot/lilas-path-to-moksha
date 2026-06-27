import { useEffect, useRef } from "react";

type Haptic = "light" | "medium" | "heavy" | "rigid" | "soft";
type Notif = "success" | "warning" | "error";

interface TgMainButton {
  text: string;
  isVisible: boolean;
  isActive: boolean;
  show: () => void;
  hide: () => void;
  enable: () => void;
  disable: () => void;
  setText: (t: string) => void;
  setParams: (p: { text?: string; color?: string; text_color?: string; is_active?: boolean; is_visible?: boolean }) => void;
  onClick: (cb: () => void) => void;
  offClick: (cb: () => void) => void;
}
interface TgWebApp {
  ready: () => void;
  expand: () => void;
  MainButton?: TgMainButton;
  BackButton?: { show: () => void; hide: () => void; onClick: (cb: () => void) => void; offClick: (cb: () => void) => void };
  HapticFeedback?: { impactOccurred: (s: Haptic) => void; notificationOccurred: (t: Notif) => void; selectionChanged: () => void };
  setHeaderColor?: (c: string) => void;
  setBackgroundColor?: (c: string) => void;
  colorScheme?: "light" | "dark";
  viewportStableHeight?: number;
  disableVerticalSwipes?: () => void;
}

export function getTg(): TgWebApp | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as unknown as { Telegram?: { WebApp?: TgWebApp } }).Telegram?.WebApp;
}

export function haptic(kind: Haptic = "light") {
  getTg()?.HapticFeedback?.impactOccurred(kind);
}
export function hapticNotify(kind: Notif) {
  getTg()?.HapticFeedback?.notificationOccurred(kind);
}

export function useTelegramInit() {
  useEffect(() => {
    const tg = getTg();
    if (!tg) return;
    try {
      tg.ready();
      tg.expand();
      tg.disableVerticalSwipes?.();
      tg.setHeaderColor?.("#0b0a14");
      tg.setBackgroundColor?.("#0b0a14");
    } catch {
      // ignore
    }
  }, []);
}

export function useTelegramMainButton(opts: {
  text: string;
  visible: boolean;
  active?: boolean;
  onClick: () => void;
}) {
  const cbRef = useRef(opts.onClick);
  cbRef.current = opts.onClick;

  useEffect(() => {
    const tg = getTg();
    const mb = tg?.MainButton;
    if (!mb) return;
    const handler = () => cbRef.current();
    mb.onClick(handler);
    return () => {
      try { mb.offClick(handler); } catch { /* noop */ }
    };
  }, []);

  useEffect(() => {
    const mb = getTg()?.MainButton;
    if (!mb) return;
    mb.setParams({
      text: opts.text,
      color: "#f59e0b",
      text_color: "#1c1917",
      is_active: opts.active !== false,
      is_visible: opts.visible,
    });
    if (opts.visible) mb.show(); else mb.hide();
  }, [opts.text, opts.visible, opts.active]);

  useEffect(() => {
    return () => { getTg()?.MainButton?.hide(); };
  }, []);
}

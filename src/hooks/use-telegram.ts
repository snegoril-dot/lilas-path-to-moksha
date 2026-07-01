import { useEffect, useRef } from "react";

type Haptic = "light" | "medium" | "heavy" | "rigid" | "soft";
type Notif = "success" | "warning" | "error";

interface TgThemeParams {
  bg_color?: string;
  text_color?: string;
  hint_color?: string;
  link_color?: string;
  button_color?: string;
  button_text_color?: string;
  secondary_bg_color?: string;
  header_bg_color?: string;
  accent_text_color?: string;
  section_bg_color?: string;
  section_header_text_color?: string;
  subtitle_text_color?: string;
  destructive_text_color?: string;
}

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
interface TgBackButton {
  isVisible: boolean;
  show: () => void;
  hide: () => void;
  onClick: (cb: () => void) => void;
  offClick: (cb: () => void) => void;
}
interface TgWebApp {
  ready: () => void;
  expand: () => void;
  isExpanded?: boolean;
  MainButton?: TgMainButton;
  BackButton?: TgBackButton;
  HapticFeedback?: { impactOccurred: (s: Haptic) => void; notificationOccurred: (t: Notif) => void; selectionChanged: () => void };
  setHeaderColor?: (c: string) => void;
  setBackgroundColor?: (c: string) => void;
  colorScheme?: "light" | "dark";
  themeParams?: TgThemeParams;
  viewportStableHeight?: number;
  viewportHeight?: number;
  safeAreaInset?: { top?: number; bottom?: number; left?: number; right?: number };
  contentSafeAreaInset?: { top?: number; bottom?: number; left?: number; right?: number };
  onEvent?: (event: string, cb: () => void) => void;
  offEvent?: (event: string, cb: () => void) => void;
  disableVerticalSwipes?: () => void;
  platform?: string;
  version?: string;
}


export function getTg(): TgWebApp | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as unknown as { Telegram?: { WebApp?: TgWebApp } }).Telegram?.WebApp;
}

export function isInTelegram(): boolean {
  const tg = getTg();
  return !!tg && !!tg.platform && tg.platform !== "unknown";
}

export function haptic(kind: Haptic = "light") {
  try { getTg()?.HapticFeedback?.impactOccurred(kind); } catch { /* noop */ }
}
export function hapticNotify(kind: Notif) {
  try { getTg()?.HapticFeedback?.notificationOccurred(kind); } catch { /* noop */ }
}
export function hapticSelection() {
  try { getTg()?.HapticFeedback?.selectionChanged(); } catch { /* noop */ }
}

/** Publish Telegram theme params as CSS variables (`--tg-theme-*`). */
function applyThemeParams(tp?: TgThemeParams) {
  if (!tp || typeof document === "undefined") return;
  const root = document.documentElement;
  const set = (name: string, value?: string) => {
    if (value) root.style.setProperty(name, value);
  };
  set("--tg-theme-bg-color", tp.bg_color);
  set("--tg-theme-text-color", tp.text_color);
  set("--tg-theme-hint-color", tp.hint_color);
  set("--tg-theme-link-color", tp.link_color);
  set("--tg-theme-button-color", tp.button_color);
  set("--tg-theme-button-text-color", tp.button_text_color);
  set("--tg-theme-secondary-bg-color", tp.secondary_bg_color);
  set("--tg-theme-header-bg-color", tp.header_bg_color);
  set("--tg-theme-accent-text-color", tp.accent_text_color);
  set("--tg-theme-section-bg-color", tp.section_bg_color);
  set("--tg-theme-section-header-text-color", tp.section_header_text_color);
  set("--tg-theme-subtitle-text-color", tp.subtitle_text_color);
  set("--tg-theme-destructive-text-color", tp.destructive_text_color);
}

/** Publish viewport height as `--tg-viewport-height` for CSS min-height hooks. */
function applyViewportHeight(tg?: TgWebApp) {
  if (!tg || typeof document === "undefined") return;
  const h = tg.viewportStableHeight ?? tg.viewportHeight;
  if (typeof h === "number" && h > 0) {
    document.documentElement.style.setProperty("--tg-viewport-height", `${h}px`);
  }
}

/**
 * Initialise the Telegram WebApp SDK. Handles the async script load — the
 * SDK tag in __root.tsx is `async`, so `Telegram.WebApp` may not exist on
 * first tick. We poll for up to ~1.5s and set everything up when available.
 */
export function useTelegramInit() {
  useEffect(() => {
    let cancelled = false;
    let viewportHandler: (() => void) | null = null;
    let themeHandler: (() => void) | null = null;

    const setup = (tg: TgWebApp) => {
      try {
        tg.ready();
        if (!tg.isExpanded) tg.expand();
        tg.disableVerticalSwipes?.();
        applyThemeParams(tg.themeParams);
        applyViewportHeight(tg);
        // Keep header/background aligned with our dark shell.
        tg.setHeaderColor?.("#0b0a14");
        tg.setBackgroundColor?.("#0b0a14");
        if (tg.onEvent) {
          viewportHandler = () => applyViewportHeight(tg);
          themeHandler = () => applyThemeParams(tg.themeParams);
          tg.onEvent("viewportChanged", viewportHandler);
          tg.onEvent("themeChanged", themeHandler);
        }
      } catch {
        // ignore
      }
    };

    const tryInit = () => {
      const tg = getTg();
      if (tg) {
        setup(tg);
        return true;
      }
      return false;
    };

    if (!tryInit()) {
      // Poll for the async-loaded telegram-web-app.js script.
      const started = Date.now();
      const iv = setInterval(() => {
        if (cancelled) return;
        if (tryInit() || Date.now() - started > 1500) {
          clearInterval(iv);
        }
      }, 100);
      return () => {
        cancelled = true;
        clearInterval(iv);
      };
    }

    return () => {
      cancelled = true;
      const tg = getTg();
      if (tg?.offEvent) {
        if (viewportHandler) tg.offEvent("viewportChanged", viewportHandler);
        if (themeHandler) tg.offEvent("themeChanged", themeHandler);
      }
    };
  }, []);
}

/**
 * Bind Telegram's native BackButton while `active` is true. Falls back
 * silently outside Telegram — modals still work via their own close controls.
 */
export function useTelegramBackButton(active: boolean, onBack: () => void) {
  const cbRef = useRef(onBack);
  cbRef.current = onBack;

  useEffect(() => {
    const tg = getTg();
    const bb = tg?.BackButton;
    if (!bb || !active) return;
    const handler = () => {
      try { tg?.HapticFeedback?.impactOccurred("light"); } catch { /* noop */ }
      cbRef.current();
    };
    try {
      bb.onClick(handler);
      bb.show();
    } catch {
      // ignore
    }
    return () => {
      try {
        bb.offClick(handler);
        bb.hide();
      } catch {
        // ignore
      }
    };
  }, [active]);
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

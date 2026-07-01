/**
 * localStorage-обёртка, устойчивая к SecurityError.
 * В Telegram iOS WebView (WKWebView) при включённом Prevent Cross-Site Tracking
 * обращения к window.localStorage могут кидать исключение — это ломает
 * useState-инициализаторы и приводит к белому экрану. Здесь все операции
 * оборачиваем в try/catch и падаем в in-memory fallback.
 */

const memory = new Map<string, string>();

function hasWindow() {
  return typeof window !== "undefined";
}

export function safeGet(key: string): string | null {
  if (!hasWindow()) return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return memory.get(key) ?? null;
  }
}

export function safeSet(key: string, value: string): void {
  if (!hasWindow()) return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    memory.set(key, value);
  }
}

export function safeRemove(key: string): void {
  if (!hasWindow()) return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    memory.delete(key);
  }
}

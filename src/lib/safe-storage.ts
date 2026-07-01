/**
 * localStorage-обёртка, устойчивая к SecurityError.
 * В Telegram iOS WebView (WKWebView) при включённом Prevent Cross-Site Tracking
 * обращения к window.localStorage могут кидать исключение — это ломает
 * useState-инициализаторы и приводит к белому экрану. Здесь все операции
 * оборачиваем в try/catch и падаем в in-memory fallback.
 */

const memory = new Map<string, string>();
const sessionMemory = new Map<string, string>();

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

export function safeSessionGet(key: string): string | null {
  if (!hasWindow()) return null;
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return sessionMemory.get(key) ?? null;
  }
}

export function safeSessionSet(key: string, value: string): void {
  if (!hasWindow()) return;
  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    sessionMemory.set(key, value);
  }
}

export function safeKeys(prefix?: string): string[] {
  if (!hasWindow()) return [];
  const keys = new Set<string>(memory.keys());
  try {
    const storage = window.localStorage;
    for (let i = 0; i < storage.length; i += 1) {
      const key = storage.key(i);
      if (key) keys.add(key);
    }
  } catch {
    // memory fallback only
  }
  return [...keys].filter((key) => (prefix ? key.startsWith(prefix) : true));
}

export function safeClear(): void {
  memory.clear();
  sessionMemory.clear();
  if (!hasWindow()) return;
  try {
    window.localStorage.clear();
  } catch {
    // memory fallback already cleared
  }
  try {
    window.sessionStorage.clear();
  } catch {
    // memory fallback already cleared
  }
}

export const safeStorageAdapter = {
  getItem: safeGet,
  setItem: safeSet,
  removeItem: safeRemove,
};

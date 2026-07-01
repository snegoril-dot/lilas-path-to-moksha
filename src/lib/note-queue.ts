// Очередь заметок для оффлайн/слабой сети.
// Заметки складываются в localStorage под ключом lila:pending-notes и
// отправляются через переданный save-fn при появлении сети или на старте.

export interface PendingNote {
  id: string;
  sessionId: string | null;
  cellId: number;
  text: string;
  kind: "reflection" | "insight" | "final_insight" | "guru_note" | "snake_lesson" | "ladder_gift";
  prompt?: string;
  sankalpa?: string;
  createdAt: string;
}

const KEY = "lila:pending-notes";

function read(): PendingNote[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as PendingNote[]) : [];
  } catch {
    return [];
  }
}

function write(items: PendingNote[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(items));
  } catch {}
}

export function enqueueNote(note: Omit<PendingNote, "id" | "createdAt">): PendingNote {
  const item: PendingNote = {
    ...note,
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `n_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    createdAt: new Date().toISOString(),
  };
  const list = read();
  list.push(item);
  write(list);
  return item;
}

export function getPendingCount(): number {
  return read().length;
}

export type NoteSender = (n: PendingNote) => Promise<unknown>;

/** Пытается отправить все накопленные заметки. Неотправленные остаются в очереди. */
export async function flushPendingNotes(send: NoteSender): Promise<{ sent: number; left: number }> {
  if (typeof window === "undefined") return { sent: 0, left: 0 };
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return { sent: 0, left: read().length };
  }
  const list = read();
  if (list.length === 0) return { sent: 0, left: 0 };
  const remaining: PendingNote[] = [];
  let sent = 0;
  for (const n of list) {
    try {
      await send(n);
      sent += 1;
    } catch {
      remaining.push(n);
    }
  }
  write(remaining);
  return { sent, left: remaining.length };
}

/** Регистрирует единый глобальный listener 'online', очищающий очередь. */
export function registerOnlineFlush(send: NoteSender): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => {
    flushPendingNotes(send).catch(() => {});
  };
  window.addEventListener("online", handler);
  // попытка сразу — вдруг сеть уже есть
  handler();
  return () => window.removeEventListener("online", handler);
}

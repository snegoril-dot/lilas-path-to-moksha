// Локальный кеш последней клетки, чтобы оффлайн-открытие Mini App
// сразу показывало осмысленный контент вместо пустого экрана.

export interface LastCellCache {
  cellId: number;
  name: string;
  wisdom: string;
  reflection?: string | null;
  updatedAt: string;
}

function keyFor(userId: string | null | undefined): string {
  return `lila:last-cell:${userId ?? "anon"}`;
}

export function saveLastCell(userId: string | null | undefined, data: Omit<LastCellCache, "updatedAt">): void {
  if (typeof window === "undefined") return;
  try {
    const payload: LastCellCache = { ...data, updatedAt: new Date().toISOString() };
    window.localStorage.setItem(keyFor(userId), JSON.stringify(payload));
  } catch {}
}

export function readLastCell(userId: string | null | undefined): LastCellCache | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(keyFor(userId));
    if (!raw) return null;
    return JSON.parse(raw) as LastCellCache;
  } catch {
    return null;
  }
}

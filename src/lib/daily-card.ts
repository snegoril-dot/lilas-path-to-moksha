import { BOARD, getLoka } from "@/lib/lila-board";
import { safeGet, safeSet } from "@/lib/safe-storage";

/**
 * Детерминированный «совет таттвы» на сутки.
 * Одна и та же клетка выпадает у всех игроков в один день — это работает
 * как общий повод для разговора при пересылке в чат.
 */
export interface DailyCard {
  date: string; // yyyy-mm-dd
  cellId: number;
  name: string;
  wisdom: string;
  lokaName?: string;
}

function todayIso(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

// xmur3 hash → seed число из строки
function seedFromDate(date: string): number {
  let h = 1779033703 ^ date.length;
  for (let i = 0; i < date.length; i++) {
    h = Math.imul(h ^ date.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return (h ^= h >>> 16) >>> 0;
}

export function getDailyCard(date = todayIso()): DailyCard {
  const seed = seedFromDate(date);
  // Берём только «обычные» клетки — без змей/лестниц/мокши, чтобы совет был чист.
  const pool = BOARD.filter((c) => c.type === "normal");
  const cell = pool[seed % pool.length] ?? BOARD[0];
  const loka = getLoka(cell.id);
  return {
    date,
    cellId: cell.id,
    name: cell.name,
    wisdom: cell.wisdom,
    lokaName: loka?.name,
  };
}

const STORAGE_KEY = "lila.dailyCard.lastSeen";

export function markDailySeen(date = todayIso()) {
  if (typeof window === "undefined") return;
  try {
    safeSet(STORAGE_KEY, date);
  } catch {
    /* ignore */
  }
}

export function isDailyUnseen(date = todayIso()): boolean {
  if (typeof window === "undefined") return false;
  try {
    return safeGet(STORAGE_KEY) !== date;
  } catch {
    return true;
  }
}

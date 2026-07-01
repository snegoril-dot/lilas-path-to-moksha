/**
 * Контент клеток игрового поля.
 *
 * ⚠️ Редактировать здесь НЕ нужно — это ре-экспорты.
 *  - Имена / лестницы / змеи / базовая мудрость:  src/lib/lila-board.ts
 *  - Расширенный опыт клетки (shortMeaning, reflectionQuestion,
 *    dailyPractice, keywords, tone):             src/lib/cell-experience.ts
 *
 * Тип {@link CellContent} — будущий контракт (если позже переносим в БД).
 */

export {
  BOARD,
  LADDERS,
  SNAKES,
  getLoka,
  type Cell,
} from "@/lib/lila-board";

export {
  getCellExperience,
  TONE_LABEL,
  type CellTone,
  type CellExperience,
} from "@/lib/cell-experience";

import type { Cell } from "@/lib/lila-board";
import type { CellExperience } from "@/lib/cell-experience";

/**
 * Единый контракт содержимого клетки (для будущего источника данных —
 * например, Supabase-таблицы `cells`). Совместим с текущими типами.
 */
export interface CellContent extends Cell {
  experience: CellExperience;
  /** Если клетка — низ лестницы: куда ведёт. */
  ladderTo?: number;
  /** Если клетка — голова змеи: куда опускает. */
  snakeTo?: number;
}

/** Финальная клетка — Мокша (Кайлас). Проверяется в тестах. */
export const MOKSHA_CELL_ID = 68 as const;

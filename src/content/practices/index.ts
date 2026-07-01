import { BOARD } from "@/lib/lila-board";
import { getCellExperience } from "@/lib/cell-experience";
import type { Practice, PracticeDuration } from "./types";
import { PRACTICE_OVERRIDES } from "./overrides";

export * from "./types";
export { PRACTICE_OVERRIDES } from "./overrides";

/**
 * Сборка практик по клеткам:
 * - Для каждой клетки берём ручной override, если есть.
 * - Иначе — строим «мягкую» практику из cell-experience:
 *   мудрость → намерение, вопрос клетки → рефлексия, dailyPractice → шаг.
 * Итог: каждая из 72 клеток имеет минимум 1 практику.
 */

const DEFAULT_DURATIONS: PracticeDuration[] = ["1h", "1d", "3d"];

function buildDefault(cellId: number): Practice {
  const cell = BOARD[cellId - 1];
  const exp = getCellExperience(cellId);
  const name = cell?.name ?? `Клетка ${cellId}`;
  const shortMeaning = exp?.shortMeaning ?? "Побудь с этой клеткой в течение дня.";
  const daily = exp?.dailyPractice ?? "Один раз в день замечай, как эта тема проявляется в жизни.";
  const question = exp?.reflectionQuestion ?? "Что эта клетка показала тебе сегодня?";

  return {
    id: "default-witness",
    cellId,
    title: `Наблюдение: ${name}`,
    intention: shortMeaning,
    durations: DEFAULT_DURATIONS,
    steps: [
      { title: "Замечай в течение дня", hint: daily },
      {
        title: "Одна короткая пауза",
        hint: "Один раз в день остановись на 60 секунд и вернись к дыханию.",
      },
      {
        title: "Одна запись вечером",
        hint: "Одна строка в дневнике — то, что показалось важным.",
      },
    ],
    reflectionPrompts: [
      question,
      "Где сегодня эта тема встретила тебя ярче всего?",
      "Что бы ты сказал себе завтрашнему об этом дне?",
      "Что просит остаться, а что — уйти?",
    ],
    closingRitual:
      "Мягко закрой глаза, сделай один длинный выдох и поблагодари эту паузу.",
  };
}

/** Полная карта: клетка → 1+ практик. */
export const PRACTICES_BY_CELL: Record<number, Practice[]> = (() => {
  const out: Record<number, Practice[]> = {};
  for (let id = 1; id <= 72; id++) {
    const overrides = PRACTICE_OVERRIDES[id] ?? [];
    if (overrides.length > 0) {
      out[id] = overrides;
    } else {
      out[id] = [buildDefault(id)];
    }
  }
  return out;
})();

export function getPracticesForCell(cellId: number): Practice[] {
  return PRACTICES_BY_CELL[cellId] ?? [];
}

export function findPractice(cellId: number, practiceId: string): Practice | null {
  return getPracticesForCell(cellId).find((p) => p.id === practiceId) ?? null;
}

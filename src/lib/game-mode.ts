// Rule-mode logic for entering the board (rolling to leave cell 0).
// - "classic": player must roll a real 6 to enter. No mercy.
// - "soft":    after 3 unsuccessful entry attempts, the next roll is treated as a 6.
export type GameMode = "classic" | "soft";

export const SOFT_MERCY_AFTER = 3;

export interface EntryResolution {
  /** Effective dice value after mercy is applied. */
  effective: number;
  /** True if this roll enters the board (effective === 6). */
  entered: boolean;
  /** True if the mercy rule forced the 6 (soft mode only). */
  mercy: boolean;
  /** New entryMisses counter to persist. */
  nextEntryMisses: number;
}

export function resolveEntry(
  mode: GameMode,
  rolled: number,
  entryMisses: number,
): EntryResolution {
  const isSix = rolled === 6;
  const mercy = mode === "soft" && !isSix && entryMisses >= SOFT_MERCY_AFTER;
  const effective = mercy ? 6 : rolled;
  const entered = effective === 6;
  return {
    effective,
    entered,
    mercy,
    nextEntryMisses: entered ? 0 : entryMisses + 1,
  };
}

export const MODE_LABEL: Record<GameMode, string> = {
  classic: "Классическая Лила",
  soft: "Мягкий путь",
};

export const MODE_DESCRIPTION: Record<GameMode, string> = {
  classic: "Путь по строгим правилам. Врата открывает только настоящая шестёрка.",
  soft: "Бережный режим для первого знакомства. После трёх неудачных попыток шестёрка приходит сама.",
};

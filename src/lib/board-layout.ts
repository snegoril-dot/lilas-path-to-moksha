/**
 * Чистая логика раскладки 72-клеточного поля Лилы.
 * Вынесена из Board.tsx, чтобы покрывать unit-тестами и переиспользовать
 * в рантайм-проверке.
 *
 * Бустрофедон: ряд 0 (визуально нижний) 1→8 слева-направо,
 * ряд 1: 9→16 справа-налево, ряд 2: 17→24 слева-направо и т.д.
 * Последний ряд (r=8) — снова слева-направо (65→72), как и любая чётная строка.
 */

export const COLS = 8;
export const ROWS = 9;
export const TOTAL = COLS * ROWS; // 72

/** ID клетки для (row, col) в бустрофедон-раскладке. */
export function idForRowCol(row: number, col: number): number {
  const reversed = row % 2 === 1;
  const base = row * COLS;
  return reversed ? base + (COLS - col) : base + col + 1;
}

/** Массив ID одной визуальной строки в порядке слева→направо на экране. */
export function rowIds(row: number): number[] {
  return Array.from({ length: COLS }, (_, c) => idForRowCol(row, c));
}

/** Ожидаемая последовательность ID для строки. */
export function expectedRowIds(row: number): number[] {
  const reversed = row % 2 === 1;
  return Array.from({ length: COLS }, (_, c) =>
    reversed ? row * COLS + (COLS - c) : row * COLS + c + 1
  );
}

/**
 * Полная валидация маппинга 1..72.
 * Возвращает список проблем; пустой массив = всё ок.
 */
export function verifyBoardMapping(): string[] {
  const issues: string[] = [];
  const seen = new Set<number>();
  for (let r = 0; r < ROWS; r++) {
    const ids = rowIds(r);
    const expected = expectedRowIds(r);
    if (ids.join(",") !== expected.join(",")) {
      issues.push(
        `row ${r}: got [${ids.join(",")}], expected [${expected.join(",")}]`
      );
    }
    for (const id of ids) {
      if (id < 1 || id > TOTAL) issues.push(`row ${r}: id ${id} out of range`);
      if (seen.has(id)) issues.push(`duplicate id ${id} in row ${r}`);
      seen.add(id);
    }
  }
  for (let i = 1; i <= TOTAL; i++) {
    if (!seen.has(i)) issues.push(`missing id ${i}`);
  }
  return issues;
}

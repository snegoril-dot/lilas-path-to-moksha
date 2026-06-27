/**
 * Чистая логика раскладки 72-клеточного поля Лилы.
 * Вынесена из Board.tsx, чтобы покрывать unit-тестами и переиспользовать
 * в рантайм-проверке.
 *
 * Бустрофедон: ряд 0 (визуально нижний) 1→8 слева-направо,
 * ряд 1: 9→16 справа-налево, ряд 2: 17→24 слева-направо и т.д.
 * Последний ряд (r=8) — снова слева-направо (65→72), как и любая чётная строка.
 */

export const COLS = 9;
export const ROWS = 8;
export const TOTAL = COLS * ROWS; // 72 (9×8 ориентация — Мокша в верхнем ряду)

export interface BoardCoord {
  /** row=0 — нижний ряд, row=8 — верхний */
  row: number;
  /** col=0 — левая колонка на экране, col=7 — правая */
  col: number;
}

export interface RectLike {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type LayoutLike = Record<number, RectLike>;

/** ID клетки для (row, col) в бустрофедон-раскладке. */
export function idForRowCol(row: number, col: number): number {
  const reversed = row % 2 === 1;
  const base = row * COLS;
  return reversed ? base + (COLS - col) : base + col + 1;
}

/** Визуальные координаты клетки по её ID. Чистая обратная функция к idForRowCol. */
export function rowColForId(id: number): BoardCoord {
  const row = Math.floor((id - 1) / COLS);
  const offset = (id - 1) % COLS;
  const reversed = row % 2 === 1;
  return {
    row,
    col: reversed ? COLS - 1 - offset : offset,
  };
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

  const topRow = rowIds(ROWS - 1);
  const expectedTopRow = [65, 66, 67, 68, 69, 70, 71, 72];
  if (topRow.join(",") !== expectedTopRow.join(",")) {
    issues.push(
      `top row mismatch: got [${topRow.join(",")}], expected [${expectedTopRow.join(",")}]`
    );
  }

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

  for (let id = 1; id <= TOTAL; id++) {
    const { row, col } = rowColForId(id);
    if (row < 0 || row >= ROWS || col < 0 || col >= COLS) {
      issues.push(`id ${id}: row/col out of range (${row},${col})`);
      continue;
    }
    const roundtrip = idForRowCol(row, col);
    if (roundtrip !== id) {
      issues.push(`id ${id}: inverse mismatch, rowCol=(${row},${col}) -> ${roundtrip}`);
    }
  }

  for (let id = 1; id < TOTAL; id++) {
    const a = rowColForId(id);
    const b = rowColForId(id + 1);
    const distance = Math.abs(a.col - b.col) + Math.abs(a.row - b.row);
    if (distance !== 1) {
      issues.push(
        `ids ${id}↔${id + 1}: not adjacent, (${a.row},${a.col}) ↔ (${b.row},${b.col})`
      );
    }
  }

  return issues;
}

function center(rect: RectLike) {
  return { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 };
}

/**
 * Проверяет уже загруженную геометрию (включая localStorage), чтобы старый
 * сохранённый layout не мог визуально перевернуть верхнюю строку 65→72.
 */
export function verifyLayoutGeometry(layout: LayoutLike): string[] {
  const issues: string[] = [];
  for (let id = 1; id <= TOTAL; id++) {
    const rect = layout[id];
    if (!rect) {
      issues.push(`layout: missing rect for id ${id}`);
      continue;
    }
    if (![rect.x, rect.y, rect.w, rect.h].every(Number.isFinite)) {
      issues.push(`layout: invalid rect for id ${id}`);
    }
  }

  for (let row = 0; row < ROWS; row++) {
    const ids = rowIds(row);
    for (let i = 0; i < ids.length - 1; i++) {
      const left = layout[ids[i]];
      const right = layout[ids[i + 1]];
      if (!left || !right) continue;
      if (center(left).x >= center(right).x) {
        issues.push(`layout row ${row}: id ${ids[i]} must be left of id ${ids[i + 1]}`);
      }
    }
  }

  for (let row = 0; row < ROWS - 1; row++) {
    const lowerIds = rowIds(row);
    const upperIds = rowIds(row + 1);
    for (let col = 0; col < COLS; col++) {
      const lower = layout[lowerIds[col]];
      const upper = layout[upperIds[col]];
      if (!lower || !upper) continue;
      const lowerCenter = center(lower);
      const upperCenter = center(upper);
      const tolerance = Math.max(lower.w, upper.w) * 0.6;
      if (upperCenter.y >= lowerCenter.y) {
        issues.push(`layout col ${col}: row ${row + 1} must be above row ${row}`);
      }
      if (Math.abs(upperCenter.x - lowerCenter.x) > tolerance) {
        issues.push(
          `layout seam row ${row}/${row + 1}, col ${col}: ids ${lowerIds[col]}↔${upperIds[col]} are not vertically aligned`
        );
      }
    }
  }

  return issues;
}

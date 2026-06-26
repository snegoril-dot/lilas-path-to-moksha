import { describe, expect, it } from "vitest";
import {
  COLS,
  ROWS,
  TOTAL,
  expectedRowIds,
  idForRowCol,
  rowColForId,
  rowIds,
  verifyBoardMapping,
} from "./board-layout";

describe("board-layout / бустрофедон", () => {
  it("ROWS=9, COLS=8, TOTAL=72", () => {
    expect(ROWS).toBe(9);
    expect(COLS).toBe(8);
    expect(TOTAL).toBe(72);
  });

  it("первая строка (r=0) идёт 1→8 слева-направо", () => {
    expect(rowIds(0)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it("вторая строка (r=1) реверсирована: 16→9", () => {
    expect(rowIds(1)).toEqual([16, 15, 14, 13, 12, 11, 10, 9]);
  });

  it("последняя строка (r=8) НЕ перевёрнута: 65→72", () => {
    // Регрессия: раньше код принудительно реверсировал последнюю строку.
    expect(rowIds(ROWS - 1)).toEqual([65, 66, 67, 68, 69, 70, 71, 72]);
  });

  it("любая чётная строка идёт слева-направо, нечётная — справа-налево", () => {
    for (let r = 0; r < ROWS; r++) {
      const ids = rowIds(r);
      if (r % 2 === 0) {
        expect(ids[0]).toBe(r * COLS + 1);
        expect(ids[COLS - 1]).toBe(r * COLS + COLS);
      } else {
        expect(ids[0]).toBe(r * COLS + COLS);
        expect(ids[COLS - 1]).toBe(r * COLS + 1);
      }
    }
  });

  it("idForRowCol совпадает с expectedRowIds для всех клеток", () => {
    for (let r = 0; r < ROWS; r++) {
      const got = Array.from({ length: COLS }, (_, c) => idForRowCol(r, c));
      expect(got).toEqual(expectedRowIds(r));
    }
  });

  it("rowColForId является обратной функцией к idForRowCol", () => {
    for (let id = 1; id <= TOTAL; id++) {
      const { row, col } = rowColForId(id);
      expect(idForRowCol(row, col)).toBe(id);
    }
  });

  it("каждое число 1..72 встречается ровно один раз", () => {
    const all = Array.from({ length: ROWS }, (_, r) => rowIds(r)).flat();
    expect(all).toHaveLength(TOTAL);
    expect(new Set(all).size).toBe(TOTAL);
    for (let i = 1; i <= TOTAL; i++) expect(all).toContain(i);
  });

  it("соседние ID физически соседствуют на сетке, включая стыки рядов", () => {
    for (let id = 1; id < TOTAL; id++) {
      const a = rowColForId(id);
      const b = rowColForId(id + 1);
      expect(Math.abs(a.col - b.col) + Math.abs(a.row - b.row)).toBe(1);
    }
  });

  it("стык 64↔65 расположен строго друг над другом", () => {
    expect(rowColForId(64)).toEqual({ row: 7, col: 0 });
    expect(rowColForId(65)).toEqual({ row: 8, col: 0 });
  });

  it("verifyBoardMapping возвращает пустой список проблем", () => {
    expect(verifyBoardMapping()).toEqual([]);
  });
});

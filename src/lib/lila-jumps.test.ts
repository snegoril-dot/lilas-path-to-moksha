import { describe, expect, it } from "vitest";
import { BOARD, LADDERS, SNAKES } from "./lila-board";
import { TOTAL, rowColForId } from "./board-layout";

describe("lila / стрелы и змеи", () => {
  it("ровно 8 стрел (лестниц)", () => {
    expect(Object.keys(LADDERS)).toHaveLength(8);
  });

  it("ровно 9 змей", () => {
    expect(Object.keys(SNAKES)).toHaveLength(9);
  });

  it("источники и цели находятся в диапазоне 1..72 и не совпадают", () => {
    for (const [from, to] of [...Object.entries(LADDERS), ...Object.entries(SNAKES)]) {
      const f = Number(from);
      expect(f).toBeGreaterThanOrEqual(1);
      expect(f).toBeLessThanOrEqual(TOTAL);
      expect(to).toBeGreaterThanOrEqual(1);
      expect(to).toBeLessThanOrEqual(TOTAL);
      expect(to).not.toBe(f);
    }
  });

  it("каждая стрела ведёт визуально ВВЕРХ (row цели > row источника)", () => {
    for (const [from, to] of Object.entries(LADDERS)) {
      const a = rowColForId(Number(from));
      const b = rowColForId(to);
      expect(b.row).toBeGreaterThan(a.row);
    }
  });

  it("каждая змея ведёт визуально ВНИЗ (row цели < row источника)", () => {
    for (const [from, to] of Object.entries(SNAKES)) {
      const a = rowColForId(Number(from));
      const b = rowColForId(to);
      expect(b.row).toBeLessThan(a.row);
    }
  });

  it("источники стрел и змей не пересекаются", () => {
    const lset = new Set(Object.keys(LADDERS));
    for (const k of Object.keys(SNAKES)) expect(lset.has(k)).toBe(false);
  });

  it("BOARD корректно помечает все клетки змеями/лестницами с jumpTo", () => {
    for (const [from, to] of Object.entries(LADDERS)) {
      const cell = BOARD[Number(from) - 1];
      expect(cell.type).toBe("ladder");
      expect(cell.jumpTo).toBe(to);
    }
    for (const [from, to] of Object.entries(SNAKES)) {
      const cell = BOARD[Number(from) - 1];
      expect(cell.type).toBe("snake");
      expect(cell.jumpTo).toBe(to);
    }
  });

  it("ни одна цель змеи не равна цели лестницы из той же клетки", () => {
    const all = new Map<number, number[]>();
    for (const [f, t] of Object.entries({ ...LADDERS, ...SNAKES })) {
      const k = Number(f);
      all.set(k, [...(all.get(k) ?? []), t]);
    }
    for (const [, targets] of all) expect(new Set(targets).size).toBe(targets.length);
  });
});

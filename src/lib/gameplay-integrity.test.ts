import { describe, expect, it } from "vitest";
import { BOARD, LADDERS, SNAKES } from "./lila-board";
import { getCellExperience } from "./cell-experience";

/**
 * Extra integrity guarantees requested by the gameplay-tests task:
 * these lock in properties the UI relies on (unique ids, Moksha exists,
 * jumps stay in-bounds, cell content never empty).
 */
describe("board data integrity", () => {
  it("has exactly 72 cells with unique ids covering 1..72", () => {
    expect(BOARD).toHaveLength(72);
    const ids = BOARD.map((c) => c.id);
    expect(new Set(ids).size).toBe(72);
    for (let i = 1; i <= 72; i++) expect(ids).toContain(i);
  });

  it("Moksha cell (68) exists and is marked as end", () => {
    const moksha = BOARD.find((c) => c.id === 68);
    expect(moksha).toBeDefined();
    expect(moksha!.type).toBe("end");
    expect(moksha!.name.toLowerCase()).toContain("кайлас");
  });

  it("every snake/ladder source and destination is a real cell (1..72) and does not self-loop", () => {
    const ids = new Set(BOARD.map((c) => c.id));
    for (const [from, to] of Object.entries({ ...LADDERS, ...SNAKES })) {
      const f = Number(from);
      expect(ids.has(f)).toBe(true);
      expect(ids.has(to)).toBe(true);
      expect(to).not.toBe(f);
    }
  });

  it("no jump target lands on the start cell", () => {
    for (const to of [...Object.values(LADDERS), ...Object.values(SNAKES)]) {
      expect(to).not.toBe(1);
      expect(to).toBeGreaterThanOrEqual(2);
    }
  });
});

describe("cell content shape (shortMeaning / reflectionQuestion / dailyPractice)", () => {
  it("provides a non-empty value or fallback for every cell", () => {
    for (let id = 1; id <= 72; id++) {
      const exp = getCellExperience(id);
      expect(exp, `cell ${id}`).not.toBeNull();
      expect(exp!.shortMeaning.trim().length).toBeGreaterThan(0);
      expect(exp!.reflectionQuestion.trim().length).toBeGreaterThan(0);
      expect(exp!.dailyPractice.trim().length).toBeGreaterThan(0);
    }
  });

  it("degrades gracefully outside the board (returns null, no throw)", () => {
    expect(() => getCellExperience(-1)).not.toThrow();
    expect(getCellExperience(-1)).toBeNull();
    expect(getCellExperience(1000)).toBeNull();
  });

  it("tone is one of the known values for every cell", () => {
    const allowed = new Set(["shadow", "gift", "neutral", "transition", "liberation"]);
    for (let id = 1; id <= 72; id++) {
      const exp = getCellExperience(id)!;
      expect(allowed.has(exp.tone)).toBe(true);
    }
  });
});

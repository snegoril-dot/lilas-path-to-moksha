import { describe, it, expect } from "vitest";
import { BOARD, LADDERS, SNAKES, MOKSHA_CELL_ID, getCellExperience } from "./cells";
import { COPY } from "./copy";

describe("content integrity", () => {
  it("has all 72 cells with id/name/wisdom", () => {
    expect(BOARD).toHaveLength(72);
    for (const c of BOARD) {
      expect(c.id).toBeGreaterThanOrEqual(1);
      expect(c.id).toBeLessThanOrEqual(72);
      expect(c.name.trim().length).toBeGreaterThan(0);
      expect((c.wisdom ?? "").trim().length).toBeGreaterThan(0);
    }
  });

  it("Moksha cell exists", () => {
    expect(BOARD.find((c) => c.id === MOKSHA_CELL_ID)).toBeDefined();
  });

  it("ladder and snake destinations are valid cells", () => {
    const ids = new Set(BOARD.map((c) => c.id));
    for (const [from, to] of Object.entries(LADDERS)) {
      expect(ids.has(Number(from))).toBe(true);
      expect(ids.has(to)).toBe(true);
    }
    for (const [from, to] of Object.entries(SNAKES)) {
      expect(ids.has(Number(from))).toBe(true);
      expect(ids.has(to)).toBe(true);
    }
  });

  it("every cell has reflection fallback via getCellExperience", () => {
    for (const c of BOARD) {
      const exp = getCellExperience(c.id);
      expect(exp.reflectionQuestion.trim().length).toBeGreaterThan(0);
      expect(exp.shortMeaning.trim().length).toBeGreaterThan(0);
    }
  });

  it("required UI copy keys are non-empty", () => {
    const walk = (obj: Record<string, unknown>, path = "") => {
      for (const [k, v] of Object.entries(obj)) {
        const p = path ? `${path}.${k}` : k;
        if (typeof v === "string") {
          expect(v.trim().length, `copy ${p} must be non-empty`).toBeGreaterThan(0);
        } else if (v && typeof v === "object") {
          walk(v as Record<string, unknown>, p);
        }
      }
    };
    walk(COPY as unknown as Record<string, unknown>);
  });
});

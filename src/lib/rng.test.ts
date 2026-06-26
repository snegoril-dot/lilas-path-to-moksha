import { describe, it, expect } from "vitest";
import { mulberry32, rollDice } from "./rng";
import { computeNewPosition, resolveJump } from "./lila-board";

describe("seeded RNG (mulberry32)", () => {
  it("produces identical sequences for the same seed", () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    for (let i = 0; i < 20; i++) expect(a()).toBe(b());
  });

  it("rollDice with seed always lands in 1..6", () => {
    const rng = mulberry32(123);
    for (let i = 0; i < 1000; i++) {
      const v = rollDice(rng);
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(6);
    }
  });

  it("reproduces a deterministic game run end-to-end", () => {
    // Scripted sequence reaches Кайлас (cell 68) via ladders.
    const rolls = [5, 5, 3, 6, 3];
    let pos = 1;
    const trace: number[] = [];
    for (const roll of rolls) {
      pos = computeNewPosition(pos, roll);
      pos = resolveJump(pos).final;
      trace.push(pos);
    }
    expect(trace).toEqual([6, 33, 59, 65, 68]);
    expect(pos).toBe(68);
  });
});

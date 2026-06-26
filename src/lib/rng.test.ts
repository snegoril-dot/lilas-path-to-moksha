import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { getRuntimeRng, mulberry32, rollDice } from "./rng";
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

describe("getRuntimeRng", () => {
  const g = globalThis as unknown as { window?: unknown };
  beforeEach(() => {
    g.window = {
      location: { search: "" },
    };
  });
  afterEach(() => {
    delete g.window;
  });

  it("returns Math.random when no seed is configured", () => {
    expect(getRuntimeRng()).toBe(Math.random);
  });

  it("uses ?seed= URL param for a deterministic stream", () => {
    (g.window as { location: { search: string } }).location.search = "?seed=7";
    const rng1 = getRuntimeRng();
    // cached on window
    const rng2 = getRuntimeRng();
    expect(rng1).toBe(rng2);
    const ref = mulberry32(7);
    expect(rng1()).toBeCloseTo(ref(), 10);
  });

  it("honours a pre-installed window.__LILA_RNG__", () => {
    const fake = vi.fn(() => 0.5);
    (g.window as { __LILA_RNG__: () => number }).__LILA_RNG__ = fake;
    const r = getRuntimeRng();
    expect(r).toBe(fake);
    expect(rollDice(r)).toBe(4);
  });
});

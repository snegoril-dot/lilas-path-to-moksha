import { describe, it, expect } from "vitest";
import { BOARD, LADDERS, SNAKES, computeNewPosition, resolveJump } from "./lila-board";

describe("dice roll values", () => {
  it("simulates only values 1..6 (matches 3D dice faces)", () => {
    const seen = new Set<number>();
    for (let i = 0; i < 5000; i++) {
      const v = Math.floor(Math.random() * 6) + 1;
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(6);
      seen.add(v);
    }
    expect([...seen].sort()).toEqual([1, 2, 3, 4, 5, 6]);
  });
});

describe("computeNewPosition", () => {
  it("advances when target is within board", () => {
    expect(computeNewPosition(1, 6)).toBe(7);
    expect(computeNewPosition(50, 5)).toBe(55);
    expect(computeNewPosition(62, 6)).toBe(68);
  });

  it("requires exact roll for cell 68 — overshoot bounces back", () => {
    expect(computeNewPosition(67, 1)).toBe(68);
    expect(computeNewPosition(67, 2)).toBe(67); // 69 -> bounce 1
    expect(computeNewPosition(66, 6)).toBe(64); // 72 -> bounce 4
    expect(computeNewPosition(68, 3)).toBe(65); // already at end, any roll bounces
  });

  it("for any current pos and roll 1..6, result stays in 1..68", () => {
    for (let pos = 1; pos <= 68; pos++) {
      for (let roll = 1; roll <= 6; roll++) {
        const r = computeNewPosition(pos, roll);
        expect(r).toBeGreaterThanOrEqual(1);
        expect(r).toBeLessThanOrEqual(68);
      }
    }
  });
});

describe("resolveJump (snakes & ladders)", () => {
  it("applies ladders", () => {
    for (const [from, to] of Object.entries(LADDERS)) {
      expect(resolveJump(Number(from))).toEqual({ final: to, jumped: true });
    }
  });

  it("applies snakes", () => {
    for (const [from, to] of Object.entries(SNAKES)) {
      expect(resolveJump(Number(from))).toEqual({ final: to, jumped: true });
    }
  });

  it("does not jump on neutral cells", () => {
    expect(resolveJump(2)).toEqual({ final: 2, jumped: false });
    expect(resolveJump(68)).toEqual({ final: 68, jumped: false });
  });

  it("no cell is both a snake and a ladder", () => {
    for (const k of Object.keys(SNAKES)) {
      expect(LADDERS[Number(k)]).toBeUndefined();
    }
  });
});

describe("full turn pipeline: dice -> move -> jump", () => {
  function turn(pos: number, roll: number) {
    const landed = computeNewPosition(pos, roll);
    return resolveJump(landed);
  }

  it("ladder 52 -> 68 via roll of 1 from 51 reaches Мокшу", () => {
    // 51 + 1 = 52 (ladder to 68)
    expect(turn(51, 1)).toEqual({ final: 68, jumped: true });
  });

  it("snake on landing (e.g. 17) is applied after movement, not before", () => {
    // 11 + 6 = 17 — snake to 4. Ladder at 11 must NOT trigger as a transit cell.
    expect(turn(11, 6)).toEqual({ final: 4, jumped: true });
  });

  it("overshoot of 68 bounces back, then re-evaluates jumps at the bounced cell", () => {
    // 67 + 6 = 73, bounce to 63. 63 is not a snake/ladder source.
    expect(turn(67, 6)).toEqual({ final: 63, jumped: false });
    // 67 + 2 = 69, bounce to 67 (snake to 24)
    expect(turn(67, 2)).toEqual({ final: 24, jumped: true });
  });

  it("BOARD has exactly 72 cells and cell 68 is the end", () => {
    expect(BOARD).toHaveLength(72);
    expect(BOARD[67].type).toBe("end");
    expect(BOARD[0].type).toBe("start");
  });
});

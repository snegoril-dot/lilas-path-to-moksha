import { describe, it, expect } from "vitest";
import { BOARD, LADDERS, SNAKES, computeNewPosition, resolveJump } from "./lila-board";

describe("dice roll values", () => {
  it("simulates only values 1..6", () => {
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

describe("computeNewPosition (classical Johari rule)", () => {
  it("advances when target is within 1..68", () => {
    expect(computeNewPosition(1, 6)).toBe(7);
    expect(computeNewPosition(50, 5)).toBe(55);
    expect(computeNewPosition(62, 6)).toBe(68);
  });

  it("stays put if roll overshoots 68 (must hit exactly)", () => {
    expect(computeNewPosition(67, 1)).toBe(68);
    expect(computeNewPosition(67, 2)).toBe(67); // overshoot — stays
    expect(computeNewPosition(66, 6)).toBe(66);
    expect(computeNewPosition(68, 3)).toBe(68); // already at end (defensive)
  });

  it("for any pos in 1..68 and roll 1..6, result stays in 1..68", () => {
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

  it("all jump destinations are valid 1..72 cells", () => {
    for (const dest of [...Object.values(LADDERS), ...Object.values(SNAKES)]) {
      expect(dest).toBeGreaterThanOrEqual(1);
      expect(dest).toBeLessThanOrEqual(72);
    }
  });
});

describe("full turn pipeline: dice -> move -> jump (classical Johari)", () => {
  function turn(pos: number, roll: number) {
    const landed = computeNewPosition(pos, roll);
    return resolveJump(landed);
  }

  it("ladder 54 -> 68 reaches Мокшу via roll of 4 from 50", () => {
    // 50 + 4 = 54 (ladder to 68)
    expect(turn(50, 4)).toEqual({ final: 68, jumped: true });
  });

  it("ladder 10 -> 23: rolling 4 from 6 climbs to Свargу", () => {
    expect(turn(6, 4)).toEqual({ final: 23, jumped: true });
  });

  it("snake 52 -> 35: rolling 2 from 50 falls due to гордыни", () => {
    expect(turn(50, 2)).toEqual({ final: 35, jumped: true });
  });

  it("jump is applied AFTER move (transit cells do not trigger)", () => {
    // 9 + 5 = 14 (neutral). Ladder at 10 must NOT trigger as transit.
    expect(turn(9, 5)).toEqual({ final: 14, jumped: false });
  });

  it("overshoot leaves player put (no bounce in Johari Lila)", () => {
    // 67 + 6 = 73 -> stays at 67, no snake/ladder triggered
    expect(turn(67, 6)).toEqual({ final: 67, jumped: false });
    expect(turn(65, 5)).toEqual({ final: 65, jumped: false });
  });

  it("BOARD has exactly 72 cells; cell 68 is Кайлас (end), cell 1 is start", () => {
    expect(BOARD).toHaveLength(72);
    expect(BOARD[67].type).toBe("end");
    expect(BOARD[0].type).toBe("start");
  });

  it("every cell has a plane in 0..8", () => {
    for (const c of BOARD) {
      expect(c.plane).toBeGreaterThanOrEqual(0);
      expect(c.plane).toBeLessThanOrEqual(8);
    }
  });
});

import { describe, expect, it } from "vitest";
import { z } from "zod";
import { BOARD } from "./lila-board";

/**
 * Documents the runtime shape of a Lila session snapshot that is persisted
 * (Supabase row / local resume payload / share input). If a field is renamed
 * or dropped, these tests should fail so we notice before UI breaks.
 */
const SessionSnapshot = z.object({
  currentCell: z.number().int().min(0).max(72),
  sankalpa: z.string().nullable(),
  rollHistory: z.array(z.number().int().min(1).max(6)),
  pathLog: z.array(
    z.object({
      from: z.number().int().min(0).max(72),
      to: z.number().int().min(0).max(72),
      roll: z.number().int().min(1).max(6),
      kind: z.enum(["move", "snake", "ladder", "stay", "birth", "moksha"]),
      at: z.number().int(),
    }),
  ),
  status: z.enum(["waiting_birth", "playing", "finished", "paused"]),
  startedAt: z.number().int(),
  updatedAt: z.number().int(),
});

describe("session snapshot shape", () => {
  it("accepts a fresh waiting-for-birth session", () => {
    const s = {
      currentCell: 0,
      sankalpa: "Хочу увидеть, что мной движет",
      rollHistory: [],
      pathLog: [],
      status: "waiting_birth" as const,
      startedAt: Date.now(),
      updatedAt: Date.now(),
    };
    expect(() => SessionSnapshot.parse(s)).not.toThrow();
  });

  it("accepts an in-progress session with snake + ladder events", () => {
    const now = Date.now();
    const s = {
      currentCell: 23,
      sankalpa: null,
      rollHistory: [6, 4, 3, 2],
      pathLog: [
        { from: 0, to: 1, roll: 6, kind: "birth" as const, at: now - 4000 },
        { from: 1, to: 5, roll: 4, kind: "move" as const, at: now - 3000 },
        { from: 5, to: 10, roll: 5, kind: "move" as const, at: now - 2000 },
        { from: 10, to: 23, roll: 0 as unknown as number, kind: "ladder" as const, at: now - 1500 },
      ],
      status: "playing" as const,
      startedAt: now - 5000,
      updatedAt: now,
    };
    // jump events store the triggering roll; use a valid 1..6
    s.pathLog[3].roll = 1;
    expect(() => SessionSnapshot.parse(s)).not.toThrow();
  });

  it("accepts a completed (moksha) session", () => {
    const now = Date.now();
    const s = {
      currentCell: 68,
      sankalpa: "Освобождение",
      rollHistory: [6, 1],
      pathLog: [
        { from: 0, to: 1, roll: 6, kind: "birth" as const, at: now - 2000 },
        { from: 67, to: 68, roll: 1, kind: "moksha" as const, at: now },
      ],
      status: "finished" as const,
      startedAt: now - 10_000,
      updatedAt: now,
    };
    expect(() => SessionSnapshot.parse(s)).not.toThrow();
  });

  it("rejects unknown status and out-of-range cell", () => {
    expect(() =>
      SessionSnapshot.parse({
        currentCell: 99,
        sankalpa: null,
        rollHistory: [],
        pathLog: [],
        status: "won",
        startedAt: 0,
        updatedAt: 0,
      }),
    ).toThrow();
  });

  it("pathLog references map onto real board cells", () => {
    const ids = new Set(BOARD.map((c) => c.id));
    const events = [
      { from: 1, to: 5 },
      { from: 10, to: 23 },
      { from: 67, to: 68 },
    ];
    for (const e of events) {
      expect(ids.has(e.from)).toBe(true);
      expect(ids.has(e.to)).toBe(true);
    }
  });
});

import { describe, expect, it } from "vitest";
import { resolveEntry, SOFT_MERCY_AFTER } from "./game-mode";

describe("resolveEntry — classic mode", () => {
  it("only a real 6 enters the board", () => {
    for (const v of [1, 2, 3, 4, 5]) {
      const r = resolveEntry("classic", v, 10);
      expect(r.entered).toBe(false);
      expect(r.mercy).toBe(false);
      expect(r.effective).toBe(v);
      expect(r.nextEntryMisses).toBe(11);
    }
    const six = resolveEntry("classic", 6, 5);
    expect(six.entered).toBe(true);
    expect(six.mercy).toBe(false);
    expect(six.nextEntryMisses).toBe(0);
  });

  it("never applies mercy no matter how many misses", () => {
    const r = resolveEntry("classic", 3, 99);
    expect(r.mercy).toBe(false);
    expect(r.entered).toBe(false);
  });
});

describe("resolveEntry — soft mode", () => {
  it("does not force a 6 before the mercy threshold", () => {
    for (let miss = 0; miss < SOFT_MERCY_AFTER; miss++) {
      const r = resolveEntry("soft", 2, miss);
      expect(r.mercy).toBe(false);
      expect(r.entered).toBe(false);
      expect(r.nextEntryMisses).toBe(miss + 1);
    }
  });

  it("forces a 6 on the next roll after 3 misses", () => {
    const r = resolveEntry("soft", 4, SOFT_MERCY_AFTER);
    expect(r.mercy).toBe(true);
    expect(r.entered).toBe(true);
    expect(r.effective).toBe(6);
    expect(r.nextEntryMisses).toBe(0);
  });

  it("a real 6 still enters and never counts as mercy", () => {
    const r = resolveEntry("soft", 6, SOFT_MERCY_AFTER);
    expect(r.entered).toBe(true);
    expect(r.mercy).toBe(false);
    expect(r.nextEntryMisses).toBe(0);
  });
});

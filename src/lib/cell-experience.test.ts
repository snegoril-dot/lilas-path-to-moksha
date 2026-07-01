import { describe, it, expect } from "vitest";
import { getCellExperience } from "./cell-experience";

describe("cell-experience", () => {
  it("returns data for all 72 cells with non-empty core fields", () => {
    for (let i = 1; i <= 72; i++) {
      const exp = getCellExperience(i);
      expect(exp, `cell ${i}`).not.toBeNull();
      expect(exp!.shortMeaning.length).toBeGreaterThan(0);
      expect(exp!.reflectionQuestion.length).toBeGreaterThan(0);
      expect(exp!.dailyPractice.length).toBeGreaterThan(0);
      expect(Array.isArray(exp!.keywords)).toBe(true);
    }
  });

  it("returns null outside bounds", () => {
    expect(getCellExperience(0)).toBeNull();
    expect(getCellExperience(73)).toBeNull();
  });

  it("assigns tones from cell type", () => {
    expect(getCellExperience(1)!.tone).toBe("transition"); // start
    expect(getCellExperience(68)!.tone).toBe("liberation"); // end
    expect(getCellExperience(12)!.tone).toBe("shadow"); // snake
    expect(getCellExperience(10)!.tone).toBe("gift"); // ladder
  });
});

import { describe, it, expect } from "vitest";
import { getCellExperience, TONE_LABEL, type CellTone } from "./cell-experience";
import { LADDERS, SNAKES } from "./lila-board";

const VALID_TONES: CellTone[] = ["shadow", "gift", "neutral", "transition", "liberation"];

// Blame / deterministic / fortune-telling phrases we don't want in curated copy.
const BANNED_SUBSTRINGS = [
  "ты всегда",
  "ты обязан",
  "это точно значит",
  "судьба говорит",
  "наказание",
];

describe("cell-experience", () => {
  it("returns fully curated data for all 72 cells", () => {
    for (let id = 1; id <= 72; id++) {
      const exp = getCellExperience(id);
      expect(exp, `cell ${id}`).not.toBeNull();
      const e = exp!;

      // shortMeaning: 1 short sentence, non-empty, not overly long
      expect(e.shortMeaning.length, `cell ${id} shortMeaning`).toBeGreaterThan(10);
      expect(e.shortMeaning.length).toBeLessThanOrEqual(200);

      // reflectionQuestion: ends with question mark, non-empty
      expect(e.reflectionQuestion.length).toBeGreaterThan(10);
      expect(e.reflectionQuestion.trim().endsWith("?"), `cell ${id} question`).toBe(true);

      // dailyPractice: non-empty
      expect(e.dailyPractice.length).toBeGreaterThan(10);

      // keywords: 3–6 non-empty strings
      expect(Array.isArray(e.keywords)).toBe(true);
      expect(e.keywords.length, `cell ${id} keywords count`).toBeGreaterThanOrEqual(3);
      expect(e.keywords.length).toBeLessThanOrEqual(6);
      for (const kw of e.keywords) {
        expect(typeof kw).toBe("string");
        expect(kw.trim().length).toBeGreaterThan(0);
      }

      // tone: valid enum value
      expect(VALID_TONES).toContain(e.tone);

      // No blame/deterministic language in any user-facing field
      const combined = [e.shortMeaning, e.reflectionQuestion, e.dailyPractice].join(" ").toLowerCase();
      for (const bad of BANNED_SUBSTRINGS) {
        expect(combined.includes(bad), `cell ${id} contains banned "${bad}"`).toBe(false);
      }
    }
  });

  it("returns null outside bounds", () => {
    expect(getCellExperience(0)).toBeNull();
    expect(getCellExperience(73)).toBeNull();
  });

  it("assigns expected tones for structural cells", () => {
    expect(getCellExperience(1)!.tone).toBe("transition"); // start
    expect(getCellExperience(68)!.tone).toBe("liberation"); // moksha
    // Snake sources default to shadow, ladder sources to gift.
    for (const src of Object.keys(SNAKES).map(Number)) {
      expect(getCellExperience(src)!.tone, `snake ${src}`).toBe("shadow");
    }
    for (const src of Object.keys(LADDERS).map(Number)) {
      expect(getCellExperience(src)!.tone, `ladder ${src}`).toBe("gift");
    }
  });

  it("exposes a Russian label for every tone", () => {
    for (const tone of VALID_TONES) {
      expect(TONE_LABEL[tone].length).toBeGreaterThan(0);
    }
  });
});

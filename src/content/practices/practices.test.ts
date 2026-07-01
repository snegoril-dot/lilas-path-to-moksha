import { describe, it, expect } from "vitest";
import {
  PRACTICES_BY_CELL,
  AUTHORED_PRACTICE_CELLS,
  getPracticesForCell,
  findPractice,
} from "./index";

describe("practices registry", () => {
  it("покрывает все 72 клетки", () => {
    for (let id = 1; id <= 72; id++) {
      const list = getPracticesForCell(id);
      expect(list.length, `клетка ${id}`).toBeGreaterThan(0);
    }
  });

  it("авторские клетки заполнены расширенными полями", () => {
    for (const id of AUTHORED_PRACTICE_CELLS) {
      for (const p of PRACTICES_BY_CELL[id]) {
        expect(p.invitation, `${id}/${p.id} invitation`).toBeTruthy();
        expect(
          (p.noticePrompts ?? []).length,
          `${id}/${p.id} notice`,
        ).toBeGreaterThanOrEqual(3);
        expect(
          (p.journalPrompts ?? []).length,
          `${id}/${p.id} journal`,
        ).toBeGreaterThanOrEqual(2);
        expect(p.safety, `${id}/${p.id} safety`).toBeTruthy();
        expect(
          p.completionCriteria,
          `${id}/${p.id} completion`,
        ).toBeTruthy();
        expect(
          p.closingReflection,
          `${id}/${p.id} closing`,
        ).toBeTruthy();
        expect(
          p.recommendedDuration && p.durations.includes(p.recommendedDuration),
          `${id}/${p.id} recommendedDuration ∈ durations`,
        ).toBe(true);
      }
    }
  });

  it("findPractice возвращает конкретный id", () => {
    expect(findPractice(1, "birth-breath")?.title).toBe("Три дыхания рождения");
    expect(findPractice(2, "does-not-exist")).toBeNull();
  });

  it("нет дублей title внутри клетки", () => {
    for (let id = 1; id <= 72; id++) {
      const titles = getPracticesForCell(id).map((p) => p.title);
      expect(new Set(titles).size, `клетка ${id}`).toBe(titles.length);
    }
  });

  it("покрытие маяков включает 10 клеток Фазы 1", () => {
    const expected = [1, 9, 10, 12, 28, 41, 51, 63, 68, 72];
    for (const id of expected) {
      expect(AUTHORED_PRACTICE_CELLS, `маяк ${id}`).toContain(id);
    }
  });
});

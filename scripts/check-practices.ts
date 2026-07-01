/**
 * Валидатор контента практик.
 * Запуск: `bunx tsx scripts/check-practices.ts` (или через vitest).
 *
 * Проверяет:
 *  - все 72 клетки имеют минимум 1 практику;
 *  - в каждой практике ≥2 шагов и ≥3 рефлексии;
 *  - нет дублей title внутри клетки;
 *  - длительности не пустые.
 */
import { PRACTICES_BY_CELL } from "../src/content/practices";

const errors: string[] = [];

for (let id = 1; id <= 72; id++) {
  const list = PRACTICES_BY_CELL[id] ?? [];
  if (list.length === 0) {
    errors.push(`Клетка ${id}: нет ни одной практики.`);
    continue;
  }
  const titles = new Set<string>();
  for (const p of list) {
    if (p.steps.length < 2) errors.push(`Клетка ${id} / ${p.id}: <2 шагов.`);
    if (p.reflectionPrompts.length < 3)
      errors.push(`Клетка ${id} / ${p.id}: <3 промптов рефлексии.`);
    if (p.durations.length === 0)
      errors.push(`Клетка ${id} / ${p.id}: пустые длительности.`);
    if (titles.has(p.title))
      errors.push(`Клетка ${id}: дубль названия «${p.title}».`);
    titles.add(p.title);
    if (!p.intention.trim())
      errors.push(`Клетка ${id} / ${p.id}: пустое намерение.`);
    if (!p.closingRitual.trim())
      errors.push(`Клетка ${id} / ${p.id}: пустой ритуал завершения.`);
  }
}

if (errors.length) {
  console.error("Практики: найдено проблем:", errors.length);
  for (const e of errors) console.error("  •", e);
  process.exit(1);
} else {
  console.log("Практики: все 72 клетки покрыты, всё ок.");
}

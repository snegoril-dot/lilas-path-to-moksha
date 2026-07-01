/**
 * Валидатор контента практик.
 * Запуск: `bunx tsx scripts/check-practices.ts`
 *
 * Проверяет:
 *  - все 72 клетки имеют минимум 1 практику;
 *  - структурные минимумы (шаги, рефлексии, длительности);
 *  - нет дублей title внутри клетки;
 *  - все обязательные и повышенные поля непустые;
 *  - у авторских практик заполнены commercial-grade поля
 *    (invitation, noticePrompts, journalPrompts, safety,
 *     completionCriteria, closingReflection);
 *  - тон-стоп-лист: никаких «должен / обязан / гарантирую»;
 *  - длины строк в разумных пределах.
 */
import {
  PRACTICES_BY_CELL,
  AUTHORED_PRACTICE_CELLS,
} from "../src/content/practices";

const errors: string[] = [];
const warnings: string[] = [];

const TONE_FORBIDDEN = [
  /\bдолжен\b/i,
  /\bдолжна\b/i,
  /\bобязан\b/i,
  /\bобязана\b/i,
  /\bгаранти/i,
  /\bстрик\b/i,
  /\bнельзя\s+пропуск/i,
];

function checkTone(where: string, text: string | undefined) {
  if (!text) return;
  for (const rx of TONE_FORBIDDEN) {
    if (rx.test(text)) {
      errors.push(`${where}: недопустимый тон («${rx.source}») → "${text}"`);
    }
  }
}

const AUTHORED = new Set(AUTHORED_PRACTICE_CELLS);

for (let id = 1; id <= 72; id++) {
  const list = PRACTICES_BY_CELL[id] ?? [];
  if (list.length === 0) {
    errors.push(`Клетка ${id}: нет ни одной практики.`);
    continue;
  }
  const titles = new Set<string>();
  for (const p of list) {
    const tag = `Клетка ${id} / ${p.id}`;

    // Базовые поля
    if (p.steps.length < 2) errors.push(`${tag}: <2 шагов.`);
    if (p.reflectionPrompts.length < 3)
      errors.push(`${tag}: <3 промптов рефлексии.`);
    if (p.durations.length === 0)
      errors.push(`${tag}: пустые длительности.`);
    if (titles.has(p.title))
      errors.push(`Клетка ${id}: дубль названия «${p.title}».`);
    titles.add(p.title);
    if (!p.intention.trim()) errors.push(`${tag}: пустое намерение.`);
    if (!p.closingRitual.trim())
      errors.push(`${tag}: пустой ритуал завершения.`);
    if (p.title.length > 42)
      warnings.push(`${tag}: title длинноват (${p.title.length}).`);

    // Расширенные поля — обязательны для авторских клеток
    if (AUTHORED.has(id)) {
      if (!p.invitation || p.invitation.length < 20)
        errors.push(`${tag}: нет invitation (или слишком короткое).`);
      if (!p.noticePrompts || p.noticePrompts.length < 3)
        errors.push(`${tag}: <3 noticePrompts.`);
      if (!p.journalPrompts || p.journalPrompts.length < 2)
        errors.push(`${tag}: <2 journalPrompts.`);
      if (!p.completionCriteria || !p.completionCriteria.trim())
        errors.push(`${tag}: нет completionCriteria.`);
      if (!p.safety || !p.safety.trim())
        errors.push(`${tag}: нет safety.`);
      if (!p.closingReflection || !p.closingReflection.trim())
        errors.push(`${tag}: нет closingReflection.`);
      if (
        !p.recommendedDuration ||
        !p.durations.includes(p.recommendedDuration)
      )
        errors.push(
          `${tag}: recommendedDuration должна быть одной из durations.`,
        );
    }

    // Тон
    checkTone(`${tag}.intention`, p.intention);
    checkTone(`${tag}.invitation`, p.invitation);
    checkTone(`${tag}.closingRitual`, p.closingRitual);
    checkTone(`${tag}.safety`, p.safety);
    for (const s of p.steps) {
      checkTone(`${tag}.step[${s.title}]`, s.title);
      checkTone(`${tag}.step[${s.title}].hint`, s.hint);
    }
    for (const r of p.reflectionPrompts) checkTone(`${tag}.reflection`, r);
    for (const r of p.noticePrompts ?? []) checkTone(`${tag}.notice`, r);
    for (const r of p.journalPrompts ?? []) checkTone(`${tag}.journal`, r);
  }
}

if (warnings.length) {
  console.warn(`Практики: предупреждений ${warnings.length}`);
  for (const w of warnings) console.warn("  ·", w);
}

if (errors.length) {
  console.error(`\nПрактики: найдено проблем: ${errors.length}`);
  for (const e of errors) console.error("  •", e);
  process.exit(1);
} else {
  console.log(
    `\nПрактики: все 72 клетки покрыты, авторских — ${AUTHORED_PRACTICE_CELLS.length}. Всё ок.`,
  );
}

/**
 * Проверка целостности контента Гуру: для всех 72 клеток должны быть
 * заполнены mirror / question / prompts, без пропусков и без дублей вопросов
 * (как внутри клетки, так и между клетками).
 *
 * Запуск:
 *   bun run scripts/check-guru-answers.ts
 * или через npm-скрипт:
 *   bun run content:check:guru
 *
 * Возвращает exit code 1 при ошибках — подходит для CI.
 */
import {
  GURU_CELL_PACKS,
  GURU_CELL_COUNT,
  type GuruCellPack,
} from "../src/content/guru-cell-answers";

type Issue = { level: "error" | "warn"; msg: string };
const issues: Issue[] = [];

const missing: number[] = [];
const empty: number[] = [];
const wrongPromptCount: Array<{ id: number; got: number }> = [];
const intraDup: Array<{ id: number; q: string }> = [];
const interDup = new Map<string, number[]>();

const isNonEmpty = (s: unknown): s is string =>
  typeof s === "string" && s.trim().length > 0;

for (let id = 1; id <= GURU_CELL_COUNT; id++) {
  const pack: GuruCellPack | undefined = GURU_CELL_PACKS[id];
  if (!pack) {
    missing.push(id);
    continue;
  }
  if (!isNonEmpty(pack.mirror) || !isNonEmpty(pack.question)) {
    empty.push(id);
  }
  const prompts = pack.prompts ?? [];
  if (prompts.length < 3) {
    wrongPromptCount.push({ id, got: prompts.length });
  }
  const seenLocal = new Set<string>();
  for (const p of prompts) {
    if (!isNonEmpty(p?.q) || !isNonEmpty(p?.a)) {
      empty.push(id);
      continue;
    }
    const key = p.q.trim().toLowerCase();
    if (seenLocal.has(key)) intraDup.push({ id, q: p.q });
    seenLocal.add(key);
    const list = interDup.get(key) ?? [];
    list.push(id);
    interDup.set(key, list);
  }
}

const crossDups = [...interDup.entries()].filter(([, ids]) => ids.length > 1);

// Report ----------------------------------------------------------------
const ok = (label: string) => console.log(`  ✓ ${label}`);
const bad = (label: string) => {
  console.log(`  ✗ ${label}`);
  issues.push({ level: "error", msg: label });
};

console.log("\n▶ Проверка src/content/guru-cell-answers.ts\n");

if (missing.length === 0) ok(`Все ${GURU_CELL_COUNT} клеток присутствуют`);
else bad(`Пропущены клетки: ${missing.join(", ")}`);

if (empty.length === 0) ok("Все поля mirror/question/prompts заполнены");
else bad(`Пустые поля в клетках: ${[...new Set(empty)].join(", ")}`);

if (wrongPromptCount.length === 0) ok("В каждой клетке минимум 3 Q&A");
else
  bad(
    `Меньше 3 Q&A: ${wrongPromptCount
      .map(({ id, got }) => `клетка ${id} (${got})`)
      .join(", ")}`,
  );

if (intraDup.length === 0) ok("Нет дублей вопросов внутри клеток");
else
  bad(
    `Дубли внутри клеток: ${intraDup
      .map(({ id, q }) => `${id}: «${q}»`)
      .join("; ")}`,
  );

if (crossDups.length === 0) ok("Нет одинаковых вопросов между клетками");
else
  bad(
    `Дубли между клетками:\n    ${crossDups
      .map(([q, ids]) => `«${q}» → клетки ${ids.join(", ")}`)
      .join("\n    ")}`,
  );

const totalQAs = Object.values(GURU_CELL_PACKS).reduce(
  (n, p) => n + (p?.prompts?.length ?? 0),
  0,
);
console.log(
  `\n▶ Итого: ${
    Object.keys(GURU_CELL_PACKS).length
  } клеток, ${totalQAs} Q&A пар.\n`,
);

if (issues.length > 0) {
  console.error(`✖ Найдено проблем: ${issues.length}\n`);
  process.exit(1);
}
console.log("✓ Контент Гуру целостен.\n");

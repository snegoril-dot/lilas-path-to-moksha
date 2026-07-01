/**
 * Content tone lint — warns on deterministic, judgmental or "prophecy"-style
 * wording in user-facing Russian copy. This is intentionally lightweight:
 * it only fails on clearly forbidden phrases; softer patterns are surfaced
 * as console warnings so writers can iterate without blocking the build.
 *
 * Encouraged alternatives (см. src/content/README.md → «Content tone guidelines»):
 *   • «эта клетка показывает…»
 *   • «попробуй заметить…»
 *   • «можно посмотреть на это так…»
 *   • «в контексте твоей Санкальпы…»
 *   • «если откликается…»
 *
 * Запуск: `bun run content:check` или `bunx vitest run content-tone`.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..", "..");

const FILES = [
  "src/lib/cell-experience.ts",
  "src/lib/lila-board.ts",
  "src/lib/share.ts",
  "src/content/copy.ts",
  "src/components/lila/OnboardingModal.tsx",
  "src/components/lila/RulesModal.tsx",
  "src/components/lila/GuruChatSheet.tsx",
  "src/components/lila/ReflectionModal.tsx",
  "src/components/lila/PathAnalysisSheet.tsx",
  "src/components/lila/WelcomeScreen.tsx",
];

// Hard-fail: clearly unsafe wording (prophecy / diagnosis / punishment / coercion).
const FORBIDDEN: RegExp[] = [
  /\bты\s+всегда\b/iu,
  /\bты\s+обязан[аы]?\b/iu,
  /\bты\s+должн?[аыо]?\b/iu,
  /\bэто\s+точно\s+значит\b/iu,
  /\bсудьба\s+говорит\b/iu,
  /\bтебе\s+наказание\b/iu,
  /\bзмея\s+наказывает\b/iu,
  /\bу\s+тебя\s+проблема\b/iu,
  /\bдиагноз\w*/iu,
  /\bгарантиру[ею]т?\b/iu,
  /\bпредсказывает\b/iu,
];

// Soft-warn: часто нормально в контексте, но стоит перечитать.
const DISCOURAGED: RegExp[] = [
  /\bникогда\s+не\b/iu,
  /\bправильн[ыоая]й?\s+ответ\b/iu,
  /\bнеправильн\w*/iu,
];

interface Hit {
  file: string;
  line: number;
  match: string;
  pattern: string;
}

function scan(patterns: RegExp[]): Hit[] {
  const hits: Hit[] = [];
  for (const rel of FILES) {
    let text: string;
    try {
      text = readFileSync(resolve(root, rel), "utf8");
    } catch {
      continue; // файл может отсутствовать в будущем — пропускаем
    }
    const lines = text.split("\n");
    lines.forEach((ln, i) => {
      // Пропускаем комментарии и импорты, чтобы не ловить ложные срабатывания
      const trimmed = ln.trim();
      if (
        trimmed.startsWith("//") ||
        trimmed.startsWith("*") ||
        trimmed.startsWith("/*") ||
        trimmed.startsWith("import ")
      )
        return;
      for (const re of patterns) {
        const m = ln.match(re);
        if (m) hits.push({ file: rel, line: i + 1, match: m[0], pattern: re.source });
      }
    });
  }
  return hits;
}

describe("content tone", () => {
  it("не содержит запрещённых директивных/пророческих формулировок", () => {
    const violations = scan(FORBIDDEN);
    if (violations.length) {
      const lines = violations.map((v) => `  ${v.file}:${v.line} — «${v.match}»`);
      // eslint-disable-next-line no-console
      console.error(
        "\n[content tone] Запрещённые формулировки:\n" +
          lines.join("\n") +
          "\nПопробуй мягче: «эта клетка показывает…», «можно посмотреть так…», «если откликается…».\n",
      );
    }
    expect(violations).toEqual([]);
  });

  it("предупреждает (не блокирует) о нежелательных формулировках", () => {
    const warnings = scan(DISCOURAGED);
    if (warnings.length) {
      const lines = warnings.map((v) => `  ${v.file}:${v.line} — «${v.match}»`);
      // eslint-disable-next-line no-console
      console.warn(
        `\n[content tone] ${warnings.length} мягких предупреждений:\n` + lines.join("\n") + "\n",
      );
    }
    expect(true).toBe(true);
  });
});

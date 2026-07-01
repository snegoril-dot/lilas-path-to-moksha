/**
 * Content tone lint — warns on deterministic, judgmental or "prophecy"-style
 * wording in user-facing Russian copy. This is intentionally lightweight:
 * it only fails on clearly forbidden phrases; softer patterns are surfaced
 * as console warnings so writers can iterate without blocking the build.
 *
 * Encouraged alternatives (see src/content/README.md → "Content tone guidelines"):
 *   • «эта клетка показывает…»
 *   • «попробуй заметить…»
 *   • «можно посмотреть на это так…»
 *   • «в контексте твоей Санкальпы…»
 *   • «если откликается…»
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { CELLS } from "./cells";
import { ONBOARDING_SCREENS } from "./onboarding";
import { SHARE_TEMPLATES } from "./share";
import { COPY } from "./copy";
import { CELL_EXPERIENCES } from "@/lib/cell-experience";

// Hard-fail: clearly unsafe wording (prophecy / diagnosis / punishment / coercion).
const FORBIDDEN: RegExp[] = [
  /\bты\s+всегда\b/iu,
  /\bты\s+обязан[аы]?\b/iu,
  /\bты\s+должн?[аы]?\b/iu,
  /\bэто\s+точно\s+значит\b/iu,
  /\bсудьба\s+говорит\b/iu,
  /\bтебе\s+наказание\b/iu,
  /\bзмея\s+наказывает\b/iu,
  /\bу\s+тебя\s+проблема\b/iu,
  /\bдиагноз\b/iu,
  /\bгарантиру[ею]т?\b/iu,
  /\bпредсказывает\b/iu,
];

// Soft-warn: often fine in context, but worth reviewing.
const DISCOURAGED: RegExp[] = [
  /\bникогда\s+не\b/iu,
  /\bобязательно\s+/iu,
  /\bправильн[ыоая]й?\s+ответ\b/iu,
  /\bнеправильно\b/iu,
];

type Source = { name: string; text: string };

function collectSources(): Source[] {
  const out: Source[] = [];

  // Cells (content module + rich experience layer)
  for (const c of CELLS) {
    out.push({ name: `cells.ts:${c.id} ${c.name}`, text: [c.name, c.wisdom, c.shortMeaning].filter(Boolean).join("\n") });
  }
  for (const e of Object.values(CELL_EXPERIENCES)) {
    out.push({
      name: `cell-experience:${e.id} ${e.name}`,
      text: [e.name, e.wisdom, e.shortMeaning, e.reflectionQuestion, e.dailyPractice, ...(e.keywords ?? [])].join("\n"),
    });
  }

  // Onboarding
  for (const s of ONBOARDING_SCREENS) {
    out.push({ name: `onboarding:${s.id}`, text: [s.title, s.body, ...(s.examples ?? [])].join("\n") });
  }

  // Share templates
  for (const [k, v] of Object.entries(SHARE_TEMPLATES)) {
    out.push({ name: `share:${k}`, text: typeof v === "function" ? v({ cell: 42, name: "…", sankalpa: "…" } as never) : String(v) });
  }

  // Central UI copy
  out.push({ name: "copy.ts", text: JSON.stringify(COPY) });

  // Guru suggested prompts + safety-relevant strings from the sheet
  const guruSheet = readFileSync(resolve(__dirname, "../components/lila/GuruChatSheet.tsx"), "utf8");
  const stringLits = guruSheet.match(/"[^"\n]{4,200}"/g) ?? [];
  out.push({ name: "GuruChatSheet.tsx:strings", text: stringLits.join("\n") });

  return out;
}

describe("content tone", () => {
  const sources = collectSources();

  it("does not contain forbidden deterministic / judgmental phrases", () => {
    const violations: string[] = [];
    for (const src of sources) {
      for (const re of FORBIDDEN) {
        const m = src.text.match(re);
        if (m) violations.push(`[${src.name}] «${m[0]}» → ${re}`);
      }
    }
    if (violations.length) {
      // Attach a helpful hint alongside the assertion message.
      const hint =
        "\nПопробуй мягче: «эта клетка показывает…», «можно посмотреть так…», «если откликается…».";
      expect.soft(violations, `Найдены запрещённые формулировки:\n${violations.join("\n")}${hint}`).toEqual([]);
    }
    expect(violations).toEqual([]);
  });

  it("warns (non-blocking) about discouraged phrasing", () => {
    const warnings: string[] = [];
    for (const src of sources) {
      for (const re of DISCOURAGED) {
        const m = src.text.match(re);
        if (m) warnings.push(`[${src.name}] «${m[0]}»`);
      }
    }
    if (warnings.length) {
      // eslint-disable-next-line no-console
      console.warn(`\n[content tone] ${warnings.length} мягких предупреждений:\n` + warnings.join("\n"));
    }
    // Non-blocking — always passes.
    expect(true).toBe(true);
  });
});

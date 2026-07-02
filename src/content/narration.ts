/**
 * Единые тексты повествования и повторяющиеся определения.
 * Один источник правды — вместо копий по компонентам.
 *
 * Все строки на «ты», спокойно, без эзотерического пафоса.
 */

/** Короткая формулировка для tooltip/подсказок. */
export const SANKALPA_INTRO_SHORT =
  "Санкальпа — короткий честный вопрос или намерение, с которым ты входишь в путь.";

/** Развёрнутая формулировка для онбординга и правил. */
export const SANKALPA_INTRO_LONG =
  "Санкальпа — это вопрос или намерение, с которым ты входишь в путь. Она помогает посмотреть внутрь: что я сейчас не вижу, где теряю опору, какой честный шаг мне доступен. Лила работает как зеркало, а не как предсказание.";

// ─── Повествование во время партии ──────────────────────────────

export function narrateMoksha(wisdom: string): string {
  return `✨ Ты достиг Кайласа.\n\n${wisdom}`;
}

export function narrateOvershoot(need: number): string {
  return `До Мокши нужен точный шаг: остаётся ровно ${need}. Путь пока продолжается — фишка мягко возвращается назад.`;
}

import {
  getSnakeTransition,
  getLadderTransition,
  getCycleHint,
} from "./transitions";

export function narrateSnake(
  fromId: number,
  fromName: string,
  toId: number,
  toName: string,
  wisdom: string,
): string {
  const t = getSnakeTransition(fromId);
  const tail = t ? `\n\n${t.insight}\n\n❓ ${t.question}` : "";
  return `🐍 Клетка ${fromId} — «${fromName}» → ${toId} — «${toName}».\n\nЗмея не наказывает — она мягко возвращает внимание к теме, которая просит осознания.\n\n${wisdom}${tail}`;
}

export function narrateLadder(
  fromId: number,
  fromName: string,
  toId: number,
  toName: string,
  wisdom: string,
): string {
  const t = getLadderTransition(fromId);
  const tail = t ? `\n\n${t.insight}\n\n❓ ${t.question}` : "";
  return `🪜 Клетка ${fromId} — «${fromName}» → ${toId} — «${toName}».\n\nСтрела показывает качество, которое сейчас поднимает сознание выше. Можно заметить, откуда оно приходит в тебе.\n\n${wisdom}${tail}`;
}

export function narrateRepeat(
  kind: "snake" | "ladder",
  visitCount: number,
  fromId?: number,
): string {
  const cycle = fromId != null ? getCycleHint(fromId, visitCount) : null;
  const base =
    kind === "snake"
      ? `↩️ Эта тема возвращается уже ${visitCount}-й раз. Можно посмотреть на неё как на приглашение задержаться подольше — что здесь ещё не увидено?`
      : `🌟 И снова это качество (${visitCount}-й раз). Похоже, оно всё ближе становится своим.`;
  return cycle ? `${base}\n\n${cycle}` : base;
}

// ─── Подсказки-однократки ───────────────────────────────────────

export const HINT_FIRST_SNAKE =
  "Змея — не наказание. Она показывает тему, которая просит осознания.";
export const HINT_FIRST_LADDER =
  "Стрела — не награда за правильность. Это качество, которое помогает подняться выше.";
export const HINT_NEAR_MOKSHA =
  "До Мокши нужен точный шаг. Если выпало больше, путь продолжается.";
export const HINT_BEFORE_FIRST_ROLL =
  "Чтобы войти в путь, дождись рождения через кубик.";

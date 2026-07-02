/**
 * Финальный разбор пути — НЕ ai-версия.
 * Собирает шаблонный, но осмысленный отчёт из фактов сессии:
 * повторяющиеся клетки, самые сильные змеи и стрелы, темы,
 * связь маршрута с Санкальпой.
 *
 * Никаких обещаний и диагнозов. Только зеркало и вопросы.
 */

import { BOARD, LADDERS, SNAKES } from "@/lib/lila-board";
import { getCellExperience } from "@/lib/cell-experience";
import {
  getSnakeTransition,
  getLadderTransition,
} from "@/content/transitions";

export interface KeyCellLite {
  id: number;
  name: string;
  kind: "snake" | "ladder";
  visitCount?: number;
  note?: string;
}

export interface PathStepLite {
  cell: number;
  kind: string;
  to?: number;
}

export interface FinalReportInput {
  sankalpa?: string;
  currentCell: number;
  totalRolls: number;
  keyCells: KeyCellLite[];
  pathLog?: PathStepLite[];
}

function cellName(id: number | null | undefined): string {
  if (!id || id < 1) return "—";
  return BOARD[id - 1]?.name ?? `Клетка ${id}`;
}

/**
 * Строит текст отчёта. Возвращает строку, готовую к отображению
 * и копированию в буфер (Markdown-совместима, но читается просто).
 */
export function buildFinalReport(input: FinalReportInput): string {
  const { sankalpa, currentCell, totalRolls, keyCells, pathLog = [] } = input;

  // --- Repeats ---
  const snakes = keyCells.filter((k) => k.kind === "snake");
  const ladders = keyCells.filter((k) => k.kind === "ladder");
  const snakeRepeatsMap = new Map<number, number>();
  const ladderRepeatsMap = new Map<number, number>();
  for (const k of snakes) snakeRepeatsMap.set(k.id, (snakeRepeatsMap.get(k.id) ?? 0) + 1);
  for (const k of ladders) ladderRepeatsMap.set(k.id, (ladderRepeatsMap.get(k.id) ?? 0) + 1);

  const repeatedSnakes = [...snakeRepeatsMap.entries()]
    .filter(([, n]) => n > 1)
    .sort((a, b) => b[1] - a[1]);
  const repeatedLadders = [...ladderRepeatsMap.entries()]
    .filter(([, n]) => n > 1)
    .sort((a, b) => b[1] - a[1]);

  // --- Strongest jump ---
  let deepest = { id: 0, to: 0, delta: 0 };
  for (const k of snakes) {
    const to = SNAKES[k.id];
    if (to == null) continue;
    const delta = k.id - to;
    if (delta > deepest.delta) deepest = { id: k.id, to, delta };
  }
  let highest = { id: 0, to: 0, delta: 0 };
  for (const k of ladders) {
    const to = LADDERS[k.id];
    if (to == null) continue;
    const delta = to - k.id;
    if (delta > highest.delta) highest = { id: k.id, to, delta };
  }

  // --- Themes ---
  const themeCounter = new Map<string, number>();
  const visited = new Set<number>();
  for (const s of pathLog) {
    if (s.cell > 0) visited.add(s.cell);
    if (s.to && s.to > 0) visited.add(s.to);
  }
  if (currentCell > 0) visited.add(currentCell);
  for (const id of visited) {
    const exp = getCellExperience(id);
    if (!exp) continue;
    for (const kw of exp.keywords) {
      themeCounter.set(kw, (themeCounter.get(kw) ?? 0) + 1);
    }
  }
  const topThemes = [...themeCounter.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([k]) => k);

  // --- Compose ---
  const lines: string[] = [];
  lines.push("🕉 Тихий разбор пути");
  lines.push("");
  if (sankalpa) {
    lines.push(`Санкальпа: «${sankalpa}»`);
    lines.push("");
  }
  lines.push(
    `Пройдено ${visited.size} клеток за ${totalRolls} бросков. Змей — ${snakes.length}, стрел — ${ladders.length}.`,
  );
  lines.push("");

  if (repeatedSnakes.length > 0) {
    lines.push("— Повторяющиеся змеи:");
    for (const [id, n] of repeatedSnakes) {
      const t = getSnakeTransition(id);
      lines.push(`  • ${id}. ${cellName(id)} — ${n} раза. ${t ? t.insight : ""}`);
    }
    lines.push("");
  }

  if (repeatedLadders.length > 0) {
    lines.push("— Повторяющиеся стрелы:");
    for (const [id, n] of repeatedLadders) {
      const t = getLadderTransition(id);
      lines.push(`  • ${id}. ${cellName(id)} — ${n} раза. ${t ? t.insight : ""}`);
    }
    lines.push("");
  }

  if (deepest.id) {
    const t = getSnakeTransition(deepest.id);
    lines.push(
      `— Самое глубокое падение: ${deepest.id}. ${cellName(deepest.id)} → ${deepest.to}. ${cellName(deepest.to)} (−${deepest.delta}).`,
    );
    if (t) lines.push(`  ${t.question}`);
    lines.push("");
  }

  if (highest.id) {
    const t = getLadderTransition(highest.id);
    lines.push(
      `— Самый большой подъём: ${highest.id}. ${cellName(highest.id)} → ${highest.to}. ${cellName(highest.to)} (+${highest.delta}).`,
    );
    if (t) lines.push(`  ${t.question}`);
    lines.push("");
  }

  if (topThemes.length > 0) {
    lines.push(`— Главные темы пути: ${topThemes.join(" · ")}.`);
    lines.push("");
  }

  lines.push("Связь с Санкальпой:");
  if (sankalpa) {
    lines.push(
      "  • Где на этом пути Санкальпа проявилась сильнее всего?",
    );
    lines.push(
      "  • Какая змея показала, что именно мешает её осуществлению?",
    );
    lines.push(
      "  • Какая стрела показала качество, которое приближает к ней?",
    );
  } else {
    lines.push(
      "  • Какой один короткий шаг ты можешь сделать сегодня, опираясь на увиденное?",
    );
  }
  lines.push("");
  lines.push("Это не диагноз и не пророчество — только зеркало. Проверь внутри себя.");

  return lines.join("\n");
}

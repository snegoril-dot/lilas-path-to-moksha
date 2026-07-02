/**
 * Финальный разбор пути — НЕ ai-версия.
 * Собирает шаблонный, но осмысленный отчёт из фактов сессии:
 * повторяющиеся клетки, самые сильные змеи и стрелы, темы,
 * связь маршрута с Санкальпой.
 *
 * Никаких обещаний и диагнозов. Только зеркало и вопросы.
 */

import { BOARD, LADDERS, SNAKES, getLoka } from "@/lib/lila-board";
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

  // --- Loka distribution ---
  const lokaCounter = new Map<number, { name: string; n: number }>();
  for (const id of visited) {
    const l = getLoka(id);
    if (!l) continue;
    const prev = lokaCounter.get(l.id);
    lokaCounter.set(l.id, { name: l.name, n: (prev?.n ?? 0) + 1 });
  }
  const lokaBreakdown = [...lokaCounter.entries()]
    .sort((a, b) => b[1].n - a[1].n)
    .slice(0, 3)
    .map(([, v]) => `${v.name} (${v.n})`);

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
  if (lokaBreakdown.length > 0) {
    lines.push(`Больше всего времени — на планах: ${lokaBreakdown.join(" · ")}.`);
  }
  lines.push("");

  // Небольшое повествование, а не сводка
  const arc: string[] = [];
  if (snakes.length === 0 && ladders.length > 0) {
    arc.push("Путь шёл преимущественно вверх — можно заметить, что именно поддерживало движение.");
  } else if (ladders.length === 0 && snakes.length > 0) {
    arc.push("Путь долго удерживал в нижних планах — это чаще про темп, чем про «неправильность».");
  } else if (snakes.length > 0 && ladders.length > 0) {
    arc.push("Путь чередовал подъёмы и спуски — обычный ритм внутренней работы, а не сбой.");
  }
  if (arc.length > 0) {
    lines.push(arc.join(" "));
    lines.push("");
  }

  if (repeatedSnakes.length > 0) {
    lines.push("— Темы, которые возвращались:");
    for (const [id, n] of repeatedSnakes) {
      const t = getSnakeTransition(id);
      lines.push(`  • ${id}. ${cellName(id)} — ${n} раза.`);
      if (t?.reflection) lines.push(`    ${t.reflection}`);
      else if (t?.insight) lines.push(`    ${t.insight}`);
      if (t?.question) lines.push(`    ❓ ${t.question}`);
    }
    lines.push("");
  }

  if (repeatedLadders.length > 0) {
    lines.push("— Качества, которые повторялись:");
    for (const [id, n] of repeatedLadders) {
      const t = getLadderTransition(id);
      lines.push(`  • ${id}. ${cellName(id)} — ${n} раза.`);
      if (t?.reflection) lines.push(`    ${t.reflection}`);
      else if (t?.insight) lines.push(`    ${t.insight}`);
      if (t?.question) lines.push(`    ❓ ${t.question}`);
    }
    lines.push("");
  }

  if (deepest.id) {
    const t = getSnakeTransition(deepest.id);
    lines.push(
      `— Самое глубокое падение: ${deepest.id}. ${cellName(deepest.id)} → ${deepest.to}. ${cellName(deepest.to)} (−${deepest.delta}).`,
    );
    if (t?.reflection) lines.push(`  ${t.reflection}`);
    else if (t?.insight) lines.push(`  ${t.insight}`);
    if (t?.question) lines.push(`  ❓ ${t.question}`);
    lines.push("");
  }

  if (highest.id) {
    const t = getLadderTransition(highest.id);
    lines.push(
      `— Самый большой подъём: ${highest.id}. ${cellName(highest.id)} → ${highest.to}. ${cellName(highest.to)} (+${highest.delta}).`,
    );
    if (t?.reflection) lines.push(`  ${t.reflection}`);
    else if (t?.insight) lines.push(`  ${t.insight}`);
    if (t?.question) lines.push(`  ❓ ${t.question}`);
    lines.push("");
  }

  if (topThemes.length > 0) {
    lines.push(`— Главные темы пути: ${topThemes.join(" · ")}.`);
    lines.push("");
  }

  lines.push("Связь с Санкальпой:");
  if (sankalpa) {
    lines.push("  • Где на этом пути Санкальпа проявилась сильнее всего?");
    lines.push("  • Какая змея показала, что именно мешает её осуществлению?");
    lines.push("  • Какая стрела показала качество, которое приближает к ней?");
  } else {
    lines.push(
      "  • Какой один короткий шаг ты можешь сделать сегодня, опираясь на увиденное?",
    );
  }
  lines.push("");
  lines.push(
    "Этот разбор — зеркало, а не приговор. Прочитай его один раз, отложи на день и вернись — второе прочтение обычно точнее первого.",
  );

  return lines.join("\n");
}

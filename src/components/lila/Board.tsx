import { motion, useReducedMotion } from "framer-motion";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BOARD } from "@/lib/lila-board";
import boardBg from "@/assets/lila-board-cosmos.jpg";
import { getTattvaForCell } from "@/lib/lila-wisdom-full";
import {
  COLS,
  ROWS,
  idForRowCol,
  verifyLayoutGeometry,
  verifyBoardMapping,
} from "@/lib/board-layout";

import type { PlayerToken } from "@/lib/player-tokens";

interface Props {
  playerPos: number;
  onSelectCell?: (id: number) => void;
  debug?: boolean;
  token?: PlayerToken;
  /** ids the player has already touched — rendered as subtle path trail. */
  visited?: Set<number> | number[];
}

const GRID_INSET = { top: 4, right: 4, bottom: 4, left: 4 };
const GRID_GAP = 0.4;
const BOARD_BG = "linear-gradient(180deg, var(--lila-board-bg, rgba(15,23,42,0.65)), rgba(15,23,42,0.35))";
const FRAME_RING = "ring-white/10";
const NUMBER_CLASS = "text-amber-200 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]";
const LABEL_CLASS = "text-[var(--lila-cell-fg,#f8fafc)] drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]";
const LAYOUT_STORAGE_KEY = "lila.layout.v6.base";

// Рантайм-проверка: ловим перевёрнутую последнюю строку и любые сбои маппинга
// сразу при загрузке модуля. Issues пробрасываются в UI ниже.
const MAPPING_ISSUES: string[] = verifyBoardMapping();
if (MAPPING_ISSUES.length > 0) {
  // eslint-disable-next-line no-console
  console.error("[Lila board] mapping mismatch:", MAPPING_ISSUES);
} else if (import.meta.env.DEV) {
  // eslint-disable-next-line no-console
  console.info("[Lila board] mapping 1→72 OK (бустрофедон, последняя строка 65→72)");
}


const PLANE_TINTS = [
  "bg-stone-900/35",
  "bg-orange-900/30",
  "bg-amber-800/25",
  "bg-emerald-900/30",
  "bg-sky-900/30",
  "bg-indigo-900/30",
  "bg-violet-900/30",
  "bg-fuchsia-900/25",
  "bg-amber-700/30",
];

export interface CellRect {
  x: number; // %
  y: number; // %
  w: number; // %
  h: number; // %
}

export type Layout = Record<number, CellRect>;

function cellCenter(rect: CellRect) {
  return { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 };
}

function validateJumpConnections(layout: Layout): string[] {
  const issues: string[] = [];
  const jumpCells = BOARD.filter((cell) => cell.jumpTo !== undefined);
  const ladders = jumpCells.filter((cell) => cell.type === "ladder");
  const snakes = jumpCells.filter((cell) => cell.type === "snake");
  if (ladders.length !== 8) issues.push(`expected 8 arrows/ladders, got ${ladders.length}`);
  if (snakes.length !== 9) issues.push(`expected 9 snakes, got ${snakes.length}`);

  for (const cell of jumpCells) {
    const from = layout[cell.id];
    const to = cell.jumpTo ? layout[cell.jumpTo] : undefined;
    if (!from || !to || !cell.jumpTo) {
      issues.push(`jump ${cell.id}→${cell.jumpTo ?? "?"}: missing visual endpoint`);
      continue;
    }
    const fromCenter = cellCenter(from);
    const toCenter = cellCenter(to);
    if (cell.type === "ladder" && toCenter.y >= fromCenter.y) {
      issues.push(`arrow ${cell.id}→${cell.jumpTo}: target must be visually above source`);
    }
    if (cell.type === "snake" && toCenter.y <= fromCenter.y) {
      issues.push(`snake ${cell.id}→${cell.jumpTo}: target must be visually below source`);
    }
  }
  return issues;
}

function defaultLayout(): Layout {
  const { top, right, bottom, left } = GRID_INSET;
  const gap = GRID_GAP;
  const innerW = 100 - left - right;
  const innerH = 100 - top - bottom;
  const cellW = (innerW - gap * (COLS - 1)) / COLS;
  const cellH = (innerH - gap * (ROWS - 1)) / ROWS;
  const layout: Layout = {};
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const id = idForRowCol(r, c);
      // r=0 is bottom row visually; top y for row r:
      const visualRow = ROWS - 1 - r;
      const x = left + c * (cellW + gap);
      const y = top + visualRow * (cellH + gap);
      layout[id] = { x, y, w: cellW, h: cellH };
    }
  }
  return layout;
}


// v6: полностью удалены темы/нарисованные карты; раскладка одна, 9×8.
function purgeLegacyLayoutKeys() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem("lila.boardTheme");
  const keysToRemove: string[] = [];
  for (let i = 0; i < window.localStorage.length; i += 1) {
    const key = window.localStorage.key(i);
    if (key?.startsWith("lila.layout.")) keysToRemove.push(key);
  }
  keysToRemove.forEach((key) => window.localStorage.removeItem(key));
}

function loadLayout(): Layout {
  if (typeof window === "undefined") return defaultLayout();
  try {
    purgeLegacyLayoutKeys();
    const raw = window.localStorage.getItem(LAYOUT_STORAGE_KEY);
    if (!raw) return defaultLayout();
    const parsed = JSON.parse(raw) as Layout;
    // fill missing ids
    const def = defaultLayout();
    for (let i = 1; i <= 72; i++) if (!parsed[i]) parsed[i] = def[i];
    const layoutIssues = verifyLayoutGeometry(parsed);
    if (layoutIssues.length > 0) {
      // eslint-disable-next-line no-console
      console.error("[Lila board] saved layout invalid, resetting to v6 default:", layoutIssues);
      window.localStorage.removeItem(LAYOUT_STORAGE_KEY);
      return def;
    }
    return parsed;
  } catch {
    return defaultLayout();
  }
}

function BoardImpl({ playerPos, onSelectCell, debug, token, visited }: Props) {
  const prefersReducedMotion = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<Layout>(() => loadLayout());
  const visitedSet = useMemo(() => {
    if (!visited) return new Set<number>();
    return visited instanceof Set ? visited : new Set(visited);
  }, [visited]);

  useEffect(() => {
    setLayout(loadLayout());
  }, []);

  const layoutIssues = useMemo(
    () => [...MAPPING_ISSUES, ...verifyLayoutGeometry(layout), ...validateJumpConnections(layout)],
    [layout]
  );

  // Подсветка ячеек, чьи визуальные соседи по ID не примыкают на сетке.
  const brokenIds = useMemo(() => {
    const bad = new Set<number>();
    const approx = (a: number, b: number, eps = 1.5) => Math.abs(a - b) <= eps;
    for (let id = 1; id < 72; id++) {
      const a = layout[id];
      const b = layout[id + 1];
      if (!a || !b) continue;
      const sameRow = approx(a.y, b.y) && approx(Math.abs(a.x - b.x), a.w, Math.max(a.w, 2));
      const stacked = approx(a.x, b.x) && approx(Math.abs(a.y - b.y), a.h, Math.max(a.h, 2));
      if (!sameRow && !stacked) {
        bad.add(id);
        bad.add(id + 1);
      }
    }
    return bad;
  }, [layout]);

  useEffect(() => {
    if (layoutIssues.length > 0) {
      // eslint-disable-next-line no-console
      console.error("[Lila board] runtime layout validation failed:", layoutIssues);
    }
  }, [layoutIssues]);

  const persist = useCallback(
    (next: Layout) => {
      setLayout(next);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(next));
      }
    },
    []
  );

  const updateRect = useCallback(
    (id: number, patch: Partial<CellRect>) => {
      setLayout((prev) => {
        const next = { ...prev, [id]: { ...prev[id], ...patch } };
        if (typeof window !== "undefined") {
          window.localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(next));
        }
        return next;
      });
    },
    []
  );

  const beginDrag = useCallback(
    (e: React.PointerEvent, id: number, mode: "move" | "resize") => {
      if (!debug) return;
      e.preventDefault();
      e.stopPropagation();
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const startX = e.clientX;
      const startY = e.clientY;
      const start = { ...layout[id] };
      (e.target as Element).setPointerCapture?.(e.pointerId);

      const onMove = (ev: PointerEvent) => {
        const dxPct = ((ev.clientX - startX) / rect.width) * 100;
        const dyPct = ((ev.clientY - startY) / rect.height) * 100;
        if (mode === "move") {
          updateRect(id, {
            x: Math.max(0, Math.min(100 - start.w, start.x + dxPct)),
            y: Math.max(0, Math.min(100 - start.h, start.y + dyPct)),
          });
        } else {
          updateRect(id, {
            w: Math.max(2, start.w + dxPct),
            h: Math.max(2, start.h + dyPct),
          });
        }
      };
      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [debug, layout, updateRect]
  );

  const exportLayout = useCallback(() => {
    const json = JSON.stringify(layout, null, 2);
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.log("[Lila layout]", json);
    }
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(json).catch(() => {});
    }
  }, [layout]);


  const resetLayout = useCallback(() => {
    persist(defaultLayout());
  }, [persist]);

  const applyToAll = useCallback(
    (id: number) => {
      const ref = layout[id];
      if (!ref) return;
      const next: Layout = { ...layout };
      for (let i = 1; i <= 72; i++) {
        next[i] = { ...next[i], w: ref.w, h: ref.h };
      }
      persist(next);
    },
    [layout, persist]
  );

  /** Apply size + vertical y of `id` to every cell in the same visual row,
   *  and re-distribute them evenly across the board width keeping the row's
   *  current left/right insets. Shift+double-click. */
  const applyToRow = useCallback(
    (id: number) => {
      const ref = layout[id];
      if (!ref) return;
      // figure out which visual row this id belongs to (8 ids per row)
      const rowIndex = Math.floor((id - 1) / COLS); // 0..8 from bottom
      const rowIds: number[] = Array.from({ length: COLS }, (_, c) =>
        idForRowCol(rowIndex, c)
      );
      // use current min x and max x+w in this row as the row span
      const xs = rowIds.map((i) => layout[i].x);
      const rights = rowIds.map((i) => layout[i].x + layout[i].w);
      const minX = Math.min(...xs);
      const maxR = Math.max(...rights);
      const span = maxR - minX;
      const gap = (span - ref.w * COLS) / (COLS - 1);
      const next: Layout = { ...layout };
      rowIds.forEach((cid, idx) => {
        next[cid] = {
          x: minX + idx * (ref.w + gap),
          y: ref.y,
          w: ref.w,
          h: ref.h,
        };
      });
      persist(next);
    },
    [layout, persist]
  );

  const ids = useMemo(() => Array.from({ length: 72 }, (_, i) => i + 1), []);

  return (
    <div className="relative">
      {layoutIssues.length > 0 && (
        <div
          role="alert"
          className="mb-2 rounded-lg bg-rose-600/90 text-rose-50 px-3 py-2 text-xs font-medium ring-1 ring-rose-300/60"
        >
          ⚠️ Сбой маппинга клеток (1→72): {layoutIssues[0]}
          {layoutIssues.length > 1 ? ` (+${layoutIssues.length - 1})` : ""}
        </div>
      )}
      <div
        data-lila-board
        ref={containerRef}
        className={`relative w-full rounded-2xl shadow-2xl ring-1 overflow-hidden ${FRAME_RING}`}
        style={{
          aspectRatio: "9 / 8",
          background: BOARD_BG,
        }}
      >
        <img
          src={boardBg}
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full object-fill pointer-events-none select-none"
          draggable={false}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "linear-gradient(rgba(255,255,255,0.03), rgba(0,0,0,0.18))" }}
          aria-hidden
        />
        <svg className="absolute inset-0 z-10 h-full w-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
          <defs>
            <marker id="lila-arrow-head" markerWidth="4" markerHeight="4" refX="3" refY="2" orient="auto">
              <path d="M0,0 L4,2 L0,4 Z" fill="rgba(251, 191, 36, 0.9)" />
            </marker>
          </defs>
          {BOARD.filter((cell) => cell.jumpTo !== undefined).map((cell) => {
            const from = layout[cell.id];
            const to = cell.jumpTo ? layout[cell.jumpTo] : undefined;
            if (!from || !to) return null;
            const a = cellCenter(from);
            const b = cellCenter(to);
            const isSnake = cell.type === "snake";
            return (
              <line
                key={`${cell.id}-${cell.jumpTo}`}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={isSnake ? "rgba(244, 63, 94, 0.82)" : "rgba(251, 191, 36, 0.9)"}
                strokeWidth={isSnake ? 0.38 : 0.46}
                strokeLinecap="round"
                strokeDasharray={isSnake ? "1.1 0.8" : undefined}
                markerEnd={isSnake ? undefined : "url(#lila-arrow-head)"}
                vectorEffect="non-scaling-stroke"
              />
            );
          })}
        </svg>
        {ids.map((id) => {
          const cell = BOARD[id - 1];
          const rect = layout[id];
          if (!rect) return null;
          const isPlayer = id === playerPos;
          const isKailas = id === 68;
          const tint = PLANE_TINTS[cell.plane] ?? "bg-black/30";
          const typeClass = isPlayer
            ? "ring-2 ring-emerald-300 shadow-[0_0_14px_rgba(110,231,183,0.75)]"
            : cell.type === "snake"
              ? "ring-2 ring-rose-300/80 shadow-[inset_0_0_8px_rgba(244,63,94,0.3)]"
              : cell.type === "ladder"
                ? "ring-2 ring-amber-200/80 shadow-[inset_0_0_8px_rgba(252,211,77,0.35)]"
                : isKailas
                  ? "ring-2 ring-amber-200 shadow-[0_0_18px_rgba(251,191,36,0.7)]"
                  : "ring-1 ring-white/10";
          const isVisited = !isPlayer && visitedSet.has(id);
          return (
            <div
              key={id}
              data-cell-id={id}
              onPointerDown={(e) => beginDrag(e, id, "move")}
              onDoubleClick={(e) => {
                if (!debug) return;
                if (e.shiftKey) applyToRow(id);
                else applyToAll(id);
              }}
              onClick={() => !debug && onSelectCell?.(id)}
              className={`absolute flex items-end justify-center rounded-[4px] text-[9px] font-medium leading-tight select-none p-0.5 text-center transition ${
                debug
                  ? `bg-fuchsia-500/25 ring-2 ${brokenIds.has(id) ? "ring-red-500 bg-red-500/40" : "ring-fuchsia-300/90"} cursor-move touch-none`
                  : `${tint} ${typeClass} cursor-pointer hover:brightness-125 ${isVisited ? "brightness-110" : ""}`
              }`}
              style={{
                left: `${rect.x}%`,
                top: `${rect.y}%`,
                width: `${rect.w}%`,
                height: `${rect.h}%`,
              }}
            >
              {debug ? (
                <>
                  <span className="absolute inset-0 flex items-center justify-center text-base font-extrabold text-fuchsia-50 drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]">
                    {id}
                  </span>
                  <span
                    onPointerDown={(e) => beginDrag(e, id, "resize")}
                    className="absolute -right-1 -bottom-1 h-3 w-3 rounded-sm bg-fuchsia-200 ring-1 ring-fuchsia-700 cursor-nwse-resize touch-none z-40"
                  />
                </>
              ) : (
                <>
                  <span
                    className={`absolute inset-0 flex items-center justify-center text-[15px] sm:text-base font-extrabold ${NUMBER_CLASS}`}
                    aria-label={cell.name}
                    title={cell.name}
                  >
                    {id}
                  </span>
                  <span
                    className="absolute right-0.5 top-0.5 text-[9px] opacity-70 drop-shadow leading-none"
                    aria-hidden
                    title={getTattvaForCell(id).name}
                  >
                    {isKailas ? "🕉" : getTattvaForCell(id).glyph}
                  </span>
                  {isVisited && (
                    <span
                      aria-hidden
                      className="absolute left-1 bottom-1 h-1.5 w-1.5 rounded-full bg-amber-200/70 shadow-[0_0_4px_rgba(251,191,36,0.7)]"
                    />
                  )}
                  <span className={`sr-only ${LABEL_CLASS}`}>{cell.name}</span>
                </>
              )}
              {isPlayer && (
                <motion.div
                  layoutId="player-token"
                  transition={{
                    type: "spring",
                    stiffness: token?.motion.travel.stiffness ?? 260,
                    damping: token?.motion.travel.damping ?? 24,
                    mass: token?.motion.travel.mass ?? 0.9,
                  }}
                  className="absolute inset-1 rounded-md ring-2 backdrop-blur-[2px] flex items-center justify-center z-30"
                  style={{
                    boxShadow: `0 0 0 2px ${token?.ring ?? "#6ee7b7"}, 0 4px 12px -2px ${token?.ring ?? "#6ee7b7"}66`,
                    background: token?.bg ?? "rgba(52,211,153,0.30)",
                    borderColor: token?.ring ?? "#6ee7b7",
                  }}
                >
                  <motion.span
                    className="block w-full h-full"
                    animate={{
                      rotate: token?.motion.idle.rotate,
                      scale: token?.motion.idle.scale,
                      y: token?.motion.idle.y,
                    }}
                    transition={{
                      duration: token?.motion.idle.duration ?? 3,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  >
                    {token?.image ? (
                      <img
                        src={token.image}
                        alt={token.glyph}
                        className="w-full h-full object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)]"
                        draggable={false}
                      />
                    ) : (
                      <span className="text-base drop-shadow">{token?.glyph ?? "🪷"}</span>
                    )}
                  </motion.span>
                </motion.div>
              )}
            </div>
          );
        })}
      </div>
      {debug && (
        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          <button
            onClick={exportLayout}
            className="px-3 py-1.5 rounded-lg bg-fuchsia-500/30 ring-1 ring-fuchsia-300/60 text-fuchsia-50 hover:bg-fuchsia-500/40"
          >
            Экспорт layout
          </button>
          <button
            onClick={resetLayout}
            className="px-3 py-1.5 rounded-lg bg-white/10 ring-1 ring-white/20 hover:bg-white/20"
          >
            Сбросить
          </button>
          <span className="opacity-60 self-center">
            Тяни клетку • уголок — размер • двойной клик — размер всем • Shift+двойной клик — выровнять весь ряд по этой клетке
          </span>
        </div>
      )}
    </div>
  );
}

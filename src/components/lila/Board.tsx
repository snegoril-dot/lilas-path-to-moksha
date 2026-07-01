import { motion, useReducedMotion } from "framer-motion";
import { memo, useEffect, useMemo, useState } from "react";
import { BOARD } from "@/lib/lila-board";
import boardBg from "@/assets/lila-board-cosmos.jpg";
import { getTattvaForCell } from "@/lib/lila-wisdom-full";
import {
  COLS,
  ROWS,
  idForRowCol,
  rowColForId,
  verifyBoardMapping,
} from "@/lib/board-layout";
import { safeKeys, safeRemove } from "@/lib/safe-storage";

import type { PlayerToken } from "@/lib/player-tokens";

interface Props {
  playerPos: number;
  onSelectCell?: (id: number) => void;
  debug?: boolean;
  token?: PlayerToken;
  /** ids the player has already touched — rendered as subtle path trail. */
  visited?: Set<number> | number[];
}

const BOARD_BG =
  "linear-gradient(180deg, var(--lila-board-bg, rgba(15,23,42,0.65)), rgba(15,23,42,0.35))";
const FRAME_RING = "ring-white/10";
const NUMBER_CLASS =
  "text-amber-200 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]";

// Единовременная миграция: убираем все старые сохранённые layout'ы (v1..v7),
// т.к. теперь позиции клеток жёстко задаются CSS Grid и никогда не читаются
// из localStorage. Оставленные ключи только запутывали пользователя.
function purgeLegacyLayoutStorage() {
  if (typeof window === "undefined") return;
  safeRemove("lila.boardTheme");
  safeKeys("lila.layout.").forEach((key) => safeRemove(key));
  safeRemove("lila:debug-zoom");
  safeRemove("lila:debug-pan");
}

const MAPPING_ISSUES: string[] = verifyBoardMapping();
if (MAPPING_ISSUES.length > 0) {
  // eslint-disable-next-line no-console
  console.error("[Lila board] mapping mismatch:", MAPPING_ISSUES);
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

/** Центр клетки в координатах SVG-оверлея 100×100. */
function cellCenterPct(id: number): { x: number; y: number } {
  const { row, col } = rowColForId(id);
  const visualRow = ROWS - 1 - row; // 0 сверху
  return {
    x: ((col + 0.5) * 100) / COLS,
    y: ((visualRow + 0.5) * 100) / ROWS,
  };
}

function BoardImpl({ playerPos, onSelectCell, debug, token, visited }: Props) {
  const prefersReducedMotion = useReducedMotion();
  const [zoom, setZoom] = useState(1);
  // Debug-only «растяжка» сетки: не влияет на прод-рендер.
  const [aspectW, setAspectW] = useState(COLS);
  const [aspectH, setAspectH] = useState(ROWS);
  const [gapPct, setGapPct] = useState(0.5);
  const [padPct, setPadPct] = useState(0.6);


  useEffect(() => {
    purgeLegacyLayoutStorage();
  }, []);

  const visitedSet = useMemo(() => {
    if (!visited) return new Set<number>();
    return visited instanceof Set ? visited : new Set(visited);
  }, [visited]);

  const ids = useMemo(() => Array.from({ length: 72 }, (_, i) => i + 1), []);
  const jumpCells = useMemo(
    () => BOARD.filter((c) => c.jumpTo !== undefined),
    []
  );

  return (
    <div className="relative">
      {MAPPING_ISSUES.length > 0 && (
        <div
          role="alert"
          className="mb-2 rounded-lg bg-rose-600/90 text-rose-50 px-3 py-2 text-xs font-medium ring-1 ring-rose-300/60"
        >
          ⚠️ Сбой маппинга клеток (1→72): {MAPPING_ISSUES[0]}
        </div>
      )}

      <div className={debug && zoom > 1 ? "overflow-auto max-h-[80dvh] rounded-2xl" : ""}>
        <div
          data-lila-board
          className={`relative w-full rounded-2xl shadow-2xl ring-1 overflow-hidden ${FRAME_RING}`}
          style={{
            aspectRatio: debug ? `${aspectW} / ${aspectH}` : `${COLS} / ${ROWS}`,
            background: BOARD_BG,
            transform: debug && zoom !== 1 ? `scale(${zoom})` : undefined,
            transformOrigin: "top left",
            transition: debug ? "transform 120ms ease-out" : undefined,
          }}
        >
          {/* Космический фон */}
          <img
            src={boardBg}
            alt=""
            aria-hidden
            className="absolute inset-0 h-full w-full object-cover pointer-events-none select-none opacity-70"
            draggable={false}
          />
          <div
            aria-hidden
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse at 50% 30%, rgba(129,140,248,0.18), transparent 60%), linear-gradient(rgba(255,255,255,0.02), rgba(0,0,0,0.25))",
            }}
          />

          {/* Строгая сетка 9×8 — единственный источник геометрии клеток */}
          <div
            className="absolute inset-0 grid"
            style={{
              padding: `${debug ? padPct : 0.6}%`,
              gap: `${debug ? gapPct : 0.5}%`,
              gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${ROWS}, minmax(0, 1fr))`,
            }}
          >

            {ids.map((id) => {
              const cell = BOARD[id - 1];
              const { row, col } = rowColForId(id);
              const visualRow = ROWS - 1 - row;
              const isPlayer = id === playerPos;
              const isMoksha = id === 68;
              const isTrap = id === 8 || id === 71;
              const tint = PLANE_TINTS[cell.plane] ?? "bg-black/30";
              const isVisited = !isPlayer && visitedSet.has(id);
              const stateLabel = isPlayer
                ? "текущая клетка"
                : cell.type === "snake"
                ? "змея — спуск"
                : cell.type === "ladder"
                ? "стрела — подъём"
                : isMoksha
                ? "Мокша"
                : isVisited
                ? "пройдено"
                : "";
              const fullLabel = `Клетка ${id}${
                stateLabel ? `, ${stateLabel}` : ""
              }: ${cell.name}`;

              const stateRing = isPlayer
                ? "ring-2 ring-emerald-300 shadow-[0_0_14px_rgba(110,231,183,0.75)]"
                : isMoksha
                ? "ring-2 ring-amber-200 shadow-[0_0_18px_rgba(251,191,36,0.7)]"
                : cell.type === "snake"
                ? "ring-1 ring-rose-300/70 shadow-[inset_0_0_8px_rgba(244,63,94,0.25)]"
                : cell.type === "ladder"
                ? "ring-1 ring-amber-200/80 shadow-[inset_0_0_8px_rgba(252,211,77,0.3)]"
                : isTrap
                ? "ring-1 ring-purple-300/60"
                : "ring-1 ring-white/10";

              return (
                <button
                  key={id}
                  type="button"
                  data-cell-id={id}
                  aria-label={fullLabel}
                  aria-current={isPlayer ? "location" : undefined}
                  onClick={() => onSelectCell?.(id)}
                  style={{
                    gridColumn: col + 1,
                    gridRow: visualRow + 1,
                  }}
                  className={`relative flex items-end justify-center rounded-[6px] p-0.5 text-center select-none transition focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:z-20 cursor-pointer hover:brightness-125 ${tint} ${stateRing} ${
                    isVisited ? "brightness-110" : ""
                  }`}
                >
                  <span
                    className={`absolute inset-0 flex items-center justify-center text-[13px] sm:text-[15px] font-extrabold ${NUMBER_CLASS}`}
                    aria-hidden
                    title={cell.name}
                  >
                    {id}
                  </span>
                  <span
                    className="absolute right-1 top-1 text-[9px] opacity-70 leading-none"
                    aria-hidden
                  >
                    {isMoksha ? "🕉" : getTattvaForCell(id)?.glyph ?? "·"}
                  </span>
                  {(cell.type === "snake" || cell.type === "ladder") && (
                    <span
                      aria-hidden
                      className={`absolute left-1 top-1 text-[10px] font-bold leading-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] ${
                        cell.type === "snake" ? "text-rose-200" : "text-amber-200"
                      }`}
                    >
                      {cell.type === "snake" ? "↓" : "↑"}
                    </span>
                  )}
                  {isVisited && (
                    <span
                      aria-hidden
                      className="absolute left-1 bottom-1 h-1.5 w-1.5 rounded-full bg-amber-200/70 shadow-[0_0_4px_rgba(251,191,36,0.7)]"
                    />
                  )}
                  {debug && (
                    <span
                      aria-hidden
                      className="absolute left-1 bottom-1 text-[8px] font-mono text-fuchsia-100/90"
                    >
                      {row},{col}
                    </span>
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
                        boxShadow: `0 0 0 2px ${
                          token?.ring ?? "#6ee7b7"
                        }, 0 4px 12px -2px ${token?.ring ?? "#6ee7b7"}66`,
                        background: token?.bg ?? "rgba(52,211,153,0.30)",
                        borderColor: token?.ring ?? "#6ee7b7",
                      }}
                    >
                      <motion.span
                        className="block w-full h-full"
                        animate={
                          prefersReducedMotion
                            ? undefined
                            : {
                                rotate: token?.motion.idle.rotate,
                                scale: token?.motion.idle.scale,
                                y: token?.motion.idle.y,
                              }
                        }
                        transition={{
                          duration: token?.motion.idle.duration ?? 3,
                          repeat: prefersReducedMotion ? 0 : Infinity,
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
                          <span className="text-base drop-shadow">
                            {token?.glyph ?? "🪷"}
                          </span>
                        )}
                      </motion.span>
                    </motion.div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Декоративный overlay: змеи и стрелы поверх сетки */}
          <svg
            className="absolute inset-0 z-10 h-full w-full pointer-events-none"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden
          >
            <defs>
              <marker
                id="lila-arrow-head"
                markerWidth="4"
                markerHeight="4"
                refX="3"
                refY="2"
                orient="auto"
              >
                <path d="M0,0 L4,2 L0,4 Z" fill="rgba(251, 191, 36, 0.95)" />
              </marker>
            </defs>
            {jumpCells.map((cell) => {
              if (!cell.jumpTo) return null;
              const a = cellCenterPct(cell.id);
              const b = cellCenterPct(cell.jumpTo);
              const isSnake = cell.type === "snake";
              return (
                <line
                  key={`${cell.id}-${cell.jumpTo}`}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke={
                    isSnake
                      ? "rgba(244, 63, 94, 0.75)"
                      : "rgba(251, 191, 36, 0.9)"
                  }
                  strokeWidth={isSnake ? 0.5 : 0.55}
                  strokeLinecap="round"
                  strokeDasharray={isSnake ? "1.2 0.9" : undefined}
                  markerEnd={isSnake ? undefined : "url(#lila-arrow-head)"}
                  vectorEffect="non-scaling-stroke"
                />
              );
            })}
          </svg>
        </div>
      </div>

      {debug && (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/10 ring-1 ring-white/20">
            <button
              onClick={() =>
                setZoom((z) => Math.max(0.5, +(z - 0.1).toFixed(2)))
              }
              className="h-6 w-6 rounded hover:bg-white/10"
              aria-label="Уменьшить"
            >
              −
            </button>
            <span className="min-w-[3ch] text-center tabular-nums">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom((z) => Math.min(4, +(z + 0.1).toFixed(2)))}
              className="h-6 w-6 rounded hover:bg-white/10"
              aria-label="Увеличить"
            >
              +
            </button>
            <button
              onClick={() => setZoom(1)}
              className="ml-1 px-2 h-6 rounded hover:bg-white/10"
            >
              1:1
            </button>
          </div>
          <span className="opacity-60 self-center">
            Сетка 9×8 фиксирована · перетаскивание клеток отключено
          </span>
        </div>
      )}
    </div>
  );
}

export const Board = memo(BoardImpl);
export default Board;

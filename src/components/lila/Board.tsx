import { motion } from "framer-motion";
import { BOARD } from "@/lib/lila-board";
import { type BoardTheme } from "@/lib/board-themes";

interface Props {
  playerPos: number;
  theme: BoardTheme;
  onSelectCell?: (id: number) => void;
}

const COLS = 8;
const ROWS = 9;

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

export function Board({ playerPos, theme, onSelectCell }: Props) {
  const grid: number[][] = [];
  for (let r = 0; r < ROWS; r++) {
    const row: number[] = [];
    for (let c = 0; c < COLS; c++) {
      const base = r * COLS;
      const id = r % 2 === 0 ? base + c + 1 : base + (COLS - c);
      row.push(id);
    }
    grid.push(row);
  }
  const displayRows = [...grid].reverse();

  const { top, right, bottom, left } = theme.gridInset;
  const gap = theme.gridGap;

  return (
    <div
      className={`relative w-full rounded-2xl shadow-2xl ring-1 overflow-hidden ${theme.frameRing}`}
      style={{
        aspectRatio: "1 / 1",
        backgroundImage: `url(${theme.bg})`,
        backgroundSize: "100% 100%",
        backgroundPosition: "center",
      }}
    >
      <div
        className="absolute grid"
        style={{
          top: `${top}%`,
          right: `${right}%`,
          bottom: `${bottom}%`,
          left: `${left}%`,
          gridTemplateColumns: `repeat(${COLS}, 1fr)`,
          gridTemplateRows: `repeat(${ROWS}, 1fr)`,
          gap: `${gap}%`,
        }}
      >
        {displayRows.flat().map((id) => {
          const cell = BOARD[id - 1];
          const isPlayer = id === playerPos;
          const isKailas = id === 68;
          const tint = PLANE_TINTS[cell.plane] ?? "bg-black/30";
          const typeClass =
            cell.type === "snake"
              ? "ring-2 ring-rose-300/80 shadow-[inset_0_0_8px_rgba(244,63,94,0.3)]"
              : cell.type === "ladder"
                ? "ring-2 ring-amber-200/80 shadow-[inset_0_0_8px_rgba(252,211,77,0.35)]"
                : isKailas
                  ? "ring-2 ring-amber-200 shadow-[0_0_18px_rgba(251,191,36,0.7)]"
                  : "ring-1 ring-white/10";
          return (
            <button
              key={id}
              onClick={() => onSelectCell?.(id)}
              className={`relative flex items-end justify-center rounded-[4px] text-[9px] font-medium leading-tight cursor-pointer select-none p-0.5 text-center transition hover:brightness-125 ${tint} ${typeClass}`}
            >
              <span className={`absolute left-1 top-0.5 text-[9px] font-bold ${theme.numberClass}`}>
                {id}
              </span>
              {isKailas && <span className="absolute right-1 top-0.5 text-[10px]">🕉</span>}
              <span className={`relative line-clamp-2 px-0.5 ${theme.labelClass}`}>
                {cell.name}
              </span>
              {isPlayer && (
                <motion.div
                  layoutId="player-token"
                  transition={{ type: "spring", stiffness: 260, damping: 24 }}
                  className="absolute inset-1 rounded-md ring-2 ring-emerald-300 bg-emerald-400/30 backdrop-blur-[2px] flex items-center justify-center z-30"
                >
                  <span className="text-base drop-shadow">🪷</span>
                </motion.div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

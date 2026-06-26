import { motion } from "framer-motion";
import { BOARD } from "@/lib/lila-board";
import boardBg from "@/assets/lila-board-bg.jpg";

interface Props {
  playerPos: number;
  onSelectCell?: (id: number) => void;
}

const COLS = 8;
const ROWS = 9;

export function Board({ playerPos, onSelectCell }: Props) {
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

  return (
    <div
      className="relative rounded-2xl p-2 shadow-2xl ring-1 ring-amber-200/30 overflow-hidden"
      style={{
        backgroundImage: `url(${boardBg})`,
        backgroundSize: "100% 100%",
        backgroundPosition: "center",
      }}
    >
      <div
        className="relative grid gap-[2px]"
        style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }}
      >
        {displayRows.flat().map((id) => {
          const cell = BOARD[id - 1];
          const isPlayer = id === playerPos;
          const isKailas = id === 68;
          const base =
            "relative aspect-square flex items-end justify-center rounded-[4px] text-[9px] font-medium leading-tight cursor-pointer select-none p-0.5 text-center transition hover:bg-white/10";
          const typeClass =
            cell.type === "snake"
              ? "ring-1 ring-rose-400/60"
              : cell.type === "ladder"
                ? "ring-1 ring-amber-300/70"
                : isKailas
                  ? "ring-2 ring-amber-200 shadow-[0_0_18px_rgba(251,191,36,0.7)]"
                  : "ring-1 ring-white/10";
          return (
            <button
              key={id}
              onClick={() => onSelectCell?.(id)}
              className={`${base} ${typeClass}`}
            >
              <span className="absolute left-1 top-0.5 text-[9px] font-bold text-amber-100 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                {id}
              </span>
              <span className="relative line-clamp-2 px-0.5 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]">
                {cell.name}
              </span>
              {isPlayer && (
                <motion.div
                  layoutId="player-token"
                  transition={{ type: "spring", stiffness: 260, damping: 24 }}
                  className="absolute inset-1 rounded-md ring-2 ring-emerald-300 bg-emerald-400/30 backdrop-blur-[2px] flex items-center justify-center"
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

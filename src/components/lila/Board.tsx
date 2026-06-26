import { motion } from "framer-motion";
import { BOARD } from "@/lib/lila-board";

interface Props {
  playerPos: number;
  onSelectCell?: (id: number) => void;
}

// Змейка-раскладка 8 столбцов × 9 строк = 72, идёт снизу вверх, змейкой
const COLS = 8;
const ROWS = 9;

export function Board({ playerPos, onSelectCell }: Props) {
  // Строим сетку: ряд 0 (нижний) = 1..8, ряд 1 = 16..9, ряд 2 = 17..24...
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
  // Отрисовываем сверху вниз (ряд 8 наверху)
  const displayRows = [...grid].reverse();

  return (
    <div className="rounded-2xl bg-[var(--lila-board-bg)] p-2 shadow-lg ring-1 ring-[var(--lila-board-ring)]">
      <div
        className="grid gap-1"
        style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }}
      >
        {displayRows.flat().map((id) => {
          const cell = BOARD[id - 1];
          const isPlayer = id === playerPos;
          const isKailas = id === 68;
          const base =
            "relative aspect-square flex items-center justify-center rounded-md text-[10px] font-medium leading-tight cursor-pointer select-none p-0.5 text-center";
          const typeClass =
            cell.type === "snake"
              ? "bg-rose-500/15 text-rose-200 ring-1 ring-rose-500/40"
              : cell.type === "ladder"
                ? "bg-amber-400/15 text-amber-200 ring-1 ring-amber-400/50"
                : isKailas
                  ? "bg-gradient-to-br from-amber-300 via-amber-200 to-amber-400 text-stone-900 ring-2 ring-amber-200 shadow-[0_0_18px_rgba(251,191,36,0.6)]"
                  : "bg-[var(--lila-cell-bg)] text-[var(--lila-cell-fg)] ring-1 ring-[var(--lila-board-ring)]";
          return (
            <button
              key={id}
              onClick={() => onSelectCell?.(id)}
              className={`${base} ${typeClass}`}
            >
              <span className="absolute left-1 top-0.5 text-[9px] opacity-60">
                {id}
              </span>
              <span className="line-clamp-2 mt-2 px-0.5">{cell.name}</span>
              {isPlayer && (
                <motion.div
                  layoutId="player-token"
                  transition={{ type: "spring", stiffness: 260, damping: 24 }}
                  className="absolute inset-1 rounded-md ring-2 ring-emerald-300 bg-emerald-400/30 backdrop-blur-sm flex items-center justify-center"
                >
                  <span className="text-base">🪷</span>
                </motion.div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

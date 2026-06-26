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

/**
 * Цветовые акценты девяти планов (снизу — земной, сверху — космический).
 * Полупрозрачные плашки делают клетки чёткими поверх живописного фона.
 */
const PLANE_TINTS = [
  "bg-stone-900/55",      // 0: 1-8   земной
  "bg-orange-900/45",     // 1: 9-16  свадхистхана
  "bg-amber-800/40",      // 2: 17-24 манипура
  "bg-emerald-900/45",    // 3: 25-32 анахата
  "bg-sky-900/45",        // 4: 33-40 вишуддха
  "bg-indigo-900/45",     // 5: 41-48 аджна
  "bg-violet-900/45",     // 6: 49-56 сахасрара
  "bg-fuchsia-900/40",    // 7: 57-64 надбрахма
  "bg-amber-700/45",      // 8: 65-72 космический
];

export function Board({ playerPos, theme, onSelectCell }: Props) {
  const grid: number[][] = [];
  for (let r = 0; r < ROWS; r++) {
    const row: number[] = [];
    for (let c = 0; c < COLS; c++) {
      const base = r * COLS;
      // boustrophedon (змейкой) — как в классической Лиле
      const id = r % 2 === 0 ? base + c + 1 : base + (COLS - c);
      row.push(id);
    }
    grid.push(row);
  }
  const displayRows = [...grid].reverse();

  return (
    <div
      className={`relative rounded-2xl p-2 shadow-2xl ring-1 overflow-hidden ${theme.frameRing}`}
      style={{
        backgroundImage: `url(${theme.bg})`,
        backgroundSize: "100% 100%",
        backgroundPosition: "center",
      }}
    >
      {/* лёгкое затемнение, чтобы плашки клеток читались на любом фоне */}
      <div className="absolute inset-0 bg-black/10 pointer-events-none" />
      <div
        className="relative grid gap-[3px]"
        style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }}
      >
        {displayRows.flat().map((id) => {
          const cell = BOARD[id - 1];
          const isPlayer = id === playerPos;
          const isKailas = id === 68;
          const tint = PLANE_TINTS[cell.plane] ?? "bg-black/40";
          const base =
            "relative aspect-square flex items-end justify-center rounded-md text-[9px] font-medium leading-tight cursor-pointer select-none p-0.5 text-center transition hover:brightness-125 backdrop-blur-[1px]";
          const typeClass =
            cell.type === "snake"
              ? "ring-1 ring-rose-400/80 shadow-[inset_0_0_0_1px_rgba(244,63,94,0.35)]"
              : cell.type === "ladder"
                ? "ring-1 ring-amber-300/90 shadow-[inset_0_0_0_1px_rgba(252,211,77,0.4)]"
                : isKailas
                  ? "ring-2 ring-amber-200 shadow-[0_0_18px_rgba(251,191,36,0.7)]"
                  : "ring-1 ring-white/15";
          return (
            <button
              key={id}
              onClick={() => onSelectCell?.(id)}
              className={`${base} ${tint} ${typeClass}`}
            >
              <span className={`absolute left-1 top-0.5 text-[9px] font-bold ${theme.numberClass}`}>
                {id}
              </span>
              {cell.type === "ladder" && (
                <span className="absolute right-1 top-0.5 text-[10px]">🪜</span>
              )}
              {cell.type === "snake" && (
                <span className="absolute right-1 top-0.5 text-[10px]">🐍</span>
              )}
              {isKailas && (
                <span className="absolute right-1 top-0.5 text-[10px]">🕉</span>
              )}
              <span className={`relative line-clamp-2 px-0.5 ${theme.labelClass}`}>
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

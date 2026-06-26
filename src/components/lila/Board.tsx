import { motion } from "framer-motion";
import { BOARD, LADDERS, SNAKES } from "@/lib/lila-board";
import { type BoardTheme } from "@/lib/board-themes";

interface Props {
  playerPos: number;
  theme: BoardTheme;
  onSelectCell?: (id: number) => void;
}

const COLS = 8;
const ROWS = 9;

const PLANE_TINTS = [
  "bg-stone-900/55",
  "bg-orange-900/45",
  "bg-amber-800/40",
  "bg-emerald-900/45",
  "bg-sky-900/45",
  "bg-indigo-900/45",
  "bg-violet-900/45",
  "bg-fuchsia-900/40",
  "bg-amber-700/45",
];

/** Координаты центра клетки в процентах внутри сетки (boustrophedon, нижняя строка — клетки 1..8). */
function cellCenter(id: number): { x: number; y: number } {
  const row = Math.floor((id - 1) / COLS); // 0 = нижняя строка
  const colInRow = (id - 1) % COLS;
  const col = row % 2 === 0 ? colInRow : COLS - 1 - colInRow;
  const displayRow = ROWS - 1 - row; // 0 = верхняя в DOM
  return {
    x: ((col + 0.5) / COLS) * 100,
    y: ((displayRow + 0.5) / ROWS) * 100,
  };
}

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

  const ladderEntries = Object.entries(LADDERS).map(([f, t]) => [Number(f), t] as const);
  const snakeEntries = Object.entries(SNAKES).map(([f, t]) => [Number(f), t] as const);

  return (
    <div
      className={`relative rounded-2xl p-2 shadow-2xl ring-1 overflow-hidden ${theme.frameRing}`}
      style={{
        backgroundImage: `url(${theme.bg})`,
        backgroundSize: "100% 100%",
        backgroundPosition: "center",
      }}
    >
      <div className="absolute inset-0 bg-black/10 pointer-events-none" />
      <div className="relative">
        <div
          className="grid gap-[3px]"
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
                ? "ring-2 ring-rose-400/90"
                : cell.type === "ladder"
                  ? "ring-2 ring-amber-300/90"
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
                {isKailas && <span className="absolute right-1 top-0.5 text-[10px]">🕉</span>}
                <span className={`relative line-clamp-2 px-0.5 ${theme.labelClass}`}>
                  {cell.name}
                </span>
                {isPlayer && (
                  <motion.div
                    layoutId="player-token"
                    transition={{ type: "spring", stiffness: 260, damping: 24 }}
                    className="absolute inset-1 rounded-md ring-2 ring-emerald-300 bg-emerald-400/30 backdrop-blur-[2px] flex items-center justify-center z-20"
                  >
                    <span className="text-base drop-shadow">🪷</span>
                  </motion.div>
                )}
              </button>
            );
          })}
        </div>

        {/* SVG overlay: змеи и стрелы между клетками */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <defs>
            <marker
              id="arrow-ladder"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="4"
              markerHeight="4"
              orient="auto-start-reverse"
            >
              <path d="M0,0 L10,5 L0,10 z" fill="#fcd34d" />
            </marker>
            <marker
              id="snake-head"
              viewBox="0 0 10 10"
              refX="6"
              refY="5"
              markerWidth="5"
              markerHeight="5"
              orient="auto-start-reverse"
            >
              <circle cx="5" cy="5" r="3.5" fill="#fb7185" />
              <circle cx="3.8" cy="4" r="0.7" fill="#1c1917" />
              <circle cx="6.2" cy="4" r="0.7" fill="#1c1917" />
            </marker>
            <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="0.6" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Стрелы (лестницы) — прямые золотые стрелки вверх */}
          {ladderEntries.map(([from, to]) => {
            const a = cellCenter(from);
            const b = cellCenter(to);
            return (
              <g key={`L-${from}`} filter="url(#glow)">
                <line
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke="#fcd34d"
                  strokeWidth="0.7"
                  strokeLinecap="round"
                  strokeDasharray="0.1 1.2"
                  opacity="0.95"
                  markerEnd="url(#arrow-ladder)"
                />
              </g>
            );
          })}

          {/* Змеи — извилистые розовые кривые вниз */}
          {snakeEntries.map(([from, to]) => {
            const a = cellCenter(from);
            const b = cellCenter(to);
            // Контрольные точки для S-образной кривой
            const mx = (a.x + b.x) / 2;
            const my = (a.y + b.y) / 2;
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const len = Math.hypot(dx, dy) || 1;
            // нормаль к линии
            const nx = -dy / len;
            const ny = dx / len;
            const amp = Math.min(8, len * 0.25);
            const c1x = a.x + dx * 0.33 + nx * amp;
            const c1y = a.y + dy * 0.33 + ny * amp;
            const c2x = a.x + dx * 0.66 - nx * amp;
            const c2y = a.y + dy * 0.66 - ny * amp;
            return (
              <g key={`S-${from}`} filter="url(#glow)">
                <path
                  d={`M ${a.x} ${a.y} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${b.x} ${b.y}`}
                  fill="none"
                  stroke="#fb7185"
                  strokeWidth="0.9"
                  strokeLinecap="round"
                  opacity="0.95"
                  markerEnd="url(#snake-head)"
                />
                <path
                  d={`M ${a.x} ${a.y} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${b.x} ${b.y}`}
                  fill="none"
                  stroke="#fda4af"
                  strokeWidth="0.3"
                  strokeDasharray="0.4 0.8"
                  opacity="0.8"
                />
                {/* хвост змеи */}
                <circle cx={a.x} cy={a.y} r="0.6" fill="#fb7185" opacity="0.9" />
                {/* центральная подпись с цифрой назначения */}
                <text
                  x={mx}
                  y={my}
                  fontSize="2"
                  fontWeight="700"
                  fill="#fff"
                  stroke="#1c1917"
                  strokeWidth="0.3"
                  paintOrder="stroke"
                  textAnchor="middle"
                  dominantBaseline="middle"
                >
                  →{to}
                </text>
              </g>
            );
          })}

          {/* Подписи назначения для лестниц */}
          {ladderEntries.map(([from, to]) => {
            const a = cellCenter(from);
            const b = cellCenter(to);
            const mx = (a.x + b.x) / 2;
            const my = (a.y + b.y) / 2;
            return (
              <text
                key={`LT-${from}`}
                x={mx}
                y={my}
                fontSize="2"
                fontWeight="700"
                fill="#fff"
                stroke="#78350f"
                strokeWidth="0.3"
                paintOrder="stroke"
                textAnchor="middle"
                dominantBaseline="middle"
              >
                ↑{to}
              </text>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

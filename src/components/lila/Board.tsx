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

function cellCenter(id: number): { x: number; y: number } {
  const row = Math.floor((id - 1) / COLS);
  const colInRow = (id - 1) % COLS;
  const col = row % 2 === 0 ? colInRow : COLS - 1 - colInRow;
  const displayRow = ROWS - 1 - row;
  return {
    x: ((col + 0.5) / COLS) * 100,
    y: ((displayRow + 0.5) / ROWS) * 100,
  };
}

/** Священная стрела (лестница) в стиле раджпутской миниатюры. */
function SacredArrow({ from, to }: { from: number; to: number }) {
  const a = cellCenter(from);
  const b = cellCenter(to);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  // оставляем зазор у клеток
  const pad = 3.2;
  const usable = Math.max(len - pad * 2, 1);
  return (
    <g transform={`translate(${a.x} ${a.y}) rotate(${angle})`} filter="url(#soft-shadow)">
      <g transform={`translate(${pad} 0)`}>
        {/* древко стрелы — двойной золотой стержень */}
        <line x1="0" y1="0" x2={usable} y2="0" stroke="url(#gold-shaft)" strokeWidth="1.1" strokeLinecap="round" />
        <line x1="0" y1="0" x2={usable} y2="0" stroke="#fffbeb" strokeWidth="0.25" strokeLinecap="round" opacity="0.7" />
        {/* орнаментальные кольца вдоль древка */}
        {Array.from({ length: Math.max(2, Math.floor(usable / 5)) }).map((_, i, arr) => {
          const t = ((i + 1) / (arr.length + 1)) * usable;
          return <circle key={i} cx={t} cy="0" r="0.45" fill="#fde68a" stroke="#92400e" strokeWidth="0.12" />;
        })}
        {/* оперение (3 пера) */}
        <g>
          <path d="M 0 0 L -2.2 -1.4 L -1.6 0 L -2.2 1.4 Z" fill="url(#gold-shaft)" stroke="#78350f" strokeWidth="0.12" />
          <path d="M -0.6 0 L -2.6 -1.0 L -2.0 0 L -2.6 1.0 Z" fill="#fcd34d" opacity="0.85" />
        </g>
        {/* наконечник стрелы — ромб */}
        <g transform={`translate(${usable} 0)`}>
          <path d="M 0 0 L -2.4 -1.4 L -1.2 0 L -2.4 1.4 Z" fill="url(#gold-tip)" stroke="#78350f" strokeWidth="0.18" />
          <circle cx="-1.2" cy="0" r="0.35" fill="#fffbeb" />
        </g>
      </g>
      {/* подпись назначения у середины */}
      <g transform={`translate(${pad + usable / 2} 0) rotate(${-angle})`}>
        <rect x="-2.6" y="-1.3" width="5.2" height="2.6" rx="1.3" fill="#1c1408" stroke="#fcd34d" strokeWidth="0.18" opacity="0.92" />
        <text x="0" y="0.05" fontSize="1.6" fontWeight="700" fill="#fde68a" textAnchor="middle" dominantBaseline="middle" fontFamily="ui-serif, Georgia, serif">
          ↑ {to}
        </text>
      </g>
    </g>
  );
}

/** Священный змей (нага) с чешуёй и головой. */
function SacredSnake({ from, to }: { from: number; to: number }) {
  const a = cellCenter(from);
  const b = cellCenter(to);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const amp = Math.min(7, len * 0.28);
  // двойная S-кривая через 3 контрольных смещения
  const p1x = a.x + dx * 0.25 + nx * amp;
  const p1y = a.y + dy * 0.25 + ny * amp;
  const p2x = a.x + dx * 0.75 - nx * amp;
  const p2y = a.y + dy * 0.75 - ny * amp;
  const path = `M ${a.x} ${a.y} C ${p1x} ${p1y}, ${p2x} ${p2y}, ${b.x} ${b.y}`;
  const angleAtHead = (Math.atan2(b.y - p2y, b.x - p2x) * 180) / Math.PI;

  const midx = (a.x + b.x) / 2;
  const midy = (a.y + b.y) / 2;

  return (
    <g filter="url(#soft-shadow)">
      {/* тёмная подложка туловища */}
      <path d={path} fill="none" stroke="#3b0a14" strokeWidth="1.9" strokeLinecap="round" opacity="0.85" />
      {/* основное туловище — изумрудно-малиновый градиент */}
      <path d={path} fill="none" stroke="url(#snake-body)" strokeWidth="1.5" strokeLinecap="round" />
      {/* чешуйчатый паттерн поверх */}
      <path d={path} fill="none" stroke="url(#scales)" strokeWidth="1.5" strokeLinecap="round" opacity="0.55" />
      {/* блик вдоль спины */}
      <path d={path} fill="none" stroke="#fda4af" strokeWidth="0.25" strokeDasharray="0.6 1.4" opacity="0.7" />

      {/* хвост (точка-завиток у source) */}
      <circle cx={a.x} cy={a.y} r="0.5" fill="#7f1d1d" />
      <circle cx={a.x} cy={a.y} r="0.25" fill="#fecdd3" />

      {/* голова змеи у destination */}
      <g transform={`translate(${b.x} ${b.y}) rotate(${angleAtHead})`}>
        {/* капюшон-нимб */}
        <ellipse cx="-0.6" cy="0" rx="2.4" ry="1.7" fill="url(#hood)" stroke="#7f1d1d" strokeWidth="0.18" />
        {/* голова */}
        <ellipse cx="0.3" cy="0" rx="1.6" ry="1.1" fill="url(#snake-head)" stroke="#450a0a" strokeWidth="0.18" />
        {/* глаза */}
        <circle cx="0.6" cy="-0.45" r="0.28" fill="#fef3c7" />
        <circle cx="0.6" cy="0.45" r="0.28" fill="#fef3c7" />
        <ellipse cx="0.7" cy="-0.45" rx="0.1" ry="0.18" fill="#1c1917" />
        <ellipse cx="0.7" cy="0.45" rx="0.1" ry="0.18" fill="#1c1917" />
        {/* раздвоенный язык */}
        <path d="M 1.7 0 L 2.9 -0.35 M 1.7 0 L 2.9 0.35 M 1.7 0 L 2.6 0" stroke="#dc2626" strokeWidth="0.18" strokeLinecap="round" fill="none" />
        {/* золотая тилака на лбу */}
        <circle cx="0.1" cy="0" r="0.18" fill="#fde68a" stroke="#78350f" strokeWidth="0.08" />
      </g>

      {/* подпись «куда падаем» */}
      <g transform={`translate(${midx} ${midy})`}>
        <rect x="-2.8" y="-1.3" width="5.6" height="2.6" rx="1.3" fill="#1a0508" stroke="#fb7185" strokeWidth="0.18" opacity="0.92" />
        <text x="0" y="0.05" fontSize="1.6" fontWeight="700" fill="#fecdd3" textAnchor="middle" dominantBaseline="middle" fontFamily="ui-serif, Georgia, serif">
          ↓ {to}
        </text>
      </g>
    </g>
  );
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
                ? "ring-2 ring-rose-300/90 shadow-[inset_0_0_8px_rgba(244,63,94,0.35)]"
                : cell.type === "ladder"
                  ? "ring-2 ring-amber-200/90 shadow-[inset_0_0_8px_rgba(252,211,77,0.4)]"
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
    </div>

  );
}

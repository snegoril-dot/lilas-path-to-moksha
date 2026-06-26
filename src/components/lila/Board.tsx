import { motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BOARD } from "@/lib/lila-board";
import { type BoardTheme } from "@/lib/board-themes";

interface Props {
  playerPos: number;
  theme: BoardTheme;
  onSelectCell?: (id: number) => void;
  debug?: boolean;
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

export interface CellRect {
  x: number; // %
  y: number; // %
  w: number; // %
  h: number; // %
}

export type Layout = Record<number, CellRect>;

function defaultLayout(theme: BoardTheme): Layout {
  const { top, right, bottom, left } = theme.gridInset;
  const gap = theme.gridGap;
  const innerW = 100 - left - right;
  const innerH = 100 - top - bottom;
  const cellW = (innerW - gap * (COLS - 1)) / COLS;
  const cellH = (innerH - gap * (ROWS - 1)) / ROWS;
  const layout: Layout = {};
  for (let r = 0; r < ROWS; r++) {
    const reversed = r % 2 === 1 || r === ROWS - 1;
    for (let c = 0; c < COLS; c++) {
      const base = r * COLS;
      const id = reversed ? base + (COLS - c) : base + c + 1;
      // r=0 is bottom row visually; top y for row r:
      const visualRow = ROWS - 1 - r;
      const x = left + c * (cellW + gap);
      const y = top + visualRow * (cellH + gap);
      layout[id] = { x, y, w: cellW, h: cellH };
    }
  }
  return layout;
}

function layoutKey(themeId: string) {
  return `lila.layout.${themeId}`;
}

function loadLayout(theme: BoardTheme): Layout {
  if (typeof window === "undefined") return defaultLayout(theme);
  try {
    const raw = window.localStorage.getItem(layoutKey(theme.id));
    if (!raw) return defaultLayout(theme);
    const parsed = JSON.parse(raw) as Layout;
    // fill missing ids
    const def = defaultLayout(theme);
    for (let i = 1; i <= 72; i++) if (!parsed[i]) parsed[i] = def[i];
    return parsed;
  } catch {
    return defaultLayout(theme);
  }
}

export function Board({ playerPos, theme, onSelectCell, debug }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<Layout>(() => loadLayout(theme));

  useEffect(() => {
    setLayout(loadLayout(theme));
  }, [theme]);

  const persist = useCallback(
    (next: Layout) => {
      setLayout(next);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(layoutKey(theme.id), JSON.stringify(next));
      }
    },
    [theme.id]
  );

  const updateRect = useCallback(
    (id: number, patch: Partial<CellRect>) => {
      setLayout((prev) => {
        const next = { ...prev, [id]: { ...prev[id], ...patch } };
        if (typeof window !== "undefined") {
          window.localStorage.setItem(layoutKey(theme.id), JSON.stringify(next));
        }
        return next;
      });
    },
    [theme.id]
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
    console.log(`[Lila layout: ${theme.id}]`, json);
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(json).catch(() => {});
    }
  }, [layout, theme.id]);

  const resetLayout = useCallback(() => {
    persist(defaultLayout(theme));
  }, [persist, theme]);

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

  const ids = useMemo(() => Array.from({ length: 72 }, (_, i) => i + 1), []);

  return (
    <div className="relative">
      <div
        ref={containerRef}
        className={`relative w-full rounded-2xl shadow-2xl ring-1 overflow-hidden ${theme.frameRing}`}
        style={{
          aspectRatio: "1 / 1",
          backgroundImage: `url(${theme.bg})`,
          backgroundSize: "100% 100%",
          backgroundPosition: "center",
        }}
      >
        {ids.map((id) => {
          const cell = BOARD[id - 1];
          const rect = layout[id];
          if (!rect) return null;
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
            <div
              key={id}
              onPointerDown={(e) => beginDrag(e, id, "move")}
              onDoubleClick={() => debug && applyToAll(id)}
              onClick={() => !debug && onSelectCell?.(id)}
              className={`absolute flex items-end justify-center rounded-[4px] text-[9px] font-medium leading-tight select-none p-0.5 text-center transition ${
                debug
                  ? "bg-fuchsia-500/25 ring-2 ring-fuchsia-300/90 cursor-move touch-none"
                  : `${tint} ${typeClass} cursor-pointer hover:brightness-125`
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
                  <span className={`absolute left-1 top-0.5 text-[9px] font-bold ${theme.numberClass}`}>
                    {id}
                  </span>
                  {isKailas && <span className="absolute right-1 top-0.5 text-[10px]">🕉</span>}
                  <span className={`relative line-clamp-2 px-0.5 ${theme.labelClass}`}>
                    {cell.name}
                  </span>
                </>
              )}
              {isPlayer && (
                <motion.div
                  layoutId="player-token"
                  transition={{ type: "spring", stiffness: 260, damping: 24 }}
                  className="absolute inset-1 rounded-md ring-2 ring-emerald-300 bg-emerald-400/30 backdrop-blur-[2px] flex items-center justify-center z-30"
                >
                  <span className="text-base drop-shadow">🪷</span>
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
            Экспорт layout ({theme.name})
          </button>
          <button
            onClick={resetLayout}
            className="px-3 py-1.5 rounded-lg bg-white/10 ring-1 ring-white/20 hover:bg-white/20"
          >
            Сбросить
          </button>
          <span className="opacity-60 self-center">
            Перетащи клетку, угол — размер. Двойной клик — применить размер ко всем.
          </span>
        </div>
      )}
    </div>
  );
}

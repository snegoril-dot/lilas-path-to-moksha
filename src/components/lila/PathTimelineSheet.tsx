import { AnimatePresence, motion } from "framer-motion";
import { X, Dice5, ArrowRight, BookOpen } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { BOARD } from "@/lib/lila-board";
import { useDialogA11y } from "@/hooks/use-dialog-a11y";
import { useTelegramBackButton } from "@/hooks/use-telegram";
import type { KeyCell } from "./WinOverlay";

export interface PathTimelineSheetProps {
  open: boolean;
  onClose: () => void;
  /** landing log per turn: { cell, kind: 'land'|'snake'|'ladder'|'moksha', to? } */
  pathLog: Array<{ cell: number; kind: string; to?: number }>;
  /** dice values in chronological order (includes failed entry attempts). */
  diceHistory: number[];
  /** snake/ladder events with optional attached note (private note preview only). */
  keyCells: KeyCell[];
  currentCell: number;
}

function cellName(id: number): string {
  return BOARD[id - 1]?.name ?? `Клетка ${id}`;
}

export function PathTimelineSheet({
  open,
  onClose,
  pathLog,
  diceHistory,
  keyCells,
  currentCell,
}: PathTimelineSheetProps) {
  const { initialRef } = useDialogA11y(open, onClose);
  useTelegramBackButton(open, onClose);

  // Pair each pathLog entry (a landing) with the last N dice values.
  // pathLog length ≤ diceHistory length because failed entry rolls don't land.
  // We take the tail of diceHistory equal to pathLog.length.
  const dicePairs = diceHistory.slice(-pathLog.length);

  // Build a quick lookup of latest note per snake/ladder cell id.
  const noteBySource = new Map<number, string>();
  for (const k of keyCells) {
    if (k.note && k.note.trim().length > 0) noteBySource.set(k.id, k.note.trim());
  }

  const titleId = "path-timeline-title";

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            className="w-full sm:max-w-md bg-[var(--lila-surface,#1a1230)] text-[var(--tg-theme-text-color,#fff)] rounded-t-3xl sm:rounded-3xl ring-1 ring-white/10 shadow-2xl max-h-[92dvh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="shrink-0 flex items-center gap-3 px-4 pt-4 pb-3 border-b border-white/5">
              <div className="shrink-0 h-10 w-10 rounded-2xl bg-gradient-to-br from-amber-300 to-amber-600 text-stone-900 flex items-center justify-center shadow">
                🕉
              </div>
              <div className="flex-1 min-w-0">
                <h2 id={titleId} className="text-base font-semibold leading-tight">
                  Мой путь
                </h2>
                <div className="text-[11px] opacity-60">
                  {pathLog.length === 0
                    ? "Путь ещё не начался"
                    : `${pathLog.length} ${pathLog.length === 1 ? "шаг" : "шагов"} · сейчас: клетка ${currentCell || "—"}`}
                </div>
              </div>
              <Link
                to="/journal"
                onClick={onClose}
                className="shrink-0 inline-flex items-center gap-1 px-2.5 h-9 rounded-full bg-white/5 hover:bg-white/10 ring-1 ring-white/10 text-xs"
                title="Открыть дневник"
              >
                <BookOpen size={14} />
                Дневник
              </Link>
              <button
                ref={initialRef}
                onClick={onClose}
                className="shrink-0 p-2 rounded-full hover:bg-white/10 active:scale-95"
                aria-label="Закрыть"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4">
              {pathLog.length === 0 ? (
                <p className="text-sm opacity-70 text-center py-10">
                  Брось кубик — и твой путь начнёт складываться в историю.
                </p>
              ) : (
                <ol className="relative border-l border-white/10 pl-4 space-y-3">
                  {pathLog.map((entry, i) => {
                    const roll = i + 1;
                    const dice = dicePairs[i];
                    const isSnake = entry.kind === "snake";
                    const isLadder = entry.kind === "ladder";
                    const isMoksha = entry.kind === "moksha";
                    const dest = entry.to;
                    const note = dest !== undefined ? noteBySource.get(entry.cell) : undefined;
                    const dotColor = isMoksha
                      ? "bg-amber-300"
                      : isSnake
                        ? "bg-rose-400"
                        : isLadder
                          ? "bg-emerald-300"
                          : "bg-white/40";
                    return (
                      <li key={i} className="relative">
                        <span
                          aria-hidden
                          className={`absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full ring-2 ring-[var(--lila-surface,#1a1230)] ${dotColor}`}
                        />
                        <div className="rounded-2xl bg-white/[0.04] ring-1 ring-white/10 px-3 py-2">
                          <div className="flex items-center gap-2 text-[11px] opacity-70 mb-1">
                            <span className="inline-flex items-center gap-1">
                              <Dice5 size={12} />
                              Ход {roll}
                            </span>
                            {dice !== undefined && (
                              <span className="inline-flex items-center gap-1">
                                · выпало <b className="text-amber-200">{dice}</b>
                              </span>
                            )}
                          </div>
                          <div className="text-sm flex items-center gap-1.5 flex-wrap">
                            <span className="font-medium">
                              {entry.cell}. {cellName(entry.cell)}
                            </span>
                            {dest !== undefined && (
                              <>
                                <ArrowRight size={14} className={isSnake ? "text-rose-300" : "text-emerald-300"} />
                                <span className={`font-medium ${isSnake ? "text-rose-100" : "text-emerald-100"}`}>
                                  {isSnake ? "🐍 " : isLadder ? "🪜 " : ""}
                                  {dest}. {cellName(dest)}
                                </span>
                              </>
                            )}
                            {isMoksha && (
                              <span className="text-amber-200 font-semibold">✨ Кайлас</span>
                            )}
                          </div>
                          {note && (
                            <div className="mt-1.5 text-[12px] text-amber-100/80 line-clamp-1 italic">
                              «{note.slice(0, 80)}{note.length > 80 ? "…" : ""}»
                            </div>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>

            <div className="shrink-0 px-4 py-3 border-t border-white/5 bg-black/20 text-[11px] opacity-60 text-center">
              Полный текст твоих инсайтов виден только в Дневнике.
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

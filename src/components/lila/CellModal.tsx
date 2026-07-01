import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { BOARD, getLoka } from "@/lib/lila-board";
import { getCellMeta, getTattvaForCell } from "@/lib/lila-wisdom-full";
import { getCellExperience } from "@/lib/cell-experience";

import { useDialogA11y } from "@/hooks/use-dialog-a11y";
import { useTelegramBackButton } from "@/hooks/use-telegram";
import { Glyph } from "./Glyph";

export function CellModal({ cellId, onClose }: { cellId: number | null; onClose: () => void }) {
  const cell = cellId ? BOARD[cellId - 1] : null;
  const { initialRef } = useDialogA11y(!!cell, onClose);
  useTelegramBackButton(!!cell, onClose);
  const titleId = "cell-modal-title";
  const meta = cell ? getCellMeta(cell.id) : null;
  const tattva = cell ? getTattvaForCell(cell.id) : null;
  const loka = cell ? getLoka(cell.id) : null;
  const experience = cell ? getCellExperience(cell.id) : null;


  return (
    <AnimatePresence>
      {cell && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-3xl bg-[var(--lila-surface)] text-[var(--tg-theme-text-color,#fff)] p-6 shadow-2xl ring-1 ring-white/10"
          >
            <div className="flex items-start justify-between mb-2 gap-3">
              <div className="flex items-start gap-3 min-w-0">
                {tattva && (
                  <div
                    className="shrink-0 h-11 w-11 rounded-xl bg-white/5 ring-1 ring-white/10 flex items-center justify-center text-xl"
                    title={`${tattva.name} — ${tattva.hint}`}
                    aria-hidden
                  >
                    {tattva.glyph}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="text-[10px] uppercase tracking-wider opacity-50">
                    Клетка {cell.id}
                    {loka ? ` · ${loka.name}` : ""}
                  </div>
                  <h3 id={titleId} className="text-lg font-semibold leading-tight">
                    {cell.name}
                  </h3>
                  {tattva && (
                    <div className="text-[11px] opacity-60 mt-0.5">
                      {tattva.glyph} {tattva.name}
                    </div>
                  )}
                </div>
              </div>
              <button
                ref={initialRef}
                onClick={onClose}
                aria-label="Закрыть"
                className="p-1 rounded-full hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-amber-300 focus:outline-none shrink-0"
              >
                <X size={20} />
              </button>
            </div>

            <p className="text-sm opacity-90 leading-relaxed mt-3 whitespace-pre-line">
              {meta?.full ?? cell.wisdom}
            </p>

            {experience && experience.reflectionQuestions.length > 0 && (
              <div className="mt-4 pt-3 border-t border-white/10">
                <div className="text-[10px] uppercase tracking-wider opacity-55 mb-2">
                  Вопросы для саморефлексии
                </div>
                <ul className="space-y-1.5 text-sm opacity-90">
                  {experience.reflectionQuestions.map((q, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-amber-300/80 shrink-0">·</span>
                      <span className="leading-snug">{q}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {meta?.source && (
              <div className="mt-3 pt-3 border-t border-white/10 text-[11px] opacity-55 italic">
                — {meta.source}
              </div>
            )}


            {cell.jumpTo && (
              <div className="mt-3 text-xs">
                {cell.type === "snake" ? (
                  <span className="text-rose-300 inline-flex items-center gap-1.5"><Glyph name="snake" size={14} /> Падение → клетка {cell.jumpTo} ({BOARD[cell.jumpTo - 1].name})</span>
                ) : (
                  <span className="text-amber-300 inline-flex items-center gap-1.5"><Glyph name="ladder" size={14} /> Подъём → клетка {cell.jumpTo} ({BOARD[cell.jumpTo - 1].name})</span>
                )}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}


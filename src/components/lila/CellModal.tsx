import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { BOARD } from "@/lib/lila-board";

export function CellModal({ cellId, onClose }: { cellId: number | null; onClose: () => void }) {
  const cell = cellId ? BOARD[cellId - 1] : null;
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
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-3xl bg-[var(--lila-surface)] text-[var(--tg-theme-text-color,#fff)] p-6 shadow-2xl ring-1 ring-white/10"
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="text-xs opacity-60">Клетка {cell.id}</div>
                <h3 className="text-lg font-semibold">{cell.name}</h3>
              </div>
              <button onClick={onClose} className="p-1 rounded-full hover:bg-white/10">
                <X size={20} />
              </button>
            </div>
            <p className="text-sm opacity-85 leading-relaxed mt-2">{cell.wisdom}</p>
            {cell.jumpTo && (
              <div className="mt-3 text-xs">
                {cell.type === "snake" ? (
                  <span className="text-rose-300">🐍 Падение → клетка {cell.jumpTo} ({BOARD[cell.jumpTo - 1].name})</span>
                ) : (
                  <span className="text-amber-300">🪜 Подъём → клетка {cell.jumpTo} ({BOARD[cell.jumpTo - 1].name})</span>
                )}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

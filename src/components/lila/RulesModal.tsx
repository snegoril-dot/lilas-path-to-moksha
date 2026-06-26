import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useDialogA11y } from "@/hooks/use-dialog-a11y";

export function RulesModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { initialRef } = useDialogA11y(open, onClose);
  const titleId = "rules-modal-title";
  return (
    <AnimatePresence>
      {open && (
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
            transition={{ type: "spring", stiffness: 280, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-3xl bg-[var(--lila-surface)] text-[var(--tg-theme-text-color,#fff)] p-6 shadow-2xl ring-1 ring-white/10 max-h-[80vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-3">
              <h2 id={titleId} className="text-xl font-semibold">📜 Правила Лилы</h2>
              <button
                ref={initialRef}
                onClick={onClose}
                aria-label="Закрыть"
                className="p-1 rounded-full hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-amber-300 focus:outline-none"
              >
                <X size={20} />
              </button>
            </div>
            <div className="space-y-3 text-sm leading-relaxed opacity-90">
              <p>
                <b>Лила</b> — древняя индийская игра о путешествии души через
                72 состояния сознания (таттвы) к Освобождению.
              </p>
              <p>
                <b>Цель:</b> Достичь клетки <b>68 — Кайлас</b> (Мокша, Освобождение).
              </p>
              <p>
                <b>Точный бросок:</b> Чтобы войти в Кайлас, нужно выбросить
                ровно столько, сколько осталось. Если выпало больше — фишка
                «отскакивает» назад на лишние очки.
              </p>
              <p>
                <span className="text-rose-300">🐍 Змеи</span> — пороки (гнев,
                алчность, тщеславие) низвергают тебя на нижние планы.
              </p>
              <p>
                <span className="text-amber-300">🪜 Лестницы</span> — добродетели
                (вера, преданность, милосердие) возносят к высшим мирам.
              </p>
              <p className="opacity-70 italic">
                «Игра — это сама жизнь. Кубик — это карма. Доска — это сознание».
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

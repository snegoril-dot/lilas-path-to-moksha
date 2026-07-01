import { AnimatePresence, motion } from "framer-motion";
import { Dice5 } from "lucide-react";
import { useDialogA11y } from "@/hooks/use-dialog-a11y";
import { useTelegramBackButton, haptic } from "@/hooks/use-telegram";

/**
 * Короткая интро-карточка «Рождение», которая появляется после ввода
 * Санкальпы, до первого броска. Настраивает игрока на то, что путь
 * отвечает событиями на доске, а не словами.
 */
export function BirthIntroCard({
  open,
  sankalpa,
  onRoll,
  onClose,
}: {
  open: boolean;
  sankalpa?: string;
  onRoll: () => void;
  onClose: () => void;
}) {
  const { initialRef } = useDialogA11y(open, onClose);
  useTelegramBackButton(open, onClose);
  const titleId = "birth-intro-title";

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
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
            className="w-full max-w-md rounded-3xl bg-[var(--lila-surface)] text-[var(--tg-theme-text-color,#fff)] p-6 shadow-2xl ring-1 ring-white/10"
          >
            <div className="text-center">
              <div className="text-5xl mb-3">🪷</div>
              <h2 id={titleId} className="text-lg font-semibold text-amber-100">
                Твоя Санкальпа принята
              </h2>
              {sankalpa && (
                <p className="mt-2 text-sm italic text-amber-100/80">«{sankalpa}»</p>
              )}
            </div>

            <p className="mt-5 text-sm leading-relaxed opacity-85">
              Теперь путь будет отвечать не словами, а событиями на доске.
              Первый этап — <b>рождение</b>. Брось кубик, чтобы войти в игру:
              врата откроет 🎲 <b>6</b>.
            </p>

            <p className="mt-2 text-xs opacity-60 leading-relaxed">
              До тех пор наблюдай нетерпение — оно тоже часть пути.
            </p>

            <div className="mt-6 flex flex-col gap-2">
              <button
                ref={initialRef}
                onClick={() => {
                  haptic("medium");
                  onRoll();
                }}
                className="inline-flex items-center justify-center gap-2 py-3 rounded-2xl bg-gradient-to-r from-amber-300 to-amber-500 text-stone-900 font-semibold shadow active:scale-95 transition focus-visible:ring-2 focus-visible:ring-amber-200 focus:outline-none"
              >
                <Dice5 size={18} />
                Бросить кубик
              </button>
              <button
                onClick={onClose}
                className="py-2 text-xs opacity-60 hover:opacity-90 transition"
              >
                Побыть в тишине
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

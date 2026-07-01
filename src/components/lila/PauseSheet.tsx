import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect, useRef } from "react";
import { SessionSummary } from "./SessionSummary";
import type { KeyCell } from "./WinOverlay";
import { useTelegramBackButton } from "@/hooks/use-telegram";

export interface PauseSheetProps {
  open: boolean;
  onContinue: () => void;
  onExit: () => void;
  sankalpa: string;
  startedAt: string | null;
  currentCell: number;
  totalRolls: number;
  keyCells: KeyCell[];
  sessionId: string | null;
}

export function PauseSheet({
  open,
  onContinue,
  onExit,
  sankalpa,
  startedAt,
  currentCell,
  totalRolls,
  keyCells,
  sessionId,
}: PauseSheetProps) {
  useTelegramBackButton(open, onContinue);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    return () => prev?.focus();
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-start overflow-y-auto p-4 bg-black/70 backdrop-blur"
          role="dialog"
          aria-modal="true"
          aria-label="Пауза сессии"
        >
          <motion.div
            ref={ref}
            tabIndex={-1}
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 30, opacity: 0 }}
            className="w-full max-w-md mt-6 mb-8 focus:outline-none"
          >
            <div className="flex items-center justify-between mb-3 px-1">
              <h2 className="text-lg font-semibold text-amber-100">🌿 Итог сессии</h2>
              <button
                onClick={onContinue}
                className="p-2 rounded-full hover:bg-white/10 text-amber-100/80"
                aria-label="Закрыть"
              >
                <X size={18} />
              </button>
            </div>
            <p className="text-xs opacity-70 mb-3 px-1 leading-relaxed">
              Ты можешь оставить главный инсайт и вернуться позже — прогресс сохранён.
            </p>

            <SessionSummary
              result="paused"
              sankalpa={sankalpa}
              startedAt={startedAt}
              currentCell={currentCell}
              totalRolls={totalRolls}
              keyCells={keyCells}
              sessionId={sessionId}
            />

            <div className="mt-4 flex flex-col sm:flex-row gap-2">
              <button
                onClick={onContinue}
                className="flex-1 h-12 rounded-2xl bg-gradient-to-r from-amber-300 to-amber-500 text-stone-900 font-semibold active:scale-95 transition"
              >
                Продолжить путь
              </button>
              <button
                onClick={onExit}
                className="flex-1 h-12 rounded-2xl bg-white/10 ring-1 ring-white/20 text-amber-50 font-semibold active:scale-95 transition"
              >
                Завершить и начать заново
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

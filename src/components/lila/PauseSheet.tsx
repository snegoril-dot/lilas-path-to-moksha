import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
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
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!open) return;
    setConfirming(false);
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    return () => prev?.focus();
  }, [open]);

  // Last saved insight for a calm at-a-glance preview.
  const lastInsight = [...keyCells].reverse().find((k) => k.note?.trim());

  const handleExitClick = () => {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setConfirming(false);
    onExit();
  };

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
          aria-label="Пауза"
        >
          <motion.div
            ref={ref}
            tabIndex={-1}
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 30, opacity: 0 }}
            className="w-full max-w-md mt-6 mb-8 focus:outline-none"
          >
            <div className="flex items-center justify-between mb-2 px-1">
              <h2 className="text-lg font-semibold text-amber-100">🌿 Пауза</h2>
              <button
                onClick={onContinue}
                className="p-2 rounded-full hover:bg-white/10 text-amber-100/80"
                aria-label="Закрыть"
              >
                <X size={18} />
              </button>
            </div>
            <p className="text-sm text-amber-50/85 mb-3 px-1 leading-relaxed">
              Путь сохранён. Ты можешь вернуться к нему позже — с того же места и с той же Санкальпой.
            </p>

            {lastInsight && (
              <div className="mb-3 rounded-2xl bg-amber-300/10 ring-1 ring-amber-300/20 px-3 py-2.5">
                <div className="text-[10px] uppercase tracking-wider text-amber-200/80 mb-1">
                  Последний инсайт · клетка {lastInsight.id}
                </div>
                <p className="text-xs text-amber-50/90 italic leading-relaxed line-clamp-3">
                  «{lastInsight.note}»
                </p>
              </div>
            )}

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
                onClick={handleExitClick}
                className={`flex-1 h-12 rounded-2xl ring-1 font-semibold active:scale-95 transition ${
                  confirming
                    ? "bg-rose-500/20 ring-rose-300/40 text-rose-50"
                    : "bg-white/10 ring-white/20 text-amber-50"
                }`}
              >
                {confirming ? "Подтвердить: новый путь" : "Начать новый путь"}
              </button>
            </div>
            <p className="mt-3 text-[11px] opacity-55 text-center leading-relaxed px-2">
              {confirming
                ? "Новый путь начнётся с новой Санкальпы. Старый путь и его заметки останутся в дневнике."
                : "Оставить путь на паузе можно в любой момент — прогресс уже сохранён."}
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

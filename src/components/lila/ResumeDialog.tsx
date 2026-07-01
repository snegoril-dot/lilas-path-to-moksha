import { motion, AnimatePresence } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { BOARD } from "@/lib/lila-board";
import { useState } from "react";
import { useTelegramBackButton } from "@/hooks/use-telegram";


export type ResumeSnapshot = {
  currentCell: number;
  sankalpa: string | null;
  movesCount: number;
  updatedAt: string | null;
};

export function ResumeDialog({
  open,
  snapshot,
  onResume,
  onFresh,
}: {
  open: boolean;
  snapshot: ResumeSnapshot | null;
  onResume: () => void;
  onFresh: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const cell = snapshot && snapshot.currentCell > 0 ? BOARD[snapshot.currentCell - 1] : null;

  const handleFreshClick = () => {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setConfirming(false);
    onFresh();
  };

  return (
    <AnimatePresence>
      {open && snapshot && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
        >
          <motion.div
            initial={{ y: 20, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 20, opacity: 0 }}
            transition={{ type: "spring", stiffness: 220, damping: 22 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="resume-title"
            className="w-full max-w-sm rounded-3xl bg-[var(--lila-surface)] ring-1 ring-white/10 shadow-2xl p-5 text-[var(--tg-theme-text-color,#fff)]"
          >
            <div className="text-3xl text-center">🕉</div>
            <h2
              id="resume-title"
              className="mt-2 text-center text-lg font-bold bg-gradient-to-r from-amber-200 to-amber-400 bg-clip-text text-transparent"
            >
              У тебя есть незавершённый путь
            </h2>
            <p className="mt-3 text-sm opacity-85 text-center leading-relaxed">
              {cell ? (
                <>
                  Ты остановился на клетке <b>{cell.id}</b> — <b>{cell.name}</b>.
                </>
              ) : (
                <>Душа ещё стояла у порога рождения.</>
              )}
              <br />
              Можно продолжить этот путь или начать новый.
            </p>
            {snapshot.sankalpa && (
              <div className="mt-3 rounded-2xl bg-black/20 px-3 py-2 text-xs italic opacity-90 text-center">
                «{snapshot.sankalpa}»
              </div>
            )}
            {snapshot.movesCount > 0 && (
              <div className="mt-2 text-center text-[11px] opacity-60">
                Сделано бросков: {snapshot.movesCount}
              </div>
            )}
            <div className="mt-5 flex flex-col gap-2">
              <button
                onClick={onResume}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-300 to-amber-500 text-stone-900 font-semibold text-sm shadow-lg active:scale-[0.98] transition"
              >
                🌿 Продолжить путь
              </button>
              <button
                onClick={handleFreshClick}
                className={`w-full py-3 rounded-2xl ring-1 text-sm active:scale-[0.98] transition ${
                  confirming
                    ? "bg-rose-500/20 ring-rose-300/40 text-rose-50"
                    : "bg-white/5 hover:bg-white/10 ring-white/10"
                }`}
              >
                {confirming ? "Подтвердить: начать новый" : "🌱 Начать новый путь"}
              </button>
              <Link
                to="/journal"
                className="w-full py-3 rounded-2xl bg-white/5 hover:bg-white/10 ring-1 ring-white/10 text-sm text-center active:scale-[0.98] transition"
              >
                📖 Открыть дневник
              </Link>
            </div>
            <p className="mt-3 text-[11px] opacity-55 text-center leading-relaxed">
              {confirming
                ? "Новый путь начнётся с новой Санкальпы. Старый путь останется в дневнике."
                : "Прошлый путь всегда останется в дневнике — ничего не потеряется."}
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

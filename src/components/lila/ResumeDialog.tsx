import { motion, AnimatePresence } from "framer-motion";

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
              Твой путь ещё продолжается
            </h2>
            <p className="mt-3 text-sm opacity-80 text-center leading-relaxed">
              Ты остановился на клетке <b>{snapshot.currentCell || "порога рождения"}</b>
              {snapshot.movesCount > 0 && (
                <> · сделано бросков: <b>{snapshot.movesCount}</b></>
              )}
              .
            </p>
            {snapshot.sankalpa && (
              <div className="mt-3 rounded-2xl bg-black/20 px-3 py-2 text-xs italic opacity-90 text-center">
                «{snapshot.sankalpa}»
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
                onClick={onFresh}
                className="w-full py-3 rounded-2xl bg-white/5 hover:bg-white/10 ring-1 ring-white/10 text-sm active:scale-[0.98] transition"
              >
                🔄 Начать заново
              </button>
            </div>
            <p className="mt-3 text-[11px] opacity-50 text-center leading-relaxed">
              Если начать заново — прошлый путь мягко закроется как «оставленный».
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

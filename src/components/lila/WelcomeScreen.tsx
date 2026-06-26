import { motion } from "framer-motion";

export function WelcomeScreen({
  onStart,
  onRules,
}: {
  onStart: () => void;
  onRules: () => void;
}) {
  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center p-6 text-center bg-gradient-to-b from-[var(--lila-bg)] via-[var(--lila-bg)] to-[var(--lila-bg-2)]">
      <motion.div
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 18 }}
        className="relative h-28 w-28 rounded-full bg-gradient-to-br from-amber-300 via-amber-400 to-amber-600 flex items-center justify-center text-5xl shadow-[0_0_60px_rgba(251,191,36,0.4)]"
      >
        🕉
      </motion.div>
      <motion.h1
        initial={{ y: 16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="mt-6 text-3xl font-bold bg-gradient-to-r from-amber-200 to-amber-400 bg-clip-text text-transparent"
      >
        Лила
      </motion.h1>
      <motion.p
        initial={{ y: 16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.35 }}
        className="mt-1 text-sm opacity-70"
      >
        Игра Самопознания
      </motion.p>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-6 max-w-sm rounded-2xl bg-[var(--lila-bubble-bg)] text-[var(--lila-bubble-fg)] px-4 py-3 text-sm leading-relaxed text-left shadow-md ring-1 ring-white/5"
      >
        <b>Намасте, странник.</b> 🙏{"\n"}
        Перед тобой древняя игра о пути души сквозь 72 состояния сознания.
        Брось кубик — и пусть карма сама приведёт тебя к Освобождению.
      </motion.div>
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="mt-8 w-full max-w-sm space-y-3"
      >
        <button
          onClick={onStart}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-300 to-amber-500 text-stone-900 font-semibold text-base shadow-xl hover:brightness-110 active:scale-[0.98] transition"
        >
          🎲 Начать игру
        </button>
        <button
          onClick={onRules}
          className="w-full py-4 rounded-2xl bg-[var(--tg-theme-button-color,#2481cc)] text-[var(--tg-theme-button-text-color,#fff)] font-semibold text-base shadow-md hover:brightness-110 active:scale-[0.98] transition"
        >
          📜 Правила
        </button>
      </motion.div>
    </div>
  );
}

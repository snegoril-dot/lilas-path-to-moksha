import { motion } from "framer-motion";
import { Trophy } from "lucide-react";
import { useState } from "react";
import { DailyCard } from "./DailyCard";
import { AchievementsModal } from "./AchievementsModal";

export function WelcomeScreen({
  onStart,
  onRules,
}: {
  onStart: (sankalpa: string) => void;
  onRules: () => void;
}) {
  const [sankalpa, setSankalpa] = useState("");

  const [achOpen, setAchOpen] = useState(false);

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center p-6 text-center bg-gradient-to-b from-[var(--lila-bg)] via-[var(--lila-bg)] to-[var(--lila-bg-2)]">
      <button
        onClick={() => setAchOpen(true)}
        aria-label="Достижения"
        className="absolute top-4 right-4 p-2.5 rounded-full bg-white/5 hover:bg-white/10 ring-1 ring-amber-300/30 text-amber-200 transition"
        title="Достижения"
      >
        <Trophy size={18} />
      </button>
      <motion.div
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 18 }}
        className="relative h-24 w-24 rounded-full bg-gradient-to-br from-amber-300 via-amber-400 to-amber-600 flex items-center justify-center text-4xl shadow-[0_0_60px_rgba(251,191,36,0.4)]"
      >
        🕉
      </motion.div>
      <motion.h1
        initial={{ y: 16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="mt-5 text-3xl font-bold bg-gradient-to-r from-amber-200 to-amber-400 bg-clip-text text-transparent"
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
        className="mt-5 max-w-sm rounded-2xl bg-[var(--lila-bubble-bg)] text-[var(--lila-bubble-fg)] px-4 py-3 text-sm leading-relaxed text-left shadow-md ring-1 ring-white/5"
      >
        <b>Намасте, странник.</b> 🙏<br />
        Прежде чем бросить кубик — сформулируй <b>Санкальпу</b>: вопрос или
        намерение, с которым входишь в игру. Путь души даст на него ответ.
      </motion.div>

      <div className="mt-4 w-full max-w-sm">
        <DailyCard />
      </div>



      <motion.div
        initial={{ y: 16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="mt-4 w-full max-w-sm text-left"
      >
        <label className="text-xs uppercase tracking-wider opacity-60 ml-1">
          Твой вопрос (Санкальпа)
        </label>
        <textarea
          value={sankalpa}
          onChange={(e) => setSankalpa(e.target.value.slice(0, 240))}
          placeholder="Например: «Что мне сейчас важнее всего понять о себе?»"
          rows={3}
          className="mt-1 w-full rounded-2xl bg-[var(--lila-surface)] border border-white/10 px-4 py-3 text-sm text-[var(--tg-theme-text-color,#fff)] placeholder:opacity-40 focus:outline-none focus:ring-2 focus:ring-amber-400/60 resize-none"
        />
        <div className="text-[10px] opacity-40 text-right mt-1">
          {sankalpa.length}/240 · можно оставить пустым
        </div>
      </motion.div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.75 }}
        className="mt-3 w-full max-w-sm space-y-3"
      >
        <button
          onClick={() => onStart(sankalpa.trim())}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-300 to-amber-500 text-stone-900 font-semibold text-base shadow-xl hover:brightness-110 active:scale-[0.98] transition"
        >
          🎲 Начать игру
        </button>
        <button
          onClick={onRules}
          className="w-full py-3 rounded-2xl bg-[var(--tg-theme-button-color,#2481cc)] text-[var(--tg-theme-button-text-color,#fff)] font-semibold text-sm shadow-md hover:brightness-110 active:scale-[0.98] transition"
        >
          📜 Правила
        </button>
      </motion.div>
      <AchievementsModal open={achOpen} onClose={() => setAchOpen(false)} />
    </div>
  );
}

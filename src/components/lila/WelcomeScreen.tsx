import { motion } from "framer-motion";
import { Trophy } from "lucide-react";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { DailyCard } from "./DailyCard";
import { AchievementsModal } from "./AchievementsModal";
import { OnboardingModal, hasSeenOnboarding } from "./OnboardingModal";
import { MODE_DESCRIPTION, MODE_LABEL, type GameMode } from "@/lib/game-mode";
import { useTelegramMainButton, isInTelegram, haptic } from "@/hooks/use-telegram";
import { getProfileSummary } from "@/lib/profile-summary.functions";

export function WelcomeScreen({
  onStart,
  onRules,
}: {
  onStart: (sankalpa: string, mode: GameMode) => void;
  onRules: () => void;
}) {
  const [sankalpa, setSankalpa] = useState("");
  const [mode, setMode] = useState<GameMode>("classic");

  const [achOpen, setAchOpen] = useState(false);
  const [onbOpen, setOnbOpen] = useState(false);
  const inTg = isInTelegram();

  useEffect(() => {
    if (!hasSeenOnboarding()) setOnbOpen(true);
  }, []);

  const fetchSummary = useServerFn(getProfileSummary);
  const { data: summary } = useQuery({
    queryKey: ["profile-summary"],
    queryFn: () => fetchSummary({ data: {} }),
    staleTime: 60_000,
    retry: false,
  });
  // «Возвращение к пути» — только когда прошлые сессии есть, но активной нет.
  // Случай активной сессии уже показывает ResumeDialog.
  const showReturning = Boolean(
    summary && summary.hasPreviousSessions && !summary.hasActiveSession,
  );


  const [touched, setTouched] = useState(false);
  const trimmed = sankalpa.trim();
  const canStart = trimmed.length > 0;

  const handleStart = () => {
    if (!canStart) {
      setTouched(true);
      haptic("light");
      return;
    }
    haptic("medium");
    onStart(trimmed, mode);
  };

  useTelegramMainButton({
    text: "🎲 Начать игру",
    visible: inTg && !achOpen,
    onClick: handleStart,
  });


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
        Прежде чем бросить кубик — попробуй сформулировать <b>Санкальпу</b>:
        вопрос или намерение, с которым ты входишь в игру. Клетки станут
        зеркалом для этого вопроса.
      </motion.div>

      <div className="mt-4 w-full max-w-sm">
        <DailyCard />
      </div>

      {showReturning && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 w-full max-w-sm rounded-2xl bg-white/5 ring-1 ring-white/10 px-4 py-3 text-left"
        >
          <div className="text-sm opacity-90">
            Ты уже проходил путь раньше. Можно начать новую Санкальпу или заглянуть в дневник.
          </div>
          <Link
            to="/journal"
            className="mt-2 inline-flex items-center gap-1 text-[12px] text-amber-200 hover:text-amber-100"
          >
            📖 Открыть дневник
          </Link>
        </motion.div>
      )}





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
          onBlur={() => setTouched(true)}
          placeholder="Например: «Что мне сейчас важнее всего понять о себе?»"
          rows={3}
          aria-invalid={touched && !canStart}
          className="mt-1 w-full rounded-2xl bg-[var(--lila-surface)] border border-white/10 px-4 py-3 text-[16px] text-[var(--tg-theme-text-color,#fff)] placeholder:opacity-40 focus:outline-none focus:ring-2 focus:ring-amber-400/60 resize-none"
        />
        <div className="text-[10px] opacity-50 text-right mt-1">
          {sankalpa.length}/240
        </div>
        {touched && !canStart && (
          <div className="mt-1 text-[11px] text-amber-200/90 leading-snug">
            Сформулируй вопрос или намерение, чтобы войти в путь.
          </div>
        )}
      </motion.div>

      <motion.fieldset
        initial={{ y: 16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="mt-4 w-full max-w-sm text-left"
      >
        <legend className="text-xs uppercase tracking-wider opacity-60 ml-1 mb-1">
          Режим игры
        </legend>
        <div className="grid grid-cols-1 gap-2">
          {(["classic", "soft"] as GameMode[]).map((m) => {
            const active = mode === m;
            return (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                aria-pressed={active}
                className={`text-left rounded-2xl px-4 py-3 ring-1 transition ${
                  active
                    ? "bg-amber-400/15 ring-amber-300/60"
                    : "bg-[var(--lila-surface)] ring-white/10 hover:ring-white/20"
                }`}
              >
                <div className="text-sm font-semibold flex items-center gap-2">
                  <span aria-hidden>{m === "classic" ? "🕉" : "🌿"}</span>
                  {MODE_LABEL[m]}
                </div>
                <div className="text-[11px] opacity-70 mt-0.5 leading-snug">
                  {MODE_DESCRIPTION[m]}
                </div>
              </button>
            );
          })}
        </div>
      </motion.fieldset>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.75 }}
        className="mt-3 w-full max-w-sm space-y-3"
      >
        {!inTg && (
          <button
            onClick={handleStart}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-300 to-amber-500 text-stone-900 font-semibold text-base shadow-xl hover:brightness-110 active:scale-[0.98] transition"
          >
            🎲 Начать игру
          </button>
        )}
        <button
          onClick={onRules}
          className="w-full py-3 rounded-2xl bg-[var(--tg-theme-button-color,#2481cc)] text-[var(--tg-theme-button-text-color,#fff)] font-semibold text-sm shadow-md hover:brightness-110 active:scale-[0.98] transition"
        >
          📜 Правила
        </button>

      </motion.div>
      <AchievementsModal open={achOpen} onClose={() => setAchOpen(false)} />
      <OnboardingModal open={onbOpen} onClose={() => setOnbOpen(false)} />
    </div>
  );
}

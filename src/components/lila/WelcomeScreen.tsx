import { motion, AnimatePresence } from "framer-motion";
import { SANKALPA_INTRO_LONG } from "@/content/narration";
import { Trophy, ChevronLeft, ChevronRight } from "lucide-react";
import { Suspense, lazy, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { DailyCard } from "./DailyCard";
import type { GameMode } from "@/lib/game-mode";
import { useTelegramMainButton, isInTelegram, haptic } from "@/hooks/use-telegram";
import { getProfileSummary } from "@/lib/profile-summary.functions";
import { safeGet } from "@/lib/safe-storage";
import {
  validateSankalpa,
  type SankalpaValidation,
  GOOD_EXAMPLES,
  BAD_EXAMPLES,
} from "@/lib/sankalpa-validation";

const MorningSankalpaCard = lazy(() =>
  import("./MorningSankalpaCard").then((m) => ({ default: m.MorningSankalpaCard })),
);
const AchievementsModal = lazy(() =>
  import("./AchievementsModal").then((m) => ({ default: m.AchievementsModal })),
);
const OnboardingModal = lazy(() =>
  import("./OnboardingModal").then((m) => ({ default: m.OnboardingModal })),
);

const ONBOARDING_STORAGE_KEY = "lila.onboarding.v1";

function hasSeenOnboardingFast(): boolean {
  if (typeof window === "undefined") return true;
  return safeGet(ONBOARDING_STORAGE_KEY) === "1";
}

type Step = 0 | 1;
const STEP_TITLES = ["Приветствие", "Санкальпа"] as const;

export function WelcomeScreen({
  onStart,
  onRules,
}: {
  onStart: (sankalpa: string, mode: GameMode) => void;
  onRules: () => void;
}) {
  const [step, setStep] = useState<Step>(0);
  const [sankalpa, setSankalpa] = useState("");

  const [achOpen, setAchOpen] = useState(false);
  const [onbOpen, setOnbOpen] = useState(false);
  const [deferredCards, setDeferredCards] = useState(false);
  const [summaryEnabled, setSummaryEnabled] = useState(false);
  const inTg = isInTelegram();

  useEffect(() => {
    if (!hasSeenOnboardingFast()) setOnbOpen(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const runWhenIdle = (cb: () => void) => {
      const w = window as unknown as {
        requestIdleCallback?: (cb: () => void, opts?: { timeout?: number }) => number;
        cancelIdleCallback?: (id: number) => void;
      };
      if (w.requestIdleCallback) return w.requestIdleCallback(cb, { timeout: 3500 });
      return window.setTimeout(cb, 2200);
    };
    const id = runWhenIdle(() => {
      if (cancelled) return;
      setDeferredCards(true);
      setSummaryEnabled(true);
    });
    return () => {
      cancelled = true;
      const w = window as unknown as { cancelIdleCallback?: (id: number) => void };
      if (w.cancelIdleCallback) w.cancelIdleCallback(id);
      else window.clearTimeout(id);
    };
  }, []);

  const fetchSummary = useServerFn(getProfileSummary);
  const { data: summary } = useQuery({
    queryKey: ["profile-summary"],
    queryFn: () => fetchSummary({ data: {} }),
    enabled: summaryEnabled,
    staleTime: 60_000,
    retry: false,
  });
  const showReturning = Boolean(
    summary && summary.hasPreviousSessions && !summary.hasActiveSession,
  );

  const [touched, setTouched] = useState(false);
  const [showRewrite, setShowRewrite] = useState(false);
  const trimmed = sankalpa.trim();
  const validation: SankalpaValidation = useMemo(
    () => validateSankalpa(trimmed),
    [trimmed],
  );
  const canStart = trimmed.length > 0 && validation.ok;
  const DEFAULT_SANKALPA = "Хочу увидеть, что для меня сейчас важно.";

  const startedRef = useRef(false);
  const handleStart = () => {
    if (startedRef.current) return;
    startedRef.current = true;
    try { haptic("medium"); } catch { /* noop outside TG */ }
    const finalSankalpa = canStart ? trimmed : DEFAULT_SANKALPA;
    onStart(finalSankalpa, "classic");
  };

  const goNext = () => {
    try { haptic("light"); } catch { /* noop */ }
    setStep((s) => (Math.min(1, s + 1) as Step));
  };
  const goBack = () => {
    try { haptic("light"); } catch { /* noop */ }
    setStep((s) => (Math.max(0, s - 1) as Step));
  };

  const applySuggestion = (s: string) => {
    setSankalpa(s);
    setTouched(false);
    setShowRewrite(false);
  };

  const mainBtnText = step < 1 ? "Далее →" : "🎲 Начать игру";
  // On step 1 (Sankalpa) the button starts the game; allow default fallback when empty.
  const mainBtnActive = step === 1 ? canStart || trimmed.length === 0 : true;
  useTelegramMainButton({
    text: mainBtnText,
    visible: inTg && !achOpen,
    active: mainBtnActive,
    onClick: step < 1 ? goNext : handleStart,
  });


  return (
    <div className="h-[100dvh] max-h-[100dvh] overflow-hidden flex flex-col bg-gradient-to-b from-[var(--lila-bg)] via-[var(--lila-bg)] to-[var(--lila-bg-2)]">
      {/* Top bar: step indicator + back + achievements */}
      <div className="flex items-center justify-between px-4 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <button
          onClick={goBack}
          disabled={step === 0}
          aria-label="Назад"
          className="p-2 rounded-full bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none transition"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="flex items-center gap-1.5">
          {[0, 1].map((i) => (
            <button
              key={i}
              onClick={() => {
                if (i > step && step === 1 && !canStart) {
                  setTouched(true);
                  return;
                }
                setStep(i as Step);
              }}
              aria-label={`Шаг ${i + 1}: ${STEP_TITLES[i]}`}
              className={`h-1.5 rounded-full transition-all ${
                i === step ? "w-6 bg-amber-300" : "w-2 bg-white/20 hover:bg-white/40"
              }`}
            />
          ))}
        </div>
        <button
          onClick={() => setAchOpen(true)}
          aria-label="Достижения"
          className="p-2 rounded-full bg-white/5 hover:bg-white/10 ring-1 ring-amber-300/30 text-amber-200 transition"
        >
          <Trophy size={16} />
        </button>
      </div>

      {/* Step content */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-6 pt-4 pb-4">
        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div
              key="s0"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.25 }}
              className="flex flex-col items-center text-center max-w-sm mx-auto"
            >
              <div className="relative h-24 w-24 rounded-full bg-gradient-to-br from-amber-300 via-amber-400 to-amber-600 flex items-center justify-center text-4xl shadow-[0_0_60px_rgba(251,191,36,0.4)]">
                🕉
              </div>
              <h1 className="mt-5 text-3xl font-bold bg-gradient-to-r from-amber-200 to-amber-400 bg-clip-text text-transparent">
                Лила
              </h1>
              <p className="mt-1 text-sm opacity-70">Игра Самопознания</p>
              <div className="mt-5 w-full rounded-2xl bg-[var(--lila-bubble-bg)] text-[var(--lila-bubble-fg)] px-4 py-3 text-sm leading-relaxed text-left shadow-md ring-1 ring-white/5 space-y-2">
                <div><b>Намасте, странник.</b> 🙏</div>
                <div>{SANKALPA_INTRO_LONG}</div>
                <div className="opacity-90">
                  Лила лучше работает не как предсказание, а как зеркало.
                </div>
              </div>

              <div className="mt-4 w-full">
                <DailyCard />
              </div>
              {deferredCards && (
                <div className="mt-3 w-full">
                  <Suspense fallback={null}>
                    <MorningSankalpaCard />
                  </Suspense>
                </div>
              )}

              {showReturning && (
                <div className="mt-4 w-full rounded-2xl bg-white/5 ring-1 ring-white/10 px-4 py-3 text-left">
                  <div className="text-sm opacity-90">
                    Ты уже проходил путь раньше.
                  </div>
                  <Link
                    to="/journal"
                    className="mt-2 inline-flex items-center gap-1 text-[12px] text-amber-200 hover:text-amber-100"
                  >
                    📖 Открыть дневник
                  </Link>
                </div>
              )}
            </motion.div>
          )}

          {step === 1 && (
            <motion.div
              key="s1"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.25 }}
              className="max-w-sm mx-auto text-left"
            >
              <div className="text-xs uppercase tracking-wider opacity-60 ml-1">Шаг 2 из 2</div>
              <h2 className="text-xl font-semibold mt-1">Сформулируй Санкальпу</h2>
              <p className="mt-1 text-sm opacity-75 leading-relaxed">
                Один честный вопрос или намерение, с которым войдёшь в путь.
              </p>

              <label className="block mt-4 text-xs uppercase tracking-wider opacity-60 ml-1">
                Твой вопрос
              </label>
              <textarea
                value={sankalpa}
                onChange={(e) => setSankalpa(e.target.value.slice(0, 240))}
                onBlur={() => setTouched(true)}
                placeholder="Сформулируй вопрос или намерение…"
                rows={3}
                aria-invalid={touched && !canStart}
                className="mt-1 w-full rounded-2xl bg-[var(--lila-surface)] border border-white/10 px-4 py-3 text-[16px] text-[var(--tg-theme-text-color,#fff)] placeholder:opacity-40 focus:outline-none focus:ring-2 focus:ring-amber-400/60 resize-none"
              />
              <div className="flex items-center justify-between text-[10px] opacity-50 mt-1">
                <span>Коротко и честно.</span>
                <span>{sankalpa.length}/240</span>
              </div>

              {touched && !validation.ok && trimmed.length > 0 && (
                <div className="mt-2 rounded-2xl bg-amber-400/10 ring-1 ring-amber-300/40 px-3 py-2 text-[12px] leading-relaxed text-amber-100">
                  <div>{validation.message}</div>
                  <div className="mt-2 text-[11px] uppercase tracking-wider opacity-70">Попробуй так</div>
                  <ul className="mt-1 space-y-1">
                    {validation.suggestions.map((s) => (
                      <li key={s}>
                        <button
                          type="button"
                          onClick={() => applySuggestion(s)}
                          className="text-left w-full rounded-lg px-2 py-1 hover:bg-white/5 transition"
                        >
                          «{s}»
                        </button>
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    onClick={() => setShowRewrite((v) => !v)}
                    className="mt-2 text-[11px] underline opacity-80 hover:opacity-100"
                  >
                    {showRewrite ? "Скрыть подсказки" : "Помочь переформулировать"}
                  </button>
                  {showRewrite && (
                    <div className="mt-2 text-[11px] opacity-90 leading-snug">
                      Поверни вопрос к себе: не «что случится», а «что я хочу увидеть в себе».
                    </div>
                  )}
                </div>
              )}
              {touched && trimmed.length === 0 && (
                <div className="mt-1 text-[11px] text-amber-200/90">
                  Сформулируй вопрос, чтобы войти в путь.
                </div>
              )}

              <details className="mt-3 rounded-2xl bg-white/5 ring-1 ring-white/10 px-3 py-2 text-[12px] leading-relaxed">
                <summary className="cursor-pointer opacity-80 select-none">Примеры Санкальпы</summary>
                <ul className="mt-2 list-disc pl-5 space-y-0.5">
                  {GOOD_EXAMPLES.map((e) => (
                    <li key={e}>
                      <button
                        type="button"
                        onClick={() => applySuggestion(e)}
                        className="text-left hover:underline"
                      >
                        «{e}»
                      </button>
                    </li>
                  ))}
                </ul>
              </details>

              <details className="mt-2 rounded-2xl bg-white/5 ring-1 ring-white/10 px-3 py-2 text-[12px] leading-relaxed">
                <summary className="cursor-pointer opacity-80 select-none">Что не подходит</summary>
                <ul className="mt-2 list-disc pl-5 space-y-0.5 opacity-80">
                  {BAD_EXAMPLES.map((e) => (
                    <li key={e}>«{e}»</li>
                  ))}
                </ul>
              </details>

              <div className="mt-2 text-[10px] opacity-60">
                Санкальпа приватна и не попадёт в шаринг без твоего выбора.
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom navigation bar (hidden in Telegram — MainButton handles it) */}
      {!inTg && (
        <div className="px-6 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-white/5 bg-[var(--lila-bg)]/80 backdrop-blur">
          <div className="max-w-sm mx-auto flex items-center gap-2">
            <button
              onClick={goBack}
              disabled={step === 0}
              className="px-4 py-3 rounded-2xl bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none transition text-sm flex items-center gap-1"
            >
              <ChevronLeft size={16} /> Назад
            </button>
            {step < 1 ? (
              <button
                onClick={goNext}
                className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-amber-300 to-amber-500 text-stone-900 font-semibold text-sm shadow-xl hover:brightness-110 active:scale-[0.98] transition flex items-center justify-center gap-1"
              >
                Далее <ChevronRight size={16} />
              </button>
            ) : (
              <button
                onClick={handleStart}
                className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-amber-300 to-amber-500 text-stone-900 font-semibold text-sm shadow-xl hover:brightness-110 active:scale-[0.98] transition"
              >
                🎲 Начать игру
              </button>
            )}
            <button
              onClick={onRules}
              aria-label="Правила"
              className="px-3 py-3 rounded-2xl bg-[var(--tg-theme-button-color,#2481cc)] text-[var(--tg-theme-button-text-color,#fff)] font-semibold text-sm shadow-md hover:brightness-110 transition"
            >
              📜
            </button>
          </div>
        </div>
      )}

      {achOpen && (
        <Suspense fallback={null}>
          <AchievementsModal open={achOpen} onClose={() => setAchOpen(false)} />
        </Suspense>
      )}
      {onbOpen && (
        <Suspense fallback={null}>
          <OnboardingModal open={onbOpen} onClose={() => setOnbOpen(false)} />
        </Suspense>
      )}
    </div>
  );
}

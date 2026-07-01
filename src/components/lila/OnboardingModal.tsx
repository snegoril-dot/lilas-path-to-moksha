import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import { useTelegramBackButton } from "@/hooks/use-telegram";



const STORAGE_KEY = "lila.onboarding.v1";

export function hasSeenOnboarding(): boolean {
  if (typeof localStorage === "undefined") return true;
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return true;
  }
}

function markSeen() {
  try {
    localStorage.setItem(STORAGE_KEY, "1");
  } catch {
    /* ignore */
  }
}

interface Screen {
  title: string;
  body: React.ReactNode;
  next: string;
}

const SCREENS: Screen[] = [
  {
    title: "Лила — игра как зеркало",
    body: (
      <p>
        Это не предсказание и не тест. Лила помогает посмотреть на вопрос через
        символы пути: клетки, змеи, лестницы и собственные инсайты.
      </p>
    ),
    next: "Дальше",
  },
  {
    title: "Начни с Санкальпы",
    body: (
      <div className="space-y-3">
        <p>
          Санкальпа — это намерение или вопрос, с которым ты входишь в игру.
          Чем честнее вопрос, тем глубже откликается путь.
        </p>
        <ul className="space-y-1 text-sm italic text-amber-100/80">
          <li>— «Что мне важно понять о себе сейчас?»</li>
          <li>— «Где я теряю внутреннюю опору?»</li>
          <li>— «Что я не хочу видеть в этой ситуации?»</li>
        </ul>
      </div>
    ),
    next: "Дальше",
  },
  {
    title: "Клетка — это вопрос",
    body: (
      <p>
        Когда ты попадаешь на клетку, не ищи приговор. Смотри, что она отражает
        в твоей Санкальпе.
      </p>
    ),
    next: "Дальше",
  },
  {
    title: "Записывай инсайты",
    body: (
      <p>
        После важных ходов сохраняй заметки. В конце из них сложится карта
        твоего пути. Игру можно поставить на паузу и вернуться позже.
      </p>
    ),
    next: "Начать путь",
  },
];

export function OnboardingModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (open) {
      setStep(0);
      trackEvent("onboarding_started");
    }
  }, [open]);

  const finish = () => {
    markSeen();
    trackEvent("onboarding_completed", { extra: { last_step: step } });
    onClose();
  };


  const screen = SCREENS[step];
  const isLast = step === SCREENS.length - 1;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={finish}
        >
          <motion.div
            initial={{ y: 20, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 10, opacity: 0 }}
            transition={{ type: "spring", stiffness: 240, damping: 22 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-sm rounded-3xl bg-gradient-to-br from-stone-900 via-stone-950 to-indigo-950 ring-1 ring-amber-300/25 shadow-2xl p-6 text-amber-50"
          >
            <button
              onClick={finish}
              aria-label="Пропустить вступление"
              className="absolute top-3 right-3 p-1.5 rounded-full text-amber-100/70 hover:text-amber-100 hover:bg-white/5 transition"
            >
              <X size={18} />
            </button>

            <div className="text-[11px] uppercase tracking-[0.2em] text-amber-300/70">
              Шаг {step + 1} из {SCREENS.length}
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
                className="mt-3"
              >
                <h2 className="text-xl font-semibold text-amber-100">
                  {screen.title}
                </h2>
                <div className="mt-3 text-sm leading-relaxed text-amber-50/90">
                  {screen.body}
                </div>
              </motion.div>
            </AnimatePresence>

            <div className="mt-6 flex items-center justify-center gap-1.5">
              {SCREENS.map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 rounded-full transition-all ${
                    i === step ? "w-6 bg-amber-300" : "w-1.5 bg-amber-300/30"
                  }`}
                />
              ))}
            </div>

            <div className="mt-5 flex items-center gap-2">
              <button
                onClick={finish}
                className="flex-1 py-2.5 rounded-xl bg-white/5 ring-1 ring-white/10 text-amber-100/80 text-sm font-medium hover:bg-white/10 transition"
              >
                Пропустить
              </button>
              <button
                onClick={() => (isLast ? finish() : setStep((s) => s + 1))}
                className="flex-[2] py-2.5 rounded-xl bg-gradient-to-r from-amber-300 to-amber-500 text-stone-900 text-sm font-semibold shadow-lg active:scale-[0.98] transition"
              >
                {screen.next}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

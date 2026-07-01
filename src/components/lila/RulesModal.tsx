import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X } from "lucide-react";
import { useState } from "react";
import { useDialogA11y } from "@/hooks/use-dialog-a11y";
import { useTelegramBackButton } from "@/hooks/use-telegram";
import { OnboardingModal } from "./OnboardingModal";

export function RulesModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { initialRef } = useDialogA11y(open, onClose);
  useTelegramBackButton(open, onClose);
  const [onbOpen, setOnbOpen] = useState(false);
  const titleId = "rules-modal-title";
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
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
            className="w-full max-w-md rounded-3xl bg-[var(--lila-surface)] text-[var(--tg-theme-text-color,#fff)] p-6 shadow-2xl ring-1 ring-white/10 max-h-[85vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 id={titleId} className="text-xl font-semibold">🪷 Как идти по пути</h2>
              <button
                ref={initialRef}
                onClick={onClose}
                aria-label="Закрыть"
                className="p-1 rounded-full hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-amber-300 focus:outline-none"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-5 text-sm leading-relaxed opacity-90">
              <p className="opacity-75">
                Лила — не гадание и не тест. Это зеркало для наблюдения за собой.
                Правила ниже помогут пройти путь осознанно.
              </p>

              <section>
                <h3 className="font-semibold text-amber-200 mb-1">1. Сформулируй Санкальпу</h3>
                <p className="opacity-80">
                  Санкальпа — это вопрос или намерение, с которым ты входишь в игру.
                  На него будет отвечать не текст, а сами события на доске.
                </p>
                <ul className="mt-2 space-y-1 text-xs">
                  <li>✅ «Что мне важно понять о себе сейчас?»</li>
                  <li>✅ «Где я теряю внутреннюю опору?»</li>
                  <li className="opacity-60">✖ «Когда я получу деньги?» — путь отвечает о состоянии, а не о датах.</li>
                </ul>
              </section>

              <section>
                <h3 className="font-semibold text-amber-200 mb-1">2. Войди в игру</h3>
                <p className="opacity-80">
                  Путь начинается, когда кубик откроет врата — выпадет 🎲 <b>6</b>.
                  До этого душа ещё не воплощена: наблюдай своё нетерпение,
                  оно тоже часть игры.
                </p>
              </section>

              <section>
                <h3 className="font-semibold text-amber-200 mb-1">3. Двигайся по клеткам</h3>
                <p className="opacity-80">
                  Каждый бросок ведёт тебя в новое состояние сознания. Клетки
                  объединены в планы (локи) — от Земли до Космоса.
                </p>
              </section>

              <section>
                <h3 className="font-semibold text-amber-200 mb-1">4. Читай урок клетки</h3>
                <p className="opacity-80">
                  Клетка — не предсказание, а зеркало. Спроси себя: где эта
                  тема сейчас живёт во мне? Что она хочет показать?
                </p>
              </section>

              <section>
                <h3 className="font-semibold text-amber-200 mb-1">5. Змеи и лестницы</h3>
                <ul className="space-y-1 opacity-80">
                  <li>
                    <span className="text-rose-300">🐍 Змеи</span> — падение через
                    неосознанные шаблоны: гнев, жадность, гордость. Это не наказание,
                    а указание, где стоит остановиться и посмотреть.
                  </li>
                  <li>
                    <span className="text-amber-300">🪜 Лестницы</span> — подъём через
                    качества: вера, преданность, милосердие. Дар, который сознание
                    получает, когда открыто.
                  </li>
                </ul>
              </section>

              <section>
                <h3 className="font-semibold text-amber-200 mb-1">6. Записывай инсайты</h3>
                <p className="opacity-80">
                  Короткие заметки после ключевых клеток остаются с тобой в
                  дневнике. Именно они превращают игру в практику.
                </p>
              </section>

              <section>
                <h3 className="font-semibold text-amber-200 mb-1">7. Достигни Мокши</h3>
                <p className="opacity-80">
                  Цель — клетка <b>68 · Кайлас</b>, Освобождение. Войти можно только
                  точным броском: если выпало больше, чем осталось шагов, фишка
                  «отскакивает» назад на лишние очки. Путь учит терпению до самого конца.
                </p>
              </section>

              <p className="opacity-70 italic pt-2 border-t border-white/10">
                «Игра — это сама жизнь. Кубик — это карма. Доска — это сознание».
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

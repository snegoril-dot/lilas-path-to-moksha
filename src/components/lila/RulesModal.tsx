import { motion, AnimatePresence } from "framer-motion";
import { SANKALPA_INTRO_LONG } from "@/content/narration";
import { ChevronLeft, MessageSquarePlus, Sparkles, X } from "lucide-react";
import { useState } from "react";
import { useDialogA11y } from "@/hooks/use-dialog-a11y";
import { useTelegramBackButton } from "@/hooks/use-telegram";
import { OnboardingModal } from "./OnboardingModal";
import { FeedbackModal } from "./FeedbackModal";

export function RulesModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { initialRef } = useDialogA11y(open, onClose);
  useTelegramBackButton(open, onClose);
  const [onbOpen, setOnbOpen] = useState(false);
  const [fbOpen, setFbOpen] = useState(false);

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
            <div className="flex items-center justify-between gap-2 mb-4">
              <button
                ref={initialRef}
                onClick={onClose}
                aria-label="Назад"
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-sm hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-amber-300 focus:outline-none"
              >
                <ChevronLeft size={16} /> Назад
              </button>
              <h2 id={titleId} className="text-base font-semibold flex-1 text-center">🪷 Как идти по пути</h2>
              <button
                onClick={onClose}
                aria-label="Закрыть"
                className="p-1 rounded-full hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-amber-300 focus:outline-none"
              >
                <X size={18} />
              </button>
            </div>


            <div className="space-y-5 text-sm leading-relaxed opacity-90">
              <p className="opacity-75">
                Лила — не гадание и не тест. Это тихое зеркало для наблюдения
                за собой. Правила ниже помогут пройти путь спокойно и осознанно.
              </p>

              <button
                type="button"
                onClick={() => setOnbOpen(true)}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-amber-400/10 hover:bg-amber-400/20 ring-1 ring-amber-300/40 text-amber-100 px-4 py-2.5 text-sm font-medium transition"
              >
                <Sparkles size={15} /> Показать вступление заново
              </button>

              <section>
                <h3 className="font-semibold text-amber-200 mb-1">1. Сформулируй Санкальпу</h3>
                <p className="opacity-80">{SANKALPA_INTRO_LONG}</p>
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
                  До этого душа ещё не воплощена. Можно заметить, как ум
                  встречает это ожидание — это тоже часть игры.
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
                <h3 className="font-semibold text-amber-200 mb-1">4. Читай клетку как вопрос</h3>
                <p className="opacity-80">
                  Клетка — не предсказание, а зеркало. Попробуй заметить: где эта
                  тема сейчас живёт в моей жизни? Что она хочет показать в
                  контексте моей Санкальпы?
                </p>
              </section>

              <section>
                <h3 className="font-semibold text-amber-200 mb-1">5. Змеи и лестницы</h3>
                <ul className="space-y-1 opacity-80">
                  <li>
                    <span className="text-rose-300">🐍 Змеи</span> — возвращение
                    внимания к неосознанным темам: гневу, жадности, гордости.
                    Это не наказание, а мягкое приглашение задержаться и
                    посмотреть глубже.
                  </li>
                  <li>
                    <span className="text-amber-300">🪜 Лестницы</span> — подъём
                    через качества: веру, преданность, милосердие. Дар, который
                    сознание получает, когда открыто.
                  </li>
                </ul>
              </section>

              <section>
                <h3 className="font-semibold text-amber-200 mb-1">6. Записывай инсайты</h3>
                <p className="opacity-80">
                  Если после клетки что-то откликнулось — сохрани короткую
                  заметку. Именно эти строки со временем превращают игру в
                  живую практику.
                </p>
              </section>

              <section>
                <h3 className="font-semibold text-amber-200 mb-1">7. Достигни Мокши</h3>
                <p className="opacity-80">
                  Цель — клетка <b>68 · Кайлас</b>, Освобождение. Войти можно только
                  точным броском: если выпало больше, чем осталось шагов, фишка
                  мягко «отскакивает» назад на лишние очки. Путь учит терпению
                  до самого конца.
                </p>
              </section>

              <section className="pt-3 border-t border-white/10">
                <h3 className="font-semibold text-amber-200 mb-1">Бета-версия</h3>
                <p className="opacity-80 text-xs">
                  Игра находится в бета-версии. Некоторые элементы пути ещё могут меняться.
                </p>
                <div className="mt-2 grid grid-cols-1 gap-1.5 text-xs opacity-80">
                  <div><b className="text-emerald-200">Уже работает:</b> путь по 72 клеткам, змеи и лестницы, Санкальпа, дневник инсайтов, ИИ-Гуру как зеркало, пауза и возврат.</div>
                  <div><b className="text-amber-200">В разработке:</b> тонкая настройка текстов клеток, расширенная карточка итога, еженедельные подсказки, улучшения дизайна на маленьких экранах.</div>
                </div>
                <button
                  type="button"
                  onClick={() => setFbOpen(true)}
                  className="mt-3 w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-white/5 hover:bg-white/10 ring-1 ring-white/10 px-4 py-2.5 text-sm font-medium transition"
                >
                  <MessageSquarePlus size={15} /> Оставить отзыв
                </button>
              </section>

              <p className="opacity-70 italic pt-2 border-t border-white/10">
                «Игра — это сама жизнь. Кубик — это карма. Доска — это сознание».
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
      <OnboardingModal open={onbOpen} onClose={() => setOnbOpen(false)} />
      <FeedbackModal open={fbOpen} onClose={() => setFbOpen(false)} context="help" />
    </AnimatePresence>
  );
}


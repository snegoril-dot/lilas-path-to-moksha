import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import {
  Volume2, VolumeX, NotebookPen, NotebookText, Ruler, BookOpen, Sparkles,
  Play, Pause, RotateCcw, Shield, MessageSquarePlus, Info, ChevronRight,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import type { PlayerToken } from "@/lib/player-tokens";
import { BOARD } from "@/lib/lila-board";
import { OnboardingModal } from "./OnboardingModal";
import { FeedbackModal } from "./FeedbackModal";

interface Props {
  open: boolean;
  onClose: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  notesEnabled: boolean;
  onToggleNotes: () => void;
  token: PlayerToken;
  onCycleToken: () => void;
  debug: boolean;
  onToggleDebug: () => void;
  // Session
  started: boolean;
  won: boolean;
  currentCell: number; // 0 = ещё не в игре
  totalRolls: number;
  onContinue: () => void;
  onPause: () => void;
  onNewPath: () => void;
  onStart: () => void;
}

function Row({
  icon, label, hint, onClick, active, asLink, to,
}: {
  icon: React.ReactNode; label: string; hint?: string;
  onClick?: () => void; active?: boolean;
  asLink?: boolean; to?: string;
}) {
  const cls = `w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition ${active ? "bg-amber-500/15 text-amber-100 ring-1 ring-amber-400/30" : "bg-white/5 hover:bg-white/10"}`;
  const content = (
    <>
      <span className="h-9 w-9 grid place-items-center rounded-lg bg-white/10 shrink-0">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium truncate">{label}</span>
        {hint && <span className="block text-[11px] opacity-60 truncate">{hint}</span>}
      </span>
    </>
  );
  if (asLink && to) {
    return (
      <Link to={to} className={cls} onClick={onClick}>{content}</Link>
    );
  }
  return <button type="button" onClick={onClick} className={cls}>{content}</button>;
}

function Section({
  title, icon, defaultOpen = false, children,
}: {
  title: string;
  icon: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-2xl bg-white/[0.03] ring-1 ring-white/10 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-3 py-3 text-left hover:bg-white/5 transition"
        aria-expanded={open}
      >
        <span className="h-8 w-8 grid place-items-center rounded-lg bg-white/10 shrink-0">{icon}</span>
        <span className="flex-1 text-sm font-medium">{title}</span>
        <ChevronRight
          size={16}
          className={`opacity-60 transition-transform ${open ? "rotate-90" : ""}`}
        />
      </button>
      {open && <div className="px-4 pb-4 pt-1 text-[13px] leading-relaxed opacity-90 space-y-2">{children}</div>}
    </div>
  );
}

export function SettingsSheet(props: Props) {
  const {
    open, onClose,
    soundEnabled, onToggleSound, notesEnabled, onToggleNotes,
    token, onCycleToken, debug, onToggleDebug,
    started, won, currentCell, totalRolls,
    onContinue, onPause, onNewPath, onStart,
  } = props;

  const [onbOpen, setOnbOpen] = useState(false);
  const [fbOpen, setFbOpen] = useState(false);

  const isBeta = true;
  const cellInfo = currentCell > 0 ? BOARD[currentCell - 1] : null;
  const statusText = won
    ? "Мокша достигнута"
    : started && currentCell > 0
      ? "Путь в процессе"
      : started
        ? "Ожидание входа (бросьте 6)"
        : "Путь ещё не начат";

  const handle = (fn: () => void) => () => { onClose(); setTimeout(fn, 60); };

  return (
    <>
      <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
        <SheetContent
          side="bottom"
          className="bg-[var(--lila-surface,#15131e)] text-white border-t border-white/10 rounded-t-3xl max-h-[88vh] overflow-y-auto pb-[max(1rem,env(safe-area-inset-bottom))]"
        >
          <SheetHeader className="text-left">
            <SheetTitle className="text-white flex items-center gap-2">
              Меню игры
              {isBeta && (
                <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-200 ring-1 ring-amber-300/30">
                  бета
                </span>
              )}
            </SheetTitle>
            <SheetDescription className="text-white/60">Помощь, сессия, приватность</SheetDescription>
          </SheetHeader>

          {/* Быстрые настройки */}
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Row
              icon={soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
              label="Звук"
              hint={soundEnabled ? "Включён" : "Выключен"}
              onClick={onToggleSound}
              active={soundEnabled}
            />
            <Row
              icon={notesEnabled ? <NotebookText size={18} /> : <NotebookPen size={18} />}
              label="Заметки рефлексии"
              hint={notesEnabled ? "Включены" : "Выключены"}
              onClick={onToggleNotes}
              active={notesEnabled}
            />
            <Row
              icon={
                <span
                  className="inline-flex h-5 w-5 items-center justify-center rounded-full text-[13px]"
                  style={{ background: token.bg, boxShadow: `0 0 0 1.5px ${token.ring}` }}
                  aria-hidden
                >
                  {token.glyph}
                </span>
              }
              label="Фигурка"
              hint={token.name}
              onClick={onCycleToken}
            />
            {import.meta.env.DEV && (
              <Row
                icon={<Ruler size={18} />}
                label="Отладка сетки"
                hint={debug ? "Включена" : "Выключена"}
                onClick={onToggleDebug}
                active={debug}
              />
            )}
            <Row icon={<BookOpen size={18} />} label="Дневник" hint="История пути" asLink to="/journal" onClick={onClose} />
            <Row icon={<Sparkles size={18} />} label="Недельный план" hint="Рекомендации Гуру" asLink to="/insights" onClick={onClose} />
          </div>

          {/* Секции */}
          <div className="mt-4 space-y-2">
            <Section title="Как идти по пути" icon={<BookOpen size={16} />} defaultOpen>
              <p>
                <b>Санкальпа</b> — короткое честное намерение, с которым вы входите в игру.
                Оно превращает движение в наблюдение за собой.
              </p>
              <p>
                <b>Кубик и вход.</b> Чтобы войти в игру, бросьте <b>6</b>. После этого
                каждый бросок ведёт по клеткам. Никакой спешки — темп ваш.
              </p>
              <p>
                <b>Клетки.</b> Каждая клетка — это вопрос, а не оценка. Её текст —
                зеркало текущего момента, не приговор.
              </p>
              <p>
                <b>Стрелы</b> поднимают вверх — это качества, которые естественно
                возносят. <b>Змеи</b> ведут вниз — это уроки, которые мягко напоминают,
                где нам ещё есть куда расти.
              </p>
              <p>
                <b>Мокша</b> — клетка 68, символ ясности и покоя. Достичь её —
                значит завершить один круг наблюдения.
              </p>
              <p>
                <b>Дневник</b> хранит ваши инсайты и события пути. Он полностью
                приватный.
              </p>
            </Section>

            <Section title="Моя сессия" icon={<Play size={16} />} defaultOpen>
              {started ? (
                <>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-lg bg-white/5 p-2">
                      <div className="text-[10px] opacity-60 uppercase">Клетка</div>
                      <div className="text-base font-semibold">
                        {currentCell > 0 ? currentCell : "—"}
                      </div>
                    </div>
                    <div className="rounded-lg bg-white/5 p-2">
                      <div className="text-[10px] opacity-60 uppercase">Бросков</div>
                      <div className="text-base font-semibold">{totalRolls}</div>
                    </div>
                    <div className="rounded-lg bg-white/5 p-2">
                      <div className="text-[10px] opacity-60 uppercase">Статус</div>
                      <div className="text-[11px] font-medium leading-tight pt-1">
                        {won ? "Мокша" : currentCell > 0 ? "В пути" : "Вход"}
                      </div>
                    </div>
                  </div>
                  {cellInfo && (
                    <div className="text-xs opacity-70">
                      Сейчас: <b className="opacity-100">{cellInfo.name}</b>
                    </div>
                  )}
                  <div className="text-xs opacity-70">{statusText}</div>
                  <div className="grid grid-cols-1 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={onClose}
                      className="rounded-xl bg-amber-400/15 hover:bg-amber-400/25 ring-1 ring-amber-300/30 text-amber-100 px-3 py-2 text-sm font-medium flex items-center justify-center gap-2"
                    >
                      <Play size={14} /> Продолжить путь
                    </button>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={handle(onPause)}
                        className="rounded-xl bg-white/5 hover:bg-white/10 ring-1 ring-white/10 px-3 py-2 text-sm flex items-center justify-center gap-2"
                      >
                        <Pause size={14} /> Пауза
                      </button>
                      <button
                        type="button"
                        onClick={handle(onNewPath)}
                        className="rounded-xl bg-white/5 hover:bg-white/10 ring-1 ring-white/10 px-3 py-2 text-sm flex items-center justify-center gap-2"
                      >
                        <RotateCcw size={14} /> Новый путь
                      </button>
                    </div>
                  </div>
                  {won && (
                    <p className="text-[11px] opacity-60 pt-1">
                      Круг завершён. Можно перечитать дневник или начать новый путь.
                    </p>
                  )}
                  <p className="text-[11px] opacity-60">
                    Прогресс сохраняется автоматически. К игре можно вернуться позже.
                  </p>
                  {onContinue && null}
                </>
              ) : (
                <>
                  <p className="opacity-75">Активной сессии нет.</p>
                  <button
                    type="button"
                    onClick={handle(onStart)}
                    className="w-full rounded-xl bg-amber-400/20 hover:bg-amber-400/30 ring-1 ring-amber-300/40 text-amber-100 px-3 py-2 text-sm font-medium flex items-center justify-center gap-2"
                  >
                    <Play size={14} /> Начать путь
                  </button>
                </>
              )}
            </Section>

            <Section title="Онбординг" icon={<Sparkles size={16} />}>
              <p className="opacity-75">
                Короткое вступление объясняет суть Лилы, санкальпы и того, как читать клетки.
              </p>
              <button
                type="button"
                onClick={() => setOnbOpen(true)}
                className="w-full rounded-xl bg-white/5 hover:bg-white/10 ring-1 ring-white/10 px-3 py-2 text-sm flex items-center justify-center gap-2"
              >
                <Sparkles size={14} /> Показать вступление ещё раз
              </button>
            </Section>

            <Section title="Приватность" icon={<Shield size={16} />}>
              <ul className="list-disc pl-4 space-y-1 opacity-80">
                <li>Санкальпа и ваши заметки — приватные по умолчанию.</li>
                <li>Текст для «Поделиться» не содержит личные заметки, если вы сами их не добавите.</li>
                <li>Гуру видит текущую клетку и санкальпу как контекст, только когда вы сами обращаетесь к нему.</li>
                <li>Служебная аналитика не содержит текст ваших заметок и переписки с Гуру.</li>
              </ul>
            </Section>

            {isBeta && (
              <Section title="Бета" icon={<Info size={16} />}>
                <p className="opacity-80">
                  Приложение находится в стадии <b>бета-версии</b>. Возможны шероховатости —
                  ваш отзыв помогает делать путь спокойнее и понятнее.
                </p>
                <button
                  type="button"
                  onClick={() => setFbOpen(true)}
                  className="w-full rounded-xl bg-white/5 hover:bg-white/10 ring-1 ring-white/10 px-3 py-2 text-sm flex items-center justify-center gap-2"
                >
                  <MessageSquarePlus size={14} /> Оставить отзыв
                </button>
              </Section>
            )}

            <Section title="О проекте" icon={<Info size={16} />}>
              <p className="opacity-80">
                Lila&apos;s Path to Moksha — цифровая версия пути Лилы как практики самонаблюдения.
              </p>
            </Section>
          </div>
        </SheetContent>
      </Sheet>

      <OnboardingModal open={onbOpen} onClose={() => setOnbOpen(false)} />
      <FeedbackModal open={fbOpen} onClose={() => setFbOpen(false)} context="settings" />
    </>
  );
}

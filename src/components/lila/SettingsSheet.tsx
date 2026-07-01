import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { SANKALPA_INTRO_SHORT } from "@/content/narration";
import {
  Volume2, VolumeX, NotebookPen, NotebookText, Ruler, BookOpen, Sparkles,
  Play, Pause, RotateCcw, Shield, MessageSquarePlus, Info, ChevronRight, CalendarDays,
  Receipt, Scale, LifeBuoy,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { onPaywallOpen } from "@/hooks/use-entitlements";
import type { PlayerToken } from "@/lib/player-tokens";
import { BOARD } from "@/lib/lila-board";
import { OnboardingModal } from "./OnboardingModal";
import { FeedbackModal } from "./FeedbackModal";
import { WeeklyReviewSheet } from "./WeeklyReviewSheet";
import { RemindersToggles } from "./RemindersToggles";
import { PaywallSheet } from "./PaywallSheet";
import { MyPurchasesSheet } from "./MyPurchasesSheet";
import { LEGAL_INDEX } from "@/content/legal";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { BellRing } from "lucide-react";

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
    onPause, onNewPath, onStart,
  } = props;


  const [onbOpen, setOnbOpen] = useState(false);
  const [fbOpen, setFbOpen] = useState(false);
  const [weeklyOpen, setWeeklyOpen] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [purchasesOpen, setPurchasesOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const { isAdmin } = useIsAdmin();

  useEffect(() => onPaywallOpen(() => setPaywallOpen(true)), []);


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
            {isAdmin && (
              <Row
                icon={<Ruler size={18} />}
                label="Отладка сетки"
                hint={debug ? "Включена (админ)" : "Только для админа"}
                onClick={onToggleDebug}
                active={debug}
              />
            )}
            <Row icon={<BookOpen size={18} />} label="Дневник" hint="История пути" asLink to="/journal" onClick={onClose} />
            <Row icon={<Sparkles size={18} />} label="Недельный план" hint="Рекомендации Гуру" asLink to="/insights" onClick={onClose} />
            <Row icon={<CalendarDays size={18} />} label="Что показала неделя" hint="Обзор последних 3 клеток" onClick={() => setWeeklyOpen(true)} />
          </div>

          {/* Секции */}
          <div className="mt-4 space-y-2">
            <Section title="Как идти по пути" icon={<BookOpen size={16} />} defaultOpen>
              <p>{SANKALPA_INTRO_SHORT} Оно превращает движение в наблюдение за собой.</p>
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

            <Section title="Напоминания" icon={<BellRing size={16} />}>
              <RemindersToggles />
            </Section>

            <Section title="Приватность" icon={<Shield size={16} />}>
              <p className="opacity-90 mb-2">
                Санкальпа, заметки и дневник приватны по умолчанию. В шаринг
                попадает только безопасный краткий текст, если вы сами нажмёте
                «Поделиться».
              </p>
              <ul className="list-disc pl-4 space-y-1 opacity-80">
                <li>Личные заметки и Санкальпа не попадают в шаринг без вашего явного согласия.</li>
                <li>Гуру видит только текущую клетку, Санкальпу и последние ходы — и только когда вы сами к нему обращаетесь. Полный дневник в контекст не передаётся.</li>
                <li>Служебная аналитика хранит только метаданные (тип события, номер клетки, результат кубика) — без текста ваших заметок и переписки с Гуру.</li>
                <li>Вы видите только свои данные: сессии, дневник и переписку с Гуру — другие пользователи их не увидят.</li>
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

            <Section title="Открыть путь глубже" icon={<Sparkles size={16} />} defaultOpen>
              <p className="opacity-80">
                Премиум-практики, глубокий Гуру, итоговый разбор и аудио-проводник.
                Оплата — звёздами Telegram.
              </p>
              <button
                type="button"
                onClick={handle(() => setPaywallOpen(true))}
                className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-amber-500 text-black text-xs font-medium px-3 py-1.5"
              >
                <Sparkles size={14} /> Посмотреть варианты
              </button>
            </Section>

            <Section title="Мои покупки" icon={<Receipt size={16} />}>
              <p className="opacity-80">
                История оплат звёздами Telegram и статус доступа. Возвраты закрывают доступ автоматически.
              </p>
              <button
                type="button"
                onClick={handle(() => setPurchasesOpen(true))}
                className="mt-2 w-full rounded-xl bg-white/5 hover:bg-white/10 ring-1 ring-white/10 px-3 py-2 text-sm flex items-center justify-center gap-2"
              >
                <Receipt size={14} /> Открыть историю
              </button>
            </Section>

            <Section title="Поддержка и вопросы" icon={<LifeBuoy size={16} />}>
              <p className="opacity-80">
                Не работает покупка, вопрос про Stars или приватность — мы поможем.
              </p>
              <button
                type="button"
                onClick={handle(() => setSupportOpen(true))}
                className="mt-2 w-full rounded-xl bg-amber-500/15 hover:bg-amber-500/25 ring-1 ring-amber-400/30 px-3 py-2 text-sm flex items-center justify-center gap-2 text-amber-100"
              >
                <LifeBuoy size={14} /> Написать в поддержку
              </button>
            </Section>


            <Section title="Юридическая информация" icon={<Scale size={16} />}>
              <ul className="space-y-1">
                {LEGAL_INDEX.map((d) => (
                  <li key={d.id}>
                    <Link
                      to="/legal/$doc"
                      params={{ doc: d.id }}
                      onClick={onClose}
                      className="flex items-center justify-between rounded-xl bg-white/5 hover:bg-white/10 ring-1 ring-white/10 px-3 py-2 text-sm"
                    >
                      <span>
                        <span className="block">{d.title}</span>
                        <span className="block text-[11px] opacity-60">{d.hint}</span>
                      </span>
                      <ChevronRight size={16} className="opacity-50" />
                    </Link>
                  </li>
                ))}
              </ul>
            </Section>

            <ReferralSection />
            <AdminSection onClose={onClose} />

          </div>
        </SheetContent>
      </Sheet>

      <OnboardingModal open={onbOpen} onClose={() => setOnbOpen(false)} />
      <FeedbackModal open={fbOpen} onClose={() => setFbOpen(false)} context="settings" />
      <WeeklyReviewSheet open={weeklyOpen} onClose={() => setWeeklyOpen(false)} />
      <PaywallSheet open={paywallOpen} onClose={() => setPaywallOpen(false)} />
      <MyPurchasesSheet open={purchasesOpen} onClose={() => setPurchasesOpen(false)} />
    </>
  );
}

function AdminSection({ onClose }: { onClose: () => void }) {
  const { isAdmin } = useIsAdmin();
  if (!isAdmin) return null;
  return (
    <div className="mt-2">
      <Link
        to="/admin"
        onClick={onClose}
        className="flex items-center justify-between rounded-xl bg-purple-500/10 hover:bg-purple-500/20 ring-1 ring-purple-400/30 px-3 py-2 text-sm text-purple-100"
      >
        <span className="flex items-center gap-2"><Shield size={14} /> Админ-панель</span>
        <ChevronRight size={16} className="opacity-60" />
      </Link>
    </div>
  );
}

function ReferralSection() {
  const [link, setLink] = useState<string | null>(null);
  const [invited, setInvited] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data } = await supabase.auth.getSession();
      const uid = data.session?.user.id;
      if (!uid) return;
      const [{ getReferralLink }, { getReferralStats }] = await Promise.all([
        import("@/lib/referrals"),
        import("@/lib/referrals.functions"),
      ]);
      const l = await getReferralLink(uid);
      if (cancelled) return;
      setLink(l);
      try {
        const stats = await getReferralStats();
        if (!cancelled) setInvited(stats.invited);
      } catch { /* silent */ }
    })();
    return () => { cancelled = true; };
  }, []);

  if (!link) return null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* noop */ }
  };

  return (
    <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-3 mt-2">
      <div className="flex items-center gap-2 mb-1">
        <Sparkles size={14} className="text-amber-300" />
        <span className="text-sm font-medium">Пригласить друга</span>
      </div>
      <p className="text-[12px] opacity-70 mb-2">
        Каждый друг, дошедший до Санкальпы — +7 дней «Глубокого Гуру» тебе.
        {invited != null && ` Приглашено: ${invited}.`}
      </p>
      <div className="flex gap-2">
        <input
          readOnly
          value={link}
          className="flex-1 min-w-0 rounded-lg bg-black/30 px-2 py-1.5 text-xs font-mono"
          onFocus={(e) => e.currentTarget.select()}
        />
        <button
          onClick={copy}
          className="rounded-lg bg-amber-500/20 hover:bg-amber-500/30 ring-1 ring-amber-400/30 px-3 text-xs text-amber-100"
        >
          {copied ? "Скопировано" : "Копировать"}
        </button>
      </div>
    </div>
  );
}

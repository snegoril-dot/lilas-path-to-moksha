import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Dice5 as DiceIcon, Map as MapIcon, RotateCcw } from "lucide-react";
import { Board } from "@/components/lila/Board";
import { Dice } from "@/components/lila/Dice";
import { ChatFeed, type ChatMessage } from "@/components/lila/ChatFeed";
import { WelcomeScreen } from "@/components/lila/WelcomeScreen";
import { RulesModal } from "@/components/lila/RulesModal";
import { CellModal } from "@/components/lila/CellModal";
import { WinOverlay } from "@/components/lila/WinOverlay";
import { BOARD, computeNewPosition, resolveJump } from "@/lib/lila-board";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { getRuntimeRng, rollDice } from "@/lib/rng";
import { BOARD_THEMES, getTheme, type BoardThemeId } from "@/lib/board-themes";
import { Palette } from "lucide-react";

const THEME_STORAGE_KEY = "lila.boardTheme";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Лила — Игра Самопознания" },
      { name: "description", content: "Классическая индийская духовная игра Лила. Путь души к Освобождению через 72 таттвы." },
      { property: "og:title", content: "Лила — Игра Самопознания" },
      { property: "og:description", content: "Telegram Mini App: древняя игра о карме, добродетелях и Мокше." },
    ],
  }),
  component: Index,
});

function Index() {
  const [started, setStarted] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [cellOpen, setCellOpen] = useState<number | null>(null);
  const [pos, setPos] = useState(1);
  const [dice, setDice] = useState(1);
  const [rolling, setRolling] = useState(false);
  const [won, setWon] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [themeId, setThemeId] = useState<BoardThemeId>(() => {
    if (typeof window === "undefined") return "classic";
    const saved = window.localStorage.getItem(THEME_STORAGE_KEY) as BoardThemeId | null;
    return saved && BOARD_THEMES.some((t) => t.id === saved) ? saved : "classic";
  });
  const theme = useMemo(() => getTheme(themeId), [themeId]);
  const cycleTheme = useCallback(() => {
    setThemeId((cur) => {
      const idx = BOARD_THEMES.findIndex((t) => t.id === cur);
      const next = BOARD_THEMES[(idx + 1) % BOARD_THEMES.length].id;
      if (typeof window !== "undefined") window.localStorage.setItem(THEME_STORAGE_KEY, next);
      return next;
    });
  }, []);
  const idRef = useRef(0);
  const reduceMotion = useReducedMotion();

  const addMsg = useCallback((text: string, kind: ChatMessage["kind"] = "guru") => {
    idRef.current += 1;
    setMessages((m) => [...m, { id: `${Date.now()}-${idRef.current}`, text, kind }]);
  }, []);

  // Init Telegram SDK
  useEffect(() => {
    const tg = (window as unknown as { Telegram?: { WebApp?: { ready: () => void; expand: () => void } } }).Telegram?.WebApp;
    tg?.ready();
    tg?.expand();
  }, []);

  const startGame = useCallback(() => {
    setStarted(true);
    setPos(1);
    setWon(false);
    setMessages([]);
    setTimeout(() => {
      addMsg(
        "🙏 Намасте. Ты на клетке 1 — «Земное рождение». Душа облеклась в плоть. Бросай кубик, когда будешь готов."
      );
    }, 300);
  }, [addMsg]);

  const restart = useCallback(() => {
    setStarted(false);
    setWon(false);
    setPos(1);
    setMessages([]);
  }, []);

  const animateStep = useCallback(
    (from: number, to: number, onDone: () => void) => {
      const step = to > from ? 1 : -1;
      let cur = from;
      const tick = () => {
        if (cur === to) {
          onDone();
          return;
        }
        cur += step;
        setPos(cur);
        setTimeout(tick, reduceMotion ? 70 : 180);
      };
      tick();
    },
    [reduceMotion]
  );

  const handleRoll = useCallback(() => {
    if (rolling || won) return;
    setRolling(true);
    const value = rollDice(getRuntimeRng());
    setDice(value);
    addMsg(`🎲 Бросок: ${value}`, "player");

    // Дождаться окончания анимации кубика (см. Dice.tsx — 1.1с)
    setTimeout(() => {
      const target = computeNewPosition(pos, value);
      const overshoot = pos + value > 68;

      if (overshoot) {
        addMsg(
          `Чтобы войти в Кайлас, нужно ровно ${68 - pos}. Карма ещё не готова — фишка остаётся на «${BOARD[pos - 1].name}».`,
          "system"
        );
        setRolling(false);
        return;
      }

      animateStep(pos, target, () => {
        const { final, jumped } = resolveJump(target);
        const landed = BOARD[target - 1];

        if (target === 68) {
          addMsg(`✨ Ты достиг Кайласа. ${landed.wisdom}`, "guru");
          setTimeout(() => {
            setWon(true);
            setRolling(false);
          }, 600);
          return;
        }

        if (jumped) {
          const dest = BOARD[final - 1];
          if (landed.type === "snake") {
            addMsg(
              `🐍 «${landed.name}» низвергает тебя в «${dest.name}».\n\n${landed.wisdom}`,
              "guru"
            );
          } else {
            addMsg(
              `🪜 «${landed.name}» возносит тебя к «${dest.name}».\n\n${landed.wisdom}`,
              "guru"
            );
          }
          setTimeout(() => {
            animateStep(target, final, () => {
              if (final === 68) {
                addMsg(`✨ ${BOARD[67].wisdom}`, "guru");
                setTimeout(() => {
                  setWon(true);
                  setRolling(false);
                }, 600);
              } else {
                setRolling(false);
              }
            });
          }, 700);
        } else {
          addMsg(`Ты постигаешь «${landed.name}». ${landed.wisdom}`, "guru");
          setRolling(false);
        }
      });
    }, reduceMotion ? 280 : 1150);
  }, [pos, rolling, won, addMsg, animateStep, reduceMotion]);

  const currentCell = useMemo(() => BOARD[pos - 1], [pos]);

  if (!started) {
    return (
      <>
        <WelcomeScreen onStart={startGame} onRules={() => setRulesOpen(true)} />
        <RulesModal open={rulesOpen} onClose={() => setRulesOpen(false)} />
      </>
    );
  }

  return (
    <div className="flex flex-col h-[100dvh] bg-gradient-to-b from-[var(--lila-bg)] to-[var(--lila-bg-2)] text-[var(--tg-theme-text-color,#fff)]">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-4 py-2.5 bg-[var(--lila-surface)]/80 backdrop-blur-md border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-amber-300 to-amber-600 flex items-center justify-center text-lg shadow">
            🕉
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold">Гуру</div>
            <div className="text-[11px] opacity-60">
              Клетка {pos} · {currentCell.name}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={cycleTheme}
            className="p-2 rounded-full hover:bg-white/10 active:scale-95 transition flex items-center gap-1 text-xs"
            aria-label="Сменить тему доски"
            title={`Тема: ${theme.name}`}
          >
            <Palette size={18} />
            <span className="hidden sm:inline opacity-70">{theme.name}</span>
          </button>
          <button
            onClick={restart}
            className="p-2 rounded-full hover:bg-white/10 active:scale-95 transition"
            aria-label="Начать заново"
          >
            <RotateCcw size={18} />
          </button>
        </div>
      </div>

      {/* Board */}
      <div className="relative z-20 shrink-0 px-3 pt-3 bg-[var(--lila-bg)] shadow-[0_8px_16px_-12px_rgba(0,0,0,0.6)]">
        <Board playerPos={pos} theme={theme} onSelectCell={(id) => setCellOpen(id)} />
      </div>

      {/* Chat */}
      <ChatFeed messages={messages} />

      {/* Action bar */}
      <div className="shrink-0 px-3 pb-3 pt-2 bg-[var(--lila-surface)]/80 backdrop-blur-md border-t border-white/5">
        <div className="flex items-center gap-3">
          <Dice value={dice} rolling={rolling} />
          <div className="flex-1 grid grid-cols-2 gap-2">
            <button
              onClick={handleRoll}
              disabled={rolling || won}
              className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-gradient-to-r from-amber-300 to-amber-500 text-stone-900 font-semibold shadow-lg hover:brightness-110 active:scale-[0.97] transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <DiceIcon size={18} />
              Бросить
            </button>
            <button
              onClick={() => setCellOpen(pos)}
              className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-[var(--tg-theme-button-color,#2481cc)] text-[var(--tg-theme-button-text-color,#fff)] font-semibold shadow-md hover:brightness-110 active:scale-[0.97] transition"
            >
              <MapIcon size={18} />
              Клетка
            </button>
          </div>
        </div>
      </div>

      <CellModal cellId={cellOpen} onClose={() => setCellOpen(null)} />
      <WinOverlay open={won} onRestart={restart} />
    </div>
  );
}

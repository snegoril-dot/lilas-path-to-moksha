import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, Dice5 as DiceIcon, Map as MapIcon, MessageCircle, RotateCcw, Sparkles } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { Board } from "@/components/lila/Board";
import { Dice } from "@/components/lila/Dice";
import { ChatFeed, type ChatMessage } from "@/components/lila/ChatFeed";
import { WelcomeScreen } from "@/components/lila/WelcomeScreen";
import { RulesModal } from "@/components/lila/RulesModal";
import { CellModal } from "@/components/lila/CellModal";
import { WinOverlay, type KeyCell } from "@/components/lila/WinOverlay";
import { GuruChatSheet, type GuruChatContext } from "@/components/lila/GuruChatSheet";
import { BOARD, computeNewPosition, resolveJump, applySixRule, getLoka } from "@/lib/lila-board";
import { ReflectionModal, type ReflectionPayload } from "@/components/lila/ReflectionModal";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { getRuntimeRng, rollDice } from "@/lib/rng";
import { BOARD_THEMES, getTheme, type BoardThemeId } from "@/lib/board-themes";
import { Palette, Ruler, Volume2, VolumeX, NotebookPen, NotebookText } from "lucide-react";
import { useSound } from "@/hooks/use-sound";
import { useNotes } from "@/hooks/use-notes";
import { useAuth } from "@/hooks/use-auth";
import { saveSession } from "@/lib/guru.functions";

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
  // pos = 0 ⇒ душа ещё не воплощена (ждём 6 для входа в игру).
  const [pos, setPos] = useState(0);
  const [dice, setDice] = useState(1);
  const [rolling, setRolling] = useState(false);
  const [won, setWon] = useState(false);
  const [sixStreak, setSixStreak] = useState(0);
  const [entryMisses, setEntryMisses] = useState(0);
  const [entryGrace, setEntryGrace] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sankalpa, setSankalpa] = useState("");
  const [keyCells, setKeyCells] = useState<KeyCell[]>([]);
  const [totalRolls, setTotalRolls] = useState(0);
  const [cellVisits, setCellVisits] = useState<Record<number, number>>({});
  const [reflection, setReflection] = useState<ReflectionPayload | null>(null);
  const [guruCtx, setGuruCtx] = useState<GuruChatContext | null>(null);
  const [pathLog, setPathLog] = useState<Array<{ cell: number; kind: string; to?: number }>>([]);
  const sessionSavedRef = useRef(false);
  const pendingResume = useRef<(() => void) | null>(null);
  useAuth(); // ensures anonymous session
  const persistSession = useServerFn(saveSession);
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
  const { enabled: soundEnabled, toggle: toggleSound, play } = useSound();
  const [debug, setDebug] = useState(() => {
    if (typeof window === "undefined") return false;
    return new URLSearchParams(window.location.search).get("debug") === "1";
  });

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

  const startGame = useCallback(
    (userSankalpa: string) => {
      setStarted(true);
      setPos(0);
      setWon(false);
      setSixStreak(0);
      setEntryMisses(0);
      setEntryGrace(false);
      setMessages([]);
      setKeyCells([]);
      setTotalRolls(0);
      setCellVisits({});
      setPathLog([]);
      sessionSavedRef.current = false;
      setSankalpa(userSankalpa);
      setTimeout(() => {
        if (userSankalpa) {
          addMsg(
            `🙏 Намасте. Твоя Санкальпа принята:\n«${userSankalpa}»\n\nПусть путь даст на неё ответ.`
          );
        } else {
          addMsg("🙏 Намасте, странник.");
        }
        setTimeout(() => {
          addMsg(
            "Душа ещё не воплощена. Чтобы войти в игру, выброси шестёрку — священное число рождения."
          );
        }, 600);
      }, 250);
    },
    [addMsg]
  );

  const restart = useCallback(() => {
    setStarted(false);
    setWon(false);
    setPos(0);
    setSixStreak(0);
    setEntryMisses(0);
    setEntryGrace(false);
    setMessages([]);
    setKeyCells([]);
    setTotalRolls(0);
    setCellVisits({});
    setPathLog([]);
    sessionSavedRef.current = false;
    setReflection(null);
    setSankalpa("");
  }, []);

  // Persist the game session when player reaches Moksha.
  useEffect(() => {
    if (!won || sessionSavedRef.current) return;
    sessionSavedRef.current = true;
    persistSession({
      data: {
        sankalpa: sankalpa || undefined,
        result: "moksha",
        movesCount: totalRolls,
        path: pathLog.slice(-200),
      },
    }).catch((e) => console.error("[saveSession]", e));
  }, [won, sankalpa, totalRolls, pathLog, persistSession]);

  const animateStep = useCallback(
    (from: number, to: number, onDone: () => void) => {
      if (from === to) {
        onDone();
        return;
      }
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
    // Правило милости: после 3 неудачных попыток входа — гарантированная шестёрка.
    const raw = rollDice(getRuntimeRng());
    const value = pos === 0 && entryGrace ? 6 : raw;
    setDice(value);
    setTotalRolls((n) => n + 1);
    play("roll");
    addMsg(`🎲 Бросок: ${value}${value !== raw ? " (милость)" : ""}`, "player");

    const diceDelay = reduceMotion ? 280 : 1150;

    // Фаза входа в игру: pos = 0, нужна 6.
    if (pos === 0) {
      setTimeout(() => {
        if (value !== 6) {
          const next = entryMisses + 1;
          setEntryMisses(next);
          const ATTEMPTS = 3;
          if (next >= ATTEMPTS) {
            addMsg(
              `🌙 Душа устала ждать (${next}/${ATTEMPTS}). Она отдыхает один круг — следующий бросок принесёт шестёрку как дар милости.`,
              "system"
            );
            setEntryGrace(true);
            setEntryMisses(0);
          } else {
            addMsg(
              `Душа ещё ждёт воплощения (${next}/${ATTEMPTS}). Только шестёрка открывает врата рождения.`,
              "system"
            );
          }
          setRolling(false);
          return;
        }
        // успех
        setEntryMisses(0);
        setEntryGrace(false);
        addMsg(
          "✨ Шестёрка! Душа облекается в плоть. Ты входишь на клетку 1 — «Рождение».",
          "guru"
        );
        animateStep(0, 1, () => {
          addMsg(BOARD[0].wisdom, "guru");
          setSixStreak(1);
          addMsg("🎲 По правилу шестёрки — бросай ещё раз.", "system");
          setRolling(false);
        });
      }, diceDelay);
      return;
    }

    const rule = applySixRule(sixStreak, value);
    setSixStreak(rule.nextConsecutiveSixes);

    setTimeout(() => {
      if (rule.forfeited) {
        addMsg(
          "🔥 Три шестёрки подряд. Карма перегорела — этот бросок не считается. Фишка остаётся на месте.",
          "system"
        );
        setRolling(false);
        return;
      }

      if (!rule.applyMove) {
        setRolling(false);
        return;
      }

      const target = computeNewPosition(pos, value);
      const overshoot = pos + value > 68;

      if (overshoot) {
        const need = 68 - pos;
        // Визуальный «отскок»: фишка идёт вперёд до 68, затем возвращается на N лишних шагов.
        animateStep(pos, 68, () => {
          addMsg(
            `Нужно ровно ${need}, а выпало ${value}. Карма ещё не готова — фишка отскакивает.`,
            "system"
          );
          setTimeout(() => {
            animateStep(68, pos, () => {
              if (rule.extraTurn) {
                addMsg("🎲 Шестёрка дарует дополнительный ход.", "system");
              }
              setRolling(false);
            });
          }, reduceMotion ? 250 : 600);
        });
        return;
      }

      animateStep(pos, target, () => {
        const { final, jumped } = resolveJump(target);
        const landed = BOARD[target - 1];

        const finishTurn = () => {
          if (rule.extraTurn && final !== 68) {
            addMsg("🎲 Шестёрка дарует дополнительный ход.", "system");
          }
          setRolling(false);
        };

        if (target === 68) {
          play("moksha");
          addMsg(`✨ Ты достиг Кайласа.\n\n${landed.wisdom}`, "guru");
          setPathLog((p) => [...p, { cell: 68, kind: "moksha" }]);
          setTimeout(() => {
            setWon(true);
            setRolling(false);
          }, 600);
          return;
        }

        if (jumped) {
          const dest = BOARD[final - 1];
          const kind: KeyCell["kind"] = landed.type === "snake" ? "snake" : "ladder";
          const prevVisits = cellVisits[landed.id] ?? 0;
          const visitCount = prevVisits + 1;
          setCellVisits((m) => ({ ...m, [landed.id]: visitCount }));
          setKeyCells((arr) => [...arr, { id: landed.id, name: landed.name, kind, visitCount }]);
          setPathLog((p) => [...p, { cell: landed.id, kind, to: final }]);
          if (kind === "snake") {
            play("snake");
            addMsg(
              `🐍 «${landed.name}» низвергает тебя в «${dest.name}».\n\n${landed.wisdom}`,
              "guru"
            );
          } else {
            play("ladder");
            addMsg(
              `🪜 «${landed.name}» возносит тебя к «${dest.name}».\n\n${landed.wisdom}`,
              "guru"
            );
          }
          // Кармический счётчик: повтор того же узла.
          if (visitCount > 1) {
            addMsg(
              kind === "snake"
                ? `⚠️ Ты возвращаешься сюда уже ${visitCount}-й раз. Урок не усвоен — карма повторяет до тех пор, пока не услышишь.`
                : `🌟 Снова эта добродетель (${visitCount}-й раз). Гуру улыбается: ты узнал свой путь.`,
              "system"
            );
          }

          const doJump = () => {
            animateStep(target, final, () => {
              if (final === 68) {
                play("moksha");
                addMsg(`✨ ${BOARD[67].wisdom}`, "guru");
                setTimeout(() => {
                  setWon(true);
                  setRolling(false);
                }, 600);
              } else {
                addMsg(`Ты постигаешь «${dest.name}». ${dest.wisdom}`, "guru");
                finishTurn();
              }
            });
          };

          setTimeout(() => {
            // Рефлексия: пауза с заметкой о связи с Санкальпой.
            pendingResume.current = doJump;
            setReflection({
              fromId: landed.id,
              fromName: landed.name,
              toId: final,
              toName: dest.name,
              kind,
            });
          }, reduceMotion ? 500 : 1300);
        } else {
          addMsg(`Ты постигаешь «${landed.name}». ${landed.wisdom}`, "guru");
          setPathLog((p) => [...p, { cell: landed.id, kind: "land" }]);
          finishTurn();
        }
      });
    }, diceDelay);
  }, [pos, rolling, won, sixStreak, entryMisses, entryGrace, cellVisits, addMsg, animateStep, reduceMotion, play]);

  const closeReflection = useCallback(
    (note: string | null) => {
      if (note && note.length > 0) {
        // Прикрепляем заметку к последнему добавленному ключевому узлу.
        setKeyCells((arr) => {
          if (arr.length === 0) return arr;
          const copy = [...arr];
          copy[copy.length - 1] = { ...copy[copy.length - 1], note };
          return copy;
        });
      }
      setReflection(null);
      const resume = pendingResume.current;
      pendingResume.current = null;
      resume?.();
    },
    []
  );

  const currentCell = useMemo(() => (pos === 0 ? null : BOARD[pos - 1]), [pos]);
  const currentLoka = useMemo(() => getLoka(pos), [pos]);

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
            <div className="text-sm font-semibold flex items-center gap-2">
              Гуру
              {currentLoka && (
                <span
                  className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-gradient-to-r ${currentLoka.color} text-stone-900 font-bold shadow-sm`}
                  title={currentLoka.hint}
                >
                  {currentLoka.name.split("·")[0].trim()}
                </span>
              )}
            </div>
            <div className="text-[11px] opacity-60">
              {currentCell
                ? `Клетка ${pos} · ${currentCell.name}`
                : "Душа ждёт воплощения · нужна 🎲 6"}
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
            onClick={toggleSound}
            className={`p-2 rounded-full active:scale-95 transition ${soundEnabled ? "hover:bg-white/10" : "bg-white/5 text-white/50"}`}
            aria-label={soundEnabled ? "Выключить звук" : "Включить звук"}
            aria-pressed={soundEnabled}
            title={soundEnabled ? "Звук включён" : "Звук выключен"}
          >
            {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
          <button
            onClick={() => setDebug((d) => !d)}
            className={`p-2 rounded-full active:scale-95 transition ${debug ? "bg-fuchsia-500/30 text-fuchsia-100" : "hover:bg-white/10"}`}
            aria-label="Отладка сетки"
            title="Показать номера клеток поверх карты"
          >
            <Ruler size={18} />
          </button>
          <Link
            to="/journal"
            className="p-2 rounded-full hover:bg-white/10 active:scale-95 transition"
            aria-label="Дневник"
            title="Дневник пути"
          >
            <BookOpen size={18} />
          </Link>
          <Link
            to="/insights"
            className="p-2 rounded-full hover:bg-white/10 active:scale-95 transition"
            aria-label="Недельный план"
            title="Рекомендации Гуру"
          >
            <Sparkles size={18} />
          </Link>
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
        <Board playerPos={pos} theme={theme} onSelectCell={(id) => setCellOpen(id)} debug={debug} />
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
              onClick={() => setCellOpen(pos === 0 ? 1 : pos)}
              className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-[var(--tg-theme-button-color,#2481cc)] text-[var(--tg-theme-button-text-color,#fff)] font-semibold shadow-md hover:brightness-110 active:scale-[0.97] transition"
            >
              <MapIcon size={18} />
              Клетка
            </button>
          </div>
          <button
            onClick={() =>
              setGuruCtx({
                cell: pos === 0 ? 1 : pos,
                cellName: (BOARD[(pos === 0 ? 1 : pos) - 1] ?? BOARD[0]).name,
                sankalpa,
                recentPath: pathLog.slice(-8),
              })
            }
            className="shrink-0 inline-flex items-center justify-center h-11 w-11 rounded-2xl bg-white/5 hover:bg-white/10 text-amber-200 ring-1 ring-amber-300/30 active:scale-95 transition"
            aria-label="Спросить ИИ-Гуру"
            title="Спросить ИИ-Гуру"
          >
            <MessageCircle size={20} />
          </button>
        </div>
      </div>

      <CellModal cellId={cellOpen} onClose={() => setCellOpen(null)} />
      <ReflectionModal
        data={reflection}
        sankalpa={sankalpa}
        onSubmit={(note) => closeReflection(note)}
        onSkip={() => closeReflection(null)}
      />
      <WinOverlay
        open={won}
        onRestart={restart}
        sankalpa={sankalpa}
        keyCells={keyCells}
        totalRolls={totalRolls}
      />
      <GuruChatSheet ctx={guruCtx} onClose={() => setGuruCtx(null)} />
    </div>
  );
}

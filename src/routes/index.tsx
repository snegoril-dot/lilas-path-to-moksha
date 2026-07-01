import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, Dice5 as DiceIcon, Map as MapIcon, MessageCircle, RotateCcw, Menu } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { Board } from "@/components/lila/Board";
import { Dice } from "@/components/lila/Dice";
import { ChatFeed, type ChatMessage } from "@/components/lila/ChatFeed";
import { WelcomeScreen } from "@/components/lila/WelcomeScreen";
import { RulesModal } from "@/components/lila/RulesModal";
import { CellModal } from "@/components/lila/CellModal";
import { WinOverlay, type KeyCell } from "@/components/lila/WinOverlay";
import { GuruChatSheet, type GuruChatContext } from "@/components/lila/GuruChatSheet";
import { SettingsSheet } from "@/components/lila/SettingsSheet";
import { BOARD, computeNewPosition, resolveJump, applySixRule, getLoka } from "@/lib/lila-board";
import { resolveEntry, MODE_LABEL, type GameMode } from "@/lib/game-mode";
import { ReflectionModal, type ReflectionPayload } from "@/components/lila/ReflectionModal";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { getRuntimeRng, rollDice } from "@/lib/rng";
import { useSound } from "@/hooks/use-sound";
import { useNotes } from "@/hooks/use-notes";
import { usePlayerToken } from "@/hooks/use-player-token";
import { useAuth } from "@/hooks/use-auth";
import { useTelegramAuth } from "@/hooks/use-telegram-auth";
import { saveSession, upsertSession, getActiveSession, abandonSession } from "@/lib/guru.functions";
import { useTelegramInit, haptic, hapticNotify } from "@/hooks/use-telegram";
import { ResumeDialog } from "@/components/lila/ResumeDialog";
import { SaveIndicator } from "@/components/lila/SaveIndicator";

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
  const [mode, setMode] = useState<GameMode>("classic");
  const [keyCells, setKeyCells] = useState<KeyCell[]>([]);
  const [totalRolls, setTotalRolls] = useState(0);
  const [cellVisits, setCellVisits] = useState<Record<number, number>>({});
  const [reflection, setReflection] = useState<ReflectionPayload | null>(null);
  const [guruCtx, setGuruCtx] = useState<GuruChatContext | null>(null);
  const [pathLog, setPathLog] = useState<Array<{ cell: number; kind: string; to?: number }>>([]);
  const [diceHistory, setDiceHistory] = useState<number[]>([]);
  const sessionSavedRef = useRef(false);
  const pendingResume = useRef<(() => void) | null>(null);
  // Persistent session bookkeeping
  const sessionIdRef = useRef<string | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [resumeOpen, setResumeOpen] = useState(false);
  const [resumeData, setResumeData] = useState<{
    id: string;
    currentCell: number;
    sankalpa: string | null;
    mode: GameMode;
    movesCount: number;
    updatedAt: string | null;
    entryMisses: number;
    sixStreak: number;
    path: Array<{ cell: number; kind: string; to?: number }>;
    diceHistory: number[];
    keyCells: KeyCell[];
    cellVisits: Record<number, number>;
  } | null>(null);
  const resumeCheckedRef = useRef(false);
  const { ready: authReady } = useAuth(); // ensures anonymous session
  const tgAuth = useTelegramAuth(authReady);
  const persistSession = useServerFn(saveSession);
  const persistUpsert = useServerFn(upsertSession);
  const persistAbandon = useServerFn(abandonSession);
  const fetchActiveSession = useServerFn(getActiveSession);

  const idRef = useRef(0);
  const reduceMotion = useReducedMotion();
  const { enabled: soundEnabled, toggle: toggleSound, play } = useSound();
  const { enabled: notesEnabled, toggle: toggleNotes } = useNotes();
  const { token, cycle: cycleToken } = usePlayerToken();
  const [debug, setDebug] = useState(() => {
    if (typeof window === "undefined") return false;
    return new URLSearchParams(window.location.search).get("debug") === "1";
  });

  const addMsg = useCallback((text: string, kind: ChatMessage["kind"] = "guru") => {
    idRef.current += 1;
    setMessages((m) => [...m, { id: `${Date.now()}-${idRef.current}`, text, kind }]);
  }, []);

  const [settingsOpen, setSettingsOpen] = useState(false);

  // Init Telegram SDK
  useTelegramInit();

  const startGame = useCallback(
    (userSankalpa: string, chosenMode: GameMode = "classic") => {
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
      setDiceHistory([]);
      sessionSavedRef.current = false;
      sessionIdRef.current = null;
      setSankalpa(userSankalpa);
      setMode(chosenMode);
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
            `Ты выбрал путь: «${MODE_LABEL[chosenMode]}».`,
            "system"
          );
          if (chosenMode === "soft") {
            addMsg(
              "🌿 Мягкий путь: если после трёх бросков шестёрка не пришла — врата откроются на четвёртом. Это бережное начало для первого знакомства с игрой."
            );
          } else {
            addMsg(
              "Душа ещё не воплощена. Чтобы войти в игру, выброси 🎲 шестёрку.\n\nПочему именно 6? В традиции Лилы это священное число рождения: шесть чакр пробуждаются, шесть направлений пространства раскрываются, и душа получает право войти в тело. Пока не выпала 6 — ты стоишь у врат воплощения."
            );
          }
        }, 800);
      }, 250);
    },
    [addMsg]
  );

  const resumeGame = useCallback(() => {
    if (!resumeData) return;
    sessionIdRef.current = resumeData.id;
    setSankalpa(resumeData.sankalpa ?? "");
    setMode(resumeData.mode);
    setPos(resumeData.currentCell);
    setTotalRolls(resumeData.movesCount);
    setEntryMisses(resumeData.entryMisses);
    setSixStreak(resumeData.sixStreak);
    setPathLog(resumeData.path);
    setDiceHistory(resumeData.diceHistory);
    setKeyCells(resumeData.keyCells);
    setCellVisits(resumeData.cellVisits);
    setWon(false);
    setEntryGrace(false);
    setMessages([]);
    sessionSavedRef.current = false;
    setStarted(true);
    setResumeOpen(false);
    setTimeout(() => {
      addMsg("🌿 Ты возвращаешься на свой путь. Продолжай.");
      if (resumeData.currentCell === 0) {
        addMsg("Душа ещё ждёт воплощения — брось шестёрку для рождения.", "system");
      } else {
        const cell = BOARD[resumeData.currentCell - 1];
        if (cell) addMsg(`Ты стоишь на клетке ${cell.id} · ${cell.name}.`, "system");
      }
    }, 200);
  }, [resumeData, addMsg]);

  const startFresh = useCallback(async () => {
    setResumeOpen(false);
    const prev = resumeData;
    setResumeData(null);
    if (prev?.id) {
      persistAbandon({ data: { id: prev.id } }).catch((e) =>
        console.error("[abandonSession]", e)
      );
    }
  }, [resumeData, persistAbandon]);

  const restart = useCallback(() => {
    // Abandon current in-progress session (if any) before returning to welcome.
    const prevId = sessionIdRef.current;
    if (prevId) {
      persistAbandon({ data: { id: prevId } }).catch((e) =>
        console.error("[abandonSession]", e)
      );
    }
    sessionIdRef.current = null;
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
    setDiceHistory([]);
    sessionSavedRef.current = false;
    setReflection(null);
    setSankalpa("");
  }, [persistAbandon]);

  // On mount: check for an active in-progress session and offer to resume.
  useEffect(() => {
    if (resumeCheckedRef.current) return;
    resumeCheckedRef.current = true;
    fetchActiveSession()
      .then((row) => {
        if (!row) return;
        // Reconstruct cellVisits from key_cells log.
        const kc = (row.key_cells as KeyCell[] | null) ?? [];
        const visits: Record<number, number> = {};
        for (const k of kc) {
          visits[k.id] = (visits[k.id] ?? 0) + 1;
        }
        setResumeData({
          id: row.id as string,
          currentCell: (row.current_cell as number) ?? 0,
          sankalpa: (row.sankalpa as string | null) ?? null,
          mode: ((row as { mode?: string }).mode === "soft" ? "soft" : "classic") as GameMode,
          movesCount: (row.moves_count as number) ?? 0,
          updatedAt: (row.updated_at as string | null) ?? null,
          entryMisses: (row.entry_misses as number) ?? 0,
          sixStreak: (row.six_streak as number) ?? 0,
          path: ((row.path as Array<{ cell: number; kind: string; to?: number }>) ?? []),
          diceHistory: ((row.dice_history as number[]) ?? []),
          keyCells: kc,
          cellVisits: visits,
        });
        setResumeOpen(true);
      })
      .catch((e) => console.error("[getActiveSession]", e));
  }, [fetchActiveSession]);

  // Debounced autosave of in-progress state (skips the initial idle mount).
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedIndicatorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!started || won) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      setSaveState("saving");
      persistUpsert({
        data: {
          id: sessionIdRef.current,
          sankalpa: sankalpa || undefined,
          result: "in_progress",
          currentCell: pos,
          movesCount: totalRolls,
          entryMisses,
          sixStreak,
          path: pathLog.slice(-500),
          diceHistory: diceHistory.slice(-500),
          keyCells: keyCells.slice(-200),
        },
      })
        .then((row) => {
          if (row?.id) sessionIdRef.current = row.id as string;
          setSaveState("saved");
          if (savedIndicatorTimerRef.current) clearTimeout(savedIndicatorTimerRef.current);
          savedIndicatorTimerRef.current = setTimeout(() => setSaveState("idle"), 1400);
        })
        .catch((e) => {
          console.error("[upsertSession]", e);
          setSaveState("error");
          if (savedIndicatorTimerRef.current) clearTimeout(savedIndicatorTimerRef.current);
          savedIndicatorTimerRef.current = setTimeout(() => setSaveState("idle"), 2200);
        });
    }, 700);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [
    started,
    won,
    pos,
    totalRolls,
    entryMisses,
    sixStreak,
    pathLog,
    diceHistory,
    keyCells,
    sankalpa,
    persistUpsert,
  ]);

  // Persist the game session when player reaches Moksha.
  useEffect(() => {
    if (!won || sessionSavedRef.current) return;
    sessionSavedRef.current = true;
    // Prefer updating the existing session row if we have one, otherwise insert.
    if (sessionIdRef.current) {
      persistUpsert({
        data: {
          id: sessionIdRef.current,
          sankalpa: sankalpa || undefined,
          result: "moksha",
          currentCell: pos,
          movesCount: totalRolls,
          entryMisses,
          sixStreak,
          path: pathLog.slice(-500),
          diceHistory: diceHistory.slice(-500),
          keyCells: keyCells.slice(-200),
        },
      })
        .then(() => {
          sessionIdRef.current = null;
        })
        .catch((e) => console.error("[upsertSession moksha]", e));
    } else {
      persistSession({
        data: {
          sankalpa: sankalpa || undefined,
          result: "moksha",
          movesCount: totalRolls,
          path: pathLog.slice(-200),
        },
      }).catch((e) => console.error("[saveSession]", e));
    }
  }, [won, sankalpa, totalRolls, pathLog, diceHistory, keyCells, pos, entryMisses, sixStreak, persistSession, persistUpsert]);


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
    // Классическое правило: игрок должен сам выбросить шестёрку, чтобы войти в игру.
    const value = rollDice(getRuntimeRng());
    setDice(value);
    setDiceHistory((d) => [...d, value]);
    setTotalRolls((n) => n + 1);
    play("roll");
    addMsg(`🎲 Бросок: ${value}`, "player");

    const diceDelay = reduceMotion ? 280 : 1150;

    // Фаза входа в игру: pos = 0, нужна 6.
    if (pos === 0) {
      setTimeout(() => {
        if (value !== 6) {
          const next = entryMisses + 1;
          setEntryMisses(next);
          const hints = [
            `Выпало ${value}. Врата воплощения открывает только 🎲 6. Пробуй снова — терпение тоже часть пути.`,
            `Снова не 6 (попытка ${next}). Наблюдай за нетерпением ума: сколько раз душа стучит, прежде чем родиться?`,
            `${next}-я попытка. Джохари учит: рождение — милость, а не право. Дыши и бросай ещё.`,
          ];
          addMsg(hints[Math.min(next - 1, hints.length - 1)], "guru");
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
          play("moksha"); hapticNotify("success");
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
            play("snake"); hapticNotify("warning");
            addMsg(
              `🐍 «${landed.name}» низвергает тебя в «${dest.name}».\n\n${landed.wisdom}`,
              "guru"
            );
          } else {
            play("ladder"); hapticNotify("success");
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
                play("moksha"); hapticNotify("success");
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
            if (!notesEnabled) {
              doJump();
              return;
            }
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
  }, [pos, rolling, won, sixStreak, entryMisses, entryGrace, cellVisits, addMsg, animateStep, reduceMotion, play, notesEnabled]);

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
        <ResumeDialog
          open={resumeOpen}
          snapshot={
            resumeData
              ? {
                  currentCell: resumeData.currentCell,
                  sankalpa: resumeData.sankalpa,
                  movesCount: resumeData.movesCount,
                  updatedAt: resumeData.updatedAt,
                }
              : null
          }
          onResume={resumeGame}
          onFresh={startFresh}
        />
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
        <div className="flex items-center gap-1 shrink-0">
          <Link
            to="/journal"
            className="hidden xs:inline-flex p-2 rounded-full hover:bg-white/10 active:scale-95 transition"
            aria-label="Дневник"
            title="Дневник пути"
          >
            <BookOpen size={18} />
          </Link>
          <button
            onClick={restart}
            className="p-2 rounded-full hover:bg-white/10 active:scale-95 transition"
            aria-label="Начать заново"
            title="Начать заново"
          >
            <RotateCcw size={18} />
          </button>
          <button
            onClick={() => { haptic("light"); setSettingsOpen(true); }}
            className="p-2 rounded-full hover:bg-white/10 active:scale-95 transition"
            aria-label="Открыть меню"
            title="Меню"
          >
            <Menu size={20} />
          </button>
        </div>
      </div>

      {/* Board */}
      <div className="relative z-20 shrink-0 px-3 pt-3 bg-[var(--lila-bg)] shadow-[0_8px_16px_-12px_rgba(0,0,0,0.6)]">
        <Board playerPos={pos} onSelectCell={(id) => setCellOpen(id)} debug={debug} token={token} />
      </div>

      {/* Chat */}
      <ChatFeed messages={messages} />

      {/* Action bar */}
      <div className="shrink-0 px-3 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-[var(--lila-surface)]/90 backdrop-blur-md border-t border-white/10">
        <div className="flex items-center gap-2">
          <Dice value={dice} rolling={rolling} />
          <button
            onClick={() => { haptic("medium"); handleRoll(); }}
            disabled={rolling || won}
            className="flex-1 min-w-0 flex items-center justify-center gap-2 h-14 rounded-2xl bg-gradient-to-r from-amber-300 to-amber-500 text-stone-900 font-bold text-base shadow-lg active:scale-[0.97] transition disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Бросить кубик"
          >
            <DiceIcon size={20} />
            Бросить
          </button>
          <button
            onClick={() => { haptic("light"); setCellOpen(pos === 0 ? 1 : pos); }}
            className="shrink-0 inline-flex flex-col items-center justify-center h-14 w-14 rounded-2xl bg-white/5 hover:bg-white/10 ring-1 ring-white/10 active:scale-95 transition"
            aria-label="О текущей клетке"
            title="Клетка"
          >
            <MapIcon size={20} />
            <span className="text-[10px] mt-0.5 opacity-70">Клетка</span>
          </button>
          <button
            onClick={() => {
              haptic("light");
              setGuruCtx({
                cell: pos === 0 ? 1 : pos,
                cellName: (BOARD[(pos === 0 ? 1 : pos) - 1] ?? BOARD[0]).name,
                sankalpa,
                recentPath: pathLog.slice(-8),
              });
            }}
            className="shrink-0 inline-flex flex-col items-center justify-center h-14 w-14 rounded-2xl bg-white/5 hover:bg-white/10 text-amber-200 ring-1 ring-amber-300/30 active:scale-95 transition"
            aria-label="Спросить ИИ-Гуру"
            title="Гуру"
          >
            <MessageCircle size={20} />
            <span className="text-[10px] mt-0.5 opacity-80">Гуру</span>
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
      <SettingsSheet
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        soundEnabled={soundEnabled}
        onToggleSound={toggleSound}
        notesEnabled={notesEnabled}
        onToggleNotes={toggleNotes}
        token={token}
        onCycleToken={cycleToken}
        debug={debug}
        onToggleDebug={() => setDebug((d) => !d)}
      />
      <SaveIndicator state={saveState} />
      {tgAuth.status === "dev_mode" && (
        <div className="fixed bottom-2 left-1/2 -translate-x-1/2 z-50 rounded-full bg-amber-500/90 text-amber-950 text-xs px-3 py-1 shadow-lg">
          Dev-режим: откройте игру в Telegram для входа по Telegram ID
        </div>
      )}
      {tgAuth.status === "error" && (
        <div className="fixed bottom-2 left-1/2 -translate-x-1/2 z-50 rounded-full bg-red-500/90 text-white text-xs px-3 py-1 shadow-lg">
          Ошибка входа Telegram: {tgAuth.error}
        </div>
      )}
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Board } from "@/components/lila/Board";
import { ChatFeed, type ChatMessage } from "@/components/lila/ChatFeed";
import { WelcomeScreen } from "@/components/lila/WelcomeScreen";
import { CellModal } from "@/components/lila/CellModal";
import { BOARD, computeNewPosition, resolveJump, applySixRule } from "@/lib/lila-board";
import { resolveEntry, MODE_LABEL } from "@/lib/game-mode";
import { ReflectionModal, type ReflectionPayload } from "@/components/lila/ReflectionModal";
import type { GuruChatContext } from "@/components/lila/GuruChatSheet";
import type {
  GameMode,
  KeyCell,
  MoveEvent,
  PathLogItem,
  ResumeSnapshot,
} from "@/lib/game-types";

import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { getRuntimeRng, rollDice } from "@/lib/rng";
import { useSound } from "@/hooks/use-sound";
import { useNotes } from "@/hooks/use-notes";
import { usePlayerToken } from "@/hooks/use-player-token";
import { useAuth } from "@/hooks/use-auth";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { useTelegramAuth } from "@/hooks/use-telegram-auth";
import { saveSession, upsertSession, getActiveSession, abandonSession, saveReflection, getLastCellNote } from "@/lib/guru.functions";
import { registerOnlineFlush, getPendingCount } from "@/lib/note-queue";
import { saveLastCell } from "@/lib/last-cell-cache";
import { ReturnBanner } from "@/components/lila/ReturnBanner";
import { useTelegramInit, hapticNotify } from "@/hooks/use-telegram";
import { ResumeDialog } from "@/components/lila/ResumeDialog";
import { SaveIndicator } from "@/components/lila/SaveIndicator";
import { CurrentCellSheet } from "@/components/lila/CurrentCellSheet";
import { BirthIntroCard } from "@/components/lila/BirthIntroCard";
import { GameHeader } from "@/components/lila/GameHeader";
import { GameActionBar } from "@/components/lila/GameActionBar";
import type { PathAnalysisContext } from "@/components/lila/PathAnalysisSheet";
import { trackEvent } from "@/lib/analytics";
import { HintToast, hasSeenHint, markHintSeen, type HintId } from "@/components/lila/HintToast";
import {
  narrateMoksha,
  narrateOvershoot,
  narrateSnake,
  narrateLadder,
  narrateRepeat,
  HINT_FIRST_SNAKE,
  HINT_FIRST_LADDER,
  HINT_NEAR_MOKSHA,
  HINT_BEFORE_FIRST_ROLL,
} from "@/content/narration";

// Lazy-loaded heavy modals — only fetched when the user opens them.
const RulesModal = lazy(() => import("@/components/lila/RulesModal").then(m => ({ default: m.RulesModal })));
const WinOverlay = lazy(() => import("@/components/lila/WinOverlay").then(m => ({ default: m.WinOverlay })));
const GuruChatSheet = lazy(() => import("@/components/lila/GuruChatSheet").then(m => ({ default: m.GuruChatSheet })));
const SettingsSheet = lazy(() => import("@/components/lila/SettingsSheet").then(m => ({ default: m.SettingsSheet })));
const PauseSheet = lazy(() => import("@/components/lila/PauseSheet").then(m => ({ default: m.PauseSheet })));
const PathTimelineSheet = lazy(() => import("@/components/lila/PathTimelineSheet").then(m => ({ default: m.PathTimelineSheet })));
const PathAnalysisSheet = lazy(() => import("@/components/lila/PathAnalysisSheet").then(m => ({ default: m.PathAnalysisSheet })));
const PracticeChooserSheet = lazy(() => import("@/components/lila/PracticeChooserSheet").then(m => ({ default: m.PracticeChooserSheet })));
const PracticeReturnSheet = lazy(() => import("@/components/lila/PracticeReturnSheet").then(m => ({ default: m.PracticeReturnSheet })));
const PracticeJournalSheet = lazy(() => import("@/components/lila/PracticeJournalSheet").then(m => ({ default: m.PracticeJournalSheet })));
import { ActivePracticeBanner } from "@/components/lila/ActivePracticeBanner";
import { useActivePractice } from "@/hooks/useActivePractice";




export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Лила — Путь к Мокше · рефлексивная игра" },
      { name: "description", content: "Классическая индийская игра Лила как Telegram Mini App: 72 клетки, Санкальпа, Гуру-зеркало и дневник инсайтов." },
      { property: "og:title", content: "Лила — Путь к Мокше" },
      { property: "og:description", content: "Тихая рефлексивная практика: пройди 72 клетки Лилы и услышь свою Санкальпу." },
      { property: "og:url", content: "https://lilas-path-to-moksha.lovable.app/" },
    ],
    links: [{ rel: "canonical", href: "https://lilas-path-to-moksha.lovable.app/" }],
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
  const [pathAnalysisCtx, setPathAnalysisCtx] = useState<PathAnalysisContext | null>(null);
  const [diceHistory, setDiceHistory] = useState<number[]>([]);
  const sessionSavedRef = useRef(false);
  const pendingResume = useRef<(() => void) | null>(null);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [pauseOpen, setPauseOpen] = useState(false);
  // "Landed" experience — focused card shown after each successful move.
  const [landed, setLanded] = useState<{ cell: number; from?: number; kind?: "snake" | "ladder" } | null>(null);
  const [landedOpen, setLandedOpen] = useState(false);
  // Практики: активная сессия + открытые sheets
  const activePractice = useActivePractice();
  const [practiceChooserCell, setPracticeChooserCell] = useState<number | null>(null);
  const [practiceReturnOpen, setPracticeReturnOpen] = useState(false);
  const [practiceJournalOpen, setPracticeJournalOpen] = useState(false);
  const [winOpen, setWinOpen] = useState(false);
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [birthIntroOpen, setBirthIntroOpen] = useState(false);
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
    startedAt: string | null;
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
  const fetchLastCellNote = useServerFn(getLastCellNote);
  const sendReflection = useServerFn(saveReflection);

  // Return-баннер: показываем, если возвращение >24ч.
  const [returnBanner, setReturnBanner] = useState<{
    cellId: number;
    sankalpa: string | null;
    lastNote: string | null;
    hoursSince: number;
  } | null>(null);

  const idRef = useRef(0);
  const reduceMotion = useReducedMotion();
  const { enabled: soundEnabled, toggle: toggleSound, play } = useSound();
  const { enabled: notesEnabled, toggle: toggleNotes } = useNotes();
  const { token, cycle: cycleToken } = usePlayerToken();
  const { isAdmin } = useIsAdmin();
  const [debug, setDebug] = useState(false);
  // Если пользователь не админ — принудительно выключаем отладку.
  useEffect(() => {
    if (!isAdmin && debug) setDebug(false);
  }, [isAdmin, debug]);


  const addMsg = useCallback((text: string, kind: ChatMessage["kind"] = "guru") => {
    idRef.current += 1;
    setMessages((m) => [...m, { id: `${Date.now()}-${idRef.current}`, text, kind }]);
  }, []);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [hint, setHint] = useState<{ id: HintId; text: string } | null>(null);
  const showHint = useCallback((id: HintId, text: string) => {
    if (hasSeenHint(id)) return;
    markHintSeen(id);
    setHint({ id, text });
    setTimeout(() => {
      setHint((h) => (h && h.id === id ? null : h));
    }, 8000);
  }, []);

  // Init Telegram SDK
  useTelegramInit();

  // Fire once on mount.
  useEffect(() => {
    trackEvent("app_opened");
  }, []);

  // Global online-listener: чистим очередь отложенных заметок при появлении сети.
  useEffect(() => {
    const unsub = registerOnlineFlush(async (n) => {
      await sendReflection({
        data: {
          sessionId: n.sessionId,
          cell: n.cellId,
          userText: n.text,
          sankalpa: n.sankalpa,
          prompt: n.prompt,
          withAi: false,
          kind: n.kind,
        },
      });
    });
    return unsub;
  }, [sendReflection]);

  // Кешируем последнюю клетку — чтобы оффлайн-открытие показало осмысленный контент.
  useEffect(() => {
    if (!started || pos === 0) return;
    const cell = BOARD[pos - 1];
    if (!cell) return;
    const userKey = tgAuth.profile?.telegram_id ? String(tgAuth.profile.telegram_id) : null;
    saveLastCell(userKey, {
      cellId: cell.id,
      name: cell.name,
      wisdom: cell.wisdom,
    });
  }, [started, pos, tgAuth.profile]);

  // Contextual hints — shown once per user (localStorage).
  useEffect(() => {
    if (!started || won) return;
    if (pos === 0 && totalRolls === 0) {
      showHint(
        "before_first_roll",
        HINT_BEFORE_FIRST_ROLL,
      );
    }
    if (pos >= 63 && pos < 68) {
      showHint(
        "near_moksha",
        HINT_NEAR_MOKSHA,
      );
    }
  }, [started, won, pos, totalRolls, showHint]);





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
      setStartedAt(new Date().toISOString());
      setBirthIntroOpen(true);
      trackEvent("new_session_started", { extra: { has_sankalpa: !!userSankalpa } });
      if (userSankalpa) trackEvent("sankalpa_submitted", { extra: { length: userSankalpa.length } });
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
    trackEvent("session_resumed", { cell: resumeData.currentCell, sessionId: resumeData.id });

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
    setStartedAt(resumeData.startedAt);
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

  const doRestart = useCallback(() => {
    // Abandon current in-progress session (if any) before returning to welcome.
    const prevId = sessionIdRef.current;
    if (prevId) {
      persistAbandon({ data: { id: prevId } }).catch((e) =>
        console.error("[abandonSession]", e)
      );
    }
    sessionIdRef.current = null;
    setPauseOpen(false);
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
    setMode("classic");
    setStartedAt(null);
    setLanded(null);
    setLandedOpen(false);
    setWinOpen(false);
  }, [persistAbandon]);

  // Клик по «Начать заново» посреди игры → открываем итог сессии,
  // чтобы игрок мог зафиксировать инсайт и решить.
  const restart = useCallback(() => {
    if (started && !won) {
      trackEvent("session_paused", { cell: pos, sessionId: sessionIdRef.current });
      setPauseOpen(true);
    } else {
      doRestart();
    }
  }, [started, won, pos, doRestart]);


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
          startedAt: (row.started_at as string | null) ?? null,
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
          mode,
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
    mode,
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
          mode,
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
  }, [won, sankalpa, mode, totalRolls, pathLog, diceHistory, keyCells, pos, entryMisses, sixStreak, persistSession, persistUpsert]);


  // Открывать оверлей победы, когда игрок достиг Мокши.
  useEffect(() => {
    if (won) setWinOpen(true);
  }, [won]);

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

  const openLanded = useCallback(
    (cell: number, opts?: { from?: number; kind?: "snake" | "ladder" }) => {
      // Не открываем шит автоматически — оставляем как заметный CTA
      // «Осмыслить клетку», чтобы игрок мог выдохнуть после хода.
      setLanded({ cell, from: opts?.from, kind: opts?.kind });
      setLandedOpen(false);
    },
    []
  );


  const handleRoll = useCallback(() => {
    if (rolling || won) return;
    if (activePractice.session) {
      // Мягкая блокировка: пока активна практика, кубик не бросается.
      hapticNotify("warning");
      setPracticeReturnOpen(true);
      return;
    }
    // New roll → hide any previous landed sheet.
    setLandedOpen(false);
    setLanded(null);
    setRolling(true);
    // Классическое правило: игрок должен сам выбросить шестёрку, чтобы войти в игру.
    const value = rollDice(getRuntimeRng());
    setDice(value);
    setDiceHistory((d) => [...d, value]);
    setTotalRolls((n) => {
      const next = n + 1;
      if (next === 1) trackEvent("first_roll", { dice: value, sessionId: sessionIdRef.current });
      return next;
    });
    trackEvent("dice_rolled", { dice: value, cell: pos, sessionId: sessionIdRef.current });
    play("roll");
    addMsg("🎲 Кубик катится…", "system");


    const diceDelay = reduceMotion ? 280 : 1150;
    // Раскрываем результат чуть раньше, чем начнётся движение — небольшая пауза-«вдох».
    setTimeout(() => {
      addMsg(`🎲 Выпало: ${value}`, "player");
    }, Math.max(180, diceDelay - 220));


    // Фаза входа в игру: pos = 0, нужна 6 (в мягком режиме — милость после 3-х промахов).
    if (pos === 0) {
      const entry = resolveEntry(mode, value, entryMisses);
      setTimeout(() => {
        if (!entry.entered) {
          setEntryMisses(entry.nextEntryMisses);
          const next = entry.nextEntryMisses;
          const hints = [
            `Выпало ${value}. Врата воплощения открывает только 🎲 6 — попробуй снова. Само ожидание тоже часть пути.`,
            `Снова не 6 (попытка ${next}). Можно заметить, как ум встречает паузу: с нетерпением, с любопытством, с чем-то ещё?`,
            `${next}-я попытка. Рождение — это то, что приходит в своё время. Дыши спокойно и брось ещё раз.`,
          ];
          addMsg(hints[Math.min(next - 1, hints.length - 1)], "guru");
          setRolling(false);
          return;
        }
        // успех (реальная 6 или милость Мягкого пути)
        setEntryMisses(0);
        setEntryGrace(false);
        if (entry.mercy) {
          addMsg(
            `🌿 Мягкий путь: после трёх бросков врата открываются мягко. Выпало ${value} — душа входит в мир.`,
            "guru"
          );
        } else {
          addMsg(
            "✨ Шестёрка! Душа входит в тело. Ты появляешься на клетке 1 — «Рождение».",
            "guru"
          );
        }
        animateStep(0, 1, () => {
          addMsg(BOARD[0].wisdom, "guru");
          setSixStreak(entry.mercy ? 0 : 1);
          if (!entry.mercy) {
            addMsg("🎲 Шестёрка даёт ещё один бросок.", "system");
          }
          trackEvent("entered_board", { cell: 1, dice: value, sessionId: sessionIdRef.current, extra: { mercy: !!entry.mercy } });
          trackEvent("cell_landed", { cell: 1, sessionId: sessionIdRef.current });
          showHint("first_board", "Теперь каждая клетка — зеркало для твоей Санкальпы.");
          openLanded(1);
          setRolling(false);
        });

      }, diceDelay);
      return;
    }


    const rule = applySixRule(sixStreak, value);
    setSixStreak(rule.nextConsecutiveSixes);

    setTimeout(() => {
      if (rule.forfeited) {
        hapticNotify("warning");
        addMsg(
          "🔥 Три шестёрки подряд. По правилу игры этот бросок не считается — фишка остаётся на месте. Можно выдохнуть и продолжить.",
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
        addMsg(`Шаг: ${pos} → 68 → ${pos}`, "system");
        // Визуальный «отскок»: фишка идёт вперёд до 68, затем возвращается на N лишних шагов.
        animateStep(pos, 68, () => {
          addMsg(
            narrateOvershoot(need),
            "guru"
          );
          setTimeout(() => {
            animateStep(68, pos, () => {
              if (rule.extraTurn) {
                addMsg("🎲 Шестёрка даёт ещё один бросок.", "system");
              }
              setRolling(false);
            });
          }, reduceMotion ? 250 : 600);
        });
        return;
      }

      addMsg(`Шаг: ${pos} → ${target}`, "system");

      animateStep(pos, target, () => {
        const { final, jumped } = resolveJump(target);
        const landed = BOARD[target - 1];

        const finishTurn = () => {
          if (rule.extraTurn && final !== 68) {
            addMsg("🎲 Шестёрка даёт ещё один бросок.", "system");
          }
          setRolling(false);
        };

        if (target === 68) {
          play("moksha"); hapticNotify("success");
          addMsg(narrateMoksha(landed.wisdom), "guru");
          setPathLog((p) => [...p, { cell: 68, kind: "moksha" }]);
          trackEvent("cell_landed", { cell: 68, sessionId: sessionIdRef.current });
          trackEvent("moksha_reached", { cell: 68, sessionId: sessionIdRef.current, extra: { rolls: totalRolls } });
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
          trackEvent("cell_landed", { cell: landed.id, sessionId: sessionIdRef.current });
          trackEvent(kind === "snake" ? "snake_triggered" : "ladder_triggered", {
            cell: landed.id,
            sessionId: sessionIdRef.current,
            extra: { to: final, visit: visitCount },
          });

          if (kind === "snake") {
            play("snake"); hapticNotify("warning");
            addMsg(
              narrateSnake(landed.id, landed.name, final, dest.name, landed.wisdom),
              "guru"
            );
            showHint(
              "first_snake",
              HINT_FIRST_SNAKE,
            );
          } else {
            play("ladder"); hapticNotify("success");
            addMsg(
              narrateLadder(landed.id, landed.name, final, dest.name, landed.wisdom),
              "guru"
            );
            showHint(
              "first_ladder",
              HINT_FIRST_LADDER,
            );
          }
          // Кармический счётчик: повтор того же узла.
          if (visitCount > 1) {
            addMsg(
              narrateRepeat(kind, visitCount),
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
                addMsg(`Клетка «${dest.name}». ${dest.wisdom}`, "guru");
                openLanded(final, { from: landed.id, kind });
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
            trackEvent("reflection_opened", { cell: landed.id, sessionId: sessionIdRef.current });
            showHint(
              "first_reflection",
              "Инсайты сохраняются в дневнике. Позже из них сложится карта пути.",
            );
            setReflection({
              fromId: landed.id,
              fromName: landed.name,
              toId: final,
              toName: dest.name,
              kind,
            });
          }, reduceMotion ? 500 : 1300);
        } else {
          addMsg(`Клетка «${landed.name}». ${landed.wisdom}`, "guru");
          setPathLog((p) => [...p, { cell: landed.id, kind: "land" }]);
          trackEvent("cell_landed", { cell: landed.id, sessionId: sessionIdRef.current });
          openLanded(landed.id);
          finishTurn();
        }
      });

    }, diceDelay);
  }, [pos, rolling, won, sixStreak, entryMisses, entryGrace, mode, cellVisits, addMsg, animateStep, reduceMotion, play, notesEnabled, openLanded, showHint, totalRolls, activePractice.session]);

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
  const visitedCells = useMemo(() => {
    const s = new Set<number>();
    for (const p of pathLog) {
      s.add(p.cell);
      if (p.to !== undefined) s.add(p.to);
    }
    return s;
  }, [pathLog]);

  const buildGuruCtx = useCallback(
    (opts?: { prompt?: string }): GuruChatContext => {
      const c = pos === 0 ? 1 : pos;
      const landedCell = BOARD[c - 1] ?? BOARD[0];
      return {
        cell: c,
        cellName: landedCell.name,
        sankalpa,
        sessionId: sessionIdRef.current,
        eventKind:
          pos === 0
            ? "waiting"
            : landedCell.type === "end"
              ? "moksha"
              : landedCell.type === "snake"
                ? "snake"
                : landedCell.type === "ladder"
                  ? "ladder"
                  : "normal",
        initialPrompt: opts?.prompt,
        recentPath: pathLog.slice(-8),
      };
    },
    [pos, sankalpa, pathLog],
  );


  if (!authReady) {
    return (
      <div className="min-h-app flex flex-col items-center justify-center gap-3 text-center p-6 bg-gradient-to-b from-[var(--lila-bg)] to-[var(--lila-bg-2)] text-[var(--tg-theme-text-color,#fff)]">
        <div className="h-14 w-14 rounded-full bg-gradient-to-br from-amber-300 to-amber-600 flex items-center justify-center text-2xl shadow-[0_0_40px_rgba(251,191,36,0.35)] animate-pulse">
          🕉
        </div>
        <div className="text-sm opacity-80">Открываю путь…</div>
      </div>
    );
  }

  if (!started) {
    return (
      <>
        <WelcomeScreen onStart={startGame} onRules={() => setRulesOpen(true)} />
        {rulesOpen && (
          <Suspense fallback={null}>
            <RulesModal open={rulesOpen} onClose={() => setRulesOpen(false)} />
          </Suspense>
        )}
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
    <div className="flex flex-col h-app min-h-app bg-gradient-to-b from-[var(--lila-bg)] to-[var(--lila-bg-2)] text-[var(--tg-theme-text-color,#fff)]">
      {debug && (
        <div
          className="fixed top-1 right-1 z-50 px-1.5 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider bg-amber-500/90 text-black shadow-sm pointer-events-none"
          aria-hidden="true"
        >
          Отладка сетки
        </div>
      )}

      <GameHeader
        pos={pos}
        currentCell={currentCell}
        mode={mode}
        entryMisses={entryMisses}
        onOpenTimeline={() => setTimelineOpen(true)}
        onPause={restart}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      {/* Board — capped so the current action stays visible on short phones. */}
      <div className="relative z-20 shrink-0 px-2 pt-2 bg-[var(--lila-bg)] shadow-[0_8px_16px_-12px_rgba(0,0,0,0.6)]">
        <div className="mx-auto w-full" style={{ maxHeight: "44dvh", maxWidth: "min(100%, calc((44dvh) * 9 / 8))" }}>
          <Board playerPos={pos} onSelectCell={(id) => setCellOpen(id)} debug={debug} token={token} visited={visitedCells} />
        </div>
      </div>

      {/* Chat */}
      <ChatFeed messages={messages} />

      {/*
        Вторичное действие — «Разобрать путь с Гуру».
        Скрыто, если есть основной CTA (осмыслить клетку / итог / бросок),
        чтобы на экране всегда было одно очевидное главное действие.
      */}
      {started && !won && !rolling && !(landed && !landedOpen) && totalRolls >= 5 && (
        <div className="shrink-0 px-3 pt-1.5 bg-[var(--lila-surface)]/70 backdrop-blur-md">
          <button
            onClick={() => {
              hapticNotify("success");
              trackEvent("guru_path_analysis_requested", {
                cell: pos,
                sessionId: sessionIdRef.current,
                extra: { stage: "opened" },
              });
              setPathAnalysisCtx({
                sankalpa,
                currentCell: pos,
                path: pathLog,
                sessionId: sessionIdRef.current,
              });
            }}
            className="w-full h-8 rounded-full bg-white/5 hover:bg-white/10 ring-1 ring-amber-300/20 text-amber-100/80 text-[12px] inline-flex items-center justify-center gap-1.5 active:scale-[0.99] transition"
            aria-label="Разобрать путь с Гуру"
          >
            ✨ Разобрать путь с Гуру
          </button>
        </div>
      )}
      <GameActionBar
        dice={dice}
        rolling={rolling}
        won={won}
        landed={landed}
        landedOpen={landedOpen}
        pos={pos}
        sankalpa={sankalpa}
        onRoll={handleRoll}
        onOpenWin={() => setWinOpen(true)}
        onOpenLanded={() => setLandedOpen(true)}
        onOpenCell={() => setCellOpen(pos === 0 ? 1 : pos)}
        onAskGuru={() => { trackEvent("guru_opened", { cell: pos, sessionId: sessionIdRef.current }); setGuruCtx(buildGuruCtx()); }}
      />



      <CellModal cellId={cellOpen} onClose={() => setCellOpen(null)} />
      <ReflectionModal
        data={reflection}
        sankalpa={sankalpa}
        sessionId={sessionIdRef.current}
        onSubmit={(note) => closeReflection(note)}
        onSkip={() => closeReflection(null)}
      />
      {won && winOpen && (
        <Suspense fallback={null}>
          <WinOverlay
            open={won && winOpen}
            onRestart={doRestart}
            sankalpa={sankalpa}
            keyCells={keyCells}
            totalRolls={totalRolls}
            mode={mode}
            startedAt={startedAt}
            sessionId={sessionIdRef.current}
            currentCell={pos}
            pathLog={pathLog}
          />
        </Suspense>
      )}
      <CurrentCellSheet
        cellId={landedOpen ? landed?.cell ?? null : null}
        fromCellId={landed?.from ?? null}
        jumpKind={landed?.kind ?? null}
        sankalpa={sankalpa}
        sessionId={sessionIdRef.current}
        visitCount={
          landed?.cell
            ? pathLog.filter((p) => p.cell === landed.cell).length
            : undefined
        }
        onContinue={() => setLandedOpen(false)}
        onTakeAsPractice={(id) => {
          setLandedOpen(false);
          setPracticeChooserCell(id);
        }}
        onAskGuru={(cellId, opts) => {
          setLandedOpen(false);
          const landedCell = BOARD[cellId - 1] ?? BOARD[0];
          const kind = landed?.kind;
          trackEvent("guru_opened", { cell: cellId, sessionId: sessionIdRef.current });
          setGuruCtx({

            cell: cellId,
            cellName: landedCell.name,
            sankalpa,
            sessionId: sessionIdRef.current,
            eventKind:
              landedCell.type === "end"
                ? "moksha"
                : kind === "snake"
                  ? "snake"
                  : kind === "ladder"
                    ? "ladder"
                    : "normal",
            initialPrompt: opts?.prompt,
            recentPath: pathLog.slice(-8),
          });
        }}
      />
      {pauseOpen && (
        <Suspense fallback={null}>
          <PauseSheet
            open={pauseOpen}
            onContinue={() => setPauseOpen(false)}
            onExit={doRestart}
            sankalpa={sankalpa}
            startedAt={startedAt}
            currentCell={pos}
            totalRolls={totalRolls}
            keyCells={keyCells}
            sessionId={sessionIdRef.current}
          />
        </Suspense>
      )}

      {guruCtx && (
        <Suspense fallback={null}>
          <GuruChatSheet ctx={guruCtx} onClose={() => setGuruCtx(null)} />
        </Suspense>
      )}
      {pathAnalysisCtx && (
        <Suspense fallback={null}>
          <PathAnalysisSheet ctx={pathAnalysisCtx} onClose={() => setPathAnalysisCtx(null)} />
        </Suspense>
      )}
      {timelineOpen && (
        <Suspense fallback={null}>
          <PathTimelineSheet
            open={timelineOpen}
            onClose={() => setTimelineOpen(false)}
            pathLog={pathLog}
            diceHistory={diceHistory}
            keyCells={keyCells}
            currentCell={pos}
          />
        </Suspense>
      )}
      <BirthIntroCard
        open={birthIntroOpen && pos === 0 && !won}
        sankalpa={sankalpa}
        onRoll={() => {
          setBirthIntroOpen(false);
          setTimeout(() => handleRoll(), 60);
        }}
        onClose={() => setBirthIntroOpen(false)}
      />
      {settingsOpen && (
        <Suspense fallback={null}>
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
            started={started}
            won={won}
            currentCell={pos}
            totalRolls={totalRolls}
            onPause={() => setPauseOpen(true)}
            onNewPath={doRestart}
            onStart={() => setSettingsOpen(false)}
          />
        </Suspense>
      )}

      <SaveIndicator state={saveState} />
      <HintToast text={hint?.text ?? null} onDismiss={() => setHint(null)} />
      {tgAuth.status === "dev_mode" && (
        <div className="fixed bottom-2 left-1/2 -translate-x-1/2 z-50 rounded-full bg-amber-500/90 text-amber-950 text-xs px-3 py-1 shadow-lg max-w-[92vw] text-center">
          Приложение открыто вне Telegram. Некоторые функции могут быть недоступны.
        </div>
      )}
      {tgAuth.status === "error" && (
        <div className="fixed bottom-2 left-1/2 -translate-x-1/2 z-50 rounded-full bg-rose-500/90 text-white text-xs px-3 py-1 shadow-lg max-w-[92vw] text-center">
          Не удалось подтвердить вход через Telegram. Попробуй открыть игру из бота ещё раз.
        </div>
      )}
      {activePractice.session && (
        <ActivePracticeBanner
          session={activePractice.session}
          onOpenReturn={() => setPracticeReturnOpen(true)}
          onOpenJournal={() => setPracticeJournalOpen(true)}
        />
      )}
      {practiceChooserCell !== null && (
        <Suspense fallback={null}>
          <PracticeChooserSheet
            cellId={practiceChooserCell}
            sankalpa={sankalpa}
            onClose={() => setPracticeChooserCell(null)}
            onStarted={() => {
              setPracticeChooserCell(null);
              void activePractice.refresh();
            }}
          />
        </Suspense>
      )}
      {practiceReturnOpen && activePractice.session && (
        <Suspense fallback={null}>
          <PracticeReturnSheet
            session={activePractice.session}
            onClose={() => setPracticeReturnOpen(false)}
            onCompleted={() => {
              setPracticeReturnOpen(false);
              void activePractice.refresh();
            }}
          />
        </Suspense>
      )}
      {practiceJournalOpen && (
        <Suspense fallback={null}>
          <PracticeJournalSheet
            open={practiceJournalOpen}
            onClose={() => setPracticeJournalOpen(false)}
            sessionId={activePractice.session?.id ?? null}
            cellId={activePractice.session?.cell_id ?? pos}
          />
        </Suspense>
      )}
    </div>
  );
}

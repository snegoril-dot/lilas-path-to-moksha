import { useEffect, useMemo, useState } from "react";
import { Share2, Save, BookOpen } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { saveReflection, getJournal } from "@/lib/guru.functions";
import { BOARD, LADDERS, SNAKES } from "@/lib/lila-board";
import { getCellExperience } from "@/lib/cell-experience";
import type { KeyCell } from "./WinOverlay";

export type SessionResult = "in_progress" | "moksha" | "paused";

const RESULT_LABEL: Record<SessionResult, string> = {
  in_progress: "В пути",
  moksha: "Мокша · Освобождение",
  paused: "Пауза",
};

export type PathStep = { cell: number; kind: string; to?: number };

function fmtTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("ru-RU", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return "—";
  }
}

function fmtDuration(startedAt: string | null | undefined): string | null {
  if (!startedAt) return null;
  const ms = Date.now() - new Date(startedAt).getTime();
  if (!Number.isFinite(ms) || ms < 0) return null;
  const min = Math.round(ms / 60000);
  if (min < 1) return "меньше минуты";
  if (min < 60) return `${min} мин`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h} ч` : `${h} ч ${m} мин`;
}

function shareText(text: string) {
  const tg = (window as unknown as {
    Telegram?: {
      WebApp?: {
        switchInlineQuery?: (q: string, types?: string[]) => void;
        openTelegramLink?: (url: string) => void;
      };
    };
  }).Telegram?.WebApp;
  if (tg?.switchInlineQuery) {
    try {
      tg.switchInlineQuery(text, ["users", "groups"]);
      return;
    } catch {
      /* fall through */
    }
  }
  const url = `https://t.me/share/url?url=${encodeURIComponent(
    typeof window !== "undefined" ? window.location.href : "https://t.me"
  )}&text=${encodeURIComponent(text)}`;
  if (tg?.openTelegramLink) tg.openTelegramLink(url);
  else if (typeof window !== "undefined") window.open(url, "_blank", "noopener,noreferrer");
}

type JournalRow = {
  id: string;
  cell: number | null;
  kind: string;
  user_text: string | null;
  created_at: string;
  session_id: string | null;
};

export interface SessionSummaryProps {
  result: SessionResult;
  sankalpa: string;
  startedAt: string | null;
  currentCell: number; // 0 if not born yet
  totalRolls: number;
  keyCells: KeyCell[];
  sessionId: string | null;
  pathLog?: PathStep[];
  showInsightCapture?: boolean;
}

export function SessionSummary({
  result,
  sankalpa,
  startedAt,
  currentCell,
  totalRolls,
  keyCells,
  sessionId,
  pathLog = [],
  showInsightCapture = true,
}: SessionSummaryProps) {
  const saveFn = useServerFn(saveReflection);
  const loadJournal = useServerFn(getJournal);
  const [insight, setInsight] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedOk, setSavedOk] = useState(false);
  const [includeSankalpa, setIncludeSankalpa] = useState(false);
  const [includeNotes, setIncludeNotes] = useState(false);
  const [savedInsights, setSavedInsights] = useState<JournalRow[]>([]);

  const isMoksha = result === "moksha";
  const cell = currentCell > 0 ? BOARD[currentCell - 1] : null;

  const notesCount = useMemo(
    () => keyCells.filter((k) => k.note && k.note.trim().length > 0).length,
    [keyCells]
  );

  // --- Path stats ---
  const stats = useMemo(() => {
    const uniqueCells = new Set<number>();
    for (const step of pathLog) {
      if (step.cell && step.cell > 0) uniqueCells.add(step.cell);
      if (step.to && step.to > 0) uniqueCells.add(step.to);
    }
    if (currentCell > 0) uniqueCells.add(currentCell);
    const snakes = keyCells.filter((k) => k.kind === "snake").length;
    const ladders = keyCells.filter((k) => k.kind === "ladder").length;
    return {
      cellsVisited: uniqueCells.size,
      snakes,
      ladders,
      duration: fmtDuration(startedAt),
    };
  }, [pathLog, keyCells, startedAt, currentCell]);

  // --- Main path events ---
  const mainEvents = useMemo(() => {
    const firstCell = pathLog.find((s) => s.cell > 0)?.cell ?? null;
    let strongestSnake: KeyCell | null = null;
    let strongestSnakeDelta = 0;
    let strongestLadder: KeyCell | null = null;
    let strongestLadderDelta = 0;
    for (const k of keyCells) {
      if (k.kind === "snake") {
        const to = SNAKES[k.id];
        if (to == null) continue;
        const delta = k.id - to;
        if (delta > strongestSnakeDelta) {
          strongestSnakeDelta = delta;
          strongestSnake = k;
        }
      } else if (k.kind === "ladder") {
        const to = LADDERS[k.id];
        if (to == null) continue;
        const delta = to - k.id;
        if (delta > strongestLadderDelta) {
          strongestLadderDelta = delta;
          strongestLadder = k;
        }
      }
    }
    return {
      firstCell,
      strongestSnake,
      strongestSnakeTo: strongestSnake ? SNAKES[strongestSnake.id] : null,
      strongestLadder,
      strongestLadderTo: strongestLadder ? LADDERS[strongestLadder.id] : null,
    };
  }, [pathLog, keyCells]);

  // --- Themes from visited cells' keywords ---
  const themes = useMemo(() => {
    const counter = new Map<string, number>();
    const visited = new Set<number>();
    for (const s of pathLog) {
      if (s.cell > 0) visited.add(s.cell);
      if (s.to && s.to > 0) visited.add(s.to);
    }
    if (currentCell > 0) visited.add(currentCell);
    for (const id of visited) {
      const exp = getCellExperience(id);
      if (!exp) continue;
      for (const kw of exp.keywords) {
        counter.set(kw, (counter.get(kw) ?? 0) + 1);
      }
    }
    return [...counter.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([k]) => k);
  }, [pathLog, currentCell]);

  // --- Load saved insights of this session ---
  useEffect(() => {
    if (!isMoksha || !sessionId) return;
    let cancelled = false;
    (async () => {
      try {
        const rows = (await loadJournal({ data: { limit: 50 } })) as unknown as JournalRow[];
        if (cancelled) return;
        const filtered = rows
          .filter(
            (r) =>
              r.session_id === sessionId &&
              (r.kind === "reflection" ||
                r.kind === "final_insight" ||
                r.kind === "snake_lesson" ||
                r.kind === "ladder_gift")
          )
          .slice(0, 3);
        setSavedInsights(filtered);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isMoksha, sessionId, loadJournal, savedOk]);

  const saveInsight = async () => {
    if (!insight.trim()) return;
    setSaving(true);
    try {
      await saveFn({
        data: {
          sessionId: sessionId ?? undefined,
          cell: currentCell > 0 ? currentCell : 1,
          userText: insight.trim(),
          kind: "final_insight",
          sankalpa: sankalpa || undefined,
          prompt: "Главный инсайт пути",
        },
      });
      setSavedOk(true);
    } catch (e) {
      console.error("[saveInsight]", e);
    } finally {
      setSaving(false);
    }
  };

  const buildShareText = (): string => {
    const cellLine = cell
      ? `Клетка ${cell.id} · ${cell.name}`
      : "Душа ждёт воплощения";
    const poetic = isMoksha
      ? "🕉 Путь завершён — я дошёл до Мокши."
      : result === "paused"
        ? "🌿 Пауза в пути — но зерно уже посеяно."
        : "🎲 Иду по карте своей жизни.";
    const parts: string[] = [poetic, cellLine];
    if (isMoksha) parts.push("Итог: Мокша · Освобождение");
    if (includeSankalpa && sankalpa) parts.push(`Санкальпа: «${sankalpa}»`);
    if (includeNotes && notesCount > 0) {
      const withNotes = keyCells.filter((k) => k.note);
      const excerpts = withNotes
        .slice(-2)
        .map((k) => `${k.kind === "snake" ? "🐍" : "🪜"} ${k.name}: «${k.note}»`)
        .join("\n");
      parts.push(excerpts);
    }
    parts.push("\nЛила — древняя игра самопознания. Пройди свой путь.");
    return parts.join("\n");
  };

  const shareLabel =
    includeSankalpa || includeNotes
      ? "Поделиться в Telegram"
      : "Поделиться без личных заметок";

  const cellName = (id: number | null | undefined) =>
    id && id > 0 ? BOARD[id - 1]?.name ?? `Клетка ${id}` : null;

  const hasJumps = mainEvents.strongestSnake || mainEvents.strongestLadder;

  return (
    <div className="w-full max-w-md space-y-3 text-left">
      {/* Completion header — only for Moksha */}
      {isMoksha && (
        <div className="rounded-2xl bg-gradient-to-br from-amber-300/10 to-indigo-300/10 ring-1 ring-amber-300/30 p-4 text-center">
          <div className="text-[11px] uppercase tracking-[0.2em] text-amber-300/80">
            Путь завершён
          </div>
          <div className="mt-1 text-xl font-semibold text-amber-100">
            Ты достиг Мокши
          </div>
          <p className="mt-2 text-xs leading-relaxed text-amber-50/70">
            Игра прошла до конца. Возьми немного тишины — прежде чем читать
            статистику, услышь себя.
          </p>
        </div>
      )}

      {/* Meta */}
      <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-4 space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="opacity-60 text-xs uppercase tracking-wider">Итог</span>
          <span className="font-semibold text-amber-100">{RESULT_LABEL[result]}</span>
        </div>
        {sankalpa && (
          <div>
            <div className="opacity-60 text-xs uppercase tracking-wider">
              {isMoksha ? "Санкальпа, с которой ты вошёл в путь" : "Санкальпа"}
            </div>
            <div className="italic text-amber-50/90">«{sankalpa}»</div>
          </div>
        )}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <div>
            <div className="opacity-60 text-xs">Начало</div>
            <div>{fmtTime(startedAt)}</div>
          </div>
          <div>
            <div className="opacity-60 text-xs">Клетка</div>
            <div>{cell ? `${cell.id} · ${cell.name}` : "не рождена"}</div>
          </div>
          <div>
            <div className="opacity-60 text-xs">Бросков</div>
            <div>{totalRolls}</div>
          </div>
          <div>
            <div className="opacity-60 text-xs">Клеток пройдено</div>
            <div>{stats.cellsVisited}</div>
          </div>
          <div>
            <div className="opacity-60 text-xs">Змей</div>
            <div>🐍 {stats.snakes}</div>
          </div>
          <div>
            <div className="opacity-60 text-xs">Лестниц</div>
            <div>🪜 {stats.ladders}</div>
          </div>
          {stats.duration && (
            <div className="col-span-2">
              <div className="opacity-60 text-xs">Длительность</div>
              <div>{stats.duration}</div>
            </div>
          )}
        </div>
      </div>

      {/* Main events */}
      {isMoksha && (
        <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-4 space-y-2">
          <div className="text-[11px] uppercase tracking-wider text-amber-300/80">
            Главные события пути
          </div>
          <ul className="space-y-1.5 text-sm">
            {mainEvents.firstCell && (
              <li className="flex items-start gap-2">
                <span>🌱</span>
                <div>
                  Начало —{" "}
                  <span className="text-amber-100">
                    {mainEvents.firstCell}. {cellName(mainEvents.firstCell)}
                  </span>
                </div>
              </li>
            )}
            {mainEvents.strongestLadder && (
              <li className="flex items-start gap-2">
                <span>🪜</span>
                <div>
                  Самый большой подъём —{" "}
                  <span className="text-amber-100">
                    {mainEvents.strongestLadder.id}. {mainEvents.strongestLadder.name}
                  </span>{" "}
                  → {mainEvents.strongestLadderTo}.{" "}
                  {cellName(mainEvents.strongestLadderTo)}
                </div>
              </li>
            )}
            {mainEvents.strongestSnake && (
              <li className="flex items-start gap-2">
                <span>🐍</span>
                <div>
                  Самое глубокое падение —{" "}
                  <span className="text-amber-100">
                    {mainEvents.strongestSnake.id}. {mainEvents.strongestSnake.name}
                  </span>{" "}
                  → {mainEvents.strongestSnakeTo}.{" "}
                  {cellName(mainEvents.strongestSnakeTo)}
                </div>
              </li>
            )}
            {!hasJumps && (
              <li className="text-xs opacity-70 italic">
                На этом пути не встретилось ни змей, ни лестниц — ты прошёл его
                своим шагом.
              </li>
            )}
            <li className="flex items-start gap-2">
              <span>🕉</span>
              <div>
                Финальный шаг —{" "}
                <span className="text-amber-100">68. Космическое сознание</span>
              </div>
            </li>
          </ul>
        </div>
      )}

      {/* Themes */}
      {isMoksha && (
        <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-4">
          <div className="text-[11px] uppercase tracking-wider text-amber-300/80 mb-2">
            Главные темы пути
          </div>
          {themes.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {themes.map((t) => (
                <span
                  key={t}
                  className="px-2 py-0.5 rounded-full bg-amber-300/10 ring-1 ring-amber-300/25 text-xs text-amber-100"
                >
                  {t}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs italic opacity-70">
              Главная тема пути раскрывается в твоих заметках.
            </p>
          )}
        </div>
      )}

      {/* Saved insights */}
      {isMoksha && savedInsights.length > 0 && (
        <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-4">
          <div className="text-[11px] uppercase tracking-wider text-amber-300/80 mb-2">
            Твои сохранённые инсайты
          </div>
          <ul className="space-y-2 text-sm">
            {savedInsights.map((r) => (
              <li key={r.id} className="border-l-2 border-amber-300/30 pl-2">
                <div className="text-[10px] uppercase tracking-wider opacity-60">
                  {r.cell ? `Клетка ${r.cell}` : "заметка"}
                </div>
                <div className="text-amber-50/90 line-clamp-3">
                  «{r.user_text}»
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Key cells */}
      {keyCells.length > 0 && (
        <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-4">
          <div className="text-[11px] uppercase tracking-wider text-amber-300/80 mb-2">
            Змеи и лестницы
          </div>
          <ol className="space-y-1.5 text-sm">
            {keyCells.slice(-8).map((k, i) => (
              <li key={i} className="flex items-start gap-2">
                <span>{k.kind === "snake" ? "🐍" : "🪜"}</span>
                <div className="flex-1 min-w-0">
                  <div className="truncate">
                    <span className="opacity-60">{k.id}.</span> {k.name}
                    {k.visitCount && k.visitCount > 1 && (
                      <span className="ml-1 text-[10px] text-rose-300/80">×{k.visitCount}</span>
                    )}
                  </div>
                  {k.note && (
                    <div className="text-xs italic text-amber-100/60 border-l-2 border-amber-300/30 pl-2 mt-0.5">
                      «{k.note}»
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Final reflection question */}
      {isMoksha && (
        <div className="rounded-2xl bg-indigo-300/5 ring-1 ring-indigo-300/25 p-4">
          <div className="text-[11px] uppercase tracking-wider text-indigo-200/80 mb-1">
            🕉 Финальная рефлексия
          </div>
          <p className="text-sm leading-relaxed text-indigo-50/90 italic">
            «Что изменилось в твоём взгляде на Санкальпу после этого пути?»
          </p>
        </div>
      )}

      {/* Insight capture */}
      {showInsightCapture && (
        <div className="rounded-2xl bg-amber-300/5 ring-1 ring-amber-300/30 p-4 space-y-2">
          <div className="text-[11px] uppercase tracking-wider text-amber-300/90">
            🌟 Главный инсайт пути
          </div>
          <p className="text-xs opacity-70 leading-relaxed">
            Одно предложение, которое ты хочешь унести из этого пути. Оно
            останется в твоём дневнике.
          </p>
          <textarea
            value={insight}
            onChange={(e) => setInsight(e.target.value)}
            maxLength={400}
            rows={3}
            disabled={saving || savedOk}
            placeholder="Например: «Я замечаю, где мой ум цепляется»"
            className="w-full rounded-xl bg-black/30 ring-1 ring-white/10 p-3 text-sm text-amber-50 placeholder:text-white/30 focus:outline-none focus:ring-amber-300/50 disabled:opacity-60"
          />
          <div className="flex items-center justify-between">
            <span className="text-[10px] opacity-50">{insight.length}/400</span>
            <button
              onClick={saveInsight}
              disabled={!insight.trim() || saving || savedOk}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-300 text-stone-900 text-xs font-semibold disabled:opacity-50 active:scale-95 transition"
            >
              <Save size={13} />
              {savedOk ? "Сохранено" : saving ? "Сохраняю…" : "Сохранить итог"}
            </button>
          </div>
        </div>
      )}

      {/* Share */}
      <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-4 space-y-2">
        <div className="text-[11px] uppercase tracking-wider text-amber-300/80">
          Поделиться
        </div>
        <p className="text-xs opacity-70 leading-relaxed">
          По умолчанию делимся только результатом и одной поэтичной строкой.
          Санкальпа и заметки остаются с тобой.
        </p>
        <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
          <input
            type="checkbox"
            checked={includeSankalpa}
            onChange={(e) => setIncludeSankalpa(e.target.checked)}
            disabled={!sankalpa}
            className="accent-amber-400"
          />
          <span className={sankalpa ? "" : "opacity-40"}>
            Включить мою Санкальпу
          </span>
        </label>
        <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
          <input
            type="checkbox"
            checked={includeNotes}
            onChange={(e) => setIncludeNotes(e.target.checked)}
            disabled={notesCount === 0}
            className="accent-amber-400"
          />
          <span className={notesCount > 0 ? "" : "opacity-40"}>
            Включить последние заметки ({notesCount})
          </span>
        </label>
        <button
          onClick={() => shareText(buildShareText())}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 ring-1 ring-amber-200/30 text-amber-100 text-sm font-semibold active:scale-95 transition"
        >
          <Share2 size={15} />
          {shareLabel}
        </button>
        <Link
          to="/journal"
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 ring-1 ring-white/10 text-amber-100/90 text-sm font-medium active:scale-95 transition"
        >
          <BookOpen size={15} />
          Открыть дневник
        </Link>
      </div>
    </div>
  );
}

import { useMemo, useState } from "react";
import { Share2, Save } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { saveReflection } from "@/lib/guru.functions";
import { BOARD } from "@/lib/lila-board";
import type { KeyCell } from "./WinOverlay";

export type SessionResult = "in_progress" | "moksha" | "paused";

const RESULT_LABEL: Record<SessionResult, string> = {
  in_progress: "В пути",
  moksha: "Мокша · Освобождение",
  paused: "Пауза",
};

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

export interface SessionSummaryProps {
  result: SessionResult;
  sankalpa: string;
  startedAt: string | null;
  currentCell: number; // 0 if not born yet
  totalRolls: number;
  keyCells: KeyCell[];
  sessionId: string | null;
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
  showInsightCapture = true,
}: SessionSummaryProps) {
  const saveFn = useServerFn(saveReflection);
  const [insight, setInsight] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedOk, setSavedOk] = useState(false);
  const [includeSankalpa, setIncludeSankalpa] = useState(false);
  const [includeNotes, setIncludeNotes] = useState(false);

  const cell = currentCell > 0 ? BOARD[currentCell - 1] : null;
  const notesCount = useMemo(
    () => keyCells.filter((k) => k.note && k.note.trim().length > 0).length,
    [keyCells]
  );

  const saveInsight = async () => {
    if (!insight.trim()) return;
    setSaving(true);
    try {
      await saveFn({
        data: {
          sessionId: sessionId ?? undefined,
          cell: currentCell > 0 ? currentCell : 1,
          userText: insight.trim(),
          kind: "insight",
          sankalpa: sankalpa || undefined,
          prompt: "Главный инсайт сессии",
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
    const poetic =
      result === "moksha"
        ? "🕉 Путь замкнулся — играющий растворился в Игре."
        : result === "paused"
          ? "🌿 Пауза в пути — но зерно уже посеяно."
          : "🎲 Иду по карте своей жизни.";
    const parts: string[] = [poetic, cellLine];
    if (result === "moksha") parts.push("Итог: Мокша · Освобождение");
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


  return (
    <div className="w-full max-w-md space-y-3 text-left">
      {/* Meta */}
      <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-4 space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="opacity-60 text-xs uppercase tracking-wider">Итог</span>
          <span className="font-semibold text-amber-100">{RESULT_LABEL[result]}</span>
        </div>
        {sankalpa && (
          <div>
            <div className="opacity-60 text-xs uppercase tracking-wider">Санкальпа</div>
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
            <div className="opacity-60 text-xs">Узлов</div>
            <div>{keyCells.length}</div>
          </div>
        </div>
      </div>

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

      {/* Insight capture */}
      {showInsightCapture && (
        <div className="rounded-2xl bg-amber-300/5 ring-1 ring-amber-300/30 p-4 space-y-2">
          <div className="text-[11px] uppercase tracking-wider text-amber-300/90">
            🌟 Главный инсайт
          </div>
          <p className="text-xs opacity-70 leading-relaxed">
            Одно предложение, которое ты хочешь унести из этой сессии. Оно останется в
            твоём дневнике.
          </p>
          <textarea
            value={insight}
            onChange={(e) => setInsight(e.target.value)}
            maxLength={400}
            rows={2}
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
              {savedOk ? "Сохранено" : saving ? "Сохраняю…" : "Сохранить"}
            </button>
          </div>
        </div>
      )}

      {/* Final reflection question (Moksha) */}
      {result === "moksha" && (
        <div className="rounded-2xl bg-indigo-300/5 ring-1 ring-indigo-300/25 p-4">
          <div className="text-[11px] uppercase tracking-wider text-indigo-200/80 mb-1">
            🕉 Финальная рефлексия
          </div>
          <p className="text-sm leading-relaxed text-indigo-50/90 italic">
            «Если сейчас снова услышать твою Санкальпу — что путь ответил тебе
            событиями, а не словами?»
          </p>
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
      </div>
    </div>
  );
}

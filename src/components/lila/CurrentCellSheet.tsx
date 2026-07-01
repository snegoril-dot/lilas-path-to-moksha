import { AnimatePresence, motion } from "framer-motion";
import { X, Feather, MessageCircle, ArrowRight, Loader2, Check } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { saveReflection } from "@/lib/guru.functions";
import { getCellExperience } from "@/lib/cell-experience";
import { useDialogA11y } from "@/hooks/use-dialog-a11y";
import { useTelegramBackButton, haptic, hapticNotify } from "@/hooks/use-telegram";

export interface CurrentCellSheetProps {
  /** id of the cell to display (post-jump destination if snake/ladder). */
  cellId: number | null;
  /** id of the pre-jump cell if a snake/ladder fired (for a compact transition line). */
  fromCellId?: number | null;
  jumpKind?: "snake" | "ladder" | null;
  sankalpa?: string;
  sessionId?: string | null;
  onContinue: () => void;
  onAskGuru: (cellId: number) => void;
}

export function CurrentCellSheet({
  cellId,
  fromCellId,
  jumpKind,
  sankalpa,
  sessionId,
  onContinue,
  onAskGuru,
}: CurrentCellSheetProps) {
  const open = cellId !== null;
  const { initialRef } = useDialogA11y(open, onContinue);
  useTelegramBackButton(open, onContinue);
  const save = useServerFn(saveReflection);

  const [showInsight, setShowInsight] = useState(false);
  const [insight, setInsight] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      setShowInsight(false);
      setInsight("");
      setSaved(false);
      setErr(null);
    }
  }, [open, cellId]);

  useEffect(() => {
    if (showInsight) setTimeout(() => taRef.current?.focus(), 60);
  }, [showInsight]);

  if (cellId === null) return null;
  const exp = getCellExperience(cellId);
  if (!exp) return null;
  const { cell, lokaName, shortMeaning, reflectionQuestion, dailyPractice } = exp;

  const fromExp = fromCellId ? getCellExperience(fromCellId) : null;

  const saveInsight = async () => {
    const text = insight.trim();
    if (!text || busy) return;
    setBusy(true);
    setErr(null);
    try {
      await save({
        data: {
          sessionId: sessionId ?? null,
          cell: cell.id,
          userText: text,
          withAi: false,
          prompt: reflectionQuestion,
          sankalpa: sankalpa || undefined,
          kind: "insight",
        },
      });
      hapticNotify("success");
      setSaved(true);
      setTimeout(() => {
        setShowInsight(false);
        setInsight("");
        setSaved(false);
      }, 900);
    } catch (e) {
      hapticNotify("error");
      setErr(e instanceof Error ? e.message : "Не удалось сохранить");
    } finally {
      setBusy(false);
    }
  };

  const titleId = "current-cell-title";

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          onClick={onContinue}
        >
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            className="w-full sm:max-w-md bg-[var(--lila-surface,#1a1230)] text-[var(--tg-theme-text-color,#fff)] rounded-t-3xl sm:rounded-3xl ring-1 ring-white/10 shadow-2xl max-h-[92dvh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="shrink-0 flex items-start gap-3 px-4 pt-4 pb-3 border-b border-white/5">
              <div className="shrink-0 h-11 w-11 rounded-2xl bg-gradient-to-br from-amber-300 to-amber-600 text-stone-900 font-bold flex items-center justify-center text-lg shadow">
                {cell.id}
              </div>
              <div className="flex-1 min-w-0">
                <h2 id={titleId} className="text-base font-semibold leading-tight truncate">
                  {cell.name}
                </h2>
                {lokaName && (
                  <div className="text-[11px] opacity-60 truncate mt-0.5">{lokaName}</div>
                )}
              </div>
              <button
                ref={initialRef}
                onClick={onContinue}
                className="shrink-0 p-2 -mr-1 -mt-1 rounded-full hover:bg-white/10 active:scale-95"
                aria-label="Закрыть"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 text-sm leading-relaxed">
              {jumpKind && fromExp && (
                <div
                  className={`text-xs px-3 py-2 rounded-xl ring-1 ${
                    jumpKind === "snake"
                      ? "bg-rose-500/10 ring-rose-400/30 text-rose-100"
                      : "bg-emerald-500/10 ring-emerald-400/30 text-emerald-100"
                  }`}
                >
                  {jumpKind === "snake" ? "🐍" : "🪜"} «{fromExp.cell.name}» → «{cell.name}»
                </div>
              )}

              <p className="text-amber-100/95 font-medium">{shortMeaning}</p>

              <p className="whitespace-pre-line opacity-90">{cell.wisdom}</p>

              <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-3 space-y-1">
                <div className="text-[11px] uppercase tracking-wider opacity-60">
                  Вопрос для рефлексии
                </div>
                <div className="text-amber-50">{reflectionQuestion}</div>
              </div>

              <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-3 space-y-1">
                <div className="text-[11px] uppercase tracking-wider opacity-60">
                  Практика на сегодня
                </div>
                <div className="text-amber-50">{dailyPractice}</div>
              </div>

              {showInsight && (
                <div className="space-y-2">
                  <label className="text-[11px] uppercase tracking-wider opacity-60 block">
                    Твой инсайт
                  </label>
                  <textarea
                    ref={taRef}
                    value={insight}
                    onChange={(e) => setInsight(e.target.value.slice(0, 1200))}
                    rows={4}
                    placeholder="Одна честная строка — то, что открылось прямо сейчас."
                    className="w-full rounded-2xl bg-black/30 ring-1 ring-white/10 p-3 text-sm outline-none focus:ring-amber-300/60 resize-none"
                    disabled={busy || saved}
                  />
                  <div className="flex items-center justify-between text-[11px] opacity-60">
                    <span>{insight.length}/1200</span>
                    {err && <span className="text-rose-300">{err}</span>}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowInsight(false)}
                      disabled={busy}
                      className="flex-1 h-10 rounded-xl bg-white/5 hover:bg-white/10 ring-1 ring-white/10 text-sm"
                    >
                      Отмена
                    </button>
                    <button
                      onClick={saveInsight}
                      disabled={busy || saved || insight.trim().length === 0}
                      className="flex-1 h-10 rounded-xl bg-amber-300 text-stone-900 font-semibold text-sm inline-flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      {saved ? (
                        <>
                          <Check size={16} /> Сохранено
                        </>
                      ) : busy ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        "Сохранить"
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            {!showInsight && (
              <div className="shrink-0 grid grid-cols-3 gap-2 p-3 border-t border-white/5 bg-black/20">
                <button
                  onClick={() => {
                    haptic("light");
                    setShowInsight(true);
                  }}
                  className="h-12 rounded-2xl bg-white/5 hover:bg-white/10 ring-1 ring-white/10 text-xs font-medium inline-flex flex-col items-center justify-center gap-0.5"
                >
                  <Feather size={16} />
                  Инсайт
                </button>
                <button
                  onClick={() => {
                    haptic("light");
                    onAskGuru(cell.id);
                  }}
                  className="h-12 rounded-2xl bg-white/5 hover:bg-white/10 ring-1 ring-amber-300/30 text-amber-200 text-xs font-medium inline-flex flex-col items-center justify-center gap-0.5"
                >
                  <MessageCircle size={16} />
                  Гуру
                </button>
                <button
                  onClick={() => {
                    haptic("medium");
                    onContinue();
                  }}
                  className="h-12 rounded-2xl bg-gradient-to-r from-amber-300 to-amber-500 text-stone-900 text-xs font-bold inline-flex flex-col items-center justify-center gap-0.5"
                >
                  <ArrowRight size={16} />
                  Продолжить
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

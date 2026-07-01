import { AnimatePresence, motion } from "framer-motion";
import { BookmarkPlus, Check, Loader2, Lock, Sparkles, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useDialogA11y } from "@/hooks/use-dialog-a11y";
import { useTelegramBackButton, haptic } from "@/hooks/use-telegram";
import { analyzePath, saveReflection } from "@/lib/guru.functions";
import { trackEvent } from "@/lib/analytics";
import { useEntitlements, openPaywallGlobal } from "@/hooks/use-entitlements";
import { FEATURE_IDS } from "@/lib/entitlements";

export interface PathAnalysisContext {
  sankalpa?: string;
  currentCell: number;
  path: Array<{ cell: number; kind: string; to?: number }>;
  sessionId?: string | null;
}

interface Props {
  ctx: PathAnalysisContext | null;
  onClose: () => void;
}

export function PathAnalysisSheet({ ctx, onClose }: Props) {
  const open = !!ctx;
  const [includeNotes, setIncludeNotes] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const analyze = useServerFn(analyzePath);
  const save = useServerFn(saveReflection);
  useDialogA11y(open, onClose);
  useTelegramBackButton(open, onClose);
  const { has } = useEntitlements();
  const canAnalyze = has(FEATURE_IDS.FINAL_AI_ANALYSIS);


  useEffect(() => {
    if (!open) {
      setIncludeNotes(false);
      setLoading(false);
      setError(null);
      setResult(null);
      setSaved(false);
      setSaving(false);
    }
  }, [open]);

  async function handleAnalyze() {
    if (!ctx) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setSaved(false);
    try {
      trackEvent("guru_path_analysis_requested", {
        cell: ctx.currentCell,
        sessionId: ctx.sessionId ?? null,
        extra: { includeNotes, moves: ctx.path.length },
      });
      const res = await analyze({
        data: {
          sankalpa: ctx.sankalpa,
          currentCell: ctx.currentCell,
          path: ctx.path,
          includeNotes,
        },
      });
      setResult(res.text);
      haptic("light");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось получить разбор. Попробуй позже.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!ctx || !result) return;
    setSaving(true);
    try {
      await save({
        data: {
          sessionId: ctx.sessionId ?? null,
          cell: Math.max(1, ctx.currentCell || 1),
          userText: result.slice(0, 1200),
          withAi: false,
          sankalpa: ctx.sankalpa,
          kind: "guru_path_analysis",
        },
      });
      setSaved(true);
      trackEvent("guru_path_analysis_saved", { sessionId: ctx.sessionId ?? null });
      haptic("light");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось сохранить.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AnimatePresence>
      {open && ctx && (
        <motion.div
          className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Разбор пути с Гуру"
            className="w-full sm:max-w-lg max-h-[92dvh] bg-[var(--lila-surface)] text-[var(--tg-theme-text-color,#eee)] rounded-t-3xl sm:rounded-3xl shadow-2xl ring-1 ring-white/10 flex flex-col overflow-hidden"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex items-center gap-2 px-4 py-3 border-b border-white/10 shrink-0">
              <Sparkles size={18} className="text-amber-300" />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm">Разбор пути с Гуру</div>
                <div className="text-[11px] opacity-60">
                  Спокойный взгляд на твой путь. Это не диагноз и не пророчество.
                </div>
              </div>
              <button
                onClick={onClose}
                className="shrink-0 h-9 w-9 inline-flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10"
                aria-label="Закрыть"
              >
                <X size={18} />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 text-sm leading-relaxed">
              {!result && !loading && (
                <>
                  <p className="opacity-85">
                    Гуру бережно посмотрит на пройденный путь: главную тему, повторения,
                    змей как уроки и стрелы как дары. Всё в контексте твоей Санкальпы.
                  </p>
                  <label className="flex items-start gap-3 rounded-2xl bg-white/5 ring-1 ring-white/10 p-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeNotes}
                      onChange={(e) => setIncludeNotes(e.target.checked)}
                      className="mt-0.5 h-4 w-4 accent-amber-400"
                    />
                    <span>
                      <span className="block font-medium">Включить мои заметки в разбор</span>
                      <span className="block text-[11px] opacity-70 mt-0.5">
                        По умолчанию выключено. Если включишь — Гуру бережно учтёт до 10 последних заметок.
                      </span>
                    </span>
                  </label>
                </>
              )}

              {loading && (
                <div className="flex items-center gap-2 opacity-80 justify-center py-8">
                  <Loader2 size={16} className="animate-spin" />
                  <span>Гуру всматривается в путь…</span>
                </div>
              )}

              {error && (
                <div className="rounded-xl bg-rose-500/10 ring-1 ring-rose-400/30 text-rose-200 px-3 py-2 text-sm">
                  {error}
                </div>
              )}

              {result && (
                <div className="whitespace-pre-wrap leading-relaxed [&_h2]:hidden">
                  {result.split(/\n(?=##\s)/).map((section, i) => {
                    const m = section.match(/^##\s+(.+?)\n([\s\S]*)/);
                    if (!m) {
                      return (
                        <p key={i} className="opacity-85">
                          {section.trim()}
                        </p>
                      );
                    }
                    return (
                      <div key={i} className="mb-4">
                        <div className="text-amber-200 font-semibold text-sm mb-1">
                          {m[1].trim()}
                        </div>
                        <div className="opacity-90">{m[2].trim()}</div>
                      </div>
                    );
                  })}
                  <p className="text-[11px] opacity-60 mt-4">
                    Это одна из возможных оптик. Проверь это внутри себя.
                  </p>
                </div>
              )}
            </div>

            <footer className="shrink-0 px-4 py-3 border-t border-white/10 flex items-center gap-2 pb-safe">
              {!result ? (
                canAnalyze ? (
                  <button
                    onClick={handleAnalyze}
                    disabled={loading}
                    className="flex-1 h-12 rounded-2xl bg-gradient-to-r from-amber-300 to-amber-500 text-stone-900 font-semibold disabled:opacity-60 active:scale-[0.98] transition inline-flex items-center justify-center gap-2"
                  >
                    <Sparkles size={18} />
                    {loading ? "Гуру всматривается…" : "Разобрать путь"}
                  </button>
                ) : (
                  <button
                    onClick={() => { onClose(); openPaywallGlobal("path_analysis"); }}
                    className="flex-1 h-12 rounded-2xl bg-white/10 hover:bg-white/15 ring-1 ring-amber-300/40 text-amber-100 font-medium inline-flex items-center justify-center gap-2"
                  >
                    <Lock size={16} />
                    Открыть разбор пути за ⭐
                  </button>
                )
              ) : (
                <>
                  <button
                    onClick={onClose}
                    className="h-12 px-4 rounded-2xl bg-white/5 hover:bg-white/10 ring-1 ring-white/10"
                  >
                    Закрыть
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving || saved}
                    className="flex-1 h-12 rounded-2xl bg-white/10 hover:bg-white/15 ring-1 ring-amber-300/30 text-amber-100 font-medium disabled:opacity-70 inline-flex items-center justify-center gap-2"
                  >
                    {saved ? <Check size={18} /> : <BookmarkPlus size={18} />}
                    {saved ? "Сохранено в дневник" : saving ? "Сохраняю…" : "Сохранить разбор в дневник"}
                  </button>
                </>
              )}
            </footer>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

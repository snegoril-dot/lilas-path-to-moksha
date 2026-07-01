import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Loader2, ArrowRight } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { getPracticesForCell, DURATION_LABEL } from "@/content/practices";
import type { Practice, PracticeDuration } from "@/content/practices/types";
import { startPractice } from "@/lib/practices.functions";
import { haptic } from "@/hooks/use-telegram";
import { trackEvent } from "@/lib/analytics";

interface Props {
  cellId: number | null;
  sankalpa?: string;
  onClose: () => void;
  onStarted: () => void;
}

export function PracticeChooserSheet({ cellId, sankalpa, onClose, onStarted }: Props) {
  const open = cellId !== null;
  const practices = cellId ? getPracticesForCell(cellId) : [];
  const [selected, setSelected] = useState<Practice | null>(null);
  const [duration, setDuration] = useState<PracticeDuration | null>(null);
  const [bridge, setBridge] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const start = useServerFn(startPractice);

  function reset() {
    setSelected(null);
    setDuration(null);
    setBridge("");
    setErr(null);
  }

  async function confirm() {
    if (!selected || !duration || !cellId) return;
    setBusy(true);
    setErr(null);
    try {
      await start({
        data: {
          cellId,
          practiceId: selected.id,
          duration,
          sankalpaBridge: bridge.trim() || null,
        },
      });
      trackEvent("practice_started", {
        cell: cellId,
        extra: { duration, practiceId: selected.id },
      });
      haptic("medium");
      reset();
      onStarted();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Не удалось начать практику");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] bg-black/60 flex items-end sm:items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="w-full sm:max-w-md max-h-[92dvh] rounded-t-3xl sm:rounded-3xl bg-stone-900 text-stone-100 flex flex-col overflow-hidden shadow-2xl"
            initial={{ y: 40 }}
            animate={{ y: 0 }}
            exit={{ y: 40 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
              <h2 className="text-sm font-semibold">
                {selected ? "Санкальпа-мост" : "Взять клетку как практику"}
              </h2>
              <button
                onClick={onClose}
                className="p-2 -mr-1 rounded-full hover:bg-white/10 active:scale-95"
                aria-label="Закрыть"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 text-sm leading-relaxed">
              {!selected && (
                <>
                  <p className="opacity-80">
                    Практика — это не задание. Это способ побыть с темой клетки в
                    жизни: часом, днём или неделей. Между шагами — обычные дела.
                    Ты можешь вернуться, когда почувствуешь.
                  </p>
                  <div className="space-y-2">
                    {practices.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => {
                          haptic("light");
                          setSelected(p);
                          setDuration(p.durations[0]);
                        }}
                        className="w-full text-left rounded-2xl p-3 bg-white/5 hover:bg-white/10 ring-1 ring-white/10"
                      >
                        <div className="font-medium">{p.title}</div>
                        <div className="text-xs opacity-70 mt-1">{p.intention}</div>
                        <div className="text-[10px] opacity-60 mt-2">
                          {p.steps.length} шагов · {p.durations.map((d) => DURATION_LABEL[d]).join(" / ")}
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}

              {selected && (
                <>
                  <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-3">
                    <div className="text-xs uppercase tracking-wider opacity-60">Практика</div>
                    <div className="font-medium mt-1">{selected.title}</div>
                    <div className="text-xs opacity-75 mt-1">{selected.intention}</div>
                  </div>
                  <div>
                    <div className="text-xs opacity-70 mb-2">На сколько ты берёшь эту практику?</div>
                    <div className="grid grid-cols-4 gap-1.5">
                      {selected.durations.map((d) => (
                        <button
                          key={d}
                          onClick={() => setDuration(d)}
                          className={`h-9 rounded-xl text-xs ring-1 ${
                            duration === d
                              ? "bg-amber-300 text-stone-900 ring-amber-200"
                              : "bg-white/5 hover:bg-white/10 ring-white/10"
                          }`}
                        >
                          {DURATION_LABEL[d]}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs opacity-70 mb-2">
                      На что ты соглашаешься сейчас? (необязательно, только тебе)
                    </div>
                    {sankalpa && (
                      <div className="text-[11px] opacity-60 mb-1.5">
                        Твоя Санкальпа: {sankalpa}
                      </div>
                    )}
                    <textarea
                      value={bridge}
                      onChange={(e) => setBridge(e.target.value.slice(0, 400))}
                      rows={3}
                      placeholder="Например: «Замечать раздражение, но не догонять его»"
                      className="w-full bg-white/5 ring-1 ring-white/10 rounded-xl p-3 text-sm placeholder:opacity-40 focus:outline-none focus:ring-amber-300/50"
                    />
                  </div>
                  <div>
                    <div className="text-xs opacity-70 mb-2">Что ты будешь делать</div>
                    <ol className="space-y-1.5">
                      {selected.steps.map((s, i) => (
                        <li
                          key={i}
                          className="rounded-xl bg-white/5 ring-1 ring-white/10 p-2.5"
                        >
                          <div className="text-xs font-medium">{i + 1}. {s.title}</div>
                          {s.hint && <div className="text-[11px] opacity-70 mt-0.5">{s.hint}</div>}
                        </li>
                      ))}
                    </ol>
                  </div>
                  {err && <div className="text-xs text-rose-300">{err}</div>}
                </>
              )}
            </div>

            <div className="shrink-0 p-3 border-t border-white/5 bg-black/20">
              {!selected ? (
                <button
                  onClick={onClose}
                  className="w-full h-11 rounded-xl bg-white/5 hover:bg-white/10 ring-1 ring-white/10 text-sm"
                >
                  Продолжить без практики
                </button>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={reset}
                    disabled={busy}
                    className="h-11 rounded-xl bg-white/5 hover:bg-white/10 ring-1 ring-white/10 text-sm"
                  >
                    Назад
                  </button>
                  <button
                    onClick={confirm}
                    disabled={busy || !duration}
                    className="h-11 rounded-xl bg-amber-300 text-stone-900 font-semibold text-sm inline-flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    {busy ? <Loader2 size={16} className="animate-spin" /> : (
                      <>Начать практику <ArrowRight size={14} /></>
                    )}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

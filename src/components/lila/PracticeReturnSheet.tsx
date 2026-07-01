import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Loader2, Check } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { findPractice } from "@/content/practices";
import type { ActivePracticeRow } from "@/hooks/useActivePractice";
import { completePractice, abandonPractice, extendPractice } from "@/lib/practices.functions";
import { haptic } from "@/hooks/use-telegram";
import { trackEvent } from "@/lib/analytics";

interface Props {
  session: ActivePracticeRow | null;
  onClose: () => void;
  onCompleted: () => void;
}

const EMOTIONS = ["тишина", "тепло", "тяжесть", "ясность", "усталость", "радость", "грусть", "сила"];

export function PracticeReturnSheet({ session, onClose, onCompleted }: Props) {
  const open = session !== null;
  const practice = session ? findPractice(session.cell_id, session.practice_id) : null;
  const [reflection, setReflection] = useState("");
  const [resonance, setResonance] = useState<number | null>(null);
  const [emotions, setEmotions] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [step, setStep] = useState<"prompts" | "closing">("prompts");

  const complete = useServerFn(completePractice);
  const abandon = useServerFn(abandonPractice);
  const extend = useServerFn(extendPractice);

  function toggleEmotion(e: string) {
    setEmotions((prev) => (prev.includes(e) ? prev.filter((x) => x !== e) : [...prev, e]));
  }

  async function submit() {
    if (!session) return;
    setBusy(true);
    setErr(null);
    try {
      await complete({
        data: {
          sessionId: session.id,
          reflection: reflection.trim() || null,
          resonance,
          emotions,
        },
      });
      trackEvent("practice_completed", {
        cell: session.cell_id,
        extra: { resonance: resonance ?? 0, emotions: emotions.length },
      });
      haptic("medium");
      setStep("closing");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Не удалось сохранить");
    } finally {
      setBusy(false);
    }
  }

  async function doAbandon() {
    if (!session) return;
    setBusy(true);
    try {
      await abandon({ data: { sessionId: session.id } });
      trackEvent("practice_abandoned", { cell: session.cell_id });
      onCompleted();
    } finally {
      setBusy(false);
    }
  }

  async function doExtend() {
    if (!session) return;
    setBusy(true);
    try {
      await extend({ data: { sessionId: session.id, extra: "1d" } });
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <AnimatePresence>
      {open && session && (
        <motion.div
          className="fixed inset-0 z-[65] bg-black/60 flex items-end sm:items-center justify-center"
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
                {step === "prompts" ? "Возвращение" : "Ритуал завершения"}
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
              {step === "prompts" && (
                <>
                  {session.sankalpa_bridge && (
                    <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-3 text-xs opacity-80">
                      Твоё намерение: {session.sankalpa_bridge}
                    </div>
                  )}
                  {practice && (
                    <div>
                      <div className="text-xs opacity-70 mb-2">Подсказки для размышления</div>
                      <ul className="space-y-1.5">
                        {practice.reflectionPrompts.map((q, i) => (
                          <li
                            key={i}
                            className="rounded-xl bg-white/5 ring-1 ring-white/10 p-2.5 text-xs"
                          >
                            {q}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div>
                    <div className="text-xs opacity-70 mb-2">Что осталось в тебе</div>
                    <textarea
                      value={reflection}
                      onChange={(e) => setReflection(e.target.value.slice(0, 3000))}
                      rows={5}
                      placeholder="Одна фраза, наблюдение, картинка…"
                      className="w-full bg-white/5 ring-1 ring-white/10 rounded-xl p-3 text-sm placeholder:opacity-40 focus:outline-none focus:ring-amber-300/50"
                    />
                    <div className="text-[10px] opacity-50 text-right mt-1">{reflection.length}/3000</div>
                  </div>
                  <div>
                    <div className="text-xs opacity-70 mb-2">Резонанс</div>
                    <div className="grid grid-cols-5 gap-1.5">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          onClick={() => setResonance(n)}
                          className={`h-10 rounded-xl text-sm ring-1 ${
                            resonance === n
                              ? "bg-amber-300 text-stone-900 ring-amber-200"
                              : "bg-white/5 hover:bg-white/10 ring-white/10"
                          }`}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs opacity-70 mb-2">Что чувствуешь</div>
                    <div className="flex flex-wrap gap-1.5">
                      {EMOTIONS.map((e) => (
                        <button
                          key={e}
                          onClick={() => toggleEmotion(e)}
                          className={`px-3 h-8 rounded-full text-xs ring-1 ${
                            emotions.includes(e)
                              ? "bg-amber-300/20 ring-amber-200/60 text-amber-100"
                              : "bg-white/5 hover:bg-white/10 ring-white/10"
                          }`}
                        >
                          {e}
                        </button>
                      ))}
                    </div>
                  </div>
                  {err && <div className="text-xs text-rose-300">{err}</div>}
                </>
              )}

              {step === "closing" && practice && (
                <div className="space-y-4 text-center py-6">
                  <div className="mx-auto w-12 h-12 rounded-full bg-amber-300/20 flex items-center justify-center">
                    <Check size={22} className="text-amber-200" />
                  </div>
                  <div className="text-sm opacity-90 leading-relaxed">
                    {practice.closingRitual}
                  </div>
                  <div className="text-xs opacity-60">
                    Теперь ты можешь бросить кубик и продолжить путь.
                  </div>
                </div>
              )}
            </div>

            <div className="shrink-0 p-3 border-t border-white/5 bg-black/20">
              {step === "prompts" ? (
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={doAbandon}
                    disabled={busy}
                    className="h-11 rounded-xl bg-white/5 hover:bg-white/10 ring-1 ring-white/10 text-xs"
                  >
                    Завершить
                  </button>
                  <button
                    onClick={doExtend}
                    disabled={busy}
                    className="h-11 rounded-xl bg-white/5 hover:bg-white/10 ring-1 ring-white/10 text-xs"
                  >
                    +1 день
                  </button>
                  <button
                    onClick={submit}
                    disabled={busy}
                    className="h-11 rounded-xl bg-amber-300 text-stone-900 font-semibold text-sm inline-flex items-center justify-center disabled:opacity-50"
                  >
                    {busy ? <Loader2 size={16} className="animate-spin" /> : "Сохранить"}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    onCompleted();
                  }}
                  className="w-full h-11 rounded-xl bg-amber-300 text-stone-900 font-semibold text-sm"
                >
                  Продолжить путь
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

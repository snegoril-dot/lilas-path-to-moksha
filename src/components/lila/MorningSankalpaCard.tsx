import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sunrise, Check, X } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { pickTodayMorningQuestion } from "@/content/morning-sankalpa";
import { saveMorningSankalpa, getTodayMorningSankalpa } from "@/lib/morning-sankalpa.functions";
import { useAuth } from "@/hooks/use-auth";
import { trackEvent } from "@/lib/analytics";

const DISMISS_KEY = "lila:morning:dismissed";

export function MorningSankalpaCard() {
  const { ready, userId } = useAuth();
  const save = useServerFn(saveMorningSankalpa);
  const check = useServerFn(getTodayMorningSankalpa);

  const { text: question, dateKey } = pickTodayMorningQuestion();
  const [visible, setVisible] = useState(false);
  const [answer, setAnswer] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!ready || !userId) return;
    if (typeof window === "undefined") return;
    const dismissed = window.localStorage.getItem(DISMISS_KEY);
    if (dismissed === dateKey) return;
    let cancelled = false;
    check({})
      .then((row) => {
        if (cancelled) return;
        if (row) {
          setSaved(true);
        }
        setVisible(true);
        trackEvent("morning_sankalpa_shown");
      })
      .catch(() => {
        if (!cancelled) setVisible(true);
      });
    return () => {
      cancelled = true;
    };
  }, [ready, userId, dateKey, check]);

  if (!visible) return null;

  const handleDismiss = () => {
    try {
      window.localStorage.setItem(DISMISS_KEY, dateKey);
    } catch {}
    setVisible(false);
  };

  const handleSave = async () => {
    if (!answer.trim() || saving) return;
    setSaving(true);
    try {
      await save({ data: { text: answer.trim(), question } });
      setSaved(true);
      trackEvent("morning_sankalpa_saved");
      try {
        window.localStorage.setItem(DISMISS_KEY, dateKey);
      } catch {}
      setTimeout(() => setVisible(false), 1200);
    } catch (e) {
      console.error("[morning sankalpa]", e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        className="w-full max-w-sm mx-auto rounded-2xl bg-gradient-to-br from-amber-500/15 to-rose-500/10 ring-1 ring-amber-300/25 p-4 text-left"
      >
        <div className="flex items-center gap-2 text-amber-200 text-xs uppercase tracking-wider">
          <Sunrise size={14} />
          Утренняя Санкальпа
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Скрыть"
            className="ml-auto p-1 rounded-full hover:bg-white/10 opacity-60 hover:opacity-100"
          >
            <X size={14} />
          </button>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-amber-50/95">{question}</p>

        {saved ? (
          <div className="mt-3 flex items-center gap-2 text-xs text-emerald-200">
            <Check size={14} /> Ответ сохранён в истории Санкальп.
          </div>
        ) : (
          <>
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value.slice(0, 400))}
              rows={2}
              placeholder="Один-два предложения — этого достаточно."
              className="mt-3 w-full rounded-xl bg-black/25 ring-1 ring-white/10 focus:ring-amber-300/40 outline-none px-3 py-2 text-sm placeholder:text-white/30 resize-none"
            />
            <div className="mt-2 flex items-center justify-between gap-2">
              <span className="text-[11px] opacity-60">{answer.length}/400 · остаётся приватным</span>
              <button
                type="button"
                onClick={handleSave}
                disabled={!answer.trim() || saving}
                className="px-3 py-1.5 rounded-lg bg-amber-400 text-stone-900 text-xs font-medium disabled:opacity-40"
              >
                {saving ? "Сохраняю…" : "Сохранить"}
              </button>
            </div>
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

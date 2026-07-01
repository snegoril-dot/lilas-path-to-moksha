import { AnimatePresence, motion } from "framer-motion";
import { Star, X, Check } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useDialogA11y } from "@/hooks/use-dialog-a11y";
import { useTelegramBackButton, hapticNotify } from "@/hooks/use-telegram";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/analytics";

export interface FeedbackModalProps {
  open: boolean;
  onClose: () => void;
  /** Where in the app the modal was opened from (analytics only, not user text). */
  context?: string;
  /** Optional current cell id, if opened during a session. */
  cell?: number | null;
  /** Optional current session id (uuid). */
  sessionId?: string | null;
}

const MAX = 1000;
const APP_VERSION =
  (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_APP_VERSION ?? "dev";

function detectPlatform(): "telegram" | "browser" {
  try {
    if (typeof window !== "undefined" && (window as unknown as { Telegram?: unknown }).Telegram) {
      return "telegram";
    }
  } catch {}
  return "browser";
}

export function FeedbackModal({ open, onClose, context, cell, sessionId }: FeedbackModalProps) {
  useTelegramBackButton(open, onClose);
  const ref = useRef<HTMLDivElement>(null);
  useDialogA11y(open, ref);

  const [rating, setRating] = useState<number | null>(null);
  const [understood, setUnderstood] = useState("");
  const [confused, setConfused] = useState("");
  const [resonated, setResonated] = useState("");
  const [improve, setImprove] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "sent" | "error">("idle");

  useEffect(() => {
    if (open) {
      setStatus("idle");
      trackEvent("feedback_opened", { cell: cell ?? null, sessionId: sessionId ?? null, extra: { context: context ?? "unknown" } });
    }
  }, [open, context, cell, sessionId]);

  const clip = (v: string) => v.slice(0, MAX);

  const submit = async () => {
    if (status === "saving") return;
    setStatus("saving");
    try {
      const { data: userRes } = await supabase.auth.getUser().catch(() => ({ data: { user: null } as { user: null } }));
      const user = userRes?.user ?? null;
      const payload = {
        user_id: user?.id ?? null,
        anon_id: user ? null : (typeof window !== "undefined" ? window.localStorage.getItem("lila.analytics.anon_id") : null),
        session_id: sessionId ?? null,
        cell: cell ?? null,
        rating,
        understood: understood.trim() || null,
        confused: confused.trim() || null,
        resonated: resonated.trim() || null,
        improve: improve.trim() || null,
        app_version: APP_VERSION,
        platform: detectPlatform(),
        context: context ?? null,
      };
      const { error } = await supabase.from("beta_feedback").insert(payload as never);
      if (error) throw error;
      hapticNotify("success");
      trackEvent("feedback_submitted", {
        cell: cell ?? null,
        sessionId: sessionId ?? null,
        extra: {
          context: context ?? "unknown",
          rating: rating ?? 0,
          has_understood: !!understood.trim(),
          has_confused: !!confused.trim(),
          has_resonated: !!resonated.trim(),
          has_improve: !!improve.trim(),
        },
      });
      setStatus("sent");
      setTimeout(() => {
        setRating(null);
        setUnderstood("");
        setConfused("");
        setResonated("");
        setImprove("");
        onClose();
      }, 1200);
    } catch {
      setStatus("error");
    }
  };

  const canSubmit =
    rating !== null ||
    understood.trim() ||
    confused.trim() ||
    resonated.trim() ||
    improve.trim();

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label="Оставить отзыв"
        >
          <motion.div
            ref={ref}
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 260 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-lg max-h-[92dvh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-[var(--tg-theme-bg-color,#0f172a)] text-[var(--tg-theme-text-color,#fff)] p-5 pb-safe shadow-2xl"
            tabIndex={-1}
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <h2 className="text-lg font-semibold">Оставить отзыв</h2>
                <p className="text-sm opacity-70 mt-1">
                  Игра находится в бета-версии. Твой отзыв помогает ей стать теплее и яснее.
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 -m-2 opacity-70 hover:opacity-100"
                aria-label="Закрыть"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <div className="text-sm mb-2 opacity-80">Оценка (по желанию)</div>
                <div className="flex gap-1.5" role="radiogroup" aria-label="Оценка от 1 до 5">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      role="radio"
                      aria-checked={rating === n}
                      onClick={() => setRating((r) => (r === n ? null : n))}
                      className="p-1.5 rounded-lg hover:bg-white/5 transition"
                    >
                      <Star
                        size={26}
                        className={rating !== null && n <= rating ? "fill-amber-300 stroke-amber-300" : "opacity-40"}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <Field
                label="Что было понятно?"
                value={understood}
                onChange={(v) => setUnderstood(clip(v))}
                placeholder="Например: как бросать кубик, что такое Санкальпа…"
              />
              <Field
                label="Где ты запутался?"
                value={confused}
                onChange={(v) => setConfused(clip(v))}
                placeholder="Что показалось непонятным или сложным?"
              />
              <Field
                label="Какая клетка или момент откликнулись?"
                value={resonated}
                onChange={(v) => setResonated(clip(v))}
                placeholder="Что тронуло, показалось точным?"
              />
              <Field
                label="Что хотелось бы улучшить?"
                value={improve}
                onChange={(v) => setImprove(clip(v))}
                placeholder="Идеи, пожелания, чего не хватает."
              />

              {status === "error" && (
                <div className="text-sm rounded-lg bg-rose-500/15 text-rose-100 px-3 py-2">
                  Не получилось отправить. Попробуй ещё раз чуть позже.
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-sm"
                >
                  Не сейчас
                </button>
                <button
                  type="button"
                  onClick={submit}
                  disabled={!canSubmit || status === "saving" || status === "sent"}
                  className="flex-1 py-3 rounded-xl bg-[var(--tg-theme-button-color,#3b82f6)] text-[var(--tg-theme-button-text-color,#fff)] text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {status === "sent" ? (
                    <><Check size={16} /> Спасибо!</>
                  ) : status === "saving" ? (
                    "Отправляю…"
                  ) : (
                    "Отправить"
                  )}
                </button>
              </div>

              <p className="text-[11px] opacity-50 text-center pt-1">
                Мы не собираем персональные данные. Отзыв анонимный.
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <div className="text-sm mb-1.5 opacity-80">{label}</div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={2}
        maxLength={MAX}
        className="w-full text-[16px] rounded-xl bg-white/5 border border-white/10 focus:border-white/25 outline-none px-3 py-2 resize-none"
      />
    </label>
  );
}

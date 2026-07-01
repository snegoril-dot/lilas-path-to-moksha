import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useDialogA11y } from "@/hooks/use-dialog-a11y";
import { useServerFn } from "@tanstack/react-start";
import { saveReflection } from "@/lib/guru.functions";
import { useTelegramBackButton, hapticNotify, haptic } from "@/hooks/use-telegram";

export interface ReflectionPayload {
  fromId: number;
  fromName: string;
  toId: number;
  toName: string;
  kind: "snake" | "ladder";
}

export function ReflectionModal({
  data,
  sankalpa,
  sessionId,
  onSubmit,
  onSkip,
}: {
  data: ReflectionPayload | null;
  sankalpa?: string;
  sessionId?: string | null;
  onSubmit: (note: string) => void;
  onSkip: () => void;
}) {
  const open = !!data;
  const { initialRef } = useDialogA11y(open, onSkip);
  useTelegramBackButton(open, onSkip);
  const [note, setNote] = useState("");
  const [aiText, setAiText] = useState<string | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiErr, setAiErr] = useState<string | null>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const titleId = "reflection-modal-title";
  const save = useServerFn(saveReflection);
  const journalKind: "snake_lesson" | "ladder_gift" =
    data?.kind === "snake" ? "snake_lesson" : "ladder_gift";

  useEffect(() => {
    if (open) {
      setNote("");
      setAiText(null);
      setAiErr(null);
      setTimeout(() => taRef.current?.focus(), 50);
    }
  }, [open]);

  const askGuru = async () => {
    if (!data) return;
    setAiBusy(true);
    setAiErr(null);
    try {
      const row = await save({
        data: {
          sessionId: sessionId ?? null,
          cell: data.fromId,
          userText: note.trim(),
          sankalpa,
          prompt: data.kind === "snake" ? "Урок змеи" : "Дар лестницы",
          withAi: true,
          kind: "guru_note",
        },
      });
      setAiText((row as { ai_reflection: string | null }).ai_reflection ?? null);
    } catch (e) {
      console.error("[guru ask]", e);
      setAiErr("Гуру сейчас молчит. Попробуй вернуться к вопросу чуть позже.");
    } finally {
      setAiBusy(false);
    }
  };

  const handleSubmit = async () => {
    if (!data) return;
    hapticNotify("success");
    const trimmed = note.trim();
    if (trimmed.length > 0) {
      try {
        await save({
          data: {
            sessionId: sessionId ?? null,
            cell: data.fromId,
            userText: trimmed,
            sankalpa,
            prompt: data.kind === "snake" ? "Урок змеи" : "Дар лестницы",
            withAi: false,
            kind: journalKind,
          },
        });
        // очищаем локальный черновик после успешного сохранения
        try { localStorage.removeItem(`lila.reflection.draft.${data.fromId}`); } catch {}
      } catch (e) {
        console.error("[reflection save]", e);
        // Сохраняем черновик локально до восстановления связи
        try {
          localStorage.setItem(
            `lila.reflection.draft.${data.fromId}`,
            JSON.stringify({ text: trimmed, at: new Date().toISOString(), kind: journalKind })
          );
        } catch {}
      }
    }
    onSubmit(trimmed);
  };

  return (
    <AnimatePresence>
      {data && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
          onClick={onSkip}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: "spring", stiffness: 280, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-3xl bg-[var(--lila-surface)] text-[var(--tg-theme-text-color,#fff)] p-6 shadow-2xl ring-1 ring-white/10 max-h-[85vh] overflow-y-auto"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="text-xs opacity-60">
                  {data.kind === "snake" ? "🐍 Урок змеи" : "🪜 Дар лестницы"}
                </div>
                <h3 id={titleId} className="text-lg font-semibold leading-tight">
                  {data.fromName}
                  <span className="opacity-50"> → </span>
                  {data.toName}
                </h3>
              </div>
              <button
                ref={initialRef}
                onClick={onSkip}
                aria-label="Пропустить"
                className="p-1 rounded-full hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-amber-300 focus:outline-none"
              >
                <X size={20} />
              </button>
            </div>

            <p className="text-sm opacity-80 leading-relaxed">
              Гуру предлагает вопрос:{" "}
              <i>
                «{data.kind === "snake"
                  ? "Где в твоей жизни сейчас может жить эта тема? Что она у тебя забирает, если посмотреть честно?"
                  : "Какое качество в тебе сейчас откликается на эту тему и просит выражения?"}»
              </i>
            </p>

            {sankalpa && (
              <div className="mt-3 rounded-xl bg-amber-300/10 ring-1 ring-amber-300/20 px-3 py-2 text-xs text-amber-100/90">
                <span className="opacity-60">Санкальпа: </span>«{sankalpa}»
              </div>
            )}

            <label className="block mt-4">
              <span className="text-xs uppercase tracking-wider opacity-60">
                Твоя заметка
              </span>
              <textarea
                ref={taRef}
                value={note}
                onChange={(e) => setNote(e.target.value.slice(0, 400))}
                rows={4}
                placeholder="Несколько слов от сердца. Можно оставить пустым."
                className="mt-1 w-full rounded-2xl bg-black/20 border border-white/10 px-3 py-2 text-sm placeholder:opacity-40 focus:outline-none focus:ring-2 focus:ring-amber-400/60 resize-none"
              />
              <div className="text-[10px] opacity-40 text-right mt-1">
                {note.length}/400
              </div>
            </label>

            {aiText && (
              <div className="mt-3 rounded-2xl bg-amber-300/5 ring-1 ring-amber-300/20 px-3 py-2.5 text-xs leading-relaxed text-amber-100/90 whitespace-pre-wrap">
                <span className="opacity-60">🕉 Гуру: </span>
                {aiText}
              </div>
            )}
            {aiErr && (
              <div className="mt-2 text-xs text-rose-300">Гуру пока не отвечает: {aiErr}</div>
            )}

            <div className="mt-4 grid grid-cols-1 gap-2">
              <button
                onClick={() => { haptic("light"); askGuru(); }}
                disabled={aiBusy}
                className="inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-sm font-medium transition disabled:opacity-50"
              >
                <Sparkles size={14} />
                {aiBusy ? "Гуру слушает…" : aiText ? "Спросить ещё раз" : "Услышать отклик Гуру"}
              </button>
              <div className="flex gap-2">
                <button
                  onClick={onSkip}
                  className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-sm font-medium transition"
                >
                  Пропустить
                </button>
                <button
                  onClick={handleSubmit}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-300 to-amber-500 text-stone-900 font-semibold text-sm shadow active:scale-95 transition"
                >
                  Сохранить и идти дальше
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

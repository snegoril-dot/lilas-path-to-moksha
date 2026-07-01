import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, BookmarkPlus, Check, Send, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useDialogA11y } from "@/hooks/use-dialog-a11y";
import { useTelegramBackButton, haptic, hapticNotify } from "@/hooks/use-telegram";
import { supabase } from "@/integrations/supabase/client";
import { saveReflection } from "@/lib/guru.functions";
import { trackEvent } from "@/lib/analytics";
import { getGuruCellAnswer } from "@/content/guru-cell-answers";


export type GuruEventKind = "normal" | "snake" | "ladder" | "moksha" | "waiting";

export interface GuruChatContext {
  cell: number;
  cellName?: string;
  sankalpa?: string;
  sessionId?: string | null;
  eventKind?: GuruEventKind;
  /** Passed once when opening from a note the user chose to include. */
  includeLastReflection?: string;
  /** Auto-sent as the first user message when the sheet opens (e.g. quick prompt). */
  initialPrompt?: string;
  recentPath?: Array<{ cell: number; kind: string; to?: number }>;
}

const QUICK_PROMPTS: Record<GuruEventKind, string[]> = {
  normal: [
    "Что эта клетка показывает в моей Санкальпе?",
    "Какой вопрос мне стоит себе задать?",
    "Что здесь является тенью, а что даром?",
  ],
  snake: [
    "Что эта змея возвращает мне для осознания?",
    "Какое качество я не хочу видеть в себе сейчас?",
  ],
  ladder: [
    "Какое качество помогло мне подняться?",
    "Как удержать это состояние в жизни?",
  ],
  moksha: [
    "Что я забираю с этого пути?",
    "Что во мне освободилось?",
  ],
  waiting: [
    "Что означает моё ожидание входа в игру?",
    "Как я обычно встречаю неопределённость?",
  ],
};

const EVENT_BADGE: Record<GuruEventKind, { label: string; cls: string } | null> = {
  normal: null,
  snake: { label: "🐍 Змея", cls: "bg-rose-500/20 ring-rose-300/40 text-rose-100" },
  ladder: { label: "🪜 Стрела", cls: "bg-emerald-500/20 ring-emerald-300/40 text-emerald-100" },
  moksha: { label: "✨ Мокша", cls: "bg-amber-400/25 ring-amber-200/50 text-amber-100" },
  waiting: { label: "⏳ Ожидание", cls: "bg-sky-500/20 ring-sky-300/40 text-sky-100" },
};

export function GuruChatSheet({
  ctx,
  onClose,
}: {
  ctx: GuruChatContext | null;
  onClose: () => void;
}) {
  const open = !!ctx;
  const { initialRef } = useDialogA11y(open, onClose);
  useTelegramBackButton(open, onClose);
  const [input, setInput] = useState("");
  const [savedMsgIds, setSavedMsgIds] = useState<Set<string>>(new Set());
  const [saveErr, setSaveErr] = useState<string | null>(null);
  const persist = useServerFn(saveReflection);
  const titleId = "guru-chat-title";
  const eventKind: GuruEventKind = ctx?.eventKind ?? "normal";

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/guru/chat",
        fetch: async (input, init) => {
          const { data } = await supabase.auth.getSession();
          const token = data.session?.access_token;
          const headers = new Headers(init?.headers);
          if (token) headers.set("Authorization", `Bearer ${token}`);
          return fetch(input, { ...init, headers });
        },
        prepareSendMessagesRequest: ({ messages }) => ({
          body: {
            messages,
            cell: ctx?.cell,
            sankalpa: ctx?.sankalpa,
            eventKind: ctx?.eventKind,
            includeLastReflection: ctx?.includeLastReflection,
            recentPath: ctx?.recentPath,
          },
        }),
      }),
    [ctx?.cell, ctx?.sankalpa, ctx?.eventKind, ctx?.includeLastReflection, ctx?.recentPath]
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { messages, sendMessage, status, error, setMessages } = useChat({ transport: transport as any });
  const scrollRef = useRef<HTMLDivElement>(null);
  const autoSentKey = useRef<string | null>(null);

  useEffect(() => {
    if (!open) {
      setMessages([]);
      setSavedMsgIds(new Set());
      setSaveErr(null);
      autoSentKey.current = null;
    }
  }, [open, ctx?.cell, setMessages]);

  // Auto-send initial prompt once per open
  useEffect(() => {
    if (!open || !ctx?.initialPrompt) return;
    const key = `${ctx.cell}:${ctx.initialPrompt}`;
    if (autoSentKey.current === key) return;
    autoSentKey.current = key;
    sendMessage({ text: ctx.initialPrompt });
  }, [open, ctx?.cell, ctx?.initialPrompt, sendMessage]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const busy = status === "submitted" || status === "streaming";

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    trackEvent("guru_message_sent", { cell: ctx?.cell ?? null, sessionId: ctx?.sessionId ?? null, extra: { length: text.length, quick: false } });
    sendMessage({ text });
  };

  const sendQuick = (text: string) => {
    if (busy) return;
    haptic("light");
    trackEvent("guru_message_sent", { cell: ctx?.cell ?? null, sessionId: ctx?.sessionId ?? null, extra: { length: text.length, quick: true } });
    sendMessage({ text });
  };


  const saveAnswerToJournal = async (msgId: string, text: string) => {
    if (!ctx || savedMsgIds.has(msgId) || !text.trim()) return;
    setSaveErr(null);
    try {
      await persist({
        data: {
          sessionId: ctx.sessionId ?? null,
          cell: ctx.cell,
          userText: text.slice(0, 1200),
          withAi: false,
          prompt: "Ответ ИИ-Гуру",
          sankalpa: ctx.sankalpa || undefined,
          kind: "guru_note",
        },
      });
      hapticNotify("success");
      setSavedMsgIds((prev) => new Set(prev).add(msgId));
    } catch (e) {
      hapticNotify("error");
      setSaveErr(e instanceof Error ? e.message : "Не удалось сохранить");
    }
  };

  const badge = EVENT_BADGE[eventKind];
  const prompts = QUICK_PROMPTS[eventKind];

  return (
    <AnimatePresence>
      {ctx && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            transition={{ type: "spring", stiffness: 280, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md h-[85dvh] sm:h-[640px] rounded-t-3xl sm:rounded-3xl bg-[var(--lila-surface)] text-[var(--tg-theme-text-color,#fff)] shadow-2xl ring-1 ring-white/10 flex flex-col"
          >
            <div className="flex items-start justify-between p-4 border-b border-white/5 shrink-0 gap-2">
              <div className="min-w-0 flex-1">
                <h3 id={titleId} className="text-base font-semibold flex items-center gap-2">
                  <span className="inline-block h-7 w-7 rounded-full bg-gradient-to-br from-amber-300 to-amber-600 flex items-center justify-center text-sm shrink-0">
                    🕉
                  </span>
                  ИИ-Гуру
                </h3>
                <div className="text-[11px] opacity-70 mt-1 flex items-center gap-1.5 flex-wrap">
                  <span>
                    Отвечает на клетке {ctx.cell}
                    {ctx.cellName ? ` · ${ctx.cellName}` : ""}
                  </span>
                  {badge && (
                    <span className={`px-1.5 py-0.5 rounded-full ring-1 text-[10px] ${badge.cls}`}>
                      {badge.label}
                    </span>
                  )}
                </div>
              </div>
              <button
                ref={initialRef}
                onClick={onClose}
                aria-label="Вернуться к клетке"
                title="Вернуться к клетке"
                className="p-1 rounded-full hover:bg-white/10 inline-flex items-center gap-1 text-xs opacity-80"
              >
                <ArrowLeft size={16} />
                <span className="hidden sm:inline">К клетке</span>
                <X size={18} className="sm:hidden" />
              </button>
            </div>

            <div
              ref={scrollRef}
              className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-3"
              role="log"
              aria-live="polite"
            >
              {messages.length === 0 && (
                <div className="space-y-3">
                  <div className="text-sm opacity-70 leading-relaxed">
                    Гуру здесь — это зеркало, а не оракул. Его ответы — повод
                    задать себе более честный вопрос, а не готовая истина.
                  </div>
                  {ctx && (() => {
                    const a = getGuruCellAnswer(ctx.cell);
                    return (
                      <div className="rounded-2xl bg-amber-300/5 ring-1 ring-amber-300/20 px-3.5 py-3 space-y-2">
                        <div className="text-[10px] uppercase tracking-wider text-amber-200/70">
                          Слово Гуру · клетка {ctx.cell}
                          {ctx.cellName ? ` · ${ctx.cellName}` : ""}
                        </div>
                        <p className="text-sm leading-relaxed text-amber-50/90 whitespace-pre-wrap">
                          {a.mirror}
                        </p>
                        <p className="text-sm leading-relaxed text-amber-100 italic">
                          {a.question}
                        </p>
                      </div>
                    );
                  })()}
                  <div className="text-[11px] uppercase tracking-wider opacity-50">
                    С чего можно начать
                  </div>
                  <div className="flex flex-col gap-2">
                    {prompts.map((p) => (
                      <button
                        key={p}
                        onClick={() => sendQuick(p)}
                        disabled={busy}
                        className="text-left text-sm rounded-2xl bg-amber-300/10 hover:bg-amber-300/20 ring-1 ring-amber-300/30 text-amber-100 px-3 py-2 transition disabled:opacity-50"
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map((m) => {
                const text =
                  m.parts?.map((p) => (p.type === "text" ? p.text : "")).join("") ||
                  ("content" in m ? String((m as { content?: string }).content ?? "") : "");
                const isUser = m.role === "user";
                const isSaved = savedMsgIds.has(m.id);
                return (
                  <div
                    key={m.id}
                    className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-snug whitespace-pre-wrap ${
                        isUser
                          ? "bg-[var(--tg-theme-button-color,#2481cc)] text-[var(--tg-theme-button-text-color,#fff)] rounded-br-md"
                          : "bg-[var(--lila-bubble-bg)] text-[var(--lila-bubble-fg)] rounded-bl-md"
                      }`}
                    >
                      {text}
                    </div>
                    {!isUser && text.trim() && !busy && (
                      <button
                        onClick={() => saveAnswerToJournal(m.id, text)}
                        disabled={isSaved}
                        className="mt-1 ml-1 inline-flex items-center gap-1 text-[11px] text-amber-200/80 hover:text-amber-100 disabled:opacity-70"
                      >
                        {isSaved ? (
                          <>
                            <Check size={12} /> Сохранено в дневник
                          </>
                        ) : (
                          <>
                            <BookmarkPlus size={12} /> Сохранить ответ в дневник
                          </>
                        )}
                      </button>
                    )}
                  </div>
                );
              })}
              {busy && (
                <div className="text-xs opacity-50 italic">Гуру размышляет…</div>
              )}
              {saveErr && (
                <div className="text-xs text-rose-300 bg-rose-500/10 rounded-xl px-3 py-2">
                  {saveErr}
                </div>
              )}
              {error && (
                <div className="text-xs text-rose-300 bg-rose-500/10 rounded-xl px-3 py-2">
                  {error.message?.includes("429")
                    ? "Достигнут дневной лимит сообщений Гуру. Возвращайся завтра."
                    : error.message?.includes("401")
                      ? "Нужен вход в приложение, чтобы говорить с Гуру."
                      : "Гуру сейчас молчит. Попробуй вернуться к вопросу чуть позже."}
                </div>
              )}
            </div>

            <form
              onSubmit={submit}
              className="p-3 border-t border-white/5 flex items-center gap-2 shrink-0"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Спроси Гуру…"
                disabled={busy}
                className="flex-1 rounded-2xl bg-black/20 border border-white/10 px-3 py-2.5 text-sm placeholder:opacity-40 focus:outline-none focus:ring-2 focus:ring-amber-400/60"
              />
              <button
                type="submit"
                disabled={busy || !input.trim()}
                aria-label="Отправить"
                className="p-2.5 rounded-2xl bg-gradient-to-r from-amber-300 to-amber-500 text-stone-900 disabled:opacity-40 active:scale-95"
              >
                <Send size={18} />
              </button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

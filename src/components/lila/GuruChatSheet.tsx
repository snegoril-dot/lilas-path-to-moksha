import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { AnimatePresence, motion } from "framer-motion";
import { Send, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useDialogA11y } from "@/hooks/use-dialog-a11y";
import { supabase } from "@/integrations/supabase/client";

export interface GuruChatContext {
  cell: number;
  cellName?: string;
  sankalpa?: string;
  recentPath?: Array<{ cell: number; kind: string; to?: number }>;
}

export function GuruChatSheet({
  ctx,
  onClose,
}: {
  ctx: GuruChatContext | null;
  onClose: () => void;
}) {
  const open = !!ctx;
  const { initialRef } = useDialogA11y(open, onClose);
  const [input, setInput] = useState("");
  const titleId = "guru-chat-title";

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
            recentPath: ctx?.recentPath,
          },
        }),
      }),
    [ctx?.cell, ctx?.sankalpa, ctx?.recentPath]
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { messages, sendMessage, status, error, setMessages } = useChat({ transport: transport as any });
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) setMessages([]);
  }, [open, ctx?.cell, setMessages]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const busy = status === "submitted" || status === "streaming";

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    sendMessage({ text });
  };

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
            <div className="flex items-start justify-between p-4 border-b border-white/5 shrink-0">
              <div>
                <h3 id={titleId} className="text-base font-semibold flex items-center gap-2">
                  <span className="inline-block h-7 w-7 rounded-full bg-gradient-to-br from-amber-300 to-amber-600 flex items-center justify-center text-sm">
                    🕉
                  </span>
                  ИИ-Гуру
                </h3>
                <div className="text-[11px] opacity-60 mt-0.5">
                  Контекст: клетка {ctx.cell}
                  {ctx.cellName ? ` · ${ctx.cellName}` : ""}
                </div>
              </div>
              <button
                ref={initialRef}
                onClick={onClose}
                aria-label="Закрыть"
                className="p-1 rounded-full hover:bg-white/10"
              >
                <X size={20} />
              </button>
            </div>

            <div
              ref={scrollRef}
              className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-3"
              role="log"
              aria-live="polite"
            >
              {messages.length === 0 && (
                <div className="text-sm opacity-60 leading-relaxed">
                  Спроси Гуру о текущей клетке, своей Санкальпе или о том, что зеркалит твоя
                  жизнь сейчас. Это AI-ассистент, а не духовный учитель — используй ответы как
                  повод для размышления.
                </div>
              )}
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-snug whitespace-pre-wrap ${
                      m.role === "user"
                        ? "bg-[var(--tg-theme-button-color,#2481cc)] text-[var(--tg-theme-button-text-color,#fff)] rounded-br-md"
                        : "bg-[var(--lila-bubble-bg)] text-[var(--lila-bubble-fg)] rounded-bl-md"
                    }`}
                  >
                    {m.parts
                      ?.map((p) => (p.type === "text" ? p.text : ""))
                      .join("") ||
                      ("content" in m ? String((m as { content?: string }).content ?? "") : "")}
                  </div>
                </div>
              ))}
              {busy && (
                <div className="text-xs opacity-50 italic">Гуру размышляет…</div>
              )}
              {error && (
                <div className="text-xs text-rose-300 bg-rose-500/10 rounded-xl px-3 py-2">
                  Гуру сейчас не отвечает. {error.message?.includes("429")
                    ? "Слишком много запросов — попробуй позже."
                    : error.message?.includes("402")
                      ? "Закончились AI-кредиты."
                      : "Попробуй ещё раз."}
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

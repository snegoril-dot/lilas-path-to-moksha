import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef } from "react";

export interface ChatMessage {
  id: string;
  text: string;
  kind: "guru" | "system" | "player";
}

export function ChatFeed({ messages }: { messages: ChatMessage[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    bottomRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [messages]);

  return (
    <div
      ref={ref}
      data-testid="chat-feed"
      role="log"
      aria-live="polite"
      aria-relevant="additions"
      aria-label="Сообщения Гуру"
      className="relative z-10 flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 py-3 space-y-3 bg-[var(--lila-bg)] [scroll-padding-bottom:5rem]"
    >
      <AnimatePresence initial={false}>
        {messages.map((m) => (
          <motion.div
            key={m.id}
            data-testid="chat-message"
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
            className={`flex ${m.kind === "player" ? "justify-end" : "justify-start"}`}
          >
            {m.kind !== "player" && (
              <div className="mr-2 mt-1 h-8 w-8 shrink-0 rounded-full bg-gradient-to-br from-amber-300 to-amber-600 flex items-center justify-center shadow-md">
                <Glyph name="om" size={18} alt="Гуру" />
              </div>
            )}
            <div
              className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-[15px] leading-relaxed shadow-sm whitespace-pre-line ${
                m.kind === "player"
                  ? "bg-[var(--tg-theme-button-color,#2481cc)] text-[var(--tg-theme-button-text-color,#ffffff)] rounded-br-md"
                  : m.kind === "system"
                    ? "bg-amber-400/10 text-amber-200 ring-1 ring-amber-400/30 rounded-bl-md text-sm"
                    : "bg-[var(--lila-bubble-bg)] text-[var(--lila-bubble-fg)] rounded-bl-md"
              }`}
            >
              {m.text}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
      <div ref={bottomRef} aria-hidden />
    </div>
  );
}

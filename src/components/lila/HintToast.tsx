import { motion, AnimatePresence } from "framer-motion";
import { Lightbulb, X } from "lucide-react";

const STORAGE_KEY = "lila.hints.v1";

export type HintId =
  | "before_first_roll"
  | "first_board"
  | "first_snake"
  | "first_ladder"
  | "first_reflection"
  | "near_moksha";

function readSeen(): Record<string, true> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

export function hasSeenHint(id: HintId): boolean {
  return Boolean(readSeen()[id]);
}

export function markHintSeen(id: HintId): void {
  if (typeof window === "undefined") return;
  const cur = readSeen();
  cur[id] = true;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cur));
  } catch {
    /* ignore */
  }
}

export function resetHints(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function HintToast({
  text,
  onDismiss,
}: {
  text: string | null;
  onDismiss: () => void;
}) {
  return (
    <AnimatePresence>
      {text && (
        <motion.div
          key={text}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.25 }}
          className="fixed left-1/2 -translate-x-1/2 z-40 max-w-[92vw] w-[22rem] px-3"
          style={{ bottom: "calc(var(--tg-safe-area-inset-bottom, 0px) + 96px)" }}
          role="status"
        >
          <div className="rounded-2xl bg-[var(--lila-surface)]/95 backdrop-blur-md ring-1 ring-amber-300/30 shadow-lg px-3 py-2.5 flex items-start gap-2 text-[12.5px] leading-snug text-amber-50">
            <Lightbulb size={16} className="shrink-0 mt-0.5 text-amber-300" />
            <div className="flex-1">{text}</div>
            <button
              onClick={onDismiss}
              aria-label="Закрыть подсказку"
              className="shrink-0 -m-1 p-1 rounded-full hover:bg-white/10 opacity-70"
            >
              <X size={14} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

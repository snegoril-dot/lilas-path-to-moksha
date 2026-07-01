import { AnimatePresence, motion } from "framer-motion";
import { Check, Loader2 } from "lucide-react";

export type SaveState = "idle" | "saving" | "saved" | "error";

export function SaveIndicator({ state }: { state: SaveState }) {
  const visible = state === "saving" || state === "saved" || state === "error";
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key={state}
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2 }}
          aria-live="polite"
          className="pointer-events-none fixed top-2 left-1/2 -translate-x-1/2 z-[70]"
        >
          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium shadow-md ring-1 backdrop-blur-md ${
              state === "error"
                ? "bg-red-500/20 ring-red-400/40 text-red-100"
                : state === "saving"
                  ? "bg-black/40 ring-white/10 text-white/80"
                  : "bg-emerald-500/20 ring-emerald-300/40 text-emerald-100"
            }`}
          >
            {state === "saving" && <Loader2 size={12} className="animate-spin" />}
            {state === "saved" && <Check size={12} />}
            <span>
              {state === "saving" && "Сохраняю путь…"}
              {state === "saved" && "Путь сохранён"}
              {state === "error" && "Не удалось сохранить. Проверь соединение."}
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

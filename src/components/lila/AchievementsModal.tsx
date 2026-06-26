import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useDialogA11y } from "@/hooks/use-dialog-a11y";
import {
  ACHIEVEMENTS,
  computeUnlocked,
  type SessionSummary,
} from "@/lib/achievements";
import { getMySessions } from "@/lib/guru.functions";

export function AchievementsModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { initialRef } = useDialogA11y(open, onClose);
  const load = useServerFn(getMySessions);
  const [unlocked, setUnlocked] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const titleId = "achievements-title";

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    load()
      .then((rows) => {
        const sessions = rows as unknown as SessionSummary[];
        setUnlocked(computeUnlocked({ sessions }));
      })
      .catch(() => setUnlocked(new Set()))
      .finally(() => setLoading(false));
  }, [open, load]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
        >
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 30, opacity: 0 }}
            transition={{ type: "spring", damping: 22, stiffness: 280 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-3xl bg-[var(--lila-surface)] ring-1 ring-white/10 p-5 max-h-[85vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-3">
              <h2 id={titleId} className="text-lg font-bold text-amber-100">
                🏆 Достижения
              </h2>
              <button
                ref={initialRef as React.RefObject<HTMLButtonElement>}
                onClick={onClose}
                className="p-1.5 rounded-full hover:bg-white/10"
                aria-label="Закрыть"
              >
                <X size={16} />
              </button>
            </div>

            {loading && <div className="text-sm opacity-60">Считаю карму…</div>}

            {!loading && (
              <ul className="space-y-2">
                {ACHIEVEMENTS.map((a) => {
                  const got = unlocked.has(a.id);
                  return (
                    <li
                      key={a.id}
                      className={`flex items-start gap-3 rounded-2xl p-3 ring-1 transition ${
                        got
                          ? "bg-amber-300/10 ring-amber-300/40"
                          : "bg-white/5 ring-white/10 opacity-60"
                      }`}
                    >
                      <div
                        className={`h-10 w-10 shrink-0 rounded-full flex items-center justify-center text-xl ${
                          got
                            ? "bg-gradient-to-br from-amber-300 to-amber-600 shadow"
                            : "bg-white/5 grayscale"
                        }`}
                      >
                        {a.emoji}
                      </div>
                      <div className="flex-1 leading-snug">
                        <div className="text-sm font-semibold text-amber-50">
                          {a.title}
                          {got && (
                            <span className="ml-2 text-[10px] uppercase tracking-wider text-amber-300">
                              получено
                            </span>
                          )}
                        </div>
                        <div className="text-xs opacity-70 mt-0.5">
                          {a.description}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            <div className="mt-4 text-[11px] opacity-50 text-center">
              {unlocked.size} из {ACHIEVEMENTS.length}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

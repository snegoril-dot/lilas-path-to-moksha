import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Loader2, Plus, BookOpen } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import {
  listJournalEntries,
  addJournalEntry,
} from "@/lib/practices.functions";
import { haptic } from "@/hooks/use-telegram";
import { trackEvent } from "@/lib/analytics";

interface Entry {
  id: string;
  session_id: string | null;
  cell_id: number | null;
  text: string;
  tags: string[];
  created_at: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  sessionId?: string | null;
  cellId?: number | null;
}

export function PracticeJournalSheet({ open, onClose, sessionId, cellId }: Props) {
  const list = useServerFn(listJournalEntries);
  const add = useServerFn(addJournalEntry);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    void list({ data: { limit: 40 } })
      .then((r) => setEntries((r?.entries as Entry[]) ?? []))
      .finally(() => setLoading(false));
  }, [open, list]);

  async function submit() {
    if (!text.trim()) return;
    setBusy(true);
    try {
      const res = await add({
        data: {
          text: text.trim(),
          sessionId: sessionId ?? null,
          cellId: cellId ?? null,
          tags: [],
        },
      });
      trackEvent("journal_entry_added", { cell: cellId ?? null });
      haptic("light");
      setText("");
      if (res?.entry) setEntries((prev) => [res.entry as Entry, ...prev]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[62] bg-black/60 flex items-end sm:items-center justify-center"
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
              <h2 className="text-sm font-semibold inline-flex items-center gap-2">
                <BookOpen size={16} /> Дневник практики
              </h2>
              <button
                onClick={onClose}
                className="p-2 -mr-1 rounded-full hover:bg-white/10 active:scale-95"
                aria-label="Закрыть"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-3 border-b border-white/5 space-y-2">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value.slice(0, 3000))}
                rows={3}
                placeholder="Что заметил сейчас…"
                className="w-full bg-white/5 ring-1 ring-white/10 rounded-xl p-3 text-sm placeholder:opacity-40 focus:outline-none focus:ring-amber-300/50"
              />
              <button
                onClick={submit}
                disabled={busy || !text.trim()}
                className="w-full h-10 rounded-xl bg-amber-300 text-stone-900 text-sm font-semibold inline-flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {busy ? <Loader2 size={16} className="animate-spin" /> : (
                  <><Plus size={14} /> Добавить запись</>
                )}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2 text-sm">
              {loading && (
                <div className="text-xs opacity-60 py-6 text-center">Загружаю…</div>
              )}
              {!loading && entries.length === 0 && (
                <div className="text-xs opacity-60 py-6 text-center">
                  Пока пусто. Дневник — только для тебя.
                </div>
              )}
              {entries.map((e) => (
                <div
                  key={e.id}
                  className="rounded-xl bg-white/5 ring-1 ring-white/10 p-3"
                >
                  <div className="text-[10px] uppercase tracking-wider opacity-60 mb-1">
                    {new Date(e.created_at).toLocaleString("ru-RU", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {e.cell_id ? ` · клетка ${e.cell_id}` : ""}
                  </div>
                  <div className="text-xs leading-relaxed whitespace-pre-wrap">
                    {e.text}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

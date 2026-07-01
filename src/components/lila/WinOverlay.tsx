import { motion, AnimatePresence } from "framer-motion";
import { Download, Image as ImageIcon, Trophy } from "lucide-react";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { renderArtCard, downloadBlob } from "@/lib/art-card";
import { getMySessions } from "@/lib/guru.functions";
import {
  ACHIEVEMENTS,
  computeUnlocked,
  diffNewUnlocks,
  loadSeen,
  saveSeen,
  type SessionSummary as SessionSummaryData,
} from "@/lib/achievements";
import { SessionSummary } from "./SessionSummary";

// Share logic lives in SessionSummary now.

export interface KeyCell {
  id: number;
  name: string;
  kind: "ladder" | "snake";
  note?: string;
  visitCount?: number;
}

export function WinOverlay({
  open,
  onRestart,
  sankalpa,
  keyCells = [],
  totalRolls,
  mode,
  startedAt = null,
  sessionId = null,
  currentCell = 68,
}: {
  open: boolean;
  onRestart: () => void;
  sankalpa?: string;
  keyCells?: KeyCell[];
  totalRolls?: number;
  mode?: "classic" | "soft";
  startedAt?: string | null;
  sessionId?: string | null;
  currentCell?: number;
}) {
  const loadSessions = useServerFn(getMySessions);
  const [cardUrl, setCardUrl] = useState<string | null>(null);
  const [cardBlob, setCardBlob] = useState<Blob | null>(null);
  const [busy, setBusy] = useState(false);
  const [newAchIds, setNewAchIds] = useState<string[]>([]);

  // Сразу при открытии — генерим арт-карточку и считаем новые достижения.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      try {
        const blob = await renderArtCard({ sankalpa, keyCells, totalRolls });
        if (cancelled) return;
        setCardBlob(blob);
        setCardUrl(URL.createObjectURL(blob));
      } catch {
        /* ignore */
      }
      try {
        const rows = (await loadSessions()) as unknown as SessionSummaryData[];
        const unlocked = computeUnlocked({ sessions: rows });
        const fresh = diffNewUnlocks(unlocked);
        if (cancelled) return;
        if (fresh.length > 0) {
          setNewAchIds(fresh);
          const seen = loadSeen();
          fresh.forEach((id) => seen.add(id));
          saveSeen(seen);
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
      if (cardUrl) URL.revokeObjectURL(cardUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const onSaveCard = () => {
    if (!cardBlob) return;
    setBusy(true);
    try {
      downloadBlob(cardBlob, `lila-moksha-${Date.now()}.png`);
    } finally {
      setBusy(false);
    }
  };

  const newAch = ACHIEVEMENTS.filter((a) => newAchIds.includes(a.id));

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-start overflow-y-auto p-6 text-center bg-gradient-to-br from-amber-900 via-stone-900 to-indigo-950"
        >
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, type: "spring" }}
            className="text-6xl mt-6 mb-2"
          >
            🕉
          </motion.div>
          <motion.h1
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-3xl font-bold bg-gradient-to-r from-amber-200 to-amber-400 bg-clip-text text-transparent"
          >
            Мокша
          </motion.h1>
          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.45 }}
            className="mt-3 max-w-sm text-amber-100/90 leading-relaxed"
          >
            Ты достиг Кайласа. Игра окончена — ибо тот, кто играл, растворился
            в Том, кто всегда был.
          </motion.p>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-6 w-full max-w-md"
          >
            <SessionSummary
              result="moksha"
              sankalpa={sankalpa ?? ""}
              startedAt={startedAt}
              currentCell={currentCell}
              totalRolls={totalRolls ?? 0}
              keyCells={keyCells}
              sessionId={sessionId}
            />
            {mode && (
              <div className="mt-2 text-[10px] uppercase tracking-wider opacity-50 text-center">
                Режим: {mode === "soft" ? "🌿 Мягкий путь" : "🕉 Классика"}
              </div>
            )}
          </motion.div>

          {newAch.length > 0 && (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.7, type: "spring", stiffness: 240 }}
              className="mt-6 w-full max-w-md rounded-2xl bg-amber-300/10 ring-1 ring-amber-300/40 p-4 text-left"
            >
              <div className="flex items-center gap-2 text-amber-200 font-semibold text-sm">
                <Trophy size={16} /> Новые достижения
              </div>
              <ul className="mt-2 space-y-1.5">
                {newAch.map((a) => (
                  <li key={a.id} className="flex items-start gap-2 text-sm">
                    <span className="text-xl">{a.emoji}</span>
                    <div>
                      <div className="font-medium text-amber-50">{a.title}</div>
                      <div className="text-xs opacity-70">{a.description}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </motion.div>
          )}

          {cardUrl && (
            <motion.div
              initial={{ y: 14, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.85 }}
              className="mt-6 w-full max-w-xs rounded-2xl overflow-hidden ring-1 ring-amber-300/30 shadow-2xl"
            >
              <img
                src={cardUrl}
                alt="Арт-карточка итога"
                className="w-full h-auto block"
              />
              <div className="bg-black/40 text-[10px] uppercase tracking-wider text-amber-200/80 text-center py-1.5 flex items-center justify-center gap-1.5">
                <ImageIcon size={11} /> Арт-карточка пути
              </div>
            </motion.div>
          )}

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.9 }}
            className="my-8 flex flex-col sm:flex-row items-center gap-3"
          >
            <button
              onClick={onRestart}
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-300 to-amber-500 text-stone-900 font-semibold shadow-xl hover:brightness-110 active:scale-95 transition focus-visible:ring-2 focus-visible:ring-amber-200 focus:outline-none"
            >
              🪷 Начать новый путь
            </button>
            <button
              onClick={onSaveCard}
              disabled={!cardBlob || busy}
              className="px-6 py-3 rounded-2xl bg-white/10 ring-1 ring-amber-200/30 text-amber-100 font-semibold hover:bg-white/15 active:scale-95 transition flex items-center gap-2 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-amber-200 focus:outline-none"
            >
              <Download size={18} />
              Сохранить карту
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

import { motion, AnimatePresence } from "framer-motion";
import { Download, Image as ImageIcon, Share2, Trophy } from "lucide-react";
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
  type SessionSummary,
} from "@/lib/achievements";

function shareResult(text: string) {
  const tg = (window as unknown as {
    Telegram?: {
      WebApp?: {
        shareMessage?: (id: string) => void;
        switchInlineQuery?: (q: string, types?: string[]) => void;
        openTelegramLink?: (url: string) => void;
      };
    };
  }).Telegram?.WebApp;
  // 1) современный API (требует prepared message) — пробуем switchInlineQuery
  if (tg?.switchInlineQuery) {
    try {
      tg.switchInlineQuery(text, ["users", "groups"]);
      return;
    } catch {
      /* fallthrough */
    }
  }
  // 2) универсальный share через t.me/share/url
  const url = `https://t.me/share/url?url=${encodeURIComponent(
    typeof window !== "undefined" ? window.location.href : "https://t.me"
  )}&text=${encodeURIComponent(text)}`;
  if (tg?.openTelegramLink) {
    tg.openTelegramLink(url);
  } else if (typeof window !== "undefined") {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

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
}: {
  open: boolean;
  onRestart: () => void;
  sankalpa?: string;
  keyCells?: KeyCell[];
  totalRolls?: number;
}) {
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

          {sankalpa && (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="mt-6 max-w-sm w-full rounded-2xl bg-white/5 ring-1 ring-amber-200/20 p-4 text-left"
            >
              <div className="text-[11px] uppercase tracking-wider text-amber-300/80">
                Твоя Санкальпа
              </div>
              <div className="mt-1 text-amber-50 italic">«{sankalpa}»</div>
              <div className="mt-3 text-sm text-amber-100/80 leading-relaxed">
                Ответ записан в самом пути. Перечитай ключевые состояния, через
                которые провела тебя карма — в них Гуру и говорит с тобой.
              </div>
            </motion.div>
          )}

          {keyCells.length > 0 && (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.75 }}
              className="mt-4 max-w-sm w-full rounded-2xl bg-white/5 ring-1 ring-white/10 p-4 text-left"
            >
              <div className="text-[11px] uppercase tracking-wider text-amber-300/80 mb-2">
                Путь души · ключевые узлы
              </div>
              <ol className="space-y-2 text-sm text-amber-50/90">
                {keyCells.map((c, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="opacity-60 w-6 shrink-0">{c.id}.</span>
                    <span className="shrink-0">
                      {c.kind === "ladder" ? "🪜" : "🐍"}
                    </span>
                    <div className="flex-1">
                      <div>
                        {c.name}
                        {c.visitCount && c.visitCount > 1 && (
                          <span className="ml-1 text-[10px] text-rose-300/80">
                            ×{c.visitCount}
                          </span>
                        )}
                      </div>
                      {c.note && (
                        <div className="mt-0.5 text-xs italic text-amber-100/60 border-l-2 border-amber-300/30 pl-2">
                          «{c.note}»
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
              {typeof totalRolls === "number" && (
                <div className="mt-3 text-[11px] opacity-50">
                  Всего бросков: {totalRolls}
                </div>
              )}
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
              🪷 Играть снова
            </button>
            <button
              onClick={() => {
                const path = keyCells.length
                  ? ` Путь: ${keyCells.map((c) => c.name).join(" → ")}.`
                  : "";
                const intent = sankalpa ? ` Санкальпа: «${sankalpa}».` : "";
                shareResult(
                  `🕉 Я достиг Мокши в игре Лила за ${totalRolls ?? "?"} бросков.${intent}${path}`
                );
              }}
              className="px-6 py-3 rounded-2xl bg-white/10 ring-1 ring-amber-200/30 text-amber-100 font-semibold hover:bg-white/15 active:scale-95 transition flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-amber-200 focus:outline-none"
            >
              <Share2 size={18} />
              Поделиться
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

import { motion } from "framer-motion";
import { Share2, Sparkles, X } from "lucide-react";
import { useMemo, useState } from "react";
import { getDailyCard, markDailySeen } from "@/lib/daily-card";

function shareToTelegram(text: string) {
  const tg = (window as unknown as {
    Telegram?: {
      WebApp?: {
        switchInlineQuery?: (q: string, types?: string[]) => void;
        openTelegramLink?: (url: string) => void;
      };
    };
  }).Telegram?.WebApp;
  if (tg?.switchInlineQuery) {
    try {
      tg.switchInlineQuery(text, ["users", "groups"]);
      return;
    } catch {
      /* fallthrough */
    }
  }
  const url = `https://t.me/share/url?url=${encodeURIComponent(
    typeof window !== "undefined" ? window.location.href : "https://t.me"
  )}&text=${encodeURIComponent(text)}`;
  if (tg?.openTelegramLink) tg.openTelegramLink(url);
  else if (typeof window !== "undefined") window.open(url, "_blank");
}

export function DailyCard() {
  const card = useMemo(() => getDailyCard(), []);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const onShare = () => {
    shareToTelegram(
      `🃏 Карта дня · «${card.name}»\n\n${card.wisdom}\n\n— Лила, игра самопознания`
    );
  };

  const onDismiss = () => {
    markDailySeen(card.date);
    setDismissed(true);
  };

  return (
    <motion.div
      initial={{ y: -8, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.4 }}
      className="relative w-full max-w-sm rounded-2xl p-4 ring-1 ring-amber-300/30 bg-gradient-to-br from-amber-500/15 via-amber-400/5 to-transparent text-left shadow-md"
    >
      <button
        onClick={onDismiss}
        aria-label="Скрыть карту дня"
        className="absolute top-2 right-2 p-1.5 rounded-full hover:bg-white/10 opacity-60"
      >
        <X size={14} />
      </button>
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-amber-300/90 font-semibold">
        <Sparkles size={12} /> Карта дня
      </div>
      <div className="mt-1.5 text-base font-semibold text-amber-50">
        {card.cellId}. {card.name}
      </div>
      {card.lokaName && (
        <div className="text-[10px] opacity-50 mt-0.5">{card.lokaName}</div>
      )}
      <p className="mt-2 text-[13px] leading-relaxed text-amber-100/90 line-clamp-4">
        {card.wisdom}
      </p>
      <button
        onClick={onShare}
        className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-300/15 hover:bg-amber-300/25 ring-1 ring-amber-300/40 text-xs font-medium text-amber-100"
      >
        <Share2 size={12} /> Поделиться в Telegram
      </button>
    </motion.div>
  );
}

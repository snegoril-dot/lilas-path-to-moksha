import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, BookOpen, X } from "lucide-react";
import { BOARD } from "@/lib/lila-board";
import { trackEvent } from "@/lib/analytics";
import { useEffect } from "react";

export interface ReturnBannerProps {
  open: boolean;
  cellId: number;
  sankalpa: string | null;
  lastNote: string | null;
  hoursSince: number;
  onContinue: () => void;
  onReread: () => void;
  onEditSankalpa?: () => void;
  onDismiss: () => void;
}

export function ReturnBanner({
  open,
  cellId,
  sankalpa,
  lastNote,
  hoursSince,
  onContinue,
  onReread,
  onEditSankalpa,
  onDismiss,
}: ReturnBannerProps) {
  const cell = cellId > 0 ? BOARD[cellId - 1] : null;
  const daysSince = Math.floor(hoursSince / 24);
  const overWeek = daysSince >= 7;

  useEffect(() => {
    if (open) {
      trackEvent("session_resumed", {
        cell: cellId,
        extra: { banner: true, hours: Math.round(hoursSince), over_week: overWeek },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!cell) return null;

  const truncated = lastNote && lastNote.length > 120 ? `${lastNote.slice(0, 117).trim()}…` : lastNote;

  const trackAction = (action: "continue" | "reread" | "edit_sankalpa" | "dismiss") =>
    trackEvent("session_resumed", {
      cell: cellId,
      extra: { banner_action: action },
    });

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ y: -16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -16, opacity: 0 }}
          transition={{ type: "spring", stiffness: 240, damping: 24 }}
          className="sticky top-0 z-30 px-3 pt-2"
        >
          <div className="relative rounded-2xl bg-gradient-to-br from-amber-500/15 to-rose-500/10 ring-1 ring-amber-300/30 backdrop-blur p-3 pr-9">
            <button
              onClick={() => {
                trackAction("dismiss");
                onDismiss();
              }}
              aria-label="Скрыть баннер возвращения"
              className="absolute top-2 right-2 p-1 rounded-full hover:bg-white/10 opacity-70"
            >
              <X size={14} />
            </button>
            <div className="text-[11px] uppercase tracking-wider text-amber-200/80">
              С возвращением · {daysSince > 0 ? `${daysSince} дн назад` : `${Math.max(1, Math.round(hoursSince))} ч назад`}
            </div>
            <div className="mt-0.5 text-sm font-medium leading-snug">
              Ты остановился на клетке {cell.id} — «{cell.name}».
            </div>
            {truncated && (
              <div className="mt-1.5 text-xs opacity-85 leading-relaxed line-clamp-3">
                «{truncated}»
              </div>
            )}
            {sankalpa && (
              <div className="mt-1.5 text-[12px] italic text-amber-100/85 leading-snug">
                Твоё намерение: «{sankalpa}»
              </div>
            )}
            {overWeek && onEditSankalpa && (
              <button
                onClick={() => {
                  trackAction("edit_sankalpa");
                  onEditSankalpa();
                }}
                className="mt-2 text-[11px] underline underline-offset-2 opacity-80 hover:opacity-100"
              >
                Прошла неделя. Начать с новой Санкальпы?
              </button>
            )}
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => {
                  trackAction("continue");
                  onContinue();
                }}
                className="flex-1 h-9 px-3 rounded-full bg-amber-300 text-stone-900 text-xs font-semibold inline-flex items-center justify-center gap-1"
              >
                Продолжить путь <ArrowRight size={12} />
              </button>
              <button
                onClick={() => {
                  trackAction("reread");
                  onReread();
                }}
                className="h-9 px-3 rounded-full bg-white/5 ring-1 ring-white/10 text-[11px] inline-flex items-center gap-1"
              >
                <BookOpen size={12} /> Перечитать клетку
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

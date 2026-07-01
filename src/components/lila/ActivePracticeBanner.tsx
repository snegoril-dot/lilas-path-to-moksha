import { motion } from "framer-motion";
import { Flame, ArrowRight } from "lucide-react";
import type { ActivePracticeRow } from "@/hooks/useActivePractice";
import { findPractice, DURATION_LABEL } from "@/content/practices";
import type { PracticeDuration } from "@/content/practices/types";

interface Props {
  session: ActivePracticeRow;
  onOpenReturn: () => void;
  onOpenJournal: () => void;
}

function humanRemaining(dueAt: string | null): string {
  if (!dueAt) return "";
  const ms = new Date(dueAt).getTime() - Date.now();
  if (ms <= 0) return "готов вернуться";
  const h = Math.round(ms / 3_600_000);
  if (h < 1) return "меньше часа";
  if (h < 24) return `${h} ч осталось`;
  const d = Math.round(h / 24);
  return `${d} д осталось`;
}

export function ActivePracticeBanner({ session, onOpenReturn, onOpenJournal }: Props) {
  const practice = findPractice(session.cell_id, session.practice_id);
  const title = practice?.title ?? "Практика";
  const remaining = humanRemaining(session.due_at);
  const label = DURATION_LABEL[session.duration as PracticeDuration] ?? session.duration;

  return (
    <motion.div
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="sticky top-0 z-30 px-3 pt-2"
    >
      <div className="rounded-2xl bg-gradient-to-br from-amber-500/15 to-rose-500/10 ring-1 ring-amber-300/30 backdrop-blur p-3 flex items-center gap-3">
        <div className="shrink-0 w-9 h-9 rounded-full bg-amber-300/20 flex items-center justify-center">
          <Flame size={16} className="text-amber-200" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs uppercase tracking-wider text-amber-200/80">
            Клетка {session.cell_id} · {label}
          </div>
          <div className="text-sm font-medium truncate">{title}</div>
          {remaining && <div className="text-[11px] opacity-70 mt-0.5">{remaining}</div>}
        </div>
        <div className="flex flex-col gap-1 shrink-0">
          <button
            onClick={onOpenReturn}
            className="h-8 px-3 rounded-full bg-amber-300 text-stone-900 text-xs font-semibold inline-flex items-center gap-1"
          >
            Вернуться <ArrowRight size={12} />
          </button>
          <button
            onClick={onOpenJournal}
            className="h-7 px-3 rounded-full bg-white/5 ring-1 ring-white/10 text-[11px]"
          >
            Дневник
          </button>
        </div>
      </div>
    </motion.div>
  );
}

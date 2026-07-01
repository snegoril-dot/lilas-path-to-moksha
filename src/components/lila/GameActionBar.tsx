import { useState } from "react";
import { ChevronDown, Dice5 as DiceIcon, Eye, Map as MapIcon, MessageCircle, Sparkles } from "lucide-react";
import { Dice } from "@/components/lila/Dice";
import { haptic } from "@/hooks/use-telegram";
import type { MoveEvent } from "@/lib/game-types";

interface GameActionBarProps {
  dice: number;
  rolling: boolean;
  won: boolean;
  landed: MoveEvent | null;
  landedOpen: boolean;
  pos: number;
  sankalpa?: string;
  onRoll: () => void;
  onOpenWin: () => void;
  onOpenLanded: () => void;
  onOpenCell: () => void;
  onAskGuru: () => void;
}

/**
 * Sticky bottom action bar: dice + adaptive primary CTA (Roll / Осмыслить / Итог)
 * + Клетка + Гуру buttons. Purely presentational.
 *
 * Перед броском кратко напоминает Санкальпу — маленькая точка опоры перед действием.
 */
export function GameActionBar({
  dice,
  rolling,
  won,
  landed,
  landedOpen,
  sankalpa,
  onRoll,
  onOpenWin,
  onOpenLanded,
  onOpenCell,
  onAskGuru,
}: GameActionBarProps) {
  const showSankalpaHint =
    !rolling && !won && !(landed && !landedOpen) && !!sankalpa && sankalpa.trim().length > 0;
  const [expanded, setExpanded] = useState(false);
  const isLong = (sankalpa?.trim().length ?? 0) > 60;
  return (
    <div className="sticky bottom-0 shrink-0 z-30 px-3 pt-2 pb-safe bg-[var(--lila-surface)]/95 backdrop-blur-md border-t border-white/10">
      {showSankalpaHint && (
        <button
          type="button"
          onClick={() => isLong && setExpanded((v) => !v)}
          className={`w-full mb-2 mx-0.5 px-3 py-1.5 rounded-2xl bg-amber-300/10 ring-1 ring-amber-300/25 text-[11px] text-amber-100/90 text-left flex items-start gap-1.5 ${isLong ? "cursor-pointer" : "cursor-default"}`}
          aria-expanded={isLong ? expanded : undefined}
          aria-label={isLong ? (expanded ? "Свернуть Санкальпу" : "Развернуть Санкальпу") : undefined}
        >
          <span className={`flex-1 ${expanded ? "whitespace-pre-wrap break-words" : "truncate"}`}>
            <span className="opacity-60 mr-1">Твоя Санкальпа:</span>«{sankalpa}»
          </span>
          {isLong && (
            <ChevronDown
              size={14}
              className={`shrink-0 mt-0.5 opacity-70 transition-transform ${expanded ? "rotate-180" : ""}`}
            />
          )}
        </button>
      )}


      <div className="flex items-center gap-2">
        <Dice value={dice} rolling={rolling} />
        {won ? (
          <button
            onClick={() => {
              haptic("medium");
              onOpenWin();
            }}
            className="flex-1 min-w-0 flex items-center justify-center gap-2 h-14 rounded-2xl bg-gradient-to-r from-amber-300 to-amber-500 text-stone-900 font-bold text-base shadow-lg active:scale-[0.97] transition"
            aria-label="Посмотреть итог пути"
          >
            <Eye size={20} />
            Посмотреть итог пути
          </button>
        ) : landed && !landedOpen ? (
          <button
            onClick={() => {
              haptic("light");
              onOpenLanded();
            }}
            className="flex-1 min-w-0 flex items-center justify-center gap-2 h-14 rounded-2xl bg-gradient-to-r from-amber-300 to-amber-500 text-stone-900 font-bold text-base shadow-lg active:scale-[0.97] transition"
            aria-label="Осмыслить клетку"
          >
            <Sparkles size={20} />
            Осмыслить клетку
          </button>
        ) : (
          <button
            onClick={() => {
              haptic("light");
              onRoll();
            }}

            disabled={rolling}
            aria-busy={rolling}
            className="flex-1 min-w-0 flex items-center justify-center gap-2 h-14 rounded-2xl bg-gradient-to-r from-amber-300 to-amber-500 text-stone-900 font-bold text-base shadow-lg active:scale-[0.97] transition disabled:opacity-70 disabled:cursor-not-allowed"
            aria-label={rolling ? "Кубик катится" : "Бросить кубик"}
          >
            <DiceIcon size={20} className={rolling ? "animate-spin" : ""} />
            {rolling ? "Кубик катится…" : "Бросить кубик"}
          </button>
        )}
        {!won && !(landed && !landedOpen) && (
          <button
            onClick={() => {
              haptic("light");
              onOpenCell();
            }}
            className="shrink-0 inline-flex flex-col items-center justify-center h-14 w-14 rounded-2xl bg-white/5 hover:bg-white/10 ring-1 ring-white/10 active:scale-95 transition"
            aria-label="О текущей клетке"
            title="Клетка"
          >
            <MapIcon size={20} />
            <span className="text-[10px] mt-0.5 opacity-70">Клетка</span>
          </button>
        )}
        <button
          onClick={() => {
            haptic("light");
            onAskGuru();
          }}
          className="shrink-0 inline-flex flex-col items-center justify-center h-14 w-14 rounded-2xl bg-white/5 hover:bg-white/10 text-amber-200 ring-1 ring-amber-300/30 active:scale-95 transition"
          aria-label="Спросить ИИ-Гуру"
          title="Гуру"
        >
          <MessageCircle size={20} />
          <span className="text-[10px] mt-0.5 opacity-80">Гуру</span>
        </button>
      </div>
    </div>
  );
}

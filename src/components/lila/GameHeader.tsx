import { Link } from "@tanstack/react-router";
import { BookOpen, Pause, Menu, Route as RouteIcon } from "lucide-react";
import { haptic } from "@/hooks/use-telegram";
import type { Cell, GameMode } from "@/lib/game-types";
import { getLoka } from "@/lib/lila-board";

interface GameHeaderProps {
  pos: number;
  currentCell: Cell | null;
  mode: GameMode;
  entryMisses: number;
  sixStreak?: number;
  onOpenTimeline: () => void;
  onPause: () => void;
  onOpenSettings: () => void;
}

/**
 * Sticky top bar: Guru avatar, current loka/cell label, timeline/journal/pause/menu.
 * Pure presentational — no side effects beyond haptics forwarded from the caller.
 */
export function GameHeader({
  pos,
  currentCell,
  mode,
  entryMisses,
  sixStreak = 0,
  onOpenTimeline,
  onPause,
  onOpenSettings,
}: GameHeaderProps) {
  const currentLoka = getLoka(pos);
  return (
    <div
      className="shrink-0 flex items-center justify-between gap-2 px-3 py-2 bg-[var(--lila-surface)]/85 backdrop-blur-md border-b border-white/5"
      style={{ paddingTop: "max(0.5rem, env(safe-area-inset-top))" }}
    >
      <div className="flex items-center gap-2 min-w-0">
        <div className="h-9 w-9 shrink-0 rounded-full bg-gradient-to-br from-amber-300 to-amber-600 flex items-center justify-center text-lg shadow">
          🕉
        </div>
        <div className="leading-tight min-w-0">
          <div className="text-sm font-semibold flex items-center gap-1.5 flex-wrap">
            <span className="truncate">Лила</span>
            <span
              className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-white/10 text-white/70 font-medium"
              title="Приложение в бета-версии"
            >
              бета
            </span>
            {currentLoka && (
              <span
                className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-gradient-to-r ${currentLoka.color} text-stone-900 font-bold shadow-sm`}
                title={currentLoka.hint}
              >
                {currentLoka.name.split("·")[0].trim()}
              </span>
            )}
            {sixStreak > 0 && (
              <span
                className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-400/20 text-amber-200 font-semibold"
                title="Шестёрки подряд — при трёх бросок сгорит"
              >
                🎲 6×{sixStreak}
              </span>
            )}
          </div>

          <div className="text-[12px] text-white/85 font-medium truncate">
            {currentCell
              ? `Клетка ${pos} · ${currentCell.name}`
              : mode === "soft"
                ? `Душа ждёт · попытка ${entryMisses + 1}/4`
                : "Душа ждёт своего часа · 🎲 6"}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-0.5 shrink-0">
        <button
          onClick={() => {
            haptic("light");
            onOpenTimeline();
          }}
          className="p-2 rounded-full hover:bg-white/10 active:scale-95 transition"
          aria-label="Мой путь"
          title="Мой путь"
        >
          <RouteIcon size={18} />
        </button>
        <Link
          to="/journal"
          className="p-2 rounded-full hover:bg-white/10 active:scale-95 transition"
          aria-label="Дневник"
          title="Дневник пути"
        >
          <BookOpen size={18} />
        </Link>
        <button
          onClick={onPause}
          className="p-2 rounded-full hover:bg-white/10 active:scale-95 transition"
          aria-label="Пауза"
          title="Пауза"
        >
          <Pause size={18} />
        </button>
        <button
          onClick={() => {
            haptic("light");
            onOpenSettings();
          }}
          className="p-2 rounded-full hover:bg-white/10 active:scale-95 transition"
          aria-label="Открыть меню"
          title="Меню"
        >
          <Menu size={20} />
        </button>
      </div>
    </div>
  );
}

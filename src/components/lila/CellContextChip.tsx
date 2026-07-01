import { BOARD, LADDERS, SNAKES, getLoka } from "@/lib/lila-board";

/**
 * Компактный контекст-виджет: показывает, к какой клетке относится сообщение
 * Гуру. Прикрепляется к каждому сообщению в чате, чтобы ответ читался
 * самостоятельно, без потери смысла (в скриншотах, при возврате к истории и т.д.).
 */
export function CellContextChip({
  cell,
  variant = "assistant",
}: {
  cell: number;
  variant?: "assistant" | "user";
}) {
  const meta = BOARD.find((c) => c.id === cell);
  if (!meta) return null;
  const loka = getLoka(cell);
  const ladderTo = LADDERS[cell];
  const snakeTo = SNAKES[cell];

  const marker = ladderTo
    ? { icon: "🪜", text: `Стрела → ${ladderTo}`, cls: "text-emerald-200/90" }
    : snakeTo
      ? { icon: "🐍", text: `Змея → ${snakeTo}`, cls: "text-rose-200/90" }
      : null;

  const align = variant === "user" ? "self-end" : "self-start";
  const tint =
    variant === "user"
      ? "bg-white/5 ring-white/10 text-[var(--tg-theme-text-color,#fff)]/70"
      : "bg-amber-300/8 ring-amber-300/25 text-amber-100/85";

  return (
    <div
      className={`${align} max-w-[85%] mb-1 rounded-full px-2.5 py-1 ring-1 text-[10px] leading-tight flex items-center gap-1.5 flex-wrap ${tint}`}
      aria-label={`Контекст: клетка ${cell}, ${meta.name}${loka ? `, ${loka.name}` : ""}`}
    >
      <span className="font-semibold tabular-nums">№{cell}</span>
      <span className="opacity-70">·</span>
      <span className="truncate max-w-[10rem]">{meta.name}</span>
      {loka && (
        <>
          <span className="opacity-40">·</span>
          <span className="opacity-70 truncate max-w-[9rem]">{loka.hint}</span>
        </>
      )}
      {marker && (
        <>
          <span className="opacity-40">·</span>
          <span className={marker.cls}>
            {marker.icon} {marker.text}
          </span>
        </>
      )}
    </div>
  );
}

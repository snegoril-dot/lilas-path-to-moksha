import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { CalendarDays, Star } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { getWeeklyReview, type WeeklyReviewCell } from "@/lib/weekly-review.functions";
import { getCellExperience } from "@/lib/cell-experience";
import { trackEvent } from "@/lib/analytics";
import { safeGet, safeSet } from "@/lib/safe-storage";

interface Props {
  open: boolean;
  onClose: () => void;
}

const RESONANCE_KEY = (cell: number) => `lila:resonance:${cell}`;

function ResonanceScale({ cell }: { cell: number }) {
  const [value, setValue] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    return Number(safeGet(RESONANCE_KEY(cell)) || 0);
  });
  const set = (n: number) => {
    setValue(n);
    try {
      safeSet(RESONANCE_KEY(cell), String(n));
      trackEvent("weekly_resonance_set");
    } catch {}
  };
  return (
    <div className="flex items-center gap-1">
      <span className="text-[11px] opacity-60 mr-1">Резонанс:</span>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => set(n)}
          aria-label={`Резонанс ${n} из 5`}
          className="p-0.5"
        >
          <Star
            size={16}
            className={n <= value ? "fill-amber-300 text-amber-300" : "text-white/25"}
          />
        </button>
      ))}
    </div>
  );
}

export function WeeklyReviewSheet({ open, onClose }: Props) {
  const load = useServerFn(getWeeklyReview);
  const [cells, setCells] = useState<WeeklyReviewCell[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setErr(null);
    trackEvent("weekly_review_opened");
    load({})
      .then((data) => setCells(data.cells))
      .catch((e: Error) => {
        console.error("[weekly review]", e);
        setErr("Не удалось загрузить обзор недели.");
      })
      .finally(() => setLoading(false));
  }, [open, load]);

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent
        side="bottom"
        className="bg-[var(--lila-surface,#15131e)] text-white border-t border-white/10 rounded-t-3xl max-h-[88vh] overflow-y-auto pb-[max(1rem,env(safe-area-inset-bottom))]"
      >
        <SheetHeader className="text-left">
          <SheetTitle className="text-white flex items-center gap-2">
            <CalendarDays size={18} className="text-amber-300" />
            Что показала тебе неделя
          </SheetTitle>
          <SheetDescription className="text-white/60">
            Три последние клетки, заметки к ним и твой отклик.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-3">
          {loading && <div className="opacity-60 text-sm">Собираю обзор…</div>}
          {err && (
            <div className="text-rose-200 text-sm rounded-2xl bg-rose-500/10 ring-1 ring-rose-300/20 p-4">
              {err}
            </div>
          )}
          {!loading && !err && cells.length === 0 && (
            <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-5 text-sm leading-relaxed text-amber-50/85">
              За последние 7 дней ещё нет клеток с заметками. Пройди хотя бы один ход и оставь короткий инсайт — он появится здесь.
            </div>
          )}

          {cells.map((c) => {
            const exp = getCellExperience(c.cell);
            return (
              <div
                key={c.cell}
                className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-4 space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="text-[11px] uppercase tracking-wider opacity-60">
                      Клетка {c.cell}
                    </div>
                    <div className="text-sm font-medium text-amber-100">
                      {exp?.cell.name ?? "—"}
                    </div>
                  </div>
                  <ResonanceScale cell={c.cell} />
                </div>
                {exp?.shortMeaning && (
                  <p className="text-xs opacity-75 leading-relaxed">{exp.shortMeaning}</p>
                )}
                {c.notes.length > 0 && (
                  <ul className="space-y-1.5 pt-1">
                    {c.notes.slice(0, 3).map((n) => (
                      <li
                        key={n.id}
                        className="text-xs leading-relaxed rounded-lg bg-black/20 ring-1 ring-white/5 px-2.5 py-1.5 text-amber-50/90"
                      >
                        {n.user_text || <span className="opacity-40">— пусто —</span>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Sparkles } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { generateWeekly, getLatestWeekly } from "@/lib/guru.functions";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/insights")({
  component: InsightsPage,
});

type Weekly = {
  id: string;
  week_start: string;
  summary: string;
  focus_loka: string | null;
  practices: Array<{ title: string; description: string; daily_minutes: number }>;
  created_at: string;
};

function InsightsPage() {
  const { ready, userId } = useAuth();
  const load = useServerFn(getLatestWeekly);
  const gen = useServerFn(generateWeekly);
  const [items, setItems] = useState<Weekly[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const refresh = () => {
    setLoading(true);
    load()
      .then((rows) => setItems(rows as unknown as Weekly[]))
      .catch((e: Error) => setErr(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!ready || !userId) return;
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, userId]);

  const onGenerate = async () => {
    setErr(null);
    setGenerating(true);
    try {
      await gen();
      refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-[var(--lila-bg)] to-[var(--lila-bg-2)] text-[var(--tg-theme-text-color,#fff)]">
      <header className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 bg-[var(--lila-surface)]/90 backdrop-blur border-b border-white/5">
        <Link to="/" className="p-2 -ml-2 rounded-full hover:bg-white/10" aria-label="Назад">
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-lg font-semibold">✨ Недельный план</h1>
        <button
          onClick={onGenerate}
          disabled={generating}
          className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-amber-300 to-amber-500 text-stone-900 disabled:opacity-50"
        >
          <Sparkles size={14} />
          {generating ? "Гуру слушает…" : "Сгенерировать"}
        </button>
      </header>
      <main className="px-4 py-4 max-w-2xl mx-auto space-y-3">
        {loading && <div className="opacity-60 text-sm">Загружаю…</div>}
        {err && <div className="text-rose-300 text-sm bg-rose-500/10 rounded-xl p-3">{err}</div>}
        {!loading && items.length === 0 && !err && (
          <div className="opacity-60 text-sm leading-relaxed">
            После первой завершённой партии нажми «Сгенерировать», чтобы Гуру составил план
            практики на неделю на основе твоего пути.
          </div>
        )}
        {items.map((w) => (
          <article
            key={w.id}
            className="rounded-2xl bg-[var(--lila-surface)] ring-1 ring-white/10 p-4 space-y-3"
          >
            <div className="flex items-center justify-between text-[11px] opacity-60">
              <span>Неделя с {w.week_start}</span>
              {w.focus_loka && (
                <span className="px-2 py-0.5 rounded-full bg-amber-300/10 text-amber-200 ring-1 ring-amber-300/30">
                  {w.focus_loka}
                </span>
              )}
            </div>
            <p className="text-sm leading-relaxed">{w.summary}</p>
            {Array.isArray(w.practices) && w.practices.length > 0 && (
              <ul className="space-y-2">
                {w.practices.map((p, i) => (
                  <li key={i} className="rounded-xl bg-black/20 px-3 py-2 text-xs leading-relaxed">
                    <div className="text-sm font-semibold text-amber-100">
                      {p.title}{" "}
                      <span className="text-[10px] font-normal opacity-60">
                        · {p.daily_minutes} мин/день
                      </span>
                    </div>
                    <div className="opacity-80 mt-0.5">{p.description}</div>
                  </li>
                ))}
              </ul>
            )}
          </article>
        ))}
      </main>
    </div>
  );
}

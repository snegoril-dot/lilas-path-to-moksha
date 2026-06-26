import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { getJournal } from "@/lib/guru.functions";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/journal")({
  component: JournalPage,
});

type Entry = {
  id: string;
  cell: number | null;
  prompt: string | null;
  user_text: string | null;
  ai_reflection: string | null;
  kind: string;
  created_at: string;
};

function JournalPage() {
  const { ready, userId } = useAuth();
  const load = useServerFn(getJournal);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!ready || !userId) return;
    setLoading(true);
    load({ data: { limit: 50 } })
      .then((rows) => setEntries(rows as Entry[]))
      .catch((e: Error) => setErr(e.message))
      .finally(() => setLoading(false));
  }, [ready, userId, load]);

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-[var(--lila-bg)] to-[var(--lila-bg-2)] text-[var(--tg-theme-text-color,#fff)]">
      <header className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 bg-[var(--lila-surface)]/90 backdrop-blur border-b border-white/5">
        <Link to="/" className="p-2 -ml-2 rounded-full hover:bg-white/10" aria-label="Назад">
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-lg font-semibold">📓 Дневник пути</h1>
      </header>
      <main className="px-4 py-4 max-w-2xl mx-auto space-y-3">
        {loading && <div className="opacity-60 text-sm">Открываю свитки…</div>}
        {err && <div className="text-rose-300 text-sm">{err}</div>}
        {!loading && !err && entries.length === 0 && (
          <div className="opacity-60 text-sm leading-relaxed">
            Пока пусто. После змей и лестниц Гуру предложит оставить заметку — она появится здесь.
          </div>
        )}
        {entries.map((e) => (
          <article
            key={e.id}
            className="rounded-2xl bg-[var(--lila-surface)] ring-1 ring-white/10 p-4 space-y-2"
          >
            <div className="flex items-center justify-between text-[11px] opacity-60">
              <span>
                {new Date(e.created_at).toLocaleString("ru-RU", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </span>
              {e.cell && <span>Клетка {e.cell}</span>}
            </div>
            {e.user_text && (
              <p className="text-sm leading-relaxed whitespace-pre-line">{e.user_text}</p>
            )}
            {e.ai_reflection && (
              <div className="text-xs leading-relaxed text-amber-100/90 bg-amber-300/5 ring-1 ring-amber-300/20 rounded-xl px-3 py-2 whitespace-pre-line">
                <span className="opacity-60">🕉 Гуру: </span>
                {e.ai_reflection}
              </div>
            )}
          </article>
        ))}
      </main>
    </div>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ChevronDown, Sparkles, Feather, MessageCircle, TrendingDown, TrendingUp, Flag } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { getJournal } from "@/lib/guru.functions";
import { useAuth } from "@/hooks/use-auth";
import { getCellExperience } from "@/lib/cell-experience";

export const Route = createFileRoute("/journal")({
  component: JournalPage,
});

type Kind =
  | "reflection"
  | "insight"
  | "final_insight"
  | "guru"
  | "guru_note"
  | "snake_lesson"
  | "ladder_gift";
type Entry = {
  id: string;
  cell: number | null;
  prompt: string | null;
  user_text: string | null;
  ai_reflection: string | null;
  kind: string;
  session_id?: string | null;
  created_at: string;
};

const KIND_META: Record<Kind, { label: string; emoji: string; icon: typeof Feather; cls: string }> = {
  reflection: { label: "Заметка", emoji: "🪶", icon: Feather, cls: "bg-white/10 text-white/80" },
  insight: { label: "Инсайт", emoji: "🌟", icon: Sparkles, cls: "bg-amber-300/20 text-amber-100" },
  final_insight: { label: "Итог", emoji: "🏁", icon: Flag, cls: "bg-amber-400/25 text-amber-100" },
  guru: { label: "Вопрос к Гуру", emoji: "🕉", icon: MessageCircle, cls: "bg-indigo-400/20 text-indigo-100" },
  guru_note: { label: "Вопрос к Гуру", emoji: "🕉", icon: MessageCircle, cls: "bg-indigo-400/20 text-indigo-100" },
  snake_lesson: { label: "Урок змеи", emoji: "🐍", icon: TrendingDown, cls: "bg-rose-500/20 text-rose-100" },
  ladder_gift: { label: "Дар лестницы", emoji: "🪜", icon: TrendingUp, cls: "bg-emerald-500/20 text-emerald-100" },
};

const ALL_KINDS: Kind[] = ["insight", "final_insight", "reflection", "snake_lesson", "ladder_gift", "guru_note"];

function normalizeKind(k: string): Kind {
  if (k in KIND_META) return k as Kind;
  return "reflection";
}

function fmtDay(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yest = new Date();
  yest.setDate(today.getDate() - 1);
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  if (sameDay(d, today)) return "Сегодня";
  if (sameDay(d, yest)) return "Вчера";
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

function preview(text: string, len = 100): string {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length > len ? t.slice(0, len).trimEnd() + "…" : t;
}

function JournalPage() {
  const { ready, userId } = useAuth();
  const load = useServerFn(getJournal);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | Kind>("all");

  useEffect(() => {
    if (!ready || !userId) return;
    setLoading(true);
    load({ data: { limit: 100 } })
      .then((rows) => setEntries(rows as Entry[]))
      .catch((e: Error) => setErr(e.message))
      .finally(() => setLoading(false));
  }, [ready, userId, load]);

  const filtered = useMemo(
    () => (filter === "all" ? entries : entries.filter((e) => normalizeKind(e.kind) === filter)),
    [entries, filter]
  );

  const grouped = useMemo(() => {
    const map = new Map<string, Entry[]>();
    for (const e of filtered) {
      const key = fmtDay(e.created_at);
      const arr = map.get(key) ?? [];
      arr.push(e);
      map.set(key, arr);
    }
    return Array.from(map.entries());
  }, [filtered]);

  const counts = useMemo(() => {
    const c: Record<Kind, number> = { reflection: 0, insight: 0, guru: 0 };
    entries.forEach((e) => (c[normalizeKind(e.kind)] += 1));
    return c;
  }, [entries]);

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-[var(--lila-bg)] to-[var(--lila-bg-2)] text-[var(--tg-theme-text-color,#fff)]">
      <header className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 bg-[var(--lila-surface)]/90 backdrop-blur border-b border-white/5">
        <Link to="/" className="p-2 -ml-2 rounded-full hover:bg-white/10" aria-label="Назад">
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-lg font-semibold">📓 Дневник пути</h1>
      </header>

      <div className="px-4 pt-3 max-w-2xl mx-auto flex gap-2 overflow-x-auto no-scrollbar">
        {(["all", "insight", "reflection", "guru"] as const).map((k) => {
          const active = filter === k;
          const label =
            k === "all"
              ? `Все · ${entries.length}`
              : `${KIND_META[k].emoji} ${KIND_META[k].label} · ${counts[k]}`;
          return (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium ring-1 transition ${
                active
                  ? "bg-amber-300 text-stone-900 ring-amber-300"
                  : "bg-white/5 text-white/80 ring-white/10 hover:bg-white/10"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      <main className="px-4 py-4 max-w-2xl mx-auto space-y-6">
        {loading && <div className="opacity-60 text-sm">Открываю свитки…</div>}
        {err && <div className="text-rose-300 text-sm">{err}</div>}
        {!loading && !err && filtered.length === 0 && (
          <div className="opacity-60 text-sm leading-relaxed">
            {filter === "all"
              ? "Пока пусто. После змей и лестниц Гуру предложит оставить заметку — она появится здесь."
              : "В этом разделе пока пусто."}
          </div>
        )}

        {grouped.map(([day, items]) => (
          <section key={day} className="space-y-2">
            <h2 className="text-[11px] uppercase tracking-wider opacity-60 pl-1">{day}</h2>
            <ul className="space-y-2">
              {items.map((e) => {
                const kind = normalizeKind(e.kind);
                const meta = KIND_META[kind];
                const open = openId === e.id;
                const text = e.user_text ?? "";
                return (
                  <li
                    key={e.id}
                    className="rounded-2xl bg-[var(--lila-surface)] ring-1 ring-white/10 overflow-hidden"
                  >
                    <button
                      onClick={() => setOpenId(open ? null : e.id)}
                      className="w-full flex items-start gap-3 p-3 text-left hover:bg-white/5 transition"
                      aria-expanded={open}
                    >
                      <span className={`shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-base ${meta.cls}`}>
                        {meta.emoji}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 text-[11px] opacity-70">
                          <span className="font-medium">{meta.label}</span>
                          {e.cell && <span>· Клетка {e.cell}</span>}
                          <span className="ml-auto">{fmtTime(e.created_at)}</span>
                        </div>
                        <div className="mt-1 text-sm text-amber-50/90 leading-snug">
                          {text ? preview(text, open ? 400 : 100) : <span className="opacity-50">— пусто —</span>}
                        </div>
                      </div>
                      <ChevronDown
                        size={16}
                        className={`shrink-0 mt-1 opacity-60 transition ${open ? "rotate-180" : ""}`}
                      />
                    </button>
                    {open && (
                      <div className="px-3 pb-3 space-y-2">
                        {e.prompt && (
                          <div className="text-[11px] italic opacity-60">Вопрос: {e.prompt}</div>
                        )}
                        {text && (
                          <p className="text-sm leading-relaxed whitespace-pre-line text-amber-50/95">
                            {text}
                          </p>
                        )}
                        {e.ai_reflection && (
                          <div className="text-xs leading-relaxed text-amber-100/90 bg-amber-300/5 ring-1 ring-amber-300/20 rounded-xl px-3 py-2 whitespace-pre-line">
                            <span className="opacity-60">🕉 Гуру: </span>
                            {e.ai_reflection}
                          </div>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </main>
    </div>
  );
}

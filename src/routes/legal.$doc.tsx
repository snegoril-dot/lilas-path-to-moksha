import { createFileRoute, Link, useRouter, notFound } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { LEGAL_DOCS, LEGAL_INDEX, type LegalDocId } from "@/content/legal";

function isLegalDocId(x: string): x is LegalDocId {
  return x in LEGAL_DOCS;
}

export const Route = createFileRoute("/legal/$doc")({
  loader: ({ params }) => {
    if (!isLegalDocId(params.doc)) throw notFound();
    return { doc: LEGAL_DOCS[params.doc] };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.doc.title ?? "Юридическая информация"} — Lila's Path` },
      {
        name: "description",
        content: `${loaderData?.doc.title ?? "Юридическая информация"} приложения Lila's Path to Moksha.`,
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  errorComponent: () => (
    <div className="min-h-dvh grid place-items-center p-6 text-center">
      <div>
        <p className="opacity-70">Не удалось загрузить документ.</p>
        <Link to="/" className="underline">На главную</Link>
      </div>
    </div>
  ),
  notFoundComponent: () => (
    <div className="min-h-dvh grid place-items-center p-6 text-center">
      <div className="space-y-3">
        <p className="opacity-80">Документ не найден.</p>
        <ul className="text-sm space-y-1">
          {LEGAL_INDEX.map((d) => (
            <li key={d.id}>
              <Link to="/legal/$doc" params={{ doc: d.id }} className="underline">
                {d.title}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  ),
  component: LegalDocPage,
});

function LegalDocPage() {
  const { doc } = Route.useLoaderData();
  const router = useRouter();
  return (
    <div className="min-h-dvh px-4 py-6 pb-[env(safe-area-inset-bottom)] max-w-2xl mx-auto">
      <button
        type="button"
        onClick={() => router.history.back()}
        className="inline-flex items-center gap-1.5 text-sm opacity-70 hover:opacity-100 mb-4"
      >
        <ArrowLeft size={16} /> Назад
      </button>
      <h1 className="text-2xl font-semibold mb-1">{doc.title}</h1>
      <p className="text-xs opacity-60 mb-6">
        Обновлено: {new Date(doc.updatedAt).toLocaleDateString("ru-RU")}
      </p>
      <article className="prose prose-invert prose-sm max-w-none whitespace-pre-line leading-relaxed">
        {doc.body}
      </article>

      <div className="mt-10 pt-6 border-t border-white/10">
        <p className="text-xs opacity-60 mb-2">Другие документы:</p>
        <ul className="text-sm space-y-1">
          {LEGAL_INDEX.filter((d) => d.id !== doc.id).map((d) => (
            <li key={d.id}>
              <Link
                to="/legal/$doc"
                params={{ doc: d.id }}
                className="opacity-80 hover:opacity-100 underline underline-offset-2"
              >
                {d.title}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

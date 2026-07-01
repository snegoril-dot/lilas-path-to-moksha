/**
 * Скелетон экрана пути на время загрузки авторизации/данных.
 * Заменяет односложное «Открываю путь…» — даёт ощущение,
 * что интерфейс уже здесь, просто «дышит».
 */
export function PathLoadingSkeleton() {
  return (
    <div
      className="min-h-app flex flex-col p-4 gap-4 bg-gradient-to-b from-[var(--lila-bg)] to-[var(--lila-bg-2)] text-[var(--tg-theme-text-color,#fff)]"
      role="status"
      aria-label="Открываю путь"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-amber-300/70 to-amber-600/70 shadow-[0_0_30px_rgba(251,191,36,0.25)] animate-pulse" />
          <div className="space-y-2">
            <SkelBar className="h-3 w-24" />
            <SkelBar className="h-2.5 w-16 opacity-70" />
          </div>
        </div>
        <SkelBar className="h-8 w-8 rounded-full" />
      </div>

      {/* Board grid skeleton */}
      <div className="mx-auto w-full max-w-md aspect-[8/9] rounded-2xl bg-white/[0.03] ring-1 ring-white/10 p-2">
        <div className="grid grid-cols-8 grid-rows-9 gap-1 h-full">
          {Array.from({ length: 72 }).map((_, i) => (
            <div
              key={i}
              className="rounded-md bg-white/[0.04] animate-pulse"
              style={{ animationDelay: `${(i % 12) * 60}ms` }}
            />
          ))}
        </div>
      </div>

      {/* Cell card skeleton */}
      <div className="rounded-2xl bg-white/[0.03] ring-1 ring-white/10 p-4 space-y-2">
        <SkelBar className="h-3 w-32" />
        <SkelBar className="h-2.5 w-full" />
        <SkelBar className="h-2.5 w-4/5" />
      </div>

      {/* Action bar */}
      <div className="mt-auto flex items-center justify-center gap-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <SkelBar className="h-14 w-14 rounded-2xl" />
        <SkelBar className="h-12 w-40 rounded-full" />
      </div>

      <span className="sr-only">Открываю путь…</span>
    </div>
  );
}

function SkelBar({ className = "" }: { className?: string }) {
  return <div className={`bg-white/10 rounded animate-pulse ${className}`} />;
}

import { createFileRoute } from "@tanstack/react-router";
import { Suspense, lazy, useState } from "react";
import { WelcomeScreen } from "@/components/lila/WelcomeScreen";
import type { GameMode } from "@/lib/game-mode";

const GameApp = lazy(() =>
  import("@/components/lila/GameApp").then((m) => ({ default: m.GameApp })),
);
const RulesModal = lazy(() =>
  import("@/components/lila/RulesModal").then((m) => ({ default: m.RulesModal })),
);

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Лила — Путь к Мокше · рефлексивная игра" },
      { name: "description", content: "Классическая индийская игра Лила как Telegram Mini App: 72 клетки, Санкальпа, Гуру-зеркало и дневник инсайтов." },
      { property: "og:title", content: "Лила — Путь к Мокше" },
      { property: "og:description", content: "Тихая рефлексивная практика: пройди 72 клетки Лилы и услышь свою Санкальпу." },
      { property: "og:url", content: "https://lilas-path-to-moksha.lovable.app/" },
    ],
    links: [{ rel: "canonical", href: "https://lilas-path-to-moksha.lovable.app/" }],
  }),
  component: Index,
});

function GameBootFallback() {
  return (
    <div className="flex h-app min-h-app items-center justify-center bg-[var(--lila-bg)] text-[var(--tg-theme-text-color,#fff)] px-6 text-center">
      <div className="space-y-3">
        <div className="mx-auto h-10 w-10 rounded-full border-2 border-amber-300/30 border-t-amber-300 animate-spin" />
        <div className="text-sm text-amber-100/80">Открываю путь…</div>
      </div>
    </div>
  );
}

function Index() {
  const [rulesOpen, setRulesOpen] = useState(false);
  const [initialGame, setInitialGame] = useState<{ sankalpa: string; mode: GameMode } | null>(null);

  if (initialGame) {
    return (
      <Suspense fallback={<GameBootFallback />}>
        <GameApp
          autoStart
          initialSankalpa={initialGame.sankalpa}
          initialMode={initialGame.mode}
        />
      </Suspense>
    );
  }

  return (
    <>
      <WelcomeScreen
        onStart={(sankalpa, mode = "classic") => setInitialGame({ sankalpa, mode })}
        onRules={() => setRulesOpen(true)}
      />
      {rulesOpen && (
        <Suspense fallback={null}>
          <RulesModal open={rulesOpen} onClose={() => setRulesOpen(false)} />
        </Suspense>
      )}
    </>
  );
}

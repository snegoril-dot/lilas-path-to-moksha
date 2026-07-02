import { createFileRoute } from "@tanstack/react-router";
import { Suspense, lazy, useEffect, useState } from "react";
import { WelcomeScreen } from "@/components/lila/WelcomeScreen";
import type { GameMode } from "@/lib/game-mode";
import { useTelegramInit } from "@/hooks/use-telegram";

const importGameApp = () => import("@/components/lila/GameApp");
const importRulesModal = () => import("@/components/lila/RulesModal");

const GameApp = lazy(() =>
  importGameApp().then((m) => ({ default: m.GameApp })),
);
const RulesModal = lazy(() =>
  importRulesModal().then((m) => ({ default: m.RulesModal })),
);

function prefetchGameChunks() {
  if (typeof window === "undefined") return;
  const w = window as unknown as {
    requestIdleCallback?: (cb: () => void, opts?: { timeout?: number }) => number;
  };
  const run = () => {
    void importGameApp().catch(() => {});
    void importRulesModal().catch(() => {});
  };
  if (w.requestIdleCallback) w.requestIdleCallback(run, { timeout: 4000 });
  else window.setTimeout(run, 2500);
}

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
  // Must run on the very first route chunk: Telegram keeps its native loader
  // until WebApp.ready() is called, so don't wait for the heavy game chunk.
  useTelegramInit();

  const [rulesOpen, setRulesOpen] = useState(false);
  const [initialGame, setInitialGame] = useState<{ sankalpa: string; mode: GameMode } | null>(null);

  // Warm up the game/rules chunks while the user is reading the welcome screen
  // so tapping «Начать игру» opens instantly instead of waiting for a network round-trip.
  useEffect(() => {
    if (!initialGame) prefetchGameChunks();
  }, [initialGame]);

  if (initialGame) {
    return (
      <Suspense fallback={<GameBootFallback />}>
        <GameApp
          autoStart
          initialSankalpa={initialGame.sankalpa}
          initialMode={initialGame.mode}
          onExitToWelcome={() => setInitialGame(null)}
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

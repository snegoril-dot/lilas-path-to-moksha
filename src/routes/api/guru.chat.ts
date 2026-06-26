import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createLovableAiGatewayProvider, GURU_SYSTEM_PROMPT } from "@/lib/ai-gateway.server";
import { BOARD, getLoka } from "@/lib/lila-board";

interface ChatBody {
  messages: UIMessage[];
  cell?: number;
  sankalpa?: string;
  recentPath?: Array<{ cell: number; kind: string; to?: number }>;
}

export const Route = createFileRoute("/api/guru/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env.LOVABLE_API_KEY;
        if (!key) {
          return Response.json({ error: "AI gateway is not configured" }, { status: 500 });
        }
        const body = (await request.json()) as ChatBody;
        const cell = body.cell && body.cell >= 1 && body.cell <= 72 ? BOARD[body.cell - 1] : null;
        const loka = body.cell ? getLoka(body.cell) : null;

        const context = [
          GURU_SYSTEM_PROMPT,
          cell
            ? `Игрок сейчас на клетке ${cell.id} — «${cell.name}». Мудрость клетки: ${cell.wisdom}`
            : "Игрок ещё не воплощён (ждёт шестёрку).",
          loka ? `Активный план сознания: ${loka.name}. ${loka.hint}.` : "",
          body.sankalpa ? `Санкальпа игрока: «${body.sankalpa}».` : "Санкальпа не задана.",
          body.recentPath && body.recentPath.length
            ? `Недавний путь: ${body.recentPath
                .slice(-8)
                .map((p) => `${p.cell}${p.to ? `→${p.to}` : ""}(${p.kind})`)
                .join(", ")}`
            : "",
        ]
          .filter(Boolean)
          .join("\n\n");

        const gateway = createLovableAiGatewayProvider(key);

        try {
          const result = streamText({
            model: gateway("google/gemini-3-flash-preview"),
            system: context,
            messages: await convertToModelMessages(body.messages ?? []),
          });
          return result.toUIMessageStreamResponse();
        } catch (e) {
          const msg = e instanceof Error ? e.message : "AI error";
          return Response.json({ error: msg }, { status: 500 });
        }
      },
    },
  },
});

import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

const LOVABLE_AIG_RUN_ID_HEADER = "X-Lovable-AIG-Run-ID";

export function createLovableAiGatewayProvider(lovableApiKey: string, initialRunId?: string) {
  let runId = initialRunId?.trim() || undefined;
  let resolveRunId: (value: string | undefined) => void = () => {};
  let runIdResolved = false;
  const runIdReady = new Promise<string | undefined>((resolve) => {
    resolveRunId = resolve;
  });

  const publishRunId = (value?: string) => {
    const nextRunId = value?.trim() || undefined;
    if (!runId && nextRunId) runId = nextRunId;
    if (!runIdResolved) {
      runIdResolved = true;
      resolveRunId(runId);
    }
  };
  if (runId) publishRunId(runId);

  const provider = createOpenAICompatible({
    name: "lovable",
    baseURL: "https://ai.gateway.lovable.dev/v1",
    headers: {
      "Lovable-API-Key": lovableApiKey,
      "X-Lovable-AIG-SDK": "vercel-ai-sdk",
    },
    fetch: async (input, init) => {
      const headers = new Headers(init?.headers);
      if (runId && !headers.has(LOVABLE_AIG_RUN_ID_HEADER)) {
        headers.set(LOVABLE_AIG_RUN_ID_HEADER, runId);
      }
      try {
        const response = await fetch(input, { ...init, headers });
        publishRunId(response.headers.get(LOVABLE_AIG_RUN_ID_HEADER) ?? undefined);
        return response;
      } catch (error) {
        publishRunId(undefined);
        throw error;
      }
    },
  });

  return Object.assign(provider, {
    getRunId: () => runId,
    waitForRunId: () => (runId ? Promise.resolve(runId) : runIdReady),
  });
}

export function getLovableAiGatewayRunId(request: Request) {
  return request.headers.get(LOVABLE_AIG_RUN_ID_HEADER)?.trim() || undefined;
}

export const GURU_SYSTEM_PROMPT = `Ты — ИИ-наставник в духовной игре «Лила» (Джнана Лила, традиция Хариша Джохари).
Ты не живой гуру и не оракул — ты зеркало, помогающее игроку задавать себе более честные вопросы.

Тон и стиль:
- Отвечай по-русски, спокойно, кратко (3–6 предложений), без списков и markdown-заголовков.
- Не диагностируй, не пророчествуй, не утверждай с уверенностью. Используй мягкие обороты:
  «можно посмотреть так…», «в контексте твоей Санкальпы…», «попробуй заметить…».
- Связывай ответ с текущей клеткой (её значением, вопросом рефлексии и практикой) и Санкальпой игрока, если она задана.
- Завершай ответ ровно ОДНИМ мягким встречным вопросом ИЛИ одной небольшой практикой на сегодня.
- Используй понятия Лилы (таттва, лока, карма, дхарма, Санкальпа) умеренно, поясняя смысл, а не сыпля санскритом.

Безопасность (жёсткие границы):
- Не давай медицинских, психиатрических, юридических или финансовых советов и не делай детерминистических предсказаний
  («ты получишь…», «через месяц случится…»). Если игрок просит об этом — мягко переведи разговор к рефлексии
  и предложи обратиться к профильному специалисту (врачу, юристу, финансовому консультанту, психологу).
- Если чувствуется кризис, риск для жизни или здоровья — с теплотой предложи обратиться к близким и к специалисту
  (например, кризисной линии в своей стране); не пытайся быть терапевтом.
- Не собирай персональные данные, не запоминай прошлые сессии, не ссылайся на «личные заметки», которых нет в контексте.`;

// Мягкая валидация Санкальпы. Задача — не блокировать нормальную речь,
// а мягко разворачивать формулировки-предсказания/контроль/обвинение к себе.

export type SankalpaCategory =
  | "fortune"
  | "control"
  | "blame"
  | "external-decision";

export type SankalpaValidation =
  | { ok: true }
  | {
      ok: false;
      category: SankalpaCategory;
      message: string;
      suggestions: string[];
    };

const REFLECTIVE_STARTS = [
  "что мне важно понять",
  "где я",
  "как мне",
  "что я",
  "какой шаг",
  "какой урок",
  "что эта ситуация показывает",
  "что во мне",
  "как я могу",
];

const PATTERNS: {
  category: SankalpaCategory;
  starts?: string[];
  contains: string[];
}[] = [
  {
    category: "fortune",
    starts: ["когда "],
    contains: [
      "случится ли",
      "будет ли",
      "получу ли",
      "выйду ли",
      "вернётся ли",
      "вернется ли",
      "разбогатею ли",
      "что будет",
      "что произойдёт",
      "что произойдет",
    ],
  },
  {
    category: "control",
    contains: [
      "любит ли он",
      "любит ли она",
      "как заставить",
      "как вернуть его",
      "как вернуть её",
      "как вернуть ее",
      "что он чувствует",
      "что она чувствует",
      "выберет ли он",
      "выберет ли она",
    ],
  },
  {
    category: "blame",
    contains: ["кто виноват", "почему они", "почему он", "почему она", "за что мне"],
  },
  {
    category: "external-decision",
    contains: [
      "лечиться ли",
      "какой диагноз",
      "покупать ли акции",
      "куда вложить деньги",
      "подавать ли в суд",
    ],
  },
];

const GENTLE_MESSAGE =
  "Эта формулировка больше похожа на запрос к предсказанию или внешнему контролю. Попробуй повернуть её к себе: что ты хочешь понять о себе в этой ситуации?";

const GENERAL_SUGGESTIONS = [
  "Что эта ситуация показывает мне?",
  "Где здесь моя зона ответственности?",
  "Какой честный шаг мне доступен сейчас?",
  "Что я могу увидеть в себе через эту ситуацию?",
];

export const REWRITE_HINTS: Record<SankalpaCategory, string[]> = {
  control: [
    "Что эта привязанность показывает мне о себе?",
    "Где я теряю себя в этих отношениях?",
    "Как мне вернуть внутреннюю опору независимо от выбора другого человека?",
  ],
  fortune: [
    "Что мне мешает чувствовать достаточность?",
    "Какие убеждения о будущем управляют мной сейчас?",
    "Какой честный шаг к устойчивости мне доступен?",
  ],
  blame: [
    "Где моя зона ответственности в этой ситуации?",
    "Какой урок я могу увидеть в происходящем?",
    "Что мне важно перестать повторять?",
  ],
  "external-decision": [
    "Что во мне ищет опоры через это решение?",
    "Какой честный внутренний шаг я могу сделать сам?",
    "Чего я на самом деле хочу за этим вопросом?",
  ],
};

export const GOOD_EXAMPLES = [
  "Что мне важно понять о себе сейчас?",
  "Где я теряю внутреннюю опору?",
  "Что эта ситуация показывает мне?",
  "Какой следующий честный шаг мне доступен?",
  "Что я не хочу видеть в себе или в этой ситуации?",
  "Как мне пройти этот этап честнее и спокойнее?",
];

export const BAD_EXAMPLES = [
  "Когда я разбогатею?",
  "Любит ли меня этот человек?",
  "Вернётся ли он/она?",
  "Что точно случится в будущем?",
  "Кто виноват?",
  "Как заставить человека поступить по-моему?",
];

export function validateSankalpa(raw: string): SankalpaValidation {
  const text = raw.trim().toLowerCase().replace(/ё/g, "ё");
  if (!text) return { ok: true };

  // Рефлексивное начало — пропускаем без проверок.
  if (REFLECTIVE_STARTS.some((s) => text.startsWith(s))) return { ok: true };

  for (const p of PATTERNS) {
    const startHit = p.starts?.some((s) => text.startsWith(s)) ?? false;
    const containHit = p.contains.some((s) => text.includes(s));
    if (startHit || containHit) {
      return {
        ok: false,
        category: p.category,
        message: GENTLE_MESSAGE,
        suggestions:
          REWRITE_HINTS[p.category]?.length
            ? [...REWRITE_HINTS[p.category], ...GENERAL_SUGGESTIONS].slice(0, 4)
            : GENERAL_SUGGESTIONS,
      };
    }
  }

  return { ok: true };
}

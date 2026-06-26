## ИИ-Гуру (Lovable AI)

Персональный наставник на базе **Lovable AI Gateway** (модель по умолчанию `google/gemini-3-flash-preview`, для глубоких рекомендаций — `google/gemini-3.1-pro-preview`). Без BYOK: `LOVABLE_API_KEY` авто-провижится.

### 1. Backend

Включаю **Lovable Cloud** ради БД и `requireSupabaseAuth` (нужна история на пользователя). Анонимная авторизация по Telegram `initData`.

**Схема**

```text
game_sessions
  id uuid pk
  user_id uuid fk
  sankalpa text
  started_at timestamptz
  finished_at timestamptz null
  result text                -- 'moksha' | 'abandoned' | 'in_progress'
  moves_count int

session_events                -- сводка ходов для контекста ИИ
  id bigserial pk
  session_id uuid fk
  cell int                   -- 1..72
  kind text                  -- 'land' | 'snake' | 'ladder' | 'moksha'
  to_cell int null
  loka text
  created_at timestamptz

journal_entries               -- дневник (ручной + авто-сгенерированный)
  id uuid pk
  user_id uuid fk
  session_id uuid null
  cell int null
  prompt text                -- вопрос/повод
  user_text text             -- заметка игрока
  ai_reflection text         -- ответ Гуру
  kind text                  -- 'reflection' | 'cell_qa' | 'weekly'
  created_at timestamptz

guru_chats                    -- Q&A в контексте клетки
  id uuid pk
  user_id uuid fk
  session_id uuid null
  cell int null
  messages jsonb             -- UIMessage[]
  updated_at timestamptz

weekly_recommendations
  id uuid pk
  user_id uuid fk
  week_start date unique
  summary text               -- markdown
  focus_loka text
  practices jsonb            -- [{title, description, daily_minutes}]
  created_at timestamptz
```

GRANT + RLS: каждый видит только свои строки (scoped to `auth.uid()`).

**Server functions** (`createServerFn` + `requireSupabaseAuth`, файл `src/lib/guru.functions.ts`, провайдер из `src/lib/ai-gateway.server.ts`):

- `askGuru({ sessionId, cell, history, question })` — стрим через серверный роут `src/routes/api/guru.chat.ts` (`useChat` + `streamText`). Системный промпт включает: текущую клетку (номер, имя, loka, мудрость из `WISDOMS`), Санкальпу сессии, последние 5 ходов, недавние заметки. Tools: `getCellInfo`, `getRecentJourney` (`stepCountIs(50)`).
- `saveReflection({ sessionId, cell, userText })` → вызывает модель один раз (`generateText` + `Output.object({ insight, question_back })`), сохраняет `journal_entries` и возвращает `ai_reflection`.
- `getJournal({ limit, cursor })` — пагинированный список записей.
- `generateWeeklyRecommendations()` — собирает за 7 дней: завершённые сессии, частые змеи/лестницы, доминирующую loka, тексты заметок. Модель `google/gemini-3.1-pro-preview`, `Output.object` со схемой `{summary, focus_loka, practices:[{title, description, daily_minutes:int}]}`. Сохраняет в `weekly_recommendations` (один на неделю, upsert по `week_start`).

Все промпты на русском, тон — мягкий наставник в стиле Хариша Джохари; никогда не делает медицинских/психиатрических заявлений (системный guard).

**Запись событий**: в существующем игровом цикле (`routes/index.tsx`) добавляю `useServerFn(recordEvent)` после `move/snake/ladder/win` — это и питает контекст ИИ, и формирует историю.

### 2. Frontend

**Кнопка «Спросить Гуру»** на каждом сообщении в ChatFeed (рядом с «Подробнее») → открывает `GuruChatSheet` (bottom-sheet) в контексте этой клетки. Использует `useChat` от `@ai-sdk/react`, транспорт указывает на `/api/guru/chat`. Поддержка `message.parts`, рендер через `react-markdown`. Tools-результаты не показываем, только финальный текст. История чата сохраняется в `guru_chats` (per-cell).

**Рефлексия после змеи/лестницы**: текущий `ReflectionModal` дополняю кнопкой «Получить отклик Гуру» — вызывает `saveReflection`, показывает `ai_reflection` под заметкой. Без кнопки заметка сохраняется молча (как сейчас).

**Дневник** — новый роут `/_authenticated/journal` (через TanStack `_authenticated/`):
- Лента записей (карточка: дата · клетка/loka · prompt · твоя заметка · ответ Гуру в свернутом виде).
- Фильтры: «Все / Рефлексии / Q&A / Недельные».
- Поиск по тексту (ilike).

**Еженедельные рекомендации** — новый роут `/_authenticated/insights`:
- Карточка «Эта неделя» с `summary`, `focus_loka` (бейдж), списком 3–5 практик.
- Кнопка «Сгенерировать заново» (rate-limit: раз в 24 ч на пользователя, проверка на сервере).
- История прошлых недель ниже.
- Пуш-триггер: при открытии Mini App в понедельник, если для текущей недели нет записи и у пользователя ≥1 завершённой сессии — авто-генерация в фоне (server fn, не блокируя UI), затем тост «Новый план готов».

**Навигация**: в шапке добавляю иконку 📓 (журнал) и ✨ (insights), доступны после первой завершённой партии (иначе серым с тултипом «Заверши первую партию»).

### 3. UX-страховки
- Перед первой генерацией показываем дисклеймер: «ИИ-Гуру — это AI-ассистент, а не духовный учитель; используй ответы как повод для размышления». Запоминаем согласие в `profiles.guru_consent_at`.
- Лимиты: askGuru — 30 сообщений/день, weekly — 1/24ч, saveReflection — 20/день. Ошибки 429 от gateway → понятный тост «Гуру отдыхает, попробуй позже»; 402 → «Закончились кредиты, обратитесь к владельцу приложения».
- Стрим обёрнут в `withLovableAiGatewayRunIdHeader` (для будущего observability).

### 4. Что НЕ входит
- Голосовой Гуру (TTS) — отдельная фича, при желании добавлю через `ai-text-to-speech`.
- Векторный поиск по дневнику (RAG) — пока ilike достаточно, добавим если записей станет много.
- Push-уведомления через Telegram bot — отдельная итерация.

### 5. План выкладки
1. Cloud + миграция (5 таблиц, GRANT, RLS, helper `has_role` уже есть из мультиплеера если делали; иначе только базовое).
2. `ai-gateway.server.ts` + системные промпты.
3. `recordEvent` + интеграция в игровой цикл.
4. Стрим-роут `/api/guru/chat` + `GuruChatSheet`.
5. `saveReflection` + кнопка в `ReflectionModal`.
6. Роут `/journal` + список/фильтры.
7. Роут `/insights` + `generateWeeklyRecommendations` + авто-триггер.
8. Дисклеймер, rate-limit, тосты ошибок.

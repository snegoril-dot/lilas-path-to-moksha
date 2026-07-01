
# План: Практики клетки и углубление саморефлексии

Цель — превратить «Лилу» из пробежки в медленную практику. Быстрый флоу остаётся; практика — опция.

## Уточняющие вопросы (нужны до старта)

1. **Хранение практик**: контент шаблонов практик держим в TS-модулях (`src/content/practices/*`) как сейчас с мудростью клеток, или создаём таблицу `practices` в БД и сидим миграцией? Рекомендую **TS-модули** — проще версионирование, редактирование и валидация; в БД храним только пользовательские сессии и записи.
2. **Напоминания через бота**: у нас уже есть webhook бота. Готов ли добавить `pg_cron` задачу, которая раз в час дергает `/api/public/hooks/practice-reminders`? Или отложить на следующую итерацию и сначала выпустить UI без пушей?
3. **Блокировка следующего броска**: во время активной практики полностью запрещаем `roll dice`, или разрешаем «завершить досрочно и бросить» одним кликом? Предлагаю **мягкую блокировку**: главная кнопка меняется на «Вернуться к практике», а «Пропустить практику» доступна вторичным действием.

Если ответов не будет — иду по рекомендованным вариантам (TS-контент, отложить cron, мягкая блокировка).

## Новые файлы

**Контент и типы**
- `src/content/practices/types.ts` — `Practice`, `PracticeStep`, `PracticeDuration`.
- `src/content/practices/cells-01-18.ts`, `cells-19-36.ts`, `cells-37-54.ts`, `cells-55-72.ts` — по 1 практике на клетку минимум.
- `src/content/practices/index.ts` — сборка `PRACTICES_BY_CELL: Record<number, Practice[]>`.
- `scripts/check-practices.ts` — валидатор (все 72 клетки, ≥1 практика, ≥2 шага, ≥3 промпта, без дублей title).

**Серверные функции** (`src/lib/practices.functions.ts`)
- `startPractice({ cellId, practiceId, sankalpaBridge, durationOverride })`
- `getActivePractice()` — для баннера/резюм-диалога
- `completePractice({ sessionId, reflection, resonance, emotions })`
- `abandonPractice({ sessionId })`
- `extendPractice({ sessionId, extraDuration })`
- `addJournalEntry({ sessionId?, cellId, text, tags })`
- `listJournalEntries({ limit, cursor })`
- `getPracticeStats()` — прожитые клетки, средняя длительность, топ-3

**UI компоненты** (`src/components/lila/`)
- `PracticeChooser.tsx` — sheet выбора практики после открытия клетки.
- `PracticeBridgeSheet.tsx` — «Санкальпа-мост» + выбор длительности.
- `ActivePracticeBanner.tsx` — липкая карточка «Ты в клетке N».
- `PracticeReturnSheet.tsx` — экран возвращения (промпты, заметка, резонанс 1–5, эмоции, ритуал завершения).
- `PracticeJournalSheet.tsx` — хронологический дневник + экспорт PNG/MD.
- `WeeklyReviewSheet.tsx` — воскресный обзор.
- `SankalpaHistorySheet.tsx` — история формулировок.
- `MorningSankalpaCard.tsx` — карточка «утренняя санкальпа» на главной.

**Хуки**
- `src/hooks/useActivePractice.ts` — поллинг + локальный кэш.

## Изменяемые компоненты

- `src/routes/index.tsx` + `useGameState` — при `openCell` показываем `PracticeChooser`; блокируем `rollDice`, если есть активная практика; главный CTA переключается на «Вернуться к практике».
- `GameActionBar.tsx` — вторичная кнопка «Пропустить практику» во время паузы.
- `GameHeader.tsx` — точка/значок «активна практика».
- `SettingsSheet.tsx` — секции «Дневник практики», «Тихий режим», «Утренняя санкальпа», ссылки на историю Санкальпы и недельный обзор.
- `GuruChatSheet.tsx` — если активна практика, quick-questions берутся из её `reflectionPrompts`.
- `src/content/narration.ts` — тексты бриджа, возвращения, завершения, тихого режима.
- `src/lib/analytics.ts` — новые события.

## Миграции БД

```text
practice_sessions      (user_id, cell_id, practice_id, status, sankalpa_bridge,
                        duration, started_at, due_at, completed_at, abandoned_at,
                        resonance, emotions[], reflection)
practice_journal_entries (user_id, session_id nullable, cell_id, text, tags[])
practice_reminders     (user_id, enabled, time_of_day, timezone, quiet_until)
sankalpa_history       (user_id, text, source: 'game'|'morning'|'practice')
```
RLS `auth.uid() = user_id`; GRANT `authenticated` + `service_role`.

## Аналитика (events, без содержимого записей)

`practice_started`, `practice_step_checked`, `practice_completed`, `practice_abandoned`, `journal_entry_added`, `weekly_review_opened`, `sankalpa_history_opened`, `quiet_mode_toggled`.

## Порядок реализации (параллельными пачками)

1. **Миграции** (одним вызовом): 4 таблицы + политики + GRANT.
2. **Контент**: типы + 4 файла практик + `index.ts` + `check-practices.ts` (параллельно с миграциями).
3. **Серверные функции** `practices.functions.ts` (после миграций — нужны типы).
4. **UI-компоненты** (параллельно): все sheets + баннер + hook.
5. **Интеграция** в `index.tsx`, `useGameState`, `SettingsSheet`, `GuruChatSheet`.
6. **Тексты и narration** — обновление.
7. **Тесты**: юнит на редьюсер состояния практики + прогон `check-practices.ts` + `tsgo`.

## Ограничения (соблюдаем)

- Быстрый флоу не ломается: «Продолжить без практики» всегда виден.
- Правила движения, змеи, стрелы, Мокша — без изменений.
- Никаких платных фич; только feature-flag `practicesStarsEnabled` в `entitlements.ts` под будущее.
- Тексты — тёплые, на «ты», без медицинских/юридических/финансовых советов и без эзотерического пафоса.
- Никаких новых зависимостей.

## Чек-лист ручной проверки (mobile, Telegram)

1. Открыл клетку → виден выбор «Взять как практику» и «Продолжить без практики»; skip работает как раньше.
2. Выбрал практику → бридж с санкальпой и длительностью; после подтверждения доска приглушена, липкий баннер сверху.
3. Закрыл приложение, вернулся через 10+ минут → сессия жива, баннер показывает клетку и время; можно открыть Дневник и добавить запись.
4. Попытка бросить кубик во время практики → главный CTA заменён на «Вернуться к практике», вторичный «Пропустить» доступен.
5. Экран Возвращения: промпты, заметка, резонанс 1–5, эмоции, ритуал; после сабмита разрешается бросок.
6. Дневник: сортировка по дате, экспорт PNG/MD одной карточки работает, чужих записей не видно.
7. Настройки: «Тихий режим» на неделю; напоминания по умолчанию выключены; переключатели сохраняются.

## Следующий шаг

Ответь на 3 уточняющих вопроса (или скажи «по умолчанию») — сразу запускаю миграции + контент-скелет одной пачкой.

# План: Недельный обзор, Утренняя Санкальпа + проверки

## 1. Недельный обзор «Что показала тебе неделя»
**Новое:**
- `src/lib/weekly-review.functions.ts` — server fn `getWeeklyReview()` с `requireSupabaseAuth`:
  - последние 3 завершённых практики (cell_id, resonance, reflection, completed_at) за 7 дней;
  - последние 3 записи `practice_journal_entries`;
  - средний резонанс, число «прожитых» клеток за неделю.
- `src/components/lila/WeeklyReviewSheet.tsx` — Sheet со списком клеток (Glyph, название, резонанс 1–5 точками), заметками, кнопкой «Поделиться в Telegram».
- Триггер: кнопка «Неделя» в `SettingsSheet.tsx` (Help hub) и авто-подсказка воскресеньем через `HintToast`.

## 2. Утренняя Санкальпа
**Миграция:** уже есть `sankalpa_history (id, user_id, text, created_at, source)`. Добавить `source enum` не нужно — используем text-поле `source` (`morning` / `game`). Убедиться, что колонка есть; если нет — миграция.
**Новое:**
- `src/content/morning-sankalpa.ts` — пул из ~30 вопросов на «ты», ротация по дню года + userId.
- `src/lib/morning-sankalpa.functions.ts` — `getTodayPrompt()`, `answerMorningSankalpa({text})` → пишет в `sankalpa_history` с `source='morning'`.
- `src/components/lila/MorningSankalpaCard.tsx` — карточка на главном экране (`src/routes/index.tsx`), показывается 1×/день (localStorage-флаг `morning-sankalpa:YYYY-MM-DD`), кнопки «Ответить» → textarea → сохранить, «Позже».
- История в `WeeklyReviewSheet` (секция «Санкальпы недели»).

## 3. Проверка metadata (/`, `/journal`, `/insights`)
- Прочитать три файла роутов; убедиться:
  - Уникальные `title`, `description`, `og:title`, `og:description`, `og:url`.
  - `canonical` только на leaf-роуте с абсолютным `https://lilas-path-to-moksha.lovable.app/...`.
  - `og:type` = website на `/`, article на `/journal` и `/insights` (или website — оба ок, лишь бы явно).
- Починить недостающее.

## 4. Проверка narration в чат-ленте
- Прочитать `src/routes/index.tsx` (обработчики Змеи/Лестницы/Мокши/повтора) и `ChatFeed.tsx`.
- Убедиться: сообщения формируются через `narrateSnake`, `narrateLadder`, `narrateMoksha`, `narrateOvershoot`, `narrateRepeat`; обычная клетка использует `CellContextChip` + wisdom.
- Если есть inline-строки — заменить на импорт.

## Технические рамки
- Никаких новых npm-зависимостей.
- RLS уже покрывает `sankalpa_history`, `practice_sessions`, `practice_journal_entries` (`auth.uid()`).
- Аналитика: `weekly_review_opened`, `morning_sankalpa_shown`, `morning_sankalpa_answered`.

## Порядок реализации (батчами)
1. Проверки (metadata + narration) → фиксы, если нужно.
2. Server fns (weekly-review, morning-sankalpa) + миграция при необходимости.
3. Контент (пул вопросов).
4. UI компоненты (MorningSankalpaCard, WeeklyReviewSheet) + интеграции.
5. Аналитика.

## Ручная проверка (мобилка)
1. На главной утром видна карточка «Утренняя Санкальпа», ответ сохраняется.
2. Повторный вход в тот же день — карточка не показывается.
3. Settings → «Неделя» открывает обзор с 3 клетками + резонансом.
4. При выпадении Змеи в чате появляется текст `narrateSnake` (клетка → клетка + пояснение).
5. Проверить <title> вкладки на `/`, `/journal`, `/insights` — разные.
6. Поделиться /journal — og:title/description отличаются от главной.
7. Ответ на Санкальпу появляется в WeeklyReview → «Санкальпы недели».

**Следующий шаг после аппрува:** начну с батча проверок (пункты 3–4), затем миграция при необходимости.
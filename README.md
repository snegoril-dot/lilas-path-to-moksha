# Lila’s Path to Moksha

Telegram Mini App inspired by the classical Indian self-knowledge game **Лила (Jnana Lila)** — a 72-cell board where each roll of the dice is a small mirror of your life.

> **Статус:** публичная бета. Игра играбельна от начала (клетка 6) до Мокши (68), но текст, аналитика и AI-Гуру продолжают дорабатываться на основе обратной связи.

---

## Что делает приложение

- Проводит игрока по классическому пути Лилы (правила Хариша Джохари): 72 клетки, 8 стрел, 9 змей, вход на «шестёрке», выход на Мокше.
- Помогает сформулировать **Санкальпу** (намерение) и удерживать её в фокусе всего пути.
- После каждой клетки предлагает **краткую мудрость, вопрос для рефлексии и практику дня**.
- Ведёт **дневник инсайтов** и сохраняет прогресс между сессиями.
- Подключает **AI-Гуру** — мягкого собеседника, который отвечает в контексте текущей клетки и Санкальпы (без медицинских / юридических / финансовых советов).
- Оформлен под Telegram: нативные темы, BackButton, MainButton, Haptic, safe-area.

## Основные возможности

- Игровое поле 8×9 с анимацией фишки и змеями/стрелами.
- 3D-кубик с честным `Math.random` (в dev-режиме доступен seed).
- Онбординг из 4 экранов для новых игроков.
- Пауза / продолжение / новый путь.
- Автосохранение сессии в Lovable Cloud (Supabase) с HMAC-подписью.
- Секция помощи/настроек: правила, приватность, бета-обратная связь.
- Приватная продуктовая аналитика (без содержимого Санкальпы, рефлексий и сообщений Гуру).
- Форма обратной связи для беты.

## Технологический стек

- **Frontend:** React 19, TypeScript, Vite 7, Tailwind CSS v4, Framer Motion, Lucide.
- **Роутинг / SSR:** TanStack Start + TanStack Router.
- **Backend:** Lovable Cloud (Supabase) — Postgres, Auth, RLS, server-функции.
- **AI:** Lovable AI Gateway (`LOVABLE_API_KEY`), стриминговые ответы.
- **Тесты:** Vitest.
- **Платформа:** Telegram Web App SDK.

## Локальная разработка

```bash
bun install
cp .env.example .env   # заполните значения
bun run dev            # http://localhost:8080
```

Дополнительно:

```bash
bun run build      # продакшен-сборка
bun run preview    # предпросмотр сборки
bun run lint       # ESLint
bun run format     # Prettier
bun run test       # Vitest один прогон
bun run test:watch # Vitest watch
bun run check      # тесты + сборка (CI-гейт)
```

## Переменные окружения

Смотрите `.env.example`. Никогда не коммитьте реальные значения.

| Переменная | Где используется | Заметки |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | клиент | публичный URL проекта |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | клиент | публикуемый ключ (не service role) |
| `SUPABASE_URL` | сервер (SSR / server fn) | зеркало клиентского |
| `SUPABASE_PUBLISHABLE_KEY` | сервер | зеркало клиентского |
| `LOVABLE_API_KEY` | сервер | ключ AI-шлюза, только для server-функций |
| `TELEGRAM_BOT_TOKEN` | сервер (webhook) | никогда не в браузере |
| `MINI_APP_URL` | сервер | HTTPS-адрес опубликованного мини-приложения |
| `TELEGRAM_WEBHOOK_SECRET` | сервер (опц.) | shared secret для `setWebhook` |

`SUPABASE_SERVICE_ROLE_KEY` в Lovable Cloud недоступен и не требуется.

## Telegram Mini App

1. Создайте бота у [@BotFather](https://t.me/BotFather), получите `TELEGRAM_BOT_TOKEN`.
2. `/newapp` → привяжите Web App URL к опубликованному домену (`MINI_APP_URL`, вида `https://<project>.lovable.app`).
3. Опубликуйте проект (`Publish`), затем зарегистрируйте webhook Telegram-бота — он реализован в `src/routes/api/public/telegram/webhook.ts`:

   ```bash
   curl "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook" \
     -d "url=<MINI_APP_URL>/api/public/telegram/webhook" \
     -d "secret_token=<TELEGRAM_WEBHOOK_SECRET>"    # опционально
   ```

4. У бота задайте команды (`/setcommands` в BotFather):

   ```text
   start - Открыть Лилу
   continue - Продолжить путь
   journal - Открыть дневник
   help - Как играть
   ```

5. Внутри Telegram открывайте мини-приложение — SDK и тема применятся автоматически. В обычном браузере игра тоже работает (без нативных кнопок).

### Локальный запуск бота

Специальный процесс для бота не требуется — webhook живёт вместе с приложением (`/api/public/telegram/webhook`). Для локальной отладки поднимите Vite (`bun run dev`), пробросьте порт через `ngrok`/`cloudflared`, установите `setWebhook` на публичный URL. `TELEGRAM_BOT_TOKEN` читается только на сервере и никогда не попадает в клиентский бандл. Бот не отправляет Санкальпу и заметки пользователя — только приглашения открыть Mini App.


## Supabase (Lovable Cloud)

- Backend подключён через Lovable Cloud, миграции лежат в `supabase/migrations`.
- Все пользовательские таблицы (`sessions`, `journal_entries`, `analytics_events`, `beta_feedback`, `guru_usage`) защищены RLS и `GRANT`-ами.
- Для клиента используйте только `@/integrations/supabase/client` с publishable-ключом.
- Серверные функции (`createServerFn`) валидируют пользователя через `requireSupabaseAuth`.

## AI Guru

- Живёт в server-функции `src/routes/api/guru.chat.ts` + `src/lib/ai-gateway.server.ts`.
- Использует модель через Lovable AI Gateway; ключ `LOVABLE_API_KEY` читается только на сервере.
- Дневной лимит на пользователя (`guru_usage` + RPC `increment_guru_usage`).
- Системный промпт задаёт роль «зеркала», запрещает медицинские, юридические и финансовые советы, перенаправляет кризисные ситуации к специалистам.
- Контекст запроса: клетка, тип события (змея/стрела), краткая мудрость, вопрос рефлексии, Санкальпа. Тексты пользователя не логируются.

## Безопасность

- Никаких реальных секретов в репозитории — только `.env.example`.
- Service role key недоступен в Lovable Cloud и **не должен** попадать во фронт.
- `TELEGRAM_BOT_TOKEN` используется только в серверных обработчиках.
- AI-эндпоинт защищён `requireSupabaseAuth` и rate-limit'ом.
- RLS включён для всех приватных таблиц; политики привязаны к `auth.uid()`.
- Telegram `initData` проверяется на сервере (HMAC от `bot_token`).
- Санитайзинг ошибок AI — пользователю не показываются технические детали.

### Чеклист публичного репозитория

- [x] нет реальных секретов в коммите
- [x] нет service role key во фронтенде
- [x] нет Telegram bot token в браузерном коде
- [x] AI-эндпоинт защищён авторизацией и лимитом
- [x] RLS включён для приватных таблиц
- [x] Telegram `initData` валидируется на сервере

## Приватность

- Санкальпа, рефлексии и диалоги с Гуру хранятся только в рамках аккаунта пользователя.
- Аналитика собирает события (роллы, посадки на клетки, открытия модалок), **не** содержимое.
- Пользователь может очистить сессию и дневник из экрана «Помощь / Настройки».
- Данные хранятся в Lovable Cloud (регион и провайдер — см. настройки проекта).

## Тесты

```bash
bun run test        # один прогон
bun run test:watch  # dev-режим
bun run check       # тесты + сборка
```

Ключевые сьюты: `src/lib/gameplay-integrity.test.ts`, `src/lib/cell-experience.test.ts`, `src/lib/session-shape.test.ts`.

## Деплой

- Публикация через Lovable (кнопка **Publish**). Бэкенд деплоится автоматически, фронт — по кнопке **Update** в диалоге публикации.
- Кастомный домен подключается после первой публикации (Project Settings → Domains).
- Пути `/api/public/*` доступны без авторизации — используются для Telegram webhook.

## Скриншоты

_Screenshots coming soon._ Поместите изображения в `docs/screenshots/` (например `welcome.png`, `board.png`, `guru.png`, `journal.png`) и добавьте сюда ссылки.

## Roadmap

- [ ] Полноценная Telegram-аутентификация (проверка `initData` + матчинг с Supabase user)
- [ ] Улучшенная персистентность сессии между устройствами
- [ ] Расширенный дневник (теги, фильтры, экспорт)
- [ ] Итог пути: визуальная карта пройденных клеток и инсайтов
- [ ] Безопасный шаринг результата (без личных заметок)
- [ ] Расширенная бета-обратная связь и NPS
- [ ] Позже: Telegram Stars для поддержки проекта

## Лицензия

Проприетарный прототип на этапе беты. Свяжитесь с автором перед повторным использованием.

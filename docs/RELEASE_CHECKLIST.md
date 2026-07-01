# Release Checklist — Lila’s Path to Moksha

Актуальное состояние перед коммерческим стартом.
Легенда: ✅ готово · 🟡 частично · ❌ ручной шаг, кодом не закрыть.

---

## 1. Безопасность
- ✅ `.env` в `.gitignore`, `.env.example` без секретов.
- ✅ Telegram bot token и Supabase service role только на сервере.
- ✅ `LOVABLE_API_KEY` только в server-функциях.
- ✅ Telegram `initData` валидируется HMAC.
- ✅ Guru rate-limit (6 req/min + дневной лимит через `increment_guru_usage`).
- ✅ RLS на всех приватных таблицах, `SECURITY DEFINER` функции ограничены `authenticated`.
- ✅ Публичные роуты `/api/public/*` проверяют секрет/подпись (Telegram webhook, cron).

## 2. Геймплей
- ✅ Санкальпа, кубик, ожидание рождения, движение, змеи/лестницы, точное попадание на Мокшу.
- ✅ Дневник, пауза/резюм, финальный итог, практики, недельный обзор.

## 3. Telegram Mini App
- ✅ `ready()`, `expand()`, `themeParams`, BackButton, Haptics с fallback.
- ✅ Deep-links: `paywall`, `settings`, `journal`, `cell:*`, реферальные.
- ❌ Ручной прогон в iOS / Android / Desktop / Web клиентах Telegram.

## 4. Мобильный UX
- ✅ Safe areas, нет горизонтального скролла на 320px.
- ✅ `use-keyboard-inset` не даёт клавиатуре прятать «Сохранить».
- ✅ Скелетоны, человеческие тексты ошибок.

## 5. Приватность
- ✅ Санкальпа/рефлексии/переписка с Гуру не уходят в `analytics_events`.
- ✅ Кнопка «Удалить мои данные» (GDPR) в Настройках.
- ✅ Раздел «Приватность» и legal-документы (`/legal/*`).

## 6. Контент
- ✅ 72 клетки, tone-lint, 10 маяковых клеток, практики покрывают все клетки.
- ✅ Онбординг (4 экрана), правила, единый глоссарий (Путь, Санкальпа, Инсайт, Гуру, Мокша).

## 7. Тестирование
- ✅ `bun run lint`, `bunx vitest run`, `bun run build` — зелёные.
- ❌ Ручной e2e-сценарий в мобильном Telegram (bot → mini app → путь → Мокша).

## 8. Монетизация (Telegram Stars)
- ✅ Продукты `deep_guru`, `path_analysis`, `premium_all`, A/B цены, entitlements.
- ✅ Обработка `pre_checkout_query`, `successful_payment`, `refunded_payment` (идемпотентно).
- ✅ Paywall, «Мои покупки», восстановление.
- ❌ Юрлицо/ИП/самозанятость для payout Stars → фиат.
- ❌ Живой тест покупки с реального аккаунта.

## 9. Инфраструктура
- ✅ `pg_cron`: `practice-reminders-5min` (каждые 5 минут).
- ✅ `pg_cron`: `weekly-digest-sunday-18utc` (воскресенье 18:00 UTC).
- ✅ Healthcheck `/api/public/healthcheck` + `notifyAdmin`.
- 🟡 Sentry / внешний мониторинг — не подключён (есть только `analytics_events` + admin-нотификации).
- ❌ `ADMIN_TG_CHAT_ID` и `MINI_APP_URL` в проде — проверить, что заданы.
- ❌ Load-test webhook (20–50 rps).

## 10. BotFather
- ❌ Имя, аватар, About/Description на русском.
- ❌ Команды: /start, /continue, /journal, /help.
- ❌ Menu Button → URL mini app.

## 11. Запуск беты
- ✅ Форма фидбэка → `beta_feedback`.
- ✅ README актуален (стек, известные ограничения, cron SQL).
- ❌ Реальный `@username` поддержки в `VITE_SUPPORT_TG_USERNAME` (сейчас плейсхолдер).
- ❌ Скриншоты / GIF / видео для BotFather, канала, соцсетей.
- ❌ Проверка ссылок с чистого аккаунта Telegram.
- ❌ Закрытая волна 10–20 тестеров.

## 12. Nice-to-have (пост-релиз)
- 🟡 A/B эксперимент цен (код есть, эксперимент не запущен).
- 🟡 TTS-аудио для клеток (инфраструктура готова, контента нет).
- 🟡 Онбординг-видео (сториборд готов).

---

_Обновляй при каждом релизе. Текущее состояние: код готов, остались только ручные шаги (BotFather, юрлицо, живой Stars-тест, тестеры, маркетинг-ассеты)._


## Что делаем

Закрываем два оставшихся блока: **Аналитика и рост** + **Админка**. Один admin-роут `/admin` с вкладками, плюс небольшие клиентские утилиты для рефералов и A/B цен.

## 1. Воронка (Аналитика)

События уже пишутся в `analytics_events` (`app_open`, `sankalpa_saved`, `dice_rolled`, `paywall_purchase_success`). Добавляем:

- `src/lib/analytics.functions.ts` → `getFunnelStats({ from, to })` — считает по 5 шагам:
  1. `install` = distinct `user_id` с `app_open`
  2. `sankalpa` = distinct с `sankalpa_saved`
  3. `first_roll` = distinct с `dice_rolled`
  4. `five_rolls` = distinct у кого ≥5 `dice_rolled`
  5. `purchase` = distinct с `paywall_purchase_success`
- Возвращает абсолюты + % конверсии между шагами.
- Только для admin: серверная проверка `has_role`.

## 2. DAU/MAU/ARPPU

- `getGrowthStats()` — DAU (сегодня), WAU (7д), MAU (30д) из `analytics_events` (distinct `user_id` за окно).
- ARPPU: `SUM(stars_amount) / COUNT(DISTINCT user_id)` за 30д из `stars_payments WHERE refunded_at IS NULL`.
- Total revenue (⭐) за 7/30 дней.

## 3. Админ-роут `/admin`

Файл `src/routes/admin.tsx` (публичный роут, но `beforeLoad` через `checkIsAdmin` — редирект `/` если не админ). 4 таба:

- **Funnel** — таблица шагов + % drop-off.
- **Growth** — карточки DAU/WAU/MAU/ARPPU/Revenue.
- **Purchases** — список последних 100 из `stars_payments` (user_id, product, ⭐, дата, refund статус). Кнопка «Отменить доступ» → server fn `adminRevokeEntitlement`.
- **Users** — поиск по user_id/telegram_id; действия: «Выдать Premium All на 30 дней» (`adminGrantEntitlement`), «Бан» (`adminBanUser` → `profiles.banned_at = now()`).

Все действия — server fns с проверкой admin в handler.

## 4. Бан-механика

Миграция:
- `ALTER TABLE profiles ADD COLUMN banned_at timestamptz`.
- В `guru.chat.ts` и `createStarsInvoice` — ранний отказ при `banned_at IS NOT NULL`.

## 5. Реферальная программа

- Утилита `src/lib/referrals.ts`:
  - `getReferralLink(userId)` → `https://t.me/<bot>?startapp=ref_<short_id>`.
  - Парсинг `ref_<id>` из `start_param` в `src/routes/index.tsx` (уже есть deep-link хендлер).
- Миграция: `referrals(id, referrer_user_id, referred_user_id UNIQUE, created_at, rewarded_at)`.
- Server fn `claimReferral({ refCode })` — вызывается один раз после Санкальпы приглашённого; выдаёт `+7 дней DEEP_GURU` рефереру через `user_entitlements`.
- Секция в `SettingsSheet` → «Пригласить друга» с копированием ссылки и счётчиком приглашённых.

## 6. A/B цены

- `src/lib/ab-pricing.ts`:
  - `getPriceVariant(userId): "A" | "B"` — стабильный хеш (FNV-1a) `userId → mod 2`.
  - `getProductPrice(productId, userId)` — читает базовую цену из `STARS_PRODUCTS`, для варианта B применяет коэффициент из `AB_PRICE_OVERRIDES` (например Deep Guru: A=149, B=129).
- `PaywallSheet` берёт цену через хелпер; событие `ab_price_shown` пишется в analytics.
- В админке новая карточка «A/B pricing» — конверсия по вариантам (`purchase_success` группировано по хешу).

## 7. Технические детали

- Все server fns админки: middleware `requireSupabaseAuth` + внутри `supabase.rpc("has_role")`; при `false` → `throw new Response("Forbidden", { status: 403 })`.
- Тяжёлые SQL агрегаты — через `supabaseAdmin.rpc(...)` с новыми SQL функциями `admin_funnel_stats`, `admin_growth_stats`, `admin_ab_stats` (SECURITY DEFINER, внутри проверяют `has_role`).
- UI: shadcn `Tabs`, `Table`, `Card`. Никакой новой темы — тот же тёмный лиловый.

## Файлы

Новые:
- `src/routes/admin.tsx`
- `src/lib/analytics.functions.ts`
- `src/lib/admin-ops.functions.ts` (grant/revoke/ban)
- `src/lib/referrals.ts` + `src/lib/referrals.functions.ts`
- `src/lib/ab-pricing.ts`
- `src/components/admin/FunnelTable.tsx`, `GrowthCards.tsx`, `PurchasesTable.tsx`, `UsersPanel.tsx`

Правки:
- `src/components/lila/SettingsSheet.tsx` — секция «Пригласить друга» + ссылка на `/admin` для админов.
- `src/components/lila/PaywallSheet.tsx` — цена через `getProductPrice`.
- `src/routes/index.tsx` — обработка `ref_<id>` в start_param.
- `src/routes/api/guru.chat.ts` и `src/lib/entitlements.functions.ts` — проверка бана.

Миграции:
- `profiles.banned_at`.
- Таблица `referrals` + GRANT + RLS.
- SQL функции `admin_funnel_stats`, `admin_growth_stats`, `admin_ab_stats`.

## Что вне scope

- Внешний BI (Metabase/Grafana) — админ-панели встроенной достаточно для беты.
- Пуш-уведомления реферера при регистрации — через существующие Telegram напоминания позже.
- Полноценный banning с апелляциями — MVP: флаг + отказ в API.

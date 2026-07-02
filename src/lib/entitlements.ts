/**
 * Feature access layer.
 *
 * Основной путь (кубик, клетки, дневник, базовый Гуру) всегда открыт бесплатно.
 * Премиум-фичи (deep_guru, final_ai_analysis и т.д.) выдаются через
 * таблицу public.user_entitlements — она уже существует и наполняется
 * серверной верификацией Telegram Stars транзакций
 * (см. src/routes/api/public/stars/*, admin_grant_entitlement).
 *
 * Как расширять:
 *   - добавить фичу в FEATURE_IDS
 *   - описать её в FEATURE_CATALOG (free | premium)
 *   - привязать к продукту в STARS_PRODUCTS
 */

export const FEATURE_IDS = {
  // free / core
  START_PATH: "start_path",
  ROLL_DICE: "roll_dice",
  BASIC_CELL_MEANING: "basic_cell_meaning",
  BASIC_REFLECTIONS: "basic_reflections",
  BASIC_JOURNAL: "basic_journal",
  BASIC_SUMMARY: "basic_summary",
  BASIC_GURU: "basic_guru",

  // future premium
  DEEP_GURU: "deep_guru",
  EXTENDED_CELL: "extended_cell",
  UNLIMITED_JOURNAL: "unlimited_journal",
  FINAL_AI_ANALYSIS: "final_ai_analysis",
  BEAUTIFUL_SHARE_CARD: "beautiful_share_card",
  AUDIO_GUIDANCE: "audio_guidance",
  WEEKLY_RECOMMENDATIONS: "weekly_recommendations",
} as const;

export type FeatureId = (typeof FEATURE_IDS)[keyof typeof FEATURE_IDS];

type Tier = "free" | "premium" | "beta";

interface FeatureMeta {
  tier: Tier;
  /** Мягкий лимит для free-версии (null = без лимита). */
  freeLimit?: number | null;
  /** Короткая подпись для UI-плейсхолдера. */
  comingSoonLabel?: string;
}

export const FEATURE_CATALOG: Record<FeatureId, FeatureMeta> = {
  [FEATURE_IDS.START_PATH]: { tier: "free" },
  [FEATURE_IDS.ROLL_DICE]: { tier: "free" },
  [FEATURE_IDS.BASIC_CELL_MEANING]: { tier: "free" },
  [FEATURE_IDS.BASIC_REFLECTIONS]: { tier: "free", freeLimit: 400 },
  [FEATURE_IDS.BASIC_JOURNAL]: { tier: "free", freeLimit: 100 },
  [FEATURE_IDS.BASIC_SUMMARY]: { tier: "free" },
  [FEATURE_IDS.BASIC_GURU]: { tier: "beta" },

  [FEATURE_IDS.DEEP_GURU]: {
    tier: "premium",
    comingSoonLabel: "Глубокий разбор с Гуру — скоро",
  },
  [FEATURE_IDS.EXTENDED_CELL]: {
    tier: "premium",
    comingSoonLabel: "Расширенная трактовка клетки — скоро",
  },
  [FEATURE_IDS.UNLIMITED_JOURNAL]: {
    tier: "premium",
    comingSoonLabel: "Полная история дневника — скоро",
  },
  [FEATURE_IDS.FINAL_AI_ANALYSIS]: {
    tier: "premium",
    comingSoonLabel: "Итоговый разбор пути — скоро",
  },
  [FEATURE_IDS.BEAUTIFUL_SHARE_CARD]: {
    tier: "premium",
    comingSoonLabel: "Красивая карточка пути — скоро",
  },
  [FEATURE_IDS.AUDIO_GUIDANCE]: {
    tier: "premium",
    comingSoonLabel: "Аудио-проводник — в разработке",
  },
  [FEATURE_IDS.WEEKLY_RECOMMENDATIONS]: {
    tier: "premium",
    comingSoonLabel: "Еженедельные подсказки — скоро",
  },
};

/**
 * Модель entitlements пользователя. В MVP всегда пустая —
 * позже заполняется из user_entitlements после покупки через Stars.
 */
export interface UserEntitlements {
  userId?: string | null;
  isPremium?: boolean;
  features?: Partial<Record<FeatureId, { active: boolean; expiresAt?: string | null }>>;
}

const EMPTY: UserEntitlements = { isPremium: false, features: {} };

export function isPremiumUser(user?: UserEntitlements | null): boolean {
  return Boolean(user?.isPremium);
}

export function canUseFeature(
  user: UserEntitlements | null | undefined,
  feature: FeatureId,
): boolean {
  const meta = FEATURE_CATALOG[feature];
  if (!meta) return false;
  const u = user ?? EMPTY;

  if (meta.tier === "free") return true;
  // Бета: пока открыто всем бета-пользователям.
  if (meta.tier === "beta") return true;

  if (isPremiumUser(u)) return true;
  const ent = u.features?.[feature];
  return Boolean(ent?.active);
}

export function getFeatureLimit(
  user: UserEntitlements | null | undefined,
  feature: FeatureId,
): number | null {
  const meta = FEATURE_CATALOG[feature];
  if (!meta) return 0;
  if (isPremiumUser(user) || canUseFeature(user, feature)) {
    // Премиум/активная подписка снимает free-лимит.
    if (meta.tier === "premium") return null;
  }
  return meta.freeLimit ?? null;
}

export function getComingSoonLabel(feature: FeatureId): string | null {
  return FEATURE_CATALOG[feature]?.comingSoonLabel ?? null;
}

/**
 * Telegram Stars — каркас, без реальных платежей.
 *
 * Product IDs фиксированы, чтобы позже сопоставить их с invoice payload.
 * Настоящая верификация транзакции должна происходить только на сервере
 * (успешный `pre_checkout_query` + `successful_payment` в webhook),
 * запись в user_entitlements — через service role.
 */
export interface StarsProduct {
  id: string;
  title: string;
  description: string;
  /** Стоимость в звёздах Telegram (XTR). */
  stars: number;
  features: FeatureId[];
}

export const STARS_PRODUCTS: Record<
  "DEEP_GURU_PACK" | "PATH_ANALYSIS" | "PREMIUM_ALL",
  StarsProduct
> = {
  DEEP_GURU_PACK: {
    id: "lila.deep_guru.pack",
    title: "Глубокий разговор с Гуру",
    description: "Расширенные ответы Гуру и подробная трактовка каждой клетки.",
    stars: 149,
    features: [FEATURE_IDS.DEEP_GURU, FEATURE_IDS.EXTENDED_CELL],
  },
  PATH_ANALYSIS: {
    id: "lila.path_analysis",
    title: "Итоговый разбор пути",
    description: "AI-разбор всего твоего пути и красивая карточка, чтобы поделиться.",
    stars: 99,
    features: [FEATURE_IDS.FINAL_AI_ANALYSIS, FEATURE_IDS.BEAUTIFUL_SHARE_CARD],
  },
  PREMIUM_ALL: {
    id: "lila.premium.all",
    title: "Полный доступ",
    description:
      "Все премиум-возможности: глубокий Гуру, аудио-проводник, дневник без границ, еженедельные подсказки.",
    stars: 349,
    features: [
      FEATURE_IDS.DEEP_GURU,
      FEATURE_IDS.EXTENDED_CELL,
      FEATURE_IDS.UNLIMITED_JOURNAL,
      FEATURE_IDS.FINAL_AI_ANALYSIS,
      FEATURE_IDS.BEAUTIFUL_SHARE_CARD,
      FEATURE_IDS.AUDIO_GUIDANCE,
      FEATURE_IDS.WEEKLY_RECOMMENDATIONS,
    ],
  },
};

export function findProductById(id: string): StarsProduct | undefined {
  return Object.values(STARS_PRODUCTS).find((p) => p.id === id);
}

/**
 * Собирает UserEntitlements из плоского списка активных фич,
 * прочитанных из public.user_entitlements.
 */
export function buildEntitlements(
  userId: string,
  rows: { feature: string; status: string; expires_at: string | null }[],
): UserEntitlements {
  const now = Date.now();
  const features: NonNullable<UserEntitlements["features"]> = {};
  for (const r of rows) {
    if (r.status !== "active") continue;
    if (r.expires_at && new Date(r.expires_at).getTime() < now) continue;
    features[r.feature as FeatureId] = { active: true, expiresAt: r.expires_at };
  }
  const isPremium = STARS_PRODUCTS.PREMIUM_ALL.features.every((f) => features[f]?.active);
  return { userId, isPremium, features };
}


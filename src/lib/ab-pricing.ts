/**
 * Простое A/B тестирование цены Stars.
 * Стабильный вариант (A|B) по хешу user_id — один и тот же пользователь
 * всегда видит одну цену. Экспериментальные скидки задаются в PRICE_OVERRIDES.
 */
import { STARS_PRODUCTS, type StarsProduct } from "@/lib/entitlements";

export type PriceVariant = "A" | "B";

/** FNV-1a 32-бит — детерминированный, без внешних зависимостей. */
function fnv1a(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h >>> 0;
}

export function getPriceVariant(userId: string | null | undefined): PriceVariant {
  if (!userId) return "A";
  return fnv1a(userId) % 2 === 0 ? "A" : "B";
}

/** Экспериментальные цены для варианта B (в звёздах). */
const PRICE_OVERRIDES_B: Record<string, number> = {
  "lila.deep_guru.pack": 129,
  "lila.path_analysis": 79,
  "lila.premium.all": 299,
};

export function getProductPrice(product: StarsProduct, userId: string | null | undefined): number {
  const variant = getPriceVariant(userId);
  if (variant === "B" && PRICE_OVERRIDES_B[product.id] != null) {
    return PRICE_OVERRIDES_B[product.id];
  }
  return product.stars;
}

export function getAllPrices(userId: string | null | undefined) {
  return Object.values(STARS_PRODUCTS).map((p) => ({
    id: p.id,
    variant: getPriceVariant(userId),
    stars: getProductPrice(p, userId),
    baseStars: p.stars,
  }));
}

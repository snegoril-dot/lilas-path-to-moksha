/**
 * ГПСЧ для бросков кубика.
 *
 * В prod используется `cryptoRandom` — обёртка над `crypto.getRandomValues()`,
 * которая даёт равномерное распределение без модульного смещения. Это не
 * "честный Math.random" (MDN явно предупреждает, что `Math.random()` не даёт
 * криптографически безопасные значения), а честный CSPRNG браузера.
 *
 * Для тестов и e2e можно подать seed через `?seed=` или `window.__LILA_SEED__`
 * — тогда используется детерминированный mulberry32.
 */
export type Rng = () => number;

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Криптографически безопасный источник [0, 1). Использует `crypto.getRandomValues`,
 * если он доступен в рантайме; иначе — деградирует до `Math.random` (только для
 * очень старых окружений без Web Crypto — на практике таких у нас нет).
 */
export const cryptoRandom: Rng = () => {
  const c: Crypto | undefined =
    typeof globalThis !== "undefined" ? (globalThis as { crypto?: Crypto }).crypto : undefined;
  if (c && typeof c.getRandomValues === "function") {
    const buf = new Uint32Array(1);
    c.getRandomValues(buf);
    return buf[0] / 0x1_0000_0000;
  }
  return Math.random();
};

export function rollDice(rng: Rng = cryptoRandom): number {
  return Math.floor(rng() * 6) + 1;
}

/**
 * Подключение seed через URL (?seed=123) или window.__LILA_SEED__ — удобно
 * для e2e-тестов: бросок становится полностью предсказуемым. В prod-сборке
 * этот механизм отключён, чтобы игроки не могли подменять результат кубика.
 */
export function getRuntimeRng(): Rng {
  if (typeof window === "undefined") return cryptoRandom;
  // В прод-сборке никакие URL/window-хуки не действуют.
  if (import.meta.env.PROD) return cryptoRandom;
  const w = window as unknown as { __LILA_SEED__?: number; __LILA_RNG__?: Rng };
  if (w.__LILA_RNG__) return w.__LILA_RNG__;
  let seed: number | undefined = w.__LILA_SEED__;
  try {
    const p = new URLSearchParams(window.location.search).get("seed");
    if (p && !Number.isNaN(Number(p))) seed = Number(p);
  } catch {
    // ignore
  }
  if (seed === undefined) return cryptoRandom;
  const rng = mulberry32(seed);
  w.__LILA_RNG__ = rng;
  return rng;
}

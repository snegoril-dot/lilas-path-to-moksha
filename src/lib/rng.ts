/**
 * Детерминированный ГПСЧ (mulberry32) для воспроизводимых бросков кубика.
 * В проде используется Math.random; для тестов и e2e можно подать seed.
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

export function rollDice(rng: Rng = Math.random): number {
  return Math.floor(rng() * 6) + 1;
}

/**
 * Подключение seed через URL (?seed=123) или window.__LILA_SEED__ — удобно
 * для e2e-тестов: бросок становится полностью предсказуемым.
 */
export function getRuntimeRng(): Rng {
  if (typeof window === "undefined") return Math.random;
  const w = window as unknown as { __LILA_SEED__?: number; __LILA_RNG__?: Rng };
  if (w.__LILA_RNG__) return w.__LILA_RNG__;
  let seed: number | undefined = w.__LILA_SEED__;
  try {
    const p = new URLSearchParams(window.location.search).get("seed");
    if (p && !Number.isNaN(Number(p))) seed = Number(p);
  } catch {
    // ignore
  }
  if (seed === undefined) return Math.random;
  const rng = mulberry32(seed);
  w.__LILA_RNG__ = rng;
  return rng;
}

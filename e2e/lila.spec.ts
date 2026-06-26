import { test, expect } from "@playwright/test";

/**
 * Полный e2e сценарий Лилы: старт → серия бросков по сценарию →
 * выигрыш на клетке 68 (Кайлас / Мокша).
 *
 * Кубик детерминирован: window.__LILA_RNG__ возвращает значения из очереди,
 * нормализованные к диапазону Math.random (см. src/lib/rng.ts -> rollDice).
 */
test("полное прохождение игры до Мокши", async ({ page }) => {
  // Сценарий: 1 +5=6, +4=10(↑23), +4=27(↑41), +6=47, +3=50, +4=54(↑68 Мокша)
  const rolls = [5, 4, 4, 6, 3, 4];

  await page.addInitScript((rolls) => {
    let i = 0;
    (window as unknown as { __LILA_RNG__: () => number }).__LILA_RNG__ = () => {
      const v = rolls[i % rolls.length];
      i += 1;
      return (v - 1) / 6 + 0.0001;
    };
  }, rolls);

  await page.goto("/");
  await page.getByRole("button", { name: /Начать игру/i }).click();

  const rollBtn = page.getByRole("button", { name: /^Бросить$/ });
  for (let i = 0; i < rolls.length; i++) {
    await expect(rollBtn).toBeEnabled({ timeout: 5000 });
    await rollBtn.click();
    await page.waitForTimeout(2200);
  }

  await expect(page.getByText(/Мокш|Кайлас/i).first()).toBeVisible({
    timeout: 5000,
  });
});

import { test, expect } from "@playwright/test";

/**
 * Полный e2e сценарий Лилы: старт → серия бросков по сценарию →
 * выигрыш на клетке 68 (Кайлас / Мокша).
 *
 * Кубик детерминирован: window.__LILA_RNG__ возвращает значения из очереди,
 * нормализованные к диапазону Math.random (см. src/lib/rng.ts -> rollDice).
 */
test("полное прохождение игры до Мокши", async ({ page }) => {
  // Сценарий бросков: 1→6→11(↑33)→36(↑59)→65→68
  const rolls = [5, 5, 3, 6, 3];

  await page.addInitScript((rolls) => {
    let i = 0;
    // rollDice = Math.floor(rng() * 6) + 1 => rng() = (value - 1) / 6 + 0.0001
    (window as unknown as { __LILA_RNG__: () => number }).__LILA_RNG__ = () => {
      const v = rolls[i % rolls.length];
      i += 1;
      return (v - 1) / 6 + 0.0001;
    };
  }, rolls);

  await page.goto("/");

  // Экран приветствия → начать игру
  await page.getByRole("button", { name: /Начать игру/i }).click();

  // Делаем нужное число бросков
  const rollBtn = page.getByRole("button", { name: /^Бросить$/ });
  for (let i = 0; i < rolls.length; i++) {
    await expect(rollBtn).toBeEnabled({ timeout: 5000 });
    await rollBtn.click();
    // ждём окончания анимации хода
    await page.waitForTimeout(1600);
  }

  // Победа: должно появиться "Мокша" / "Кайлас"
  await expect(page.getByText(/Мокш|Кайлас/i).first()).toBeVisible({
    timeout: 5000,
  });
});

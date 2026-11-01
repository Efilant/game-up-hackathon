import { expect, test } from '@playwright/test';
import { startNewRpgGame } from './helpers';

test('savunma kurulmazsa fırtına sonunda bölüm sıfır yıldızla kaybedilir', async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
  await page.goto('/');
  const canvas = await startNewRpgGame(page);
  await canvas.focus();

  const hold = async (key: string, duration: number) => {
    await page.keyboard.down(key);
    await page.waitForTimeout(duration);
    await page.keyboard.up(key);
    await page.waitForTimeout(100);
  };
  const combo = async (keys: string[], duration: number) => {
    for (const key of keys) await page.keyboard.down(key);
    await page.waitForTimeout(duration);
    for (const key of keys) await page.keyboard.up(key);
    await page.waitForTimeout(100);
  };
  const holdInteract = async () => {
    await page.keyboard.down('e'); await page.waitForTimeout(980); await page.keyboard.up('e'); await page.waitForTimeout(150);
  };
  const walkByCompass = async (maxSteps = 14) => {
    const compass = page.locator('.rpg-compass');
    for (let i = 0; i < maxSteps; i += 1) {
      if (Number(await compass.getAttribute('data-compass-distance')) <= 6) return;
      const normalized = (Number(await compass.getAttribute('data-compass-bearing')) + 360) % 360;
      const keys = normalized < 22.5 || normalized >= 337.5
        ? ['w']
        : normalized < 67.5
          ? ['d', 'w']
          : normalized < 112.5
            ? ['d']
            : normalized < 157.5
              ? ['d', 's']
              : normalized < 202.5
                ? ['s']
                : normalized < 247.5
                  ? ['a', 's']
                  : normalized < 292.5
                    ? ['a']
                    : ['a', 'w'];
      await combo(keys, 320);
    }
  };
  const closeDialog = async () => {
    await expect(page.locator('.world-dialog-modal')).toBeVisible({ timeout: 3000 });
    await page.locator('.dialog-close-btn').click();
    await expect(page.locator('.world-dialog-modal')).not.toBeVisible();
    await canvas.focus();
  };

  // Mira -> menfez -> Aras -> gözlem noktası.
  await hold('a', 500); await hold('w', 750); await hold('a', 350); await hold('s', 80);
  await holdInteract(); await closeDialog();
  await combo(['d', 's'], 500); await hold('s', 1150); await hold('d', 4300); await hold('w', 1150); await hold('a', 1000); await walkByCompass();
  await holdInteract(); await closeDialog();
  await hold('a', 450); await hold('w', 450); await combo(['d', 's'], 280); await page.waitForTimeout(500);
  await page.keyboard.press('e'); await closeDialog();
  await hold('d', 70); await hold('s', 620); await walkByCompass(); await expect(page.locator('.world-interaction-prompt')).toContainText('YOL TAŞKIN GÖZLEM', { timeout: 3000 }); await page.keyboard.press('e');
  await closeDialog();
  await expect(canvas).toHaveAttribute('data-weather-phase', /LIGHT_RAIN|HEAVY_RAIN|STORM/, { timeout: 3000 });
  await expect.poll(async () => Number(await canvas.getAttribute('data-peak-flood-depth')), { timeout: 20000 }).toBeGreaterThan(30);

  // 80 tick'lik yağış/toparlanma döngüsünün doğal kayıp sonucunu bekle.
  await expect(page.locator('[data-chapter-outcome="failure"]')).toBeVisible({ timeout: 25000 });
  await expect(page.locator('.ending-sequence-card')).toBeVisible();
  await expect(page.locator('.ending-sequence-card')).toContainText('YETİŞEMEDİK');
  await page.screenshot({ path: 'artifacts/ending-zero-sequence.png', fullPage: true });
  await expect(page.locator('.result-stars .earned')).toHaveCount(0);
  await expect(page.locator('.chapter-result-card')).toContainText('YETİŞEMEDİK');
  await page.screenshot({ path: 'artifacts/star_0_failure.png', fullPage: true });
});

import { expect, test } from '@playwright/test';
import { startNewRpgGame } from './helpers';

test('hazırlık yatırımı fırtına öncesi yapılınca üç yıldız kazanılır', async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
  await page.goto('/');
  const canvas = await startNewRpgGame(page);
  await canvas.focus();

  const hold = async (key: string, duration: number) => {
    await page.keyboard.down(key); await page.waitForTimeout(duration); await page.keyboard.up(key); await page.waitForTimeout(100);
  };
  const combo = async (keys: string[], duration: number) => {
    for (const key of keys) await page.keyboard.down(key); await page.waitForTimeout(duration); for (const key of keys) await page.keyboard.up(key); await page.waitForTimeout(100);
  };
  const holdInteract = async () => {
    await page.keyboard.down('e'); await page.waitForTimeout(980); await page.keyboard.up('e'); await page.waitForTimeout(150);
  };
  const compassNudge = async () => {
    const compass = page.locator('.rpg-compass');
    for (let i = 0; i < 14; i += 1) {
      if (Number(await compass.getAttribute('data-compass-distance')) <= 6) return;
      const bearing = (Number(await compass.getAttribute('data-compass-bearing')) + 360) % 360;
      const keys = bearing < 45 || bearing >= 315 ? ['w'] : bearing < 135 ? ['d'] : bearing < 225 ? ['s'] : ['a'];
      await combo(keys, 320);
    }
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
    await page.locator('.dialog-close-btn').click(); await expect(page.locator('.world-dialog-modal')).not.toBeVisible(); await canvas.focus();
  };

  // Mira'yı bul ve görevi al.
  await hold('a', 500); await hold('w', 750); await hold('a', 350); await hold('s', 80); await page.keyboard.press('e'); await closeDialog();

  // Mira'dan kuzey terasa çıkıp fırtına başlamadan Sünger Kent'i kur.
  await hold('d', 450); await hold('w', 650); await hold('d', 2600);
  await expect(page.locator('.rpg-compass')).toContainText('DRENAJ MENFEZİ');
  await holdInteract();
  await expect(page.locator('.quest-toast-banner')).toContainText('SÜNGER KENT DEVREDE');
  await expect(canvas).toHaveAttribute('data-sponge-operational', 'true', { timeout: 3000 });
  await expect(canvas).toHaveAttribute('data-road-passable', 'true');

  // Menfez -> Aras -> gözlem noktası; hazırlık senaryosu normal görevi sürdürür.
  await combo(['d', 's'], 500); await hold('s', 400); await compassNudge(); await page.waitForTimeout(500);
  await holdInteract(); await closeDialog();
  await hold('a', 450); await hold('w', 450); await combo(['d', 's'], 280); await page.waitForTimeout(500);
  await expect(page.locator('.world-interaction-prompt')).toContainText('MÜHENDİS ARAS');
  await page.keyboard.press('e'); await closeDialog();
  await hold('d', 70); await hold('s', 620); await page.keyboard.press('e');
  await expect.poll(async () => canvas.getAttribute('data-weather-phase'), { timeout: 5000 }).not.toBe('CLEAR');
  await closeDialog();

  // Savunma önceden hazır olduğu için görev doğrudan yol doğrulamaya geçer.
  await expect(canvas).toHaveAttribute('data-road-passable', 'true');
  await hold('w', 180); await walkByCompass(12); await page.keyboard.press('e');
  await expect(page.locator('.world-dialog-modal')).toContainText('GEÇİLEBİLİR');
  await closeDialog();

  // Mira'ya dön.
  await hold('s', 600); await hold('a', 2600); await hold('w', 750); await hold('a', 350); await hold('s', 80);
  await hold('s', 600); await hold('a', 500); await hold('w', 750); await hold('a', 350); await hold('s', 80);
  await hold('d', 500); await hold('s', 600); await hold('a', 700); await hold('w', 750); await hold('a', 350); await hold('s', 80); await walkByCompass(30);
  await expect(page.locator('.rpg-compass')).toHaveAttribute('data-compass-reached', 'true');
  await page.keyboard.press('e');
  await expect(page.locator('[data-chapter-outcome="success"]')).toBeVisible({ timeout: 3000 });
  await expect(page.locator('.ending-sequence-card')).toBeVisible();
  await expect(page.locator('.ending-sequence-card')).toContainText('ŞEHRİN YARINI SENİNLE DEĞİŞTİ!');
  await page.screenshot({ path: 'artifacts/ending-three-sequence.png', fullPage: true });
  await expect(page.locator('.result-stars .earned')).toHaveCount(3);
  await expect(page.locator('.chapter-result-card')).toContainText('72 Kr');
  await page.screenshot({ path: 'artifacts/star_3_prepared.png', fullPage: true });
});

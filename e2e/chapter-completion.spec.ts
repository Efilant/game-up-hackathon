import { expect, test } from '@playwright/test';
import { startNewRpgGame } from './helpers';

test('oyuncu fırtınadan kurtulup savunma kurarak bölümü tamamlar', async ({ page }) => {
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
  const holdCombo = async (keys: string[], duration: number) => {
    for (const key of keys) await page.keyboard.down(key);
    await page.waitForTimeout(duration);
    for (const key of keys) await page.keyboard.up(key);
    await page.waitForTimeout(100);
  };
  const holdInteract = async () => {
    await page.keyboard.down('e');
    await page.waitForTimeout(980);
    await page.keyboard.up('e');
    await page.waitForTimeout(150);
  };
  const walkByCompass = async (maxSteps = 30) => {
    const compass = page.locator('.rpg-compass');
    for (let i = 0; i < maxSteps; i += 1) {
      if (await compass.getAttribute('data-compass-reached') === 'true') return;
      const bearing = Number(await compass.getAttribute('data-compass-bearing'));
      const normalized = (bearing + 360) % 360;
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
      await holdCombo(keys, 320);
    }
  };
  const closeDialog = async () => {
    await expect(page.locator('.world-dialog-modal')).toBeVisible({ timeout: 3000 });
    await page.locator('.dialog-close-btn').click();
    await expect(page.locator('.world-dialog-modal')).not.toBeVisible();
    await canvas.focus();
  };
  const closeDialogIfPresent = async () => {
    const modal = page.locator('.world-dialog-modal');
    if (await modal.isVisible().catch(() => false)) {
      await modal.locator('.dialog-close-btn').click();
      await expect(modal).not.toBeVisible();
    }
    await canvas.focus();
  };

  // Mira -> menfez -> Aras -> fırtına gözlem noktası.
  await hold('a', 500);
  await hold('w', 750);
  await hold('a', 350);
  await hold('s', 80);
  await holdInteract();
  await closeDialog();

  await holdCombo(['d', 's'], 500);
  await hold('s', 1150);
  await hold('d', 4300);
  await hold('w', 1150);
  await hold('a', 1000);
  await walkByCompass();
  await holdInteract();
  await closeDialog();

  await hold('a', 450);
  await hold('w', 450);
  await page.keyboard.press('e');
  await closeDialog();
  await hold('d', 70);
  await hold('s', 620);
  await page.keyboard.press('e');
  await expect.poll(async () => canvas.getAttribute('data-weather-phase'), { timeout: 5000 }).not.toBe('CLEAR');
  await closeDialog();
  await expect.poll(async () => Number(await canvas.getAttribute('data-flood-depth')), { timeout: 5000 }).toBeGreaterThan(30);
  const baselineFloodDepth = Number(await canvas.getAttribute('data-flood-depth'));
  await page.screenshot({ path: 'artifacts/sponge-before-construction.png', fullPage: true });

  // P0 kanıtı: derin çukurdan kuzeydeki güvenli patikaya çıkış artık mümkündür.
  await hold('w', 1050);
  await hold('a', 350);
  await walkByCompass(12);
  await expect(page.locator('.rpg-compass')).toHaveAttribute('data-compass-reached', 'true');
  await holdInteract();
  await expect(page.locator('.world-dialog-modal')).toContainText('SÜNGER KENT');
  await closeDialogIfPresent();
  await expect(canvas).toHaveAttribute('data-sponge-operational', 'true', { timeout: 3000 });
  await expect.poll(async () => Number(await canvas.getAttribute('data-sponge-captured')), { timeout: 5000 }).toBeGreaterThan(0);
  await page.screenshot({ path: 'artifacts/sponge-after-construction.png', fullPage: true });

  // İnşadan sonra yol açılır; oyuncu sonucu denetler.
  await expect(canvas).toHaveAttribute('data-road-passable', 'true');
  await holdCombo(['d', 's'], 400);
  await hold('s', 400);
  await expect(page.locator('.rpg-compass')).toHaveAttribute('data-compass-reached', 'true');
  await page.keyboard.press('e');
  await expect(page.locator('.world-dialog-modal')).toContainText('GEÇİLEBİLİR');
  await expect.poll(async () => Number(await canvas.getAttribute('data-flood-depth')), { timeout: 5000 }).toBeLessThan(baselineFloodDepth);
  await page.screenshot({ path: 'artifacts/sponge-recovery.png', fullPage: true });
  await closeDialog();

  // Son rapor.
  await hold('s', 600);
  await hold('a', 2600);
  await hold('w', 750);
  await hold('a', 350);
  await hold('s', 80);
  await hold('s', 600);
  await hold('a', 500);
  await hold('w', 750);
  await hold('a', 350);
  await hold('s', 80);
  await hold('d', 500);
  await hold('s', 600);
  await hold('a', 700);
  await hold('w', 750);
  await hold('a', 350);
  await hold('s', 80);
  await walkByCompass();
  await expect(page.locator('.rpg-compass')).toHaveAttribute('data-compass-reached', 'true');
  await page.keyboard.press('e');
  await expect(page.locator('[data-chapter-outcome="success"]')).toBeVisible({ timeout: 3000 });
  await expect(page.locator('.result-stars')).toContainText('★');
  await expect(page.locator('.result-stars .earned')).toHaveCount(1);
  await expect(page.locator('.chapter-result-card')).toContainText('HASTANE YOLU');
  await page.screenshot({ path: 'artifacts/sponge-chapter-result.png', fullPage: true });
});

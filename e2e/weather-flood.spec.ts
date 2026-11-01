import { expect, test } from '@playwright/test';
import { startNewRpgGame } from './helpers';

test.describe('weather and flood sequence', () => {
  test('real quest interactions trigger staged storm and localized hospital flooding', async ({ page }) => {
    await page.addInitScript(() => localStorage.clear());
    await page.goto('/');
    const canvas = await startNewRpgGame(page);
    await expect(canvas).toHaveAttribute('data-weather-phase', 'CLEAR');

    const hold = async (key: string, duration: number) => {
      await page.keyboard.down(key);
      await page.waitForTimeout(duration);
      await page.keyboard.up(key);
      await page.waitForTimeout(80);
    };
    const holdCombo = async (keys: string[], duration: number) => {
      for (const key of keys) await page.keyboard.down(key);
      await page.waitForTimeout(duration);
      for (const key of keys) await page.keyboard.up(key);
      await page.waitForTimeout(80);
    };
    const holdInteract = async () => {
      await page.keyboard.down('e');
      await page.waitForTimeout(980);
      await page.keyboard.up('e');
      await page.waitForTimeout(150);
    };
    const closeDialog = async () => {
      await expect(page.locator('.world-dialog-modal')).toBeVisible({ timeout: 2000 });
      const close = page.locator('.dialog-close-btn');
      await close.click();
      await expect(page.locator('.world-dialog-modal')).not.toBeVisible();
    };
    const nudgeToCompassTarget = async (maxSteps = 24) => {
      const compass = page.locator('.rpg-compass');
      for (let i = 0; i < maxSteps; i += 1) {
        if (Number(await compass.getAttribute('data-compass-distance')) <= 6) return;
        const bearing = (Number(await compass.getAttribute('data-compass-bearing')) + 360) % 360;
        const keys = bearing < 22.5 || bearing >= 337.5 ? ['w'] : bearing < 67.5 ? ['d', 'w'] : bearing < 112.5 ? ['d'] : bearing < 157.5 ? ['d', 's'] : bearing < 202.5 ? ['s'] : bearing < 247.5 ? ['a', 's'] : bearing < 292.5 ? ['a'] : ['a', 'w'];
        await holdCombo(keys, 320);
      }
      await expect(compass).toHaveAttribute('data-compass-reached', 'true');
    };

    // Safe spawn -> Mira.
    await hold('a', 500);
    await hold('w', 750);
    await hold('a', 350);
    await hold('s', 80);
    await expect(page.locator('.rpg-compass')).toHaveAttribute('data-compass-reached', 'true');
    await holdInteract();
    await closeDialog();

    // Mira -> drainage culvert.
    await holdCombo(['d', 's'], 500);
    await hold('s', 1150);
    await hold('d', 4300);
    await hold('w', 1150);
    await hold('a', 1000);
    await nudgeToCompassTarget();
    await expect(page.locator('.rpg-compass')).toHaveAttribute('data-compass-reached', 'true');
    await holdInteract();
    await closeDialog();

    // Culvert -> Aras -> flood observation point.
    await hold('a', 450);
    await hold('w', 450);
    await nudgeToCompassTarget();
    await expect(page.locator('.rpg-compass')).toHaveAttribute('data-compass-reached', 'true');
    await page.keyboard.press('e');
    await closeDialog();
    await hold('d', 70);
    await hold('s', 620);
    await nudgeToCompassTarget();
    await expect(page.locator('.rpg-compass')).toHaveAttribute('data-compass-reached', 'true');
    await page.keyboard.press('e');

    await expect(canvas).toHaveAttribute('data-weather-phase', 'LIGHT_RAIN');
    await expect(page.locator('.hud-weather-badge[data-weather-phase="LIGHT_RAIN"]')).toBeVisible();
    await closeDialog();
    await page.screenshot({ path: 'artifacts/rain-light-improved.png', fullPage: true });
    await expect.poll(async () => canvas.getAttribute('data-weather-phase'), { timeout: 5000 }).toBe('EXTREME_STORM');
    await expect.poll(async () => Number(await canvas.getAttribute('data-flood-depth')), { timeout: 5000 }).toBeGreaterThan(30);
    await expect(canvas).toHaveAttribute('data-road-passable', 'false');
    await expect(page.locator('.hud-weather-badge')).toContainText('SÜPER HÜCRE FIRTINASI');
    await page.screenshot({ path: 'artifacts/rain-extreme-improved.png', fullPage: true });
  });
});

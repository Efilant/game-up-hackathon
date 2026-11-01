import { test, expect } from '@playwright/test';
import { startNewRpgGame } from './helpers';

test.use({
  video: 'on',
  viewport: { width: 1440, height: 900 },
  reducedMotion: 'reduce',
});

test('short real gameplay capture for visual review', async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
  await page.goto('/');
  await startNewRpgGame(page);
  await page.waitForTimeout(1400);
  await page.locator('.world-canvas').focus();

  const move = async (key: string, duration: number) => {
    await page.keyboard.down(key);
    await page.waitForTimeout(duration);
    await page.keyboard.up(key);
  };

  await move('a', 420);
  await move('w', 620);
  await move('a', 280);
  await move('s', 120);
  await page.waitForTimeout(700);
  await page.keyboard.press('e');
  await page.waitForTimeout(1300);
  if (await page.locator('.world-dialog-modal').isVisible().catch(() => false)) {
    await page.locator('.dialog-close-btn').click();
  }
  await move('d', 700);
  await move('s', 320);
  await page.waitForTimeout(1200);
});

import { expect, test } from '@playwright/test';
import { startNewRpgGame } from './helpers';

test.use({ viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true });

test('360x740 mobil yerleşiminde oyun alanı ve joystick taşmaz', async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
  await page.goto('/');
  await startNewRpgGame(page);
  await expect(page.locator('.mobile-joystick-zone')).toBeVisible();
  await expect.poll(() => page.evaluate(() => ({
    width: document.documentElement.scrollWidth,
    viewport: window.innerWidth,
  }))).toEqual({ width: 360, viewport: 360 });
  await expect(page.locator('.hud-hero-chip')).toBeVisible();
  await page.screenshot({ path: 'artifacts/mobile-360x740.png', fullPage: true });
});

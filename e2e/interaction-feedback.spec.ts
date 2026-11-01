import { expect, test, type Page } from '@playwright/test';
import { startNewRpgGame } from './helpers';

async function enterDrainageArea(page: Page) {
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
  const walkByCompass = async (maxSteps = 60) => {
    const compass = page.locator('.rpg-compass');
    for (let i = 0; i < maxSteps; i += 1) {
      if (await compass.getAttribute('data-compass-reached') === 'true') return;
      const bearing = (Number(await compass.getAttribute('data-compass-bearing')) + 360) % 360;
      const keys = bearing < 22.5 || bearing >= 337.5 ? ['w'] : bearing < 67.5 ? ['d', 'w'] : bearing < 112.5 ? ['d'] : bearing < 157.5 ? ['d', 's'] : bearing < 202.5 ? ['s'] : bearing < 247.5 ? ['a', 's'] : bearing < 292.5 ? ['a'] : ['a', 'w'];
      await combo(keys, 320);
    }
  };

  await hold('a', 500);
  await hold('w', 750);
  await hold('a', 350);
  await hold('s', 80);
  await page.keyboard.press('e');
  await expect(page.locator('.world-dialog-modal')).toBeVisible();
  const miraPortrait = page.locator('.world-dialog-modal .dialog-avatar-img');
  await expect(miraPortrait).toHaveAttribute('src', '/assets/characters/mira-portrait.png');
  await expect.poll(() => miraPortrait.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
  await page.screenshot({ path: 'artifacts/mira-dialog-portrait-fixed.png', fullPage: true });
  await page.locator('.dialog-close-btn').click();

  await combo(['d', 's'], 500);
  await hold('s', 1150);
  await hold('d', 4300);
  await hold('w', 1150);
  await hold('a', 1000);
  await walkByCompass();
  await expect(page.locator('.rpg-compass')).toHaveAttribute('data-compass-reached', 'true');
  await expect(page.locator('.prompt-action-btn')).toHaveAttribute('data-hold-interaction', 'true');
  return canvas;
}

test('menfez incelemesi erken bırakmayı iptal eder ve basılı tutunca görevi ilerletir', async ({ page }) => {
  const canvas = await enterDrainageArea(page);

  await page.keyboard.down('e');
  await page.waitForTimeout(260);
  await expect(canvas).toHaveAttribute('data-interaction-hold-active', 'true');
  await expect.poll(async () => Number(await canvas.getAttribute('data-interaction-hold-progress'))).toBeGreaterThan(0);
  await page.keyboard.up('e');
  await expect(canvas).toHaveAttribute('data-interaction-hold-active', 'false');
  await expect(page.locator('.quest-toast-banner')).toContainText('ETKİLEŞİM İPTAL');
  await expect(page.locator('.world-dialog-modal')).toHaveCount(0);

  await page.keyboard.down('e');
  await page.waitForTimeout(980);
  await page.keyboard.up('e');
  await expect(page.locator('.world-dialog-modal')).toContainText('DRENAJ KAPASİTE RAPORU');
  await expect(canvas).toHaveAttribute('data-interaction-hold-active', 'false');
  await page.screenshot({ path: 'artifacts/interaction-hold-keyboard.png', fullPage: true });
});

test('mobil etkileşim düğmesi menfez incelemesini basılı tutma ile tamamlar', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'Touch interaction is only rendered in mobile projects.');
  await enterDrainageArea(page);
  const canvas = page.locator('.world-canvas');
  const button = page.locator('.mobile-interact-btn');
  await expect(button).toHaveAttribute('data-hold-interaction', 'true');

  const dispatchPointer = async (type: 'pointerdown' | 'pointerup') => page.evaluate((eventType) => {
    const target = document.querySelector<HTMLButtonElement>('.mobile-interact-btn');
    if (!target) throw new Error('Mobile interaction button is missing');
    target.dispatchEvent(new PointerEvent(eventType, { bubbles: true, cancelable: true, pointerId: 7, pointerType: 'touch', isPrimary: true }));
  }, type);

  await dispatchPointer('pointerdown');
  await page.waitForTimeout(260);
  await expect(canvas).toHaveAttribute('data-interaction-hold-active', 'true');
  await dispatchPointer('pointerup');
  await expect(page.locator('.quest-toast-banner')).toContainText('ETKİLEŞİM İPTAL');

  await dispatchPointer('pointerdown');
  await page.waitForTimeout(980);
  await dispatchPointer('pointerup');
  await expect(page.locator('.world-dialog-modal')).toContainText('DRENAJ KAPASİTE RAPORU');
  await page.screenshot({ path: 'artifacts/interaction-hold-mobile.png', fullPage: true });
});

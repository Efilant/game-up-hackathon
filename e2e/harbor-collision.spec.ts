import { expect, test } from '@playwright/test';
import { startNewRpgGame } from './helpers';

test('liman su kenarı ve iskele aralıkları gerçek hareketle kapalı, iskele güverteleri açık', async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
  await page.goto('/');
  const canvas = await startNewRpgGame(page);
  await canvas.focus();

  const hold = async (key: string, duration: number) => {
    await page.keyboard.down(key);
    await page.waitForTimeout(duration);
    await page.keyboard.up(key);
    await page.waitForTimeout(180);
  };
  const position = async () => ({
    x: Number(await canvas.getAttribute('data-player-x')),
    y: Number(await canvas.getAttribute('data-player-y')),
  });

  // Kıyı Mahallesi'ne yalnızca gerçek klavye hareketiyle ulaş.
  await hold('d', 1200);
  await hold('s', 2100);
  await hold('a', 700);
  await hold('s', 2400);
  await expect.poll(() => canvas.getAttribute('data-current-district')).toBe('kıyı');

  const beforeWater = await position();
  await hold('s', 1500);
  const afterWater = await position();
  expect(afterWater.y).toBeLessThan(1200);
  expect(afterWater.y).toBeGreaterThan(beforeWater.y);
  await expect(page.locator('.quest-toast-kicker')).toContainText('KIYI SINIRI');
  await page.screenshot({ path: 'artifacts/harbor-water-edge-blocked.png', fullPage: true });

  // Quay üzerinde aralıkta kalan bir noktaya yürü; suya geçiş durmalı.
  const toGapMs = Math.max(0, ((afterWater.x - 250) / 210) * 1000);
  await hold('a', toGapMs);
  const beforeGap = await position();
  await hold('s', 700);
  const afterGap = await position();
  expect(afterGap.y).toBeLessThan(1200);
  expect(afterGap.y - beforeGap.y).toBeLessThan(18);
  await page.screenshot({ path: 'artifacts/harbor-pier-gap-blocked.png', fullPage: true });

  // Birkaç metre doğudaki işaretli iskele güvertesi gerçek hareketle geçilebilir.
  await hold('d', 500);
  const beforeDeck = await position();
  await hold('s', 500);
  const afterDeck = await position();
  expect(afterDeck.y).toBeGreaterThan(beforeDeck.y + 12);
  expect(afterDeck.y).toBeLessThan(1245);
  await page.screenshot({ path: 'artifacts/harbor-pier-walkable.png', fullPage: true });
});

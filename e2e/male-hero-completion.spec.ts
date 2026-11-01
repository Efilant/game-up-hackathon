import { expect, test } from '@playwright/test';
import { startNewRpgGame } from './helpers';

test('Barış ile ilk bölüm gerçek oynanışla tamamlanır', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Barış rotası masaüstü klavye acceptance senaryosudur; mobil kahraman/etkileşim akışı ayrı test edilir.');
  await page.addInitScript(() => localStorage.clear());
  await page.goto('/');
  const canvas = await startNewRpgGame(page, { hero: 'male' });
  await canvas.focus();

  await expect(page.locator('.hud-hero-chip')).toContainText('Barış');

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
    await page.keyboard.down('e');
    await page.waitForTimeout(980);
    await page.keyboard.up('e');
    await page.waitForTimeout(150);
  };
  const closeDialog = async () => {
    await expect(page.locator('.world-dialog-modal')).toBeVisible({ timeout: 3000 });
    await page.locator('.dialog-close-btn').click();
    await expect(page.locator('.world-dialog-modal')).not.toBeVisible();
    await canvas.focus();
  };
  const compassNudge = async () => {
    const compass = page.locator('.rpg-compass');
    let stagnantSteps = 0;
    for (let i = 0; i < 40; i += 1) {
      const distance = Number(await compass.getAttribute('data-compass-distance'));
      if (distance <= 6) return;
      const normalized = (Number(await compass.getAttribute('data-compass-bearing')) + 360) % 360;
      const keys = normalized < 22.5 || normalized >= 337.5 ? ['w'] : normalized < 67.5 ? ['d', 'w'] : normalized < 112.5 ? ['d'] : normalized < 157.5 ? ['d', 's'] : normalized < 202.5 ? ['s'] : normalized < 247.5 ? ['a', 's'] : normalized < 292.5 ? ['a'] : ['a', 'w'];
      await combo(keys, 320);
      const nextDistance = Number(await compass.getAttribute('data-compass-distance'));
      if (nextDistance >= distance - 0.25) stagnantSteps += 1; else stagnantSteps = 0;
      if (stagnantSteps >= 3) {
        await combo(normalized < 180 ? ['d'] : ['a'], 360);
        stagnantSteps = 0;
      }
    }
  };

  // Mira, menfez, Aras, gözlem.
  await hold('a', 500); await hold('w', 750); await hold('a', 350); await hold('s', 80);
  await holdInteract(); await closeDialog();
  await combo(['d', 's'], 500); await hold('s', 1150); await hold('d', 4300); await hold('w', 1150); await hold('a', 1000); await compassNudge();
  await holdInteract(); await closeDialog();
  await hold('a', 450); await hold('w', 450); await holdInteract(); await closeDialog();
  await hold('d', 70); await hold('s', 620); await page.keyboard.press('e');
  await closeDialog();
  await expect.poll(async () => canvas.getAttribute('data-weather-phase'), { timeout: 5000 }).not.toBe('CLEAR');

  // Sponge City, road inspection, Mira report.
  await hold('w', 1050); await hold('a', 350);
  await expect(page.locator('.rpg-compass')).toHaveAttribute('data-compass-reached', 'true');
  await holdInteract();
  await expect(page.locator('.world-dialog-modal')).toContainText('SÜNGER KENT');
  await closeDialog();
  await expect(canvas).toHaveAttribute('data-sponge-operational', 'true', { timeout: 3000 });
  await expect(canvas).toHaveAttribute('data-road-passable', 'true');
  await combo(['d', 's'], 400); await hold('s', 400);
  await expect(page.locator('.rpg-compass')).toHaveAttribute('data-compass-reached', 'true');
  await page.keyboard.press('e'); await closeDialog();
  await hold('s', 600); await hold('a', 2600); await hold('w', 750); await hold('a', 350); await hold('s', 80);
  await hold('s', 600); await hold('a', 500); await hold('w', 750); await hold('a', 350); await hold('s', 80);
  await hold('d', 500); await hold('s', 600); await hold('a', 700); await hold('w', 750); await hold('a', 350); await hold('s', 80); await compassNudge();
  await expect(page.locator('.rpg-compass')).toHaveAttribute('data-compass-reached', 'true');
  await page.keyboard.press('e');
  await expect(page.locator('[data-chapter-outcome="success"]')).toBeVisible({ timeout: 3000 });
  await expect(page.locator('.chapter-result-card')).toContainText('ŞEHİR TOPARLANMAYA BAŞLADI');
});

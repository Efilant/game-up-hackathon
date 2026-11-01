import { expect, test } from '@playwright/test';
import { startNewRpgGame } from './helpers';

test('oyuncu tek dünyada dört şehir bölgesini gerçek yürüyüşle keşfeder', async ({ page }) => {
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
  const walk = async (keys: string[], duration: number) => {
    for (const key of keys) await page.keyboard.down(key);
    await page.waitForTimeout(duration);
    for (const key of keys) await page.keyboard.up(key);
    await page.waitForTimeout(180);
  };
  const district = () => canvas.getAttribute('data-current-district');

  await expect.poll(district).toBe('merkez');
  await page.screenshot({ path: 'artifacts/district_old_town.png', fullPage: true });

  // Eski Merkez'den ana cadde üzerinden Yamaç Evleri'ne geç.
  await hold('d', 1200);
  await expect.poll(district, { timeout: 3000 }).toBe('yamaç');
  await page.screenshot({ path: 'artifacts/district_hillside_hospital.png', fullPage: true });
  await page.screenshot({ path: 'artifacts/district_compass_navigation.png', fullPage: true });

  // Aynı yol ağı üzerinden güneydeki Kıyı Mahallesi'ne in.
  await walk(['s'], 2100);
  await hold('a', 700); await hold('s', 2400);
  await expect.poll(district, { timeout: 3000 }).toBe('kıyı');
  await page.screenshot({ path: 'artifacts/district_coastal_harbor.png', fullPage: true });

  // Alt bulvarı izleyerek doğudaki Sanayi Koridoru'na geç.
  await hold('d', 900);
  await expect.poll(district, { timeout: 3000 }).toBe('sanayi');
  await page.screenshot({ path: 'artifacts/district_industrial.png', fullPage: true });

  // Dünya koordinatları ve keşif sistemi tek uygulama yüzeyinde kalır.
  await expect(canvas).toHaveAttribute('data-discovered-districts', /merkez/);
  await expect(canvas).toHaveAttribute('data-discovered-districts', /yamaç/);
  await expect(canvas).toHaveAttribute('data-discovered-districts', /kıyı/);
  await expect(canvas).toHaveAttribute('data-discovered-districts', /sanayi/);
  await expect(page.locator('.hud-location-label')).toContainText('Sanayi Koridoru');
  await expect.poll(() => page.evaluate(() => localStorage.getItem('felaket_benim_quest_save_v2') ?? '')).toContain('city_explorer');
  await expect(page.locator('.achievement-unlock-toast')).toBeVisible({ timeout: 3000 });
  await page.screenshot({ path: 'artifacts/branding-badge-unlock.png', fullPage: true });
  await page.screenshot({ path: 'artifacts/district_transitions.png', fullPage: true });
});

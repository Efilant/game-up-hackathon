import { expect, test } from '@playwright/test';
import { startNewRpgGame } from './helpers';

test('unified RPG entry evidence', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Desktop entry evidence');
  await page.addInitScript(() => localStorage.clear());
  await page.goto('/');
  await page.screenshot({ path: 'artifacts/01_new_main_menu.png', fullPage: true });

  await page.getByRole('button', { name: 'YENİ OYUN ↗' }).click();
  await expect(page.getByRole('dialog', { name: 'Yeni oyun kurulumu' })).toBeVisible();
  await page.screenshot({ path: 'artifacts/02_character_selection.png', fullPage: true });

  await page.getByRole('dialog', { name: 'Yeni oyun kurulumu' }).getByRole('button', { name: 'ŞEHRE GİR ↗' }).click();
  const canvas = page.locator('.world-canvas');
  await expect(canvas).toBeVisible();
  await expect(page.locator('.chapter-curtain')).not.toBeVisible({ timeout: 3000 });
  await expect(canvas).toHaveAttribute('data-current-district', 'merkez');
  await page.screenshot({ path: 'artifacts/03_rpg_first_spawn.png', fullPage: true });
  const expandQuest = page.getByRole('button', { name: 'Görev ayrıntısını aç' });
  if (await expandQuest.isVisible()) await expandQuest.click();
  await page.screenshot({ path: 'artifacts/04_rpg_quest.png', fullPage: true });
});

test('mobile unified RPG entry evidence', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'Mobile entry evidence');
  await page.addInitScript(() => localStorage.clear());
  await page.goto('/');
  await page.screenshot({ path: 'artifacts/08_mobile_main_menu.png', fullPage: true });
  await startNewRpgGame(page);
  await expect(page.locator('.mobile-joystick-zone')).toBeVisible();
  await page.screenshot({ path: 'artifacts/09_mobile_rpg.png', fullPage: true });
});

test('continue restores the RPG world without tactical fallback', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem('felaket_benim_quest_save_v2', JSON.stringify({
      saveVersion: 4,
      questStep: 3,
      heroType: 'male',
      gameMode: 'adventure',
      player: { x: 700, y: 620, facing: 'up' },
      activeDefenses: [],
      budgetUsed: 0,
      discoveredSolutions: ['uyarı'],
      investigatedSolutions: ['uyarı'],
      pendingPlan: [],
      planConfirmed: false,
    }));
  });
  await page.goto('/');
  const continueButton = page.getByRole('button', { name: /DEVAM ET/ });
  await expect(continueButton).toBeEnabled();
  await continueButton.click();
  await expect(page.locator('.world-canvas')).toBeVisible();
  await expect(page.locator('.hud-hero-chip')).toContainText('Barış');
  await expect(page.getByRole('button', { name: /TAKTİK HARİTA/ })).toHaveCount(0);
});


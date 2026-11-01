import { test, expect } from '@playwright/test';
import { startNewRpgGame } from './helpers';

test('Capture real browser screenshots of RPG compass navigation & EKO guidance', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Bu screenshot senaryosu masaüstü HUD kapsamındadır; mobil HUD visual-acceptance testiyle doğrulanır.');
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'ŞEHRİN YARINI.' })).toBeVisible();

  // 1. Enter the Pixel-Art World
  await startNewRpgGame(page);

  // 2. Verify Redesigned Quest Tracker Panel
  await expect(page.locator('.quest-tracker-card')).toBeVisible();
  await expect(page.locator('.quest-chapter-tag')).toContainText('BÖLÜM 1');
  await expect(page.locator('.quest-step-pill')).toContainText('GÖREV 1/7');
  await expect(page.locator('.quest-tracker-title')).toContainText("Mira'yı Bul");
  const questExpand = page.getByRole('button', { name: 'Görev ayrıntısını aç' });
  if (await questExpand.isVisible().catch(() => false)) await questExpand.click();
  await expect(page.locator('.quest-target-distance-badge')).toContainText('ARAŞTIRMA İSTASYONU');
  await expect(page.locator('.rpg-compass')).toBeVisible();
  await expect(page.locator('.rpg-compass')).toHaveAttribute('data-compass-target', /ARAŞTIRMA İSTASYONU/);
  await expect(page.locator('.offscreen-compass-arrow')).toHaveCount(0);

  // The first-time guide is tested as part of the gameplay feedback flow;
  // dismiss it here so the EKO toggle is a direct visual QA target.
  const firstGuide = page.getByRole('button', { name: 'Kılavuzu kapat' });
  if (await firstGuide.isVisible().catch(() => false)) await firstGuide.click();

  // Verify Hero Selector Chip & Open Modal
  await expect(page.locator('.hud-hero-chip')).toBeVisible();
  await page.locator('.hud-hero-chip').click();
  await expect(page.locator('.hero-select-modal')).toBeVisible();
  await page.screenshot({ path: 'artifacts/hero-select-modal.png', fullPage: true });
  await page.locator('.hero-card').last().click(); // Select Barış
  await expect(page.locator('.hud-hero-chip')).toContainText('Barış');

  // Verify Radar Canvas
  await expect(page.locator('.radar-canvas-view')).toBeVisible();
  await expect(page.locator('.radar-legend-bar')).toContainText('Hedef');

  // 3. Toggle EKO Smart Hint
  await page.locator('.quest-hint-toggle-btn').click();
  await expect(page.locator('.eko-companion-card')).toBeVisible();
  await expect(page.locator('.eko-card-title')).toContainText('MİRA');

  // Wait for the compass, pixel hospital, and ambient citizens to render.
  await page.waitForTimeout(1200);
  await page.screenshot({ path: 'artifacts/quest-navigation-and-trail.png', fullPage: true });

  // Close EKO hint
  await page.locator('.eko-card-close-btn').click();
  await expect(page.locator('.eko-companion-card')).not.toBeVisible();

  // 4. Test Player Interaction
  await page.keyboard.press('KeyE');
  await page.waitForTimeout(500);

  // If dialogue appears, take screenshot and close it
  if (await page.locator('.world-dialog-modal').isVisible()) {
    await page.screenshot({ path: 'artifacts/pixel-quest-dialogue.png', fullPage: true });
    await page.locator('.dialog-close-btn, .primary-button').first().click();
  }
});


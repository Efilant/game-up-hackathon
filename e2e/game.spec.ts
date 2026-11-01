import { expect, test } from '@playwright/test';
import { startNewRpgGame } from './helpers';

test('tek girişli RPG akışı menüden şehre ve gerçek etkileşime ulaşır', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  await page.addInitScript(() => localStorage.clear());
  await page.goto('/');

  await expect(page.getByRole('button', { name: 'YENİ OYUN ↗' })).toBeVisible();
  await expect(page.getByRole('button', { name: /ŞEHRE İN/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /TAKTİK HARİTA/ })).toHaveCount(0);

  const canvas = await startNewRpgGame(page);
  await expect(canvas).toHaveAttribute('data-current-district', 'merkez');
  await expect(page.getByRole('button', { name: /TAKTİK HARİTA/ })).toHaveCount(0);
  await expect(page.locator('.rpg-compass')).toBeVisible();
  expect(errors).toEqual([]);
});

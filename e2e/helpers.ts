import { expect, type Page } from '@playwright/test';

export async function startNewRpgGame(
  page: Page,
  options: { hero?: 'female' | 'male'; mode?: 'relaxed' | 'adventure' } = {},
) {
  await page.getByRole('button', { name: 'YENİ OYUN ↗' }).click();
  const setup = page.getByRole('dialog', { name: 'Yeni oyun kurulumu' });
  await expect(setup).toBeVisible();
  if (options.hero === 'male') await setup.locator('[data-hero-choice="male"]').click();
  if (options.mode === 'adventure') await setup.getByRole('button', { name: /MACERA/ }).click();
  await setup.getByRole('button', { name: 'ŞEHRE GİR ↗' }).click();
  const canvas = page.locator('.world-canvas');
  await expect(canvas).toBeVisible();
  await expect(page.locator('.chapter-curtain')).not.toBeVisible({ timeout: 3000 });
  return canvas;
}


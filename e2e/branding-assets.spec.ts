import { expect, test } from '@playwright/test';

test('logo, badge collection, chapter art and calculated star assets load in the real UI', async ({ page }, testInfo) => {
  await page.goto('/');
  const logo = page.locator('.menu-brand-logo img');
  await expect(logo).toBeVisible();
  await expect.poll(() => logo.evaluate((node) => (node as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  await page.screenshot({ path: `artifacts/branding-menu-${testInfo.project.name}.png`, fullPage: true, animations: 'disabled' });

  await page.getByRole('button', { name: 'ROZETLERİM', exact: true }).click();
  const badges = page.locator('.badge-collection-item');
  await expect(badges).toHaveCount(8);
  await expect.poll(() => badges.locator('img').evaluateAll((nodes) => nodes.filter((node) => (node as HTMLImageElement).naturalWidth > 0).length)).toBe(16);
  await page.screenshot({ path: `artifacts/branding-badges-locked-${testInfo.project.name}.png`, fullPage: true, animations: 'disabled' });
  await page.getByRole('button', { name: 'Kapat', exact: true }).click();

  await page.getByRole('button', { name: 'BÖLÜMLER', exact: true }).click();
  await expect(page.locator('.chapter-select-card-art img')).toHaveCount(3);
  await expect.poll(() => page.locator('.chapter-select-card-art img').evaluateAll((nodes) => nodes.filter((node) => (node as HTMLImageElement).naturalWidth > 0).length)).toBe(3);
  await page.screenshot({ path: `artifacts/branding-chapters-${testInfo.project.name}.png`, fullPage: true, animations: 'disabled' });
});

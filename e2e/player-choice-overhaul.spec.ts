import { expect, test } from '@playwright/test';
import { startNewRpgGame } from './helpers';

test('oyuncu çözüm günlüğünü açar, keşfedilen seçeneği planlar ve bütçeyi onaylar', async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
  await page.goto('/');
  const canvas = await startNewRpgGame(page);
  await canvas.focus();

  await page.getByRole('button', { name: 'ŞEHİR PLANI' }).click();
  const journal = page.getByRole('dialog', { name: 'Şehri Koruma Planı' });
  await expect(journal).toBeVisible();
  await expect(journal.locator('[data-solution-id]')).toHaveCount(4);
  await expect(journal).toContainText('0 / 4 çözüm araştırıldı');
  await expect(page.locator('.chapter-curtain')).toHaveCount(0);
  for (const id of ['sünger', 'dönüşüm', 'set', 'uyarı']) {
    const card = journal.locator(`[data-solution-id="${id}"]`);
    await expect(card.getByRole('button', { name: 'PLANA EKLE' })).toBeEnabled();
  }
  const sponge = journal.locator('[data-solution-id="sünger"]');
  await sponge.getByRole('button', { name: 'PLANA EKLE' }).click();
  await expect(journal).toContainText('PLAN: 28 / 100 Kr');
  await sponge.getByRole('button', { name: 'PLANDAN ÇIKAR' }).click();
  await expect(journal).toContainText('PLAN: 0 / 100 Kr');
  await page.screenshot({ path: 'artifacts/01_solution_discovery.png', fullPage: true });
  await journal.getByRole('button', { name: 'VAZGEÇ' }).click();

  // Mira’ya gerçek WASD girdileriyle ulaş; konuşma, erken uyarı çözümünü araştırır.
  const hold = async (key: string, duration: number) => {
    await page.keyboard.down(key);
    await page.waitForTimeout(duration);
    await page.keyboard.up(key);
    await page.waitForTimeout(100);
  };
  await hold('a', 500);
  await hold('w', 750);
  await hold('a', 350);
  await hold('s', 80);
  await page.keyboard.press('e');
  await expect(page.locator('.world-dialog-modal')).toContainText('KRİTİK İKLİM UYARISI');
  await page.locator('.dialog-close-btn').click();

  await page.getByRole('button', { name: 'ŞEHİR PLANI' }).click();
  await expect(journal).toContainText('2 / 4 çözüm araştırıldı');
  await page.screenshot({ path: 'artifacts/03_planning_journal.png', fullPage: true });
  const warning = journal.locator('[data-solution-id="uyarı"]');
  await expect(warning).toHaveAttribute('data-solution-state', 'AVAILABLE');
  await warning.getByRole('button', { name: 'PLANA EKLE' }).click();
  await expect(journal).toContainText('PLAN: 18 / 100 Kr');
  await page.screenshot({ path: 'artifacts/05_budget_selection.png', fullPage: true });
  await journal.getByRole('button', { name: 'PLANI ONAYLA' }).click();
  await expect(journal).not.toBeVisible();
  await expect(canvas).toHaveAttribute('data-plan-confirmed', 'true');
  await expect(canvas).toHaveAttribute('data-selected-plan', 'uyarı');
});

test('oyuncu dört çözüm sahasını gerçek hareketle keşfedebilir', async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
  await page.goto('/');
  const canvas = await startNewRpgGame(page);
  await canvas.focus();

  const walk = async (keys: string[], duration: number) => {
    for (const key of keys) await page.keyboard.down(key);
    await page.waitForTimeout(duration);
    for (const key of keys) await page.keyboard.up(key);
    await page.waitForTimeout(180);
  };

  // Spawn (700,620) -> erken uyarı, sünger saha, menfez dönüşümü, kıyı seti.
  await walk(['d', 'w'], 1320);
  await walk(['w'], 420);
  await expect.poll(() => canvas.getAttribute('data-discovered-solutions')).toContain('uyarı');
  await walk(['d'], 1250);
  await expect.poll(() => canvas.getAttribute('data-discovered-solutions')).toContain('sünger');
  await walk(['d', 's'], 1250);
  await expect.poll(() => canvas.getAttribute('data-discovered-solutions')).toContain('dönüşüm');
  await walk(['d'], 2200);
  await walk(['s'], 420);
  await expect.poll(() => canvas.getAttribute('data-discovered-solutions')).toContain('set');

  await page.getByRole('button', { name: 'ŞEHİR PLANI' }).click();
  const journal = page.getByRole('dialog', { name: 'Şehri Koruma Planı' });
  await expect(journal).toContainText('4 / 4 çözüm araştırıldı');
  await page.screenshot({ path: 'artifacts/02_all_solutions_discovered.png', fullPage: true });

  // Karşılaştırma ekranı: dört saha keşfedildikten sonra iki farklı etkiyi
  // aynı plan üzerinde seçerek oyuncunun bilinçli kombinasyon kurabildiğini kanıtla.
  await journal.locator('[data-solution-id="uyarı"]').getByRole('button', { name: 'PLANA EKLE' }).click();
  await journal.locator('[data-solution-id="dönüşüm"]').getByRole('button', { name: 'PLANA EKLE' }).click();
  await expect(journal).toContainText('PLAN: 54 / 100 Kr');
  await page.screenshot({ path: 'artifacts/04_strategy_comparison.png', fullPage: true });
});

import { expect, test } from '@playwright/test';
import { startNewRpgGame } from './helpers';

test('sünger kent, erken uyarı ve kıyı seti birlikte kurulunca iki yıldız sonucu alınır', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Bu uzun 2 yıldız senaryosu masaüstü klavye acceptance akışıdır; mobil gerçek etkileşim ve HUD akışı ayrı test edilir.');
  test.setTimeout(120000);
  await page.addInitScript(() => localStorage.clear());
  await page.goto('/');
  const canvas = await startNewRpgGame(page);
  await canvas.focus();
  const hold = async (key: string, duration: number) => { await page.keyboard.down(key); await page.waitForTimeout(duration); await page.keyboard.up(key); await page.waitForTimeout(100); };
  const combo = async (keys: string[], duration: number) => { for (const key of keys) await page.keyboard.down(key); await page.waitForTimeout(duration); for (const key of keys) await page.keyboard.up(key); await page.waitForTimeout(100); };
  const holdInteract = async () => { await page.keyboard.down('e'); await page.waitForTimeout(1200); await page.keyboard.up('e'); await page.waitForTimeout(150); };
  const walkByCompass = async (maxSteps = 80) => {
    const compass = page.locator('.rpg-compass');
    let stagnantSteps = 0;
    for (let i = 0; i < maxSteps; i += 1) {
      if (await compass.getAttribute('data-compass-reached') === 'true') return;
      const normalized = (Number(await compass.getAttribute('data-compass-bearing')) + 360) % 360;
      const distance = Number(await compass.getAttribute('data-compass-distance'));
      const keys = normalized < 22.5 || normalized >= 337.5 ? ['w'] : normalized < 67.5 ? ['d', 'w'] : normalized < 112.5 ? ['d'] : normalized < 157.5 ? ['d', 's'] : normalized < 202.5 ? ['s'] : normalized < 247.5 ? ['a', 's'] : normalized < 292.5 ? ['a'] : ['a', 'w'];
      await combo(keys, 320);
      const nextDistance = Number(await compass.getAttribute('data-compass-distance'));
      if (nextDistance >= distance - 0.25) stagnantSteps += 1; else stagnantSteps = 0;
      if (stagnantSteps >= 3) {
        // Duvar veya bina köşesinde kalan rotayı küçük bir yan adımla aç.
        await combo(normalized < 180 ? ['d'] : ['a'], 360);
        stagnantSteps = 0;
      }
    }
  };
  const closeDialog = async () => { await expect(page.locator('.world-dialog-modal')).toBeVisible({ timeout: 3000 }); await page.locator('.dialog-close-btn').click(); await expect(page.locator('.world-dialog-modal')).not.toBeVisible(); await canvas.focus(); };
  const closeDialogIfPresent = async () => {
    const modal = page.locator('.world-dialog-modal');
    if (await modal.isVisible().catch(() => false)) {
      await modal.locator('.dialog-close-btn').click();
      await expect(modal).not.toBeVisible();
    }
    await canvas.focus();
  };

  // Mira'ya git, ardından fırtına başlamadan üç farklı yatırım yap.
  await hold('a', 500); await hold('w', 750); await hold('a', 350); await hold('s', 80); await page.keyboard.press('e'); await closeDialog();
  await hold('d', 450); await hold('w', 650); await hold('d', 2600); await holdInteract(); await expect(page.locator('.quest-toast-banner')).toContainText('SÜNGER KENT DEVREDE');
  await hold('a', 2200); await hold('d', 1000); await holdInteract();
  await hold('s', 1600); await hold('d', 3500); await hold('d', 800); await hold('w', 300); await holdInteract();
  await hold('a', 2500); await hold('w', 500); await holdInteract();
  await expect(canvas).toHaveAttribute('data-road-passable', 'true');
  await expect(canvas).toHaveAttribute('data-sponge-operational', 'true');

  // Görev zinciri: hazırlık sonrası önce menfez, ardından Aras ve gözlem noktası.
  // Savunmalar görev adımını ilerletmez; bu yüzden menfez kontrolünü açıkça
  // tamamlamak, gerçek oyuncu akışını ve hedef pusulasını doğrular.
  await closeDialogIfPresent();
  const questTracker = page.locator('.quest-tracker-card');
  const prompt = page.locator('.world-interaction-prompt');
  // Savunma rotası menfezin yanından geçebildiği için bazı cihazlarda bu
  // adım zaten tamamlanmış olabilir. Her iki gerçek oyun durumunu da
  // doğruluyor, yalnızca eksikse menfezde basılı-tutmayı tamamlıyoruz.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    if ((await questTracker.textContent())?.includes('GÖREV 3/7')) break;
    await walkByCompass(80);
    const promptText = await prompt.textContent({ timeout: 1000 }).catch(() => '');
    if (promptText.includes('DRENAJ MENFEZİ')) {
      await holdInteract(); await closeDialog();
    }
  }
  await expect(questTracker).toContainText('GÖREV 3/7', { timeout: 5000 });
  await walkByCompass(45); await expect(page.locator('.world-interaction-prompt')).toContainText('MÜHENDİS ARAS', { timeout: 5000 }); await page.keyboard.press('e'); await closeDialog();
  await hold('d', 70); await hold('s', 620); await walkByCompass(60); await expect(page.locator('.world-interaction-prompt')).toContainText('YOL TAŞKIN GÖZLEM', { timeout: 3000 }); await page.keyboard.press('e'); await closeDialog();
  await expect(canvas).toHaveAttribute('data-weather-phase', /LIGHT_RAIN|HEAVY_RAIN|STORM/, { timeout: 3000 });

  // Hazır yol doğrulaması.
  await expect(canvas).toHaveAttribute('data-road-passable', 'true');
  await hold('w', 180); await page.keyboard.press('e'); await expect(page.locator('.world-dialog-modal')).toContainText('GEÇİLEBİLİR'); await closeDialog();

  // Mira'ya dön ve bütçe verimsizliğinin iki yıldız sonucunu doğrula.
  await hold('s', 600); await hold('a', 2600); await hold('w', 750); await hold('a', 350); await hold('s', 80);
  await hold('s', 600); await hold('a', 500); await hold('w', 750); await hold('a', 350); await hold('s', 80);
  await hold('d', 500); await hold('s', 600); await hold('a', 700); await hold('w', 750); await hold('a', 350); await hold('s', 80); await walkByCompass(80);
  if (await page.locator('.rpg-compass').getAttribute('data-compass-reached') !== 'true') {
    // Mira'nın istasyon duvarına güneyden yaklaşılırsa küçük bir doğu-kuzey
    // manevrası, gerçek oyuncunun yapacağı gibi hedef yarıçapını açar.
    await hold('a', 750); await hold('w', 900); await hold('d', 650); await walkByCompass(80);
  }
  await expect(page.locator('.rpg-compass')).toHaveAttribute('data-compass-reached', 'true'); await page.keyboard.press('e');
  await expect(page.locator('[data-chapter-outcome="success"]')).toBeVisible({ timeout: 3000 });
  await expect(page.locator('.result-stars .earned')).toHaveCount(2);
  await expect(page.locator('.chapter-result-card')).toContainText('12 Kr');
  await page.screenshot({ path: 'artifacts/star_2_strategy.png', fullPage: true });
});

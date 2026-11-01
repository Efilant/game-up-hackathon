import { chromium } from 'playwright';
import { mkdir, copyFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(new URL('../..', import.meta.url).pathname);
const outputDir = path.join(root, 'trailer', 'raw', 'browser-capture');
const outputFile = path.join(root, 'trailer', 'raw', 'real-gameplay-90s.webm');
const gameUrl = process.env.GAME_URL || 'http://127.0.0.1:3000/';

await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
  recordVideo: { dir: outputDir, size: { width: 1920, height: 1080 } },
});
const page = await context.newPage();

const wait = (ms) => page.waitForTimeout(ms);
const safeClick = async (locator) => {
  if (await locator.isVisible().catch(() => false)) await locator.click();
};
const move = async (key, ms) => {
  await page.keyboard.down(key);
  await wait(ms);
  await page.keyboard.up(key);
};
const closeDialog = async () => {
  await safeClick(page.locator('.world-dialog-modal .dialog-close-btn'));
};

try {
  await page.addInitScript(() => localStorage.clear());
  await page.goto(gameUrl, { waitUntil: 'networkidle' });
  await wait(2500);

  // Real menu and character setup interaction.
  await page.getByRole('button', { name: 'YENİ OYUN ↗' }).click();
  await wait(3000);
  await page.locator('[data-hero-choice="male"]').click();
  await page.getByRole('button', { name: 'MACERA' }).click();
  await wait(1800);
  await page.getByRole('dialog', { name: 'Yeni oyun kurulumu' }).getByRole('button', { name: 'ŞEHRE GİR ↗' }).click();
  await wait(5000);

  const canvas = page.locator('.world-canvas');
  await canvas.focus();

  // Real exploration and the first NPC interaction.
  await move('a', 550);
  await move('w', 800);
  await move('a', 360);
  await move('s', 90);
  await page.keyboard.press('e');
  await wait(5000);
  await closeDialog();

  // Real movement toward the hospital drainage corridor.
  await move('d', 700);
  await move('s', 360);
  await move('d', 2100);
  await move('w', 450);
  await wait(4500);

  // If the real player is at the drainage interaction, complete the hold.
  if (await page.locator('.world-interaction-prompt').getByText('DRENAJ MENFEZİ').isVisible().catch(() => false)) {
    await page.keyboard.down('e');
    await wait(1100);
    await page.keyboard.up('e');
    await wait(4500);
    await closeDialog();
  }

  // Show the real planning journal and the player's current discovered state.
  await safeClick(page.getByRole('button', { name: 'ŞEHİR PLANI' }));
  await wait(9000);
  await safeClick(page.getByRole('button', { name: 'VAZGEÇ' }));
  await wait(3500);

  // Continue ordinary real play in the city; no state is injected or skipped.
  await move('d', 900);
  await move('w', 500);
  await move('a', 650);
  await wait(6000);
  await page.keyboard.press('p');
  await wait(7500);
  await safeClick(page.getByRole('button', { name: 'Şehir planını kapat' }));
  await wait(3500);

  // Keep the camera in real play for the remainder of the capture: short
  // exploration loops show the living city without injecting quest state.
  for (let index = 0; index < 8; index += 1) {
    await move(index % 2 === 0 ? 'd' : 'a', 900);
    await move(index % 3 === 0 ? 'w' : 's', 520);
    await move(index % 2 === 0 ? 'a' : 'd', 650);
    await wait(520);
  }
  await wait(6500);
} finally {
  const video = page.video();
  await page.close();
  await context.close();
  await browser.close();
  if (video) await copyFile(await video.path(), outputFile);
}

console.log(`REAL_GAMEPLAY_CAPTURE=${outputFile}`);

import { expect, test } from '@playwright/test';
import { startNewRpgGame } from './helpers';

test('screenshot-based visual acceptance keeps HUD layers readable', async ({ page }, testInfo) => {
  await page.addInitScript(() => localStorage.clear());
  await page.goto('/');
  await startNewRpgGame(page);

  const expandQuest = page.getByRole('button', { name: 'Görev ayrıntısını aç' });
  const quest = page.locator('.quest-tracker-card');
  const compass = page.locator('.rpg-compass');
  const minimap = page.locator('.world-minimap-card');
  await expect(quest).toBeVisible();
  await expect(compass).toBeVisible();
  await expect(minimap).toBeVisible();
  await page.waitForTimeout(1200);

  if (testInfo.project.name === 'mobile') {
    await expect(expandQuest).toBeVisible();
    const collapsedQuestBox = await quest.boundingBox();
    const collapsedCompassBox = await compass.boundingBox();
    expect(collapsedQuestBox).not.toBeNull();
    expect(collapsedCompassBox).not.toBeNull();
    if (collapsedQuestBox && collapsedCompassBox) {
      expect(collapsedQuestBox.x + collapsedQuestBox.width).toBeLessThan(collapsedCompassBox.x);
    }

    await page.screenshot({ path: 'artifacts/visual-acceptance-mobile-390.png', fullPage: true });
    await expandQuest.click();
    await expect(page.locator('.quest-target-distance-badge')).toBeVisible();
    await page.getByRole('button', { name: 'Radarı küçült' }).click();
    await expect(page.locator('.minimap-body')).not.toBeVisible();
    await page.screenshot({ path: 'artifacts/visual-acceptance-mobile-390-expanded-quest-collapsed-radar.png', fullPage: true });

    await page.setViewportSize({ width: 360, height: 740 });
    await page.screenshot({ path: 'artifacts/visual-acceptance-mobile-360.png', fullPage: true });
  } else {
    if (await expandQuest.isVisible().catch(() => false)) await expandQuest.click();
    await expect(page.locator('.quest-target-distance-badge')).toBeVisible();
    await page.screenshot({ path: `artifacts/visual-acceptance-${testInfo.project.name}.png`, fullPage: true });
  }
});

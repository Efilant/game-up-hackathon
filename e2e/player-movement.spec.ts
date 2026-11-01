import { expect, test } from '@playwright/test';
import { startNewRpgGame } from './helpers';

test.describe('real player movement controls', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.clear());
    await page.goto('/');
    await startNewRpgGame(page);
    await page.waitForTimeout(200);
  });

  test('moves with held keyboard input, stops on release, and supports both heroes', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Bu test fiziksel klavye rotasını doğrular; mobil hareket ayrı joystick testiyle doğrulanır.');
    const canvas = page.locator('.world-canvas');
    const compass = page.locator('.rpg-compass');
    const readPlayer = () =>
      canvas.evaluate((element) => ({
        x: Number(element.getAttribute('data-player-x')),
        y: Number(element.getAttribute('data-player-y')),
        moving: element.getAttribute('data-player-moving') === 'true',
      }));

    const initial = await readPlayer();
    const initialBearing = Number(await compass.getAttribute('data-compass-bearing'));
    await expect(page.locator('.rpg-compass-warning')).toHaveCount(0);
    await canvas.focus();

    await page.keyboard.down('d');
    await page.waitForTimeout(300);
    const afterRight = await readPlayer();
    expect(afterRight.x).toBeGreaterThan(initial.x + 35);
    expect(afterRight.moving).toBe(true);
    const bearingAfterMovement = Number(await compass.getAttribute('data-compass-bearing'));
    expect(Math.abs(bearingAfterMovement - initialBearing)).toBeGreaterThan(1);

    await page.keyboard.up('d');
    await page.waitForTimeout(120);
    const stopped = await readPlayer();
    await page.waitForTimeout(160);
    const stoppedAgain = await readPlayer();
    expect(stopped.moving).toBe(false);
    expect(stoppedAgain.x).toBeCloseTo(stopped.x, 1);

    await page.keyboard.down('w');
    await page.waitForTimeout(250);
    const afterUp = await readPlayer();
    await page.keyboard.up('w');
    expect(afterUp.y).toBeLessThan(stopped.y - 25);

    await page.locator('.hud-hero-chip').click();
    await page.locator('.hero-card').last().click();
    await expect(page.locator('.hud-hero-chip')).toContainText('Barış');
    const beforeMaleMovement = await readPlayer();
    await page.keyboard.down('a');
    await page.waitForTimeout(220);
    await page.keyboard.up('a');
    const afterMaleMovement = await readPlayer();
    expect(afterMaleMovement.x).toBeLessThan(beforeMaleMovement.x - 20);
  });

  test('enters the objective radius and switches the compass to interaction state', async ({ page }) => {
    const canvas = page.locator('.world-canvas');
    const compass = page.locator('.rpg-compass');
    await canvas.focus();

    const hold = async (key: string, duration: number) => {
      await page.keyboard.down(key);
      await page.waitForTimeout(duration);
      await page.keyboard.up(key);
      await page.waitForTimeout(100);
    };

    // From the safe spawn, go west below the museum, north beside it,
    // then west/east as needed to enter Mira's interaction radius.
    await hold('a', 500);
    await hold('w', 750);
    await hold('a', 350);
    await hold('s', 80);

    await expect(compass).toHaveAttribute('data-compass-reached', 'true');
    await expect(compass).toContainText('MİRA / ARAŞTIRMA İSTASYONU');
    await expect(compass).toContainText('E HAZIR');
    await expect(page.locator('.compass-pointer')).toHaveCount(0);
  });

  test('moves and stops with the mobile joystick gesture', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'The virtual joystick is only rendered on narrow touch layouts.');
    const canvas = page.locator('.world-canvas');
    const zone = page.locator('.mobile-joystick-zone');
    await expect(zone).toBeVisible();
    const initialX = Number(await canvas.getAttribute('data-player-x'));

    await page.evaluate(() => {
      const zone = document.querySelector<HTMLElement>('.mobile-joystick-zone');
      if (!zone) throw new Error('Joystick zone is missing');
      const rect = zone.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      const touch = (clientX: number, clientY: number) =>
        new Touch({ identifier: 1, target: zone, clientX, clientY });
      zone.dispatchEvent(new TouchEvent('touchstart', {
        bubbles: true,
        cancelable: true,
        touches: [touch(x, y)],
        targetTouches: [touch(x, y)],
        changedTouches: [touch(x, y)],
      }));
      zone.dispatchEvent(new TouchEvent('touchmove', {
        bubbles: true,
        cancelable: true,
        touches: [touch(x + 35, y)],
        targetTouches: [touch(x + 35, y)],
        changedTouches: [touch(x + 35, y)],
      }));
    });

    await page.waitForTimeout(260);
    const movedX = Number(await canvas.getAttribute('data-player-x'));
    expect(movedX).toBeGreaterThan(initialX + 25);

    await page.evaluate(() => {
      document.querySelector<HTMLElement>('.mobile-joystick-zone')?.dispatchEvent(
        new TouchEvent('touchend', { bubbles: true, cancelable: true, touches: [], changedTouches: [] }),
      );
    });
    await page.waitForTimeout(180);
    const stoppedX = Number(await canvas.getAttribute('data-player-x'));
    await page.waitForTimeout(160);
    expect(Number(await canvas.getAttribute('data-player-x'))).toBeCloseTo(stoppedX, 1);
  });
});

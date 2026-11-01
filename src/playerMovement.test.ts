import { describe, expect, it } from 'vitest';
import { getMovementInput, movePlayer, type PlayerMotionState } from './playerMovement';

const initial: PlayerMotionState = {
  x: 700,
  y: 620,
  vx: 0,
  vy: 0,
  facing: 'down',
  isMoving: false,
  frame: 0,
};

describe('player movement', () => {
  it('maps WASD and arrow keys to a normalized direction', () => {
    expect(getMovementInput({ d: true, arrowup: true })).toEqual({ x: 1, y: -1 });
    expect(getMovementInput({ a: true, s: true })).toEqual({ x: -1, y: 1 });
  });

  it('moves at a frame-rate independent speed and stops immediately', () => {
    const oneFrame = movePlayer(initial, { x: 1, y: 0 }, 1 / 60, [], [], 2200, 1500);
    const twoFrames = movePlayer(initial, { x: 1, y: 0 }, 1 / 30, [], [], 2200, 1500);
    expect(oneFrame.x - initial.x).toBeCloseTo(3.5, 4);
    expect(twoFrames.x - initial.x).toBeCloseTo(7, 4);
    expect(movePlayer(oneFrame, { x: 0, y: 0 }, 1 / 60, [], [], 2200, 1500)).toMatchObject({
      x: oneFrame.x,
      y: oneFrame.y,
      vx: 0,
      vy: 0,
      isMoving: false,
    });
  });

  it('normalizes diagonal movement', () => {
    const diagonal = movePlayer(initial, { x: 1, y: 1 }, 1 / 60, [], [], 2200, 1500);
    expect(Math.hypot(diagonal.x - initial.x, diagonal.y - initial.y)).toBeCloseTo(3.5, 4);
  });

  it('slides along obstacles and treats trees as solid', () => {
    const obstacle = [{ x: 730, y: 590, w: 80, h: 80 }];
    const tree = [{ x: 700, y: 680, r: 24 }];
    const moved = movePlayer(initial, { x: 1, y: 0 }, 0.3, obstacle, tree, 2200, 1500);
    expect(moved.x).toBeLessThan(730 - 10);
    const treeBlocked = movePlayer(initial, { x: 0, y: 1 }, 0.2, [], tree, 2200, 1500);
    expect(treeBlocked.y).toBeLessThan(680 - 24 - 10 + 0.1);
  });

  it('rejects a spawn inside a collider', () => {
    const blocked = movePlayer(
      { ...initial, x: 650, y: 560 },
      { x: 1, y: 0 },
      0.2,
      [{ x: 620, y: 440, w: 70, h: 130 }],
      [],
      2200,
      1500,
    );
    expect(blocked.x).toBe(650);
    expect(blocked.y).toBe(560);
  });

  it('allows a trapped hero to retreat north out of deep floodwater', () => {
    const escaped = movePlayer(
      { ...initial, x: 1220, y: 540 },
      { x: 0, y: -1 },
      0.6,
      [],
      [],
      2200,
      1500,
      36.5,
    );
    expect(escaped.y).toBeLessThan(480);
    expect(escaped.isMoving).toBe(true);
  });
});

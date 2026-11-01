import { describe, expect, it } from 'vitest';
import { canPlayerOccupy, movePlayer, type PlayerMotionState } from './playerMovement';
import { WORLD_TERRAIN_MASK } from './worldTerrain';

const initial: PlayerMotionState = {
  x: 150,
  y: 1172,
  vx: 0,
  vy: 0,
  facing: 'down',
  isMoving: false,
  frame: 0,
};

describe('waterfront terrain mask', () => {
  it('blocks open water and pier gaps while allowing the quay and marked decks', () => {
    expect(canPlayerOccupy({ x: 50, y: 1300 }, [], [], 2200, 1500, 0, WORLD_TERRAIN_MASK)).toBe(false);
    expect(canPlayerOccupy({ x: 250, y: 1215 }, [], [], 2200, 1500, 0, WORLD_TERRAIN_MASK)).toBe(false);
    expect(canPlayerOccupy({ x: 150, y: 1215 }, [], [], 2200, 1500, 0, WORLD_TERRAIN_MASK)).toBe(true);
    expect(canPlayerOccupy({ x: 350, y: 1215 }, [], [], 2200, 1500, 0, WORLD_TERRAIN_MASK)).toBe(true);
  });

  it('stops a real movement step at the open-water edge', () => {
    const stopped = movePlayer({ ...initial, x: 250 }, { x: 0, y: 1 }, 0.8, [], [], 2200, 1500, 0, WORLD_TERRAIN_MASK);
    expect(stopped.y).toBeLessThan(1200);
  });
});

import { pointInFloodedRoadZone, type ObstacleBox, type Point2D, type TerrainMask } from './navigation';

export type PlayerFacing = 'down' | 'up' | 'left' | 'right';

export interface PlayerMotionState extends Point2D {
  vx: number;
  vy: number;
  facing: PlayerFacing;
  isMoving: boolean;
  frame: number;
}

export interface MovementInput {
  x: number;
  y: number;
}

export interface SolidCircle {
  x: number;
  y: number;
  r: number;
}

export const PLAYER_SPEED = 210;
export const PLAYER_COLLISION_RADIUS = 10;

export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.tagName === 'SELECT'
  );
}

export function getMovementInput(
  keys: Readonly<Record<string, boolean>>,
  touch: MovementInput & { active?: boolean } = { x: 0, y: 0, active: false },
): MovementInput {
  if (touch.active) {
    return { x: touch.x, y: touch.y };
  }

  return {
    x: Number(Boolean(keys.d || keys.arrowright)) - Number(Boolean(keys.a || keys.arrowleft)),
    y: Number(Boolean(keys.s || keys.arrowdown)) - Number(Boolean(keys.w || keys.arrowup)),
  };
}

export function circleIntersectsRectangle(center: Point2D, radius: number, obstacle: ObstacleBox): boolean {
  const closestX = Math.max(obstacle.x, Math.min(center.x, obstacle.x + obstacle.w));
  const closestY = Math.max(obstacle.y, Math.min(center.y, obstacle.y + obstacle.h));
  const dx = center.x - closestX;
  const dy = center.y - closestY;
  return dx * dx + dy * dy < radius * radius;
}

function pointInsideZone(point: Point2D, zone: ObstacleBox, inset = 0): boolean {
  return point.x >= zone.x + inset
    && point.x <= zone.x + zone.w - inset
    && point.y >= zone.y + inset
    && point.y <= zone.y + zone.h - inset;
}

export function pointInBlockedTerrain(point: Point2D, terrainMask: TerrainMask, radius = PLAYER_COLLISION_RADIUS): boolean {
  const touchesBlockedZone = terrainMask.blockedZones.some((zone) => circleIntersectsRectangle(point, radius, zone));
  if (!touchesBlockedZone) return false;
  return !terrainMask.walkableZones.some((zone) => pointInsideZone(point, zone, radius));
}

function circleIntersectsCircle(center: Point2D, radius: number, solid: SolidCircle): boolean {
  const dx = center.x - solid.x;
  const dy = center.y - solid.y;
  const combinedRadius = radius + solid.r;
  return dx * dx + dy * dy < combinedRadius * combinedRadius;
}

export function canPlayerOccupy(
  position: Point2D,
  obstacles: ObstacleBox[],
  solidCircles: SolidCircle[],
  worldWidth: number,
  worldHeight: number,
  roadWaterDepth = 0,
  terrainMask?: TerrainMask,
  radius = PLAYER_COLLISION_RADIUS,
): boolean {
  if (
    position.x < radius ||
    position.y < radius ||
    position.x > worldWidth - radius ||
    position.y > worldHeight - radius
  ) {
    return false;
  }

  if (pointInFloodedRoadZone(position, roadWaterDepth)) return false;
  if (terrainMask && pointInBlockedTerrain(position, terrainMask, radius)) return false;
  if (obstacles.some((obstacle) => circleIntersectsRectangle(position, radius, obstacle))) return false;
  return !solidCircles.some((solid) => circleIntersectsCircle(position, radius, solid));
}

export function movePlayer(
  player: PlayerMotionState,
  input: MovementInput,
  dt: number,
  obstacles: ObstacleBox[],
  solidCircles: SolidCircle[],
  worldWidth: number,
  worldHeight: number,
  roadWaterDepth = 0,
  terrainMask?: TerrainMask,
): PlayerMotionState {
  const inputLength = Math.hypot(input.x, input.y);
  if (inputLength <= 0.001 || dt <= 0) {
    return { ...player, vx: 0, vy: 0, isMoving: false, frame: 0 };
  }

  const normalizedX = input.x / inputLength;
  const normalizedY = input.y / inputLength;
  const distance = PLAYER_SPEED * dt;
  // Small substeps prevent fast movement from tunnelling through thin colliders.
  const substeps = Math.max(1, Math.ceil(distance / 6));
  const stepX = (normalizedX * distance) / substeps;
  const stepY = (normalizedY * distance) / substeps;
  let x = player.x;
  let y = player.y;

  for (let step = 0; step < substeps; step += 1) {
    const nextX = { x: x + stepX, y };
    const canExitFloodNorth = roadWaterDepth > 30
      && pointInFloodedRoadZone({ x, y }, roadWaterDepth)
      && nextX.y < y;
    if (canPlayerOccupy(nextX, obstacles, solidCircles, worldWidth, worldHeight, canExitFloodNorth ? 30 : roadWaterDepth, terrainMask)) {
      x = nextX.x;
    }

    const nextY = { x, y: y + stepY };
    const canExitFloodUpward = roadWaterDepth > 30
      && pointInFloodedRoadZone({ x, y }, roadWaterDepth)
      && nextY.y < y;
    if (canPlayerOccupy(nextY, obstacles, solidCircles, worldWidth, worldHeight, canExitFloodUpward ? 30 : roadWaterDepth, terrainMask)) {
      y = nextY.y;
    }
  }

  const facing: PlayerFacing =
    Math.abs(normalizedX) > Math.abs(normalizedY)
      ? normalizedX > 0
        ? 'right'
        : 'left'
      : normalizedY > 0
        ? 'down'
        : 'up';
  const moved = Math.abs(x - player.x) > 0.001 || Math.abs(y - player.y) > 0.001;

  return {
    x,
    y,
    vx: moved ? normalizedX * PLAYER_SPEED : 0,
    vy: moved ? normalizedY * PLAYER_SPEED : 0,
    facing,
    isMoving: moved,
    frame: moved ? (player.frame + dt * 8) % 2 : 0,
  };
}

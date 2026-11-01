import { describe, expect, it } from 'vitest';
import {
  calculateDistanceMeters,
  calculateBearingDeg,
  calculateCompassBearing,
  getOffScreenIndicator,
  pointCollidesWithObstacle,
  pointInFloodedRoadZone,
  hasLineOfSight,
  findNavRoute,
  isNavRouteTraversable,
  getEkoContextualHint,
  type ObstacleBox,
} from './navigation';

describe('Smart Quest Navigation System', () => {
  const sampleObstacles: ObstacleBox[] = [
    { x: 1360, y: 240, w: 240, h: 180, label: 'ŞEHİR HASTANESİ' },
    { x: 1050, y: 180, w: 120, h: 88, label: 'TERAS KONUTLARI' },
    { x: 620, y: 440, w: 70, h: 130, label: 'SAAT KULESİ' },
  ];

  it('calculates distance correctly in meters (10 px = 1 meter)', () => {
    const p1 = { x: 100, y: 100 };
    const p2 = { x: 400, y: 500 }; // 300, 400 => hypot = 500 px => 50 meters
    expect(calculateDistanceMeters(p1, p2)).toBe(50);
  });

  it('calculates bearing degrees correctly', () => {
    const center = { x: 500, y: 500 };
    // East = 0 deg
    expect(calculateBearingDeg(center, { x: 600, y: 500 })).toBeCloseTo(0, 1);
    // South = 90 deg
    expect(calculateBearingDeg(center, { x: 500, y: 600 })).toBeCloseTo(90, 1);
    // West = 180 deg
    expect(calculateBearingDeg(center, { x: 400, y: 500 })).toBeCloseTo(180, 1);
    // North = -90 deg
    expect(calculateBearingDeg(center, { x: 500, y: 400 })).toBeCloseTo(-90, 1);
  });

  it('calculates north-up compass bearings in all cardinal directions', () => {
    const center = { x: 500, y: 500 };
    expect(calculateCompassBearing(center, { x: 500, y: 400 })).toMatchObject({ angleDeg: 0, cardinal: 'N' });
    expect(calculateCompassBearing(center, { x: 600, y: 500 })).toMatchObject({ angleDeg: 90, cardinal: 'E' });
    expect(calculateCompassBearing(center, { x: 500, y: 600 })).toMatchObject({ angleDeg: 180, cardinal: 'S' });
    expect(calculateCompassBearing(center, { x: 400, y: 500 })).toMatchObject({ angleDeg: 270, cardinal: 'W' });
    expect(calculateCompassBearing(center, { x: 600, y: 400 }).cardinal).toBe('NE');
  });

  it('detects off-screen targets and clamps indicator to screen margins', () => {
    const camera = { camX: 1000, camY: 500 };
    const viewport = { width: 1280, height: 720 };

    // Target inside screen: { x: 1200, y: 600 } => screen { x: 200, y: 100 }
    const onScreen = getOffScreenIndicator({ x: 1200, y: 600 }, camera, viewport);
    expect(onScreen.isOffScreen).toBe(false);

    // Target way off-screen to the right/east: { x: 3000, y: 600 }
    const offScreenEast = getOffScreenIndicator({ x: 3000, y: 600 }, camera, viewport);
    expect(offScreenEast.isOffScreen).toBe(true);
    expect(offScreenEast.screenX).toBe(viewport.width - 48);
    expect(offScreenEast.distanceMeters).toBeGreaterThan(100);

    // Target off-screen to top/north: { x: 1200, y: 0 }
    const offScreenNorth = getOffScreenIndicator({ x: 1200, y: 0 }, camera, viewport);
    expect(offScreenNorth.isOffScreen).toBe(true);
    expect(offScreenNorth.screenY).toBe(48 + 60);
  });

  it('detects obstacle collision and line of sight obstruction', () => {
    // Inside hospital box: x: 1400, y: 300
    expect(pointCollidesWithObstacle({ x: 1400, y: 300 }, sampleObstacles[0])).toBe(true);
    // Well outside hospital box: x: 1000, y: 500
    expect(pointCollidesWithObstacle({ x: 1000, y: 500 }, sampleObstacles[0])).toBe(false);

    // Ray passing straight through hospital: from (1200, 300) to (1700, 300)
    const losBlocked = hasLineOfSight({ x: 1200, y: 300 }, { x: 1700, y: 300 }, sampleObstacles, 0);
    expect(losBlocked).toBe(false);

    // Ray clear of obstacles
    const losClear = hasLineOfSight({ x: 810, y: 200 }, { x: 810, y: 600 }, sampleObstacles, 0);
    expect(losClear).toBe(true);
  });

  it('detects flooded road impassability when depth > 30 cm', () => {
    const roadPoint = { x: 1200, y: 520 };
    expect(pointInFloodedRoadZone(roadPoint, 20)).toBe(false);
    expect(pointInFloodedRoadZone(roadPoint, 35)).toBe(true);
  });

  it('findNavRoute generates a valid waypoint route bypassing obstacles', () => {
    const start = { x: 810, y: 760 }; // Main intersection
    const target = { x: 1470, y: 450 }; // Hospital emergency entrance

    const route = findNavRoute(start, target, sampleObstacles, 10);
    expect(route.length).toBeGreaterThanOrEqual(2);
    expect(route[0]).toEqual(start);
    expect(route[route.length - 1]).toEqual(target);

    // Route points should not penetrate inside the hospital building
    for (const pt of route) {
      const inHospital =
        pt.x > sampleObstacles[0].x &&
        pt.x < sampleObstacles[0].x + sampleObstacles[0].w &&
        pt.y > sampleObstacles[0].y &&
        pt.y < sampleObstacles[0].y + sampleObstacles[0].h;
      expect(inHospital).toBe(false);
    }
  });

  it('findNavRoute adapts when road is heavily flooded (> 30 cm)', () => {
    const start = { x: 810, y: 760 };
    const target = { x: 1470, y: 450 };

    // When flooded, route must avoid deep flood zone (x: 1140..1320, y: 480..590)
    const floodedRoute = findNavRoute(start, target, sampleObstacles, 45);
    expect(floodedRoute.length).toBeGreaterThanOrEqual(2);

    for (const pt of floodedRoute) {
      expect(pointInFloodedRoadZone(pt, 45)).toBe(false);
    }
  });

  it('detects a route that crosses a flooded corridor as unsafe', () => {
    const route = [{ x: 1100, y: 520 }, { x: 1300, y: 520 }];
    expect(isNavRouteTraversable(route, [], 0)).toBe(true);
    expect(isNavRouteTraversable(route, [], 45)).toBe(false);
  });

  it('EKO Hint engine produces relevant contextual warnings and tips', () => {
    // Flood alarm hint
    const warningHint = getEkoContextualHint({
      questStep: 4,
      playerPos: { x: 1100, y: 550 },
      targetPos: { x: 1160, y: 340 },
      roadWaterDepth: 38,
      roadPassable: false,
      hasSpongeDefense: false,
      budgetRemaining: 72,
      distanceMeters: 25,
    });
    expect(warningHint.urgency).toBe('warning');
    expect(warningHint.title).toContain('TEHLİKE');

    // Arrival hint (< 8 meters)
    const arrivalHint = getEkoContextualHint({
      questStep: 1,
      playerPos: { x: 1465, y: 410 },
      targetPos: { x: 1470, y: 410 },
      roadWaterDepth: 10,
      roadPassable: true,
      hasSpongeDefense: false,
      budgetRemaining: 100,
      distanceMeters: 5,
    });
    expect(arrivalHint.urgency).toBe('success');
    expect(arrivalHint.title).toBe('HEDEFE ULAŞTIN');

    // Step 1 hint (Mira)
    const miraHint = getEkoContextualHint({
      questStep: 1,
      playerPos: { x: 810, y: 760 },
      targetPos: { x: 520, y: 470 },
      roadWaterDepth: 0,
      roadPassable: true,
      hasSpongeDefense: false,
      budgetRemaining: 100,
      distanceMeters: 41,
    });
    expect(miraHint.title).toContain('MİRA');

    // Step 3 hint (Aras)
    const arasHint = getEkoContextualHint({
      questStep: 3,
      playerPos: { x: 1470, y: 410 },
      targetPos: { x: 1210, y: 430 },
      roadWaterDepth: 10,
      roadPassable: true,
      hasSpongeDefense: false,
      budgetRemaining: 100,
      distanceMeters: 26,
    });
    expect(arasHint.title).toContain('ARAS');

    // Step 7 hint (Mira return)
    const returnHint = getEkoContextualHint({
      questStep: 7,
      playerPos: { x: 1240, y: 500 },
      targetPos: { x: 520, y: 470 },
      roadWaterDepth: 12,
      roadPassable: true,
      hasSpongeDefense: true,
      budgetRemaining: 72,
      distanceMeters: 72,
    });
    expect(returnHint.title).toContain('MİRA');
  });

  it('computes valid route to Mira at the Climate Research Station', () => {
    const start = { x: 810, y: 760 }; // Central crossing
    const target = { x: 520, y: 470 }; // Mira at Research Station

    const route = findNavRoute(start, target, sampleObstacles, 0);
    expect(route.length).toBeGreaterThanOrEqual(2);
    expect(route[0]).toEqual(start);
    expect(route[route.length - 1]).toEqual(target);
  });

  it('keeps the safe initial spawn connected to Mira with the full world collider set', () => {
    const obstacles: ObstacleBox[] = [
      { x: 1360, y: 240, w: 240, h: 180 },
      { x: 1050, y: 180, w: 120, h: 88 },
      { x: 1640, y: 220, w: 120, h: 88 },
      { x: 620, y: 440, w: 70, h: 130 },
      { x: 440, y: 320, w: 140, h: 100 },
      { x: 440, y: 530, w: 150, h: 110 },
      { x: 330, y: 400, w: 120, h: 90 },
      { x: 1520, y: 880, w: 180, h: 130 },
      { x: 1760, y: 920, w: 140, h: 110 },
      { x: 260, y: 880, w: 160, h: 140 },
    ];
    const route = findNavRoute({ x: 700, y: 620 }, { x: 520, y: 470 }, obstacles, 0);
    expect(isNavRouteTraversable(route, obstacles, 0)).toBe(true);
  });
});

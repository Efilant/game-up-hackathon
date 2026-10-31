import { describe, expect, it } from 'vitest';
import {
  createInitialAmbientCitizens,
  updateAmbientCitizens,
  type AmbientCitizen,
} from './ambientCitizens';

describe('Ambient Citizens System', () => {
  it('creates initial list of ambient citizens distributed across districts', () => {
    const citizens = createInitialAmbientCitizens();
    expect(citizens.length).toBeGreaterThanOrEqual(10);

    const types = new Set(citizens.map((c) => c.type));
    expect(types.has('elder')).toBe(true);
    expect(types.has('student')).toBe(true);
    expect(types.has('worker')).toBe(true);
    expect(types.has('hospital_visitor')).toBe(true);
  });

  it('updates movement and walkCycle in normal weather conditions', () => {
    const citizens = createInitialAmbientCitizens();
    const c0 = citizens[0];
    const initialX = c0.x;
    const initialCycle = c0.walkCycle;

    updateAmbientCitizens(citizens, 0.1, {
      stormActive: false,
      roadWaterDepth: 0,
      roadPassable: true,
      hasSpongeDefense: false,
      obstacles: [],
      playerX: 0,
      playerY: 0,
    });

    // Citizen should update position or cycle
    expect(c0.x !== initialX || c0.walkCycle !== initialCycle || c0.waitTimer > 0).toBe(true);
    expect(c0.state).not.toBe('hurry');
  });

  it('triggers emergency behavior and speed increase during severe flood danger', () => {
    const citizens = createInitialAmbientCitizens();

    updateAmbientCitizens(citizens, 0.2, {
      stormActive: true,
      roadWaterDepth: 38,
      roadPassable: false,
      hasSpongeDefense: false,
      obstacles: [],
      playerX: 500,
      playerY: 500,
    });

    // In emergency, speed increases and state reflects emergency
    for (const c of citizens) {
      expect(c.speed).toBeGreaterThan(45);
      expect(c.state === 'hurry' || c.state === 'evacuate').toBe(true);
    }
  });

  it('manages speech bubble timers and expiration', () => {
    const citizens = createInitialAmbientCitizens();
    const c = citizens[0];
    c.speechBubble = {
      text: 'Hastaneye mi gidiyorsun?',
      timeLeft: 1.0,
      totalDuration: 4.0,
    };

    updateAmbientCitizens(citizens, 0.5, {
      stormActive: false,
      roadWaterDepth: 0,
      roadPassable: true,
      hasSpongeDefense: false,
      obstacles: [],
      playerX: 0,
      playerY: 0,
    });

    expect(c.speechBubble?.timeLeft).toBeCloseTo(0.5, 1);

    // After remaining time expires
    updateAmbientCitizens(citizens, 0.6, {
      stormActive: false,
      roadWaterDepth: 0,
      roadPassable: true,
      hasSpongeDefense: false,
      obstacles: [],
      playerX: 0,
      playerY: 0,
    });

    expect(c.speechBubble).toBeUndefined();
  });
});

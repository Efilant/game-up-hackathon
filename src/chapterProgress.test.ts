import { describe, expect, it } from 'vitest';
import { evaluateChapterOutcome, getAchievementUnlocks, mergeChapterRecord } from './chapterProgress';

const safeInput = {
  missionComplete: true,
  hospitalRoadPassable: true,
  citizensSafe: true,
  rescueCount: 0,
  temporaryRoadClosure: false,
  elapsedSeconds: 120,
  budgetRemaining: 40,
  mode: 'adventure' as const,
};

describe('chapter outcome and rewards', () => {
  it('returns three stars only when safety, time, and budget all qualify', () => {
    expect(evaluateChapterOutcome(safeInput).stars).toBe(3);
    expect(evaluateChapterOutcome({ ...safeInput, budgetRemaining: 10 }).stars).toBe(2);
    expect(evaluateChapterOutcome({ ...safeInput, elapsedSeconds: 241 }).success).toBe(false);
  });

  it('returns one star for a successful rescue or temporary closure', () => {
    expect(evaluateChapterOutcome({ ...safeInput, rescueCount: 1 }).stars).toBe(1);
    expect(evaluateChapterOutcome({ ...safeInput, temporaryRoadClosure: true }).stars).toBe(1);
  });

  it('preserves the best historical score', () => {
    const first = mergeChapterRecord(undefined, evaluateChapterOutcome(safeInput), safeInput);
    const second = mergeChapterRecord(first, evaluateChapterOutcome({ ...safeInput, budgetRemaining: 5 }), { ...safeInput, budgetRemaining: 5 });
    expect(second.bestStars).toBe(3);
    expect(second.completionCount).toBe(2);
  });

  it('unlocks achievements from verified events only', () => {
    expect(getAchievementUnlocks({
      firstInteraction: true,
      inspectedLocations: 2,
      adaptationBuilt: true,
      floodReduced: true,
      hospitalHero: true,
      citizensSafe: true,
      stars: 3,
    })).toHaveLength(7);
    expect(getAchievementUnlocks({
      firstInteraction: false,
      inspectedLocations: 0,
      adaptationBuilt: false,
      floodReduced: false,
      hospitalHero: false,
      citizensSafe: false,
      stars: 0,
    })).toEqual([]);
  });
});

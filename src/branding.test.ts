import { describe, expect, it } from 'vitest';
import { ACHIEVEMENTS } from './chapterProgress';
import { BRAND_ASSETS, getAchievementAsset } from './branding';

describe('branding asset manifest', () => {
  it('maps every persistent achievement to a stable image path', () => {
    const paths = ACHIEVEMENTS.map((achievement) => getAchievementAsset(achievement.id));
    expect(paths).toHaveLength(8);
    expect(new Set(paths).size).toBe(8);
    paths.forEach((path) => expect(path).toMatch(/^\/assets\//));
  });

  it('exposes logo, favicon and both calculated star states', () => {
    expect(BRAND_ASSETS.logo).toBe('/assets/branding/sehrin-yarini-logo.png');
    expect(BRAND_ASSETS.favicon).toBe('/assets/branding/sehrin-yarini-favicon.svg');
    expect(BRAND_ASSETS.stars.earned).not.toBe(BRAND_ASSETS.stars.empty);
  });
});

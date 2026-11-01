import { describe, expect, it } from 'vitest';
import { CITY_DISTRICTS, getCityDistrictAt } from './cityDistricts';

describe('connected city districts', () => {
  it('defines all four districts with non-empty world regions', () => {
    expect(CITY_DISTRICTS.map((district) => district.id)).toEqual(['kıyı', 'merkez', 'yamaç', 'sanayi']);
    for (const district of CITY_DISTRICTS) {
      expect(district.bounds.width).toBeGreaterThan(0);
      expect(district.bounds.height).toBeGreaterThan(0);
      expect(district.landmark.label).toBeTruthy();
    }
  });

  it('maps connected world coordinates to distinct neighborhoods', () => {
    expect(getCityDistrictAt(400, 400).id).toBe('merkez');
    expect(getCityDistrictAt(1200, 400).id).toBe('yamaç');
    expect(getCityDistrictAt(400, 1100).id).toBe('kıyı');
    expect(getCityDistrictAt(1500, 1100).id).toBe('sanayi');
  });
});

import { describe, expect, it } from 'vitest';
import { CLIMATE_SOLUTIONS, getDiscoveryProgress, getSolutionState } from './solutionRegistry';

describe('climate solution registry', () => {
  it('keeps discovery, investigation and construction as separate states', () => {
    expect(getSolutionState('sünger', [], [], [])).toBe('LOCKED');
    expect(getSolutionState('sünger', ['sünger'], [], [])).toBe('DISCOVERED');
    expect(getSolutionState('sünger', ['sünger'], ['sünger'], [])).toBe('AVAILABLE');
    expect(getSolutionState('sünger', ['sünger'], ['sünger'], ['sünger'])).toBe('BUILT');
  });

  it('exposes all four player choices without making one the default answer', () => {
    expect(CLIMATE_SOLUTIONS).toHaveLength(4);
    expect(CLIMATE_SOLUTIONS.map((solution) => solution.id)).toEqual(['sünger', 'dönüşüm', 'set', 'uyarı']);
    expect(getDiscoveryProgress(['sünger', 'dönüşüm'])).toBe('2 / 4 çözüm araştırıldı');
  });
});

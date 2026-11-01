import { describe, expect, it } from 'vitest';
import {
  advanceWeather,
  createWeatherState,
  createWeatherPhaseState,
  type WeatherState,
} from './weather';

describe('weather phase state machine', () => {
  it('starts clear and exposes the pre-storm overcast phase', () => {
    expect(createWeatherState()).toMatchObject({ phase: 'CLEAR', rainfallRate: 0 });
    expect(createWeatherPhaseState('OVERCAST')).toMatchObject({ phase: 'OVERCAST', rainIntensity: 0.08 });
  });

  it('progresses deterministically through staged rain into the extreme storm', () => {
    let state: WeatherState = createWeatherState(true);
    state = advanceWeather(state, 0.8, true, true, false);
    expect(state.phase).toBe('HEAVY_RAIN');
    state = advanceWeather(state, 1.4, true, false, false);
    expect(state.phase).toBe('EXTREME_STORM');
    expect(state.rainfallRate).toBe(88);
  });

  it('enters recovery only when the road is passable after an intervention', () => {
    const storm = advanceWeather(createWeatherState(true), 2.2, true, false, false);
    const recovery = advanceWeather(storm, 0.1, true, true, true);
    expect(recovery.phase).toBe('RECOVERY');
    expect(recovery.rainfallRate).toBeLessThan(88);
  });
});

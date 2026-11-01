export type WeatherPhase =
  | 'CLEAR'
  | 'OVERCAST'
  | 'LIGHT_RAIN'
  | 'HEAVY_RAIN'
  | 'EXTREME_STORM'
  | 'RECOVERY';

export interface WeatherProfile {
  label: string;
  rainfallRate: number;
  rainIntensity: number;
  cloudDarkness: number;
  windStrength: number;
}

export interface WeatherState extends WeatherProfile {
  phase: WeatherPhase;
  elapsedSeconds: number;
}

export const WEATHER_PROFILES: Record<WeatherPhase, WeatherProfile> = {
  CLEAR: { label: 'AÇIK', rainfallRate: 0, rainIntensity: 0, cloudDarkness: 0, windStrength: 0 },
  OVERCAST: { label: 'KAPALI', rainfallRate: 0, rainIntensity: 0.08, cloudDarkness: 0.18, windStrength: 0.12 },
  LIGHT_RAIN: { label: 'HAFİF YAĞMUR', rainfallRate: 32, rainIntensity: 0.28, cloudDarkness: 0.28, windStrength: 0.24 },
  HEAVY_RAIN: { label: 'ŞİDDETLİ YAĞMUR', rainfallRate: 64, rainIntensity: 0.62, cloudDarkness: 0.46, windStrength: 0.48 },
  EXTREME_STORM: { label: 'SÜPER HÜCRE FIRTINASI', rainfallRate: 88, rainIntensity: 1, cloudDarkness: 0.7, windStrength: 0.9 },
  RECOVERY: { label: 'TOPARLANMA', rainfallRate: 18, rainIntensity: 0.14, cloudDarkness: 0.3, windStrength: 0.18 },
};

const withProfile = (phase: WeatherPhase, elapsedSeconds = 0): WeatherState => ({
  phase,
  elapsedSeconds,
  ...WEATHER_PROFILES[phase],
});

export function createWeatherState(stormActive = false): WeatherState {
  return withProfile(stormActive ? 'LIGHT_RAIN' : 'CLEAR');
}

export function createWeatherPhaseState(phase: WeatherPhase): WeatherState {
  return withProfile(phase);
}

export function startStormWeather(previous: WeatherState = createWeatherState()): WeatherState {
  return withProfile('LIGHT_RAIN', previous.phase === 'CLEAR' ? 0 : previous.elapsedSeconds);
}

/** Deterministic phase progression. The same elapsed time always yields the same phase. */
export function advanceWeather(
  state: WeatherState,
  dtSeconds: number,
  stormActive: boolean,
  roadPassable: boolean,
  hasDefense: boolean,
): WeatherState {
  if (!stormActive) return withProfile('CLEAR');

  const elapsedSeconds = Math.max(0, state.elapsedSeconds + Math.max(0, dtSeconds));
  let phase: WeatherPhase;
  if (hasDefense && roadPassable && elapsedSeconds >= 1.5) {
    phase = 'RECOVERY';
  } else if (elapsedSeconds >= 2.2) {
    phase = 'EXTREME_STORM';
  } else if (elapsedSeconds >= 0.8) {
    phase = 'HEAVY_RAIN';
  } else {
    phase = 'LIGHT_RAIN';
  }
  return withProfile(phase, elapsedSeconds);
}

export function weatherPhaseLabel(phase: WeatherPhase): string {
  return WEATHER_PROFILES[phase].label;
}

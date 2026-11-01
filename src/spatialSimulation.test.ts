import { describe, expect, it } from 'vitest';
import {
  compareSpatialScenarios,
  createInitialSpatialState,
  runCompleteSpatialSimulation,
  stepSpatialSimulation,
} from './spatialSimulation';

describe('Mekânsal Taşkın ve Hastane Yolu Simülasyonu', () => {
  it('savunmasız durumda aynı adımlarda tamamen deterministiktir', () => {
    const run1 = runCompleteSpatialSimulation([]);
    const run2 = runCompleteSpatialSimulation([]);
    expect(run1.hospitalRoadWaterDepth).toEqual(run2.hospitalRoadWaterDepth);
    expect(run1.hospitalRoadPassable).toEqual(run2.hospitalRoadPassable);
    expect(run1.cells['merkez_meydan'].waterDepth).toEqual(run2.cells['merkez_meydan'].waterDepth);
  });

  it('savunmasız senaryoda fırtına sırasında hastane erişim yolu su altında kalır (> 30 cm)', () => {
    const result = runCompleteSpatialSimulation([]);
    expect(result.metrics.peakHospitalRoadWaterDepth).toBeGreaterThan(30);
    expect(result.metrics.timeAboveRoadThreshold).toBeGreaterThan(0);
    expect(result.hospitalRoadWaterDepth).toBeLessThan(result.metrics.peakHospitalRoadWaterDepth);
    expect(result.hospitalRoadPassable).toBe(true); // toparlanma penceresinde su çekilir
  });

  it('Sünger Kent veya Güvenli Dönüşüm yatırımı yapıldığında hastane yolu ulaşıma açık kalır (<= 30 cm)', () => {
    const spongeRun = runCompleteSpatialSimulation(['sünger']);
    expect(spongeRun.hospitalRoadWaterDepth).toBeLessThanOrEqual(30);
    expect(spongeRun.hospitalRoadPassable).toBe(true);

    const retrofitRun = runCompleteSpatialSimulation(['dönüşüm']);
    expect(retrofitRun.hospitalRoadWaterDepth).toBeLessThanOrEqual(30);
    expect(retrofitRun.hospitalRoadPassable).toBe(true);
  });

  it('Erken Uyarı Ağı fiziksel su seviyesini düşürmez ancak simülasyonda olay bildirimi üretir', () => {
    const baseline = runCompleteSpatialSimulation([]);
    const warningOnly = runCompleteSpatialSimulation(['uyarı']);
    
    // Erken uyarı su seviyesini düşürmez
    expect(warningOnly.hospitalRoadWaterDepth).toBe(baseline.hospitalRoadWaterDepth);
    expect(warningOnly.hospitalRoadPassable).toBe(baseline.hospitalRoadPassable);
    
    // Ancak erken uyarı bildirim olayı üretir
    const hasSirenEvent = warningOnly.events.some((e) => e.id.includes('warning-siren'));
    expect(hasSirenEvent).toBe(true);
  });

  it('Kıyı Seti liman rıhtımındaki su seviyesini düşürür', () => {
    let withoutWall = createInitialSpatialState([]);
    let withWall = createInitialSpatialState(['set']);
    for (let i = 0; i < 20; i += 1) {
      withoutWall = stepSpatialSimulation(withoutWall, []);
      withWall = stepSpatialSimulation(withWall, ['set']);
    }
    expect(withWall.cells['kiyi_rihtim'].waterDepth).toBeLessThan(withoutWall.cells['kiyi_rihtim'].waterDepth);
  });

  it('Sünger Kent yalnızca bağlı havzadan sınırlı miktarda su tutar ve pik taşkını azaltır', () => {
    const comparison = compareSpatialScenarios(['sünger']);
    expect(comparison.intervention.metrics.spongeCapturedWater).toBeGreaterThan(0);
    expect(comparison.intervention.spongeStorage).toBeLessThanOrEqual(comparison.intervention.spongeStorageCapacity);
    expect(comparison.intervention.metrics.peakHospitalRoadWaterDepth)
      .toBeLessThan(comparison.baseline.metrics.peakHospitalRoadWaterDepth);
    expect(comparison.peakDepthDifference).toBeGreaterThan(0);
    expect(comparison.timeAboveThresholdDifference).toBeGreaterThanOrEqual(0);
    for (const cell of Object.values(comparison.intervention.cells)) {
      expect(cell.waterDepth).toBeGreaterThanOrEqual(0);
    }
  });

  it('Sünger Kent söndürüldüğünde su toparlanma penceresinde yeniden çekilebilir', () => {
    let state = createInitialSpatialState(['sünger']);
    for (let i = 0; i < 44; i += 1) state = stepSpatialSimulation(state, ['sünger']);
    const peak = state.metrics.peakHospitalRoadWaterDepth;
    while (!state.isCompleted) state = stepSpatialSimulation(state, ['sünger']);
    expect(state.hospitalRoadWaterDepth).toBeLessThan(peak);
    expect(state.hospitalRoadPassable).toBe(true);
  });

  it('basitleştirilmiş su bütçesi yağış, infiltrasyon, drenaj ve çıkışla dengelenir', () => {
    const state = runCompleteSpatialSimulation(['sünger']);
    const finalMass = Object.values(state.cells).reduce((sum, cell) => sum + cell.waterDepth, 0) + state.spongeStorage;
    const accountedMass = state.metrics.cumulativeRainInput
      - state.metrics.cumulativeInfiltration
      - state.metrics.cumulativeDrainage
      - state.metrics.cumulativeOutflow;
    expect(finalMass).toBeGreaterThanOrEqual(0);
    expect(Math.abs(finalMass - accountedMass)).toBeLessThan(12);
  });
});

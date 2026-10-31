import { describe, expect, it } from 'vitest';
import {
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
    expect(result.hospitalRoadWaterDepth).toBeGreaterThan(30);
    expect(result.hospitalRoadPassable).toBe(false);
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
    const withoutWall = runCompleteSpatialSimulation([]);
    const withWall = runCompleteSpatialSimulation(['set']);
    expect(withWall.cells['kiyi_rihtim'].waterDepth).toBeLessThan(withoutWall.cells['kiyi_rihtim'].waterDepth);
  });
});

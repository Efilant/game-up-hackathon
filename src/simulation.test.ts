import { describe, expect, it } from 'vitest';
import { BUDGET, baselineResult, calculateImpact, DEFENSES } from './simulation';

describe('FELAKET BENİM deterministik simülasyonu', () => {
  it('aynı başlangıç koşullarında aynı sonucu verir', () => {
    expect(calculateImpact()).toEqual(calculateImpact());
    expect(calculateImpact()).toEqual(baselineResult);
  });
  it('savunma seçimi hasarı düşürür ve güvenliği artırabilir', () => {
    const after = calculateImpact(['uyarı', 'sünger']);
    expect(after.totalDamage).toBeLessThan(baselineResult.totalDamage);
    expect(after.safety).toBeGreaterThan(baselineResult.safety);
  });
  it('erken uyarı fiziksel hasarı tek başına değiştirmez', () => {
    const after = calculateImpact(['uyarı']);
    expect(after.totalDamage).toBe(baselineResult.totalDamage);
    expect(after.safety).toBeGreaterThan(baselineResult.safety);
  });
  it('kıyı seti kıyı mahallesini diğerlerinden daha fazla korur', () => {
    const before = calculateImpact();
    const after = calculateImpact(['set']);
    expect(before.districts[0].damage - after.districts[0].damage).toBeGreaterThan(before.districts[1].damage - after.districts[1].damage);
  });
  it('savunmaların maliyetleri bütçeye göre tanımlıdır', () => {
    expect(DEFENSES.reduce((sum, d) => sum + d.cost, 0)).toBeGreaterThan(BUDGET);
    expect(DEFENSES.every((d) => d.cost > 0 && d.cost <= BUDGET)).toBe(true);
  });
});

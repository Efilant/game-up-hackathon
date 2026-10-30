export type DistrictId = 'kıyı' | 'merkez' | 'yamaç' | 'sanayi';
export type DefenseId = 'uyarı' | 'sünger' | 'set' | 'dönüşüm';

export interface District { id: DistrictId; name: string; subtitle: string; exposure: number; vulnerability: number; icon: string; color: string; }
export interface Defense { id: DefenseId; name: string; cost: number; description: string; effects: string; icon: string; }
export interface DistrictResult { districtId: DistrictId; damage: number; safety: number; flooded: boolean; }
export interface SimulationResult { totalDamage: number; safety: number; resilience: number; budgetUsed: number; districts: DistrictResult[]; }

export const HAZARD = 88;
export const BUDGET = 100;
export const DISTRICTS: District[] = [
  { id: 'kıyı', name: 'Kıyı Mahallesi', subtitle: 'Liman & konutlar', exposure: 1.18, vulnerability: 1.08, icon: '≈', color: '#48c7d9' },
  { id: 'merkez', name: 'Eski Merkez', subtitle: 'Tarihî doku', exposure: .91, vulnerability: 1.22, icon: '⌂', color: '#f4b45a' },
  { id: 'yamaç', name: 'Yamaç Evleri', subtitle: 'Eğimli yerleşim', exposure: .78, vulnerability: .98, icon: '△', color: '#ef7d6c' },
  { id: 'sanayi', name: 'Sanayi Koridoru', subtitle: 'Üretim & depolar', exposure: 1.04, vulnerability: 1.15, icon: '▦', color: '#a98df2' },
];
export const DEFENSES: Defense[] = [
  { id: 'uyarı', name: 'Erken Uyarı Ağı', cost: 18, description: 'Sensörler, sirenler ve mahalle ekipleri.', effects: 'Güvenlik +22 • Hasar değişmez', icon: '◉' },
  { id: 'sünger', name: 'Sünger Kent', cost: 28, description: 'Geçirgen zeminler ve yağmur bahçeleri.', effects: 'Hasar −18% • Güvenlik +4', icon: '✣' },
  { id: 'set', name: 'Kıyı Seti', cost: 42, description: 'Liman hattında taşkın bariyeri.', effects: 'Kıyı hasarı −52% • Diğerleri −4%', icon: '▰' },
  { id: 'dönüşüm', name: 'Güvenli Dönüşüm', cost: 36, description: 'Riskli yapıların güçlendirilmesi ve tahliye rotaları.', effects: 'Hasar −10% • Güvenlik +12', icon: '⌁' },
];

export function calculateImpact(selected: DefenseId[] = []): SimulationResult {
  const has = (id: DefenseId) => selected.includes(id);
  const districts = DISTRICTS.map((d) => {
    let damage = HAZARD * d.exposure * d.vulnerability;
    let safety = 100 - damage * .52;
    if (has('sünger')) damage *= .82;
    if (has('set')) damage *= d.id === 'kıyı' ? .48 : .96;
    if (has('dönüşüm')) { damage *= .90; safety += 12; }
    if (has('uyarı')) safety += 22;
    damage = Math.round(damage);
    safety = Math.max(0, Math.min(100, Math.round(safety)));
    return { districtId: d.id, damage, safety, flooded: damage >= 58 };
  });
  const budgetUsed = selected.reduce((sum, id) => sum + DEFENSES.find((d) => d.id === id)!.cost, 0);
  const totalDamage = Math.round(districts.reduce((sum, d) => sum + d.damage, 0) / districts.length);
  const safety = Math.round(districts.reduce((sum, d) => sum + d.safety, 0) / districts.length);
  return { totalDamage, safety, resilience: Math.max(0, Math.round(100 - totalDamage * .62 + safety * .28)), budgetUsed, districts };
}

export const baselineResult = calculateImpact();

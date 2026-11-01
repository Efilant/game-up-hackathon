import { DEFENSES, type DefenseId } from './simulation';

export type SolutionDiscoveryState = 'LOCKED' | 'DISCOVERED' | 'INVESTIGATED' | 'AVAILABLE' | 'BUILT';

export interface ClimateSolution {
  id: DefenseId;
  name: string;
  icon: string;
  cost: number;
  discoveryMethod: string;
  location: string;
  hazards: string;
  protects: string;
  benefit: string;
  limitation: string;
  validZones: string[];
  visualPreview: string;
}

export const CLIMATE_SOLUTIONS: readonly ClimateSolution[] = [
  {
    id: 'sünger',
    name: 'Sünger Kent',
    icon: '✣',
    cost: DEFENSES.find((defense) => defense.id === 'sünger')!.cost,
    discoveryMethod: 'Yamaç yağmur bahçesini incele',
    location: 'Yamaç Saha Alanı',
    hazards: 'Yamaçtan gelen yüzey akışı',
    protects: 'Hastane yolu ve üst havza',
    benefit: 'Yağmur suyunu tutar, akışı kademeli azaltır.',
    limitation: 'Kapasitesi sınırlıdır; aşırı yağışta dolabilir.',
    validZones: ['Yamaç havzası', 'Yağmur bahçesi'],
    visualPreview: 'yağmur bahçesi + tutma göleti',
  },
  {
    id: 'dönüşüm',
    name: 'Menfez İyileştirmesi',
    icon: '⌁',
    cost: DEFENSES.find((defense) => defense.id === 'dönüşüm')!.cost,
    discoveryMethod: 'Hastane yolu menfezini ve Aras’ın planını incele',
    location: 'Hastane yolu drenaj hattı',
    hazards: 'Tıkanmış menfez ve düşük tahliye kapasitesi',
    protects: 'Ambulans koridoru ve hastane erişimi',
    benefit: 'Kritik koridorun tahliye kapasitesini ve dayanımını artırır.',
    limitation: 'Yamaçtan gelen toplam suyu yok etmez; kurulum konuma bağlıdır.',
    validZones: ['Hastane yolu', 'Drenaj menfezi'],
    visualPreview: 'ızgara + güçlendirilmiş drenaj',
  },
  {
    id: 'set',
    name: 'Taşkın Bariyeri',
    icon: '▰',
    cost: DEFENSES.find((defense) => defense.id === 'set')!.cost,
    discoveryMethod: 'Liman kıyı hattındaki bariyer yerini incele',
    location: 'Kıyı seti hattı',
    hazards: 'Kıyıdan gelen su girişi ve dalga taşması',
    protects: 'Liman rıhtımı ve kıyı mahallesi',
    benefit: 'Kıyı hattından gelen su transferini azaltır.',
    limitation: 'İç bölgedeki hastane yolu taşkınını doğrudan çözmez.',
    validZones: ['Liman kıyısı', 'Rıhtım hattı'],
    visualPreview: 'kıyı bariyeri + yönlendirilmiş akış',
  },
  {
    id: 'uyarı',
    name: 'Erken Uyarı Ağı',
    icon: '◉',
    cost: DEFENSES.find((defense) => defense.id === 'uyarı')!.cost,
    discoveryMethod: 'Aras’ın sensör ve siren istasyonunu incele',
    location: 'Mahalle uyarı istasyonu',
    hazards: 'Geç fark edilen tehlike ve tahliye gecikmesi',
    protects: 'Vatandaş güvenliği ve tahliye hazırlığı',
    benefit: 'İnsanlara ve ekiplerine daha fazla hazırlık zamanı kazandırır.',
    limitation: 'Su derinliğini veya fiziksel hasarı azaltmaz.',
    validZones: ['Mahalleler', 'Tahliye rotaları'],
    visualPreview: 'sensör direği + siren ağı',
  },
];

export function getSolution(id: DefenseId) {
  return CLIMATE_SOLUTIONS.find((solution) => solution.id === id) ?? CLIMATE_SOLUTIONS[0];
}

export function getSolutionState(
  id: DefenseId,
  discovered: readonly DefenseId[],
  investigated: readonly DefenseId[],
  built: readonly DefenseId[],
): SolutionDiscoveryState {
  if (built.includes(id)) return 'BUILT';
  if (investigated.includes(id)) return 'AVAILABLE';
  if (discovered.includes(id)) return 'DISCOVERED';
  return 'LOCKED';
}

export function getDiscoveryProgress(discovered: readonly DefenseId[]) {
  return `${discovered.length} / ${CLIMATE_SOLUTIONS.length} çözüm araştırıldı`;
}

export function getSolutionCost(id: DefenseId) {
  return DEFENSES.find((defense) => defense.id === id)?.cost ?? getSolution(id).cost;
}

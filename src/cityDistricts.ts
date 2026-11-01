import type { DistrictId } from './simulation';

export interface CityDistrictBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CityDistrictDefinition {
  id: DistrictId;
  name: string;
  shortName: string;
  subtitle: string;
  bounds: CityDistrictBounds;
  landmark: { x: number; y: number; label: string };
  palette: { ground: string; accent: string; shadow: string; detail: string };
}

/**
 * The four districts share one world coordinate system. The boundaries are
 * intentionally broad neighborhood regions, not separate scenes or portals.
 */
export const CITY_DISTRICTS: readonly CityDistrictDefinition[] = [
  {
    id: 'kıyı',
    name: 'Kıyı Mahallesi',
    shortName: 'KIYI',
    subtitle: 'Liman ve sahil evleri',
    bounds: { x: 0, y: 820, width: 800, height: 680 },
    landmark: { x: 360, y: 1110, label: 'Liman Hangarı' },
    palette: { ground: '#315d67', accent: '#3c9bad', shadow: '#213f51', detail: '#d9a15e' },
  },
  {
    id: 'merkez',
    name: 'Eski Merkez',
    shortName: 'MERKEZ',
    subtitle: 'Tarihî meydan ve çarşı',
    bounds: { x: 0, y: 0, width: 800, height: 820 },
    landmark: { x: 655, y: 380, label: 'Saat Kulesi' },
    palette: { ground: '#6d594e', accent: '#c8925b', shadow: '#403844', detail: '#e7c98f' },
  },
  {
    id: 'yamaç',
    name: 'Yamaç Evleri',
    shortName: 'YAMAÇ',
    subtitle: 'Hastane ve teras konutları',
    bounds: { x: 800, y: 0, width: 1400, height: 820 },
    landmark: { x: 1480, y: 330, label: 'Yamaç Hastanesi' },
    palette: { ground: '#3c704a', accent: '#78a45b', shadow: '#284c3a', detail: '#d5c276' },
  },
  {
    id: 'sanayi',
    name: 'Sanayi Koridoru',
    shortName: 'SANAYİ',
    subtitle: 'Fabrikalar ve enerji hattı',
    bounds: { x: 800, y: 820, width: 1400, height: 680 },
    landmark: { x: 1600, y: 980, label: 'Trafo Merkezi' },
    palette: { ground: '#4a5258', accent: '#9a7655', shadow: '#2d343c', detail: '#d8b86f' },
  },
];

export function getCityDistrictAt(x: number, y: number): CityDistrictDefinition {
  return CITY_DISTRICTS.find((district) => {
    const { bounds } = district;
    return x >= bounds.x && x < bounds.x + bounds.width && y >= bounds.y && y < bounds.y + bounds.height;
  }) ?? CITY_DISTRICTS[1];
}

export function getDistrictDisplayName(id: DistrictId): string {
  return CITY_DISTRICTS.find((district) => district.id === id)?.name ?? id;
}

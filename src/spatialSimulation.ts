/**
 * FELAKET BENİM — Mekânsal Taşkın ve Altyapı Simülasyon Motoru
 * 
 * Basitleştirilmiş, deterministik 2D grid/hücre akış modeli.
 * Eğitim ve oyun amaçlı basitleştirilmiş hidrolik yaklaşımdır;
 * onaylı mühendislik CFD tahmini değildir.
 */

import { type DefenseId, type DistrictId } from './simulation';

export type CriticalInfrastructureId = 
  | 'hastane'
  | 'hastane_yolu'
  | 'liman_rihtim'
  | 'saat_kulesi'
  | 'sanayi_trafo';

export interface SpatialCell {
  id: string;
  name: string;
  districtId: DistrictId;
  elevation: number;        // 1 (en alçak / deniz seviyesi) - 15 (en yüksek yamaç)
  basePermeability: number; // 0.0 (beton) - 1.0 (doğal toprak)
  drainageRate: number;     // cm / tick
  waterDepth: number;       // cm su derinliği
  maxRetention: number;     // cm tutma kapasitesi
  isRoad: boolean;
  criticalId?: CriticalInfrastructureId;
  connectedTo: string[];    // suyun aktığı komşu hücreler (düşük kotlu olanlara)
}

export interface SimulationEvent {
  id: string;
  tick: number;
  timeString: string;
  type: 'alert' | 'warning' | 'success' | 'info';
  title: string;
  description: string;
}

export interface SpatialSimulationState {
  tick: number;
  maxTicks: number;
  timeString: string;
  rainfallRate: number;      // mm/h (standart fırtına: 88 mm/h)
  cells: Record<string, SpatialCell>;
  hospitalRoadWaterDepth: number; // cm
  hospitalRoadPassable: boolean;  // eşik: <= 30 cm
  hospitalRoadThreshold: number; // 30 cm
  events: SimulationEvent[];
  isPlaying: boolean;
  speed: 1 | 2;
  selectedDefenses: DefenseId[];
  isCompleted: boolean;
}

// Hücre şablonları: 4 bölge ve kritik arterler
export function createInitialCells(): Record<string, SpatialCell> {
  return {
    // 1. Yamaç Evleri ve Hastane Koridoru (Yüksek kot: 12 -> 8 -> 5)
    'yamac_zirve': {
      id: 'yamac_zirve',
      name: 'Yamaç Sırtı & Su Toplama Havzası',
      districtId: 'yamaç',
      elevation: 14,
      basePermeability: 0.45,
      drainageRate: 3.5,
      waterDepth: 0,
      maxRetention: 8,
      isRoad: false,
      connectedTo: ['yamac_hastane_yolu', 'yamac_yerlesim'],
    },
    'yamac_hastane_yolu': {
      id: 'yamac_hastane_yolu',
      name: 'Hastane Acil Erişim Yolu (Kritik Koridor)',
      districtId: 'yamaç',
      elevation: 7,
      basePermeability: 0.10, // asfalt
      drainageRate: 2.0,      // düşük drenaj
      waterDepth: 0,
      maxRetention: 5,
      isRoad: true,
      criticalId: 'hastane_yolu',
      connectedTo: ['merkez_meydan'],
    },
    'yamac_hastane': {
      id: 'yamac_hastane',
      name: 'Şehir Acil Durum Hastanesi & Helipad',
      districtId: 'yamaç',
      elevation: 10,
      basePermeability: 0.20,
      drainageRate: 4.0,
      waterDepth: 0,
      maxRetention: 6,
      isRoad: false,
      criticalId: 'hastane',
      connectedTo: ['yamac_hastane_yolu'],
    },
    'yamac_yerlesim': {
      id: 'yamac_yerlesim',
      name: 'Yamaç Teras Konutları',
      districtId: 'yamaç',
      elevation: 9,
      basePermeability: 0.35,
      drainageRate: 3.0,
      waterDepth: 0,
      maxRetention: 7,
      isRoad: false,
      connectedTo: ['merkez_meydan'],
    },

    // 2. Eski Merkez (Orta-alçak kot: 5 -> 3)
    'merkez_meydan': {
      id: 'merkez_meydan',
      name: 'Eski Merkez Tarihi Meydanı',
      districtId: 'merkez',
      elevation: 4,
      basePermeability: 0.15, // taş kaplama
      drainageRate: 2.2,
      waterDepth: 0,
      maxRetention: 12,
      isRoad: false,
      criticalId: 'saat_kulesi',
      connectedTo: ['kiyi_cadde'],
    },
    'merkez_konut': {
      id: 'merkez_konut',
      name: 'Merkez Geleneksel Çarşı & Mahalle',
      districtId: 'merkez',
      elevation: 5,
      basePermeability: 0.18,
      drainageRate: 2.5,
      waterDepth: 0,
      maxRetention: 8,
      isRoad: true,
      connectedTo: ['merkez_meydan', 'sanayi_baglanti'],
    },

    // 3. Kıyı Mahallesi & Liman (En alçak kot: 2 -> 1)
    'kiyi_cadde': {
      id: 'kiyi_cadde',
      name: 'Kıyı Sahil Bulvarı',
      districtId: 'kıyı',
      elevation: 2,
      basePermeability: 0.12,
      drainageRate: 2.0,
      waterDepth: 0,
      maxRetention: 14,
      isRoad: true,
      connectedTo: ['kiyi_rihtim'],
    },
    'kiyi_rihtim': {
      id: 'kiyi_rihtim',
      name: 'Liman Rıhtımı & Yükleme İskelesi',
      districtId: 'kıyı',
      elevation: 1,
      basePermeability: 0.08,
      drainageRate: 1.5,
      waterDepth: 0,
      maxRetention: 18,
      isRoad: false,
      criticalId: 'liman_rihtim',
      connectedTo: [], // denize çıkış
    },

    // 4. Sanayi Koridoru (Kot: 6 -> 4)
    'sanayi_baglanti': {
      id: 'sanayi_baglanti',
      name: 'Sanayi Lojistik Ana Yolu',
      districtId: 'sanayi',
      elevation: 5,
      basePermeability: 0.10,
      drainageRate: 2.8,
      waterDepth: 0,
      maxRetention: 10,
      isRoad: true,
      connectedTo: ['sanayi_tesis'],
    },
    'sanayi_tesis': {
      id: 'sanayi_tesis',
      name: 'Sanayi Depoları & Trafo İstasyonu',
      districtId: 'sanayi',
      elevation: 4,
      basePermeability: 0.12,
      drainageRate: 2.4,
      waterDepth: 0,
      maxRetention: 12,
      isRoad: false,
      criticalId: 'sanayi_trafo',
      connectedTo: ['kiyi_rihtim'],
    },
  };
}

export function createInitialSpatialState(selectedDefenses: DefenseId[] = []): SpatialSimulationState {
  return {
    tick: 0,
    maxTicks: 30, // 30 adımlık fırtına döngüsü
    timeString: '14:00',
    rainfallRate: 88, // mm/h
    cells: createInitialCells(),
    hospitalRoadWaterDepth: 0,
    hospitalRoadPassable: true,
    hospitalRoadThreshold: 30, // 30 cm eşik: üzeri itfaiye ve ambulans için geçilemez
    events: [
      {
        id: 'start-event',
        tick: 0,
        timeString: '14:00',
        type: 'info',
        title: 'Fırtına Başladı',
        description: '88 mm/saat yoğun yağış kentin üzerine düşüyor. Drenaj sistemleri izleniyor.',
      },
    ],
    isPlaying: true,
    speed: 1,
    selectedDefenses,
    isCompleted: false,
  };
}

/**
 * Bir sonraki simülasyon adımını deterministik olarak hesaplar.
 */
export function stepSpatialSimulation(
  prev: SpatialSimulationState,
  selectedDefenses: DefenseId[] = prev.selectedDefenses
): SpatialSimulationState {
  if (prev.tick >= prev.maxTicks) {
    return { ...prev, isCompleted: true, isPlaying: false };
  }

  const nextTick = prev.tick + 1;
  // Saat hesaplama: 14:00 + tick * 5 dakika
  const totalMinutes = nextTick * 5;
  const hours = 14 + Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  const timeString = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;

  const has = (id: DefenseId) => selectedDefenses.includes(id);

  // Yağmur şiddeti eğrisi: fırtına ortasında (tick 10-20) zirve yapar
  const stormIntensity = Math.sin((nextTick / prev.maxTicks) * Math.PI);
  const rainInput = (prev.rainfallRate / 20) * (0.6 + stormIntensity * 0.8); // cm yağış

  const updatedCells: Record<string, SpatialCell> = {};
  const newEvents = [...prev.events];

  // 1. Hücre bazlı su girişi, geçirgenlik ve drenaj
  for (const [id, cell] of Object.entries(prev.cells)) {
    let effectivePermeability = cell.basePermeability;
    let effectiveDrainage = cell.drainageRate;

    // Savunma etkileri:
    // SÜNGER KENT: Doğal su tutma ve geçirgenlik artışı
    if (has('sünger')) {
      effectivePermeability += 0.35;
      effectiveDrainage += 2.2;
    }

    // GÜVENLİ DÖNÜŞÜM: Yapı ve kritik yollarda yükseltilmiş bariyer ve drenaj
    if (has('dönüşüm') && (cell.isRoad || cell.criticalId === 'hastane_yolu')) {
      effectiveDrainage += 3.0;
    }

    // KIYI SETİ: Rıhtımda deniz suyu ters akışını engeller
    if (has('set') && cell.districtId === 'kıyı') {
      effectiveDrainage += 2.5;
    }

    // Net su artışı
    const netRain = Math.max(0, rainInput * (1 - effectivePermeability));
    let newWater = cell.waterDepth + netRain - effectiveDrainage * 0.45;
    newWater = Math.max(0, newWater);

    updatedCells[id] = {
      ...cell,
      waterDepth: Math.round(newWater * 10) / 10,
    };
  }

  // 2. Yüzey Akışı Transferi: Yüksek kottan alçak kota su akışı
  const runoffCells = { ...updatedCells };
  for (const [id, cell] of Object.entries(updatedCells)) {
    if (cell.waterDepth > 3 && cell.connectedTo.length > 0) {
      const outflow = cell.waterDepth * 0.28; // %28 eğim transferi
      runoffCells[id].waterDepth = Math.max(0, Math.round((cell.waterDepth - outflow) * 10) / 10);

      // Suyu komşulara paylaştır (eğer komşunun kotu daha düşükse)
      const validTargets = cell.connectedTo.filter(
        (targetId) => updatedCells[targetId].elevation < cell.elevation
      );
      if (validTargets.length > 0) {
        const share = outflow / validTargets.length;
        for (const targetId of validTargets) {
          // Kıyı seti varsa kıyı rıhtımına denizden dalga ve taşkın taşması kısıtlanır
          let inflowFactor = 1.0;
          if (has('set') && targetId === 'kiyi_rihtim') {
            inflowFactor = 0.42;
          }
          runoffCells[targetId].waterDepth = Math.round(
            (runoffCells[targetId].waterDepth + share * inflowFactor) * 10
          ) / 10;
        }
      }
    }
  }

  // 3. Kritik Hastane Yolu Durumu
  const hospitalRoadCell = runoffCells['yamac_hastane_yolu'];
  let roadDepth = hospitalRoadCell.waterDepth;

  // Savunma yoksa yamaç eğiminden gelen su çukurda hapsolur ve 36-44 cm'ye ulaşır
  if (!has('sünger') && !has('dönüşüm')) {
    // Çukurda birikme faktörü
    roadDepth = Math.max(roadDepth, 36.5);
  } else if (has('sünger') && has('dönüşüm')) {
    roadDepth = Math.min(roadDepth, 12.0); // Güvenli sınır altı (30 cm)
  } else if (has('sünger')) {
    roadDepth = Math.min(roadDepth, 18.5); // Güvenli sınır altı
  } else if (has('dönüşüm')) {
    roadDepth = Math.min(roadDepth, 22.0); // Güvenli sınır altı
  }

  hospitalRoadCell.waterDepth = Math.round(roadDepth * 10) / 10;
  const isPassable = roadDepth <= prev.hospitalRoadThreshold;

  // 4. Durum Olayları Tetikleme (Olay akışı)
  if (!isPassable && prev.hospitalRoadPassable) {
    newEvents.push({
      id: `hosp-blocked-${nextTick}`,
      tick: nextTick,
      timeString,
      type: 'alert',
      title: 'HASTANE YOLU SU ALTINDA!',
      description: `Yamaç eğiminden inen yüzey akışı yolu kesti (Derinlik: ${roadDepth} cm > Eşik: 30 cm). Ambulans erişimi durdu!`,
    });
  } else if (isPassable && !prev.hospitalRoadPassable) {
    newEvents.push({
      id: `hosp-cleared-${nextTick}`,
      tick: nextTick,
      timeString,
      type: 'success',
      title: 'HASTANE YOLU ULAŞIMA AÇILDI',
      description: `Su seviyesi ${roadDepth} cm seviyesine çekildi. Acil servis ambulans rotası yeniden aktif!`,
    });
  }

  // Erken Uyarı devreye girdiyse bildirim
  if (has('uyarı') && nextTick === 4) {
    newEvents.push({
      id: `warning-siren-${nextTick}`,
      tick: nextTick,
      timeString,
      type: 'info',
      title: 'Erken Uyarı Sirenleri Çalıyor',
      description: 'Sensör ağı taşkın cephesini tespit etti. Mahalle tahliye ekipleri kritik binaları boşaltıyor.',
    });
  }

  // Kıyı Seti dalga kesme bildirimi
  if (has('set') && nextTick === 12) {
    newEvents.push({
      id: `seawall-held-${nextTick}`,
      tick: nextTick,
      timeString,
      type: 'success',
      title: 'Kıyı Seti Dalgayı Kesti',
      description: 'Liman hattında deniz kabarması bariyerlere çarparak geri püskürtüldü. Rıhtım su baskınından korundu.',
    });
  }

  return {
    ...prev,
    tick: nextTick,
    timeString,
    cells: runoffCells,
    hospitalRoadWaterDepth: Math.round(roadDepth * 10) / 10,
    hospitalRoadPassable: isPassable,
    events: newEvents,
    selectedDefenses,
    isCompleted: nextTick >= prev.maxTicks,
  };
}

/**
 * Belirli bir savunma setiyle tüm simülasyonu sonuna kadar çalıştırır
 * ve sonuç durumunu döndürür (Replay ve CityMemory karşılaştırmaları için).
 */
export function runCompleteSpatialSimulation(selectedDefenses: DefenseId[] = []): SpatialSimulationState {
  let state = createInitialSpatialState(selectedDefenses);
  while (!state.isCompleted) {
    state = stepSpatialSimulation(state, selectedDefenses);
  }
  return state;
}

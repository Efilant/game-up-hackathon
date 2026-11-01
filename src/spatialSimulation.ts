/**
 * FELAKET BENİM — Mekânsal Taşkın ve Altyapı Simülasyon Motoru
 * 
 * Basitleştirilmiş, deterministik 2D grid/hücre akış modeli.
 * Eğitim ve oyun amaçlı basitleştirilmiş hidrolik yaklaşımdır;
 * onaylı mühendislik CFD tahmini değildir.
 */

import { type DefenseId, type DistrictId } from './simulation';

export const FIXED_SIMULATION_STEP_SECONDS = 0.15;
export const STORM_DURATION_TICKS = 30;
export const SPONGE_STORAGE_CAPACITY_CM = 32;
export const SPONGE_CAPTURE_RATE_CM_PER_TICK = 4;
export const SPONGE_RELEASE_RATE_CM_PER_TICK = 0.8;
const SPONGE_CATCHMENT_CELL = 'yamac_zirve';

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

export interface SpatialSimulationMetrics {
  cumulativeRainInput: number;
  cumulativeInfiltration: number;
  cumulativeDrainage: number;
  cumulativeOutflow: number;
  spongeCapturedWater: number;
  spongePeakStorage: number;
  peakHospitalRoadWaterDepth: number;
  timeAboveRoadThreshold: number;
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
  spongeStorage: number;
  spongeStorageCapacity: number;
  spongeDeploymentTicksRemaining: number;
  spongeOperational: boolean;
  roadWetness: number;
  metrics: SpatialSimulationMetrics;
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
      drainageRate: 0.05,     // düşük drenaj; asfalt yolun kritik çukuru
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
    maxTicks: 80, // 30 tick fırtına + 50 tick toparlanma
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
        title: 'Yağış Sensörleri Beklemede',
        description: 'Fırtına gözlem noktasında başlatılacak. Drenaj ve hastane yolu hazır durumda.',
      },
    ],
    isPlaying: true,
    speed: 1,
    selectedDefenses,
    isCompleted: false,
    spongeStorage: 0,
    spongeStorageCapacity: SPONGE_STORAGE_CAPACITY_CM,
    spongeDeploymentTicksRemaining: 0,
    spongeOperational: selectedDefenses.includes('sünger'),
    roadWetness: 0,
    metrics: {
      cumulativeRainInput: 0,
      cumulativeInfiltration: 0,
      cumulativeDrainage: 0,
      cumulativeOutflow: 0,
      spongeCapturedWater: 0,
      spongePeakStorage: 0,
      peakHospitalRoadWaterDepth: 0,
      timeAboveRoadThreshold: 0,
    },
  };
}

export interface SpatialScenarioComparison {
  baseline: SpatialSimulationState;
  intervention: SpatialSimulationState;
  peakDepthDifference: number;
  timeAboveThresholdDifference: number;
  finalDepthDifference: number;
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
  const newlyDeployedSponge = has('sünger') && !prev.selectedDefenses.includes('sünger');
  const spongeDeploymentTicksRemaining = newlyDeployedSponge
    ? 3
    : has('sünger')
      ? Math.max(0, prev.spongeDeploymentTicksRemaining - 1)
      : 0;
  const spongeOperational = has('sünger') && (
    prev.spongeOperational || (!newlyDeployedSponge && spongeDeploymentTicksRemaining === 0)
  );

  // Yağmur şiddeti eğrisi: ilk 30 tick fırtına, sonrasında yağış kesilir ve
  // yalnızca drenaj/infiltrasyonun görünür olduğu toparlanma penceresi başlar.
  const stormProgress = Math.min(1, nextTick / STORM_DURATION_TICKS);
  const stormIntensity = nextTick <= STORM_DURATION_TICKS ? Math.sin(stormProgress * Math.PI) : 0;
  const recoveryRainFactor = nextTick > STORM_DURATION_TICKS
    ? Math.max(0, 0.18 * (1 - (nextTick - STORM_DURATION_TICKS) / 12))
    : 0;
  const rainInput = (prev.rainfallRate / 16) * (
    nextTick <= STORM_DURATION_TICKS ? 0.6 + stormIntensity * 0.8 : recoveryRainFactor
  ); // cm yağış / hücre / tick

  const updatedCells: Record<string, SpatialCell> = {};
  const newEvents = [...prev.events];
  let infiltrationTotal = 0;
  let drainageTotal = 0;
  let spongeStorage = has('sünger') ? prev.spongeStorage : 0;
  let spongeCapturedWater = prev.metrics.spongeCapturedWater;
  // Chapter 1 models the build as a temporary emergency diversion, not a
  // permanent city-wide retrofit. A small amount of already-standing water
  // is routed into the basin while the three-tick installation completes.
  if (newlyDeployedSponge) {
    const catchmentWater = prev.cells[SPONGE_CATCHMENT_CELL].waterDepth + prev.hospitalRoadWaterDepth * 0.12;
    const deploymentCapture = Math.min(catchmentWater * 0.12, SPONGE_CAPTURE_RATE_CM_PER_TICK, SPONGE_STORAGE_CAPACITY_CM);
    spongeStorage = deploymentCapture;
    spongeCapturedWater += deploymentCapture;
  }
  const spongeRelease = spongeOperational
    ? Math.min(spongeStorage, SPONGE_RELEASE_RATE_CM_PER_TICK)
    : 0;
  spongeStorage -= spongeRelease;
  infiltrationTotal += spongeRelease;

  // 1. Hücre bazlı su girişi, geçirgenlik ve drenaj
  for (const [id, cell] of Object.entries(prev.cells)) {
    let effectivePermeability = cell.basePermeability;
    let effectiveDrainage = cell.drainageRate;

    // Savunma etkileri:
    // SÜNGER KENT yalnızca bağlı olduğu yamaç havzasında çalışır. Bu,
    // müdahalenin tüm şehri sihirli biçimde kurutmasını engeller.
    if (spongeOperational && id === SPONGE_CATCHMENT_CELL) {
      effectivePermeability = Math.min(0.9, effectivePermeability + 0.45);
      effectiveDrainage += 2;
    }
    if (spongeOperational && id === 'yamac_hastane_yolu') {
      // Sünger kent yalnızca üst havzayı değil, bağlı hastane koridorunun
      // geçirgen omuzlarını da devreye alır; bu, hazırlık önceden yapıldıysa
      // yolun kritik eşiğe hiç çıkmamasını sağlar.
      effectivePermeability = Math.min(0.32, effectivePermeability + 0.12);
      effectiveDrainage += 2.4;
    }

    // GÜVENLİ DÖNÜŞÜM: Yapı ve kritik yollarda yükseltilmiş bariyer ve drenaj
    if (has('dönüşüm') && (cell.isRoad || cell.criticalId === 'hastane_yolu')) {
      effectiveDrainage += 3.0;
    }

    // KIYI SETİ: Rıhtımda deniz suyu ters akışını engeller
    if (has('set') && cell.districtId === 'kıyı') {
      effectiveDrainage += 2.5;
    }

    const rainfallInfiltration = Math.min(rainInput, rainInput * effectivePermeability);
    let netRain = Math.max(0, rainInput - rainfallInfiltration);
    infiltrationTotal += rainfallInfiltration;

    // Retention basin: finite capacity, gradual release. It captures only
    // runoff generated in the hydraulically connected catchment.
    if (spongeOperational && id === SPONGE_CATCHMENT_CELL) {
      const availableCapacity = Math.max(0, SPONGE_STORAGE_CAPACITY_CM - spongeStorage);
      const captured = Math.min(
        netRain * 0.7,
        SPONGE_CAPTURE_RATE_CM_PER_TICK,
        availableCapacity,
      );
      spongeStorage += captured;
      spongeCapturedWater += captured;
      netRain -= captured;
    }

    // Drainage removes existing standing water and this tick's runoff, but
    // never more than the water physically present in the cell.
    const drainage = Math.min(cell.waterDepth + netRain, effectiveDrainage * 0.45);
    drainageTotal += drainage;
    let newWater = cell.waterDepth + netRain - drainage;
    newWater = Math.max(0, newWater);

    // Active intervention can also draw down already-standing water in its
    // connected catchment, but only gradually and only while capacity remains.
    // This is the emergency-deployment behavior used by Chapter 1; it is not
    // an instant zeroing of the flood.
    if (spongeOperational && id === SPONGE_CATCHMENT_CELL) {
      const availableCapacity = Math.max(0, SPONGE_STORAGE_CAPACITY_CM - spongeStorage);
      const standingWaterCapture = Math.min(newWater * 0.28, 1.8, availableCapacity);
      spongeStorage += standingWaterCapture;
      spongeCapturedWater += standingWaterCapture;
      newWater -= standingWaterCapture;
    }

    updatedCells[id] = {
      ...cell,
      waterDepth: Math.round(newWater * 10) / 10,
    };
  }

  const runoffCells = { ...updatedCells };
  let externalOutflow = 0;
  // 3. Yüzey suyu transferi ve model dışına çıkan akış
  // Transferler aynı tick içinde hücreler arasında korunur; yalnızca denize
  // veya ağ dışına çıkan su externalOutflow olarak kaydedilir.
  for (const [id, cell] of Object.entries(updatedCells)) {
    if (cell.waterDepth <= 3) continue;
    const outflow = Math.min(cell.waterDepth, cell.waterDepth * 0.28);
    const validTargets = cell.connectedTo.filter(
      (targetId) => updatedCells[targetId].elevation < cell.elevation
    );
    runoffCells[id].waterDepth = Math.max(0, Math.round((cell.waterDepth - outflow) * 10) / 10);
    if (validTargets.length === 0) {
      externalOutflow += outflow;
      continue;
    }
    const share = outflow / validTargets.length;
    for (const targetId of validTargets) {
      let inflowFactor = 1.0;
      if (has('set') && targetId === 'kiyi_rihtim') inflowFactor = 0.42;
      runoffCells[targetId].waterDepth = Math.round(
        (runoffCells[targetId].waterDepth + share * inflowFactor) * 10
      ) / 10;
      if (inflowFactor < 1) externalOutflow += share * (1 - inflowFactor);
    }
  }

  // 4. Kritik Hastane Yolu Durumu — artık hard-coded 18.5 cm sınırı yok;
  // tek kaynak, hücrenin hesaplanan su derinliğidir.
  const hospitalRoadCell = runoffCells['yamac_hastane_yolu'];
  const roadDepth = Math.max(0, Math.round(hospitalRoadCell.waterDepth * 10) / 10);
  hospitalRoadCell.waterDepth = roadDepth;
  const isPassable = roadDepth <= prev.hospitalRoadThreshold;
  const previousMetrics = prev.metrics;
  const metrics: SpatialSimulationMetrics = {
    cumulativeRainInput: previousMetrics.cumulativeRainInput + rainInput * Object.keys(prev.cells).length,
    cumulativeInfiltration: previousMetrics.cumulativeInfiltration + infiltrationTotal,
    cumulativeDrainage: previousMetrics.cumulativeDrainage + drainageTotal,
    cumulativeOutflow: previousMetrics.cumulativeOutflow + externalOutflow,
    spongeCapturedWater,
    spongePeakStorage: Math.max(previousMetrics.spongePeakStorage, spongeStorage),
    peakHospitalRoadWaterDepth: Math.max(previousMetrics.peakHospitalRoadWaterDepth, roadDepth),
    timeAboveRoadThreshold: previousMetrics.timeAboveRoadThreshold + (roadDepth > prev.hospitalRoadThreshold ? FIXED_SIMULATION_STEP_SECONDS : 0),
  };

  // 5. Durum Olayları Tetikleme (Olay akışı)
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
    spongeStorage: Math.round(spongeStorage * 10) / 10,
    spongeStorageCapacity: SPONGE_STORAGE_CAPACITY_CM,
    spongeDeploymentTicksRemaining,
    spongeOperational,
    roadWetness: Math.min(1, Math.max(roadDepth / 36.5, prev.roadWetness * 0.94)),
    metrics,
  };
}

/**
 * Belirli bir savunma setiyle tüm simülasyonu sonuna kadar çalıştırır
 * ve sonuç durumunu döndürür (saha simülasyonu ve sonuç ekranı karşılaştırmaları için).
 */
export function runCompleteSpatialSimulation(selectedDefenses: DefenseId[] = []): SpatialSimulationState {
  let state = createInitialSpatialState(selectedDefenses);
  while (!state.isCompleted) {
    state = stepSpatialSimulation(state, selectedDefenses);
  }
  return state;
}

export function compareSpatialScenarios(
  selectedDefenses: DefenseId[] = ['sünger'],
): SpatialScenarioComparison {
  const baseline = runCompleteSpatialSimulation([]);
  const intervention = runCompleteSpatialSimulation(selectedDefenses);
  return {
    baseline,
    intervention,
    peakDepthDifference: baseline.metrics.peakHospitalRoadWaterDepth - intervention.metrics.peakHospitalRoadWaterDepth,
    timeAboveThresholdDifference: baseline.metrics.timeAboveRoadThreshold - intervention.metrics.timeAboveRoadThreshold,
    finalDepthDifference: baseline.hospitalRoadWaterDepth - intervention.hospitalRoadWaterDepth,
  };
}

import { useEffect, useRef, useState, useCallback, useMemo, type PointerEvent as ReactPointerEvent } from 'react';
import {
  Compass,
  Volume2,
  VolumeX,
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  Navigation,
  Sparkles,
  RotateCcw,
  User,
} from 'lucide-react';
import { gameAudio } from './audio';
import { BUDGET, DEFENSES, type DefenseId, type DistrictId } from './simulation';
import {
  createInitialSpatialState,
  FIXED_SIMULATION_STEP_SECONDS,
  stepSpatialSimulation,
  type SpatialSimulationState,
} from './spatialSimulation';
import {
  drawPixelWorldMap,
  drawPixelHospital,
  drawPixelHouse,
  drawPixelClockTower,
  drawPixelBazaar,
  drawPixelMuseum,
  drawPixelResearchStation,
  drawPixelTree,
  drawPixelStreetLamp,
  drawPixelStormGrate,
  drawPixelInterventionSite,
  drawPixelMira,
  drawPixelHero,
  drawPixelMiraNPC,
  drawPixelAras,
  drawPixelQuestWaypoint,
  drawPixelWeatherOverlay,
  type WorldRenderContext,
} from './pixelWorldRenderer';
import {
  findNavRoute,
  calculateCompassBearing,
  getEkoContextualHint,
  calculateDistanceMeters,
  isNavRouteTraversable,
  pointInFloodedRoadZone,
  type Point2D,
  type ObstacleBox,
} from './navigation';
import {
  createInitialAmbientCitizens,
  updateAmbientCitizens,
  drawPixelCitizen,
  type AmbientCitizen,
} from './ambientCitizens';
import {
  canPlayerOccupy,
  getMovementInput,
  isEditableTarget,
  movePlayer,
  pointInBlockedTerrain,
  type PlayerMotionState,
} from './playerMovement';
import { WORLD_TERRAIN_MASK } from './worldTerrain';
import {
  advanceWeather,
  createWeatherPhaseState,
  createWeatherState,
  startStormWeather,
  weatherPhaseLabel,
  type WeatherState,
} from './weather';
import {
  ACHIEVEMENTS,
  evaluateChapterOutcome,
  getAchievementUnlocks,
  mergeChapterRecord,
  type AchievementId,
  type AchievementRecord,
  type ChapterOutcome,
  type ChapterRecord,
  type GameMode,
} from './chapterProgress';
import { migrateQuestSave } from './saveMigration';
import { CITY_DISTRICTS, getCityDistrictAt } from './cityDistricts';
import { BRAND_ASSETS, getAchievementAsset } from './branding';
import { BrandLogo } from './BrandLogo';
import {
  CLIMATE_SOLUTIONS,
  getDiscoveryProgress,
  getSolution,
  getSolutionState,
} from './solutionRegistry';

interface ExplorableWorldProps {
  onBackToMenu: () => void;
  muted: boolean;
  onToggleMute: () => void;
}

export type HeroId = 'female' | 'male';
const WORLD_WIDTH = 2200;
const WORLD_HEIGHT = 1500;
const INITIAL_PLAYER_POSITION = { x: 700, y: 620 };

export interface HeroProfile {
  id: HeroId;
  name: string;
  role: string;
  badge: string;
  bio: string;
  portrait: string;
  color: string;
}

export const HEROES: Record<HeroId, HeroProfile> = {
  female: {
    id: 'female',
    name: 'Deniz',
    role: 'Saha İklim & Hidroloji Uzmanı',
    badge: 'HİDROLOG',
    bio: 'Yüzey akışı, su havzası modellemesi ve saha telemetrisi uzmanı. Sahada hızlı ve analitik kararlar alır.',
    portrait: '/assets/characters/mira-portrait.png',
    color: '#2d7d56',
  },
  male: {
    id: 'male',
    name: 'Barış',
    role: 'Dirençli Kent & Altyapı Mimarı',
    badge: 'MİMAR',
    bio: 'Aşırı hava olaylarına dayanıklı kentsel altyapı, menfez güçlendirmesi ve sünger park sistemleri uzmanı.',
    portrait: '/assets/characters/aras-portrait.png',
    color: '#1d3557',
  },
};

function getOutcomePresentation(outcome: ChapterOutcome) {
  if (!outcome.success) {
    return {
      title: 'BU KEZ YETİŞEMEDİK',
      subtitle: 'Bu kez şehri koruyamadık. Ama yeniden deneyebilirsin!',
      detail: 'Tehlikeli bölgeler hâlâ kapanmış durumda; yeniden deneyerek daha iyi bir müdahale planı kurabilirsin.',
      tone: 'failure',
    } as const;
  }
  if (outcome.stars === 3) {
    return {
      title: 'ŞEHRİN YARINI SENİNLE DEĞİŞTİ!',
      subtitle: 'Harika! Şehrin yarınını korumayı başardın.',
      detail: 'Hastane erişimi korunuyor, su seviyesi toparlanıyor ve şehir yeniden nefes alıyor.',
      tone: 'three-star',
    } as const;
  }
  if (outcome.stars === 2) {
    return {
      title: 'ŞEHİR YENİDEN NEFES ALIYOR',
      subtitle: 'Doğru adımlar attın; iyileşme başladı.',
      detail: 'Hastane erişimi açık, ancak bazı taşkın izleri ve kırılgan noktalar hâlâ görünür.',
      tone: 'success',
    } as const;
  }
  return {
    title: 'ŞEHİR TOPARLANMAYA BAŞLADI',
    subtitle: 'Zorlu bir mücadeleydi.',
    detail: 'Hastane erişimi geri geldi; ekipler kalan hasarı gidermek için çalışıyor.',
    tone: 'partial',
  } as const;
}

interface Obstacle {
  x: number;
  y: number;
  w: number;
  h: number;
  label?: string;
}

interface InteractionPoint {
  id: string;
  x: number;
  y: number;
  radius: number;
  label: string;
  actionText: string;
  type:
    | 'npc_mira'
    | 'npc_aras'
    | 'drainage'
    | 'flood_observation'
    | 'sponge_site'
    | 'retrofit_site'
    | 'warning_site'
    | 'seawall_site'
    | 'road_inspection'
    | 'eko_terminal'
    | 'hospital';
  defenseId?: DefenseId;
}

const HOLD_INTERACTION_DURATION_MS = 900;

// Default lower-case conversion turns Turkish capital İ into "i̇" (i plus a
// combining dot). Asset filenames are ASCII, so map dialogue speakers
// explicitly instead of deriving paths from locale-sensitive text.
function getSpeakerAssetKey(speaker: string) {
  return {
    'MİRA': 'mira',
    'ARAS': 'aras',
    'EKO': 'eko',
    'DENİZ': 'deniz',
    'BARIŞ': 'baris',
  }[speaker] ?? speaker.toLowerCase();
}

function requiresHoldToInteract(point: InteractionPoint | null) {
  if (!point) return false;
  return point.type === 'drainage'
    || point.type === 'sponge_site'
    || point.type === 'retrofit_site'
    || point.type === 'warning_site'
    || point.type === 'seawall_site';
}

const DEFENSE_GUIDANCE: Record<DefenseId, {
  effect: string;
  effective: string;
  limit: string;
}> = {
  'uyarı': {
    effect: 'Siren ve sensörlerle mahalle ekiplerine zaman kazandırır.',
    effective: 'Şehir geneli güvenlik ve tahliye hazırlığı.',
    limit: 'Su derinliğini veya fiziksel hasarı tek başına azaltmaz.',
  },
  'sünger': {
    effect: 'Yağmur bahçesi ve geçirgen zeminle yüzey akışını tutar.',
    effective: 'Yamaç havzası ve hastane yolunun su yükü.',
    limit: 'Kapasitesi sınırlıdır; aşırı yağışta dolabilir ve etkisi kademeli oluşur.',
  },
  'set': {
    effect: 'Kıyı hattında denizden gelen ters akışı ve dalga taşmasını keser.',
    effective: 'Liman ve kıyı mahallesi.',
    limit: 'Yamaçtan gelen hastane yolu taşkınını doğrudan çözmez.',
  },
  'dönüşüm': {
    effect: 'Kritik yapıları ve tahliye rotalarını güçlendirir.',
    effective: 'Hastane yolu ve riskli yapı bağlantıları.',
    limit: 'Sünger Kent kadar yüzey suyunu tutmaz; bütçesi daha yüksektir.',
  },
};

export type QuestStepId = 1 | 2 | 3 | 4 | 5 | 6 | 7;

interface QuestStepInfo {
  step: QuestStepId;
  kicker: string;
  title: string;
  description: string;
  targetX: number;
  targetY: number;
  targetLabel: string;
}

const QUEST_STEPS: Record<QuestStepId, QuestStepInfo> = {
  1: {
    step: 1,
    kicker: 'GÖREV 1/7',
    title: "Mira'yı Bul",
    description: "İklim Araştırma İstasyonu'ndaki Mira ile görüş ve yaklaşan 88 mm/saat fırtına öncesi saha görevini al.",
    targetX: 520,
    targetY: 470,
    targetLabel: 'MİRA / ARAŞTIRMA İSTASYONU',
  },
  2: {
    step: 2,
    kicker: 'GÖREV 2/7',
    title: 'Menfezi İncele',
    description: 'Hastane yolu drenaj menfezine git ve mevcut ızgara kapasitesini denetle.',
    targetX: 1290,
    targetY: 510,
    targetLabel: 'DRENAJ MENFEZİ',
  },
  3: {
    step: 3,
    kicker: 'GÖREV 3/7',
    title: 'Aras ile Konuş',
    description: 'Şantiye yol ayrımındaki Saha Mühendisi Aras ile görüş ve fırtına mühendislik planını al.',
    targetX: 1210,
    targetY: 430,
    targetLabel: 'MÜHENDİS ARAS',
  },
  4: {
    step: 4,
    kicker: 'GÖREV 4/7',
    title: 'Fırtınayı Gözlemle',
    description: 'Yol taşkın gözlem noktasına geç ve 88 mm/h süper hücrenin yol çukurundaki etkisini izle.',
    targetX: 1220,
    targetY: 540,
    targetLabel: 'YOL TAŞKIN GÖZLEMİ',
  },
  5: {
    step: 5,
    kicker: 'GÖREV 5/7',
    title: 'Savunma Planını Oluştur',
    description: 'Şehir Planı’nı aç, araştırdığın çözümleri karşılaştır ve bütçene uygun stratejiyi onayla.',
    targetX: 1160,
    targetY: 340,
    targetLabel: 'ŞEHİR PLANI / ÇÖZÜM SAHALARI',
  },
  6: {
    step: 6,
    kicker: 'GÖREV 6/7',
    title: 'Sonucu Kontrol Et',
    description: 'Hastane yoluna inerek suyun çekilişini ve ambulans koridorunun açıldığını doğrula.',
    targetX: 1240,
    targetY: 500,
    targetLabel: 'HASTANE YOLU DENETİMİ',
  },
  7: {
    step: 7,
    kicker: 'GÖREV 7/7',
    title: "Mira'ya Geri Dön",
    description: "İklim Araştırma İstasyonu'ndaki Mira'ya dönerek hastane erişiminin başarıyla kurtarıldığını bildir.",
    targetX: 520,
    targetY: 470,
    targetLabel: 'MİRA / ARAŞTIRMA İSTASYONU',
  },
};

export function ExplorableWorld({
  onBackToMenu,
  muted,
  onToggleMute,
}: ExplorableWorldProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const getWorldCanvasSize = () => {
    const hudHeight = window.matchMedia('(max-width: 768px)').matches ? 60 : 88;
    return {
      width: window.innerWidth,
      height: Math.max(320, window.innerHeight - hudHeight),
    };
  };

  // Ekran Boyutu (Responsive Resize)
  const [canvasSize, setCanvasSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1280,
    height: typeof window !== 'undefined' ? Math.max(320, window.innerHeight - (window.matchMedia('(max-width: 768px)').matches ? 60 : 88)) : 632,
  });

  useEffect(() => {
    const handleResize = () => {
      setCanvasSize(getWorldCanvasSize());
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Seçilebilir Kahraman State'i (Deniz: Kadın, Barış: Erkek - Hiçbiri Mira Değil)
  const [heroType, setHeroType] = useState<HeroId>(() => {
    try {
      const savedHero = localStorage.getItem('felaket_benim_hero');
      if (savedHero === 'female' || savedHero === 'male') return savedHero;
    } catch (_) {}
    return 'female';
  });
  const [showHeroModal, setShowHeroModal] = useState(false);
  const [showCompass, setShowCompass] = useState(() => {
    try {
      return localStorage.getItem('felaket_benim_compass_visible') !== 'false';
    } catch (_) {
      return true;
    }
  });
  const [chapterWon, setChapterWon] = useState(false);
  const [chapterOutcome, setChapterOutcome] = useState<ChapterOutcome | null>(null);
  const [endingVisible, setEndingVisible] = useState(false);
  const [endingNewBadges, setEndingNewBadges] = useState<AchievementId[]>([]);
  const [gameMode, setGameMode] = useState<GameMode>(() => {
    try {
      return localStorage.getItem('sehrin_yarini_mode') === 'adventure' ? 'adventure' : 'relaxed';
    } catch (_) {
      return 'relaxed';
    }
  });
  const [stormElapsedSeconds, setStormElapsedSeconds] = useState(0);
  const [rescueCount, setRescueCount] = useState(0);
  const [inspectedLocations, setInspectedLocations] = useState(0);
  const [hadRoadClosure, setHadRoadClosure] = useState(false);
  const [chapterRecord, setChapterRecord] = useState<ChapterRecord | null>(null);
  const [achievements, setAchievements] = useState<Partial<Record<AchievementId, AchievementRecord>>>({});
  const [achievementNotice, setAchievementNotice] = useState<AchievementId | null>(null);
  const [currentDistrictId, setCurrentDistrictId] = useState<DistrictId>(() => getCityDistrictAt(INITIAL_PLAYER_POSITION.x, INITIAL_PLAYER_POSITION.y).id);
  const [discoveredDistricts, setDiscoveredDistricts] = useState<Set<DistrictId>>(
    () => new Set([getCityDistrictAt(INITIAL_PLAYER_POSITION.x, INITIAL_PLAYER_POSITION.y).id]),
  );
  const [isPaused, setIsPaused] = useState(false);

  // Oyuncu Karakteri (Seçilen Kahraman)
  const [player, setPlayer] = useState<PlayerMotionState>({
    ...INITIAL_PLAYER_POSITION,
    vx: 0,
    vy: 0,
    facing: 'up' as 'down' | 'up' | 'left' | 'right',
    isMoving: false,
    frame: 0,
  });

  const [activeDefenses, setActiveDefenses] = useState<DefenseId[]>([]);
  const [budgetUsed, setBudgetUsed] = useState(0);
  const [discoveredSolutions, setDiscoveredSolutions] = useState<DefenseId[]>([]);
  const [investigatedSolutions, setInvestigatedSolutions] = useState<DefenseId[]>([]);
  const [planningOpen, setPlanningOpen] = useState(false);
  const [pendingPlan, setPendingPlan] = useState<DefenseId[]>([]);
  const [planConfirmed, setPlanConfirmed] = useState(false);
  const [nearbyInteraction, setNearbyInteraction] = useState<InteractionPoint | null>(null);
  const [interactionHold, setInteractionHold] = useState<{ pointId: string; progress: number } | null>(null);
  const interactionHoldRef = useRef<{ pointId: string; startedAt: number; timer: number } | null>(null);

  // Yaşayan Şehir Sakinleri (Ambient Citizens)
  const [citizens] = useState<AmbientCitizen[]>(() => createInitialAmbientCitizens());
  const citizensRef = useRef<AmbientCitizen[]>(citizens);
  citizensRef.current = citizens;
  const [nearbyCitizen, setNearbyCitizen] = useState<AmbientCitizen | null>(null);

  // 7 Aşamalı Rehberli Görev Sistemi
  const [questStep, setQuestStep] = useState<QuestStepId>(1);
  const currentQuest = QUEST_STEPS[questStep];
  const [showFirstMissionGuide, setShowFirstMissionGuide] = useState(() => {
    try {
      return localStorage.getItem('sehrin_yarini_first_mission_guide_seen') !== 'true';
    } catch (_) {
      return true;
    }
  });
  const [questDetailsExpanded, setQuestDetailsExpanded] = useState(false);
  const [showMinimap, setShowMinimap] = useState(true);

  // EKO Akıllı Rehber & Bildirim State'leri
  const [showEkoHint, setShowEkoHint] = useState(false);
  const [questToast, setQuestToast] = useState<{ kicker: string; text: string } | null>(null);

  const [activeDialog, setActiveDialog] = useState<{
    speaker: 'MİRA' | 'ARAS' | 'EKO' | 'DENİZ' | 'BARIŞ';
    title: string;
    text: string;
    actionLabel?: string;
    onAction?: () => void;
  } | null>(null);

  const playerRef = useRef<PlayerMotionState>(player);
  playerRef.current = player;
  const activeDialogRef = useRef(activeDialog);
  activeDialogRef.current = activeDialog;
  const nearbyInteractionRef = useRef(nearbyInteraction);
  nearbyInteractionRef.current = nearbyInteraction;
  const showHeroModalRef = useRef(showHeroModal);
  showHeroModalRef.current = showHeroModal;
  const chapterWonRef = useRef(chapterWon);
  chapterWonRef.current = chapterWon;
  const chapterOutcomeRef = useRef(chapterOutcome);
  chapterOutcomeRef.current = chapterOutcome;
  const endingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const starRevealKeyRef = useRef<string | null>(null);
  const isPausedRef = useRef(isPaused);
  isPausedRef.current = isPaused;
  const lastSafePlayerRef = useRef({ ...INITIAL_PLAYER_POSITION });
  const stalledFloodSecondsRef = useRef(0);
  const terrainBlockedFeedbackRef = useRef(0);
  const hadRoadClosureRef = useRef(hadRoadClosure);
  hadRoadClosureRef.current = hadRoadClosure;

  useEffect(() => () => {
    if (endingTimerRef.current) clearTimeout(endingTimerRef.current);
  }, []);

  useEffect(() => {
    if (!chapterOutcome || endingVisible) return;
    const key = `${chapterOutcome.success ? 'success' : 'failure'}-${chapterOutcome.stars}`;
    if (starRevealKeyRef.current === key) return;
    starRevealKeyRef.current = key;
    const timers = [0, 1, 2].map((index) => setTimeout(() => {
      if (index < chapterOutcome.stars) gameAudio.effect('star');
    }, index * 120));
    return () => timers.forEach((timer) => clearTimeout(timer));
  }, [chapterOutcome, endingVisible]);

  const [stormActive, setStormActive] = useState(false);
  const [weather, setWeather] = useState<WeatherState>(() => createWeatherState(false));
  const [spatialState, setSpatialState] = useState<SpatialSimulationState>(() =>
    createInitialSpatialState([])
  );

  // Radar Canvas Referansı
  const radarCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Mobil Dokunmatik Joystick
  const [touchMovement, setTouchMovement] = useState({ dx: 0, dy: 0, active: false });
  const joystickBaseRef = useRef<{ startX: number; startY: number } | null>(null);

  // Dünya Sabitleri
  const SAVE_KEY = 'felaket_benim_quest_save_v2';

  // Fiziksel Katı Engeller (Çarpışma Tespiti & Navigasyon Grafı)
  const obstacles = useMemo<ObstacleBox[]>(() => [
    { x: 1360, y: 240, w: 240, h: 180, label: 'ŞEHİR HASTANESİ' },
    { x: 1050, y: 180, w: 120, h: 88, label: 'TERAS KONUTLARI' },
    { x: 1640, y: 220, w: 120, h: 88, label: 'BÖLGE KLİNİĞİ' },
    { x: 620, y: 440, w: 70, h: 130, label: 'SAAT KULESİ' },
    { x: 440, y: 320, w: 140, h: 100, label: 'TARİHİ ÇARŞI' },
    { x: 440, y: 530, w: 150, h: 110, label: 'BELEDİYE MÜZESİ' },
    { x: 330, y: 400, w: 120, h: 90, label: 'İKLİM ARAŞTIRMA İSTASYONU' },
    { x: 1520, y: 880, w: 180, h: 130, label: 'SANAYİ DEPOLARI' },
    { x: 1760, y: 920, w: 140, h: 110, label: 'TRAFO MERKEZİ' },
    { x: 260, y: 880, w: 160, h: 140, label: 'LİMAN HANGARI' },
  ], []);

  // Mahalle Ağaçları
  const trees = useMemo(() => [
    { x: 990, y: 240, r: 24 },
    { x: 1220, y: 200, r: 22 },
    { x: 1620, y: 190, r: 20 },
    { x: 1320, y: 430, r: 18 },
    { x: 1120, y: 530, r: 22 },
    { x: 960, y: 640, r: 26 },
    { x: 1580, y: 480, r: 24 },
    { x: 1480, y: 190, r: 20 },
  ], []);

  const touchMovementRef = useRef(touchMovement);
  touchMovementRef.current = touchMovement;

  // Sokak Lambaları
  const streetLamps = useMemo(() => [
    { x: 1260, y: 480 },
    { x: 1390, y: 410 },
    { x: 1060, y: 670 },
    { x: 780, y: 710 },
  ], []);

  const discoverSolution = useCallback((id: DefenseId, source: string) => {
    const solution = getSolution(id);
    const wasKnown = discoveredSolutionsRef.current.includes(id);
    if (!wasKnown) {
      const next = [...discoveredSolutionsRef.current, id];
      discoveredSolutionsRef.current = next;
      setDiscoveredSolutions(next);
      setQuestToast({
        kicker: 'İKLİM ÇÖZÜMÜ KEŞFEDİLDİ',
        text: `${solution.name} · ${getDiscoveryProgress(next)} · ${source}`,
      });
      window.setTimeout(() => setQuestToast((current) => (
        current?.kicker === 'İKLİM ÇÖZÜMÜ KEŞFEDİLDİ' ? null : current
      )), 3600);
      gameAudio.effect('transition');
    }
  }, []);

  const investigateSolution = useCallback((id: DefenseId, source: string) => {
    discoverSolution(id, source);
    if (!investigatedSolutionsRef.current.includes(id)) {
      const nextInvestigated = [...investigatedSolutionsRef.current, id];
      investigatedSolutionsRef.current = nextInvestigated;
      setInvestigatedSolutions(nextInvestigated);
    }
  }, [discoverSolution]);

  // Görev İlerleme ve Toast Tetikleyicisi
  const triggerQuestAdvance = useCallback((nextStep: QuestStepId, toastText: string) => {
    setQuestStep(nextStep);
    setQuestToast({ kicker: `GÖREV ${nextStep}/7 AKTİF`, text: toastText });
    gameAudio.effect('investment');
    const timer = setTimeout(() => {
      setQuestToast(null);
    }, 3800);
    return () => clearTimeout(timer);
  }, []);

  const dismissFirstMissionGuide = useCallback(() => {
    setShowFirstMissionGuide(false);
    try {
      localStorage.setItem('sehrin_yarini_first_mission_guide_seen', 'true');
    } catch (_) {}
  }, []);

  // LocalStorage Kayıt Yükleme
  useEffect(() => {
    try {
      const saved = localStorage.getItem(SAVE_KEY);
      if (saved) {
        const data = migrateQuestSave(JSON.parse(saved)) as Record<string, any> | null;
        if (!data) return;
        if (data.questStep && data.questStep >= 1 && data.questStep <= 7) {
          setQuestStep(data.questStep as QuestStepId);
        }
        if (data.heroType === 'female' || data.heroType === 'male') {
          setHeroType(data.heroType);
        }
        if (data.compassVisible === false) {
          setShowCompass(false);
        }
        if (data.player && typeof data.player.x === 'number' && typeof data.player.y === 'number') {
          const savedPosition = { x: data.player.x, y: data.player.y };
          if (canPlayerOccupy(savedPosition, obstacles, trees, WORLD_WIDTH, WORLD_HEIGHT, 0, WORLD_TERRAIN_MASK)) {
            setPlayer((prev) => ({
              ...prev,
              ...savedPosition,
              facing: data.player.facing || 'down',
            }));
          } else {
            console.warn('Saved player position was inside a solid area; using a safe spawn point.');
          }
        }
        if (Array.isArray(data.activeDefenses) && data.activeDefenses.length > 0) {
          setActiveDefenses(data.activeDefenses);
          setBudgetUsed(data.budgetUsed || 0);
          setSpatialState(
            stepSpatialSimulation(createInitialSpatialState(data.activeDefenses), data.activeDefenses)
          );
        }
        if (Array.isArray(data.discoveredSolutions)) {
          setDiscoveredSolutions(data.discoveredSolutions.filter((id: unknown): id is DefenseId =>
            DEFENSES.some((defense) => defense.id === id)
          ));
        } else if (Array.isArray(data.activeDefenses)) {
          // Compatible v1–v3 saves keep built solutions visible in the journal.
          setDiscoveredSolutions(data.activeDefenses.filter((id: unknown): id is DefenseId =>
            DEFENSES.some((defense) => defense.id === id)
          ));
        }
        if (Array.isArray(data.investigatedSolutions)) {
          setInvestigatedSolutions(data.investigatedSolutions.filter((id: unknown): id is DefenseId =>
            DEFENSES.some((defense) => defense.id === id)
          ));
        }
        if (Array.isArray(data.pendingPlan)) {
          setPendingPlan(data.pendingPlan.filter((id: unknown): id is DefenseId =>
            DEFENSES.some((defense) => defense.id === id)
          ));
        }
        if (typeof data.planConfirmed === 'boolean') setPlanConfirmed(data.planConfirmed);
        if (data.spatialState && typeof data.spatialState === 'object' && data.spatialState.cells) {
          setSpatialState(data.spatialState as SpatialSimulationState);
        }
        if (data.stormActive) {
          setStormActive(true);
          setWeather(startStormWeather());
        }
        if (data.chapterWon) {
          setChapterWon(true);
        }
        if (data.chapterOutcome) setChapterOutcome(data.chapterOutcome);
        if (data.gameMode === 'relaxed' || data.gameMode === 'adventure') setGameMode(data.gameMode);
        if (typeof data.stormElapsedSeconds === 'number') setStormElapsedSeconds(data.stormElapsedSeconds);
        if (typeof data.rescueCount === 'number') setRescueCount(data.rescueCount);
        if (typeof data.inspectedLocations === 'number') setInspectedLocations(data.inspectedLocations);
        if (typeof data.hadRoadClosure === 'boolean') setHadRoadClosure(data.hadRoadClosure);
        if (data.chapterRecord) setChapterRecord(data.chapterRecord);
        if (data.achievements) setAchievements(data.achievements);
        if (Array.isArray(data.discoveredDistricts)) {
          setDiscoveredDistricts(new Set(data.discoveredDistricts.filter((id: unknown): id is DistrictId =>
            CITY_DISTRICTS.some((district) => district.id === id)
          )));
        }
      }
    } catch (e) {
      console.warn('LocalStorage restore failed:', e);
    }
  }, [obstacles, trees]);

  // LocalStorage Otomatik Kaydetme
  useEffect(() => {
    try {
      const payload = {
        saveVersion: 4,
        questStep,
        heroType,
        player: { x: player.x, y: player.y, facing: player.facing },
        activeDefenses,
        budgetUsed,
        discoveredSolutions,
        investigatedSolutions,
        pendingPlan,
        planConfirmed,
        spatialState,
        stormActive,
        weatherPhase: weather.phase,
        gameMode,
        stormElapsedSeconds,
        rescueCount,
        inspectedLocations,
        hadRoadClosure,
        chapterRecord,
        achievements,
        currentDistrictId,
        discoveredDistricts: [...discoveredDistricts],
        chapterOutcome,
        chapterWon,
        compassVisible: showCompass,
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
      localStorage.setItem('sehrin_yarini_achievements', JSON.stringify(achievements));
      localStorage.setItem('sehrin_yarini_mode', gameMode);
      localStorage.setItem('felaket_benim_hero', heroType);
      localStorage.setItem('felaket_benim_compass_visible', String(showCompass));
    } catch (_) {}
  }, [questStep, heroType, player.x, player.y, player.facing, activeDefenses, budgetUsed, discoveredSolutions, investigatedSolutions, pendingPlan, planConfirmed, spatialState, stormActive, weather.phase, gameMode, stormElapsedSeconds, rescueCount, inspectedLocations, hadRoadClosure, chapterRecord, achievements, currentDistrictId, discoveredDistricts, chapterOutcome, chapterWon, showCompass]);

  useEffect(() => {
    if (discoveredDistricts.size !== CITY_DISTRICTS.length || achievements.city_explorer) return;
    const record: AchievementRecord = { unlockedAt: new Date().toISOString() };
    setAchievements((previous) => previous.city_explorer ? previous : { ...previous, city_explorer: record });
    setAchievementNotice('city_explorer');
    gameAudio.effect('victory');
  }, [achievements.city_explorer, discoveredDistricts]);

  // Görevi Baştan Başlatma (Reset)
  const handleResetQuest = useCallback(() => {
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch (_) {}
    setQuestStep(1);
    setPlayer({
      ...INITIAL_PLAYER_POSITION,
      vx: 0,
      vy: 0,
      facing: 'up',
      isMoving: false,
      frame: 0,
    });
    setCurrentDistrictId(getCityDistrictAt(INITIAL_PLAYER_POSITION.x, INITIAL_PLAYER_POSITION.y).id);
    setActiveDefenses([]);
    setBudgetUsed(0);
    setStormActive(false);
    setWeather(createWeatherState(false));
    setChapterOutcome(null);
    setIsPaused(false);
    setStormElapsedSeconds(0);
    setRescueCount(0);
    setInspectedLocations(0);
    setHadRoadClosure(false);
    stalledFloodSecondsRef.current = 0;
    setChapterWon(false);
    setSpatialState(createInitialSpatialState([]));
    setShowEkoHint(false);
    if (endingTimerRef.current) clearTimeout(endingTimerRef.current);
    endingTimerRef.current = null;
    setEndingVisible(false);
    setEndingNewBadges([]);
    setAchievementNotice(null);
    setQuestToast({ kicker: 'GÖREV SIFIRLANDI', text: 'Bölüm 1: İklim Araştırma İstasyonu baştan başlatıldı.' });
    setTimeout(() => setQuestToast(null), 3000);
    gameAudio.effect('click');
  }, []);

  // Aktif Görev Hedefi ve Mesafe Hesaplaması
  const targetPoint = useMemo<Point2D>(() => ({
    x: currentQuest.targetX,
    y: currentQuest.targetY,
  }), [currentQuest]);

  const distanceMeters = useMemo(() => {
    return calculateDistanceMeters({ x: player.x, y: player.y }, targetPoint);
  }, [player.x, player.y, targetPoint]);

  // EKO Kural Tabanlı İpucu Motoru
  const ekoHint = useMemo(() => {
    return getEkoContextualHint({
      questStep,
      playerPos: { x: player.x, y: player.y },
      targetPos: targetPoint,
      roadWaterDepth: spatialState.hospitalRoadWaterDepth,
      roadPassable: spatialState.hospitalRoadPassable,
      hasSpongeDefense: activeDefenses.includes('sünger'),
      budgetRemaining: BUDGET - budgetUsed,
      distanceMeters,
    });
  }, [
    questStep,
    player.x,
    player.y,
    targetPoint,
    spatialState.hospitalRoadWaterDepth,
    spatialState.hospitalRoadPassable,
    activeDefenses,
    budgetUsed,
    distanceMeters,
  ]);

  // İnteraktif Noktalar (Gerçek Dünya Objeleri)
  const interactionPoints = useMemo<InteractionPoint[]>(() => [
    {
      id: 'npc_mira',
      x: 520,
      y: 470,
      radius: 65,
      label: 'MİRA / ARAŞTIRMA İSTASYONU',
      actionText: questStep === 1 ? 'Mira ile Konuş (Görevi Al)' : questStep === 7 ? 'Mira\'ya Rapor Ver (Bölümü Bitir)' : 'Mira ile Konuş',
      type: 'npc_mira',
    },
    {
      id: 'drainage_culvert',
      x: 1290,
      y: 510,
      radius: 65,
      label: 'DRENAJ MENFEZİ',
      actionText: 'Menfezi İncele',
      type: 'drainage',
    },
    {
      id: 'npc_aras',
      x: 1210,
      y: 430,
      radius: 65,
      label: 'MÜHENDİS ARAS',
      actionText: 'Aras ile Konuş',
      type: 'npc_aras',
    },
    {
      id: 'flood_observation',
      x: 1220,
      y: 540,
      radius: 65,
      label: 'YOL TAŞKIN GÖZLEM NOKTASI',
      actionText: 'Fırtınayı ve Su Seviyesini Gözlemle',
      type: 'flood_observation',
    },
    {
      id: 'sponge_construction',
      x: 1160,
      y: 340,
      radius: 65,
      label: 'SÜNGER KENT SAHASI',
      actionText: activeDefenses.includes('sünger')
        ? 'Sünger Parkı Kaldır'
        : 'Sünger Kent Göleti İnşa Et (28 Kredi)',
      type: 'sponge_site',
      defenseId: 'sünger',
    },
    {
      id: 'warning_station',
      x: 900,
      y: 340,
      radius: 58,
      label: 'ERKEN UYARI AĞI',
      actionText: activeDefenses.includes('uyarı') ? 'Erken Uyarı Ağını Kaldır' : 'Erken Uyarı Ağı Kur (18 Kredi)',
      type: 'warning_site',
      defenseId: 'uyarı',
    },
    {
      id: 'retrofit_construction',
      x: 1340,
      y: 530,
      radius: 62,
      label: 'GÜVENLİ DÖNÜŞÜM SAHASI',
      actionText: activeDefenses.includes('dönüşüm') ? 'Güvenli Dönüşümü Kaldır' : 'Güvenli Dönüşüm Kur (36 Kredi)',
      type: 'retrofit_site',
      defenseId: 'dönüşüm',
    },
    {
      id: 'seawall_construction',
      x: 1800,
      y: 620,
      radius: 62,
      label: 'KIYI SETİ HATTI',
      actionText: activeDefenses.includes('set') ? 'Kıyı Setini Kaldır' : 'Kıyı Seti Kur (42 Kredi)',
      type: 'seawall_site',
      defenseId: 'set',
    },
    {
      id: 'road_inspection',
      x: 1240,
      y: 500,
      radius: 65,
      label: 'HASTANE YOLU DENETİMİ',
      actionText: 'Yol Durumunu Doğrula',
      type: 'road_inspection',
    },
    {
      id: 'hospital_entrance',
      x: 1470,
      y: 450,
      radius: 75,
      label: 'ACİL SERVİS GİRİŞİ',
      actionText: 'Hastaneyi İncele',
      type: 'hospital',
    },
    {
      id: 'eko_terminal',
      x: 740,
      y: 490,
      radius: 60,
      label: 'EKO SİMÜLASYON KONSOLU',
      actionText: 'EKO Terminaline Eriş',
      type: 'eko_terminal',
    },
  ], [activeDefenses, questStep]);

  const interactionPointsRef = useRef(interactionPoints);
  interactionPointsRef.current = interactionPoints;
  const targetPointRef = useRef(targetPoint);
  targetPointRef.current = targetPoint;
  const spatialStateRef = useRef(spatialState);
  spatialStateRef.current = spatialState;
  const activeDefensesRef = useRef(activeDefenses);
  activeDefensesRef.current = activeDefenses;
  const discoveredSolutionsRef = useRef(discoveredSolutions);
  discoveredSolutionsRef.current = discoveredSolutions;
  const investigatedSolutionsRef = useRef(investigatedSolutions);
  investigatedSolutionsRef.current = investigatedSolutions;
  const stormActiveRef = useRef(stormActive);
  stormActiveRef.current = stormActive;
  const weatherRef = useRef(weather);
  weatherRef.current = weather;
  const gameModeRef = useRef(gameMode);
  gameModeRef.current = gameMode;
  const questStepRef = useRef(questStep);
  questStepRef.current = questStep;
  const currentQuestRef = useRef(currentQuest);
  currentQuestRef.current = currentQuest;
  const heroTypeRef = useRef(heroType);
  heroTypeRef.current = heroType;
  const currentDistrictRef = useRef(currentDistrictId);
  currentDistrictRef.current = currentDistrictId;

  const openPlanningJournal = useCallback(() => {
    setPendingPlan(activeDefensesRef.current);
    setPlanningOpen(true);
    setActiveDialog(null);
  }, []);

  const compassBearing = useMemo(
    () => calculateCompassBearing({ x: player.x, y: player.y }, targetPoint),
    [player.x, player.y, targetPoint],
  );
  const targetReached = Math.hypot(player.x - targetPoint.x, player.y - targetPoint.y) <= 65;
  const currentDistrict = CITY_DISTRICTS.find((district) => district.id === currentDistrictId) ?? CITY_DISTRICTS[1];
  const routeReachable = useMemo(() => {
    const route = findNavRoute(
      { x: player.x, y: player.y },
      targetPoint,
      obstacles,
      spatialState.hospitalRoadWaterDepth,
    );
    return isNavRouteTraversable(route, obstacles, spatialState.hospitalRoadWaterDepth);
  }, [player.x, player.y, targetPoint, obstacles, spatialState.hospitalRoadWaterDepth]);
  const navigationWarning =
    !targetReached && !routeReachable
      ? spatialState.hospitalRoadWaterDepth > 30
        ? 'Bu yol su altında. Güvenli bir geçiş aramalısın.'
        : 'EKO: Hedefe doğrudan geçiş kapalı.'
      : null;

  const beginEnding = useCallback((outcome: ChapterOutcome) => {
    if (endingTimerRef.current) clearTimeout(endingTimerRef.current);
    starRevealKeyRef.current = null;
    setChapterOutcome(outcome);
    setChapterWon(outcome.success);
    setEndingVisible(true);
    gameAudio.effect(outcome.success ? 'ending-victory' : 'ending-failure');
    endingTimerRef.current = setTimeout(() => {
      setEndingVisible(false);
      endingTimerRef.current = null;
    }, 1900);
  }, []);

  const skipEnding = useCallback(() => {
    if (endingTimerRef.current) clearTimeout(endingTimerRef.current);
    endingTimerRef.current = null;
    setEndingVisible(false);
  }, []);

  const completeChapter = useCallback(() => {
    if (chapterOutcomeRef.current) return;
    const citizensSafe = spatialStateRef.current.hospitalRoadPassable
      && (activeDefenses.includes('sünger') || activeDefenses.includes('dönüşüm'));
    const outcomeInput = {
      missionComplete: true,
      hospitalRoadPassable: spatialStateRef.current.hospitalRoadPassable,
      citizensSafe,
      rescueCount,
      temporaryRoadClosure: hadRoadClosureRef.current,
      elapsedSeconds: stormElapsedSeconds,
      budgetRemaining: BUDGET - budgetUsed,
      mode: gameMode,
    } as const;
    const outcome = evaluateChapterOutcome(outcomeInput);
    beginEnding(outcome);
    setChapterRecord((previous) => mergeChapterRecord(previous ?? undefined, outcome, outcomeInput));

    const unlocks = getAchievementUnlocks({
      firstInteraction: questStep >= 2,
      inspectedLocations,
      adaptationBuilt: activeDefenses.includes('sünger') || activeDefenses.includes('dönüşüm'),
      floodReduced: spatialStateRef.current.hospitalRoadWaterDepth < 30,
      hospitalHero: outcome.success,
      citizensSafe,
      stars: outcome.stars,
    });
    setAchievements((previous) => {
      const next = { ...previous };
      const newlyUnlocked = unlocks.filter((id) => !next[id]);
      if (newlyUnlocked.length > 0) {
        const unlockedAt = new Date().toISOString();
        newlyUnlocked.forEach((id) => { next[id] = { unlockedAt }; });
        setEndingNewBadges(newlyUnlocked);
        setAchievementNotice(newlyUnlocked[0]);
        gameAudio.effect('achievement');
      }
      return next;
    });
    gameAudio.effect(outcome.success ? 'victory' : 'error');
  }, [activeDefenses, beginEnding, budgetUsed, gameMode, inspectedLocations, questStep, rescueCount, stormElapsedSeconds]);

  const failChapter = useCallback((reason = 'Bu kez yetişemedik. Ama yeniden deneyebilirsin!') => {
    if (chapterOutcomeRef.current) return;
    const input = {
      missionComplete: false,
      hospitalRoadPassable: spatialStateRef.current.hospitalRoadPassable,
      citizensSafe: false,
      rescueCount,
      temporaryRoadClosure: true,
      elapsedSeconds: stormElapsedSeconds,
      budgetRemaining: BUDGET - budgetUsed,
      mode: gameMode,
    } as const;
    beginEnding({ ...evaluateChapterOutcome(input), reason });
  }, [beginEnding, budgetUsed, gameMode, rescueCount, stormElapsedSeconds]);

  // Savunma İnşa Etme / Kaldırma İşlevi
  const toggleWorldDefense = useCallback((id: DefenseId) => {
    const defense = DEFENSES.find((d) => d.id === id)!;
    if (!activeDefenses.includes(id)) {
      investigateSolution(id, 'Saha noktası incelendi');
      if (budgetUsed + defense.cost > BUDGET) {
        gameAudio.effect('error');
        setActiveDialog({
          speaker: 'ARAS',
          title: 'YETERSİZ BÜTÇE',
          text: `Bu yatırım için ${defense.cost} kredi gerekiyor; kalan kredimiz ${BUDGET - budgetUsed}. Başka bir yatırımı kaldırarak kaynak yaratabilirsin.`,
        });
        return;
      }
      gameAudio.effect('investment');
      const nextDefenses = [...activeDefenses, id];
      const beforeDepth = spatialStateRef.current.hospitalRoadWaterDepth;
      const nextSpatialState = stepSpatialSimulation(spatialStateRef.current, nextDefenses);
      // Fırtına başlamadan kurulan savunma, oyuncu etkileşiminden sonra hazır
      // kabul edilir. Böylece hazırlık yatırımı gerçekten fırtına öncesi
      // tamamlanabilir; fırtına sırasında kurulan savunma ise simülasyondaki
      // üç adımlık devreye alma gecikmesini korur.
      const installedState = id === 'sünger' && !stormActive
        ? { ...nextSpatialState, spongeOperational: true, spongeDeploymentTicksRemaining: 0 }
        : nextSpatialState;
      setActiveDefenses(nextDefenses);
      setBudgetUsed((prev) => prev + defense.cost);
      setSpatialState(installedState);
      setPendingPlan(nextDefenses);
      setPlanConfirmed(true);

      if (id === 'sünger') {
        setQuestToast({
          kicker: 'SÜNGER KENT DEVREDE',
          text: `${stormActive ? 'Tutma alanı kuruluyor.' : 'Tutma alanı fırtına öncesi hazırlandı.'} ${DEFENSE_GUIDANCE[id].effect} İlk kapasite: ${installedState.spongeStorage.toFixed(1)} / ${installedState.spongeStorageCapacity} cm.`,
        });
        setTimeout(() => {
          const current = spatialStateRef.current;
          const delta = current.hospitalRoadWaterDepth - beforeDepth;
          const feedback = delta < -0.2
            ? `Harika! Su derinliği ${Math.abs(delta).toFixed(1)} cm azaldı; yüzey akışı tutma alanına yönleniyor.`
            : current.spongeStorage >= current.spongeStorageCapacity - 0.1
              ? 'Su tutma alanı dolu; yağış kapasiteyi aşıyor. Hastane yolu hâlâ risk altında.'
              : `Sünger Kent çalışıyor; yol suyu ${current.hospitalRoadWaterDepth.toFixed(1)} cm. Toparlanma sürüyor.`;
          setQuestToast({ kicker: 'EKO / GERÇEK ZAMANLI ÖLÇÜM', text: feedback });
          setTimeout(() => setQuestToast(null), 4200);
        }, 1100);
      } else {
        const roadDelta = beforeDepth - installedState.hospitalRoadWaterDepth;
        setQuestToast({
          kicker: `${defense.name.toUpperCase()} KURULDU`,
          text: `${DEFENSE_GUIDANCE[id].effect} Hastane yolu ölçümü: ${beforeDepth.toFixed(1)} → ${installedState.hospitalRoadWaterDepth.toFixed(1)} cm (${roadDelta >= 0 ? '−' : '+'}${Math.abs(roadDelta).toFixed(1)} cm). Sınır: ${DEFENSE_GUIDANCE[id].limit}`,
        });
        setTimeout(() => setQuestToast(null), 4600);
      }

      if (questStep === 5) {
        triggerQuestAdvance(6, `${defense.name} inşa edildi! Hastane yolundaki suyun çekilmesini doğrula.`);
        setActiveDialog({
          speaker: 'ARAS',
          title: `${defense.name.toUpperCase()} TAMAMLANDI!`,
          text: `${defense.name} devrede. Etkisini aynı fırtına koşullarında gözlemle; yol sensörü gerçek su değişimini gösterecek.`,
          actionLabel: 'Yolu Denetle',
          onAction: () => setActiveDialog(null),
        });
      }
    } else {
      gameAudio.effect('click');
      const nextDefenses = activeDefenses.filter((x) => x !== id);
      setActiveDefenses(nextDefenses);
      setBudgetUsed((prev) => prev - defense.cost);
      setSpatialState(stepSpatialSimulation(spatialStateRef.current, nextDefenses));
      setQuestToast({
        kicker: `${defense.name.toUpperCase()} KALDIRILDI`,
        text: `${defense.name} artık simülasyona katkı vermiyor; ${defense.cost} kredi bütçeye geri döndü.`,
      });
      setTimeout(() => setQuestToast(null), 3200);
    }
  }, [activeDefenses, budgetUsed, investigateSolution, questStep, stormActive, triggerQuestAdvance]);

  const plannedBudgetUsed = useMemo(
    () => pendingPlan.reduce((total, id) => total + (DEFENSES.find((defense) => defense.id === id)?.cost ?? 0), 0),
    [pendingPlan],
  );

  const togglePlannedSolution = useCallback((id: DefenseId) => {
    const state = getSolutionState(id, discoveredSolutionsRef.current, investigatedSolutionsRef.current, activeDefensesRef.current);
    if (state === 'LOCKED' || state === 'DISCOVERED') {
      investigateSolution(id, 'Şehir Planı incelemesi');
      setPendingPlan((previous) => previous.includes(id)
        ? previous.filter((item) => item !== id)
        : [...previous, id]);
      const solution = getSolution(id);
      setQuestToast({ kicker: 'ÇÖZÜM PLANA EKLENDİ', text: `${solution.name} araştırıldı ve geçici plana eklendi. İstersen onaydan önce çıkarabilirsin.` });
      window.setTimeout(() => setQuestToast((current) => (
        current?.kicker === 'ÇÖZÜM PLANA EKLENDİ' ? null : current
      )), 3600);
      return;
    }
    setPendingPlan((previous) => previous.includes(id)
      ? previous.filter((item) => item !== id)
      : [...previous, id]);
  }, [investigateSolution]);

  const confirmPlanningJournal = useCallback(() => {
    if (plannedBudgetUsed > BUDGET) {
      setQuestToast({ kicker: 'BÜTÇE AŞILDI', text: `Bu plan ${plannedBudgetUsed} Kr tutuyor; mevcut bütçe ${BUDGET} Kr. Bir çözümü çıkarıp yeniden dene.` });
      return;
    }
    const nextState = stepSpatialSimulation(spatialStateRef.current, pendingPlan);
    setActiveDefenses(pendingPlan);
    setBudgetUsed(plannedBudgetUsed);
    setSpatialState(nextState);
    setPlanConfirmed(true);
    setPlanningOpen(false);
    setQuestToast({
      kicker: 'PLAN ONAYLANDI',
      text: pendingPlan.length
        ? `${pendingPlan.map((id) => getSolution(id).name).join(' + ')} seçildi. Şimdi simülasyonda gerçek su değişimini izle.`
        : 'Bu tur savunma kurmadan ilerlemeyi seçtin; sonuçlar gerçek simülasyondan gelecek.',
    });
    if (questStep === 5) {
      triggerQuestAdvance(6, pendingPlan.length ? 'Plan kuruldu! Hastane yolundaki gerçek su değişimini doğrula.' : 'Savunmasız plan onaylandı. Fırtınanın gerçek sonucunu gözlemle.');
    }
  }, [pendingPlan, plannedBudgetUsed, questStep, triggerQuestAdvance]);

  // E basıldığı anda bir frame önceki React state'ine güvenme; oyuncunun
  // güncel konumundan etkileşimi yeniden çözerek hızlı girişlerde yanlış
  // objenin tetiklenmesini engelle.
  const resolveCurrentInteraction = useCallback(() => {
    const playerPosition = playerRef.current;
    const target = targetPointRef.current;
    const points = interactionPointsRef.current;
    const questTarget = points.find((point) => (
      Math.hypot(point.x - target.x, point.y - target.y) < 1
      && Math.hypot(playerPosition.x - point.x, playerPosition.y - point.y) < point.radius
    ));
    if (questTarget) return questTarget;

    let closest: InteractionPoint | null = null;
    let minDistance = Infinity;
    for (const point of points) {
      const distance = Math.hypot(playerPosition.x - point.x, playerPosition.y - point.y);
      if (distance < point.radius && distance < minDistance) {
        closest = point;
        minDistance = distance;
      }
    }
    return closest;
  }, []);

  // Etkileşim Butonuna / E Tuşuna Basıldığında
  const handleInteract = useCallback(() => {
    gameAudio.unlock();
    if (showFirstMissionGuide) dismissFirstMissionGuide();
    const currentInteraction = resolveCurrentInteraction();
    if (!currentInteraction) {
      if (nearbyCitizen) {
        gameAudio.effect('click');
        nearbyCitizen.speechBubble = {
          text: nearbyCitizen.interactQuote,
          timeLeft: 4.8,
          totalDuration: 4.8,
        };
        setQuestToast({ kicker: nearbyCitizen.name.toUpperCase(), text: `"${nearbyCitizen.interactQuote}"` });
        setTimeout(() => setQuestToast(null), 3500);
      }
      return;
    }
    gameAudio.effect('click');

    switch (currentInteraction.type) {
      case 'npc_mira':
        if (questStep === 1) {
          investigateSolution('uyarı', 'Mira’nın risk değerlendirmesi');
          triggerQuestAdvance(2, 'Saha görevi alındı! Hastane yolundaki menfezi incele.');
          setActiveDialog({
            speaker: 'MİRA',
            title: 'KRİTİK İKLİM UYARISI',
            text: `Hoş geldin ${HEROES[heroType].name}! Meteoroloji radarı 88 mm/saatlik süper hücre fırtınasının yamaç havzasına indiğini gösteriyor. Şehir Hastanesi Acil Servis yolu en savunmasız noktamız. Pusuladaki hedef yönünü takip ederek hastane yolundaki drenaj menfezini acilen incele ve kapasite durumunu bildir!`,
            actionLabel: 'Menfezi İncelemeye Git',
            onAction: () => setActiveDialog(null),
          });
        } else if (questStep === 7) {
          gameAudio.effect('victory');
          completeChapter();
        } else {
          setActiveDialog({
            speaker: 'MİRA',
            title: 'İKLİM ARAŞTIRMA İSTASYONU',
            text: `Fırtına havzada ilerliyor ${HEROES[heroType].name}. Aktif hedefin: ${currentQuest.title}. Pusuladaki hedef yönünü takip etmeye devam et!`,
          });
        }
        break;

      case 'drainage':
        if (questStep === 2) {
          investigateSolution('dönüşüm', 'Hastane yolu menfez incelemesi');
          setInspectedLocations((value) => Math.max(value, 1));
          triggerQuestAdvance(3, 'Menfez yetersizliği tespit edildi! Mühendis Aras ile görüş.');
          setActiveDialog({
            speaker: 'EKO',
            title: 'DRENAJ KAPASİTE RAPORU',
            text: 'Menfez ızgarası yaprak ve çamurla kısmen tıkanmış durumda! Mevcut tahliye kapasitesi yalnızca 18 mm/tick, oysa yamaçtan beklenen akış 45 mm/tick. Bu, menfez iyileştirmesinin kritik koridor için neden önemli olduğunu gösteriyor. Şantiye yol ayrımındaki Aras ile seçenekleri karşılaştır.',
            actionLabel: 'Aras ile Konuş',
            onAction: () => setActiveDialog(null),
          });
        } else {
          setActiveDialog({
            speaker: 'EKO',
            title: 'DRENAJ TELEMETRİSİ',
            text: `Yol Üzeri Su Derinliği: ${spatialState.hospitalRoadWaterDepth} cm. Durum: ${
              spatialState.hospitalRoadPassable ? '✓ GÜVENLİ & AÇIK' : '⛔ GEÇİLEMEZ (Eşik: 30 cm)'
            }.`,
          });
        }
        break;

      case 'npc_aras':
        if (questStep === 3) {
          investigateSolution('dönüşüm', 'Aras’ın mühendislik planı');
          triggerQuestAdvance(4, 'Mühendislik planı hazır! Fırtınanın gelişini gözlemle.');
          setActiveDialog({
            speaker: 'ARAS',
            title: 'MÜHENDİSLİK RİSK PLANI',
            text: `Raporu inceledim ${HEROES[heroType].name}. Üç farklı altyapı yaklaşımı var: menfezi güçlendirmek, yüzey akışını tutmak veya kıyı suyunu sınırlamak. Erken uyarı da insanlara zaman kazandırır. Önce aynı fırtınada kırılma noktasını gözlemle, sonra Şehir Planı’nda karşılaştır.`,
            actionLabel: 'Gözlem Noktasına Git',
            onAction: () => setActiveDialog(null),
          });
        } else if (questStep === 5) {
          setActiveDialog({
            speaker: 'ARAS',
            title: 'MÜDAHALE ÖNERİSİ',
            text: `Yol çukurundaki su ${spatialState.hospitalRoadWaterDepth} cm. Şehir Planı’nda araştırdığın seçenekleri karşılaştır; bütçene ve korumak istediğin bölgeye göre karar senin.`,
          });
        } else {
          setActiveDialog({
            speaker: 'ARAS',
            title: 'MÜHENDİSLİK BİRİMİ',
            text: `Yol durumu: ${spatialState.hospitalRoadPassable ? 'Açık ve sağlam.' : 'Kritik taşkın var.'} Ambulans geçişi için güvenli seviye 30 cm altıdır.`,
          });
        }
        break;

      case 'flood_observation':
        if (questStep === 4) {
          setStormActive(true);
          const firstStormState = stepSpatialSimulation(spatialState, activeDefenses);
          setSpatialState(firstStormState);
          gameAudio.effect('thunder');
          const preparedHydraulicDefense = activeDefenses.includes('sünger') || activeDefenses.includes('dönüşüm');
          const preparedScenario = preparedHydraulicDefense && firstStormState.hospitalRoadPassable;
          triggerQuestAdvance(
            preparedScenario ? 6 : 5,
            preparedScenario
              ? 'Hazırlık planı devrede! Fırtına başladı; hastane yolundaki suyun davranışını ve erişimi doğrula.'
              : '88 mm/saat fırtına başladı! Şehir Planı’nı aç, çözümlerin gerçek etkisini aynı fırtına üzerinde karşılaştır.'
          );
          setActiveDialog({
            speaker: 'EKO',
            title: '🚨 ALARM: FIRTINA PATLADI!',
            text: preparedScenario
              ? `88 mm/saat süper hücre fırtınası başladı! İlk saha ölçümü ${firstStormState.hospitalRoadWaterDepth} cm. Hazırlık yatırımların aktif; hastane yoluna giderek erişimin korunduğunu doğrula.`
              : `88 mm/saat süper hücre fırtınası başladı! İlk saha ölçümü ${firstStormState.hospitalRoadWaterDepth} cm. Yol seviyesi yükselirken kararını Şehir Planı’nda oluştur ve sonra gerçek su değişimini izle.`,
            actionLabel: preparedScenario ? 'Hastane Yolunu Denetle' : 'Şehir Planını Aç',
            onAction: preparedScenario ? () => setActiveDialog(null) : openPlanningJournal,
          });
        } else {
          setActiveDialog({
            speaker: 'EKO',
            title: 'TAŞKIN GÖZLEM NOKTASI',
            text: `Mevcut yol derinliği: ${spatialState.hospitalRoadWaterDepth} cm. Yağış şiddeti: ${stormActive ? '88 mm/saat' : 'Hafif'}.`,
          });
        }
        break;

      case 'sponge_site':
      case 'retrofit_site':
      case 'warning_site':
      case 'seawall_site':
        if (currentInteraction.defenseId) {
          toggleWorldDefense(currentInteraction.defenseId);
        }
        break;

      case 'road_inspection':
        if (questStep === 6) {
          if (spatialState.hospitalRoadPassable && spatialState.hospitalRoadWaterDepth <= spatialState.hospitalRoadThreshold) {
            setInspectedLocations((value) => Math.max(value, 2));
            triggerQuestAdvance(7, 'Ambulans koridoru açıldı! Mira\'ya zafer raporu ver.');
            gameAudio.effect('victory');
            setActiveDialog({
              speaker: 'EKO',
              title: '✓ YOL DURUMU: GEÇİLEBİLİR!',
              text: `${activeDefenses.length ? activeDefenses.map((id) => getSolution(id).name).join(' + ') : 'Kurulmuş bir savunma'} sayesinde su ${spatialState.hospitalRoadWaterDepth} cm seviyesine indi. Ambulans koridoru açık; gözlenen sonucu Mira’ya raporla.`,
              actionLabel: 'Mira\'ya Dön',
              onAction: () => setActiveDialog(null),
            });
          } else {
            setActiveDialog({
              speaker: 'EKO',
              title: 'YOL HALA TAŞKIN ALTINDA',
              text: `Su derinliği ${spatialState.hospitalRoadWaterDepth} cm (güvenli eşik: <=${spatialState.hospitalRoadThreshold} cm). Etkin bir su yönetimi savunması olmadan yol açılamaz!`,
            });
          }
        } else {
          setActiveDialog({
            speaker: 'EKO',
            title: 'HASTANE YOLU DENETİMİ',
            text: `Su Derinliği: ${spatialState.hospitalRoadWaterDepth} cm. Durum: ${spatialState.hospitalRoadPassable ? 'AÇIK' : 'KAPALI'}.`,
          });
        }
        break;

      case 'hospital':
        setActiveDialog({
          speaker: 'MİRA',
          title: 'ŞEHİR HASTANESİ DURUMU',
          text: `Bölge travma merkezi faal. Yol durumu: ${
            spatialState.hospitalRoadPassable
              ? '✓ AÇIK. Ambulanslar güvenle ulaşıyor.'
              : '🚨 KRİTİK: Giriş yolu su altında! Ambulanslar geçemiyor.'
          }`,
        });
        break;

      case 'eko_terminal':
        setActiveDialog({
          speaker: 'EKO',
          title: 'SİMÜLASYON MATRİSİ',
          text: `Fırtına Şiddeti: ${stormActive ? '88 mm/h' : '0 mm/h'}. Aktif Savunmalar: ${
            activeDefenses.length
          } adet. Kalan Bütçe: ${BUDGET - budgetUsed} kredi.`,
        });
        break;
    }
  }, [
    nearbyCitizen,
    questStep,
    heroType,
    spatialState,
    activeDefenses,
    budgetUsed,
    stormActive,
    currentQuest,
    toggleWorldDefense,
    triggerQuestAdvance,
    completeChapter,
    dismissFirstMissionGuide,
    investigateSolution,
    openPlanningJournal,
    resolveCurrentInteraction,
    showFirstMissionGuide,
  ]);

  const cancelInteractionHold = useCallback((showFeedback = true) => {
    const active = interactionHoldRef.current;
    if (active) window.clearInterval(active.timer);
    interactionHoldRef.current = null;
    setInteractionHold(null);
    if (showFeedback && active) {
      setQuestToast({ kicker: 'ETKİLEŞİM İPTAL', text: 'İşlem tamamlanmadan bırakıldı. Devam etmek için E tuşunu basılı tut.' });
      window.setTimeout(() => setQuestToast(null), 2200);
      gameAudio.effect('click');
    }
  }, []);

  const completeInteractionHold = useCallback(() => {
    const active = interactionHoldRef.current;
    const currentInteraction = resolveCurrentInteraction();
    if (!active || !currentInteraction || active.pointId !== currentInteraction.id) {
      cancelInteractionHold(false);
      return;
    }
    window.clearInterval(active.timer);
    interactionHoldRef.current = null;
    setInteractionHold(null);
    handleInteractRef.current();
  }, [cancelInteractionHold, resolveCurrentInteraction]);

  const startInteractionHold = useCallback(() => {
    const point = resolveCurrentInteraction();
    if (!point || !requiresHoldToInteract(point)) {
      handleInteractRef.current();
      return;
    }
    if (interactionHoldRef.current?.pointId === point.id) return;
    cancelInteractionHold(false);
    const startedAt = performance.now();
    const active = { pointId: point.id, startedAt, timer: 0 };
    active.timer = window.setInterval(() => {
      const currentPoint = resolveCurrentInteraction();
      if (!currentPoint || currentPoint.id !== active.pointId) {
        cancelInteractionHold(false);
        return;
      }
      const progress = Math.min(1, (performance.now() - active.startedAt) / HOLD_INTERACTION_DURATION_MS);
      setInteractionHold({ pointId: active.pointId, progress });
      if (progress >= 1) completeInteractionHold();
    }, 40);
    interactionHoldRef.current = active;
    setInteractionHold({ pointId: point.id, progress: 0 });
    gameAudio.effect('click');
  }, [cancelInteractionHold, completeInteractionHold, resolveCurrentInteraction]);

  const finishInteractionHold = useCallback(() => {
    const active = interactionHoldRef.current;
    if (!active) return;
    if ((performance.now() - active.startedAt) >= HOLD_INTERACTION_DURATION_MS) {
      completeInteractionHold();
    } else {
      cancelInteractionHold(true);
    }
  }, [cancelInteractionHold, completeInteractionHold]);

  useEffect(() => () => cancelInteractionHold(false), [cancelInteractionHold]);

  // Klavye Kontrolleri
  const keysDown = useRef<Record<string, boolean>>({});
  const handleInteractRef = useRef(handleInteract);
  handleInteractRef.current = handleInteract;

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) return;

      const key = e.key.toLowerCase();
      const isMovementKey = ['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key);
      if (isMovementKey) {
        e.preventDefault();
        keysDown.current[key] = true;
      }

      if (key === 'e' && !e.repeat && !activeDialogRef.current) {
        e.preventDefault();
        if (requiresHoldToInteract(nearbyInteractionRef.current)) startInteractionHold();
        else handleInteractRef.current();
      }

      if (key === 'escape') {
        keysDown.current = {};
        setActiveDialog(null);
        setShowEkoHint(false);
      }

      if (key === 'h' && !e.repeat) {
        setShowEkoHint((prev) => !prev);
      }

      if (key === 'p' && !e.repeat && !activeDialogRef.current) {
        e.preventDefault();
        setPendingPlan(activeDefensesRef.current);
        setPlanningOpen((open) => !open);
        gameAudio.effect('click');
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) return;
      const key = e.key.toLowerCase();
      keysDown.current[key] = false;
      if (key === 'e') {
        e.preventDefault();
        finishInteractionHold();
      }
    };

    const clearKeys = () => {
      keysDown.current = {};
      cancelInteractionHold(false);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', clearKeys);
    document.addEventListener('visibilitychange', clearKeys);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', clearKeys);
      document.removeEventListener('visibilitychange', clearKeys);
    };
  }, [cancelInteractionHold, finishInteractionHold, startInteractionHold]);

  // Hava durumu fazı, ses ve taşkın motoru aynı sabit zaman tabanından beslenir.
  useEffect(() => {
    if (!stormActive) {
      setWeather(createWeatherState(false));
      gameAudio.setWeatherPhase('CLEAR');
      return;
    }

    setWeather((previous) => startStormWeather(previous));
    gameAudio.setWeatherPhase('LIGHT_RAIN');
    let last = performance.now();
    let accumulator = 0;
    const interval = setInterval(() => {
      const now = performance.now();
      const elapsed = Math.min(0.5, Math.max(0, (now - last) / 1000));
      accumulator += elapsed;
      last = now;

      let steps = 0;
      if (!isPausedRef.current && !activeDialogRef.current && !chapterOutcomeRef.current) {
        while (accumulator >= FIXED_SIMULATION_STEP_SECONDS && steps < 4) {
          setSpatialState((prev) => stepSpatialSimulation(prev, activeDefensesRef.current));
          accumulator -= FIXED_SIMULATION_STEP_SECONDS;
          steps += 1;
        }
      } else {
        accumulator = 0;
      }

      if (gameModeRef.current === 'adventure' && !isPausedRef.current && !activeDialogRef.current && !chapterOutcomeRef.current) {
        setStormElapsedSeconds((previous) => Math.min(240, previous + elapsed));
      }

      if (!isPausedRef.current && !activeDialogRef.current && !chapterOutcomeRef.current) {
        setWeather((previous) => advanceWeather(
          previous,
          elapsed,
          true,
          spatialStateRef.current.hospitalRoadPassable,
          activeDefensesRef.current.length > 0,
        ));
      }
    }, 50);
    return () => {
      clearInterval(interval);
      gameAudio.setWeatherPhase('CLEAR');
    };
  }, [stormActive]);

  useEffect(() => {
    if (stormActive && gameMode === 'adventure' && stormElapsedSeconds >= 240 && !chapterOutcome) {
      failChapter();
    }
  }, [chapterOutcome, failChapter, gameMode, stormActive, stormElapsedSeconds]);

  useEffect(() => {
    if (!stormActive) setWeather(questStep === 4 ? createWeatherPhaseState('OVERCAST') : createWeatherState(false));
  }, [questStep, stormActive]);

  useEffect(() => {
    if (stormActive && spatialState.isCompleted) {
      const hydraulicDefenseBuilt = activeDefenses.includes('sünger') || activeDefenses.includes('dönüşüm');
      if (!chapterOutcome && questStep >= 5 && spatialState.metrics.peakHospitalRoadWaterDepth > spatialState.hospitalRoadThreshold && !hydraulicDefenseBuilt) {
        failChapter('Fırtına döngüsü tamamlandı; hastane yolu kritik taşkın gördü ve etkili bir su yönetimi savunması kurulmadı.');
      }
      setStormActive(false);
      setQuestToast({ kicker: 'SİMÜLASYON TAMAMLANDI', text: 'Yağış kesildi. Islak zemin ve kalan su, modeldeki drenaj hızına göre toparlanıyor.' });
      setTimeout(() => setQuestToast(null), 4200);
    }
  }, [activeDefenses, chapterOutcome, failChapter, questStep, spatialState.hospitalRoadThreshold, spatialState.isCompleted, spatialState.metrics.peakHospitalRoadWaterDepth, stormActive]);

  useEffect(() => {
    gameAudio.setWeatherPhase(weather.phase);
  }, [weather.phase]);

  // (Otomatik zorunlu ilerleme kaldırıldı — Oyuncu dünyada serbestçe yürüyüp hedeflerle doğrudan etkileşime geçer)

  // Ana Oyun Döngüsü & Canvas Çizimi (60 FPS Pixel Art)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let lastTime = performance.now();

    const gameLoop = (currentTime: number) => {
      const dt = Math.min(0.05, (currentTime - lastTime) / 1000);
      lastTime = currentTime;
      const timeInSec = currentTime * 0.001;

      // 1. Oyuncu Hareketi (Klavye + Sanal Joystick)
      const movementLocked = Boolean(isPausedRef.current || activeDialogRef.current || showHeroModalRef.current || chapterWonRef.current || chapterOutcomeRef.current);
      const movementInput = movementLocked
        ? { x: 0, y: 0 }
        : getMovementInput(keysDown.current, {
            x: touchMovementRef.current.dx,
            y: touchMovementRef.current.dy,
            active: touchMovementRef.current.active,
          });
      const nextPlayer = movePlayer(
        playerRef.current,
        movementInput,
        dt,
        obstacles,
        trees,
        WORLD_WIDTH,
        WORLD_HEIGHT,
        spatialStateRef.current.hospitalRoadWaterDepth,
        WORLD_TERRAIN_MASK,
      );
      let appliedPlayer = nextPlayer;
      const attemptedTerrainPoint = {
        x: playerRef.current.x + movementInput.x * 12,
        y: playerRef.current.y + movementInput.y * 12,
      };
      const attemptedTerrainBlock = Boolean(
        movementInput.x || movementInput.y,
      ) && pointInBlockedTerrain(attemptedTerrainPoint, WORLD_TERRAIN_MASK);
      if (attemptedTerrainBlock && currentTime - terrainBlockedFeedbackRef.current > 1200) {
        terrainBlockedFeedbackRef.current = currentTime;
        setQuestToast({ kicker: 'KIYI SINIRI', text: 'Suya geçiş kapalı. Rıhtım veya işaretli iskele yolunu kullan.' });
        window.setTimeout(() => setQuestToast(null), 1800);
      }
      const deepFlood = spatialStateRef.current.hospitalRoadWaterDepth > 30;
      const isStranded = deepFlood
        && pointInFloodedRoadZone(playerRef.current, spatialStateRef.current.hospitalRoadWaterDepth)
        && (Math.abs(movementInput.x) > 0.01 || Math.abs(movementInput.y) > 0.01)
        && Math.hypot(nextPlayer.x - playerRef.current.x, nextPlayer.y - playerRef.current.y) < 0.5;
      if (isStranded) {
        stalledFloodSecondsRef.current += dt;
        if (stalledFloodSecondsRef.current >= 1.5) {
          appliedPlayer = {
            ...playerRef.current,
            x: 1180,
            y: 420,
            vx: 0,
            vy: 0,
            isMoving: false,
            frame: 0,
          };
          stalledFloodSecondsRef.current = 0;
          setRescueCount((count) => count + 1);
          setQuestToast({ kicker: 'EKO / GÜVENLİ TAHLİYE', text: 'Taşkın çukurundan güvenli patikaya çıkarıldın. Bir rescue puanı kaydedildi.' });
          gameAudio.effect('error');
          setTimeout(() => setQuestToast(null), 3600);
        }
      } else {
        stalledFloodSecondsRef.current = 0;
      }
      if (spatialStateRef.current.hospitalRoadWaterDepth <= 30 && appliedPlayer.isMoving) {
        lastSafePlayerRef.current = { x: appliedPlayer.x, y: appliedPlayer.y };
      }
      playerRef.current = appliedPlayer;
      setPlayer(appliedPlayer);
      const enteredDistrict = getCityDistrictAt(appliedPlayer.x, appliedPlayer.y);
      if (enteredDistrict.id !== currentDistrictRef.current) {
        currentDistrictRef.current = enteredDistrict.id;
        setCurrentDistrictId(enteredDistrict.id);
        setDiscoveredDistricts((previous) => {
          if (previous.has(enteredDistrict.id)) return previous;
          const next = new Set(previous);
          next.add(enteredDistrict.id);
          setQuestToast({
            kicker: 'YENİ BÖLGE KEŞFEDİLDİ',
            text: `${enteredDistrict.name} — ${enteredDistrict.subtitle}`,
          });
          gameAudio.effect('transition');
          setTimeout(() => setQuestToast((current) => (
            current?.kicker === 'YENİ BÖLGE KEŞFEDİLDİ' ? null : current
          )), 3200);
          return next;
        });
      }
      if (!spatialStateRef.current.hospitalRoadPassable) setHadRoadClosure(true);

      // 2. Yakın Etkileşim Kontrolü
      let closest: InteractionPoint | null = null;
      let minDist = Infinity;
      const questTargetInteraction = interactionPointsRef.current.find((pt) => (
        Math.hypot(pt.x - targetPointRef.current.x, pt.y - targetPointRef.current.y) < 1
        && Math.hypot(playerRef.current.x - pt.x, playerRef.current.y - pt.y) < pt.radius
      ));
      if (questTargetInteraction) {
        closest = questTargetInteraction;
        minDist = Math.hypot(playerRef.current.x - questTargetInteraction.x, playerRef.current.y - questTargetInteraction.y);
      }
      if (!questTargetInteraction) {
        for (const pt of interactionPointsRef.current) {
          const d = Math.hypot(playerRef.current.x - pt.x, playerRef.current.y - pt.y);
          if (d < pt.radius && d < minDist) {
            closest = pt;
            minDist = d;
          }
        }
      }
      setNearbyInteraction(closest);
      if (closest?.defenseId && !discoveredSolutionsRef.current.includes(closest.defenseId)) {
        discoverSolution(closest.defenseId, `${closest.label} saha işareti`);
      }

      // 2.1. Yakın Şehir Sakini Kontrolü (Ambient Citizen)
      let closestCit: AmbientCitizen | null = null;
      if (!closest) {
        let minCitD = 48;
        for (const c of citizensRef.current) {
          const d = Math.hypot(playerRef.current.x - c.x, playerRef.current.y - c.y);
          if (d < minCitD) {
            closestCit = c;
            minCitD = d;
          }
        }
      }
      setNearbyCitizen(closestCit);

      // 2.2. Yaşayan Şehir Sakinlerini Güncelle (Ambient Citizens System)
      updateAmbientCitizens(citizensRef.current, dt, {
        stormActive: stormActiveRef.current,
        weatherPhase: weatherRef.current.phase,
        roadWaterDepth: spatialStateRef.current.hospitalRoadWaterDepth,
        roadPassable: spatialStateRef.current.hospitalRoadPassable,
        hasSpongeDefense: activeDefensesRef.current.includes('sünger'),
        chapterWon: chapterWonRef.current,
        obstacles,
        terrainMask: WORLD_TERRAIN_MASK,
        playerX: playerRef.current.x,
        playerY: playerRef.current.y,
      });

      // 4. ÇİZİM (Pixel-Art Rendering)
      const width = canvas.width;
      const height = canvas.height;

      // Kamera
      const curCamX = Math.max(0, Math.min(WORLD_WIDTH - width, playerRef.current.x - width / 2));
      const curCamY = Math.max(0, Math.min(WORLD_HEIGHT - height, playerRef.current.y - height / 2));

      ctx.save();
      ctx.translate(-curCamX, -curCamY);

      const renderCtx: WorldRenderContext = {
        ctx,
        time: timeInSec,
        camX: curCamX,
        camY: curCamY,
        viewWidth: width,
        viewHeight: height,
        activeDefenses: activeDefensesRef.current,
        roadWaterDepth: spatialStateRef.current.hospitalRoadWaterDepth,
        roadWetness: spatialStateRef.current.roadWetness,
        spongeStorage: spatialStateRef.current.spongeStorage,
        spongeStorageCapacity: spatialStateRef.current.spongeStorageCapacity,
        roadPassable: spatialStateRef.current.hospitalRoadPassable,
        stormActive: stormActiveRef.current,
        weatherPhase: weatherRef.current.phase,
        rainIntensity: weatherRef.current.rainIntensity,
        cloudDarkness: weatherRef.current.cloudDarkness,
        windStrength: weatherRef.current.windStrength,
        questStep: questStepRef.current,
        targetObjective: currentQuestRef.current
          ? {
              x: currentQuestRef.current.targetX,
              y: currentQuestRef.current.targetY,
              label: currentQuestRef.current.targetLabel,
            }
          : null,
      };

      // A. Piksel Karo Haritası & Yollar & Taşkın Katmanı
      drawPixelWorldMap(renderCtx, WORLD_WIDTH, WORLD_HEIGHT);

      // B. Altyapı ve İnteraktif Zemin Nesneleri
      // Drenaj Menfezi
      drawPixelStormGrate(
        ctx,
        1290,
        510,
        questStepRef.current >= 4,
        spatialStateRef.current.hospitalRoadWaterDepth
      );

      // Sünger Kent İnşa Alanı
      drawPixelInterventionSite(
        ctx,
        1160,
        340,
        activeDefensesRef.current.includes('sünger'),
        'sponge',
        timeInSec,
        spatialStateRef.current.spongeStorage,
        spatialStateRef.current.spongeStorageCapacity,
      );

      // Yükseltilmiş Menfez İnşa Alanı
      drawPixelInterventionSite(
        ctx,
        1340,
        530,
        activeDefensesRef.current.includes('dönüşüm'),
        'retrofit',
        timeInSec
      );

      drawPixelInterventionSite(
        ctx,
        900,
        340,
        activeDefensesRef.current.includes('uyarı'),
        'retrofit',
        timeInSec
      );

      drawPixelInterventionSite(
        ctx,
        1800,
        620,
        activeDefensesRef.current.includes('set'),
        'seawall',
        timeInSec
      );

      // D. Derinlik Sıralı (Y-Sorted) Varlıklar
      interface DepthEntity {
        baseY: number;
        draw: () => void;
      }

      const entities: DepthEntity[] = [];

      // 1. Teras Konutları
      entities.push({
        baseY: 180 + 88,
        draw: () => drawPixelHouse(ctx, 1050, 180, '#c678dd', '#4b5263', timeInSec),
      });

      // 2. Bölge Kliniği
      entities.push({
        baseY: 220 + 88,
        draw: () => drawPixelHouse(ctx, 1640, 220, '#61afef', '#3e4451', timeInSec),
      });

      // 3. Şehir Acil Durum Hastanesi
      entities.push({
        baseY: 240 + 180,
        draw: () =>
          drawPixelHospital(
            ctx,
            1360,
            240,
            timeInSec,
            stormActiveRef.current,
            spatialStateRef.current.hospitalRoadPassable
          ),
      });

      // 4. Mahalle Ağaçları
      for (const t of trees) {
        entities.push({
          baseY: t.y + t.r,
          draw: () => drawPixelTree(ctx, t.x, t.y, t.r),
        });
      }

      // 5. Sokak Lambaları
      for (const l of streetLamps) {
        entities.push({
          baseY: l.y + 2,
          draw: () => drawPixelStreetLamp(ctx, l.x, l.y, timeInSec),
        });
      }

      // 6. Mühendis Aras (NPC)
      entities.push({
        baseY: 430 + 16,
        draw: () => drawPixelAras(ctx, 1210, 430, timeInSec),
      });

      // 7. Mira (NPC — İklim Araştırma İstasyonu Lideri)
      entities.push({
        baseY: 470 + 16,
        draw: () => drawPixelMiraNPC(ctx, 520, 470, timeInSec),
      });

      // 8. Seçilen Oyuncu Kahramanı (Deniz veya Barış)
      entities.push({
        baseY: playerRef.current.y + 16,
        draw: () => drawPixelHero(ctx, playerRef.current, heroTypeRef.current, timeInSec),
      });

      // 9. Yaşayan Şehir Sakinleri (Ambient Citizens)
      for (const c of citizensRef.current) {
        entities.push({
          baseY: c.y + 14,
          draw: () => drawPixelCitizen(ctx, c, timeInSec),
        });
      }

      // 10. Bölge Binaları (Saat Kulesi, Çarşı, Müze, İklim Araştırma İstasyonu)
      for (const obs of obstacles) {
        if (obs.label === 'SAAT KULESİ') {
          entities.push({
            baseY: obs.y + obs.h,
            draw: () => drawPixelClockTower(ctx, obs.x, obs.y, timeInSec),
          });
        } else if (obs.label === 'TARİHİ ÇARŞI') {
          entities.push({
            baseY: obs.y + obs.h,
            draw: () => drawPixelBazaar(ctx, obs.x, obs.y),
          });
        } else if (obs.label === 'BELEDİYE MÜZESİ') {
          entities.push({
            baseY: obs.y + obs.h,
            draw: () => drawPixelMuseum(ctx, obs.x, obs.y),
          });
        } else if (obs.label === 'İKLİM ARAŞTIRMA İSTASYONU') {
          entities.push({
            baseY: obs.y + obs.h,
            draw: () => drawPixelResearchStation(ctx, obs.x, obs.y, timeInSec),
          });
        }
      }

      // Varlıkları taban Y kotuna göre sırala ve çiz
      entities.sort((a, b) => a.baseY - b.baseY);
      for (const ent of entities) {
        ent.draw();
      }

      // E. Aktif Görev Hedef İşareti (Kontekstüel İkon & Parıltı)
      if (currentQuestRef.current) {
        drawPixelQuestWaypoint(
          ctx,
          currentQuestRef.current.targetX,
          currentQuestRef.current.targetY,
          currentQuestRef.current.targetLabel,
          timeInSec,
          questStepRef.current
        );
      }

      ctx.restore();

      // Weather is drawn in screen coordinates so rain remains visible while
      // the camera moves, and never drifts with world-space offsets.
      drawPixelWeatherOverlay(ctx, width, height, timeInSec, {
        weatherPhase: weatherRef.current.phase,
        rainIntensity: weatherRef.current.rainIntensity,
        cloudDarkness: weatherRef.current.cloudDarkness,
        windStrength: weatherRef.current.windStrength,
      });

      // 5. MİNİMAP RADAR ÇİZİMİ (Mini Canvas Engine)
      const radar = radarCanvasRef.current;
      if (radar) {
        const rctx = radar.getContext('2d');
        if (rctx) {
          const rw = radar.width;
          const rh = radar.height;
          rctx.clearRect(0, 0, rw, rh);

          // Koyu radar arka planı
          rctx.fillStyle = '#081726';
          rctx.fillRect(0, 0, rw, rh);

          const sx = rw / WORLD_WIDTH;
          const sy = rh / WORLD_HEIGHT;

          // Ana Caddeler
          rctx.fillStyle = 'rgba(71, 85, 105, 0.55)';
          // Dikey cadde: x: 760..860
          rctx.fillRect(760 * sx, 0, 100 * sx, rh);
          // Yatay bulvar: y: 720..820
          rctx.fillRect(0, 720 * sy, rw, 100 * sy);

          // Hastane Kıvrımlı Yolu
          rctx.strokeStyle = 'rgba(71, 85, 105, 0.7)';
          rctx.lineWidth = 3;
          rctx.beginPath();
          rctx.moveTo(860 * sx, 740 * sy);
          rctx.quadraticCurveTo(1100 * sx, 600 * sy, 1380 * sx, 410 * sy);
          rctx.stroke();

          // Sel Baskını Tehlike Alanı (Kritikse Kırmızı Vurgu)
          if (spatialStateRef.current.hospitalRoadWaterDepth > 28) {
            rctx.fillStyle = 'rgba(239, 68, 68, 0.65)';
            rctx.fillRect(1140 * sx, 480 * sy, 180 * sx, 100 * sy);
          }

          // Bina Silüetleri
          rctx.fillStyle = 'rgba(30, 41, 59, 0.85)';
          for (const obs of obstacles) {
            rctx.fillRect(obs.x * sx, obs.y * sy, obs.w * sx, obs.h * sy);
          }

          // Aktif Görev Hedef Noktası (Yanıp Sönen Sarı Nokta)
          const targetPulse = 0.8 + 0.3 * Math.sin(timeInSec * 6);
          rctx.fillStyle = '#f59e0b';
          rctx.beginPath();
          rctx.arc(targetPointRef.current.x * sx, targetPointRef.current.y * sy, 3.5 * targetPulse, 0, Math.PI * 2);
          rctx.fill();

          // Oyuncu Noktası (Mavi Işık)
          rctx.fillStyle = '#38bdf8';
          rctx.beginPath();
          rctx.arc(playerRef.current.x * sx, playerRef.current.y * sy, 3, 0, Math.PI * 2);
          rctx.fill();
        }
      }

      animId = requestAnimationFrame(gameLoop);
    };

    animId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animId);
  }, [discoverSolution, investigateSolution, obstacles, streetLamps, trees]);

  // Sanal Joystick Touch Eventleri (Mobil için)
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    const touch = e.touches[0];
    if (!touch) return;
    joystickBaseRef.current = { startX: touch.clientX, startY: touch.clientY };
    setTouchMovement({ dx: 0, dy: 0, active: true });
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!joystickBaseRef.current) return;
    const touch = e.touches[0];
    if (!touch) return;
    const rawDx = touch.clientX - joystickBaseRef.current.startX;
    const rawDy = touch.clientY - joystickBaseRef.current.startY;
    const dist = Math.hypot(rawDx, rawDy);
    const maxR = 40;
    const clampedDist = Math.min(dist, maxR);
    const normX = dist > 0 ? (rawDx / dist) * (clampedDist / maxR) : 0;
    const normY = dist > 0 ? (rawDy / dist) * (clampedDist / maxR) : 0;
    setTouchMovement({ dx: normX, dy: normY, active: true });
  };

  const handleTouchEnd = () => {
    joystickBaseRef.current = null;
    setTouchMovement({ dx: 0, dy: 0, active: false });
  };

  const interactionRequiresHold = requiresHoldToInteract(nearbyInteraction);
  const interactionProgress = interactionHold && interactionHold.pointId === nearbyInteraction?.id
    ? interactionHold.progress
    : 0;
  const nearbyDefense = nearbyInteraction?.defenseId
    ? DEFENSES.find((defense) => defense.id === nearbyInteraction.defenseId)
    : null;
  const nearbyDefenseGuidance = nearbyDefense ? DEFENSE_GUIDANCE[nearbyDefense.id] : null;
  const handleInteractionClick = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    if (requiresHoldToInteract(nearbyInteractionRef.current)) {
      event.preventDefault();
      return;
    }
    handleInteract();
  }, [handleInteract]);
  const handleHoldPointerDown = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!requiresHoldToInteract(nearbyInteractionRef.current)) return;
    event.preventDefault();
    startInteractionHold();
  }, [startInteractionHold]);
  const handleHoldPointerUp = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!requiresHoldToInteract(nearbyInteractionRef.current)) return;
    event.preventDefault();
    finishInteractionHold();
  }, [finishInteractionHold]);
  const handleHoldPointerCancel = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!requiresHoldToInteract(nearbyInteractionRef.current)) return;
    event.preventDefault();
    cancelInteractionHold(true);
  }, [cancelInteractionHold]);

  const outcomePresentation = chapterOutcome ? getOutcomePresentation(chapterOutcome) : null;
  const recordedPeakWater = Math.max(0, spatialState.metrics.peakHospitalRoadWaterDepth);
  const recordedCurrentWater = Math.max(0, spatialState.hospitalRoadWaterDepth);
  const comparisonScale = Math.max(38, recordedPeakWater, recordedCurrentWater);

  return (
    <div className={`explorable-world-container ${endingVisible ? 'ending-active' : ''}`}>
      {/* 1. Üst HUD Barı */}
      <header className="world-hud-top">
        <div className="hud-brand-group">
          <button className="hud-back-btn" onClick={onBackToMenu} title="Menüye Dön">
            <ArrowLeft size={16} /> MENÜ
          </button>
          <button
            className="hud-hero-chip"
            onClick={() => setShowHeroModal(true)}
            title="Karakter Değiştir"
          >
            <span className="hud-hero-dot" />
            <User size={13} />
            <span>{HEROES[heroType].name}</span>
            <small style={{ opacity: 0.75, fontSize: '9px', letterSpacing: '0.5px' }}>
              ({HEROES[heroType].badge})
            </small>
          </button>
          <button
            className="hud-strategy-btn"
            style={{
              borderColor: 'rgba(239, 68, 68, 0.45)',
              color: '#fca5a5',
              background: 'rgba(239, 68, 68, 0.12)',
            }}
            onClick={handleResetQuest}
            title="Bölümü Baştan Başlat"
          >
            <RotateCcw size={13} /> SIFIRLA
          </button>
          <div className="hud-location-label" data-current-district={currentDistrict.id}>
            <small>ŞU AN BURADASIN</small>
            <b>{currentDistrict.name}</b>
            <span>{discoveredDistricts.size} / {CITY_DISTRICTS.length} bölge keşfedildi</span>
          </div>
        </div>

        <div className="hud-status-group">
          <div
            className={`hud-weather-badge weather-${weather.phase.toLowerCase()}`}
            data-weather-phase={weather.phase}
            data-rain-intensity={weather.rainIntensity.toFixed(2)}
          >
            <small>HAVA DURUMU</small>
            <b>{weatherPhaseLabel(weather.phase)}</b>
            <span>{weather.rainfallRate} mm/h</span>
          </div>
          <button
            className="hud-mode-toggle"
            onClick={() => setGameMode((mode) => mode === 'relaxed' ? 'adventure' : 'relaxed')}
            title="Oyun modunu değiştir"
            data-game-mode={gameMode}
          >
            <small>MOD</small>
            <b>{gameMode === 'adventure' ? 'MACERA' : 'RAHAT KEŞİF'}</b>
            {gameMode === 'adventure' && <span>{Math.max(0, 240 - Math.floor(stormElapsedSeconds))} sn</span>}
          </button>
          <button
            className="hud-pause-btn"
            onClick={() => setIsPaused((paused) => !paused)}
            aria-label={isPaused ? 'Oyuna devam et' : 'Oyunu duraklat'}
            title={isPaused ? 'Oyuna devam et' : 'Oyunu duraklat'}
          >
            {isPaused ? '▶ DEVAM' : 'Ⅱ DURAKLAT'}
          </button>
          <span className="hud-meta-divider">/</span>
          <div className="hud-meta-item">
            <small>KALAN KAYNAK</small>
            <b>{BUDGET - budgetUsed} / 100 Kr</b>
          </div>
          <span className="hud-meta-divider">/</span>
          <div className="hud-meta-item">
            <small>HASTANE YOLU</small>
            <b className={spatialState.hospitalRoadPassable ? 'status-safe' : 'status-danger'}>
              {spatialState.hospitalRoadPassable ? (
                <span>
                  <CheckCircle size={13} style={{ display: 'inline', marginRight: 4 }} /> AÇIK (GÜVENLİ)
                </span>
              ) : (
                <span>
                  <AlertTriangle size={13} style={{ display: 'inline', marginRight: 4 }} /> KAPALI ({spatialState.hospitalRoadWaterDepth} cm)
                </span>
              )}
            </b>
          </div>
          {activeDefenses.includes('sünger') && (
            <div className="hud-meta-item hud-sponge-meter" data-sponge-meter>
              <small>GÖLET DOLULUĞU</small>
              <b>{spatialState.spongeStorage.toFixed(1)} / {spatialState.spongeStorageCapacity} cm</b>
              <span>{spatialState.spongeOperational ? 'AKTİF' : `KURULUYOR · ${spatialState.spongeDeploymentTicksRemaining}`}</span>
            </div>
          )}
          <button
            className="hud-strategy-btn solution-journal-launch"
            title="Şehri Koruma Planı'nı aç (P)"
            onClick={() => {
              setPendingPlan(activeDefenses);
              setPlanningOpen(true);
            }}
            data-solution-journal-open="true"
          >
            <Sparkles size={14} /> ŞEHİR PLANI <kbd>P</kbd>
          </button>
          <button
            className="sound-button"
            onClick={onToggleMute}
            aria-label={muted ? 'Sesi aç' : 'Sesi kapat'}
          >
            {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
        </div>
      </header>

      {/* 2. Yeniden Tasarlanan RPG Görev Takip Paneli (Sol Üst) */}
      <div className={`quest-tracker-card ${questDetailsExpanded ? 'quest-expanded' : 'quest-collapsed'}`}>
        <div className="quest-tracker-header">
          <span className="quest-chapter-tag">BÖLÜM 1: YAMAÇ HASTANESİ</span>
          <div className="quest-header-actions">
            <span className="quest-step-pill">{currentQuest.kicker}</span>
            <button
              className="quest-collapse-btn"
              onClick={() => setQuestDetailsExpanded((expanded) => !expanded)}
              aria-expanded={questDetailsExpanded}
              aria-controls="quest-details"
              aria-label={questDetailsExpanded ? 'Görev ayrıntısını gizle' : 'Görev ayrıntısını aç'}
            >
              {questDetailsExpanded ? '−' : '+'}
            </button>
          </div>
        </div>
        <div className="quest-tracker-title">
          <span>⚔️</span> {currentQuest.title}
        </div>
        {questDetailsExpanded && (
          <div id="quest-details" className="quest-details-content">
            <div className="quest-tracker-desc">{currentQuest.description}</div>
            <div className="quest-tracker-footer">
              <div className="quest-target-distance-badge">
                <Navigation size={11} style={{ transform: 'rotate(45deg)' }} />
                <span>{currentQuest.targetLabel}</span>
                <span className="quest-distance-val">• {distanceMeters} m</span>
              </div>
              <button
                className="quest-hint-toggle-btn"
                onClick={() => setShowEkoHint((prev) => !prev)}
                title="EKO Akıllı İpucunu Göster"
              >
                <Sparkles size={11} /> {showEkoHint ? 'GİZLE' : 'İPUCU (EKO)'}
              </button>
            </div>
          </div>
        )}
      </div>

      {planningOpen && (
        <div className="solution-journal-overlay" role="dialog" aria-label="Şehri Koruma Planı">
          <section className="solution-journal-card">
            <header className="solution-journal-header">
              <div>
                <div className="solution-journal-brandline">
                  <span className="solution-journal-brand-mark">♜</span>
                  <strong>ŞEHRİN YARINI</strong>
                  <span className="solution-journal-brand-arrow">—✣—</span>
                  <em>Planlama Günlüğü</em>
                </div>
                <span className="solution-journal-kicker">PLANLAMA GÜNLÜĞÜ</span>
                <h2>ŞEHRİ KORUMA PLANI</h2>
                <p>Önce çözümleri araştır, sonra bütçene ve riskin konumuna göre karar ver.</p>
              </div>
              <div className="solution-journal-header-art" aria-hidden="true">
                <img src="/assets/chapters/yamac-hastanesi.svg" alt="" />
              </div>
              <div className="solution-journal-bookmark" aria-hidden="true">♨</div>
              <button className="solution-journal-close" onClick={() => setPlanningOpen(false)} aria-label="Şehir planını kapat">×</button>
            </header>
            <div className="solution-journal-progress">
              <span>{getDiscoveryProgress(discoveredSolutions)}</span>
              <span>PLAN: {plannedBudgetUsed} / {BUDGET} Kr</span>
              <span>KALAN: {BUDGET - plannedBudgetUsed} Kr</span>
            </div>
            <div className="solution-journal-grid">
              {CLIMATE_SOLUTIONS.map((solution) => {
                const state = getSolutionState(solution.id, discoveredSolutions, investigatedSolutions, activeDefenses);
                const selectedInPlan = pendingPlan.includes(solution.id);
                const stateLabel = state === 'LOCKED'
                  ? 'PLANDAN ARAŞTIRILABİLİR'
                  : state === 'DISCOVERED'
                    ? 'İNCELEME GEREKİYOR'
                    : state === 'BUILT'
                      ? 'KURULU'
                      : 'HAZIR';
                return (
                  <article
                    key={solution.id}
                    className={`solution-journal-item state-${state.toLowerCase()} ${selectedInPlan ? 'is-selected' : ''}`}
                    data-solution-id={solution.id}
                    data-solution-state={state}
                  >
                    <div className={`solution-art solution-art-${solution.id}`} aria-label={`${solution.name} görseli`} role="img">
                      <span className="solution-art-symbol" aria-hidden="true">{solution.icon}</span>
                    </div>
                    <div className="solution-journal-copy">
                      <div className="solution-journal-title-row">
                        <h3><span className="solution-title-icon" aria-hidden="true">{solution.icon}</span>{solution.name}</h3>
                        <strong>{solution.cost} Kr</strong>
                      </div>
                      <span className="solution-journal-state">{stateLabel}</span>
                      <p>{solution.benefit}</p>
                      <small><b>Korur:</b> {solution.protects}</small>
                      <small><b>Sınır:</b> {solution.limitation}</small>
                      <small><b>Yer:</b> {solution.validZones.join(' · ')}</small>
                      {(state === 'LOCKED' || state === 'DISCOVERED') && <small className="solution-journal-discovery">{solution.discoveryMethod} · Plan ekranından araştırıp ekleyebilirsin.</small>}
                      <button
                        className="solution-journal-action"
                        onClick={() => togglePlannedSolution(solution.id)}
                      >
                        {selectedInPlan ? 'PLANDAN ÇIKAR' : 'PLANA EKLE'}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
            <footer className="solution-journal-footer">
              <span>{planConfirmed ? 'Son onaylı plan simülasyonda uygulanıyor.' : 'Planı onaylayana kadar bütçe harcanmaz.'}</span>
              <div>
                <button className="dialog-close-btn" onClick={() => setPlanningOpen(false)}>VAZGEÇ</button>
                <button className="primary-button" onClick={confirmPlanningJournal}>PLANI ONAYLA ↗</button>
              </div>
            </footer>
          </section>
        </div>
      )}

      {showFirstMissionGuide && questStep === 1 && !activeDialog && (
        <aside className="first-mission-guide" aria-label="İlk saha kılavuzu">
          <button className="first-mission-guide-close" onClick={dismissFirstMissionGuide} aria-label="Kılavuzu kapat">×</button>
          <strong>İLK SAHA KILAVUZU</strong>
          <span><b>WASD / joystick:</b> hareket · <b>E:</b> konuş</span>
          <span><b>Menfez ve yatırımlarda E’yi basılı tut:</b> ilerleme tamamlanınca işlem gerçekleşir.</span>
          <span><b>Pusula:</b> hedefi gösterir. Fırtına öncesi savunma kur, yolu doğrula ve Mira’ya rapor ver.</span>
          <small>Yıldızlar planının kalitesini, rozetler keşif ve doğru müdahaleleri gösterir.</small>
        </aside>
      )}

      {/* 3. EKO Kural Tabanlı Yardımcı İpucu Kartı */}
      {showEkoHint && (
        <div className="eko-companion-card">
          <div className="eko-card-header">
            <div className="eko-card-title-group">
              <img
                src="/assets/characters/eko-portrait.png"
                alt="EKO"
                className="eko-card-avatar"
              />
              <span className="eko-card-title">{ekoHint.title}</span>
            </div>
            <button
              className="eko-card-close-btn"
              onClick={() => setShowEkoHint(false)}
              aria-label="Kapat"
            >
              ✕
            </button>
          </div>
          <div className={`eko-card-body eko-${ekoHint.urgency}`}>{ekoHint.hint}</div>
        </div>
      )}

      {/* 4. Kompakt RPG Pusulası */}
      {showCompass ? (
        <aside
          className={`rpg-compass ${targetReached ? 'compass-reached' : ''}`}
          aria-label={`Aktif hedef: ${currentQuest.targetLabel}`}
          data-compass-bearing={compassBearing.angleDeg.toFixed(2)}
          data-compass-distance={compassBearing.distanceMeters}
          data-compass-target={currentQuest.targetLabel}
          data-compass-reached={targetReached ? 'true' : 'false'}
        >
          <div className="rpg-compass-header">
            <span>HEDEF PUSULASI</span>
            <button
              className="compass-hide-button"
              onClick={() => setShowCompass(false)}
              aria-label="Pusulayı kapat"
            >
              ×
            </button>
          </div>
          <div className="rpg-compass-dial" aria-hidden="true">
            <span className="compass-cardinal compass-north">N</span>
            <span className="compass-cardinal compass-east">E</span>
            <span className="compass-cardinal compass-south">S</span>
            <span className="compass-cardinal compass-west">W</span>
            {!targetReached && (
              <span
                className="compass-pointer"
                style={{ transform: `rotate(${compassBearing.angleDeg}deg)` }}
              />
            )}
            <span className="compass-center-dot" />
          </div>
          <div className="rpg-compass-target">{targetReached ? nearbyInteraction?.label : currentQuest.targetLabel}</div>
          <div className="rpg-compass-meta">
            {targetReached ? 'E HAZIR • ETKİLEŞİME GEÇ' : `HEDEF • ${compassBearing.distanceMeters} m • ${compassBearing.cardinal}`}
          </div>
          {navigationWarning && <div className="rpg-compass-warning">{navigationWarning}</div>}
        </aside>
      ) : (
        <button
          className="compass-show-button"
          onClick={() => setShowCompass(true)}
          aria-label="Pusulayı aç"
        >
          PUSULA
        </button>
      )}

      {/* 5. Görev Geçiş ve Başarı Toast Bildirimi */}
      {questToast && !activeDialog && !achievementNotice && (
        <div className="quest-toast-banner">
          <span className="quest-toast-icon">
            <CheckCircle size={18} />
          </span>
          <div className="quest-toast-content">
            <span className="quest-toast-kicker">{questToast.kicker}</span>
            <span className="quest-toast-text">{questToast.text}</span>
          </div>
        </div>
      )}

      {/* 6. Ana Canvas Ekranı (Crisp Pixel-Art Rendering) */}
      <canvas
        ref={canvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        className="world-canvas"
        tabIndex={0}
        role="application"
        aria-label="Şehrin Yarını şehir oyun alanı. WASD veya ok tuşlarıyla hareket et."
        data-player-x={player.x.toFixed(2)}
        data-player-y={player.y.toFixed(2)}
        data-player-facing={player.facing}
        data-player-moving={player.isMoving ? 'true' : 'false'}
        data-current-district={currentDistrict.id}
        data-discovered-districts={[...discoveredDistricts].join(',')}
        data-discovered-solutions={discoveredSolutions.join(',')}
        data-investigated-solutions={investigatedSolutions.join(',')}
        data-selected-plan={pendingPlan.join(',')}
        data-plan-confirmed={planConfirmed ? 'true' : 'false'}
        data-weather-phase={weather.phase}
        data-flood-depth={spatialState.hospitalRoadWaterDepth.toFixed(1)}
        data-spatial-tick={spatialState.tick}
        data-peak-flood-depth={spatialState.metrics.peakHospitalRoadWaterDepth.toFixed(1)}
        data-time-above-threshold={spatialState.metrics.timeAboveRoadThreshold.toFixed(2)}
        data-sponge-captured={spatialState.metrics.spongeCapturedWater.toFixed(1)}
        data-road-passable={spatialState.hospitalRoadPassable ? 'true' : 'false'}
        data-had-road-closure={hadRoadClosure ? 'true' : 'false'}
        data-road-wetness={spatialState.roadWetness.toFixed(3)}
        data-sponge-storage={spatialState.spongeStorage.toFixed(1)}
        data-sponge-operational={spatialState.spongeOperational ? 'true' : 'false'}
        data-interaction-hold-progress={interactionProgress.toFixed(2)}
        data-interaction-hold-active={interactionHold ? 'true' : 'false'}
        data-storm-time={stormElapsedSeconds.toFixed(1)}
        data-rescue-count={rescueCount}
        data-game-mode={gameMode}
        data-movement-locked={isPaused || activeDialog || showHeroModal || chapterWon || chapterOutcome ? 'true' : 'false'}
        onPointerDown={() => canvasRef.current?.focus()}
        style={{ imageRendering: 'pixelated' }}
      />

      {/* 7. İnteraktif Yakınlaşma Bildirimi & Tuş İpucu */}
      {nearbyInteraction && !activeDialog && (
        <div className="world-interaction-prompt">
          <div className="prompt-bubble">
            <span className={`prompt-key ${interactionRequiresHold ? 'prompt-key-hold' : ''}`}>E</span>
            <div className="prompt-content">
              <span className="prompt-label">{nearbyInteraction.label}</span>
              <button
                className={`prompt-action-btn ${interactionRequiresHold ? 'hold-interaction-btn' : ''}`}
                onClick={handleInteractionClick}
                onPointerDown={handleHoldPointerDown}
                onPointerUp={handleHoldPointerUp}
                onPointerCancel={handleHoldPointerCancel}
                onPointerLeave={interactionRequiresHold ? handleHoldPointerCancel : undefined}
                data-hold-interaction={interactionRequiresHold ? 'true' : 'false'}
                data-hold-progress={interactionProgress.toFixed(2)}
                aria-label={interactionRequiresHold ? `${nearbyInteraction.actionText}; basılı tut` : nearbyInteraction.actionText}
              >
                {nearbyInteraction.actionText} {interactionRequiresHold ? '· BASILI TUT' : '↗'}
              </button>
              {interactionRequiresHold && (
                <div className="interaction-hold-feedback" aria-live="polite">
                  <div className="interaction-hold-track">
                    <span style={{ width: `${Math.round(interactionProgress * 100)}%` }} />
                  </div>
                  <span>{interactionProgress > 0 ? `${Math.round(interactionProgress * 100)}%` : 'E basılı tut'}</span>
                </div>
              )}
              {nearbyDefense && nearbyDefenseGuidance && (
                <div className="defense-feedback-card" data-defense-feedback={nearbyDefense.id}>
                  <strong>{nearbyDefense.name} · {nearbyDefense.cost} Kr</strong>
                  <span><b>Etki:</b> {nearbyDefenseGuidance.effect}</span>
                  <span><b>Alan:</b> {nearbyDefenseGuidance.effective}</span>
                  <span><b>Sınır:</b> {nearbyDefenseGuidance.limit}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 7.1. Şehir Sakini Yakınlaşma Bildirimi (Ambient Citizen) */}
      {!nearbyInteraction && nearbyCitizen && !activeDialog && (
        <div className="world-interaction-prompt">
          <div className="prompt-bubble" style={{ borderColor: 'rgba(96, 165, 250, 0.45)' }}>
            <span className="prompt-key" style={{ background: '#2563eb' }}>E</span>
            <div className="prompt-content">
              <span className="prompt-label" style={{ color: '#93c5fd' }}>{nearbyCitizen.name}</span>
              <button
                className="prompt-action-btn"
                onClick={handleInteract}
                style={{ borderColor: 'rgba(96, 165, 250, 0.4)', color: '#bfdbfe' }}
              >
                Dinle 💬
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. Karakter Diyalog Modalı */}
      {activeDialog && (
        <div className="world-dialog-modal">
          <div className="dialog-header">
            <div className={`dialog-avatar-box avatar-${getSpeakerAssetKey(activeDialog.speaker)}`}>
              <img
                src={`/assets/characters/${getSpeakerAssetKey(activeDialog.speaker)}-portrait.png`}
                alt={activeDialog.speaker}
                className="dialog-avatar-img"
              />
            </div>
            <div>
              <span className={`dialog-speaker speaker-${getSpeakerAssetKey(activeDialog.speaker)}`}>
                {activeDialog.speaker}
              </span>
              <h4>{activeDialog.title}</h4>
            </div>
          </div>
          <p className="dialog-text">{activeDialog.text}</p>
          <div className="dialog-actions">
            {activeDialog.actionLabel && (
              <button
                className="primary-button"
                onClick={() => {
                  if (activeDialog.onAction) activeDialog.onAction();
                  else setActiveDialog(null);
                }}
              >
                {activeDialog.actionLabel} <span>↗</span>
              </button>
            )}
            <button className="dialog-close-btn" onClick={() => setActiveDialog(null)}>
              KAPAT
            </button>
          </div>
        </div>
      )}

      {/* 9. Mobil Sanal Joystick & Hızlı Etkileşim Butonu */}
      <div
        className="mobile-joystick-zone"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      >
        <div className="joystick-base">
          <div
            className="joystick-thumb"
            style={{
              transform: `translate(${touchMovement.dx * 35}px, ${touchMovement.dy * 35}px)`,
            }}
          />
        </div>
      </div>

      <div className="mobile-action-zone">
        <button
          className={`mobile-interact-btn ${nearbyInteraction ? 'btn-active' : ''}`}
          onClick={handleInteractionClick}
          onPointerDown={handleHoldPointerDown}
          onPointerUp={handleHoldPointerUp}
          onPointerCancel={handleHoldPointerCancel}
          onPointerLeave={interactionRequiresHold ? handleHoldPointerCancel : undefined}
          data-hold-interaction={interactionRequiresHold ? 'true' : 'false'}
          data-hold-progress={interactionProgress.toFixed(2)}
        >
          <span>E</span>
          <small>{nearbyInteraction ? (interactionRequiresHold ? 'BASILI TUT' : 'ETKİLEŞ') : 'HAREKET'}</small>
        </button>
      </div>

      {/* 10. Gelişmiş Taktik Radar & Yol Haritası */}
      <div className={`world-minimap-card ${showMinimap ? 'minimap-expanded' : 'minimap-collapsed'}`}>
        <div className="minimap-header">
          <span><Compass size={11} /> RADAR • SEKTÖR 04</span>
          <button
            className="minimap-toggle-btn"
            onClick={() => setShowMinimap((visible) => !visible)}
            aria-expanded={showMinimap}
            aria-label={showMinimap ? 'Radarı küçült' : 'Radarı aç'}
          >
            {showMinimap ? '−' : '+'}
          </button>
        </div>
        {showMinimap && (
          <>
            <div className="minimap-body">
              <canvas
                ref={radarCanvasRef}
                width={138}
                height={80}
                className="radar-canvas-view"
              />
            </div>
            <div className="radar-legend-bar">
              <span className="radar-legend-item">
                <i className="radar-dot-sample sample-target" /> Hedef
              </span>
              <span className="radar-legend-item">
                <i className="radar-dot-sample sample-flood" /> Taşkın
              </span>
            </div>
          </>
        )}
      </div>

      {/* 11. Karakter Seçim Modalı (Hero Select) */}
      {showHeroModal && (
        <div className="hero-select-modal-overlay" onClick={() => setShowHeroModal(false)}>
          <div className="hero-select-modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span className="quest-chapter-tag">KARAKTER SEÇİMİ</span>
                <h3 style={{ margin: '4px 0 0 0', fontSize: '18px', color: '#f8fafc' }}>
                  Saha Görevlisi Seçin
                </h3>
              </div>
              <button
                className="dialog-close-btn"
                style={{ padding: '4px 10px' }}
                onClick={() => setShowHeroModal(false)}
              >
                ✕
              </button>
            </div>
            <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>
              İklim Araştırma İstasyonu lideri Dr. Mira ve Şehir Mühendisi Aras ile sahada koordinasyonu yönetecek uzmanınızı seçin.
            </p>
            <div className="hero-select-cards">
              {(Object.values(HEROES) as HeroProfile[]).map((h) => {
                const isSelected = heroType === h.id;
                return (
                  <div
                    key={h.id}
                    className={`hero-card ${isSelected ? 'hero-card-active' : ''}`}
                    onClick={() => {
                      setHeroType(h.id);
                      setShowHeroModal(false);
                      gameAudio.effect('click');
                    }}
                  >
                    <div
                      className="hero-card-sprite-preview"
                      style={{ border: `2px solid ${h.color}` }}
                    >
                      {h.id === 'female' ? '👩‍🔬' : '👷‍♂️'}
                    </div>
                    <div className="hero-card-title">{h.name}</div>
                    <span className="hero-card-badge" style={{ background: h.color + '33', color: '#e2e8f0' }}>
                      {h.role}
                    </span>
                    <p className="hero-card-bio">{h.bio}</p>
                    <button
                      className="primary-button"
                      style={{
                        width: '100%',
                        marginTop: 'auto',
                        padding: '6px 10px',
                        fontSize: '11px',
                        background: isSelected ? '#38bdf8' : 'rgba(255,255,255,0.08)',
                        color: isSelected ? '#0b1522' : '#f1f5f9',
                      }}
                    >
                      {isSelected ? '✓ SEÇİLİ' : 'SEÇ'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {achievementNotice && !activeDialog && (
        <div className="achievement-unlock-toast" role="status">
          <img src={getAchievementAsset(achievementNotice)} alt="" />
          <div><small>ROZET KAZANILDI</small><strong>{ACHIEVEMENTS.find((achievement) => achievement.id === achievementNotice)?.title}</strong></div>
          <button aria-label="Rozet bildirimini kapat" onClick={() => setAchievementNotice(null)}>×</button>
        </div>
      )}

      {isPaused && !chapterOutcome && (
        <div className="world-pause-overlay" role="dialog" aria-label="Oyun duraklatıldı">
          <div className="world-pause-card">
            <BrandLogo variant="compact" className="pause-brand-logo" />
            <div className="chapter-result-kicker">ŞEHRİN YARINI · DURAKLATILDI</div>
            <h2>Bir nefes al.</h2>
            <p>Fırtına simülasyonu, macera süresi ve kontroller beklemede.</p>
            <button className="primary-button" onClick={() => setIsPaused(false)}>OYUNA DÖN</button>
            <button className="text-button" onClick={onBackToMenu}>BÖLÜM MENÜSÜ</button>
          </div>
        </div>
      )}

      {chapterOutcome && outcomePresentation && (
        <div className={`chapter-result-modal ${chapterOutcome.success ? 'result-success' : 'result-failure'} ${endingVisible ? 'ending-modal' : 'result-modal-ready'}`}>
          {endingVisible ? (
            <div className={`chapter-result-card ending-sequence-card ending-${outcomePresentation.tone}`} data-chapter-outcome={chapterOutcome.success ? 'success' : 'failure'}>
              <div
                className={`ending-scene-strip ending-road-${spatialState.hospitalRoadPassable ? 'open' : 'closed'}`}
                data-ending-tone={outcomePresentation.tone}
                data-road-state={spatialState.hospitalRoadPassable ? 'open' : 'closed'}
                data-water-depth={spatialState.hospitalRoadWaterDepth.toFixed(1)}
              >
                <span className="ending-sun" />
                <span className="ending-mountain ending-mountain-a" />
                <span className="ending-mountain ending-mountain-b" />
                <span className="ending-road"><i style={{ width: `${Math.min(100, Math.max(4, spatialState.hospitalRoadWaterDepth * 2.2))}%` }} /></span>
                <span className="ending-hospital-cross">+</span>
                <span className="ending-ambulance" aria-label={spatialState.hospitalRoadPassable ? 'Ambulans geçişi açık' : 'Ambulans geçişi kapalı'}>✚</span>
                <span className="ending-recorded-badge">GERÇEK SİMÜLASYON KAYDI</span>
              </div>
              <BrandLogo variant="compact" className="result-brand-logo" />
              <div className="chapter-result-kicker">BÖLÜM 1 · GERÇEK OYUN SONUCU</div>
              <h2>{outcomePresentation.title}</h2>
              <p>{outcomePresentation.subtitle}</p>
              <div className="ending-state-note"><Sparkles size={14} /><span>{outcomePresentation.detail}</span></div>
              <div className="ending-real-state">
                <span>HASTANE YOLU: <b>{spatialState.hospitalRoadPassable ? 'AÇIK' : 'KAPALI'}</b></span>
                <span>SU: <b>{spatialState.hospitalRoadWaterDepth} cm</b></span>
                <span>HAVA: <b>{weatherPhaseLabel(weather.phase)}</b></span>
              </div>
              <button className="text-button ending-skip-button" onClick={skipEnding}>SONUCU GÖR <ArrowLeft size={13} /></button>
            </div>
          ) : (
            <div className="chapter-result-card" data-chapter-outcome={chapterOutcome.success ? 'success' : 'failure'}>
              <BrandLogo variant="compact" className="result-brand-logo" />
              <div className="chapter-result-kicker">BÖLÜM 1 · YAMAÇ HASTANESİ</div>
              <div className="chapter-result-icon">{chapterOutcome.success ? '✦' : '!'}</div>
              <h2>{outcomePresentation.title}</h2>
              <p>{chapterOutcome.success ? chapterOutcome.reason : 'Bu kez şehri koruyamadık. Ama yeniden deneyebilirsin!'}</p>
              <div className="result-stars" aria-label={`${chapterOutcome.stars} yıldız`}>
                {[1, 2, 3].map((star) => <span key={star}><img src={star <= chapterOutcome.stars ? BRAND_ASSETS.stars.earned : BRAND_ASSETS.stars.empty} className={star <= chapterOutcome.stars ? 'earned' : ''} alt={star <= chapterOutcome.stars ? 'Kazanılmış yıldız' : 'Boş yıldız'} /><span className="star-readable">★</span></span>)}
              </div>
              <div className="chapter-result-grid">
                <span>HASTANE YOLU <b>{spatialState.hospitalRoadPassable ? 'AÇIK' : 'KAPALI'}</b></span>
                <span>SU DERİNLİĞİ <b>{spatialState.hospitalRoadWaterDepth} cm</b></span>
                <span>KALAN BÜTÇE <b>{BUDGET - budgetUsed} Kr</b></span>
                <span>RESCUE <b>{rescueCount}</b></span>
                {gameMode === 'adventure' && <span>SÜRE <b>{Math.floor(stormElapsedSeconds)} sn</b></span>}
                <span>EN İYİ <b>{chapterRecord?.bestStars ?? chapterOutcome.stars} ★</b></span>
              </div>
              <div className="chapter-comparison-reveal" aria-label="Gerçek simülasyon öncesi sonrası karşılaştırması">
                <div className="chapter-comparison-heading">AYNI HASTANE YOLU · GERÇEK SİMÜLASYON KAYDI</div>
                <div className="chapter-comparison-bars">
                  <div><span>MÜDAHALE ÖNCESİ <b>{recordedPeakWater.toFixed(1)} cm</b></span><i style={{ width: `${Math.min(100, (recordedPeakWater / comparisonScale) * 100)}%` }} /></div>
                  <div><span>MÜDAHALE SONRASI <b>{recordedCurrentWater.toFixed(1)} cm</b></span><i className="after" style={{ width: `${Math.min(100, (recordedCurrentWater / comparisonScale) * 100)}%` }} /></div>
                </div>
              </div>
              {endingNewBadges.length > 0 && (
                <div className="result-new-badges">
                  <small>BU OYUNDA KAZANILAN ROZETLER</small>
                  <div>{endingNewBadges.map((id) => { const badge = ACHIEVEMENTS.find((item) => item.id === id); return badge ? <span key={id}><img src={getAchievementAsset(id)} alt="" />{badge.title}</span> : null; })}</div>
                </div>
              )}
              <div className="chapter-result-actions">
                <button className="primary-button" onClick={handleResetQuest}>YENİDEN DENE ↻</button>
                <button className="secondary-button" onClick={onBackToMenu}>BÖLÜM MENÜSÜ</button>
                {!chapterOutcome.success && <button className="text-button" onClick={() => { setChapterOutcome(null); setShowEkoHint(true); }}>İPUCU AL</button>}
                {chapterOutcome.success && <button className="secondary-button" onClick={() => { setChapterOutcome(null); setChapterWon(false); }}>ŞEHRİ GEZ</button>}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

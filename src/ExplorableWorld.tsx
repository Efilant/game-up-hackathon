import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  Compass,
  Volume2,
  VolumeX,
  ArrowLeft,
  Shield,
  CheckCircle,
  AlertTriangle,
  Navigation,
  Sparkles,
  RotateCcw,
  User,
} from 'lucide-react';
import { gameAudio } from './audio';
import { BUDGET, DEFENSES, type DefenseId } from './simulation';
import {
  createInitialSpatialState,
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
  drawGoldenQuestTrail,
  type WorldRenderContext,
} from './pixelWorldRenderer';
import {
  findNavRoute,
  getOffScreenIndicator,
  getEkoContextualHint,
  calculateDistanceMeters,
  type Point2D,
  type ObstacleBox,
  type OffScreenIndicator,
} from './navigation';
import {
  createInitialAmbientCitizens,
  updateAmbientCitizens,
  drawPixelCitizen,
  type AmbientCitizen,
} from './ambientCitizens';

interface ExplorableWorldProps {
  onBackToMenu: () => void;
  onOpenStrategy?: () => void;
  muted: boolean;
  onToggleMute: () => void;
}

export type HeroId = 'female' | 'male';

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
    | 'road_inspection'
    | 'eko_terminal'
    | 'hospital';
  defenseId?: DefenseId;
}

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
    title: 'Savunma İnşa Et',
    description: 'Kuzey terastaki patikadan Sünger Kent sahasına çık ve su tutma göletini inşa et.',
    targetX: 1160,
    targetY: 340,
    targetLabel: 'SÜNGER KENT SAHASI',
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
  onOpenStrategy,
  muted,
  onToggleMute,
}: ExplorableWorldProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Ekran Boyutu (Responsive Resize)
  const [canvasSize, setCanvasSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1280,
    height: typeof window !== 'undefined' ? window.innerHeight : 720,
  });

  useEffect(() => {
    const handleResize = () => {
      setCanvasSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
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
  const [chapterWon, setChapterWon] = useState(false);

  // Oyuncu Karakteri (Seçilen Kahraman)
  const [player, setPlayer] = useState({
    x: 650,
    y: 560,
    vx: 0,
    vy: 0,
    facing: 'up' as 'down' | 'up' | 'left' | 'right',
    isMoving: false,
    frame: 0,
  });

  const [activeDefenses, setActiveDefenses] = useState<DefenseId[]>([]);
  const [budgetUsed, setBudgetUsed] = useState(0);
  const [nearbyInteraction, setNearbyInteraction] = useState<InteractionPoint | null>(null);

  // Yaşayan Şehir Sakinleri (Ambient Citizens)
  const [citizens] = useState<AmbientCitizen[]>(() => createInitialAmbientCitizens());
  const citizensRef = useRef<AmbientCitizen[]>(citizens);
  citizensRef.current = citizens;
  const [nearbyCitizen, setNearbyCitizen] = useState<AmbientCitizen | null>(null);

  // 7 Aşamalı Rehberli Görev Sistemi
  const [questStep, setQuestStep] = useState<QuestStepId>(1);
  const currentQuest = QUEST_STEPS[questStep];

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

  const [stormActive, setStormActive] = useState(false);
  const [spatialState, setSpatialState] = useState<SpatialSimulationState>(() =>
    createInitialSpatialState([])
  );

  // Radar Canvas Referansı
  const radarCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Mobil Dokunmatik Joystick
  const [touchMovement, setTouchMovement] = useState({ dx: 0, dy: 0, active: false });
  const joystickBaseRef = useRef<{ startX: number; startY: number } | null>(null);

  // Dünya Sabitleri
  const WORLD_WIDTH = 2200;
  const WORLD_HEIGHT = 1500;
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

  // Sokak Lambaları
  const streetLamps = useMemo(() => [
    { x: 1260, y: 480 },
    { x: 1390, y: 410 },
    { x: 1060, y: 670 },
    { x: 780, y: 710 },
  ], []);

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

  // LocalStorage Kayıt Yükleme
  useEffect(() => {
    try {
      const saved = localStorage.getItem(SAVE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        if (data.questStep && data.questStep >= 1 && data.questStep <= 7) {
          setQuestStep(data.questStep as QuestStepId);
        }
        if (data.heroType === 'female' || data.heroType === 'male') {
          setHeroType(data.heroType);
        }
        if (data.player && typeof data.player.x === 'number') {
          setPlayer((prev) => ({
            ...prev,
            x: data.player.x,
            y: data.player.y,
            facing: data.player.facing || 'down',
          }));
        }
        if (Array.isArray(data.activeDefenses) && data.activeDefenses.length > 0) {
          setActiveDefenses(data.activeDefenses);
          setBudgetUsed(data.budgetUsed || 0);
          setSpatialState(
            stepSpatialSimulation(createInitialSpatialState(data.activeDefenses), data.activeDefenses)
          );
        }
        if (data.stormActive) {
          setStormActive(true);
        }
        if (data.chapterWon) {
          setChapterWon(true);
        }
      }
    } catch (e) {
      console.warn('LocalStorage restore failed:', e);
    }
  }, []);

  // LocalStorage Otomatik Kaydetme
  useEffect(() => {
    try {
      const payload = {
        questStep,
        heroType,
        player: { x: player.x, y: player.y, facing: player.facing },
        activeDefenses,
        budgetUsed,
        stormActive,
        chapterWon,
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
      localStorage.setItem('felaket_benim_hero', heroType);
    } catch (_) {}
  }, [questStep, heroType, player.x, player.y, player.facing, activeDefenses, budgetUsed, stormActive, chapterWon]);

  // Görevi Baştan Başlatma (Reset)
  const handleResetQuest = useCallback(() => {
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch (_) {}
    setQuestStep(1);
    setPlayer({
      x: 650,
      y: 560,
      vx: 0,
      vy: 0,
      facing: 'up',
      isMoving: false,
      frame: 0,
    });
    setActiveDefenses([]);
    setBudgetUsed(0);
    setStormActive(false);
    setChapterWon(false);
    setSpatialState(createInitialSpatialState([]));
    setShowEkoHint(false);
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

  // Kamera Koordinatları
  const camX = Math.max(0, Math.min(WORLD_WIDTH - canvasSize.width, player.x - canvasSize.width / 2));
  const camY = Math.max(0, Math.min(WORLD_HEIGHT - canvasSize.height, player.y - canvasSize.height / 2));

  // Ekran Dışı Yön Ok Göstergesi
  const offScreenIndicator = useMemo<OffScreenIndicator>(() => {
    return getOffScreenIndicator(targetPoint, { camX, camY }, canvasSize, 56);
  }, [targetPoint, camX, camY, canvasSize]);

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

  // Savunma İnşa Etme / Kaldırma İşlevi
  const toggleWorldDefense = useCallback((id: DefenseId) => {
    const defense = DEFENSES.find((d) => d.id === id)!;
    if (!activeDefenses.includes(id)) {
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
      setActiveDefenses(nextDefenses);
      setBudgetUsed((prev) => prev + defense.cost);
      setSpatialState((prev) => stepSpatialSimulation(prev, nextDefenses));

      if (questStep === 5) {
        triggerQuestAdvance(6, `${defense.name} inşa edildi! Hastane yolundaki suyun çekilmesini doğrula.`);
        setActiveDialog({
          speaker: 'ARAS',
          title: 'SÜNGER KENT GÖLETİ TAMAMLANDI!',
          text: `${defense.name} başarıyla inşa edildi! Yamaç yüzey akışı gölete yönlendirildi ve taşkın debisi kesildi. Altın izi takip ederek aşağıdaki hastane yoluna in ve ambulans koridorunun açıldığını doğrula!`,
          actionLabel: 'Yolu Denetle',
          onAction: () => setActiveDialog(null),
        });
      }
    } else {
      gameAudio.effect('click');
      const nextDefenses = activeDefenses.filter((x) => x !== id);
      setActiveDefenses(nextDefenses);
      setBudgetUsed((prev) => prev - defense.cost);
      setSpatialState((prev) => stepSpatialSimulation(prev, nextDefenses));
    }
  }, [activeDefenses, budgetUsed, questStep, triggerQuestAdvance]);

  // Etkileşim Butonuna / E Tuşuna Basıldığında
  const handleInteract = useCallback(() => {
    gameAudio.unlock();
    if (!nearbyInteraction) {
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

    switch (nearbyInteraction.type) {
      case 'npc_mira':
        if (questStep === 1) {
          triggerQuestAdvance(2, 'Saha görevi alındı! Hastane yolundaki menfezi incele.');
          setActiveDialog({
            speaker: 'MİRA',
            title: 'KRİTİK İKLİM UYARISI',
            text: `Hoş geldin ${HEROES[heroType].name}! Meteoroloji radarı 88 mm/saatlik süper hücre fırtınasının yamaç havzasına indiğini gösteriyor. Şehir Hastanesi Acil Servis yolu en savunmasız noktamız. Altın rota izini takip ederek hastane yolundaki drenaj menfezini acilen incele ve kapasite durumunu bildir!`,
            actionLabel: 'Menfezi İncelemeye Git',
            onAction: () => setActiveDialog(null),
          });
        } else if (questStep === 7) {
          gameAudio.effect('victory');
          setChapterWon(true);
          setActiveDialog({
            speaker: 'MİRA',
            title: '🏆 BÖLÜM 1 ZAFERİ: HASTANE YOLU KURTARILDI!',
            text: `Olağanüstü bir başarı ${HEROES[heroType].name}! Sünger Kent göleti yamaç yüzey akışını %60 oranında tuttu. Yol üzerindeki su seviyesi 14.2 cm'ye düştü ve ambulans koridoru kesintisiz açık kaldı. Şehri ve hastanedeki insanları kurtardın!`,
            actionLabel: 'Zafer Raporunu İncele',
            onAction: () => setActiveDialog(null),
          });
        } else {
          setActiveDialog({
            speaker: 'MİRA',
            title: 'İKLİM ARAŞTIRMA İSTASYONU',
            text: `Fırtına havzada ilerliyor ${HEROES[heroType].name}. Aktif hedefin: ${currentQuest.title}. Altın rota izini takip etmeye devam et!`,
          });
        }
        break;

      case 'drainage':
        if (questStep === 2) {
          triggerQuestAdvance(3, 'Menfez yetersizliği tespit edildi! Mühendis Aras ile görüş.');
          setActiveDialog({
            speaker: 'EKO',
            title: 'DRENAJ KAPASİTE RAPORU',
            text: 'Menfez ızgarası yaprak ve çamurla kısmen tıkanmış durumda! Mevcut tahliye kapasitesi yalnızca 18 mm/tick, oysa yamaçtan beklenen akış 45 mm/tick! Şantiye yol ayrımındaki Saha Mühendisi Aras ile derhal görüşmelisin!',
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
          triggerQuestAdvance(4, 'Mühendislik planı hazır! Fırtınanın gelişini gözlemle.');
          setActiveDialog({
            speaker: 'ARAS',
            title: 'MÜHENDİSLİK RİSK PLANI',
            text: `Raporu inceledim ${HEROES[heroType].name}. Bu menfez tek başına çöker! Fırtına başladığı anda aşağıdaki yol çukuru 30 cm suyla dolup ambulansları durduracak. Hemen aşağıdaki taşkın gözlem noktasına geç ve suyun yükselişini gözlemle!`,
            actionLabel: 'Gözlem Noktasına Git',
            onAction: () => setActiveDialog(null),
          });
        } else if (questStep === 5) {
          setActiveDialog({
            speaker: 'ARAS',
            title: 'MÜDAHALE ÖNERİSİ',
            text: 'Yol çukurundaki su 30 cm kritik seviyeyi aştı! Yukarı terastaki Sünger Kent sahasına çıkıp su tutma göletini inşa etmelisin!',
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
          gameAudio.effect('thunder');
          triggerQuestAdvance(5, '88 mm/saat fırtına başladı! Sünger Kent sahasına çık.');
          setActiveDialog({
            speaker: 'EKO',
            title: '🚨 ALARM: FIRTINA PATLADI!',
            text: '88 mm/saat süper hücre fırtınası başladı! Yamaç akışı yol çukurunda toplandı, su derinliği 38.5 cm’ye ulaştı ve ambulans geçişi kesildi! Doğrudan yoldan geçiş imkansız. Kuzey terastaki güvenli patikadan Sünger Kent sahasına çık ve su tutma göletini inşa et!',
            actionLabel: 'Sünger Kent Sahasına Çık',
            onAction: () => setActiveDialog(null),
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
        if (nearbyInteraction.defenseId) {
          toggleWorldDefense(nearbyInteraction.defenseId);
        }
        break;

      case 'road_inspection':
        if (questStep === 6) {
          if (spatialState.hospitalRoadPassable && spatialState.hospitalRoadWaterDepth < 20) {
            triggerQuestAdvance(7, 'Ambulans koridoru açıldı! Mira\'ya zafer raporu ver.');
            gameAudio.effect('victory');
            setActiveDialog({
              speaker: 'EKO',
              title: '✓ YOL DURUMU: GEÇİLEBİLİR!',
              text: 'Sünger Kent Göleti yamaç akışını doğaya emdirerek yol su derinliğini 14.2 cm’ye indirdi! Ambulans sireni duyuluyor, acil servis koridoru tamamen açık! Zafer raporunu bildirmek için İklim Araştırma İstasyonu’ndaki Mira’ya dön!',
              actionLabel: 'Mira\'ya Dön',
              onAction: () => setActiveDialog(null),
            });
          } else {
            setActiveDialog({
              speaker: 'EKO',
              title: 'YOL HALA TAŞKIN ALTINDA',
              text: `Su derinliği ${spatialState.hospitalRoadWaterDepth} cm (güvenli eşik: <20 cm). Yukarı terastaki Sünger Kent göletini inşa etmeden yol açılamaz!`,
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
    nearbyInteraction,
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
  ]);

  // Klavye Kontrolleri
  const keysDown = useRef<Record<string, boolean>>({});

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      keysDown.current[e.key.toLowerCase()] = true;
      if (e.key === 'e' || e.key === 'E') {
        handleInteract();
      }
      if (e.key === 'Escape') {
        setActiveDialog(null);
        setShowEkoHint(false);
      }
      if (e.key === 'h' || e.key === 'H') {
        setShowEkoHint((prev) => !prev);
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keysDown.current[e.key.toLowerCase()] = false;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [handleInteract]);

  // Fırtına Aktifken Simülasyon Adımları
  useEffect(() => {
    if (!stormActive) return;
    const interval = setInterval(() => {
      setSpatialState((prev) => stepSpatialSimulation(prev, activeDefenses));
    }, 150);
    return () => clearInterval(interval);
  }, [stormActive, activeDefenses]);

  // (Otomatik zorunlu ilerleme kaldırıldı — Oyuncu dünyada serbestçe yürüyüp hedeflerle doğrudan etkileşime geçer)

  // Ana Oyun Döngüsü & Canvas Çizimi (60 FPS Pixel Art)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let lastTime = performance.now();
    let stepCount = 0;

    const gameLoop = (currentTime: number) => {
      const dt = Math.min(0.05, (currentTime - lastTime) / 1000);
      lastTime = currentTime;
      const timeInSec = currentTime * 0.001;

      // 1. Oyuncu Hareketi (Klavye + Sanal Joystick)
      let dx = 0;
      let dy = 0;

      if (keysDown.current['w'] || keysDown.current['arrowup']) dy -= 1;
      if (keysDown.current['s'] || keysDown.current['arrowdown']) dy += 1;
      if (keysDown.current['a'] || keysDown.current['arrowleft']) dx -= 1;
      if (keysDown.current['d'] || keysDown.current['arrowright']) dx += 1;

      if (touchMovement.active) {
        dx = touchMovement.dx;
        dy = touchMovement.dy;
      }

      // Normalizasyon
      const len = Math.hypot(dx, dy);
      let isMoving = false;
      let facing = player.facing;

      if (len > 0.1) {
        isMoving = true;
        const normDx = dx / len;
        const normDy = dy / len;
        const speed = 210; // px/s

        let nextX = player.x + normDx * speed * dt;
        let nextY = player.y + normDy * speed * dt;

        if (Math.abs(normDx) > Math.abs(normDy)) {
          facing = normDx > 0 ? 'right' : 'left';
        } else {
          facing = normDy > 0 ? 'down' : 'up';
        }

        // Çarpışma Tespiti
        const playerRadius = 14;
        let collidedX = false;
        let collidedY = false;

        for (const obs of obstacles) {
          if (
            nextX + playerRadius > obs.x &&
            nextX - playerRadius < obs.x + obs.w &&
            player.y + playerRadius > obs.y &&
            player.y - playerRadius < obs.y + obs.h
          ) {
            collidedX = true;
          }
          if (
            player.x + playerRadius > obs.x &&
            player.x - playerRadius < obs.x + obs.w &&
            nextY + playerRadius > obs.y &&
            nextY - playerRadius < obs.y + obs.h
          ) {
            collidedY = true;
          }
        }

        const finalX = collidedX
          ? player.x
          : Math.max(playerRadius, Math.min(WORLD_WIDTH - playerRadius, nextX));
        const finalY = collidedY
          ? player.y
          : Math.max(playerRadius, Math.min(WORLD_HEIGHT - playerRadius, nextY));

        stepCount += dt * 10;

        setPlayer({
          x: finalX,
          y: finalY,
          vx: normDx * speed,
          vy: normDy * speed,
          facing,
          isMoving,
          frame: Math.floor(stepCount) % 4,
        });
      } else {
        setPlayer((prev) => ({ ...prev, isMoving: false }));
      }

      // 2. Yakın Etkileşim Kontrolü
      let closest: InteractionPoint | null = null;
      let minDist = Infinity;
      for (const pt of interactionPoints) {
        const d = Math.hypot(player.x - pt.x, player.y - pt.y);
        if (d < pt.radius && d < minDist) {
          closest = pt;
          minDist = d;
        }
      }
      setNearbyInteraction(closest);

      // 2.1. Yakın Şehir Sakini Kontrolü (Ambient Citizen)
      let closestCit: AmbientCitizen | null = null;
      if (!closest) {
        let minCitD = 48;
        for (const c of citizensRef.current) {
          const d = Math.hypot(player.x - c.x, player.y - c.y);
          if (d < minCitD) {
            closestCit = c;
            minCitD = d;
          }
        }
      }
      setNearbyCitizen(closestCit);

      // 2.2. Yaşayan Şehir Sakinlerini Güncelle (Ambient Citizens System)
      updateAmbientCitizens(citizensRef.current, dt, {
        stormActive,
        roadWaterDepth: spatialState.hospitalRoadWaterDepth,
        roadPassable: spatialState.hospitalRoadPassable,
        hasSpongeDefense: activeDefenses.includes('sünger'),
        chapterWon,
        obstacles,
        playerX: player.x,
        playerY: player.y,
      });

      // 3. Akıllı A* Yol Çıkarımı (Smart Navigation Route)
      const currentRoute = findNavRoute(
        { x: player.x, y: player.y },
        targetPoint,
        obstacles,
        spatialState.hospitalRoadWaterDepth
      );

      // 4. ÇİZİM (Pixel-Art Rendering)
      const width = canvas.width;
      const height = canvas.height;

      // Kamera
      const curCamX = Math.max(0, Math.min(WORLD_WIDTH - width, player.x - width / 2));
      const curCamY = Math.max(0, Math.min(WORLD_HEIGHT - height, player.y - height / 2));

      ctx.save();
      ctx.translate(-curCamX, -curCamY);

      const renderCtx: WorldRenderContext = {
        ctx,
        time: timeInSec,
        camX: curCamX,
        camY: curCamY,
        viewWidth: width,
        viewHeight: height,
        activeDefenses,
        roadWaterDepth: spatialState.hospitalRoadWaterDepth,
        roadPassable: spatialState.hospitalRoadPassable,
        stormActive,
        questStep,
        targetObjective: currentQuest
          ? { x: currentQuest.targetX, y: currentQuest.targetY, label: currentQuest.targetLabel }
          : null,
      };

      // A. Piksel Karo Haritası & Yollar & Taşkın Katmanı
      drawPixelWorldMap(renderCtx, WORLD_WIDTH, WORLD_HEIGHT);

      // B. Altın Görev İzi (Golden Quest Trail) — Dinamik A* Rota & Parçacık Akışı
      drawGoldenQuestTrail(
        ctx,
        currentRoute,
        { x: player.x, y: player.y },
        timeInSec,
        Math.hypot(player.x - targetPoint.x, player.y - targetPoint.y)
      );

      // C. Altyapı ve İnteraktif Zemin Nesneleri
      // Drenaj Menfezi
      drawPixelStormGrate(
        ctx,
        1290,
        510,
        questStep >= 4,
        spatialState.hospitalRoadWaterDepth
      );

      // Sünger Kent İnşa Alanı
      drawPixelInterventionSite(
        ctx,
        1160,
        340,
        activeDefenses.includes('sünger'),
        'sponge',
        timeInSec
      );

      // Yükseltilmiş Menfez İnşa Alanı
      drawPixelInterventionSite(
        ctx,
        1340,
        530,
        activeDefenses.includes('dönüşüm'),
        'retrofit',
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
            stormActive,
            spatialState.hospitalRoadPassable
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
        baseY: player.y + 16,
        draw: () => drawPixelHero(ctx, player, heroType, timeInSec),
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
      if (currentQuest) {
        drawPixelQuestWaypoint(
          ctx,
          currentQuest.targetX,
          currentQuest.targetY,
          currentQuest.targetLabel,
          timeInSec,
          questStep
        );
      }

      // F. Fırtına Yağmur Parçacıkları
      if (stormActive) {
        ctx.strokeStyle = 'rgba(186, 230, 253, 0.45)';
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 120; i++) {
          const rx = (i * 47 + timeInSec * 700) % width + curCamX;
          const ry = (i * 31 + timeInSec * 1300) % height + curCamY;
          ctx.beginPath();
          ctx.moveTo(rx, ry);
          ctx.lineTo(rx - 8, ry + 20);
          ctx.stroke();
        }
      }

      ctx.restore();

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
          if (spatialState.hospitalRoadWaterDepth > 28) {
            rctx.fillStyle = 'rgba(239, 68, 68, 0.65)';
            rctx.fillRect(1140 * sx, 480 * sy, 180 * sx, 100 * sy);
          }

          // Bina Silüetleri
          rctx.fillStyle = 'rgba(30, 41, 59, 0.85)';
          for (const obs of obstacles) {
            rctx.fillRect(obs.x * sx, obs.y * sy, obs.w * sx, obs.h * sy);
          }

          // Aktif Altın Rota İzi Önizlemesi
          if (currentRoute && currentRoute.length >= 2) {
            rctx.strokeStyle = '#fbbf24';
            rctx.lineWidth = 1.6;
            rctx.beginPath();
            rctx.moveTo(player.x * sx, player.y * sy);
            for (let i = 1; i < currentRoute.length; i++) {
              rctx.lineTo(currentRoute[i].x * sx, currentRoute[i].y * sy);
            }
            rctx.stroke();
          }

          // Aktif Görev Hedef Noktası (Yanıp Sönen Sarı Nokta)
          const targetPulse = 0.8 + 0.3 * Math.sin(timeInSec * 6);
          rctx.fillStyle = '#f59e0b';
          rctx.beginPath();
          rctx.arc(targetPoint.x * sx, targetPoint.y * sy, 3.5 * targetPulse, 0, Math.PI * 2);
          rctx.fill();

          // Oyuncu Noktası (Mavi Işık)
          rctx.fillStyle = '#38bdf8';
          rctx.beginPath();
          rctx.arc(player.x * sx, player.y * sy, 3, 0, Math.PI * 2);
          rctx.fill();
        }
      }

      animId = requestAnimationFrame(gameLoop);
    };

    animId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animId);
  }, [
    player,
    obstacles,
    trees,
    streetLamps,
    interactionPoints,
    nearbyInteraction,
    activeDefenses,
    spatialState,
    stormActive,
    touchMovement,
    questStep,
    currentQuest,
    targetPoint,
    heroType,
    chapterWon,
  ]);

  // Sanal Joystick Touch Eventleri (Mobil için)
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const touch = e.touches[0];
    joystickBaseRef.current = { startX: touch.clientX, startY: touch.clientY };
    setTouchMovement({ dx: 0, dy: 0, active: true });
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!joystickBaseRef.current) return;
    const touch = e.touches[0];
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

  return (
    <div className="explorable-world-container">
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
        </div>

        <div className="hud-status-group">
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
          {onOpenStrategy && (
            <button className="hud-strategy-btn" onClick={onOpenStrategy}>
              <Shield size={14} /> TAKTİK HARİTA
            </button>
          )}
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
      <div className="quest-tracker-card">
        <div className="quest-tracker-header">
          <span className="quest-chapter-tag">BÖLÜM 1: YAMAÇ HASTANESİ</span>
          <span className="quest-step-pill">{currentQuest.kicker}</span>
        </div>
        <div className="quest-tracker-title">
          <span>⚔️</span> {currentQuest.title}
        </div>
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

      {/* 4. Ekran Dışı Yön Oku (Off-Screen Compass Direction Arrow) */}
      {offScreenIndicator.isOffScreen && (
        <div
          className="offscreen-compass-arrow"
          style={{
            left: `${offScreenIndicator.screenX}px`,
            top: `${offScreenIndicator.screenY}px`,
          }}
          onClick={() => setShowEkoHint(true)}
          title={`${currentQuest.targetLabel} yönü — İpucu için tıkla`}
        >
          <div
            className="compass-chevron"
            style={{ transform: `rotate(${offScreenIndicator.angleDeg}deg)` }}
          >
            <Navigation size={18} />
          </div>
          <div className="compass-label-pill">
            <span>{currentQuest.targetLabel}</span>
            <strong>{offScreenIndicator.distanceMeters} m</strong>
          </div>
        </div>
      )}

      {/* 5. Görev Geçiş ve Başarı Toast Bildirimi */}
      {questToast && (
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
        style={{ imageRendering: 'pixelated' }}
      />

      {/* 7. İnteraktif Yakınlaşma Bildirimi & Tuş İpucu */}
      {nearbyInteraction && !activeDialog && (
        <div className="world-interaction-prompt">
          <div className="prompt-bubble">
            <span className="prompt-key">E</span>
            <div className="prompt-content">
              <span className="prompt-label">{nearbyInteraction.label}</span>
              <button className="prompt-action-btn" onClick={handleInteract}>
                {nearbyInteraction.actionText} ↗
              </button>
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
            <div className={`dialog-avatar-box avatar-${activeDialog.speaker.toLowerCase()}`}>
              <img
                src={`/assets/characters/${activeDialog.speaker.toLowerCase()}-portrait.png`}
                alt={activeDialog.speaker}
                className="dialog-avatar-img"
              />
            </div>
            <div>
              <span className={`dialog-speaker speaker-${activeDialog.speaker.toLowerCase()}`}>
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
          onClick={handleInteract}
        >
          <span>E</span>
          <small>{nearbyInteraction ? 'ETKİLEŞ' : 'HAREKET'}</small>
        </button>
      </div>

      {/* 10. Gelişmiş Taktik Radar & Yol Haritası */}
      <div className="world-minimap-card">
        <div className="minimap-header">
          <Compass size={11} /> RADAR • SEKTÖR 04
        </div>
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
            <i className="radar-dot-sample sample-route" /> Rota
          </span>
          <span className="radar-legend-item">
            <i className="radar-dot-sample sample-flood" /> Taşkın
          </span>
        </div>
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

      {/* 12. Bölüm 1 Zafer Modalı */}
      {chapterWon && (
        <div className="chapter-victory-modal">
          <div className="chapter-victory-card">
            <div className="victory-badge-icon">🏆</div>
            <span className="quest-chapter-tag" style={{ alignSelf: 'center' }}>
              BÖLÜM 1 TAMAMLANDI
            </span>
            <h2 style={{ margin: '4px 0', fontSize: '22px', color: '#4ade80' }}>
              YAMAÇ HASTANESİ KURTARILDI!
            </h2>
            <p style={{ margin: 0, fontSize: '13px', color: '#cbd5e1', lineHeight: 1.5 }}>
              Tebrikler <strong>{HEROES[heroType].name}</strong>! Kurduğun doğa tabanlı sünger gölet altyapısı sayesinde 88 mm/saatlik sel felaketi engellendi. Hastane acil servis yolu açık tutuldu.
            </p>
            <div className="victory-stats-grid">
              <div className="victory-stat-item">
                <small>HASTANE YOLU DURUMU</small>
                <strong>✓ AÇIK (GÜVENLİ)</strong>
              </div>
              <div className="victory-stat-item">
                <small>YOL SU DERİNLİĞİ</small>
                <strong>{spatialState.hospitalRoadWaterDepth} cm (&lt;30 cm)</strong>
              </div>
              <div className="victory-stat-item">
                <small>KALAN KAMU BÜTÇESİ</small>
                <strong>{BUDGET - budgetUsed} / 100 Kr</strong>
              </div>
              <div className="victory-stat-item">
                <small>KURULAN SAVUNMALAR</small>
                <strong>{activeDefenses.length} Sistem Aktif</strong>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                className="secondary-button"
                style={{ flex: 1, padding: '10px' }}
                onClick={() => setChapterWon(false)}
              >
                Şehri Serbestçe Gez
              </button>
              <button
                className="primary-button"
                style={{ flex: 1, padding: '10px' }}
                onClick={onBackToMenu}
              >
                Ana Menüye Dön ↗
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

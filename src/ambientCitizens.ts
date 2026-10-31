/**
 * FELAKET BENİM — Living City Ambient Civilian NPC System
 * Lightweight, believable pixel-art citizens that inhabit the city,
 * react dynamically to weather & flooding, and speak contextual speech bubbles.
 */

import { type ObstacleBox, pointCollidesWithObstacle, pointInFloodedRoadZone } from './navigation';

export type CitizenType =
  | 'adult'
  | 'elder'
  | 'student'
  | 'worker'
  | 'hospital_visitor'
  | 'market_visitor';

export type CitizenState =
  | 'walk'
  | 'idle'
  | 'chat'
  | 'hurry'
  | 'react'
  | 'observe'
  | 'evacuate';

export interface CitizenPalette {
  body: string;
  pants: string;
  hair: string;
  accessory?: string;
  skin?: string;
}

export interface AmbientCitizen {
  id: string;
  name: string;
  type: CitizenType;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  homeDistrict: 'square' | 'hospital' | 'junction' | 'safe_haven';
  facing: 'down' | 'up' | 'left' | 'right';
  state: CitizenState;
  speed: number;
  waitTimer: number;
  walkCycle: number;
  palette: CitizenPalette;
  hasUmbrella?: boolean;
  speechBubble?: {
    text: string;
    timeLeft: number;
    totalDuration: number;
  };
  interactQuote: string;
  waypoints: { x: number; y: number }[];
  currentWpIndex: number;
}

// ---------------------------------------------------------------------------
// 4. AMBIENT DİYALOG HAVUZU (TÜRKÇE VE DURUM BAZLI)
// ---------------------------------------------------------------------------

// A. Sakin hava diyalogları
export const SPEECH_CALM: string[] = [
  'Bugün meydan sakin görünüyor.',
  'Hastane tarafına mı gidiyorsun?',
  'Şehir bu saatlerde daha huzurlu oluyor.',
  'Az sonra yağmur yağabilir gibi.',
  'Pazara uğrayıp döneceğim.',
  'Buralarda yürümek iyi geliyor.',
  'Hava biraz kapalı ama güzel.',
  'Bugün işler umarım yolunda gider.',
  'Yamaç tarafı her zamanki gibi sessiz.',
  'Şehir son günlerde çok değişti.',
];

// B. Yağmur öncesi diyalogları
export const SPEECH_PRE_RAIN: string[] = [
  'Gökyüzü iyice karardı.',
  'Bir yağmur geliyor gibi.',
  'Hava hızlı bozuyor.',
  'Şemsiyeni aldıysan iyi etmişsin.',
  'Bence birazdan bastıracak.',
  'Hastane yolunda yine su birikir mi acaba?',
  'Rüzgâr da arttı.',
  'Buralarda yağmur bazen sert başlıyor.',
  'İnşallah yollar kapanmaz.',
  'Bugün dikkatli olmak gerekecek.',
];

// C. Yağmur başladığında
export const SPEECH_RAIN_START: string[] = [
  'Yağmur başladı!',
  'Bu beklediğimden hızlı oldu.',
  'Yol ıslanmaya başladı.',
  'Hastane tarafı riskli olabilir.',
  'Keşke biraz daha hazırlıklı olsaydık.',
  'Yağış şiddetleniyor galiba.',
  'Bu kadar ani bastırmasını beklemiyordum.',
  'Bir an önce işimi halletmeliyim.',
  'Şu giderler yeterli olacak mı?',
  'Buralar su tutmaya başlıyor.',
];

// D. Sel riski yükseldiğinde
export const SPEECH_FLOOD_RISING: string[] = [
  'Su birikiyor!',
  'Buradan uzaklaşsak iyi olur.',
  'Yol kapanmadan geçelim.',
  'Hastane yolunda durum kötüleşiyor.',
  'Bu taraf hiç güvenli görünmüyor.',
  'Su seviyesi artıyor.',
  'Burada fazla oyalanmayalım.',
  'Geçen sefer de böyle olmuştu.',
  'Bu kadar çabuk yükselmesi normal değil.',
  'Bir şey yapılmazsa işler kötüleşecek.',
];

// E. Kritik tehlike / panik anı
export const SPEECH_CRITICAL_PANIC: string[] = [
  '🚨 Su yükseliyor!',
  'Acil servise ulaşmak zorlaşacak!',
  'Çabuk, bu taraftan çıkalım!',
  'Yol kapanıyor olabilir!',
  'Yetkililer müdahale etmeli!',
  'Burada kalmak istemiyorum.',
  'Geri çekilelim!',
  'Bu iyiye gitmiyor.',
  'Burası artık güvenli değil.',
  'Hemen uzaklaşalım!',
];

// F. Oyuncu savunma kurduğunda
export const SPEECH_DEFENSE_BUILT: string[] = [
  'Bir şey yapılıyor sanırım.',
  'Bu çözüm işe yarar mı?',
  'En azından müdahale ediliyor.',
  'Belki suyun yönünü değiştirir.',
  'Bunu daha önce görmemiştim.',
  'Umarım hastane yolu korunur.',
  'İyi ki biri ilgileniyor.',
  'Bu yapı faydalı olabilir.',
  'Şimdi sonucu göreceğiz.',
  'Belki bu kez durum düzelir.',
];

// G. Müdahale işe yaradığında
export const SPEECH_RECOVERY_SUCCESS: string[] = [
  '✓ Su biraz çekildi sanki.',
  'Yol daha güvenli görünüyor.',
  'İşe yaradı galiba!',
  'İyi ki zamanında müdahale edildi.',
  'Şimdi daha rahatım.',
  'Hastaneye ulaşım korunmuş olabilir.',
  'Durum biraz toparlandı.',
  'Neyse ki daha kötü olmadı.',
  'Bu gerçekten yardımcı oldu.',
  'Şehir nefes aldı gibi.',
];

// H. Müdahale yetersiz kaldığında
export const SPEECH_DEFENSE_INSUFFICIENT: string[] = [
  'Pek etkili olmadı gibi.',
  'Su hâlâ yükseliyor.',
  'Bu çözüm yetmedi.',
  'Yol yine tehlikede.',
  'Daha güçlü bir önlem gerekebilir.',
  'Durum kontrol altına alınamadı.',
  'Ben hâlâ endişeliyim.',
  'Burası tekrar taşabilir.',
  'Sorun tam çözülmedi.',
  'Bu daha başlangıç olabilir.',
];

// I. Görev sonrası rahatlama
export const SPEECH_POST_CHAPTER: string[] = [
  'Şimdilik durum sakinleşti.',
  'Umarım tekrar etmez.',
  'Bugünlük atlattık galiba.',
  'En azından bir şeyler değişti.',
  'Daha hazırlıklı olmak gerekiyor.',
  'Bu şehir dayanıklı olmayı öğrenmeli.',
  'İyi ki müdahale edildi.',
  'Böyle devam ederse daha güvende olabiliriz.',
  'Biraz olsun içim rahatladı.',
  'Bu olay ders olmalı.',
];

// 5. KISA ETKİLEŞİMLİ YAN NPC CÜMLELERİ ([E] Dinle)
export const INTERACT_QUOTES: string[] = [
  'Hastane tarafındaki yolu dikkatle izle.',
  'Yağmurda bu sokaklar hemen su tutuyor.',
  'Drenaj sistemi eskisi kadar güçlü değil.',
  'Şehrin bazı noktaları daha kırılgan.',
  'Burada her yıl risk biraz daha artıyor.',
  'Mühendislerin hızlı davranması gerek.',
  'Bazen küçük önlemler büyük fark yaratır.',
  'Acil servis yolu kapanmamalı.',
  'Su akışını kontrol etmek her şeyi değiştirir.',
  'Doğru yere müdahale etmek önemli.',
];

// ---------------------------------------------------------------------------
// 3. BÖLGELERE GÖRE NPC DAĞILIM PLANI (12 NPC)
// ---------------------------------------------------------------------------

export function createInitialAmbientCitizens(): AmbientCitizen[] {
  return [
    // A. ŞEHİR MEYDANI (Saat Kulesi, Çarşı & İstasyon Meydanı: 5 NPC)
    // 1. Öğrenci
    {
      id: 'sq_student',
      name: 'Ece',
      type: 'student',
      x: 580,
      y: 490,
      targetX: 510,
      targetY: 490,
      homeDistrict: 'square',
      facing: 'left',
      state: 'walk',
      speed: 55,
      waitTimer: 0,
      walkCycle: 0,
      palette: {
        body: '#98c379', // Yeşil kapüşonlu
        pants: '#21252b',
        hair: '#4a2e18',
        accessory: '#e5c07b', // Sarı sırt çantası
      },
      interactQuote: INTERACT_QUOTES[1], // "Yağmurda bu sokaklar hemen su tutuyor."
      waypoints: [
        { x: 580, y: 490 },
        { x: 510, y: 490 },
        { x: 560, y: 440 },
      ],
      currentWpIndex: 0,
    },
    // 2. Yaşlı vatandaş
    {
      id: 'sq_elder',
      name: 'Muzaffer Dede',
      type: 'elder',
      x: 640,
      y: 590,
      targetX: 640,
      targetY: 590,
      homeDistrict: 'square',
      facing: 'down',
      state: 'idle',
      speed: 32,
      waitTimer: 4,
      walkCycle: 0,
      palette: {
        body: '#61afef', // Mavi yelek
        pants: '#3e4451',
        hair: '#abb2bf', // Kır saç
        accessory: '#8b5a2b', // Baston
      },
      interactQuote: INTERACT_QUOTES[2], // "Drenaj sistemi eskisi kadar güçlü değil."
      waypoints: [
        { x: 640, y: 590 },
        { x: 600, y: 630 },
        { x: 660, y: 610 },
      ],
      currentWpIndex: 0,
    },
    // 3. Pazar ziyaretçisi
    {
      id: 'sq_market',
      name: 'Selma Hanım',
      type: 'market_visitor',
      x: 520,
      y: 570,
      targetX: 580,
      targetY: 570,
      homeDistrict: 'square',
      facing: 'right',
      state: 'walk',
      speed: 48,
      waitTimer: 0,
      walkCycle: 0,
      palette: {
        body: '#e06c75', // Kırmızı hırka
        pants: '#282c34',
        hair: '#5c3a21',
        accessory: '#d19a66', // File çanta
      },
      interactQuote: INTERACT_QUOTES[4], // "Burada her yıl risk biraz daha artıyor."
      waypoints: [
        { x: 500, y: 570 },
        { x: 580, y: 570 },
        { x: 550, y: 620 },
      ],
      currentWpIndex: 0,
    },
    // 4. Sohbet eden çift 1
    {
      id: 'sq_chat_1',
      name: 'Ahmet',
      type: 'adult',
      x: 620,
      y: 490,
      targetX: 620,
      targetY: 490,
      homeDistrict: 'square',
      facing: 'right',
      state: 'chat',
      speed: 42,
      waitTimer: 12,
      walkCycle: 0,
      palette: {
        body: '#4b5263',
        pants: '#21252b',
        hair: '#5c3a21',
      },
      interactQuote: INTERACT_QUOTES[3], // "Şehrin bazı noktaları daha kırılgan."
      waypoints: [
        { x: 620, y: 490 },
        { x: 600, y: 530 },
      ],
      currentWpIndex: 0,
    },
    // 5. Sohbet eden çift 2
    {
      id: 'sq_chat_2',
      name: 'Burak',
      type: 'adult',
      x: 636,
      y: 490,
      targetX: 636,
      targetY: 490,
      homeDistrict: 'square',
      facing: 'left',
      state: 'chat',
      speed: 42,
      waitTimer: 12,
      walkCycle: 0,
      palette: {
        body: '#98c379',
        pants: '#3e4451',
        hair: '#1e2227',
      },
      interactQuote: INTERACT_QUOTES[5], // "Mühendislerin hızlı davranması gerek."
      waypoints: [
        { x: 636, y: 490 },
        { x: 650, y: 530 },
      ],
      currentWpIndex: 0,
    },

    // B. HASTANE ÇEVRESİ (Acil Servis Girişi ve Rampası: 3 NPC)
    // 6. Ziyaretçi
    {
      id: 'hosp_visitor',
      name: 'Gülçin Hanım',
      type: 'hospital_visitor',
      x: 1420,
      y: 440,
      targetX: 1490,
      targetY: 440,
      homeDistrict: 'hospital',
      facing: 'right',
      state: 'walk',
      speed: 46,
      waitTimer: 0,
      walkCycle: 0,
      palette: {
        body: '#c678dd', // Eflatun mont
        pants: '#282c34',
        hair: '#5c3a21',
        accessory: '#ffffff',
      },
      interactQuote: INTERACT_QUOTES[7], // "Acil servis yolu kapanmamalı."
      waypoints: [
        { x: 1420, y: 440 },
        { x: 1510, y: 440 },
        { x: 1460, y: 470 },
      ],
      currentWpIndex: 0,
    },
    // 7. Refakatçi / Yaşlı
    {
      id: 'hosp_companion',
      name: 'İhsan Amca',
      type: 'elder',
      x: 1350,
      y: 430,
      targetX: 1410,
      targetY: 430,
      homeDistrict: 'hospital',
      facing: 'right',
      state: 'walk',
      speed: 34,
      waitTimer: 0,
      walkCycle: 0,
      palette: {
        body: '#5c6370', // Gri palto
        pants: '#21252b',
        hair: '#e5e9f0',
        accessory: '#8b5a2b',
      },
      interactQuote: INTERACT_QUOTES[0], // "Hastane tarafındaki yolu dikkatle izle."
      waypoints: [
        { x: 1350, y: 430 },
        { x: 1410, y: 430 },
        { x: 1360, y: 450 },
      ],
      currentWpIndex: 0,
    },
    // 8. Sağlık çalışanı yaya
    {
      id: 'hosp_nurse',
      name: 'Hemşire Sinem',
      type: 'worker',
      x: 1480,
      y: 460,
      targetX: 1480,
      targetY: 460,
      homeDistrict: 'hospital',
      facing: 'down',
      state: 'idle',
      speed: 46,
      waitTimer: 6,
      walkCycle: 0,
      palette: {
        body: '#61afef', // Mavi medikal forma
        pants: '#e5e9f0',
        hair: '#2c313a',
        accessory: '#e06c75', // Stetoskop
      },
      interactQuote: INTERACT_QUOTES[8], // "Su akışını kontrol etmek her şeyi değiştirir."
      waypoints: [
        { x: 1480, y: 460 },
        { x: 1440, y: 460 },
        { x: 1510, y: 450 },
      ],
      currentWpIndex: 0,
    },

    // C. YOL / KAVŞAK BÖLGELERİ (Ana Cadde ve Yol Ayrımı: 2 NPC)
    // 9. Yürüyen yaya
    {
      id: 'junc_commuter',
      name: 'Kerem Bey',
      type: 'adult',
      x: 840,
      y: 480,
      targetX: 840,
      targetY: 620,
      homeDistrict: 'junction',
      facing: 'down',
      state: 'walk',
      speed: 52,
      waitTimer: 0,
      walkCycle: 0,
      palette: {
        body: '#4fa89b', // Teal mont
        pants: '#282c34',
        hair: '#21252b',
      },
      interactQuote: INTERACT_QUOTES[6], // "Bazen küçük önlemler büyük fark yaratır."
      waypoints: [
        { x: 840, y: 480 },
        { x: 840, y: 680 },
        { x: 840, y: 380 },
      ],
      currentWpIndex: 0,
    },
    // 10. Yol bakım çalışanı
    {
      id: 'junc_worker',
      name: 'Usta Cemal',
      type: 'worker',
      x: 770,
      y: 680,
      targetX: 770,
      targetY: 560,
      homeDistrict: 'junction',
      facing: 'up',
      state: 'walk',
      speed: 50,
      waitTimer: 0,
      walkCycle: 0,
      palette: {
        body: '#d19a66', // Turuncu tulum
        pants: '#2c313a',
        hair: '#1e2227',
        accessory: '#e5c07b', // Baret
      },
      interactQuote: INTERACT_QUOTES[9], // "Doğru yere müdahale etmek önemli."
      waypoints: [
        { x: 770, y: 680 },
        { x: 770, y: 550 },
        { x: 770, y: 720 },
      ],
      currentWpIndex: 0,
    },

    // D. GÜVENLİ TOPLANMA NOKTASI & YUKARI TERAS (2 NPC)
    // 11. Teras sakini
    {
      id: 'safe_terrace_res',
      name: 'Leyla Hanım',
      type: 'adult',
      x: 1020,
      y: 330,
      targetX: 1100,
      targetY: 330,
      homeDistrict: 'safe_haven',
      facing: 'right',
      state: 'walk',
      speed: 48,
      waitTimer: 0,
      walkCycle: 0,
      palette: {
        body: '#e5c07b', // Sarı rüzgarlık
        pants: '#3e4451',
        hair: '#5c3a21',
      },
      interactQuote: INTERACT_QUOTES[8], // "Su akışını kontrol etmek her şeyi değiştirir."
      waypoints: [
        { x: 1020, y: 330 },
        { x: 1110, y: 330 },
        { x: 1070, y: 280 },
      ],
      currentWpIndex: 0,
    },
    // 12. Olayı izleyen genç
    {
      id: 'safe_terrace_watcher',
      name: 'Tolga',
      type: 'student',
      x: 1200,
      y: 340,
      targetX: 1250,
      targetY: 340,
      homeDistrict: 'safe_haven',
      facing: 'right',
      state: 'idle',
      speed: 52,
      waitTimer: 5,
      walkCycle: 0,
      palette: {
        body: '#2d7d56', // Koyu yeşil ceket
        pants: '#282c34',
        hair: '#1e2227',
        accessory: '#61afef',
      },
      interactQuote: INTERACT_QUOTES[0], // "Hastane tarafındaki yolu dikkatle izle."
      waypoints: [
        { x: 1200, y: 340 },
        { x: 1260, y: 340 },
        { x: 1180, y: 320 },
      ],
      currentWpIndex: 0,
    },
  ];
}

/**
 * Updates citizen movement, behavioral states, flood avoidance, and speech bubble timers
 * based on the 8-stage climate state machine.
 */
export function updateAmbientCitizens(
  citizens: AmbientCitizen[],
  dt: number,
  params: {
    stormActive: boolean;
    roadWaterDepth: number;
    roadPassable: boolean;
    hasSpongeDefense: boolean;
    chapterWon?: boolean;
    obstacles: ObstacleBox[];
    playerX: number;
    playerY: number;
  }
): void {
  const {
    stormActive,
    roadWaterDepth,
    roadPassable,
    hasSpongeDefense,
    chapterWon = false,
    obstacles,
    playerX,
    playerY,
  } = params;

  // Determine current situational dialogue & behavior stage
  // 1. Post-Chapter Victory
  // 2. Recovery Success (sponge built & depth < 20cm)
  // 3. Defense Built (sponge built but still draining)
  // 4. Critical Panic (road impassable or depth > 30cm)
  // 5. Flood Rising (depth > 18cm)
  // 6. Rain Started (stormActive but depth low)
  // 7. Calm Weather
  let currentDialogPool = SPEECH_CALM;
  let situationUrgency: 'calm' | 'pre_rain' | 'rain' | 'danger' | 'critical' | 'observe' | 'recovery' | 'victory' = 'calm';

  if (chapterWon) {
    currentDialogPool = SPEECH_POST_CHAPTER;
    situationUrgency = 'victory';
  } else if (hasSpongeDefense && roadWaterDepth < 20 && roadPassable) {
    currentDialogPool = SPEECH_RECOVERY_SUCCESS;
    situationUrgency = 'recovery';
  } else if (hasSpongeDefense) {
    currentDialogPool = SPEECH_DEFENSE_BUILT;
    situationUrgency = 'observe';
  } else if (!roadPassable || roadWaterDepth >= 30) {
    currentDialogPool = SPEECH_CRITICAL_PANIC;
    situationUrgency = 'critical';
  } else if (roadWaterDepth >= 18) {
    currentDialogPool = SPEECH_FLOOD_RISING;
    situationUrgency = 'danger';
  } else if (stormActive) {
    currentDialogPool = SPEECH_RAIN_START;
    situationUrgency = 'rain';
  } else {
    currentDialogPool = SPEECH_CALM;
    situationUrgency = 'calm';
  }

  // Manage speech bubble chance (at most 1-2 citizens talk at once)
  const activeBubbleCount = citizens.filter((c) => c.speechBubble && c.speechBubble.timeLeft > 0).length;

  for (const c of citizens) {
    // 1. Update speech bubble expiration
    if (c.speechBubble) {
      c.speechBubble.timeLeft -= dt;
      if (c.speechBubble.timeLeft <= 0) {
        c.speechBubble = undefined;
      }
    } else if (activeBubbleCount < 2 && Math.random() < 0.0035) {
      const quote = currentDialogPool[Math.floor(Math.random() * currentDialogPool.length)];
      c.speechBubble = {
        text: quote,
        timeLeft: 4.8,
        totalDuration: 4.8,
      };
    }

    // 2. Adjust state & speed based on climate situation
    switch (situationUrgency) {
      case 'critical':
      case 'danger':
        c.speed = c.type === 'elder' ? 50 : 92;
        // If near flooded hospital road dip (x: 1120..1320, y: 480..580), evacuate!
        if (c.x > 1120 && c.x < 1330 && c.y > 470 && c.y < 590) {
          c.state = 'evacuate';
          // Move towards upper terrace or hospital plaza
          c.targetX = c.x > 1220 ? 1420 : 1040;
          c.targetY = c.x > 1220 ? 430 : 340;
        } else {
          c.state = 'hurry';
        }
        break;

      case 'rain':
        c.speed = c.type === 'elder' ? 44 : 72;
        c.state = 'hurry';
        break;

      case 'observe':
        c.speed = 40;
        c.state = 'observe';
        break;

      case 'recovery':
      case 'victory':
        c.speed = c.type === 'elder' ? 32 : 50;
        if (c.state === 'hurry' || c.state === 'evacuate') {
          c.state = 'walk';
        }
        break;

      case 'calm':
      default:
        c.speed = c.type === 'elder' ? 32 : 50;
        if (c.state === 'hurry' || c.state === 'evacuate' || c.state === 'observe') {
          c.state = 'walk';
        }
        break;
    }

    // 3. Waiting / Chatting timer
    if (c.waitTimer > 0) {
      c.waitTimer -= dt;
      c.walkCycle = 0;
      continue;
    }

    // 4. Move towards current target
    const dx = c.targetX - c.x;
    const dy = c.targetY - c.y;
    const dist = Math.hypot(dx, dy);

    if (dist < 8) {
      // Reached waypoint: pick next waypoint
      c.currentWpIndex = (c.currentWpIndex + 1) % c.waypoints.length;
      const nextWp = c.waypoints[c.currentWpIndex];
      c.targetX = nextWp.x;
      c.targetY = nextWp.y;

      // Occasional pause (25% chance in calm/recovery)
      if (situationUrgency === 'calm' || situationUrgency === 'recovery' || situationUrgency === 'victory') {
        if (Math.random() < 0.28) {
          c.waitTimer = 3.0 + Math.random() * 3.5;
          c.state = Math.random() < 0.4 ? 'chat' : 'idle';
        } else {
          c.state = 'walk';
        }
      } else {
        c.state = 'hurry';
      }
    } else {
      // Step forward
      const normDx = dx / dist;
      const normDy = dy / dist;
      const step = c.speed * dt;

      // Facing direction
      if (Math.abs(normDx) > Math.abs(normDy)) {
        c.facing = normDx > 0 ? 'right' : 'left';
      } else {
        c.facing = normDy > 0 ? 'down' : 'up';
      }

      const nextX = c.x + normDx * step;
      const nextY = c.y + normDy * step;

      // Soft hero avoidance: yield gently if about to collide with player
      const distToPlayer = Math.hypot(playerX - nextX, playerY - nextY);
      if (distToPlayer < 24) {
        c.waitTimer = 0.5;
        continue;
      }

      // Check obstacle collisions
      let collided = false;
      for (const obs of obstacles) {
        if (pointCollidesWithObstacle({ x: nextX, y: nextY }, obs, 10)) {
          collided = true;
          break;
        }
      }

      // Check deep flood collision
      if (pointInFloodedRoadZone({ x: nextX, y: nextY }, roadWaterDepth)) {
        collided = true;
        c.state = 'react';
      }

      if (!collided) {
        c.x = nextX;
        c.y = nextY;
        c.walkCycle += dt * (c.speed / 14);
      } else {
        // Reverse waypoint if path blocked
        c.currentWpIndex = (c.currentWpIndex + 1) % c.waypoints.length;
        const nextWp = c.waypoints[c.currentWpIndex];
        c.targetX = nextWp.x;
        c.targetY = nextWp.y;
      }
    }
  }
}

/**
 * Draws a pixel-art civilian NPC with walk cycles, shadows, clothing palettes, and speech bubbles.
 */
export function drawPixelCitizen(
  ctx: CanvasRenderingContext2D,
  c: AmbientCitizen,
  time: number
): void {
  const { x, y, facing, walkCycle, palette, type, state, speechBubble } = c;

  // Drop Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.32)';
  ctx.beginPath();
  ctx.ellipse(x, y + 2, 7.5, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();

  const isMoving = state === 'walk' || state === 'hurry' || state === 'evacuate';
  const bob = isMoving ? Math.sin(walkCycle * Math.PI) * 1.5 : Math.sin(time * 2.5) * 0.5;
  const py = y - 24 + bob;
  const legOffset = isMoving ? Math.sin(walkCycle * Math.PI) * 3.5 : 0;

  // 1. Legs & Shoes
  ctx.fillStyle = palette.pants;
  if (facing === 'left' || facing === 'right') {
    ctx.fillRect(x - 3 + legOffset, py + 15, 3, 7);
    ctx.fillRect(x + 1 - legOffset, py + 15, 3, 7);
  } else {
    ctx.fillRect(x - 4, py + 15 + (isMoving ? legOffset : 0), 3, 7);
    ctx.fillRect(x + 1, py + 15 - (isMoving ? legOffset : 0), 3, 7);
  }
  // Dark shoes
  ctx.fillStyle = '#1e2227';
  ctx.fillRect(x - 4, py + 20, 3, 2);
  ctx.fillRect(x + 1, py + 20, 3, 2);

  // 2. Torso (Jacket / Shirt / Sweater)
  ctx.fillStyle = palette.body;
  ctx.fillRect(x - 5, py + 7, 10, 9);

  // Collar detail
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.fillRect(x - 2, py + 7, 4, 2);

  // Accessory: Bag, backpack, baret, or medical emblem
  if (palette.accessory) {
    ctx.fillStyle = palette.accessory;
    if (type === 'student') {
      // Backpack
      if (facing === 'down') ctx.fillRect(x + 4, py + 8, 3, 6);
      else if (facing === 'up') ctx.fillRect(x - 4, py + 8, 8, 5);
      else ctx.fillRect(facing === 'left' ? x + 3 : x - 6, py + 8, 3, 6);
    } else if (type === 'worker') {
      // Safety hardhat brim
      ctx.fillRect(x - 6, py + 2, 12, 2);
    } else if (type === 'market_visitor') {
      // Shopping bag in hand
      ctx.fillRect(x + 4, py + 11, 4, 4);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x + 5, py + 10, 2, 1);
    } else if (type === 'elder') {
      // Walking stick
      ctx.fillStyle = palette.accessory;
      ctx.fillRect(x + 4, py + 10, 2, 12);
      ctx.fillRect(x + 3, py + 9, 3, 2);
    }
  }

  // 3. Head & Hair
  ctx.fillStyle = palette.skin || '#f0c69d';
  ctx.fillRect(x - 3.5, py + 1.5, 7, 6);

  // Eyes
  ctx.fillStyle = '#1e2227';
  if (facing === 'down') {
    ctx.fillRect(x - 2.5, py + 3.5, 1.5, 1.5);
    ctx.fillRect(x + 1, py + 3.5, 1.5, 1.5);
  } else if (facing === 'left') {
    ctx.fillRect(x - 3, py + 3.5, 1.5, 1.5);
  } else if (facing === 'right') {
    ctx.fillRect(x + 1.5, py + 3.5, 1.5, 1.5);
  }

  // Hair
  ctx.fillStyle = palette.hair;
  if (type === 'elder') {
    ctx.fillRect(x - 4.5, py, 9, 3);
    ctx.fillRect(x - 4.5, py + 2, 2, 3);
    ctx.fillRect(x + 2.5, py + 2, 2, 3);
  } else if (type === 'student') {
    ctx.fillRect(x - 4.5, py, 9, 3.5);
  } else {
    ctx.fillRect(x - 4, py, 8, 3);
    if (facing === 'left') ctx.fillRect(x + 2, py + 1, 2, 4);
    else if (facing === 'right') ctx.fillRect(x - 4, py + 1, 2, 4);
  }

  // 4. Speech Bubble Rendering
  if (speechBubble && speechBubble.timeLeft > 0) {
    drawAmbientSpeechBubble(ctx, x, py - 4, speechBubble.text, speechBubble.timeLeft, speechBubble.totalDuration);
  }
}

/**
 * Renders an atmospheric pixelated speech bubble above an NPC's head.
 */
function drawAmbientSpeechBubble(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  text: string,
  timeLeft: number,
  totalDuration: number
): void {
  const fadeIn = Math.min(1, (totalDuration - timeLeft) / 0.3);
  const fadeOut = Math.min(1, timeLeft / 0.4);
  const alpha = Math.max(0, Math.min(1, Math.min(fadeIn, fadeOut)));
  if (alpha <= 0.01) return;

  ctx.save();
  ctx.globalAlpha = alpha;

  ctx.font = 'bold 9.5px "DM Mono", monospace, system-ui';
  const textWidth = ctx.measureText(text).width;
  const paddingX = 8;
  const boxWidth = Math.max(54, textWidth + paddingX * 2);
  const boxHeight = 18;
  const boxX = Math.round(x - boxWidth / 2);
  const boxY = Math.round(y - boxHeight - 8);

  // Bubble Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.fillRect(boxX + 2, boxY + 2, boxWidth, boxHeight);

  // Bubble Background (Clean ivory white)
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(boxX, boxY, boxWidth, boxHeight);

  // Dark Outline
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 1.2;
  ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);

  // Pointer Tail
  ctx.fillStyle = '#f8fafc';
  ctx.beginPath();
  ctx.moveTo(x - 4, boxY + boxHeight);
  ctx.lineTo(x, boxY + boxHeight + 5);
  ctx.lineTo(x + 4, boxY + boxHeight);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#0f172a';
  ctx.beginPath();
  ctx.moveTo(x - 4, boxY + boxHeight);
  ctx.lineTo(x, boxY + boxHeight + 5);
  ctx.lineTo(x + 4, boxY + boxHeight);
  ctx.stroke();

  // Text
  ctx.fillStyle = '#0f172a';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, boxY + boxHeight / 2 + 0.5);

  ctx.restore();
}

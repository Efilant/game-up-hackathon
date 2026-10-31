/**
 * FELAKET BENİM — 2.5D World Art & Architectural Rendering Engine
 * Hand-crafted procedural illustration pipeline for the Hospital District & City
 */

export interface WorldRenderContext {
  ctx: CanvasRenderingContext2D;
  time: number; // in seconds
  camX: number;
  camY: number;
  viewWidth: number;
  viewHeight: number;
  activeDefenses: string[];
  roadWaterDepth: number;
  roadPassable: boolean;
  stormActive: boolean;
}

export interface CharacterRenderState {
  x: number;
  y: number;
  facing: 'down' | 'up' | 'left' | 'right';
  isMoving: boolean;
  frame: number;
}

// ---------------------------------------------------------------------------
// 1. TERRAIN, ROADS, SIDEWALKS & GRASS
// ---------------------------------------------------------------------------
export function drawHospitalDistrictTerrain(rc: WorldRenderContext, worldWidth: number, worldHeight: number) {
  const { ctx, time, stormActive } = rc;

  // A. Taban Zemin: Zengin Koyu Yeşil Yamaç Çimi & Toprak Dokusu
  const groundGrad = ctx.createLinearGradient(0, 0, 0, worldHeight);
  groundGrad.addColorStop(0, '#173326');   // Üst teras (daha zengin yayla çimi)
  groundGrad.addColorStop(0.35, '#1e3d30'); // Hastane plato düzlüğü
  groundGrad.addColorStop(0.65, '#193026'); // Yol çukuru vadisi
  groundGrad.addColorStop(1, '#11221b');   // Alt kıyı yaklaşımı
  ctx.fillStyle = groundGrad;
  ctx.fillRect(0, 0, worldWidth, worldHeight);

  // Doğal topoğrafik zemin kot çizgileri & teras taş duvarları
  ctx.strokeStyle = 'rgba(74, 122, 94, 0.25)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  // Üst kot sınırı
  ctx.moveTo(900, 290);
  ctx.bezierCurveTo(1200, 270, 1500, 310, 1900, 260);
  ctx.stroke();

  // Orta kot sınırı
  ctx.moveTo(850, 470);
  ctx.bezierCurveTo(1150, 450, 1450, 480, 1950, 430);
  ctx.stroke();

  // İstinat taş duvarı (Hastane arkası teras duvarı)
  drawRetainingWall(ctx, 1000, 160, 1750, 160, 18);

  // B. Hastane Meydanı & Parke Taşı Zemin
  drawPavedPlaza(ctx, 1310, 220, 320, 210);

  // C. Yol Ağı (Winding Hillside Road & Main Boulevard)
  drawRoadNetwork(rc);

  // D. Kaldırımlar ve Yaya Yolları
  drawSidewalks(ctx);

  // E. Yağmur Su Birikintileri ve Yansımalar (Asfalt üzerinde)
  drawWetPuddles(ctx, time, stormActive);
}

// Taş İstinat Duvarı Çizimi
function drawRetainingWall(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, height: number) {
  ctx.save();
  // Gölge
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.fillRect(x1, y1 + height, x2 - x1, 8);

  // Duvar gövdesi
  const wallGrad = ctx.createLinearGradient(0, y1, 0, y1 + height);
  wallGrad.addColorStop(0, '#52606d');
  wallGrad.addColorStop(1, '#333f48');
  ctx.fillStyle = wallGrad;
  ctx.fillRect(x1, y1, x2 - x1, height);

  // Taş derz çizgileri
  ctx.strokeStyle = 'rgba(20, 28, 35, 0.6)';
  ctx.lineWidth = 1;
  const blockW = 24;
  for (let x = x1; x < x2; x += blockW) {
    ctx.beginPath();
    ctx.moveTo(x, y1);
    ctx.lineTo(x, y1 + height);
    ctx.stroke();
  }
  // Yatay derz
  ctx.beginPath();
  ctx.moveTo(x1, y1 + height / 2);
  ctx.lineTo(x2, y1 + height / 2);
  ctx.stroke();

  // Üst bordür taşı
  ctx.fillStyle = '#6c7c8c';
  ctx.fillRect(x1 - 4, y1 - 3, x2 - x1 + 8, 4);
  ctx.restore();
}

// Parke Taşlı Hastane Ön Avlusu
function drawPavedPlaza(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  ctx.save();
  ctx.fillStyle = '#2b3a42';
  ctx.fillRect(x, y, w, h);

  // Kaldırım taş deseni
  ctx.strokeStyle = 'rgba(72, 95, 108, 0.4)';
  ctx.lineWidth = 1;
  const step = 20;
  for (let px = x; px < x + w; px += step) {
    ctx.beginPath();
    ctx.moveTo(px, y);
    ctx.lineTo(px, y + h);
    ctx.stroke();
  }
  for (let py = y; py < y + h; py += step) {
    ctx.beginPath();
    ctx.moveTo(x, py);
    ctx.lineTo(x + w, py);
    ctx.stroke();
  }

  // Avlu bordür taşları
  ctx.strokeStyle = '#4e6573';
  ctx.lineWidth = 3;
  ctx.strokeRect(x, y, w, h);
  ctx.restore();
}

// Asfalt Yol ve Yol Kenarları
function drawRoadNetwork(rc: WorldRenderContext) {
  const { ctx, activeDefenses } = rc;
  const isRetrofit = activeDefenses.includes('dönüşüm');

  ctx.save();

  // 1. Yamaç Hastane Erişim Yolu (Winding Curving Road)
  // Yol alt zemini / Banket & Bordür
  ctx.beginPath();
  ctx.lineWidth = 58;
  ctx.strokeStyle = '#3a4c59'; // Gri beton bordür kenarı
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.moveTo(735, 735);
  ctx.quadraticCurveTo(1000, 680, 1200, 560);
  ctx.quadraticCurveTo(1300, 500, 1470, 420);
  ctx.stroke();

  // Asfalt Katmanı
  ctx.beginPath();
  ctx.lineWidth = 50;
  ctx.strokeStyle = isRetrofit ? '#2b444b' : '#1e2c35'; // Güvenli dönüşümde drenajlı geçirgen asfalt
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.moveTo(735, 735);
  ctx.quadraticCurveTo(1000, 680, 1200, 560);
  ctx.quadraticCurveTo(1300, 500, 1470, 420);
  ctx.stroke();

  // 2. Doğu-Batı Ana Bulvarı
  // Bordür
  ctx.fillStyle = '#3a4c59';
  ctx.fillRect(80, 694, 2040, 82);
  // Asfalt
  ctx.fillStyle = '#1e2c35';
  ctx.fillRect(90, 700, 2020, 70);

  // 3. Kuzey-Güney Merkez Caddesi
  ctx.fillStyle = '#3a4c59';
  ctx.fillRect(694, 90, 82, 1320);
  ctx.fillStyle = '#1e2c35';
  ctx.fillRect(700, 100, 70, 1300);

  // 4. Yol Şerit Çizgileri (Reflektif Termoplastik Sarı ve Beyaz)
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#e2c56a'; // Trafik sarısı
  ctx.setLineDash([16, 18]);
  ctx.beginPath();
  ctx.moveTo(100, 735);
  ctx.lineTo(2100, 735);
  ctx.moveTo(735, 100);
  ctx.lineTo(735, 1400);
  ctx.stroke();

  // Hastane Yolu Kesik Çizgisi
  ctx.strokeStyle = '#f1f5f9'; // Beyaz
  ctx.setLineDash([12, 14]);
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(740, 735);
  ctx.quadraticCurveTo(1000, 680, 1200, 560);
  ctx.quadraticCurveTo(1300, 500, 1470, 420);
  ctx.stroke();
  ctx.setLineDash([]);

  // Yaya Geçitleri (Crosswalks)
  drawCrosswalk(ctx, 705, 680, 60, 20); // Merkez kavşak
  drawCrosswalk(ctx, 1420, 412, 55, 16); // Hastane acil giriş yaya geçidi

  ctx.restore();
}

function drawCrosswalk(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  ctx.save();
  ctx.fillStyle = 'rgba(240, 246, 252, 0.85)';
  const stripeW = 8;
  const gap = 6;
  for (let px = x; px < x + w; px += stripeW + gap) {
    ctx.fillRect(px, y, stripeW, h);
  }
  ctx.restore();
}

function drawSidewalks(ctx: CanvasRenderingContext2D) {
  ctx.save();
  ctx.fillStyle = '#425563';
  // Hastane yolu boyunca kaldırım şeridi
  ctx.beginPath();
  ctx.lineWidth = 6;
  ctx.strokeStyle = '#5a7080';
  ctx.lineCap = 'round';
  ctx.moveTo(770, 720);
  ctx.quadraticCurveTo(1015, 665, 1215, 545);
  ctx.quadraticCurveTo(1315, 485, 1485, 405);
  ctx.stroke();
  ctx.restore();
}

function drawWetPuddles(ctx: CanvasRenderingContext2D, time: number, stormActive: boolean) {
  // Asfalt üzerindeki doğal yağmur birikintileri & ıslak yansıma
  const puddles = [
    { x: 920, y: 720, rx: 35, ry: 12 },
    { x: 1110, y: 620, rx: 28, ry: 10 },
    { x: 740, y: 550, rx: 22, ry: 9 },
  ];

  ctx.save();
  for (const p of puddles) {
    const pGrad = ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, p.rx);
    pGrad.addColorStop(0, 'rgba(80, 180, 210, 0.45)');
    pGrad.addColorStop(0.7, 'rgba(40, 110, 140, 0.3)');
    pGrad.addColorStop(1, 'rgba(20, 50, 70, 0)');
    ctx.fillStyle = pGrad;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, p.rx, p.ry, 0, 0, Math.PI * 2);
    ctx.fill();

    // Yağmur dalgası (Ripples)
    if (stormActive) {
      const rippleR = ((time * 20 + p.x) % p.rx);
      const alpha = 1 - rippleR / p.rx;
      ctx.strokeStyle = `rgba(200, 240, 255, ${alpha * 0.4})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, rippleR, rippleR * 0.35, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  ctx.restore();
}

// ---------------------------------------------------------------------------
// 2. THE CITY HOSPITAL (ARCHITECTURAL 2.5D ILLUSTRATION)
// ---------------------------------------------------------------------------
export function drawCityHospital(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  isPassable: boolean,
  isRetrofit: boolean,
  time: number
) {
  ctx.save();

  // 1. Binanın Yere Düşen Büyük Derinlik Gölgesi
  ctx.fillStyle = 'rgba(5, 15, 22, 0.55)';
  ctx.beginPath();
  ctx.moveTo(x + 10, y + h);
  ctx.lineTo(x + w + 35, y + h);
  ctx.lineTo(x + w + 20, y + h + 28);
  ctx.lineTo(x + 10, y + h + 28);
  ctx.closePath();
  ctx.fill();

  // 2. Ana Bina Gövdesi (3 Katlı Modern Hastane Kompleksi)
  const facadeGrad = ctx.createLinearGradient(x, y, x, y + h);
  facadeGrad.addColorStop(0, isRetrofit ? '#345561' : '#2b4452');
  facadeGrad.addColorStop(1, isRetrofit ? '#223842' : '#1c2f3a');
  ctx.fillStyle = facadeGrad;
  ctx.fillRect(x, y, w, h);

  // Bina Köşe Işık Hüzmesi (Bevel Accent)
  ctx.strokeStyle = isRetrofit ? '#5cd4d0' : '#4a829e';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);

  // 3. Kat Ayrım Çizgileri & Mimari Paneller
  ctx.strokeStyle = 'rgba(15, 30, 42, 0.7)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y + h * 0.35);
  ctx.lineTo(x + w, y + h * 0.35); // 3. Kat ayrımı
  ctx.moveTo(x, y + h * 0.70);
  ctx.lineTo(x + w, y + h * 0.70); // 2. Kat ayrımı
  ctx.stroke();

  // 4. Hastane Pencereleri (Işıkları Yanan Odalar)
  const windowRows = 3;
  const windowCols = 8;
  const winW = 14;
  const winH = 18;
  const xSpacing = (w - 40) / windowCols;
  const ySpacing = (h - 50) / windowRows;

  for (let row = 0; row < windowRows; row++) {
    for (let col = 0; col < windowCols; col++) {
      // Giriş kapısı bölgesi boş kalsın
      if (row === 2 && col >= 3 && col <= 5) continue;

      const wx = x + 20 + col * xSpacing;
      const wy = y + 14 + row * ySpacing;

      // Pencere Çerçevesi
      ctx.fillStyle = '#101d26';
      ctx.fillRect(wx - 1, wy - 1, winW + 2, winH + 2);

      // Bazı odalar sıcak ışık, bazıları klinik soğuk beyaz, bazıları karanlık
      const seed = (row * 8 + col) * 17;
      const isWarm = seed % 3 === 0;
      const isLit = seed % 5 !== 0;

      if (isLit) {
        ctx.fillStyle = isWarm ? '#fed7aa' : '#bae6fd';
        ctx.fillRect(wx, wy, winW, winH);

        // İç bölme çıtaları
        ctx.strokeStyle = 'rgba(16, 29, 38, 0.5)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(wx + winW / 2, wy);
        ctx.lineTo(wx + winW / 2, wy + winH);
        ctx.stroke();
      } else {
        ctx.fillStyle = '#1e3340';
        ctx.fillRect(wx, wy, winW, winH);
      }
    }
  }

  // 5. Çatı Katı ve Teras (2.5D İzometrik Çatı)
  const roofH = 26;
  const roofGrad = ctx.createLinearGradient(x, y - roofH, x, y);
  roofGrad.addColorStop(0, '#587285');
  roofGrad.addColorStop(1, '#3a4e5d');
  ctx.fillStyle = roofGrad;
  ctx.fillRect(x - 4, y - roofH, w + 8, roofH);

  // Çatı Güvenlik Korkuluğu (Parapet)
  ctx.strokeStyle = '#7c94a5';
  ctx.lineWidth = 2;
  ctx.strokeRect(x - 4, y - roofH, w + 8, 4);

  // HVAC Havalandırma Üniteleri & Antenler
  ctx.fillStyle = '#2d3b45';
  ctx.fillRect(x + 20, y - roofH - 12, 34, 12);
  ctx.fillRect(x + 65, y - roofH - 8, 24, 8);
  // Havalandırma ızgarası
  ctx.strokeStyle = '#1a232a';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + 24, y - roofH - 6);
  ctx.lineTo(x + 50, y - roofH - 6);
  ctx.stroke();

  // Anten & Telsiz Kulesi (Kırmızı Yanıp Sönen Flaşör Işıklı)
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x + w - 30, y - roofH);
  ctx.lineTo(x + w - 30, y - roofH - 32);
  ctx.stroke();

  // Anten Işığı (Kırmızı Yanıp Sönme)
  const beaconBlink = Math.sin(time * 4) > 0.3;
  if (beaconBlink) {
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(x + w - 30, y - roofH - 32, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(239, 68, 68, 0.4)';
    ctx.beginPath();
    ctx.arc(x + w - 30, y - roofH - 32, 9, 0, Math.PI * 2);
    ctx.fill();
  }

  // 6. Helipad (Çatı Helikopter Pisti)
  const heliX = x + w / 2;
  const heliY = y - roofH / 2;
  ctx.fillStyle = '#324552';
  ctx.beginPath();
  ctx.ellipse(heliX, heliY, 32, 11, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#f8fafc';
  ctx.lineWidth = 2;
  ctx.stroke();

  // "H" Harfi
  ctx.fillStyle = '#ef4444';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('H', heliX, heliY);

  // 7. ACİL SERVİS / 112 Giriş Kanopisi ve Cam Kapılar
  const canopyX = x + w / 2 - 45;
  const canopyY = y + h - 34;
  const canopyW = 90;
  const canopyH = 34;

  // Işıklı Cam Giriş
  ctx.fillStyle = 'rgba(224, 242, 254, 0.9)';
  ctx.fillRect(canopyX + 10, canopyY + 8, canopyW - 20, canopyH - 8);

  // Kapı çerçeveleri
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 2;
  ctx.strokeRect(canopyX + 10, canopyY + 8, canopyW - 20, canopyH - 8);
  ctx.beginPath();
  ctx.moveTo(canopyX + canopyW / 2, canopyY + 8);
  ctx.lineTo(canopyX + canopyW / 2, canopyY + canopyH);
  ctx.stroke();

  // İleri Uzanan Cam Saçak / Kanopi (Sütunlarla Destekli)
  ctx.fillStyle = 'rgba(14, 116, 144, 0.85)';
  ctx.fillRect(canopyX, canopyY - 4, canopyW, 10);
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 2;
  ctx.strokeRect(canopyX, canopyY - 4, canopyW, 10);

  // Kanopi Destek Çelik Sütunları
  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(canopyX + 4, canopyY + 6, 4, canopyH - 6);
  ctx.fillRect(canopyX + canopyW - 8, canopyY + 6, 4, canopyH - 6);

  // 8. Tabela: IŞIKLI KIRMIZI HİLAL / HAÇ VE "ACİL SERVİS"
  // Kırmızı Tabela Kutusu
  ctx.fillStyle = '#dc2626';
  ctx.fillRect(canopyX + 6, canopyY - 18, canopyW - 12, 14);
  ctx.strokeStyle = '#fca5a5';
  ctx.lineWidth = 1;
  ctx.strokeRect(canopyX + 6, canopyY - 18, canopyW - 12, 14);

  // Tabela Yazısı
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 9px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('✚ ACİL SERVİS 112', canopyX + canopyW / 2, canopyY - 11);

  // 9. Ana Bina Cephe Logosu: BÜYÜK IŞIKLI SAĞLIK AMBLEMİ
  const badgeX = x + 35;
  const badgeY = y + 36;
  ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
  ctx.beginPath();
  ctx.arc(badgeX, badgeY, 18, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(badgeX - 10, badgeY);
  ctx.lineTo(badgeX + 10, badgeY);
  ctx.moveTo(badgeX, badgeY - 10);
  ctx.lineTo(badgeX, badgeY + 10);
  ctx.stroke();

  // Bina İsmi Yazısı
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('ŞEHİR HASTANESİ', badgeX + 22, badgeY - 2);
  ctx.fillStyle = '#94a3b8';
  ctx.font = '9px monospace';
  ctx.fillText('SEKTÖR 04 BÖLGE ACİL TRAVMA MERKEZİ', badgeX + 22, badgeY + 11);

  // Ambulans Bekleme Yeri Sarı Zikzak Yer Çizgileri
  drawAmbulanceBayMarkings(ctx, canopyX - 10, y + h + 2, canopyW + 20, 24);

  ctx.restore();
}

function drawAmbulanceBayMarkings(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  ctx.save();
  ctx.strokeStyle = '#eab308';
  ctx.lineWidth = 2.5;
  ctx.strokeRect(x, y, w, h);

  // Çapraz çizgiler
  ctx.setLineDash([6, 8]);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + w, y + h);
  ctx.moveTo(x + w, y);
  ctx.lineTo(x, y + h);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

// ---------------------------------------------------------------------------
// 3. NEIGHBORHOOD BUILDINGS (HILLSIDE TERRACE HOUSES & URBAN STRUCTURES)
// ---------------------------------------------------------------------------
export function drawTerraceHouse(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  roofColor: string,
  wallColor: string,
  label: string
) {
  ctx.save();

  // Gölge
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.fillRect(x + 10, y + h - 2, w, 14);

  // Bina Ön Cephesi
  ctx.fillStyle = wallColor;
  ctx.fillRect(x, y, w, h);

  // Cephe Ahşap/Taş Ayrıntıları
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x, y, w, h);

  // Kırma Eğimli Çatı (Pitched Roof)
  const roofOverhang = 8;
  const peakY = y - 32;
  ctx.fillStyle = roofColor;
  ctx.beginPath();
  ctx.moveTo(x - roofOverhang, y);
  ctx.lineTo(x + w / 2, peakY);
  ctx.lineTo(x + w + roofOverhang, y);
  ctx.closePath();
  ctx.fill();

  // Çatı Kenar Saçağı
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Çatı Kiremit Çizgileri
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = 1;
  for (let i = 1; i <= 3; i++) {
    const t = i / 4;
    ctx.beginPath();
    ctx.moveTo(x - roofOverhang + t * (w / 2 + roofOverhang), y - t * (y - peakY));
    ctx.lineTo(x + w + roofOverhang - t * (w / 2 + roofOverhang), y - t * (y - peakY));
    ctx.stroke();
  }

  // Tuğla Baca
  ctx.fillStyle = '#991b1b';
  ctx.fillRect(x + w - 24, peakY + 4, 12, 22);
  ctx.fillStyle = '#450a0a';
  ctx.fillRect(x + w - 26, peakY + 2, 16, 4);

  // Sıcak Pencereler
  const p1x = x + 18, p1y = y + 16;
  const p2x = x + w - 38, p2y = y + 16;
  drawLitWindow(ctx, p1x, p1y, 20, 26);
  drawLitWindow(ctx, p2x, p2y, 20, 26);

  // Ahşap Giriş Kapısı ve Sundurma
  const doorX = x + w / 2 - 10;
  const doorY = y + h - 34;
  ctx.fillStyle = '#78350f';
  ctx.fillRect(doorX, doorY, 20, 34);
  ctx.strokeStyle = '#451a03';
  ctx.strokeRect(doorX, doorY, 20, 34);

  // Kapı Yanı Sıcak Fener Lambası
  ctx.fillStyle = '#fef08a';
  ctx.beginPath();
  ctx.arc(doorX + 26, doorY + 12, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(254, 240, 138, 0.3)';
  ctx.beginPath();
  ctx.arc(doorX + 26, doorY + 12, 10, 0, Math.PI * 2);
  ctx.fill();

  // Tabela / Numara
  ctx.fillStyle = '#e2e8f0';
  ctx.font = 'bold 9px sans-serif';
  ctx.fillText(label, x + 8, y + h - 8);

  ctx.restore();
}

function drawLitWindow(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  // Çerçeve
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
  // Işık
  ctx.fillStyle = '#fef3c7'; // Sıcak amber
  ctx.fillRect(x, y, w, h);
  // Çıta
  ctx.strokeStyle = '#78350f';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + w / 2, y);
  ctx.lineTo(x + w / 2, y + h);
  ctx.moveTo(x, y + h / 2);
  ctx.lineTo(x + w, y + h / 2);
  ctx.stroke();
  // Pencere pervazı çiçeği / saksı
  ctx.fillStyle = '#22c55e';
  ctx.fillRect(x - 1, y + h, w + 2, 4);
}

// ---------------------------------------------------------------------------
// 4. STREET FURNITURE, TREES & GREENERY
// ---------------------------------------------------------------------------
export function drawStreetLamp(ctx: CanvasRenderingContext2D, x: number, y: number, time: number) {
  ctx.save();
  // Direk tabanı ve döküm ayak
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(x - 3, y - 4, 6, 6);
  ctx.fillRect(x - 1.5, y - 42, 3, 40);

  // Kıvrımlı lamba kolu
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(x, y - 40);
  ctx.quadraticCurveTo(x + 12, y - 44, x + 14, y - 36);
  ctx.stroke();

  // Fener Gövdesi
  ctx.fillStyle = '#475569';
  ctx.fillRect(x + 10, y - 36, 8, 4);
  ctx.fillStyle = '#fef08a';
  ctx.fillRect(x + 11, y - 32, 6, 8);

  // Yere Vuran Sıcak Işık Konisi (Radial Gradient)
  const lampFlicker = 0.9 + 0.1 * Math.sin(time * 6 + x);
  const glow = ctx.createRadialGradient(x + 14, y + 2, 4, x + 14, y + 2, 48);
  glow.addColorStop(0, `rgba(254, 240, 138, ${0.45 * lampFlicker})`);
  glow.addColorStop(0.5, `rgba(254, 215, 170, ${0.2 * lampFlicker})`);
  glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.ellipse(x + 14, y + 2, 54, 20, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

export function drawFoliageTree(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  time: number,
  index: number
) {
  ctx.save();
  // Rüzgarda sallanma açısı
  const sway = Math.sin(time * 1.8 + index * 1.3) * 3;

  // Ağaç Gövde Gölgesi
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.beginPath();
  ctx.ellipse(x, y + 6, radius * 0.9, radius * 0.35, 0, 0, Math.PI * 2);
  ctx.fill();

  // Gövde (Trunk)
  ctx.fillStyle = '#5c3a21';
  ctx.beginPath();
  ctx.moveTo(x - 5, y + 5);
  ctx.lineTo(x - 3 + sway * 0.3, y - radius * 0.7);
  ctx.lineTo(x + 3 + sway * 0.3, y - radius * 0.7);
  ctx.lineTo(x + 5, y + 5);
  ctx.closePath();
  ctx.fill();

  // Katmanlı Yaprak Taçları (Derinlikli Yeşil Küreler)
  const treeY = y - radius * 0.9;
  const layers = [
    { dx: -sway * 0.2, dy: 6, r: radius * 0.85, color: '#166534' }, // Koyu alt taban
    { dx: -sway * 0.5 - 6, dy: 0, r: radius * 0.75, color: '#15803d' }, // Sol gölge
    { dx: sway * 0.5 + 6, dy: 0, r: radius * 0.75, color: '#16a34a' }, // Sağ orta
    { dx: sway, dy: -8, r: radius * 0.65, color: '#22c55e' }, // Üst ışıklı taç
  ];

  for (const l of layers) {
    ctx.fillStyle = l.color;
    ctx.beginPath();
    ctx.arc(x + l.dx, treeY + l.dy, l.r, 0, Math.PI * 2);
    ctx.fill();
    // Işık kenarı
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  ctx.restore();
}

// ---------------------------------------------------------------------------
// 5. INTERACTIVE OBJECTS (REAL IN-WORLD ASSETS, NO DEBUG MARKERS)
// ---------------------------------------------------------------------------
// A. Drenaj Menfezi / Izgara (Real Storm Sewer Grate)
export function drawDrainageManhole(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  isNearby: boolean,
  time: number,
  stormActive: boolean
) {
  ctx.save();

  // Zemin çöküntüsü & beton menfez çerçevesi
  ctx.fillStyle = '#26333d';
  ctx.beginPath();
  ctx.ellipse(x, y, 22, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Döküm Demir Izgara Kapak
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.ellipse(x, y, 17, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  // Izgara Yarıkları
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 1.5;
  for (let i = -10; i <= 10; i += 4) {
    ctx.beginPath();
    ctx.moveTo(x + i, y - 5);
    ctx.lineTo(x + i, y + 5);
    ctx.stroke();
  }

  // Fırtına Aktifken: Izgaraya Çekilen Girdap Suyu
  if (stormActive) {
    const swirl = (time * 6) % (Math.PI * 2);
    ctx.strokeStyle = 'rgba(125, 211, 252, 0.7)';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.ellipse(x, y, 14, 8, swirl, 0, Math.PI * 1.5);
    ctx.stroke();
  }

  // Mühendislik Katlanır Uyarı Tripodu (Yanında Gerçek Ekipman)
  ctx.strokeStyle = '#f97316'; // Turuncu ayaklar
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + 22, y + 8);
  ctx.lineTo(x + 28, y - 16);
  ctx.lineTo(x + 34, y + 8);
  ctx.stroke();
  // Reflektif levha
  ctx.fillStyle = '#facc15';
  ctx.beginPath();
  ctx.moveTo(x + 28, y - 14);
  ctx.lineTo(x + 33, y - 4);
  ctx.lineTo(x + 23, y - 4);
  ctx.closePath();
  ctx.fill();

  // Yakındayken Şık Holografik Etkileşim Halkası (Debug dairesi değil!)
  if (isNearby) {
    const pulse = 1 + 0.1 * Math.sin(time * 5);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.ellipse(x, y, 30 * pulse, 18 * pulse, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  ctx.restore();
}

// B. Sünger Kent Yağmur Parkı (Lush Bio-Retention Basin)
export function drawSpongeParkAsset(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  isBuilt: boolean,
  isNearby: boolean,
  time: number
) {
  ctx.save();

  if (isBuilt) {
    // İnşa Edilmiş Biyo-Tutma Göleti
    // 1. Kademeli Doğal Kireçtaşı Çanak
    ctx.fillStyle = '#1e382d';
    ctx.beginPath();
    ctx.ellipse(x, y, 62, 34, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#4ade80';
    ctx.lineWidth = 3;
    ctx.stroke();

    // 2. Berrak Temiz Su Havzası
    const waterGrad = ctx.createRadialGradient(x, y, 5, x, y, 50);
    waterGrad.addColorStop(0, '#22c55e');
    waterGrad.addColorStop(0.7, '#0891b2');
    waterGrad.addColorStop(1, '#164e63');
    ctx.fillStyle = waterGrad;
    ctx.beginPath();
    ctx.ellipse(x, y, 52, 26, 0, 0, Math.PI * 2);
    ctx.fill();

    // Nilüfer Yaprakları & Sazlıklar
    const reeds = [
      { rx: x - 30, ry: y - 8 },
      { rx: x + 25, ry: y + 6 },
      { rx: x - 10, ry: y + 14 },
    ];
    for (const r of reeds) {
      ctx.fillStyle = '#86efac';
      ctx.beginPath();
      ctx.arc(r.rx, r.ry, 6, 0, Math.PI * 2);
      ctx.fill();
    }

    // Gölet Kenarı Park Yolu & Küçük Bank
    ctx.fillStyle = '#78350f';
    ctx.fillRect(x + 44, y - 8, 14, 5);
  } else {
    // İnşa Edilmemiş Zemin: Şantiye / Keşif Sahası
    ctx.strokeStyle = 'rgba(74, 222, 128, 0.4)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.ellipse(x, y, 48, 24, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Ahşap Proje Tabelası & Ölçüm Kazıkları
    ctx.fillStyle = '#78350f';
    ctx.fillRect(x - 2, y - 16, 4, 16);
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(x - 14, y - 26, 28, 12);
    ctx.strokeStyle = '#ca8a04';
    ctx.strokeRect(x - 14, y - 26, 28, 12);
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 7px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SÜNGER', x, y - 18);
  }

  if (isNearby) {
    const pulse = 1 + 0.08 * Math.sin(time * 5);
    ctx.strokeStyle = '#4ade80';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(x, y, 56 * pulse, 30 * pulse, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

// C. Yükseltilmiş Menfez & Güvenli Dönüşüm Sahası
export function drawRetrofitCulvertAsset(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  isBuilt: boolean,
  isNearby: boolean,
  time: number
) {
  ctx.save();

  if (isBuilt) {
    // Ağır Beton Menfez Köprüsü ve Çelik Güvenlik Bariyerleri
    ctx.fillStyle = '#475569';
    ctx.fillRect(x - 45, y - 16, 90, 32);
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2;
    ctx.strokeRect(x - 45, y - 16, 90, 32);

    // Kemerli Su Geçiş Ağzı (Culvert Box Arch)
    ctx.fillStyle = '#09151e';
    ctx.beginPath();
    ctx.arc(x, y + 10, 16, Math.PI, 0);
    ctx.fill();

    // Reflektif Sarı-Siyah Güvenlik Korkulukları
    ctx.strokeStyle = '#eab308';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x - 42, y - 14);
    ctx.lineTo(x + 42, y - 14);
    ctx.stroke();

    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 4;
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.moveTo(x - 42, y - 14);
    ctx.lineTo(x + 42, y - 14);
    ctx.stroke();
    ctx.setLineDash([]);
  } else {
    // Şantiye Konileri ve Çizgileri
    const cones = [-20, 0, 20];
    for (const cx of cones) {
      // Turuncu trafik konisi
      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.moveTo(x + cx, y - 12);
      ctx.lineTo(x + cx + 5, y);
      ctx.lineTo(x + cx - 5, y);
      ctx.closePath();
      ctx.fill();
      // Beyaz şerit
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x + cx - 3, y - 7, 6, 3);
    }
  }

  if (isNearby) {
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(x, y, 46, 22, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

// ---------------------------------------------------------------------------
// 6. DETAILED CHARACTER SPRITES: MİRA & ARAS
// ---------------------------------------------------------------------------
// MİRA (Player Character — Hand-crafted 2.5D Animated Sprite)
export function drawMiraSprite(
  ctx: CanvasRenderingContext2D,
  state: CharacterRenderState,
  time: number
) {
  const { x, y, facing, isMoving, frame } = state;
  ctx.save();

  // A. Gerçekçi Oval Zemin Gölgesi
  ctx.fillStyle = 'rgba(7, 15, 20, 0.45)';
  ctx.beginPath();
  ctx.ellipse(x, y + 16, 13, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  // Yürüme sallantısı (bobbing)
  const bob = isMoving ? (frame % 2 === 0 ? -2 : 0) : Math.sin(time * 3) * 0.7;

  // B. Bacaklar ve Saha Botları (Walk Cycle)
  ctx.fillStyle = '#1e293b'; // Koyu taktik pantolon
  const legSwing = isMoving ? (frame === 1 ? 5 : frame === 3 ? -5 : 0) : 0;

  // Sol bacak
  ctx.fillRect(x - 8, y + 4 + bob, 6, 12 + legSwing);
  // Sağ bacak
  ctx.fillRect(x + 2, y + 4 + bob, 6, 12 - legSwing);

  // Botlar (Kahverengi kalın tabanlı saha botu)
  ctx.fillStyle = '#78350f';
  ctx.fillRect(x - 9, y + 14 + bob + legSwing, 8, 4);
  ctx.fillRect(x + 1, y + 14 + bob - legSwing, 8, 4);

  // C. Gövde (Mira'nın İkonik Teal İklim Saha Ceketi)
  const jacketGrad = ctx.createLinearGradient(x - 10, y - 16, x + 10, y + 6);
  jacketGrad.addColorStop(0, '#0284c7');
  jacketGrad.addColorStop(1, '#0e7490');
  ctx.fillStyle = jacketGrad;
  ctx.fillRect(x - 10, y - 14 + bob, 20, 20);

  // Ceket Fermuarı ve Yaka
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x, y - 14 + bob);
  ctx.lineTo(x, y + 6 + bob);
  ctx.stroke();

  // D. Kollar ve İklim Sensörü
  ctx.fillStyle = '#0369a1';
  if (facing === 'right') {
    ctx.fillRect(x + 7, y - 10 + bob, 5, 12);
    // Sensör Cihazı (Elinde)
    ctx.fillStyle = '#10b981'; // Yeşil parlayan ekran
    ctx.fillRect(x + 10, y - 2 + bob, 5, 8);
  } else if (facing === 'left') {
    ctx.fillRect(x - 12, y - 10 + bob, 5, 12);
    ctx.fillStyle = '#10b981';
    ctx.fillRect(x - 15, y - 2 + bob, 5, 8);
  } else {
    // Aşağı veya yukarı bakış
    ctx.fillRect(x - 13, y - 10 + bob, 4, 12);
    ctx.fillRect(x + 9, y - 10 + bob, 4, 12);
  }

  // E. Baş, Yüz ve Mira'nın İkonik Atkuyruğu Saçı
  // Boyun
  ctx.fillStyle = '#fed7aa';
  ctx.fillRect(x - 3, y - 18 + bob, 6, 4);

  // Kafa / Yüz
  ctx.beginPath();
  ctx.arc(x, y - 24 + bob, 9, 0, Math.PI * 2);
  ctx.fill();

  // Saç (Koyu Kumral / Bakır-Kahve)
  ctx.fillStyle = '#854d0e';
  ctx.beginPath();
  ctx.arc(x, y - 26 + bob, 9.5, Math.PI * 0.8, Math.PI * 2.2);
  ctx.fill();

  // Atkuyruğu Saç (Ponytail with physics)
  const hairSway = isMoving ? Math.sin(time * 8) * 3 : 0;
  ctx.fillStyle = '#713f12';
  if (facing === 'left') {
    ctx.beginPath();
    ctx.ellipse(x + 7 + hairSway, y - 26 + bob, 5, 10, 0.4, 0, Math.PI * 2);
    ctx.fill();
  } else if (facing === 'right') {
    ctx.beginPath();
    ctx.ellipse(x - 7 + hairSway, y - 26 + bob, 5, 10, -0.4, 0, Math.PI * 2);
    ctx.fill();
  } else if (facing === 'down') {
    ctx.beginPath();
    ctx.ellipse(x + 6 + hairSway, y - 28 + bob, 4, 9, 0.3, 0, Math.PI * 2);
    ctx.fill();
    // Yüz Detayları: Gözler
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(x - 4, y - 24 + bob, 2, 2);
    ctx.fillRect(x + 2, y - 24 + bob, 2, 2);
  } else {
    // Yukarı bakarken arkadan atkuyruğu görünür
    ctx.beginPath();
    ctx.ellipse(x + hairSway, y - 20 + bob, 5, 11, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // İsim Rozeti (Zarif ve Okunabilir)
  ctx.fillStyle = '#e0f2fe';
  ctx.font = 'bold 9px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('MİRA', x, y - 38 + bob);

  ctx.restore();
}

// ARAS (Şehir Mühendisi NPC — Turuncu Yelek, Baret, Dijital Tablet)
export function drawArasSprite(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  isNearby: boolean,
  time: number
) {
  ctx.save();

  // Gölge
  ctx.fillStyle = 'rgba(7, 15, 20, 0.45)';
  ctx.beginPath();
  ctx.ellipse(x, y + 16, 14, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  const idleBob = Math.sin(time * 2.5) * 0.8;

  // Pantolon ve İş Botları
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(x - 8, y + 4 + idleBob, 6, 12);
  ctx.fillRect(x + 2, y + 4 + idleBob, 6, 12);
  ctx.fillStyle = '#451a03'; // Çelik burunlu iş botu
  ctx.fillRect(x - 9, y + 14 + idleBob, 8, 4);
  ctx.fillRect(x + 1, y + 14 + idleBob, 8, 4);

  // Gövde: Yüksek Görünürlüklü Turuncu Mühendis Yeleği (High-Vis Vest)
  ctx.fillStyle = '#f97316';
  ctx.fillRect(x - 11, y - 14 + idleBob, 22, 20);

  // Reflektif Gümüş Şeritler
  ctx.fillStyle = '#f1f5f9';
  ctx.fillRect(x - 11, y - 8 + idleBob, 22, 3);
  ctx.fillRect(x - 11, y - 1 + idleBob, 22, 3);

  // Kollar ve Dijital Şantiye Tableti
  ctx.fillStyle = '#ea580c';
  ctx.fillRect(x - 14, y - 10 + idleBob, 4, 12);
  ctx.fillRect(x + 10, y - 10 + idleBob, 4, 12);

  // Tablet (Mavi parlayan mühendislik ekranı)
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(x - 6, y - 4 + idleBob, 12, 10);
  ctx.fillStyle = '#38bdf8';
  ctx.fillRect(x - 5, y - 3 + idleBob, 10, 8);

  // Baş & Yüz
  ctx.fillStyle = '#fed7aa';
  ctx.beginPath();
  ctx.arc(x, y - 23 + idleBob, 9, 0, Math.PI * 2);
  ctx.fill();

  // Sakal
  ctx.fillStyle = '#573010';
  ctx.beginPath();
  ctx.arc(x, y - 22 + idleBob, 8.5, 0.2, Math.PI - 0.2);
  ctx.fill();

  // Sarı Şantiye Bareti
  ctx.fillStyle = '#facc15';
  ctx.beginPath();
  ctx.arc(x, y - 27 + idleBob, 10, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(x - 12, y - 27 + idleBob, 24, 4); // Baret siperliği

  // İsim Rozeti
  ctx.fillStyle = '#fed7aa';
  ctx.font = 'bold 9px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('ARAS [MÜHENDİS]', x, y - 38 + idleBob);

  // Konuşma İpuç Dairesi / Vurgusu
  if (isNearby) {
    const pulse = 1 + 0.1 * Math.sin(time * 6);
    ctx.strokeStyle = '#f97316';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.ellipse(x, y + 16, 20 * pulse, 10 * pulse, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  ctx.restore();
}

// ---------------------------------------------------------------------------
// 7. REALISTIC HYDROLOGICAL FLOOD & WATER PHYSICS
// ---------------------------------------------------------------------------
export function drawHydrologicalFlood(
  ctx: CanvasRenderingContext2D,
  time: number,
  roadWaterDepth: number,
  roadPassable: boolean,
  stormActive: boolean
) {
  if (roadWaterDepth <= 2) return;

  ctx.save();
  // Hastane Yolu Çukuru Koordinatları
  const fx = 1310;
  const fy = 520;

  // Derinliğe Göre Dinamik Genişleyen Çukur Su Yüzeyi
  const rx = Math.min(95, 25 + roadWaterDepth * 1.8);
  const ry = Math.min(45, 12 + roadWaterDepth * 0.85);

  // 1. Zemin Islaklık / Çamur Kenarı (Muddy Shoreline Gradient)
  const shoreGrad = ctx.createRadialGradient(fx, fy, rx * 0.7, fx, fy, rx + 14);
  shoreGrad.addColorStop(0, 'rgba(15, 60, 80, 0.7)');
  shoreGrad.addColorStop(0.8, 'rgba(30, 45, 55, 0.5)');
  shoreGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = shoreGrad;
  ctx.beginPath();
  ctx.ellipse(fx, fy, rx + 14, ry + 8, 0, 0, Math.PI * 2);
  ctx.fill();

  // 2. Derinlik Tabanlı Su Katmanı
  const waterGrad = ctx.createRadialGradient(fx, fy, 4, fx, fy, rx);
  if (roadPassable) {
    // 30 cm altı: Yönetilebilir türbülanslı yağmur suyu (Turkuaz - Koyu Mavi)
    waterGrad.addColorStop(0, 'rgba(14, 165, 233, 0.85)');
    waterGrad.addColorStop(0.6, 'rgba(2, 132, 199, 0.75)');
    waterGrad.addColorStop(1, 'rgba(3, 105, 161, 0.5)');
  } else {
    // 30 cm üstü: Tehlikeli taşkın suyu (Koyu Kırmızımsı / Çamurlu Acil Durum)
    waterGrad.addColorStop(0, 'rgba(220, 38, 38, 0.88)');
    waterGrad.addColorStop(0.5, 'rgba(185, 28, 28, 0.8)');
    waterGrad.addColorStop(1, 'rgba(153, 27, 27, 0.6)');
  }
  ctx.fillStyle = waterGrad;
  ctx.beginPath();
  ctx.ellipse(fx, fy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();

  // 3. Akış Çizgileri ve Köpük Dalgaları (Moving Flow Caustics)
  const waveShift = (time * 25) % rx;
  ctx.strokeStyle = 'rgba(240, 249, 255, 0.6)';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.ellipse(fx, fy, Math.max(8, waveShift), Math.max(4, waveShift * (ry / rx)), 0, 0, Math.PI * 2);
  ctx.stroke();

  // İkinci dalga
  const waveShift2 = (time * 25 + rx * 0.5) % rx;
  ctx.strokeStyle = 'rgba(240, 249, 255, 0.35)';
  ctx.beginPath();
  ctx.ellipse(fx, fy, Math.max(6, waveShift2), Math.max(3, waveShift2 * (ry / rx)), 0, 0, Math.PI * 2);
  ctx.stroke();

  // 4. Fiziksel Derinlik Ölçüm Direği (Flood Gauge Pole in Water)
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(fx + rx * 0.4, fy - 28, 6, 32);
  // Sarı-Siyah 10cm çizgileri
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#eab308' : '#000000';
    ctx.fillRect(fx + rx * 0.4, fy - 28 + i * 7, 6, 7);
  }

  // Tepe Uyarı Bayrağı / Rozet
  ctx.fillStyle = roadPassable ? '#10b981' : '#ef4444';
  ctx.fillRect(fx + rx * 0.4 - 24, fy - 40, 54, 14);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 9px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`${roadWaterDepth} cm`, fx + rx * 0.4 + 3, fy - 30);

  ctx.restore();
}

// ---------------------------------------------------------------------------
// 8. EMERGENCY AMBULANCE VEHICLE (HIGH-RES DETAIL WITH ROTATING BEACONS)
// ---------------------------------------------------------------------------
export function drawDetailedAmbulance(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  isStuck: boolean,
  time: number
) {
  ctx.save();

  // Gölge
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.fillRect(x - 2, y + 16, 52, 8);

  // Kasa (Beyaz Acil Yardım Minibüsü)
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(x, y, 48, 20);
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x, y, 48, 20);

  // Camlar (Ön ve Yan Cam)
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(x + 32, y + 2, 12, 10); // Ön cam
  ctx.fillRect(x + 10, y + 2, 16, 8);  // Yan kabin camı

  // Avrupa Tipi Sarı-Yeşil Reflektif Battenburg Kareleri
  const stripeColors = ['#facc15', '#15803d'];
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = stripeColors[i % 2];
    ctx.fillRect(x + 4 + i * 7, y + 12, 7, 6);
  }

  // Kırmızı Haç / Hilal Amblemi
  ctx.fillStyle = '#ef4444';
  ctx.fillRect(x + 14, y + 4, 8, 2);
  ctx.fillRect(x + 17, y + 1, 2, 8);

  // Tekerlekler
  ctx.fillStyle = '#020617';
  ctx.fillRect(x + 6, y + 16, 8, 6);
  ctx.fillRect(x + 34, y + 16, 8, 6);

  // Çift Döner Tepe Flaşör Lambaları (Kırmızı & Mavi Polis/Ambulans Flaşörü)
  const flash = Math.sin(time * 12) > 0;
  // Mavi flaşör
  ctx.fillStyle = flash ? '#38bdf8' : '#0369a1';
  ctx.fillRect(x + 14, y - 5, 8, 5);
  // Kırmızı flaşör
  ctx.fillStyle = !flash ? '#ef4444' : '#991b1b';
  ctx.fillRect(x + 24, y - 5, 8, 5);

  // Asfalta Vuran Çakar Işığı Yansıması
  const glowX = flash ? x + 18 : x + 28;
  const glowColor = flash ? 'rgba(56, 189, 248, 0.4)' : 'rgba(239, 68, 68, 0.4)';
  ctx.fillStyle = glowColor;
  ctx.beginPath();
  ctx.ellipse(glowX, y + 20, 24, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  if (isStuck) {
    // Suda Mahsur Kalma Alarmı
    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('🚨 BLOKE', x + 24, y - 8);
  }

  ctx.restore();
}

// ---------------------------------------------------------------------------
// 9. PARK BENCHES, FLOWERBEDS & ADDITIONAL STREET DETAILS
// ---------------------------------------------------------------------------
export function drawParkBench(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.save();
  // Gölge
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.fillRect(x - 2, y + 8, 28, 4);

  // Döküm metal ayaklar
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(x, y + 2, 3, 8);
  ctx.fillRect(x + 21, y + 2, 3, 8);

  // Ahşap çıtalar
  ctx.fillStyle = '#78350f';
  ctx.fillRect(x - 2, y, 28, 4);  // Oturak
  ctx.fillRect(x - 2, y - 5, 28, 3); // Sırtlık
  ctx.restore();
}

export function drawFlowerPlanter(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.save();
  // Beton saksı
  ctx.fillStyle = '#475569';
  ctx.fillRect(x, y, 22, 10);
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, 22, 10);

  // Çiçekler
  const colors = ['#f43f5e', '#fbbf24', '#38bdf8', '#a855f7'];
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = colors[i];
    ctx.beginPath();
    ctx.arc(x + 3 + i * 5, y - 1, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// ---------------------------------------------------------------------------
// 10. OTHER DISTRICT LANDMARKS (SAAT KULESİ, TARİHİ ÇARŞI, MÜZE, LİMAN, SANAYİ)
// ---------------------------------------------------------------------------
export function drawHistoricClockTower(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  time: number
) {
  ctx.save();
  // Gölge
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.fillRect(x + 8, y + h - 2, w, 16);

  // Taş Kule Gövdesi
  const towerGrad = ctx.createLinearGradient(x, y, x, y + h);
  towerGrad.addColorStop(0, '#525e65');
  towerGrad.addColorStop(1, '#343e45');
  ctx.fillStyle = towerGrad;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#71828d';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);

  // Taş Derzleri
  ctx.strokeStyle = 'rgba(15, 23, 42, 0.4)';
  ctx.lineWidth = 1;
  for (let py = y + 15; py < y + h; py += 16) {
    ctx.beginPath();
    ctx.moveTo(x, py);
    ctx.lineTo(x + w, py);
    ctx.stroke();
  }

  // Bakır Kemerli Çatı & Kubbe
  const domeH = 26;
  ctx.fillStyle = '#0d9488'; // Bakır pası turkuaz/yeşil
  ctx.beginPath();
  ctx.moveTo(x - 4, y);
  ctx.quadraticCurveTo(x + w / 2, y - domeH, x + w + 4, y);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#14b8a6';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Saat Kadranı (Büyük Işıklı Yuvarlak Saat)
  const clockX = x + w / 2;
  const clockY = y + 26;
  ctx.fillStyle = '#fef08a'; // Sıcak amber ışık
  ctx.beginPath();
  ctx.arc(clockX, clockY, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Akrep ve Yelkovan
  const secondAngle = time * 0.5;
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(clockX, clockY);
  ctx.lineTo(clockX + Math.cos(secondAngle) * 9, clockY + Math.sin(secondAngle) * 9);
  ctx.stroke();

  // Tabela
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 9px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('SAAT KULESİ', clockX, y + h - 8);

  ctx.restore();
}

export function drawBazaarBuilding(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number
) {
  ctx.save();
  // Gölge
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.fillRect(x + 10, y + h - 2, w, 14);

  // Duvar
  ctx.fillStyle = '#7c2d12'; // Tarihi kırmızı tuğla
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#9a3412';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);

  // Kemerli Pencereler
  for (let i = 0; i < 3; i++) {
    const archX = x + 20 + i * 40;
    const archY = y + 20;
    ctx.fillStyle = '#fef3c7';
    ctx.beginPath();
    ctx.arc(archX + 12, archY, 12, Math.PI, 0);
    ctx.lineTo(archX + 24, archY + 20);
    ctx.lineTo(archX, archY + 20);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#431407';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // Tente (Çizgili Kırmızı-Beyaz Çarşı Tenteleri)
  const awningY = y + h - 28;
  const awningW = w - 16;
  const stripeCount = 8;
  const stripeW = awningW / stripeCount;
  for (let s = 0; s < stripeCount; s++) {
    ctx.fillStyle = s % 2 === 0 ? '#dc2626' : '#f8fafc';
    ctx.fillRect(x + 8 + s * stripeW, awningY, stripeW, 14);
  }

  // Tabela
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 10px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('TARİHİ ÇARŞI', x + w / 2, y + 14);

  ctx.restore();
}

export function drawMuseumBuilding(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number
) {
  ctx.save();
  // Gölge
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.fillRect(x + 10, y + h - 2, w, 16);

  // Klasik Taş Cephe
  ctx.fillStyle = '#475569';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);

  // Üçgen Alınlık (Pediment)
  ctx.fillStyle = '#334155';
  ctx.beginPath();
  ctx.moveTo(x - 6, y);
  ctx.lineTo(x + w / 2, y - 24);
  ctx.lineTo(x + w + 6, y);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Neoklasik Sütunlar (Columns)
  const colCount = 5;
  const colSpacing = (w - 24) / (colCount - 1);
  for (let c = 0; c < colCount; c++) {
    const cx = x + 12 + c * colSpacing;
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(cx - 3, y + 4, 6, h - 8);
    // Sütun başlığı
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(cx - 5, y + 2, 10, 4);
    ctx.fillRect(cx - 5, y + h - 6, 10, 4);
  }

  // Tabela
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 9px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('BELEDİYE MÜZESİ', x + w / 2, y + h - 12);

  ctx.restore();
}

export function drawIndustryWarehouse(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number
) {
  ctx.save();
  // Gölge
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.fillRect(x + 8, y + h - 2, w, 14);

  // Oluklu Sac Panel Duvarlar
  ctx.fillStyle = '#334155';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x, y, w, h);

  // Dikey panel olukları
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.lineWidth = 1;
  for (let px = x + 8; px < x + w; px += 10) {
    ctx.beginPath();
    ctx.moveTo(px, y);
    ctx.lineTo(px, y + h);
    ctx.stroke();
  }

  // Sarı-Siyah Güvenlik Tehlike Şeritleri (Kargo Yükleme Kapısı)
  const gateW = 44;
  const gateH = 32;
  const gateX = x + w / 2 - gateW / 2;
  const gateY = y + h - gateH;
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(gateX, gateY, gateW, gateH);

  // Kapı üstü sarı-siyah şerit
  ctx.strokeStyle = '#eab308';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(gateX, gateY);
  ctx.lineTo(gateX + gateW, gateY);
  ctx.stroke();

  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 4;
  ctx.setLineDash([6, 6]);
  ctx.beginPath();
  ctx.moveTo(gateX, gateY);
  ctx.lineTo(gateX + gateW, gateY);
  ctx.stroke();
  ctx.setLineDash([]);

  // Tabela
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 9px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('SANAYİ TESİSLERİ', x + w / 2, y + 16);

  ctx.restore();
}

export function drawHarborDock(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number
) {
  ctx.save();
  // İskele Tahta Zemin
  ctx.fillStyle = '#452a18';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#29180c';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);

  // İskele tahtaları
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.lineWidth = 1;
  for (let py = y + 8; py < y + h; py += 12) {
    ctx.beginPath();
    ctx.moveTo(x, py);
    ctx.lineTo(x + w, py);
    ctx.stroke();
  }

  // Rıhtım Baba Direkleri (Mooring Bollards)
  for (let bx = x + 16; bx < x + w; bx += 36) {
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(bx - 3, y - 6, 6, 8);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(bx - 5, y - 8, 10, 4);
  }

  // Tabela
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 9px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('LİMAN RIHTIMI', x + w / 2, y + h - 10);

  ctx.restore();
}


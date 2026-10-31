/**
 * FELAKET BENİM — Pixel-Art World & Tilemap Renderer
 * Authentic top-down pixel-art game engine for the explorable city & hospital district.
 */

export interface WorldRenderContext {
  ctx: CanvasRenderingContext2D;
  time: number; // in seconds
  camX: number;
  camY: number;
  viewWidth: number;
  viewHeight: number;
  activeDefenses: string[];
  roadWaterDepth: number; // in cm
  roadPassable: boolean;
  stormActive: boolean;
  questStep?: number;
  targetObjective?: { x: number; y: number; label: string } | null;
}

export interface CharacterRenderState {
  x: number;
  y: number;
  facing: 'down' | 'up' | 'left' | 'right';
  isMoving: boolean;
  frame: number;
}

// ---------------------------------------------------------------------------
// 1. TILE SYSTEM & TERRAIN RENDERING
// ---------------------------------------------------------------------------

// Procedural tile patterns generated deterministically
export function drawPixelWorldMap(rc: WorldRenderContext, worldWidth: number, worldHeight: number) {
  const { ctx, time, stormActive, roadWaterDepth, activeDefenses } = rc;

  // Disable image smoothing for ultra-crisp pixel art
  ctx.imageSmoothingEnabled = false;

  // 1. Base Greenery (Grassland with subtle multi-shade pixel texture)
  ctx.fillStyle = '#2d5a37'; // Cozy lush meadow green
  ctx.fillRect(0, 0, worldWidth, worldHeight);

  // Natural grass variation & flower tufts (deterministic pseudo-random grid)
  ctx.fillStyle = '#386b44';
  for (let gy = 0; gy < worldHeight; gy += 32) {
    for (let gx = 0; gx < worldWidth; gx += 32) {
      const hash = Math.sin(gx * 12.9898 + gy * 78.233) * 43758.5453;
      const r = hash - Math.floor(hash);
      if (r > 0.65) {
        ctx.fillRect(gx + 4, gy + 4, 6, 6);
        ctx.fillRect(gx + 18, gy + 14, 8, 4);
      }
      if (r > 0.88) {
        // Tiny wildflower
        ctx.fillStyle = r > 0.94 ? '#e5c07b' : '#61afef';
        ctx.fillRect(gx + 12, gy + 8, 4, 4);
        ctx.fillStyle = '#386b44'; // restore
      }
    }
  }

  // 2. Terraced Cliff / Elevation Retaining Stone Wall (Separates hillside from lower district)
  drawPixelStoneRetainingWall(ctx, 800, 150, 1900, 150);
  drawPixelStoneRetainingWall(ctx, 800, 480, 1950, 480);

  // 3. Roads & Sidewalks System
  // A. Main Vertical Avenue (Merkez - Yamaç Bağı, x: 740 - 860)
  drawPixelAvenueVertical(ctx, 760, 0, 100, worldHeight);

  // B. Main Horizontal Boulevard (Kıyı - Sanayi Bağı, y: 720 - 820)
  drawPixelBoulevardHorizontal(ctx, 0, 720, worldWidth, 100);

  // C. Hospital Access Road (Kritik Koridor: Curves from avenue x:860 up into Hospital plaza x:1350)
  drawPixelHospitalAccessCorridor(ctx, time, roadWaterDepth, stormActive);

  // D. Pedestrian Brick / Cobblestone Pathways & Plaza around Hospital
  drawPixelHospitalPlaza(ctx, 1300, 220, 360, 220);

  // E. Terraced Residential Pathways
  drawPixelDirtTrail(ctx, 920, 220, 1280, 220);

  // 4. Dynamic Flood Water Accumulation (Responsive to Simulation State)
  drawPixelFloodLayer(rc, time, roadWaterDepth, stormActive, activeDefenses);
}

// Stone Retaining Wall with Pixel Brickwork
function drawPixelStoneRetainingWall(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number) {
  const height = 24;
  ctx.fillStyle = '#3a444a';
  ctx.fillRect(x1, y1, x2 - x1, height);

  // Top stone cap
  ctx.fillStyle = '#5c6773';
  ctx.fillRect(x1, y1 - 4, x2 - x1, 6);

  // Pixel mortar pattern
  ctx.fillStyle = '#262d33';
  for (let x = x1; x < x2; x += 24) {
    ctx.fillRect(x, y1 + 2, 2, height - 4);
    ctx.fillRect(x + 12, y1 + 12, 2, height - 14);
  }
}

// Vertical Asphalt Avenue
function drawPixelAvenueVertical(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  // Sidewalks
  ctx.fillStyle = '#7a858d';
  ctx.fillRect(x - 16, y, 16, h);
  ctx.fillRect(x + w, y, 16, h);

  // Curb shadow
  ctx.fillStyle = '#4c535a';
  ctx.fillRect(x, y, 4, h);
  ctx.fillRect(x + w - 4, y, 4, h);

  // Road Asphalt
  ctx.fillStyle = '#2c313a';
  ctx.fillRect(x + 4, y, w - 8, h);

  // Yellow dashed lane divider
  ctx.fillStyle = '#d19a66';
  const centerX = x + w / 2 - 2;
  for (let py = y + 10; py < y + h; py += 40) {
    ctx.fillRect(centerX, py, 4, 22);
  }
}

// Horizontal Asphalt Boulevard
function drawPixelBoulevardHorizontal(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  // Sidewalks
  ctx.fillStyle = '#7a858d';
  ctx.fillRect(x, y - 16, w, 16);
  ctx.fillRect(x, y + h, w, 16);

  // Curbs
  ctx.fillStyle = '#4c535a';
  ctx.fillRect(x, y, w, 4);
  ctx.fillRect(x, y + h - 4, w, 4);

  // Asphalt
  ctx.fillStyle = '#2c313a';
  ctx.fillRect(x, y + 4, w, h - 8);

  // Center divider
  ctx.fillStyle = '#d19a66';
  const centerY = y + h / 2 - 2;
  for (let px = x + 10; px < x + w; px += 44) {
    ctx.fillRect(px, centerY, 24, 4);
  }

  // Crosswalk (Avenue intersection at x: 760 - 860)
  ctx.fillStyle = '#e5e9f0';
  for (let py = y + 8; py < y + h - 8; py += 12) {
    ctx.fillRect(770, py, 80, 6);
  }
}

// Hospital Access Road (The critical corridor connecting Main Avenue to Hospital)
function drawPixelHospitalAccessCorridor(
  ctx: CanvasRenderingContext2D,
  time: number,
  waterDepth: number,
  stormActive: boolean
) {
  // Centerline control points from Avenue intersection to Hospital Entrance
  const waypoints = [
    { x: 860, y: 740 },
    { x: 920, y: 710 },
    { x: 1000, y: 650 },
    { x: 1080, y: 580 },
    { x: 1160, y: 520 }, // Menfez & low depression
    { x: 1240, y: 470 },
    { x: 1310, y: 435 },
    { x: 1380, y: 415 }, // Plaza connection
  ];

  const roadHalfWidth = 36;

  // 1. Sidewalk / Curb underlay (Paved stone border)
  ctx.strokeStyle = '#828d96';
  ctx.lineWidth = (roadHalfWidth + 6) * 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(waypoints[0].x, waypoints[0].y);
  for (let i = 1; i < waypoints.length; i++) {
    ctx.lineTo(waypoints[i].x, waypoints[i].y);
  }
  ctx.stroke();

  // 2. Asphalt Surface
  ctx.strokeStyle = '#2c313a';
  ctx.lineWidth = roadHalfWidth * 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(waypoints[0].x, waypoints[0].y);
  for (let i = 1; i < waypoints.length; i++) {
    ctx.lineTo(waypoints[i].x, waypoints[i].y);
  }
  ctx.stroke();

  // 3. Center Yellow Dashed Divider
  ctx.strokeStyle = '#e5c07b';
  ctx.lineWidth = 3;
  ctx.setLineDash([14, 16]);
  ctx.beginPath();
  ctx.moveTo(waypoints[0].x, waypoints[0].y);
  for (let i = 1; i < waypoints.length; i++) {
    ctx.lineTo(waypoints[i].x, waypoints[i].y);
  }
  ctx.stroke();
  ctx.setLineDash([]); // Reset line dash

  // 4. Crosswalk at Plaza Entrance
  ctx.fillStyle = '#d8dee9';
  for (let i = 0; i < 6; i++) {
    ctx.fillRect(1350 + i * 12, 385, 6, 55);
  }
}

// Paved Plaza & Sidewalk for Hospital
function drawPixelHospitalPlaza(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  // Tile background
  ctx.fillStyle = '#65737e';
  ctx.fillRect(x, y, w, h);

  // Pixel Pavers Pattern
  ctx.fillStyle = '#7a8894';
  for (let py = y + 4; py < y + h; py += 16) {
    for (let px = x + 4; px < x + w; px += 32) {
      ctx.fillRect(px, py, 28, 12);
    }
  }

  // Plaza curb border
  ctx.fillStyle = '#3e4852';
  ctx.strokeRect(x, y, w, h);
}

// Dirt / Hiking Trail
function drawPixelDirtTrail(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number) {
  ctx.fillStyle = '#7c654d';
  ctx.fillRect(x1, y1, x2 - x1, 18);
  ctx.fillStyle = '#947a5e';
  for (let px = x1 + 6; px < x2; px += 18) {
    ctx.fillRect(px, y1 + 3, 10, 10);
  }
}

// ---------------------------------------------------------------------------
// 2. DYNAMIC FLOOD LAYER (PIXEL ART HYDROLOGY)
// ---------------------------------------------------------------------------
function drawPixelFloodLayer(
  rc: WorldRenderContext,
  time: number,
  waterDepth: number,
  stormActive: boolean,
  activeDefenses: string[]
) {
  const { ctx } = rc;
  if (waterDepth <= 0 && !stormActive) return;

  // The flood pools around the road depression (x: 1100 - 1340, y: 490 - 620)
  const poolWidth = Math.min(320, 160 + waterDepth * 2.8);
  const poolHeight = Math.min(150, 60 + waterDepth * 1.5);
  const poolX = 1220 - poolWidth / 2;
  const poolY = 560 - poolHeight / 2;

  // Multi-tier animated pixel water
  const animOffset = Math.sin(time * 3) * 4;

  // Deep water layer (dark teal-blue)
  ctx.fillStyle = waterDepth > 30 ? 'rgba(24, 76, 120, 0.85)' : 'rgba(38, 108, 158, 0.75)';
  ctx.fillRect(poolX, poolY, poolWidth, poolHeight);

  // Stepped depth contours
  if (waterDepth > 15) {
    ctx.fillStyle = 'rgba(16, 52, 84, 0.88)';
    ctx.fillRect(poolX + 30, poolY + 16, poolWidth - 60, poolHeight - 32);
  }

  // Pixel surface ripple lines
  ctx.fillStyle = 'rgba(168, 222, 255, 0.65)';
  for (let py = poolY + 8; py < poolY + poolHeight; py += 16) {
    const shift = Math.floor(Math.sin((py + time * 15) * 0.2) * 6);
    ctx.fillRect(poolX + 20 + shift, py, poolWidth - 40, 2);
    ctx.fillRect(poolX + 40 - shift, py + 6, 24, 2);
  }

  // Floating debris / warning markers if water is dangerous (> 30 cm)
  if (waterDepth > 30) {
    ctx.fillStyle = '#e06c75';
    ctx.fillRect(1210, 550 + Math.sin(time * 4) * 3, 12, 12);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(1214, 552 + Math.sin(time * 4) * 3, 4, 8);
  }
}

// ---------------------------------------------------------------------------
// 3. PIXEL-ART HOSPITAL BUILDING & AMBULANCE
// ---------------------------------------------------------------------------
export function drawPixelHospital(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  time: number,
  stormActive: boolean,
  roadPassable: boolean
) {
  const w = 240;
  const h = 180;

  // Building Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.fillRect(x + 10, y + h - 8, w + 16, 24);

  // Main Concrete Facade
  ctx.fillStyle = '#4a5b6e';
  ctx.fillRect(x, y, w, h);

  // Front Panel / Floor Slabs
  ctx.fillStyle = '#5c6f84';
  ctx.fillRect(x + 8, y + 8, w - 16, h - 16);

  // Windows Matrix (Pixel Medical Facility Glass)
  const windowLit = '#e5c07b';
  const windowReflect = '#7ec7f8';
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 6; col++) {
      const winX = x + 20 + col * 34;
      const winY = y + 36 + row * 34;
      // Window frame
      ctx.fillStyle = '#28323e';
      ctx.fillRect(winX - 2, winY - 2, 24, 18);
      // Window glass
      const isLit = (col + row) % 2 === 0 || stormActive;
      ctx.fillStyle = isLit ? windowLit : windowReflect;
      ctx.fillRect(winX, winY, 20, 14);
      // Glare line
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.fillRect(winX + 2, winY + 2, 4, 10);
    }
  }

  // Prominent Pixel RED CROSS Emblem
  const crossX = x + w / 2 - 16;
  const crossY = y + 10;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(crossX - 4, crossY - 4, 32, 32); // White square badge
  ctx.fillStyle = '#e06c75'; // Red cross
  ctx.fillRect(crossX + 8, crossY, 8, 24);  // Vertical bar
  ctx.fillRect(crossX, crossY + 8, 24, 8);  // Horizontal bar

  // Rooftop Helipad
  const heliX = x + w - 74;
  const heliY = y - 16;
  ctx.fillStyle = '#21252b';
  ctx.fillRect(heliX, heliY, 60, 20);
  ctx.strokeStyle = '#e5c07b';
  ctx.lineWidth = 2;
  ctx.strokeRect(heliX + 2, heliY + 2, 56, 16);
  // Pixel "H"
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(heliX + 24, heliY + 5, 3, 10);
  ctx.fillRect(heliX + 33, heliY + 5, 3, 10);
  ctx.fillRect(heliX + 24, heliY + 9, 12, 3);
  // Red warning lights blinking
  if (Math.floor(time * 2) % 2 === 0) {
    ctx.fillStyle = '#ff4d4d';
    ctx.fillRect(heliX + 4, heliY + 4, 3, 3);
    ctx.fillRect(heliX + 53, heliY + 4, 3, 3);
  }

  // Emergency Entrance Canopy (ACİL SERVİS)
  const canopyX = x + 40;
  const canopyY = y + h - 28;
  ctx.fillStyle = '#2c3e50';
  ctx.fillRect(canopyX, canopyY, 130, 28);
  // Red emergency accent bar
  ctx.fillStyle = '#e06c75';
  ctx.fillRect(canopyX, canopyY, 130, 6);

  // Automatic Glass Doors
  ctx.fillStyle = '#1e2227';
  ctx.fillRect(canopyX + 45, canopyY + 8, 40, 20);
  ctx.fillStyle = '#61afef';
  ctx.fillRect(canopyX + 48, canopyY + 10, 16, 18);
  ctx.fillRect(canopyX + 66, canopyY + 10, 16, 18);

  // Canopy Support Columns
  ctx.fillStyle = '#abb2bf';
  ctx.fillRect(canopyX + 4, canopyY + 8, 6, 20);
  ctx.fillRect(canopyX + 120, canopyY + 8, 6, 20);

  // Pixel Ambulance at Bay (x: x + 160, y: y + h - 14)
  drawPixelAmbulance(ctx, x + 160, y + h - 10, time, roadPassable);
}

// Pixel Ambulance
export function drawPixelAmbulance(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  time: number,
  roadPassable: boolean
) {
  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.fillRect(x + 2, y + 26, 52, 8);

  // White Van Body
  ctx.fillStyle = '#f0f4f8';
  ctx.fillRect(x, y + 4, 50, 24);

  // Red Side Stripe
  ctx.fillStyle = '#e06c75';
  ctx.fillRect(x, y + 16, 50, 4);

  // Red Cross Decal on side
  ctx.fillStyle = '#e06c75';
  ctx.fillRect(x + 18, y + 8, 4, 12);
  ctx.fillRect(x + 14, y + 12, 12, 4);

  // Cabin Windshield & Windows
  ctx.fillStyle = '#282c34';
  ctx.fillRect(x + 36, y + 6, 12, 10);
  ctx.fillRect(x + 28, y + 6, 6, 8);

  // Rubber Wheels
  ctx.fillStyle = '#1e2227';
  ctx.fillRect(x + 8, y + 24, 10, 6);
  ctx.fillRect(x + 34, y + 24, 10, 6);
  ctx.fillStyle = '#abb2bf';
  ctx.fillRect(x + 11, y + 26, 4, 3);
  ctx.fillRect(x + 37, y + 26, 4, 3);

  // Flashing Emergency Lightbar (Blue & Red)
  const flash = Math.floor(time * 6) % 2 === 0;
  ctx.fillStyle = flash ? '#e06c75' : '#61afef';
  ctx.fillRect(x + 36, y, 6, 4);
  ctx.fillStyle = flash ? '#61afef' : '#e06c75';
  ctx.fillRect(x + 42, y, 6, 4);
}

// ---------------------------------------------------------------------------
// 4. RESIDENTIAL HOUSES (TERRACE HOMES & CLINIC)
// ---------------------------------------------------------------------------
export function drawPixelHouse(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  roofColor: string,
  wallColor: string,
  time: number
) {
  const w = 120;
  const h = 88;

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(x + 8, y + h - 6, w + 12, 16);

  // Brick Wall
  ctx.fillStyle = wallColor;
  ctx.fillRect(x + 10, y + 36, w - 20, h - 36);

  // Pitched Terracotta Roof with Pixel Tiles
  ctx.fillStyle = roofColor;
  ctx.beginPath();
  ctx.moveTo(x + w / 2, y);
  ctx.lineTo(x + w, y + 36);
  ctx.lineTo(x, y + 36);
  ctx.closePath();
  ctx.fill();

  // Roof Tile Highlights
  ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
  for (let r = 1; r < 4; r++) {
    const rx = x + r * 14;
    const ry = y + 36 - r * 8;
    ctx.fillRect(rx, ry, w - r * 28, 2);
  }

  // Chimney & Animated Smoke
  ctx.fillStyle = '#8b4513';
  ctx.fillRect(x + w - 26, y + 8, 12, 22);
  // Smoke puffs
  const smokeY = (time * 15) % 24;
  ctx.fillStyle = 'rgba(230, 235, 240, 0.6)';
  ctx.fillRect(x + w - 24, y - smokeY, 8 + smokeY * 0.3, 6 + smokeY * 0.2);
  ctx.fillRect(x + w - 22, y - smokeY - 10, 10, 8);

  // Windows with Warm Lit Panes
  const winY = y + 46;
  ctx.fillStyle = '#2c313a';
  ctx.fillRect(x + 22, winY, 20, 18);
  ctx.fillRect(x + w - 42, winY, 20, 18);
  ctx.fillStyle = '#e5c07b';
  ctx.fillRect(x + 24, winY + 2, 16, 14);
  ctx.fillRect(x + w - 40, winY + 2, 16, 14);
  // Cross frame
  ctx.fillStyle = '#2c313a';
  ctx.fillRect(x + 31, winY + 2, 2, 14);
  ctx.fillRect(x + 24, winY + 8, 16, 2);
  ctx.fillRect(x + w - 33, winY + 2, 2, 14);
  ctx.fillRect(x + w - 40, winY + 8, 16, 2);

  // Wooden Door with Brass Knob
  ctx.fillStyle = '#5c3a21';
  ctx.fillRect(x + w / 2 - 10, y + h - 30, 20, 30);
  ctx.fillStyle = '#d19a66';
  ctx.fillRect(x + w / 2 + 4, y + h - 16, 3, 3);
}

// ---------------------------------------------------------------------------
// 5. CITY CENTER LANDMARKS
// ---------------------------------------------------------------------------

// Clock Tower
export function drawPixelClockTower(ctx: CanvasRenderingContext2D, x: number, y: number, time: number) {
  const w = 70;
  const h = 130;

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(x + 4, y + h - 6, w + 10, 16);

  // Stone Shaft
  ctx.fillStyle = '#5c6370';
  ctx.fillRect(x + 10, y + 36, w - 20, h - 36);

  // Brick pattern
  ctx.fillStyle = '#4b5263';
  for (let py = y + 40; py < y + h; py += 12) {
    ctx.fillRect(x + 14, py, w - 28, 1);
  }

  // Spire Roof (Copper Patina Green)
  ctx.fillStyle = '#4fa89b';
  ctx.beginPath();
  ctx.moveTo(x + w / 2, y);
  ctx.lineTo(x + w, y + 36);
  ctx.lineTo(x, y + 36);
  ctx.closePath();
  ctx.fill();

  // Clock Face
  const clockX = x + w / 2;
  const clockY = y + 54;
  ctx.fillStyle = '#e5e9f0';
  ctx.beginPath();
  ctx.arc(clockX, clockY, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#282c34';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Clock Hands
  ctx.strokeStyle = '#1e2227';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(clockX, clockY);
  ctx.lineTo(clockX, clockY - 8);
  ctx.moveTo(clockX, clockY);
  ctx.lineTo(clockX + 6, clockY + 2);
  ctx.stroke();
}

// Historic Covered Bazaar with Striped Awnings
export function drawPixelBazaar(ctx: CanvasRenderingContext2D, x: number, y: number) {
  const w = 140;
  const h = 100;

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(x + 6, y + h - 6, w + 12, 16);

  // Sandstone wall
  ctx.fillStyle = '#c5a059';
  ctx.fillRect(x, y + 24, w, h - 24);

  // Stone Arched Gateway
  ctx.fillStyle = '#21252b';
  ctx.fillRect(x + 40, y + 44, 60, h - 44);

  // Colorful Striped Canvas Awning (Terracotta & Cream)
  for (let i = 0; i < 10; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#e06c75' : '#f0f4f8';
    ctx.fillRect(x + i * 14, y, 14, 24);
  }
}

// Municipal Museum (Classical Columns)
export function drawPixelMuseum(ctx: CanvasRenderingContext2D, x: number, y: number) {
  const w = 150;
  const h = 110;

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(x + 6, y + h - 6, w + 12, 16);

  // Stone Base
  ctx.fillStyle = '#616e79';
  ctx.fillRect(x, y + 30, w, h - 30);

  // Classical Triangular Pediment
  ctx.fillStyle = '#7a8894';
  ctx.beginPath();
  ctx.moveTo(x + w / 2, y);
  ctx.lineTo(x + w, y + 30);
  ctx.lineTo(x, y + 30);
  ctx.closePath();
  ctx.fill();

  // Columns
  ctx.fillStyle = '#e5e9f0';
  for (let i = 0; i < 4; i++) {
    ctx.fillRect(x + 18 + i * 36, y + 32, 10, h - 36);
  }
}

// Climate Research Station (İklim Araştırma İstasyonu)
export function drawPixelResearchStation(ctx: CanvasRenderingContext2D, x: number, y: number, time: number) {
  const w = 120;
  const h = 88;

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.32)';
  ctx.fillRect(x + 6, y + h - 6, w + 12, 16);

  // Modern High-Tech Concrete & Composite Wall
  ctx.fillStyle = '#282c34';
  ctx.fillRect(x, y + 20, w, h - 20);

  // Front Facade Panels (Clean Slate Blue)
  ctx.fillStyle = '#3e4451';
  ctx.fillRect(x + 4, y + 24, w - 8, h - 26);

  // Flat Reinforced Roof with Solar Array
  ctx.fillStyle = '#1e2227';
  ctx.fillRect(x - 4, y + 16, w + 8, 8);

  // Solar Panels on Roof
  ctx.fillStyle = '#224466';
  for (let sx = x + 8; sx < x + 60; sx += 14) {
    ctx.fillRect(sx, y + 10, 11, 7);
    ctx.fillStyle = '#61afef';
    ctx.fillRect(sx + 1, y + 11, 9, 2);
    ctx.fillStyle = '#224466';
  }

  // Rotating Weather Radar Dish on Roof
  const radarAngle = (time * 1.5) % (Math.PI * 2);
  const radarX = x + w - 24;
  const radarY = y + 8;
  // Radar Mast
  ctx.fillStyle = '#abb2bf';
  ctx.fillRect(radarX - 2, radarY, 4, 12);
  // Rotating Dish
  const dishWidth = Math.max(4, Math.abs(Math.cos(radarAngle)) * 14);
  ctx.fillStyle = '#e5e9f0';
  ctx.beginPath();
  ctx.ellipse(radarX, radarY, dishWidth, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#282c34';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Anemometer spinning cups on left mast
  const aneX = x + 75;
  ctx.fillStyle = '#abb2bf';
  ctx.fillRect(aneX - 1, y + 4, 2, 14);
  const aneSpin = time * 8;
  ctx.fillStyle = '#d19a66';
  ctx.fillRect(aneX - 6 + Math.sin(aneSpin) * 5, y + 4, 3, 3);
  ctx.fillRect(aneX + 3 - Math.sin(aneSpin) * 5, y + 4, 3, 3);

  // Large Panoramic Laboratory Observation Windows (Glowing Cyan/Teal)
  ctx.fillStyle = '#1b3443';
  ctx.fillRect(x + 12, y + 34, 56, 26);
  // Glass highlight
  ctx.fillStyle = '#4fa89b';
  ctx.fillRect(x + 14, y + 36, 52, 10);
  // Telemetry screen blinking line inside
  const screenPulse = Math.sin(time * 6);
  ctx.fillStyle = screenPulse > 0 ? '#61afef' : '#98c379';
  ctx.fillRect(x + 18, y + 48, 18, 4);
  ctx.fillRect(x + 40, y + 48, 22, 4);

  // Entrance Door with Electronic Keypad
  ctx.fillStyle = '#1e2227';
  ctx.fillRect(x + 78, y + 42, 28, h - 42);
  ctx.fillStyle = '#353b45';
  ctx.fillRect(x + 80, y + 44, 24, h - 44);
  // Glass door panel
  ctx.fillStyle = '#4fa89b';
  ctx.fillRect(x + 84, y + 48, 16, 20);
  // Keypad LED
  ctx.fillStyle = Math.floor(time * 3) % 2 === 0 ? '#98c379' : '#e5c07b';
  ctx.fillRect(x + 101, y + 58, 2, 2);

  // Signage Plaque: "İKLİM ARAŞTIRMA İSTASYONU"
  ctx.fillStyle = '#1e2227';
  ctx.fillRect(x + 12, y + 24, 74, 7);
  ctx.fillStyle = '#e5c07b';
  ctx.fillRect(x + 14, y + 26, 4, 3);
  ctx.fillStyle = '#e5e9f0';
  ctx.fillRect(x + 20, y + 27, 62, 1);
}

// ---------------------------------------------------------------------------
// 6. PROPS & INTERVENTION OBJECTS
// ---------------------------------------------------------------------------

// Pixel Oak Tree
export function drawPixelTree(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(x, y + r + 6, r * 1.1, r * 0.45, 0, 0, Math.PI * 2);
  ctx.fill();

  // Tree Trunk
  ctx.fillStyle = '#5c3a21';
  ctx.fillRect(x - 5, y, 10, r + 6);
  ctx.fillStyle = '#4a2d19';
  ctx.fillRect(x - 2, y, 4, r + 6);

  // Layered Pixel Leaf Canopies
  ctx.fillStyle = '#1e4826'; // Dark shadow
  ctx.beginPath();
  ctx.arc(x, y - r * 0.2, r * 0.95, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#2d6a37'; // Mid leaf
  ctx.beginPath();
  ctx.arc(x - 3, y - r * 0.4, r * 0.85, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#45854f'; // Top highlight
  ctx.beginPath();
  ctx.arc(x - 6, y - r * 0.6, r * 0.6, 0, Math.PI * 2);
  ctx.fill();
}

// Pixel Street Lamp
export function drawPixelStreetLamp(ctx: CanvasRenderingContext2D, x: number, y: number, time: number) {
  // Warm ground glow
  const glow = ctx.createRadialGradient(x, y, 4, x, y, 42);
  glow.addColorStop(0, 'rgba(229, 192, 123, 0.35)');
  glow.addColorStop(1, 'rgba(229, 192, 123, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, 42, 0, Math.PI * 2);
  ctx.fill();

  // Metal Lamp Post
  ctx.fillStyle = '#21252b';
  ctx.fillRect(x - 2, y - 36, 4, 36);
  ctx.fillRect(x - 5, y - 36, 10, 4);

  // Lantern Bulb
  ctx.fillStyle = '#e5c07b';
  ctx.fillRect(x - 3, y - 32, 6, 6);
}

// Cast-Iron Storm Drain Grate with Warning Cones
export function drawPixelStormGrate(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  isInspected: boolean,
  waterDepth: number
) {
  // Dark recess hole
  ctx.fillStyle = '#181a1f';
  ctx.fillRect(x - 16, y - 10, 32, 20);

  // Iron Grate Slats
  ctx.fillStyle = '#5c6370';
  ctx.strokeRect(x - 16, y - 10, 32, 20);
  for (let px = x - 12; px <= x + 12; px += 4) {
    ctx.fillRect(px, y - 8, 2, 16);
  }

  // Safety Cones on sides
  drawPixelCone(ctx, x - 26, y + 2);
  drawPixelCone(ctx, x + 26, y + 2);
}

// Safety Cone
function drawPixelCone(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = '#d19a66'; // Orange cone body
  ctx.beginPath();
  ctx.moveTo(x, y - 12);
  ctx.lineTo(x + 6, y);
  ctx.lineTo(x - 6, y);
  ctx.closePath();
  ctx.fill();
  // White reflective stripe
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x - 3, y - 6, 6, 2);
  // Base
  ctx.fillStyle = '#d19a66';
  ctx.fillRect(x - 7, y - 1, 14, 2);
}

// Construction / Intervention Site Asset
export function drawPixelInterventionSite(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  isBuilt: boolean,
  type: 'sponge' | 'retrofit' | 'seawall',
  time: number
) {
  if (isBuilt) {
    if (type === 'sponge') {
      // Completed Sponge Park (Bioswale, reeds, retention pond)
      ctx.fillStyle = '#1e382b';
      ctx.fillRect(x - 36, y - 24, 72, 48);
      // Retention pond water
      ctx.fillStyle = '#3a7d99';
      ctx.beginPath();
      ctx.ellipse(x, y, 26, 14, 0, 0, Math.PI * 2);
      ctx.fill();
      // Wooden footbridge
      ctx.fillStyle = '#8b6540';
      ctx.fillRect(x - 6, y - 16, 12, 32);
      // Reeds & flowers
      ctx.fillStyle = '#98c379';
      ctx.fillRect(x - 22, y - 10, 4, 12);
      ctx.fillRect(x + 18, y - 8, 4, 12);
    } else {
      // Completed Reinforced Culvert
      ctx.fillStyle = '#5c6773';
      ctx.fillRect(x - 32, y - 16, 64, 32);
      ctx.fillStyle = '#21252b';
      ctx.fillRect(x - 20, y - 6, 16, 14);
      ctx.fillRect(x + 4, y - 6, 16, 14);
    }
  } else {
    // Under Construction Site (Gravel ground, hazard boundary, wooden sign)
    ctx.fillStyle = '#4b5263';
    ctx.fillRect(x - 30, y - 20, 60, 40);

    // Hazard Stripes Board
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#e5c07b' : '#282c34';
      ctx.fillRect(x - 20 + i * 10, y - 16, 10, 6);
    }

    // Wooden Project Signpost
    ctx.fillStyle = '#5c3a21';
    ctx.fillRect(x - 2, y - 6, 4, 18);
    ctx.fillStyle = '#d19a66';
    ctx.fillRect(x - 14, y - 14, 28, 12);
    ctx.fillStyle = '#1e2227';
    ctx.fillRect(x - 10, y - 10, 20, 2);
  }
}

// ---------------------------------------------------------------------------
// 7. PIXEL-ART CHARACTERS (PLAYABLE HEROES: DENİZ & BARIŞ, NPCS: MİRA & ARAS)
// ---------------------------------------------------------------------------

// Playable Hero Sprites: Deniz (Female / Climate Hydrologist) & Barış (Male / Resilience Architect)
export function drawPixelHero(
  ctx: CanvasRenderingContext2D,
  char: CharacterRenderState,
  heroType: 'female' | 'male',
  time: number
) {
  const { x, y, facing, isMoving, frame } = char;

  // Drop Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(x, y + 2, 9, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  const bob = isMoving ? Math.sin(frame * Math.PI) * 2 : Math.sin(time * 3) * 0.8;
  const py = y - 26 + bob;
  const legOffset = isMoving ? Math.sin(frame * Math.PI) * 4 : 0;

  if (heroType === 'female') {
    // -----------------------------------------------------------------------
    // DENİZ: Female Field Hydrologist & Environmental Scientist
    // Emerald green windbreaker, dark teal trousers, satchel, braided hair
    // -----------------------------------------------------------------------
    // 1. Legs & Boots
    ctx.fillStyle = '#213329'; // Deep forest pants
    if (facing === 'left' || facing === 'right') {
      ctx.fillRect(x - 4 + legOffset, py + 16, 4, 8);
      ctx.fillRect(x + 1 - legOffset, py + 16, 4, 8);
    } else {
      ctx.fillRect(x - 5, py + 16 + (isMoving ? legOffset : 0), 4, 8);
      ctx.fillRect(x + 1, py + 16 - (isMoving ? legOffset : 0), 4, 8);
    }
    // Sturdy dark brown hiking boots
    ctx.fillStyle = '#4a2e18';
    ctx.fillRect(x - 5, py + 22, 4, 3);
    ctx.fillRect(x + 1, py + 22, 4, 3);

    // 2. Torso (Emerald Green Field Windbreaker)
    ctx.fillStyle = '#2d7d56';
    ctx.fillRect(x - 6, py + 8, 12, 10);
    // Darker collar & waterproof seams
    ctx.fillStyle = '#1b4d34';
    ctx.fillRect(x - 2, py + 8, 4, 3);
    ctx.fillRect(x - 6, py + 16, 12, 2);

    // Crossbody Utility Satchel Strap
    ctx.fillStyle = '#8b5a2b';
    ctx.fillRect(x - 5, py + 8, 2, 10);
    ctx.fillRect(x + 4, py + 13, 3, 5); // Satchel pouch on hip

    // Handheld Water Depth & Flow Sensor (Flashing cyan/green LED)
    ctx.fillStyle = '#1e2227';
    ctx.fillRect(x - 7, py + 12, 3, 5);
    ctx.fillStyle = Math.floor(time * 4) % 2 === 0 ? '#4fa89b' : '#61afef';
    ctx.fillRect(x - 6, py + 13, 2, 2);

    // 3. Head & Hair
    ctx.fillStyle = '#f0c69d';
    ctx.fillRect(x - 4, py + 2, 8, 7);

    // Eyes
    ctx.fillStyle = '#1e2227';
    if (facing === 'down') {
      ctx.fillRect(x - 3, py + 4, 2, 2);
      ctx.fillRect(x + 1, py + 4, 2, 2);
    } else if (facing === 'left') {
      ctx.fillRect(x - 4, py + 4, 2, 2);
    } else if (facing === 'right') {
      ctx.fillRect(x + 2, py + 4, 2, 2);
    }

    // Auburn / Chestnut Braided Hair with Gold Ribbon
    ctx.fillStyle = '#7a3e1d';
    ctx.fillRect(x - 5, py, 10, 4); // Front bangs
    ctx.fillStyle = '#e5c07b';
    ctx.fillRect(x - 4, py + 1, 8, 1); // Hairband

    if (facing === 'down') {
      ctx.fillStyle = '#7a3e1d';
      ctx.fillRect(x + 4, py + 2, 3, 8); // Braid visible over shoulder
    } else if (facing === 'up') {
      ctx.fillStyle = '#7a3e1d';
      ctx.fillRect(x - 5, py, 10, 8);
      ctx.fillRect(x - 2, py + 6, 4, 8); // Long braid down back
    } else if (facing === 'left') {
      ctx.fillStyle = '#7a3e1d';
      ctx.fillRect(x + 2, py + 1, 4, 7);
    } else {
      ctx.fillStyle = '#7a3e1d';
      ctx.fillRect(x - 6, py + 1, 4, 7);
    }
  } else {
    // -----------------------------------------------------------------------
    // BARIŞ: Male Resilient City Architect & Infrastructure Engineer
    // Deep navy tactical work vest, grey sleeves, charcoal cargo pants, comms
    // -----------------------------------------------------------------------
    // 1. Legs & Boots
    ctx.fillStyle = '#282c34'; // Charcoal tactical cargo pants
    if (facing === 'left' || facing === 'right') {
      ctx.fillRect(x - 4 + legOffset, py + 16, 4, 8);
      ctx.fillRect(x + 1 - legOffset, py + 16, 4, 8);
    } else {
      ctx.fillRect(x - 5, py + 16 + (isMoving ? legOffset : 0), 4, 8);
      ctx.fillRect(x + 1, py + 16 - (isMoving ? legOffset : 0), 4, 8);
    }
    // Reinforced steel-toe field boots
    ctx.fillStyle = '#1e2227';
    ctx.fillRect(x - 5, py + 22, 4, 3);
    ctx.fillRect(x + 1, py + 22, 4, 3);

    // 2. Torso: Grey sleeves + Deep Navy Tactical Engineer Vest
    ctx.fillStyle = '#5c6370'; // Grey sleeves
    ctx.fillRect(x - 6, py + 8, 12, 10);
    ctx.fillStyle = '#1d3557'; // Navy vest
    ctx.fillRect(x - 5, py + 8, 10, 10);
    // Vest utility pockets
    ctx.fillStyle = '#14253d';
    ctx.fillRect(x - 4, py + 12, 3, 3);
    ctx.fillRect(x + 1, py + 12, 3, 3);

    // Surveyor Radio / Comms Badge on Collar (Amber LED)
    ctx.fillStyle = '#abb2bf';
    ctx.fillRect(x - 4, py + 9, 2, 2);
    ctx.fillStyle = Math.floor(time * 3) % 2 === 0 ? '#e5c07b' : '#e06c75';
    ctx.fillRect(x - 4, py + 9, 1, 1);

    // Rugged Architect Tablet on Hip
    ctx.fillStyle = '#1e2227';
    ctx.fillRect(x + 5, py + 12, 3, 6);
    ctx.fillStyle = '#61afef'; // Glowing blueprint screen
    ctx.fillRect(x + 6, py + 13, 2, 3);

    // 3. Head & Hair
    ctx.fillStyle = '#e8be94';
    ctx.fillRect(x - 4, py + 2, 8, 7);

    // Eyes
    ctx.fillStyle = '#1e2227';
    if (facing === 'down') {
      ctx.fillRect(x - 3, py + 4, 2, 2);
      ctx.fillRect(x + 1, py + 4, 2, 2);
    } else if (facing === 'left') {
      ctx.fillRect(x - 4, py + 4, 2, 2);
    } else if (facing === 'right') {
      ctx.fillRect(x + 2, py + 4, 2, 2);
    }

    // Short Textured Dark Hair & Sideburns
    ctx.fillStyle = '#21252b';
    ctx.fillRect(x - 5, py, 10, 4);
    if (facing === 'down') {
      ctx.fillRect(x - 5, py + 2, 2, 3);
      ctx.fillRect(x + 3, py + 2, 2, 3);
    } else if (facing === 'up') {
      ctx.fillRect(x - 5, py, 10, 7);
    } else if (facing === 'left') {
      ctx.fillRect(x - 3, py, 8, 5);
      ctx.fillRect(x + 2, py + 2, 2, 3);
    } else {
      ctx.fillRect(x - 5, py, 8, 5);
      ctx.fillRect(x - 4, py + 2, 2, 3);
    }
  }
}

// Mira NPC Sprite (Lead Climate Scientist: Lab Coat, Roll-Neck, Diagnostic Clipboard, Weather Terminal)
export function drawPixelMiraNPC(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  time: number
) {
  // Drop Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(x, y + 2, 9, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Subtle breathing idle
  const py = y - 26 + Math.sin(time * 2.4) * 0.7;

  // 1. Legs & Shoes
  ctx.fillStyle = '#21252b'; // Dark tailored trousers
  ctx.fillRect(x - 5, py + 16, 4, 8);
  ctx.fillRect(x + 1, py + 16, 4, 8);
  ctx.fillStyle = '#3a2215'; // Leather shoes
  ctx.fillRect(x - 5, py + 22, 4, 3);
  ctx.fillRect(x + 1, py + 22, 4, 3);

  // 2. Torso (Burgundy Roll-Neck Sweater + White Scientist Lab Coat)
  ctx.fillStyle = '#9e2a2b';
  ctx.fillRect(x - 4, py + 7, 8, 10);
  ctx.fillStyle = '#e5e9f0';
  ctx.fillRect(x - 6, py + 8, 3, 11);
  ctx.fillRect(x + 3, py + 8, 3, 11);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x - 5, py + 7, 3, 2);
  ctx.fillRect(x + 2, py + 7, 3, 2);
  // Teal ID badge
  ctx.fillStyle = '#4fa89b';
  ctx.fillRect(x - 5, py + 10, 2, 3);

  // 3. Hands & Climate Diagnostic Tablet
  ctx.fillStyle = '#1e2227';
  ctx.fillRect(x - 3, py + 12, 7, 8);
  ctx.fillStyle = Math.floor(time * 3) % 2 === 0 ? '#61afef' : '#98c379';
  ctx.fillRect(x - 2, py + 13, 5, 5);

  // 4. Head & Hair
  ctx.fillStyle = '#f0c69d';
  ctx.fillRect(x - 4, py + 1, 8, 7);
  ctx.fillStyle = '#1e2227';
  ctx.fillRect(x - 3, py + 3, 2, 2);
  ctx.fillRect(x + 1, py + 3, 2, 2);

  // Brunette Hair & Elegant Scientist Twist/Updo with side bangs
  ctx.fillStyle = '#4a2d19';
  ctx.fillRect(x - 5, py - 2, 10, 4);
  ctx.fillRect(x - 5, py + 1, 2, 4);
  ctx.fillRect(x + 3, py + 1, 2, 4);
  ctx.fillRect(x + 3, py - 3, 4, 4);

  // Digital Weather Sensor Probe Post next to Mira (x + 14)
  ctx.fillStyle = '#5c6370';
  ctx.fillRect(x + 14, py + 4, 2, 20);
  ctx.fillStyle = '#abb2bf';
  ctx.fillRect(x + 12, py + 2, 6, 3);
  ctx.fillStyle = Math.floor(time * 4) % 2 === 0 ? '#4fa89b' : '#61afef';
  ctx.fillRect(x + 13, py + 3, 4, 1);
}

// Backwards-compatibility alias
export function drawPixelMira(
  ctx: CanvasRenderingContext2D,
  char: CharacterRenderState,
  time: number
) {
  drawPixelHero(ctx, char, 'female', time);
}

// Aras Character Sprite (Safety Hardhat, High-Vis Orange Vest, Tablet)
export function drawPixelAras(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  time: number
) {
  // Drop Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(x, y + 2, 9, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  const py = y - 26 + Math.sin(time * 2) * 0.5;

  // Legs & Boots
  ctx.fillStyle = '#282c34';
  ctx.fillRect(x - 5, py + 16, 4, 8);
  ctx.fillRect(x + 1, py + 16, 4, 8);
  ctx.fillStyle = '#3e4451';
  ctx.fillRect(x - 5, py + 22, 4, 3);
  ctx.fillRect(x + 1, py + 22, 4, 3);

  // High-Vis Orange Safety Vest
  ctx.fillStyle = '#d19a66';
  ctx.fillRect(x - 6, py + 8, 12, 10);
  // Silver reflective stripes
  ctx.fillStyle = '#e5e9f0';
  ctx.fillRect(x - 6, py + 11, 12, 2);
  ctx.fillRect(x - 6, py + 15, 12, 2);

  // Digital Tablet in Hands
  ctx.fillStyle = '#1e2227';
  ctx.fillRect(x - 3, py + 12, 6, 7);
  ctx.fillStyle = '#61afef'; // Glowing screen
  ctx.fillRect(x - 2, py + 13, 4, 4);

  // Head & Yellow Hardhat
  ctx.fillStyle = '#f0c69d';
  ctx.fillRect(x - 4, py + 2, 8, 7);
  // Eyes
  ctx.fillStyle = '#1e2227';
  ctx.fillRect(x - 3, py + 4, 2, 2);
  ctx.fillRect(x + 1, py + 4, 2, 2);
  // Yellow Construction Hardhat
  ctx.fillStyle = '#e5c07b';
  ctx.fillRect(x - 6, py - 2, 12, 6);
  ctx.fillRect(x - 8, py + 2, 16, 2); // Brim
}

// ---------------------------------------------------------------------------
// 8. GOLDEN QUEST TRAIL & CONTEXTUAL OBJECTIVE MARKERS
// ---------------------------------------------------------------------------

export interface QuestWaypointPoint {
  x: number;
  y: number;
}

/**
 * Draws an animated glowing golden trail along navigation waypoints with moving light pulses.
 * Smoothly fades out as the player approaches the target.
 */
export function drawGoldenQuestTrail(
  ctx: CanvasRenderingContext2D,
  waypoints: QuestWaypointPoint[],
  playerPos: QuestWaypointPoint,
  time: number,
  targetDistancePx: number
) {
  if (!waypoints || waypoints.length < 2) return;

  // Proximity fading: fades from 1.0 down to 0.0 when within 70 pixels (< 7 meters)
  const fadeAlpha = Math.max(0, Math.min(1, (targetDistancePx - 40) / 60));
  if (fadeAlpha <= 0.02) return;

  ctx.save();

  // 1. Soft Outer Golden Ambient Glow Line
  ctx.strokeStyle = `rgba(245, 158, 11, ${0.35 * fadeAlpha})`;
  ctx.lineWidth = 8;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(playerPos.x, playerPos.y);
  for (let i = 1; i < waypoints.length; i++) {
    ctx.lineTo(waypoints[i].x, waypoints[i].y);
  }
  ctx.stroke();

  // 2. Crisp Core Golden Trail Line
  ctx.strokeStyle = `rgba(251, 191, 36, ${0.85 * fadeAlpha})`;
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(playerPos.x, playerPos.y);
  for (let i = 1; i < waypoints.length; i++) {
    ctx.lineTo(waypoints[i].x, waypoints[i].y);
  }
  ctx.stroke();

  // 3. Inner White Core Line
  ctx.strokeStyle = `rgba(254, 240, 138, ${0.9 * fadeAlpha})`;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(playerPos.x, playerPos.y);
  for (let i = 1; i < waypoints.length; i++) {
    ctx.lineTo(waypoints[i].x, waypoints[i].y);
  }
  ctx.stroke();

  // 4. Animated Moving Light Beads Flowing Toward Destination
  // Calculate total path distance and place moving dots
  const fullPoints = [playerPos, ...waypoints.slice(1)];
  const segments: { p1: QuestWaypointPoint; p2: QuestWaypointPoint; len: number }[] = [];
  let totalLength = 0;

  for (let i = 0; i < fullPoints.length - 1; i++) {
    const len = Math.hypot(fullPoints[i + 1].x - fullPoints[i].x, fullPoints[i + 1].y - fullPoints[i].y);
    segments.push({ p1: fullPoints[i], p2: fullPoints[i + 1], len });
    totalLength += len;
  }

  if (totalLength > 20) {
    const beadSpacing = 42; // px between beads
    const flowSpeed = 75; // px/sec forward speed
    const baseOffset = (time * flowSpeed) % beadSpacing;

    for (let dist = baseOffset; dist < totalLength; dist += beadSpacing) {
      // Find point on polyline at distance `dist`
      let traversed = 0;
      for (const seg of segments) {
        if (traversed + seg.len >= dist) {
          const segDist = dist - traversed;
          const t = seg.len > 0 ? segDist / seg.len : 0;
          const beadX = seg.p1.x + (seg.p2.x - seg.p1.x) * t;
          const beadY = seg.p1.y + (seg.p2.y - seg.p1.y) * t;

          // Golden energy bead
          const beadPulse = 0.8 + 0.3 * Math.sin(time * 8 + dist * 0.1);
          ctx.fillStyle = `rgba(254, 243, 199, ${0.95 * fadeAlpha * beadPulse})`;
          ctx.beginPath();
          ctx.arc(beadX, beadY, 3.2, 0, Math.PI * 2);
          ctx.fill();

          // Bead glow
          ctx.fillStyle = `rgba(245, 158, 11, ${0.45 * fadeAlpha})`;
          ctx.beginPath();
          ctx.arc(beadX, beadY, 6.5, 0, Math.PI * 2);
          ctx.fill();

          break;
        }
        traversed += seg.len;
      }
    }
  }

  ctx.restore();
}

/**
 * Contextual Quest Objective Markers:
 * Distinct pixel art icons anchored to world objects based on the active quest type.
 */
export function drawPixelQuestWaypoint(
  ctx: CanvasRenderingContext2D,
  targetX: number,
  targetY: number,
  label: string,
  time: number,
  questStep = 1
) {
  const bounce = Math.sin(time * 5) * 5;
  const my = targetY - 48 + bounce;

  ctx.save();

  // 1. Ground Pulsating Target Rings
  const ringScale1 = (time * 1.4) % 1;
  const ringScale2 = ((time * 1.4) + 0.5) % 1;

  ctx.strokeStyle = `rgba(245, 158, 11, ${(1 - ringScale1) * 0.75})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(targetX, targetY, 26 * ringScale1 + 8, 13 * ringScale1 + 4, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = `rgba(251, 191, 36, ${(1 - ringScale2) * 0.6})`;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(targetX, targetY, 26 * ringScale2 + 8, 13 * ringScale2 + 4, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Ground Light Spot
  ctx.fillStyle = 'rgba(251, 191, 36, 0.22)';
  ctx.beginPath();
  ctx.ellipse(targetX, targetY, 16, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  // 2. Contextual Icon Badge Based on Quest Step
  // Badge Background Box (Dark retro slate with gold border)
  const badgeSize = 28;
  const badgeX = targetX - badgeSize / 2;
  const badgeY = my - badgeSize / 2;

  ctx.fillStyle = '#0f172a';
  ctx.fillRect(badgeX, badgeY, badgeSize, badgeSize);
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 2;
  ctx.strokeRect(badgeX, badgeY, badgeSize, badgeSize);

  // Badge Accent Corners
  ctx.fillStyle = '#fef08a';
  ctx.fillRect(badgeX - 1, badgeY - 1, 3, 3);
  ctx.fillRect(badgeX + badgeSize - 2, badgeY - 1, 3, 3);
  ctx.fillRect(badgeX - 1, badgeY + badgeSize - 2, 3, 3);
  ctx.fillRect(badgeX + badgeSize - 2, badgeY + badgeSize - 2, 3, 3);

  // Contextual Icon Drawing
  if (questStep === 1 || questStep === 7) {
    // Red Cross Hospital / Medical Beacon
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(targetX - 2, my - 8, 4, 16);
    ctx.fillRect(targetX - 8, my - 2, 16, 4);
    // White inner core
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(targetX - 1, my - 7, 2, 14);
    ctx.fillRect(targetX - 7, my - 1, 14, 2);
  } else if (questStep === 2) {
    // Dialogue Speech Bubble 💬 for Aras
    ctx.fillStyle = '#f49a60';
    ctx.fillRect(targetX - 8, my - 7, 16, 11);
    ctx.beginPath();
    ctx.moveTo(targetX - 2, my + 4);
    ctx.lineTo(targetX + 3, my + 4);
    ctx.lineTo(targetX - 4, my + 9);
    ctx.closePath();
    ctx.fill();
    // 3 Dialogue dots
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(targetX - 5, my - 3, 2, 2);
    ctx.fillRect(targetX - 1, my - 3, 2, 2);
    ctx.fillRect(targetX + 3, my - 3, 2, 2);
  } else if (questStep === 3) {
    // Inspection Magnifying Glass 🔍
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(targetX - 2, my - 2, 6, 0, Math.PI * 2);
    ctx.stroke();
    // Handle
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(targetX + 3, my + 3);
    ctx.lineTo(targetX + 8, my + 8);
    ctx.stroke();
  } else if (questStep === 4) {
    // Caution Hazard ⚠️ Triangle
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.moveTo(targetX, my - 9);
    ctx.lineTo(targetX + 9, my + 7);
    ctx.lineTo(targetX - 9, my + 7);
    ctx.closePath();
    ctx.fill();
    // Exclamation Mark
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(targetX - 1, my - 4, 2, 6);
    ctx.fillRect(targetX - 1, my + 4, 2, 2);
  } else {
    // Construction Wrench 🛠️ / Intervention
    ctx.fillStyle = '#10b981';
    ctx.fillRect(targetX - 7, my - 6, 14, 12);
    // White gear/tool symbol
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(targetX - 2, my - 4, 4, 8);
    ctx.fillRect(targetX - 5, my - 2, 10, 4);
  }

  // 3. Downward Golden Pointer Arrow
  ctx.fillStyle = '#f59e0b';
  ctx.beginPath();
  ctx.moveTo(targetX - 5, badgeY + badgeSize);
  ctx.lineTo(targetX + 5, badgeY + badgeSize);
  ctx.lineTo(targetX, badgeY + badgeSize + 7);
  ctx.closePath();
  ctx.fill();

  // 4. Target Name Banner with Pixel Typography
  ctx.font = 'bold 9px "DM Mono", monospace';
  const textWidth = ctx.measureText(label).width;
  const labelBoxW = textWidth + 14;
  const labelBoxH = 16;
  const labelBoxX = targetX - labelBoxW / 2;
  const labelBoxY = badgeY - labelBoxH - 5;

  ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
  ctx.fillRect(labelBoxX, labelBoxY, labelBoxW, labelBoxH);
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 1;
  ctx.strokeRect(labelBoxX, labelBoxY, labelBoxW, labelBoxH);

  ctx.fillStyle = '#fef08a';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, targetX, labelBoxY + labelBoxH / 2);

  ctx.restore();
}

/**
 * FELAKET BENİM — Pixel-Art World & Tilemap Renderer
 * Authentic top-down pixel-art game engine for the explorable city & hospital district.
 */

import type { WeatherPhase } from './weather';
import { CITY_DISTRICTS } from './cityDistricts';

export interface WorldRenderContext {
  ctx: CanvasRenderingContext2D;
  time: number; // in seconds
  camX: number;
  camY: number;
  viewWidth: number;
  viewHeight: number;
  activeDefenses: string[];
  roadWaterDepth: number; // in cm
  roadWetness: number;
  spongeStorage: number;
  spongeStorageCapacity: number;
  roadPassable: boolean;
  stormActive: boolean;
  weatherPhase: WeatherPhase;
  rainIntensity: number;
  cloudDarkness: number;
  windStrength: number;
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
  const { ctx, time, stormActive, roadWaterDepth, roadWetness, activeDefenses, weatherPhase, rainIntensity } = rc;

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

  // Four neighborhood identities live in the same coordinate system. These
  // backdrops sit under the shared road network, so players can walk between
  // them without scene swaps or teleport-only transitions.
  drawCityDistrictBackdrops(ctx, worldWidth, worldHeight, time);

  // Hand-placed detail passes keep the world readable while breaking up the
  // large procedural fields. These are visual-only and do not alter collision
  // or quest coordinates.
  drawPixelGroundMosaic(ctx, worldWidth, worldHeight);
  drawPixelTownSquareDetails(ctx, time);
  drawPixelResearchYardDetails(ctx, time);
  drawPixelHospitalGardenDetails(ctx, time);
  drawPixelResidentialEdges(ctx);
  drawPixelIndustrialYardDetails(ctx, time);

  // 2. Terraced Cliff / Elevation Retaining Stone Wall (Separates hillside from lower district)
  drawPixelStoneRetainingWall(ctx, 800, 150, 1900, 150);
  drawPixelStoneRetainingWall(ctx, 800, 480, 1950, 480);

  // 3. Roads & Sidewalks System
  // A. Main Vertical Avenue (Merkez - Yamaç Bağı, x: 740 - 860)
  drawPixelAvenueVertical(ctx, 760, 0, 100, worldHeight);

  // B. Main Horizontal Boulevard (Kıyı - Sanayi Bağı, y: 720 - 820)
  drawPixelBoulevardHorizontal(ctx, 0, 720, worldWidth, 100);

  // C. Hospital Access Road (Kritik Koridor: Curves from avenue x:860 up into Hospital plaza x:1350)
  drawPixelHospitalAccessCorridor(ctx, time, roadWaterDepth, roadWetness, stormActive, weatherPhase, rainIntensity);

  // D. Pedestrian Brick / Cobblestone Pathways & Plaza around Hospital
  drawPixelHospitalPlaza(ctx, 1300, 220, 360, 220);

  // E. Terraced Residential Pathways
  drawPixelDirtTrail(ctx, 920, 220, 1280, 220);

  // 4. Dynamic Flood Water Accumulation (Responsive to Simulation State)
  drawPixelFloodLayer(rc, time, roadWaterDepth, stormActive, activeDefenses);
}

function pixelHash(x: number, y: number, salt = 0) {
  const value = Math.sin(x * 12.9898 + y * 78.233 + salt * 37.719) * 43758.5453;
  return value - Math.floor(value);
}

function drawPixelGroundMosaic(ctx: CanvasRenderingContext2D, worldWidth: number, worldHeight: number) {
  ctx.save();
  ctx.globalAlpha = 0.65;
  for (let y = 24; y < worldHeight - 24; y += 48) {
    for (let x = 24; x < worldWidth - 24; x += 48) {
      const hash = pixelHash(x, y, 4);
      if (hash < 0.25) {
        ctx.fillStyle = '#315f3e';
        ctx.fillRect(x + 4, y + 8, 14, 3);
        ctx.fillRect(x + 9, y + 4, 3, 8);
        ctx.fillRect(x + 14, y + 6, 3, 8);
      } else if (hash < 0.42) {
        ctx.fillStyle = '#8c8751';
        ctx.fillRect(x + 7, y + 10, 8, 3);
        ctx.fillRect(x + 17, y + 14, 5, 2);
      } else if (hash > 0.86) {
        ctx.fillStyle = hash > 0.93 ? '#e4b36b' : '#b7d56c';
        ctx.fillRect(x + 10, y + 7, 3, 3);
        ctx.fillRect(x + 7, y + 10, 9, 2);
      }
    }
  }

  // Small planted pockets make the open grass feel authored rather than tiled.
  const beds = [
    { x: 220, y: 470, w: 150, h: 28, color: '#547a45' },
    { x: 850, y: 280, w: 120, h: 24, color: '#6f8b4c' },
    { x: 1670, y: 520, w: 150, h: 28, color: '#587c46' },
    { x: 1850, y: 690, w: 130, h: 24, color: '#71864b' },
  ];
  for (const bed of beds) {
    ctx.fillStyle = 'rgba(31, 61, 37, .32)';
    ctx.fillRect(bed.x - 6, bed.y + 6, bed.w + 12, bed.h + 8);
    ctx.fillStyle = bed.color;
    ctx.fillRect(bed.x, bed.y, bed.w, bed.h);
    for (let px = bed.x + 10; px < bed.x + bed.w - 6; px += 22) {
      ctx.fillStyle = '#a8c765';
      ctx.fillRect(px, bed.y + 5, 5, 8);
      ctx.fillStyle = '#d99572';
      ctx.fillRect(px + 6, bed.y + 4, 3, 3);
    }
  }
  ctx.restore();
}

function drawPixelTownSquareDetails(ctx: CanvasRenderingContext2D, time: number) {
  ctx.save();
  // Warm central plaza inset and a small civic fountain.
  ctx.fillStyle = '#b79b78';
  ctx.fillRect(178, 178, 360, 104);
  ctx.fillStyle = '#d6bf98';
  for (let x = 190; x < 520; x += 28) ctx.fillRect(x, 184, 18, 3);
  for (let y = 196; y < 270; y += 22) ctx.fillRect(190, y, 3, 12);
  ctx.fillStyle = '#697f71';
  ctx.fillRect(334, 216, 54, 28);
  ctx.fillStyle = '#9dd3c2';
  ctx.fillRect(342, 221, 38, 12);
  ctx.fillStyle = '#e9d09a';
  ctx.fillRect(330, 244, 62, 5);

  // Benches and planter boxes give the square a human scale.
  for (const [x, y] of [[150, 300], [500, 300], [240, 520], [450, 520]]) {
    ctx.fillStyle = '#4c3427';
    ctx.fillRect(x, y, 52, 5);
    ctx.fillRect(x + 5, y + 7, 5, 14);
    ctx.fillRect(x + 42, y + 7, 5, 14);
    ctx.fillStyle = '#ad7650';
    ctx.fillRect(x - 2, y - 6, 56, 6);
  }
  for (const [x, y] of [[120, 210], [520, 210], [230, 610], [430, 610]]) {
    ctx.fillStyle = '#755640';
    ctx.fillRect(x, y, 34, 18);
    ctx.fillStyle = '#5f944e';
    ctx.fillRect(x + 4, y - 12, 26, 14);
    ctx.fillStyle = '#b5d66a';
    ctx.fillRect(x + 10, y - 16, 5, 8);
    ctx.fillRect(x + 20, y - 13, 5, 7);
  }

  // The clock tower gets a warm lantern pulse without changing its landmark.
  ctx.fillStyle = `rgba(255, 214, 133, ${0.12 + (Math.sin(time * 2) + 1) * 0.03})`;
  ctx.fillRect(610, 515, 28, 34);
  ctx.restore();
}

function drawPixelResearchYardDetails(ctx: CanvasRenderingContext2D, time: number) {
  ctx.save();
  ctx.fillStyle = '#6c8a68';
  ctx.fillRect(250, 390, 92, 18);
  ctx.fillStyle = '#a3c477';
  for (let x = 258; x < 334; x += 16) {
    ctx.fillRect(x, 382, 4, 16);
    ctx.fillRect(x + 5, 378, 3, 18);
  }
  ctx.fillStyle = '#8a6848';
  ctx.fillRect(280, 505, 88, 7);
  ctx.fillRect(288, 512, 5, 18);
  ctx.fillRect(355, 512, 5, 18);
  ctx.fillStyle = '#d7c18e';
  ctx.fillRect(275, 497, 98, 8);

  // Sensor mast and a tiny rotating wind pennant make the station read as active.
  ctx.fillStyle = '#364e57';
  ctx.fillRect(390, 346, 4, 68);
  ctx.fillStyle = '#dba85e';
  ctx.fillRect(394, 350, 18, 5);
  ctx.fillStyle = '#8ad2be';
  ctx.fillRect(394 + Math.floor(Math.sin(time * 2) * 4), 357, 8, 3);
  ctx.restore();
}

function drawPixelHospitalGardenDetails(ctx: CanvasRenderingContext2D, time: number) {
  ctx.save();
  // Hospital forecourt garden, ambulance bay markers and sheltered seating.
  ctx.fillStyle = '#78955d';
  ctx.fillRect(1260, 250, 72, 112);
  ctx.fillStyle = '#a9c875';
  for (let y = 264; y < 348; y += 20) {
    ctx.fillRect(1272, y, 6, 10);
    ctx.fillRect(1294, y + 5, 6, 12);
    ctx.fillRect(1316, y - 2, 6, 14);
  }
  ctx.fillStyle = '#6c4b38';
  ctx.fillRect(1290, 360, 64, 6);
  ctx.fillRect(1298, 366, 5, 14);
  ctx.fillRect(1340, 366, 5, 14);
  ctx.fillStyle = '#e4c28b';
  ctx.fillRect(1286, 353, 72, 7);

  ctx.fillStyle = '#f3d493';
  ctx.fillRect(1434, 432, 18, 3);
  ctx.fillRect(1460, 432, 18, 3);
  ctx.fillStyle = '#d9645a';
  ctx.fillRect(1428, 428, 4, 11);
  ctx.fillRect(1480, 428, 4, 11);
  ctx.fillStyle = `rgba(255, 226, 156, ${0.22 + (Math.sin(time * 2.5) + 1) * 0.04})`;
  ctx.fillRect(1500, 438, 22, 6);
  ctx.restore();
}

function drawPixelResidentialEdges(ctx: CanvasRenderingContext2D) {
  ctx.save();
  const fenceLines = [
    { x: 940, y: 330, length: 210 },
    { x: 1580, y: 350, length: 170 },
    { x: 920, y: 690, length: 170 },
  ];
  for (const fence of fenceLines) {
    ctx.fillStyle = '#704c38';
    ctx.fillRect(fence.x, fence.y, fence.length, 4);
    for (let x = fence.x; x <= fence.x + fence.length; x += 24) ctx.fillRect(x, fence.y - 8, 4, 18);
    ctx.fillStyle = '#d0ae72';
    ctx.fillRect(fence.x + 5, fence.y - 3, fence.length - 10, 2);
  }
  for (const [x, y] of [[1010, 360], [1110, 350], [1700, 390], [1780, 440], [1020, 760]]) {
    ctx.fillStyle = '#406f43';
    ctx.fillRect(x, y, 22, 14);
    ctx.fillStyle = '#7fa45a';
    ctx.fillRect(x + 4, y - 8, 14, 9);
    ctx.fillStyle = '#e3a06e';
    ctx.fillRect(x + 8, y - 11, 4, 3);
  }
  ctx.restore();
}

function drawPixelIndustrialYardDetails(ctx: CanvasRenderingContext2D, time: number) {
  ctx.save();
  // Deliberate service-yard details: pallets, pipe racks, warning lines and a
  // small worker rest shelter make the industrial district feel functional.
  ctx.fillStyle = '#96704b';
  for (const [x, y] of [[900, 980], [1190, 1040], [1840, 1120]]) {
    ctx.fillRect(x, y, 42, 24);
    ctx.fillStyle = '#c49a62';
    ctx.fillRect(x + 5, y + 5, 32, 3);
    ctx.fillRect(x + 5, y + 13, 32, 3);
    ctx.fillStyle = '#96704b';
  }
  ctx.strokeStyle = '#d3a94f';
  ctx.lineWidth = 3;
  ctx.setLineDash([8, 7]);
  ctx.strokeRect(1460, 1030, 150, 84);
  ctx.setLineDash([]);
  ctx.fillStyle = '#41535a';
  ctx.fillRect(1780, 820, 94, 40);
  ctx.fillStyle = '#c9d5c2';
  ctx.fillRect(1788, 828, 78, 4);
  ctx.fillStyle = `rgba(240, 204, 123, ${0.2 + (Math.sin(time * 2) + 1) * 0.04})`;
  ctx.fillRect(1820, 850, 16, 4);
  ctx.restore();
}

function drawCityDistrictBackdrops(ctx: CanvasRenderingContext2D, worldWidth: number, worldHeight: number, time: number) {
  for (const district of CITY_DISTRICTS) {
    const { x, y, width, height } = district.bounds;
    ctx.fillStyle = district.palette.ground;
    ctx.fillRect(x, y, width, height);

    // Neighborhood borders are subtle paving/curb changes rather than walls.
    ctx.fillStyle = district.palette.shadow;
    ctx.globalAlpha = 0.32;
    ctx.fillRect(x, y, width, 10);
    ctx.fillRect(x, y + height - 10, width, 10);
    ctx.fillRect(x, y, 10, height);
    ctx.fillRect(x + width - 10, y, 10, height);
    ctx.globalAlpha = 1;
  }

  drawCoastalHarborBackdrop(ctx, time);
  drawOldTownBackdrop(ctx);
  drawHillsideBackdrop(ctx);
  drawIndustrialBackdrop(ctx);
  drawHarborStoryLayer(ctx, time);
  drawOldTownStoryLayer(ctx);
  drawHillsideStoryLayer(ctx, time);
  drawIndustrialStoryLayer(ctx, time);
  drawDistrictSigns(ctx);
}

function drawCoastalHarborBackdrop(ctx: CanvasRenderingContext2D, time: number) {
  // Sea, breakwater, docks, containers and a small ferry silhouette.
  ctx.fillStyle = '#1d5368';
  ctx.fillRect(0, 1200, 800, 300);
  ctx.fillStyle = '#3c9bad';
  for (let y = 1230; y < 1490; y += 34) {
    for (let x = 16; x < 790; x += 92) {
      const wave = Math.sin(time * 1.4 + x * 0.02 + y * 0.01) > 0;
      if (wave) ctx.fillRect(x, y, 36, 4);
    }
  }
  // The decks below are the only safe surfaces that extend over the water.
  // Keep their geometry aligned with WORLD_TERRAIN_MASK so the player sees
  // the same readable gap pattern that collision uses.
  for (const [x, width] of [[96, 150], [300, 150], [504, 150]] as const) {
    ctx.fillStyle = '#704d3d';
    ctx.fillRect(x, 1200, width, 34);
    ctx.fillStyle = '#c39460';
    ctx.fillRect(x, 1200, width, 5);
    ctx.fillStyle = '#4b3940';
    for (let postX = x + 12; postX < x + width; postX += 26) {
      ctx.fillRect(postX, 1206, 3, 24);
    }
    ctx.fillStyle = '#e7c87d';
    ctx.fillRect(x + 8, 1228, width - 16, 3);
  }
  ctx.fillStyle = '#c39460';
  ctx.fillRect(40, 1160, 700, 34);
  ctx.fillStyle = '#6b4d42';
  for (let x = 70; x < 720; x += 76) ctx.fillRect(x, 1190, 12, 170);
  ctx.fillStyle = '#b65f4f';
  ctx.fillRect(120, 1030, 100, 80);
  ctx.fillStyle = '#e3ad63';
  ctx.fillRect(230, 1048, 84, 62);
  ctx.fillStyle = '#4d7180';
  ctx.fillRect(340, 1015, 130, 95);
  ctx.fillStyle = '#252f3a';
  ctx.fillRect(350, 1000, 110, 18);
  ctx.fillStyle = '#e6c277';
  ctx.beginPath();
  ctx.moveTo(500, 1100); ctx.lineTo(590, 1100); ctx.lineTo(620, 1080); ctx.lineTo(530, 1080); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#e05e5e';
  ctx.fillRect(555, 1044, 7, 37);
}

function drawHarborStoryLayer(ctx: CanvasRenderingContext2D, time: number) {
  // A small working port vignette: crane, cargo stacks, mooring lights and a
  // ferry silhouette. These are visual-only and deliberately sit outside the
  // existing collision rectangles.
  ctx.save();
  ctx.fillStyle = '#253d4b';
  ctx.fillRect(560, 1032, 8, 126);
  ctx.fillRect(560, 1032, 105, 7);
  ctx.fillRect(655, 1032, 6, 42);
  ctx.strokeStyle = '#d6ad65';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(565, 1040); ctx.lineTo(645, 1110); ctx.lineTo(645, 1142);
  ctx.stroke();
  ctx.fillStyle = '#f0ca76';
  ctx.fillRect(646, 1104, 20, 5);

  const cargo = [[92, 1082, '#c86e55'], [122, 1082, '#d5a14f'], [92, 1107, '#4f7c8b'], [122, 1107, '#b86e4e']];
  for (const [x, y, color] of cargo as Array<[number, number, string]>) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, 24, 18);
    ctx.fillStyle = 'rgba(255, 239, 190, .4)';
    ctx.fillRect(x + 4, y + 4, 16, 2);
  }

  ctx.fillStyle = '#f2d39a';
  ctx.fillRect(476, 1132, 116, 4);
  ctx.fillStyle = '#72503c';
  for (let x = 482; x < 590; x += 18) ctx.fillRect(x, 1120, 3, 16);
  ctx.fillStyle = '#d55e57';
  ctx.beginPath();
  ctx.moveTo(420, 1300); ctx.lineTo(500, 1300); ctx.lineTo(486, 1320); ctx.lineTo(438, 1320); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#f6e2ad';
  ctx.fillRect(447, 1292, 28, 8);
  ctx.fillStyle = `rgba(255, 225, 138, ${0.5 + Math.sin(time * 2.4) * .12})`;
  ctx.fillRect(604, 1148, 5, 5);
  ctx.restore();
}

function drawOldTownBackdrop(ctx: CanvasRenderingContext2D) {
  // Cobblestone square and warm low-rise façades around the existing clocktower.
  ctx.fillStyle = '#8d7667';
  ctx.fillRect(80, 120, 560, 220);
  ctx.strokeStyle = '#b69a7e';
  ctx.lineWidth = 3;
  for (let x = 100; x < 620; x += 34) ctx.beginPath(), ctx.moveTo(x, 140), ctx.lineTo(x, 320), ctx.stroke();
  for (let y = 150; y < 320; y += 34) ctx.beginPath(), ctx.moveTo(90, y), ctx.lineTo(630, y), ctx.stroke();
  const houses = [
    [80, 360, 150, 90, '#b76d5c'], [250, 370, 160, 80, '#d49b62'], [470, 360, 150, 90, '#8b7395'],
    [100, 690, 170, 88, '#c78365'], [300, 675, 180, 100, '#d7ae72'], [520, 680, 130, 90, '#9b7990'],
  ] as const;
  for (const [x, y, w, h, color] of houses) {
    ctx.fillStyle = '#493b43'; ctx.fillRect(x + 8, y + 10, w, h);
    ctx.fillStyle = color; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#e8d4a6';
    for (let wx = x + 18; wx < x + w - 12; wx += 38) ctx.fillRect(wx, y + 24, 16, 20);
    ctx.fillStyle = '#4c3a45'; ctx.fillRect(x + w / 2 - 12, y + h - 30, 24, 30);
  }
  ctx.fillStyle = '#6b8d55';
  ctx.fillRect(170, 520, 280, 58);
  ctx.fillStyle = '#d5c276';
  for (let x = 190; x < 430; x += 42) ctx.fillRect(x, 530, 18, 18);
}

function drawOldTownStoryLayer(ctx: CanvasRenderingContext2D) {
  ctx.save();
  // Market awnings and hanging street lights add scale to the old square.
  for (const x of [126, 282, 438]) {
    ctx.fillStyle = '#6e4e42';
    ctx.fillRect(x, 332, 112, 8);
    for (let i = 0; i < 7; i += 1) {
      ctx.fillStyle = i % 2 ? '#e8c687' : '#c96959';
      ctx.fillRect(x + i * 16, 340, 16, 9);
    }
    ctx.fillStyle = '#8a5a45';
    ctx.fillRect(x + 8, 349, 4, 20);
    ctx.fillRect(x + 100, 349, 4, 20);
  }
  ctx.fillStyle = '#273a42';
  ctx.fillRect(90, 430, 4, 72);
  ctx.fillRect(86, 430, 12, 4);
  ctx.fillStyle = '#f4cf7c';
  ctx.fillRect(86, 434, 12, 9);
  ctx.restore();
}

function drawHillsideBackdrop(ctx: CanvasRenderingContext2D) {
  // Terraced green slopes and residential ribbons around the hospital scene.
  ctx.fillStyle = '#5b8d51';
  ctx.fillRect(820, 30, 1080, 110);
  ctx.fillStyle = '#78a45b';
  for (let y = 48; y < 650; y += 110) {
    ctx.fillRect(850, y, 980 - (y % 220), 10);
    for (let x = 870; x < 1900; x += 86) ctx.fillRect(x, y + 22, 22, 12);
  }
  ctx.fillStyle = '#d5c276';
  ctx.fillRect(1740, 90, 230, 16);
  ctx.fillStyle = '#a66d55';
  ctx.fillRect(1760, 45, 70, 45);
  ctx.fillStyle = '#e6d9bd';
  ctx.fillRect(1850, 30, 82, 60);
}

function drawHillsideStoryLayer(ctx: CanvasRenderingContext2D, time: number) {
  ctx.save();
  // Terraced gardens and rooftop solar panels keep the hospital neighborhood
  // readable as a lived-in, climate-aware hillside rather than open rectangles.
  for (const [x, y] of [[900, 92], [1180, 96], [1780, 148]]) {
    ctx.fillStyle = '#314d38';
    ctx.fillRect(x, y, 110, 24);
    ctx.fillStyle = '#6ea059';
    for (let px = x + 8; px < x + 104; px += 18) ctx.fillRect(px, y + 6, 8, 4);
    ctx.fillStyle = '#2c5c72';
    for (let px = x + 18; px < x + 60; px += 14) ctx.fillRect(px, y - 8, 10, 6);
  }
  ctx.fillStyle = '#76513d';
  ctx.fillRect(1880, 210, 4, 76);
  ctx.fillRect(1858, 210, 48, 4);
  ctx.fillStyle = '#f0c975';
  ctx.fillRect(1850, 214, 18, 5);
  ctx.fillStyle = `rgba(254, 218, 130, ${0.3 + Math.sin(time * 2) * .08})`;
  ctx.fillRect(1898, 216, 5, 5);
  ctx.restore();
}

function drawIndustrialBackdrop(ctx: CanvasRenderingContext2D) {
  // Hard-surfaced service yards, factories, tanks and drainage channels.
  ctx.fillStyle = '#596269';
  ctx.fillRect(860, 900, 1260, 420);
  ctx.fillStyle = '#6f7b80';
  for (let y = 930; y < 1290; y += 46) ctx.fillRect(880, y, 1220, 4);
  ctx.fillStyle = '#9a7655';
  const factories = [[930, 950, 250, 160], [1260, 900, 280, 210], [1640, 1040, 280, 180], [1940, 900, 130, 170]] as const;
  for (const [x, y, w, h] of factories) {
    ctx.fillStyle = '#39444b'; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#9a7655'; ctx.fillRect(x + 8, y + 8, w - 16, 18);
    ctx.fillStyle = '#c7d1cc';
    for (let wx = x + 24; wx < x + w - 18; wx += 44) ctx.fillRect(wx, y + 48, 20, 24);
  }
  ctx.fillStyle = '#b9c5c2';
  ctx.fillRect(1100, 1100, 28, 120); ctx.fillRect(1150, 1060, 28, 160);
  ctx.fillStyle = '#d8b86f';
  ctx.fillRect(1092, 1090, 44, 10); ctx.fillRect(1142, 1050, 44, 10);
  ctx.strokeStyle = '#273139'; ctx.lineWidth = 8;
  ctx.beginPath(); ctx.moveTo(900, 860); ctx.lineTo(2050, 860); ctx.lineTo(2140, 980); ctx.stroke();
  ctx.strokeStyle = '#4c8a8e'; ctx.lineWidth = 10;
  ctx.beginPath(); ctx.moveTo(900, 1330); ctx.lineTo(2070, 1330); ctx.stroke();
}

function drawIndustrialStoryLayer(ctx: CanvasRenderingContext2D, time: number) {
  ctx.save();
  // Tanks, pipe bridges and a loading gantry break the industrial district out
  // of flat blocks while preserving the existing walkable surface.
  for (const [x, y, h] of [[1520, 930, 92], [1840, 940, 120]]) {
    ctx.fillStyle = '#2f3c42';
    ctx.fillRect(x, y, 52, h);
    ctx.fillStyle = '#83969a';
    ctx.fillRect(x + 6, y + 8, 40, 6);
    ctx.fillRect(x + 8, y + h - 16, 36, 5);
    ctx.fillStyle = '#c99a5c';
    ctx.fillRect(x + 17, y - 8, 18, 8);
    ctx.fillStyle = '#9ab3b2';
    ctx.fillRect(x + 24, y - 38, 4, 30);
  }
  ctx.strokeStyle = '#c99554';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(1280, 880); ctx.lineTo(1280, 1010); ctx.lineTo(1440, 1010); ctx.lineTo(1440, 880);
  ctx.stroke();
  ctx.strokeStyle = '#e1bd72';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(1280, 900); ctx.lineTo(1440, 900);
  ctx.stroke();
  ctx.fillStyle = '#e4b469';
  ctx.fillRect(1288, 892, 12, 4);
  ctx.fillStyle = `rgba(242, 189, 91, ${0.45 + Math.sin(time * 2.2) * .12})`;
  ctx.fillRect(1882, 1010, 6, 6);
  ctx.restore();
}

function drawDistrictSigns(ctx: CanvasRenderingContext2D) {
  // Small street plaques preserve orientation without turning the world into
  // a debug map covered with giant labels.
  ctx.font = 'bold 10px monospace';
  ctx.textBaseline = 'middle';
  for (const district of CITY_DISTRICTS) {
    const { x, y } = district.landmark;
    ctx.fillStyle = 'rgba(8, 20, 28, 0.82)';
    ctx.fillRect(x - 44, y - 11, 88, 22);
    ctx.fillStyle = district.palette.detail;
    ctx.fillRect(x - 44, y - 11, 4, 22);
    const marker = district.id === 'kıyı'
      ? 'LİMAN'
      : district.id === 'merkez'
        ? 'MEYDAN'
        : district.id === 'yamaç'
          ? 'HASTANE'
          : 'SANAYİ';
    ctx.fillText(marker, x - 34, y);
  }
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
  // Layered sidewalk, curb and planted verge: the road remains walkable but
  // reads as part of a neighbourhood instead of a floating stripe.
  ctx.fillStyle = '#9b8a76';
  ctx.fillRect(x - 26, y, 26, h);
  ctx.fillRect(x + w, y, 26, h);
  ctx.fillStyle = '#c7b18e';
  ctx.fillRect(x - 8, y, 8, h);
  ctx.fillRect(x + w, y, 8, h);
  ctx.fillStyle = '#667477';
  ctx.fillRect(x - 18, y, 10, h);
  ctx.fillRect(x + w + 8, y, 10, h);
  for (let py = y + 18; py < y + h; py += 42) {
    ctx.fillStyle = '#547748';
    ctx.fillRect(x - 22, py, 5, 12);
    ctx.fillRect(x + w + 16, py + 12, 5, 12);
  }

  // Curb shadow
  ctx.fillStyle = '#4c535a';
  ctx.fillRect(x, y, 4, h);
  ctx.fillRect(x + w - 4, y, 4, h);

  // Road Asphalt
  ctx.fillStyle = '#343943';
  ctx.fillRect(x + 4, y, w - 8, h);

  ctx.fillStyle = 'rgba(197, 211, 202, .12)';
  ctx.fillRect(x + 12, y, 3, h);
  ctx.fillRect(x + w - 15, y, 3, h);

  // Yellow dashed lane divider
  ctx.fillStyle = '#d19a66';
  const centerX = x + w / 2 - 2;
  for (let py = y + 10; py < y + h; py += 40) {
    ctx.fillRect(centerX, py, 4, 22);
  }
}

// Horizontal Asphalt Boulevard
function drawPixelBoulevardHorizontal(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  // Sidewalks with alternating paving slabs and planted curb pockets.
  ctx.fillStyle = '#9b8a76';
  ctx.fillRect(x, y - 26, w, 26);
  ctx.fillRect(x, y + h, w, 26);
  ctx.fillStyle = '#c7b18e';
  ctx.fillRect(x, y - 8, w, 8);
  ctx.fillRect(x, y + h, w, 8);
  ctx.fillStyle = '#667477';
  ctx.fillRect(x, y - 18, w, 10);
  ctx.fillRect(x, y + h + 8, w, 10);
  for (let px = x + 18; px < x + w; px += 46) {
    ctx.fillStyle = '#547748';
    ctx.fillRect(px, y - 22, 12, 5);
    ctx.fillRect(px + 20, y + h + 16, 12, 5);
  }

  // Curbs
  ctx.fillStyle = '#4c535a';
  ctx.fillRect(x, y, w, 4);
  ctx.fillRect(x, y + h - 4, w, 4);

  // Asphalt
  ctx.fillStyle = '#343943';
  ctx.fillRect(x, y + 4, w, h - 8);

  ctx.fillStyle = 'rgba(197, 211, 202, .12)';
  ctx.fillRect(x, y + 14, w, 3);
  ctx.fillRect(x, y + h - 17, w, 3);

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
  roadWetness: number,
  stormActive: boolean,
  weatherPhase: WeatherPhase,
  rainIntensity: number,
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
  // This is a connecting road, not a cul-de-sac. Butt caps prevent the
  // branch entrance from becoming a large rounded asphalt bulb at the
  // boulevard crossing.
  ctx.lineCap = 'butt';
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

  // Wet pavement remains briefly after standing water recedes. This is a
  // visual derivative of the authoritative roadWetness value, not a second
  // flood state.
  if (roadWetness > 0.02) {
    ctx.strokeStyle = `rgba(67, 135, 164, ${0.08 + roadWetness * 0.2})`;
    ctx.lineWidth = roadHalfWidth * 1.65;
    ctx.beginPath();
    ctx.moveTo(waypoints[0].x, waypoints[0].y);
    for (let i = 1; i < waypoints.length; i++) ctx.lineTo(waypoints[i].x, waypoints[i].y);
    ctx.stroke();
  }

  // Rain darkens asphalt before it becomes a visible flood. This makes the
  // transition from dry road to localized standing water readable.
  if (weatherPhase !== 'CLEAR' && weatherPhase !== 'OVERCAST') {
    ctx.strokeStyle = `rgba(103, 176, 207, ${0.12 + rainIntensity * 0.2})`;
    ctx.lineWidth = roadHalfWidth * 1.55;
    ctx.beginPath();
    ctx.moveTo(waypoints[0].x, waypoints[0].y);
    for (let i = 1; i < waypoints.length; i++) ctx.lineTo(waypoints[i].x, waypoints[i].y);
    ctx.stroke();
  }

  if (waterDepth > 0) {
    ctx.strokeStyle = waterDepth > 30 ? 'rgba(27, 91, 133, 0.72)' : 'rgba(86, 168, 201, 0.5)';
    ctx.lineWidth = Math.min(roadHalfWidth * 1.4, 14 + waterDepth * 0.28);
    ctx.beginPath();
    ctx.moveTo(1080, 580);
    ctx.lineTo(1160, 520);
    ctx.lineTo(1240, 470);
    ctx.stroke();
  }

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
  const rainIntensity = rc.rainIntensity;
  const visualDepth = Math.max(0, waterDepth);
  if (visualDepth <= 0) return;

  // Stepped shoreline around the low road depression, rather than a screen-wide
  // blue overlay. The silhouette expands with the simulated water depth.
  const spread = Math.min(1, visualDepth / 36.5);
  const left = 1200 - 110 * spread;
  const right = 1260 + 120 * spread;
  const top = 528 - 40 * spread;
  const bottom = 565 + 62 * spread;

  // Multi-tier animated pixel water
  // Deep water layer (dark teal-blue)
  ctx.fillStyle = visualDepth > 30 ? 'rgba(24, 76, 120, 0.86)' : 'rgba(38, 108, 158, 0.72)';
  ctx.beginPath();
  ctx.moveTo(left, top + 12);
  ctx.lineTo(left + 18, top);
  ctx.lineTo(right - 22, top + 4);
  ctx.lineTo(right, top + 18);
  ctx.lineTo(right - 12, bottom - 10);
  ctx.lineTo(right - 30, bottom);
  ctx.lineTo(left + 20, bottom - 4);
  ctx.lineTo(left, bottom - 20);
  ctx.closePath();
  ctx.fill();

  // Stepped depth contours
  if (visualDepth > 15) {
    ctx.fillStyle = 'rgba(16, 52, 84, 0.88)';
    ctx.fillRect(left + 34, top + 20, Math.max(24, right - left - 68), Math.max(20, bottom - top - 46));
  }

  // Pixel surface ripple lines
  ctx.fillStyle = 'rgba(168, 222, 255, 0.65)';
  for (let py = top + 10; py < bottom - 4; py += 16) {
    const shift = Math.floor(Math.sin((py + time * 15) * 0.2) * 6);
    ctx.fillRect(left + 20 + shift, py, Math.max(18, right - left - 40), 2);
    ctx.fillRect(left + 40 - shift, py + 6, 24, 2);
  }

  // Wind-driven flow marks show the direction of runoff toward the road dip.
  ctx.fillStyle = 'rgba(205, 240, 255, 0.55)';
  for (let i = 0; i < 3; i++) {
    const flowX = 1110 + i * 52 + Math.sin(time * 2 + i) * 4;
    const flowY = 490 + i * 18;
    ctx.fillRect(flowX, flowY, 22, 2);
    ctx.fillRect(flowX + 17, flowY - 3, 5, 2);
  }

  // Floating debris / warning markers if water is dangerous (> 30 cm)
  if (visualDepth > 30) {
    ctx.fillStyle = '#e06c75';
    ctx.fillRect(1210, 550 + Math.sin(time * 4) * 3, 12, 12);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(1214, 552 + Math.sin(time * 4) * 3, 4, 8);
  }

  // A visible edge and drain flow make the difference between “wet road” and
  // an actual simulated pool legible in the same camera frame.
  ctx.fillStyle = visualDepth > 30 ? 'rgba(193, 235, 248, .72)' : 'rgba(176, 226, 235, .52)';
  for (let i = 0; i < 5; i += 1) {
    const edgeX = left + 16 + i * Math.max(18, (right - left - 32) / 5);
    ctx.fillRect(edgeX, top + 4 + (i % 2) * 4, 12, 2);
  }
  if (activeDefenses.includes('sünger')) {
    ctx.fillStyle = 'rgba(121, 220, 172, .65)';
    ctx.fillRect(1090, 486, 34, 3);
    ctx.fillRect(1106, 486, 3, 14);
    ctx.fillStyle = 'rgba(121, 220, 172, .35)';
    ctx.fillRect(1082, 492, 48, 2);
  }
}

export function drawPixelWeatherOverlay(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  time: number,
  weather: Pick<WorldRenderContext, 'weatherPhase' | 'rainIntensity' | 'cloudDarkness' | 'windStrength'>,
): void {
  const { weatherPhase, rainIntensity, cloudDarkness, windStrength } = weather;
  if (weatherPhase === 'CLEAR') return;

  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  if (cloudDarkness > 0) {
    ctx.fillStyle = `rgba(12, 27, 44, ${cloudDarkness * 0.18})`;
    ctx.fillRect(0, 0, width, height);
  }

  // Three depth layers make light rain readable without turning it into a
  // noisy full-screen filter. Each layer has its own speed, length and alpha
  // so the storm feels volumetric and remains crisp at pixel-art scale.
  const layers = [
    { count: 44 + Math.round(rainIntensity * 72), speed: 230, length: 9, alpha: 0.16, width: 1 },
    { count: 20 + Math.round(rainIntensity * 58), speed: 360, length: 15, alpha: 0.24, width: 1 },
    { count: Math.round(rainIntensity * 42), speed: 520, length: 22, alpha: 0.34, width: 2 },
  ];
  ctx.lineCap = 'butt';
  for (let layerIndex = 0; layerIndex < layers.length; layerIndex += 1) {
    const layer = layers[layerIndex];
    ctx.lineWidth = layer.width;
    for (let i = 0; i < layer.count; i += 1) {
      const drift = time * (layer.speed + windStrength * 260);
      const x = (i * (71 + layerIndex * 19) + drift * (0.72 + layerIndex * 0.16)) % (width + 80) - 40;
      const y = (i * (43 + layerIndex * 17) + time * layer.speed) % (height + 80) - 40;
      const length = layer.length + rainIntensity * (8 + layerIndex * 5);
      const lean = 4 + windStrength * (8 + layerIndex * 8);
      ctx.strokeStyle = `rgba(190, 231, 250, ${layer.alpha + rainIntensity * 0.18})`;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - lean, y + length);
      ctx.stroke();
      if (layerIndex === 2) {
        ctx.strokeStyle = `rgba(231, 248, 255, ${0.12 + rainIntensity * 0.12})`;
        ctx.beginPath();
        ctx.moveTo(x - 1, y + 2);
        ctx.lineTo(x - lean - 1, y + length - 3);
        ctx.stroke();
      }
    }
  }

  // Small pixel splashes give the rain a relationship with the world instead
  // of looking like lines pasted over the camera.
  if (rainIntensity > 0.18) {
    for (let i = 0; i < 18 + Math.round(rainIntensity * 20); i += 1) {
      const x = (i * 137 + time * 70) % width;
      const y = (i * 83 + time * 46) % height;
      const pulse = (Math.sin(time * 4 + i) + 1) * 0.5;
      ctx.fillStyle = `rgba(190, 231, 250, ${0.18 + rainIntensity * 0.22})`;
      ctx.fillRect(x, y, 5 + pulse * 3, 1);
      ctx.fillRect(x + 2, y - 2, 1, 5);
    }
  }

  if (weatherPhase === 'EXTREME_STORM' && Math.sin(time * 1.7) > 0.985) {
    ctx.fillStyle = 'rgba(210, 235, 255, 0.12)';
    ctx.fillRect(0, 0, width, height);
  }
  ctx.restore();
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

  // Roof parapet and warm brick trim give the landmark a deliberate silhouette.
  ctx.fillStyle = '#2d3947';
  ctx.fillRect(x - 8, y - 8, w + 16, 10);
  ctx.fillStyle = '#b27763';
  ctx.fillRect(x + 8, y + 2, w - 16, 5);
  ctx.fillStyle = '#d7b778';
  ctx.fillRect(x + 12, y + 7, w - 24, 2);

  // Front Panel / Floor Slabs
  ctx.fillStyle = '#5c6f84';
  ctx.fillRect(x + 8, y + 8, w - 16, h - 16);

  // Side wings and rooftop equipment give the hospital a civic landmark
  // silhouette instead of a single rectangular block.
  ctx.fillStyle = '#43566b';
  ctx.fillRect(x - 24, y + 58, 24, 96);
  ctx.fillRect(x + w, y + 42, 24, 112);
  ctx.fillStyle = '#2d3b4a';
  ctx.fillRect(x - 30, y + 52, 30, 8);
  ctx.fillRect(x + w, y + 36, 30, 8);
  ctx.fillStyle = '#83b7c6';
  for (let wy = y + 72; wy < y + 136; wy += 26) {
    ctx.fillRect(x - 18, wy, 12, 12);
    ctx.fillRect(x + w + 8, wy, 12, 12);
  }
  ctx.fillStyle = '#4e6375';
  ctx.fillRect(x + 24, y - 26, 64, 14);
  ctx.fillRect(x + 150, y - 30, 48, 18);
  ctx.fillStyle = '#9ec7c5';
  ctx.fillRect(x + 32, y - 22, 14, 5);
  ctx.fillRect(x + 52, y - 22, 14, 5);
  ctx.fillRect(x + 158, y - 25, 32, 5);

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

  // Pixel signage and planted entrance markers improve the approach read.
  ctx.fillStyle = '#f6e8c4';
  ctx.fillRect(x + 16, y + h + 8, 82, 10);
  ctx.fillStyle = '#d85d5a';
  ctx.fillRect(x + 22, y + h + 11, 8, 4);
  ctx.fillRect(x + 38, y + h + 11, 8, 4);
  ctx.fillRect(x + 54, y + h + 11, 8, 4);

  // Wayfinding flag and raised planters make the emergency approach legible.
  ctx.fillStyle = '#3b4d57';
  ctx.fillRect(x + 198, y + h - 42, 3, 42);
  ctx.fillStyle = '#d85d5a';
  ctx.fillRect(x + 201, y + h - 40, 24, 12);
  ctx.fillStyle = '#f6e8c4';
  ctx.fillRect(x + 204, y + h - 37, 18, 5);
  for (const px of [x + 10, x + w - 30]) {
    ctx.fillStyle = '#5a7047';
    ctx.fillRect(px, y + h + 18, 20, 8);
    ctx.fillStyle = '#a8c765';
    ctx.fillRect(px + 4, y + h + 11, 6, 8);
    ctx.fillRect(px + 13, y + h + 9, 5, 10);
  }

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

  // Low garden strip anchors the house to the ground plane.
  ctx.fillStyle = '#66834c';
  ctx.fillRect(x - 4, y + h - 2, w + 8, 8);
  ctx.fillStyle = '#b0c86e';
  ctx.fillRect(x + 10, y + h - 6, 4, 7);
  ctx.fillRect(x + w - 18, y + h - 6, 4, 7);

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
  time: number,
  storage = 0,
  storageCapacity = 1,
) {
  if (isBuilt) {
    if (type === 'sponge') {
      // Completed Sponge Park (Bioswale, reeds, retention pond)
      const fill = Math.max(0, Math.min(1, storage / Math.max(1, storageCapacity)));
      ctx.fillStyle = '#1e382b';
      ctx.fillRect(x - 36, y - 24, 72, 48);
      // Retention pond water grows with the model's finite storage.
      ctx.fillStyle = `rgba(58, 125, 153, ${0.18 + fill * 0.78})`;
      ctx.beginPath();
      ctx.ellipse(x, y + 6, 8 + fill * 18, 5 + fill * 9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#78d7a5';
      ctx.fillRect(x - 29, y - 19, 58 * fill, 3);
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

  // Small warm grounding halo and dark pixel outline keep the hero readable
  // over grass, paving and flood reflections without a giant marker.
  ctx.fillStyle = 'rgba(255, 224, 143, 0.16)';
  ctx.fillRect(x - 11, y + 1, 22, 4);
  ctx.fillStyle = '#17232a';
  ctx.fillRect(x - 8, y - 27, 16, 2);
  ctx.fillRect(x - 8, y - 2, 16, 2);

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
// 8. CONTEXTUAL OBJECTIVE MARKERS
// ---------------------------------------------------------------------------

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
  void label;
  const markerY = targetY - 34 + Math.sin(time * 3) * 1.5;
  const size = 14;

  ctx.save();
  ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
  ctx.fillRect(targetX - size / 2, markerY - size / 2, size, size);
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 1;
  ctx.strokeRect(targetX - size / 2, markerY - size / 2, size, size);

  // One compact icon per objective; no text banner, ground route, ring, or arrow.
  ctx.fillStyle = questStep === 4 ? '#f59e0b' : '#fef08a';
  if (questStep === 1 || questStep === 7) {
    ctx.fillRect(targetX - 1, markerY - 5, 2, 10);
    ctx.fillRect(targetX - 5, markerY - 1, 10, 2);
  } else if (questStep === 2) {
    ctx.fillRect(targetX - 4, markerY - 4, 8, 6);
    ctx.fillRect(targetX - 2, markerY + 2, 3, 2);
  } else if (questStep === 3) {
    ctx.strokeStyle = '#7dd3fc';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(targetX - 1, markerY - 1, 3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillRect(targetX + 2, markerY + 2, 4, 1);
  } else if (questStep === 4) {
    ctx.beginPath();
    ctx.moveTo(targetX, markerY - 5);
    ctx.lineTo(targetX + 5, markerY + 4);
    ctx.lineTo(targetX - 5, markerY + 4);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.fillRect(targetX - 4, markerY - 1, 8, 2);
    ctx.fillRect(targetX - 1, markerY - 4, 2, 8);
  }
  ctx.restore();
}

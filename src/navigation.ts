/**
 * FELAKET BENİM — Navigation & Spatial Pathfinding Engine
 * Intelligent A* pathfinding, compass math, screen-edge indicators,
 * and rule-based EKO companion hints.
 */

export interface Point2D {
  x: number;
  y: number;
}

export interface ObstacleBox {
  x: number;
  y: number;
  w: number;
  h: number;
  label?: string;
}

export interface OffScreenIndicator {
  isOffScreen: boolean;
  screenX: number;
  screenY: number;
  angleDeg: number;
  distanceMeters: number;
}

export interface EkoHint {
  speaker: 'EKO';
  title: string;
  hint: string;
  urgency: 'info' | 'warning' | 'success';
}

// 10 pixels in game world = 1 meter in real world
export const PIXELS_PER_METER = 10;

/**
 * Calculates Euclidean distance between two points in world units and converts to meters.
 */
export function calculateDistanceMeters(p1: Point2D, p2: Point2D): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const pxDist = Math.hypot(dx, dy);
  return Math.max(1, Math.round(pxDist / PIXELS_PER_METER));
}

/**
 * Calculates bearing angle in degrees from p1 to p2 (0 deg = pointing right / east, 90 deg = pointing down / south).
 */
export function calculateBearingDeg(from: Point2D, to: Point2D): number {
  const rad = Math.atan2(to.y - from.y, to.x - from.x);
  return (rad * 180) / Math.PI;
}

/**
 * Computes off-screen indicator position and angle for screen edges.
 * If target is inside viewport, isOffScreen is false.
 */
export function getOffScreenIndicator(
  targetWorld: Point2D,
  camera: { camX: number; camY: number },
  viewport: { width: number; height: number },
  padding = 48
): OffScreenIndicator {
  const screenTargetX = targetWorld.x - camera.camX;
  const screenTargetY = targetWorld.y - camera.camY;

  const isOffScreen =
    screenTargetX < padding ||
    screenTargetX > viewport.width - padding ||
    screenTargetY < padding ||
    screenTargetY > viewport.height - padding;

  const centerX = viewport.width / 2;
  const centerY = viewport.height / 2;

  const angleRad = Math.atan2(screenTargetY - centerY, screenTargetX - centerX);
  const angleDeg = (angleRad * 180) / Math.PI;

  const playerCenterWorld: Point2D = {
    x: camera.camX + centerX,
    y: camera.camY + centerY,
  };
  const distanceMeters = calculateDistanceMeters(playerCenterWorld, targetWorld);

  if (!isOffScreen) {
    return {
      isOffScreen: false,
      screenX: screenTargetX,
      screenY: screenTargetY,
      angleDeg,
      distanceMeters,
    };
  }

  // Intersect ray with viewport box (padded)
  const minX = padding;
  const maxX = viewport.width - padding;
  const minY = padding + 60; // Extra room for top HUD
  const maxY = viewport.height - padding;

  const dx = Math.cos(angleRad);
  const dy = Math.sin(angleRad);

  let edgeX = centerX;
  let edgeY = centerY;

  if (Math.abs(dx) > 0.0001) {
    // Intersect with left / right
    const targetX = dx > 0 ? maxX : minX;
    const t = (targetX - centerX) / dx;
    const yAtX = centerY + t * dy;
    if (yAtX >= minY && yAtX <= maxY) {
      edgeX = targetX;
      edgeY = yAtX;
      return { isOffScreen: true, screenX: edgeX, screenY: edgeY, angleDeg, distanceMeters };
    }
  }

  if (Math.abs(dy) > 0.0001) {
    // Intersect with top / bottom
    const targetY = dy > 0 ? maxY : minY;
    const t = (targetY - centerY) / dy;
    const xAtY = centerX + t * dx;
    edgeX = Math.max(minX, Math.min(maxX, xAtY));
    edgeY = targetY;
  }

  return {
    isOffScreen: true,
    screenX: edgeX,
    screenY: edgeY,
    angleDeg,
    distanceMeters,
  };
}

/**
 * Checks if a point collides with a bounding box (including character clearance radius).
 */
export function pointCollidesWithObstacle(pt: Point2D, obs: ObstacleBox, margin = 10): boolean {
  return (
    pt.x >= obs.x - margin &&
    pt.x <= obs.x + obs.w + margin &&
    pt.y >= obs.y - margin &&
    pt.y <= obs.y + obs.h + margin
  );
}

/**
 * Checks if a point is inside the deep flooded road zone.
 * When road water depth > 30 cm, this area is impassable without elevated defenses.
 */
export function pointInFloodedRoadZone(pt: Point2D, roadWaterDepth: number): boolean {
  if (roadWaterDepth <= 30) return false;
  // Flood depression corridor: between x: 1140 and 1320, y: 480 and 590
  return pt.x >= 1140 && pt.x <= 1320 && pt.y >= 480 && pt.y <= 590;
}

// Structured Navigable Road Graph with explicit street connectivity
export interface RoadNode {
  id: string;
  x: number;
  y: number;
  neighbors: string[];
}

export const ROAD_NETWORK_NODES: Record<string, RoadNode> = {
  // Main Vertical Avenue
  ave_150: { id: 'ave_150', x: 810, y: 150, neighbors: ['ave_350'] },
  ave_350: { id: 'ave_350', x: 810, y: 350, neighbors: ['ave_150', 'ave_550', 'terrace_950'] },
  ave_550: { id: 'ave_550', x: 810, y: 550, neighbors: ['ave_350', 'ave_760', 'bazaar_promenade'] },
  ave_760: { id: 'ave_760', x: 810, y: 760, neighbors: ['ave_550', 'ave_1050', 'blvd_550', 'blvd_1200', 'hosp_860'] },
  ave_1050: { id: 'ave_1050', x: 810, y: 1050, neighbors: ['ave_760', 'ave_1350'] },
  ave_1350: { id: 'ave_1350', x: 810, y: 1350, neighbors: ['ave_1050'] },

  // Horizontal Boulevard
  blvd_300: { id: 'blvd_300', x: 300, y: 760, neighbors: ['blvd_550'] },
  blvd_550: { id: 'blvd_550', x: 550, y: 760, neighbors: ['blvd_300', 'ave_760'] },
  blvd_1200: { id: 'blvd_1200', x: 1200, y: 760, neighbors: ['ave_760', 'blvd_1550', 'hosp_920'] },
  blvd_1550: { id: 'blvd_1550', x: 1550, y: 760, neighbors: ['blvd_1200', 'blvd_1900'] },
  blvd_1900: { id: 'blvd_1900', x: 1900, y: 760, neighbors: ['blvd_1550'] },

  // Curved Hospital Access Road Corridor (Ascending hillside curve)
  hosp_860: { id: 'hosp_860', x: 860, y: 740, neighbors: ['ave_760', 'hosp_920'] },
  hosp_920: { id: 'hosp_920', x: 920, y: 710, neighbors: ['hosp_860', 'hosp_1000', 'blvd_1200'] },
  hosp_1000: { id: 'hosp_1000', x: 1000, y: 650, neighbors: ['hosp_920', 'hosp_1080'] },
  hosp_1080: { id: 'hosp_1080', x: 1080, y: 580, neighbors: ['hosp_1000', 'hosp_1180', 'terrace_1060'] },
  hosp_1180: { id: 'hosp_1180', x: 1180, y: 520, neighbors: ['hosp_1080', 'hosp_1250'] }, // Flood dip & observation
  hosp_1250: { id: 'hosp_1250', x: 1250, y: 480, neighbors: ['hosp_1180', 'hosp_1320'] }, // Inspection point
  hosp_1320: { id: 'hosp_1320', x: 1320, y: 450, neighbors: ['hosp_1250', 'hosp_1380'] },
  hosp_1380: { id: 'hosp_1380', x: 1380, y: 450, neighbors: ['hosp_1320', 'hosp_1470', 'terrace_1280'] },
  hosp_1470: { id: 'hosp_1470', x: 1470, y: 450, neighbors: ['hosp_1380'] }, // Emergency Entrance

  // Upper Terrace Bypass (Connects to Sponge Site and bypasses flood dip)
  terrace_950: { id: 'terrace_950', x: 950, y: 340, neighbors: ['ave_350', 'terrace_1060'] },
  terrace_1060: { id: 'terrace_1060', x: 1060, y: 340, neighbors: ['terrace_950', 'terrace_1160', 'hosp_1080'] },
  terrace_1160: { id: 'terrace_1160', x: 1160, y: 340, neighbors: ['terrace_1060', 'terrace_1280'] }, // Sponge site
  terrace_1280: { id: 'terrace_1280', x: 1280, y: 340, neighbors: ['terrace_1160', 'hosp_1380'] },

  // Historic Promenade & Climate Research Station
  bazaar_promenade: { id: 'bazaar_promenade', x: 620, y: 620, neighbors: ['ave_550', 'blvd_550', 'bazaar_clock'] },
  bazaar_clock: { id: 'bazaar_clock', x: 550, y: 470, neighbors: ['bazaar_promenade', 'research_station'] },
  research_station: { id: 'research_station', x: 520, y: 470, neighbors: ['bazaar_clock'] },
};

export const ROAD_NETWORK_WAYPOINTS: Point2D[] = Object.values(ROAD_NETWORK_NODES).map((n) => ({
  x: n.x,
  y: n.y,
}));

/**
 * Checks line of sight between two points against obstacles and flooded zones.
 */
export function hasLineOfSight(
  p1: Point2D,
  p2: Point2D,
  obstacles: ObstacleBox[],
  roadWaterDepth: number
): boolean {
  const steps = 12;
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const testPt: Point2D = {
      x: p1.x + (p2.x - p1.x) * t,
      y: p1.y + (p2.y - p1.y) * t,
    };

    if (pointInFloodedRoadZone(testPt, roadWaterDepth)) {
      return false;
    }

    for (const obs of obstacles) {
      if (pointCollidesWithObstacle(testPt, obs, 14)) {
        return false;
      }
    }
  }
  return true;
}

/**
 * Finds optimal route from start to target using the street network graph.
 * Adapts dynamically if the road is flooded by taking the elevated terrace bypass.
 */
export function findNavRoute(
  start: Point2D,
  target: Point2D,
  obstacles: ObstacleBox[],
  roadWaterDepth = 0
): Point2D[] {
  // If close and direct line of sight exists (< 120px), walk straight to it
  const directDist = Math.hypot(target.x - start.x, target.y - start.y);
  if (directDist < 120 && hasLineOfSight(start, target, obstacles, roadWaterDepth)) {
    return [start, target];
  }

  // Filter valid nodes based on flood level
  const validNodeIds = Object.keys(ROAD_NETWORK_NODES).filter((id) => {
    const node = ROAD_NETWORK_NODES[id];
    if (pointInFloodedRoadZone(node, roadWaterDepth)) return false;
    for (const obs of obstacles) {
      if (pointCollidesWithObstacle(node, obs, 12)) return false;
    }
    return true;
  });

  // Connect start to closest accessible road nodes
  const startConnectors = validNodeIds
    .filter((id) => hasLineOfSight(start, ROAD_NETWORK_NODES[id], obstacles, roadWaterDepth))
    .sort(
      (a, b) =>
        Math.hypot(ROAD_NETWORK_NODES[a].x - start.x, ROAD_NETWORK_NODES[a].y - start.y) -
        Math.hypot(ROAD_NETWORK_NODES[b].x - start.x, ROAD_NETWORK_NODES[b].y - start.y)
    );

  // Connect target to closest accessible road nodes
  const targetConnectors = validNodeIds
    .filter((id) => hasLineOfSight(ROAD_NETWORK_NODES[id], target, obstacles, roadWaterDepth))
    .sort(
      (a, b) =>
        Math.hypot(ROAD_NETWORK_NODES[a].x - target.x, ROAD_NETWORK_NODES[a].y - target.y) -
        Math.hypot(ROAD_NETWORK_NODES[b].x - target.x, ROAD_NETWORK_NODES[b].y - target.y)
    );

  const startNodeId = startConnectors[0] || 'hosp_1000';
  const targetNodeId = targetConnectors[0] || 'hosp_1470';

  // A* Graph Search over Road Network
  interface AStarNode {
    id: string;
    point: Point2D;
    g: number;
    f: number;
    parent?: AStarNode;
  }

  const openList: AStarNode[] = [];
  const closedSet = new Set<string>();

  const startAStar: AStarNode = {
    id: startNodeId,
    point: ROAD_NETWORK_NODES[startNodeId] || { x: start.x, y: start.y },
    g: Math.hypot(ROAD_NETWORK_NODES[startNodeId].x - start.x, ROAD_NETWORK_NODES[startNodeId].y - start.y),
    f: Math.hypot(target.x - start.x, target.y - start.y),
  };
  openList.push(startAStar);

  let iterations = 0;
  while (openList.length > 0 && iterations < 200) {
    iterations++;
    openList.sort((a, b) => a.f - b.f);
    const current = openList.shift()!;

    if (current.id === targetNodeId) {
      // Reconstruct path
      const path: Point2D[] = [start];
      const reversedNodes: Point2D[] = [];
      let curr: AStarNode | undefined = current;
      while (curr) {
        reversedNodes.unshift(curr.point);
        curr = curr.parent;
      }
      path.push(...reversedNodes, target);
      return path;
    }

    closedSet.add(current.id);

    const currentNode = ROAD_NETWORK_NODES[current.id];
    if (!currentNode) continue;

    for (const neighborId of currentNode.neighbors) {
      if (closedSet.has(neighborId)) continue;
      if (!validNodeIds.includes(neighborId)) continue;

      const neighborNode = ROAD_NETWORK_NODES[neighborId];
      if (!neighborNode) continue;

      const edgeDist = Math.hypot(neighborNode.x - currentNode.x, neighborNode.y - currentNode.y);
      const tentativeG = current.g + edgeDist;

      let neighborAStar = openList.find((n) => n.id === neighborId);
      if (!neighborAStar) {
        neighborAStar = {
          id: neighborId,
          point: neighborNode,
          g: tentativeG,
          f: tentativeG + Math.hypot(target.x - neighborNode.x, target.y - neighborNode.y),
          parent: current,
        };
        openList.push(neighborAStar);
      } else if (tentativeG < neighborAStar.g) {
        neighborAStar.g = tentativeG;
        neighborAStar.f = tentativeG + Math.hypot(target.x - neighborNode.x, target.y - neighborNode.y);
        neighborAStar.parent = current;
      }
    }
  }

  // Direct fallback
  return [start, ROAD_NETWORK_NODES[startNodeId], ROAD_NETWORK_NODES[targetNodeId], target];
}


/**
 * Rule-based intelligent EKO Companion Hint Engine
 */
export function getEkoContextualHint(params: {
  questStep: number;
  playerPos: Point2D;
  targetPos: Point2D;
  roadWaterDepth: number;
  roadPassable: boolean;
  hasSpongeDefense: boolean;
  budgetRemaining: number;
  distanceMeters: number;
}): EkoHint {
  const {
    questStep,
    roadWaterDepth,
    roadPassable,
    hasSpongeDefense,
    budgetRemaining,
    distanceMeters,
  } = params;

  // Priority 1: Critical road flooding hazard
  if (!roadPassable && roadWaterDepth >= 30 && !hasSpongeDefense) {
    return {
      speaker: 'EKO',
      title: '🚨 TEHLİKE: SU DERİNLİĞİ KRİTİK',
      hint: `Yol çukurundaki taşkın ${roadWaterDepth} cm'ye ulaştı! Doğrudan geçiş imkansız. Yukarı terastaki Sünger Kent alanına çıkarak gölet inşa et!`,
      urgency: 'warning',
    };
  }

  // Priority 2: Proximity to active target (< 8 meters)
  if (distanceMeters <= 8) {
    return {
      speaker: 'EKO',
      title: 'HEDEFE ULAŞTIN',
      hint: 'Hedef noktadasın. Etkileşime geçmek için [E] tuşuna bas veya ekrandaki eylem butonuna dokun.',
      urgency: 'success',
    };
  }

  // Step-specific contextual guidance
  switch (questStep) {
    case 1:
      return {
        speaker: 'EKO',
        title: 'MİRA’YI BUL',
        hint: `İklim Araştırma İstasyonu'ndaki Mira'yı bul (${distanceMeters} m). Yaklaşan 88 mm/saat fırtına öncesinde acil durum saha görevini ondan al.`,
        urgency: 'info',
      };
    case 2:
      return {
        speaker: 'EKO',
        title: 'DRENAJ MENFEZİ',
        hint: `Hastane yolundaki drenaj menfezine git (${distanceMeters} m). Izgaranın mevcut kapasitesini ve tıkanıklık durumunu denetle.`,
        urgency: 'info',
      };
    case 3:
      return {
        speaker: 'EKO',
        title: 'MÜHENDİS ARAS',
        hint: `Şantiye yol ayrımındaki Saha Mühendisi Aras ile görüş (${distanceMeters} m). Menfez yetersizliği karşısında mühendislik çözümünü planla.`,
        urgency: 'info',
      };
    case 4:
      return {
        speaker: 'EKO',
        title: 'FIRTINAYI GÖZLEMLE',
        hint: `Yol taşkın gözlem noktasına geç (${distanceMeters} m). Şiddetli yağışın başlamasını ve yol çukurunda biriken su derinliğini gözlemle.`,
        urgency: 'warning',
      };
    case 5:
      return {
        speaker: 'EKO',
        title: 'SAVUNMA İNŞA ET',
        hint: `Kalan kredin: ${budgetRemaining} Kr. Kuzey terastaki patikadan Sünger Kent sahasına çık (${distanceMeters} m) ve su tutma göletini inşa et.`,
        urgency: 'info',
      };
    case 6:
      return {
        speaker: 'EKO',
        title: 'SONUCU KONTROL ET',
        hint: `Hastane yoluna geri dön (${distanceMeters} m). Sünger Kent müdahalesi sonrası suyun çekilişini ve ambulans koridorunun açıldığını doğrula.`,
        urgency: 'success',
      };
    case 7:
      return {
        speaker: 'EKO',
        title: 'MİRA’YA GERİ DÖN',
        hint: `İklim Araştırma İstasyonu'na geri dön (${distanceMeters} m). Mira'ya hastane yolunun açık kaldığı müjdesini ver ve Bölüm 1'i tamamla!`,
        urgency: 'success',
      };
    default:
      return {
        speaker: 'EKO',
        title: 'NAVİGASYON AKTİF',
        hint: `Altın rota izini takip et. Hedefe mesafe: ${distanceMeters} metre.`,
        urgency: 'info',
      };
  }
}

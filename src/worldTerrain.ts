import type { TerrainMask } from './navigation';

/**
 * Waterfront terrain mask. The sea is blocked by default; only the quay and
 * the explicitly modelled dock decks are valid surfaces above the water.
 */
export const WORLD_TERRAIN_MASK: TerrainMask = {
  blockedZones: [
    { x: 0, y: 1200, w: 800, h: 300, label: 'AÇIK DENİZ' },
  ],
  walkableZones: [
    { x: 24, y: 1150, w: 716, h: 52, label: 'KIYI RIHTIMI' },
      // The ten-pixel overlap is intentional: it gives the player a safe
      // collision-radius bridge from the quay onto each visible deck.
      { x: 86, y: 1180, w: 170, h: 64, label: 'BATI İSKELESİ' },
      { x: 290, y: 1180, w: 170, h: 64, label: 'BALIKÇI İSKELESİ' },
      { x: 494, y: 1180, w: 170, h: 64, label: 'FERİBOT İSKELESİ' },
  ],
};


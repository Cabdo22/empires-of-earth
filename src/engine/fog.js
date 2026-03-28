// ============================================================
// FOG OF WAR — visibility computation
// ============================================================
import { FOG_SIGHT } from './constants.js';
import { hexDist } from './hex-math.js';

// Compute currently visible hex keys for a player
export const getVisibleHexes = (player, hexes) => {
  const visible = new Set();

  // Each unit reveals hexes within its sight range
  for (const unit of player.units) {
    const sight = FOG_SIGHT[unit.unitType] || FOG_SIGHT.default;
    for (const h of hexes) {
      if (hexDist(unit.hexCol, unit.hexRow, h.col, h.row) <= sight) {
        visible.add(`${h.col},${h.row}`);
      }
    }
  }

  // Cities reveal a slightly larger radius
  for (const city of player.cities) {
    const cityHex = hexes[city.hexId];
    for (const h of hexes) {
      if (hexDist(cityHex.col, cityHex.row, h.col, h.row) <= FOG_SIGHT.default + 1) {
        visible.add(`${h.col},${h.row}`);
      }
    }
  }

  return visible;
};

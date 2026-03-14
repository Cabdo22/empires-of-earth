// ============================================================
// RANDOM EVENTS
// ============================================================

import { gameRng } from './constants.js';
import { isHexOccupied } from '../engine/movement.js';

export const RANDOM_EVENTS = [
  {
    id: "gold_rush", name: "Gold Rush!", desc: "Traders bring wealth.",
    effect: (g) => {
      const cp = g.players.find(p => p.id === g.currentPlayerId);
      cp.gold += 25;
    },
  },
  {
    id: "plague", name: "Plague Strikes", desc: "Disease reduces city population.",
    effect: (g) => {
      const cp = g.players.find(p => p.id === g.currentPlayerId);
      const eligible = cp.cities.filter(c => c.population >= 4);
      if (eligible.length === 0) return;
      const c = eligible[Math.floor(gameRng(g) * eligible.length)];
      c.population--;
      c.foodAccumulated = 0;
    },
  },
  {
    id: "eureka", name: "Eureka!", desc: "A breakthrough advances research.",
    effect: (g) => {
      const cp = g.players.find(p => p.id === g.currentPlayerId);
      if (cp.currentResearch) cp.currentResearch.progress += 12;
    },
  },
  {
    id: "harvest", name: "Bountiful Harvest", desc: "Surplus food for all cities.",
    effect: (g) => {
      const cp = g.players.find(p => p.id === g.currentPlayerId);
      cp.cities.forEach(c => c.foodAccumulated += 15);
    },
  },
  {
    id: "raid", name: "Barbarian Raid!", desc: "Barbarians attack your borders.",
    effect: (g, addLog) => {
      const empties = g.hexes.filter(h => h.terrainType !== "water" && h.terrainType !== "mountain" && !h.cityId);
      const border = empties.filter(h => !h.ownerPlayerId && !isHexOccupied(h.col, h.row, g.players, g.barbarians));
      if (border.length > 0) {
        const bh = border[Math.floor(gameRng(g) * border.length)];
        g.nextUnitId = (g.nextUnitId || 0) + 1;
        g.barbarians.push({
          id: `barb-${g.nextUnitId}`, unitType: "warrior",
          hexCol: bh.col, hexRow: bh.row,
          hpCurrent: 15, movementCurrent: 0, hasAttacked: false,
        });
        addLog("⚠ Barbarians spotted near your borders!", g);
      }
    },
  },
];

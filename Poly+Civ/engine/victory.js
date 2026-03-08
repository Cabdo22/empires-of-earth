// ============================================================
// VICTORY CONDITIONS
// ============================================================

import { TERRITORIAL_WIN } from '../data/constants.js';

export const checkVictoryState = (g) => {
  const p1 = g.players[0], p2 = g.players[1];

  // Domination: enemy has no cities
  if (p1.cities.length === 0) { g.victoryStatus = { winner: "p2", type: "Domination" }; return; }
  if (p2.cities.length === 0) { g.victoryStatus = { winner: "p1", type: "Domination" }; return; }

  // Science: research both endgame techs
  for (const p of g.players) {
    if (p.researchedTechs.includes("quantum_computing") && p.researchedTechs.includes("fusion_power")) {
      g.victoryStatus = { winner: p.id, type: "Science" };
      return;
    }
  }

  // Territorial: control 60% of land
  const land = g.hexes.filter(h => h.terrainType !== "water");
  for (const p of g.players) {
    const own = land.filter(h => h.ownerPlayerId === p.id).length;
    if (own >= Math.ceil(land.length * TERRITORIAL_WIN)) {
      g.victoryStatus = { winner: p.id, type: "Territorial" };
      return;
    }
  }
};

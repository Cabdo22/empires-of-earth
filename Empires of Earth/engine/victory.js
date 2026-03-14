// ============================================================
// VICTORY CONDITIONS
// ============================================================

export const checkVictoryState = (g) => {
  const p1 = g.players[0], p2 = g.players[1];

  // Domination: enemy has no cities
  if (p1.cities.length === 0) { g.victoryStatus = { winner: "p2", type: "Domination" }; return; }
  if (p2.cities.length === 0) { g.victoryStatus = { winner: "p1", type: "Domination" }; return; }

  // Science: research all three endgame techs
  for (const p of g.players) {
    if (p.researchedTechs.includes("quantum_computing") && p.researchedTechs.includes("fusion_power") && p.researchedTechs.includes("space_program")) {
      g.victoryStatus = { winner: p.id, type: "Science" };
      return;
    }
  }
};

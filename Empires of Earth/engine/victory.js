// ============================================================
// VICTORY CONDITIONS
// ============================================================

export const checkVictoryState = (g) => {
  // Domination: last player standing with cities wins
  const playersWithCities = g.players.filter(p => p.cities.length > 0);
  if (playersWithCities.length === 1) {
    g.victoryStatus = { winner: playersWithCities[0].id, type: "Domination" };
    return;
  }

  // Science: research all three endgame techs
  for (const p of g.players) {
    if (p.researchedTechs.includes("quantum_computing") && p.researchedTechs.includes("fusion_power") && p.researchedTechs.includes("space_program")) {
      g.victoryStatus = { winner: p.id, type: "Science" };
      return;
    }
  }
};

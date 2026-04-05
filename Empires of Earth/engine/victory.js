// ============================================================
// VICTORY CONDITIONS
// ============================================================

import { SCIENCE_VICTORY_PROJECTS } from '../data/projects.js';

export const checkVictoryState = (g) => {
  // Domination: last player standing with cities wins
  const playersWithCities = g.players.filter(p => p.cities.length > 0);
  if (playersWithCities.length === 1) {
    g.victoryStatus = { winner: playersWithCities[0].id, type: "Domination" };
    return;
  }

  // Science: complete the full late-game project chain
  for (const p of g.players) {
    const completed = new Set(p.scienceProjectsCompleted || []);
    if (SCIENCE_VICTORY_PROJECTS.every((projectId) => completed.has(projectId))) {
      g.victoryStatus = { winner: p.id, type: "Science" };
      return;
    }
  }
};

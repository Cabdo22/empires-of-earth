// ============================================================
// FOG OF WAR — server-side state filtering for online multiplayer
// Adapted for N players (filters ALL opponents, not just one)
// ============================================================

import { getVisibleHexes } from './movement.js';

/**
 * Filter the full game state so that a specific player can only see:
 * - Their own full state
 * - Opponent units/barbarians on visible hexes only
 * - Opponent cities with hidden production info
 * - Opponent research hidden
 */
export const filterStateForPlayer = (fullState, playerId) => {
  const player = fullState.players.find(p => p.id === playerId);
  if (!player) return fullState;

  const visible = getVisibleHexes(player, fullState.hexes);
  const explored = new Set(fullState.explored?.[playerId] || []);

  // Merge current visibility into explored
  for (const k of visible) explored.add(k);

  // Filter ALL opponent players
  const filteredPlayers = fullState.players.map(p => {
    if (p.id === playerId) return p; // own state is fully visible

    // Filter opponent's units to only those on visible hexes
    return {
      ...p,
      units: p.units.filter(u => visible.has(`${u.hexCol},${u.hexRow}`)),
      currentResearch: null, // hide enemy research
      cities: p.cities.map(c => ({
        ...c,
        currentProduction: null, // hide enemy production
        productionProgress: 0,
      })),
    };
  });

  // Filter barbarians to visible only
  const filteredBarbarians = (fullState.barbarians || []).filter(
    b => visible.has(`${b.hexCol},${b.hexRow}`)
  );

  return {
    ...fullState,
    players: filteredPlayers,
    barbarians: filteredBarbarians,
    explored: { ...fullState.explored, [playerId]: [...explored] },
    _visibleHexes: [...visible],
    _playerId: playerId,
  };
};

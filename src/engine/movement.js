// ============================================================
// MOVEMENT — move cost, reachable hexes, range targets
// ============================================================
import { TERRAIN_INFO, UNIT_DEFS } from './constants.js';
import { getNeighbors, hexAt, hexDist } from './hex-math.js';

// Calculate movement cost for a hex based on unit domain
export const getMoveCost = (terrain, domain, ability) => {
  if (domain === "air") return 1;
  if (domain === "sea") return terrain === "water" ? 1 : null;
  if (domain === "amphibious") {
    if (terrain === "water") return ability === "water_speed" ? 1 : 2;
    const cost = TERRAIN_INFO[terrain].moveCost;
    return cost === null ? null : cost;
  }
  // Land unit
  const info = TERRAIN_INFO[terrain];
  if (ability === "forest_move" && terrain === "forest") return 1;
  return info.moveCost;
};

// Returns null if hex is actionable, or a short reason string
export const getMoveBlockReason = (hex, unit, unitDef, reachSet, atkRangeSet, phaseStr, currentPlayerId, allPlayers) => {
  if (phaseStr !== "MOVEMENT" || !unit || !unitDef) return null;
  const uk = `${hex.col},${hex.row}`;
  if (reachSet.has(uk) || atkRangeSet.has(uk)) return null;
  const domain = unitDef.domain || "land";
  const t = hex.terrainType;
  if (unit.movementCurrent <= 0 && unit.hasAttacked) return "No actions remaining";
  if (unit.movementCurrent <= 0) return "No movement points";
  if (t === "mountain" && domain !== "air") return "Mountains — impassable";
  if (t === "water" && domain === "land") return "Water — need naval unit";
  if (t === "water" && domain !== "sea" && domain !== "amphibious" && domain !== "air") return "Can't cross water";
  const friendlyUnits = allPlayers?.find(p => p.id === currentPlayerId)?.units.filter(u => u.hexCol === hex.col && u.hexRow === hex.row) || [];
  if (friendlyUnits.length > 0 && !(friendlyUnits.length === 1 && friendlyUnits[0].id === unit.id)) return "Hex occupied by friendly unit";
  return "Out of movement range";
};

// Dijkstra-based pathfinding: returns set of hex keys reachable within movePoints
export const getReachableHexes = (startCol, startRow, movePoints, hexes, domain = "land", playerId = null, allPlayers = null, ability = null, mapConfig = null) => {
  const startKey = `${startCol},${startRow}`;
  const reachable = new Set();
  const costTo = { [startKey]: 0 };
  const queue = [{ col: startCol, row: startRow, cost: 0 }];
  // mapConfig is required for getNeighbors/hexAt
  const mc = mapConfig || hexes._mapConfig;

  while (queue.length > 0) {
    queue.sort((a, b) => a.cost - b.cost);
    const current = queue.shift();
    const currentKey = `${current.col},${current.row}`;

    if (current.cost > movePoints) continue;
    if (currentKey !== startKey) reachable.add(currentKey);

    for (const [nc, nr] of getNeighbors(current.col, current.row, mc)) {
      const neighborKey = `${nc},${nr}`;
      const nh = hexAt(hexes, nc, nr, mc);
      if (!nh) continue;
      const terrain = nh.terrainType;

      const moveCost = getMoveCost(terrain, domain, ability);
      if (moveCost === null) continue;

      const totalCost = current.cost + moveCost;
      if (totalCost > movePoints) continue;
      if (costTo[neighborKey] !== undefined && costTo[neighborKey] <= totalCost) continue;

      costTo[neighborKey] = totalCost;
      queue.push({ col: nc, row: nr, cost: totalCost });
    }
  }

  // Air units can only land on friendly cities
  if (domain === "air" && playerId && allPlayers) {
    const myPlayer = allPlayers.find(p => p.id === playerId);
    const myCityHexes = new Set();
    if (myPlayer) myPlayer.cities.forEach(c => {
      const h = hexes[c.hexId];
      myCityHexes.add(`${h.col},${h.row}`);
    });
    return new Set([...reachable].filter(k => myCityHexes.has(k)));
  }

  return reachable;
};

// All hex keys within ranged-attack distance
export const getRangedTargets = (col, row, range, mapConfig) => {
  const targets = new Set();
  const cols = mapConfig.cols, rows = mapConfig.rows;
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      if (c === col && r === row) continue;
      if (hexDist(col, row, c, r) <= range) targets.add(`${c},${r}`);
    }
  }
  return targets;
};

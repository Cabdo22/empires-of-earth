// ============================================================
// MOVEMENT & REACHABILITY ENGINE
// ============================================================

import { TERRAIN_INFO } from '../data/terrain.js';
import { UNIT_DEFS } from '../data/units.js';
import { COLS, ROWS, hexAt, getNeighbors, hexDist, FOG_SIGHT } from '../data/constants.js';

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

// Returns null if hex is actionable, or a reason string for why a unit can't act here
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

// Min-heap for Dijkstra priority queue
const heapPush = (heap, node) => {
  heap.push(node);
  let i = heap.length - 1;
  while (i > 0) {
    const parent = (i - 1) >> 1;
    if (heap[parent].cost <= heap[i].cost) break;
    [heap[parent], heap[i]] = [heap[i], heap[parent]];
    i = parent;
  }
};
const heapPop = (heap) => {
  const top = heap[0];
  const last = heap.pop();
  if (heap.length > 0) {
    heap[0] = last;
    let i = 0;
    while (true) {
      let smallest = i;
      const l = 2 * i + 1, r = 2 * i + 2;
      if (l < heap.length && heap[l].cost < heap[smallest].cost) smallest = l;
      if (r < heap.length && heap[r].cost < heap[smallest].cost) smallest = r;
      if (smallest === i) break;
      [heap[smallest], heap[i]] = [heap[i], heap[smallest]];
      i = smallest;
    }
  }
  return top;
};

// Dijkstra-based pathfinding: returns set of hex keys reachable within movePoints
export const getReachableHexes = (startCol, startRow, movePoints, hexes, domain = "land", playerId = null, allPlayers = null, ability = null, barbarians = null) => {
  const startKey = `${startCol},${startRow}`;
  const reachable = new Set();
  const costTo = { [startKey]: 0 };
  const heap = [];
  heapPush(heap, { col: startCol, row: startRow, cost: 0 });

  // Build sets of enemy-occupied and friendly-occupied hex keys for blocking
  const enemyOccupied = new Set();
  const friendlyOccupied = new Set();
  if (playerId && allPlayers) {
    for (const p of allPlayers) {
      for (const u of p.units) {
        const uk = `${u.hexCol},${u.hexRow}`;
        if (uk === startKey) continue;
        if (p.id === playerId) friendlyOccupied.add(uk);
        else enemyOccupied.add(uk);
      }
    }
  }
  if (barbarians) {
    for (const b of barbarians) {
      const bk = `${b.hexCol},${b.hexRow}`;
      if (bk !== startKey) enemyOccupied.add(bk);
    }
  }

  while (heap.length > 0) {
    const current = heapPop(heap);
    const currentKey = `${current.col},${current.row}`;

    if (current.cost > movePoints) continue;
    if (costTo[currentKey] < current.cost) continue;
    if (currentKey !== startKey) reachable.add(currentKey);

    // Don't expand from enemy-occupied hexes (can't path through enemies)
    if (enemyOccupied.has(currentKey)) continue;

    for (const [nc, nr] of getNeighbors(current.col, current.row)) {
      const neighborKey = `${nc},${nr}`;
      const nh = hexAt(hexes, nc, nr);
      if (!nh) continue;
      const terrain = nh.terrainType;

      const moveCost = getMoveCost(terrain, domain, ability);
      if (moveCost === null) continue;

      const totalCost = current.cost + moveCost;
      if (totalCost > movePoints) continue;
      if (costTo[neighborKey] !== undefined && costTo[neighborKey] <= totalCost) continue;

      costTo[neighborKey] = totalCost;
      heapPush(heap, { col: nc, row: nr, cost: totalCost });
    }
  }

  // Remove friendly-occupied hexes from destinations (no stacking)
  for (const fk of friendlyOccupied) reachable.delete(fk);

  // Build costMap for reachable hexes
  const costMap = {};
  for (const k of reachable) costMap[k] = costTo[k];

  // Air units can only land on friendly cities
  if (domain === "air" && playerId && allPlayers) {
    const myPlayer = allPlayers.find(p => p.id === playerId);
    const myCityHexes = new Set();
    if (myPlayer) myPlayer.cities.forEach(c => {
      const h = hexes[c.hexId];
      myCityHexes.add(`${h.col},${h.row}`);
    });
    const filtered = new Set([...reachable].filter(k => myCityHexes.has(k)));
    const filteredCostMap = {};
    for (const k of filtered) filteredCostMap[k] = costTo[k];
    return { reachable: filtered, costMap: filteredCostMap };
  }

  return { reachable, costMap };
};

// Check if a hex is occupied by any unit (player or barbarian)
export const isHexOccupied = (col, row, allPlayers, barbarians, excludeUnitId = null) => {
  for (const p of allPlayers) {
    for (const u of p.units) {
      if (u.id === excludeUnitId) continue;
      if (u.hexCol === col && u.hexRow === row) return true;
    }
  }
  if (barbarians) {
    for (const b of barbarians) {
      if (b.id === excludeUnitId) continue;
      if (b.hexCol === col && b.hexRow === row) return true;
    }
  }
  return false;
};

// Find nearest unoccupied passable neighbor hex
export const findOpenNeighbor = (col, row, hexes, allPlayers, barbarians) => {
  for (const [nc, nr] of getNeighbors(col, row)) {
    const nh = hexAt(hexes, nc, nr);
    if (!nh || nh.terrainType === "water" || nh.terrainType === "mountain") continue;
    if (!isHexOccupied(nc, nr, allPlayers, barbarians)) return { col: nc, row: nr };
  }
  return null;
};

// All hex keys within ranged-attack distance
export const getRangedTargets = (col, row, range) => {
  const targets = new Set();
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < ROWS; r++) {
      if (c === col && r === row) continue;
      if (hexDist(col, row, c, r) <= range) targets.add(`${c},${r}`);
    }
  }
  return targets;
};

// Fog of war: compute currently visible hex keys for a player
export const getVisibleHexes = (player, hexes) => {
  const visible = new Set();

  for (const unit of player.units) {
    const sight = FOG_SIGHT[unit.unitType] || FOG_SIGHT.default;
    for (const h of hexes) {
      if (hexDist(unit.hexCol, unit.hexRow, h.col, h.row) <= sight) {
        visible.add(`${h.col},${h.row}`);
      }
    }
  }

  for (const city of player.cities) {
    const cityHex = hexes[city.hexId];
    for (const h of hexes) {
      if (hexDist(cityHex.col, cityHex.row, h.col, h.row) <= 1) {
        visible.add(`${h.col},${h.row}`);
      }
    }
  }

  return visible;
};

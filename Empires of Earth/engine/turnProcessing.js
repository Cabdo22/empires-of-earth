// ============================================================
// TURN PROCESSING — shared helpers for player and AI turns
// ============================================================

import { UNIT_DEFS, BARB_UNITS } from '../data/units.js';
import { DISTRICT_DEFS } from '../data/districts.js';
import { TECH_TREE } from '../data/techs.js';
import { RANDOM_EVENTS } from '../data/events.js';
import { COLS, ROWS, hexAt, getNeighbors, hexDist, gameRng, FOG_SIGHT } from '../data/constants.js';
import { calcCityYields, calcPlayerIncome, autoAssignTiles, isWorkableHex, getHexYields } from './economy.js';
import { isHexOccupied, findOpenNeighbor } from './movement.js';

// Append a log message (keeps last 30)
export const addLogMsg = (msg, g) => {
  g.log = [...(g.log || []).slice(-30), msg];
};

// Process research progress and gold income for a player
export const processResearchAndIncome = (player, g, sfxQ) => {
  const income = calcPlayerIncome(player, g.hexes);
  if (player.currentResearch) {
    player.currentResearch.progress += income.science;
    const tech = TECH_TREE[player.currentResearch.techId];
    if (tech && player.currentResearch.progress >= tech.cost) {
      player.researchedTechs.push(player.currentResearch.techId);
      addLogMsg(`${player.name} researched ${tech.name}!`, g);
      player.currentResearch = null;
      if (sfxQ) sfxQ.push("research");
    }
  }
  player.gold += income.gold;
};

// Process a single city's production and growth
export const processCityTurn = (city, player, g, sfxQ) => {
  const yields = calcCityYields(city, player, g.hexes);
  if (city.currentProduction) {
    city.productionProgress += yields.production;
    const isUnit = city.currentProduction.type === "unit";
    const def = isUnit ? UNIT_DEFS[city.currentProduction.itemId] : DISTRICT_DEFS[city.currentProduction.itemId];
    let effCost = def ? def.cost : 0;
    if (def && isUnit) {
      if (player.civilization === "Germany") effCost -= 3;
      if (player.researchedTechs.includes("conscription")) effCost -= 2;
      effCost = Math.max(1, effCost);
    }
    if (def && city.productionProgress >= effCost) {
      if (isUnit) {
        const cityHex = g.hexes[city.hexId];
        let spawnCol = cityHex.col, spawnRow = cityHex.row;
        if (isHexOccupied(spawnCol, spawnRow, g.players, g.barbarians)) {
          const open = findOpenNeighbor(spawnCol, spawnRow, g.hexes, g.players, g.barbarians);
          if (!open) return; // delay production — city is surrounded
          spawnCol = open.col;
          spawnRow = open.row;
        }
        g.nextUnitId = (g.nextUnitId || 0) + 1;
        player.units.push({
          id: `${player.id}-u${g.nextUnitId}`, unitType: city.currentProduction.itemId,
          hexCol: spawnCol, hexRow: spawnRow,
          movementCurrent: def.move, hpCurrent: def.hp, hasAttacked: false,
        });
        if (city.currentProduction.itemId === "nuke" || city.currentProduction.itemId === "icbm") player.gold -= 50;
      } else {
        city.districts.push(city.currentProduction.itemId);
      }
      addLogMsg(`${city.name} built ${def.name}!`, g);
      if (sfxQ) sfxQ.push("build");
      city.currentProduction = null;
      city.productionProgress = 0;
    }
  }
  // Food consumption: each citizen eats 2 food
  const foodConsumed = city.population * 2;
  const surplus = yields.food - foodConsumed;
  if (surplus > 0) city.foodAccumulated += surplus;

  const growthThreshold = 5 + city.population * city.population * 2;
  if (city.foodAccumulated >= growthThreshold) {
    city.population++;
    city.foodAccumulated -= growthThreshold;
    addLogMsg(`${city.name} grew to pop ${city.population}!`, g);
    // Auto-assign new citizen and check border growth
    autoAssignTiles(city, g.hexes);
    const workableInBorder = (city.borderHexIds || []).filter(
      hid => hid !== city.hexId && isWorkableHex(g.hexes[hid])
    ).length;
    if (city.population > workableInBorder) {
      growCityBorder(city, player, g.hexes);
    }
  }
  const baseHpMax = city.hpMax || 20;
  const hpMax = player.researchedTechs.includes("stone_working") ? Math.max(baseHpMax, 25) : baseHpMax;
  if (city.hp < hpMax) city.hp = Math.min(hpMax, city.hp + 2);
};

// Legacy — territory now managed via city borders
export const expandTerritory = () => {};

// Initialize city borders (1-hex radius) and auto-assign tiles
export const initCityBorders = (city, player, hexes) => {
  const cityHex = hexes[city.hexId];
  city.borderHexIds = [city.hexId];
  cityHex.cityBorderId = city.id;
  cityHex.ownerPlayerId = player.id;

  for (const [nc, nr] of getNeighbors(cityHex.col, cityHex.row)) {
    const nh = hexAt(hexes, nc, nr);
    if (!nh) continue;
    if (nh.terrainType === "water" && !nh.isCoastal) continue; // skip deep water
    if (nh.cityBorderId) continue; // already claimed by another city
    nh.cityBorderId = city.id;
    nh.ownerPlayerId = player.id;
    city.borderHexIds.push(nh.id);
  }

  autoAssignTiles(city, hexes);
};

// Grow city border by 1 hex (highest yield adjacent unowned hex)
export const growCityBorder = (city, player, hexes) => {
  let bestHex = null, bestTotal = -1;

  for (const borderHexId of city.borderHexIds) {
    const bh = hexes[borderHexId];
    for (const [nc, nr] of getNeighbors(bh.col, bh.row)) {
      const nh = hexAt(hexes, nc, nr);
      if (!nh || nh.cityBorderId) continue;
      if (nh.terrainType === "mountain") continue;
      if (nh.terrainType === "water" && !nh.isCoastal) continue;

      const y = getHexYields(nh);
      const total = y.food + y.production + y.gold;
      if (total > bestTotal) { bestTotal = total; bestHex = nh; }
    }
  }

  if (bestHex) {
    bestHex.cityBorderId = city.id;
    bestHex.ownerPlayerId = player.id;
    city.borderHexIds.push(bestHex.id);
    autoAssignTiles(city, hexes);
    // Log message handled by caller (processCityTurn has access to g)
  }
};

// Heal units garrisoned in cities
export const healGarrison = (player, hexes) => {
  for (const unit of player.units) {
    const inCity = player.cities.some(c => {
      const h = hexes[c.hexId];
      return h.col === unit.hexCol && h.row === unit.hexRow;
    });
    if (inCity) {
      const maxHp = UNIT_DEFS[unit.unitType]?.hp || 10;
      unit.hpCurrent = Math.min(maxHp, unit.hpCurrent + 3);
    }
  }
};

// Refresh all units for the start of a player's turn
export const refreshUnits = (player, g) => {
  for (const unit of player.units) {
    const def = UNIT_DEFS[unit.unitType];
    // Field healing: units that didn't move or attack heal +2 HP
    if (!unit.hasMoved && !unit.hasAttacked && !unit.healed) {
      const maxHp = def?.hp || 10;
      if (unit.hpCurrent < maxHp) {
        unit.hpCurrent = Math.min(maxHp, unit.hpCurrent + 2);
        unit.healed = true;
      }
    }
    let mv = def?.move || 2;
    if (player.civilization === "England" && def?.domain === "sea") mv += 1;
    if (player.researchedTechs.includes("logistics") && (def?.domain === "land" || def?.domain === "amphibious")) mv += 1;
    unit.movementCurrent = mv;
    unit.hasAttacked = false;
    unit.hasMoved = false;
    unit.healed = false;
  }
  healGarrison(player, g.hexes);
};

// Spawn barbarians periodically
export const spawnBarbarians = (g) => {
  if (!g.barbarians) g.barbarians = [];
  const maxBarbs = Math.max(6, Math.floor(COLS * ROWS / 40));
  if (g.turnNumber % 3 !== 0 || g.barbarians.length >= maxBarbs) return;
  const emptyHexes = g.hexes.filter(h =>
    h.terrainType !== "water" && h.terrainType !== "mountain" && !h.cityId && !h.ownerPlayerId
      && !isHexOccupied(h.col, h.row, g.players, g.barbarians)
  );
  if (emptyHexes.length === 0) return;
  const spawnHex = emptyHexes[Math.floor(gameRng(g) * emptyHexes.length)];
  const barbType = BARB_UNITS[Math.min(Math.floor(g.turnNumber / 6), BARB_UNITS.length - 1)];
  const barbDef = UNIT_DEFS[barbType];
  g.nextUnitId = (g.nextUnitId || 0) + 1;
  g.barbarians.push({
    id: `barb-${g.nextUnitId}`, unitType: barbType,
    hexCol: spawnHex.col, hexRow: spawnHex.row,
    hpCurrent: barbDef.hp, movementCurrent: barbDef.move, hasAttacked: false,
  });
  addLogMsg(`⚠ Barbarian ${barbDef.name} spotted at (${spawnHex.col},${spawnHex.row})!`, g);
};

// Find nearest player unit or city for barbarian targeting
const findNearestTarget = (barb, players, hexes) => {
  let bestHex = null, bestDist = Infinity;
  for (const player of players) {
    for (const unit of player.units) {
      const dist = hexDist(barb.hexCol, barb.hexRow, unit.hexCol, unit.hexRow);
      if (dist < bestDist) { bestDist = dist; bestHex = { col: unit.hexCol, row: unit.hexRow }; }
    }
    for (const city of player.cities) {
      const cityH = hexes[city.hexId];
      const dist = hexDist(barb.hexCol, barb.hexRow, cityH.col, cityH.row);
      if (dist < bestDist) { bestDist = dist; bestHex = { col: cityH.col, row: cityH.row }; }
    }
  }
  return { bestHex, bestDist };
};

// Process barbarian movement and combat
export const processBarbarians = (g) => {
  for (const barb of g.barbarians) {
    barb.movementCurrent = UNIT_DEFS[barb.unitType]?.move || 2;
    barb.hasAttacked = false;
    const { bestHex, bestDist } = findNearestTarget(barb, g.players, g.hexes);

    if (bestHex && bestDist > 1) {
      const neighbors = getNeighbors(barb.hexCol, barb.hexRow);
      let moveTarget = null, moveTargetDist = Infinity;
      for (const [nc, nr] of neighbors) {
        const hex = hexAt(g.hexes, nc, nr);
        if (!hex || hex.terrainType === "water" || hex.terrainType === "mountain") continue;
        const dist = hexDist(nc, nr, bestHex.col, bestHex.row);
        if (dist < moveTargetDist) { moveTargetDist = dist; moveTarget = { col: nc, row: nr }; }
      }
      if (moveTarget && !isHexOccupied(moveTarget.col, moveTarget.row, g.players, g.barbarians, barb.id)) { barb.hexCol = moveTarget.col; barb.hexRow = moveTarget.row; }
    }

    if (bestDist <= 1 && !barb.hasAttacked) {
      for (const player of g.players) {
        const target = player.units.find(u => u.hexCol === bestHex.col && u.hexRow === bestHex.row);
        if (!target) continue;
        const barbDef = UNIT_DEFS[barb.unitType], targetDef = UNIT_DEFS[target.unitType];
        const dmg = Math.max(1, Math.round(barbDef.strength * 3 - targetDef.strength));
        const counterDmg = Math.max(1, Math.round(targetDef.strength * 2 - barbDef.strength));
        target.hpCurrent -= dmg;
        barb.hpCurrent -= counterDmg;
        barb.hasAttacked = true;
        addLogMsg(`⚠ Barbarian ${barbDef.name}→${targetDef.name}: ${dmg}dmg`, g);
        if (target.hpCurrent <= 0) {
          player.units = player.units.filter(u => u.id !== target.id);
          addLogMsg(`☠ ${targetDef.name} killed by barbarians!`, g);
        }
        if (barb.hpCurrent <= 0) {
          g.barbarians = g.barbarians.filter(b => b.id !== barb.id);
          addLogMsg(`☠ Barbarian ${barbDef.name} destroyed!`, g);
        }
        break;
      }
    }
  }
};

// Roll for a random event
export const rollRandomEvent = (g) => {
  if (gameRng(g) < 0.20) {
    const available = RANDOM_EVENTS.filter(e => !e.condition || e.condition(g));
    if (available.length === 0) { g.eventMsg = null; return; }
    const evt = available[Math.floor(gameRng(g) * available.length)];
    evt.effect(g, addLogMsg);
    g.eventMsg = { id: evt.id, name: evt.name, desc: evt.desc };
    addLogMsg(`🎲 Event: ${evt.name} — ${evt.desc}`, g);
  } else {
    g.eventMsg = null;
  }
};

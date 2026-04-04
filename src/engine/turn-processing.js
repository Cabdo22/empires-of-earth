// ============================================================
// TURN PROCESSING — end-of-turn: research, cities, territory, barbarians, events
// ============================================================
import { TECH_TREE, UNIT_DEFS, DISTRICT_DEFS, BARB_UNITS, RANDOM_EVENTS } from './constants.js';
import { getNeighbors, hexAt, hexDist, gameRng } from './hex-math.js';
import { calcCityYields, calcPlayerIncome } from './economy.js';

export const addLogMsg = (msg, g) => {
  g.log = [...(g.log || []).slice(-30), msg];
};

const resolveResearchProgress = (player, g, sfxQ) => {
  if (!player.currentResearch) return;
  const tech = TECH_TREE[player.currentResearch.techId];
  if (!tech || player.currentResearch.progress < tech.cost) return;
  player.researchedTechs.push(player.currentResearch.techId);
  addLogMsg(`${player.name} researched ${tech.name}!`, g);
  player.currentResearch = null;
  if (sfxQ) sfxQ.push("research");
};

const resolveCityGrowth = (city, g) => {
  let growthThreshold = city.population * 10;
  while (city.foodAccumulated >= growthThreshold) {
    city.population++;
    city.foodAccumulated -= growthThreshold;
    addLogMsg(`${city.name} grew to pop ${city.population}!`, g);
    growthThreshold = city.population * 10;
  }
};

export const processResearchAndIncome = (player, g, sfxQ) => {
  const income = calcPlayerIncome(player, g.hexes, g.mapConfig);
  if (player.currentResearch) {
    player.currentResearch.progress += income.science;
    resolveResearchProgress(player, g, sfxQ);
  }
  player.gold += income.gold;
};

export const processCityTurn = (city, player, g, sfxQ) => {
  const yields = calcCityYields(city, player, g.hexes, g.mapConfig);
  if (city.currentProduction) {
    city.productionProgress += yields.production;
    const isUnit = city.currentProduction.type === "unit";
    const prodDef = isUnit ? UNIT_DEFS[city.currentProduction.itemId] : DISTRICT_DEFS[city.currentProduction.itemId];
    if (!prodDef) return;

    const effCost = isUnit && player.civilization === "Germany" ? Math.max(1, prodDef.cost - 1) : prodDef.cost;
    if (city.productionProgress >= effCost) {
      if (isUnit) {
        const cityHex = g.hexes[city.hexId];
        g.nextUnitId = (g.nextUnitId || 0) + 1;
        player.units.push({
          id: `${player.id}-u${g.nextUnitId}`, unitType: city.currentProduction.itemId,
          hexCol: cityHex.col, hexRow: cityHex.row, movementCurrent: prodDef.move, hpCurrent: prodDef.hp, hasAttacked: false,
        });
        if (city.currentProduction.itemId === "nuke") player.gold -= 15;
      } else {
        city.districts.push(city.currentProduction.itemId);
      }
      addLogMsg(`${city.name} built ${prodDef.name}!`, g);
      if (sfxQ) sfxQ.push("build");
      city.currentProduction = null;
      city.productionProgress = 0;
    }
  }
  city.foodAccumulated += yields.food;
  resolveCityGrowth(city, g);
  if (city.hp < (city.hpMax || 20)) city.hp = Math.min(city.hpMax || 20, city.hp + 2);
};

export const expandTerritory = (player, g) => {
  for (const city of player.cities) {
    const cityHex = g.hexes[city.hexId];
    for (const [nc, nr] of getNeighbors(cityHex.col, cityHex.row, g.mapConfig)) {
      const neighbor = hexAt(g.hexes, nc, nr, g.mapConfig);
      if (neighbor && !neighbor.ownerPlayerId && neighbor.terrainType !== "water") {
        neighbor.ownerPlayerId = player.id;
      }
    }
  }
};

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

export const refreshUnits = (player, g) => {
  for (const unit of player.units) {
    const def = UNIT_DEFS[unit.unitType];
    // Field healing: units that didn't move or attack heal +2 HP
    if (unit.movementCurrent > 0 && !unit.hasAttacked && !unit.healed) {
      const maxHp = def?.hp || 10;
      if (unit.hpCurrent < maxHp) { unit.hpCurrent = Math.min(maxHp, unit.hpCurrent + 2); unit.healed = true; }
    }
    let mv = def?.move || 2;
    if (player.civilization === "England" && def?.domain === "sea") mv += 1;
    unit.movementCurrent = mv;
    unit.hasAttacked = false;
    unit.healed = false;
  }
  healGarrison(player, g.hexes);
};

export const spawnBarbarians = (g) => {
  if (!g.barbarians) g.barbarians = [];
  const maxBarbs = Math.max(6, Math.floor(g.mapConfig.cols * g.mapConfig.rows / 40));
  if (g.turnNumber % 3 !== 0 || g.barbarians.length >= maxBarbs) return;
  const emptyHexes = g.hexes.filter(h => h.terrainType !== "water" && h.terrainType !== "mountain" && !h.cityId && !h.ownerPlayerId);
  if (emptyHexes.length === 0) return;
  const spawnHex = emptyHexes[Math.floor(gameRng(g) * emptyHexes.length)];
  const barbType = BARB_UNITS[Math.min(Math.floor(g.turnNumber / 6), BARB_UNITS.length - 1)];
  const barbDef = UNIT_DEFS[barbType];
  g.nextUnitId = (g.nextUnitId || 0) + 1;
  g.barbarians.push({
    id: `barb-${g.nextUnitId}`, unitType: barbType, hexCol: spawnHex.col, hexRow: spawnHex.row,
    hpCurrent: barbDef.hp, movementCurrent: barbDef.move, hasAttacked: false,
  });
  addLogMsg(`⚠ Barbarian ${barbDef.name} spotted at (${spawnHex.col},${spawnHex.row})!`, g);
};

export const findNearestTarget = (barb, players, hexes) => {
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

export const processBarbarians = (g) => {
  for (const barb of g.barbarians) {
    barb.movementCurrent = UNIT_DEFS[barb.unitType]?.move || 2;
    barb.hasAttacked = false;
    const { bestHex, bestDist } = findNearestTarget(barb, g.players, g.hexes);
    if (bestHex && bestDist > 1) {
      const neighbors = getNeighbors(barb.hexCol, barb.hexRow, g.mapConfig);
      let moveTarget = null, moveTargetDist = Infinity;
      for (const [nc, nr] of neighbors) {
        const hex = hexAt(g.hexes, nc, nr, g.mapConfig);
        if (!hex || hex.terrainType === "water" || hex.terrainType === "mountain") continue;
        const dist = hexDist(nc, nr, bestHex.col, bestHex.row);
        if (dist < moveTargetDist) { moveTargetDist = dist; moveTarget = { col: nc, row: nr }; }
      }
      if (moveTarget) { barb.hexCol = moveTarget.col; barb.hexRow = moveTarget.row; }
    }
    if (bestDist <= 1 && !barb.hasAttacked) {
      for (const player of g.players) {
        const target = player.units.find(u => u.hexCol === bestHex.col && u.hexRow === bestHex.row);
        if (!target) continue;
        const barbDef = UNIT_DEFS[barb.unitType], targetDef = UNIT_DEFS[target.unitType];
        const dmg = Math.max(1, Math.round(barbDef.strength * 3 - targetDef.strength));
        const counterDmg = Math.max(1, Math.round(targetDef.strength * 2 - barbDef.strength));
        target.hpCurrent -= dmg; barb.hpCurrent -= counterDmg; barb.hasAttacked = true;
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

// Apply random event effects (previously used inline effect functions)
const applyEventEffect = (eventId, g) => {
  const cp = g.players.find(p => p.id === g.currentPlayerId);
  switch (eventId) {
    case "gold_rush": cp.gold += 8; break;
    case "plague": {
      const c = cp.cities[Math.floor(gameRng(g) * cp.cities.length)];
      if (c && c.population > 1) { c.population--; c.foodAccumulated = 0; }
      break;
    }
    case "eureka":
      if (cp.currentResearch) cp.currentResearch.progress += 3;
      resolveResearchProgress(cp, g);
      break;
    case "harvest":
      cp.cities.forEach(c => {
        c.foodAccumulated += 5;
        resolveCityGrowth(c, g);
      });
      break;
    case "raid": {
      const empties = g.hexes.filter(h => h.terrainType !== "water" && h.terrainType !== "mountain" && !h.cityId);
      const border = empties.filter(h => !h.ownerPlayerId);
      if (border.length > 0) {
        const bh = border[Math.floor(gameRng(g) * border.length)];
        g.nextUnitId = (g.nextUnitId || 0) + 1;
        g.barbarians.push({
          id: `barb-${g.nextUnitId}`, unitType: "warrior", hexCol: bh.col, hexRow: bh.row,
          hpCurrent: 15, movementCurrent: 0, hasAttacked: false,
        });
        addLogMsg("⚠ Barbarians spotted near your borders!", g);
      }
      break;
    }
  }
};

export const rollRandomEvent = (g) => {
  if (gameRng(g) < 0.20) {
    const evt = RANDOM_EVENTS[Math.floor(gameRng(g) * RANDOM_EVENTS.length)];
    applyEventEffect(evt.id, g);
    g.eventMsg = { name: evt.name, desc: evt.desc };
    addLogMsg(`🎲 Event: ${evt.name} — ${evt.desc}`, g);
  } else {
    g.eventMsg = null;
  }
};

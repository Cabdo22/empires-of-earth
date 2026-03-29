// ============================================================
// AI DECISION ENGINE — supports multiple opponents
// ============================================================

import { UNIT_DEFS, SIEGE_UNITS } from '../data/units.js';
import { TECH_TREE } from '../data/techs.js';
import { CIV_DEFS } from '../data/civs.js';
import { hexAt, getNeighbors, hexDist, gameRng, COLS, ROWS } from '../data/constants.js';
import { getPlayerMaxEra, calcCombatPreview } from '../engine/combat.js';
import { getAvailableTechs, getAvailableUnits, getAvailableDistricts, canUpgradeUnit } from '../engine/economy.js';
import { getReachableHexes, getVisibleHexes, isHexOccupied } from '../engine/movement.js';
import { addLogMsg, processResearchAndIncome, processCityTurn, expandTerritory, healGarrison, initCityBorders, recalcAllTradeRoutes } from '../engine/turnProcessing.js';
import { ROAD_COST } from '../data/constants.js';
import { autoAssignTiles, cityHasResource, getHexYields } from '../engine/economy.js';
import { getHexesInRadius, FOG_SIGHT } from '../data/constants.js';
import { AI_DIFFICULTY } from '../engine/gameInit.js';

// Aggregate all enemy units and cities across all opponents
const getAllEnemyUnits = (enemies) => enemies.flatMap(e => e.units);
const getAllEnemyCities = (enemies) => enemies.flatMap(e => e.cities);
const getEnemyOwner = (unitOrCity, enemies) => enemies.find(e =>
  e.units.some(u => u.id === unitOrCity.id) || e.cities.some(c => c.id === unitOrCity.id)
);

// ============================================================
// STEP 1: Strategy Layer
// ============================================================

const CIV_AFFINITY = {
  Rome: "military", Germany: "military", Aztec: "military", Ottoman: "military",
  China: "science", France: "science",
  Egypt: "economic", America: "economic", England: "economic",
};

const calcMilitaryStrength = (player) =>
  player.units.reduce((sum, u) => {
    const def = UNIT_DEFS[u.unitType];
    if (!def || def.strength === 0) return sum;
    return sum + def.strength * (u.hpCurrent / (def.hp || 10));
  }, 0);

const aiAssessStrategy = (player, enemies, hexes) => {
  const myStrength = calcMilitaryStrength(player);
  const maxEra = getPlayerMaxEra(player);

  let strongestStr = 0, weakestEnemy = null, weakestScore = Infinity;
  for (const e of enemies) {
    const eStr = calcMilitaryStrength(e);
    if (eStr > strongestStr) strongestStr = eStr;
    const eScore = eStr + e.cities.length * 5;
    if (eScore < weakestScore) { weakestScore = eScore; weakestEnemy = e; }
  }

  const threatLevel = myStrength > 0 ? Math.min(1, strongestStr / myStrength) : 1;

  let focus;
  if (threatLevel > 0.7) {
    focus = "military";
  } else {
    focus = CIV_AFFINITY[player.civilization] || "military";
    // Late-game: non-military civs shift toward science victory
    if (maxEra >= 4 && focus !== "military") focus = "science";
  }

  return { focus, threatLevel, weakestEnemy };
};

// ============================================================
// STEP 2: Civ-Aware Production Biases
// ============================================================

const CIV_PROD_BIAS = {
  Rome:    { districtPriority: ["workshop", "military", "library", "farm", "market", "bank"], unitPref: null, milThreshMod: 0, settlerPopReq: 2 },
  China:   { districtPriority: ["library", "farm", "workshop", "market", "bank", "military"], unitPref: null, milThreshMod: 0, settlerPopReq: 2 },
  Egypt:   { districtPriority: ["farm", "library", "workshop", "market", "bank", "military"], unitPref: null, milThreshMod: 0, settlerPopReq: 1 },
  Aztec:   { districtPriority: ["military", "farm", "workshop", "library", "market", "bank"], unitPref: "melee", milThreshMod: 1, settlerPopReq: 2 },
  America: { districtPriority: ["market", "library", "farm", "bank", "workshop", "military"], unitPref: null, milThreshMod: 0, settlerPopReq: 2 },
  England: { districtPriority: ["market", "library", "farm", "workshop", "bank", "military"], unitPref: null, milThreshMod: 0, settlerPopReq: 2 },
  France:  { districtPriority: ["library", "market", "farm", "workshop", "bank", "military"], unitPref: null, milThreshMod: 0, settlerPopReq: 2 },
  Germany: { districtPriority: ["workshop", "military", "farm", "library", "market", "bank"], unitPref: null, milThreshMod: -2, settlerPopReq: 2 },
  Ottoman: { districtPriority: ["military", "workshop", "farm", "library", "market", "bank"], unitPref: "siege", milThreshMod: 1, settlerPopReq: 2 },
};

// ============================================================
// STEP 3: Unit Composition
// ============================================================

const CAVALRY_IDS = new Set(["horseman", "knight", "cavalier", "tank", "war_chariot", "panzer"]);

const getUnitCategory = (unitId) => {
  const def = UNIT_DEFS[unitId];
  if (!def || def.domain === "sea" || def.domain === "air" || def.domain === "special") return "other";
  if (SIEGE_UNITS.has(unitId)) return "siege";
  if (def.range > 0) return "ranged";
  if (CAVALRY_IDS.has(unitId)) return "cavalry";
  if (def.strength > 0) return "melee";
  return "other";
};

const aiPickMilitaryUnit = (availUnits, player, strategy) => {
  const military = availUnits.filter(u =>
    u.id !== "settler" && u.id !== "scout" && u.id !== "nuke" && u.id !== "icbm"
  );
  if (military.length === 0) return null;

  // Count existing units by category
  const counts = { melee: 0, ranged: 0, siege: 0, cavalry: 0 };
  for (const u of player.units) {
    const cat = getUnitCategory(u.unitType);
    if (counts[cat] !== undefined) counts[cat]++;
  }
  const total = counts.melee + counts.ranged + counts.siege + counts.cavalry || 1;

  // Target ratios — military focus shifts toward more siege/cavalry
  const targets = strategy?.focus === "military"
    ? { melee: 0.30, ranged: 0.20, siege: 0.25, cavalry: 0.25 }
    : { melee: 0.35, ranged: 0.30, siege: 0.20, cavalry: 0.15 };

  // Apply civ preference override
  const civBias = CIV_PROD_BIAS[player.civilization];
  const prefCat = civBias?.unitPref;

  // Find category most below target ratio
  let bestCat = null, biggestDeficit = -Infinity;
  for (const cat of ["melee", "ranged", "siege", "cavalry"]) {
    const deficit = targets[cat] - (counts[cat] / total);
    // Boost preferred category
    const adjusted = cat === prefCat ? deficit + 0.15 : deficit;
    if (adjusted > biggestDeficit) { biggestDeficit = adjusted; bestCat = cat; }
  }

  // Pick strongest available unit in the deficit category
  const inCategory = military.filter(u => getUnitCategory(u.id) === bestCat)
    .sort((a, b) => b.strength - a.strength);
  if (inCategory.length > 0) return inCategory[0].id;

  // Fallback: strongest overall
  military.sort((a, b) => b.strength - a.strength);
  return military[0].id;
};

// ============================================================
// STEP 5: Defensive Positioning
// ============================================================

const aiAssignRoles = (units, cities, allEnemyUnits, hexes) => {
  const roles = new Map(); // unitId → { role, targetCol, targetRow }
  const assigned = new Set();

  // Calculate threat per city
  const cityThreats = cities.map(city => {
    const ch = hexes[city.hexId];
    if (!ch) return { city, threat: 0, col: 0, row: 0 };
    const threat = allEnemyUnits.filter(eu =>
      hexDist(eu.hexCol, eu.hexRow, ch.col, ch.row) <= 6
    ).length;
    return { city, threat, col: ch.col, row: ch.row };
  });

  // Sort cities by threat (highest first)
  cityThreats.sort((a, b) => b.threat - a.threat);

  // Combat units sorted by distance to each city
  const combatUnits = units.filter(u => {
    const def = UNIT_DEFS[u.unitType];
    return def && def.strength > 0 && u.unitType !== "settler" && u.unitType !== "nuke" && u.unitType !== "icbm";
  });

  for (const ct of cityThreats) {
    if (ct.threat === 0 && ct.city !== cities[0]) continue; // Only defend capital if no threat
    const needed = ct.threat > 0 ? Math.ceil(ct.threat / 2) : (ct.city === cities[0] ? 1 : 0);
    if (needed === 0) continue;

    // Find closest unassigned combat units
    const nearby = combatUnits
      .filter(u => !assigned.has(u.id) && u.unitType !== "scout")
      .map(u => ({ unit: u, dist: hexDist(u.hexCol, u.hexRow, ct.col, ct.row) }))
      .sort((a, b) => a.dist - b.dist);

    for (let i = 0; i < Math.min(needed, nearby.length); i++) {
      const u = nearby[i].unit;
      roles.set(u.id, { role: "defend", targetCol: ct.col, targetRow: ct.row });
      assigned.add(u.id);
    }
  }

  // Remaining combat units: attack
  for (const u of combatUnits) {
    if (!assigned.has(u.id)) {
      roles.set(u.id, { role: "attack" });
    }
  }

  return roles;
};

// ============================================================
// Research selection (modified with strategy layer)
// ============================================================

const aiPickResearch = (player, hexes, enemies, smarter, strategy) => {
  if (player.currentResearch) return null;
  const available = getAvailableTechs(player);
  if (available.length === 0) return null;

  const maxEra = getPlayerMaxEra(player);
  const allEnemyUnits = getAllEnemyUnits(enemies);
  const enemyNearby = allEnemyUnits.some(eu =>
    player.cities.some(c => {
      const ch = hexes[c.hexId];
      return hexDist(eu.hexCol, eu.hexRow, ch.col, ch.row) <= 4;
    })
  );

  const focus = strategy?.focus || "military";

  const scored = available.map(tech => {
    let score = Math.round(100 / tech.cost * 10);
    const isMilitary = tech.effects.some(e =>
      /unlock.*warrior|unlock.*sword|unlock.*knight|unlock.*horseman|unlock.*archer|unlock.*crossbow|unlock.*tank|unlock.*musket|unlock.*artillery|unlock.*catapult|unlock.*cannon|unlock.*trebuchet|unlock.*cavalier|unlock.*frigate|unlock.*machine|unlock.*infantry|unlock.*mech|unlock.*fighter|unlock.*bomber|unlock.*missile|strength|movement|unit cost/i.test(e)
    );
    const isEcon = tech.effects.some(e => /food|gold|prod|science/i.test(e));
    const isSciVictory = tech.id === "quantum_computing" || tech.id === "fusion_power" || tech.id === "space_program";

    // Strategy-weighted scoring
    if (focus === "military") {
      if (isMilitary && enemyNearby) score += smarter ? 15 : 10;
      if (isMilitary && !enemyNearby) score += 5;
      if (isEcon) score += 3;
      if (isSciVictory && maxEra >= 4) score += 5;
    } else if (focus === "science") {
      if (isMilitary && enemyNearby) score += 8;
      if (isMilitary && !enemyNearby) score += 2;
      if (isEcon && maxEra <= 2) score += smarter ? 7 : 5;
      if (isSciVictory && maxEra >= 4) score += smarter ? 18 : 12;
    } else { // economic
      if (isMilitary && enemyNearby) score += 8;
      if (isMilitary && !enemyNearby) score += 2;
      if (isEcon) score += smarter ? 10 : 8;
      if (isSciVictory && maxEra >= 4) score += 8;
    }

    if (tech.effects.some(e => /settler|library|market|bank/i.test(e))) score += 4;
    if (tech.effects.some(e => /city defense|city.*HP/i.test(e))) score += 2;

    return { tech, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0].tech.id;
};

// ============================================================
// Production selection (modified with strategy + civ awareness + composition)
// ============================================================

const aiPickProduction = (city, player, hexes, enemies, smarter, strategy) => {
  if (city.currentProduction) return null;

  const availUnits = getAvailableUnits(player, city, hexes);
  const availDistricts = getAvailableDistricts(player, city, hexes);
  const militaryCount = player.units.filter(u =>
    u.unitType !== "scout" && u.unitType !== "settler" && u.unitType !== "nuke" && u.unitType !== "icbm"
  ).length;
  const totalEnemyMilitary = getAllEnemyUnits(enemies).length;
  const settlerCount = player.units.filter(u => u.unitType === "settler").length;

  // Civ-aware settler population requirement
  const civBias = CIV_PROD_BIAS[player.civilization];
  const settlerPopReq = civBias?.settlerPopReq ?? 2;

  const maxCities = Math.max(3, Math.floor(COLS * ROWS / 80));
  if (player.cities.length < maxCities && settlerCount === 0 && (city.population || 1) >= settlerPopReq && availUnits.some(u => u.id === "settler")) {
    return { type: "unit", itemId: "settler" };
  }

  const allEnemyUnits = getAllEnemyUnits(enemies);
  const enemyNearby = allEnemyUnits.some(eu => {
    const ch = hexes[city.hexId];
    return hexDist(eu.hexCol, eu.hexRow, ch.col, ch.row) <= 5;
  });

  // Strategy-adjusted military threshold
  const focusMod = strategy?.focus === "military" ? 3 : strategy?.focus === "economic" ? -1 : 0;
  const civMod = civBias?.milThreshMod ?? 0;
  const militaryThreshold = totalEnemyMilitary + (smarter ? 2 : 1) + focusMod + civMod;
  if ((militaryCount < militaryThreshold) || enemyNearby) {
    // Use unit composition logic instead of just picking strongest
    const unitPick = strategy
      ? aiPickMilitaryUnit(availUnits, player, strategy)
      : (() => {
          const mil = availUnits.filter(u => u.id !== "settler" && u.id !== "scout" && u.id !== "nuke" && u.id !== "icbm")
            .sort((a, b) => b.strength - a.strength);
          return mil.length > 0 ? mil[0].id : null;
        })();
    if (unitPick) return { type: "unit", itemId: unitPick };
  }

  // Civ-aware district priority
  const maxDistricts = strategy?.focus === "economic" ? 3 : 2;
  const distPriority = civBias?.districtPriority || ["library", "farm", "workshop", "market", "bank", "military"];
  if (city.districts.length < maxDistricts && availDistricts.length > 0) {
    for (const dId of distPriority) {
      if (availDistricts.some(d => d.id === dId) && !city.districts.includes(dId)) {
        return { type: "district", itemId: dId };
      }
    }
  }

  if (availDistricts.some(d => d.id === "nuclear") && !city.districts.includes("nuclear")) {
    return { type: "district", itemId: "nuclear" };
  }

  const fallback = availUnits
    .filter(u => u.id !== "settler" && u.id !== "nuke" && u.id !== "icbm")
    .sort((a, b) => b.strength - a.strength);
  if (fallback.length > 0) return { type: "unit", itemId: fallback[0].id };

  return null;
};

// ============================================================
// City founding location (modified with resource awareness)
// ============================================================

const aiFindCityLocation = (settler, player, hexes, allPlayers, strategy) => {
  const existingCityHexes = new Set(
    player.cities.map(c => `${hexes[c.hexId].col},${hexes[c.hexId].row}`)
  );
  const allCityCoords = (allPlayers || [player]).flatMap(p =>
    p.cities.map(c => { const h = hexes[c.hexId]; return h ? [h.col, h.row] : null; }).filter(Boolean)
  );

  // Check which strategic resources the player already has access to
  const hasIron = player.cities.some(c => cityHasResource(c, hexes, "iron"));
  const hasOil = player.cities.some(c => cityHasResource(c, hexes, "oil"));
  const hasUranium = player.cities.some(c => cityHasResource(c, hexes, "uranium"));
  const resourceBonusMult = strategy?.focus === "military" ? 12 : 8;

  const { reachable, costMap } = getReachableHexes(settler.hexCol, settler.hexRow, settler.movementCurrent, hexes, "land");
  let bestHex = null, bestScore = -Infinity, bestCost = 0;

  for (const key of reachable) {
    const [col, row] = key.split(",").map(Number);
    const hex = hexAt(hexes, col, row);
    if (!hex || hex.terrainType === "water" || hex.terrainType === "mountain" || hex.cityId) continue;
    if (allCityCoords.some(([cc, cr]) => hexDist(col, row, cc, cr) < 3)) continue;

    // Score based on actual hex yields instead of just terrain type
    const yields = getHexYields(hex, player);
    let score = yields.food + yields.production + yields.gold + yields.science;

    for (const [nc, nr] of getNeighbors(col, row)) {
      const nh = hexAt(hexes, nc, nr);
      if (!nh) continue;
      const ny = getHexYields(nh, player);
      score += (ny.food + ny.production + ny.gold) * 0.5;

      // Strategic resource bonuses
      if (nh.resource === "iron" && !hasIron) score += resourceBonusMult;
      if (nh.resource === "oil" && !hasOil) score += resourceBonusMult;
      if (nh.resource === "uranium" && !hasUranium) score += resourceBonusMult * 0.75;
    }

    // City spacing
    for (const cityKey of existingCityHexes) {
      const [cc, cr] = cityKey.split(",").map(Number);
      const dist = hexDist(col, row, cc, cr);
      if (dist < 3) score -= 5;
      if (dist >= 3 && dist <= 5) score += 2;
    }

    if (score > bestScore) { bestScore = score; bestHex = hex; bestCost = costMap[key] || 0; }
  }

  return bestHex ? { hex: bestHex, cost: bestCost } : null;
};

// ============================================================
// Unit movement and combat (modified with defense, scouting, retreat)
// ============================================================

const aiPlanAndExecuteMoves = (g, aiPlayer, enemies, addLogFn, smarter, strategy) => {
  const allEnemyUnits = getAllEnemyUnits(enemies);
  const allEnemyCities = getAllEnemyCities(enemies);

  for (const unit of aiPlayer.units) {
    const def = UNIT_DEFS[unit.unitType];
    if (!unit.hasMoved && !unit.hasAttacked) {
      const maxHp = def?.hp || 10;
      if (unit.hpCurrent < maxHp) {
        unit.hpCurrent = Math.min(maxHp, unit.hpCurrent + 2);
      }
    }
    let mv = def?.move || 2;
    if (aiPlayer.civilization === "England" && def?.domain === "sea") mv += 1;
    unit.movementCurrent = mv;
    unit.hasAttacked = false;
    unit.hasMoved = false;
  }

  const processedUnits = new Set();
  const occupiedHexes = new Set(aiPlayer.units.map(u => `${u.hexCol},${u.hexRow}`));

  // Assign roles (defend/attack) for combat units
  const unitRoles = strategy
    ? aiAssignRoles(aiPlayer.units, aiPlayer.cities, allEnemyUnits, g.hexes)
    : new Map();

  // Settlers first
  for (const unit of [...aiPlayer.units]) {
    if (unit.unitType !== "settler" || processedUnits.has(unit.id)) continue;
    processedUnits.add(unit.id);

    const bestLocResult = aiFindCityLocation(unit, aiPlayer, g.hexes, g.players, strategy);
    if (bestLocResult) {
      const bestLoc = bestLocResult.hex;
      const bestLocCost = bestLocResult.cost;
      const hex = hexAt(g.hexes, unit.hexCol, unit.hexRow);
      const standingGood = hex && hex.terrainType === "grassland" && !hex.cityId;
      const tooClose = g.players.some(p => p.cities.some(c => {
        const ch = g.hexes[c.hexId];
        return ch && hexDist(unit.hexCol, unit.hexRow, ch.col, ch.row) < 2;
      }));

      const maxFoundCities = Math.max(3, Math.floor(COLS * ROWS / 80));
      if (standingGood && !tooClose && aiPlayer.cities.length < maxFoundCities) {
        g.nextCityId = (g.nextCityId || 0) + 1;
        const civNames = CIV_DEFS[aiPlayer.civilization]?.cityNames || ["Colony"];
        const cityName = civNames[aiPlayer.cities.length] || `City ${g.nextCityId}`;
        const cityId = `${aiPlayer.id}-c${g.nextCityId}`;

        aiPlayer.units = aiPlayer.units.filter(u => u.id !== unit.id);
        const newCity = {
          id: cityId, name: cityName, hexId: hex.id, population: 1,
          districts: [], currentProduction: null, productionProgress: 0,
          foodAccumulated: 0, hp: 20, hpMax: 20,
          workedTileIds: [], borderHexIds: [],
        };
        aiPlayer.cities.push(newCity);
        hex.cityId = cityId;
        initCityBorders(newCity, aiPlayer, g.hexes);
        addLogFn(`${aiPlayer.name} founded ${cityName}!`, g);
        continue;
      }

      if (bestLoc && !occupiedHexes.has(`${bestLoc.col},${bestLoc.row}`)) {
        occupiedHexes.delete(`${unit.hexCol},${unit.hexRow}`);
        unit.hexCol = bestLoc.col;
        unit.hexRow = bestLoc.row;
        unit.movementCurrent = Math.max(0, unit.movementCurrent - (bestLocCost || unit.movementCurrent));
        unit.hasMoved = true;
        occupiedHexes.add(`${bestLoc.col},${bestLoc.row}`);
      }
    }
  }

  // Nukes & ICBMs
  for (const unit of [...aiPlayer.units]) {
    if ((unit.unitType !== "nuke" && unit.unitType !== "icbm") || processedUnits.has(unit.id)) continue;
    processedUnits.add(unit.id);
    const nukeDef = UNIT_DEFS[unit.unitType];
    const nukeRange = nukeDef?.range || 12;

    for (const eCity of allEnemyCities) {
      const enemyOwner = enemies.find(e => e.cities.some(c => c.id === eCity.id));
      if (!enemyOwner) continue;
      const eCityHex = g.hexes[eCity.hexId];
      const dist = hexDist(unit.hexCol, unit.hexRow, eCityHex.col, eCityHex.row);
      if (dist <= nukeRange) {
        const interceptor = allEnemyUnits.find(u =>
          (u.unitType === "fighter" || u.unitType === "jet_fighter") && !u.hasAttacked &&
          hexDist(u.hexCol, u.hexRow, eCityHex.col, eCityHex.row) <= 2
        );
        if (interceptor) {
          aiPlayer.units = aiPlayer.units.filter(u => u.id !== unit.id);
          interceptor.hasAttacked = true;
          addLogFn(`\u2708 ${UNIT_DEFS[interceptor.unitType]?.name || "Fighter"} intercepts AI nuke!`, g);
          break;
        }
        const blast = getHexesInRadius(eCityHex.col, eCityHex.row, 1, g.hexes);
        for (const bh of blast) {
          for (const enemy of enemies) {
            enemy.units = enemy.units.filter(u => !(u.hexCol === bh.col && u.hexRow === bh.row));
          }
          aiPlayer.units = aiPlayer.units.filter(u => !(u.hexCol === bh.col && u.hexRow === bh.row && u.id !== unit.id));
          g.barbarians = (g.barbarians || []).filter(b => !(b.hexCol === bh.col && b.hexRow === bh.row));
          for (const enemy of enemies) {
            const dc = enemy.cities.find(c => { const h = g.hexes[c.hexId]; return h.col === bh.col && h.row === bh.row; });
            if (dc) {
              dc.hp = 1;
              addLogFn(`\u2622 ${dc.name} hit! (${dc.hp}HP)`, g);
            }
          }
        }
        aiPlayer.units = aiPlayer.units.filter(u => u.id !== unit.id);
        addLogFn(`\u2622 AI NUCLEAR STRIKE!`, g);
        break;
      }
    }
  }

  // Combat units
  for (const unit of [...aiPlayer.units]) {
    if (processedUnits.has(unit.id)) continue;
    if (unit.unitType === "settler") continue;
    processedUnits.add(unit.id);

    const unitDef = UNIT_DEFS[unit.unitType];
    if (!unitDef) continue;

    const role = unitRoles.get(unit.id);

    // STEP 7: Retreat check (Hard AI only)
    if (smarter && unitDef.strength > 0) {
      const hpRatio = unit.hpCurrent / (unitDef.hp || 10);
      const nearbyEnemies = allEnemyUnits.filter(eu =>
        hexDist(unit.hexCol, unit.hexRow, eu.hexCol, eu.hexRow) <= 3
      ).length;
      if (hpRatio < 0.3 && nearbyEnemies >= 2) {
        // Flee toward nearest friendly city instead of attacking
        if (unit.movementCurrent > 0) {
          const domain = unitDef.domain || "land";
          const { reachable, costMap } = getReachableHexes(unit.hexCol, unit.hexRow, unit.movementCurrent, g.hexes, domain, aiPlayer.id, g.players, unitDef.ability, g.barbarians);
          let fleeCol = null, fleeRow = null, fleeDist = Infinity;
          for (const city of aiPlayer.cities) {
            const ch = g.hexes[city.hexId];
            if (ch) {
              const d = hexDist(unit.hexCol, unit.hexRow, ch.col, ch.row);
              if (d < fleeDist) { fleeDist = d; fleeCol = ch.col; fleeRow = ch.row; }
            }
          }
          if (fleeCol !== null) {
            let bestMove = null, bestMoveDist = fleeDist;
            for (const key of reachable) {
              if (occupiedHexes.has(key)) continue;
              const [mc, mr] = key.split(",").map(Number);
              const dist = hexDist(mc, mr, fleeCol, fleeRow);
              if (dist < bestMoveDist) { bestMoveDist = dist; bestMove = { col: mc, row: mr }; }
            }
            if (bestMove) {
              const moveKey = `${bestMove.col},${bestMove.row}`;
              occupiedHexes.delete(`${unit.hexCol},${unit.hexRow}`);
              unit.hexCol = bestMove.col;
              unit.hexRow = bestMove.row;
              unit.movementCurrent = Math.max(0, unit.movementCurrent - (costMap[moveKey] || unit.movementCurrent));
              unit.hasMoved = true;
              occupiedHexes.add(moveKey);
            }
          }
        }
        continue; // Skip attack and normal movement
      }
    }

    // Attack phase
    if (!unit.hasAttacked) {
      const range = unitDef.range || 1;
      let bestTarget = null, bestTargetScore = -Infinity;

      // Check all enemy units across all opponents
      for (const eu of allEnemyUnits) {
        const dist = hexDist(unit.hexCol, unit.hexRow, eu.hexCol, eu.hexRow);
        if (dist > range) continue;
        const euDef = UNIT_DEFS[eu.unitType];
        const euOwner = getEnemyOwner(eu, enemies) || { researchedTechs: [], civilization: "Unknown" };
        const preview = calcCombatPreview(unit, unitDef, eu, euDef,
          hexAt(g.hexes, eu.hexCol, eu.hexRow)?.terrainType, aiPlayer, euOwner, false);
        let score = preview.aDmg;
        if (preview.defDies) score += 20;
        if (preview.atkDies) score -= 30;
        if (smarter && eu.hpCurrent <= preview.aDmg) score += 10;
        // STEP 7: Focus-fire wounded units (Hard AI)
        if (smarter && euDef) score += Math.round((1 - eu.hpCurrent / (euDef.hp || 10)) * 10);
        // Bonus for targeting weakest enemy's units
        if (smarter && strategy?.weakestEnemy) {
          const owner = getEnemyOwner(eu, enemies);
          if (owner && owner.id === strategy.weakestEnemy.id) score += 5;
        }
        if (score > bestTargetScore) {
          bestTargetScore = score;
          bestTarget = { col: eu.hexCol, row: eu.hexRow, isUnit: true, unit: eu };
        }
      }

      for (const barb of (g.barbarians || [])) {
        const dist = hexDist(unit.hexCol, unit.hexRow, barb.hexCol, barb.hexRow);
        if (dist > range) continue;
        const barbDef = UNIT_DEFS[barb.unitType];
        const fakePlayer = { researchedTechs: [], civilization: "Barbarian" };
        const preview = calcCombatPreview(unit, unitDef, barb, barbDef, null, aiPlayer, fakePlayer, false);
        let score = preview.aDmg + 5;
        if (preview.defDies) score += 20;
        if (preview.atkDies) score -= 30;
        if (score > bestTargetScore) {
          bestTargetScore = score;
          bestTarget = { col: barb.hexCol, row: barb.hexRow, isBarb: true, unit: barb };
        }
      }

      // Check all enemy cities
      for (const eCity of allEnemyCities) {
        const eCH = g.hexes[eCity.hexId];
        const dist = hexDist(unit.hexCol, unit.hexRow, eCH.col, eCH.row);
        if (dist > range) continue;
        const garrison = allEnemyUnits.find(u => u.hexCol === eCH.col && u.hexRow === eCH.row);
        if (!garrison) {
          const isSiege = SIEGE_UNITS.has(unit.unitType);
          const cityDmg = isSiege ? unitDef.strength * 3 : Math.max(1, Math.floor(unitDef.strength * 0.5));
          let score = cityDmg;
          if (eCity.hp - cityDmg <= 0) score += 30;
          if (!isSiege && unitDef.range === 0) score -= 10;
          if (score > bestTargetScore) {
            bestTargetScore = score;
            bestTarget = { col: eCH.col, row: eCH.row, isCity: true, city: eCity };
          }
        }
      }

      if (bestTarget && bestTargetScore > 0) {
        const tc = bestTarget.col, tr = bestTarget.row;
        const defender = bestTarget.isUnit ? bestTarget.unit : bestTarget.isBarb ? bestTarget.unit : null;

        if (defender) {
          const defDef = UNIT_DEFS[defender.unitType];
          const defOwner = bestTarget.isBarb ? { researchedTechs: [], civilization: "Barbarian" } : (getEnemyOwner(defender, enemies) || enemies[0]);
          const defHex = hexAt(g.hexes, tc, tr);
          const defCity = allEnemyCities.find(c => { const h = g.hexes[c.hexId]; return h.col === tc && h.row === tr; });
          const pv = calcCombatPreview(unit, unitDef, defender, defDef, defHex?.terrainType, aiPlayer, defOwner, !!defCity);

          unit.hpCurrent = Math.max(0, unit.hpCurrent - pv.dDmg);
          defender.hpCurrent = Math.max(0, defender.hpCurrent - pv.aDmg);
          unit.hasAttacked = true;

          let msg = `AI ${unitDef.name}\u2192${bestTarget.isBarb ? "Barb " : ""}${defDef.name}: ${pv.aDmg}dmg`;
          if (pv.dDmg > 0) msg += ` took ${pv.dDmg}`;

          if (pv.defDies) {
            if (bestTarget.isUnit) {
              const owner = getEnemyOwner(defender, enemies);
              if (owner) owner.units = owner.units.filter(u => u.id !== defender.id);
            }
            if (bestTarget.isBarb) { g.barbarians = g.barbarians.filter(b => b.id !== defender.id); aiPlayer.gold += 15; }
            msg += ` \u2620${defDef.name}`;

            if (unitDef.range === 0 && !pv.atkDies && !isHexOccupied(tc, tr, g.players, g.barbarians, unit.id)) {
              unit.hexCol = tc; unit.hexRow = tr; unit.movementCurrent = 0;
              if (defCity && bestTarget.isUnit) {
                const cityOwner = enemies.find(e => e.cities.some(c => c.id === defCity.id));
                defCity.hp = (defCity.hp || 20) - 3;
                if (defCity.hp <= 0 && cityOwner) {
                  cityOwner.cities = cityOwner.cities.filter(c => c.id !== defCity.id);
                  defCity.hp = 10; defCity.hpMax = 20; defCity.captured = true; aiPlayer.cities.push(defCity);
                  if (defHex) defHex.ownerPlayerId = aiPlayer.id;
                  for (const hid of (defCity.borderHexIds || [])) {
                    const bh = g.hexes[hid];
                    if (bh) { bh.ownerPlayerId = aiPlayer.id; bh.cityBorderId = defCity.id; }
                  }
                  autoAssignTiles(defCity, g.hexes, null, aiPlayer);
                  msg += ` \uD83C\uDFDB${defCity.name} captured!`;
                }
              }
              if (bestTarget.isBarb && defHex && !defHex.ownerPlayerId) defHex.ownerPlayerId = aiPlayer.id;
            }
          }
          if (pv.atkDies) { aiPlayer.units = aiPlayer.units.filter(u => u.id !== unit.id); msg += ` \u2620${unitDef.name}`; }
          addLogFn(msg, g);
        } else if (bestTarget.isCity) {
          const defCity = bestTarget.city;
          const cityOwner = enemies.find(e => e.cities.some(c => c.id === defCity.id));
          const isSiege = SIEGE_UNITS.has(unit.unitType);
          let cityDmg = isSiege ? unitDef.strength * 3 : Math.max(1, Math.floor(unitDef.strength * 0.5));
          if (unitDef.ability === "city_siege") cityDmg += 3;
          defCity.hp = (defCity.hp || 20) - cityDmg;
          unit.hasAttacked = true;
          if (unitDef.range === 0) unit.movementCurrent = 0;
          if (unitDef.range === 0 && !isSiege) {
            unit.hpCurrent -= 5;
          }

          let msg = `AI ${unitDef.name}\u2192${defCity.name}: ${cityDmg}dmg (${Math.max(0, defCity.hp)}HP)`;
          if (unit.hpCurrent <= 0) { aiPlayer.units = aiPlayer.units.filter(u => u.id !== unit.id); msg += ` \u2620${unitDef.name}`; }
          if (defCity.hp <= 0 && cityOwner) {
            const defHex = hexAt(g.hexes, tc, tr);
            cityOwner.cities = cityOwner.cities.filter(c => c.id !== defCity.id);
            defCity.hp = 10; defCity.hpMax = 20; defCity.captured = true; aiPlayer.cities.push(defCity);
            if (defHex) defHex.ownerPlayerId = aiPlayer.id;
            for (const hid of (defCity.borderHexIds || [])) {
              const bh = g.hexes[hid];
              if (bh) { bh.ownerPlayerId = aiPlayer.id; bh.cityBorderId = defCity.id; }
            }
            autoAssignTiles(defCity, g.hexes, null, aiPlayer);
            if (unitDef.range === 0 && !isHexOccupied(tc, tr, g.players, g.barbarians, unit.id)) { unit.hexCol = tc; unit.hexRow = tr; }
            msg = `AI ${unitDef.name} \uD83C\uDFDBcaptured ${defCity.name}!`;
          }
          addLogFn(msg, g);
        }
      }
    }

    // Movement phase
    if (unit.movementCurrent > 0 && aiPlayer.units.includes(unit)) {
      const domain = unitDef.domain || "land";
      const { reachable, costMap } = getReachableHexes(unit.hexCol, unit.hexRow, unit.movementCurrent, g.hexes, domain, aiPlayer.id, g.players, unitDef.ability, g.barbarians);
      if (reachable.size > 0) {

        // STEP 6: Smart scouting
        if (unit.unitType === "scout") {
          const keys = [...reachable].filter(k => !occupiedHexes.has(k));
          if (keys.length > 0) {
            if (strategy) {
              // Score each reachable hex by how many unexplored tiles it would reveal
              const explored = new Set(g.explored?.[aiPlayer.id] || []);
              const sightRange = FOG_SIGHT.scout || 2;
              let bestKey = null, bestReveal = -1;
              for (const k of keys) {
                const [c, r] = k.split(",").map(Number);
                let reveals = 0;
                const visible = getHexesInRadius(c, r, sightRange, g.hexes);
                for (const vh of visible) {
                  if (!explored.has(`${vh.col},${vh.row}`)) reveals++;
                }
                // Tie-break: prefer unowned hexes
                const h = hexAt(g.hexes, c, r);
                if (h && !h.ownerPlayerId) reveals += 0.5;
                if (reveals > bestReveal) { bestReveal = reveals; bestKey = k; }
              }
              if (bestKey) {
                const [mc, mr] = bestKey.split(",").map(Number);
                occupiedHexes.delete(`${unit.hexCol},${unit.hexRow}`);
                unit.hexCol = mc;
                unit.hexRow = mr;
                unit.movementCurrent = Math.max(0, unit.movementCurrent - (costMap[bestKey] || unit.movementCurrent));
                unit.hasMoved = true;
                occupiedHexes.add(`${mc},${mr}`);
              }
            } else {
              // Easy AI: random movement (original behavior)
              const unowned = keys.filter(k => {
                const [c, r] = k.split(",").map(Number);
                const h = hexAt(g.hexes, c, r);
                return h && !h.ownerPlayerId;
              });
              const pool = unowned.length > 0 ? unowned : keys;
              const rk = pool[Math.floor(gameRng(g) * pool.length)];
              const [mc, mr] = rk.split(",").map(Number);
              occupiedHexes.delete(`${unit.hexCol},${unit.hexRow}`);
              unit.hexCol = mc;
              unit.hexRow = mr;
              unit.movementCurrent = Math.max(0, unit.movementCurrent - (costMap[rk] || unit.movementCurrent));
              unit.hasMoved = true;
              occupiedHexes.add(`${mc},${mr}`);
            }
          }
        } else {
          // STEP 5: Role-based movement for combat units
          let goalCol = null, goalRow = null, goalDist = Infinity;

          if (role?.role === "defend") {
            // Defenders: move toward assigned city or intercept nearby enemies
            const cityDist = hexDist(unit.hexCol, unit.hexRow, role.targetCol, role.targetRow);
            if (cityDist > 2) {
              // Move toward city
              goalCol = role.targetCol;
              goalRow = role.targetRow;
              goalDist = cityDist;
            } else {
              // Already near city — intercept nearest enemy within 4 hexes of the city
              let closestEnemy = null, closestEnemyDist = Infinity;
              for (const eu of allEnemyUnits) {
                const distToCity = hexDist(eu.hexCol, eu.hexRow, role.targetCol, role.targetRow);
                if (distToCity <= 4) {
                  const distToUnit = hexDist(unit.hexCol, unit.hexRow, eu.hexCol, eu.hexRow);
                  if (distToUnit < closestEnemyDist) { closestEnemyDist = distToUnit; closestEnemy = eu; }
                }
              }
              if (closestEnemy) {
                goalCol = closestEnemy.hexCol;
                goalRow = closestEnemy.hexRow;
                goalDist = closestEnemyDist;
              }
              // Otherwise hold position (no movement goal)
            }
          } else {
            // Attackers: prefer weakest enemy's cities, fallback to nearest
            if (strategy?.weakestEnemy) {
              const weakCities = strategy.weakestEnemy.cities || [];
              for (const wc of weakCities) {
                const wch = g.hexes[wc.hexId];
                if (!wch) continue;
                const dist = hexDist(unit.hexCol, unit.hexRow, wch.col, wch.row);
                if (dist < goalDist) { goalDist = dist; goalCol = wch.col; goalRow = wch.row; }
              }
            }
            // Fallback: nearest enemy city overall
            if (goalCol === null) {
              for (const eCity of allEnemyCities) {
                const eCH = g.hexes[eCity.hexId];
                const dist = hexDist(unit.hexCol, unit.hexRow, eCH.col, eCH.row);
                if (dist < goalDist) { goalDist = dist; goalCol = eCH.col; goalRow = eCH.row; }
              }
            }
          }

          if (goalCol !== null) {
            let bestMove = null, bestMoveDist = goalDist;
            for (const key of reachable) {
              if (occupiedHexes.has(key)) continue;
              const [mc, mr] = key.split(",").map(Number);
              const dist = hexDist(mc, mr, goalCol, goalRow);
              if (dist < bestMoveDist) { bestMoveDist = dist; bestMove = { col: mc, row: mr }; }
            }
            if (bestMove) {
              const moveKey = `${bestMove.col},${bestMove.row}`;
              occupiedHexes.delete(`${unit.hexCol},${unit.hexRow}`);
              unit.hexCol = bestMove.col;
              unit.hexRow = bestMove.row;
              unit.movementCurrent = Math.max(0, unit.movementCurrent - (costMap[moveKey] || unit.movementCurrent));
              unit.hasMoved = true;
              occupiedHexes.add(moveKey);
            }
          }
        }
      }
    }
  }
};

// ============================================================
// AI Road Building — connect cities via roads when affordable
// ============================================================

const aiBuildRoads = (player, g) => {
  if (!player.researchedTechs.includes("trade")) return;
  const goldReserve = 10; // keep at least this much gold

  for (let i = 0; i < player.cities.length; i++) {
    for (let j = i + 1; j < player.cities.length; j++) {
      const cA = player.cities[i], cB = player.cities[j];
      // Skip if already connected by a domestic trade route
      const alreadyConnected = (cA.tradeRoutes || []).some(r => r.targetCityId === cB.id && !r.isInternational);
      if (alreadyConnected) continue;

      // Try to build roads on owned hexes between the two cities
      const hA = g.hexes[cA.hexId], hB = g.hexes[cB.hexId];
      // Find owned land hexes along the path (simple greedy approach toward target)
      let cur = { col: hA.col, row: hA.row };
      const target = { col: hB.col, row: hB.row };
      const visited = new Set([`${cur.col},${cur.row}`]);

      for (let step = 0; step < 30 && player.gold >= goldReserve + ROAD_COST; step++) {
        if (hexDist(cur.col, cur.row, target.col, target.row) <= 1) break;

        // Find best neighbor: owned, land, closest to target
        let bestN = null, bestDist = Infinity;
        for (const [nc, nr] of getNeighbors(cur.col, cur.row)) {
          const nh = hexAt(g.hexes, nc, nr);
          if (!nh || visited.has(`${nc},${nr}`)) continue;
          if (nh.ownerPlayerId !== player.id) continue;
          if (nh.terrainType === "water" || nh.terrainType === "mountain") continue;
          const d = hexDist(nc, nr, target.col, target.row);
          if (d < bestDist) { bestDist = d; bestN = nh; }
        }

        if (!bestN) break; // no owned path available
        visited.add(`${bestN.col},${bestN.row}`);

        if (!bestN.road) {
          bestN.road = true;
          bestN.roadOwner = player.id;
          player.gold -= ROAD_COST;
        }
        cur = { col: bestN.col, row: bestN.row };
      }
    }
  }
  recalcAllTradeRoutes(g);
};

// ============================================================
// Execute full AI turn
// ============================================================

export const aiExecuteTurn = (gameState) => {
  const g = JSON.parse(JSON.stringify(gameState));
  const aiPlayer = g.players.find(p => p.id === g.currentPlayerId);
  const enemies = g.players.filter(p => p.id !== g.currentPlayerId);
  const diff = AI_DIFFICULTY[aiPlayer.difficulty] || AI_DIFFICULTY.normal;
  const smarter = diff.smarter;

  // Strategy assessment (Normal & Hard only — Easy uses greedy behavior)
  const isEasy = aiPlayer.difficulty === "easy";
  const strategy = isEasy ? null : aiAssessStrategy(aiPlayer, enemies, g.hexes);

  // Research
  const techPick = aiPickResearch(aiPlayer, g.hexes, enemies, smarter, strategy);
  if (techPick) {
    aiPlayer.currentResearch = { techId: techPick, progress: 0 };
    addLogMsg(`${aiPlayer.name} researching ${TECH_TREE[techPick].name}`, g, aiPlayer.id);
  }

  // City production
  for (const city of aiPlayer.cities) {
    if (!city.currentProduction) {
      const prod = aiPickProduction(city, aiPlayer, g.hexes, enemies, smarter, strategy);
      if (prod) { city.currentProduction = prod; city.productionProgress = 0; }
    }
  }

  processResearchAndIncome(aiPlayer, g);

  // Apply difficulty bonuses to income
  if (diff.goldBonus !== 0) {
    const bonus = Math.round(aiPlayer.gold * Math.abs(diff.goldBonus));
    aiPlayer.gold += diff.goldBonus > 0 ? bonus : -bonus;
    aiPlayer.gold = Math.max(0, aiPlayer.gold);
  }

  for (const city of aiPlayer.cities) processCityTurn(city, aiPlayer, g);
  expandTerritory(aiPlayer, g);

  // Upgrade units
  for (const unit of aiPlayer.units) {
    const info = canUpgradeUnit(unit, aiPlayer);
    if (!info) continue;
    const oldDef = UNIT_DEFS[unit.unitType];
    aiPlayer.gold -= info.cost;
    unit.hpCurrent = Math.ceil((unit.hpCurrent / oldDef.hp) * info.toDef.hp);
    unit.unitType = info.toType;
    addLogMsg(`AI ${oldDef.name} upgraded to ${info.toDef.name}`, g, aiPlayer.id);
  }

  // Build roads between cities
  aiBuildRoads(aiPlayer, g);

  // Movement & combat
  aiPlanAndExecuteMoves(g, aiPlayer, enemies, addLogMsg, smarter, strategy);
  healGarrison(aiPlayer, g.hexes);

  return g;
};

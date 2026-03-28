// ============================================================
// AI — decision-making and execution
// ============================================================
import { TECH_TREE, UNIT_DEFS, CIV_DEFS } from './constants.js';
import { getNeighbors, hexAt, hexDist, getHexesInRadius, gameRng } from './hex-math.js';
import { getPlayerMaxEra, calcCombatPreview } from './combat.js';
import { getAvailableTechs, getAvailableUnits, getAvailableDistricts } from './economy.js';
import { getReachableHexes } from './movement.js';
import { addLogMsg, processResearchAndIncome, processCityTurn, expandTerritory, healGarrison } from './turn-processing.js';

// Pick a tech to research
export const aiPickResearch = (player, hexes, enemyPlayer) => {
  if (player.currentResearch) return null;
  const available = getAvailableTechs(player);
  if (available.length === 0) return null;

  const maxEra = getPlayerMaxEra(player);
  const enemyNearby = enemyPlayer.units.some(eu => {
    return player.cities.some(c => {
      const ch = hexes[c.hexId];
      return hexDist(eu.hexCol, eu.hexRow, ch.col, ch.row) <= 4;
    });
  });

  const scored = available.map(tech => {
    let score = 10 - tech.cost;
    const isMilitary = tech.effects.some(e =>
      /unlock.*warrior|unlock.*sword|unlock.*knight|unlock.*archer|unlock.*tank|unlock.*musket|unlock.*artillery|unlock.*catapult|strength/i.test(e)
    );
    if (isMilitary && enemyNearby) score += 8;
    if (isMilitary && !enemyNearby) score += 2;
    const isEcon = tech.effects.some(e => /food|gold|prod/i.test(e));
    if (isEcon && maxEra <= 2) score += 5;
    const isSciVictory = tech.id === "quantum_computing" || tech.id === "fusion_power";
    if (isSciVictory && maxEra >= 4) score += 10;
    if (tech.effects.some(e => /settler|library/i.test(e))) score += 4;
    return { tech, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0].tech.id;
};

// Pick what a city should produce
export const aiPickProduction = (city, player, hexes, enemyPlayer) => {
  if (city.currentProduction) return null;

  const availUnits = getAvailableUnits(player, city);
  const availDistricts = getAvailableDistricts(player, city);
  const militaryCount = player.units.filter(u =>
    u.unitType !== "scout" && u.unitType !== "settler" && u.unitType !== "nuke"
  ).length;
  const enemyMilitary = enemyPlayer.units.length;
  const settlerCount = player.units.filter(u => u.unitType === "settler").length;

  if (player.cities.length < 3 && settlerCount === 0 && availUnits.some(u => u.id === "settler")) {
    return { type: "unit", itemId: "settler" };
  }

  const enemyNearby = enemyPlayer.units.some(eu => {
    const ch = hexes[city.hexId];
    return hexDist(eu.hexCol, eu.hexRow, ch.col, ch.row) <= 5;
  });

  if ((militaryCount < enemyMilitary + 1) || enemyNearby) {
    const military = availUnits
      .filter(u => u.id !== "settler" && u.id !== "scout" && u.id !== "nuke" && u.domain === "land")
      .sort((a, b) => b.strength - a.strength);
    if (military.length > 0) return { type: "unit", itemId: military[0].id };
  }

  if (city.districts.length < 2 && availDistricts.length > 0) {
    const distPriority = ["library", "farm", "workshop", "market", "military"];
    for (const dId of distPriority) {
      if (availDistricts.some(d => d.id === dId)) return { type: "district", itemId: dId };
    }
  }

  if (availDistricts.some(d => d.id === "nuclear") && !city.districts.includes("nuclear")) {
    return { type: "district", itemId: "nuclear" };
  }

  const fallback = availUnits
    .filter(u => u.id !== "settler" && u.id !== "nuke" && u.domain === "land")
    .sort((a, b) => b.strength - a.strength);
  if (fallback.length > 0) return { type: "unit", itemId: fallback[0].id };

  return null;
};

// Find a good location for a settler to found a city
export const aiFindCityLocation = (settler, player, hexes, mapConfig) => {
  const existingCityHexes = new Set(
    player.cities.map(c => `${hexes[c.hexId].col},${hexes[c.hexId].row}`)
  );

  const reachable = getReachableHexes(settler.hexCol, settler.hexRow, settler.movementCurrent, hexes, "land", null, null, null, mapConfig);
  let bestHex = null, bestScore = -Infinity;

  for (const key of reachable) {
    const [col, row] = key.split(",").map(Number);
    const hex = hexAt(hexes, col, row, mapConfig);
    if (!hex || hex.terrainType === "water" || hex.terrainType === "mountain" || hex.cityId) continue;

    let score = 0;
    if (hex.terrainType === "grassland") score += 3;

    for (const [nc, nr] of getNeighbors(col, row, mapConfig)) {
      const nh = hexAt(hexes, nc, nr, mapConfig);
      if (nh?.resource) score += 2;
      if (nh?.terrainType === "grassland") score += 1;
    }

    for (const cityKey of existingCityHexes) {
      const [cc, cr] = cityKey.split(",").map(Number);
      const dist = hexDist(col, row, cc, cr);
      if (dist < 3) score -= 5;
      if (dist >= 3 && dist <= 5) score += 2;
    }

    if (score > bestScore) { bestScore = score; bestHex = hex; }
  }

  return bestHex;
};

// AI movement and combat for all units
export const aiPlanAndExecuteMoves = (g, aiPlayer, enemyPlayer) => {
  // Refresh unit movement
  for (const unit of aiPlayer.units) {
    const def = UNIT_DEFS[unit.unitType];
    let mv = def?.move || 2;
    if (aiPlayer.civilization === "England" && def?.domain === "sea") mv += 1;
    unit.movementCurrent = mv;
    unit.hasAttacked = false;
  }

  const processedUnits = new Set();

  // First pass: settlers
  for (const unit of [...aiPlayer.units]) {
    if (unit.unitType !== "settler" || processedUnits.has(unit.id)) continue;
    processedUnits.add(unit.id);

    const bestLoc = aiFindCityLocation(unit, aiPlayer, g.hexes, g.mapConfig);
    if (bestLoc) {
      const hex = hexAt(g.hexes, unit.hexCol, unit.hexRow, g.mapConfig);
      const standingGood = hex && hex.terrainType === "grassland" && !hex.cityId;
      const tooClose = aiPlayer.cities.some(c => {
        const ch = g.hexes[c.hexId];
        return hexDist(unit.hexCol, unit.hexRow, ch.col, ch.row) < 3;
      });

      if (standingGood && !tooClose && aiPlayer.cities.length < 5) {
        const cityNum = aiPlayer.cities.length + 1;
        const civNames = CIV_DEFS[aiPlayer.civilization]?.cityNames || ["Colony"];
        const cityName = civNames[cityNum - 1] || `City ${cityNum}`;
        const cityId = `${aiPlayer.id}-c${cityNum}`;

        aiPlayer.units = aiPlayer.units.filter(u => u.id !== unit.id);
        aiPlayer.cities.push({
          id: cityId, name: cityName, hexId: hex.id, population: 1,
          districts: [], currentProduction: null, productionProgress: 0,
          foodAccumulated: 0, hp: 20, hpMax: 20,
        });
        hex.cityId = cityId;
        hex.ownerPlayerId = aiPlayer.id;
        for (const [nc, nr] of getNeighbors(unit.hexCol, unit.hexRow, g.mapConfig)) {
          const nh = hexAt(g.hexes, nc, nr, g.mapConfig);
          if (nh && !nh.ownerPlayerId && nh.terrainType !== "water") nh.ownerPlayerId = aiPlayer.id;
        }
        addLogMsg(`${aiPlayer.name} founded ${cityName}!`, g);
        continue;
      }

      if (bestLoc) {
        unit.hexCol = bestLoc.col;
        unit.hexRow = bestLoc.row;
        unit.movementCurrent = 0;
      }
    }
  }

  // Second pass: nukes
  for (const unit of [...aiPlayer.units]) {
    if (unit.unitType !== "nuke" || processedUnits.has(unit.id)) continue;
    processedUnits.add(unit.id);

    for (const eCity of enemyPlayer.cities) {
      const eCityHex = g.hexes[eCity.hexId];
      const dist = hexDist(unit.hexCol, unit.hexRow, eCityHex.col, eCityHex.row);
      if (dist <= 3) {
        const blast = getHexesInRadius(eCityHex.col, eCityHex.row, 1, g.hexes);
        for (const bh of blast) {
          enemyPlayer.units = enemyPlayer.units.filter(u => !(u.hexCol === bh.col && u.hexRow === bh.row));
          aiPlayer.units = aiPlayer.units.filter(u => !(u.hexCol === bh.col && u.hexRow === bh.row && u.id !== unit.id));
          g.barbarians = (g.barbarians || []).filter(b => !(b.hexCol === bh.col && b.hexRow === bh.row));
          const dc = enemyPlayer.cities.find(c => { const h = g.hexes[c.hexId]; return h.col === bh.col && h.row === bh.row; });
          if (dc) {
            dc.hp = Math.max(1, (dc.hp || 20) - 10);
            addLogMsg(`☢ ${dc.name} hit! (${dc.hp}HP)`, g);
          }
        }
        aiPlayer.units = aiPlayer.units.filter(u => u.id !== unit.id);
        addLogMsg(`☢ AI NUCLEAR STRIKE!`, g);
        break;
      }
    }
  }

  // Third pass: combat units
  for (const unit of [...aiPlayer.units]) {
    if (processedUnits.has(unit.id)) continue;
    if (unit.unitType === "settler") continue;
    processedUnits.add(unit.id);

    const unitDef = UNIT_DEFS[unit.unitType];
    if (!unitDef) continue;

    if (!unit.hasAttacked) {
      const range = unitDef.range || 1;
      let bestTarget = null, bestTargetScore = -Infinity;

      for (const eu of enemyPlayer.units) {
        const dist = hexDist(unit.hexCol, unit.hexRow, eu.hexCol, eu.hexRow);
        if (dist > range) continue;
        const euDef = UNIT_DEFS[eu.unitType];
        const preview = calcCombatPreview(
          unit, unitDef, eu, euDef,
          hexAt(g.hexes, eu.hexCol, eu.hexRow, g.mapConfig)?.terrainType,
          aiPlayer, enemyPlayer, false
        );
        let score = preview.aDmg;
        if (preview.defDies) score += 20;
        if (preview.atkDies) score -= 30;
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

      for (const eCity of enemyPlayer.cities) {
        const eCH = g.hexes[eCity.hexId];
        const dist = hexDist(unit.hexCol, unit.hexRow, eCH.col, eCH.row);
        if (dist > range) continue;
        const garrison = enemyPlayer.units.find(u => u.hexCol === eCH.col && u.hexRow === eCH.row);
        if (!garrison) {
          let score = unitDef.strength * 2;
          if (eCity.hp - unitDef.strength * 2 <= 0) score += 30;
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
          const defOwner = bestTarget.isBarb ? { researchedTechs: [], civilization: "Barbarian" } : enemyPlayer;
          const defHex = hexAt(g.hexes, tc, tr, g.mapConfig);
          const defCity = enemyPlayer.cities.find(c => { const h = g.hexes[c.hexId]; return h.col === tc && h.row === tr; });
          const pv = calcCombatPreview(unit, unitDef, defender, defDef, defHex?.terrainType, aiPlayer, defOwner, !!defCity);

          unit.hpCurrent = Math.max(0, unit.hpCurrent - pv.dDmg);
          defender.hpCurrent = Math.max(0, defender.hpCurrent - pv.aDmg);
          unit.hasAttacked = true;

          let msg = `AI ${unitDef.name}→${bestTarget.isBarb ? "Barb " : ""}${defDef.name}: ${pv.aDmg}dmg`;
          if (pv.dDmg > 0) msg += ` took ${pv.dDmg}`;

          if (pv.defDies) {
            if (bestTarget.isUnit) enemyPlayer.units = enemyPlayer.units.filter(u => u.id !== defender.id);
            if (bestTarget.isBarb) { g.barbarians = g.barbarians.filter(b => b.id !== defender.id); aiPlayer.gold += 5; }
            msg += ` ☠${defDef.name}`;

            if (unitDef.range === 0 && !pv.atkDies) {
              unit.hexCol = tc; unit.hexRow = tr; unit.movementCurrent = 0;
              if (defCity && bestTarget.isUnit) {
                defCity.hp = (defCity.hp || 20) - 5;
                if (defCity.hp <= 0) {
                  enemyPlayer.cities = enemyPlayer.cities.filter(c => c.id !== defCity.id);
                  defCity.hp = 10; defCity.hpMax = 20; aiPlayer.cities.push(defCity);
                  if (defHex) defHex.ownerPlayerId = aiPlayer.id;
                  msg += ` 🏛${defCity.name} captured!`;
                }
              }
              if (bestTarget.isBarb && defHex && !defHex.ownerPlayerId) defHex.ownerPlayerId = aiPlayer.id;
            }
          }
          if (pv.atkDies) { aiPlayer.units = aiPlayer.units.filter(u => u.id !== unit.id); msg += ` ☠${unitDef.name}`; }
          addLogMsg(msg, g);
        } else if (bestTarget.isCity) {
          const defCity = bestTarget.city;
          defCity.hp = (defCity.hp || 20) - unitDef.strength * 2;
          unit.hasAttacked = true;
          if (unitDef.range === 0) unit.movementCurrent = 0;

          let msg = `AI ${unitDef.name}→${defCity.name} (${Math.max(0, defCity.hp)}HP)`;
          if (defCity.hp <= 0) {
            const defHex = hexAt(g.hexes, tc, tr, g.mapConfig);
            enemyPlayer.cities = enemyPlayer.cities.filter(c => c.id !== defCity.id);
            defCity.hp = 10; defCity.hpMax = 20; aiPlayer.cities.push(defCity);
            if (defHex) defHex.ownerPlayerId = aiPlayer.id;
            if (unitDef.range === 0) { unit.hexCol = tc; unit.hexRow = tr; }
            msg = `AI ${unitDef.name} 🏛captured ${defCity.name}!`;
          }
          addLogMsg(msg, g);
        }
      }
    }

    // Move toward nearest enemy city if still has movement
    if (unit.movementCurrent > 0 && aiPlayer.units.includes(unit)) {
      const domain = unitDef.domain || "land";
      const reachable = getReachableHexes(unit.hexCol, unit.hexRow, unit.movementCurrent, g.hexes, domain, aiPlayer.id, g.players, unitDef.ability, g.mapConfig);
      if (reachable.size > 0) {
        let goalCol = null, goalRow = null, goalDist = Infinity;

        for (const eCity of enemyPlayer.cities) {
          const eCH = g.hexes[eCity.hexId];
          const dist = hexDist(unit.hexCol, unit.hexRow, eCH.col, eCH.row);
          if (dist < goalDist) { goalDist = dist; goalCol = eCH.col; goalRow = eCH.row; }
        }

        if (goalCol !== null) {
          let bestMove = null, bestMoveDist = goalDist;
          for (const key of reachable) {
            const [mc, mr] = key.split(",").map(Number);
            const dist = hexDist(mc, mr, goalCol, goalRow);
            if (dist < bestMoveDist) { bestMoveDist = dist; bestMove = { col: mc, row: mr }; }
          }
          if (bestMove) {
            unit.hexCol = bestMove.col;
            unit.hexRow = bestMove.row;
            unit.movementCurrent = 0;
          }
        } else if (unit.unitType === "scout") {
          const keys = [...reachable];
          if (keys.length > 0) {
            const rk = keys[Math.floor(gameRng(g) * keys.length)];
            const [mc, mr] = rk.split(",").map(Number);
            unit.hexCol = mc;
            unit.hexRow = mr;
            unit.movementCurrent = 0;
          }
        }
      }
    }
  }
};

// Execute an entire AI turn
export const aiExecuteTurn = (gameState) => {
  const g = JSON.parse(JSON.stringify(gameState));
  const aiPlayer = g.players.find(p => p.id === g.currentPlayerId);
  const enemyPlayer = g.players.find(p => p.id !== g.currentPlayerId);

  // Research
  const techPick = aiPickResearch(aiPlayer, g.hexes, enemyPlayer);
  if (techPick) {
    aiPlayer.currentResearch = { techId: techPick, progress: 0 };
    addLogMsg(`${aiPlayer.name} researching ${TECH_TREE[techPick].name}`, g);
  }

  // City phase
  for (const city of aiPlayer.cities) {
    if (!city.currentProduction) {
      const prod = aiPickProduction(city, aiPlayer, g.hexes, enemyPlayer);
      if (prod) { city.currentProduction = prod; city.productionProgress = 0; }
    }
  }
  processResearchAndIncome(aiPlayer, g);
  for (const city of aiPlayer.cities) processCityTurn(city, aiPlayer, g);
  expandTerritory(aiPlayer, g);

  // Movement & combat
  aiPlanAndExecuteMoves(g, aiPlayer, enemyPlayer);
  healGarrison(aiPlayer, g.hexes);

  return g;
};

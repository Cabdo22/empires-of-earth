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
import { addLogMsg, processResearchAndIncome, processCityTurn, expandTerritory, healGarrison, initCityBorders } from '../engine/turnProcessing.js';
import { autoAssignTiles } from '../engine/economy.js';
import { getHexesInRadius } from '../data/constants.js';
import { AI_DIFFICULTY } from '../engine/gameInit.js';

// Aggregate all enemy units and cities across all opponents
const getAllEnemyUnits = (enemies) => enemies.flatMap(e => e.units);
const getAllEnemyCities = (enemies) => enemies.flatMap(e => e.cities);
const getEnemyOwner = (unitOrCity, enemies) => enemies.find(e =>
  e.units.some(u => u.id === unitOrCity.id) || e.cities.some(c => c.id === unitOrCity.id)
);

// ---- Research selection ----
const aiPickResearch = (player, hexes, enemies, smarter) => {
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

  const scored = available.map(tech => {
    let score = Math.round(100 / tech.cost * 10);
    const isMilitary = tech.effects.some(e =>
      /unlock.*warrior|unlock.*sword|unlock.*knight|unlock.*horseman|unlock.*archer|unlock.*crossbow|unlock.*tank|unlock.*musket|unlock.*artillery|unlock.*catapult|unlock.*cannon|unlock.*trebuchet|unlock.*cavalier|unlock.*frigate|unlock.*machine|unlock.*infantry|unlock.*mech|unlock.*fighter|unlock.*bomber|unlock.*missile|strength|movement|unit cost/i.test(e)
    );
    if (isMilitary && enemyNearby) score += smarter ? 12 : 8;
    if (isMilitary && !enemyNearby) score += 2;

    const isEcon = tech.effects.some(e => /food|gold|prod|science/i.test(e));
    if (isEcon && maxEra <= 2) score += smarter ? 7 : 5;

    const isSciVictory = tech.id === "quantum_computing" || tech.id === "fusion_power" || tech.id === "space_program";
    if (isSciVictory && maxEra >= 4) score += smarter ? 15 : 10;

    if (tech.effects.some(e => /settler|library|market|bank/i.test(e))) score += 4;
    if (tech.effects.some(e => /city defense|city.*HP/i.test(e))) score += 2;

    return { tech, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0].tech.id;
};

// ---- Production selection ----
const aiPickProduction = (city, player, hexes, enemies, smarter) => {
  if (city.currentProduction) return null;

  const availUnits = getAvailableUnits(player, city, hexes);
  const availDistricts = getAvailableDistricts(player, city);
  const militaryCount = player.units.filter(u =>
    u.unitType !== "scout" && u.unitType !== "settler" && u.unitType !== "nuke" && u.unitType !== "icbm"
  ).length;
  const totalEnemyMilitary = getAllEnemyUnits(enemies).length;
  const settlerCount = player.units.filter(u => u.unitType === "settler").length;

  const maxCities = Math.max(3, Math.floor(COLS * ROWS / 80));
  if (player.cities.length < maxCities && settlerCount === 0 && availUnits.some(u => u.id === "settler")) {
    return { type: "unit", itemId: "settler" };
  }

  const allEnemyUnits = getAllEnemyUnits(enemies);
  const enemyNearby = allEnemyUnits.some(eu => {
    const ch = hexes[city.hexId];
    return hexDist(eu.hexCol, eu.hexRow, ch.col, ch.row) <= 5;
  });

  // Smart AI is more aggressive about military buildup
  const militaryThreshold = smarter ? totalEnemyMilitary + 2 : totalEnemyMilitary + 1;
  if ((militaryCount < militaryThreshold) || enemyNearby) {
    const military = availUnits
      .filter(u => u.id !== "settler" && u.id !== "scout" && u.id !== "nuke" && u.id !== "icbm")
      .sort((a, b) => b.strength - a.strength);
    if (military.length > 0) return { type: "unit", itemId: military[0].id };
  }

  if (city.districts.length < 2 && availDistricts.length > 0) {
    const distPriority = ["library", "farm", "workshop", "market", "bank", "military"];
    for (const dId of distPriority) {
      if (availDistricts.some(d => d.id === dId)) return { type: "district", itemId: dId };
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

// ---- City founding location ----
const aiFindCityLocation = (settler, player, hexes) => {
  const existingCityHexes = new Set(
    player.cities.map(c => `${hexes[c.hexId].col},${hexes[c.hexId].row}`)
  );

  const { reachable, costMap } = getReachableHexes(settler.hexCol, settler.hexRow, settler.movementCurrent, hexes, "land");
  let bestHex = null, bestScore = -Infinity, bestCost = 0;

  for (const key of reachable) {
    const [col, row] = key.split(",").map(Number);
    const hex = hexAt(hexes, col, row);
    if (!hex || hex.terrainType === "water" || hex.terrainType === "mountain" || hex.cityId) continue;

    let score = 0;
    if (hex.terrainType === "grassland") score += 3;

    for (const [nc, nr] of getNeighbors(col, row)) {
      const nh = hexAt(hexes, nc, nr);
      if (nh?.resource) score += 2;
      if (nh?.terrainType === "grassland") score += 1;
    }

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

// ---- Unit movement and combat ----
const aiPlanAndExecuteMoves = (g, aiPlayer, enemies, addLogFn, smarter) => {
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

  // Settlers first
  for (const unit of [...aiPlayer.units]) {
    if (unit.unitType !== "settler" || processedUnits.has(unit.id)) continue;
    processedUnits.add(unit.id);

    const bestLocResult = aiFindCityLocation(unit, aiPlayer, g.hexes);
    if (bestLocResult) {
      const bestLoc = bestLocResult.hex;
      const bestLocCost = bestLocResult.cost;
      const hex = hexAt(g.hexes, unit.hexCol, unit.hexRow);
      const standingGood = hex && hex.terrainType === "grassland" && !hex.cityId;
      const tooClose = aiPlayer.cities.some(c => {
        const ch = g.hexes[c.hexId];
        return hexDist(unit.hexCol, unit.hexRow, ch.col, ch.row) < 3;
      });

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
        // Smart AI prefers killing low-HP targets
        if (smarter && eu.hpCurrent <= preview.aDmg) score += 10;
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
                  autoAssignTiles(defCity, g.hexes);
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
            autoAssignTiles(defCity, g.hexes);
            if (unitDef.range === 0 && !isHexOccupied(tc, tr, g.players, g.barbarians, unit.id)) { unit.hexCol = tc; unit.hexRow = tr; }
            msg = `AI ${unitDef.name} \uD83C\uDFDBcaptured ${defCity.name}!`;
          }
          addLogFn(msg, g);
        }
      }
    }

    // Movement phase — move toward nearest enemy city
    if (unit.movementCurrent > 0 && aiPlayer.units.includes(unit)) {
      const domain = unitDef.domain || "land";
      const { reachable, costMap } = getReachableHexes(unit.hexCol, unit.hexRow, unit.movementCurrent, g.hexes, domain, aiPlayer.id, g.players, unitDef.ability, g.barbarians);
      if (reachable.size > 0) {
        let goalCol = null, goalRow = null, goalDist = Infinity;

        for (const eCity of allEnemyCities) {
          const eCH = g.hexes[eCity.hexId];
          const dist = hexDist(unit.hexCol, unit.hexRow, eCH.col, eCH.row);
          if (dist < goalDist) { goalDist = dist; goalCol = eCH.col; goalRow = eCH.row; }
        }

        if (unit.unitType === "scout") {
          const keys = [...reachable].filter(k => !occupiedHexes.has(k));
          if (keys.length > 0) {
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
        } else if (goalCol !== null) {
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
};

// ---- Execute full AI turn ----
export const aiExecuteTurn = (gameState) => {
  const g = JSON.parse(JSON.stringify(gameState));
  const aiPlayer = g.players.find(p => p.id === g.currentPlayerId);
  const enemies = g.players.filter(p => p.id !== g.currentPlayerId);
  const diff = AI_DIFFICULTY[aiPlayer.difficulty] || AI_DIFFICULTY.normal;
  const smarter = diff.smarter;

  // Research
  const techPick = aiPickResearch(aiPlayer, g.hexes, enemies, smarter);
  if (techPick) {
    aiPlayer.currentResearch = { techId: techPick, progress: 0 };
    addLogMsg(`${aiPlayer.name} researching ${TECH_TREE[techPick].name}`, g);
  }

  // City production
  for (const city of aiPlayer.cities) {
    if (!city.currentProduction) {
      const prod = aiPickProduction(city, aiPlayer, g.hexes, enemies, smarter);
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
    addLogMsg(`AI ${oldDef.name} upgraded to ${info.toDef.name}`, g);
  }

  // Movement & combat
  aiPlanAndExecuteMoves(g, aiPlayer, enemies, addLogMsg, smarter);
  healGarrison(aiPlayer, g.hexes);

  return g;
};

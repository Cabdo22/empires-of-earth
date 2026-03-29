// ============================================================
// ACTIONS — pure action appliers: (state, params) => { state, events }
// Each function deep-clones state, applies the action, returns new state + side-effect events.
// Uses LOCAL engine logic (SIEGE_UNITS, city counter-damage, rapid_shot, heal_on_kill,
// city_siege, borderHexIds, workedTileIds, autoAssignTiles, initCityBorders, N-player cycling).
// ============================================================

import { hexAt, getNeighbors, hexDist, getHexesInRadius, ROAD_COST } from '../data/constants.js';
import { TECH_TREE } from '../data/techs.js';
import { UNIT_DEFS, SIEGE_UNITS } from '../data/units.js';
import { CIV_DEFS } from '../data/civs.js';
import { calcCombatPreview } from './combat.js';
import { canUpgradeUnit, autoAssignTiles } from './economy.js';
import { calcCityMaxHP, recalcAllTradeRoutes } from './turnProcessing.js';
import { isHexOccupied } from './movement.js';
import {
  processResearchAndIncome, processCityTurn, expandTerritory,
  refreshUnits, spawnBarbarians, processBarbarians, rollRandomEvent,
  addLogMsg, initCityBorders,
} from './turnProcessing.js';
import { checkVictoryState } from './victory.js';

const clone = (state) => JSON.parse(JSON.stringify(state));

const tryCaptureCity = (city, attackerPlayer, defenderPlayer, hex, g) => {
  defenderPlayer.cities = defenderPlayer.cities.filter(c => c.id !== city.id);
  city.captured = true;
  attackerPlayer.cities.push(city);
  city.hpMax = calcCityMaxHP(city, attackerPlayer);
  city.hp = Math.max(5, Math.floor(city.hpMax * 0.25));
  if (hex) hex.ownerPlayerId = attackerPlayer.id;
  // Transfer border ownership and reassign tiles
  for (const hid of (city.borderHexIds || [])) {
    const bh = g.hexes[hid];
    if (bh) { bh.ownerPlayerId = attackerPlayer.id; bh.cityBorderId = city.id; }
  }
  autoAssignTiles(city, g.hexes, null, attackerPlayer);
  city.tradeRoutes = [];
  recalcAllTradeRoutes(g);
  return `\u{1F3DB}${city.name} captured!`;
};

// ---- MOVE UNIT ----
export const applyMoveUnit = (state, { unitId, col, row }) => {
  const g = clone(state);
  const player = g.players.find(p => p.id === g.currentPlayerId);
  const unit = player?.units.find(u => u.id === unitId);
  if (!unit) return { state, events: [] };
  if (isHexOccupied(col, row, g.players, g.barbarians, unit.id)) return { state, events: [] };
  unit.hexCol = col;
  unit.hexRow = row;
  unit.movementCurrent = 0;
  unit.hasMoved = true;
  return { state: g, events: [{ type: "sfx", name: "move" }] };
};

// ---- ATTACK ----
export const applyAttack = (state, { attackerId, col, row }) => {
  const g = clone(state);
  const events = [];
  const attPlayer = g.players.find(p => p.id === g.currentPlayerId);
  const allEnemies = g.players.filter(p => p.id !== g.currentPlayerId);

  const attUnit = attPlayer.units.find(u => u.id === attackerId);
  if (!attUnit) return { state, events: [] };
  const attDef = UNIT_DEFS[attUnit.unitType];

  // Find target across ALL enemies
  let defUnit = null, defPlayer = null;
  for (const ep of allEnemies) {
    const found = ep.units.find(u => u.hexCol === col && u.hexRow === row);
    if (found) { defUnit = found; defPlayer = ep; break; }
  }
  if (!g.barbarians) g.barbarians = [];
  const barbUnit = g.barbarians.find(b => b.hexCol === col && b.hexRow === row);
  let defCity = null;
  if (!defPlayer) {
    for (const ep of allEnemies) {
      const found = ep.cities.find(c => { const h = g.hexes[c.hexId]; return h.col === col && h.row === row; });
      if (found) { defCity = found; defPlayer = ep; break; }
    }
  } else {
    defCity = defPlayer.cities.find(c => { const h = g.hexes[c.hexId]; return h.col === col && h.row === row; });
  }
  if (!defPlayer) defPlayer = allEnemies[0]; // fallback for barbarian combat
  const defHex = hexAt(g.hexes, col, row);
  const defender = defUnit || barbUnit;

  if (defender) {
    const defDef = UNIT_DEFS[defender.unitType];
    const defOwner = defUnit ? defPlayer : { researchedTechs: [], civilization: "Barbarian" };
    const preview = calcCombatPreview(attUnit, attDef, defender, defDef, defHex?.terrainType, attPlayer, defOwner, !!defCity);

    const atkDmg = attDef.ability === "rapid_shot" ? Math.ceil(preview.aDmg * 1.5) : preview.aDmg;

    attUnit.hpCurrent = Math.max(0, attUnit.hpCurrent - preview.dDmg);
    defender.hpCurrent = Math.max(0, defender.hpCurrent - atkDmg);
    attUnit.hasAttacked = true;
    attUnit.movementCurrent = 0;

    let msg = `${attDef.name}\u2192${barbUnit ? "Barb " : ""}${defDef.name}: ${atkDmg}dmg${attDef.ability === "rapid_shot" ? " (x1.5)" : ""}`;
    if (preview.dDmg > 0) msg += ` took ${preview.dDmg}`;

    events.push({ type: "combat_anim", attacker: { col: attUnit.hexCol, row: attUnit.hexRow }, defender: { col, row }, aDmg: atkDmg, dDmg: preview.dDmg });

    if (defender.hpCurrent <= 0) {
      if (defUnit) defPlayer.units = defPlayer.units.filter(u => u.id !== defUnit.id);
      if (barbUnit) { g.barbarians = g.barbarians.filter(b => b.id !== barbUnit.id); attPlayer.gold += 15; }
      msg += ` \u2620${barbUnit ? "Barb +15\u{1F4B0} " : ""}${defDef.name}`;

      if (attDef.range === 0 && !preview.atkDies && !isHexOccupied(col, row, g.players, g.barbarians, attUnit.id)) {
        attUnit.hexCol = col;
        attUnit.hexRow = row;
        attUnit.movementCurrent = 0;

        if (defCity && defUnit) {
          defCity.hp = (defCity.hp || 20) - 3;
          if (defCity.hp <= 0) msg += ` ${tryCaptureCity(defCity, attPlayer, defPlayer, defHex, g)}`;
        }
        if (barbUnit && defHex && !defHex.ownerPlayerId) defHex.ownerPlayerId = attPlayer.id;
      }
      if (attDef.ability === "heal_on_kill" && attUnit.hpCurrent > 0) {
        const healAmt = Math.min(10, UNIT_DEFS[attUnit.unitType].hp - attUnit.hpCurrent);
        if (healAmt > 0) { attUnit.hpCurrent += healAmt; msg += ` \u{1F406}+${healAmt}HP`; }
      }
    }

    if (preview.atkDies) {
      attPlayer.units = attPlayer.units.filter(u => u.id !== attUnit.id);
      msg += ` \u2620${attDef.name}`;
    }

    addLogMsg(msg, g, g.currentPlayerId);
  } else if (defCity) {
    // Direct city bombardment (no garrison)
    const isSiege = SIEGE_UNITS.has(attUnit.unitType);
    const isRanged = attDef.range > 0 && !isSiege;
    let cityDmg;
    if (isSiege) {
      cityDmg = attDef.strength * 5;
    } else if (isRanged) {
      cityDmg = Math.max(1, Math.floor(attDef.strength * 0.5));
    } else {
      cityDmg = attDef.strength * 2;
    }
    if (attDef.ability === "city_siege") cityDmg += 3;
    defCity.hp = (defCity.hp || 20) - cityDmg;
    attUnit.hasAttacked = true;
    if (attDef.range === 0) attUnit.movementCurrent = 0;

    // City counter-damage: melee non-siege attackers take 5 damage
    let cityCounter = 0;
    if (attDef.range === 0 && !isSiege) {
      cityCounter = 5;
      attUnit.hpCurrent -= cityCounter;
    }

    let msg = `${attDef.name}\u2192${defCity.name}: ${cityDmg}dmg (${Math.max(0, defCity.hp)}HP)`;
    if (cityCounter > 0) msg += ` took ${cityCounter}`;
    if (attUnit.hpCurrent <= 0) {
      attPlayer.units = attPlayer.units.filter(u => u.id !== attUnit.id);
      msg += ` \u2620${attDef.name}`;
    } else if (defCity.hp <= 0) {
      msg = `${attDef.name} ${tryCaptureCity(defCity, attPlayer, defPlayer, defHex, g)}`;
      if (attDef.range === 0 && !isHexOccupied(col, row, g.players, g.barbarians, attUnit.id)) {
        attUnit.hexCol = col;
        attUnit.hexRow = row;
      }
    }

    events.push({ type: "combat_anim", defender: { col, row }, aDmg: cityDmg, dDmg: cityCounter });
    addLogMsg(msg, g, g.currentPlayerId);
  }

  events.push({ type: "sfx", name: "combat" });
  events.push({ type: "flash", key: `${col},${row}`, kind: "combat" });
  checkVictoryState(g);
  return { state: g, events };
};

// ---- LAUNCH NUKE ----
export const applyLaunchNuke = (state, { nukeId, col, row }) => {
  const g = clone(state);
  const events = [];
  const aP = g.players.find(p => p.id === g.currentPlayerId);

  const ni = aP.units.findIndex(u => u.id === nukeId);
  if (ni === -1) return { state, events: [] };
  aP.units.splice(ni, 1);

  // Fighter interception: any enemy fighter/jet_fighter within 2 hexes
  const allEnemyUnits = g.players.filter(p => p.id !== g.currentPlayerId).flatMap(p => p.units);
  const interceptor = allEnemyUnits.find(u => {
    if (u.unitType !== "fighter" && u.unitType !== "jet_fighter") return false;
    return hexDist(u.hexCol, u.hexRow, col, row) <= 2;
  });
  if (interceptor) {
    addLogMsg(`\u2708 ${UNIT_DEFS[interceptor.unitType]?.name || "Fighter"} intercepts nuke at (${col},${row})!`, g, g.currentPlayerId);
    interceptor.hasAttacked = true;
    interceptor.movementCurrent = 0;
    events.push({ type: "flash", key: `${col},${row}`, kind: "combat" });
    events.push({ type: "sfx", name: "combat" });
    return { state: g, events };
  }

  const blast = getHexesInRadius(col, row, 1, g.hexes);
  for (const bh of blast) {
    events.push({ type: "flash", key: `${bh.col},${bh.row}`, kind: "nuke" });
    // Kill all units in blast (all players - friendly fire)
    for (const p of g.players) {
      p.units = p.units.filter(u => !(u.hexCol === bh.col && u.hexRow === bh.row));
    }
    g.barbarians = (g.barbarians || []).filter(b => !(b.hexCol === bh.col && b.hexRow === bh.row));
    // Damage cities of any enemy player
    for (const p of g.players.filter(pp => pp.id !== g.currentPlayerId)) {
      const dc = p.cities.find(c => { const h = g.hexes[c.hexId]; return h && h.col === bh.col && h.row === bh.row; });
      if (dc) { dc.hp = 1; addLogMsg(`\u2622 ${dc.name} hit! (${dc.hp}HP)`, g, g.currentPlayerId); }
    }
  }
  addLogMsg(`\u2622 NUCLEAR STRIKE at (${col},${row})!`, g, null);
  events.push({ type: "sfx", name: "nuke" });
  checkVictoryState(g);
  return { state: g, events };
};

// ---- SELECT RESEARCH ----
export const applySelectResearch = (state, { techId }) => {
  const g = clone(state);
  const player = g.players.find(p => p.id === g.currentPlayerId);
  player.currentResearch = { techId, progress: 0 };
  addLogMsg(`${player.name} researching ${TECH_TREE[techId].name}`, g, player.id);
  return { state: g, events: [{ type: "sfx", name: "click" }] };
};

// ---- SET PRODUCTION ----
export const applySetProduction = (state, { cityId, type, itemId }) => {
  const g = clone(state);
  const city = g.players.find(p => p.id === g.currentPlayerId).cities.find(c => c.id === cityId);
  if (city) {
    city.currentProduction = { type, itemId };
    city.productionProgress = 0;
  }
  return { state: g, events: [] };
};

// ---- UPGRADE UNIT ----
export const applyUpgradeUnit = (state, { unitId }) => {
  const g = clone(state);
  const player = g.players.find(p => p.id === g.currentPlayerId);
  const unit = player.units.find(u => u.id === unitId);
  if (!unit) return { state, events: [] };
  const info = canUpgradeUnit(unit, player);
  if (!info) return { state, events: [] };
  player.gold -= info.cost;
  const oldDef = UNIT_DEFS[unit.unitType];
  unit.unitType = info.toType;
  const newDef = UNIT_DEFS[info.toType];
  unit.hpCurrent = Math.ceil((unit.hpCurrent / oldDef.hp) * newDef.hp);
  unit.movementCurrent = 0;
  unit.hasAttacked = true;
  addLogMsg(`\u2B06 ${oldDef.name} upgraded to ${newDef.name} (-${info.cost}\u{1F4B0})`, g, g.currentPlayerId);
  return { state: g, events: [{ type: "sfx", name: "click" }] };
};

// ---- FOUND CITY ----
export const applyFoundCity = (state, { unitId, col, row }) => {
  const g = clone(state);
  const player = g.players.find(p => p.id === g.currentPlayerId);
  const unitIdx = player.units.findIndex(u => u.id === unitId);
  if (unitIdx === -1) return { state, events: [] };

  const hex = hexAt(g.hexes, col, row);
  if (!hex || hex.terrainType === "water" || hex.terrainType === "mountain" || hex.cityId) return { state, events: [] };

  // Must be at least 2 hexes from any existing city
  const tooClose = g.players.some(p => p.cities.some(c => {
    const ch = g.hexes[c.hexId];
    return ch && hexDist(col, row, ch.col, ch.row) < 2;
  }));
  if (tooClose) return { state, events: [] };

  player.units.splice(unitIdx, 1);

  g.nextCityId = (g.nextCityId || 0) + 1;
  const civNames = CIV_DEFS[player.civilization]?.cityNames || ["Colony"];
  const cityName = civNames[player.cities.length] || `City ${g.nextCityId}`;
  const cityId = `${player.id}-c${g.nextCityId}`;

  const initialMaxHP = calcCityMaxHP({ population: 1 }, player);
  const newCity = {
    id: cityId, name: cityName, hexId: hex.id, population: 1,
    districts: [], currentProduction: null, productionProgress: 0,
    foodAccumulated: 0, hp: initialMaxHP, hpMax: initialMaxHP,
    workedTileIds: [], borderHexIds: [], tradeRoutes: [],
  };
  player.cities.push(newCity);
  hex.cityId = cityId;
  initCityBorders(newCity, player, g.hexes);
  recalcAllTradeRoutes(g);

  addLogMsg(`${player.name} founded ${cityName}!`, g, player.id);
  return { state: g, events: [{ type: "sfx", name: "found" }] };
};

// ---- CANCEL PRODUCTION ----
export const applyCancelProduction = (state, { cityId }) => {
  const g = clone(state);
  const city = g.players.find(p => p.id === g.currentPlayerId).cities.find(c => c.id === cityId);
  if (city) { city.currentProduction = null; city.productionProgress = 0; }
  return { state: g, events: [] };
};

// ---- END TURN ----
// CRITICAL: cycles through N players using (curIdx + 1) % players.length
export const applyEndTurn = (state) => {
  const g = clone(state);
  const sfxQ = [];
  const currentPlayer = g.players.find(p => p.id === g.currentPlayerId);

  processResearchAndIncome(currentPlayer, g, sfxQ);
  for (const city of currentPlayer.cities) processCityTurn(city, currentPlayer, g, sfxQ);
  expandTerritory(currentPlayer, g);
  recalcAllTradeRoutes(g);
  rollRandomEvent(g, sfxQ);

  // Advance to next player in sequence (N-player cycling)
  const curIdx = g.players.findIndex(p => p.id === g.currentPlayerId);
  const nextIdx = (curIdx + 1) % g.players.length;
  g.currentPlayerId = g.players[nextIdx].id;

  // If we've looped back to first player, a full round is complete
  if (nextIdx === 0) {
    g.turnNumber++;
  }

  g.phase = "MOVEMENT";
  const nextPlayer = g.players[nextIdx];
  refreshUnits(nextPlayer, g);
  addLogMsg(`Turn ${g.turnNumber} \u2014 ${nextPlayer.name}`, g, nextPlayer.id);

  // Spawn/process barbarians AFTER turn marker so log reads correctly
  if (nextIdx === 0) {
    spawnBarbarians(g);
    processBarbarians(g);
  }
  checkVictoryState(g);

  const events = sfxQ.map(s => ({ type: "sfx", name: s }));
  return { state: g, events };
};

// ---- BUILD ROAD ----
export const applyBuildRoad = (state, { hexId }) => {
  const g = clone(state);
  const player = g.players.find(p => p.id === g.currentPlayerId);
  const hex = g.hexes[hexId];

  if (!hex || hex.road) return { state, events: [] };
  if (hex.ownerPlayerId !== player.id) return { state, events: [] };
  if (!player.researchedTechs.includes("trade")) return { state, events: [] };
  if (player.gold < ROAD_COST) return { state, events: [] };
  if (hex.terrainType === "water" || hex.terrainType === "mountain") return { state, events: [] };

  player.gold -= ROAD_COST;
  hex.road = true;
  hex.roadOwner = player.id;

  recalcAllTradeRoutes(g);
  addLogMsg(`${player.name} built road at (${hex.col},${hex.row}) (-${ROAD_COST}g)`, g, player.id);
  return { state: g, events: [{ type: "sfx", name: "build" }] };
};

// ---- SET TRADE FOCUS ----
export const applySetTradeFocus = (state, { cityId, routeIndex, focus }) => {
  const g = clone(state);
  const player = g.players.find(p => p.id === g.currentPlayerId);
  const city = player.cities.find(c => c.id === cityId);
  if (!city || !city.tradeRoutes || !city.tradeRoutes[routeIndex]) return { state, events: [] };
  city.tradeRoutes[routeIndex].focus = focus;
  return { state: g, events: [] };
};

// ============================================================
// ACTIONS — pure action appliers: (state, action) → { state, events }
// Each function deep-clones state, applies the action, returns new state + side-effect events
// ============================================================
import { UNIT_DEFS, TECH_TREE, CIV_DEFS } from './constants.js';
import { getNeighbors, hexAt, hexDist, getHexesInRadius } from './hex-math.js';
import { calcCombatPreview, getPlayerMaxEra } from './combat.js';
import { canUpgradeUnit } from './economy.js';
import { getReachableHexCost } from './movement.js';
import { addLogMsg, processResearchAndIncome, processCityTurn, expandTerritory, refreshUnits, spawnBarbarians, processBarbarians, rollRandomEvent } from './turn-processing.js';
import { checkVictoryState } from './victory.js';

const clone = (state) => JSON.parse(JSON.stringify(state));

const tryCaptureCity = (city, attackerPlayer, defenderPlayer, hex) => {
  defenderPlayer.cities = defenderPlayer.cities.filter(c => c.id !== city.id);
  city.hp = 10;
  city.hpMax = 20;
  city.captured = true;
  attackerPlayer.cities.push(city);
  if (hex) hex.ownerPlayerId = attackerPlayer.id;
  return `🏛${city.name} captured!`;
};

export const applyMoveUnit = (state, { unitId, col, row }) => {
  const g = clone(state);
  const player = g.players.find(p => p.id === g.currentPlayerId);
  const unit = player?.units.find(u => u.id === unitId);
  if (!unit) return { state, events: [] };
  const unitDef = UNIT_DEFS[unit.unitType];
  const moveCost = getReachableHexCost(
    unit.hexCol,
    unit.hexRow,
    col,
    row,
    unit.movementCurrent,
    g.hexes,
    unitDef?.domain || "land",
    player?.id,
    g.players,
    unitDef?.ability,
    g.mapConfig
  );
  if (moveCost == null) return { state, events: [] };
  unit.hexCol = col;
  unit.hexRow = row;
  unit.movementCurrent = Math.max(0, unit.movementCurrent - moveCost);
  return { state: g, events: [{ type: "sfx", name: "move" }] };
};

export const applyAttack = (state, { attackerId, col, row }) => {
  const g = clone(state);
  const events = [];
  const attPlayer = g.players.find(p => p.id === g.currentPlayerId);
  const defPlayer = g.players.find(p => p.id !== g.currentPlayerId);

  const attUnit = attPlayer.units.find(u => u.id === attackerId);
  if (!attUnit) return { state, events: [] };
  const attDef = UNIT_DEFS[attUnit.unitType];

  const defUnit = defPlayer.units.find(u => u.hexCol === col && u.hexRow === row);
  if (!g.barbarians) g.barbarians = [];
  const barbUnit = g.barbarians.find(b => b.hexCol === col && b.hexRow === row);
  const defCity = defPlayer.cities.find(c => {
    const h = g.hexes[c.hexId];
    return h.col === col && h.row === row;
  });
  const defHex = hexAt(g.hexes, col, row, g.mapConfig);
  const defender = defUnit || barbUnit;

  if (defender) {
    const defDef = UNIT_DEFS[defender.unitType];
    const defOwner = defUnit ? defPlayer : { researchedTechs: [], civilization: "Barbarian" };
    const preview = calcCombatPreview(attUnit, attDef, defender, defDef, defHex?.terrainType, attPlayer, defOwner, !!defCity);

    const atkDmg = attDef.ability === "rapid_shot" ? Math.ceil(preview.aDmg * 1.5) : preview.aDmg;

    attUnit.hpCurrent = Math.max(0, attUnit.hpCurrent - preview.dDmg);
    defender.hpCurrent = Math.max(0, defender.hpCurrent - atkDmg);
    attUnit.hasAttacked = true;

    let msg = `${attDef.name}→${barbUnit ? "Barb " : ""}${defDef.name}: ${atkDmg}dmg${attDef.ability === "rapid_shot" ? " (x1.5)" : ""}`;
    if (preview.dDmg > 0) msg += ` took ${preview.dDmg}`;

    events.push({ type: "combat_anim", attacker: { col: attUnit.hexCol, row: attUnit.hexRow }, defender: { col, row }, aDmg: atkDmg, dDmg: preview.dDmg });

    if (defender.hpCurrent <= 0) {
      if (defUnit) defPlayer.units = defPlayer.units.filter(u => u.id !== defUnit.id);
      if (barbUnit) { g.barbarians = g.barbarians.filter(b => b.id !== barbUnit.id); attPlayer.gold += 5; }
      msg += ` ☠${barbUnit ? "Barb +5💰 " : ""}${defDef.name}`;

      if (attDef.range === 0 && !preview.atkDies) {
        attUnit.hexCol = col;
        attUnit.hexRow = row;
        attUnit.movementCurrent = 0;

        if (defCity && defUnit) {
          defCity.hp = (defCity.hp || 20) - 5;
          if (defCity.hp <= 0) msg += ` ${tryCaptureCity(defCity, attPlayer, defPlayer, defHex)}`;
        }
        if (barbUnit && defHex && !defHex.ownerPlayerId) defHex.ownerPlayerId = attPlayer.id;
      }
      if (attDef.ability === "heal_on_kill" && attUnit.hpCurrent > 0) {
        const healAmt = Math.min(10, UNIT_DEFS[attUnit.unitType].hp - attUnit.hpCurrent);
        if (healAmt > 0) { attUnit.hpCurrent += healAmt; msg += ` 🐆+${healAmt}HP`; }
      }
    }

    if (preview.atkDies) {
      attPlayer.units = attPlayer.units.filter(u => u.id !== attUnit.id);
      msg += ` ☠${attDef.name}`;
    }

    addLogMsg(msg, g);
  } else if (defCity) {
    let cityDmg = attDef.strength * 2;
    if (attDef.ability === "city_siege") cityDmg += 2;
    defCity.hp = (defCity.hp || 20) - cityDmg;
    attUnit.hasAttacked = true;
    if (attDef.range === 0) attUnit.movementCurrent = 0;

    let msg = `${attDef.name}→${defCity.name} (${Math.max(0, defCity.hp)}HP)`;
    if (defCity.hp <= 0) {
      msg = `${attDef.name} ${tryCaptureCity(defCity, attPlayer, defPlayer, defHex)}`;
      if (attDef.range === 0) { attUnit.hexCol = col; attUnit.hexRow = row; }
    }

    events.push({ type: "combat_anim", defender: { col, row }, aDmg: cityDmg, dDmg: 0 });
    addLogMsg(msg, g);
  }

  events.push({ type: "sfx", name: "combat" });
  events.push({ type: "flash", key: `${col},${row}`, kind: "combat" });
  checkVictoryState(g);
  return { state: g, events };
};

export const applyLaunchNuke = (state, { nukeId, col, row }) => {
  const g = clone(state);
  const events = [];
  const aP = g.players.find(p => p.id === g.currentPlayerId);
  const dP = g.players.find(p => p.id !== g.currentPlayerId);

  const ni = aP.units.findIndex(u => u.id === nukeId);
  if (ni === -1) return { state, events: [] };
  aP.units.splice(ni, 1);

  // Fighter interception
  const interceptor = dP.units.find(u => {
    if (u.unitType !== "fighter") return false;
    return hexDist(u.hexCol, u.hexRow, col, row) <= 2;
  });
  if (interceptor) {
    addLogMsg(`✈ Fighter intercepts nuke at (${col},${row})!`, g);
    interceptor.hasAttacked = true;
    events.push({ type: "flash", key: `${col},${row}`, kind: "combat" });
    events.push({ type: "sfx", name: "combat" });
    return { state: g, events };
  }

  const blast = getHexesInRadius(col, row, 1, g.hexes);
  for (const bh of blast) {
    events.push({ type: "flash", key: `${bh.col},${bh.row}`, kind: "nuke" });
    dP.units = dP.units.filter(u => !(u.hexCol === bh.col && u.hexRow === bh.row));
    aP.units = aP.units.filter(u => !(u.hexCol === bh.col && u.hexRow === bh.row));
    g.barbarians = (g.barbarians || []).filter(b => !(b.hexCol === bh.col && b.hexRow === bh.row));
    const dc = dP.cities.find(c => { const h = g.hexes[c.hexId]; return h && h.col === bh.col && h.row === bh.row; });
    if (dc) { dc.hp = Math.max(1, (dc.hp || 20) - 10); addLogMsg(`☢ ${dc.name} hit! (${dc.hp}HP)`, g); }
  }
  addLogMsg(`☢ NUCLEAR STRIKE at (${col},${row})!`, g);
  events.push({ type: "sfx", name: "nuke" });
  checkVictoryState(g);
  return { state: g, events };
};

export const applySelectResearch = (state, { techId }) => {
  const g = clone(state);
  const player = g.players.find(p => p.id === g.currentPlayerId);
  player.currentResearch = { techId, progress: 0 };
  addLogMsg(`${player.name} researching ${TECH_TREE[techId].name}`, g);
  return { state: g, events: [{ type: "sfx", name: "click" }] };
};

export const applySetProduction = (state, { cityId, type, itemId }) => {
  const g = clone(state);
  const city = g.players.find(p => p.id === g.currentPlayerId).cities.find(c => c.id === cityId);
  if (city) {
    city.currentProduction = { type, itemId };
    city.productionProgress = 0;
  }
  return { state: g, events: [] };
};

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
  addLogMsg(`⬆ ${oldDef.name} upgraded to ${newDef.name} (-${info.cost}💰)`, g);
  return { state: g, events: [{ type: "sfx", name: "click" }] };
};

export const applyFoundCity = (state, { unitId, col, row }) => {
  const g = clone(state);
  const player = g.players.find(p => p.id === g.currentPlayerId);
  const unitIdx = player.units.findIndex(u => u.id === unitId);
  if (unitIdx === -1) return { state, events: [] };

  const hex = hexAt(g.hexes, col, row, g.mapConfig);
  if (!hex || hex.terrainType === "water" || hex.terrainType === "mountain" || hex.cityId) return { state, events: [] };

  player.units.splice(unitIdx, 1);

  const cityNum = player.cities.length + 1;
  const civNames = CIV_DEFS[player.civilization]?.cityNames || ["Colony"];
  const cityName = civNames[cityNum - 1] || `City ${cityNum}`;
  const cityId = `${player.id}-c${cityNum}`;

  player.cities.push({
    id: cityId, name: cityName, hexId: hex.id, population: 1,
    districts: [], currentProduction: null, productionProgress: 0,
    foodAccumulated: 0, hp: 20, hpMax: 20,
  });

  hex.cityId = cityId;
  hex.ownerPlayerId = player.id;

  for (const [nc, nr] of getNeighbors(col, row, g.mapConfig)) {
    const neighbor = hexAt(g.hexes, nc, nr, g.mapConfig);
    if (neighbor && !neighbor.ownerPlayerId && neighbor.terrainType !== "water") {
      neighbor.ownerPlayerId = player.id;
    }
  }

  addLogMsg(`${player.name} founded ${cityName}!`, g);
  return { state: g, events: [{ type: "sfx", name: "found" }] };
};

export const applyCancelProduction = (state, { cityId }) => {
  const g = clone(state);
  const city = g.players.find(p => p.id === g.currentPlayerId).cities.find(c => c.id === cityId);
  if (city) { city.currentProduction = null; city.productionProgress = 0; }
  return { state: g, events: [] };
};

export const applyEndTurn = (state) => {
  const g = clone(state);
  const sfxQ = [];
  const currentPlayer = g.players.find(p => p.id === g.currentPlayerId);

  processResearchAndIncome(currentPlayer, g, sfxQ);
  for (const city of currentPlayer.cities) processCityTurn(city, currentPlayer, g, sfxQ);
  expandTerritory(currentPlayer, g);

  g.currentPlayerId = g.currentPlayerId === "p1" ? "p2" : "p1";

  if (g.currentPlayerId === "p1") {
    g.turnNumber++;
    spawnBarbarians(g);
    processBarbarians(g);
    rollRandomEvent(g);
  }

  g.phase = "MOVEMENT";
  const nextPlayer = g.players.find(p => p.id === g.currentPlayerId);
  refreshUnits(nextPlayer, g);
  addLogMsg(`Turn ${g.turnNumber} — ${nextPlayer.name}`, g);
  checkVictoryState(g);

  const events = sfxQ.map(s => ({ type: "sfx", name: s }));
  return { state: g, events };
};

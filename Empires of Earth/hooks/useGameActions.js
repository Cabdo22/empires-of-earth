// ============================================================
// GAME ACTIONS HOOK — combat, movement, city founding, etc.
// ============================================================

import { useCallback } from "react";
import { hexCenter, hexAt, getNeighbors, hexDist, getHexesInRadius } from '../data/constants.js';
import { TECH_TREE } from '../data/techs.js';
import { UNIT_DEFS, SIEGE_UNITS } from '../data/units.js';
import { CIV_DEFS } from '../data/civs.js';
import { calcCombatPreview } from '../engine/combat.js';
import { canUpgradeUnit } from '../engine/economy.js';
import { processResearchAndIncome, processCityTurn, expandTerritory, refreshUnits, spawnBarbarians, processBarbarians, rollRandomEvent, addLogMsg, initCityBorders } from '../engine/turnProcessing.js';
import { autoAssignTiles, isWorkableHex } from '../engine/economy.js';
import { checkVictoryState } from '../engine/victory.js';
import { SFX } from '../sfx.js';

const tryCaptureCity = (city, attackerPlayer, defenderPlayer, hex, g) => {
  defenderPlayer.cities = defenderPlayer.cities.filter(c => c.id !== city.id);
  city.hp = 10; city.hpMax = 20; city.captured = true;
  attackerPlayer.cities.push(city);
  if (hex) hex.ownerPlayerId = attackerPlayer.id;
  // Transfer border ownership and reassign tiles
  for (const hid of (city.borderHexIds || [])) {
    const bh = g.hexes[hid];
    if (bh) { bh.ownerPlayerId = attackerPlayer.id; bh.cityBorderId = city.id; }
  }
  autoAssignTiles(city, g.hexes);
  return `\u{1F3DB}${city.name} captured!`;
};

export function useGameActions({ setGs, setSelU, setSelH, setSettlerM, setNukeM, setPreview, setFlashes, setCombatAnims, turnPopupShownRef }) {

  const launchNuke = useCallback((nuId, tc, tr) => {
    setGs(prev => {
      const g = JSON.parse(JSON.stringify(prev));
      const aP = g.players.find(p => p.id === g.currentPlayerId);
      const dP = g.players.find(p => p.id !== g.currentPlayerId);
      const ni = aP.units.findIndex(u => u.id === nuId); if (ni === -1) return prev;
      aP.units.splice(ni, 1);
      // Fighter interception
      const interceptor = dP.units.find(u => {
        if (u.unitType !== "fighter" && u.unitType !== "jet_fighter") return false;
        return hexDist(u.hexCol, u.hexRow, tc, tr) <= 2;
      });
      if (interceptor) {
        addLogMsg(`\u2708 ${UNIT_DEFS[interceptor.unitType]?.name || "Fighter"} intercepts nuke at (${tc},${tr})!`, g);
        interceptor.hasAttacked = true;
        const fl = {}; fl[`${tc},${tr}`] = "combat"; setFlashes(fl);
        SFX.combat(); return g;
      }
      const blast = getHexesInRadius(tc, tr, 1, g.hexes); const fl = {};
      for (const bh of blast) {
        const k = `${bh.col},${bh.row}`; fl[k] = "nuke";
        dP.units = dP.units.filter(u => !(u.hexCol === bh.col && u.hexRow === bh.row));
        aP.units = aP.units.filter(u => !(u.hexCol === bh.col && u.hexRow === bh.row));
        g.barbarians = (g.barbarians || []).filter(b => !(b.hexCol === bh.col && b.hexRow === bh.row));
        const dc = dP.cities.find(c => { const h = g.hexes[c.hexId]; return h && h.col === bh.col && h.row === bh.row; });
        if (dc) { dc.hp = 1; addLogMsg(`\u2622 ${dc.name} hit! (${dc.hp}HP)`, g); }
      }
      addLogMsg(`\u2622 NUCLEAR STRIKE at (${tc},${tr})!`, g); setFlashes(fl); checkVictoryState(g); return g;
    });
    setNukeM(null); setSelU(null); SFX.nuke();
  }, [setGs, setFlashes, setNukeM, setSelU]);

  const doCombat = useCallback((attackerId, defCol, defRow) => {
    setGs(prev => {
      const g = JSON.parse(JSON.stringify(prev));
      const attPlayer = g.players.find(p => p.id === g.currentPlayerId);
      const defPlayer = g.players.find(p => p.id !== g.currentPlayerId);
      const attUnit = attPlayer.units.find(u => u.id === attackerId);
      if (!attUnit) return prev;
      const attDef = UNIT_DEFS[attUnit.unitType];
      const defUnit = defPlayer.units.find(u => u.hexCol === defCol && u.hexRow === defRow);
      if (!g.barbarians) g.barbarians = [];
      const barbUnit = g.barbarians.find(b => b.hexCol === defCol && b.hexRow === defRow);
      const defCity = defPlayer.cities.find(c => { const h = g.hexes[c.hexId]; return h.col === defCol && h.row === defRow; });
      const defHex = hexAt(g.hexes, defCol, defRow);
      const flashKey = `${defCol},${defRow}`;
      const defender = defUnit || barbUnit;

      if (defender) {
        const defDef = UNIT_DEFS[defender.unitType];
        const defOwner = defUnit ? defPlayer : { researchedTechs: [], civilization: "Barbarian" };
        const preview = calcCombatPreview(attUnit, attDef, defender, defDef, defHex?.terrainType, attPlayer, defOwner, !!defCity);
        const atkDmg = attDef.ability === "rapid_shot" ? Math.ceil(preview.aDmg * 1.5) : preview.aDmg;
        attUnit.hpCurrent = Math.max(0, attUnit.hpCurrent - preview.dDmg);
        defender.hpCurrent = Math.max(0, defender.hpCurrent - atkDmg);
        attUnit.hasAttacked = true;
        let msg = `${attDef.name}\u2192${barbUnit ? "Barb " : ""}${defDef.name}: ${atkDmg}dmg${attDef.ability === "rapid_shot" ? " (x1.5)" : ""}`;
        if (preview.dDmg > 0) msg += ` took ${preview.dDmg}`;

        if (defender.hpCurrent <= 0) {
          if (defUnit) defPlayer.units = defPlayer.units.filter(u => u.id !== defUnit.id);
          if (barbUnit) { g.barbarians = g.barbarians.filter(b => b.id !== barbUnit.id); attPlayer.gold += 15; }
          msg += ` \u2620${barbUnit ? "Barb +15\u{1F4B0} " : ""}${defDef.name}`;
          if (attDef.range === 0 && !preview.atkDies) {
            attUnit.hexCol = defCol; attUnit.hexRow = defRow; attUnit.movementCurrent = 0;
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
        if (preview.atkDies) { attPlayer.units = attPlayer.units.filter(u => u.id !== attUnit.id); msg += ` \u2620${attDef.name}`; }
        addLogMsg(msg, g);
      } else if (defCity) {
        const isSiege = SIEGE_UNITS.has(attUnit.unitType);
        let cityDmg = isSiege ? attDef.strength * 3 : Math.max(1, Math.floor(attDef.strength * 0.5));
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
          if (attDef.range === 0) { attUnit.hexCol = defCol; attUnit.hexRow = defRow; }
        }
        addLogMsg(msg, g);
      }

      setFlashes({ [flashKey]: "combat" });
      const defPos = hexCenter(defCol, defRow);
      const anims = []; const now = Date.now();
      if (defender) {
        const rawPv = calcCombatPreview(attUnit, attDef, defender, UNIT_DEFS[defender.unitType], defHex?.terrainType, attPlayer, defUnit ? defPlayer : { researchedTechs: [], civilization: "Barbarian" }, !!defCity);
        const atkDmgShow = attDef.ability === "rapid_shot" ? Math.ceil(rawPv.aDmg * 1.5) : rawPv.aDmg;
        anims.push({ id: now, x: defPos.x, y: defPos.y, dmg: atkDmgShow, color: "#ff4040", t: now });
        if (rawPv.dDmg > 0) { const attPos = hexCenter(attUnit.hexCol, attUnit.hexRow); anims.push({ id: now + 1, x: attPos.x, y: attPos.y, dmg: rawPv.dDmg, color: "#ff8040", t: now }); }
      } else if (defCity) {
        const isSiege2 = SIEGE_UNITS.has(attUnit.unitType);
        let cd2 = isSiege2 ? attDef.strength * 3 : Math.max(1, Math.floor(attDef.strength * 0.5));
        if (attDef.ability === "city_siege") cd2 += 3;
        anims.push({ id: now, x: defPos.x, y: defPos.y, dmg: cd2, color: "#ff4040", t: now });
        if (attDef.range === 0 && !isSiege2) {
          const attPos = hexCenter(attUnit.hexCol, attUnit.hexRow);
          anims.push({ id: now + 1, x: attPos.x, y: attPos.y, dmg: 5, color: "#ff8040", t: now });
        }
      }
      if (anims.length > 0) setCombatAnims(prev => [...prev, ...anims]);
      checkVictoryState(g);
      return g;
    });
    setSelU(null); setPreview(null); SFX.combat();
  }, [setGs, setFlashes, setCombatAnims, setSelU, setPreview]);

  const endTurn = useCallback(() => {
    let sfxQ = [];
    setGs(prev => {
      const g = JSON.parse(JSON.stringify(prev));
      const currentPlayer = g.players.find(p => p.id === g.currentPlayerId);
      processResearchAndIncome(currentPlayer, g, sfxQ);
      for (const city of currentPlayer.cities) processCityTurn(city, currentPlayer, g, sfxQ);
      expandTerritory(currentPlayer, g);
      rollRandomEvent(g, sfxQ);
      g.currentPlayerId = g.currentPlayerId === "p1" ? "p2" : "p1";
      if (g.currentPlayerId === "p1") {
        g.turnNumber++; spawnBarbarians(g); processBarbarians(g);
      }
      g.phase = "MOVEMENT";
      const nextPlayer = g.players.find(p => p.id === g.currentPlayerId);
      refreshUnits(nextPlayer, g);
      addLogMsg(`Turn ${g.turnNumber} \u2014 ${nextPlayer.name}`, g);
      checkVictoryState(g);
      return g;
    });
    setSelU(null); setSelH(null); setSettlerM(null); setNukeM(null); setPreview(null);
    if (sfxQ.length > 0) sfxQ.forEach((s, i) => setTimeout(() => SFX[s]?.(), i * 150));
    turnPopupShownRef.current = null;
  }, [setGs, setSelU, setSelH, setSettlerM, setNukeM, setPreview, turnPopupShownRef]);

  const selResearch = useCallback((techId) => {
    SFX.click();
    setGs(prev => {
      const g = JSON.parse(JSON.stringify(prev));
      const player = g.players.find(p => p.id === g.currentPlayerId);
      player.currentResearch = { techId, progress: 0 };
      addLogMsg(`${player.name} researching ${TECH_TREE[techId].name}`, g);
      return g;
    });
  }, [setGs]);

  const upgradeUnit = useCallback((unitId) => {
    setGs(prev => {
      const g = JSON.parse(JSON.stringify(prev));
      const player = g.players.find(p => p.id === g.currentPlayerId);
      const unit = player.units.find(u => u.id === unitId);
      if (!unit) return prev;
      const info = canUpgradeUnit(unit, player);
      if (!info) return prev;
      player.gold -= info.cost;
      const oldDef = UNIT_DEFS[unit.unitType];
      unit.unitType = info.toType;
      const newDef = UNIT_DEFS[info.toType];
      unit.hpCurrent = Math.ceil((unit.hpCurrent / oldDef.hp) * newDef.hp);
      unit.movementCurrent = 0; unit.hasAttacked = true;
      addLogMsg(`\u2B06 ${oldDef.name} upgraded to ${newDef.name} (-${info.cost}\u{1F4B0})`, g);
      return g;
    });
    SFX.click();
  }, [setGs]);

  const setProd = useCallback((cityId, type, itemId) => {
    setGs(prev => {
      const g = JSON.parse(JSON.stringify(prev));
      const city = g.players.find(p => p.id === g.currentPlayerId).cities.find(c => c.id === cityId);
      if (city) { city.currentProduction = { type, itemId }; city.productionProgress = 0; }
      return g;
    });
  }, [setGs]);

  const moveU = useCallback((unitId, targetCol, targetRow) => {
    setGs(prev => {
      const g = JSON.parse(JSON.stringify(prev));
      const unit = g.players.find(p => p.id === g.currentPlayerId).units.find(u => u.id === unitId);
      if (!unit) return prev;
      unit.hexCol = targetCol; unit.hexRow = targetRow; unit.movementCurrent = 0;
      return g;
    });
    setSelU(null); SFX.move();
  }, [setGs, setSelU]);

  const foundCity = useCallback((unitId, col, row) => {
    setGs(prev => {
      const g = JSON.parse(JSON.stringify(prev));
      const player = g.players.find(p => p.id === g.currentPlayerId);
      const unitIdx = player.units.findIndex(u => u.id === unitId);
      if (unitIdx === -1) return prev;
      const hex = hexAt(g.hexes, col, row);
      if (!hex || hex.terrainType === "water" || hex.terrainType === "mountain" || hex.cityId) return prev;
      // Must be at least 2 hexes from any existing city
      const tooClose = g.players.some(p => p.cities.some(c => {
        const ch = g.hexes[c.hexId];
        return ch && hexDist(col, row, ch.col, ch.row) < 2;
      }));
      if (tooClose) return prev;
      player.units.splice(unitIdx, 1);
      g.nextCityId = (g.nextCityId || 0) + 1;
      const civNames = CIV_DEFS[player.civilization]?.cityNames || ["Colony"];
      const cityName = civNames[player.cities.length] || `City ${g.nextCityId}`;
      const cityId = `${player.id}-c${g.nextCityId}`;
      const newCity = {
        id: cityId, name: cityName, hexId: hex.id, population: 1,
        districts: [], currentProduction: null, productionProgress: 0,
        foodAccumulated: 0, hp: 20, hpMax: 20,
        workedTileIds: [], borderHexIds: [],
      };
      player.cities.push(newCity);
      hex.cityId = cityId;
      initCityBorders(newCity, player, g.hexes);
      addLogMsg(`${player.name} founded ${cityName}!`, g);
      return g;
    });
    setSettlerM(null); setSelU(null); SFX.found();
  }, [setGs, setSettlerM, setSelU]);

  // Toggle a single tile's worked status (manual citizen assignment)
  const toggleTile = useCallback((cityId, hexId) => {
    setGs(prev => {
      const g = JSON.parse(JSON.stringify(prev));
      const player = g.players.find(p => p.id === g.currentPlayerId);
      const city = player?.cities.find(c => c.id === cityId);
      if (!city) return prev;
      const worked = city.workedTileIds || [];
      const idx = worked.indexOf(hexId);
      if (idx !== -1) {
        worked.splice(idx, 1);
      } else {
        if (worked.length >= city.population) return prev;
        const hex = g.hexes[hexId];
        if (!hex || !isWorkableHex(hex)) return prev;
        if (!(city.borderHexIds || []).includes(hexId)) return prev;
        worked.push(hexId);
      }
      city.workedTileIds = worked;
      city.manualTiles = true;
      return g;
    });
  }, [setGs]);

  // Auto-assign tiles prioritizing a specific yield
  const maximizeTiles = useCallback((cityId, priority) => {
    setGs(prev => {
      const g = JSON.parse(JSON.stringify(prev));
      const player = g.players.find(p => p.id === g.currentPlayerId);
      const city = player?.cities.find(c => c.id === cityId);
      if (!city) return prev;
      autoAssignTiles(city, g.hexes, priority);
      city.manualTiles = false;
      return g;
    });
  }, [setGs]);

  return { launchNuke, doCombat, endTurn, selResearch, upgradeUnit, setProd, moveU, foundCity, toggleTile, maximizeTiles };
}

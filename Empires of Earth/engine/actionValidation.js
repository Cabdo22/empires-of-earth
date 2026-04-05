import { hexAt, hexDist } from '../data/constants.js';
import { UNIT_DEFS } from '../data/units.js';
import { TECH_TREE } from '../data/techs.js';
import { getReachableHexes, getRangedTargets } from './movement.js';
import { getAvailableTechs, canUpgradeUnit } from './economy.js';

export const validateGameplayAction = (gameState, action, playerId) => {
  if (gameState.currentPlayerId !== playerId) {
    return "Not your turn";
  }

  const player = gameState.players.find(p => p.id === playerId);
  if (!player) return "Player not found";

  switch (action.type) {
    case "MOVE_UNIT": {
      const unit = player.units.find(u => u.id === action.unitId);
      if (!unit) return "Unit not found";
      if (unit.movementCurrent <= 0) return "No movement points";
      const unitDef = UNIT_DEFS[unit.unitType];
      const { reachable } = getReachableHexes(
        unit.hexCol, unit.hexRow, unit.movementCurrent,
        gameState.hexes, unitDef?.domain || "land",
        playerId, gameState.players, unitDef?.ability,
        gameState.barbarians
      );
      if (!reachable.has(`${action.col},${action.row}`)) return "Hex not reachable";
      return null;
    }
    case "ATTACK": {
      const unit = player.units.find(u => u.id === action.attackerId);
      if (!unit) return "Unit not found";
      if (unit.hasAttacked) return "Already attacked";
      const unitDef = UNIT_DEFS[unit.unitType];
      if (unitDef.range > 0) {
        const targets = getRangedTargets(unit.hexCol, unit.hexRow, unitDef.range, gameState.hexes);
        if (!targets.has(`${action.col},${action.row}`)) return "Target not in range";
      } else {
        if (unit.movementCurrent <= 0) return "No movement points for melee";
        if (hexDist(unit.hexCol, unit.hexRow, action.col, action.row) > 1) return "Target not adjacent";
      }
      return null;
    }
    case "LAUNCH_NUKE": {
      const nuke = player.units.find(u => u.id === action.nukeId);
      if (!nuke) return "Nuke not found";
      if (nuke.unitType !== "nuke" && nuke.unitType !== "icbm") return "Not a nuke";
      const nukeDef = UNIT_DEFS[nuke.unitType];
      const targets = getRangedTargets(nuke.hexCol, nuke.hexRow, nukeDef?.range || 12, gameState.hexes);
      if (!targets.has(`${action.col},${action.row}`)) return "Target not in range";
      return null;
    }
    case "SELECT_RESEARCH": {
      if (player.currentResearch) return "Already researching";
      const tech = TECH_TREE[action.techId];
      if (!tech) return "Tech not found";
      if (player.researchedTechs.includes(action.techId)) return "Already researched";
      const available = getAvailableTechs(player);
      if (!available.some(t => t.id === action.techId)) return "Prerequisites not met";
      return null;
    }
    case "SET_PRODUCTION": {
      const city = player.cities.find(c => c.id === action.cityId);
      if (!city) return "City not found";
      return null;
    }
    case "UPGRADE_UNIT": {
      const unit = player.units.find(u => u.id === action.unitId);
      if (!unit) return "Unit not found";
      if (!canUpgradeUnit(unit, player)) return "Cannot upgrade";
      return null;
    }
    case "FOUND_CITY": {
      const unit = player.units.find(u => u.id === action.unitId);
      if (!unit) return "Unit not found";
      if (unit.unitType !== "settler") return "Not a settler";
      const hex = hexAt(gameState.hexes, action.col, action.row);
      if (!hex || hex.terrainType === "water" || hex.terrainType === "mountain" || hex.cityId) return "Invalid location";
      return null;
    }
    case "CANCEL_PRODUCTION": {
      const city = player.cities.find(c => c.id === action.cityId);
      if (!city) return "City not found";
      return null;
    }
    case "END_TURN":
      return null;
    default:
      return "Unknown action type";
  }
};

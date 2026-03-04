// ============================================================
// COMBAT ENGINE
// ============================================================

import { TERRAIN_INFO } from '../data/terrain.js';
import { UNIT_DEFS } from '../data/units.js';
import { TECH_TREE } from '../data/techs.js';
import { ERA_IDX } from '../data/techs.js';
import { CITY_DEF_BONUS } from '../data/constants.js';

// Highest era a player has researched (for era-advantage bonus)
export const getPlayerMaxEra = (player) => {
  let maxEra = 0;
  for (const techId of player.researchedTechs) {
    const tech = TECH_TREE[techId];
    if (tech) maxEra = Math.max(maxEra, ERA_IDX[tech.era] || 0);
  }
  return maxEra;
};

// Calculate combat damage preview between two units
export const calcCombatPreview = (attUnit, attDef, defUnit, defDef, defTerrain, attPlayer, defPlayer, inCity) => {
  let attStr = attDef.strength;
  let defStr = defDef.strength;

  // Terrain and city defense bonuses
  if (defTerrain && TERRAIN_INFO[defTerrain]) defStr += TERRAIN_INFO[defTerrain].defBonus;
  if (inCity) defStr += CITY_DEF_BONUS;

  // Era advantage: +1 str for the more advanced player
  const attEra = getPlayerMaxEra(attPlayer);
  const defEra = getPlayerMaxEra(defPlayer);
  if (attEra > defEra) attStr += 1;
  if (defEra > attEra) defStr += 1;

  // Steelworking bonus for melee units
  if (attPlayer.researchedTechs.includes("steelworking") && attDef.range === 0) attStr += 1;
  if (defPlayer.researchedTechs.includes("steelworking") && defDef.range === 0) defStr += 1;

  // Aztec melee bonus
  if (attPlayer.civilization === "Aztec" && attDef.range === 0) attStr += 1;
  if (defPlayer.civilization === "Aztec" && defDef.range === 0) defStr += 1;

  // Ottoman siege bonus
  const siegeTypes = ["catapult", "great_bombard", "battleship"];
  if (attPlayer.civilization === "Ottoman" && siegeTypes.includes(attUnit.unitType)) attStr += 1;
  if (defPlayer.civilization === "Ottoman" && siegeTypes.includes(defUnit.unitType)) defStr += 1;

  // Damage formula: attacker deals (str*3 - enemy str), ranged units take no counter-damage
  const attackDmg = Math.max(1, Math.round(attStr * 3 - defStr));
  const counterDmg = attDef.range > 0 ? 0 : Math.max(1, Math.round(defStr * 2 - attStr));

  return {
    aDmg: attackDmg,
    dDmg: counterDmg,
    aStr: attStr,
    dStr: defStr,
    defDies: defUnit.hpCurrent - attackDmg <= 0,
    atkDies: attUnit.hpCurrent - counterDmg <= 0,
  };
};

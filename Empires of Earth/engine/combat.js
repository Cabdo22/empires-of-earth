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
  const aMods = [];
  const dMods = [];
  const dmgMods = []; // percentage-based damage reductions on defender

  // Terrain and city defense bonuses
  if (defTerrain && TERRAIN_INFO[defTerrain] && TERRAIN_INFO[defTerrain].defBonus) {
    const bonus = TERRAIN_INFO[defTerrain].defBonus;
    defStr += bonus;
    dMods.push({ label: `${TERRAIN_INFO[defTerrain].label} defense`, value: bonus });
  }
  if (inCity) {
    defStr += CITY_DEF_BONUS;
    dMods.push({ label: "City walls", value: CITY_DEF_BONUS });
    // Masonry: +2 city defense
    if (defPlayer.researchedTechs.includes("masonry")) {
      defStr += 2;
      dMods.push({ label: "Masonry", value: 2 });
    }
  }

  // Era advantage: +1 str for the more advanced player
  const attEra = getPlayerMaxEra(attPlayer);
  const defEra = getPlayerMaxEra(defPlayer);
  if (attEra > defEra) { attStr += 1; aMods.push({ label: "Era advantage", value: 1 }); }
  if (defEra > attEra) { defStr += 1; dMods.push({ label: "Era advantage", value: 1 }); }

  // Steelworking bonus for melee units
  if (attPlayer.researchedTechs.includes("steelworking") && attDef.range === 0) { attStr += 1; aMods.push({ label: "Steelworking", value: 1 }); }
  if (defPlayer.researchedTechs.includes("steelworking") && defDef.range === 0) { defStr += 1; dMods.push({ label: "Steelworking", value: 1 }); }

  // Fortification bonus for ranged units
  if (attPlayer.researchedTechs.includes("fortification") && attDef.range > 0) { attStr += 1; aMods.push({ label: "Fortification", value: 1 }); }
  if (defPlayer.researchedTechs.includes("fortification") && defDef.range > 0) { defStr += 1; dMods.push({ label: "Fortification", value: 1 }); }

  // Cybernetics bonus for all units
  if (attPlayer.researchedTechs.includes("cybernetics")) { attStr += 2; aMods.push({ label: "Cybernetics", value: 2 }); }
  if (defPlayer.researchedTechs.includes("cybernetics")) { defStr += 2; dMods.push({ label: "Cybernetics", value: 2 }); }

  // Aztec melee bonus
  if (attPlayer.civilization === "Aztec" && attDef.range === 0) { attStr += 1; aMods.push({ label: "Aztec melee", value: 1 }); }
  if (defPlayer.civilization === "Aztec" && defDef.range === 0) { defStr += 1; dMods.push({ label: "Aztec melee", value: 1 }); }

  // Ottoman siege bonus
  const siegeTypes = ["catapult", "great_bombard", "battleship"];
  if (attPlayer.civilization === "Ottoman" && siegeTypes.includes(attUnit.unitType)) { attStr += 1; aMods.push({ label: "Ottoman siege", value: 1 }); }
  if (defPlayer.civilization === "Ottoman" && siegeTypes.includes(defUnit.unitType)) { defStr += 1; dMods.push({ label: "Ottoman siege", value: 1 }); }

  // Damage formula: attacker deals (str*3 - enemy str), ranged units take no counter-damage
  let attackDmg = Math.max(1, Math.round(attStr * 3 - defStr));
  const counterDmg = attDef.range > 0 ? 0 : Math.max(1, Math.round(defStr * 2 - attStr));

  // Percentage-based defense: city 25% reduction, forest 15% reduction
  if (inCity) {
    attackDmg = Math.max(1, Math.round(attackDmg * 0.75));
    dmgMods.push({ label: "City walls", value: "-25%" });
  } else if (defTerrain === "forest") {
    attackDmg = Math.max(1, Math.round(attackDmg * 0.85));
    dmgMods.push({ label: "Forest cover", value: "-15%" });
  }

  return {
    aDmg: attackDmg,
    dDmg: counterDmg,
    aStr: attStr,
    dStr: defStr,
    aMaxHp: attDef.hp,
    dMaxHp: defDef.hp,
    aMods,
    dMods,
    dmgMods,
    defDies: defUnit.hpCurrent - attackDmg <= 0,
    atkDies: attUnit.hpCurrent - counterDmg <= 0,
  };
};

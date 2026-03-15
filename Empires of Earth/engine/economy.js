// ============================================================
// ECONOMY ENGINE — tile-based yields, tech availability, unit/district production
// ============================================================

import { TERRAIN_INFO, RESOURCE_INFO } from '../data/terrain.js';
import { TECH_TREE } from '../data/techs.js';
import { UNIT_DEFS, MILITARY_REQ_UNITS, UPGRADE_PATHS } from '../data/units.js';
import { DISTRICT_DEFS } from '../data/districts.js';
import { hexAt, getNeighbors } from '../data/constants.js';

// ---- Tile yield helpers ----

// Get yields for a single hex based on terrain + resource
export const getHexYields = (hex) => {
  if (!hex) return { food: 0, production: 0, gold: 0, science: 0 };
  const terrain = TERRAIN_INFO[hex.terrainType];
  if (!terrain) return { food: 0, production: 0, gold: 0, science: 0 };

  // Mountains are unworkable
  if (hex.terrainType === "mountain") return { food: 0, production: 0, gold: 0, science: 0 };
  // Deep water (non-coastal) is unworkable
  if (hex.terrainType === "water" && !hex.isCoastal) return { food: 0, production: 0, gold: 0, science: 0 };

  let food = terrain.food || 0;
  let production = terrain.prod || 0;
  let gold = terrain.gold || 0;
  let science = terrain.science || 0;

  // Resource bonuses
  if (hex.resource && RESOURCE_INFO[hex.resource]) {
    const bonus = RESOURCE_INFO[hex.resource].bonus;
    food += (bonus.food || 0);
    production += (bonus.prod || 0);
    gold += (bonus.gold || 0);
    science += (bonus.science || 0);
  }

  return { food, production, gold, science };
};

// Whether a hex can be worked by a citizen
export const isWorkableHex = (hex) => {
  if (!hex) return false;
  if (hex.terrainType === "mountain") return false;
  if (hex.terrainType === "water" && !hex.isCoastal) return false;
  return true;
};

// Auto-assign citizens to the highest-yield tiles in city borders
export const autoAssignTiles = (city, hexes) => {
  const workable = (city.borderHexIds || [])
    .filter(hid => hid !== city.hexId && isWorkableHex(hexes[hid]))
    .map(hid => {
      const y = getHexYields(hexes[hid]);
      return { hid, total: y.food + y.production + y.gold };
    })
    .sort((a, b) => b.total - a.total);

  // Pop N = city center (always worked) + N adjacent tiles
  const slots = city.population || 1;
  city.workedTileIds = workable.slice(0, slots).map(w => w.hid);
};

// ---- City yield calculation (tile-based) ----

export const calcCityYields = (city, player, hexes) => {
  const cityHex = hexes[city.hexId];

  // Start with city center tile yields
  const centerY = getHexYields(cityHex);
  let food = centerY.food;
  let prod = centerY.production;
  let gold = centerY.gold;
  let science = 1 + centerY.science; // base 1 science per city + tile science

  // Base city infrastructure output
  prod += 2;
  science += 3;

  // Population scaling — citizens contribute labor and knowledge
  prod += (city.population || 1);
  science += Math.floor((city.population || 1) / 2);

  // Add worked tile yields
  for (const tileId of (city.workedTileIds || [])) {
    const tileY = getHexYields(hexes[tileId]);
    food += tileY.food;
    prod += tileY.production;
    gold += tileY.gold;
    science += tileY.science;
  }

  // Coastal adjacency bonus: +1 food if city hex is adjacent to water
  const neighbors = getNeighbors(cityHex.col, cityHex.row);
  const adjacentWater = neighbors.some(([nc, nr]) => {
    const nh = hexAt(hexes, nc, nr);
    return nh?.terrainType === "water";
  });
  if (adjacentWater) food += 1;

  // Civilization bonuses
  if (player.civilization === "Rome") prod += 1;
  if (player.civilization === "China") science += 1;
  if (player.civilization === "Egypt" && cityHex.terrainType === "grassland") food += 1;
  if (player.civilization === "America") gold += 1;

  // England: +1 gold from adjacent water
  if (player.civilization === "England" && adjacentWater) gold += 1;

  // Tech bonuses
  if (player.researchedTechs.includes("agriculture") && cityHex.terrainType === "grassland") food += 2;
  if (player.researchedTechs.includes("mysticism")) science += 2;
  if (player.researchedTechs.includes("engineering")) prod += 2;
  if (player.researchedTechs.includes("guilds")) gold += 3;
  if (player.researchedTechs.includes("pottery")) gold += 1;
  if (player.researchedTechs.includes("currency")) gold += Math.floor((city.population || 1) / 2);
  if (player.researchedTechs.includes("telecommunications")) science += 3;
  if (player.researchedTechs.includes("fusion_power")) science += 5;
  if (player.researchedTechs.includes("space_program")) science += 4;

  // District bonuses
  for (const districtId of city.districts) {
    const def = DISTRICT_DEFS[districtId];
    if (def?.effects) {
      food += (def.effects.food || 0);
      prod += (def.effects.production || 0);
      science += (def.effects.science || 0);
      gold += (def.effects.gold || 0);
    }
  }

  // France: +1 science & +1 gold from cities with Library or Market
  if (player.civilization === "France") {
    if (city.districts.includes("library")) { science += 1; gold += 1; }
    if (city.districts.includes("market")) { science += 1; gold += 1; }
  }
  // Germany: +1 production in cities with Workshop
  if (player.civilization === "Germany" && city.districts.includes("workshop")) prod += 1;
  // Ottoman: +1 gold from captured cities
  if (player.civilization === "Ottoman" && city.captured) gold += 1;

  return { food, production: prod, science, gold };
};

// Sum all city yields for a player
export const calcPlayerIncome = (player, hexes) => {
  let food = 0, production = 0, science = 0, gold = 0;
  for (const city of player.cities) {
    const yields = calcCityYields(city, player, hexes);
    food += yields.food;
    production += yields.production;
    science += yields.science;
    gold += yields.gold;
  }
  return { food, production, science, gold };
};

// Techs available for research (supports prereqMin for "N of M" gating)
export const getAvailableTechs = (player) =>
  Object.values(TECH_TREE).filter(t => {
    if (player.researchedTechs.includes(t.id)) return false;
    if (t.prereqs.length === 0) return true;
    const met = t.prereqs.filter(p => player.researchedTechs.includes(p)).length;
    const needed = t.prereqMin || t.prereqs.length;
    return met >= needed;
  });

// Check if a city has access to a strategic resource
export const cityHasResource = (city, hexes, resourceType) => {
  if (resourceType === "uranium") {
    // Uranium: just needs to be inside city borders (mountains are unworkable but count as territory)
    for (const hid of (city.borderHexIds || [])) {
      if (hexes[hid]?.resource === "uranium") return true;
    }
    return false;
  }
  // Iron/Oil: must be city center or actively worked tile
  const centerHex = hexes[city.hexId];
  if (centerHex?.resource === resourceType) return true;
  for (const tileId of (city.workedTileIds || [])) {
    if (hexes[tileId]?.resource === resourceType) return true;
  }
  return false;
};

// Units available for production in a city
export const getAvailableUnits = (player, city, hexes) => {
  const hasNuclearDistrict = city ? city.districts.includes("nuclear") : false;
  const hasMilitaryDistrict = city ? city.districts.includes("military") : false;

  const replacedByUnique = new Set();
  for (const [, u] of Object.entries(UNIT_DEFS)) {
    if (u.civReq === player.civilization && u.replaces) replacedByUnique.add(u.replaces);
  }

  return Object.entries(UNIT_DEFS)
    .filter(([id, u]) => {
      if (u.techReq && !player.researchedTechs.includes(u.techReq)) return false;
      if (u.resourceReq && hexes && !cityHasResource(city, hexes, u.resourceReq)) return false;
      if (id === "nuke") return hasNuclearDistrict && player.gold >= 50;
      if (MILITARY_REQ_UNITS.has(id) && !hasMilitaryDistrict) return false;
      if (replacedByUnique.has(id)) return false;
      if (u.civReq && u.civReq !== player.civilization) return false;
      return true;
    })
    .map(([id, u]) => ({ id, ...u }));
};

// Upgrade cost and availability
export const getUpgradeCost = (fromType) => {
  const from = UNIT_DEFS[fromType];
  const to = UNIT_DEFS[UPGRADE_PATHS[fromType]];
  if (!from || !to) return 0;
  return Math.max(8, Math.floor((to.cost - from.cost) * 1.5));
};

export const canUpgradeUnit = (unit, player) => {
  const toType = UPGRADE_PATHS[unit.unitType];
  if (!toType) return null;
  const toDef = UNIT_DEFS[toType];
  if (!toDef) return null;
  if (toDef.techReq && !player.researchedTechs.includes(toDef.techReq)) return null;
  if (toDef.civReq && toDef.civReq !== player.civilization) return null;
  const cost = getUpgradeCost(unit.unitType);
  if (player.gold < cost) return null;
  return { toType, toDef, cost };
};

// Districts available for building in a city
export const getAvailableDistricts = (player, city) =>
  Object.entries(DISTRICT_DEFS)
    .filter(([id, d]) => !city.districts.includes(id) && (!d.techReq || player.researchedTechs.includes(d.techReq)))
    .map(([id, d]) => ({ id, ...d }));

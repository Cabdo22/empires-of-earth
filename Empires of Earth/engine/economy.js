// ============================================================
// ECONOMY ENGINE — tile-based yields, tech availability, unit/district production
// ============================================================

import { TERRAIN_INFO, RESOURCE_INFO } from '../data/terrain.js';
import { TECH_TREE } from '../data/techs.js';
import { UNIT_DEFS, MILITARY_REQ_UNITS, UPGRADE_PATHS } from '../data/units.js';
import { DISTRICT_DEFS } from '../data/districts.js';
import { hexAt, getNeighbors, TRADE_FOCUS, TRADE_DISTANCE_BONUS_PER, FOREIGN_TRADE_MULTIPLIER } from '../data/constants.js';

// ---- Tile yield helpers ----

// Check if a player has discovered a resource type via tech
export const isResourceDiscovered = (resourceType, player) => {
  const info = RESOURCE_INFO[resourceType];
  if (!info) return false;
  if (!info.techReq) return true;
  return player?.researchedTechs?.includes(info.techReq) ?? false;
};

// Get yields for a single hex based on terrain + resource
// If player is provided, only include discovered resource bonuses
export const getHexYields = (hex, player) => {
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

  // Resource bonuses (only if discovered or no player context)
  if (hex.resource && RESOURCE_INFO[hex.resource]) {
    if (!player || isResourceDiscovered(hex.resource, player)) {
      const bonus = RESOURCE_INFO[hex.resource].bonus;
      food += (bonus.food || 0);
      production += (bonus.prod || 0);
      gold += (bonus.gold || 0);
      science += (bonus.science || 0);
    }
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
// priority: null (balanced), "food", "production", "gold", or "science"
export const autoAssignTiles = (city, hexes, priority = null) => {
  const workable = (city.borderHexIds || [])
    .filter(hid => hid !== city.hexId && isWorkableHex(hexes[hid]))
    .map(hid => {
      const y = getHexYields(hexes[hid]);
      return { hid, food: y.food, production: y.production, gold: y.gold, science: y.science,
               total: y.food + y.production + y.gold + y.science };
    })
    .sort((a, b) => {
      if (priority && a[priority] !== b[priority]) return b[priority] - a[priority];
      return b.total - a.total;
    });

  // Pop N = city center (always worked) + N adjacent tiles
  const slots = city.population || 1;
  city.workedTileIds = workable.slice(0, slots).map(w => w.hid);
};

// ---- City yield calculation (tile-based) ----

export const calcCityYields = (city, player, hexes) => {
  const cityHex = hexes[city.hexId];

  // Start with city center tile yields
  const centerY = getHexYields(cityHex, player);
  let food = centerY.food;
  let prod = centerY.production;
  let gold = centerY.gold;
  let science = 2 + centerY.science; // base 2 science per city + tile science

  // Base city infrastructure output
  food += 2;
  prod += 3;
  science += 4;

  // Population scaling — citizens contribute labor and knowledge
  prod += (city.population || 1);
  science += Math.ceil((city.population || 1) * 0.75);

  // Add worked tile yields
  for (const tileId of (city.workedTileIds || [])) {
    const tileY = getHexYields(hexes[tileId], player);
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

  // Trade route yields
  const tradeY = calcTradeYields(city);
  food += tradeY.food;
  prod += tradeY.production;
  gold += tradeY.gold;
  science += tradeY.science;

  return { food, production: prod, science, gold };
};

// Calculate trade yields for a city from its trade routes
export const calcTradeYields = (city) => {
  let food = 0, production = 0, gold = 0, science = 0;

  for (const route of (city.tradeRoutes || [])) {
    const focus = TRADE_FOCUS[route.focus] || TRADE_FOCUS.merchant;
    let rFood = focus.food;
    let rProd = focus.production;
    let rGold = focus.gold;
    let rSci = focus.science;

    // Distance bonus: +1 gold per N hexes
    rGold += Math.floor(route.distance / TRADE_DISTANCE_BONUS_PER);

    // Foreign trade multiplier
    if (route.isInternational) {
      rFood = Math.floor(rFood * FOREIGN_TRADE_MULTIPLIER);
      rProd = Math.floor(rProd * FOREIGN_TRADE_MULTIPLIER);
      rGold = Math.floor(rGold * FOREIGN_TRADE_MULTIPLIER);
      rSci = Math.floor(rSci * FOREIGN_TRADE_MULTIPLIER);
    }

    food += rFood;
    production += rProd;
    gold += rGold;
    science += rSci;
  }

  // District trade multipliers (applied to trade gold)
  let tradeGoldMultiplier = 1.0;
  if (city.districts.includes("market")) tradeGoldMultiplier += 0.5;
  if (city.districts.includes("bank")) tradeGoldMultiplier += 0.25;
  gold = Math.floor(gold * tradeGoldMultiplier);

  return { food, production, gold, science };
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

// Direct resource check for a single city (no network sharing)
const directCityHasResource = (city, hexes, resourceType) => {
  if (resourceType === "uranium") {
    for (const hid of (city.borderHexIds || [])) {
      if (hexes[hid]?.resource === "uranium") return true;
    }
    return false;
  }
  const centerHex = hexes[city.hexId];
  if (centerHex?.resource === resourceType) return true;
  for (const tileId of (city.workedTileIds || [])) {
    if (hexes[tileId]?.resource === resourceType) return true;
  }
  return false;
};

// Check if a city has access to a strategic resource (includes trade network sharing)
export const cityHasResource = (city, hexes, resourceType, player) => {
  // Resource must be discovered first
  if (player && !isResourceDiscovered(resourceType, player)) return false;
  if (directCityHasResource(city, hexes, resourceType)) return true;
  // Resource sharing: BFS through domestic trade routes
  if (!player) return false;
  const visited = new Set([city.id]);
  const queue = [city.id];
  while (queue.length > 0) {
    const cid = queue.shift();
    const c = player.cities.find(cc => cc.id === cid);
    if (!c) continue;
    for (const route of (c.tradeRoutes || [])) {
      if (route.isInternational || visited.has(route.targetCityId)) continue;
      const targetCity = player.cities.find(cc => cc.id === route.targetCityId);
      if (!targetCity) continue;
      visited.add(route.targetCityId);
      if (directCityHasResource(targetCity, hexes, resourceType)) return true;
      queue.push(route.targetCityId);
    }
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
      if (u.resourceReq && hexes && !cityHasResource(city, hexes, u.resourceReq, player)) return false;
      if (u.domain === "sea" && (!city || !city.districts.includes("port"))) return false;
      if (id === "settler" && city && (city.population || 1) < 2) return false;
      if (id === "nuke" || id === "icbm") return hasNuclearDistrict && player.gold >= 50;
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
export const getAvailableDistricts = (player, city, hexes) =>
  Object.entries(DISTRICT_DEFS)
    .filter(([id, d]) => {
      if (city.districts.includes(id)) return false;
      if (d.techReq && !player.researchedTechs.includes(d.techReq)) return false;
      // Port requires coastal water hex in city borders
      if (id === "port" && hexes) {
        const hasCoastal = (city.borderHexIds || []).some(hid => {
          const h = hexes[hid];
          return h && h.terrainType === "water" && h.isCoastal;
        });
        if (!hasCoastal) return false;
      }
      return true;
    })
    .map(([id, d]) => ({ id, ...d }));

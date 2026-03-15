// ============================================================
// UNIT DEFINITIONS
// ============================================================

export const UNIT_DEFS = {
  // Base units
  scout:            { name: "Scout",            icon: "👁",    strength: 1, hp: 10, move: 3, range: 0, cost: 8,   techReq: null,               domain: "land" },
  warrior:          { name: "Warrior",          icon: "🛡",    strength: 2, hp: 15, move: 2, range: 0, cost: 10,  techReq: null,               domain: "land" },
  settler:          { name: "Settler",          icon: "🏕",    strength: 0, hp: 10, move: 2, range: 0, cost: 19,  techReq: null,               domain: "land" },
  archer:           { name: "Archer",           icon: "🏹",    strength: 2, hp: 12, move: 2, range: 2, cost: 12,  techReq: "hunting",          domain: "land" },
  swordsman:        { name: "Swordsman",        icon: "⚔",    strength: 4, hp: 20, move: 2, range: 0, cost: 15,  techReq: "bronze_working",   domain: "land", resourceReq: "iron" },
  knight:           { name: "Knight",           icon: "🐴",    strength: 3, hp: 18, move: 3, range: 0, cost: 17,  techReq: "feudalism",        domain: "land", resourceReq: "iron" },
  catapult:         { name: "Catapult",         icon: "🪨",    strength: 3, hp: 10, move: 1, range: 3, cost: 17,  techReq: "machinery",        domain: "land" },
  musketman:        { name: "Musketman",        icon: "🔫",    strength: 5, hp: 20, move: 2, range: 0, cost: 18,  techReq: "gunpowder",        domain: "land" },
  tank:             { name: "Tank",             icon: "🔩",    strength: 6, hp: 25, move: 3, range: 0, cost: 25,  techReq: "electronics",      domain: "land", resourceReq: "oil" },
  modern_infantry:  { name: "Modern Infantry",  icon: "🎖",    strength: 5, hp: 22, move: 2, range: 0, cost: 21,  techReq: "ai_governance",    domain: "amphibious" },
  artillery:        { name: "Artillery",        icon: "💥",    strength: 5, hp: 14, move: 1, range: 4, cost: 22,  techReq: "ballistics",       domain: "land" },
  mech:             { name: "Mech",             icon: "🤖",    strength: 8, hp: 30, move: 3, range: 0, cost: 33,  techReq: "nanotech",         domain: "amphibious" },
  nuke:             { name: "Nuke",             icon: "☢",    strength: 99, hp: 1, move: 0, range: 3, cost: 55,  techReq: "quantum_computing", domain: "special", resourceReq: "uranium" },

  // Naval units
  galley:           { name: "Galley",           icon: "⛵",    strength: 2, hp: 15, move: 3, range: 0, cost: 12,  techReq: "steam_power",  domain: "sea", resourceReq: "oil" },
  destroyer:        { name: "Destroyer",        icon: "🚢",    strength: 5, hp: 22, move: 4, range: 0, cost: 21,  techReq: "combustion",   domain: "sea", resourceReq: "oil" },
  battleship:       { name: "Battleship",       icon: "⚓",    strength: 6, hp: 28, move: 3, range: 3, cost: 30,  techReq: "combustion",   domain: "sea", resourceReq: "oil" },

  // Air units
  fighter:          { name: "Fighter",          icon: "✈",    strength: 4, hp: 18, move: 5, range: 0, cost: 21,  techReq: "aviation", domain: "air", resourceReq: "oil" },
  bomber:           { name: "Bomber",           icon: "💣",    strength: 5, hp: 16, move: 4, range: 3, cost: 25,  techReq: "aviation", domain: "air", resourceReq: "oil" },

  // Unique civ units
  legionary:        { name: "Legionary",        icon: "⚔",    strength: 4, hp: 24, move: 2, range: 0, cost: 15,  techReq: "bronze_working", domain: "land",      civReq: "Rome",    replaces: "swordsman", resourceReq: "iron" },
  chu_ko_nu:        { name: "Chu-Ko-Nu",        icon: "🏹",    strength: 3, hp: 12, move: 2, range: 2, cost: 12,  techReq: "hunting",        domain: "land",      civReq: "China",   replaces: "archer",   ability: "rapid_shot" },
  war_chariot:      { name: "War Chariot",      icon: "🐴",    strength: 3, hp: 18, move: 3, range: 0, cost: 13,  techReq: "feudalism",      domain: "land",      civReq: "Egypt",   replaces: "knight", resourceReq: "iron" },
  jaguar:           { name: "Jaguar Warrior",   icon: "🐆",    strength: 2, hp: 18, move: 2, range: 0, cost: 10,  techReq: null,             domain: "land",      civReq: "Aztec",   replaces: "warrior",  ability: "heal_on_kill" },
  marine:           { name: "Marine",           icon: "⚓",    strength: 5, hp: 22, move: 3, range: 0, cost: 21,  techReq: "ai_governance",  domain: "amphibious", civReq: "America", replaces: "modern_infantry", ability: "water_speed" },
  man_o_war:        { name: "Man-o-War",        icon: "🏴‍☠️",  strength: 6, hp: 22, move: 4, range: 2, cost: 21,  techReq: "combustion",     domain: "sea",       civReq: "England", replaces: "destroyer", resourceReq: "oil" },
  musketeer:        { name: "Musketeer",        icon: "🔫",    strength: 6, hp: 20, move: 2, range: 0, cost: 18,  techReq: "gunpowder",      domain: "land",      civReq: "France",  replaces: "musketman", ability: "forest_move" },
  panzer:           { name: "Panzer",           icon: "🔩",    strength: 7, hp: 25, move: 4, range: 0, cost: 25,  techReq: "electronics",    domain: "land",      civReq: "Germany", replaces: "tank", resourceReq: "oil" },
  great_bombard:    { name: "Great Bombard",    icon: "💥",    strength: 4, hp: 10, move: 1, range: 3, cost: 17,  techReq: "machinery",      domain: "land",      civReq: "Ottoman", replaces: "catapult", ability: "city_siege" },
};

// Units requiring Military district to produce
export const MILITARY_REQ_UNITS = new Set([
  "tank", "modern_infantry", "artillery", "mech", "fighter", "bomber", "panzer", "marine"
]);

// Siege units — deal full damage to cities
export const SIEGE_UNITS = new Set([
  "catapult", "great_bombard", "artillery", "battleship", "man_o_war", "bomber"
]);

// Unit upgrade paths: base unit → upgraded unit
export const UPGRADE_PATHS = {
  warrior: "swordsman", swordsman: "musketman", musketman: "modern_infantry",
  archer: "catapult", catapult: "artillery",
  scout: "knight", knight: "tank", tank: "mech",
  galley: "destroyer", destroyer: "battleship",
  // Unique units follow the same path as their base
  jaguar: "swordsman", legionary: "musketman",
  chu_ko_nu: "catapult", war_chariot: "tank",
  musketeer: "modern_infantry", marine: "mech",
  panzer: "mech", man_o_war: "battleship", great_bombard: "artillery",
};

// Barbarian unit types (scale with game progression)
export const BARB_UNITS = ["warrior", "archer", "swordsman"];

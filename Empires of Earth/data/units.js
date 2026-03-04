// ============================================================
// UNIT DEFINITIONS
// ============================================================

export const UNIT_DEFS = {
  // Base units
  scout:            { name: "Scout",            icon: "👁",    strength: 1, hp: 10, move: 3, range: 0, cost: 3,  techReq: null,               domain: "land" },
  warrior:          { name: "Warrior",          icon: "🛡",    strength: 2, hp: 15, move: 2, range: 0, cost: 4,  techReq: null,               domain: "land" },
  settler:          { name: "Settler",          icon: "🏕",    strength: 0, hp: 10, move: 2, range: 0, cost: 6,  techReq: null,               domain: "land" },
  archer:           { name: "Archer",           icon: "🏹",    strength: 2, hp: 12, move: 2, range: 2, cost: 5,  techReq: "hunting",          domain: "land" },
  swordsman:        { name: "Swordsman",        icon: "⚔",    strength: 4, hp: 20, move: 2, range: 0, cost: 6,  techReq: "bronze_working",   domain: "land" },
  knight:           { name: "Knight",           icon: "🐴",    strength: 3, hp: 18, move: 3, range: 0, cost: 7,  techReq: "feudalism",        domain: "land" },
  catapult:         { name: "Catapult",         icon: "🪨",    strength: 3, hp: 10, move: 1, range: 3, cost: 7,  techReq: "machinery",        domain: "land" },
  musketman:        { name: "Musketman",        icon: "🔫",    strength: 5, hp: 20, move: 2, range: 0, cost: 7,  techReq: "gunpowder",        domain: "land" },
  tank:             { name: "Tank",             icon: "🔩",    strength: 6, hp: 25, move: 3, range: 0, cost: 10, techReq: "electronics",      domain: "land" },
  modern_infantry:  { name: "Modern Infantry",  icon: "🎖",    strength: 5, hp: 22, move: 2, range: 0, cost: 8,  techReq: "ai_governance",    domain: "amphibious" },
  artillery:        { name: "Artillery",        icon: "💥",    strength: 5, hp: 14, move: 1, range: 4, cost: 9,  techReq: "ballistics",       domain: "land" },
  mech:             { name: "Mech",             icon: "🤖",    strength: 8, hp: 30, move: 3, range: 0, cost: 14, techReq: "nanotech",         domain: "amphibious" },
  nuke:             { name: "Nuke",             icon: "☢",    strength: 99, hp: 1, move: 0, range: 3, cost: 25, techReq: "quantum_computing", domain: "special" },

  // Naval units
  galley:           { name: "Galley",           icon: "⛵",    strength: 2, hp: 15, move: 3, range: 0, cost: 5,  techReq: "steam_power",  domain: "sea" },
  destroyer:        { name: "Destroyer",        icon: "🚢",    strength: 5, hp: 22, move: 4, range: 0, cost: 8,  techReq: "combustion",   domain: "sea" },
  battleship:       { name: "Battleship",       icon: "⚓",    strength: 6, hp: 28, move: 3, range: 3, cost: 12, techReq: "combustion",   domain: "sea" },

  // Air units
  fighter:          { name: "Fighter",          icon: "✈",    strength: 4, hp: 18, move: 5, range: 0, cost: 8,  techReq: "aviation", domain: "air" },
  bomber:           { name: "Bomber",           icon: "💣",    strength: 5, hp: 16, move: 4, range: 3, cost: 10, techReq: "aviation", domain: "air" },

  // Unique civ units
  legionary:        { name: "Legionary",        icon: "⚔",    strength: 4, hp: 24, move: 2, range: 0, cost: 6,  techReq: "bronze_working", domain: "land",      civReq: "Rome",    replaces: "swordsman" },
  chu_ko_nu:        { name: "Chu-Ko-Nu",        icon: "🏹",    strength: 3, hp: 12, move: 2, range: 2, cost: 5,  techReq: "hunting",        domain: "land",      civReq: "China",   replaces: "archer",   ability: "rapid_shot" },
  war_chariot:      { name: "War Chariot",      icon: "🐴",    strength: 3, hp: 18, move: 3, range: 0, cost: 5,  techReq: "feudalism",      domain: "land",      civReq: "Egypt",   replaces: "knight" },
  jaguar:           { name: "Jaguar Warrior",   icon: "🐆",    strength: 2, hp: 18, move: 2, range: 0, cost: 4,  techReq: null,             domain: "land",      civReq: "Aztec",   replaces: "warrior",  ability: "heal_on_kill" },
  marine:           { name: "Marine",           icon: "⚓",    strength: 5, hp: 22, move: 3, range: 0, cost: 8,  techReq: "ai_governance",  domain: "amphibious", civReq: "America", replaces: "modern_infantry", ability: "water_speed" },
  man_o_war:        { name: "Man-o-War",        icon: "🏴‍☠️",  strength: 6, hp: 22, move: 4, range: 2, cost: 8,  techReq: "combustion",     domain: "sea",       civReq: "England", replaces: "destroyer" },
  musketeer:        { name: "Musketeer",        icon: "🔫",    strength: 6, hp: 20, move: 2, range: 0, cost: 7,  techReq: "gunpowder",      domain: "land",      civReq: "France",  replaces: "musketman", ability: "forest_move" },
  panzer:           { name: "Panzer",           icon: "🔩",    strength: 7, hp: 25, move: 4, range: 0, cost: 10, techReq: "electronics",    domain: "land",      civReq: "Germany", replaces: "tank" },
  great_bombard:    { name: "Great Bombard",    icon: "💥",    strength: 4, hp: 10, move: 1, range: 3, cost: 7,  techReq: "machinery",      domain: "land",      civReq: "Ottoman", replaces: "catapult", ability: "city_siege" },
};

// Units requiring Military district to produce
export const MILITARY_REQ_UNITS = new Set([
  "tank", "modern_infantry", "artillery", "mech", "fighter", "bomber", "panzer", "marine"
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

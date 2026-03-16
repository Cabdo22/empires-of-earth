// ============================================================
// UNIT DEFINITIONS
// ============================================================

export const UNIT_DEFS = {
  // ── Non-combat ──
  scout:            { name: "Scout",            icon: "👁",    strength: 1, hp: 10, move: 3, range: 0, cost: 8,   techReq: null,               domain: "land" },
  settler:          { name: "Settler",          icon: "🏕",    strength: 0, hp: 10, move: 2, range: 0, cost: 19,  techReq: null,               domain: "land" },

  // ── Infantry line ──
  warrior:          { name: "Warrior",          icon: "🛡",    strength: 2, hp: 15, move: 2, range: 0, cost: 10,  techReq: null,               domain: "land" },
  swordsman:        { name: "Swordsman",        icon: "⚔",    strength: 4, hp: 20, move: 2, range: 0, cost: 15,  techReq: "bronze_working",   domain: "land", resourceReq: "iron" },
  man_at_arms:      { name: "Man-at-Arms",      icon: "⚔",    strength: 5, hp: 22, move: 2, range: 0, cost: 17,  techReq: "steelworking",     domain: "land", resourceReq: "iron" },
  musketman:        { name: "Musketman",        icon: "🔫",    strength: 6, hp: 28, move: 2, range: 0, cost: 24,  techReq: "gunpowder",        domain: "land" },
  modern_infantry:  { name: "Modern Infantry",  icon: "🎖",    strength: 7, hp: 32, move: 2, range: 0, cost: 28,  techReq: "logistics",        domain: "amphibious" },
  mech_infantry:    { name: "Mech Infantry",    icon: "🤖",    strength: 9, hp: 36, move: 3, range: 0, cost: 36,  techReq: "ai_governance",    domain: "amphibious" },

  // ── Ranged line ──
  archer:           { name: "Archer",           icon: "🏹",    strength: 2, hp: 12, move: 2, range: 2, cost: 12,  techReq: "archery",          domain: "land" },
  crossbowman:      { name: "Crossbowman",      icon: "🏹",    strength: 3, hp: 14, move: 2, range: 2, cost: 15,  techReq: "fortification",    domain: "land" },
  field_cannon:     { name: "Field Cannon",     icon: "💥",    strength: 4, hp: 14, move: 2, range: 2, cost: 19,  techReq: "gunpowder",        domain: "land" },
  machine_gun:      { name: "Machine Gun",      icon: "🔫",    strength: 6, hp: 18, move: 2, range: 2, cost: 24,  techReq: "electronics",      domain: "land", resourceReq: "oil" },

  // ── Cavalry line ──
  horseman:         { name: "Horseman",         icon: "🐴",    strength: 3, hp: 16, move: 3, range: 0, cost: 14,  techReq: "animal_husbandry", domain: "land", resourceReq: "iron" },
  knight:           { name: "Knight",           icon: "🐴",    strength: 4, hp: 20, move: 3, range: 0, cost: 20,  techReq: "feudalism",        domain: "land", resourceReq: "iron" },
  cavalier:         { name: "Cavalier",         icon: "🐴",    strength: 5, hp: 24, move: 3, range: 0, cost: 24,  techReq: "engineering",      domain: "land", resourceReq: "iron" },
  tank:             { name: "Tank",             icon: "🔩",    strength: 7, hp: 30, move: 3, range: 0, cost: 30,  techReq: "electronics",      domain: "land", resourceReq: "oil" },

  // ── Siege line ──
  catapult:         { name: "Catapult",         icon: "🪨",    strength: 3, hp: 10, move: 1, range: 3, cost: 14,  techReq: "masonry",          domain: "land" },
  trebuchet:        { name: "Trebuchet",        icon: "🪨",    strength: 4, hp: 12, move: 1, range: 3, cost: 20,  techReq: "guilds",           domain: "land" },
  cannon:           { name: "Cannon",           icon: "💥",    strength: 5, hp: 14, move: 1, range: 3, cost: 22,  techReq: "machinery",        domain: "land" },
  artillery:        { name: "Artillery",        icon: "💥",    strength: 6, hp: 18, move: 1, range: 4, cost: 26,  techReq: "ballistics",       domain: "land" },
  missile_launcher: { name: "Missile Launcher", icon: "🚀",    strength: 7, hp: 16, move: 1, range: 4, cost: 30,  techReq: "quantum_computing", domain: "land", resourceReq: "oil" },

  // ── Naval line ──
  galley:           { name: "Galley",           icon: "⛵",    strength: 2, hp: 15, move: 3, range: 0, cost: 12,  techReq: "trade",            domain: "sea" },
  caravel:          { name: "Caravel",          icon: "⛵",    strength: 3, hp: 18, move: 3, range: 0, cost: 16,  techReq: "forestry",         domain: "sea" },
  frigate:          { name: "Frigate",          icon: "🚢",    strength: 4, hp: 22, move: 4, range: 0, cost: 21,  techReq: "steam_power",      domain: "sea", resourceReq: "oil" },
  battleship:       { name: "Battleship",       icon: "⚓",    strength: 7, hp: 28, move: 3, range: 3, cost: 30,  techReq: "combustion",       domain: "sea", resourceReq: "oil" },

  // ── Air units ──
  fighter:          { name: "Fighter",          icon: "✈",    strength: 4, hp: 18, move: 5, range: 0, cost: 22,  techReq: "aviation",         domain: "air", resourceReq: "oil" },
  bomber:           { name: "Bomber",           icon: "💣",    strength: 5, hp: 16, move: 4, range: 3, cost: 26,  techReq: "aviation",         domain: "air", resourceReq: "oil" },
  jet_fighter:      { name: "Jet Fighter",      icon: "✈",    strength: 6, hp: 22, move: 6, range: 0, cost: 28,  techReq: "nanotech",         domain: "air", resourceReq: "oil" },
  stealth_bomber:   { name: "Stealth Bomber",   icon: "💣",    strength: 7, hp: 20, move: 5, range: 3, cost: 32,  techReq: "nanotech",         domain: "air", resourceReq: "oil" },

  // ── Special ──
  nuke:             { name: "Nuke",             icon: "☢",    strength: 99, hp: 1, move: 0, range: 12, cost: 55, techReq: "combustion",       domain: "special", resourceReq: "uranium" },
  icbm:             { name: "ICBM",             icon: "☢",    strength: 99, hp: 1, move: 0, range: 20, cost: 65, techReq: "quantum_computing", domain: "special", resourceReq: "uranium" },

  // ── Unique civ units ──
  legionary:        { name: "Legionary",        icon: "⚔",    strength: 4, hp: 24, move: 2, range: 0, cost: 15,  techReq: "bronze_working",   domain: "land",      civReq: "Rome",    replaces: "swordsman", resourceReq: "iron" },
  chu_ko_nu:        { name: "Chu-Ko-Nu",        icon: "🏹",    strength: 3, hp: 12, move: 2, range: 2, cost: 12,  techReq: "archery",          domain: "land",      civReq: "China",   replaces: "archer",   ability: "rapid_shot" },
  war_chariot:      { name: "War Chariot",      icon: "🐴",    strength: 4, hp: 22, move: 3, range: 0, cost: 18,  techReq: "feudalism",        domain: "land",      civReq: "Egypt",   replaces: "knight", resourceReq: "iron" },
  jaguar:           { name: "Jaguar Warrior",   icon: "🐆",    strength: 2, hp: 18, move: 2, range: 0, cost: 10,  techReq: null,               domain: "land",      civReq: "Aztec",   replaces: "warrior",  ability: "heal_on_kill" },
  marine:           { name: "Marine",           icon: "⚓",    strength: 8, hp: 34, move: 3, range: 0, cost: 28,  techReq: "logistics",        domain: "amphibious", civReq: "America", replaces: "modern_infantry", ability: "water_speed" },
  man_o_war:        { name: "Man-o-War",        icon: "🏴‍☠️",  strength: 6, hp: 24, move: 4, range: 2, cost: 21,  techReq: "steam_power",      domain: "sea",       civReq: "England", replaces: "frigate", resourceReq: "oil" },
  musketeer:        { name: "Musketeer",        icon: "🔫",    strength: 7, hp: 30, move: 2, range: 0, cost: 24,  techReq: "gunpowder",        domain: "land",      civReq: "France",  replaces: "musketman", ability: "forest_move" },
  panzer:           { name: "Panzer",           icon: "🔩",    strength: 8, hp: 32, move: 4, range: 0, cost: 30,  techReq: "electronics",      domain: "land",      civReq: "Germany", replaces: "tank", resourceReq: "oil" },
  great_bombard:    { name: "Great Bombard",    icon: "💥",    strength: 4, hp: 12, move: 1, range: 3, cost: 14,  techReq: "masonry",          domain: "land",      civReq: "Ottoman", replaces: "catapult", ability: "city_siege" },
};

// Units requiring Military district to produce
export const MILITARY_REQ_UNITS = new Set([
  "tank", "modern_infantry", "artillery", "mech_infantry",
  "fighter", "bomber", "panzer", "marine",
  "machine_gun", "jet_fighter", "stealth_bomber", "missile_launcher", "battleship",
]);

// Siege units — deal full damage to cities
export const SIEGE_UNITS = new Set([
  "catapult", "great_bombard", "trebuchet", "cannon",
  "artillery", "missile_launcher",
  "battleship", "man_o_war", "bomber", "stealth_bomber",
]);

// Unit upgrade paths: base unit → upgraded unit
export const UPGRADE_PATHS = {
  // Infantry line
  warrior: "swordsman", swordsman: "man_at_arms", man_at_arms: "musketman",
  musketman: "modern_infantry", modern_infantry: "mech_infantry",
  // Ranged line
  archer: "crossbowman", crossbowman: "field_cannon", field_cannon: "machine_gun",
  // Cavalry line
  horseman: "knight", knight: "cavalier", cavalier: "tank",
  // Siege line
  catapult: "trebuchet", trebuchet: "cannon", cannon: "artillery", artillery: "missile_launcher",
  // Naval line
  galley: "caravel", caravel: "frigate", frigate: "battleship",
  // Air line
  fighter: "jet_fighter", bomber: "stealth_bomber",
  // Special
  nuke: "icbm",
  // Unique units → next in base chain
  jaguar: "swordsman", legionary: "man_at_arms",
  chu_ko_nu: "crossbowman",
  war_chariot: "cavalier",
  musketeer: "modern_infantry", marine: "mech_infantry",
  man_o_war: "battleship",
  great_bombard: "trebuchet",
};

// Barbarian unit types (scale with game progression)
export const BARB_UNITS = ["warrior", "archer", "swordsman", "horseman", "man_at_arms"];

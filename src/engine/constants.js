// ============================================================
// CONSTANTS — all game data tables & config
// ============================================================

export const HEX_SIZE = 48;
export const SQRT3 = Math.sqrt(3);

export const MAP_SIZES = {
  small:  { label: "Small",  desc: "~250 hexes · Quick game",  cols: 16, rows: 16 },
  medium: { label: "Medium", desc: "~500 hexes · Standard game", cols: 22, rows: 22 },
  large:  { label: "Large",  desc: "~1000 hexes · Epic game",  cols: 32, rows: 32 },
};

// Pre-compute the 6 vertices of a flat-top hexagon
export const HEX_POINTS = Array.from({ length: 6 }, (_, i) => {
  const angle = (Math.PI / 180) * 60 * i;
  return `${HEX_SIZE * Math.cos(angle)},${HEX_SIZE * Math.sin(angle)}`;
}).join(" ");

export const TERRAIN_INFO = {
  grassland: { label: "Grassland", moveCost: 1, food: 2, prod: 1, science: 0, gold: 1, color: "#7db840", defBonus: 0 },
  forest:    { label: "Forest",    moveCost: 2, food: 1, prod: 2, science: 0, gold: 0, color: "#2d8a4e", defBonus: 1 },
  mountain:  { label: "Mountain",  moveCost: null, food: 0, prod: 3, science: 0, gold: 0, color: "#8a8a8a", defBonus: 2 },
  water:     { label: "Water",     moveCost: null, food: 1, prod: 0, science: 0, gold: 1, color: "#3a8acd", defBonus: 0 },
};

export const RESOURCE_INFO = {
  wheat:   { label: "Wheat",   icon: "🌾", bonus: { food: 1 } },
  iron:    { label: "Iron",    icon: "⛏",  bonus: { prod: 1 } },
  oil:     { label: "Oil",     icon: "🛢",  bonus: { prod: 1, gold: 1 } },
  uranium: { label: "Uranium", icon: "☢",  bonus: { prod: 2 } },
};

export const ERAS = ["Dawn", "Classical", "Medieval", "Industrial", "Modern", "Future"];
export const ERA_IDX = { Dawn: 0, Classical: 1, Medieval: 2, Industrial: 3, Modern: 4, Future: 5 };
export const ERA_COLORS = { Dawn: "#a08060", Classical: "#80a060", Medieval: "#6080a0", Industrial: "#a0a060", Modern: "#8060a0", Future: "#60a0a0" };

export const TECH_TREE = {
  basic_tools:       { id: "basic_tools",       name: "Basic Tools",       era: "Dawn",       cost: 5,  prereqs: [],                    effects: ["Unlocks Warrior, Scout, Settler"], row: 0 },
  agriculture:       { id: "agriculture",       name: "Agriculture",       era: "Dawn",       cost: 5,  prereqs: [],                    effects: ["+1 food on grassland"],            row: 1 },
  hunting:           { id: "hunting",           name: "Hunting",           era: "Dawn",       cost: 5,  prereqs: [],                    effects: ["Unlocks Archer"],                  row: 2 },
  mysticism:         { id: "mysticism",         name: "Mysticism",         era: "Dawn",       cost: 5,  prereqs: [],                    effects: ["+1 science per city"],              row: 3 },
  bronze_working:    { id: "bronze_working",    name: "Bronze Working",    era: "Classical",  cost: 6,  prereqs: ["basic_tools"],       effects: ["Unlocks Swordsman"],               row: 0 },
  irrigation:        { id: "irrigation",        name: "Irrigation",        era: "Classical",  cost: 6,  prereqs: ["agriculture"],       effects: ["+1 food forests"],                  row: 1 },
  animal_husbandry:  { id: "animal_husbandry",  name: "Animal Husbandry",  era: "Classical",  cost: 6,  prereqs: ["hunting"],           effects: ["Unlocks cavalry"],                  row: 2 },
  writing:           { id: "writing",           name: "Writing",           era: "Classical",  cost: 6,  prereqs: ["mysticism"],         effects: ["Unlocks Library"],                  row: 3 },
  feudalism:         { id: "feudalism",         name: "Feudalism",         era: "Medieval",   cost: 7,  prereqs: ["bronze_working"],    effects: ["Unlocks Knight"],                   row: 0 },
  forestry:          { id: "forestry",          name: "Forestry",          era: "Medieval",   cost: 7,  prereqs: ["irrigation"],        effects: ["+1 prod forests"],                  row: 1 },
  steelworking:      { id: "steelworking",      name: "Steelworking",      era: "Medieval",   cost: 7,  prereqs: ["animal_husbandry"],  effects: ["+1 melee str"],                     row: 2 },
  guilds:            { id: "guilds",            name: "Guilds",            era: "Medieval",   cost: 7,  prereqs: ["writing"],           effects: ["+2 gold/city"],                     row: 3 },
  machinery:         { id: "machinery",         name: "Machinery",         era: "Industrial", cost: 8,  prereqs: ["feudalism"],         effects: ["Unlocks Catapult"],                 row: 0 },
  engineering:       { id: "engineering",       name: "Engineering",       era: "Industrial", cost: 8,  prereqs: ["forestry"],          effects: ["+1 prod/city"],                     row: 1 },
  gunpowder:         { id: "gunpowder",         name: "Gunpowder",         era: "Industrial", cost: 8,  prereqs: ["steelworking"],      effects: ["Unlocks Musketman"],                row: 2 },
  steam_power:       { id: "steam_power",       name: "Steam Power",       era: "Industrial", cost: 8,  prereqs: ["guilds"],            effects: ["Unlocks Galley"],                   row: 3 },
  electronics:       { id: "electronics",       name: "Electronics",       era: "Modern",     cost: 9,  prereqs: ["machinery"],         effects: ["Unlocks Tank"],                     row: 0 },
  aviation:          { id: "aviation",          name: "Aviation",          era: "Modern",     cost: 9,  prereqs: ["engineering"],       effects: ["Unlocks Fighter/Bomber"],           row: 1 },
  ballistics:        { id: "ballistics",        name: "Ballistics",        era: "Modern",     cost: 9,  prereqs: ["gunpowder"],         effects: ["Unlocks Artillery"],                row: 2 },
  combustion:        { id: "combustion",        name: "Combustion",        era: "Modern",     cost: 9,  prereqs: ["steam_power"],       effects: ["Unlocks Ships"],                    row: 3 },
  quantum_computing: { id: "quantum_computing", name: "Quantum Computing", era: "Future",     cost: 10, prereqs: ["electronics"],       effects: ["Nuclear Facility"],                 row: 0 },
  ai_governance:     { id: "ai_governance",     name: "AI Governance",     era: "Future",     cost: 10, prereqs: ["aviation"],          effects: ["Unlocks Modern Infantry"],          row: 1 },
  nanotech:          { id: "nanotech",          name: "Nanotech",          era: "Future",     cost: 10, prereqs: ["ballistics"],        effects: ["Unlocks Mech"],                     row: 2 },
  fusion_power:      { id: "fusion_power",      name: "Fusion Power",      era: "Future",     cost: 10, prereqs: ["combustion"],        effects: ["+3 sci, Victory"],                  row: 3 },
};

export const UNIT_DEFS = {
  scout:            { name: "Scout",            icon: "👁",    strength: 1,  hp: 10, move: 3, range: 0, cost: 3,  techReq: null,               domain: "land" },
  warrior:          { name: "Warrior",          icon: "🛡",    strength: 2,  hp: 15, move: 2, range: 0, cost: 4,  techReq: null,               domain: "land" },
  settler:          { name: "Settler",          icon: "🏕",    strength: 0,  hp: 10, move: 2, range: 0, cost: 6,  techReq: null,               domain: "land" },
  archer:           { name: "Archer",           icon: "🏹",    strength: 2,  hp: 12, move: 2, range: 2, cost: 5,  techReq: "hunting",          domain: "land" },
  swordsman:        { name: "Swordsman",        icon: "⚔",    strength: 4,  hp: 20, move: 2, range: 0, cost: 6,  techReq: "bronze_working",   domain: "land" },
  knight:           { name: "Knight",           icon: "🐴",    strength: 3,  hp: 18, move: 3, range: 0, cost: 7,  techReq: "feudalism",        domain: "land" },
  catapult:         { name: "Catapult",         icon: "🪨",    strength: 3,  hp: 10, move: 1, range: 3, cost: 7,  techReq: "machinery",        domain: "land" },
  tank:             { name: "Tank",             icon: "🔩",    strength: 6,  hp: 25, move: 3, range: 0, cost: 10, techReq: "electronics",      domain: "land" },
  modern_infantry:  { name: "Modern Infantry",  icon: "🎖",    strength: 5,  hp: 22, move: 2, range: 0, cost: 8,  techReq: "ai_governance",    domain: "amphibious" },
  legionary:        { name: "Legionary",        icon: "⚔",    strength: 4,  hp: 24, move: 2, range: 0, cost: 6,  techReq: "bronze_working",   domain: "land",       civReq: "Rome",    replaces: "swordsman" },
  chu_ko_nu:        { name: "Chu-Ko-Nu",        icon: "🏹",    strength: 3,  hp: 12, move: 2, range: 2, cost: 5,  techReq: "hunting",          domain: "land",       civReq: "China",   replaces: "archer",    ability: "rapid_shot" },
  war_chariot:      { name: "War Chariot",      icon: "🐴",    strength: 3,  hp: 18, move: 3, range: 0, cost: 5,  techReq: "feudalism",        domain: "land",       civReq: "Egypt",   replaces: "knight" },
  jaguar:           { name: "Jaguar Warrior",   icon: "🐆",    strength: 2,  hp: 18, move: 2, range: 0, cost: 4,  techReq: null,               domain: "land",       civReq: "Aztec",   replaces: "warrior",   ability: "heal_on_kill" },
  musketman:        { name: "Musketman",        icon: "🔫",    strength: 5,  hp: 20, move: 2, range: 0, cost: 7,  techReq: "gunpowder",        domain: "land" },
  marine:           { name: "Marine",           icon: "⚓",    strength: 5,  hp: 22, move: 3, range: 0, cost: 8,  techReq: "ai_governance",    domain: "amphibious", civReq: "America", replaces: "modern_infantry", ability: "water_speed" },
  man_o_war:        { name: "Man-o-War",        icon: "🏴‍☠️", strength: 6,  hp: 22, move: 4, range: 2, cost: 8,  techReq: "combustion",       domain: "sea",        civReq: "England", replaces: "destroyer" },
  musketeer:        { name: "Musketeer",        icon: "🔫",    strength: 6,  hp: 20, move: 2, range: 0, cost: 7,  techReq: "gunpowder",        domain: "land",       civReq: "France",  replaces: "musketman", ability: "forest_move" },
  panzer:           { name: "Panzer",           icon: "🔩",    strength: 7,  hp: 25, move: 4, range: 0, cost: 10, techReq: "electronics",      domain: "land",       civReq: "Germany", replaces: "tank" },
  great_bombard:    { name: "Great Bombard",    icon: "💥",    strength: 4,  hp: 10, move: 1, range: 3, cost: 7,  techReq: "machinery",        domain: "land",       civReq: "Ottoman", replaces: "catapult",  ability: "city_siege" },
  artillery:        { name: "Artillery",        icon: "💥",    strength: 5,  hp: 14, move: 1, range: 4, cost: 9,  techReq: "ballistics",       domain: "land" },
  galley:           { name: "Galley",           icon: "⛵",    strength: 2,  hp: 15, move: 3, range: 0, cost: 5,  techReq: "steam_power",      domain: "sea" },
  destroyer:        { name: "Destroyer",        icon: "🚢",    strength: 5,  hp: 22, move: 4, range: 0, cost: 8,  techReq: "combustion",       domain: "sea" },
  battleship:       { name: "Battleship",       icon: "⚓",    strength: 6,  hp: 28, move: 3, range: 3, cost: 12, techReq: "combustion",       domain: "sea" },
  fighter:          { name: "Fighter",          icon: "✈",    strength: 4,  hp: 18, move: 5, range: 0, cost: 8,  techReq: "aviation",         domain: "air" },
  bomber:           { name: "Bomber",           icon: "💣",    strength: 5,  hp: 16, move: 4, range: 3, cost: 10, techReq: "aviation",         domain: "air" },
  mech:             { name: "Mech",             icon: "🤖",    strength: 8,  hp: 30, move: 3, range: 0, cost: 14, techReq: "nanotech",         domain: "amphibious" },
  nuke:             { name: "Nuke",             icon: "☢",    strength: 99, hp: 1,  move: 0, range: 3, cost: 25, techReq: "quantum_computing", domain: "special" },
};

export const DISTRICT_DEFS = {
  farm:     { name: "Farm",     icon: "🌾", cost: 8,  effects: { food: 2 },       techReq: null },
  workshop: { name: "Workshop", icon: "🔨", cost: 8,  effects: { production: 2 }, techReq: null },
  library:  { name: "Library",  icon: "📚", cost: 8,  effects: { science: 2 },    techReq: "writing" },
  market:   { name: "Market",   icon: "💰", cost: 8,  effects: { gold: 2 },       techReq: null },
  military: { name: "Military", icon: "⚔",  cost: 10, effects: {},                techReq: "bronze_working" },
  nuclear:  { name: "Nuclear",  icon: "☢",  cost: 14, effects: {},                techReq: "quantum_computing" },
};

export const CIV_DEFS = {
  Rome:    { name: "Roman Empire",    color: "#e74c3c", colorBg: "#8b1a1a", colorLight: "#e07070", bonus: "+1 production per city",             desc: "Master builders who forge empires through industry.",           capital: "Rome",           cityNames: ["Roma","Antium","Capua","Neapolis","Pompeii"] },
  China:   { name: "Chinese Dynasty", color: "#3498db", colorBg: "#1a4a8b", colorLight: "#60b0d8", bonus: "+1 science per city",                desc: "Ancient scholars who unlock the secrets of the world.",         capital: "Beijing",        cityNames: ["Chang'an","Luoyang","Nanjing","Suzhou","Hangzhou"] },
  Egypt:   { name: "Egyptian Kingdom",color: "#f1c40f", colorBg: "#8b7a0a", colorLight: "#f0e060", bonus: "+1 food on grassland cities",        desc: "River-fed civilization of pharaohs and pyramids.",              capital: "Thebes",         cityNames: ["Memphis","Alexandria","Luxor","Giza","Aswan"] },
  Aztec:   { name: "Aztec Empire",    color: "#27ae60", colorBg: "#1a6b3a", colorLight: "#60d890", bonus: "+1 strength for melee units",        desc: "Fierce warriors who conquer through blood and sacrifice.",      capital: "Tenochtitlan",   cityNames: ["Texcoco","Tlacopan","Cholula","Tlaxcala","Xochimilco"] },
  America: { name: "United States",   color: "#2c3e80", colorBg: "#1a2550", colorLight: "#6080c0", bonus: "+1 gold per city",                   desc: "A nation built on liberty, expansion, and economic power.",     capital: "Washington",     cityNames: ["New York","Boston","Philadelphia","Chicago","Los Angeles"] },
  England: { name: "English Empire",  color: "#c0392b", colorBg: "#6b1a15", colorLight: "#e08080", bonus: "+1 naval movement, +1 gold from water", desc: "Rulers of the seas with an empire spanning the globe.",      capital: "London",         cityNames: ["Liverpool","Manchester","Bristol","York","Canterbury"] },
  France:  { name: "French Republic", color: "#8e44ad", colorBg: "#4a1a6b", colorLight: "#c080e0", bonus: "+1 sci & gold with Library/Market",  desc: "A beacon of enlightenment, culture, and military élan.",       capital: "Paris",          cityNames: ["Lyon","Marseille","Bordeaux","Orléans","Toulouse"] },
  Germany: { name: "German Empire",   color: "#7f8c8d", colorBg: "#3a4040", colorLight: "#b0c0c0", bonus: "-1 unit cost, +1 prod with Workshop", desc: "Industrial powerhouse with unmatched engineering.",           capital: "Berlin",         cityNames: ["Hamburg","Munich","Cologne","Frankfurt","Dresden"] },
  Ottoman: { name: "Ottoman Empire",  color: "#d35400", colorBg: "#6b2a00", colorLight: "#e0a060", bonus: "+1 siege str, +1 gold captured cities", desc: "Siege masters who forge empires through conquest.",          capital: "Constantinople", cityNames: ["Ankara","Izmir","Bursa","Edirne","Konya"] },
};

export const BARB_UNITS = ["warrior", "archer", "swordsman"];

export const RANDOM_EVENTS = [
  { id: "gold_rush", name: "Gold Rush!",       desc: "Traders bring wealth." },
  { id: "plague",    name: "Plague Strikes",    desc: "Disease reduces city population." },
  { id: "eureka",    name: "Eureka!",           desc: "A breakthrough advances research." },
  { id: "harvest",   name: "Bountiful Harvest", desc: "Surplus food for all cities." },
  { id: "raid",      name: "Barbarian Raid!",   desc: "Barbarians attack your borders." },
];

export const PHASES = ["MOVEMENT"];
export const PHASE_LABELS = { MOVEMENT: "Playing" };
export const CITY_DEF_BONUS = 2;
export const TERRITORIAL_WIN = 0.6;
export const FOG_SIGHT = { scout: 3, fighter: 4, bomber: 3, default: 2 };

export const UPGRADE_PATHS = {
  warrior: "swordsman", swordsman: "musketman", musketman: "modern_infantry",
  archer: "catapult", catapult: "artillery",
  scout: "knight", knight: "tank", tank: "mech",
  galley: "destroyer", destroyer: "battleship",
  jaguar: "swordsman", legionary: "musketman",
  chu_ko_nu: "catapult", war_chariot: "tank",
  musketeer: "modern_infantry", marine: "mech",
  panzer: "mech", man_o_war: "battleship", great_bombard: "artillery",
};

// Units requiring Military district to produce
export const MILITARY_REQ_UNITS = new Set([
  "tank", "modern_infantry", "artillery", "mech", "fighter", "bomber", "panzer", "marine"
]);

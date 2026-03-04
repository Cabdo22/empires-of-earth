// ============================================================
// TECHNOLOGY TREE & ERA DATA
// ============================================================

export const ERAS = ["Dawn", "Classical", "Medieval", "Industrial", "Modern", "Future"];

export const ERA_IDX = { Dawn: 0, Classical: 1, Medieval: 2, Industrial: 3, Modern: 4, Future: 5 };

export const ERA_COLORS = {
  Dawn: "#a08060", Classical: "#80a060", Medieval: "#6080a0",
  Industrial: "#a0a060", Modern: "#8060a0", Future: "#60a0a0",
};

export const TECH_TREE = {
  // Dawn Era
  basic_tools:  { id: "basic_tools",  name: "Basic Tools",  era: "Dawn", cost: 5, prereqs: [], effects: ["Unlocks Warrior, Scout, Settler"], row: 0 },
  agriculture:  { id: "agriculture",  name: "Agriculture",  era: "Dawn", cost: 5, prereqs: [], effects: ["+1 food on grassland"], row: 1 },
  hunting:      { id: "hunting",      name: "Hunting",      era: "Dawn", cost: 5, prereqs: [], effects: ["Unlocks Archer"], row: 2 },
  mysticism:    { id: "mysticism",    name: "Mysticism",    era: "Dawn", cost: 5, prereqs: [], effects: ["+1 science per city"], row: 3 },

  // Classical Era
  bronze_working:   { id: "bronze_working",   name: "Bronze Working",   era: "Classical", cost: 6, prereqs: ["basic_tools"],  effects: ["Unlocks Swordsman"], row: 0 },
  irrigation:       { id: "irrigation",       name: "Irrigation",       era: "Classical", cost: 6, prereqs: ["agriculture"],   effects: ["+1 food forests"], row: 1 },
  animal_husbandry: { id: "animal_husbandry", name: "Animal Husbandry", era: "Classical", cost: 6, prereqs: ["hunting"],       effects: ["Unlocks cavalry"], row: 2 },
  writing:          { id: "writing",          name: "Writing",          era: "Classical", cost: 6, prereqs: ["mysticism"],      effects: ["Unlocks Library"], row: 3 },

  // Medieval Era
  feudalism:    { id: "feudalism",    name: "Feudalism",    era: "Medieval", cost: 7, prereqs: ["bronze_working"],   effects: ["Unlocks Knight"], row: 0 },
  forestry:     { id: "forestry",     name: "Forestry",     era: "Medieval", cost: 7, prereqs: ["irrigation"],       effects: ["+1 prod forests"], row: 1 },
  steelworking: { id: "steelworking", name: "Steelworking", era: "Medieval", cost: 7, prereqs: ["animal_husbandry"], effects: ["+1 melee str"], row: 2 },
  guilds:       { id: "guilds",       name: "Guilds",       era: "Medieval", cost: 7, prereqs: ["writing"],          effects: ["+2 gold/city"], row: 3 },

  // Industrial Era
  machinery:   { id: "machinery",   name: "Machinery",   era: "Industrial", cost: 8, prereqs: ["feudalism"],    effects: ["Unlocks Catapult"], row: 0 },
  engineering: { id: "engineering", name: "Engineering", era: "Industrial", cost: 8, prereqs: ["forestry"],     effects: ["+1 prod/city"], row: 1 },
  gunpowder:   { id: "gunpowder",   name: "Gunpowder",   era: "Industrial", cost: 8, prereqs: ["steelworking"], effects: ["Unlocks Musketman"], row: 2 },
  steam_power: { id: "steam_power", name: "Steam Power", era: "Industrial", cost: 8, prereqs: ["guilds"],       effects: ["Unlocks Galley"], row: 3 },

  // Modern Era
  electronics: { id: "electronics", name: "Electronics", era: "Modern", cost: 9, prereqs: ["machinery"],   effects: ["Unlocks Tank"], row: 0 },
  aviation:    { id: "aviation",    name: "Aviation",    era: "Modern", cost: 9, prereqs: ["engineering"],  effects: ["Unlocks Fighter/Bomber"], row: 1 },
  ballistics:  { id: "ballistics",  name: "Ballistics",  era: "Modern", cost: 9, prereqs: ["gunpowder"],   effects: ["Unlocks Artillery"], row: 2 },
  combustion:  { id: "combustion",  name: "Combustion",  era: "Modern", cost: 9, prereqs: ["steam_power"], effects: ["Unlocks Ships"], row: 3 },

  // Future Era
  quantum_computing: { id: "quantum_computing", name: "Quantum Computing", era: "Future", cost: 10, prereqs: ["electronics"], effects: ["Nuclear Facility"], row: 0 },
  ai_governance:     { id: "ai_governance",     name: "AI Governance",     era: "Future", cost: 10, prereqs: ["aviation"],    effects: ["Unlocks Modern Infantry"], row: 1 },
  nanotech:          { id: "nanotech",          name: "Nanotech",          era: "Future", cost: 10, prereqs: ["ballistics"],  effects: ["Unlocks Mech"], row: 2 },
  fusion_power:      { id: "fusion_power",      name: "Fusion Power",      era: "Future", cost: 10, prereqs: ["combustion"],  effects: ["+3 sci, Victory"], row: 3 },
};

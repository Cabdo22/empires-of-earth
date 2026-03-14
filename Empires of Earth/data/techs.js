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
  // Dawn Era (18-25)
  basic_tools:    { id: "basic_tools",    name: "Basic Tools",    era: "Dawn", cost: 20, prereqs: [], effects: ["Unlocks Warrior, Scout, Settler"], row: 0 },
  agriculture:    { id: "agriculture",    name: "Agriculture",    era: "Dawn", cost: 20, prereqs: [], effects: ["+2 food on grassland"], row: 1 },
  hunting:        { id: "hunting",        name: "Hunting",        era: "Dawn", cost: 18, prereqs: [], effects: ["Unlocks Archer"], row: 2 },
  mysticism:      { id: "mysticism",      name: "Mysticism",      era: "Dawn", cost: 25, prereqs: [], effects: ["+2 science per city"], row: 3 },
  pottery:        { id: "pottery",        name: "Pottery",        era: "Dawn", cost: 20, prereqs: [], effects: ["+1 gold per city"], row: 4 },
  stone_working:  { id: "stone_working",  name: "Stone Working",  era: "Dawn", cost: 22, prereqs: [], effects: ["+5 city max HP"], row: 5 },

  // Classical Era (35-40)
  bronze_working:   { id: "bronze_working",   name: "Bronze Working",   era: "Classical", cost: 35, prereqs: ["basic_tools"],   effects: ["Unlocks Swordsman"], row: 0 },
  irrigation:       { id: "irrigation",       name: "Irrigation",       era: "Classical", cost: 35, prereqs: ["agriculture"],    effects: ["+1 food forests"], row: 1 },
  animal_husbandry: { id: "animal_husbandry", name: "Animal Husbandry", era: "Classical", cost: 35, prereqs: ["hunting"],        effects: ["Unlocks cavalry"], row: 2 },
  writing:          { id: "writing",          name: "Writing",          era: "Classical", cost: 40, prereqs: ["mysticism"],       effects: ["Unlocks Library"], row: 3 },
  trade:            { id: "trade",            name: "Trade",            era: "Classical", cost: 38, prereqs: ["pottery"],         effects: ["Unlocks Market"], row: 4 },
  masonry:          { id: "masonry",          name: "Masonry",          era: "Classical", cost: 35, prereqs: ["stone_working"],   effects: ["+2 city defense"], row: 5 },

  // Medieval Era (55-70)
  feudalism:      { id: "feudalism",      name: "Feudalism",      era: "Medieval", cost: 60, prereqs: ["bronze_working"],   effects: ["Unlocks Knight"], row: 0 },
  forestry:       { id: "forestry",       name: "Forestry",       era: "Medieval", cost: 55, prereqs: ["irrigation"],       effects: ["+1 prod forests"], row: 1 },
  steelworking:   { id: "steelworking",   name: "Steelworking",   era: "Medieval", cost: 60, prereqs: ["animal_husbandry"], effects: ["+1 melee str"], row: 2 },
  guilds:         { id: "guilds",         name: "Guilds",         era: "Medieval", cost: 70, prereqs: ["writing"],          effects: ["+3 gold/city"], row: 3 },
  currency:       { id: "currency",       name: "Currency",       era: "Medieval", cost: 65, prereqs: ["trade"],            effects: ["+1 gold/2 pop"], row: 4 },
  fortification:  { id: "fortification",  name: "Fortification",  era: "Medieval", cost: 55, prereqs: ["masonry"],          effects: ["+1 ranged str"], row: 5 },

  // Industrial Era (85-100)
  machinery:    { id: "machinery",    name: "Machinery",    era: "Industrial", cost: 95,  prereqs: ["feudalism"],      effects: ["Unlocks Catapult"], row: 0 },
  engineering:  { id: "engineering",  name: "Engineering",  era: "Industrial", cost: 90,  prereqs: ["forestry"],       effects: ["+2 prod/city"], row: 1 },
  gunpowder:    { id: "gunpowder",    name: "Gunpowder",    era: "Industrial", cost: 95,  prereqs: ["steelworking"],   effects: ["Unlocks Musketman"], row: 2 },
  steam_power:  { id: "steam_power",  name: "Steam Power",  era: "Industrial", cost: 85,  prereqs: ["guilds"],         effects: ["Unlocks Galley"], row: 3 },
  economics:    { id: "economics",    name: "Economics",    era: "Industrial", cost: 100, prereqs: ["currency"],       effects: ["Unlocks Bank"], row: 4 },
  conscription: { id: "conscription", name: "Conscription", era: "Industrial", cost: 85,  prereqs: ["fortification"],  effects: ["-2 unit cost"], row: 5 },

  // Modern Era (130-150)
  electronics:      { id: "electronics",      name: "Electronics",  era: "Modern", cost: 140, prereqs: ["machinery"],     effects: ["Unlocks Tank"], row: 0 },
  aviation:         { id: "aviation",         name: "Aviation",     era: "Modern", cost: 135, prereqs: ["engineering"],   effects: ["Unlocks Fighter/Bomber"], row: 1 },
  ballistics:       { id: "ballistics",       name: "Ballistics",   era: "Modern", cost: 140, prereqs: ["gunpowder"],     effects: ["Unlocks Artillery"], row: 2 },
  combustion:       { id: "combustion",       name: "Combustion",   era: "Modern", cost: 130, prereqs: ["steam_power"],   effects: ["Unlocks Ships"], row: 3 },
  telecommunications: { id: "telecommunications", name: "Telecom", era: "Modern", cost: 150, prereqs: ["economics"],     effects: ["+3 science/city"], row: 4 },
  logistics:        { id: "logistics",        name: "Logistics",    era: "Modern", cost: 130, prereqs: ["conscription"],  effects: ["+1 unit movement"], row: 5 },

  // Future Era (190-220)
  quantum_computing: { id: "quantum_computing", name: "Quantum Computing", era: "Future", cost: 220, prereqs: ["electronics"],        effects: ["Nuclear Facility"], row: 0 },
  ai_governance:     { id: "ai_governance",     name: "AI Governance",     era: "Future", cost: 200, prereqs: ["aviation"],           effects: ["Unlocks Modern Infantry"], row: 1 },
  nanotech:          { id: "nanotech",          name: "Nanotech",          era: "Future", cost: 200, prereqs: ["ballistics"],         effects: ["Unlocks Mech"], row: 2 },
  fusion_power:      { id: "fusion_power",      name: "Fusion Power",      era: "Future", cost: 220, prereqs: ["combustion"],         effects: ["+5 sci, Victory"], row: 3 },
  space_program:     { id: "space_program",     name: "Space Program",     era: "Future", cost: 210, prereqs: ["telecommunications"], effects: ["+4 sci, Victory"], row: 4 },
  cybernetics:       { id: "cybernetics",       name: "Cybernetics",       era: "Future", cost: 190, prereqs: ["logistics"],          effects: ["+2 all unit str"], row: 5 },
};

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
  // ── Dawn Phase 1 (no prereqs — starting techs) ──
  basic_tools:    { id: "basic_tools",    name: "Basic Tools",    era: "Dawn", phase: 1, cost: 8, prereqs: [], effects: ["Unlocks Warrior, Scout, Settler"], row: 0 },
  agriculture:    { id: "agriculture",    name: "Agriculture",    era: "Dawn", phase: 1, cost: 8, prereqs: [], effects: ["+2 food on grassland"], row: 1 },
  hunting:        { id: "hunting",        name: "Hunting",        era: "Dawn", phase: 1, cost: 7, prereqs: [], effects: ["+1 food on forests"], row: 2 },

  // ── Dawn Phase 2 (need 2 of 3 Dawn P1) ──
  mysticism:      { id: "mysticism",      name: "Mysticism",      era: "Dawn", phase: 2, cost: 10, prereqs: ["basic_tools", "agriculture", "hunting"], prereqMin: 2, effects: ["+2 science per city"], row: 0 },
  pottery:        { id: "pottery",        name: "Pottery",        era: "Dawn", phase: 2, cost: 9, prereqs: ["basic_tools", "agriculture", "hunting"], prereqMin: 2, effects: ["+1 gold per city"], row: 1 },
  stone_working:  { id: "stone_working",  name: "Stone Working",  era: "Dawn", phase: 2, cost: 9, prereqs: ["basic_tools", "agriculture", "hunting"], prereqMin: 2, effects: ["+5 city max HP"], row: 2 },

  // ── Classical Phase 1 (need 2 of 3 Dawn P2) ──
  bronze_working:   { id: "bronze_working",   name: "Bronze Working",   era: "Classical", phase: 1, cost: 13, prereqs: ["mysticism", "pottery", "stone_working"], prereqMin: 2, effects: ["Unlocks Swordsman"], row: 0 },
  archery:          { id: "archery",          name: "Archery",          era: "Classical", phase: 1, cost: 13, prereqs: ["mysticism", "pottery", "stone_working"], prereqMin: 2, effects: ["Unlocks Archer"], row: 1 },
  animal_husbandry: { id: "animal_husbandry", name: "Animal Husbandry", era: "Classical", phase: 1, cost: 14, prereqs: ["mysticism", "pottery", "stone_working"], prereqMin: 2, effects: ["Unlocks Horseman"], row: 2 },

  // ── Classical Phase 2 (need 2 of 3 Classical P1) ──
  writing:          { id: "writing",          name: "Writing",          era: "Classical", phase: 2, cost: 16, prereqs: ["bronze_working", "archery", "animal_husbandry"], prereqMin: 2, effects: ["Unlocks Library"], row: 0 },
  trade:            { id: "trade",            name: "Trade",            era: "Classical", phase: 2, cost: 15, prereqs: ["bronze_working", "archery", "animal_husbandry"], prereqMin: 2, effects: ["Unlocks Market, Galley, Roads & Trade Routes"], row: 1 },
  masonry:          { id: "masonry",          name: "Masonry",          era: "Classical", phase: 2, cost: 14, prereqs: ["bronze_working", "archery", "animal_husbandry"], prereqMin: 2, effects: ["+2 city defense, Unlocks Catapult"], row: 2 },

  // ── Medieval Phase 1 (need 2 of 3 Classical P2) ──
  feudalism:      { id: "feudalism",      name: "Feudalism",      era: "Medieval", phase: 1, cost: 22, prereqs: ["writing", "trade", "masonry"], prereqMin: 2, effects: ["Unlocks Knight"], row: 0 },
  forestry:       { id: "forestry",       name: "Forestry",       era: "Medieval", phase: 1, cost: 20, prereqs: ["writing", "trade", "masonry"], prereqMin: 2, effects: ["+1 prod forests, Unlocks Caravel"], row: 1 },
  steelworking:   { id: "steelworking",   name: "Steelworking",   era: "Medieval", phase: 1, cost: 24, prereqs: ["writing", "trade", "masonry"], prereqMin: 2, effects: ["+1 melee str, Unlocks Man-at-Arms"], row: 2 },

  // ── Medieval Phase 2 (need 2 of 3 Medieval P1) ──
  guilds:         { id: "guilds",         name: "Guilds",         era: "Medieval", phase: 2, cost: 27, prereqs: ["feudalism", "forestry", "steelworking"], prereqMin: 2, effects: ["+3 gold/city, Unlocks Trebuchet"], row: 0 },
  currency:       { id: "currency",       name: "Currency",       era: "Medieval", phase: 2, cost: 26, prereqs: ["feudalism", "forestry", "steelworking"], prereqMin: 2, effects: ["+1 gold/2 pop"], row: 1 },
  fortification:  { id: "fortification",  name: "Fortification",  era: "Medieval", phase: 2, cost: 24, prereqs: ["feudalism", "forestry", "steelworking"], prereqMin: 2, effects: ["+1 ranged str, Unlocks Crossbowman"], row: 2 },

  // ── Industrial Phase 1 (need 2 of 3 Medieval P2) ──
  machinery:    { id: "machinery",    name: "Machinery",    era: "Industrial", phase: 1, cost: 34,  prereqs: ["guilds", "currency", "fortification"], prereqMin: 2, effects: ["Unlocks Cannon"], row: 0 },
  engineering:  { id: "engineering",  name: "Engineering",  era: "Industrial", phase: 1, cost: 34,  prereqs: ["guilds", "currency", "fortification"], prereqMin: 2, effects: ["+2 prod/city, Unlocks Cavalier"], row: 1 },
  gunpowder:    { id: "gunpowder",    name: "Gunpowder",    era: "Industrial", phase: 1, cost: 36, prereqs: ["guilds", "currency", "fortification"], prereqMin: 2, effects: ["Unlocks Musketman, Field Cannon"], row: 2 },

  // ── Industrial Phase 2 (need 2 of 3 Industrial P1) ──
  steam_power:  { id: "steam_power",  name: "Steam Power",  era: "Industrial", phase: 2, cost: 34,  prereqs: ["machinery", "engineering", "gunpowder"], prereqMin: 2, effects: ["Unlocks Frigate"], row: 0 },
  economics:    { id: "economics",    name: "Economics",    era: "Industrial", phase: 2, cost: 38, prereqs: ["machinery", "engineering", "gunpowder"], prereqMin: 2, effects: ["Unlocks Bank, Foreign Trade Routes"], row: 1 },
  conscription: { id: "conscription", name: "Conscription", era: "Industrial", phase: 2, cost: 34,  prereqs: ["machinery", "engineering", "gunpowder"], prereqMin: 2, effects: ["-2 unit cost"], row: 2 },

  // ── Modern Phase 1 (need 2 of 3 Industrial P2) ──
  electronics:      { id: "electronics",      name: "Electronics",  era: "Modern", phase: 1, cost: 48, prereqs: ["steam_power", "economics", "conscription"], prereqMin: 2, effects: ["Unlocks Tank, Machine Gun"], row: 0 },
  aviation:         { id: "aviation",         name: "Aviation",     era: "Modern", phase: 1, cost: 48, prereqs: ["steam_power", "economics", "conscription"], prereqMin: 2, effects: ["Unlocks Fighter/Bomber"], row: 1 },
  ballistics:       { id: "ballistics",       name: "Ballistics",   era: "Modern", phase: 1, cost: 50, prereqs: ["steam_power", "economics", "conscription"], prereqMin: 2, effects: ["Unlocks Artillery"], row: 2 },

  // ── Modern Phase 2 (need 2 of 3 Modern P1) ──
  combustion:       { id: "combustion",       name: "Combustion",   era: "Modern", phase: 2, cost: 48, prereqs: ["electronics", "aviation", "ballistics"], prereqMin: 2, effects: ["Unlocks Battleship, Nuclear Facility"], row: 0 },
  telecommunications: { id: "telecommunications", name: "Telecom", era: "Modern", phase: 2, cost: 52, prereqs: ["electronics", "aviation", "ballistics"], prereqMin: 2, effects: ["+3 science/city"], row: 1 },
  logistics:        { id: "logistics",        name: "Logistics",    era: "Modern", phase: 2, cost: 48, prereqs: ["electronics", "aviation", "ballistics"], prereqMin: 2, effects: ["+1 movement, Unlocks Modern Infantry"], row: 2 },

  // ── Future Phase 1 (need 2 of 3 Modern P2) ──
  quantum_computing: { id: "quantum_computing", name: "Quantum Computing", era: "Future", phase: 1, cost: 72, prereqs: ["combustion", "telecommunications", "logistics"], prereqMin: 2, effects: ["Unlocks ICBM, Missile Launcher"], row: 0 },
  ai_governance:     { id: "ai_governance",     name: "AI Governance",     era: "Future", phase: 1, cost: 64, prereqs: ["combustion", "telecommunications", "logistics"], prereqMin: 2, effects: ["Unlocks Mech Infantry"], row: 1 },
  nanotech:          { id: "nanotech",          name: "Nanotech",          era: "Future", phase: 1, cost: 68, prereqs: ["combustion", "telecommunications", "logistics"], prereqMin: 2, effects: ["Unlocks Jet Fighter, Stealth Bomber"], row: 2 },

  // ── Future Phase 2 (need 2 of 3 Future P1) ──
  fusion_power:      { id: "fusion_power",      name: "Fusion Power",      era: "Future", phase: 2, cost: 76, prereqs: ["quantum_computing", "ai_governance", "nanotech"], prereqMin: 2, effects: ["+5 sci, Victory"], row: 0 },
  space_program:     { id: "space_program",     name: "Space Program",     era: "Future", phase: 2, cost: 74, prereqs: ["quantum_computing", "ai_governance", "nanotech"], prereqMin: 2, effects: ["+4 sci, Victory"], row: 1 },
  cybernetics:       { id: "cybernetics",       name: "Cybernetics",       era: "Future", phase: 2, cost: 68, prereqs: ["quantum_computing", "ai_governance", "nanotech"], prereqMin: 2, effects: ["+2 all unit str"], row: 2 },
};

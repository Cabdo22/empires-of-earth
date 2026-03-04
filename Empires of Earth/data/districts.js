// ============================================================
// DISTRICT DEFINITIONS
// ============================================================

export const DISTRICT_DEFS = {
  farm:     { name: "Farm",     icon: "🌾", cost: 8,  effects: { food: 2 },       techReq: null },
  workshop: { name: "Workshop", icon: "🔨", cost: 8,  effects: { production: 2 }, techReq: null },
  library:  { name: "Library",  icon: "📚", cost: 8,  effects: { science: 2 },    techReq: "writing" },
  market:   { name: "Market",   icon: "💰", cost: 8,  effects: { gold: 2 },       techReq: null },
  military: { name: "Military", icon: "⚔",  cost: 10, effects: {},                techReq: "bronze_working" },
  nuclear:  { name: "Nuclear",  icon: "☢",  cost: 14, effects: {},                techReq: "quantum_computing" },
};

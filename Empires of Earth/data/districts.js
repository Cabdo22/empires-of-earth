// ============================================================
// DISTRICT DEFINITIONS
// ============================================================

export const DISTRICT_DEFS = {
  farm:     { name: "Farm",     icon: "🌾", cost: 17,  effects: { food: 4 },       techReq: null },
  workshop: { name: "Workshop", icon: "🔨", cost: 17,  effects: { production: 4 }, techReq: null },
  library:  { name: "Library",  icon: "📚", cost: 17,  effects: { science: 4 },    techReq: "writing" },
  market:   { name: "Market",   icon: "💰", cost: 17,  effects: { gold: 4 },       techReq: "trade" },
  bank:     { name: "Bank",     icon: "🏦", cost: 19,  effects: { gold: 5 },       techReq: "economics" },
  military: { name: "Military", icon: "⚔",  cost: 22, effects: {},                techReq: "bronze_working" },
  nuclear:  { name: "Nuclear",  icon: "☢",  cost: 30, effects: {},                techReq: "combustion" },
};

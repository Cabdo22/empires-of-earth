// ============================================================
// DISTRICT DEFINITIONS
// ============================================================

export const DISTRICT_DEFS = {
  farm:     { name: "Farm",     icon: "🌾", cost: 12,  effects: { food: 4 },       techReq: null },
  workshop: { name: "Workshop", icon: "🔨", cost: 12,  effects: { production: 4 }, techReq: null },
  library:  { name: "Library",  icon: "📚", cost: 12,  effects: { science: 5 },    techReq: "writing" },
  market:   { name: "Market",   icon: "💰", cost: 12,  effects: { gold: 4 },       techReq: "trade" },
  bank:     { name: "Bank",     icon: "🏦", cost: 14,  effects: { gold: 5 },       techReq: "economics" },
  port:     { name: "Port",     icon: "⚓", cost: 15,  effects: { gold: 2 },       techReq: "trade" },
  military: { name: "Military", icon: "⚔",  cost: 16, effects: {},                techReq: "bronze_working" },
  nuclear:  { name: "Nuclear",  icon: "☢",  cost: 22, effects: {},                techReq: "combustion" },
};

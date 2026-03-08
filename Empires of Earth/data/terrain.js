// ============================================================
// TERRAIN DATA
// ============================================================

export const TERRAIN_INFO = {
  grassland: { label: "Grassland", moveCost: 1, food: 2, prod: 1, science: 0, gold: 1, color: "#7db840", defBonus: 0 },
  forest:    { label: "Forest",    moveCost: 2, food: 1, prod: 2, science: 0, gold: 0, color: "#2d8a4e", defBonus: 1 },
  mountain:  { label: "Mountain",  moveCost: null, food: 0, prod: 3, science: 0, gold: 0, color: "#8a8a8a", defBonus: 2 },
  water:     { label: "Water",     moveCost: null, food: 1, prod: 0, science: 0, gold: 1, color: "#3a8acd", defBonus: 0 },
};

export const RESOURCE_INFO = {
  wheat:   { label: "Wheat",   icon: "🌾", bonus: { food: 2 } },
  iron:    { label: "Iron",    icon: "⛏",  bonus: { prod: 2 } },
  oil:     { label: "Oil",     icon: "🛢",  bonus: { prod: 2, gold: 2 } },
  uranium: { label: "Uranium", icon: "☢",  bonus: { prod: 3 } },
};

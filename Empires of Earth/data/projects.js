// ============================================================
// SCIENCE VICTORY PROJECTS
// ============================================================

export const PROJECT_DEFS = {
  fusion_reactor: {
    id: "fusion_reactor",
    name: "Fusion Reactor",
    icon: "⚛",
    cost: 30,
    techReq: "fusion_power",
    districtReqs: ["library"],
    victoryType: "Science",
  },
  orbital_launch: {
    id: "orbital_launch",
    name: "Orbital Launch",
    icon: "🚀",
    cost: 36,
    techReq: "space_program",
    districtReqs: ["library", "workshop"],
    victoryType: "Science",
  },
  deep_space_signal: {
    id: "deep_space_signal",
    name: "Deep Space Signal",
    icon: "📡",
    cost: 44,
    techReq: "space_program",
    prereqProjects: ["fusion_reactor", "orbital_launch"],
    districtReqs: ["library", "workshop", "bank"],
    victoryType: "Science",
  },
};

export const SCIENCE_VICTORY_PROJECTS = ["fusion_reactor", "orbital_launch", "deep_space_signal"];

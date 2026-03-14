// ============================================================
// TUTORIAL TIPS
// ============================================================

export const TUTORIAL_TIPS = [
  {
    id: "welcome",
    trigger: (gs) => gs && gs.turnNumber === 1,
    icon: "🏛",
    title: "Welcome to Empires of Earth!",
    body: "Your goal: build cities, research technology, and conquer the map. Move units, manage cities, and research tech all in one turn. Click \"End Turn →\" when you're done.",
    position: "center",
  },
  {
    id: "research_tip",
    trigger: (gs, dismissed) => gs && !gs.players.find(p => p.id === gs.currentPlayerId)?.currentResearch && dismissed["welcome"],
    icon: "🔬",
    title: "Research",
    body: "Click the \"Tech\" button to open the technology tree, then click an available tech to start researching it. Research unlocks new units, buildings, and bonuses.",
    position: "top",
  },
  {
    id: "city_tip",
    trigger: (gs, dismissed) => gs && gs.turnNumber <= 2 && dismissed["welcome"],
    icon: "🏗",
    title: "City Management",
    body: "Click on your cities (on the map) to open the city panel. From there you can choose what to build — units for your army or districts to boost your economy. Cities produce automatically each turn.",
    position: "top",
  },
  {
    id: "movement_tip",
    trigger: (gs, dismissed) => gs && gs.turnNumber <= 2 && dismissed["welcome"],
    icon: "🗺",
    title: "Movement & Combat",
    body: "Click a unit to select it (or press Tab to cycle). Blue highlights show where it can move — right-click to move there. Red highlights show attack targets — right-click to attack.",
    position: "top",
  },
  {
    id: "combat_tip",
    trigger: (gs, dismissed, extra) => gs && extra?.selectedUnitNearEnemy,
    icon: "⚔",
    title: "Combat",
    body: "Hover over an enemy in range to see a combat preview. Right-click to attack. Melee units advance into the hex if the defender dies. Ranged units attack without moving and take no counter-damage.",
    position: "bottom",
  },
  {
    id: "fog_of_war",
    trigger: (gs) => gs && gs.turnNumber === 1,
    icon: "👁",
    title: "Fog of War",
    body: "Dark hexes are unexplored. Dimmed hexes were explored but aren't currently visible. Move scouts to reveal the map — they have the longest sight range.",
    position: "bottom",
  },
  {
    id: "settler_tip",
    trigger: (gs, dismissed, extra) => gs && extra?.hasSettlerSelected,
    icon: "🏕",
    title: "Found a City",
    body: "You have a settler selected! Click the \"Found City\" button in the action bar, then click any valid land hex to establish a new city. Settlers are consumed when founding.",
    position: "center",
  },
  {
    id: "victory_conditions",
    trigger: (gs) => gs && gs.turnNumber === 3,
    icon: "🏆",
    title: "Victory Conditions",
    body: "There are two ways to win: Domination (capture all enemy cities) or Science (research Quantum Computing, Fusion Power, and Space Program). Plan your strategy accordingly!",
    position: "center",
  },
];

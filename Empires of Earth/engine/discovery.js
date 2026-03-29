// ============================================================
// CIV DISCOVERY — hide opponent identity until meeting
// ============================================================

const UNKNOWN_COLORS = { color: "#888888", colorBg: "#444444", colorLight: "#aaaaaa" };

// Get the display name for a player (returns "Player N" if not met)
export const getDisplayName = (playerId, viewingPlayerId, gs) => {
  if (!gs || !gs.players) return "Unknown";
  if (playerId === viewingPlayerId) {
    const p = gs.players.find(p2 => p2.id === playerId);
    return p?.name || "Unknown";
  }
  // Backward compat: no metPlayers = all met
  if (!gs.metPlayers) {
    const p = gs.players.find(p2 => p2.id === playerId);
    return p?.name || "Unknown";
  }
  const met = gs.metPlayers[viewingPlayerId] || [];
  if (met.includes(playerId)) {
    const p = gs.players.find(p2 => p2.id === playerId);
    return p?.name || "Unknown";
  }
  // Generate "Player N" from the player index
  const idx = gs.players.findIndex(p2 => p2.id === playerId);
  return `Player ${idx + 1}`;
};

// Get display colors for a player (gray if not met)
export const getDisplayColors = (playerId, viewingPlayerId, gs) => {
  if (!gs || !gs.players) return UNKNOWN_COLORS;
  const p = gs.players.find(p2 => p2.id === playerId);
  if (!p) return UNKNOWN_COLORS;
  if (playerId === viewingPlayerId) return { color: p.color, colorBg: p.colorBg, colorLight: p.colorLight };
  // Backward compat: no metPlayers = all met
  if (!gs.metPlayers) return { color: p.color, colorBg: p.colorBg, colorLight: p.colorLight };
  const met = gs.metPlayers[viewingPlayerId] || [];
  if (met.includes(playerId)) return { color: p.color, colorBg: p.colorBg, colorLight: p.colorLight };
  return UNKNOWN_COLORS;
};

// Check for new meetings based on current fog visibility
// Returns array of newly met player IDs (does NOT mutate state)
export const checkNewMeetings = (gs, viewingPlayerId, fogVisible) => {
  if (!gs || !gs.players || !fogVisible || fogVisible.size === 0) return [];
  if (!gs.metPlayers) return []; // old save = all met, nothing new
  const met = gs.metPlayers[viewingPlayerId] || [];
  const newlyMet = [];

  for (const p of gs.players) {
    if (p.id === viewingPlayerId) continue;
    if (met.includes(p.id)) continue;

    let found = false;
    // Check units
    for (const u of p.units) {
      if (fogVisible.has(`${u.hexCol},${u.hexRow}`)) { found = true; break; }
    }
    // Check cities
    if (!found) {
      for (const c of p.cities) {
        const h = gs.hexes[c.hexId];
        if (h && fogVisible.has(`${h.col},${h.row}`)) { found = true; break; }
      }
    }
    if (found) newlyMet.push(p.id);
  }
  return newlyMet;
};

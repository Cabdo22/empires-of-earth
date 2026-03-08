// ============================================================
// CORE CONSTANTS & ISOMETRIC GRID MATH UTILITIES
// ============================================================

export const TILE_SIZE = 48;
export const ISO_HW = TILE_SIZE;       // half-width of isometric diamond (48)
export const ISO_HH = TILE_SIZE / 2;   // half-height of isometric diamond (24)

// Map dimensions — set dynamically by setMapConfig before game starts
export let COLS = 10;
export let ROWS = 10;
export let P1_START = { col: 2, row: 5 };
export let P2_START = { col: 8, row: 3 };

export const MAP_SIZES = {
  small:  { label: "Small",  desc: "~250 tiles · Quick game",  cols: 16, rows: 16 },
  medium: { label: "Medium", desc: "~500 tiles · Standard game", cols: 22, rows: 22 },
  large:  { label: "Large",  desc: "~1000 tiles · Epic game",  cols: 32, rows: 32 },
};

export const setMapConfig = (sizeKey) => {
  const cfg = MAP_SIZES[sizeKey] || MAP_SIZES.small;
  COLS = cfg.cols;
  ROWS = cfg.rows;
  P1_START = { col: Math.floor(COLS * 0.2), row: Math.floor(ROWS * 0.5) };
  P2_START = { col: Math.floor(COLS * 0.8), row: Math.floor(ROWS * 0.3) };
};

// Legacy aliases for compatibility
export const HEX_SIZE = TILE_SIZE;
export const SQRT3 = Math.sqrt(3);

// Isometric diamond tile vertices (centered on origin)
export const HEX_POINTS = `0,${-ISO_HH} ${ISO_HW},0 0,${ISO_HH} ${-ISO_HW},0`;

// Terrain elevation offsets (negative = raised, 0 = ground level)
export const TERRAIN_ELEV = { mountain: -16, grassland: 0, forest: -6, water: 4 };

// Convert grid (col, row) to isometric pixel center
export const hexCenter = (col, row) => ({
  x: (col - row) * ISO_HW + ROWS * ISO_HW + 50,
  y: (col + row) * ISO_HH + ISO_HH + 50,
});

// 8-directional neighbor deltas (cardinal + diagonal)
export const NEIGHBOR_DELTAS = [
  [0, -1], [1, -1], [1, 0], [1, 1],
  [0, 1], [-1, 1], [-1, 0], [-1, -1],
];

// Legacy aliases — no longer needed but kept so imports don't break
export const EVEN_COL_NEIGHBORS = NEIGHBOR_DELTAS;
export const ODD_COL_NEIGHBORS  = NEIGHBOR_DELTAS;

// O(1) tile lookup by col,row (tiles are stored col-major)
export const hexAt = (hexes, col, row) => hexes[col * ROWS + row];

// Get neighbor coords (clamped to map bounds)
export const getNeighbors = (col, row) => {
  return NEIGHBOR_DELTAS
    .map(([dc, dr]) => [col + dc, row + dr])
    .filter(([c, r]) => c >= 0 && c < COLS && r >= 0 && r < ROWS);
};

// Seeded PRNG (Mulberry32)
export const mulberry32 = (seed) => {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

// Game-state RNG: advances a counter stored in the game state for deterministic randomness
export const gameRng = (g) => {
  g.rngCounter = (g.rngCounter || 0) + 1;
  const rng = mulberry32(g.rngSeed + g.rngCounter);
  return rng();
};

// Chebyshev distance (appropriate for 8-directional grid)
export const hexDist = (c1, r1, c2, r2) => {
  return Math.max(Math.abs(c1 - c2), Math.abs(r1 - r2));
};

// All tiles within a given Chebyshev radius of (col, row)
export const getHexesInRadius = (col, row, radius, hexes) =>
  hexes.filter(h => hexDist(col, row, h.col, h.row) <= radius);

// Game balance constants
export const CITY_DEF_BONUS = 2;
export const TERRITORIAL_WIN = 0.6;
export const FOG_SIGHT = { scout: 3, fighter: 4, bomber: 3, default: 2 };

// Legacy phase constants kept for compatibility — game now uses single "MOVEMENT" phase
export const PHASES = ["MOVEMENT"];
export const PHASE_LABELS = { MOVEMENT: "Playing" };

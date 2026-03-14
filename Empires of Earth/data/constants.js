// ============================================================
// CORE CONSTANTS & HEX MATH UTILITIES
// ============================================================

export const HEX_SIZE = 48;
export const SQRT3 = Math.sqrt(3);

// Map dimensions — set dynamically by setMapConfig before game starts
export let COLS = 10;
export let ROWS = 10;
export let P1_START = { col: 2, row: 5 };
export let P2_START = { col: 8, row: 3 };

export const MAP_SIZES = {
  small:  { label: "Small",  desc: "~250 hexes · Quick game",  cols: 16, rows: 16 },
  medium: { label: "Medium", desc: "~500 hexes · Standard game", cols: 22, rows: 22 },
  large:  { label: "Large",  desc: "~1000 hexes · Epic game",  cols: 32, rows: 32 },
};

export const setMapConfig = (sizeKey) => {
  const cfg = MAP_SIZES[sizeKey] || MAP_SIZES.small;
  COLS = cfg.cols;
  ROWS = cfg.rows;
  P1_START = { col: Math.floor(COLS * 0.2), row: Math.floor(ROWS * 0.5) };
  P2_START = { col: Math.floor(COLS * 0.8), row: Math.floor(ROWS * 0.3) };
};

// Pre-compute the 6 vertices of a flat-top hexagon
export const HEX_POINTS = Array.from({ length: 6 }, (_, i) => {
  const angle = (Math.PI / 180) * 60 * i;
  return `${HEX_SIZE * Math.cos(angle)},${HEX_SIZE * Math.sin(angle)}`;
}).join(" ");

// Convert grid (col, row) to pixel center for rendering
export const hexCenter = (col, row) => ({
  x: col * 1.5 * HEX_SIZE + HEX_SIZE + 50,
  y: row * SQRT3 * HEX_SIZE + HEX_SIZE + 50 + (col % 2 === 1 ? (SQRT3 * HEX_SIZE) / 2 : 0),
});

// Offset-coordinate neighbor deltas differ for even vs odd columns
export const EVEN_COL_NEIGHBORS = [[1, -1], [1, 0], [0, 1], [-1, 0], [-1, -1], [0, -1]];
export const ODD_COL_NEIGHBORS  = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [0, -1]];

// O(1) hex lookup by col,row (hexes are stored col-major)
export const hexAt = (hexes, col, row) => hexes[col * ROWS + row];

// Get neighbor coords (clamped to map bounds)
export const getNeighbors = (col, row) => {
  const deltas = col % 2 === 0 ? EVEN_COL_NEIGHBORS : ODD_COL_NEIGHBORS;
  return deltas
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

// Convert offset coords to cube coords (for hex distance)
export const offsetToCube = (col, row) => {
  const q = col;
  const r = row - (col - (col & 1)) / 2;
  return { q, r, s: -q - r };
};

// Hex distance (simple cube-coordinate distance)
export const hexDist = (c1, r1, c2, r2) => {
  const a = offsetToCube(c1, r1);
  const b = offsetToCube(c2, r2);
  return Math.max(Math.abs(a.q - b.q), Math.abs(a.r - b.r), Math.abs(a.s - b.s));
};

// All hexes within a given radius of (col, row)
export const getHexesInRadius = (col, row, radius, hexes) =>
  hexes.filter(h => hexDist(col, row, h.col, h.row) <= radius);

// Game balance constants
export const CITY_DEF_BONUS = 2;
export const FOG_SIGHT = { scout: 2, fighter: 3, bomber: 2, default: 1 };

// Legacy phase constants kept for compatibility — game now uses single "MOVEMENT" phase
export const PHASES = ["MOVEMENT"];
export const PHASE_LABELS = { MOVEMENT: "Playing" };

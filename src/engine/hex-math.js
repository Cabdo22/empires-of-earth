// ============================================================
// HEX MATH — geometry, neighbors, distance, pathfinding coords
// ============================================================
import { HEX_SIZE, SQRT3 } from './constants.js';

// Convert grid (col, row) to pixel center for rendering
export const hexCenter = (col, row) => ({
  x: col * 1.5 * HEX_SIZE + HEX_SIZE + 50,
  y: row * SQRT3 * HEX_SIZE + HEX_SIZE + 50 + (col % 2 === 1 ? (SQRT3 * HEX_SIZE) / 2 : 0),
});

// Offset-coordinate neighbor deltas differ for even vs odd columns
export const EVEN_COL_NEIGHBORS = [[1, -1], [1, 0], [0, 1], [-1, 0], [-1, -1], [0, -1]];
export const ODD_COL_NEIGHBORS  = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [0, -1]];

// O(1) hex lookup by col,row (hexes are stored col-major)
export const hexAt = (hexes, col, row, mapConfig) => hexes[col * mapConfig.rows + row];

// Get neighbor coords (clamped to map bounds)
export const getNeighbors = (col, row, mapConfig) => {
  const deltas = col % 2 === 0 ? EVEN_COL_NEIGHBORS : ODD_COL_NEIGHBORS;
  return deltas
    .map(([dc, dr]) => [col + dc, row + dr])
    .filter(([c, r]) => c >= 0 && c < mapConfig.cols && r >= 0 && r < mapConfig.rows);
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

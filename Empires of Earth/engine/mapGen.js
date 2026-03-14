// ============================================================
// MAP GENERATION
// ============================================================

import { COLS, ROWS, P1_START, P2_START, mulberry32, hexCenter, getNeighbors } from '../data/constants.js';

// Grow a blob of terrain using flood-fill from a random seed point
const growTerrainBlob = (grid, rng, terrain, minSize, maxSize, protectedHexes) => {
  const size = minSize + Math.floor(rng() * (maxSize - minSize + 1));
  const key = (c, r) => `${c},${r}`;

  let startCol, startRow, attempts = 0;
  do {
    startCol = Math.floor(rng() * COLS);
    startRow = Math.floor(rng() * ROWS);
    attempts++;
  } while ((grid[startCol][startRow].terrain !== "grassland" || protectedHexes.has(key(startCol, startRow))) && attempts < 200);
  if (attempts >= 200) return 0;

  grid[startCol][startRow].terrain = terrain;
  let placed = 1;
  const visited = new Set([key(startCol, startRow)]);
  let frontier = getNeighbors(startCol, startRow).filter(
    ([c, r]) => grid[c][r].terrain === "grassland" && !visited.has(key(c, r)) && !protectedHexes.has(key(c, r))
  );

  while (placed < size && frontier.length > 0) {
    const idx = Math.floor(rng() * frontier.length);
    const [nc, nr] = frontier[idx];
    frontier.splice(idx, 1);
    if (grid[nc][nr].terrain !== "grassland") continue;

    grid[nc][nr].terrain = terrain;
    placed++;
    visited.add(key(nc, nr));

    for (const [fc, fr] of getNeighbors(nc, nr)) {
      if (!visited.has(key(fc, fr)) && grid[fc][fr].terrain === "grassland" && !protectedHexes.has(key(fc, fr))) {
        frontier.push([fc, fr]);
        visited.add(key(fc, fr));
      }
    }
  }
  return placed;
};

// Scatter resources across the map
const placeResources = (grid, rng, protectedHexes) => {
  const key = (c, r) => `${c},${r}`;
  const land = [], water = [];

  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < ROWS; r++) {
      if (grid[c][r].terrain !== "water") land.push([c, r]);
      else water.push([c, r]);
    }
  }

  const numResources = Math.round(land.length * 0.12);
  const shuffled = land.sort(() => rng() - 0.5);

  for (let i = 0; i < numResources && i < shuffled.length; i++) {
    const [c, r] = shuffled[i];
    if (protectedHexes.has(key(c, r))) continue;

    const roll = rng();
    if (grid[c][r].terrain === "mountain") {
      grid[c][r].resource = "uranium";
    } else if (roll < 0.4) {
      grid[c][r].resource = grid[c][r].terrain === "grassland" ? "wheat" : "iron";
    } else if (roll < 0.7) {
      grid[c][r].resource = "iron";
    } else {
      grid[c][r].resource = "oil";
    }
  }

  for (const [c, r] of water) {
    if (grid[c][r].isCoastal && rng() < 0.12) {
      grid[c][r].resource = "fish";
    } else if (rng() < 0.15) {
      grid[c][r].resource = "oil";
    }
  }
};

// Generate the full map grid
export const generateMap = () => {
  const rng = mulberry32(42);
  const key = (c, r) => `${c},${r}`;
  const protectedHexes = new Set([key(P1_START.col, P1_START.row), key(P2_START.col, P2_START.row)]);

  const grid = Array.from({ length: COLS }, () =>
    Array.from({ length: ROWS }, () => ({ terrain: "grassland", resource: null, isCoastal: false }))
  );

  const growUntil = (terrain, targetTiles, minBlob, maxBlob) => {
    let placed = 0, safety = 0;
    while (placed < targetTiles && safety < 50) {
      placed += growTerrainBlob(grid, rng, terrain, minBlob, maxBlob, protectedHexes);
      safety++;
    }
  };

  const totalHexes = COLS * ROWS;
  const scale = totalHexes / 100;
  growUntil("forest", Math.round(25 * scale), 3, Math.max(7, Math.round(7 * Math.sqrt(scale))));
  growUntil("mountain", Math.round(10 * scale), 2, Math.max(4, Math.round(4 * Math.sqrt(scale))));
  growUntil("water", Math.round(10 * scale), 3, Math.max(6, Math.round(6 * Math.sqrt(scale))));

  grid[P1_START.col][P1_START.row].terrain = "grassland";
  grid[P2_START.col][P2_START.row].terrain = "grassland";

  // Mark coastal water tiles (adjacent to any land)
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < ROWS; r++) {
      if (grid[c][r].terrain === "water") {
        grid[c][r].isCoastal = getNeighbors(c, r).some(([nc, nr]) => grid[nc][nr].terrain !== "water");
      }
    }
  }

  placeResources(grid, rng, protectedHexes);
  return grid;
};

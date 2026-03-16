// ============================================================
// MAP GENERATION
// ============================================================

import { COLS, ROWS, mulberry32, hexCenter, getNeighbors, hexDist } from '../data/constants.js';

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
    } else if (roll < 0.03) {
      grid[c][r].resource = "uranium";
    } else if (roll < 0.40) {
      grid[c][r].resource = grid[c][r].terrain === "grassland" ? "wheat" : "iron";
    } else if (roll < 0.70) {
      grid[c][r].resource = "iron";
    } else {
      grid[c][r].resource = "oil";
    }
  }

  for (const [c, r] of water) {
    if (grid[c][r].isCoastal) {
      const roll = rng();
      if (roll < 0.35) {
        grid[c][r].resource = "fish";
      } else if (roll < 0.50) {
        grid[c][r].resource = "oil";
      }
    }
  }
};

// Find N valid spawn positions on the completed terrain map, well-spaced apart
const findSpawnPositions = (grid, rng, numPlayers = 2) => {
  const candidates = [];
  const edgeBuffer = 3; // keep spawns away from map edges so cities have full tile access
  for (let c = edgeBuffer; c < COLS - edgeBuffer; c++) {
    for (let r = edgeBuffer; r < ROWS - edgeBuffer; r++) {
      if (grid[c][r].terrain !== "grassland") continue;
      const neighbors = getNeighbors(c, r);
      const grassCount = neighbors.filter(([nc, nr]) => grid[nc][nr].terrain === "grassland").length;
      if (grassCount >= 3) candidates.push({ col: c, row: r });
    }
  }

  // Shuffle candidates using rng
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }

  const spawns = [candidates[0]];
  const minDist = Math.max(Math.floor(Math.min(COLS, ROWS) * (numPlayers <= 2 ? 0.4 : 0.25)), numPlayers <= 2 ? 6 : 4);

  for (let n = 1; n < numPlayers; n++) {
    // Score each candidate by minimum distance to all existing spawns (maximize it)
    let bestCandidate = null;
    let bestMinDist = -1;

    for (const c of candidates) {
      const minDistToExisting = Math.min(...spawns.map(s => hexDist(c.col, c.row, s.col, s.row)));
      if (minDistToExisting >= minDist && minDistToExisting > bestMinDist) {
        bestMinDist = minDistToExisting;
        bestCandidate = c;
      }
    }

    // Fallback: if nothing meets minDist, just pick the farthest from existing spawns
    if (!bestCandidate) {
      bestCandidate = candidates
        .filter(c => !spawns.some(s => s.col === c.col && s.row === c.row))
        .sort((a, b) => {
          const aMin = Math.min(...spawns.map(s => hexDist(a.col, a.row, s.col, s.row)));
          const bMin = Math.min(...spawns.map(s => hexDist(b.col, b.row, s.col, s.row)));
          return bMin - aMin;
        })[0];
    }

    if (bestCandidate) spawns.push(bestCandidate);
  }

  return spawns.map(s => ({ col: s.col, row: s.row }));
};

// Generate the full map grid
export const generateMap = (seed, numPlayers = 2) => {
  const rng = mulberry32(seed);
  const emptyProtected = new Set();

  const grid = Array.from({ length: COLS }, () =>
    Array.from({ length: ROWS }, () => ({ terrain: "grassland", resource: null, isCoastal: false }))
  );

  const growUntil = (terrain, targetTiles, minBlob, maxBlob) => {
    let placed = 0, safety = 0;
    while (placed < targetTiles && safety < 50) {
      placed += growTerrainBlob(grid, rng, terrain, minBlob, maxBlob, emptyProtected);
      safety++;
    }
  };

  const totalHexes = COLS * ROWS;
  const scale = totalHexes / 100;
  growUntil("forest", Math.round(25 * scale), 3, Math.max(7, Math.round(7 * Math.sqrt(scale))));
  growUntil("mountain", Math.round(10 * scale), 2, Math.max(4, Math.round(4 * Math.sqrt(scale))));
  growUntil("water", Math.round(10 * scale), 3, Math.max(6, Math.round(6 * Math.sqrt(scale))));

  // Mark coastal water tiles (adjacent to any land)
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < ROWS; r++) {
      if (grid[c][r].terrain === "water") {
        grid[c][r].isCoastal = getNeighbors(c, r).some(([nc, nr]) => grid[nc][nr].terrain !== "water");
      }
    }
  }

  // Find spawn positions on the completed terrain
  const spawns = findSpawnPositions(grid, rng, numPlayers);

  // Force spawn hexes to grassland and clear resources
  const key = (c, r) => `${c},${r}`;
  const protectedHexes = new Set();
  for (const sp of spawns) {
    grid[sp.col][sp.row].terrain = "grassland";
    grid[sp.col][sp.row].resource = null;
    protectedHexes.add(key(sp.col, sp.row));
  }

  // Place resources, protecting spawn hexes
  placeResources(grid, rng, protectedHexes);

  return { grid, spawns };
};

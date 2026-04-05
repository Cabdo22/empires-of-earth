// ============================================================
// MAP GENERATION
// ============================================================

import { getMapConfig, mulberry32, getNeighbors, hexDist } from '../data/constants.js';

// Grow a blob of terrain using flood-fill from a random seed point
const growTerrainBlob = (grid, rng, terrain, minSize, maxSize, protectedHexes, mapConfig) => {
  const size = minSize + Math.floor(rng() * (maxSize - minSize + 1));
  const key = (c, r) => `${c},${r}`;
  const { cols, rows } = mapConfig;

  let startCol, startRow, attempts = 0;
  do {
    startCol = Math.floor(rng() * cols);
    startRow = Math.floor(rng() * rows);
    attempts++;
  } while ((grid[startCol][startRow].terrain !== "grassland" || protectedHexes.has(key(startCol, startRow))) && attempts < 200);
  if (attempts >= 200) return 0;

  grid[startCol][startRow].terrain = terrain;
  let placed = 1;
  const visited = new Set([key(startCol, startRow)]);
  let frontier = getNeighbors(startCol, startRow, mapConfig).filter(
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

    for (const [fc, fr] of getNeighbors(nc, nr, mapConfig)) {
      if (!visited.has(key(fc, fr)) && grid[fc][fr].terrain === "grassland" && !protectedHexes.has(key(fc, fr))) {
        frontier.push([fc, fr]);
        visited.add(key(fc, fr));
      }
    }
  }
  return placed;
};

// Scatter resources across the map with balanced distribution per player region
const placeResources = (grid, rng, protectedHexes, spawns, mapConfig) => {
  const key = (c, r) => `${c},${r}`;
  const { cols, rows } = mapConfig;

  // Assign each land hex to the nearest spawn (player region)
  const regions = spawns.map(() => ({ land: [], workable: [] }));

  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      if (grid[c][r].terrain === "water") continue;
      if (protectedHexes.has(key(c, r))) continue;

      let bestIdx = 0, bestDist = Infinity;
      for (let si = 0; si < spawns.length; si++) {
        const d = hexDist(c, r, spawns[si].col, spawns[si].row);
        if (d < bestDist) { bestDist = d; bestIdx = si; }
      }
      regions[bestIdx].land.push([c, r]);
      if (grid[c][r].terrain !== "mountain") {
        regions[bestIdx].workable.push([c, r]);
      }
    }
  }

  // Strategic resources each region must have at least 1 of
  const guaranteedResources = ["iron", "coal", "oil", "aluminum"];

  // Place guaranteed resources per region first (on workable tiles near spawn)
  for (let si = 0; si < spawns.length; si++) {
    const region = regions[si];
    // Sort workable tiles by distance to spawn (closest first for guaranteed resources)
    const sorted = region.workable
      .map(([c, r]) => ({ c, r, d: hexDist(c, r, spawns[si].col, spawns[si].row) }))
      .sort((a, b) => a.d - b.d);

    for (const resType of guaranteedResources) {
      // Find a suitable tile that doesn't already have a resource (prefer within 5 hex of spawn)
      for (const { c, r } of sorted) {
        if (grid[c][r].resource) continue;
        // Iron prefers forest, coal prefers forest, oil/aluminum prefer grassland
        const terrain = grid[c][r].terrain;
        const preferred = (resType === "iron" || resType === "coal") ? "forest" : "grassland";
        if (terrain !== preferred && rng() < 0.5) continue; // 50% chance to skip non-preferred
        grid[c][r].resource = resType;
        break;
      }
    }

    // Also guarantee wheat near each spawn
    for (const { c, r } of sorted) {
      if (grid[c][r].resource) continue;
      if (grid[c][r].terrain === "grassland") {
        grid[c][r].resource = "wheat";
        break;
      }
    }
  }

  // Place remaining resources randomly across all land (respecting density target)
  const allLand = [];
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      if (grid[c][r].terrain === "water" || grid[c][r].resource) continue;
      if (protectedHexes.has(key(c, r))) continue;
      allLand.push([c, r]);
    }
  }

  const totalLand = cols * rows; // approximate
  const targetResources = Math.round(totalLand * 0.10);
  const alreadyPlaced = spawns.length * (guaranteedResources.length + 1);
  const remaining = Math.max(0, targetResources - alreadyPlaced);

  const shuffled = allLand.sort(() => rng() - 0.5);
  for (let i = 0; i < remaining && i < shuffled.length; i++) {
    const [c, r] = shuffled[i];
    const roll = rng();
    if (grid[c][r].terrain === "mountain") {
      grid[c][r].resource = "uranium";
    } else if (roll < 0.03) {
      grid[c][r].resource = "uranium";
    } else if (roll < 0.25) {
      grid[c][r].resource = grid[c][r].terrain === "grassland" ? "wheat" : "iron";
    } else if (roll < 0.42) {
      grid[c][r].resource = "iron";
    } else if (roll < 0.57) {
      grid[c][r].resource = "coal";
    } else if (roll < 0.72) {
      grid[c][r].resource = "oil";
    } else if (roll < 0.87) {
      grid[c][r].resource = "aluminum";
    } else {
      grid[c][r].resource = "coal";
    }
  }

  // Water resources (unchanged — fish and oil on coastal)
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      if (grid[c][r].terrain !== "water") continue;
      if (grid[c][r].isCoastal) {
        const roll = rng();
        if (roll < 0.35) {
          grid[c][r].resource = "fish";
        } else if (roll < 0.50) {
          grid[c][r].resource = "oil";
        }
      }
    }
  }
};

// Find N valid spawn positions on the completed terrain map, well-spaced apart
const findSpawnPositions = (grid, rng, numPlayers = 2, mapConfig) => {
  const { cols, rows } = mapConfig;
  const candidates = [];
  const edgeBuffer = 3; // keep spawns away from map edges so cities have full tile access
  for (let c = edgeBuffer; c < cols - edgeBuffer; c++) {
    for (let r = edgeBuffer; r < rows - edgeBuffer; r++) {
      if (grid[c][r].terrain !== "grassland") continue;
      const neighbors = getNeighbors(c, r, mapConfig);
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
  const minDist = Math.max(Math.floor(Math.min(cols, rows) * (numPlayers <= 2 ? 0.4 : 0.25)), numPlayers <= 2 ? 6 : 4);

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
export const generateMap = (seed, numPlayers = 2, inputMapConfig = {}) => {
  const mapConfig = getMapConfig(inputMapConfig);
  const { cols, rows } = mapConfig;
  const rng = mulberry32(seed);
  const emptyProtected = new Set();

  const grid = Array.from({ length: cols }, () =>
    Array.from({ length: rows }, () => ({ terrain: "grassland", resource: null, isCoastal: false }))
  );

  const growUntil = (terrain, targetTiles, minBlob, maxBlob) => {
    let placed = 0, safety = 0;
    while (placed < targetTiles && safety < 50) {
      placed += growTerrainBlob(grid, rng, terrain, minBlob, maxBlob, emptyProtected, mapConfig);
      safety++;
    }
  };

  const totalHexes = cols * rows;
  const scale = totalHexes / 100;
  growUntil("forest", Math.round(25 * scale), 3, Math.max(7, Math.round(7 * Math.sqrt(scale))));
  growUntil("mountain", Math.round(10 * scale), 2, Math.max(4, Math.round(4 * Math.sqrt(scale))));
  growUntil("water", Math.round(10 * scale), 3, Math.max(6, Math.round(6 * Math.sqrt(scale))));

  // Mark coastal water tiles (adjacent to any land)
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      if (grid[c][r].terrain === "water") {
        grid[c][r].isCoastal = getNeighbors(c, r, mapConfig).some(([nc, nr]) => grid[nc][nr].terrain !== "water");
      }
    }
  }

  // Find spawn positions on the completed terrain
  const spawns = findSpawnPositions(grid, rng, numPlayers, mapConfig);

  // Force spawn hexes to grassland and clear resources
  const key = (c, r) => `${c},${r}`;
  const protectedHexes = new Set();
  for (const sp of spawns) {
    grid[sp.col][sp.row].terrain = "grassland";
    grid[sp.col][sp.row].resource = null;
    protectedHexes.add(key(sp.col, sp.row));
  }

  // Place resources, protecting spawn hexes, balanced per player region
  placeResources(grid, rng, protectedHexes, spawns, mapConfig);

  return { grid, spawns };
};

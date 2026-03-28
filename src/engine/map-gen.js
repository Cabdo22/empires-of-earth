// ============================================================
// MAP GENERATION — procedural terrain and resource placement
// ============================================================
import { UNIT_DEFS } from './constants.js';
import { hexCenter, getNeighbors, hexAt, mulberry32 } from './hex-math.js';

// Grow a blob of terrain using flood-fill from a random seed point
export const growTerrainBlob = (grid, rng, terrain, minSize, maxSize, protectedHexes, mapConfig) => {
  const size = minSize + Math.floor(rng() * (maxSize - minSize + 1));
  const key = (c, r) => `${c},${r}`;

  let startCol, startRow, attempts = 0;
  do {
    startCol = Math.floor(rng() * mapConfig.cols);
    startRow = Math.floor(rng() * mapConfig.rows);
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

// Scatter resources across the map
export const placeResources = (grid, rng, protectedHexes, mapConfig) => {
  const key = (c, r) => `${c},${r}`;
  const land = [], water = [];

  for (let c = 0; c < mapConfig.cols; c++) {
    for (let r = 0; r < mapConfig.rows; r++) {
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
    if (rng() < 0.25) grid[c][r].resource = "oil";
  }
};

export const generateMap = (mapConfig) => {
  const { cols, rows, p1Start, p2Start } = mapConfig;
  const rng = mulberry32(42);
  const key = (c, r) => `${c},${r}`;
  const protectedHexes = new Set([key(p1Start.col, p1Start.row), key(p2Start.col, p2Start.row)]);

  const grid = Array.from({ length: cols }, () =>
    Array.from({ length: rows }, () => ({ terrain: "grassland", resource: null }))
  );

  const growUntil = (terrain, targetTiles, minBlob, maxBlob) => {
    let placed = 0, safety = 0;
    while (placed < targetTiles && safety < 50) {
      placed += growTerrainBlob(grid, rng, terrain, minBlob, maxBlob, protectedHexes, mapConfig);
      safety++;
    }
  };

  const totalHexes = cols * rows;
  const scale = totalHexes / 100;
  growUntil("forest", Math.round(25 * scale), 3, Math.max(7, Math.round(7 * Math.sqrt(scale))));
  growUntil("mountain", Math.round(10 * scale), 2, Math.max(4, Math.round(4 * Math.sqrt(scale))));
  growUntil("water", Math.round(10 * scale), 3, Math.max(6, Math.round(6 * Math.sqrt(scale))));

  grid[p1Start.col][p1Start.row].terrain = "grassland";
  grid[p2Start.col][p2Start.row].terrain = "grassland";

  placeResources(grid, rng, protectedHexes, mapConfig);
  return grid;
};

// Create a unit object
export const mkUnit = (pid, type, col, row, nextUnitId) => {
  const d = UNIT_DEFS[type];
  return {
    id: `${pid}-u${nextUnitId}`,
    unitType: type,
    hexCol: col,
    hexRow: row,
    movementCurrent: d.move,
    hpCurrent: d.hp,
    hasAttacked: false,
  };
};

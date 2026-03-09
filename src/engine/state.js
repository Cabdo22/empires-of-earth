// ============================================================
// STATE — initial game state creation
// ============================================================
import { MAP_SIZES, CIV_DEFS } from './constants.js';
import { hexCenter, hexAt } from './hex-math.js';
import { generateMap, mkUnit } from './map-gen.js';
import { getVisibleHexes } from './fog.js';

// Build mapConfig from a size key
export const buildMapConfig = (sizeKey) => {
  const cfg = MAP_SIZES[sizeKey] || MAP_SIZES.small;
  return {
    cols: cfg.cols,
    rows: cfg.rows,
    p1Start: { col: Math.floor(cfg.cols * 0.2), row: Math.floor(cfg.rows * 0.5) },
    p2Start: { col: Math.floor(cfg.cols * 0.8), row: Math.floor(cfg.rows * 0.3) },
  };
};

export const createInitialState = (civ1 = "Rome", civ2 = "China", mapConfig) => {
  let nextUnitId = 0;
  const gridData = generateMap(mapConfig);
  const hexes = [];
  let id = 0;

  for (let col = 0; col < mapConfig.cols; col++) {
    for (let row = 0; row < mapConfig.rows; row++) {
      const { x, y } = hexCenter(col, row);
      const g = gridData[col][row];
      hexes.push({
        id: id++, col, row, x, y,
        uk: `${col},${row}`,
        terrainType: g.terrain,
        resource: g.resource,
        ownerPlayerId: null,
        cityId: null,
      });
    }
  }

  const p1H = hexAt(hexes, mapConfig.p1Start.col, mapConfig.p1Start.row, mapConfig);
  const p2H = hexAt(hexes, mapConfig.p2Start.col, mapConfig.p2Start.row, mapConfig);
  const c1 = CIV_DEFS[civ1], c2 = CIV_DEFS[civ2];

  const makeUnit = (pid, type, col, row) => {
    const u = mkUnit(pid, type, col, row, nextUnitId);
    nextUnitId++;
    return u;
  };

  const players = [
    {
      id: "p1", civilization: civ1, name: c1.name, color: c1.color, colorBg: c1.colorBg, colorLight: c1.colorLight,
      gold: 5, researchedTechs: ["basic_tools"], currentResearch: null,
      cities: [{
        id: c1.capital.toLowerCase(), name: c1.capital, hexId: p1H.id, population: 1,
        districts: [], currentProduction: null, productionProgress: 0, foodAccumulated: 0, hp: 20, hpMax: 20,
      }],
      units: [
        makeUnit("p1", "warrior", mapConfig.p1Start.col, mapConfig.p1Start.row),
        makeUnit("p1", "scout", mapConfig.p1Start.col, mapConfig.p1Start.row),
      ],
    },
    {
      id: "p2", civilization: civ2, name: c2.name, color: c2.color, colorBg: c2.colorBg, colorLight: c2.colorLight,
      gold: 5, researchedTechs: ["basic_tools"], currentResearch: null,
      cities: [{
        id: c2.capital.toLowerCase(), name: c2.capital, hexId: p2H.id, population: 1,
        districts: [], currentProduction: null, productionProgress: 0, foodAccumulated: 0, hp: 20, hpMax: 20,
      }],
      units: [
        makeUnit("p2", "warrior", mapConfig.p2Start.col, mapConfig.p2Start.row),
        makeUnit("p2", "scout", mapConfig.p2Start.col, mapConfig.p2Start.row),
      ],
    },
  ];

  p1H.cityId = c1.capital.toLowerCase();
  p1H.ownerPlayerId = "p1";
  p2H.cityId = c2.capital.toLowerCase();
  p2H.ownerPlayerId = "p2";

  // Compute initial explored hexes
  const explored = {};
  for (const p of players) {
    explored[p.id] = [...getVisibleHexes(p, hexes)];
  }

  return {
    turnNumber: 1,
    currentPlayerId: "p1",
    phase: "MOVEMENT",
    players,
    hexes,
    victoryStatus: null,
    nextUnitId,
    log: [`Game started. Turn 1 — ${c1.name}`],
    barbarians: [],
    eventMsg: null,
    rngSeed: 42,
    rngCounter: 0,
    explored,
    mapConfig,
  };
};

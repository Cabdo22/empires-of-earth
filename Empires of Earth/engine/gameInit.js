// ============================================================
// GAME INITIALIZATION — create initial game state
// ============================================================

import { getMapConfig, hexCenter, hexAt } from '../data/constants.js';
import { UNIT_DEFS } from '../data/units.js';
import { CIV_DEFS } from '../data/civs.js';
import { generateMap } from './mapGen.js';
import { getVisibleHexes, findOpenNeighbor } from './movement.js';
import { initCityBorders } from './turnProcessing.js';
import { createInitialDiplomacyState } from './diplomacy.js';

let uidCtr = 0;

export const resetUidCounter = () => { uidCtr = 0; };

const mkId = (pid) => `${pid}-u${uidCtr++}`;

export const mkUnit = (pid, type, col, row) => {
  const d = UNIT_DEFS[type];
  return {
    id: mkId(pid), unitType: type,
    hexCol: col, hexRow: row,
    movementCurrent: d.move, hpCurrent: d.hp, hasAttacked: false,
  };
};

// AI difficulty bonuses: { goldBonus, prodBonus, sciBonus, smarter }
export const AI_DIFFICULTY = {
  easy:   { goldBonus: -0.25, prodBonus: -0.25, sciBonus: -0.25, smarter: false, label: "Easy" },
  normal: { goldBonus: 0,     prodBonus: 0,     sciBonus: 0,     smarter: false, label: "Normal" },
  hard:   { goldBonus: 0.5,   prodBonus: 0.5,   sciBonus: 0.5,   smarter: true,  label: "Hard" },
};

/**
 * Create initial game state for N players.
 * @param {Array} playerConfigs - Array of { civ, type: "human"|"ai", difficulty?: "easy"|"normal"|"hard" }
 */
export const createInitialState = (playerConfigs, options = {}) => {
  uidCtr = 0;
  const numPlayers = playerConfigs.length;
  const resolvedOptions = typeof options === "string" ? { mapSizeKey: options } : options;
  const mapConfig = getMapConfig(resolvedOptions.mapConfig || resolvedOptions.mapSizeKey);
  const seed = resolvedOptions.seed ?? (Date.now() % 2147483647);
  const { grid: gridData, spawns } = generateMap(seed, numPlayers, mapConfig);
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
        isCoastal: g.isCoastal || false,
        ownerPlayerId: null,
        cityId: null,
        cityBorderId: null,
        road: false,
        roadOwner: null,
      });
    }
  }

  const players = [];
  const explored = {};

  for (let i = 0; i < numPlayers; i++) {
    const cfg = playerConfigs[i];
    const pid = `p${i + 1}`;
    const civDef = CIV_DEFS[cfg.civ];
    const spawn = spawns[i];
    const spawnHex = hexAt(hexes, spawn.col, spawn.row, mapConfig);
    const scoutSpawn = findOpenNeighbor(spawn.col, spawn.row, hexes, [], []);

    const player = {
      id: pid,
      civilization: cfg.civ,
      name: civDef.name,
      color: civDef.color,
      colorBg: civDef.colorBg,
      colorLight: civDef.colorLight,
      gold: 30,
      researchedTechs: ["basic_tools"],
      currentResearch: null,
      scienceProjectsCompleted: [],
      type: cfg.type || "human",        // "human" or "ai"
      difficulty: cfg.difficulty || "normal",  // "easy", "normal", "hard"
      cities: [{
        id: civDef.capital.toLowerCase(),
        name: civDef.capital,
        hexId: spawnHex.id,
        population: 1,
        districts: [],
        currentProduction: null,
        productionProgress: 0,
        foodAccumulated: 0,
        hp: 23,
        hpMax: 23,
        workedTileIds: [],
        borderHexIds: [],
        tradeRoutes: [],
      }],
      units: [
        mkUnit(pid, "warrior", spawn.col, spawn.row),
        mkUnit(pid, "scout", scoutSpawn?.col ?? spawn.col, scoutSpawn?.row ?? spawn.row),
      ],
    };

    spawnHex.cityId = civDef.capital.toLowerCase();
    players.push(player);
  }

  // Initialize city borders for all players
  for (const p of players) {
    initCityBorders(p.cities[0], p, hexes);
  }

  // Compute initial explored hexes for all players
  for (const p of players) {
    explored[p.id] = [...getVisibleHexes(p, hexes)];
  }

  return {
    mapSizeKey: mapConfig.key,
    mapConfig: { cols: mapConfig.cols, rows: mapConfig.rows },
    turnNumber: 1,
    currentPlayerId: "p1",
    phase: "MOVEMENT",
    players,
    hexes,
    victoryStatus: null,
    nextUnitId: uidCtr,
    log: [`Game started. Turn 1 — ${players[0].name}`],
    barbarians: [],
    eventMsg: null,
    rngSeed: seed,
    rngCounter: 0,
    explored,
    metPlayers: Object.fromEntries(players.map(p => [p.id, []])),
    diplomacy: createInitialDiplomacyState(players, 1),
  };
};

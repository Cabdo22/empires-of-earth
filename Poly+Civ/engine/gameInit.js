// ============================================================
// GAME INITIALIZATION — create initial game state
// ============================================================

import { COLS, ROWS, P1_START, P2_START, hexCenter, hexAt } from '../data/constants.js';
import { UNIT_DEFS } from '../data/units.js';
import { CIV_DEFS } from '../data/civs.js';
import { generateMap } from './mapGen.js';
import { getVisibleHexes } from './movement.js';

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

export const createInitialState = (civ1 = "Rome", civ2 = "China") => {
  uidCtr = 0;
  const gridData = generateMap();
  const hexes = [];
  let id = 0;

  for (let col = 0; col < COLS; col++) {
    for (let row = 0; row < ROWS; row++) {
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

  const p1H = hexAt(hexes, P1_START.col, P1_START.row);
  const p2H = hexAt(hexes, P2_START.col, P2_START.row);
  const c1 = CIV_DEFS[civ1], c2 = CIV_DEFS[civ2];

  const players = [
    {
      id: "p1", civilization: civ1, name: c1.name,
      color: c1.color, colorBg: c1.colorBg, colorLight: c1.colorLight,
      gold: 5, researchedTechs: ["basic_tools"], currentResearch: null,
      cities: [{
        id: c1.capital.toLowerCase(), name: c1.capital, hexId: p1H.id, population: 1,
        districts: [], currentProduction: null, productionProgress: 0, foodAccumulated: 0, hp: 20, hpMax: 20,
      }],
      units: [mkUnit("p1", "warrior", P1_START.col, P1_START.row), mkUnit("p1", "scout", P1_START.col, P1_START.row)],
    },
    {
      id: "p2", civilization: civ2, name: c2.name,
      color: c2.color, colorBg: c2.colorBg, colorLight: c2.colorLight,
      gold: 5, researchedTechs: ["basic_tools"], currentResearch: null,
      cities: [{
        id: c2.capital.toLowerCase(), name: c2.capital, hexId: p2H.id, population: 1,
        districts: [], currentProduction: null, productionProgress: 0, foodAccumulated: 0, hp: 20, hpMax: 20,
      }],
      units: [mkUnit("p2", "warrior", P2_START.col, P2_START.row), mkUnit("p2", "scout", P2_START.col, P2_START.row)],
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
    nextUnitId: uidCtr,
    log: [`Game started. Turn 1 — ${c1.name}`],
    barbarians: [],
    eventMsg: null,
    rngSeed: 42,
    rngCounter: 0,
    explored,
  };
};

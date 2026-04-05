import assert from "node:assert/strict";

import { hexCenter, setMapConfig } from "../data/constants.js";
import { createInitialState } from "../engine/gameInit.js";
import { applyEndTurn, applyFoundCity, applyMoveUnit } from "../engine/actions.js";
import { createInitialDiplomacyState } from "../engine/diplomacy.js";
import { getRangedTargets } from "../engine/movement.js";
import { findHexFromWorldPoint } from "../utils/boardCoordinates.js";

const results = [];

const runTest = (name, fn) => {
  try {
    fn();
    results.push({ name, ok: true });
    console.log(`PASS ${name}`);
  } catch (error) {
    results.push({ name, ok: false, error });
    console.error(`FAIL ${name}`);
    console.error(error);
  }
};

const makeHexes = (cols, rows) => {
  const hexes = [];
  let id = 0;
  for (let col = 0; col < cols; col++) {
    for (let row = 0; row < rows; row++) {
      const { x, y } = hexCenter(col, row);
      hexes.push({
        id: id++,
        col,
        row,
        x,
        y,
        uk: `${col},${row}`,
        terrainType: "grassland",
        resource: null,
        isCoastal: false,
        ownerPlayerId: null,
        cityId: null,
        cityBorderId: null,
        road: false,
        roadOwner: null,
      });
    }
  }
  return hexes;
};

const makePlayer = (id, overrides = {}) => ({
  id,
  civilization: id === "p1" ? "Rome" : "China",
  name: id === "p1" ? "Rome" : "China",
  color: "#fff",
  colorBg: "#333",
  colorLight: "#ddd",
  gold: 100,
  researchedTechs: ["basic_tools"],
  currentResearch: null,
  type: "human",
  difficulty: "normal",
  cities: [],
  units: [],
  ...overrides,
});

const makeState = ({ cols = 5, rows = 5, players = null, currentPlayerId = "p1", turnNumber = 1 } = {}) => {
  const resolvedPlayers = players || [makePlayer("p1"), makePlayer("p2")];
  return {
    mapSizeKey: "test",
    mapConfig: { cols, rows },
    turnNumber,
    currentPlayerId,
    phase: "MOVEMENT",
    players: resolvedPlayers,
    hexes: makeHexes(cols, rows),
    victoryStatus: null,
    nextUnitId: 10,
    log: [],
    barbarians: [],
    eventMsg: null,
    rngSeed: 1,
    rngCounter: 0,
    explored: {},
    metPlayers: Object.fromEntries(resolvedPlayers.map((player) => [player.id, []])),
    diplomacy: createInitialDiplomacyState(resolvedPlayers, turnNumber),
  };
};

runTest("createInitialState honors explicit map size without ambient config", () => {
  setMapConfig("large");

  const smallState = createInitialState(
    [
      { civ: "Rome", type: "human" },
      { civ: "China", type: "ai", difficulty: "normal" },
    ],
    { mapSizeKey: "small", seed: 12345 }
  );

  const mediumState = createInitialState(
    [
      { civ: "Rome", type: "human" },
      { civ: "China", type: "ai", difficulty: "normal" },
    ],
    { mapSizeKey: "medium", seed: 12345 }
  );

  assert.deepEqual(smallState.mapConfig, { cols: 18, rows: 16 });
  assert.equal(smallState.hexes.length, 18 * 16);
  assert.deepEqual(mediumState.mapConfig, { cols: 25, rows: 22 });
  assert.equal(mediumState.hexes.length, 25 * 22);
});

runTest("applyMoveUnit uses state map bounds instead of mutable globals", () => {
  setMapConfig("large");
  const p1 = makePlayer("p1", {
    units: [{ id: "u1", unitType: "warrior", hexCol: 1, hexRow: 1, movementCurrent: 2, hpCurrent: 10, hasAttacked: false }],
  });
  const p2 = makePlayer("p2");
  const state = makeState({ cols: 4, rows: 4, players: [p1, p2] });

  const result = applyMoveUnit(state, { unitId: "u1", col: 2, row: 1 });
  const moved = result.state.players[0].units[0];

  assert.equal(moved.hexCol, 2);
  assert.equal(moved.hexRow, 1);
  assert.equal(moved.movementCurrent, 1);
});

runTest("getRangedTargets is clamped to the hex array dimensions", () => {
  setMapConfig("large");
  const hexes = makeHexes(4, 4);
  const targets = getRangedTargets(1, 1, 8, hexes);

  assert.equal(targets.size, 15);
  assert.ok(!targets.has("4,4"));
  assert.ok(targets.has("3,3"));
});

runTest("canvas hex hit-testing uses the current board dimensions instead of ambient globals", () => {
  setMapConfig("small");
  const mediumHexes = makeHexes(25, 22);
  const targetHex = mediumHexes.find((hex) => hex.col === 18 && hex.row === 10);

  const hit = findHexFromWorldPoint({
    worldX: targetHex.x,
    worldY: targetHex.y,
    hexes: mediumHexes,
  });

  assert.ok(hit);
  assert.equal(hit.hex.id, targetHex.id);
  assert.equal(hit.col, 18);
  assert.equal(hit.row, 10);
});

runTest("applyFoundCity and applyEndTurn preserve explicit map-config state", () => {
  setMapConfig("large");

  const p1 = makePlayer("p1", {
    cities: [{ id: "rome", name: "Rome", hexId: 0, population: 1, districts: [], currentProduction: null, productionProgress: 0, foodAccumulated: 0, hp: 20, hpMax: 20, workedTileIds: [], borderHexIds: [0], tradeRoutes: [] }],
    units: [{ id: "settler-1", unitType: "settler", hexCol: 4, hexRow: 4, movementCurrent: 2, hpCurrent: 10, hasAttacked: false }],
  });
  const p2 = makePlayer("p2");
  const state = makeState({ cols: 5, rows: 5, players: [p1, p2] });
  state.hexes[0].cityId = "rome";
  state.hexes[0].ownerPlayerId = "p1";

  const founded = applyFoundCity(state, { unitId: "settler-1", col: 4, row: 4 }).state;

  assert.equal(founded.players[0].cities.length, 2);
  assert.deepEqual(founded.mapConfig, { cols: 5, rows: 5 });

  const ended = applyEndTurn(founded).state;
  assert.equal(ended.currentPlayerId, "p2");
  assert.deepEqual(ended.mapConfig, { cols: 5, rows: 5 });
});

if (results.some((result) => !result.ok)) {
  process.exitCode = 1;
}

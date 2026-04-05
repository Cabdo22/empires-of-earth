import assert from "node:assert/strict";

import { hexCenter } from "../data/constants.js";
import { applyAttack, applyBuildRoad, applyEndTurn, applyFoundCity, applyMoveUnit, applySelectResearch, applySetProduction } from "../engine/actions.js";
import { createInitialDiplomacyState } from "../engine/diplomacy.js";
import { validateGameplayAction } from "../engine/actionValidation.js";
import { applyGameplayAction } from "../engine/gameplayActionApplier.js";

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
  researchedTechs: ["basic_tools", "agriculture", "hunting", "trade", "bronze_working"],
  currentResearch: null,
  type: "human",
  difficulty: "normal",
  cities: [],
  units: [],
  ...overrides,
});

const makeCity = (id, hexId, overrides = {}) => ({
  id,
  name: id,
  hexId,
  population: 1,
  districts: [],
  currentProduction: null,
  productionProgress: 0,
  foodAccumulated: 0,
  hp: 20,
  hpMax: 20,
  workedTileIds: [],
  borderHexIds: [hexId],
  tradeRoutes: [],
  ...overrides,
});

const makeState = ({ cols = 6, rows = 6, players = null, currentPlayerId = "p1", turnNumber = 1, barbarians = [] } = {}) => {
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
    nextCityId: 1,
    log: [],
    barbarians,
    eventMsg: null,
    rngSeed: 1,
    rngCounter: 0,
    explored: {},
    metPlayers: Object.fromEntries(resolvedPlayers.map((player) => [player.id, []])),
    diplomacy: createInitialDiplomacyState(resolvedPlayers, turnNumber),
  };
};

runTest("shared applier allows repeated movement while movement points remain", () => {
  const p1 = makePlayer("p1", {
    units: [{ id: "u1", unitType: "warrior", hexCol: 1, hexRow: 1, movementCurrent: 2, hpCurrent: 15, hasAttacked: false }],
  });
  const p2 = makePlayer("p2");
  let state = makeState({ cols: 5, rows: 5, players: [p1, p2] });

  const firstAction = { type: "MOVE_UNIT", unitId: "u1", col: 2, row: 1 };
  assert.equal(validateGameplayAction(state, firstAction, "p1"), null);
  state = applyGameplayAction(state, firstAction).state;

  const secondAction = { type: "MOVE_UNIT", unitId: "u1", col: 3, row: 1 };
  assert.equal(validateGameplayAction(state, secondAction, "p1"), null);
  state = applyGameplayAction(state, secondAction).state;

  const unit = state.players[0].units[0];
  assert.equal(unit.hexCol, 3);
  assert.equal(unit.hexRow, 1);
  assert.equal(unit.movementCurrent, 0);
});

runTest("shared move applier matches direct engine move application", () => {
  const p1 = makePlayer("p1", {
    units: [{ id: "u1", unitType: "warrior", hexCol: 1, hexRow: 1, movementCurrent: 2, hpCurrent: 15, hasAttacked: false }],
  });
  const p2 = makePlayer("p2");
  const state = makeState({ cols: 5, rows: 5, players: [p1, p2] });
  const action = { type: "MOVE_UNIT", unitId: "u1", col: 2, row: 1 };

  const direct = applyMoveUnit(state, { unitId: "u1", col: 2, row: 1 });
  const shared = applyGameplayAction(state, action);

  assert.deepEqual(shared.state, direct.state);
  assert.deepEqual(shared.events, direct.events);
});

runTest("shared attack applier matches direct engine attack application", () => {
  const p1 = makePlayer("p1", {
    units: [{ id: "archer-1", unitType: "archer", hexCol: 1, hexRow: 1, movementCurrent: 2, hpCurrent: 10, hasAttacked: false }],
  });
  const p2 = makePlayer("p2");
  const state = makeState({
    cols: 5,
    rows: 5,
    players: [p1, p2],
    barbarians: [{ id: "barb-1", unitType: "warrior", hexCol: 2, hexRow: 1, hpCurrent: 15 }],
  });
  const action = { type: "ATTACK", attackerId: "archer-1", col: 2, row: 1 };

  assert.equal(validateGameplayAction(state, action, "p1"), null);

  const direct = applyAttack(state, { attackerId: "archer-1", col: 2, row: 1 });
  const shared = applyGameplayAction(state, action);

  assert.deepEqual(shared.state, direct.state);
  assert.deepEqual(shared.events, direct.events);
});

runTest("shared research applier matches direct engine research application", () => {
  const p1 = makePlayer("p1", {
    researchedTechs: ["basic_tools", "agriculture", "hunting"],
  });
  const p2 = makePlayer("p2");
  const state = makeState({ players: [p1, p2] });
  const action = { type: "SELECT_RESEARCH", techId: "pottery" };

  assert.equal(validateGameplayAction(state, action, "p1"), null);

  const direct = applySelectResearch(state, { techId: "pottery" });
  const shared = applyGameplayAction(state, action);

  assert.deepEqual(shared.state, direct.state);
  assert.deepEqual(shared.events, direct.events);
});

runTest("shared production applier matches direct engine production application", () => {
  const p1 = makePlayer("p1", {
    cities: [makeCity("rome", 0)],
  });
  const p2 = makePlayer("p2");
  const state = makeState({ players: [p1, p2] });
  state.hexes[0].cityId = "rome";
  state.hexes[0].ownerPlayerId = "p1";
  const action = { type: "SET_PRODUCTION", cityId: "rome", prodType: "unit", itemId: "warrior" };

  assert.equal(validateGameplayAction(state, action, "p1"), null);

  const direct = applySetProduction(state, { cityId: "rome", type: "unit", itemId: "warrior" });
  const shared = applyGameplayAction(state, action);

  assert.deepEqual(shared.state, direct.state);
  assert.deepEqual(shared.events, direct.events);
});

runTest("shared found-city applier matches direct engine city founding", () => {
  const p1 = makePlayer("p1", {
    units: [{ id: "settler-1", unitType: "settler", hexCol: 3, hexRow: 3, movementCurrent: 2, hpCurrent: 10, hasAttacked: false }],
  });
  const p2 = makePlayer("p2");
  const state = makeState({ cols: 6, rows: 6, players: [p1, p2] });
  const action = { type: "FOUND_CITY", unitId: "settler-1", col: 3, row: 3 };

  assert.equal(validateGameplayAction(state, action, "p1"), null);

  const direct = applyFoundCity(state, { unitId: "settler-1", col: 3, row: 3 });
  const shared = applyGameplayAction(state, action);

  assert.deepEqual(shared.state, direct.state);
  assert.deepEqual(shared.events, direct.events);
});

runTest("shared build-road applier matches direct engine road construction", () => {
  const p1 = makePlayer("p1");
  const p2 = makePlayer("p2");
  const state = makeState({ players: [p1, p2] });
  state.hexes[1].ownerPlayerId = "p1";
  const action = { type: "BUILD_ROAD", hexId: 1 };

  const direct = applyBuildRoad(state, { hexId: 1 });
  const shared = applyGameplayAction(state, action);

  assert.deepEqual(shared.state, direct.state);
  assert.deepEqual(shared.events, direct.events);
});

runTest("shared end-turn applier matches direct engine turn advancement", () => {
  const p1 = makePlayer("p1", {
    cities: [makeCity("rome", 0)],
  });
  const p2 = makePlayer("p2");
  const state = makeState({ players: [p1, p2] });
  state.hexes[0].cityId = "rome";
  state.hexes[0].ownerPlayerId = "p1";
  const action = { type: "END_TURN" };

  const direct = applyEndTurn(state);
  const shared = applyGameplayAction(state, action);

  assert.deepEqual(shared.state, direct.state);
  assert.deepEqual(shared.events, direct.events);
});

if (results.some((result) => !result.ok)) {
  process.exitCode = 1;
}

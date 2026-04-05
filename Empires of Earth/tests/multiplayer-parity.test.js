import assert from "node:assert/strict";

import { hexCenter } from "../data/constants.js";
import {
  applyAttack,
  applyBuildRoad,
  applyCancelProduction,
  applyEndTurn,
  applyFoundCity,
  applyLaunchNuke,
  applyMoveUnit,
  applySelectResearch,
  applySetProduction,
  applySetTradeFocus,
  applyUpgradeUnit,
} from "../engine/actions.js";
import { validateGameplayAction } from "../engine/actionValidation.js";
import { createInitialDiplomacyState, declareWar } from "../engine/diplomacy.js";
import { filterStateForPlayer } from "../engine/fog.js";
import { applyGameplayAction } from "../engine/gameplayActionApplier.js";

const results = [];

const DIRECT_APPLIERS = {
  MOVE_UNIT: (state, action) => applyMoveUnit(state, { unitId: action.unitId, col: action.col, row: action.row }),
  ATTACK: (state, action) => applyAttack(state, { attackerId: action.attackerId, col: action.col, row: action.row }),
  LAUNCH_NUKE: (state, action) => applyLaunchNuke(state, { nukeId: action.nukeId, col: action.col, row: action.row }),
  SELECT_RESEARCH: (state, action) => applySelectResearch(state, { techId: action.techId }),
  SET_PRODUCTION: (state, action) => applySetProduction(state, { cityId: action.cityId, type: action.prodType, itemId: action.itemId }),
  UPGRADE_UNIT: (state, action) => applyUpgradeUnit(state, { unitId: action.unitId }),
  FOUND_CITY: (state, action) => applyFoundCity(state, { unitId: action.unitId, col: action.col, row: action.row }),
  CANCEL_PRODUCTION: (state, action) => applyCancelProduction(state, { cityId: action.cityId }),
  BUILD_ROAD: (state, action) => applyBuildRoad(state, { hexId: action.hexId }),
  SET_TRADE_FOCUS: (state, action) => applySetTradeFocus(state, { cityId: action.cityId, routeIndex: action.routeIndex, focus: action.focus }),
  END_TURN: (state) => applyEndTurn(state),
};

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
  population: 2,
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

const makeState = ({ cols = 6, rows = 6, players = null, currentPlayerId = "p1", turnNumber = 1, barbarians = [], explored = {} } = {}) => {
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
    explored,
    metPlayers: Object.fromEntries(resolvedPlayers.map((player) => [player.id, []])),
    diplomacy: createInitialDiplomacyState(resolvedPlayers, turnNumber),
  };
};

const assertValidation = (state, action, playerId = state.currentPlayerId, expected = null) => {
  assert.equal(validateGameplayAction(state, action, playerId), expected);
};

const applyDirectSequence = (state, actions) => {
  let nextState = state;
  let allEvents = [];
  for (const action of actions) {
    const result = DIRECT_APPLIERS[action.type](nextState, action);
    nextState = result.state;
    allEvents = allEvents.concat(result.events || []);
  }
  return { state: nextState, events: allEvents };
};

const applySharedSequence = (state, actions) => {
  let nextState = state;
  let allEvents = [];
  for (const action of actions) {
    const result = applyGameplayAction(nextState, action);
    assert.equal(result.error, null);
    nextState = result.state;
    allEvents = allEvents.concat(result.events || []);
  }
  return { state: nextState, events: allEvents };
};

const assertSequenceParity = (state, actions, playerId = state.currentPlayerId) => {
  let validationState = state;
  for (const action of actions) {
    assertValidation(validationState, action, playerId);
    validationState = applyGameplayAction(validationState, action).state;
  }

  const direct = applyDirectSequence(state, actions);
  const shared = applySharedSequence(state, actions);

  assert.deepEqual(shared.state, direct.state);
  assert.deepEqual(shared.events, direct.events);
  assert.deepEqual(filterStateForPlayer(shared.state, playerId), filterStateForPlayer(direct.state, playerId));

  return { direct, shared };
};

runTest("shared applier allows repeated movement while movement points remain", () => {
  const p1 = makePlayer("p1", {
    units: [{ id: "u1", unitType: "warrior", hexCol: 1, hexRow: 1, movementCurrent: 2, hpCurrent: 15, hasAttacked: false }],
  });
  const state = makeState({ cols: 5, rows: 5, players: [p1, makePlayer("p2")] });
  const { shared } = assertSequenceParity(state, [
    { type: "MOVE_UNIT", unitId: "u1", col: 2, row: 1 },
    { type: "MOVE_UNIT", unitId: "u1", col: 3, row: 1 },
  ]);

  const unit = shared.state.players[0].units[0];
  assert.equal(unit.hexCol, 3);
  assert.equal(unit.hexRow, 1);
  assert.equal(unit.movementCurrent, 0);
});

runTest("validator rejects melee attack after movement is exhausted in a sequence", () => {
  const p1 = makePlayer("p1", {
    units: [{ id: "u1", unitType: "warrior", hexCol: 1, hexRow: 1, movementCurrent: 2, hpCurrent: 15, hasAttacked: false }],
  });
  const state = makeState({
    cols: 6,
    rows: 6,
    players: [p1, makePlayer("p2")],
    barbarians: [{ id: "barb-1", unitType: "warrior", hexCol: 4, hexRow: 1, hpCurrent: 15 }],
  });

  let nextState = applyGameplayAction(state, { type: "MOVE_UNIT", unitId: "u1", col: 2, row: 1 }).state;
  nextState = applyGameplayAction(nextState, { type: "MOVE_UNIT", unitId: "u1", col: 3, row: 1 }).state;

  assertValidation(nextState, { type: "ATTACK", attackerId: "u1", col: 4, row: 1 }, "p1", "No movement points for melee");
});

runTest("shared attack applier matches direct engine attack application", () => {
  const p1 = makePlayer("p1", {
    units: [{ id: "archer-1", unitType: "archer", hexCol: 1, hexRow: 1, movementCurrent: 2, hpCurrent: 10, hasAttacked: false }],
  });
  const state = makeState({
    cols: 5,
    rows: 5,
    players: [p1, makePlayer("p2")],
    barbarians: [{ id: "barb-1", unitType: "warrior", hexCol: 2, hexRow: 1, hpCurrent: 15 }],
  });

  assertSequenceParity(state, [{ type: "ATTACK", attackerId: "archer-1", col: 2, row: 1 }]);
});

runTest("shared launch-nuke applier matches direct engine application", () => {
  const p1 = makePlayer("p1", {
    units: [{ id: "n1", unitType: "nuke", hexCol: 1, hexRow: 1, movementCurrent: 0, hpCurrent: 1, hasAttacked: false }],
  });
  const state = makeState({
    cols: 6,
    rows: 6,
    players: [p1, makePlayer("p2")],
    barbarians: [{ id: "barb-1", unitType: "warrior", hexCol: 3, hexRow: 1, hpCurrent: 15 }],
  });

  assertSequenceParity(state, [{ type: "LAUNCH_NUKE", nukeId: "n1", col: 3, row: 1 }]);
});

runTest("shared research, production, and end-turn sequence matches direct engine behavior", () => {
  const p1 = makePlayer("p1", {
    researchedTechs: ["basic_tools", "agriculture", "hunting"],
    cities: [makeCity("rome", 0)],
  });
  const p2 = makePlayer("p2");
  const state = makeState({ players: [p1, p2] });
  state.hexes[0].cityId = "rome";
  state.hexes[0].ownerPlayerId = "p1";

  const { shared } = assertSequenceParity(state, [
    { type: "SELECT_RESEARCH", techId: "pottery" },
    { type: "SET_PRODUCTION", cityId: "rome", prodType: "unit", itemId: "warrior" },
    { type: "END_TURN" },
  ]);

  assert.equal(shared.state.currentPlayerId, "p2");
  assert.equal(shared.state.players[0].currentResearch.techId, "pottery");
});

runTest("shared found-city applier matches direct engine city founding", () => {
  const p1 = makePlayer("p1", {
    units: [{ id: "settler-1", unitType: "settler", hexCol: 3, hexRow: 3, movementCurrent: 2, hpCurrent: 10, hasAttacked: false }],
  });
  const state = makeState({ cols: 6, rows: 6, players: [p1, makePlayer("p2")] });

  const { shared } = assertSequenceParity(state, [{ type: "FOUND_CITY", unitId: "settler-1", col: 3, row: 3 }]);
  assert.equal(shared.state.players[0].cities.length, 1);
});

runTest("validator rejects founding a city too close to an existing city", () => {
  const p1 = makePlayer("p1", {
    units: [{ id: "settler-1", unitType: "settler", hexCol: 2, hexRow: 1, movementCurrent: 2, hpCurrent: 10, hasAttacked: false }],
    cities: [makeCity("rome", 0)],
  });
  const state = makeState({ cols: 6, rows: 6, players: [p1, makePlayer("p2")] });
  state.hexes[0].cityId = "rome";
  state.hexes[0].ownerPlayerId = "p1";

  assertValidation(state, { type: "FOUND_CITY", unitId: "settler-1", col: 1, row: 0 }, "p1", "Too close to another city");
});

runTest("shared trade-focus, cancel-production, and upgrade actions match direct engine behavior", () => {
  const p1 = makePlayer("p1", {
    cities: [makeCity("rome", 0, {
      currentProduction: { type: "unit", itemId: "warrior" },
      productionProgress: 4,
      tradeRoutes: [{ targetCityId: "ally", distance: 4, isInternational: false, focus: "merchant" }],
    })],
    units: [{ id: "u1", unitType: "warrior", hexCol: 1, hexRow: 1, movementCurrent: 2, hpCurrent: 15, hasAttacked: false }],
  });
  const state = makeState({ players: [p1, makePlayer("p2")] });
  state.hexes[0].cityId = "rome";
  state.hexes[0].ownerPlayerId = "p1";
  state.hexes[1].ownerPlayerId = "p1";

  const { shared } = assertSequenceParity(state, [
    { type: "SET_TRADE_FOCUS", cityId: "rome", routeIndex: 0, focus: "scholar" },
    { type: "CANCEL_PRODUCTION", cityId: "rome" },
    { type: "UPGRADE_UNIT", unitId: "u1" },
  ]);

  assert.equal(shared.state.players[0].cities[0].tradeRoutes[0].focus, "scholar");
  assert.equal(shared.state.players[0].cities[0].currentProduction, null);
  assert.equal(shared.state.players[0].units[0].unitType, "swordsman");
});

runTest("shared build-road action matches direct engine behavior", () => {
  const p1 = makePlayer("p1");
  const state = makeState({ players: [p1, makePlayer("p2")] });
  state.hexes[1].ownerPlayerId = "p1";

  const { shared } = assertSequenceParity(state, [{ type: "BUILD_ROAD", hexId: 1 }]);

  assert.equal(shared.state.hexes[1].road, true);
  assert.equal(shared.state.players[0].gold, 95);
});

runTest("validator covers build-road and trade-focus authority checks", () => {
  const p1 = makePlayer("p1", {
    cities: [makeCity("rome", 0, {
      tradeRoutes: [{ targetCityId: "ally", distance: 4, isInternational: false, focus: "merchant" }],
    })],
  });
  const state = makeState({ players: [p1, makePlayer("p2")] });
  state.hexes[0].cityId = "rome";
  state.hexes[2].ownerPlayerId = "p2";

  assertValidation(state, { type: "BUILD_ROAD", hexId: 2 }, "p1", "Hex not owned by player");
  assertValidation(state, { type: "SET_TRADE_FOCUS", cityId: "rome", routeIndex: 1, focus: "scholar" }, "p1", "Trade route not found");
});

runTest("filtered acting-player view stays in sync with authoritative sequence results", () => {
  const p1 = makePlayer("p1", {
    units: [{ id: "u1", unitType: "warrior", hexCol: 1, hexRow: 1, movementCurrent: 2, hpCurrent: 15, hasAttacked: false }],
    researchedTechs: ["basic_tools", "agriculture", "hunting"],
  });
  const p2 = makePlayer("p2", {
    currentResearch: { techId: "pottery", progress: 2 },
    cities: [makeCity("beijing", 30, { currentProduction: { type: "unit", itemId: "warrior" }, productionProgress: 6 })],
    units: [{ id: "enemy-1", unitType: "warrior", hexCol: 4, hexRow: 1, movementCurrent: 2, hpCurrent: 15, hasAttacked: false }],
  });
  const state = makeState({
    cols: 6,
    rows: 6,
    players: [p1, p2],
    explored: { p1: [], p2: [] },
  });
  state.hexes[30].cityId = "beijing";
  state.hexes[30].ownerPlayerId = "p2";

  const { shared } = assertSequenceParity(state, [
    { type: "MOVE_UNIT", unitId: "u1", col: 2, row: 1 },
    { type: "SELECT_RESEARCH", techId: "pottery" },
  ]);

  const filtered = filterStateForPlayer(shared.state, "p1");
  const filteredEnemy = filtered.players.find(player => player.id === "p2");

  assert.equal(filtered.players.find(player => player.id === "p1").currentResearch.techId, "pottery");
  assert.equal(filteredEnemy.currentResearch, null);
  assert.equal(filteredEnemy.cities[0].currentProduction, null);
  assert.equal(filteredEnemy.cities[0].productionProgress, 0);
  assert.equal(filteredEnemy.units.length, 0);
});

runTest("filtered acting-player view reveals newly visible enemy units after movement", () => {
  const p1 = makePlayer("p1", {
    units: [{ id: "u1", unitType: "warrior", hexCol: 1, hexRow: 1, movementCurrent: 2, hpCurrent: 15, hasAttacked: false }],
  });
  const p2 = makePlayer("p2", {
    units: [{ id: "enemy-1", unitType: "warrior", hexCol: 4, hexRow: 1, movementCurrent: 2, hpCurrent: 15, hasAttacked: false }],
  });
  const state = makeState({ cols: 6, rows: 6, players: [p1, p2], explored: { p1: [], p2: [] } });

  const { shared } = assertSequenceParity(state, [{ type: "MOVE_UNIT", unitId: "u1", col: 3, row: 1 }]);
  const filtered = filterStateForPlayer(shared.state, "p1");
  const filteredEnemy = filtered.players.find(player => player.id === "p2");

  assert.equal(filteredEnemy.units.length, 1);
  assert.equal(filteredEnemy.units[0].id, "enemy-1");
});

runTest("validator blocks attacks on enemy players before war is declared", () => {
  const p1 = makePlayer("p1", {
    units: [{ id: "u1", unitType: "archer", hexCol: 1, hexRow: 1, movementCurrent: 2, hpCurrent: 10, hasAttacked: false }],
  });
  const p2 = makePlayer("p2", {
    units: [{ id: "enemy-1", unitType: "warrior", hexCol: 2, hexRow: 1, movementCurrent: 2, hpCurrent: 15, hasAttacked: false }],
  });
  const state = makeState({ cols: 5, rows: 5, players: [p1, p2] });

  assertValidation(state, { type: "ATTACK", attackerId: "u1", col: 2, row: 1 }, "p1", "Must declare war on China");

  declareWar(state, "p1", "p2");
  assertValidation(state, { type: "ATTACK", attackerId: "u1", col: 2, row: 1 }, "p1");
});

if (results.some((result) => !result.ok)) {
  process.exitCode = 1;
}

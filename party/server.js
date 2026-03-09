// ============================================================
// PARTYKIT SERVER — authoritative game state for online multiplayer
// Room phases: WAITING → CIV_SELECT → PLAYING → FINISHED
// ============================================================
import {
  buildMapConfig, createInitialState,
  getVisibleHexes, getReachableHexes, getRangedTargets,
  hexAt, hexDist,
  UNIT_DEFS, TECH_TREE,
  getAvailableTechs, getAvailableUnits, getAvailableDistricts, canUpgradeUnit,
  applyMoveUnit, applyAttack, applyLaunchNuke,
  applySelectResearch, applySetProduction, applyUpgradeUnit,
  applyFoundCity, applyCancelProduction, applyEndTurn,
  aiExecuteTurn, addLogMsg,
} from '../src/engine/index.js';

// ============================================================
// FOG OF WAR — server-side state filtering
// ============================================================
const filterStateForPlayer = (fullState, playerId) => {
  const player = fullState.players.find(p => p.id === playerId);
  if (!player) return fullState;

  const visible = getVisibleHexes(player, fullState.hexes);
  const explored = new Set(fullState.explored?.[playerId] || []);

  // Merge current visibility into explored
  for (const k of visible) explored.add(k);

  const opponent = fullState.players.find(p => p.id !== playerId);

  // Filter opponent's units to only those on visible hexes
  const filteredOpponent = {
    ...opponent,
    units: opponent.units.filter(u => visible.has(`${u.hexCol},${u.hexRow}`)),
    currentResearch: null, // hide enemy research
    cities: opponent.cities.map(c => ({
      ...c,
      currentProduction: null, // hide enemy production
      productionProgress: 0,
    })),
  };

  // Filter barbarians to visible only
  const filteredBarbarians = (fullState.barbarians || []).filter(
    b => visible.has(`${b.hexCol},${b.hexRow}`)
  );

  return {
    ...fullState,
    players: playerId === "p1"
      ? [player, filteredOpponent]
      : [filteredOpponent, player],
    barbarians: filteredBarbarians,
    explored: { ...fullState.explored, [playerId]: [...explored] },
    _visibleHexes: [...visible],
    _playerId: playerId,
  };
};

// ============================================================
// ACTION VALIDATION
// ============================================================
const validateAction = (gameState, action, playerId) => {
  if (gameState.currentPlayerId !== playerId) {
    return "Not your turn";
  }

  const player = gameState.players.find(p => p.id === playerId);
  if (!player) return "Player not found";

  switch (action.type) {
    case "MOVE_UNIT": {
      const unit = player.units.find(u => u.id === action.unitId);
      if (!unit) return "Unit not found";
      if (unit.movementCurrent <= 0) return "No movement points";
      const unitDef = UNIT_DEFS[unit.unitType];
      const reachable = getReachableHexes(
        unit.hexCol, unit.hexRow, unit.movementCurrent,
        gameState.hexes, unitDef?.domain || "land",
        playerId, gameState.players, unitDef?.ability,
        gameState.mapConfig
      );
      if (!reachable.has(`${action.col},${action.row}`)) return "Hex not reachable";
      return null;
    }
    case "ATTACK": {
      const unit = player.units.find(u => u.id === action.attackerId);
      if (!unit) return "Unit not found";
      if (unit.hasAttacked) return "Already attacked";
      const unitDef = UNIT_DEFS[unit.unitType];
      if (unitDef.range > 0) {
        const targets = getRangedTargets(unit.hexCol, unit.hexRow, unitDef.range, gameState.mapConfig);
        if (!targets.has(`${action.col},${action.row}`)) return "Target not in range";
      } else {
        if (unit.movementCurrent <= 0) return "No movement points for melee";
        const reachable = getReachableHexes(
          unit.hexCol, unit.hexRow, unit.movementCurrent,
          gameState.hexes, unitDef?.domain || "land",
          playerId, gameState.players, unitDef?.ability,
          gameState.mapConfig
        );
        if (!reachable.has(`${action.col},${action.row}`)) return "Target not reachable";
      }
      return null;
    }
    case "LAUNCH_NUKE": {
      const nuke = player.units.find(u => u.id === action.nukeId);
      if (!nuke) return "Nuke not found";
      if (nuke.unitType !== "nuke") return "Not a nuke";
      const targets = getRangedTargets(nuke.hexCol, nuke.hexRow, 3, gameState.mapConfig);
      if (!targets.has(`${action.col},${action.row}`)) return "Target not in range";
      return null;
    }
    case "SELECT_RESEARCH": {
      if (player.currentResearch) return "Already researching";
      const tech = TECH_TREE[action.techId];
      if (!tech) return "Tech not found";
      if (player.researchedTechs.includes(action.techId)) return "Already researched";
      if (!tech.prereqs.every(p => player.researchedTechs.includes(p))) return "Prerequisites not met";
      return null;
    }
    case "SET_PRODUCTION": {
      const city = player.cities.find(c => c.id === action.cityId);
      if (!city) return "City not found";
      return null;
    }
    case "UPGRADE_UNIT": {
      const unit = player.units.find(u => u.id === action.unitId);
      if (!unit) return "Unit not found";
      if (!canUpgradeUnit(unit, player)) return "Cannot upgrade";
      return null;
    }
    case "FOUND_CITY": {
      const unit = player.units.find(u => u.id === action.unitId);
      if (!unit) return "Unit not found";
      if (unit.unitType !== "settler") return "Not a settler";
      const hex = hexAt(gameState.hexes, action.col, action.row, gameState.mapConfig);
      if (!hex || hex.terrainType === "water" || hex.terrainType === "mountain" || hex.cityId) return "Invalid location";
      return null;
    }
    case "CANCEL_PRODUCTION": {
      const city = player.cities.find(c => c.id === action.cityId);
      if (!city) return "City not found";
      return null;
    }
    case "END_TURN": {
      return null;
    }
    default:
      return "Unknown action type";
  }
};

// ============================================================
// PARTYKIT SERVER CLASS
// ============================================================
export default class EmpiresServer {
  constructor(room) {
    this.room = room;
    this.gameState = null;
    this.phase = "WAITING"; // WAITING | CIV_SELECT | PLAYING | FINISHED
    this.playerSlots = {}; // { p1: connectionId, p2: connectionId }
    this.civPicks = {}; // { p1: "Rome", p2: "China" }
    this.mapSize = "medium";
    this.disconnected = {}; // { p1: true/false, p2: true/false }
  }

  async onStart() {
    // Restore state from storage
    const saved = await this.room.storage.get("state");
    if (saved) {
      this.gameState = saved.gameState;
      this.phase = saved.phase;
      this.playerSlots = saved.playerSlots;
      this.civPicks = saved.civPicks;
      this.mapSize = saved.mapSize || "medium";
    }
  }

  async persist() {
    await this.room.storage.put("state", {
      gameState: this.gameState,
      phase: this.phase,
      playerSlots: this.playerSlots,
      civPicks: this.civPicks,
      mapSize: this.mapSize,
    });
  }

  async onConnect(connection, ctx) {
    // Assign player slot
    let assignedSlot = null;

    // Check if this connection was previously assigned (reconnect)
    for (const [slot, connId] of Object.entries(this.playerSlots)) {
      if (connId === connection.id) {
        assignedSlot = slot;
        this.disconnected[slot] = false;
        break;
      }
    }

    // Assign new slot if not reconnecting
    if (!assignedSlot) {
      if (!this.playerSlots.p1) {
        this.playerSlots.p1 = connection.id;
        assignedSlot = "p1";
      } else if (!this.playerSlots.p2) {
        this.playerSlots.p2 = connection.id;
        assignedSlot = "p2";
      } else {
        // Room is full — spectator mode could go here
        connection.send(JSON.stringify({ type: "error", message: "Room is full" }));
        return;
      }
    }

    connection.setState({ playerId: assignedSlot });

    // Send assignment
    connection.send(JSON.stringify({
      type: "assigned",
      playerId: assignedSlot,
      phase: this.phase,
    }));

    // If both players are connected and still in WAITING, move to CIV_SELECT
    if (this.phase === "WAITING" && this.playerSlots.p1 && this.playerSlots.p2) {
      this.phase = "CIV_SELECT";
      this.broadcastPhase();
    }

    // If reconnecting during play, re-send filtered state
    if (this.phase === "PLAYING" && this.gameState) {
      const filtered = filterStateForPlayer(this.gameState, assignedSlot);
      connection.send(JSON.stringify({ type: "state", state: filtered }));

      // Notify opponent of reconnection
      this.broadcastToPlayer(
        assignedSlot === "p1" ? "p2" : "p1",
        { type: "opponent_reconnected" }
      );
    }

    await this.persist();
  }

  async onClose(connection) {
    const slot = connection.state?.playerId;
    if (!slot) return;

    this.disconnected[slot] = true;

    // Notify opponent
    const otherSlot = slot === "p1" ? "p2" : "p1";
    this.broadcastToPlayer(otherSlot, { type: "opponent_disconnected" });
  }

  async onMessage(message, sender) {
    let data;
    try {
      data = JSON.parse(message);
    } catch {
      sender.send(JSON.stringify({ type: "error", message: "Invalid JSON" }));
      return;
    }

    const playerId = sender.state?.playerId;
    if (!playerId) {
      sender.send(JSON.stringify({ type: "error", message: "Not assigned to a slot" }));
      return;
    }

    // Handle reconnect message
    if (data.type === "RECONNECT") {
      if (this.gameState) {
        const filtered = filterStateForPlayer(this.gameState, playerId);
        sender.send(JSON.stringify({ type: "state", state: filtered }));
      }
      sender.send(JSON.stringify({ type: "phase_change", phase: this.phase }));
      return;
    }

    // Route by phase
    switch (this.phase) {
      case "CIV_SELECT":
        await this.handleCivSelect(data, playerId, sender);
        break;
      case "PLAYING":
        await this.handleGameAction(data, playerId, sender);
        break;
      default:
        sender.send(JSON.stringify({ type: "error", message: `Cannot act in phase ${this.phase}` }));
    }
  }

  // === CIV SELECT PHASE ===
  async handleCivSelect(data, playerId, sender) {
    if (data.type === "PICK_CIV") {
      this.civPicks[playerId] = data.civilization;

      if (data.mapSize) this.mapSize = data.mapSize;

      // Notify both players of picks
      this.broadcastAll({
        type: "civ_picks",
        picks: this.civPicks,
        mapSize: this.mapSize,
      });

      // If both have picked, start the game
      if (this.civPicks.p1 && this.civPicks.p2) {
        const mc = buildMapConfig(this.mapSize);
        this.gameState = createInitialState(this.civPicks.p1, this.civPicks.p2, mc);
        this.phase = "PLAYING";
        this.broadcastPhase();
        this.broadcastState();
        await this.persist();
      }
    }
  }

  // === GAME ACTION PHASE ===
  async handleGameAction(data, playerId, sender) {
    if (!this.gameState) return;

    // Map client action types to engine action appliers
    const actionMap = {
      MOVE_UNIT: (gs, a) => applyMoveUnit(gs, { unitId: a.unitId, col: a.col, row: a.row }),
      ATTACK: (gs, a) => applyAttack(gs, { attackerId: a.attackerId, col: a.col, row: a.row }),
      LAUNCH_NUKE: (gs, a) => applyLaunchNuke(gs, { nukeId: a.nukeId, col: a.col, row: a.row }),
      SELECT_RESEARCH: (gs, a) => applySelectResearch(gs, { techId: a.techId }),
      SET_PRODUCTION: (gs, a) => applySetProduction(gs, { cityId: a.cityId, type: a.prodType, itemId: a.itemId }),
      UPGRADE_UNIT: (gs, a) => applyUpgradeUnit(gs, { unitId: a.unitId }),
      FOUND_CITY: (gs, a) => applyFoundCity(gs, { unitId: a.unitId, col: a.col, row: a.row }),
      CANCEL_PRODUCTION: (gs, a) => applyCancelProduction(gs, { cityId: a.cityId }),
      END_TURN: (gs) => applyEndTurn(gs),
    };

    const applyFn = actionMap[data.type];
    if (!applyFn) {
      sender.send(JSON.stringify({ type: "error", message: "Unknown action" }));
      return;
    }

    // Validate
    const error = validateAction(this.gameState, data, playerId);
    if (error) {
      sender.send(JSON.stringify({ type: "error", message: error }));
      return;
    }

    // Apply
    const { state, events } = applyFn(this.gameState, data);
    this.gameState = state;

    // Update explored hexes for current player
    const currentPlayer = this.gameState.players.find(p => p.id === playerId);
    if (currentPlayer) {
      const vis = getVisibleHexes(currentPlayer, this.gameState.hexes);
      const ex = new Set(this.gameState.explored?.[playerId] || []);
      for (const k of vis) ex.add(k);
      this.gameState.explored = { ...this.gameState.explored, [playerId]: [...ex] };
    }

    // Check for victory
    if (this.gameState.victoryStatus) {
      this.phase = "FINISHED";
    }

    // Broadcast filtered state + events to each player
    this.broadcastState(events);
    await this.persist();
  }

  // === BROADCAST HELPERS ===
  broadcastAll(msg) {
    const str = JSON.stringify(msg);
    for (const conn of this.room.getConnections()) {
      conn.send(str);
    }
  }

  broadcastPhase() {
    this.broadcastAll({ type: "phase_change", phase: this.phase });
  }

  broadcastToPlayer(playerId, msg) {
    const str = JSON.stringify(msg);
    for (const conn of this.room.getConnections()) {
      if (conn.state?.playerId === playerId) {
        conn.send(str);
      }
    }
  }

  broadcastState(events = []) {
    if (!this.gameState) return;
    for (const conn of this.room.getConnections()) {
      const pid = conn.state?.playerId;
      if (!pid) continue;
      const filtered = filterStateForPlayer(this.gameState, pid);
      conn.send(JSON.stringify({
        type: "state",
        state: filtered,
        events: events || [],
      }));
    }
  }
}

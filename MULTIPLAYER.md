# Empires of Earth: From Single-Player to Online Multiplayer

## What We Did

Took a 2,667-line monolithic React component (`hex-strategy.jsx`) that supported only local hot-seat and vs-AI modes, and turned it into a fully deployed online multiplayer game — two players on separate devices, anywhere in the world.

**Branch:** `feature/partykit-multiplayer`
**Diff:** 26 files changed, ~5,000 lines added

---

## Architecture

```
Before:
┌─────────────────────────────┐
│  hex-strategy.jsx (2,667 L) │  ← Everything in one file
│  All game logic + UI + AI   │
└─────────────────────────────┘

After:
┌──────────────┐         ┌──────────────────────┐         ┌──────────────┐
│  Player 1    │◄──ws──► │  PartyKit Server     │ ◄──ws──►│  Player 2    │
│  (Vercel)    │         │  (authoritative state)│         │  (Vercel)    │
└──────────────┘         └──────────────────────┘         └──────────────┘
```

**Frontend:** https://empires-of-earth-ecru.vercel.app
**Game Server:** empires-of-earth.michael-abdo.partykit.dev

---

## The Work, Step by Step

### Phase 0: Extract Game Engine

The original game was a single massive React component with game logic, AI, rendering, and audio all interleaved. We had to split it into a shared engine that both client and server could use.

#### 0.1 — Eliminate Mutable Globals

The game used module-level `let` variables (`COLS`, `ROWS`, `P1_START`, `P2_START`, `uidCtr`) that got set by `setMapConfig()`. These can't be shared across server and client — each game room needs its own config.

**Fix:** Moved all map config into the game state object (`gs.mapConfig`), updated ~15 functions to read from state instead of globals. Replaced global `uidCtr` with `gs.nextUnitId`.

#### 0.2–0.6 — Extract Engine Modules

Pulled pure game logic out of the monolith into 11 focused modules:

| Module | Lines | What It Does |
|--------|-------|--------------|
| `constants.js` | 146 | All data tables: terrain, techs, units, civs, eras |
| `hex-math.js` | 61 | Hex geometry, neighbors, distance, coordinate math |
| `economy.js` | 127 | City yields, income, tech/unit/district availability |
| `combat.js` | 56 | Damage calculation, combat preview |
| `movement.js` | 99 | Move costs, reachable hexes, range targets, block reasons |
| `fog.js` | 32 | Fog of war visibility calculation |
| `map-gen.js` | 126 | Procedural map generation with seeded RNG |
| `state.js` | 105 | `createInitialState()` — builds a fresh game |
| `turn-processing.js` | 220 | End-of-turn: research, cities, territory, barbs, events |
| `ai.js` | 400 | AI decision-making and turn execution |
| `victory.js` | 22 | Win condition checks |

Every function is pure: `(gameState, params) → newState`. No side effects, no DOM, no React.

#### 0.7 — Create Action Appliers

Extracted 8 player actions into pure functions that the server can validate and apply:

| Action | What It Does |
|--------|--------------|
| `applyMoveUnit` | Move a unit to a hex |
| `applyAttack` | Melee or ranged attack |
| `applyFoundCity` | Settler founds a city |
| `applyLaunchNuke` | Nuclear strike |
| `applySelectResearch` | Pick a tech to research |
| `applySetProduction` | Set city production queue |
| `applyUpgradeUnit` | Upgrade a unit to next era |
| `applyEndTurn` | Process end-of-turn and swap players |

Each returns `{ state, events }` where events are side effects for the client (sound effects, animations, combat results).

#### 0.8 — Extract Rendering Code

Pulled SVG generators and Tone.js audio into separate files:

- `client/sfx.js` (83 L) — Sound effects system
- `client/hex-strategy.jsx` — Now purely a React UI component that imports engine modules

### Phase 1: PartyKit Server

Built an authoritative game server (`party/server.js`, 411 lines) using PartyKit (WebSocket rooms on Cloudflare's edge).

**Room lifecycle:**

```
WAITING → CIV_SELECT → PLAYING → FINISHED
```

**Key server responsibilities:**

- **Player slot assignment** — First connection = P1, second = P2
- **Action validation** — Verifies it's your turn, you own the unit/city, targets are valid
- **State application** — Runs pure engine functions to update game state
- **Fog of war filtering** — Each player gets a different view: enemy units hidden outside your vision, enemy research/production hidden, barbarians filtered to visible only
- **AI execution** — When playing vs AI online, server runs AI turns
- **Persistence** — Game state saved to room storage after every action
- **Reconnection** — Players can disconnect and rejoin, getting current state

### Phase 2: Client Integration

#### Lobby (`lobby.jsx`, 127 lines)

- **Create Game** — Generates a 4-character room code, waits for opponent
- **Join Game** — Enter room code, connect to existing game

#### Multiplayer Hook (`use-party.js`, 108 lines)

- `useMultiplayerGame(roomId)` — Manages WebSocket connection via `partysocket`
- Returns `{ gameState, connected, myPlayerId, sendAction, error, roomPhase, events }`
- Handles server messages: state updates, errors, disconnects, phase changes

#### Online Game Wrapper (`online-game.jsx`, 203 lines)

- Connects lobby → multiplayer hook → game component
- Passes server state and `sendAction` into the game UI

#### Game Component Changes (`hex-strategy.jsx`)

The game component gained an `onlineMode` prop that changes behavior:

- **State source** — Comes from server (not local `useState`)
- **Player perspective** — Locked to your assigned player ID
- **Actions** — Call `sendAction()` instead of applying locally
- **Turn gating** — "Waiting for opponent" overlay when not your turn
- **Fog of war** — Uses server-filtered `_visibleHexes` (no client-side fog calc)
- **No turn transition** — No "pass the device" screen
- **Disconnect handling** — Shows overlay if opponent disconnects

All 9 action callbacks (move, attack, found city, nuke, research, production, upgrade, cancel production, end turn) branch between local apply (offline) and `sendAction` (online).

### UX Improvement: Single-Click Movement

Changed unit movement from right-click (unreliable on Mac trackpads) to single-click. Click a unit to select it, click a valid hex to move or attack. Same click handler unifies selection and targeting.

### Phase 3: Deploy

- **PartyKit** — `npx partykit deploy` → edge WebSocket server
- **Vercel** — `vercel --prod` → static frontend with baked-in server URL
- **GitHub** — Branch pushed with 3 clean commits

---

## File Structure (New)

```
empires-of-earth/
├── src/
│   ├── engine/                    # Shared pure game logic (11 modules)
│   │   ├── constants.js           # Game data tables
│   │   ├── hex-math.js            # Hex geometry
│   │   ├── economy.js             # Yields, income, availability
│   │   ├── combat.js              # Damage calculation
│   │   ├── movement.js            # Move costs, reachable hexes
│   │   ├── fog.js                 # Visibility
│   │   ├── map-gen.js             # Procedural generation
│   │   ├── state.js               # Initial state creation
│   │   ├── turn-processing.js     # End-of-turn logic
│   │   ├── ai.js                  # AI player
│   │   ├── victory.js             # Win conditions
│   │   ├── actions.js             # Pure action appliers
│   │   └── index.js               # Re-exports
│   ├── client/
│   │   ├── hex-strategy.jsx       # Game UI component
│   │   ├── sfx.js                 # Sound effects
│   │   ├── lobby.jsx              # Create/join game UI
│   │   ├── online-game.jsx        # Online mode wrapper
│   │   └── use-party.js           # WebSocket hook
│   ├── App.jsx                    # Route: lobby vs game
│   └── main.jsx
├── party/
│   └── server.js                  # PartyKit authoritative server
├── partykit.json                  # PartyKit config
├── .env.development               # localhost:1999
├── .env.production                # production PartyKit URL
└── package.json
```

---

## How to Play Online

1. Go to https://empires-of-earth-ecru.vercel.app
2. Click **Online**
3. Player 1: Click **Create Game** → get a 4-letter room code
4. Player 2: Click **Join Game** → enter the room code
5. Both players pick civilizations
6. Play!

---

## Key Design Decisions

| Decision | Why |
|----------|-----|
| Server-authoritative state | Prevents cheating, ensures consistency |
| Server-side fog filtering | Client never sees hidden enemy data |
| Pure engine functions | Same code runs on client (offline) and server (online) |
| PartyKit | WebSocket rooms on Cloudflare edge, minimal setup, free tier |
| Events for side effects | Server returns `{ state, events }` — client plays SFX/animations from events |
| RNG only on server | Seeded RNG runs server-side, client receives post-RNG state — no desync |

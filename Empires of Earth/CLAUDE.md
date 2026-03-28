# Empires of Earth — Project Blueprint

Hex-based strategy game (Civ-like) built with React + Vite. No framework beyond React — all rendering is SVG, all state lives in a single `gs` (game state) object managed via `useState` in the root component.

**Deployed at:** empires-of-earth.vercel.app
**GitHub:** Cabdo22/empires-of-earth (default branch: `master`, NOT `main`)

## Quick Start

```bash
npm run dev        # Vite dev server
npm run build      # Production build → dist/
npm run party:dev  # PartyKit multiplayer server (local)
```

## Tech Stack

- React 18, Vite 5, no TypeScript
- Tone.js for audio (sfx.js)
- PartyKit for multiplayer (party/server.js)
- All rendering is SVG — no canvas, no WebGL
- Styled with JS objects (styles.js), no CSS files

## Architecture Overview

The game is a single-page React app. `main.jsx` mounts `<HexStrategyGame>`, which is the root component holding all game state and orchestrating the UI.

```
HexStrategyGame.jsx  ← Root component (~1000 lines). Holds game state (gs), renders board + all panels.
│                       State flows down as props. Actions mutate gs via setGs().
├── engine/          ← Pure game logic. No React, no DOM. Functions take/return game state.
├── ai/              ← AI opponent logic. Calls engine functions to decide moves.
├── data/            ← Static config: unit stats, tech tree, civs, terrain, events, tutorial steps.
├── components/      ← UI components. Receive state as props, call action callbacks.
├── hooks/           ← Custom React hooks for interaction (camera, pan/zoom, keyboard, minimap).
├── party/           ← PartyKit multiplayer server (authoritative game state for online mode).
├── sfx.js           ← Sound effect triggers (uses Tone.js)
└── styles.js        ← Shared JS style objects (btnStyle, panelStyle)
```

## Game State Shape

The entire game state is a single JS object (`gs`) with this approximate shape:

```js
{
  hexes: [],              // Flat array of hex tiles, indexed as hexes[col * ROWS + row]
  players: [              // Array of player objects
    {
      id, civ, gold, science, techs: [], currentResearch,
      cities: [{ id, name, col, row, pop, hp, production, borderHexIds, workedTileIds, ... }],
      units: [{ id, unitType, hexCol, hexRow, movementCurrent, hpCurrent, hasAttacked, ... }],
      fogMap: {},         // Visibility per hex
    }
  ],
  currentPlayerId,        // Whose turn it is
  turn,                   // Turn counter
  phase: "MOVEMENT",      // Single phase (legacy multi-phase removed)
  rngSeed, rngCounter,    // Deterministic RNG
  log: [],                // Game event log
}
```

## Key Files — What Does What

### engine/ — Pure game logic (no React)

| File | Exports | Purpose |
|------|---------|---------|
| `actions.js` | `applyMoveUnit`, `applyAttack`, `applyFoundCity`, `applyEndTurn`, ... | **Action appliers** — each takes `(state, params)`, deep-clones state, applies changes, returns `{ state, events }`. This is the main mutation layer. |
| `combat.js` | `calcCombatPreview` | Combat math — damage calculation with terrain/promotion bonuses |
| `economy.js` | `calcPlayerIncome`, `canUpgradeUnit`, `getAvailableTechs`, `autoAssignTiles` | Resource/gold/production/science calculations |
| `movement.js` | `getReachableHexes`, `getRangedTargets`, `getVisibleHexes`, `findPath`, `isHexOccupied` | Pathfinding (BFS), movement validation, fog of war visibility |
| `turnProcessing.js` | `processResearchAndIncome`, `processCityTurn`, `expandTerritory`, `refreshUnits`, `spawnBarbarians`, `rollRandomEvent`, `addLogMsg`, `initCityBorders` | End-of-turn processing pipeline |
| `gameInit.js` | `createInitialState`, `mkUnit`, `AI_DIFFICULTY` | Creates fresh game state from player configs |
| `mapGen.js` | `generateMap` | Procedural hex map generation (terrain, resources, continents) |
| `victory.js` | `checkVictoryState` | Win condition checks |
| `fog.js` | `filterStateForPlayer` | Strips hidden info for fog of war (used by multiplayer server) |

### data/ — Static configuration

| File | Main Export | What it defines |
|------|-------------|-----------------|
| `constants.js` | `HEX_SIZE`, `COLS`, `ROWS`, `hexCenter`, `hexAt`, `getNeighbors`, `hexDist`, `setMapConfig`, `MAP_SIZES` | Core hex math, grid dimensions, neighbor lookups, seeded RNG |
| `units.js` | `UNIT_DEFS`, `SIEGE_UNITS` | Unit types with stats (hp, attack, defense, move, cost, range) |
| `techs.js` | `TECH_TREE` | Tech tree — each tech has era, cost, prereqs, and unlock effects |
| `civs.js` | `CIV_DEFS` | Civilizations with unique bonuses |
| `terrain.js` | terrain type definitions | Movement costs, defense bonuses, yields per terrain |
| `districts.js` | district types | City district definitions |
| `events.js` | random event definitions | Events with effects and probabilities |
| `tutorial.js` | tutorial step definitions | Tutorial overlay content |

### components/ — UI

| File | What it renders |
|------|-----------------|
| `GameScreens.jsx` | Pre-game flow: mode select, map size, lobby, civ select, turn transition, victory screen |
| `MemoHex.jsx` | Individual hex tile (memoized). The core rendering unit of the map. |
| `ProceduralVisuals.js` | SVG generators for terrain art (grass, trees, mountains, water, coast) |
| `CityPanel.jsx` | City management: production queue, building list |
| `TechTreePanel.jsx` | Tech tree display and research selection |
| `ActionBar.jsx` | Bottom action buttons (move, attack, build, etc.) |
| `CombatPreview.jsx` | Pre-attack damage preview |
| `PlayerPanel.jsx` | Player stats: gold, science, resources |
| `MinimapDisplay.jsx` | Minimap |
| `LogPanel.jsx` | Game event log |
| `Lobby.jsx` | Pre-game lobby for setting up player slots |
| `OnlineGame.jsx` | Online multiplayer wrapper (uses PartyKit) |
| `UnitAnimationOverlay.jsx` | Unit movement/attack animations |
| Other | BottomInfo, EventPopup, Icons, Legend, NotificationCircles, TutorialTips |

### hooks/ — Interaction logic

| File | Purpose |
|------|---------|
| `useGameActions.js` | Player action handlers (move, attack, found city, etc.) — bridges UI clicks to engine |
| `useCamera.js` | Camera position and auto-centering |
| `usePanZoom.js` | Mouse/touch pan and zoom on the map |
| `useMinimap.js` | Minimap click-to-navigate |
| `useKeyboardShortcuts.js` | Keyboard hotkeys |
| `usePanelDrag.js` | Draggable UI panels |
| `useParty.js` | PartyKit connection hook for online multiplayer |
| `useUnitAnimation.js` | Unit animation state management |

### party/ — Multiplayer

| File | Purpose |
|------|---------|
| `server.js` | PartyKit server — authoritative game state, validates all actions, broadcasts filtered state per player via fog of war. Room phases: WAITING → CIV_SELECT → PLAYING → FINISHED |

## Important Patterns

- **Hex grid uses offset coordinates** (col, row) with flat-top hexagons. Even/odd columns have different neighbor offsets. Hex lookup is O(1) via `hexAt(hexes, col, row)` = `hexes[col * ROWS + row]`.
- **State is immutable-ish** — `actions.js` deep-clones via `JSON.parse(JSON.stringify(state))` before mutating. No immer or Redux.
- **Map size is mutable module state** — `COLS`/`ROWS` in constants.js are `let` exports set by `setMapConfig()` before game start. This means they're module-level globals, not part of game state.
- **Single-phase turns** — The game previously had multiple phases per turn but now uses a single "MOVEMENT" phase.
- **AI runs synchronously** — `aiExecuteTurn()` in aiEngine.js takes the full game state and returns updated state after all AI decisions.
- **Multiplayer uses PartyKit** with an authoritative server. The server runs the same engine code. Clients send actions, server validates and broadcasts fog-filtered state.

## Common Tasks

- **Adding a new unit type:** Add to `data/units.js` UNIT_DEFS, then handle any special abilities in `engine/combat.js` and `engine/actions.js`.
- **Adding a new tech:** Add to `data/techs.js` TECH_TREE with era, cost, prereqs. Hook up effects in the relevant engine file.
- **Adding a new civ:** Add to `data/civs.js` CIV_DEFS. Bonuses are applied in economy.js and turnProcessing.js.
- **Modifying combat:** Core damage math is in `engine/combat.js`. Attack execution is in `engine/actions.js` `applyAttack()`.
- **Changing map generation:** `engine/mapGen.js` `generateMap()`.
- **UI changes:** Components in `components/`, wired up in `HexStrategyGame.jsx`.

## Git

- Default branch is `master` (not `main`)
- Do NOT create a nested .git inside this folder — the repo root is at `~/Downloads/claude game`

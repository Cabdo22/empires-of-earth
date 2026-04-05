# Empires of Earth — Project Blueprint

Hex-based strategy game built with React + Vite. The app still uses a single top-level `gs` game state in [`HexStrategyGame.jsx`](/C:/Users/caleb/Downloads/claude%20game/Empires%20of%20Earth/HexStrategyGame.jsx), but gameplay mutations now flow through shared engine action appliers instead of ad hoc UI state edits.

**Deployed at:** `empires-of-earth.vercel.app`  
**GitHub:** `Cabdo22/empires-of-earth`  
**Default branch:** `master`

## Quick Start

```bash
npm run dev
npm run build
npm run party:dev
```

## Tech Stack

- React 18 + Vite 5
- PartyKit for multiplayer
- Tone.js for audio
- Hybrid board rendering: SVG and canvas paths both exist
- Plain JS modules and inline style objects, no TypeScript

## Current Architecture

`main.jsx` mounts `<HexStrategyGame />`, which handles menu flow, game session orchestration, and composition of the active in-game shell.

```text
HexStrategyGame.jsx
├── engine/           Canonical gameplay rules and turn progression
├── ai/               AI turn execution built on engine state
├── data/             Units, techs, civs, terrain, constants, tutorial data
├── components/
│   ├── GameViewport  Board renderer, hover/click plumbing, overlays
│   ├── GameHud       Panels, action bar, minimap, top/bottom HUD
│   └── GameModals    Tech, diplomacy, city, save/load, leader, tutorial modals
├── hooks/            Pan/zoom, minimap, keyboard shortcuts, panel drag, PartyKit
├── party/            Authoritative multiplayer server
└── utils/            Shared cloning and save helpers
```

## Gameplay Mutation Model

- `engine/actions.js` is the shared mutation layer for local play and multiplayer semantics.
- `engine/gameplayActionApplier.js` is the shared online-supported action contract used by local gameplay dispatch, PartyKit authority, and parity tests.
- `HexStrategyGame.jsx` dispatches local actions into those engine functions and handles UI-side event effects like SFX, flashes, and combat numbers.
- `party/server.js` reuses the same engine turn/action logic for server-authoritative online games.
- `ai/aiEngine.js` executes AI turns against full game state and then uses the same turn-advance behavior as the rest of the engine.

## Important Runtime Notes

- Canvas and SVG rendering both exist. Renderer choice is automatic on larger maps unless the player overrides it.
- `cloneState()` in [`utils/cloneState.js`](/C:/Users/caleb/Downloads/claude%20game/Empires%20of%20Earth/utils/cloneState.js) is the shared deep-clone utility used in live engine paths.
- Local saves are versioned through [`utils/saveGames.js`](/C:/Users/caleb/Downloads/claude%20game/Empires%20of%20Earth/utils/saveGames.js). Legacy raw saves are migrated on load.
- Heavy modal panels are lazy-loaded from `GameModals.jsx`.
- Live engine paths now read map dimensions from `state.mapConfig` or the current hex array. `setMapConfig()` remains only as a compatibility layer for legacy UI helpers and menu flow.

## Key Files

### Engine

- `engine/actions.js`: canonical action appliers such as move, attack, end turn, diplomacy, roads, and production
- `engine/turnProcessing.js`: income, research, city processing, territory growth, barbarian logic, log helpers
- `engine/movement.js`: pathfinding, reachability, visibility, occupancy
- `engine/combat.js`: combat preview math
- `engine/gameInit.js`: initial state creation
- `engine/fog.js`: fog filtering for multiplayer clients
- `engine/gameplayActionApplier.js`: canonical action-type to engine-applier mapping for online-supported gameplay actions
- `engine/actionValidation.js`: shared legality checks for server-authoritative multiplayer actions

### Active game UI

- `HexStrategyGame.jsx`: top-level gameplay controller and screen switching
- `components/GameViewport.jsx`: board rendering and pointer interaction
- `components/GameHud.jsx`: HUD, minimap, action controls, info panels
- `components/GameModals.jsx`: save/load, tech, diplomacy, city, event, tutorial, leader scene
- `components/CanvasBoardRenderer.jsx`: canvas rendering path
- `components/MemoHex.jsx`: SVG hex rendering path

### Shared utilities

- `utils/cloneState.js`: deep clone helper with `structuredClone` fallback
- `utils/saveGames.js`: save serialization, migration, and localStorage helpers
- `tests/engine-regression.test.js`: regression checks for explicit map config and core engine actions
- `tests/multiplayer-parity.test.js`: local/online continuity checks for shared gameplay action dispatch

## Common Tasks

- Add or balance a unit: update `data/units.js`, then adjust any rule handling in `engine/actions.js` or `engine/combat.js`
- Change combat behavior: start in `engine/combat.js` and `engine/actions.js`
- Change end-turn behavior: update `engine/turnProcessing.js` and any related action wrappers
- Adjust UI layout or panels: work inside `components/GameViewport.jsx`, `components/GameHud.jsx`, or `components/GameModals.jsx`
- Change multiplayer rules: update `engine/actionValidation.js`, `engine/gameplayActionApplier.js`, and the parity tests before changing `party/server.js`

## Known Technical Debt

- `HexStrategyGame.jsx` is still large and remains the primary orchestration file.
- Some non-engine UI helpers still retain legacy compatibility with `setMapConfig()`.
- The project still needs broader scenario coverage, but online-supported gameplay actions now have a dedicated parity test path and should stay on it.

## Git Notes

- Work in the repo rooted at `C:\Users\caleb\Downloads\claude game`
- Default branch is `master`
- Avoid reverting unrelated local workspace files unless the user explicitly asks

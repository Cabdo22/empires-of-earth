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
} from './actions.js';

export const GAMEPLAY_ACTION_APPLIERS = {
  MOVE_UNIT: (gs, action) => applyMoveUnit(gs, { unitId: action.unitId, col: action.col, row: action.row }),
  ATTACK: (gs, action) => applyAttack(gs, { attackerId: action.attackerId, col: action.col, row: action.row }),
  LAUNCH_NUKE: (gs, action) => applyLaunchNuke(gs, { nukeId: action.nukeId, col: action.col, row: action.row }),
  SELECT_RESEARCH: (gs, action) => applySelectResearch(gs, { techId: action.techId }),
  SET_PRODUCTION: (gs, action) => applySetProduction(gs, { cityId: action.cityId, type: action.prodType, itemId: action.itemId }),
  UPGRADE_UNIT: (gs, action) => applyUpgradeUnit(gs, { unitId: action.unitId }),
  FOUND_CITY: (gs, action) => applyFoundCity(gs, { unitId: action.unitId, col: action.col, row: action.row }),
  CANCEL_PRODUCTION: (gs, action) => applyCancelProduction(gs, { cityId: action.cityId }),
  BUILD_ROAD: (gs, action) => applyBuildRoad(gs, { hexId: action.hexId }),
  SET_TRADE_FOCUS: (gs, action) => applySetTradeFocus(gs, { cityId: action.cityId, routeIndex: action.routeIndex, focus: action.focus }),
  END_TURN: (gs) => applyEndTurn(gs),
};

export const applyGameplayAction = (gameState, action) => {
  const applyFn = GAMEPLAY_ACTION_APPLIERS[action?.type];
  if (!applyFn) {
    return {
      state: gameState,
      events: [],
      changed: false,
      error: 'Unknown action type',
    };
  }

  const result = applyFn(gameState, action) || {};
  const nextState = result.state ?? gameState;

  return {
    state: nextState,
    events: result.events || [],
    changed: nextState !== gameState,
    error: null,
  };
};

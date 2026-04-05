import React, { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { HEX_SIZE, SQRT3, COLS, ROWS, HEX_POINTS, hexCenter, hexAt, getNeighbors, hexDist, getHexesInRadius, EVEN_COL_NEIGHBORS, ODD_COL_NEIGHBORS } from './data/constants.js';
import { TECH_TREE } from './data/techs.js';
import { RESOURCE_INFO } from './data/terrain.js';
import { UNIT_DEFS } from './data/units.js';
import { DISTRICT_DEFS } from './data/districts.js';
import { CIV_DEFS } from './data/civs.js';
import { calcCombatPreview } from './engine/combat.js';
import { calcPlayerIncome, calcPlayerIncomeWithState, canUpgradeUnit, autoAssignTiles, isWorkableHex } from './engine/economy.js';
import { getMoveBlockReason, getReachableHexes, getRangedTargets, getVisibleHexes, isHexOccupied, findPath } from './engine/movement.js';
import { addLogMsg, recalcAllTradeRoutes } from './engine/turnProcessing.js';
import { checkVictoryState } from './engine/victory.js';
import { getDisplayColors, checkNewMeetings } from './engine/discovery.js';
import { createInitialState } from './engine/gameInit.js';
import { getLeaderDef } from './data/leaders.js';
import {
  advanceToNextPlayerState,
  applyAcceptDiplomacyProposal,
  applyAttack,
  applyBuildRoad,
  applyCancelProduction,
  applyCreateDiplomacyProposal,
  applyDeclareWar,
  applyEndTurn,
  applyFoundCity,
  applyLaunchNuke,
  applyMoveUnit,
  applyRejectDiplomacyProposal,
  applySelectResearch,
  applySetProduction,
  applySetTradeFocus,
  applyUpgradeUnit,
} from './engine/actions.js';
import {
  applyRelationModifier,
  ensureDiplomacyState,
  getKnownPlayers,
  getLeaderScenePayload,
  getRelation,
  getTradePactBlockReason,
} from './engine/diplomacy.js';
import { aiExecuteTurn } from './ai/aiEngine.js';
import { SFX, MenuMusic } from './sfx.js';
import { genGrass, genTrees, genMtns, genWaves, genDetail, genCoast, genWaterCoast } from './components/ProceduralVisuals.js';
import MemoHex from './components/MemoHex.jsx';
import { btnStyle, panelStyle } from './styles.js';
import { usePanelDrag } from './hooks/usePanelDrag.js';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts.js';
import { usePanZoom } from './hooks/usePanZoom.js';
import { useMinimap } from './hooks/useMinimap.js';
import { ModeSelectScreen, MapSizeScreen, LobbyScreen, CivSelectScreen, TurnTransitionScreen, VictoryScreen } from './components/GameScreens.jsx';
import { MAX_PLAYERS } from './data/constants.js';

import { TechTreePanel } from './components/TechTreePanel.jsx';
import { CityPanel } from './components/CityPanel.jsx';
import { CombatPreview } from './components/CombatPreview.jsx';
import { PlayerPanel } from './components/PlayerPanel.jsx';
import { ActionBar } from './components/ActionBar.jsx';
import { Legend } from './components/Legend.jsx';
import { LogPanel } from './components/LogPanel.jsx';
import { BottomInfo } from './components/BottomInfo.jsx';
import { NotificationCircles } from './components/NotificationCircles.jsx';
import { TutorialTips } from './components/TutorialTips.jsx';
import { MinimapDisplay } from './components/MinimapDisplay.jsx';
import { EventPopup } from './components/EventPopup.jsx';
import { LeaderMeetingScreen } from './components/LeaderMeetingScreen.jsx';
import { DiplomacyPanel } from './components/DiplomacyPanel.jsx';
import { CanvasBoardRenderer } from './components/CanvasBoardRenderer.jsx';
import useUnitAnimation from './hooks/useUnitAnimation.js';
import UnitAnimationOverlay from './components/UnitAnimationOverlay.jsx';

let uidCtr = 0;
const EMPTY_UNIT_BUCKET = { all: [], myUnits: [], enemyUnits: [] };

export default function HexStrategyGame({ onlineMode, onBack } = {}){
  const[mapSizePick,setMapSizePick]=useState(null); // null | "small" | "medium" | "large"
  const[playerSlots,setPlayerSlots]=useState(()=>Array.from({length:MAX_PLAYERS-1},(_,i)=>({type:i===0?"ai":"closed",difficulty:"normal"})));
  const[lobbyDone,setLobbyDone]=useState(false);
  const[civPicks,setCivPicks]=useState({p1:"Rome"});
  const[civPickStep,setCivPickStep]=useState(1); // which human picker is choosing
  const[gameStarted,setGameStarted]=useState(false);
  const[gs,setGs]=useState(null);
  const[hovH,setHovH]=useState(null);
  const[selH,setSelH]=useState(null);
  const[selU,setSelU]=useState(null);
  const[showTech,setShowTech]=useState(false);
  const[showDiplomacy,setShowDiplomacy]=useState(false);
  const[showSaveLoad,setShowSaveLoad]=useState(false);
  const[saveName,setSaveName]=useState("");
  const[showCity,setShowCity]=useState(null);
  const[settlerM,setSettlerM]=useState(null);
  const[nukeM,setNukeM]=useState(null);
  const[preview,setPreview]=useState(null);
  const[flashes,setFlashes]=useState({});
  const[combatAnims,setCombatAnims]=useState([]); // [{id,x,y,dmg,color,t}] floating damage nums
  const[moveMsg,setMoveMsg]=useState(null); // transient "can't move" feedback
  const[aiThinking,setAiThinking]=useState(false);
  const[turnTransition,setTurnTransition]=useState(null); // null or {playerName, playerColor, playerColorLight}
  const[tutorialOn,setTutorialOn]=useState(true);
  const[minimapVisible,setMinimapVisible]=useState(true);
  const performancePrefStored=useMemo(()=>{try{return localStorage.getItem("eoe_performance_mode");}catch{return null;}},[]);
  const[performanceMode,setPerformanceMode]=useState(()=>performancePrefStored==="1");
  const[performanceModeTouched,setPerformanceModeTouched]=useState(()=>performancePrefStored!=null);
  const[rendererMode,setRendererMode]=useState(()=>{try{return localStorage.getItem("eoe_renderer_mode")||"auto";}catch{return "auto";}});
  const[tutorialDismissed,setTutorialDismissed]=useState({}); // keyed by tip id
  const[techCollapsed,setTechCollapsed]=useState(false);
  const[cityCollapsed,setCityCollapsed]=useState(false);
  const[turnPopups,setTurnPopups]=useState([]); // [{id,type,title,body,action}] turn-start popups
  const[eventPopup,setEventPopup]=useState(null); // random event popup {id,name,desc}
  const[leaderScene,setLeaderScene]=useState(null);
  const turnPopupShownRef=useRef(null); // tracks which turn+player combo we've shown popups for
  const victoryPlayed=useRef(false);
  const prevCpId=useRef(null);
  const gsRef=useRef(gs);
  const hovHRef=useRef(null);
  const previewKeyRef=useRef(null);
  const hoverTargetRef=useRef(null);
  const hoverRafRef=useRef(0);
  const visDataCacheRef=useRef(new Map());
  const{startAnimation,animatingUnitId,animVisuals,overlayRef}=useUnitAnimation();

  // Stop menu music when game starts, resume if returning to menus
  useEffect(() => {
    if (gameStarted && gs) {
      MenuMusic.stop();
    }
  }, [gameStarted, gs]);
  useEffect(()=>{if(!performanceModeTouched)return;try{localStorage.setItem("eoe_performance_mode",performanceMode?"1":"0");}catch{}},[performanceMode,performanceModeTouched]);
  useEffect(()=>{try{localStorage.setItem("eoe_renderer_mode",rendererMode);}catch{}},[rendererMode]);

  // Derived state (safe when gs is null)
  const hexes=gs?.hexes||[];
  const players=gs?.players||[];
  const turnNumber=gs?.turnNumber||1;
  const cpId=onlineMode?onlineMode.myPlayerId:(gs?.currentPlayerId||"p1");
  const humanPlayers=players.filter(p=>p.type==="human");
  const viewPlayerId=onlineMode?onlineMode.myPlayerId:(humanPlayers.length>1?cpId:(humanPlayers[0]?.id||cpId));
  const phase=gs?.phase||"MOVEMENT";
  const log=gs?.log||[];
  const barbarians=gs?.barbarians||[];
  const cp=players.find(p=>p.id===viewPlayerId)||{units:[],cities:[],researchedTechs:[],civilization:"Rome",name:"",color:"#888",colorBg:"#444",colorLight:"#aaa",gold:0,science:0};
  const enemies=players.filter(p=>p.id!==viewPlayerId);
  const op=enemies[0]; // legacy compat — prefer enemies array
  const inc=useMemo(()=>gs?calcPlayerIncomeWithState(cp,gs):{food:0,production:0,science:0,gold:0},[cp,gs]);
  const activeRenderer=useMemo(()=>{
    if(rendererMode!=="auto")return rendererMode;
    return hexes.length>=450 ? "canvas" : "svg";
  },[rendererMode,hexes.length]);
  const effectivePerformanceMode=performanceModeTouched ? performanceMode : hexes.length>=450;
  const knownPlayers=useMemo(()=>gs?getKnownPlayers(gs,cpId):[],[gs,cpId]);
  const diplomacyRelations=useMemo(()=>{
    if(!gs)return {};
    const out={};
    for(const p of knownPlayers) out[p.id]=getRelation(gs,cpId,p.id);
    return out;
  },[gs,knownPlayers,cpId]);
  const pendingIncoming=useMemo(()=>{
    if(!gs?.diplomacy?.pendingProposals)return [];
    return gs.diplomacy.pendingProposals.filter(p=>p.toPlayerId===cpId).map(p=>({
      ...p,
      fromName: players.find(pl=>pl.id===p.fromPlayerId)?.name||p.fromPlayerId,
    }));
  },[gs,cpId,players]);
  const pendingOutgoing=useMemo(()=>{
    if(!gs?.diplomacy?.pendingProposals)return [];
    return gs.diplomacy.pendingProposals.filter(p=>p.fromPlayerId===cpId).map(p=>({
      ...p,
      toName: players.find(pl=>pl.id===p.toPlayerId)?.name||p.toPlayerId,
    }));
  },[gs,cpId,players]);
  const tradePactBlockReasons=useMemo(()=>{
    if(!gs)return {};
    const out={};
    for(const p of knownPlayers){
      const reason=getTradePactBlockReason(gs,cpId,p.id);
      if(reason) out[p.id]=reason;
    }
    return out;
  },[gs,knownPlayers,cpId]);
  const visData=useMemo(()=>{
    const cache=visDataCacheRef.current;
    const nextIds=new Set();
    const result=hexes.map(h=>{
      nextIds.add(h.id);
      const neighborSig=getNeighbors(h.col,h.row).map(([c,r])=>hexAt(hexes,c,r)?.terrainType||"void").join("|");
      const sig=`${h.terrainType}:${neighborSig}`;
      const cached=cache.get(h.id);
      if(cached?.sig===sig)return cached.data;
      const grass=genGrass(h.id);
      const data={blades:grass.blades,flowers:grass.flowers,rocks:grass.rocks,detail:genDetail(h.id),trees:h.terrainType==="forest"?genTrees(h.id):{trunks:"",canopy:"",undergrowth:""},mtns:h.terrainType==="mountain"?genMtns(h.id):{peaks:"",snow:"",shadow:"",rocks:""},waves:h.terrainType==="water"?genWaves(h.id):{waves:"",foam:"",shimmer:""},coast:genCoast(h,hexes),waterCoast:genWaterCoast(h,hexes)};
      cache.set(h.id,{sig,data});
      return data;
    });
    for(const id of cache.keys()){if(!nextIds.has(id))cache.delete(id);}
    return result;
  },[hexes]);
  const displayPlayerById=useMemo(()=>{const m={};players.forEach(p=>{const dc=getDisplayColors(p.id,viewPlayerId,gs);m[p.id]={...p,color:dc.color,colorBg:dc.colorBg,colorLight:dc.colorLight};});return m;},[players,gs,viewPlayerId]);
  const playerById=useMemo(()=>{const m={};players.forEach(p=>{m[p.id]=p;});return m;},[players]);
  const cityMap=useMemo(()=>{const m={};players.forEach(p=>{const displayPlayer=displayPlayerById[p.id];p.cities.forEach(c=>{m[c.hexId]={city:c,player:displayPlayer};});});return m;},[players,displayPlayerById]);
  const unitMap=useMemo(()=>{const m={};
    const getBucket=k=>{if(!m[k])m[k]={all:[],myUnits:[],enemyUnits:[]};return m[k];};
    players.forEach(p=>{const dc=displayPlayerById[p.id];p.units.forEach(u=>{if(u.id===animatingUnitId)return;const k=`${u.hexCol},${u.hexRow}`;const bucket=getBucket(k);const entry={...u,pid:p.id,pCol:dc.color,pBg:dc.colorBg,pLight:dc.colorLight};bucket.all.push(entry);if(p.id===cpId)bucket.myUnits.push(entry);else bucket.enemyUnits.push(entry);});});
    barbarians.forEach(b=>{const k=`${b.hexCol},${b.hexRow}`;const bucket=getBucket(k);const entry={...b,pid:"barb",pCol:"#c05050",pBg:"#4a1010",pLight:"#ff8080"};bucket.all.push(entry);bucket.enemyUnits.push(entry);});
    return m;},[players,barbarians,animatingUnitId,displayPlayerById,cpId]);
  const fogVisible=useMemo(()=>gs?getVisibleHexes(cp,hexes):new Set(),[cp,hexes,gs]);
  const fogExplored=useMemo(()=>{if(!gs)return new Set();return new Set(gs.explored?.[viewPlayerId]||[]);},[gs,viewPlayerId]);
  const discoveredResources=useMemo(()=>{const s=new Set();for(const[type,info]of Object.entries(RESOURCE_INFO)){if(!info.techReq||cp.researchedTechs.includes(info.techReq))s.add(type);}return s;},[cp.researchedTechs]);
  const sud=useMemo(()=>{if(!selU||!gs)return null;const u=cp.units.find(u2=>u2.id===selU);if(!u)return null;return{...u,def:UNIT_DEFS[u.unitType]};},[selU,cp,gs]);

  const{reach,moveCostMap}=useMemo(()=>{
    if(!sud||phase!=="MOVEMENT"||sud.movementCurrent<=0)return{reach:new Set(),moveCostMap:{}};
    const{reachable,costMap}=getReachableHexes(sud.hexCol,sud.hexRow,sud.movementCurrent,hexes,sud.def?.domain||"land",cpId,players,sud.def?.ability,barbarians);
    return{reach:reachable,moveCostMap:costMap};
  },[sud,hexes,phase,cpId,players,barbarians]);

  const atkRange=useMemo(()=>{
    if(!sud||phase!=="MOVEMENT"||!sud.def?.range||sud.hasAttacked)return new Set();
    return getRangedTargets(sud.hexCol,sud.hexRow,sud.def.range);
  },[sud,phase]);

  const nukeR=useMemo(()=>{
    if(!nukeM)return new Set();const nu=cp.units.find(u=>u.id===nukeM);
    if(!nu)return new Set();const nukeDef=UNIT_DEFS[nu.unitType];return getRangedTargets(nu.hexCol,nu.hexRow,nukeDef?.range||12);
  },[nukeM,cp]);

  const actable=useMemo(()=>{
    if(phase!=="MOVEMENT")return new Set();
    return new Set(cp.units.filter(u=>u.movementCurrent>0||(!u.hasAttacked&&(UNIT_DEFS[u.unitType]?.range||0)>0)).map(u=>u.id));
  },[cp,phase]);

  // Hexes too close to any city for settler placement (within 2 hexes = less than 3)
  const settlerBlocked=useMemo(()=>{
    if(!settlerM)return new Set();
    const blocked=new Set();
    for(const p of players){
      for(const c of p.cities){
        const ch=hexes[c.hexId];
        if(!ch)continue;
        for(const h of hexes){
          if(hexDist(ch.col,ch.row,h.col,h.row)<3)blocked.add(h.uk);
        }
      }
    }
    return blocked;
  },[settlerM,players,hexes]);

  // Pan/zoom
  const MINIMAP_W=160,MINIMAP_H=140;
  const wW=COLS*1.5*HEX_SIZE+HEX_SIZE*2+100,wH=ROWS*SQRT3*HEX_SIZE+SQRT3*HEX_SIZE+100;
  const { panRef, zoomRef, isPanRef, gRef, svgRef, gameContainerRef, uiOverlayRef, minimapRenderRef, flush, sched, onMD, onMM, onMU, onWh } = usePanZoom({ wW, wH });
  // Panel drag
  const { techPosRef, cityPosRef, onPanelDown, onPanelMove, onPanelUp } = usePanelDrag();
  // Minimap
  const { minimapRef, onMinimapDown, onMinimapMove, onMinimapUp } = useMinimap({ hexes, fogVisible, fogExplored, players, gs, wW, wH, MINIMAP_W, MINIMAP_H, minimapRenderRef, zoomRef, panRef, sched, viewPlayerId });
  // Center camera on player's first city when game starts
  const gameCenteredRef=useRef(false);
  useEffect(()=>{
    if(!gs||gameCenteredRef.current)return;
    const player=gs.players.find(p=>p.id===gs.currentPlayerId);
    if(!player||!player.cities.length)return;
    const city=player.cities[0];
    const cityHex=hexes[city.hexId];
    if(!cityHex)return;
    const z=zoomRef.current;
    panRef.current={x:(wW*z)/2-cityHex.x*z, y:(wH*z)/2-cityHex.y*z};
    gameCenteredRef.current=true;
    sched();
  },[gs,hexes,wW,wH,sched]);
  useEffect(()=>{gsRef.current=gs;},[gs]);
  useEffect(()=>{hovHRef.current=hovH;},[hovH]);
  useEffect(()=>() => { if (hoverRafRef.current) cancelAnimationFrame(hoverRafRef.current); },[]);
  useEffect(()=>{if(Object.keys(flashes).length>0){const t=setTimeout(()=>setFlashes({}),800);return()=>clearTimeout(t);}},[flashes]);
  useEffect(()=>{if(combatAnims.length>0){const t=setTimeout(()=>setCombatAnims([]),1200);return()=>clearTimeout(t);}},[combatAnims]);
  useEffect(()=>{if(moveMsg){const t=setTimeout(()=>setMoveMsg(null),1500);return()=>clearTimeout(t);}},[moveMsg]);
  // Update explored set when fog visibility changes
  useEffect(()=>{if(!gs||fogVisible.size===0)return;
    setGs(prev=>{if(!prev)return prev;const ex=prev.explored||{};const cur=ex[viewPlayerId]||[];const s=new Set(cur);let changed=false;
      for(const k of fogVisible){if(!s.has(k)){s.add(k);changed=true;}}
      if(!changed)return prev;return{...prev,explored:{...ex,[viewPlayerId]:[...s]}};});
  },[fogVisible,viewPlayerId]);

  // Civ discovery: detect when we first see another player's units/cities
  useEffect(()=>{
    if(!gs||!fogVisible||fogVisible.size===0||!gs.metPlayers)return;
    const newlyMet=checkNewMeetings(gs,viewPlayerId,fogVisible);
    if(newlyMet.length===0)return;
    setGs(prev=>{
      if(!prev||!prev.metPlayers)return prev;
      const nextState=JSON.parse(JSON.stringify(prev));
      ensureDiplomacyState(nextState);
      const mp={...nextState.metPlayers};
      const myMet=[...(mp[viewPlayerId]||[])];
      for(const mid of newlyMet){
        if(!myMet.includes(mid))myMet.push(mid);
        // Symmetric: they also meet us
        const theirMet=[...(mp[mid]||[])];
        if(!theirMet.includes(viewPlayerId)){theirMet.push(viewPlayerId);mp[mid]=theirMet;}
        applyRelationModifier(nextState, viewPlayerId, mid, 6, "First contact");
      }
      mp[viewPlayerId]=myMet;
      nextState.metPlayers=mp;
      return nextState;
    });
    const metId=newlyMet[0];
    if(metId){
      const nextState=JSON.parse(JSON.stringify(gs));
      ensureDiplomacyState(nextState);
      const scene=getLeaderScenePayload(nextState, viewPlayerId, metId, "firstMeet");
      if(scene) setLeaderScene(scene);
      SFX.found?.();
    }
  },[fogVisible,viewPlayerId,gs?.metPlayers]);

  // === ONLINE MODE: sync server state to local state ===
  // Note: setMapConfig is called in OnlineGame.jsx BEFORE this component mounts
  useEffect(() => {
    if (!onlineMode?.gameState) return;
    setGs(onlineMode.gameState);
  }, [onlineMode?.gameState]);

  // === ONLINE MODE: process server events (SFX, flashes, combat anims) ===
  useEffect(() => {
    if (!onlineMode?.events?.length) return;
    const evts = onlineMode.events;
    const flashMap = {};
    const anims = [];
    const now = Date.now();

    for (const evt of evts) {
      if (evt.type === "sfx" && SFX[evt.name]) {
        SFX[evt.name]();
      } else if (evt.type === "flash") {
        flashMap[evt.key] = evt.kind || "combat";
      } else if (evt.type === "combat_anim") {
        if (evt.defender) {
          const defPos = hexCenter(evt.defender.col, evt.defender.row);
          anims.push({ id: now + anims.length, x: defPos.x, y: defPos.y, dmg: evt.aDmg, color: "#ff4040", t: now });
        }
        if (evt.dDmg > 0 && evt.attacker) {
          const attPos = hexCenter(evt.attacker.col, evt.attacker.row);
          anims.push({ id: now + anims.length, x: attPos.x, y: attPos.y, dmg: evt.dDmg, color: "#ff8040", t: now });
        }
      }
    }

    if (Object.keys(flashMap).length > 0) setFlashes(flashMap);
    if (anims.length > 0) setCombatAnims(prev => [...prev, ...anims]);
    onlineMode.clearEvents();
  }, [onlineMode?.events]);

  // addLog and checkVictory delegate to module-level pure functions
  const addLog=addLogMsg;
  const checkVictory=checkVictoryState;

  const openLeaderScene = useCallback((otherPlayerId, context="diplomacy") => {
    if(!gs) return;
    const scene = getLeaderScenePayload(gs, cpId, otherPlayerId, context);
    if(scene) setLeaderScene(scene);
  }, [gs, cpId]);

  const handleLocalEngineEvents = useCallback((events = [], { blockedKey = null } = {}) => {
    if (!events.length) return;

    const flashMap = {};
    const anims = [];
    const now = Date.now();
    let hadDiplomacyError = false;

    for (const [index, evt] of events.entries()) {
      if (evt.type === "sfx" && SFX[evt.name]) {
        setTimeout(() => SFX[evt.name](), index * 150);
      } else if (evt.type === "flash") {
        flashMap[evt.key] = evt.kind || "combat";
      } else if (evt.type === "combat_anim") {
        if (evt.defender) {
          const defPos = hexCenter(evt.defender.col, evt.defender.row);
          anims.push({ id: now + anims.length, x: defPos.x, y: defPos.y, dmg: evt.aDmg, color: "#ff4040", t: now });
        }
        if (evt.dDmg > 0 && evt.attacker) {
          const attPos = hexCenter(evt.attacker.col, evt.attacker.row);
          anims.push({ id: now + anims.length, x: attPos.x, y: attPos.y, dmg: evt.dDmg, color: "#ff8040", t: now });
        }
      } else if (evt.type === "diplomacy_error") {
        hadDiplomacyError = true;
        setMoveMsg(evt.message);
      }
    }

    if (hadDiplomacyError && blockedKey && !flashMap[blockedKey]) {
      flashMap[blockedKey] = "blocked";
    }
    if (Object.keys(flashMap).length > 0) {
      setFlashes(prev => ({ ...prev, ...flashMap }));
    }
    if (anims.length > 0) {
      setCombatAnims(prev => [...prev, ...anims]);
    }
  }, []);

  const runLocalEngineAction = useCallback((applyFn, payload, eventOptions) => {
    let result = { state: gsRef.current, events: [], changed: false };
    setGs(prev => {
      if (!prev) return prev;
      const applied = applyFn(prev, payload);
      const nextState = applied?.state ?? prev;
      result = {
        state: nextState,
        events: applied?.events || [],
        changed: nextState !== prev,
      };
      return nextState;
    });
    handleLocalEngineEvents(result.events, eventOptions);
    return result;
  }, [handleLocalEngineEvents]);

  const declareWarAction = useCallback((targetPlayerId) => {
    if(!targetPlayerId || onlineMode) return;
    const result = runLocalEngineAction(applyDeclareWar, { targetPlayerId });
    if (result.changed) {
      setLeaderScene(null);
      setShowDiplomacy(true);
    }
  }, [onlineMode, runLocalEngineAction]);

  const proposeDiplomacyAction = useCallback((targetPlayerId, type) => {
    if(!targetPlayerId || onlineMode) return;
    if(type==="trade_pact" && gsRef.current){
      const blockReason=getTradePactBlockReason(gsRef.current, gsRef.current.currentPlayerId, targetPlayerId);
      if(blockReason){
        setMoveMsg(blockReason);
        return;
      }
    }
    runLocalEngineAction(applyCreateDiplomacyProposal, { targetPlayerId, proposalType: type, autoResolveAi: true });
    setShowDiplomacy(true);
  }, [onlineMode, runLocalEngineAction]);

  const acceptProposalAction = useCallback((proposalId) => {
    if(onlineMode) return;
    runLocalEngineAction(applyAcceptDiplomacyProposal, { proposalId });
  }, [onlineMode, runLocalEngineAction]);

  const rejectProposalAction = useCallback((proposalId) => {
    if(onlineMode) return;
    runLocalEngineAction(applyRejectDiplomacyProposal, { proposalId });
  }, [onlineMode, runLocalEngineAction]);

  // === NUKE ===
  const launchNuke=useCallback((nuId,tc,tr)=>{
    if(onlineMode){onlineMode.sendAction({type:"LAUNCH_NUKE",nukeId:nuId,col:tc,row:tr});setNukeM(null);setSelU(null);return;}
    runLocalEngineAction(applyLaunchNuke, { nukeId: nuId, col: tc, row: tr });
    setNukeM(null);setSelU(null);SFX.nuke();
  },[onlineMode, runLocalEngineAction]);

  const doCombat = useCallback((attackerId, defCol, defRow) => {
    if(onlineMode){onlineMode.sendAction({type:"ATTACK",attackerId,col:defCol,row:defRow});setSelU(null);setPreview(null);return;}
    runLocalEngineAction(applyAttack, { attackerId, col: defCol, row: defRow }, { blockedKey: `${defCol},${defRow}` });

    setSelU(null);
    setPreview(null);
  }, [onlineMode, runLocalEngineAction]);

  // === END TURN (replaces old phase system) ===
  const endTurn = useCallback(() => {
    if(onlineMode){onlineMode.sendAction({type:"END_TURN"});setSelU(null);setSelH(null);setSettlerM(null);setNukeM(null);setPreview(null);return;}
    runLocalEngineAction(applyEndTurn);

    setSelU(null); setSelH(null); setSettlerM(null); setNukeM(null); setPreview(null);
    turnPopupShownRef.current=null;
  }, [onlineMode, runLocalEngineAction]);
  // Keep advPhase as alias for compatibility
  const advPhase = endTurn;

  // Toggle a single tile's worked status (manual citizen assignment)
  const toggleTile = useCallback((cityId, hexId) => {
    setGs(prev => {
      const g = JSON.parse(JSON.stringify(prev));
      const player = g.players.find(p => p.id === g.currentPlayerId);
      const city = player?.cities.find(c => c.id === cityId);
      if (!city) return prev;
      const worked = city.workedTileIds || [];
      const idx = worked.indexOf(hexId);
      if (idx !== -1) {
        worked.splice(idx, 1);
      } else {
        if (worked.length >= city.population) return prev;
        const hex = g.hexes[hexId];
        if (!hex || !isWorkableHex(hex)) return prev;
        if (!(city.borderHexIds || []).includes(hexId)) return prev;
        worked.push(hexId);
      }
      city.workedTileIds = worked;
      city.manualTiles = true;
      return g;
    });
  }, []);

  // Auto-assign tiles prioritizing a specific yield
  const maximizeTiles = useCallback((cityId, priority) => {
    setGs(prev => {
      const g = JSON.parse(JSON.stringify(prev));
      const player = g.players.find(p => p.id === g.currentPlayerId);
      const city = player?.cities.find(c => c.id === cityId);
      if (!city) return prev;
      autoAssignTiles(city, g.hexes, priority, player);
      city.manualTiles = false;
      return g;
    });
  }, []);

  const runLocalAiTurns = useCallback((state) => {
    if (!state || state.victoryStatus) return { state, events: [] };

    let nextState = state;
    const events = [];
    let safety = (state.players?.length || 0) + 1;

    while (safety-- > 0) {
      const currentP = nextState.players.find(p => p.id === nextState.currentPlayerId);
      if (!currentP || currentP.type !== "ai" || nextState.victoryStatus) break;

      nextState = aiExecuteTurn(nextState);

      const aiP = nextState.players.find(p => p.id === nextState.currentPlayerId);
      if (aiP) {
        const aiVis = getVisibleHexes(aiP, nextState.hexes);
        const aiEx = new Set(nextState.explored?.[aiP.id] || []);
        for (const k of aiVis) aiEx.add(k);
        nextState.explored = { ...nextState.explored, [aiP.id]: [...aiEx] };
      }

      recalcAllTradeRoutes(nextState);
      const sfxQ = [];
      advanceToNextPlayerState(nextState, sfxQ);
      events.push(...sfxQ.map(name => ({ type: "sfx", name })));
    }

    return { state: nextState, events };
  }, []);

  // --- AI auto-play: when it's an AI player's turn, execute AI and chain through consecutive AI turns ---
  useEffect(() => {
    if (onlineMode) return; // Skip AI processing in online mode
    if (!gs || gs.victoryStatus) return;
    const currentP = gs.players.find(p => p.id === gs.currentPlayerId);
    if (!currentP || currentP.type !== "ai") return;

    setAiThinking(true);

    const timer = setTimeout(() => {
      let aiResult = { state: gsRef.current, events: [] };
      setGs(prev => {
        if (!prev) return prev;
        aiResult = runLocalAiTurns(prev);
        return aiResult.state;
      });

      handleLocalEngineEvents(aiResult.events);
      setAiThinking(false);
      turnPopupShownRef.current=null;
    }, 600);

    return () => clearTimeout(timer);
  }, [gs?.currentPlayerId, gs?.turnNumber, gs?.victoryStatus, handleLocalEngineEvents, runLocalAiTurns]);

  // --- Turn transition screen for human players in games with multiple humans ---
  useEffect(() => {
    if (onlineMode) return; // Skip turn transition in online mode
    if (!gs || gs.victoryStatus) { prevCpId.current = gs?.currentPlayerId || null; return; }
    const currentP = gs.players.find(p => p.id === gs.currentPlayerId);
    if (!currentP || currentP.type !== "human") { prevCpId.current = gs?.currentPlayerId || null; return; }
    // Count human players — only show transition if more than 1 human
    const humanCount = gs.players.filter(p => p.type === "human").length;
    if (humanCount <= 1) { prevCpId.current = gs?.currentPlayerId || null; return; }
    // Show transition on first turn (prevCpId null) OR when player changes
    if ((!prevCpId.current || prevCpId.current !== gs.currentPlayerId) && !gs.victoryStatus) {
      setTurnTransition({ playerName: currentP.name, playerColor: currentP.color, playerColorLight: currentP.colorLight });
    }
    prevCpId.current = gs.currentPlayerId;
  }, [gs?.currentPlayerId, gs?.victoryStatus, gs?.players]);

  // --- Turn-start popups: show prompts for idle tech, idle city production, events ---
  useEffect(()=>{
    if(!gs||gs.victoryStatus)return;
    const key=`${gs.turnNumber}-${gs.currentPlayerId}`;
    if(turnPopupShownRef.current===key)return;
    // Don't show popups during turn transition or if AI is playing
    if(turnTransition)return;
    const cpForPopup=gs.players.find(p=>p.id===gs.currentPlayerId);
    if(cpForPopup&&cpForPopup.type==="ai")return;
    turnPopupShownRef.current=key;
    const popups=[];let pid=0;
    const cp2=gs.players.find(p=>p.id===gs.currentPlayerId);
    if(!cp2)return;
    // Event popup (shown as dedicated modal)
    if(gs.eventMsg) setEventPopup(gs.eventMsg);
    // Idle research
    if(!cp2.currentResearch){popups.push({id:pid++,type:"tech",title:"🔬 Choose Research",body:"No technology is being researched. Open the tech tree to pick one!",action:"tech"});}
    // Idle city production
    for(const city of cp2.cities){
      if(!city.currentProduction){popups.push({id:pid++,type:"city",title:`🏛 ${city.name} — Idle`,body:`${city.name} has no production queue. Click it to choose what to build!`,action:"city",cityId:city.id});}
    }
    if(popups.length>0)setTurnPopups(popups);
  },[gs?.turnNumber,gs?.currentPlayerId,gs?.victoryStatus,turnTransition]);

  // --- Player action callbacks ---

  const selResearch = useCallback((techId) => {
    if(onlineMode){onlineMode.sendAction({type:"SELECT_RESEARCH",techId});return;}
    runLocalEngineAction(applySelectResearch, { techId });
  }, [onlineMode, runLocalEngineAction]);

  const upgradeUnit=useCallback((unitId)=>{
    if(onlineMode){onlineMode.sendAction({type:"UPGRADE_UNIT",unitId});return;}
    runLocalEngineAction(applyUpgradeUnit, { unitId });
  },[onlineMode, runLocalEngineAction]);

  const setProd = useCallback((cityId, type, itemId) => {
    if(onlineMode){onlineMode.sendAction({type:"SET_PRODUCTION",cityId,prodType:type,itemId});return;}
    runLocalEngineAction(applySetProduction, { cityId, type, itemId });
  }, [onlineMode, runLocalEngineAction]);

  const setTradeFocus = useCallback((cityId, routeIndex, focus) => {
    if(onlineMode){onlineMode.sendAction({type:"SET_TRADE_FOCUS",cityId,routeIndex,focus});return;}
    runLocalEngineAction(applySetTradeFocus, { cityId, routeIndex, focus });
  }, [onlineMode, runLocalEngineAction]);

  const cancelProduction = useCallback((cityId) => {
    if(onlineMode){onlineMode.sendAction({type:"CANCEL_PRODUCTION",cityId});return;}
    runLocalEngineAction(applyCancelProduction, { cityId });
  }, [onlineMode, runLocalEngineAction]);

  const buildRoad = useCallback((hexId) => {
    if(onlineMode){onlineMode.sendAction({type:"BUILD_ROAD",hexId});return;}
    runLocalEngineAction(applyBuildRoad, { hexId });
  }, [onlineMode, runLocalEngineAction]);

  // Keyboard shortcuts (must be after upgradeUnit and buildRoad are defined)
  useKeyboardShortcuts({ sched, phase, cp, selU, setSelU, setSelH, setSettlerM, setNukeM, setPreview, panRef, endTurn, aiThinking, setShowTech, setShowCity, turnTransition, setTurnTransition, upgradeUnit, buildRoad, sud, setShowSaveLoad, setTutorialOn, setTutorialDismissed, zoomRef, wW, wH, setMinimapVisible, hexes });

  const moveU = useCallback((unitId, targetCol, targetRow, cost) => {
    if(onlineMode){onlineMode.sendAction({type:"MOVE_UNIT",unitId,col:targetCol,row:targetRow});setSelU(null);return;}
    if(animatingUnitId)return; // block during animation

    const currentGs = gsRef.current;
    if (!currentGs) return;
    const player = currentGs.players.find(p => p.id === currentGs.currentPlayerId);
    const unit = player?.units.find(u => u.id === unitId);
    if (!unit) return;

    const unitDef = UNIT_DEFS[unit.unitType];
    const path = findPath(
      unit.hexCol, unit.hexRow, targetCol, targetRow,
      currentGs.hexes, unitDef?.domain || 'land',
      player.id, currentGs.players, unitDef?.ability, currentGs.barbarians
    );
    const waypoints = (path || [{ col: unit.hexCol, row: unit.hexRow }, { col: targetCol, row: targetRow }])
      .map(p => hexCenter(p.col, p.row));

    const visuals = {
      unitType: unit.unitType,
      pBg: player.colorBg, pCol: player.color, pLight: player.colorLight
    };

    startAnimation(unitId, visuals, waypoints, () => {
      const result = runLocalEngineAction(applyMoveUnit, { unitId, col: targetCol, row: targetRow });
      const movedUnit = result.state?.players
        ?.find(p => p.id === result.state.currentPlayerId)
        ?.units?.find(u => u.id === unitId);
      if (!movedUnit || movedUnit.movementCurrent <= 0) setSelU(null);
    });
  }, [animatingUnitId, runLocalEngineAction, startAnimation]);

  const foundCity = useCallback((unitId, col, row) => {
    if(onlineMode){onlineMode.sendAction({type:"FOUND_CITY",unitId,col,row});setSettlerM(null);setSelU(null);return;}
    runLocalEngineAction(applyFoundCity, { unitId, col, row });
    setSettlerM(null);
    setSelU(null);
  }, [onlineMode, runLocalEngineAction]);

  // === RENDER HEXES (memoized) ===
  // Helper: find hex from SVG event via data attributes
  const findHexFromEvent=useCallback(e=>{const el=e.target.closest("[data-hex]");if(!el)return null;
    const id=+el.dataset.hex,col=+el.dataset.col,row=+el.dataset.row;
    return{id,col,row,hex:hexes[id],uk:`${col},${row}`};},[hexes]);
  const isPointInHex=useCallback((worldX,worldY,hex)=>{
    const localX=Math.abs(worldX-hex.x);
    const localY=Math.abs(worldY-hex.y);
    const halfHeight=(SQRT3*HEX_SIZE)/2;
    return localX<=HEX_SIZE && localY<=halfHeight && (SQRT3*localX)+localY<=SQRT3*HEX_SIZE;
  },[]);
  const findHexFromClientPoint=useCallback((clientX,clientY)=>{
    const z=zoomRef.current;
    const p=panRef.current;
    const cx=window.innerWidth/2;
    const cy=window.innerHeight/2;
    const worldX=(clientX-(p.x+cx-(wW*z)/2))/z;
    const worldY=(clientY-(p.y+cy-(wH*z)/2))/z;
    const approxCol=Math.round((worldX-HEX_SIZE-50)/(1.5*HEX_SIZE));
    let bestHex=null;
    let bestDistSq=Infinity;
    for(let col=approxCol-1;col<=approxCol+1;col++){
      if(col<0||col>=COLS)continue;
      const baseRow=(worldY-HEX_SIZE-50-(col%2===1?(SQRT3*HEX_SIZE)/2:0))/(SQRT3*HEX_SIZE);
      const approxRow=Math.round(baseRow);
      for(let row=approxRow-1;row<=approxRow+1;row++){
        if(row<0||row>=ROWS)continue;
        const hex=hexAt(hexes,col,row);
        if(!hex)continue;
        const dx=hex.x-worldX;
        const dy=hex.y-worldY;
        const distSq=dx*dx+dy*dy;
        if(isPointInHex(worldX,worldY,hex)){
          return{id:hex.id,col:hex.col,row:hex.row,hex,uk:hex.uk};
        }
        if(distSq<bestDistSq){
          bestDistSq=distSq;
          bestHex=hex;
        }
      }
    }
    if(!bestHex||bestDistSq>HEX_SIZE*HEX_SIZE*1.2)return null;
    return{id:bestHex.id,col:bestHex.col,row:bestHex.row,hex:bestHex,uk:bestHex.uk};
  },[hexes,isPointInHex,panRef,zoomRef,wW,wH]);

  const commitPreview=useCallback(nextPreview=>{
    const nextKey=nextPreview?[
      nextPreview.an,
      nextPreview.dn,
      nextPreview.aDmg,
      nextPreview.dDmg,
      nextPreview.ahp,
      nextPreview.dhp,
      nextPreview.rapidShot ? 1 : 0,
    ].join("|"):null;
    if(previewKeyRef.current===nextKey)return;
    previewKeyRef.current=nextKey;
    setPreview(nextPreview);
  },[]);

  const applyHoveredHex=useCallback(h=>{
    if(!h||isPanRef.current){
      if(hovHRef.current!==null){hovHRef.current=null;setHovH(null);}
      commitPreview(null);
      return;
    }
    const{hex,uk}=h;
    const fogged=!fogVisible.has(uk);
    if(fogged){
      if(hovHRef.current!==null){hovHRef.current=null;setHovH(null);}
      commitPreview(null);
      return;
    }
    if(hovHRef.current!==hex.id){hovHRef.current=hex.id;setHovH(hex.id);}
    // Combat preview on hover (shows even if unit already attacked)
    if(selU&&phase==="MOVEMENT"&&sud){
      const bucket=unitMap[uk]||EMPTY_UNIT_BUCKET;const eU=bucket.enemyUnits;const cE=cityMap[hex.id];
      const dist=hexDist(sud.hexCol,sud.hexRow,hex.col,hex.row);
      const inRange=sud.def?.range>0?dist<=sud.def.range:dist<=1;
      if(inRange&&eU.length>0){const eu=eU[0];
        const dP=eu.pid==="barb"?{researchedTechs:[],civilization:"Barbarian"}:playerById[eu.pid];
        const pv=calcCombatPreview(sud,sud.def,eu,UNIT_DEFS[eu.unitType],hex.terrainType,cp,dP,!!(cE&&cE.player.id!==cpId));
        const effADmg=sud.def.ability==="rapid_shot"?Math.ceil(pv.aDmg*1.5):pv.aDmg;
        commitPreview({...pv,aDmg:effADmg,an:sud.def.name,dn:UNIT_DEFS[eu.unitType]?.name,ahp:sud.hpCurrent,dhp:eu.hpCurrent,rapidShot:sud.def.ability==="rapid_shot"});
        return;
      }
    }
    commitPreview(null);
  },[cityMap,commitPreview,cp,cpId,fogVisible,isPanRef,phase,playerById,selU,sud,unitMap]);

  const scheduleHoveredHex=useCallback(h=>{
    hoverTargetRef.current=h;
    if(hoverRafRef.current)return;
    hoverRafRef.current=requestAnimationFrame(()=>{
      hoverRafRef.current=0;
      applyHoveredHex(hoverTargetRef.current);
    });
  },[applyHoveredHex]);

  // Delegated event handlers (single set on parent <g>, not per-hex)
  const onHexHover=useCallback(e=>{
    scheduleHoveredHex(findHexFromEvent(e));
  },[findHexFromEvent,scheduleHoveredHex]);

  const onHexLeave=useCallback(()=>{scheduleHoveredHex(null);},[scheduleHoveredHex]);

  const handleHexClickTarget=useCallback(h=>{
    if(animatingUnitId)return;if(!h||isPanRef.current)return;
    const{hex,uk}=h;if(!fogVisible.has(uk))return;
    const bucket=unitMap[uk]||EMPTY_UNIT_BUCKET;const myU=bucket.myUnits;
    const eU=bucket.enemyUnits;const cE=cityMap[hex.id];const isMy=myU.length>0;
    const uSel2=selU&&isMy&&myU.some(u=>u.id===selU);
    const hasTgt=eU.length>0||(cE&&cE.player.id!==cpId);
    const inNk=nukeM&&nukeR.has(uk);
    if(nukeM&&inNk){launchNuke(nukeM,hex.col,hex.row);return;}
    if(nukeM){setNukeM(null);return;}
    if(settlerM&&hex.terrainType!=="water"&&hex.terrainType!=="mountain"&&!hex.cityId){foundCity(settlerM,hex.col,hex.row);return;}
    if(settlerM){setSettlerM(null);return;}
    // LEFT-CLICK MOVE/ATTACK (Mac/Chrome compatible)
    if(selU&&phase==="MOVEMENT"&&!uSel2){
      const inMv=reach.has(uk)&&eU.length===0&&!(cE&&cE.player.id!==cpId);
      const inMelee=sud&&sud.def?.range===0&&!sud.hasAttacked&&hexDist(sud.hexCol,sud.hexRow,hex.col,hex.row)<=1&&hasTgt;
      const inRng=sud&&sud.def?.range>0&&!sud.hasAttacked&&atkRange.has(uk)&&hasTgt;
      if(inMelee||inRng){doCombat(selU,hex.col,hex.row);return;}
      if(inMv){moveU(selU,hex.col,hex.row,moveCostMap[uk]);return;}
    }
    if(cE&&cE.player.id===cpId){
      // City hex with our units: first click selects unit, second click opens city panel
      if(isMy&&!uSel2&&phase==="MOVEMENT"){setSelU(myU[0].id);setSelH(null);return;}
      if(isMy&&uSel2&&myU.length>1){const ci=myU.findIndex(u=>u.id===selU);setSelU(myU[(ci+1)%myU.length].id);return;}
      // No unit or already selected the only unit — open city panel
      setShowCity(cE.city.id);setSelU(null);return;
    }
    if(isMy&&!uSel2&&phase==="MOVEMENT"){setSelU(myU[0].id);setSelH(null);}
    else if(isMy&&uSel2){
      if(myU.length>1){const ci=myU.findIndex(u=>u.id===selU);setSelU(myU[(ci+1)%myU.length].id);}
      else{const su=myU[0];if(su.unitType==="settler"){setSettlerM(su.id);return;}if(su.unitType==="nuke"||su.unitType==="icbm"){setNukeM(su.id);return;}setSelU(null);setSelH(hex.id);}
    }else{setSelU(null);setSelH(selH===hex.id?null:hex.id);}
  },[fogVisible,unitMap,cityMap,cpId,selU,nukeM,nukeR,settlerM,phase,selH,reach,moveCostMap,sud,launchNuke,foundCity,doCombat,moveU,animatingUnitId,isPanRef]);

  const onHexClick=useCallback(e=>{
    e.stopPropagation();
    handleHexClickTarget(findHexFromEvent(e));
  },[findHexFromEvent,handleHexClickTarget]);

  const handleHexContextTarget=useCallback(h=>{
    if(animatingUnitId||isPanRef.current||phase!=="MOVEMENT")return;
    if(!h)return;const{hex,uk}=h;
    const bucket=unitMap[uk]||EMPTY_UNIT_BUCKET;const myU=bucket.myUnits;
    const eU=bucket.enemyUnits;const cE=cityMap[hex.id];
    const uSel2=selU&&myU.some(u=>u.id===selU);
    const hasTgt=eU.length>0||(cE&&cE.player.id!==cpId);
    const inMv=selU&&!uSel2&&reach.has(uk)&&eU.length===0&&!(cE&&cE.player.id!==cpId);
    const inMelee=selU&&sud&&sud.def?.range===0&&!sud.hasAttacked&&hexDist(sud.hexCol,sud.hexRow,hex.col,hex.row)<=1&&!uSel2&&hasTgt;
    const inRng=selU&&sud&&sud.def?.range>0&&!sud.hasAttacked&&atkRange.has(uk)&&!uSel2&&hasTgt;
    if(selU&&(inMelee||inRng)){doCombat(selU,hex.col,hex.row);return;}
    if(selU&&inMv){moveU(selU,hex.col,hex.row,moveCostMap[uk]);return;}
    if(selU&&!uSel2){const blk=getMoveBlockReason(hex,sud,sud?.def,reach,atkRange,phase,cpId,players);
      if(blk){setMoveMsg(blk);setFlashes(prev=>({...prev,[uk]:"blocked"}));}}
  },[phase,unitMap,cityMap,cpId,selU,sud,reach,atkRange,moveCostMap,doCombat,moveU,players,animatingUnitId,isPanRef]);

  const onHexCtx=useCallback(e=>{
    e.preventDefault();e.stopPropagation();
    handleHexContextTarget(findHexFromEvent(e));
  },[findHexFromEvent,handleHexContextTarget]);

  const onCanvasMove=useCallback(e=>{
    onMM(e);
    if(isPanRef.current)return;
    scheduleHoveredHex(findHexFromClientPoint(e.clientX,e.clientY));
  },[onMM,isPanRef,scheduleHoveredHex,findHexFromClientPoint]);
  const onCanvasLeave=useCallback(()=>{
    onMU();
    scheduleHoveredHex(null);
  },[onMU,scheduleHoveredHex]);
  const onCanvasClick=useCallback(e=>{
    e.stopPropagation();
    handleHexClickTarget(findHexFromClientPoint(e.clientX,e.clientY));
  },[handleHexClickTarget,findHexFromClientPoint]);
  const onCanvasContext=useCallback(e=>{
    e.preventDefault();
    e.stopPropagation();
    handleHexContextTarget(findHexFromClientPoint(e.clientX,e.clientY));
  },[handleHexContextTarget,findHexFromClientPoint]);

  const boardHexes=useMemo(()=>hexes.map((hex,i)=>{
    const uk=hex.uk;
    const isVisible=fogVisible.has(uk);
    const isExplored2=fogExplored.has(uk);
    const fogged=!isVisible;
    const bucket=unitMap[uk]||EMPTY_UNIT_BUCKET;const uH=bucket.all;const myU=bucket.myUnits;
    const eU=bucket.enemyUnits;const cE=cityMap[hex.id];const isMy=myU.length>0;
    const uSel=selU&&isMy&&myU.some(u=>u.id===selU);
    const hasTgt=eU.length>0||(cE&&cE.player.id!==cpId);
    const inMv=selU&&!uSel&&reach.has(uk)&&phase==="MOVEMENT"&&eU.length===0&&!(cE&&cE.player.id!==cpId);
    const inMelee=selU&&phase==="MOVEMENT"&&sud&&sud.def?.range===0&&!sud.hasAttacked&&hexDist(sud.hexCol,sud.hexRow,hex.col,hex.row)<=1&&!uSel&&hasTgt;
    const inRng=selU&&phase==="MOVEMENT"&&sud&&sud.def?.range>0&&!sud.hasAttacked&&atkRange.has(uk)&&!uSel&&hasTgt;
    const inNk=nukeM&&nukeR.has(uk);
    const canA=phase==="MOVEMENT"&&isMy&&myU.some(u=>actable.has(u.id));
    const ownerP=hex.ownerPlayerId?displayPlayerById[hex.ownerPlayerId]:null;
    const blkReason=hovH===hex.id&&selU&&phase==="MOVEMENT"&&sud&&!uSel&&!fogged?getMoveBlockReason(hex,sud,sud.def,reach,atkRange,phase,cpId,players):null;

    return {
      key: hex.id,
      hex,
      vis: visData[i],
      isHovered: hovH===hex.id,
      isSelected: selH===hex.id,
      inMoveRange: inMv,
      inAttackRange: !!(inMelee||inRng),
      inNukeRange: !!inNk,
      unitSelected: !!uSel,
      units: fogged?null:uH,
      unitCount: fogged?0:uH.length,
      city: fogged?null:(cE?.city||null),
      player: cE?.player||ownerP,
      settlerMode: !!settlerM,
      settlerBlocked: settlerBlocked.has(uk),
      canAct: !!canA,
      flash: flashes[uk]||null,
      isFogged: fogged,
      isExplored: isExplored2,
      blockReason: blkReason,
      discoveredResources,
      reducedEffects: effectivePerformanceMode,
    };
  }),[hexes,hovH,selH,visData,unitMap,cityMap,selU,reach,atkRange,sud,cpId,phase,players,settlerM,settlerBlocked,actable,nukeM,nukeR,flashes,fogVisible,fogExplored,discoveredResources,displayPlayerById,effectivePerformanceMode]);

  const renderAll=useCallback(()=>boardHexes.map(tile=><MemoHex key={tile.key} {...tile}/>),[boardHexes]);

  // City border overlay (rendered above all hexes so no hex can cover borders)
  const borderOverlay=useMemo(()=>{
    const HEX_VERTS=Array.from({length:6},(_,i)=>{const a=(Math.PI/180)*60*i;return{x:HEX_SIZE*Math.cos(a),y:HEX_SIZE*Math.sin(a)};});
    // For each hex edge (0-5), determine which neighbor direction it faces.
    // Edge i goes from vertex at angle i*60° to (i+1)*60°. The edge faces outward
    // at angle (i*60+30)°. We need to find which neighbor sits in that direction.
    // Neighbor order for EVEN: [1,-1]=NE, [1,0]=E, [0,1]=SE, [-1,0]=SW, [-1,-1]=NW, [0,-1]=N
    // Neighbor order for ODD:  [1,0]=NE, [1,1]=E, [0,1]=SE, [-1,1]=SW, [-1,0]=NW, [0,-1]=N
    // Edge directions: edge0=E(30°), edge1=SE(90°), edge2=SW(150°), edge3=W(210°), edge4=NW(270°), edge5=NE(330°)
    // Mapping: edge 0→neighbor E(idx1), edge 1→neighbor SE(idx2), edge 2→neighbor SW(idx3),
    //          edge 3→neighbor NW(idx4), edge 4→neighbor N(idx5), edge 5→neighbor NE(idx0)
    const EDGE_TO_NEIGHBOR = [1, 2, 3, 4, 5, 0];
    const result=[];
    for(const hex of hexes){
      if(!hex.ownerPlayerId)continue;
      const ownerP=hex.ownerPlayerId?playerById[hex.ownerPlayerId]:null;
      if(!ownerP)continue;
      const dc=getDisplayColors(ownerP.id,viewPlayerId,gs);
      const uk=`${hex.col},${hex.row}`;
      // Only show borders for hexes the current player can see (fix fog leak)
      if(!fogVisible.has(uk)&&!fogExplored.has(uk))continue;
      const deltas=hex.col%2===0?EVEN_COL_NEIGHBORS:ODD_COL_NEIGHBORS;
      // For each edge, check the neighbor in the direction that edge faces
      const edges=Array.from({length:6},(_,edgeIdx)=>{
        const ni=EDGE_TO_NEIGHBOR[edgeIdx];
        const [dc,dr]=deltas[ni];
        const nc=hex.col+dc,nr=hex.row+dr;
        if(nc<0||nc>=COLS||nr<0||nr>=ROWS)return true;
        const nh=hexAt(hexes,nc,nr);
        return !nh||nh.ownerPlayerId!==hex.ownerPlayerId;
      });
      if(!edges.some(Boolean))continue;
      // Group consecutive edges into polylines
      const segments=[];let cur=null;
      for(let i=0;i<6;i++){
        if(edges[i]){if(!cur)cur=[HEX_VERTS[i]];cur.push(HEX_VERTS[(i+1)%6]);}
        else{if(cur){segments.push(cur);cur=null;}}
      }
      if(cur){if(segments.length>0&&edges[0]){segments[0]=[...cur,...segments[0].slice(1)];}else{segments.push(cur);}}
      for(let si=0;si<segments.length;si++){
        result.push({key:`${hex.id}-${si}`,x:hex.x,y:hex.y,pts:segments[si],color:dc.color});
      }
    }
    return result;
  },[hexes,playerById,fogVisible,fogExplored,gs?.metPlayers,viewPlayerId]);

  // City banner overlay (rendered above all hexes so banners can extend beyond hex bounds)
  const cityBannerOverlay=useMemo(()=>{
    const result=[];
    for(const p of players){
      const dc=getDisplayColors(p.id,viewPlayerId,gs);
      for(const c of p.cities){
        const h=hexes[c.hexId];if(!h)continue;
        const uk=`${h.col},${h.row}`;
        if(!fogVisible.has(uk)&&!fogExplored.has(uk))continue;
        const fogged=!fogVisible.has(uk);
        if(fogged)continue; // don't show banners for fogged cities
        result.push({key:`cb-${c.id}`,x:h.x,y:h.y,name:c.name,pop:c.population,
          color:dc.color,colorBg:dc.colorBg,
          hp:c.hp,hpMax:c.hpMax||20,
          prod:c.currentProduction,});
      }
    }
    return result;
  },[players,hexes,fogVisible,fogExplored,gs?.metPlayers,viewPlayerId]);

  // Tooltip overlay data (rendered above all hexes)
  const tooltipData=useMemo(()=>{
    if(hovH==null||!selU||phase!=="MOVEMENT"||!sud)return null;
    const hex=hexes[hovH];if(!hex||hex.id!==hovH)return null;
    const uk2=hex.uk;const fogged=!fogVisible.has(uk2);if(fogged)return null;
    const bucket=unitMap[uk2]||EMPTY_UNIT_BUCKET;const myU=bucket.myUnits;
    const uSel=myU.some(u=>u.id===selU);if(uSel)return null;
    const blk=getMoveBlockReason(hex,sud,sud.def,reach,atkRange,phase,cpId,players);
    if(!blk)return null;
    return{x:hex.x,y:hex.y,text:blk};
  },[hovH,selU,phase,sud,hexes,fogVisible,unitMap,cpId,reach,atkRange,players]);

  const boardStats=useMemo(()=>{
    const terrainCounts={grassland:0,forest:0,mountain:0,water:0};
    const ownedByPlayer={};
    players.forEach(p=>{ownedByPlayer[p.id]=0;});
    let landCount=0;
    for(const h of hexes){
      terrainCounts[h.terrainType]=(terrainCounts[h.terrainType]||0)+1;
      if(h.terrainType!=="water")landCount++;
      if(h.ownerPlayerId){
        ownedByPlayer[h.ownerPlayerId]=(ownedByPlayer[h.ownerPlayerId]||0)+1;
      }
    }
    return { terrainCounts, ownedByPlayer, landCount };
  },[hexes,players]);
  const tCounts=boardStats.terrainCounts;
  const landOwned=boardStats.ownedByPlayer;
  const totalLand=boardStats.landCount;

  // === ONLINE MODE: when rendered by OnlineGame with onlineMode prop, skip all menu screens ===
  // Wait for server game state to arrive before rendering the board
  if(onlineMode){
    if(!gs) return <div style={{width:"100vw",height:"100vh",background:"radial-gradient(ellipse at center,#1a2a10 0%,#0a0e06 70%)",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Palatino Linotype',serif"}}><div style={{color:"#6a7a50",fontSize:14,letterSpacing:3}}>Loading game...</div></div>;
    // Fall through to game board rendering below
  } else {
  // === MAP SIZE SELECTION SCREEN ===
  if(!mapSizePick){
    return <MapSizeScreen setMapSizePick={setMapSizePick} setGameMode={onBack ? ()=>onBack() : ()=>{}}/>;
  }

  // === LOBBY SCREEN (configure player slots) ===
  if(mapSizePick&&!lobbyDone){
    return <LobbyScreen mapSizePick={mapSizePick} playerSlots={playerSlots} setPlayerSlots={setPlayerSlots} onStart={()=>{SFX.click();setLobbyDone(true);}} onBack={()=>{setMapSizePick(null);}}/>;
  }

  // === CIV SELECTION SCREEN ===
  if(!gameStarted||!gs){
    return <CivSelectScreen mapSizePick={mapSizePick} playerSlots={playerSlots} civPicks={civPicks} setCivPicks={setCivPicks} civPickStep={civPickStep} setCivPickStep={setCivPickStep} setGs={setGs} setGameStarted={setGameStarted} onBack={()=>{setLobbyDone(false);setCivPickStep(1);}}/>;
  }
  } // end else (non-online routing)

  // Turn transition screen (hotseat: hide board between turns)
  if(turnTransition){
    return <TurnTransitionScreen turnTransition={turnTransition} turnNumber={turnNumber} onReady={() => setTurnTransition(null)}/>;
  }

  // Victory
  if(gs.victoryStatus){if(!victoryPlayed.current){victoryPlayed.current=true;SFX.victory();}
    const onNewGame=()=>{uidCtr=0;setGs(null);setGameStarted(false);setMapSizePick(null);setLobbyDone(false);setPlayerSlots(Array.from({length:MAX_PLAYERS-1},()=>({type:"ai",difficulty:"normal"})));setCivPicks({p1:"Rome"});setSelU(null);setSelH(null);setAiThinking(false);setTutorialOn(true);setTutorialDismissed({});victoryPlayed.current=false;techPosRef.current={x:null,y:95};cityPosRef.current={x:null,y:95};setTechCollapsed(false);setCityCollapsed(false);setCivPickStep(1);setTurnTransition(null);setTurnPopups([]);turnPopupShownRef.current=null;prevCpId.current=null;gameCenteredRef.current=false;if(onBack)onBack();};
    return <VictoryScreen gs={gs} players={players} turnNumber={turnNumber} onNewGame={onNewGame}/>;}

  return(
    <div ref={gameContainerRef} onMouseMove={onPanelMove} onMouseUp={onPanelUp} style={{width:"100vw",height:"100vh",background:"linear-gradient(145deg,#0a0e06 0%,#141e0c 40%,#0e1608 100%)",overflow:"hidden",position:"relative",userSelect:"none",touchAction:"none",fontFamily:"'Palatino Linotype','Book Antiqua',Palatino,serif"}}>

      {/* === MAP LAYER (below UI) === */}
      {activeRenderer==="canvas" ? (
        <CanvasBoardRenderer
          svgRef={svgRef}
          gRef={gRef}
          wW={wW}
          wH={wH}
          onMouseDown={onMD}
          onMouseMove={onCanvasMove}
          onMouseUp={onMU}
          onMouseLeave={onCanvasLeave}
          onClick={onCanvasClick}
          onContextMenu={onCanvasContext}
          onWheel={onWh}
          boardHexes={boardHexes}
          borderOverlay={borderOverlay}
          cityBannerOverlay={cityBannerOverlay}
          overlayRef={overlayRef}
          animVisuals={animVisuals}
          animatingUnitId={animatingUnitId}
          combatAnims={combatAnims}
          tooltipData={tooltipData}
        />
      ) : (
      <svg ref={svgRef} onMouseDown={onMD} onMouseMove={onMM} onMouseUp={onMU} onMouseLeave={onMU} onWheel={onWh} onContextMenu={e=>e.preventDefault()} style={{cursor:"grab",position:"absolute",top:0,left:0,width:"100%",height:"100%",zIndex:1}}>
        <defs>
          <style>{`
            @keyframes unitPulse { 0%,100%{opacity:.4;} 50%{opacity:.8;} }
            @keyframes unitBob { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-2px)} }
            .unit-glow { animation: unitPulse 2s ease-in-out infinite; }
            .unit-bob { animation: unitBob 2.5s ease-in-out infinite; }
            @keyframes waveDrift1 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(3px,1.5px)} }
            @keyframes waveDrift2 { 0%,100%{transform:translate(2px,4px)} 50%{transform:translate(-1px,6px)} }
            @keyframes waveDrift3 { 0%,100%{transform:translate(-1px,8px)} 50%{transform:translate(2px,9.5px)} }
            @keyframes foamPulse { 0%,100%{opacity:.3} 50%{opacity:.15} }
            @keyframes shimmerFlicker { 0%,100%{opacity:.4} 30%{opacity:.15} 60%{opacity:.5} }
            .wave-layer1 { animation: waveDrift1 6s ease-in-out infinite; }
            .wave-layer2 { animation: waveDrift2 8s ease-in-out infinite; }
            .wave-layer3 { animation: waveDrift3 7s ease-in-out infinite; }
            .wave-foam { animation: foamPulse 5s ease-in-out infinite; }
            .wave-shimmer { animation: shimmerFlicker 4s ease-in-out infinite; }
            @keyframes coastWash1 { 0%,100%{transform:translate(0,0);opacity:.4} 50%{transform:scale(0.95);opacity:.55} }
            @keyframes coastWash2 { 0%,100%{transform:translate(0,0);opacity:.35} 50%{transform:scale(0.92);opacity:.5} }
            @keyframes coastWash3 { 0%,100%{transform:translate(0,0);opacity:.3} 50%{transform:scale(0.88);opacity:.45} }
            .coast-wash1 { animation: coastWash1 4s ease-in-out infinite; }
            .coast-wash2 { animation: coastWash2 4s ease-in-out infinite; animation-delay: -1.3s; }
            .coast-wash3 { animation: coastWash3 4s ease-in-out infinite; animation-delay: -2.6s; }
            @keyframes cloudDrift { 0%,100%{transform:translate(0,0)} 50%{transform:translate(2px,1px)} }
            .fog-cloud { animation: cloudDrift 8s ease-in-out infinite; }
          `}</style>
          <clipPath id="hexClip"><polygon points={HEX_POINTS}/></clipPath>
          <radialGradient id="gradGrass" cx="40%" cy="35%" r="70%"><stop offset="0%" stopColor="#5a9a2a"/><stop offset="30%" stopColor="#4e8826"/><stop offset="60%" stopColor="#437520"/><stop offset="100%" stopColor="#2a5014"/></radialGradient>
          <radialGradient id="varGrass" cx="60%" cy="55%" r="55%"><stop offset="0%" stopColor="#2a4a10"/><stop offset="100%" stopColor="#3a6a1a" stopOpacity="0"/></radialGradient>
          <radialGradient id="gradForest" cx="40%" cy="35%" r="70%"><stop offset="0%" stopColor="#306828"/><stop offset="30%" stopColor="#265a1e"/><stop offset="60%" stopColor="#1e4a16"/><stop offset="100%" stopColor="#12380c"/></radialGradient>
          <radialGradient id="gradMountain" cx="40%" cy="30%" r="70%"><stop offset="0%" stopColor="#6a6555"/><stop offset="30%" stopColor="#5a5545"/><stop offset="60%" stopColor="#4a4538"/><stop offset="100%" stopColor="#35302a"/></radialGradient>
          <radialGradient id="gradWater" cx="40%" cy="35%" r="70%"><stop offset="0%" stopColor="#3578aa"/><stop offset="30%" stopColor="#2a6a9a"/><stop offset="60%" stopColor="#1e5580"/><stop offset="100%" stopColor="#0e3050"/></radialGradient>
        </defs>
        <g ref={gRef} style={{willChange:"transform"}} onMouseMove={onHexHover} onMouseLeave={onHexLeave} onClick={onHexClick} onContextMenu={onHexCtx}>{renderAll()}
          {/* Territory border overlay — rendered after all hexes so borders are never covered */}
          {borderOverlay.map(b=><g key={b.key} transform={`translate(${b.x},${b.y})`} style={{pointerEvents:"none"}}><polyline points={b.pts.map(p=>`${p.x},${p.y}`).join(" ")} fill="none" stroke="#000" strokeWidth={6} strokeLinejoin="round" strokeLinecap="round" opacity={0.3}/><polyline points={b.pts.map(p=>`${p.x},${p.y}`).join(" ")} fill="none" stroke={b.color} strokeWidth={3.5} strokeLinejoin="round" strokeLinecap="round" opacity={0.9}/></g>)}
          {/* City banner overlay — rendered above all hexes so banners can extend across hex boundaries */}
          {cityBannerOverlay.map(cb=><g key={cb.key} transform={`translate(${cb.x},${cb.y+30})`} style={{pointerEvents:"none"}}>
            <rect x={-35} y={-8} width={70} height={15} rx={3} fill={cb.colorBg} stroke={cb.color} strokeWidth="1"/>
            <text x={-3} y={.5} textAnchor="middle" dominantBaseline="middle" fill="#ffd740" fontSize={8} fontWeight="bold" fontFamily="'Palatino Linotype',serif" style={{letterSpacing:.5}}>{cb.name}</text>
            <circle cx={27} cy={.5} r={7} fill={cb.color} opacity=".8"/>
            <text x={27} y={1} textAnchor="middle" dominantBaseline="middle" fill="#fff" fontSize={7} fontWeight="bold">{cb.pop}</text>
            <rect x={-20} y={10} width={40} height={4} rx={1.5} fill="#333" opacity=".7"/><rect x={-20} y={10} width={40*(cb.hp/cb.hpMax)} height={4} rx={1.5} fill={cb.hp>cb.hpMax*.5?"#4a4":"#c44"} opacity=".9"/>
            {cb.prod&&<text x={0} y={-26} textAnchor="middle" fill="#ffd740" fontSize={8}>⚙ {cb.prod.type==="unit"?UNIT_DEFS[cb.prod.itemId]?.name:DISTRICT_DEFS[cb.prod.itemId]?.name}</text>}
          </g>)}
          <UnitAnimationOverlay ref={overlayRef} unitType={animVisuals?.unitType} playerColors={animVisuals||{}} visible={!!animatingUnitId}/>
          {combatAnims.map(a=><g key={a.id} transform={`translate(${a.x},${a.y})`} style={{pointerEvents:"none"}}>
            <text x={0} y={-20} textAnchor="middle" fill={a.color} fontSize={18} fontWeight="bold" fontFamily="'Palatino Linotype',serif" stroke="#000" strokeWidth="2" paintOrder="stroke">
              -{a.dmg}<animate attributeName="y" from="-20" to="-65" dur="1.1s" fill="freeze"/><animate attributeName="opacity" from="1" to="0" dur="1.1s" fill="freeze"/>
            </text>
          </g>)}
          {tooltipData&&<g transform={`translate(${tooltipData.x},${tooltipData.y-52})`} style={{pointerEvents:"none"}}>
            <rect x={-tooltipData.text.length*3.2} y={-10} width={tooltipData.text.length*6.4} height={18} rx={5} fill="rgba(50,15,5,.95)" stroke="rgba(240,100,60,.7)" strokeWidth="1"/>
            <text x={0} y={3} textAnchor="middle" dominantBaseline="middle" fill="#ffb090" fontSize={9} fontWeight="bold" fontFamily="'Palatino Linotype',serif" style={{pointerEvents:"none"}}>{tooltipData.text}</text>
          </g>}
        </g>
      </svg>)}

      {/* === UI OVERLAY (above map, fixed to viewport so browser zoom can't push it off-screen) === */}
      <div ref={uiOverlayRef} style={{position:"fixed",top:0,left:0,width:"100vw",height:"100vh",zIndex:10,pointerEvents:"none"}}>

      {/* Title */}
      <div style={{position:"absolute",top:0,left:0,right:0,height:50,background:"linear-gradient(180deg,rgba(10,14,6,.95) 0%,rgba(10,14,6,0) 100%)",zIndex:10,display:"flex",alignItems:"flex-start",justifyContent:"center",paddingTop:8,pointerEvents:"none"}}>
        <div style={{textAlign:"center"}}><h1 style={{color:"#dce8c0",fontSize:20,fontWeight:600,letterSpacing:6,textTransform:"uppercase",margin:0}}>Empires of Earth</h1>
          <div style={{color:"#98aa78",fontSize:10,letterSpacing:3,marginTop:2}}>Turn {turnNumber} · {cp.name}</div></div></div>

      {/* End Turn button */}
      <div style={{position:"absolute",top:48,left:"50%",transform:"translateX(-50%)",zIndex:10,display:"flex",gap:6,alignItems:"center",background:"rgba(10,14,6,.85)",borderRadius:6,padding:"3px 8px",border:"1px solid rgba(100,140,50,.3)",pointerEvents:"auto"}}>
        <button onClick={endTurn} style={{...btnStyle(true),marginBottom:0,marginRight:0,fontSize:14,fontWeight:600,padding:"8px 24px",letterSpacing:1.5}}>End Turn →</button>
      </div>

      {/* Player panel */}
      <PlayerPanel cp={cp} hexes={hexes} landOwned={landOwned} totalLand={totalLand} barbarians={barbarians}/>

      {/* Action bar */}
      <ActionBar showTech={showTech} setShowTech={setShowTech} showDiplomacy={showDiplomacy} setShowDiplomacy={setShowDiplomacy} showSaveLoad={showSaveLoad} setShowSaveLoad={setShowSaveLoad} tutorialOn={tutorialOn} setTutorialOn={setTutorialOn} setTutorialDismissed={setTutorialDismissed} performanceMode={effectivePerformanceMode} setPerformanceMode={value=>{setPerformanceModeTouched(true);setPerformanceMode(value);}} rendererMode={rendererMode} setRendererMode={setRendererMode} sud={sud} selU={selU} settlerM={settlerM} setSettlerM={setSettlerM} nukeM={nukeM} setNukeM={setNukeM} upgradeUnit={upgradeUnit} cp={cp} actable={actable}/>

      {/* Save/Load modal */}
      {showSaveLoad && <div style={{ position: "absolute", inset: 0, zIndex: 40, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(5,8,3,.5)", pointerEvents: "all" }} onClick={e => { if (e.target === e.currentTarget) setShowSaveLoad(false); }}>
        <div style={{ ...panelStyle, width: 360, maxHeight: 420, display: "flex", flexDirection: "column", zIndex: 41 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ color: "#dce8c0", fontSize: 16, fontWeight: 600, letterSpacing: 2 }}>Save / Load Game</span>
            <span style={{ cursor: "pointer", color: "#8a9a70", fontSize: 16 }} onClick={() => setShowSaveLoad(false)}>✕</span>
          </div>
          <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
            <input value={saveName} onChange={e => setSaveName(e.target.value)} placeholder={`Turn ${turnNumber} - ${cp.name}`} style={{ flex: 1, background: "rgba(20,28,12,.9)", border: "1px solid rgba(100,140,50,.4)", borderRadius: 4, padding: "6px 10px", color: "#c8dca8", fontSize: 12, fontFamily: "inherit", outline: "none" }}/>
            <button onClick={() => {
              const saves = JSON.parse(localStorage.getItem("eoe_saves") || "[]");
              const name = saveName.trim() || `Turn ${turnNumber} - ${cp.name}`;
              saves.unshift({ id: Date.now(), name, date: new Date().toLocaleString(), data: JSON.stringify(gs) });
              localStorage.setItem("eoe_saves", JSON.stringify(saves.slice(0, 20)));
              setSaveName("");
              setShowSaveLoad(false);
            }} style={{ ...btnStyle(true), marginBottom: 0, marginRight: 0 }}>💾 Save</button>
          </div>
          <div style={{ color: "#8a9a70", fontSize: 10, letterSpacing: 2, textTransform: "uppercase", marginBottom: 4 }}>Saved Games</div>
          <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
            {(() => { const saves = JSON.parse(localStorage.getItem("eoe_saves") || "[]"); return saves.length === 0 ? <div style={{ color: "#5a6a4a", fontSize: 10, textAlign: "center", padding: 20 }}>No saves yet</div> : saves.map(s => <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(20,28,12,.6)", borderRadius: 4, padding: "6px 8px", border: "1px solid rgba(100,140,50,.15)" }}>
              <div style={{ flex: 1 }}>
                <div style={{ color: "#c8dca8", fontSize: 11 }}>{s.name}</div>
                <div style={{ color: "#6a7a50", fontSize: 8 }}>{s.date}</div>
              </div>
              <button onClick={() => { setGs(JSON.parse(s.data)); setShowSaveLoad(false); turnPopupShownRef.current = null; }} style={{ ...btnStyle(false), marginBottom: 0, marginRight: 0, fontSize: 9, padding: "3px 8px" }}>Load</button>
              <button onClick={() => { const saves2 = JSON.parse(localStorage.getItem("eoe_saves") || "[]").filter(s2 => s2.id !== s.id); localStorage.setItem("eoe_saves", JSON.stringify(saves2)); setShowSaveLoad(false); setTimeout(() => setShowSaveLoad(true), 0); }} style={{ ...btnStyle(false), marginBottom: 0, marginRight: 0, fontSize: 9, padding: "3px 8px", color: "#e07070" }}>✕</button>
            </div>); })()}
          </div>
        </div>
      </div>}

      {/* Combat preview */}
      <CombatPreview preview={preview}/>

      {/* Tech tree */}
      {showTech&&<TechTreePanel cp={cp} techPosRef={techPosRef} techCollapsed={techCollapsed} setTechCollapsed={setTechCollapsed} setShowTech={setShowTech} onPanelDown={onPanelDown} selResearch={selResearch}/>}

      {/* Diplomacy panel */}
      {showDiplomacy&&<DiplomacyPanel currentPlayer={players.find(p=>p.id===cpId)} knownPlayers={knownPlayers} relations={diplomacyRelations} tradePactBlockReasons={tradePactBlockReasons} pendingIncoming={pendingIncoming} pendingOutgoing={pendingOutgoing} onClose={()=>setShowDiplomacy(false)} onOpenLeader={(pid)=>openLeaderScene(pid,"diplomacy")} onDeclareWar={declareWarAction} onPropose={proposeDiplomacyAction} onAccept={acceptProposalAction} onReject={rejectProposalAction}/>}

      {/* City panel */}
      {showCity&&(()=>{const city=cp.cities.find(c=>c.id===showCity);if(!city)return null;
        return <CityPanel city={city} cp={cp} hexes={hexes} cityPosRef={cityPosRef} cityCollapsed={cityCollapsed} setCityCollapsed={setCityCollapsed} setShowCity={setShowCity} onPanelDown={onPanelDown} setProd={setProd} cancelProduction={cancelProduction} toggleTile={toggleTile} maximizeTiles={maximizeTiles} setTradeFocus={setTradeFocus} allCities={cp.cities} discoveredResources={discoveredResources}/>;})()}

      {/* Legend */}
      <Legend tCounts={tCounts}/>

      {/* Log */}
      <LogPanel log={log} currentPlayerId={viewPlayerId} currentPlayerTechs={cp.researchedTechs} gs={gs}/>

      {/* Bottom info */}
      <BottomInfo selH={selH} hexes={hexes} unitMap={unitMap} players={players} settlerM={settlerM} setSettlerM={setSettlerM} nukeM={nukeM} setNukeM={setNukeM} moveMsg={moveMsg} buildRoad={buildRoad} cp={cp} gs={gs} viewPlayerId={viewPlayerId}/>

      {/* AI thinking overlay */}
      {aiThinking&&<div style={{position:"absolute",inset:0,zIndex:40,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(5,8,3,.6)",pointerEvents:"all"}}><div style={{background:"rgba(15,20,10,.95)",border:"2px solid rgba(100,140,50,.5)",borderRadius:12,padding:"24px 40px",textAlign:"center",boxShadow:"0 0 40px rgba(80,120,40,.2)"}}><div style={{fontSize:28,marginBottom:8,animation:"pulse 1.5s ease-in-out infinite"}}>🤖</div><div style={{color:"#c8d8a0",fontSize:16,fontWeight:600,letterSpacing:3}}>AI is thinking...</div><div style={{color:"#8a9a70",fontSize:12,marginTop:6}}>The AI plots its next move</div></div></div>}

      {/* Online mode: Opponent's Turn overlay */}
      {onlineMode&&!onlineMode.isMyTurn&&!gs?.victoryStatus&&<div style={{position:"absolute",inset:0,zIndex:35,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(5,8,3,.4)",pointerEvents:"all"}}><div style={{background:"rgba(15,20,10,.95)",border:"2px solid rgba(100,140,50,.5)",borderRadius:12,padding:"24px 40px",textAlign:"center",boxShadow:"0 0 40px rgba(80,120,40,.2)"}}><div style={{fontSize:28,marginBottom:8}}>{"\u{1F551}"}</div><div style={{color:"#c8d8a0",fontSize:16,fontWeight:600,letterSpacing:3}}>Opponent's Turn</div><div style={{color:"#8a9a70",fontSize:12,marginTop:6}}>Waiting for your opponent to play...</div></div></div>}

      {/* Online mode: Disconnect warning */}
      {onlineMode?.opponentDisconnected&&<div style={{position:"absolute",top:80,left:"50%",transform:"translateX(-50%)",zIndex:50,background:"rgba(120,40,20,.95)",border:"1px solid rgba(200,80,40,.6)",borderRadius:8,padding:"8px 20px",pointerEvents:"auto"}}><div style={{color:"#ffb090",fontSize:12,fontWeight:600,letterSpacing:1}}>Opponent Disconnected</div><div style={{color:"#ff9070",fontSize:9,marginTop:2}}>They may reconnect...</div></div>}

      {/* Online mode: Error banner */}
      {onlineMode?.error&&<div style={{position:"absolute",top:onlineMode.opponentDisconnected?130:80,left:"50%",transform:"translateX(-50%)",zIndex:50,background:"rgba(120,20,20,.95)",border:"1px solid rgba(200,40,40,.6)",borderRadius:8,padding:"6px 16px",pointerEvents:"auto"}}><div style={{color:"#ff6060",fontSize:11}}>{onlineMode.error}</div></div>}

      {/* Random event popup */}
      <EventPopup event={eventPopup} onDismiss={() => setEventPopup(null)}/>

      {/* Leader meeting / diplomacy scene */}
      <LeaderMeetingScreen scene={leaderScene} onClose={() => setLeaderScene(null)} onDeclareWar={() => leaderScene && declareWarAction(leaderScene.playerId)} onOpenDiplomacy={() => { setLeaderScene(null); setShowDiplomacy(true); }}/>

      {/* Turn-start popup queue */}
      <NotificationCircles turnPopups={turnPopups} setTurnPopups={setTurnPopups} setShowTech={setShowTech} setShowCity={setShowCity}/>

      {/* Tutorial tip cards */}
      <TutorialTips gs={gs} sud={sud} op={op} aiThinking={aiThinking} tutorialOn={tutorialOn} tutorialDismissed={tutorialDismissed} setTutorialDismissed={setTutorialDismissed} setTutorialOn={setTutorialOn}/>

      {/* Minimap */}
      {minimapVisible && <MinimapDisplay minimapRef={minimapRef} MINIMAP_W={MINIMAP_W} MINIMAP_H={MINIMAP_H} onMinimapDown={onMinimapDown} onMinimapMove={onMinimapMove} onMinimapUp={onMinimapUp}/>}

      </div>{/* close UI overlay */}
    </div>
  );
}

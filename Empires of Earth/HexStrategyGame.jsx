// ============================================================
// MAIN COMPONENT — Game orchestrator
// ============================================================

import React, { useState, useMemo, useRef, useCallback, useEffect } from "react";

// Data
import { HEX_SIZE, SQRT3, COLS, ROWS, HEX_POINTS, hexCenter, hexAt, getNeighbors, hexDist, getHexesInRadius, MAP_SIZES, setMapConfig, gameRng, FOG_SIGHT } from './data/constants.js';
import { TERRAIN_INFO, RESOURCE_INFO } from './data/terrain.js';
import { TECH_TREE, ERAS, ERA_COLORS } from './data/techs.js';
import { UNIT_DEFS } from './data/units.js';
import { CIV_DEFS } from './data/civs.js';
import { DISTRICT_DEFS } from './data/districts.js';
import { TUTORIAL_TIPS } from './data/tutorial.js';

// Engine
import { calcCombatPreview } from './engine/combat.js';
import { calcCityYields, calcPlayerIncome, getAvailableTechs, getAvailableUnits, getUpgradeCost, canUpgradeUnit, getAvailableDistricts } from './engine/economy.js';
import { getMoveCost, getMoveBlockReason, getReachableHexes, getRangedTargets, getVisibleHexes } from './engine/movement.js';
import { processResearchAndIncome, processCityTurn, expandTerritory, healGarrison, refreshUnits, spawnBarbarians, processBarbarians, rollRandomEvent, addLogMsg } from './engine/turnProcessing.js';
import { checkVictoryState } from './engine/victory.js';
import { createInitialState } from './engine/gameInit.js';

// AI
import { aiExecuteTurn } from './ai/aiEngine.js';

// Sound
import { SFX } from './sfx.js';

// Visuals
import { genGrass, genTrees, genMtns, genWaves, genDetail, genCoast, genWaterCoast } from './components/ProceduralVisuals.js';

// Components
import { ResourceIcon, UnitIcon } from './components/Icons.jsx';
import MemoHex from './components/MemoHex.jsx';
import { ModeSelectScreen, MapSizeScreen, CivSelectScreen, TurnTransitionScreen, VictoryScreen } from './components/GameScreens.jsx';

// Hooks
import { useCamera, MINIMAP_W, MINIMAP_H } from './hooks/useCamera.js';
import { useGameActions } from './hooks/useGameActions.js';

// Styles
import { btnStyle, panelStyle } from './styles.js';

// ============================================================

export default function HexStrategyGame() {
  const [gameMode, setGameMode] = useState(null); // null | "local" | "ai"
  const [mapSizePick, setMapSizePick] = useState(null); // null | "small" | "medium" | "large"
  const [civPick, setCivPick] = useState({ p1: "Rome", p2: "China" });
  const [civPickStep, setCivPickStep] = useState(1); // 1 = P1 picking, 2 = P2 picking
  const [gameStarted, setGameStarted] = useState(false);
  const [gs, setGs] = useState(null);
  const [hovH, setHovH] = useState(null);
  const [selH, setSelH] = useState(null);
  const [selU, setSelU] = useState(null);
  const [showTech, setShowTech] = useState(false);
  const [showCity, setShowCity] = useState(null);
  const [settlerM, setSettlerM] = useState(null);
  const [nukeM, setNukeM] = useState(null);
  const [preview, setPreview] = useState(null);
  const [flashes, setFlashes] = useState({});
  const [combatAnims, setCombatAnims] = useState([]); // [{id,x,y,dmg,color,t}]
  const [moveMsg, setMoveMsg] = useState(null);
  const [aiThinking, setAiThinking] = useState(false);
  const [turnTransition, setTurnTransition] = useState(null);
  const [tutorialOn, setTutorialOn] = useState(true);
  const [tutorialDismissed, setTutorialDismissed] = useState({});
  const [techCollapsed, setTechCollapsed] = useState(false);
  const [cityCollapsed, setCityCollapsed] = useState(false);
  const [turnPopups, setTurnPopups] = useState([]);
  const [showSaveLoad, setShowSaveLoad] = useState(false);
  const [saveName, setSaveName] = useState("");
  const turnPopupShownRef = useRef(null);
  const [, forceRender] = useState(0);
  const victoryPlayed = useRef(false);
  const prevCpId = useRef(null);

  // Derived state (safe when gs is null)
  const hexes = gs?.hexes || [];
  const players = gs?.players || [];
  const turnNumber = gs?.turnNumber || 1;
  const cpId = gs?.currentPlayerId || "p1";
  const phase = gs?.phase || "MOVEMENT";
  const log = gs?.log || [];
  const barbarians = gs?.barbarians || [];
  const cp = players.find(p => p.id === cpId) || { units: [], cities: [], researchedTechs: [], civilization: "Rome", name: "", color: "#888", colorBg: "#444", colorLight: "#aaa", gold: 0, science: 0 };
  const op = players.find(p => p.id !== cpId);
  const inc = useMemo(() => gs ? calcPlayerIncome(cp, hexes) : { food: 0, production: 0, science: 0, gold: 0 }, [cp, hexes, gs]);

  const visData = useMemo(() => hexes.map(h => {
    const grass = genGrass(h.id);
    return {
      blades: grass.blades, flowers: grass.flowers, rocks: grass.rocks,
      detail: genDetail(h.id),
      trees: h.terrainType === "forest" ? genTrees(h.id) : { trunks: "", canopy: "", undergrowth: "" },
      mtns: h.terrainType === "mountain" ? genMtns(h.id) : { peaks: "", snow: "", shadow: "", rocks: "" },
      waves: h.terrainType === "water" ? genWaves(h.id) : { waves: "", foam: "", shimmer: "" },
      coast: genCoast(h, hexes),
      waterCoast: genWaterCoast(h, hexes),
    };
  }), [hexes]);

  const cityMap = useMemo(() => {
    const m = {};
    players.forEach(p => p.cities.forEach(c => { m[c.hexId] = { city: c, player: p }; }));
    return m;
  }, [players]);

  const unitMap = useMemo(() => {
    const m = {};
    players.forEach(p => p.units.forEach(u => {
      const k = `${u.hexCol},${u.hexRow}`;
      if (!m[k]) m[k] = [];
      m[k].push({ ...u, pid: p.id, pCol: p.color, pBg: p.colorBg, pLight: p.colorLight });
    }));
    barbarians.forEach(b => {
      const k = `${b.hexCol},${b.hexRow}`;
      if (!m[k]) m[k] = [];
      m[k].push({ ...b, pid: "barb", pCol: "#c05050", pBg: "#4a1010", pLight: "#ff8080" });
    });
    return m;
  }, [players, barbarians]);

  const fogVisible = useMemo(() => gs ? getVisibleHexes(cp, hexes) : new Set(), [cp, hexes, gs]);
  const fogExplored = useMemo(() => {
    if (!gs) return new Set();
    return new Set(gs.explored?.[cpId] || []);
  }, [gs, cpId]);

  const sud = useMemo(() => {
    if (!selU || !gs) return null;
    const u = cp.units.find(u2 => u2.id === selU);
    if (!u) return null;
    return { ...u, def: UNIT_DEFS[u.unitType] };
  }, [selU, cp, gs]);

  const reach = useMemo(() => {
    if (!sud || phase !== "MOVEMENT" || sud.movementCurrent <= 0) return new Set();
    return getReachableHexes(sud.hexCol, sud.hexRow, sud.movementCurrent, hexes, sud.def?.domain || "land", cpId, players, sud.def?.ability);
  }, [sud, hexes, phase, cpId, players]);

  const atkRange = useMemo(() => {
    if (!sud || phase !== "MOVEMENT" || !sud.def?.range || sud.hasAttacked) return new Set();
    return getRangedTargets(sud.hexCol, sud.hexRow, sud.def.range);
  }, [sud, phase]);

  const nukeR = useMemo(() => {
    if (!nukeM) return new Set();
    const nu = cp.units.find(u => u.id === nukeM);
    if (!nu) return new Set();
    return getRangedTargets(nu.hexCol, nu.hexRow, 3);
  }, [nukeM, cp]);

  const actable = useMemo(() => {
    if (phase !== "MOVEMENT") return new Set();
    return new Set(cp.units.filter(u => u.movementCurrent > 0 || (!u.hasAttacked && (UNIT_DEFS[u.unitType]?.range || 0) > 0)).map(u => u.id));
  }, [cp, phase]);

  // === CAMERA HOOK ===
  const {
    svgRef, gRef, gameContainerRef, uiOverlayRef, minimapRef, isPanRef, panRef,
    wW, wH,
    sched, onMD, onMM, onMU, onWh,
    onMinimapDown, onMinimapMove, onMinimapUp,
  } = useCamera({ hexes, gs, players, fogVisible, fogExplored, cpId });

  // Panel drag refs
  const techPosRef = useRef({ x: null, y: 95 }), cityPosRef = useRef({ x: null, y: 95 });
  const draggingPanelRef = useRef(null), dragOffsetRef = useRef({ x: 0, y: 0 });

  useEffect(() => { if (Object.keys(flashes).length > 0) { const t = setTimeout(() => setFlashes({}), 800); return () => clearTimeout(t); } }, [flashes]);
  useEffect(() => { if (combatAnims.length > 0) { const t = setTimeout(() => setCombatAnims([]), 1200); return () => clearTimeout(t); } }, [combatAnims]);
  useEffect(() => { if (moveMsg) { const t = setTimeout(() => setMoveMsg(null), 1500); return () => clearTimeout(t); } }, [moveMsg]);

  // Update explored set when fog visibility changes
  useEffect(() => {
    if (!gs || fogVisible.size === 0) return;
    setGs(prev => {
      if (!prev) return prev;
      const ex = prev.explored || {};
      const cur = ex[cpId] || [];
      const s = new Set(cur);
      let changed = false;
      for (const k of fogVisible) { if (!s.has(k)) { s.add(k); changed = true; } }
      if (!changed) return prev;
      return { ...prev, explored: { ...ex, [cpId]: [...s] } };
    });
  }, [fogVisible, cpId]);

  // Panel drag handlers
  const onPanelDown = useCallback((e, panel) => {
    if (e.target.closest("button")) return;
    e.stopPropagation(); e.preventDefault();
    draggingPanelRef.current = panel;
    const el = e.currentTarget.closest("[data-panel]"); if (!el) return;
    const r = el.getBoundingClientRect();
    dragOffsetRef.current = { x: e.clientX - r.left, y: e.clientY - r.top };
  }, []);

  const onPanelMove = useCallback(e => {
    if (!draggingPanelRef.current) return;
    const ref = draggingPanelRef.current === "tech" ? techPosRef : cityPosRef;
    ref.current = { x: Math.max(0, e.clientX - dragOffsetRef.current.x), y: Math.max(0, e.clientY - dragOffsetRef.current.y) };
    forceRender(c => c + 1);
  }, []);

  const onPanelUp = useCallback(() => { draggingPanelRef.current = null; }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const h = e => {
      let m = false;
      if (e.key === "ArrowUp") { e.preventDefault(); panRef.current.y += 60; m = true; }
      if (e.key === "ArrowDown") { e.preventDefault(); panRef.current.y -= 60; m = true; }
      if (e.key === "ArrowLeft") { e.preventDefault(); panRef.current.x += 60; m = true; }
      if (e.key === "ArrowRight") { e.preventDefault(); panRef.current.x -= 60; m = true; }
      if (e.key === "Tab" && phase === "MOVEMENT") {
        e.preventDefault();
        const acts = cp.units.filter(u => u.movementCurrent > 0 || (!u.hasAttacked && (UNIT_DEFS[u.unitType]?.range || 0) > 0));
        if (acts.length > 0) { const ci = selU ? acts.findIndex(u => u.id === selU) : -1; setSelU(acts[(ci + 1) % acts.length].id); setSelH(null); }
        m = true;
      }
      if (e.key === "Escape") { setSelU(null); setSettlerM(null); setNukeM(null); setPreview(null); m = true; }
      if (m) sched();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [sched, phase, cp, selU]);

  // === GAME ACTIONS HOOK ===
  const { launchNuke, doCombat, endTurn, selResearch, upgradeUnit, setProd, moveU, foundCity } = useGameActions({
    setGs, setSelU, setSelH, setSettlerM, setNukeM, setPreview, setFlashes, setCombatAnims, turnPopupShownRef,
  });

  // --- AI auto-play ---
  useEffect(() => {
    if (gameMode !== "ai" || !gs || gs.victoryStatus) return;
    if (gs.currentPlayerId !== "p2") return;
    setAiThinking(true);
    const timer = setTimeout(() => {
      setGs(prev => {
        if (!prev || prev.currentPlayerId !== "p2") return prev;
        const afterAi = aiExecuteTurn(prev);
        afterAi.currentPlayerId = "p1";
        afterAi.turnNumber++;
        spawnBarbarians(afterAi); processBarbarians(afterAi); rollRandomEvent(afterAi);
        afterAi.phase = "MOVEMENT";
        const p1 = afterAi.players.find(p => p.id === "p1");
        refreshUnits(p1, afterAi);
        addLogMsg(`Turn ${afterAi.turnNumber} \u2014 ${p1.name}`, afterAi);
        checkVictoryState(afterAi);
        const aiP = afterAi.players.find(p => p.id === "p2");
        const aiVis = getVisibleHexes(aiP, afterAi.hexes);
        const aiEx = new Set(afterAi.explored?.["p2"] || []);
        for (const k of aiVis) aiEx.add(k);
        afterAi.explored = { ...afterAi.explored, "p2": [...aiEx] };
        return afterAi;
      });
      setAiThinking(false);
      turnPopupShownRef.current = null;
    }, 800);
    return () => clearTimeout(timer);
  }, [gs?.currentPlayerId, gs?.turnNumber, gameMode, gs?.victoryStatus]);

  // --- Turn transition screen for local hotseat ---
  useEffect(() => {
    if (!gs || gameMode !== "local") { prevCpId.current = gs?.currentPlayerId || null; return; }
    if ((!prevCpId.current || prevCpId.current !== gs.currentPlayerId) && !gs.victoryStatus) {
      const nextP = gs.players.find(p => p.id === gs.currentPlayerId);
      if (nextP) setTurnTransition({ playerName: nextP.name, playerColor: nextP.color, playerColorLight: nextP.colorLight });
    }
    prevCpId.current = gs.currentPlayerId;
  }, [gs?.currentPlayerId, gameMode, gs?.victoryStatus, gs?.players]);

  // --- Turn-start popups ---
  useEffect(() => {
    if (!gs || gs.victoryStatus) return;
    const key = `${gs.turnNumber}-${gs.currentPlayerId}`;
    if (turnPopupShownRef.current === key) return;
    if (turnTransition) return;
    if (gameMode === "ai" && gs.currentPlayerId === "p2") return;
    turnPopupShownRef.current = key;
    const popups = []; let pid = 0;
    const cp2 = gs.players.find(p => p.id === gs.currentPlayerId);
    if (!cp2) return;
    if (gs.eventMsg) { popups.push({ id: pid++, type: "event", title: `\u{1F3B2} ${gs.eventMsg.name}`, body: gs.eventMsg.desc }); }
    if (!cp2.currentResearch) { popups.push({ id: pid++, type: "tech", title: "\u{1F52C} Choose Research", body: "No technology is being researched. Open the tech tree to pick one!", action: "tech" }); }
    for (const city of cp2.cities) {
      if (!city.currentProduction) { popups.push({ id: pid++, type: "city", title: `\u{1F3DB} ${city.name} \u2014 Idle`, body: `${city.name} has no production queue. Click it to choose what to build!`, action: "city", cityId: city.id }); }
    }
    if (popups.length > 0) setTurnPopups(popups);
  }, [gs?.turnNumber, gs?.currentPlayerId, gs?.victoryStatus, turnTransition, gameMode]);

  // === HEX EVENT DELEGATION ===
  const findHexFromEvent = useCallback(e => {
    const el = e.target.closest("[data-hex]"); if (!el) return null;
    const id = +el.dataset.hex, col = +el.dataset.col, row = +el.dataset.row;
    return { id, col, row, hex: hexes[id], uk: `${col},${row}` };
  }, [hexes]);

  const onHexHover = useCallback(e => {
    const h = findHexFromEvent(e); if (!h || isPanRef.current) return;
    const { hex, uk } = h;
    const fogged = !fogVisible.has(uk);
    if (fogged) { if (hovH != null) { setHovH(null); setPreview(null); } return; }
    if (hovH !== hex.id) setHovH(hex.id);
    if (selU && phase === "MOVEMENT" && sud) {
      const uH = unitMap[uk] || []; const eU = uH.filter(u => u.pid !== cpId); const cE = cityMap[hex.id];
      const hasTgt = eU.length > 0 || (cE && cE.player.id !== cpId);
      const inMelee2 = sud.def?.range === 0 && !sud.hasAttacked && reach.has(uk) && hasTgt;
      const inRng2 = sud.def?.range > 0 && !sud.hasAttacked && atkRange.has(uk) && hasTgt;
      if ((inMelee2 || inRng2) && eU.length > 0) {
        const eu = eU[0];
        const dP = eu.pid === "barb" ? { researchedTechs: [], civilization: "Barbarian" } : players.find(p => p.id === eu.pid);
        const pv = calcCombatPreview(sud, sud.def, eu, UNIT_DEFS[eu.unitType], hex.terrainType, cp, dP, !!(cE && cE.player.id !== cpId));
        const effADmg = sud.def.ability === "rapid_shot" ? Math.ceil(pv.aDmg * 1.5) : pv.aDmg;
        setPreview({ ...pv, aDmg: effADmg, an: sud.def.name, dn: UNIT_DEFS[eu.unitType]?.name, ahp: sud.hpCurrent, dhp: eu.hpCurrent, rapidShot: sud.def.ability === "rapid_shot" });
      } else setPreview(null);
    } else setPreview(null);
  }, [findHexFromEvent, fogVisible, hovH, selU, phase, sud, unitMap, cityMap, cpId, reach, atkRange, players, cp]);

  const onHexLeave = useCallback(() => { setHovH(null); setPreview(null); }, []);

  const onHexClick = useCallback(e => {
    e.stopPropagation();
    const h = findHexFromEvent(e); if (!h || isPanRef.current) return;
    const { hex, uk } = h;
    if (!fogVisible.has(uk)) return;
    const uH = unitMap[uk] || []; const myU = uH.filter(u => u.pid === cpId);
    const eU = uH.filter(u => u.pid !== cpId); const cE = cityMap[hex.id]; const isMy = myU.length > 0;
    const uSel2 = selU && isMy && myU.some(u => u.id === selU);
    const hasTgt = eU.length > 0 || (cE && cE.player.id !== cpId);
    const inNk = nukeM && nukeR.has(uk);
    if (nukeM && inNk) { launchNuke(nukeM, hex.col, hex.row); return; }
    if (nukeM) { setNukeM(null); return; }
    if (settlerM && hex.terrainType !== "water" && hex.terrainType !== "mountain" && !hex.cityId) { foundCity(settlerM, hex.col, hex.row); return; }
    if (settlerM) { setSettlerM(null); return; }
    if (cE && cE.player.id === cpId) {
      if (isMy && !uSel2 && phase === "MOVEMENT") { setSelU(myU[0].id); setSelH(null); return; }
      if (isMy && uSel2 && myU.length > 1) { const ci = myU.findIndex(u => u.id === selU); setSelU(myU[(ci + 1) % myU.length].id); return; }
      setShowCity(cE.city.id); setSelU(null); return;
    }
    if (isMy && !uSel2 && phase === "MOVEMENT") { setSelU(myU[0].id); setSelH(null); }
    else if (isMy && uSel2) {
      if (myU.length > 1) { const ci = myU.findIndex(u => u.id === selU); setSelU(myU[(ci + 1) % myU.length].id); }
      else { const su = myU[0]; if (su.unitType === "settler") { setSettlerM(su.id); return; } if (su.unitType === "nuke") { setNukeM(su.id); return; } setSelU(null); setSelH(hex.id); }
    } else { setSelU(null); setSelH(selH === hex.id ? null : hex.id); }
  }, [findHexFromEvent, fogVisible, unitMap, cityMap, cpId, selU, nukeM, nukeR, settlerM, phase, selH, launchNuke, foundCity, doCombat, moveU]);

  const onHexCtx = useCallback(e => {
    e.preventDefault(); e.stopPropagation();
    if (isPanRef.current || phase !== "MOVEMENT") return;
    const h = findHexFromEvent(e); if (!h) return;
    const { hex, uk } = h;
    const uH = unitMap[uk] || []; const myU = uH.filter(u => u.pid === cpId);
    const eU = uH.filter(u => u.pid !== cpId); const cE = cityMap[hex.id];
    const uSel2 = selU && myU.some(u => u.id === selU);
    const hasTgt = eU.length > 0 || (cE && cE.player.id !== cpId);
    const inMv = selU && !uSel2 && reach.has(uk) && eU.length === 0 && !(cE && cE.player.id !== cpId);
    const inMelee = selU && sud && sud.def?.range === 0 && !sud.hasAttacked && reach.has(uk) && !uSel2 && hasTgt;
    const inRng = selU && sud && sud.def?.range > 0 && !sud.hasAttacked && atkRange.has(uk) && !uSel2 && hasTgt;
    if (selU && (inMelee || inRng)) { doCombat(selU, hex.col, hex.row); return; }
    if (selU && inMv) { moveU(selU, hex.col, hex.row); return; }
    if (selU && !uSel2) {
      const blk = getMoveBlockReason(hex, sud, sud?.def, reach, atkRange, phase, cpId, players);
      if (blk) { setMoveMsg(blk); setFlashes(prev => ({ ...prev, [uk]: "blocked" })); }
    }
  }, [findHexFromEvent, phase, unitMap, cityMap, cpId, selU, sud, reach, atkRange, doCombat, moveU, players]);

  // === RENDER HEXES ===
  const renderAll = useCallback(() => hexes.map((hex, i) => {
    const uk = hex.uk;
    const isVisible = fogVisible.has(uk);
    const isExplored2 = fogExplored.has(uk);
    const fogged = !isVisible;
    const uH = unitMap[uk] || []; const myU = uH.filter(u => u.pid === cpId);
    const eU = uH.filter(u => u.pid !== cpId); const cE = cityMap[hex.id]; const isMy = myU.length > 0;
    const uSel = selU && isMy && myU.some(u => u.id === selU);
    const hasTgt = eU.length > 0 || (cE && cE.player.id !== cpId);
    const inMv = selU && !uSel && reach.has(uk) && phase === "MOVEMENT" && eU.length === 0 && !(cE && cE.player.id !== cpId);
    const inMelee = selU && phase === "MOVEMENT" && sud && sud.def?.range === 0 && !sud.hasAttacked && reach.has(uk) && !uSel && hasTgt;
    const inRng = selU && phase === "MOVEMENT" && sud && sud.def?.range > 0 && !sud.hasAttacked && atkRange.has(uk) && !uSel && hasTgt;
    const inNk = nukeM && nukeR.has(uk);
    const canA = phase === "MOVEMENT" && isMy && myU.some(u => actable.has(u.id));
    const ownerP = hex.ownerPlayerId ? players.find(p => p.id === hex.ownerPlayerId) : null;
    const blkReason = selU && phase === "MOVEMENT" && sud && !uSel && !fogged ? getMoveBlockReason(hex, sud, sud.def, reach, atkRange, phase, cpId, players) : null;

    return <MemoHex key={hex.id} hex={hex} vis={visData[i]}
      isHovered={hovH === hex.id} isSelected={selH === hex.id} inMoveRange={inMv} inAttackRange={!!(inMelee || inRng)} inNukeRange={!!inNk}
      unitSelected={!!uSel} units={fogged ? null : uH} unitCount={fogged ? 0 : uH.length}
      city={fogged ? null : (cE?.city || null)} player={cE?.player || ownerP} settlerMode={!!settlerM} canAct={!!canA} flash={flashes[uk] || null} isFogged={fogged} isExplored={isExplored2} blockReason={blkReason}/>;
  }), [hexes, hovH, selH, visData, unitMap, cityMap, selU, reach, atkRange, sud, cpId, phase, players, settlerM, actable, nukeM, nukeR, flashes, fogVisible, fogExplored]);

  // Tooltip overlay data
  const tooltipData = useMemo(() => {
    if (hovH == null || !selU || phase !== "MOVEMENT" || !sud) return null;
    const hex = hexes.find(h2 => h2.id === hovH); if (!hex) return null;
    const uk2 = hex.uk; const fogged = !fogVisible.has(uk2); if (fogged) return null;
    const uH = unitMap[uk2] || []; const myU = uH.filter(u => u.pid === cpId);
    const uSel = myU.some(u => u.id === selU); if (uSel) return null;
    const blk = getMoveBlockReason(hex, sud, sud.def, reach, atkRange, phase, cpId, players);
    if (!blk) return null;
    return { x: hex.x, y: hex.y, text: blk };
  }, [hovH, selU, phase, sud, hexes, fogVisible, unitMap, cpId, reach, atkRange, players]);

  const tCounts = useMemo(() => { const c = { grassland: 0, forest: 0, mountain: 0, water: 0 }; hexes.forEach(h => c[h.terrainType]++); return c; }, [hexes]);
  const landOwned = useMemo(() => { const o = {}; players.forEach(p => { o[p.id] = hexes.filter(h => h.ownerPlayerId === p.id).length; }); return o; }, [hexes, players]);
  const totalLand = useMemo(() => hexes.filter(h => h.terrainType !== "water").length, [hexes]);

  // ============================================================
  // RENDER — SCREENS
  // ============================================================

  if (!gameMode) return <ModeSelectScreen setGameMode={setGameMode} />;

  if (gameMode && !mapSizePick) return <MapSizeScreen setMapSizePick={setMapSizePick} setGameMode={setGameMode} />;

  if (!gameStarted || !gs) return <CivSelectScreen
    gameMode={gameMode} civPick={civPick} setCivPick={setCivPick}
    civPickStep={civPickStep} setCivPickStep={setCivPickStep}
    setGs={setGs} setGameStarted={setGameStarted}
    onBack={() => { if (gameMode !== "ai" && civPickStep === 2) setCivPickStep(1); else setMapSizePick(null); }}
  />;

  if (turnTransition) return <TurnTransitionScreen turnTransition={turnTransition} turnNumber={turnNumber} onReady={() => setTurnTransition(null)} />;

  if (gs.victoryStatus) {
    if (!victoryPlayed.current) { victoryPlayed.current = true; SFX.victory(); }
    return <VictoryScreen gs={gs} players={players} turnNumber={turnNumber} onNewGame={() => {
      setGs(null); setGameStarted(false); setGameMode(null); setMapSizePick(null); setSelU(null); setSelH(null); setAiThinking(false); setTutorialOn(true); setTutorialDismissed({});
      victoryPlayed.current = false; techPosRef.current = { x: null, y: 95 }; cityPosRef.current = { x: null, y: 95 };
      setTechCollapsed(false); setCityCollapsed(false); setCivPickStep(1); setTurnTransition(null); setTurnPopups([]); turnPopupShownRef.current = null; prevCpId.current = null;
    }} />;
  }

  // ============================================================
  // MAIN GAME VIEW
  // ============================================================
  return (
    <div ref={gameContainerRef} onMouseMove={onPanelMove} onMouseUp={onPanelUp} style={{ width: "100vw", height: "100vh", background: "linear-gradient(145deg,#0a0e06 0%,#141e0c 40%,#0e1608 100%)", overflow: "hidden", position: "relative", userSelect: "none", touchAction: "none", fontFamily: "'Palatino Linotype','Book Antiqua',Palatino,serif" }}>

      {/* === MAP LAYER === */}
      <svg ref={svgRef} onMouseDown={onMD} onMouseMove={onMM} onMouseUp={onMU} onMouseLeave={onMU} onWheel={onWh} onContextMenu={e => e.preventDefault()} style={{ cursor: "grab", position: "absolute", top: 0, left: 0, width: "100%", height: "100%", zIndex: 1 }}>
        <defs>
          <style>{`
            @keyframes unitPulse { 0%,100%{opacity:.4;} 50%{opacity:.8;} }
            @keyframes unitBob { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-2px)} }
            .unit-glow { animation: unitPulse 2s ease-in-out infinite; }
            .unit-bob { animation: unitBob 2.5s ease-in-out infinite; }
          `}</style>
          <radialGradient id="gradGrass" cx="40%" cy="35%" r="70%"><stop offset="0%" stopColor="#5a9a2a"/><stop offset="30%" stopColor="#4e8826"/><stop offset="60%" stopColor="#437520"/><stop offset="100%" stopColor="#2a5014"/></radialGradient>
          <radialGradient id="varGrass" cx="60%" cy="55%" r="55%"><stop offset="0%" stopColor="#2a4a10"/><stop offset="100%" stopColor="#3a6a1a" stopOpacity="0"/></radialGradient>
          <radialGradient id="gradForest" cx="40%" cy="35%" r="70%"><stop offset="0%" stopColor="#306828"/><stop offset="30%" stopColor="#265a1e"/><stop offset="60%" stopColor="#1e4a16"/><stop offset="100%" stopColor="#12380c"/></radialGradient>
          <radialGradient id="gradMountain" cx="40%" cy="30%" r="70%"><stop offset="0%" stopColor="#6a6555"/><stop offset="30%" stopColor="#5a5545"/><stop offset="60%" stopColor="#4a4538"/><stop offset="100%" stopColor="#35302a"/></radialGradient>
          <radialGradient id="gradWater" cx="40%" cy="35%" r="70%"><stop offset="0%" stopColor="#3578aa"/><stop offset="30%" stopColor="#2a6a9a"/><stop offset="60%" stopColor="#1e5580"/><stop offset="100%" stopColor="#0e3050"/></radialGradient>
        </defs>
        <g ref={gRef} style={{ willChange: "transform" }} onMouseMove={onHexHover} onMouseLeave={onHexLeave} onClick={onHexClick} onContextMenu={onHexCtx}>
          {renderAll()}
          {combatAnims.map(a => <g key={a.id} transform={`translate(${a.x},${a.y})`} style={{ pointerEvents: "none" }}>
            <text x={0} y={-20} textAnchor="middle" fill={a.color} fontSize={18} fontWeight="bold" fontFamily="'Palatino Linotype',serif" stroke="#000" strokeWidth="2" paintOrder="stroke">
              -{a.dmg}<animate attributeName="y" from="-20" to="-65" dur="1.1s" fill="freeze"/><animate attributeName="opacity" from="1" to="0" dur="1.1s" fill="freeze"/>
            </text>
          </g>)}
          {tooltipData && <g transform={`translate(${tooltipData.x},${tooltipData.y - 52})`} style={{ pointerEvents: "none" }}>
            <rect x={-tooltipData.text.length * 3.2} y={-10} width={tooltipData.text.length * 6.4} height={18} rx={5} fill="rgba(50,15,5,.95)" stroke="rgba(240,100,60,.7)" strokeWidth="1"/>
            <text x={0} y={3} textAnchor="middle" dominantBaseline="middle" fill="#ffb090" fontSize={9} fontWeight="bold" fontFamily="'Palatino Linotype',serif" style={{ pointerEvents: "none" }}>{tooltipData.text}</text>
          </g>}
        </g>
      </svg>

      {/* === UI OVERLAY === */}
      <div ref={uiOverlayRef} style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", zIndex: 10, pointerEvents: "none" }}>

        {/* Title */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 50, background: "linear-gradient(180deg,rgba(10,14,6,.95) 0%,rgba(10,14,6,0) 100%)", zIndex: 10, display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: 8, pointerEvents: "none" }}>
          <div style={{ textAlign: "center" }}>
            <h1 style={{ color: "#c8d8a0", fontSize: 18, fontWeight: 400, letterSpacing: 6, textTransform: "uppercase", margin: 0 }}>Empires of Earth</h1>
            <div style={{ color: "#6a7a50", fontSize: 8, letterSpacing: 3, marginTop: 1 }}>Turn {turnNumber} · {cp.name}</div>
          </div>
        </div>

        {/* End Turn button */}
        <div style={{ position: "absolute", top: 48, left: "50%", transform: "translateX(-50%)", zIndex: 10, display: "flex", gap: 6, alignItems: "center", background: "rgba(10,14,6,.85)", borderRadius: 6, padding: "3px 8px", border: "1px solid rgba(100,140,50,.3)", pointerEvents: "auto" }}>
          <button onClick={endTurn} style={{ ...btnStyle(true), marginBottom: 0, marginRight: 0, fontSize: 10, padding: "5px 16px", letterSpacing: 1 }}>End Turn →</button>
        </div>

        {/* Player panel */}
        {(() => {
          const p = cp; const i2 = calcPlayerIncome(p, hexes);
          return (
            <div style={{ position: "absolute", top: 12, left: 14, zIndex: 10, background: "rgba(10,14,6,.8)", borderRadius: 6, padding: "6px 10px", border: `1px solid ${p.color}60`, minWidth: 120, pointerEvents: "auto" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: p.color, boxShadow: `0 0 6px ${p.color}50` }}/>
                <span style={{ color: p.colorLight, fontSize: 10, letterSpacing: 1.5 }}>{p.name}</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 1, fontSize: 8, color: "#a0b880" }}>
                <div>💰{p.gold} <span style={{ color: "#6a7a50" }}>+{i2.gold}/t</span></div>
                <div>🔬+{i2.science}/t{p.currentResearch && <span style={{ color: "#80b0d0" }}> →{TECH_TREE[p.currentResearch.techId]?.name} ({p.currentResearch.progress}/{TECH_TREE[p.currentResearch.techId]?.cost})</span>}</div>
                <div>🌾+{i2.food}/t ⚙+{i2.production}/t</div>
                <div style={{ color: "#5a6a4a" }}>🏛{p.cities.length} ⚔{p.units.length} 🗺{landOwned[p.id] || 0}/{totalLand}{barbarians.length > 0 && <span style={{ color: "#c05050" }}> 🏴‍☠️{barbarians.length}</span>}</div>
              </div>
            </div>
          );
        })()}

        {/* Action bar */}
        <div style={{ position: "absolute", top: 72, left: "50%", transform: "translateX(-50%)", zIndex: 10, display: "flex", gap: 4, alignItems: "center", pointerEvents: "auto" }}>
          <button onClick={() => setShowTech(!showTech)} style={btnStyle(showTech)}>🔬 Tech</button>
          <button onClick={() => setShowSaveLoad(!showSaveLoad)} style={btnStyle(showSaveLoad)}>💾 Save/Load</button>
          <button onClick={() => { if (!tutorialOn) { setTutorialOn(true); setTutorialDismissed({}); } else { setTutorialOn(false); } }} style={btnStyle(tutorialOn)}>💡 Tips</button>
          {sud?.unitType === "settler" && <button onClick={() => setSettlerM(settlerM ? null : selU)} style={btnStyle(!!settlerM)}>🏕 Found City</button>}
          {sud?.unitType === "nuke" && <button onClick={() => setNukeM(nukeM ? null : selU)} style={btnStyle(!!nukeM)}>☢ Launch</button>}
          {sud && (() => { const ui = canUpgradeUnit(sud, cp); return ui ? <button onClick={() => upgradeUnit(selU)} style={btnStyle(false)}>⬆ Upgrade → {ui.toDef.name} ({ui.cost}💰)</button> : null; })()}
          {sud && <div style={{ fontSize: 9, color: "#a0b880", padding: "4px 8px", background: "rgba(10,14,6,.8)", borderRadius: 4, border: "1px solid rgba(100,140,50,.3)" }}>
            {sud.def?.icon} {sud.def?.name} HP:{sud.hpCurrent}/{sud.def?.hp} Str:{sud.def?.strength}
            {sud.def?.range > 0 && ` Rng:${sud.def.range}`} Mv:{sud.movementCurrent}/{sud.def?.move}
            {sud.def?.domain !== "land" && <span style={{ color: "#60a0d0" }}> [{sud.def.domain}]</span>}
            {sud.hasAttacked && <span style={{ color: "#c05050" }}> [fired]</span>}
          </div>}
          {!selU && actable.size > 0 && <div style={{ fontSize: 8, color: "#a0e060", padding: "3px 8px", background: "rgba(10,14,6,.7)", borderRadius: 4 }}>Tab: cycle {actable.size} units</div>}
        </div>

        {/* Combat preview */}
        {preview && <div style={{ ...panelStyle, position: "fixed", top: window.innerHeight / 2 - 60, left: window.innerWidth / 2 - 100, width: 200, padding: 8, zIndex: 30, border: "1px solid #c05050", pointerEvents: "auto" }}>
          <div style={{ fontSize: 10, color: "#ffa0a0", marginBottom: 4, textAlign: "center" }}>⚔ Combat Preview</div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9 }}>
            <div style={{ color: "#a0d080" }}>{preview.an} ({preview.aStr})</div>
            <div style={{ color: "#f08080" }}>{preview.dn} ({preview.dStr})</div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 8, marginTop: 2 }}>
            <div>→{preview.aDmg}dmg{preview.dblShot ? " (x2)" : ""}</div>
            <div>{preview.dDmg > 0 ? `←${preview.dDmg}dmg` : "no counter"}</div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 8, marginTop: 2, color: "#6a7a50" }}>
            <div>{preview.ahp}→{Math.max(0, preview.ahp - preview.dDmg)}</div>
            <div>{preview.dhp}→{Math.max(0, preview.dhp - preview.aDmg)}</div>
          </div>
          <div style={{ textAlign: "center", fontSize: 7, color: "#5a6a4a", marginTop: 3 }}>Right-click to attack</div>
        </div>}

        {/* Tech tree */}
        {showTech && (() => {
          const tPos = techPosRef.current;
          const posStyle = tPos.x != null ? { left: tPos.x, top: tPos.y } : { top: tPos.y, left: "50%", transform: "translateX(-50%)" };
          return (
            <div data-panel="tech" style={{ ...panelStyle, ...posStyle, width: Math.min(720, window.innerWidth - 40), maxHeight: techCollapsed ? 40 : 320, overflowY: techCollapsed ? "hidden" : "auto", transition: "max-height .2s ease" }}>
              <div onMouseDown={e => onPanelDown(e, "tech")} style={{ display: "flex", justifyContent: "space-between", marginBottom: techCollapsed ? 0 : 8, cursor: "grab", userSelect: "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <button onClick={() => setTechCollapsed(!techCollapsed)} style={{ ...btnStyle(false), fontSize: 10, padding: "1px 5px" }}>{techCollapsed ? "▸" : "▾"}</button>
                  <span style={{ fontSize: 13, color: "#c8d8a0", letterSpacing: 2 }}>TECHNOLOGY TREE</span>
                </div>
                <button onClick={() => setShowTech(false)} style={{ ...btnStyle(false), fontSize: 10 }}>✕</button>
              </div>
              {!techCollapsed && <div style={{ display: "flex", gap: 4 }}>
                {ERAS.map(era => {
                  const techs = Object.values(TECH_TREE).filter(t => t.era === era).sort((a, b) => a.row - b.row);
                  return (
                    <div key={era} style={{ flex: 1, minWidth: 90 }}>
                      <div style={{ fontSize: 8, color: ERA_COLORS[era], letterSpacing: 1, marginBottom: 4, textAlign: "center", textTransform: "uppercase" }}>{era}</div>
                      {techs.map(t => {
                        const rd = cp.researchedTechs.includes(t.id);
                        const av = !rd && t.prereqs.every(p2 => cp.researchedTechs.includes(p2));
                        const isR = cp.currentResearch?.techId === t.id;
                        return (
                          <div key={t.id} style={{ padding: "4px 6px", marginBottom: 3, borderRadius: 4, fontSize: 8,
                            background: rd ? "rgba(80,160,50,.3)" : isR ? "rgba(80,140,200,.3)" : "rgba(30,40,20,.6)",
                            border: `1px solid ${rd ? "#5a9a30" : isR ? "#5090c0" : av ? "#6a7a50" : "#2a3020"}`,
                            color: rd ? "#b0d890" : av ? "#a0b880" : "#4a5a3a",
                            cursor: av && !cp.currentResearch ? "pointer" : "default",
                            opacity: rd || av || isR ? 1 : .5 }}
                            onClick={() => { if (av && !cp.currentResearch) selResearch(t.id); }}>
                            <div style={{ fontWeight: 600 }}>{t.name}</div>
                            <div style={{ fontSize: 7, color: "#6a7a50", marginTop: 1 }}>{rd ? "✓" : isR ? `${cp.currentResearch.progress}/${t.cost}` : `${t.cost}🔬`}</div>
                            <div style={{ fontSize: 6, color: "#5a6a4a", marginTop: 1 }}>{t.effects[0]}</div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>}
            </div>
          );
        })()}

        {/* City panel */}
        {showCity && (() => {
          const city = cp.cities.find(c => c.id === showCity);
          if (!city) return null;
          const y = calcCityYields(city, cp, hexes);
          const avU = getAvailableUnits(cp, city);
          const avD = getAvailableDistricts(cp, city);
          const cPos = cityPosRef.current;
          const cStyle = cPos.x != null ? { left: cPos.x, top: cPos.y } : { top: cPos.y, right: 14 };
          return (
            <div data-panel="city" style={{ ...panelStyle, ...cStyle, width: 280, maxHeight: cityCollapsed ? 40 : 420, overflowY: cityCollapsed ? "hidden" : "auto", transition: "max-height .2s ease" }}>
              <div onMouseDown={e => onPanelDown(e, "city")} style={{ display: "flex", justifyContent: "space-between", marginBottom: cityCollapsed ? 0 : 6, cursor: "grab", userSelect: "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <button onClick={() => setCityCollapsed(!cityCollapsed)} style={{ ...btnStyle(false), fontSize: 10, padding: "1px 5px" }}>{cityCollapsed ? "▸" : "▾"}</button>
                  <span style={{ fontSize: 13, color: "#ffd740", letterSpacing: 2 }}>{city.name}</span>
                </div>
                <button onClick={() => setShowCity(null)} style={{ ...btnStyle(false), fontSize: 10 }}>✕</button>
              </div>
              {!cityCollapsed && <>
                <div style={{ fontSize: 9, marginBottom: 6, display: "flex", gap: 8 }}>
                  <span>Pop:{city.population}</span><span style={{ color: "#7db840" }}>🌾{y.food}</span><span style={{ color: "#b89040" }}>⚙{y.production}</span><span style={{ color: "#60a0d0" }}>🔬{y.science}</span><span style={{ color: "#d0c050" }}>💰{y.gold}</span>
                </div>
                <div style={{ fontSize: 8, color: "#6a7a50", marginBottom: 4 }}>Food:{city.foodAccumulated}/{city.population * 10} HP:{city.hp}/{city.hpMax || 20}</div>
                {city.districts.length > 0 && <div style={{ fontSize: 8, marginBottom: 6 }}><span style={{ color: "#6a7a50" }}>Districts: </span>{city.districts.map(d => <span key={d} style={{ color: "#a0b880", marginRight: 4 }}>{DISTRICT_DEFS[d]?.icon}{DISTRICT_DEFS[d]?.name}</span>)}</div>}
                {city.currentProduction ? <div style={{ fontSize: 9, padding: "4px 8px", background: "rgba(80,120,40,.3)", borderRadius: 4, marginBottom: 6 }}>
                  Building: {city.currentProduction.type === "unit" ? UNIT_DEFS[city.currentProduction.itemId]?.name : DISTRICT_DEFS[city.currentProduction.itemId]?.name}
                  <span style={{ color: "#6a7a50" }}> ({city.productionProgress}/{(() => { const isU = city.currentProduction.type === "unit"; const c = isU ? UNIT_DEFS[city.currentProduction.itemId]?.cost : DISTRICT_DEFS[city.currentProduction.itemId]?.cost; return isU && cp.civilization === "Germany" ? Math.max(1, c - 1) : c; })()})</span>
                  <button onClick={() => { setGs(prev => { const g = JSON.parse(JSON.stringify(prev)); const c = g.players.find(p => p.id === g.currentPlayerId).cities.find(c2 => c2.id === city.id); if (c) { c.currentProduction = null; c.productionProgress = 0; } return g; }); }} style={{ ...btnStyle(false), fontSize: 7, marginLeft: 6, padding: "2px 4px" }}>✕</button>
                </div>
                : <div>
                    <div style={{ fontSize: 9, color: "#c8d8a0", marginBottom: 4 }}>Build:</div>
                    <div style={{ fontSize: 8, color: "#6a7a50", marginBottom: 2 }}>UNITS</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 2, marginBottom: 6 }}>
                      {avU.map(u => <button key={u.id} onClick={() => setProd(city.id, "unit", u.id)} title={`Str:${u.strength} HP:${u.hp} Mv:${u.move}${u.range ? ` Rng:${u.range}` : ""} [${u.domain}]`} style={{ ...btnStyle(false), fontSize: 8, padding: "3px 6px" }}>{u.icon}{u.name}<span style={{ color: "#5a6a4a" }}>({u.cost}⚙)</span></button>)}
                    </div>
                    <div style={{ fontSize: 8, color: "#6a7a50", marginBottom: 2 }}>DISTRICTS</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
                      {avD.map(d => <button key={d.id} onClick={() => setProd(city.id, "district", d.id)} style={{ ...btnStyle(false), fontSize: 8, padding: "3px 6px" }}>{d.icon}{d.name}<span style={{ color: "#5a6a4a" }}>({d.cost}⚙)</span></button>)}
                    </div>
                  </div>}
              </>}
            </div>
          );
        })()}

        {/* Legend */}
        <div style={{ position: "absolute", bottom: 55, left: 14, zIndex: 10, background: "rgba(10,14,6,.7)", borderRadius: 6, padding: "5px 8px", border: "1px solid rgba(100,140,50,.2)", pointerEvents: "auto" }}>
          <div style={{ color: "#6a7a50", fontSize: 7, letterSpacing: 2, textTransform: "uppercase", marginBottom: 2 }}>Terrain</div>
          {["grassland", "forest", "mountain", "water"].map(t => <div key={t} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 8 }}>
            <div style={{ width: 5, height: 5, borderRadius: t === "water" ? 0 : "50%", background: TERRAIN_INFO[t].color }}/>
            <span style={{ color: "#a0b880", width: 50 }}>{TERRAIN_INFO[t].label}</span>
            <span style={{ color: "#6a7a50" }}>{TERRAIN_INFO[t].moveCost != null ? `mv${TERRAIN_INFO[t].moveCost}` : "—"}{TERRAIN_INFO[t].defBonus ? ` +${TERRAIN_INFO[t].defBonus}def` : ""}</span>
            <span style={{ color: "#4a5a3a" }}>({tCounts[t]})</span>
          </div>)}
        </div>

        {/* Log */}
        <div style={{ position: "absolute", bottom: 55, right: 14, zIndex: 10, background: "rgba(10,14,6,.7)", borderRadius: 6, padding: "5px 8px", border: "1px solid rgba(100,140,50,.2)", maxWidth: 240, maxHeight: 110, overflowY: "auto", pointerEvents: "auto" }}>
          <div style={{ color: "#6a7a50", fontSize: 7, letterSpacing: 2, textTransform: "uppercase", marginBottom: 2 }}>Log</div>
          {(log || []).slice(-10).map((l, i) => <div key={i} style={{ fontSize: 7, color: l.includes("☠") || l.includes("captured") || l.includes("☢") ? "#e07070" : l.includes("built") || l.includes("researched") || l.includes("founded") ? "#80c060" : "#7a8a60", marginBottom: 1 }}>{l}</div>)}
        </div>

        {/* Bottom info */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 48, background: "linear-gradient(0deg,rgba(10,14,6,.95) 0%,rgba(10,14,6,0) 100%)", zIndex: 10, display: "flex", alignItems: "flex-end", justifyContent: "center", paddingBottom: 8, pointerEvents: "none" }}>
          {selH != null && hexes[selH] ? (() => {
            const sd = hexes[selH], si = TERRAIN_INFO[sd.terrainType];
            const uH = unitMap[`${sd.col},${sd.row}`] || [];
            const oP = sd.ownerPlayerId ? players.find(p => p.id === sd.ownerPlayerId) : null;
            return (
              <div style={{ background: "rgba(15,25,10,.9)", border: "1px solid rgba(100,140,50,.3)", borderRadius: 8, padding: "5px 16px", color: "#a0b880", fontSize: 9, letterSpacing: 1, display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ color: "#c8d8a0", fontWeight: 600 }}>({sd.col},{sd.row})</span>
                <span style={{ color: si.color }}>{si.label}</span>
                {sd.resource && <span>{RESOURCE_INFO[sd.resource].icon}{RESOURCE_INFO[sd.resource].label}</span>}
                <span style={{ color: "#7db840" }}>F{si.food}</span><span style={{ color: "#b89040" }}>P{si.prod}</span>
                <span style={{ color: si.moveCost != null ? "#a0b880" : "#c05050" }}>{si.moveCost != null ? `Mv${si.moveCost}` : "—"}</span>
                {si.defBonus > 0 && <span style={{ color: "#60a0d0" }}>+{si.defBonus}def</span>}
                {uH.length > 0 && <span style={{ color: "#ffd740" }}>{uH.map(u => UNIT_DEFS[u.unitType]?.icon).join("")}</span>}
                {oP && <span style={{ color: oP.colorLight }}>⚑{oP.name.slice(0, 6)}</span>}
              </div>
            );
          })() : (<span style={{ color: "#3a4a2a", fontSize: 9, letterSpacing: 2 }}>Tab=cycle Esc=deselect RightClick=move/attack</span>)}
        </div>

        {settlerM && <div style={{ position: "absolute", bottom: 52, left: "50%", transform: "translateX(-50%)", zIndex: 20, background: "rgba(40,80,20,.9)", border: "1px solid #40e040", borderRadius: 6, padding: "6px 16px", color: "#a0f0a0", fontSize: 10, pointerEvents: "auto" }}>🏕 Click land hex to found city · <span style={{ cursor: "pointer", color: "#f08080" }} onClick={() => setSettlerM(null)}>Cancel</span></div>}
        {nukeM && <div style={{ position: "absolute", bottom: 52, left: "50%", transform: "translateX(-50%)", zIndex: 20, background: "rgba(80,40,0,.9)", border: "1px solid #ffa000", borderRadius: 6, padding: "6px 16px", color: "#ffd080", fontSize: 10, pointerEvents: "auto" }}>☢ Click target for nuclear strike (1-hex blast) · <span style={{ cursor: "pointer", color: "#f08080" }} onClick={() => setNukeM(null)}>Cancel</span></div>}
        {moveMsg && <div style={{ position: "absolute", bottom: 52, left: "50%", transform: "translateX(-50%)", zIndex: 20, background: "rgba(80,20,10,.92)", border: "1px solid rgba(240,100,60,.6)", borderRadius: 6, padding: "6px 16px", color: "#ffa080", fontSize: 10, pointerEvents: "none" }}>⚠ {moveMsg}</div>}

        {/* Save/Load modal */}
        {showSaveLoad && <div style={{ position: "absolute", inset: 0, zIndex: 40, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(5,8,3,.5)", pointerEvents: "all" }} onClick={e => { if (e.target === e.currentTarget) setShowSaveLoad(false); }}>
          <div style={{ ...panelStyle, width: 360, maxHeight: 420, display: "flex", flexDirection: "column", zIndex: 41 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <span style={{ color: "#c8d8a0", fontSize: 14, fontWeight: 600, letterSpacing: 2 }}>Save / Load Game</span>
              <span style={{ cursor: "pointer", color: "#6a7a50", fontSize: 14 }} onClick={() => setShowSaveLoad(false)}>✕</span>
            </div>
            <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
              <input value={saveName} onChange={e => setSaveName(e.target.value)} placeholder={`Turn ${turnNumber} - ${cp.name}`} style={{ flex: 1, background: "rgba(20,28,12,.9)", border: "1px solid rgba(100,140,50,.4)", borderRadius: 4, padding: "5px 8px", color: "#a0b880", fontSize: 10, fontFamily: "inherit", outline: "none" }}/>
              <button onClick={() => {
                const saves = JSON.parse(localStorage.getItem("eoe_saves") || "[]");
                const name = saveName.trim() || `Turn ${turnNumber} - ${cp.name}`;
                saves.unshift({ id: Date.now(), name, timestamp: new Date().toLocaleString(), gs: JSON.parse(JSON.stringify(gs)) });
                localStorage.setItem("eoe_saves", JSON.stringify(saves));
                setSaveName("");
                setShowSaveLoad(false);
              }} style={{ ...btnStyle(true), marginBottom: 0, marginRight: 0 }}>💾 Save</button>
            </div>
            <div style={{ color: "#6a7a50", fontSize: 8, letterSpacing: 2, textTransform: "uppercase", marginBottom: 4 }}>Saved Games</div>
            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
              {(() => { const saves = JSON.parse(localStorage.getItem("eoe_saves") || "[]"); return saves.length === 0 ? <div style={{ color: "#5a6a4a", fontSize: 10, textAlign: "center", padding: 20 }}>No saves yet</div> : saves.map(s => <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(20,28,12,.6)", borderRadius: 4, padding: "6px 8px", border: "1px solid rgba(100,140,50,.15)" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, color: "#a0b880" }}>{s.name}</div>
                  <div style={{ fontSize: 7, color: "#5a6a4a" }}>{s.timestamp}</div>
                </div>
                <button onClick={() => {
                  setGs(s.gs); setShowTech(false); setShowCity(null); setSelH(null); setSelU(null);
                  setSettlerM(null); setNukeM(null); setPreview(null); setTurnPopups([]);
                  turnPopupShownRef.current = null; prevCpId.current = null;
                  setShowSaveLoad(false); setGameStarted(true);
                }} style={{ ...btnStyle(false), marginBottom: 0, marginRight: 0, fontSize: 9 }}>Load</button>
                <button onClick={() => {
                  const cur = JSON.parse(localStorage.getItem("eoe_saves") || "[]");
                  localStorage.setItem("eoe_saves", JSON.stringify(cur.filter(x => x.id !== s.id)));
                  forceRender(n => n + 1);
                }} style={{ ...btnStyle(false), marginBottom: 0, marginRight: 0, fontSize: 9, color: "#c05050", borderColor: "rgba(180,60,60,.4)" }}>🗑</button>
              </div>); })()}
            </div>
          </div>
        </div>}

        {/* AI thinking overlay */}
        {aiThinking && <div style={{ position: "absolute", inset: 0, zIndex: 40, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(5,8,3,.6)", pointerEvents: "all" }}>
          <div style={{ background: "rgba(15,20,10,.95)", border: "2px solid rgba(100,140,50,.5)", borderRadius: 12, padding: "24px 40px", textAlign: "center", boxShadow: "0 0 40px rgba(80,120,40,.2)" }}>
            <div style={{ fontSize: 28, marginBottom: 8, animation: "pulse 1.5s ease-in-out infinite" }}>🤖</div>
            <div style={{ color: "#c8d8a0", fontSize: 16, fontWeight: 600, letterSpacing: 3 }}>AI is thinking...</div>
            <div style={{ color: "#6a7a50", fontSize: 10, marginTop: 6 }}>The enemy plots its next move</div>
          </div>
        </div>}

        {/* Turn-start notification circles */}
        {turnPopups.length > 0 && (() => {
          const popup = turnPopups[0];
          const isTech = popup.type === "tech";
          const isCity = popup.type === "city";
          const isEvent = popup.type === "event";
          const bgColor = isTech ? "rgba(6,14,30,.96)" : isCity ? "rgba(10,20,10,.96)" : "rgba(30,18,6,.96)";
          const borderColor = isTech ? "#40a0d0" : isCity ? "#60c060" : "#d0a040";
          const glowColor = isTech ? "rgba(60,160,220,.4)" : isCity ? "rgba(60,180,60,.4)" : "rgba(200,160,40,.4)";
          const iconColor = isTech ? "#a0d8f0" : isCity ? "#a0e0a0" : "#ffd080";
          const icon = isTech ? "🔬" : isCity ? "⚙" : "🎲";
          return <div style={{ position: "absolute", bottom: 175, right: 14, zIndex: 35, pointerEvents: "auto" }}>
            {turnPopups.length > 1 && <div style={{ position: "absolute", top: -4, right: -4, width: 14, height: 14, borderRadius: "50%", background: "#c05050", color: "#fff", fontSize: 8, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 36, border: "1px solid #e07070" }}>{turnPopups.length}</div>}
            <div
              title={isTech ? "Choose Research" : isCity ? `${popup.title} — Set Production` : popup.title}
              onClick={() => {
                if (popup.action === "tech") { setShowTech(true); }
                if (popup.action === "city" && popup.cityId) { setShowCity(popup.cityId); }
                setTurnPopups(prev => prev.filter(p2 => p2.id !== popup.id));
              }}
              style={{
                width: 36, height: 36, borderRadius: "50%",
                background: bgColor, border: `2px solid ${borderColor}`,
                boxShadow: `0 0 12px ${glowColor}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", transition: "transform .15s ease",
                position: "relative",
              }}
              onMouseEnter={e => e.currentTarget.style.transform = "scale(1.15)"}
              onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
            >
              <span style={{ fontSize: 18, color: iconColor, lineHeight: 1 }}>{icon}</span>
            </div>
          </div>;
        })()}

        {/* Tutorial tip cards */}
        {tutorialOn && gs && !aiThinking && (() => {
          const extra = {
            selectedUnitNearEnemy: sud && op && op.units.some(eu => hexDist(sud.hexCol, sud.hexRow, eu.hexCol, eu.hexRow) <= (sud.def?.range || 1)),
            hasSettlerSelected: sud?.unitType === "settler",
          };
          const activeTip = TUTORIAL_TIPS.find(tip => !tutorialDismissed[tip.id] && tip.trigger(gs, tutorialDismissed, extra));
          if (!activeTip) return null;
          const posStyles = {
            center: { top: "50%", left: "50%", transform: "translate(-50%, -50%)" },
            top: { top: 100, left: "50%", transform: "translateX(-50%)" },
            bottom: { bottom: 80, left: "50%", transform: "translateX(-50%)" },
          };
          const pos = posStyles[activeTip.position] || posStyles.center;
          return (
            <div style={{ position: "absolute", ...pos, zIndex: 35, pointerEvents: "auto", background: "rgba(12, 18, 8, .96)", border: "1px solid rgba(120, 170, 60, .5)", borderRadius: 10, padding: "16px 22px", color: "#b8d098", maxWidth: 340, minWidth: 240, boxShadow: "0 4px 24px rgba(0,0,0,.5), 0 0 20px rgba(80,120,40,.15)", fontFamily: "'Palatino Linotype', serif" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 20 }}>{activeTip.icon}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#d0e8a0", letterSpacing: 1.5 }}>{activeTip.title}</span>
              </div>
              <div style={{ fontSize: 11, lineHeight: 1.5, color: "#98b078", marginBottom: 12 }}>{activeTip.body}</div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <button onClick={() => setTutorialDismissed(prev => ({ ...prev, [activeTip.id]: true }))}
                  style={{ padding: "5px 14px", borderRadius: 5, fontSize: 10, cursor: "pointer", border: "1px solid rgba(120,170,60,.5)", background: "rgba(100,160,50,.35)", color: "#d0e8a0", fontFamily: "inherit", letterSpacing: 1 }}>
                  Got it
                </button>
                <span onClick={() => setTutorialOn(false)} style={{ fontSize: 9, color: "#5a6a4a", cursor: "pointer", textDecoration: "underline" }}>Skip all tips</span>
              </div>
            </div>
          );
        })()}

        {/* Minimap */}
        <div style={{ position: "absolute", bottom: 175, right: 14, zIndex: 15, background: "rgba(10,14,6,.92)", border: "1px solid rgba(100,140,50,.4)", borderRadius: 6, padding: 4, pointerEvents: "auto" }} onMouseDown={e => e.stopPropagation()}>
          <canvas ref={minimapRef} width={MINIMAP_W} height={MINIMAP_H}
            onMouseDown={onMinimapDown} onMouseMove={onMinimapMove} onMouseUp={onMinimapUp} onMouseLeave={onMinimapUp}
            style={{ display: "block", cursor: "crosshair", borderRadius: 3, border: "1px solid rgba(100,140,50,.2)" }}/>
          <div style={{ fontSize: 7, color: "#5a6a40", marginTop: 2, textAlign: "center", letterSpacing: 2 }}>MINIMAP</div>
        </div>

      </div>{/* close UI overlay */}
    </div>
  );
}

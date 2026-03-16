import React, { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { HEX_SIZE, SQRT3, COLS, ROWS, hexCenter, hexAt, getNeighbors, hexDist, getHexesInRadius, EVEN_COL_NEIGHBORS, ODD_COL_NEIGHBORS } from './data/constants.js';
import { TECH_TREE } from './data/techs.js';
import { UNIT_DEFS } from './data/units.js';
import { CIV_DEFS } from './data/civs.js';
import { calcCombatPreview } from './engine/combat.js';
import { calcPlayerIncome, canUpgradeUnit } from './engine/economy.js';
import { getMoveBlockReason, getReachableHexes, getRangedTargets, getVisibleHexes, isHexOccupied } from './engine/movement.js';
import { processResearchAndIncome, processCityTurn, expandTerritory, refreshUnits, spawnBarbarians, processBarbarians, rollRandomEvent, addLogMsg } from './engine/turnProcessing.js';
import { checkVictoryState } from './engine/victory.js';
import { createInitialState } from './engine/gameInit.js';
import { aiExecuteTurn } from './ai/aiEngine.js';
import { SFX } from './sfx.js';
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

let uidCtr = 0;

export default function HexStrategyGame(){
  const[gameMode,setGameMode]=useState(null); // null | "local" | "ai"
  const[mapSizePick,setMapSizePick]=useState(null); // null | "small" | "medium" | "large"
  const[playerSlots,setPlayerSlots]=useState(()=>Array.from({length:MAX_PLAYERS-1},()=>({type:"ai",difficulty:"normal"})));
  const[lobbyDone,setLobbyDone]=useState(false);
  const[civPicks,setCivPicks]=useState({p1:"Rome"});
  const[civPickStep,setCivPickStep]=useState(1); // which human picker is choosing
  const[gameStarted,setGameStarted]=useState(false);
  const[gs,setGs]=useState(null);
  const[hovH,setHovH]=useState(null);
  const[selH,setSelH]=useState(null);
  const[selU,setSelU]=useState(null);
  const[showTech,setShowTech]=useState(false);
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
  const[tutorialDismissed,setTutorialDismissed]=useState({}); // keyed by tip id
  const[techCollapsed,setTechCollapsed]=useState(false);
  const[cityCollapsed,setCityCollapsed]=useState(false);
  const[turnPopups,setTurnPopups]=useState([]); // [{id,type,title,body,action}] turn-start popups
  const[eventPopup,setEventPopup]=useState(null); // random event popup {id,name,desc}
  const turnPopupShownRef=useRef(null); // tracks which turn+player combo we've shown popups for
  const victoryPlayed=useRef(false);
  const prevCpId=useRef(null);

  // Derived state (safe when gs is null)
  const hexes=gs?.hexes||[];
  const players=gs?.players||[];
  const turnNumber=gs?.turnNumber||1;
  const cpId=gs?.currentPlayerId||"p1";
  const phase=gs?.phase||"MOVEMENT";
  const log=gs?.log||[];
  const barbarians=gs?.barbarians||[];
  const cp=players.find(p=>p.id===cpId)||{units:[],cities:[],researchedTechs:[],civilization:"Rome",name:"",color:"#888",colorBg:"#444",colorLight:"#aaa",gold:0,science:0};
  const enemies=players.filter(p=>p.id!==cpId);
  const op=enemies[0]; // legacy compat — prefer enemies array
  const inc=useMemo(()=>gs?calcPlayerIncome(cp,hexes):{food:0,production:0,science:0,gold:0},[cp,hexes,gs]);
  const visData=useMemo(()=>hexes.map(h=>{const grass=genGrass(h.id);return{blades:grass.blades,flowers:grass.flowers,rocks:grass.rocks,detail:genDetail(h.id),trees:h.terrainType==="forest"?genTrees(h.id):{trunks:"",canopy:"",undergrowth:""},mtns:h.terrainType==="mountain"?genMtns(h.id):{peaks:"",snow:"",shadow:"",rocks:""},waves:h.terrainType==="water"?genWaves(h.id):{waves:"",foam:"",shimmer:""},coast:genCoast(h,hexes),waterCoast:genWaterCoast(h,hexes)};}),[hexes]);
  const cityMap=useMemo(()=>{const m={};players.forEach(p=>p.cities.forEach(c=>{m[c.hexId]={city:c,player:p};}));return m;},[players]);
  const unitMap=useMemo(()=>{const m={};
    players.forEach(p=>p.units.forEach(u=>{const k=`${u.hexCol},${u.hexRow}`;if(!m[k])m[k]=[];m[k].push({...u,pid:p.id,pCol:p.color,pBg:p.colorBg,pLight:p.colorLight});}));
    barbarians.forEach(b=>{const k=`${b.hexCol},${b.hexRow}`;if(!m[k])m[k]=[];m[k].push({...b,pid:"barb",pCol:"#c05050",pBg:"#4a1010",pLight:"#ff8080"});});
    return m;},[players,barbarians]);
  const fogVisible=useMemo(()=>gs?getVisibleHexes(cp,hexes):new Set(),[cp,hexes,gs]);
  const fogExplored=useMemo(()=>{if(!gs)return new Set();return new Set(gs.explored?.[cpId]||[]);},[gs,cpId]);
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

  // Pan/zoom
  const MINIMAP_W=160,MINIMAP_H=140;
  const wW=COLS*1.5*HEX_SIZE+HEX_SIZE*2+100,wH=ROWS*SQRT3*HEX_SIZE+SQRT3*HEX_SIZE+100;
  const { panRef, zoomRef, isPanRef, gRef, svgRef, gameContainerRef, uiOverlayRef, minimapRenderRef, flush, sched, onMD, onMM, onMU, onWh } = usePanZoom({ wW, wH });
  // Panel drag
  const { techPosRef, cityPosRef, onPanelDown, onPanelMove, onPanelUp } = usePanelDrag();
  // Minimap
  const { minimapRef, onMinimapDown, onMinimapMove, onMinimapUp } = useMinimap({ hexes, fogVisible, fogExplored, players, gs, wW, wH, MINIMAP_W, MINIMAP_H, minimapRenderRef, zoomRef, panRef, sched });
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
  useEffect(()=>{if(Object.keys(flashes).length>0){const t=setTimeout(()=>setFlashes({}),800);return()=>clearTimeout(t);}},[flashes]);
  useEffect(()=>{if(combatAnims.length>0){const t=setTimeout(()=>setCombatAnims([]),1200);return()=>clearTimeout(t);}},[combatAnims]);
  useEffect(()=>{if(moveMsg){const t=setTimeout(()=>setMoveMsg(null),1500);return()=>clearTimeout(t);}},[moveMsg]);
  // Update explored set when fog visibility changes
  useEffect(()=>{if(!gs||fogVisible.size===0)return;
    setGs(prev=>{if(!prev)return prev;const ex=prev.explored||{};const cur=ex[cpId]||[];const s=new Set(cur);let changed=false;
      for(const k of fogVisible){if(!s.has(k)){s.add(k);changed=true;}}
      if(!changed)return prev;return{...prev,explored:{...ex,[cpId]:[...s]}};});
  },[fogVisible,cpId]);

  // addLog and checkVictory delegate to module-level pure functions
  const addLog=addLogMsg;
  const checkVictory=checkVictoryState;

  // === NUKE ===
  const launchNuke=useCallback((nuId,tc,tr)=>{
    setGs(prev=>{const g=JSON.parse(JSON.stringify(prev));const aP=g.players.find(p=>p.id===g.currentPlayerId);
      const ni=aP.units.findIndex(u=>u.id===nuId);if(ni===-1)return prev;aP.units.splice(ni,1);
      // Fighter interception: any enemy fighter within 2 hexes of target can intercept
      const allEnemyUnits=g.players.filter(p=>p.id!==g.currentPlayerId).flatMap(p=>p.units);
      const interceptor=allEnemyUnits.find(u=>{
        if(u.unitType!=="fighter"&&u.unitType!=="jet_fighter")return false;
        const dist=hexDist(u.hexCol,u.hexRow,tc,tr);
        return dist<=2;
      });
      if(interceptor){
        addLog(`\u2708 ${UNIT_DEFS[interceptor.unitType]?.name||"Fighter"} intercepts nuke at (${tc},${tr})!`,g);
        interceptor.hasAttacked=true;interceptor.movementCurrent=0;
        const fl={};fl[`${tc},${tr}`]="combat";setFlashes(fl);
        SFX.combat();return g;
      }
      const blast=getHexesInRadius(tc,tr,1,g.hexes);const fl={};
      for(const bh of blast){const k=`${bh.col},${bh.row}`;fl[k]="nuke";
        // Kill all units in blast (all players — friendly fire)
        for(const p of g.players){p.units=p.units.filter(u=>!(u.hexCol===bh.col&&u.hexRow===bh.row));}
        g.barbarians=(g.barbarians||[]).filter(b=>!(b.hexCol===bh.col&&b.hexRow===bh.row));
        // Damage cities of any enemy player
        for(const p of g.players.filter(pp=>pp.id!==g.currentPlayerId)){
          const dc=p.cities.find(c=>{const h=g.hexes[c.hexId];return h&&h.col===bh.col&&h.row===bh.row;});
          if(dc){dc.hp=1;addLog(`\u2622 ${dc.name} hit! (${dc.hp}HP)`,g);}
        }}
      addLog(`\u2622 NUCLEAR STRIKE at (${tc},${tr})!`,g);setFlashes(fl);checkVictory(g);return g;});
    setNukeM(null);setSelU(null);SFX.nuke();
  },[]);

  // === COMBAT ===
  // Try to capture a city after killing its garrison (or attacking it directly)
  const tryCaptureCity = (city, attackerPlayer, defenderPlayer, hex, g) => {
    defenderPlayer.cities = defenderPlayer.cities.filter(c => c.id !== city.id);
    city.hp = 10;
    city.hpMax = 20;
    city.captured = true; // Track for Ottoman bonus
    attackerPlayer.cities.push(city);
    if (hex) hex.ownerPlayerId = attackerPlayer.id;
    return `🏛${city.name} captured!`;
  };

  const doCombat = useCallback((attackerId, defCol, defRow) => {
    setGs(prev => {
      const g = JSON.parse(JSON.stringify(prev));
      const attPlayer = g.players.find(p => p.id === g.currentPlayerId);
      const allEnemies = g.players.filter(p => p.id !== g.currentPlayerId);

      const attUnit = attPlayer.units.find(u => u.id === attackerId);
      if (!attUnit) return prev;
      const attDef = UNIT_DEFS[attUnit.unitType];

      // Find what we're attacking across ALL enemies: enemy unit, barbarian, or undefended city
      let defUnit = null, defPlayer = null;
      for (const ep of allEnemies) {
        const found = ep.units.find(u => u.hexCol === defCol && u.hexRow === defRow);
        if (found) { defUnit = found; defPlayer = ep; break; }
      }
      if (!g.barbarians) g.barbarians = [];
      const barbUnit = g.barbarians.find(b => b.hexCol === defCol && b.hexRow === defRow);
      let defCity = null;
      if (!defPlayer) {
        // Find city owner
        for (const ep of allEnemies) {
          const found = ep.cities.find(c => { const h = g.hexes[c.hexId]; return h.col === defCol && h.row === defRow; });
          if (found) { defCity = found; defPlayer = ep; break; }
        }
      } else {
        defCity = defPlayer.cities.find(c => { const h = g.hexes[c.hexId]; return h.col === defCol && h.row === defRow; });
      }
      if (!defPlayer) defPlayer = allEnemies[0]; // fallback for barbarian combat
      const defHex = hexAt(g.hexes, defCol, defRow);
      const flashKey = `${defCol},${defRow}`;

      const defender = defUnit || barbUnit;

      if (defender) {
        // --- Unit vs unit combat ---
        const defDef = UNIT_DEFS[defender.unitType];
        const defOwner = defUnit ? defPlayer : { researchedTechs: [], civilization: "Barbarian" };
        const preview = calcCombatPreview(attUnit, attDef, defender, defDef, defHex?.terrainType, attPlayer, defOwner, !!defCity);

        // Chu-Ko-Nu rapid shot: 1.5x attack damage
        const atkDmg = attDef.ability === "rapid_shot" ? Math.ceil(preview.aDmg * 1.5) : preview.aDmg;

        // Apply damage
        attUnit.hpCurrent = Math.max(0, attUnit.hpCurrent - preview.dDmg);
        defender.hpCurrent = Math.max(0, defender.hpCurrent - atkDmg);
        attUnit.hasAttacked = true;
        attUnit.movementCurrent = 0;

        let msg = `${attDef.name}→${barbUnit ? "Barb " : ""}${defDef.name}: ${atkDmg}dmg${attDef.ability === "rapid_shot" ? " (x1.5)" : ""}`;
        if (preview.dDmg > 0) msg += ` took ${preview.dDmg}`;

        // Defender killed (use actual HP after damage, not preview which doesn't account for rapid_shot)
        if (defender.hpCurrent <= 0) {
          if (defUnit) defPlayer.units = defPlayer.units.filter(u => u.id !== defUnit.id);
          if (barbUnit) { g.barbarians = g.barbarians.filter(b => b.id !== barbUnit.id); attPlayer.gold += 5; }
          msg += ` ☠${barbUnit ? "Barb +5💰 " : ""}${defDef.name}`;

          // Melee attacker advances into the hex
          if (attDef.range === 0 && !preview.atkDies && !isHexOccupied(defCol, defRow, g.players, g.barbarians, attUnit.id)) {
            attUnit.hexCol = defCol;
            attUnit.hexRow = defRow;
            attUnit.movementCurrent = 0;

            // Damage/capture city if garrison was killed
            if (defCity && defUnit) {
              defCity.hp = (defCity.hp || 20) - 5;
              if (defCity.hp <= 0) msg += ` ${tryCaptureCity(defCity, attPlayer, defPlayer, defHex, g)}`;
            }
            // Claim unclaimed barbarian hex
            if (barbUnit && defHex && !defHex.ownerPlayerId) defHex.ownerPlayerId = attPlayer.id;
          }
          // Jaguar Warrior heal on kill
          if (attDef.ability === "heal_on_kill" && attUnit.hpCurrent > 0) {
            const healAmt = Math.min(10, UNIT_DEFS[attUnit.unitType].hp - attUnit.hpCurrent);
            if (healAmt > 0) { attUnit.hpCurrent += healAmt; msg += ` 🐆+${healAmt}HP`; }
          }
        }

        // Attacker killed
        if (preview.atkDies) {
          attPlayer.units = attPlayer.units.filter(u => u.id !== attUnit.id);
          msg += ` ☠${attDef.name}`;
        }

        addLog(msg, g);

      } else if (defCity) {
        // --- Direct city bombardment (no garrison) ---
        let cityDmg = attDef.strength * 2;
        if (attDef.ability === "city_siege") cityDmg += 2; // Great Bombard bonus vs cities
        defCity.hp = (defCity.hp || 20) - cityDmg;
        attUnit.hasAttacked = true;
        attUnit.movementCurrent = 0;

        let msg = `${attDef.name}→${defCity.name} (${Math.max(0, defCity.hp)}HP)`;
        if (defCity.hp <= 0) {
          msg = `${attDef.name} ${tryCaptureCity(defCity, attPlayer, defPlayer, defHex, g)}`;
          if (attDef.range === 0 && !isHexOccupied(defCol, defRow, g.players, g.barbarians, attUnit.id)) { attUnit.hexCol = defCol; attUnit.hexRow = defRow; }
        }

        addLog(msg, g);
      }

      setFlashes({ [flashKey]: "combat" });
      // Spawn floating damage numbers
      const defPos=hexCenter(defCol,defRow);
      const anims=[];const now=Date.now();
      if(defender){
        const rawPv=calcCombatPreview(attUnit,attDef,defender,UNIT_DEFS[defender.unitType],defHex?.terrainType,attPlayer,defUnit?defPlayer:{researchedTechs:[],civilization:"Barbarian"},!!defCity);
        const atkDmgShow=attDef.ability==="rapid_shot"?Math.ceil(rawPv.aDmg*1.5):rawPv.aDmg;
        anims.push({id:now,x:defPos.x,y:defPos.y,dmg:atkDmgShow,color:"#ff4040",t:now});
        if(rawPv.dDmg>0){const attPos=hexCenter(attUnit.hexCol,attUnit.hexRow);anims.push({id:now+1,x:attPos.x,y:attPos.y,dmg:rawPv.dDmg,color:"#ff8040",t:now});}
      }else if(defCity){
        let cd2=attDef.strength*2;if(attDef.ability==="city_siege")cd2+=2;
        anims.push({id:now,x:defPos.x,y:defPos.y,dmg:cd2,color:"#ff4040",t:now});
      }
      if(anims.length>0)setCombatAnims(prev=>[...prev,...anims]);
      checkVictory(g);
      return g;
    });

    setSelU(null);
    setPreview(null);
    SFX.combat();
  }, []);

  // === END TURN (replaces old phase system) ===
  const endTurn = useCallback(() => {
    let sfxQ = [];

    setGs(prev => {
      const g = JSON.parse(JSON.stringify(prev));
      const currentPlayer = g.players.find(p => p.id === g.currentPlayerId);

      // 1. Process research & income for current player
      processResearchAndIncome(currentPlayer, g, sfxQ);
      // 2. Process all city turns (production, growth, healing)
      for (const city of currentPlayer.cities) processCityTurn(city, currentPlayer, g, sfxQ);
      // 3. Expand territory
      expandTerritory(currentPlayer, g);

      // 4. Advance to next player in sequence
      const curIdx = g.players.findIndex(p => p.id === g.currentPlayerId);
      const nextIdx = (curIdx + 1) % g.players.length;
      g.currentPlayerId = g.players[nextIdx].id;

      // 5. If we've looped back to p1, a full round is complete
      if (nextIdx === 0) {
        g.turnNumber++;
        spawnBarbarians(g);
        processBarbarians(g);
        rollRandomEvent(g);
      }

      // 6. Refresh next player's units and stay in MOVEMENT phase
      g.phase = "MOVEMENT";
      const nextPlayer = g.players[nextIdx];
      refreshUnits(nextPlayer, g);
      addLog(`Turn ${g.turnNumber} — ${nextPlayer.name}`, g);
      checkVictory(g);

      return g;
    });

    setSelU(null); setSelH(null); setSettlerM(null); setNukeM(null); setPreview(null);
    if (sfxQ.length > 0) sfxQ.forEach((s, i) => setTimeout(() => SFX[s]?.(), i * 150));
    // Reset popup tracker so turn-start popups fire for the new turn
    turnPopupShownRef.current=null;
  }, []);
  // Keep advPhase as alias for compatibility
  const advPhase = endTurn;

  // Keyboard shortcuts (must be after endTurn is defined)
  useKeyboardShortcuts({ sched, phase, cp, selU, setSelU, setSelH, setSettlerM, setNukeM, setPreview, panRef, endTurn, aiThinking, setShowTech, setShowCity, turnTransition, setTurnTransition });

  // --- AI auto-play: when it's an AI player's turn, execute AI and chain through consecutive AI turns ---
  useEffect(() => {
    if (!gs || gs.victoryStatus) return;
    const currentP = gs.players.find(p => p.id === gs.currentPlayerId);
    if (!currentP || currentP.type !== "ai") return;

    setAiThinking(true);

    const timer = setTimeout(() => {
      setGs(prev => {
        if (!prev) return prev;
        let state = prev;
        const curP = state.players.find(p => p.id === state.currentPlayerId);
        if (!curP || curP.type !== "ai") return prev;

        // Execute this AI's turn
        state = aiExecuteTurn(state);

        // Update explored hexes for this AI player
        const aiP = state.players.find(p => p.id === state.currentPlayerId);
        if (aiP) {
          const aiVis = getVisibleHexes(aiP, state.hexes);
          const aiEx = new Set(state.explored?.[aiP.id] || []);
          for (const k of aiVis) aiEx.add(k);
          state.explored = { ...state.explored, [aiP.id]: [...aiEx] };
        }

        // End AI's turn: advance to next player (research/income/cities already processed in aiExecuteTurn)
        const curIdx = state.players.findIndex(p => p.id === state.currentPlayerId);
        const nextIdx = (curIdx + 1) % state.players.length;
        state.currentPlayerId = state.players[nextIdx].id;

        if (nextIdx === 0) {
          state.turnNumber++;
          spawnBarbarians(state);
          processBarbarians(state);
          rollRandomEvent(state);
        }

        state.phase = "MOVEMENT";
        const nextPlayer = state.players[nextIdx];
        refreshUnits(nextPlayer, state);
        addLogMsg(`Turn ${state.turnNumber} — ${nextPlayer.name}`, state);
        checkVictoryState(state);

        return state;
      });

      setAiThinking(false);
      turnPopupShownRef.current=null;
    }, 600);

    return () => clearTimeout(timer);
  }, [gs?.currentPlayerId, gs?.turnNumber, gs?.victoryStatus]);

  // --- Turn transition screen for human players in games with multiple humans ---
  useEffect(() => {
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
  },[gs?.turnNumber,gs?.currentPlayerId,gs?.victoryStatus,turnTransition,gameMode]);

  // --- Player action callbacks ---

  const selResearch = useCallback((techId) => {
    SFX.click();
    setGs(prev => {
      const g = JSON.parse(JSON.stringify(prev));
      const player = g.players.find(p => p.id === g.currentPlayerId);
      player.currentResearch = { techId, progress: 0 };
      addLog(`${player.name} researching ${TECH_TREE[techId].name}`, g);
      return g;
    });
  }, []);

  const upgradeUnit=useCallback((unitId)=>{
    setGs(prev=>{
      const g=JSON.parse(JSON.stringify(prev));
      const player=g.players.find(p=>p.id===g.currentPlayerId);
      const unit=player.units.find(u=>u.id===unitId);
      if(!unit)return prev;
      const info=canUpgradeUnit(unit,player);
      if(!info)return prev;
      player.gold-=info.cost;
      const oldDef=UNIT_DEFS[unit.unitType];
      unit.unitType=info.toType;
      const newDef=UNIT_DEFS[info.toType];
      // Scale HP proportionally
      unit.hpCurrent=Math.ceil((unit.hpCurrent/oldDef.hp)*newDef.hp);
      unit.movementCurrent=0;unit.hasAttacked=true; // uses the turn
      addLog(`⬆ ${oldDef.name} upgraded to ${newDef.name} (-${info.cost}💰)`,g);
      return g;
    });
    SFX.click();
  },[]);

  const setProd = useCallback((cityId, type, itemId) => {
    setGs(prev => {
      const g = JSON.parse(JSON.stringify(prev));
      const city = g.players.find(p => p.id === g.currentPlayerId).cities.find(c => c.id === cityId);
      if (city) {
        city.currentProduction = { type, itemId };
        city.productionProgress = 0;
      }
      return g;
    });
  }, []);

  const moveU = useCallback((unitId, targetCol, targetRow, cost) => {
    let remaining = 0;
    setGs(prev => {
      const g = JSON.parse(JSON.stringify(prev));
      const unit = g.players.find(p => p.id === g.currentPlayerId).units.find(u => u.id === unitId);
      if (!unit) return prev;
      if (isHexOccupied(targetCol, targetRow, g.players, g.barbarians, unit.id)) return prev;
      unit.hexCol = targetCol;
      unit.hexRow = targetRow;
      unit.movementCurrent = Math.max(0, unit.movementCurrent - (cost || unit.movementCurrent));
      unit.hasMoved = true;
      remaining = unit.movementCurrent;
      return g;
    });
    if (remaining <= 0) setSelU(null);
    SFX.move();
  }, []);

  const foundCity = useCallback((unitId, col, row) => {
    setGs(prev => {
      const g = JSON.parse(JSON.stringify(prev));
      const player = g.players.find(p => p.id === g.currentPlayerId);
      const unitIdx = player.units.findIndex(u => u.id === unitId);
      if (unitIdx === -1) return prev;

      const hex = hexAt(g.hexes, col, row);
      if (!hex || hex.terrainType === "water" || hex.terrainType === "mountain" || hex.cityId) return prev;

      // Remove settler
      player.units.splice(unitIdx, 1);

      // Name the new city from the civ's name list
      const cityNum = player.cities.length + 1;
      const civNames = CIV_DEFS[player.civilization]?.cityNames || ["Colony"];
      const cityName = civNames[cityNum - 1] || `City ${cityNum}`;
      const cityId = `${player.id}-c${cityNum}`;

      player.cities.push({
        id: cityId, name: cityName, hexId: hex.id, population: 1,
        districts: [], currentProduction: null, productionProgress: 0,
        foodAccumulated: 0, hp: 20, hpMax: 20,
      });

      hex.cityId = cityId;
      hex.ownerPlayerId = player.id;

      // Claim adjacent unclaimed land
      for (const [nc, nr] of getNeighbors(col, row)) {
        const neighbor = hexAt(g.hexes, nc, nr);
        if (neighbor && !neighbor.ownerPlayerId && neighbor.terrainType !== "water") {
          neighbor.ownerPlayerId = player.id;
        }
      }

      addLog(`${player.name} founded ${cityName}!`, g);
      return g;
    });
    setSettlerM(null);
    setSelU(null);
    SFX.found();
  }, []);

  // === RENDER HEXES (memoized) ===
  // Helper: find hex from SVG event via data attributes
  const findHexFromEvent=useCallback(e=>{const el=e.target.closest("[data-hex]");if(!el)return null;
    const id=+el.dataset.hex,col=+el.dataset.col,row=+el.dataset.row;
    return{id,col,row,hex:hexes[id],uk:`${col},${row}`};},[hexes]);

  // Delegated event handlers (single set on parent <g>, not per-hex)
  const onHexHover=useCallback(e=>{
    const h=findHexFromEvent(e);if(!h||isPanRef.current)return;
    const{hex,uk}=h;const fogged=!fogVisible.has(uk);if(fogged){if(hovH!=null){setHovH(null);setPreview(null);}return;}
    if(hovH!==hex.id)setHovH(hex.id);
    // Combat preview on hover
    if(selU&&phase==="MOVEMENT"&&sud){
      const uH=unitMap[uk]||[];const eU=uH.filter(u=>u.pid!==cpId);const cE=cityMap[hex.id];
      const hasTgt=eU.length>0||(cE&&cE.player.id!==cpId);
      const inMelee2=sud.def?.range===0&&!sud.hasAttacked&&hexDist(sud.hexCol,sud.hexRow,hex.col,hex.row)<=1&&hasTgt;
      const inRng2=sud.def?.range>0&&!sud.hasAttacked&&atkRange.has(uk)&&hasTgt;
      if((inMelee2||inRng2)&&eU.length>0){const eu=eU[0];
        const dP=eu.pid==="barb"?{researchedTechs:[],civilization:"Barbarian"}:players.find(p=>p.id===eu.pid);
        const pv=calcCombatPreview(sud,sud.def,eu,UNIT_DEFS[eu.unitType],hex.terrainType,cp,dP,!!(cE&&cE.player.id!==cpId));
        const effADmg=sud.def.ability==="rapid_shot"?Math.ceil(pv.aDmg*1.5):pv.aDmg;
        setPreview({...pv,aDmg:effADmg,an:sud.def.name,dn:UNIT_DEFS[eu.unitType]?.name,ahp:sud.hpCurrent,dhp:eu.hpCurrent,rapidShot:sud.def.ability==="rapid_shot"});
      }else setPreview(null);
    }else setPreview(null);
  },[findHexFromEvent,fogVisible,hovH,selU,phase,sud,unitMap,cityMap,cpId,reach,atkRange,players,cp]);

  const onHexLeave=useCallback(()=>{setHovH(null);setPreview(null);},[]);

  const onHexClick=useCallback(e=>{
    e.stopPropagation();const h=findHexFromEvent(e);if(!h||isPanRef.current)return;
    const{hex,uk}=h;if(!fogVisible.has(uk))return;
    const uH=unitMap[uk]||[];const myU=uH.filter(u=>u.pid===cpId);
    const eU=uH.filter(u=>u.pid!==cpId);const cE=cityMap[hex.id];const isMy=myU.length>0;
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
  },[findHexFromEvent,fogVisible,unitMap,cityMap,cpId,selU,nukeM,nukeR,settlerM,phase,selH,reach,moveCostMap,sud,launchNuke,foundCity,doCombat,moveU]);

  const onHexCtx=useCallback(e=>{
    e.preventDefault();e.stopPropagation();if(isPanRef.current||phase!=="MOVEMENT")return;
    const h=findHexFromEvent(e);if(!h)return;const{hex,uk}=h;
    const uH=unitMap[uk]||[];const myU=uH.filter(u=>u.pid===cpId);
    const eU=uH.filter(u=>u.pid!==cpId);const cE=cityMap[hex.id];
    const uSel2=selU&&myU.some(u=>u.id===selU);
    const hasTgt=eU.length>0||(cE&&cE.player.id!==cpId);
    const inMv=selU&&!uSel2&&reach.has(uk)&&eU.length===0&&!(cE&&cE.player.id!==cpId);
    const inMelee=selU&&sud&&sud.def?.range===0&&!sud.hasAttacked&&hexDist(sud.hexCol,sud.hexRow,hex.col,hex.row)<=1&&!uSel2&&hasTgt;
    const inRng=selU&&sud&&sud.def?.range>0&&!sud.hasAttacked&&atkRange.has(uk)&&!uSel2&&hasTgt;
    if(selU&&(inMelee||inRng)){doCombat(selU,hex.col,hex.row);return;}
    if(selU&&inMv){moveU(selU,hex.col,hex.row,moveCostMap[uk]);return;}
    if(selU&&!uSel2){const blk=getMoveBlockReason(hex,sud,sud?.def,reach,atkRange,phase,cpId,players);
      if(blk){setMoveMsg(blk);setFlashes(prev=>({...prev,[uk]:"blocked"}));}}
  },[findHexFromEvent,phase,unitMap,cityMap,cpId,selU,sud,reach,atkRange,moveCostMap,doCombat,moveU,players]);

  const renderAll=useCallback(()=>hexes.map((hex,i)=>{
    const uk=hex.uk;
    const isVisible=fogVisible.has(uk);
    const isExplored2=fogExplored.has(uk);
    const fogged=!isVisible;
    const uH=unitMap[uk]||[];const myU=uH.filter(u=>u.pid===cpId);
    const eU=uH.filter(u=>u.pid!==cpId);const cE=cityMap[hex.id];const isMy=myU.length>0;
    const uSel=selU&&isMy&&myU.some(u=>u.id===selU);
    const hasTgt=eU.length>0||(cE&&cE.player.id!==cpId);
    const inMv=selU&&!uSel&&reach.has(uk)&&phase==="MOVEMENT"&&eU.length===0&&!(cE&&cE.player.id!==cpId);
    const inMelee=selU&&phase==="MOVEMENT"&&sud&&sud.def?.range===0&&!sud.hasAttacked&&hexDist(sud.hexCol,sud.hexRow,hex.col,hex.row)<=1&&!uSel&&hasTgt;
    const inRng=selU&&phase==="MOVEMENT"&&sud&&sud.def?.range>0&&!sud.hasAttacked&&atkRange.has(uk)&&!uSel&&hasTgt;
    const inNk=nukeM&&nukeR.has(uk);
    const canA=phase==="MOVEMENT"&&isMy&&myU.some(u=>actable.has(u.id));
    const ownerP=hex.ownerPlayerId?players.find(p=>p.id===hex.ownerPlayerId):null;
    const blkReason=selU&&phase==="MOVEMENT"&&sud&&!uSel&&!fogged?getMoveBlockReason(hex,sud,sud.def,reach,atkRange,phase,cpId,players):null;

    return <MemoHex key={hex.id} hex={hex} vis={visData[i]}
      isHovered={hovH===hex.id} isSelected={selH===hex.id} inMoveRange={inMv} inAttackRange={!!(inMelee||inRng)} inNukeRange={!!inNk}
      unitSelected={!!uSel} units={fogged?null:uH} unitCount={fogged?0:uH.length}
      city={fogged?null:(cE?.city||null)} player={cE?.player||ownerP} settlerMode={!!settlerM} canAct={!!canA} flash={flashes[uk]||null} isFogged={fogged} isExplored={isExplored2} blockReason={blkReason}/>;
  }),[hexes,hovH,selH,visData,unitMap,cityMap,selU,reach,atkRange,sud,cpId,phase,players,settlerM,actable,nukeM,nukeR,flashes,fogVisible,fogExplored]);

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
      if(!hex.cityBorderId)continue;
      const ownerP=hex.ownerPlayerId?players.find(p=>p.id===hex.ownerPlayerId):null;
      if(!ownerP)continue;
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
        return !nh||nh.cityBorderId!==hex.cityBorderId;
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
        result.push({key:`${hex.id}-${si}`,x:hex.x,y:hex.y,pts:segments[si],color:ownerP.color});
      }
    }
    return result;
  },[hexes,players,fogVisible,fogExplored]);

  // Tooltip overlay data (rendered above all hexes)
  const tooltipData=useMemo(()=>{
    if(hovH==null||!selU||phase!=="MOVEMENT"||!sud)return null;
    const hex=hexes.find(h2=>h2.id===hovH);if(!hex)return null;
    const uk2=hex.uk;const fogged=!fogVisible.has(uk2);if(fogged)return null;
    const uH=unitMap[uk2]||[];const myU=uH.filter(u=>u.pid===cpId);
    const uSel=myU.some(u=>u.id===selU);if(uSel)return null;
    const blk=getMoveBlockReason(hex,sud,sud.def,reach,atkRange,phase,cpId,players);
    if(!blk)return null;
    return{x:hex.x,y:hex.y,text:blk};
  },[hovH,selU,phase,sud,hexes,fogVisible,unitMap,cpId,reach,atkRange,players]);

  const tCounts=useMemo(()=>{const c={grassland:0,forest:0,mountain:0,water:0};hexes.forEach(h=>c[h.terrainType]++);return c;},[hexes]);
  const landOwned=useMemo(()=>{const o={};players.forEach(p=>{o[p.id]=hexes.filter(h=>h.ownerPlayerId===p.id).length;});return o;},[hexes,players]);
  const totalLand=useMemo(()=>hexes.filter(h=>h.terrainType!=="water").length,[hexes]);

  // === MODE SELECTION SCREEN ===
  if(!gameMode){
    return <ModeSelectScreen setGameMode={setGameMode}/>;
  }

  // === MAP SIZE SELECTION SCREEN ===
  if(gameMode&&!mapSizePick){
    return <MapSizeScreen setMapSizePick={setMapSizePick} setGameMode={setGameMode}/>;
  }

  // === LOBBY SCREEN (configure player slots) ===
  if(mapSizePick&&!lobbyDone){
    return <LobbyScreen gameMode={gameMode} mapSizePick={mapSizePick} playerSlots={playerSlots} setPlayerSlots={setPlayerSlots} onStart={()=>{SFX.click();setLobbyDone(true);}} onBack={()=>{setMapSizePick(null);}}/>;
  }

  // === CIV SELECTION SCREEN ===
  if(!gameStarted||!gs){
    return <CivSelectScreen gameMode={gameMode} playerSlots={playerSlots} civPicks={civPicks} setCivPicks={setCivPicks} civPickStep={civPickStep} setCivPickStep={setCivPickStep} setGs={setGs} setGameStarted={setGameStarted} onBack={()=>{setLobbyDone(false);setCivPickStep(1);}}/>;
  }

  // Turn transition screen (hotseat: hide board between turns)
  if(turnTransition){
    return <TurnTransitionScreen turnTransition={turnTransition} turnNumber={turnNumber} onReady={() => setTurnTransition(null)}/>;
  }

  // Victory
  if(gs.victoryStatus){if(!victoryPlayed.current){victoryPlayed.current=true;SFX.victory();}
    const onNewGame=()=>{uidCtr=0;setGs(null);setGameStarted(false);setGameMode(null);setMapSizePick(null);setLobbyDone(false);setPlayerSlots(Array.from({length:MAX_PLAYERS-1},()=>({type:"ai",difficulty:"normal"})));setCivPicks({p1:"Rome"});setSelU(null);setSelH(null);setAiThinking(false);setTutorialOn(true);setTutorialDismissed({});victoryPlayed.current=false;techPosRef.current={x:null,y:95};cityPosRef.current={x:null,y:95};setTechCollapsed(false);setCityCollapsed(false);setCivPickStep(1);setTurnTransition(null);setTurnPopups([]);turnPopupShownRef.current=null;prevCpId.current=null;gameCenteredRef.current=false;};
    return <VictoryScreen gs={gs} players={players} turnNumber={turnNumber} onNewGame={onNewGame}/>;}

  return(
    <div ref={gameContainerRef} onMouseMove={onPanelMove} onMouseUp={onPanelUp} style={{width:"100vw",height:"100vh",background:"linear-gradient(145deg,#0a0e06 0%,#141e0c 40%,#0e1608 100%)",overflow:"hidden",position:"relative",userSelect:"none",touchAction:"none",fontFamily:"'Palatino Linotype','Book Antiqua',Palatino,serif"}}>

      {/* === MAP LAYER (below UI) === */}
      <svg ref={svgRef} onMouseDown={onMD} onMouseMove={onMM} onMouseUp={onMU} onMouseLeave={onMU} onWheel={onWh} onContextMenu={e=>e.preventDefault()} style={{cursor:"grab",position:"absolute",top:0,left:0,width:"100%",height:"100%",zIndex:1}}>
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
        <g ref={gRef} style={{willChange:"transform"}} onMouseMove={onHexHover} onMouseLeave={onHexLeave} onClick={onHexClick} onContextMenu={onHexCtx}>{renderAll()}
          {/* City border overlay — rendered after all hexes so borders are never covered */}
          {borderOverlay.map(b=><g key={b.key} transform={`translate(${b.x},${b.y})`} style={{pointerEvents:"none"}}><polyline points={b.pts.map(p=>`${p.x},${p.y}`).join(" ")} fill="none" stroke={b.color} strokeWidth={4} strokeLinejoin="round" strokeLinecap="round" opacity={0.8}/></g>)}
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
      </svg>

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
      <ActionBar showTech={showTech} setShowTech={setShowTech} showSaveLoad={showSaveLoad} setShowSaveLoad={setShowSaveLoad} tutorialOn={tutorialOn} setTutorialOn={setTutorialOn} setTutorialDismissed={setTutorialDismissed} sud={sud} selU={selU} settlerM={settlerM} setSettlerM={setSettlerM} nukeM={nukeM} setNukeM={setNukeM} upgradeUnit={upgradeUnit} cp={cp} actable={actable}/>

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

      {/* City panel */}
      {showCity&&(()=>{const city=cp.cities.find(c=>c.id===showCity);if(!city)return null;
        const cancelProduction=(cityId)=>{setGs(prev=>{const g=JSON.parse(JSON.stringify(prev));const c=g.players.find(p=>p.id===g.currentPlayerId).cities.find(c2=>c2.id===cityId);if(c){c.currentProduction=null;c.productionProgress=0;}return g;});};
        return <CityPanel city={city} cp={cp} hexes={hexes} cityPosRef={cityPosRef} cityCollapsed={cityCollapsed} setCityCollapsed={setCityCollapsed} setShowCity={setShowCity} onPanelDown={onPanelDown} setProd={setProd} cancelProduction={cancelProduction}/>;})()}

      {/* Legend */}
      <Legend tCounts={tCounts}/>

      {/* Log */}
      <LogPanel log={log}/>

      {/* Bottom info */}
      <BottomInfo selH={selH} hexes={hexes} unitMap={unitMap} players={players} settlerM={settlerM} setSettlerM={setSettlerM} nukeM={nukeM} setNukeM={setNukeM} moveMsg={moveMsg}/>

      {/* AI thinking overlay */}
      {aiThinking&&<div style={{position:"absolute",inset:0,zIndex:40,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(5,8,3,.6)",pointerEvents:"all"}}><div style={{background:"rgba(15,20,10,.95)",border:"2px solid rgba(100,140,50,.5)",borderRadius:12,padding:"24px 40px",textAlign:"center",boxShadow:"0 0 40px rgba(80,120,40,.2)"}}><div style={{fontSize:28,marginBottom:8,animation:"pulse 1.5s ease-in-out infinite"}}>🤖</div><div style={{color:"#c8d8a0",fontSize:16,fontWeight:600,letterSpacing:3}}>AI is thinking...</div><div style={{color:"#8a9a70",fontSize:12,marginTop:6}}>The AI plots its next move</div></div></div>}

      {/* Random event popup */}
      <EventPopup event={eventPopup} onDismiss={() => setEventPopup(null)}/>

      {/* Turn-start popup queue */}
      <NotificationCircles turnPopups={turnPopups} setTurnPopups={setTurnPopups} setShowTech={setShowTech} setShowCity={setShowCity}/>

      {/* Tutorial tip cards */}
      <TutorialTips gs={gs} sud={sud} op={op} aiThinking={aiThinking} tutorialOn={tutorialOn} tutorialDismissed={tutorialDismissed} setTutorialDismissed={setTutorialDismissed} setTutorialOn={setTutorialOn}/>

      {/* Minimap */}
      <MinimapDisplay minimapRef={minimapRef} MINIMAP_W={MINIMAP_W} MINIMAP_H={MINIMAP_H} onMinimapDown={onMinimapDown} onMinimapMove={onMinimapMove} onMinimapUp={onMinimapUp}/>

      </div>{/* close UI overlay */}
    </div>
  );
}

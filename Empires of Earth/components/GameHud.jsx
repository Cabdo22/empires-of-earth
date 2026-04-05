import React from "react";
import { btnStyle } from "../styles.js";
import { PlayerPanel } from "./PlayerPanel.jsx";
import { ActionBar } from "./ActionBar.jsx";
import { Legend } from "./Legend.jsx";
import { LogPanel } from "./LogPanel.jsx";
import { BottomInfo } from "./BottomInfo.jsx";
import { MinimapDisplay } from "./MinimapDisplay.jsx";

export function GameHud({ controller }) {
  const {
    uiOverlayRef,
    turnNumber,
    cp,
    endTurn,
    landOwned,
    totalLand,
    barbarians,
    showTech,
    setShowTech,
    showDiplomacy,
    setShowDiplomacy,
    showSaveLoad,
    setShowSaveLoad,
    tutorialOn,
    setTutorialOn,
    setTutorialDismissed,
    effectivePerformanceMode,
    setPerformanceModeTouched,
    setPerformanceMode,
    rendererMode,
    setRendererMode,
    sud,
    selU,
    settlerM,
    setSettlerM,
    nukeM,
    setNukeM,
    upgradeUnit,
    actable,
    tCounts,
    log,
    viewPlayerId,
    gs,
    selH,
    hexes,
    unitMap,
    players,
    moveMsg,
    buildRoad,
    aiThinking,
    onlineMode,
    minimapVisible,
    minimapRef,
    MINIMAP_W,
    MINIMAP_H,
    onMinimapDown,
    onMinimapMove,
    onMinimapUp,
  } = controller;

  return (
    <div ref={uiOverlayRef} style={{position:"fixed",top:0,left:0,width:"100vw",height:"100vh",zIndex:10,pointerEvents:"none"}}>
      <div style={{position:"absolute",top:0,left:0,right:0,height:50,background:"linear-gradient(180deg,rgba(10,14,6,.95) 0%,rgba(10,14,6,0) 100%)",zIndex:10,display:"flex",alignItems:"flex-start",justifyContent:"center",paddingTop:8,pointerEvents:"none"}}>
        <div style={{textAlign:"center"}}><h1 style={{color:"#dce8c0",fontSize:20,fontWeight:600,letterSpacing:6,textTransform:"uppercase",margin:0}}>Empires of Earth</h1>
          <div style={{color:"#98aa78",fontSize:10,letterSpacing:3,marginTop:2}}>Turn {turnNumber} · {cp.name}</div></div></div>

      <div style={{position:"absolute",top:48,left:"50%",transform:"translateX(-50%)",zIndex:10,display:"flex",gap:6,alignItems:"center",background:"rgba(10,14,6,.85)",borderRadius:6,padding:"3px 8px",border:"1px solid rgba(100,140,50,.3)",pointerEvents:"auto"}}>
        <button onClick={endTurn} style={{...btnStyle(true),marginBottom:0,marginRight:0,fontSize:14,fontWeight:600,padding:"8px 24px",letterSpacing:1.5}}>End Turn →</button>
      </div>

      <PlayerPanel cp={cp} hexes={hexes} landOwned={landOwned} totalLand={totalLand} barbarians={barbarians}/>

      <ActionBar showTech={showTech} setShowTech={setShowTech} showDiplomacy={showDiplomacy} setShowDiplomacy={setShowDiplomacy} showSaveLoad={showSaveLoad} setShowSaveLoad={setShowSaveLoad} tutorialOn={tutorialOn} setTutorialOn={setTutorialOn} setTutorialDismissed={setTutorialDismissed} performanceMode={effectivePerformanceMode} setPerformanceMode={value=>{setPerformanceModeTouched(true);setPerformanceMode(value);}} rendererMode={rendererMode} setRendererMode={setRendererMode} sud={sud} selU={selU} settlerM={settlerM} setSettlerM={setSettlerM} nukeM={nukeM} setNukeM={setNukeM} upgradeUnit={upgradeUnit} cp={cp} actable={actable}/>

      <Legend tCounts={tCounts}/>
      <LogPanel log={log} currentPlayerId={viewPlayerId} currentPlayerTechs={cp.researchedTechs} gs={gs}/>
      <BottomInfo selH={selH} hexes={hexes} unitMap={unitMap} players={players} settlerM={settlerM} setSettlerM={setSettlerM} nukeM={nukeM} setNukeM={setNukeM} moveMsg={moveMsg} buildRoad={buildRoad} cp={cp} gs={gs} viewPlayerId={viewPlayerId}/>

      {aiThinking&&<div style={{position:"absolute",inset:0,zIndex:40,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(5,8,3,.6)",pointerEvents:"all"}}><div style={{background:"rgba(15,20,10,.95)",border:"2px solid rgba(100,140,50,.5)",borderRadius:12,padding:"24px 40px",textAlign:"center",boxShadow:"0 0 40px rgba(80,120,40,.2)"}}><div style={{fontSize:28,marginBottom:8,animation:"pulse 1.5s ease-in-out infinite"}}>🤖</div><div style={{color:"#c8d8a0",fontSize:16,fontWeight:600,letterSpacing:3}}>AI is thinking...</div><div style={{color:"#8a9a70",fontSize:12,marginTop:6}}>The AI plots its next move</div></div></div>}
      {onlineMode&&!onlineMode.isMyTurn&&!gs?.victoryStatus&&<div style={{position:"absolute",inset:0,zIndex:35,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(5,8,3,.4)",pointerEvents:"all"}}><div style={{background:"rgba(15,20,10,.95)",border:"2px solid rgba(100,140,50,.5)",borderRadius:12,padding:"24px 40px",textAlign:"center",boxShadow:"0 0 40px rgba(80,120,40,.2)"}}><div style={{fontSize:28,marginBottom:8}}>{"\u{1F551}"}</div><div style={{color:"#c8d8a0",fontSize:16,fontWeight:600,letterSpacing:3}}>Opponent's Turn</div><div style={{color:"#8a9a70",fontSize:12,marginTop:6}}>Waiting for your opponent to play...</div></div></div>}
      {onlineMode?.opponentDisconnected&&<div style={{position:"absolute",top:80,left:"50%",transform:"translateX(-50%)",zIndex:50,background:"rgba(120,40,20,.95)",border:"1px solid rgba(200,80,40,.6)",borderRadius:8,padding:"8px 20px",pointerEvents:"auto"}}><div style={{color:"#ffb090",fontSize:12,fontWeight:600,letterSpacing:1}}>Opponent Disconnected</div><div style={{color:"#ff9070",fontSize:9,marginTop:2}}>They may reconnect...</div></div>}
      {onlineMode?.error&&<div style={{position:"absolute",top:onlineMode.opponentDisconnected?130:80,left:"50%",transform:"translateX(-50%)",zIndex:50,background:"rgba(120,20,20,.95)",border:"1px solid rgba(200,40,40,.6)",borderRadius:8,padding:"6px 16px",pointerEvents:"auto"}}><div style={{color:"#ff6060",fontSize:11}}>{onlineMode.error}</div></div>}

      {minimapVisible && <MinimapDisplay minimapRef={minimapRef} MINIMAP_W={MINIMAP_W} MINIMAP_H={MINIMAP_H} onMinimapDown={onMinimapDown} onMinimapMove={onMinimapMove} onMinimapUp={onMinimapUp}/>}
    </div>
  );
}

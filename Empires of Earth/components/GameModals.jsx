import React from "react";
import { btnStyle, panelStyle } from "../styles.js";
import { TechTreePanel } from "./TechTreePanel.jsx";
import { CityPanel } from "./CityPanel.jsx";
import { CombatPreview } from "./CombatPreview.jsx";
import { DiplomacyPanel } from "./DiplomacyPanel.jsx";
import { EventPopup } from "./EventPopup.jsx";
import { LeaderMeetingScreen } from "./LeaderMeetingScreen.jsx";
import { NotificationCircles } from "./NotificationCircles.jsx";
import { TutorialTips } from "./TutorialTips.jsx";

export function GameModals({ controller }) {
  const {
    showSaveLoad,
    setShowSaveLoad,
    panelStyle: controllerPanelStyle,
    saveName,
    setSaveName,
    turnNumber,
    cp,
    gs,
    setGs,
    turnPopupShownRef,
    preview,
    showTech,
    techPosRef,
    techCollapsed,
    setTechCollapsed,
    setShowTech,
    onPanelDown,
    selResearch,
    showDiplomacy,
    players,
    cpId,
    knownPlayers,
    diplomacyRelations,
    tradePactBlockReasons,
    pendingIncoming,
    pendingOutgoing,
    openLeaderScene,
    declareWarAction,
    proposeDiplomacyAction,
    acceptProposalAction,
    rejectProposalAction,
    showCity,
    cityCollapsed,
    setCityCollapsed,
    setShowCity,
    setProd,
    cancelProduction,
    toggleTile,
    maximizeTiles,
    setTradeFocus,
    discoveredResources,
    eventPopup,
    setEventPopup,
    leaderScene,
    setLeaderScene,
    turnPopups,
    setTurnPopups,
    tutorialOn,
    tutorialDismissed,
    setTutorialDismissed,
    setTutorialOn,
    sud,
    op,
    aiThinking,
    hexes,
    cityPosRef,
  } = controller;

  const activeCity = showCity ? cp.cities.find(c => c.id === showCity) : null;

  return (
    <>
      {showSaveLoad && <div style={{ position: "absolute", inset: 0, zIndex: 40, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(5,8,3,.5)", pointerEvents: "all" }} onClick={e => { if (e.target === e.currentTarget) setShowSaveLoad(false); }}>
        <div style={{ ...(controllerPanelStyle || panelStyle), width: 360, maxHeight: 420, display: "flex", flexDirection: "column", zIndex: 41 }}>
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

      <CombatPreview preview={preview}/>
      {showTech&&<TechTreePanel cp={cp} techPosRef={techPosRef} techCollapsed={techCollapsed} setTechCollapsed={setTechCollapsed} setShowTech={setShowTech} onPanelDown={onPanelDown} selResearch={selResearch}/>}
      {showDiplomacy&&<DiplomacyPanel currentPlayer={players.find(p=>p.id===cpId)} knownPlayers={knownPlayers} relations={diplomacyRelations} tradePactBlockReasons={tradePactBlockReasons} pendingIncoming={pendingIncoming} pendingOutgoing={pendingOutgoing} onClose={()=>setShowDiplomacy(false)} onOpenLeader={(pid)=>openLeaderScene(pid,"diplomacy")} onDeclareWar={declareWarAction} onPropose={proposeDiplomacyAction} onAccept={acceptProposalAction} onReject={rejectProposalAction}/>}
      {activeCity && <CityPanel city={activeCity} cp={cp} hexes={hexes} cityPosRef={cityPosRef} cityCollapsed={cityCollapsed} setCityCollapsed={setCityCollapsed} setShowCity={setShowCity} onPanelDown={onPanelDown} setProd={setProd} cancelProduction={cancelProduction} toggleTile={toggleTile} maximizeTiles={maximizeTiles} setTradeFocus={setTradeFocus} allCities={cp.cities} discoveredResources={discoveredResources}/>}
      <EventPopup event={eventPopup} onDismiss={() => setEventPopup(null)}/>
      <LeaderMeetingScreen scene={leaderScene} onClose={() => setLeaderScene(null)} onDeclareWar={() => leaderScene && declareWarAction(leaderScene.playerId)} onOpenDiplomacy={() => { setLeaderScene(null); setShowDiplomacy(true); }}/>
      <NotificationCircles turnPopups={turnPopups} setTurnPopups={setTurnPopups} setShowTech={setShowTech} setShowCity={setShowCity}/>
      <TutorialTips gs={gs} sud={sud} op={op} aiThinking={aiThinking} tutorialOn={tutorialOn} tutorialDismissed={tutorialDismissed} setTutorialDismissed={setTutorialDismissed} setTutorialOn={setTutorialOn}/>
    </>
  );
}

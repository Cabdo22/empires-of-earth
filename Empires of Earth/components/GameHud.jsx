import React, { useMemo, useState } from "react";
import { TECH_TREE } from "../data/techs.js";
import { hudButtonStyle, hudChipStyle, hudPanelStyle, hudSectionLabelStyle } from "../styles.js";
import { PlayerPanel } from "./PlayerPanel.jsx";
import { ActionBar } from "./ActionBar.jsx";
import { Legend } from "./Legend.jsx";
import { LogPanel } from "./LogPanel.jsx";
import { BottomInfo } from "./BottomInfo.jsx";
import { MinimapDisplay } from "./MinimapDisplay.jsx";

const TAB_CONFIG = {
  empire: { label: "Empire", icon: "🏛" },
  commands: { label: "Commands", icon: "⚙" },
  terrain: { label: "Terrain", icon: "🗺" },
};

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
    savedGames,
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

  const [activeLeftTab, setActiveLeftTab] = useState("commands");
  const research = cp.currentResearch ? TECH_TREE[cp.currentResearch.techId] : null;
  const empireStatus = onlineMode ? (onlineMode.isMyTurn ? "Your turn" : "Waiting on opponent") : "Local command";
  const showCommandRibbon = !!sud;
  const activeTabContent = useMemo(() => {
    if (activeLeftTab === "empire") {
      return <PlayerPanel cp={cp} hexes={hexes} landOwned={landOwned} totalLand={totalLand} barbarians={barbarians} />;
    }
    if (activeLeftTab === "terrain") {
      return <Legend tCounts={tCounts} />;
    }
    if (activeLeftTab === "commands") {
      return (
        <ActionBar
          showTech={showTech}
          setShowTech={setShowTech}
          showDiplomacy={showDiplomacy}
          setShowDiplomacy={setShowDiplomacy}
          showSaveLoad={showSaveLoad}
          setShowSaveLoad={setShowSaveLoad}
          tutorialOn={tutorialOn}
          setTutorialOn={setTutorialOn}
          setTutorialDismissed={setTutorialDismissed}
          performanceMode={effectivePerformanceMode}
          setPerformanceMode={(value) => {
            setPerformanceModeTouched(true);
            setPerformanceMode(value);
          }}
          rendererMode={rendererMode}
          setRendererMode={setRendererMode}
          sud={sud}
          selU={selU}
          settlerM={settlerM}
          setSettlerM={setSettlerM}
          nukeM={nukeM}
          setNukeM={setNukeM}
          upgradeUnit={upgradeUnit}
          cp={cp}
          actable={actable}
          compact
        />
      );
    }
    return null;
  }, [activeLeftTab, cp, hexes, landOwned, totalLand, barbarians, tCounts, showTech, setShowTech, showDiplomacy, setShowDiplomacy, showSaveLoad, setShowSaveLoad, tutorialOn, setTutorialOn, setTutorialDismissed, effectivePerformanceMode, setPerformanceModeTouched, setPerformanceMode, rendererMode, setRendererMode, sud, selU, settlerM, setSettlerM, nukeM, setNukeM, upgradeUnit, actable]);

  return (
    <div ref={uiOverlayRef} style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", zIndex: 10, pointerEvents: "none" }}>
      <div
        style={{
          ...hudPanelStyle,
          position: "absolute",
          top: 14,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 12,
          width: "min(1120px, calc(100vw - 36px))",
          padding: "10px 16px",
          display: "grid",
          gridTemplateColumns: showCommandRibbon ? "1.1fr auto auto" : "1.1fr auto",
          gap: 14,
          alignItems: "center",
        }}
      >
        <div style={{ minWidth: 0, pointerEvents: "auto" }}>
          <div style={hudSectionLabelStyle}>Campaign</div>
          <div style={{ color: "#edf4d8", fontSize: 24, fontWeight: 700, letterSpacing: 1.8, textTransform: "uppercase", lineHeight: 1.05 }}>
            Empires of Earth
          </div>
          <div style={{ color: "#9aac80", fontSize: 12, marginTop: 2 }}>
            Turn {turnNumber} · {cp.name} · {empireStatus}
          </div>
        </div>

        {showCommandRibbon ? (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", pointerEvents: "auto" }}>
            <span style={hudChipStyle}>{sud.def?.icon} {sud.def?.name}</span>
            <span style={hudChipStyle}>HP {sud.hpCurrent}/{sud.def?.hp}</span>
            <span style={hudChipStyle}>Mv {sud.movementCurrent}/{sud.def?.move}</span>
            {sud.def?.range > 0 && <span style={hudChipStyle}>Rng {sud.def.range}</span>}
          </div>
        ) : (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", pointerEvents: "auto" }}>
            <span style={hudChipStyle}>Cities {cp.cities?.length || 0}</span>
            <span style={hudChipStyle}>Units {cp.units?.length || 0}</span>
            <span style={hudChipStyle}>{research ? `Research ${research.name}` : "Research idle"}</span>
            <span style={hudChipStyle}>Saves {savedGames?.length || 0}</span>
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 12, pointerEvents: "auto" }}>
          {!showCommandRibbon && (
            <div style={{ textAlign: "right" }}>
              <div style={hudSectionLabelStyle}>Primary Action</div>
              <div style={{ color: "#dfe9c6", fontSize: 13, marginTop: 3 }}>{research ? `${research.name} underway` : "Choose new research"}</div>
            </div>
          )}
          <button onClick={endTurn} style={{ ...hudButtonStyle(true), fontSize: 15, fontWeight: 700, padding: "11px 20px", letterSpacing: 0.4 }}>
            End Turn →
          </button>
        </div>
      </div>

      <div style={{ position: "absolute", top: 110, left: 18, zIndex: 12, display: "flex", alignItems: "flex-start", gap: 10, pointerEvents: "auto" }}>
        <div style={{ ...hudPanelStyle, width: 60, padding: 8, display: "grid", gap: 8 }}>
          {Object.entries(TAB_CONFIG).map(([key, tab]) => {
            const active = activeLeftTab === key;
            return (
              <button
                key={key}
                onClick={() => setActiveLeftTab((current) => (current === key ? null : key))}
                title={tab.label}
                style={{
                  ...hudButtonStyle(active),
                  width: "100%",
                  minHeight: 44,
                  padding: "8px 6px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 18,
                }}
              >
                {tab.icon}
              </button>
            );
          })}
        </div>

        {activeLeftTab && (
          <div style={{ ...hudPanelStyle, width: 316, maxHeight: "calc(100vh - 270px)", overflowY: "auto", padding: "14px 14px 16px" }}>
            <div style={{ ...hudSectionLabelStyle, marginBottom: 10 }}>{TAB_CONFIG[activeLeftTab].label}</div>
            {activeTabContent}
          </div>
        )}
      </div>

      <LogPanel log={log} currentPlayerId={viewPlayerId} currentPlayerTechs={cp.researchedTechs} gs={gs} />
      <BottomInfo selH={selH} hexes={hexes} unitMap={unitMap} players={players} settlerM={settlerM} setSettlerM={setSettlerM} nukeM={nukeM} setNukeM={setNukeM} moveMsg={moveMsg} buildRoad={buildRoad} cp={cp} gs={gs} viewPlayerId={viewPlayerId} />

      {!selU && actable.size > 0 && (
        <div style={{ position: "absolute", bottom: 220, right: 206, zIndex: 12, ...hudChipStyle, color: "#c3e889", background: "rgba(20,32,10,.9)", pointerEvents: "auto" }}>
          Tab: cycle {actable.size} ready units
        </div>
      )}

      {aiThinking && <div style={{ position: "absolute", inset: 0, zIndex: 40, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(5,8,3,.6)", pointerEvents: "all" }}><div style={{ background: "rgba(15,20,10,.95)", border: "2px solid rgba(100,140,50,.5)", borderRadius: 12, padding: "24px 40px", textAlign: "center", boxShadow: "0 0 40px rgba(80,120,40,.2)" }}><div style={{ fontSize: 28, marginBottom: 8, animation: "pulse 1.5s ease-in-out infinite" }}>🤖</div><div style={{ color: "#c8d8a0", fontSize: 16, fontWeight: 600, letterSpacing: 3 }}>AI is thinking...</div><div style={{ color: "#8a9a70", fontSize: 12, marginTop: 6 }}>The AI plots its next move</div></div></div>}
      {onlineMode && !onlineMode.isMyTurn && !gs?.victoryStatus && <div style={{ position: "absolute", inset: 0, zIndex: 35, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(5,8,3,.4)", pointerEvents: "all" }}><div style={{ background: "rgba(15,20,10,.95)", border: "2px solid rgba(100,140,50,.5)", borderRadius: 12, padding: "24px 40px", textAlign: "center", boxShadow: "0 0 40px rgba(80,120,40,.2)" }}><div style={{ fontSize: 28, marginBottom: 8 }}>{"\u{1F551}"}</div><div style={{ color: "#c8d8a0", fontSize: 16, fontWeight: 600, letterSpacing: 3 }}>Opponent's Turn</div><div style={{ color: "#8a9a70", fontSize: 12, marginTop: 6 }}>Waiting for your opponent to play...</div></div></div>}
      {onlineMode?.opponentDisconnected && <div style={{ position: "absolute", top: 80, left: "50%", transform: "translateX(-50%)", zIndex: 50, background: "rgba(120,40,20,.95)", border: "1px solid rgba(200,80,40,.6)", borderRadius: 8, padding: "8px 20px", pointerEvents: "auto" }}><div style={{ color: "#ffb090", fontSize: 12, fontWeight: 600, letterSpacing: 1 }}>Opponent Disconnected</div><div style={{ color: "#ff9070", fontSize: 9, marginTop: 2 }}>They may reconnect...</div></div>}
      {onlineMode?.error && <div style={{ position: "absolute", top: onlineMode.opponentDisconnected ? 130 : 80, left: "50%", transform: "translateX(-50%)", zIndex: 50, background: "rgba(120,20,20,.95)", border: "1px solid rgba(200,40,40,.6)", borderRadius: 8, padding: "6px 16px", pointerEvents: "auto" }}><div style={{ color: "#ff6060", fontSize: 11 }}>{onlineMode.error}</div></div>}

      {minimapVisible && <MinimapDisplay minimapRef={minimapRef} MINIMAP_W={MINIMAP_W} MINIMAP_H={MINIMAP_H} onMinimapDown={onMinimapDown} onMinimapMove={onMinimapMove} onMinimapUp={onMinimapUp} />}
    </div>
  );
}

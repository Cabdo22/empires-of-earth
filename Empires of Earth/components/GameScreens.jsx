// ============================================================
// GAME SCREENS — mode select, map size, civ picker, transitions
// ============================================================

import React from "react";
import { MAP_SIZES, setMapConfig } from '../data/constants.js';
import { CIV_DEFS } from '../data/civs.js';
import { UNIT_DEFS } from '../data/units.js';
import { createInitialState } from '../engine/gameInit.js';
import { btnStyle } from '../styles.js';
import { SFX } from '../sfx.js';

// === MODE SELECTION SCREEN ===
export function ModeSelectScreen({ setGameMode }) {
  const modeBtn = (label, desc, icon, mode) => (
    <div onClick={() => { SFX.click(); setGameMode(mode); }}
      style={{ padding: "24px 36px", borderRadius: 8, cursor: "pointer", background: "rgba(30,40,20,.6)",
        border: "1px solid rgba(100,140,50,.4)", minWidth: 220, textAlign: "center", transition: "background .2s" }}
      onMouseEnter={e => e.currentTarget.style.background = "rgba(100,160,50,.25)"}
      onMouseLeave={e => e.currentTarget.style.background = "rgba(30,40,20,.6)"}>
      <div style={{ fontSize: 36, marginBottom: 8 }}>{icon}</div>
      <div style={{ color: "#c8d8a0", fontSize: 16, fontWeight: 600, letterSpacing: 2 }}>{label}</div>
      <div style={{ color: "#6a7a50", fontSize: 10, marginTop: 6 }}>{desc}</div>
    </div>
  );
  return (
    <div style={{ width: "100vw", height: "100vh", background: "radial-gradient(ellipse at center,#1a2a10 0%,#0a0e06 70%)", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", fontFamily: "'Palatino Linotype',serif", gap: 32 }}>
      <h1 style={{ color: "#c8d8a0", fontSize: 32, fontWeight: 400, letterSpacing: 8, textTransform: "uppercase", margin: 0 }}>Empires of Earth</h1>
      <div style={{ color: "#6a7a50", fontSize: 12, letterSpacing: 3 }}>Select Game Mode</div>
      <div style={{ display: "flex", gap: 24 }}>
        {modeBtn("vs AI", "Play against the computer", "\u{1F916}", "ai")}
        {modeBtn("Local", "Two players, one screen", "\u{1F465}", "local")}
      </div>
      <div style={{ color: "#3a4a2a", fontSize: 9, marginTop: 8 }}>Fog of War \u00B7 Barbarians \u00B7 Random Events</div>
    </div>
  );
}

// === MAP SIZE SELECTION SCREEN ===
export function MapSizeScreen({ setMapSizePick, setGameMode }) {
  const sizeBtn = (key, cfg, icon) => (
    <div onClick={() => { SFX.click(); setMapSizePick(key); setMapConfig(key); }}
      style={{ padding: "24px 36px", borderRadius: 8, cursor: "pointer", background: "rgba(30,40,20,.6)",
        border: "1px solid rgba(100,140,50,.4)", minWidth: 200, textAlign: "center", transition: "background .2s" }}
      onMouseEnter={e => e.currentTarget.style.background = "rgba(100,160,50,.25)"}
      onMouseLeave={e => e.currentTarget.style.background = "rgba(30,40,20,.6)"}>
      <div style={{ fontSize: 36, marginBottom: 8 }}>{icon}</div>
      <div style={{ color: "#c8d8a0", fontSize: 16, fontWeight: 600, letterSpacing: 2 }}>{cfg.label}</div>
      <div style={{ color: "#6a7a50", fontSize: 10, marginTop: 6 }}>{cfg.desc}</div>
      <div style={{ color: "#4a5a3a", fontSize: 9, marginTop: 4 }}>{cfg.cols}\u00D7{cfg.rows} = {cfg.cols * cfg.rows} hexes</div>
    </div>
  );
  return (
    <div style={{ width: "100vw", height: "100vh", background: "radial-gradient(ellipse at center,#1a2a10 0%,#0a0e06 70%)", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", fontFamily: "'Palatino Linotype',serif", gap: 32 }}>
      <h1 style={{ color: "#c8d8a0", fontSize: 32, fontWeight: 400, letterSpacing: 8, textTransform: "uppercase", margin: 0 }}>Empires of Earth</h1>
      <div style={{ color: "#6a7a50", fontSize: 12, letterSpacing: 3 }}>Select Map Size</div>
      <div style={{ display: "flex", gap: 24 }}>
        {Object.entries(MAP_SIZES).map(([k, v]) => sizeBtn(k, v, k === "small" ? "\u{1F5FA}" : k === "medium" ? "\u{1F30D}" : "\u{1F30F}"))}
      </div>
      <div onClick={() => { setGameMode(null); }} style={{ color: "#6a7a50", fontSize: 9, cursor: "pointer", textDecoration: "underline", marginTop: 4 }}>\u2190 Back</div>
    </div>
  );
}

// === CIV SELECTION SCREEN ===
export function CivSelectScreen({ gameMode, civPick, setCivPick, civPickStep, setCivPickStep, setGs, setGameStarted, onBack }) {
  const civKeys = Object.keys(CIV_DEFS);
  const isAiMode = gameMode === "ai";
  const step = isAiMode ? 1 : civPickStep;
  const currentPid = step === 1 ? "p1" : "p2";
  const picked = civPick[currentPid];
  const otherPicked = step === 2 ? civPick.p1 : null;

  const startGame = () => {
    let p2Civ = civPick.p2;
    if (isAiMode) {
      const available = civKeys.filter(k => k !== civPick.p1);
      p2Civ = available[Math.floor(Math.random() * available.length)];
    }
    SFX.found();
    setGs(createInitialState(civPick.p1, p2Civ));
    setGameStarted(true);
  };

  const advanceToP2 = () => {
    SFX.click();
    setCivPickStep(2);
    const avail = civKeys.filter(k => k !== civPick.p1);
    if (!avail.includes(civPick.p2)) setCivPick(prev => ({ ...prev, p2: avail[0] }));
  };

  const stepLabel = isAiMode ? "Choose Your Civilization" : step === 1 ? "Player 1 \u2014 Choose Your Civilization" : "Player 2 \u2014 Choose Your Civilization";

  return (
    <div style={{ width: "100vw", minHeight: "100vh", background: "#0a0e06", display: "flex", flexDirection: "column", alignItems: "center", fontFamily: "'Palatino Linotype',serif", overflowY: "auto" }}>
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "radial-gradient(ellipse at center,#1a2a10 0%,#0a0e06 70%)", zIndex: 0, pointerEvents: "none" }}/>
      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "24px 0 32px" }}>
        <h1 style={{ color: "#c8d8a0", fontSize: 28, fontWeight: 400, letterSpacing: 8, textTransform: "uppercase", margin: 0 }}>Empires of Earth</h1>
        <div style={{ color: "#6a7a50", fontSize: 12, letterSpacing: 3 }}>{stepLabel}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, maxWidth: 280 }}>
          {civKeys.map(ck => {
            const cv = CIV_DEFS[ck]; const sel = picked === ck; const taken = otherPicked === ck;
            return (
              <div key={ck} onClick={() => { if (!taken) { SFX.click(); setCivPick(prev => ({ ...prev, [currentPid]: ck })); } }}
                style={{ padding: "6px 16px", borderRadius: 6, cursor: taken ? "not-allowed" : "pointer",
                  background: sel ? "rgba(100,160,50,.3)" : taken ? "rgba(40,40,40,.3)" : "rgba(30,40,20,.6)",
                  border: `1px solid ${sel ? cv.color : taken ? "#333" : "#3a4a2a"}`, opacity: taken ? .4 : 1, textAlign: "left" }}>
                <div style={{ color: cv.colorLight, fontSize: 11, fontWeight: 600, letterSpacing: 1 }}>{cv.name}</div>
                <div style={{ color: "#6a7a50", fontSize: 8, marginTop: 1 }}>{cv.bonus}</div>
                <div style={{ color: "#4a5a3a", fontSize: 7, marginTop: 1 }}>Capital: {cv.capital} {(() => { const uu = Object.values(UNIT_DEFS).find(u => u.civReq === ck); return uu ? <span style={{ color: "#8a9a6a" }}> \u00B7 \u2605 {uu.name}{uu.replaces ? ` (${UNIT_DEFS[uu.replaces]?.name})` : ""}</span> : null; })()}</div>
              </div>
            );
          })}
        </div>
        {isAiMode || step === 2 ? (
          <button onClick={startGame}
            style={{ padding: "8px 28px", borderRadius: 6, fontSize: 14, cursor: "pointer", border: "1px solid rgba(100,140,50,.6)", background: "rgba(100,160,50,.4)", color: "#e0f0c0", fontFamily: "inherit", letterSpacing: 3, marginTop: 4 }}>
            {isAiMode ? "Start vs AI" : "Start Game"}
          </button>
        ) : (
          <button onClick={advanceToP2}
            style={{ padding: "8px 28px", borderRadius: 6, fontSize: 14, cursor: "pointer", border: "1px solid rgba(100,140,50,.6)", background: "rgba(100,160,50,.4)", color: "#e0f0c0", fontFamily: "inherit", letterSpacing: 3, marginTop: 4 }}>
            Next \u2192 Player 2
          </button>
        )}
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <div style={{ color: "#3a4a2a", fontSize: 9 }}>Fog of War \u00B7 Barbarians \u00B7 Random Events</div>
          <div onClick={() => { if (!isAiMode && step === 2) { setCivPickStep(1); } else if (onBack) { onBack(); } }} style={{ color: "#6a7a50", fontSize: 9, cursor: "pointer", textDecoration: "underline" }}>\u2190 Back</div>
        </div>
      </div>
    </div>
  );
}

// === TURN TRANSITION SCREEN ===
export function TurnTransitionScreen({ turnTransition, turnNumber, onReady }) {
  return (
    <div style={{ width: "100vw", height: "100vh", background: "radial-gradient(ellipse at center,#1a2a10 0%,#0a0e06 70%)", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", fontFamily: "'Palatino Linotype',serif", gap: 20 }}>
      <div style={{ fontSize: 48, marginBottom: 4 }}>{"\u{1F504}"}</div>
      <div style={{ color: "#6a7a50", fontSize: 14, letterSpacing: 3, textTransform: "uppercase" }}>Pass the device to</div>
      <h1 style={{ color: turnTransition.playerColorLight || "#c8d8a0", fontSize: 32, letterSpacing: 6, margin: 0 }}>{turnTransition.playerName}</h1>
      <div style={{ color: "#4a5a3a", fontSize: 10 }}>Turn {turnNumber}</div>
      <button onClick={onReady}
        style={{ padding: "10px 32px", borderRadius: 6, fontSize: 16, cursor: "pointer", border: `1px solid ${turnTransition.playerColor}80`, background: `${turnTransition.playerColor}30`, color: turnTransition.playerColorLight || "#e0f0c0", fontFamily: "inherit", letterSpacing: 3, marginTop: 8 }}>
        Ready
      </button>
    </div>
  );
}

// === VICTORY SCREEN ===
export function VictoryScreen({ gs, players, turnNumber, onNewGame }) {
  const w = players.find(p => p.id === gs.victoryStatus.winner);
  return (
    <div style={{ width: "100vw", height: "100vh", background: "radial-gradient(ellipse at center,#1a2a10 0%,#0a0e06 70%)", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", fontFamily: "'Palatino Linotype',serif" }}>
      <div style={{ fontSize: 60, marginBottom: 16 }}>{"\u{1F3C6}"}</div>
      <h1 style={{ color: w?.color || "#fff", fontSize: 36, letterSpacing: 6, marginBottom: 8, textTransform: "uppercase" }}>{w?.name}</h1>
      <div style={{ color: "#c8d8a0", fontSize: 20, letterSpacing: 3, marginBottom: 4 }}>{gs.victoryStatus.type} Victory</div>
      <div style={{ color: "#6a7a50", fontSize: 14 }}>Turn {turnNumber}</div>
      <button onClick={onNewGame} style={{ ...btnStyle(true), marginTop: 24, fontSize: 14, padding: "8px 24px" }}>New Game</button>
    </div>
  );
}

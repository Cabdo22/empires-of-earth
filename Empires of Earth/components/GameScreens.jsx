// ============================================================
// GAME SCREENS — mode select, map size, lobby, civ picker, transitions
// ============================================================

import React, { useState } from "react";
import { MAP_SIZES, setMapConfig, currentMapSizeKey } from '../data/constants.js';
import { CIV_DEFS } from '../data/civs.js';
import { UNIT_DEFS } from '../data/units.js';
import { createInitialState, AI_DIFFICULTY } from '../engine/gameInit.js';
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
        {modeBtn("Local", "Play with friends on one screen", "\u{1F465}", "local")}
        {modeBtn("Online", "Play with a friend online", "\u{1F310}", "online")}
      </div>
      <div style={{ color: "#3a4a2a", fontSize: 9, marginTop: 8 }}>Fog of War \u00B7 Barbarians \u00B7 Random Events</div>
    </div>
  );
}

// === MAP SIZE SELECTION SCREEN ===
export function MapSizeScreen({ setMapSizePick, setGameMode }) {
  const sizeBtn = (key, cfg, icon) => (
    <div key={key} onClick={() => { SFX.click(); setMapSizePick(key); setMapConfig(key); }}
      style={{ padding: "24px 36px", borderRadius: 8, cursor: "pointer", background: "rgba(30,40,20,.6)",
        border: "1px solid rgba(100,140,50,.4)", minWidth: 200, textAlign: "center", transition: "background .2s" }}
      onMouseEnter={e => e.currentTarget.style.background = "rgba(100,160,50,.25)"}
      onMouseLeave={e => e.currentTarget.style.background = "rgba(30,40,20,.6)"}>
      <div style={{ fontSize: 36, marginBottom: 8 }}>{icon}</div>
      <div style={{ color: "#c8d8a0", fontSize: 16, fontWeight: 600, letterSpacing: 2 }}>{cfg.label}</div>
      <div style={{ color: "#6a7a50", fontSize: 10, marginTop: 6 }}>{cfg.desc}</div>
      <div style={{ color: "#4a5a3a", fontSize: 9, marginTop: 4 }}>{cfg.cols}\u00D7{cfg.rows} = {cfg.cols * cfg.rows} hexes \u00B7 Up to {cfg.maxPlayers} players</div>
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

// === LOBBY SCREEN — configure player slots ===
const SLOT_TYPES = ["closed", "ai", "human"];
const SLOT_LABELS = { closed: "Closed", ai: "AI", human: "Human" };
const SLOT_COLORS = { closed: "#4a4a4a", ai: "#d8a030", human: "#60b060" };
const DIFF_KEYS = ["easy", "normal", "hard"];

export function LobbyScreen({ gameMode, mapSizePick, playerSlots, setPlayerSlots, onStart, onBack }) {
  const maxPlayers = MAP_SIZES[mapSizePick]?.maxPlayers || 2;

  const cycleSlot = (idx) => {
    SFX.click();
    setPlayerSlots(prev => {
      const next = [...prev];
      const cur = next[idx].type;
      const curIdx = SLOT_TYPES.indexOf(cur);
      next[idx] = { ...next[idx], type: SLOT_TYPES[(curIdx + 1) % SLOT_TYPES.length] };
      return next;
    });
  };

  const cycleDifficulty = (idx) => {
    SFX.click();
    setPlayerSlots(prev => {
      const next = [...prev];
      const cur = next[idx].difficulty || "normal";
      const curIdx = DIFF_KEYS.indexOf(cur);
      next[idx] = { ...next[idx], difficulty: DIFF_KEYS[(curIdx + 1) % DIFF_KEYS.length] };
      return next;
    });
  };

  const activeCount = 1 + playerSlots.filter(s => s.type !== "closed").length;

  return (
    <div style={{ width: "100vw", height: "100vh", background: "radial-gradient(ellipse at center,#1a2a10 0%,#0a0e06 70%)", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", fontFamily: "'Palatino Linotype',serif", gap: 24 }}>
      <h1 style={{ color: "#c8d8a0", fontSize: 28, fontWeight: 400, letterSpacing: 8, textTransform: "uppercase", margin: 0 }}>Empires of Earth</h1>
      <div style={{ color: "#6a7a50", fontSize: 12, letterSpacing: 3 }}>Configure Players \u00B7 {MAP_SIZES[mapSizePick]?.label} Map</div>

      {/* Player 1 — always human, locked */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 20px", borderRadius: 8, background: "rgba(30,40,20,.6)", border: "1px solid rgba(100,160,50,.5)", minWidth: 320 }}>
        <div style={{ width: 32, height: 32, borderRadius: "50%", background: SLOT_COLORS.human, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 14, fontWeight: 700 }}>1</div>
        <div style={{ flex: 1 }}>
          <div style={{ color: "#c8d8a0", fontSize: 13, fontWeight: 600 }}>Player 1</div>
          <div style={{ color: "#6a7a50", fontSize: 9 }}>Human (You)</div>
        </div>
      </div>

      {/* Slots 2 through maxPlayers */}
      {playerSlots.slice(0, maxPlayers - 1).map((slot, i) => {
        const slotNum = i + 2;
        const isActive = slot.type !== "closed";
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 20px", borderRadius: 8, background: isActive ? "rgba(30,40,20,.6)" : "rgba(20,20,20,.3)", border: `1px solid ${isActive ? "rgba(100,140,50,.4)" : "rgba(60,60,60,.3)"}`, minWidth: 320, transition: "all .2s" }}>
            <div onClick={() => cycleSlot(i)}
              style={{ width: 32, height: 32, borderRadius: "50%", background: SLOT_COLORS[slot.type], display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", transition: "background .2s" }}
              title="Click to cycle: Closed / AI / Human">
              {slotNum}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ color: isActive ? "#c8d8a0" : "#6a6a6a", fontSize: 13, fontWeight: 600 }}>Player {slotNum}</div>
              <div onClick={() => cycleSlot(i)} style={{ color: SLOT_COLORS[slot.type], fontSize: 10, cursor: "pointer", fontWeight: 600, letterSpacing: 1 }}>
                {SLOT_LABELS[slot.type]}
              </div>
            </div>
            {slot.type === "ai" && (
              <div onClick={() => cycleDifficulty(i)}
                style={{ padding: "3px 10px", borderRadius: 4, fontSize: 10, cursor: "pointer", background: "rgba(100,80,30,.4)", border: "1px solid rgba(200,160,60,.4)", color: "#e0c060", letterSpacing: 1, fontWeight: 600 }}
                title="Click to cycle difficulty">
                {AI_DIFFICULTY[slot.difficulty || "normal"].label}
              </div>
            )}
          </div>
        );
      })}

      <div style={{ color: "#6a7a50", fontSize: 10, marginTop: 4 }}>{activeCount} player{activeCount !== 1 ? "s" : ""} in game</div>

      <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
        <button onClick={() => { SFX.click(); onStart(); }}
          disabled={activeCount < 2}
          style={{ padding: "8px 28px", borderRadius: 6, fontSize: 14, cursor: activeCount < 2 ? "not-allowed" : "pointer", border: "1px solid rgba(100,140,50,.6)", background: activeCount < 2 ? "rgba(40,40,40,.4)" : "rgba(100,160,50,.4)", color: activeCount < 2 ? "#666" : "#e0f0c0", fontFamily: "inherit", letterSpacing: 3, opacity: activeCount < 2 ? 0.5 : 1 }}>
          Choose Civilizations \u2192
        </button>
      </div>

      <div onClick={onBack} style={{ color: "#6a7a50", fontSize: 9, cursor: "pointer", textDecoration: "underline" }}>\u2190 Back to Map Size</div>
    </div>
  );
}

// === CIV SELECTION SCREEN — multi-player step-through ===
export function CivSelectScreen({ gameMode, mapSizePick, playerSlots, civPicks, setCivPicks, civPickStep, setCivPickStep, setGs, setGameStarted, onBack }) {
  const civKeys = Object.keys(CIV_DEFS);

  // Build ordered list of players who need to pick: Player 1 (human) + active slots
  const maxPlayersForPick = MAP_SIZES[mapSizePick]?.maxPlayers || 2;
  const activeSlots = playerSlots.slice(0, maxPlayersForPick - 1);
  const humanPickers = [{ idx: 0, type: "human" }];
  activeSlots.forEach((slot, i) => {
    if (slot.type === "human") humanPickers.push({ idx: i + 1, type: "human" });
  });

  // In AI mode, only human players pick; AI civs are randomized
  const totalHumanPickers = humanPickers.length;
  const currentPickerIdx = civPickStep - 1;
  const isLastPicker = currentPickerIdx >= totalHumanPickers - 1;
  const currentPicker = humanPickers[currentPickerIdx];
  const currentPid = currentPicker ? `p${currentPicker.idx + 1}` : "p1";

  // Civs already picked by previous pickers
  const takenCivs = new Set();
  humanPickers.forEach((hp, i) => {
    if (i < currentPickerIdx) {
      const pid = `p${hp.idx + 1}`;
      if (civPicks[pid]) takenCivs.add(civPicks[pid]);
    }
  });

  const picked = civPicks[currentPid] || null;

  const selectCiv = (ck) => {
    if (takenCivs.has(ck)) return;
    SFX.click();
    setCivPicks(prev => ({ ...prev, [currentPid]: ck }));
  };

  const advanceOrStart = () => {
    if (!picked) return;
    if (isLastPicker) {
      // Build playerConfigs and start game
      const configs = [];
      // Player 1
      configs.push({ civ: civPicks["p1"], type: "human" });
      // Remaining slots
      const usedCivs = new Set();
      // Collect all human-picked civs
      humanPickers.forEach(hp => {
        const pid = `p${hp.idx + 1}`;
        if (civPicks[pid]) usedCivs.add(civPicks[pid]);
      });

      const maxPlayers = MAP_SIZES[mapSizePick]?.maxPlayers || 2;
      playerSlots.slice(0, maxPlayers - 1).forEach((slot, i) => {
        if (slot.type === "closed") return;
        const pid = `p${i + 2}`;
        if (slot.type === "human") {
          configs.push({ civ: civPicks[pid], type: "human" });
          usedCivs.add(civPicks[pid]);
        } else if (slot.type === "ai") {
          // Random civ for AI (not already taken)
          const available = civKeys.filter(k => !usedCivs.has(k));
          const aiCiv = available[Math.floor(Math.random() * available.length)] || civKeys[0];
          usedCivs.add(aiCiv);
          configs.push({ civ: aiCiv, type: "ai", difficulty: slot.difficulty || "normal" });
        }
      });

      SFX.found();
      setGs(createInitialState(configs));
      setGameStarted(true);
    } else {
      // Advance to next human picker
      SFX.click();
      setCivPickStep(prev => prev + 1);
      // Pre-select first available civ for next picker
      const nextPicker = humanPickers[currentPickerIdx + 1];
      const nextPid = `p${nextPicker.idx + 1}`;
      const nextTaken = new Set(takenCivs);
      nextTaken.add(picked);
      if (!civPicks[nextPid] || nextTaken.has(civPicks[nextPid])) {
        const avail = civKeys.filter(k => !nextTaken.has(k));
        setCivPicks(prev => ({ ...prev, [nextPid]: avail[0] || civKeys[0] }));
      }
    }
  };

  const goBack = () => {
    if (civPickStep > 1) {
      setCivPickStep(prev => prev - 1);
    } else if (onBack) {
      onBack();
    }
  };

  const playerLabel = totalHumanPickers === 1
    ? "Choose Your Civilization"
    : `Player ${currentPicker?.idx + 1} \u2014 Choose Your Civilization`;

  return (
    <div style={{ width: "100vw", minHeight: "100vh", background: "#0a0e06", display: "flex", flexDirection: "column", alignItems: "center", fontFamily: "'Palatino Linotype',serif", overflowY: "auto" }}>
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "radial-gradient(ellipse at center,#1a2a10 0%,#0a0e06 70%)", zIndex: 0, pointerEvents: "none" }}/>
      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "24px 0 32px" }}>
        <h1 style={{ color: "#c8d8a0", fontSize: 28, fontWeight: 400, letterSpacing: 8, textTransform: "uppercase", margin: 0 }}>Empires of Earth</h1>
        <div style={{ color: "#6a7a50", fontSize: 12, letterSpacing: 3 }}>{playerLabel}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, maxWidth: 280 }}>
          {civKeys.map(ck => {
            const cv = CIV_DEFS[ck]; const sel = picked === ck; const taken = takenCivs.has(ck);
            return (
              <div key={ck} onClick={() => selectCiv(ck)}
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
        {isLastPicker ? (
          <button onClick={advanceOrStart}
            disabled={!picked}
            style={{ padding: "8px 28px", borderRadius: 6, fontSize: 14, cursor: picked ? "pointer" : "not-allowed", border: "1px solid rgba(100,140,50,.6)", background: picked ? "rgba(100,160,50,.4)" : "rgba(40,40,40,.4)", color: picked ? "#e0f0c0" : "#666", fontFamily: "inherit", letterSpacing: 3, marginTop: 4 }}>
            Start Game
          </button>
        ) : (
          <button onClick={advanceOrStart}
            disabled={!picked}
            style={{ padding: "8px 28px", borderRadius: 6, fontSize: 14, cursor: picked ? "pointer" : "not-allowed", border: "1px solid rgba(100,140,50,.6)", background: picked ? "rgba(100,160,50,.4)" : "rgba(40,40,40,.4)", color: picked ? "#e0f0c0" : "#666", fontFamily: "inherit", letterSpacing: 3, marginTop: 4 }}>
            Next \u2192 Player {humanPickers[currentPickerIdx + 1]?.idx + 1}
          </button>
        )}
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <div style={{ color: "#3a4a2a", fontSize: 9 }}>Fog of War \u00B7 Barbarians \u00B7 Random Events</div>
          <div onClick={goBack} style={{ color: "#6a7a50", fontSize: 9, cursor: "pointer", textDecoration: "underline" }}>\u2190 Back</div>
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

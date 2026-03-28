// ============================================================
// ONLINE GAME — wrapper for online multiplayer via PartyKit
// Manages: lobby -> civ select -> gameplay with server-authoritative state
// ============================================================
import React, { useState, useEffect, Suspense } from "react";
import { MAP_SIZES, setMapConfig } from '../data/constants.js';
import { CIV_DEFS } from '../data/civs.js';
import { UNIT_DEFS } from '../data/units.js';
import { AI_DIFFICULTY } from '../engine/gameInit.js';
import { SFX } from '../sfx.js';
import { useMultiplayerGame } from '../hooks/useParty.js';

// Lazy import to break circular dependency (HexStrategyGame imports OnlineGame)
const HexStrategyGame = React.lazy(() => import('../HexStrategyGame.jsx'));

const DIFF_KEYS = Object.keys(AI_DIFFICULTY);
const SLOT_COLORS = { ai: "#b08030", closed: "#555" };
const SLOT_LABELS = { ai: "AI", closed: "Closed" };

// ============================================================
// ONLINE CIV SELECT
// ============================================================
function OnlineCivSelect({ myPlayerId, civPicks, sendAction, mapSize, isP1, aiSlots: serverAiSlots }) {
  const [selectedCiv, setSelectedCiv] = useState("Rome");
  const [selectedSize, setSelectedSize] = useState(mapSize || "medium");
  const maxPlayers = MAP_SIZES[selectedSize]?.maxPlayers || 2;
  const maxAiSlots = Math.max(0, maxPlayers - 2); // 2 humans already
  const [aiSlots, setAiSlots] = useState(() =>
    Array.from({ length: 4 }, () => ({ type: "closed", difficulty: "normal" }))
  );
  const hasPicked = civPicks[myPlayerId];
  const civKeys = Object.keys(CIV_DEFS);
  const otherPick = civPicks[myPlayerId === "p1" ? "p2" : "p1"];

  const cycleSlot = (idx) => {
    SFX.click();
    setAiSlots(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], type: next[idx].type === "closed" ? "ai" : "closed" };
      return next;
    });
  };

  const cycleDifficulty = (idx) => {
    SFX.click();
    setAiSlots(prev => {
      const next = [...prev];
      const cur = next[idx].difficulty || "normal";
      const curIdx = DIFF_KEYS.indexOf(cur);
      next[idx] = { ...next[idx], difficulty: DIFF_KEYS[(curIdx + 1) % DIFF_KEYS.length] };
      return next;
    });
  };

  const confirmPick = () => {
    SFX.click();
    // Collect active AI slots (only visible ones that are set to "ai")
    const activeAi = aiSlots.slice(0, maxAiSlots)
      .filter(s => s.type === "ai")
      .map(s => ({ difficulty: s.difficulty || "normal" }));
    sendAction({
      type: "PICK_CIV",
      civilization: selectedCiv,
      mapSize: isP1 ? selectedSize : undefined,
      aiSlots: isP1 ? activeAi : undefined,
    });
  };

  return (
    <div style={{
      width: "100vw", minHeight: "100vh", background: "#0a0e06",
      display: "flex", flexDirection: "column", alignItems: "center",
      fontFamily: "'Palatino Linotype',serif", overflowY: "auto",
    }}>
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "radial-gradient(ellipse at center,#1a2a10 0%,#0a0e06 70%)", zIndex: 0, pointerEvents: "none" }} />
      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "24px 0 32px" }}>
        <h1 style={{ color: "#c8d8a0", fontSize: 28, fontWeight: 400, letterSpacing: 8, textTransform: "uppercase", margin: 0 }}>Empires of Earth</h1>
        <div style={{ color: "#6a7a50", fontSize: 12, letterSpacing: 3 }}>
          {hasPicked ? "Waiting for opponent to pick..." : `${myPlayerId === "p1" ? "Player 1" : "Player 2"} \u2014 Choose Your Civilization`}
        </div>

        {isP1 && !hasPicked && (
          <div style={{ marginBottom: 8 }}>
            <div style={{ color: "#6a7a50", fontSize: 10, letterSpacing: 2, marginBottom: 6, textAlign: "center" }}>MAP SIZE</div>
            <div style={{ display: "flex", gap: 8 }}>
              {Object.entries(MAP_SIZES).map(([k, v]) => (
                <div key={k} onClick={() => setSelectedSize(k)}
                  style={{
                    padding: "6px 16px", borderRadius: 6, cursor: "pointer", fontSize: 10,
                    background: selectedSize === k ? "rgba(100,160,50,.3)" : "rgba(30,40,20,.6)",
                    border: `1px solid ${selectedSize === k ? "rgba(100,140,50,.6)" : "#3a4a2a"}`,
                    color: selectedSize === k ? "#c8d8a0" : "#6a7a50",
                  }}>
                  {v.label}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI Player Slots — P1 configures, P2 sees read-only */}
        {!hasPicked && maxAiSlots > 0 && (
          <div style={{ marginBottom: 8, minWidth: 280 }}>
            <div style={{ color: "#6a7a50", fontSize: 10, letterSpacing: 2, marginBottom: 6, textAlign: "center" }}>
              AI PLAYERS {!isP1 && "(Host configures)"}
            </div>
            {(isP1 ? aiSlots : (serverAiSlots || []).map(s => ({ type: "ai", difficulty: s.difficulty })))
              .slice(0, maxAiSlots).map((slot, i) => {
              const slotNum = i + 3; // p1=human, p2=human, p3+ = AI slots
              const isActive = slot.type === "ai";
              return (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "6px 14px", borderRadius: 6, marginBottom: 4,
                  background: isActive ? "rgba(30,40,20,.6)" : "rgba(20,20,20,.3)",
                  border: `1px solid ${isActive ? "rgba(100,140,50,.4)" : "rgba(60,60,60,.3)"}`,
                }}>
                  <div onClick={() => isP1 && cycleSlot(i)}
                    style={{
                      width: 26, height: 26, borderRadius: "50%",
                      background: SLOT_COLORS[isActive ? "ai" : "closed"],
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: "#fff", fontSize: 11, fontWeight: 700,
                      cursor: isP1 ? "pointer" : "default",
                    }}
                    title={isP1 ? "Click to toggle AI / Closed" : ""}>
                    {slotNum}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: isActive ? "#c8d8a0" : "#6a6a6a", fontSize: 11, fontWeight: 600 }}>Player {slotNum}</div>
                    <div onClick={() => isP1 && cycleSlot(i)}
                      style={{ color: SLOT_COLORS[isActive ? "ai" : "closed"], fontSize: 9, cursor: isP1 ? "pointer" : "default", fontWeight: 600, letterSpacing: 1 }}>
                      {SLOT_LABELS[isActive ? "ai" : "closed"]}
                    </div>
                  </div>
                  {isActive && (
                    <div onClick={() => isP1 && cycleDifficulty(i)}
                      style={{
                        padding: "2px 8px", borderRadius: 4, fontSize: 9,
                        cursor: isP1 ? "pointer" : "default",
                        background: "rgba(100,80,30,.4)", border: "1px solid rgba(200,160,60,.4)",
                        color: "#e0c060", letterSpacing: 1, fontWeight: 600,
                      }}
                      title={isP1 ? "Click to cycle difficulty" : ""}>
                      {AI_DIFFICULTY[slot.difficulty || "normal"]?.label || "Normal"}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {!hasPicked && (
          <div style={{ display: "flex", flexDirection: "column", gap: 4, maxWidth: 280 }}>
            {civKeys.map(ck => {
              const cv = CIV_DEFS[ck];
              const sel = selectedCiv === ck;
              const taken = otherPick === ck;
              return (
                <div key={ck} onClick={() => { if (!taken) { SFX.click(); setSelectedCiv(ck); } }}
                  style={{
                    padding: "6px 16px", borderRadius: 6, cursor: taken ? "not-allowed" : "pointer",
                    background: sel ? "rgba(100,160,50,.3)" : taken ? "rgba(40,40,40,.3)" : "rgba(30,40,20,.6)",
                    border: `1px solid ${sel ? cv.color : taken ? "#333" : "#3a4a2a"}`, opacity: taken ? .4 : 1, textAlign: "left",
                  }}>
                  <div style={{ color: cv.colorLight, fontSize: 11, fontWeight: 600, letterSpacing: 1 }}>{cv.name}</div>
                  <div style={{ color: "#6a7a50", fontSize: 8, marginTop: 1 }}>{cv.bonus}</div>
                  <div style={{ color: "#4a5a3a", fontSize: 7, marginTop: 1 }}>
                    Capital: {cv.capital}
                    {(() => {
                      const uu = Object.values(UNIT_DEFS).find(u => u.civReq === ck);
                      return uu ? <span style={{ color: "#8a9a6a" }}> {"\u00B7"} {"\u2605"} {uu.name}{uu.replaces ? ` (${UNIT_DEFS[uu.replaces]?.name})` : ""}</span> : null;
                    })()}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!hasPicked && (
          <button onClick={confirmPick}
            style={{
              padding: "8px 28px", borderRadius: 6, fontSize: 14, cursor: "pointer",
              border: "1px solid rgba(100,140,50,.6)", background: "rgba(100,160,50,.4)",
              color: "#e0f0c0", fontFamily: "inherit", letterSpacing: 3, marginTop: 4,
            }}>
            Confirm Pick
          </button>
        )}

        {hasPicked && (
          <div style={{ color: "#4a5a3a", fontSize: 12, marginTop: 16 }}>
            You picked: <span style={{ color: CIV_DEFS[hasPicked]?.colorLight }}>{CIV_DEFS[hasPicked]?.name}</span>
          </div>
        )}

        {otherPick && (
          <div style={{ color: "#4a5a3a", fontSize: 10 }}>
            Opponent picked: <span style={{ color: CIV_DEFS[otherPick]?.colorLight }}>{CIV_DEFS[otherPick]?.name}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// ONLINE GAME WRAPPER
// ============================================================
export default function OnlineGame({ roomId, onBack }) {
  const {
    gameState, connected, myPlayerId, sendAction, error,
    roomPhase, civPicks, opponentDisconnected, events, clearEvents,
    aiSlots, mapSize,
  } = useMultiplayerGame(roomId);

  // Must use state (not ref) so setting it triggers a re-render past the loading screen
  const [mapConfigured, setMapConfigured] = useState(false);
  useEffect(() => {
    if (!gameState?.hexes?.length || mapConfigured) return;
    const maxCol = gameState.hexes.reduce((m, h) => Math.max(m, h.col), 0);
    const maxRow = gameState.hexes.reduce((m, h) => Math.max(m, h.row), 0);
    const match = Object.entries(MAP_SIZES).find(([, v]) => v.cols === maxCol + 1 && v.rows === maxRow + 1);
    if (match) setMapConfig(match[0]);
    setMapConfigured(true);
  }, [gameState, mapConfigured]);

  // Waiting for opponent
  if (roomPhase === "WAITING") {
    return (
      <div style={{
        width: "100vw", height: "100vh",
        background: "radial-gradient(ellipse at center,#1a2a10 0%,#0a0e06 70%)",
        display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column",
        fontFamily: "'Palatino Linotype',serif", gap: 20,
      }}>
        <h1 style={{ color: "#c8d8a0", fontSize: 28, fontWeight: 400, letterSpacing: 8, textTransform: "uppercase", margin: 0 }}>
          Empires of Earth
        </h1>
        <div style={{ color: "#6a7a50", fontSize: 14, letterSpacing: 3 }}>
          {connected ? "Waiting for opponent..." : "Connecting..."}
        </div>
        <div style={{
          fontSize: 48, color: "#c8d8a0", letterSpacing: 12, fontFamily: "monospace",
          background: "rgba(30,40,20,.8)", padding: "16px 32px", borderRadius: 8,
          border: "1px solid rgba(100,140,50,.5)",
        }}>
          {roomId}
        </div>
        <div style={{ color: "#4a5a3a", fontSize: 10 }}>Share this code with your opponent</div>
        {myPlayerId && <div style={{ color: "#4a5a3a", fontSize: 10 }}>You are {myPlayerId === "p1" ? "Player 1" : "Player 2"}</div>}
        <div onClick={onBack} style={{ color: "#6a7a50", fontSize: 9, cursor: "pointer", textDecoration: "underline", marginTop: 8 }}>{"\u2190"} Leave</div>
        {error && <div style={{ color: "#ff6060", fontSize: 10 }}>{error}</div>}
      </div>
    );
  }

  // Civ selection
  if (roomPhase === "CIV_SELECT") {
    return (
      <OnlineCivSelect
        myPlayerId={myPlayerId}
        civPicks={civPicks}
        sendAction={sendAction}
        isP1={myPlayerId === "p1"}
        aiSlots={aiSlots}
        mapSize={mapSize}
      />
    );
  }

  if (roomPhase === "PLAYING" || roomPhase === "FINISHED") {
    if (!gameState || !mapConfigured) {
      return (
        <div style={{
          width: "100vw", height: "100vh",
          background: "radial-gradient(ellipse at center,#1a2a10 0%,#0a0e06 70%)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "'Palatino Linotype',serif",
        }}>
          <div style={{ color: "#6a7a50", fontSize: 14, letterSpacing: 3 }}>Loading game state...</div>
        </div>
      );
    }

    return (
      <Suspense fallback={<div style={{width:"100vw",height:"100vh",background:"radial-gradient(ellipse at center,#1a2a10 0%,#0a0e06 70%)",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Palatino Linotype',serif"}}><div style={{color:"#6a7a50",fontSize:14,letterSpacing:3}}>Loading game...</div></div>}>
        <HexStrategyGame
          onlineMode={{
            gameState,
            myPlayerId,
            sendAction,
            opponentDisconnected,
            error,
            isMyTurn: gameState.currentPlayerId === myPlayerId,
            events,
            clearEvents,
          }}
        />
      </Suspense>
    );
  }

  return null;
}

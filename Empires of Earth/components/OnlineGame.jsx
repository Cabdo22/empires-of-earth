// ============================================================
// ONLINE GAME — wrapper for online multiplayer via PartyKit
// Manages: lobby -> civ select -> gameplay with server-authoritative state
// ============================================================
import React, { useState, useEffect } from "react";
import { MAP_SIZES } from '../data/constants.js';
import { CIV_DEFS } from '../data/civs.js';
import { UNIT_DEFS } from '../data/units.js';
import { AI_DIFFICULTY } from '../engine/gameInit.js';
import { SFX } from '../sfx.js';
import { useMultiplayerGame } from '../hooks/useParty.js';
import HexStrategyGame from '../HexStrategyGame.jsx';

const DIFF_KEYS = Object.keys(AI_DIFFICULTY);
const SLOT_COLORS = { ai: "#b08030", closed: "#555" };
const SLOT_LABELS = { ai: "AI", closed: "Closed" };

function useTicker(active) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [active]);

  useEffect(() => {
    if (!active) setNow(Date.now());
  }, [active]);

  return now;
}

function formatCountdown(msRemaining) {
  if (msRemaining <= 0) return "0:00";
  const totalSeconds = Math.ceil(msRemaining / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

// ============================================================
// ONLINE CIV SELECT
// ============================================================
function OnlineCivSelect({ myPlayerId, hostPlayerId, civPicks, sendAction, mapSize, aiSlots: serverAiSlots, setupLocked }) {
  const [selectedCiv, setSelectedCiv] = useState("Rome");
  const [selectedSize, setSelectedSize] = useState(mapSize || "medium");
  const maxPlayers = MAP_SIZES[selectedSize]?.maxPlayers || 2;
  const maxAiSlots = Math.max(0, maxPlayers - 2); // 2 humans already
  const [aiSlots, setAiSlots] = useState(() =>
    Array.from({ length: 4 }, () => ({ type: "closed", difficulty: "normal" }))
  );
  const hasPicked = civPicks[myPlayerId];
  const civKeys = Object.keys(CIV_DEFS);
  const isHost = myPlayerId === hostPlayerId;

  useEffect(() => {
    setSelectedSize(mapSize || "medium");
  }, [mapSize]);

  const cycleSlot = (idx) => {
    if (!isHost) return;
    SFX.click();
    setAiSlots(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], type: next[idx].type === "closed" ? "ai" : "closed" };
      return next;
    });
  };

  const cycleDifficulty = (idx) => {
    if (!isHost) return;
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
      mapSize: isHost ? selectedSize : undefined,
      aiSlots: isHost ? activeAi : undefined,
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
        <div style={{ color: "#4a5a3a", fontSize: 10, letterSpacing: 2 }}>
          {isHost ? "You are hosting this match" : `Host is ${hostPlayerId === "p1" ? "Player 1" : "Player 2"}`}
        </div>
        {!isHost && !hasPicked && (
          <div style={{ color: "#4a5a3a", fontSize: 9, letterSpacing: 1 }}>
            {setupLocked ? "Match settings are locked." : "Waiting for the host to finish configuring the match."}
          </div>
        )}

        {isHost && !hasPicked && (
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
              AI PLAYERS {!isHost && "(Host configures)"}
            </div>
            {(isHost ? aiSlots : (serverAiSlots || []).map(s => ({ type: "ai", difficulty: s.difficulty })))
              .slice(0, maxAiSlots).map((slot, i) => {
              const slotNum = i + 3; // p1=human, p2=human, p3+ = AI slots
              const isActive = slot.type === "ai";
              return (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "6px 14px", borderRadius: 6, marginBottom: 4,
                  background: isActive ? "rgba(30,40,20,.6)" : "rgba(20,20,20,.3)",
                  border: `1px solid ${isActive ? "rgba(100,140,50,.4)" : "rgba(60,60,60,.3)"}`,
                }}>
                  <div onClick={() => isHost && cycleSlot(i)}
                    style={{
                      width: 26, height: 26, borderRadius: "50%",
                      background: SLOT_COLORS[isActive ? "ai" : "closed"],
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: "#fff", fontSize: 11, fontWeight: 700,
                      cursor: isHost ? "pointer" : "default",
                    }}
                    title={isHost ? "Click to toggle AI / Closed" : ""}>
                    {slotNum}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: isActive ? "#c8d8a0" : "#6a6a6a", fontSize: 11, fontWeight: 600 }}>Player {slotNum}</div>
                    <div onClick={() => isHost && cycleSlot(i)}
                      style={{ color: SLOT_COLORS[isActive ? "ai" : "closed"], fontSize: 9, cursor: isHost ? "pointer" : "default", fontWeight: 600, letterSpacing: 1 }}>
                      {SLOT_LABELS[isActive ? "ai" : "closed"]}
                    </div>
                  </div>
                  {isActive && (
                    <div onClick={() => isHost && cycleDifficulty(i)}
                      style={{
                        padding: "2px 8px", borderRadius: 4, fontSize: 9,
                        cursor: isHost ? "pointer" : "default",
                        background: "rgba(100,80,30,.4)", border: "1px solid rgba(200,160,60,.4)",
                        color: "#e0c060", letterSpacing: 1, fontWeight: 600,
                      }}
                      title={isHost ? "Click to cycle difficulty" : ""}>
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
              return (
                <div key={ck} onClick={() => { SFX.click(); setSelectedCiv(ck); }}
                  style={{
                    padding: "6px 16px", borderRadius: 6, cursor: "pointer",
                    background: sel ? "rgba(100,160,50,.3)" : "rgba(30,40,20,.6)",
                    border: `1px solid ${sel ? cv.color : "#3a4a2a"}`, textAlign: "left",
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

      </div>
    </div>
  );
}

// ============================================================
// ONLINE GAME WRAPPER
// ============================================================
export default function OnlineGame({ roomId, onBack }) {
  const {
    gameState, connected, myPlayerId, hostPlayerId, sendAction, error,
    roomPhase, civPicks, opponentDisconnected, events, clearEvents,
    aiSlots, mapSize, roomReset, setupLocked,
    stateVersion, connectionState, roomStatus, reconnectDeadlineAt,
  } = useMultiplayerGame(roomId);
  const now = useTicker(Boolean(reconnectDeadlineAt));
  const reconnectRemainingMs = reconnectDeadlineAt ? Math.max(0, reconnectDeadlineAt - now) : 0;
  const reconnectCountdown = reconnectDeadlineAt ? formatCountdown(reconnectRemainingMs) : null;

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
          {roomStatus === "room_full" ? "Room is full"
            : connectionState === "connecting" ? "Connecting to room..."
            : connectionState === "reconnecting" ? "Reconnecting to room..."
            : !myPlayerId ? "Joining room..."
            : "Waiting for opponent..."}
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
        {roomReset && <div style={{ color: "#c8d8a0", fontSize: 10 }}>This room was reset after its previous session expired.</div>}
        {opponentDisconnected && reconnectCountdown && (
          <div style={{ color: "#c8d8a0", fontSize: 10 }}>
            Opponent disconnected. Rejoin window remaining: {reconnectCountdown}
          </div>
        )}
        <div onClick={onBack} style={{ color: "#6a7a50", fontSize: 9, cursor: "pointer", textDecoration: "underline", marginTop: 8 }}>{"\u2190"} Leave</div>
        {error && <div style={{ color: "#ff6060", fontSize: 10 }}>{error.message}</div>}
      </div>
    );
  }

  // Civ selection
  if (roomPhase === "CIV_SELECT") {
    return (
      <OnlineCivSelect
        myPlayerId={myPlayerId}
        hostPlayerId={hostPlayerId}
        civPicks={civPicks}
        sendAction={sendAction}
        aiSlots={aiSlots}
        mapSize={mapSize}
        setupLocked={setupLocked}
      />
    );
  }

  if (roomPhase === "PLAYING" || roomPhase === "FINISHED") {
    if (!gameState) {
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
      <>
        {(opponentDisconnected || connectionState === "reconnecting" || error) && (
          <div style={{
            position: "absolute",
            top: 12,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 60,
            background: "rgba(12,18,8,.95)",
            border: "1px solid rgba(120,160,70,.45)",
            borderRadius: 10,
            padding: "8px 16px",
            minWidth: 280,
            textAlign: "center",
            pointerEvents: "none",
          }}>
            <div style={{ color: "#c8d8a0", fontSize: 11, letterSpacing: 1 }}>
              {connectionState === "reconnecting" && "Reconnecting to multiplayer server..."}
              {connectionState !== "reconnecting" && opponentDisconnected && `Opponent disconnected${reconnectCountdown ? ` · ${reconnectCountdown} left` : ""}`}
              {connectionState !== "reconnecting" && !opponentDisconnected && error && error.message}
            </div>
            <div style={{ color: "#6a7a50", fontSize: 9, marginTop: 2 }}>
              State v{stateVersion}
            </div>
          </div>
        )}
        <HexStrategyGame
          onlineMode={{
            gameState,
            myPlayerId,
            sendAction,
            opponentDisconnected,
            error: error?.message || null,
            isMyTurn: gameState.currentPlayerId === myPlayerId,
            events,
            clearEvents,
          }}
        />
      </>
    );
  }

  return null;
}

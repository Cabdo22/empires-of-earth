// ============================================================
// LOBBY — create/join online game rooms
// ============================================================
import React, { useState } from "react";
import { SFX } from "./sfx.js";

const generateRoomCode = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
};

export default function Lobby({ onJoinRoom, onBack }) {
  const [mode, setMode] = useState(null); // null | "create" | "join"
  const [roomCode, setRoomCode] = useState("");
  const [createdCode, setCreatedCode] = useState(null);
  const [playerName, setPlayerName] = useState("");

  const createGame = () => {
    if (!playerName.trim()) return;
    SFX.click();
    const code = generateRoomCode();
    setCreatedCode(code);
    setMode("create");
    onJoinRoom(code, playerName.trim());
  };

  const joinGame = () => {
    if (roomCode.length < 4 || !playerName.trim()) return;
    SFX.click();
    onJoinRoom(roomCode.toUpperCase(), playerName.trim());
  };

  const inputStyle = {
    padding: "8px 16px", borderRadius: 6, fontSize: 20, textAlign: "center",
    letterSpacing: 8, textTransform: "uppercase", fontFamily: "monospace",
    background: "rgba(30,40,20,.8)", border: "1px solid rgba(100,140,50,.5)",
    color: "#c8d8a0", width: 160, outline: "none",
  };

  const nameInputStyle = {
    padding: "8px 16px", borderRadius: 6, fontSize: 16, textAlign: "center",
    fontFamily: "'Palatino Linotype',serif",
    background: "rgba(30,40,20,.8)", border: "1px solid rgba(100,140,50,.5)",
    color: "#c8d8a0", width: 200, outline: "none",
  };

  return (
    <div style={{
      width: "100vw", height: "100vh",
      background: "radial-gradient(ellipse at center,#1a2a10 0%,#0a0e06 70%)",
      display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column",
      fontFamily: "'Palatino Linotype',serif", gap: 24,
    }}>
      <h1 style={{ color: "#c8d8a0", fontSize: 32, fontWeight: 400, letterSpacing: 8, textTransform: "uppercase", margin: 0 }}>
        Empires of Earth
      </h1>
      <div style={{ color: "#6a7a50", fontSize: 12, letterSpacing: 3 }}>Online Multiplayer</div>

      {/* Name input — always visible until game is created/joined */}
      {!createdCode && (
        <div style={{ textAlign: "center" }}>
          <div style={{ color: "#6a7a50", fontSize: 10, letterSpacing: 2, marginBottom: 8 }}>Your Name</div>
          <input
            style={nameInputStyle}
            maxLength={16}
            value={playerName}
            onChange={e => setPlayerName(e.target.value)}
            placeholder="Enter your name"
            autoFocus
          />
        </div>
      )}

      {!mode && !createdCode && (
        <div style={{ display: "flex", gap: 24, opacity: playerName.trim() ? 1 : 0.4, pointerEvents: playerName.trim() ? "auto" : "none" }}>
          <div onClick={createGame}
            style={{
              padding: "24px 36px", borderRadius: 8, cursor: "pointer",
              background: "rgba(30,40,20,.6)", border: "1px solid rgba(100,140,50,.4)",
              minWidth: 200, textAlign: "center", transition: "background .2s",
            }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(100,160,50,.25)"}
            onMouseLeave={e => e.currentTarget.style.background = "rgba(30,40,20,.6)"}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>🏗</div>
            <div style={{ color: "#c8d8a0", fontSize: 16, fontWeight: 600, letterSpacing: 2 }}>Create Game</div>
            <div style={{ color: "#6a7a50", fontSize: 10, marginTop: 6 }}>Get a room code to share</div>
          </div>
          <div onClick={() => { SFX.click(); setMode("join"); }}
            style={{
              padding: "24px 36px", borderRadius: 8, cursor: "pointer",
              background: "rgba(30,40,20,.6)", border: "1px solid rgba(100,140,50,.4)",
              minWidth: 200, textAlign: "center", transition: "background .2s",
            }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(100,160,50,.25)"}
            onMouseLeave={e => e.currentTarget.style.background = "rgba(30,40,20,.6)"}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>🔗</div>
            <div style={{ color: "#c8d8a0", fontSize: 16, fontWeight: 600, letterSpacing: 2 }}>Join Game</div>
            <div style={{ color: "#6a7a50", fontSize: 10, marginTop: 6 }}>Enter a room code</div>
          </div>
        </div>
      )}

      {createdCode && (
        <div style={{ textAlign: "center" }}>
          <div style={{ color: "#6a7a50", fontSize: 12, letterSpacing: 2, marginBottom: 8 }}>Share this code with your opponent</div>
          <div style={{
            fontSize: 48, color: "#c8d8a0", letterSpacing: 12, fontFamily: "monospace",
            background: "rgba(30,40,20,.8)", padding: "16px 32px", borderRadius: 8,
            border: "1px solid rgba(100,140,50,.5)",
          }}>
            {createdCode}
          </div>
          <div style={{ color: "#4a5a3a", fontSize: 10, marginTop: 12 }}>Waiting for opponent to join...</div>
        </div>
      )}

      {mode === "join" && !createdCode && (
        <div style={{ textAlign: "center" }}>
          <div style={{ color: "#6a7a50", fontSize: 12, letterSpacing: 2, marginBottom: 12 }}>Enter Room Code</div>
          <input
            style={inputStyle}
            maxLength={4}
            value={roomCode}
            onChange={e => setRoomCode(e.target.value.replace(/[^a-zA-Z0-9]/g, ""))}
            onKeyDown={e => { if (e.key === "Enter") joinGame(); }}
            autoFocus
            placeholder="____"
          />
          <div style={{ marginTop: 12 }}>
            <button onClick={joinGame} disabled={roomCode.length < 4}
              style={{
                padding: "8px 28px", borderRadius: 6, fontSize: 14, cursor: roomCode.length < 4 ? "not-allowed" : "pointer",
                border: "1px solid rgba(100,140,50,.6)",
                background: roomCode.length < 4 ? "rgba(30,40,20,.4)" : "rgba(100,160,50,.4)",
                color: roomCode.length < 4 ? "#4a5a3a" : "#e0f0c0", fontFamily: "inherit", letterSpacing: 3,
              }}>
              Join
            </button>
          </div>
        </div>
      )}

      <div onClick={onBack}
        style={{ color: "#6a7a50", fontSize: 9, cursor: "pointer", textDecoration: "underline", marginTop: 4 }}>
        ← Back
      </div>
    </div>
  );
}

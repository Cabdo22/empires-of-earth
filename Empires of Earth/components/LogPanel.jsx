import React from "react";

export function LogPanel({ log, currentPlayerId, currentPlayerTechs }) {
  const hasIntel = (currentPlayerTechs || []).includes("telecommunications");

  // Filter log entries: show own messages, global messages (null playerId), and enemy messages only with Telecommunications
  const filtered = (log || []).slice(-20).filter(entry => {
    if (typeof entry === "string") return true; // legacy plain string entries
    if (!entry.playerId) return true; // null = visible to all
    if (entry.playerId === currentPlayerId) return true; // own messages
    return hasIntel; // enemy messages only with telecommunications
  }).slice(-10);

  return (
    <div style={{ position: "absolute", top: 12, right: 14, zIndex: 10, background: "rgba(10,14,6,.8)", borderRadius: 6, padding: "6px 10px", border: "1px solid rgba(100,140,50,.3)", maxWidth: 260, maxHeight: 130, overflowY: "auto", pointerEvents: "auto" }}>
      <div style={{ color: "#8a9a70", fontSize: 9, letterSpacing: 2, textTransform: "uppercase", marginBottom: 3, fontWeight: 600 }}>Log{hasIntel && <span style={{ color: "#60a0d0", marginLeft: 4 }}>📡</span>}</div>
      {filtered.map((entry, i) => {
        const l = typeof entry === "string" ? entry : entry.msg;
        const isEnemy = typeof entry !== "string" && entry.playerId && entry.playerId !== currentPlayerId;
        return <div key={i} style={{ fontSize: 9, color: l.includes("☠") || l.includes("captured") || l.includes("☢") ? "#e07070" : l.includes("built") || l.includes("researched") || l.includes("founded") ? "#90d070" : "#a0b080", marginBottom: 1, opacity: isEnemy ? 0.7 : 1, fontStyle: isEnemy ? "italic" : "normal" }}>{isEnemy ? "📡 " : ""}{l}</div>;
      })}
    </div>
  );
}

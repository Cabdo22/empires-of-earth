import React from "react";
import { getDisplayName } from "../engine/discovery.js";
import { hudPanelStyle, hudSectionLabelStyle } from "../styles.js";

export function LogPanel({ log, currentPlayerId, currentPlayerTechs, gs }) {
  const hasIntel = (currentPlayerTechs || []).includes("telecommunications");

  const filtered = (log || [])
    .slice(-20)
    .filter((entry) => {
      if (typeof entry === "string") return true;
      if (!entry.playerId) return true;
      if (entry.playerId === currentPlayerId) return true;
      return hasIntel;
    })
    .slice(-8);

  const anonymize = (text) => {
    if (!gs || !gs.players) return text;
    let result = text;
    for (const p of gs.players) {
      if (p.id === currentPlayerId) continue;
      const displayName = getDisplayName(p.id, currentPlayerId, gs);
      if (displayName !== p.name) result = result.replaceAll(p.name, displayName);
    }
    return result;
  };

  return (
    <div
      style={{
        ...hudPanelStyle,
        position: "absolute",
        top: 120,
        right: 18,
        zIndex: 12,
        width: 320,
        maxHeight: 140,
        overflowY: "auto",
        padding: "12px 14px",
      }}
    >
      <div style={{ ...hudSectionLabelStyle, marginBottom: 10 }}>
        War Log{hasIntel && <span style={{ color: "#60a0d0", marginLeft: 6 }}>📡</span>}
      </div>
      <div style={{ display: "grid", gap: 7 }}>
        {filtered.map((entry, index) => {
          const raw = typeof entry === "string" ? entry : entry.msg;
          const message = anonymize(raw);
          const isEnemy = typeof entry !== "string" && entry.playerId && entry.playerId !== currentPlayerId;
          const color = message.includes("☠") || message.includes("captured") || message.includes("☢")
            ? "#ed998e"
            : message.includes("built") || message.includes("researched") || message.includes("founded")
              ? "#9fd58a"
              : "#cbd8b3";
          return (
            <div key={index} style={{ fontSize: 12, color, opacity: isEnemy ? 0.75 : 1, fontStyle: isEnemy ? "italic" : "normal", lineHeight: 1.45 }}>
              {isEnemy ? "📡 " : ""}
              {message}
            </div>
          );
        })}
        {filtered.length === 0 && <div style={{ color: "#8ea173", fontSize: 12 }}>No major events recorded this turn.</div>}
      </div>
    </div>
  );
}

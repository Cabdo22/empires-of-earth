import React from "react";
import { btnStyle } from "../styles.js";

const EVENT_ICONS = {
  gold_rush: { symbol: "\uD83E\uDE99", color: "#ffd700", glow: "rgba(255,215,0,.3)" },
  plague:    { symbol: "\uD83D\uDC80", color: "#c080c0", glow: "rgba(180,100,180,.3)" },
  eureka:    { symbol: "\uD83D\uDCA1", color: "#60c8f0", glow: "rgba(80,180,240,.3)" },
  harvest:   { symbol: "\uD83C\uDF3E", color: "#c0d060", glow: "rgba(180,200,80,.3)" },
  raid:      { symbol: "\u2694\uFE0F", color: "#e06050", glow: "rgba(220,80,60,.3)" },
};

export function EventPopup({ event, onDismiss }) {
  if (!event) return null;
  const icon = EVENT_ICONS[event.id] || { symbol: "\uD83C\uDFB2", color: "#d0a040", glow: "rgba(200,160,40,.3)" };

  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 45, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(5,8,3,.6)", pointerEvents: "all" }} onClick={e => { if (e.target === e.currentTarget) onDismiss(); }}>
      <div style={{
        background: "rgba(12,18,8,.96)", border: `2px solid ${icon.color}60`,
        borderRadius: 12, padding: "28px 36px", textAlign: "center",
        boxShadow: `0 0 40px ${icon.glow}, 0 4px 24px rgba(0,0,0,.5)`,
        fontFamily: "'Palatino Linotype','Book Antiqua',Palatino,serif",
        minWidth: 280, maxWidth: 380,
      }}>
        <div style={{ fontSize: 48, marginBottom: 12, filter: `drop-shadow(0 0 8px ${icon.glow})` }}>{icon.symbol}</div>
        <div style={{ color: icon.color, fontSize: 20, fontWeight: 700, letterSpacing: 2, marginBottom: 8 }}>{event.name}</div>
        <div style={{ color: "#c8dca8", fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>{event.desc}</div>
        <button onClick={onDismiss} style={{ ...btnStyle(true), marginBottom: 0, marginRight: 0, padding: "8px 28px", fontSize: 13, letterSpacing: 1 }}>Dismiss</button>
      </div>
    </div>
  );
}

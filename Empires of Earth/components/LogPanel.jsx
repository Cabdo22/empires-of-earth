import React from "react";

export function LogPanel({ log }) {
  return (
    <div style={{ position: "absolute", top: 12, right: 14, zIndex: 10, background: "rgba(10,14,6,.8)", borderRadius: 6, padding: "6px 10px", border: "1px solid rgba(100,140,50,.3)", maxWidth: 260, maxHeight: 130, overflowY: "auto", pointerEvents: "auto" }}>
      <div style={{ color: "#8a9a70", fontSize: 9, letterSpacing: 2, textTransform: "uppercase", marginBottom: 3, fontWeight: 600 }}>Log</div>
      {(log || []).slice(-10).map((l, i) => <div key={i} style={{ fontSize: 9, color: l.includes("☠") || l.includes("captured") || l.includes("☢") ? "#e07070" : l.includes("built") || l.includes("researched") || l.includes("founded") ? "#90d070" : "#a0b080", marginBottom: 1 }}>{l}</div>)}
    </div>
  );
}

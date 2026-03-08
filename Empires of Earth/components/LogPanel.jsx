import React from "react";

export function LogPanel({ log }) {
  return (
    <div style={{ position: "absolute", bottom: 55, right: 14, zIndex: 10, background: "rgba(10,14,6,.7)", borderRadius: 6, padding: "5px 8px", border: "1px solid rgba(100,140,50,.2)", maxWidth: 240, maxHeight: 110, overflowY: "auto", pointerEvents: "auto" }}>
      <div style={{ color: "#6a7a50", fontSize: 7, letterSpacing: 2, textTransform: "uppercase", marginBottom: 2 }}>Log</div>
      {(log || []).slice(-10).map((l, i) => <div key={i} style={{ fontSize: 7, color: l.includes("☠") || l.includes("captured") || l.includes("☢") ? "#e07070" : l.includes("built") || l.includes("researched") || l.includes("founded") ? "#80c060" : "#7a8a60", marginBottom: 1 }}>{l}</div>)}
    </div>
  );
}

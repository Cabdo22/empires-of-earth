import React from "react";
import { TERRAIN_INFO } from '../data/terrain.js';

export function Legend({ tCounts }) {
  return (
    <div style={{ position: "absolute", bottom: 55, left: 14, zIndex: 10, background: "rgba(10,14,6,.7)", borderRadius: 6, padding: "5px 8px", border: "1px solid rgba(100,140,50,.2)", pointerEvents: "auto" }}>
      <div style={{ color: "#6a7a50", fontSize: 7, letterSpacing: 2, textTransform: "uppercase", marginBottom: 2 }}>Terrain</div>
      {["grassland", "forest", "mountain", "water"].map(t => <div key={t} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 8 }}><div style={{ width: 5, height: 5, borderRadius: t === "water" ? 0 : "50%", background: TERRAIN_INFO[t].color }} /><span style={{ color: "#a0b880", width: 50 }}>{TERRAIN_INFO[t].label}</span><span style={{ color: "#6a7a50" }}>{TERRAIN_INFO[t].moveCost != null ? `mv${TERRAIN_INFO[t].moveCost}` : "—"}{TERRAIN_INFO[t].defBonus ? ` +${TERRAIN_INFO[t].defBonus}def` : ""}</span><span style={{ color: "#4a5a3a" }}>({tCounts[t]})</span></div>)}
    </div>
  );
}

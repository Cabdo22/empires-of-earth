import React from "react";
import { TERRAIN_INFO } from "../data/terrain.js";
import { hudSectionLabelStyle } from "../styles.js";

export function Legend({ tCounts }) {
  return (
    <div>
      <div style={{ ...hudSectionLabelStyle, marginBottom: 8 }}>Terrain Ledger</div>
      <div style={{ display: "grid", gap: 6 }}>
        {["grassland", "forest", "mountain", "water"].map((terrainType) => (
          <div key={terrainType} style={{ display: "grid", gridTemplateColumns: "12px 1fr auto auto", gap: 8, alignItems: "center", fontSize: 12 }}>
            <div style={{ width: 10, height: 10, borderRadius: terrainType === "water" ? 3 : "50%", background: TERRAIN_INFO[terrainType].color }} />
            <span style={{ color: "#d7e2c0" }}>{TERRAIN_INFO[terrainType].label}</span>
            <span style={{ color: "#91a577" }}>
              {TERRAIN_INFO[terrainType].moveCost != null ? `mv ${TERRAIN_INFO[terrainType].moveCost}` : "impassable"}
            </span>
            <span style={{ color: "#7f9167" }}>{tCounts[terrainType]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

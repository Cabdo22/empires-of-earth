import React from "react";
import { panelStyle } from '../styles.js';

export function CombatPreview({ preview }) {
  if (!preview) return null;
  return (
    <div style={{ ...panelStyle, position: "fixed", top: window.innerHeight / 2 - 60, left: window.innerWidth / 2 - 100, width: 200, padding: 8, zIndex: 30, border: "1px solid #c05050", pointerEvents: "auto" }}>
      <div style={{ fontSize: 12, color: "#ffa0a0", marginBottom: 4, textAlign: "center", fontWeight: 600 }}>⚔ Combat Preview</div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
        <div style={{ color: "#b0e090" }}>{preview.an} ({preview.aStr})</div>
        <div style={{ color: "#f09090" }}>{preview.dn} ({preview.dStr})</div></div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, marginTop: 2 }}>
        <div>→{preview.aDmg}dmg{preview.dblShot ? " (x2)" : ""}</div><div>{preview.dDmg > 0 ? `←${preview.dDmg}dmg` : "no counter"}</div></div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, marginTop: 2, color: "#8a9a70" }}>
        <div>{preview.ahp}→{Math.max(0, preview.ahp - preview.dDmg)}</div>
        <div>{preview.dhp}→{Math.max(0, preview.dhp - preview.aDmg)}</div></div>
      <div style={{ textAlign: "center", fontSize: 9, color: "#8a9a6a", marginTop: 3 }}>Right-click to attack</div>
    </div>
  );
}

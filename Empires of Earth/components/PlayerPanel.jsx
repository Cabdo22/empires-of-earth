import React from "react";
import { TECH_TREE } from '../data/techs.js';
import { calcPlayerIncome } from '../engine/economy.js';

export function PlayerPanel({ cp, hexes, landOwned, totalLand, barbarians }) {
  const p = cp;
  const i2 = calcPlayerIncome(p, hexes);
  return (
    <div style={{ position: "absolute", top: 12, left: 14, zIndex: 10, background: "rgba(10,14,6,.8)", borderRadius: 6, padding: "6px 10px", border: `1px solid ${p.color}60`, minWidth: 120, pointerEvents: "auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}><div style={{ width: 7, height: 7, borderRadius: "50%", background: p.color, boxShadow: `0 0 6px ${p.color}50` }} /><span style={{ color: p.colorLight, fontSize: 10, letterSpacing: 1.5 }}>{p.name}</span></div>
      <div style={{ display: "flex", flexDirection: "column", gap: 1, fontSize: 8, color: "#a0b880" }}>
        <div>💰{p.gold} <span style={{ color: "#6a7a50" }}>+{i2.gold}/t</span></div>
        <div>🔬+{i2.science}/t{p.currentResearch && <span style={{ color: "#80b0d0" }}> →{TECH_TREE[p.currentResearch.techId]?.name} ({p.currentResearch.progress}/{TECH_TREE[p.currentResearch.techId]?.cost})</span>}</div>
        <div>🌾+{i2.food}/t ⚙+{i2.production}/t</div>
        <div style={{ color: "#5a6a4a" }}>🏛{p.cities.length} ⚔{p.units.length} 🗺{landOwned[p.id] || 0}/{totalLand}{barbarians.length > 0 && <span style={{ color: "#c05050" }}> 🏴‍☠️{barbarians.length}</span>}</div>
      </div>
    </div>
  );
}

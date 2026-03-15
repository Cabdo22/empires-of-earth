import React from "react";
import { TECH_TREE } from '../data/techs.js';
import { calcPlayerIncome } from '../engine/economy.js';

export function PlayerPanel({ cp, hexes, landOwned, totalLand, barbarians }) {
  const p = cp;
  const i2 = calcPlayerIncome(p, hexes);
  return (
    <div style={{ position: "absolute", top: 12, left: 14, zIndex: 10, background: "rgba(10,14,6,.8)", borderRadius: 6, padding: "6px 10px", border: `1px solid ${p.color}60`, minWidth: 120, pointerEvents: "auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}><div style={{ width: 7, height: 7, borderRadius: "50%", background: p.color, boxShadow: `0 0 6px ${p.color}50` }} /><span style={{ color: p.colorLight, fontSize: 12, fontWeight: 600, letterSpacing: 1.5 }}>{p.name}</span></div>
      <div style={{ display: "flex", flexDirection: "column", gap: 2, fontSize: 10, color: "#c8dca8" }}>
        <div title={`Gold: ${p.gold} in treasury, earning ${i2.gold} per turn`}>💰{p.gold} <span style={{ color: "#8a9a70" }}>+{i2.gold}/t</span></div>
        <div title={`Science: earning ${i2.science} research points per turn`}>🔬+{i2.science}/t{p.currentResearch && <span title={`Researching ${TECH_TREE[p.currentResearch.techId]?.name}: ${p.currentResearch.progress} of ${TECH_TREE[p.currentResearch.techId]?.cost} science needed`} style={{ color: "#90c8e0" }}> →{TECH_TREE[p.currentResearch.techId]?.name} ({p.currentResearch.progress}/{TECH_TREE[p.currentResearch.techId]?.cost})</span>}</div>
        <div><span title={`Food: ${i2.food} surplus per turn — feeds city growth`}>🌾+{i2.food}/t</span> <span title={`Production: ${i2.production} per turn — builds units and districts`}>⚙+{i2.production}/t</span></div>
        <div style={{ color: "#8a9a6a" }} title={`${p.cities.length} cities, ${p.units.length} units, ${landOwned[p.id] || 0} of ${totalLand} land tiles owned`}>🏛{p.cities.length} ⚔{p.units.length} 🗺{landOwned[p.id] || 0}/{totalLand}{barbarians.length > 0 && <span style={{ color: "#e06060" }} title={`${barbarians.length} barbarian units on the map`}> 🏴‍☠️{barbarians.length}</span>}</div>
      </div>
    </div>
  );
}

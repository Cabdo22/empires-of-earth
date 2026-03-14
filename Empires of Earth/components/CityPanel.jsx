import React from "react";
import { UNIT_DEFS } from '../data/units.js';
import { DISTRICT_DEFS } from '../data/districts.js';
import { calcCityYields } from '../engine/economy.js';
import { getAvailableUnits, getAvailableDistricts } from '../engine/economy.js';
import { btnStyle, panelStyle } from '../styles.js';

export function CityPanel({ city, cp, hexes, cityPosRef, cityCollapsed, setCityCollapsed, setShowCity, onPanelDown, setProd, cancelProduction }) {
  if (!city) return null;
  const y = calcCityYields(city, cp, hexes);
  const avU = getAvailableUnits(cp, city);
  const avD = getAvailableDistricts(cp, city);
  const cPos = cityPosRef.current;
  const cStyle = cPos.x != null ? { left: cPos.x, top: cPos.y } : { top: cPos.y, right: 14 };

  return (
    <div data-panel="city" style={{ ...panelStyle, ...cStyle, width: 280, maxHeight: cityCollapsed ? 40 : 420, overflowY: cityCollapsed ? "hidden" : "auto", transition: "max-height .2s ease" }}>
      <div onMouseDown={e => onPanelDown(e, "city")} style={{ display: "flex", justifyContent: "space-between", marginBottom: cityCollapsed ? 0 : 6, cursor: "grab", userSelect: "none" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button onClick={() => setCityCollapsed(!cityCollapsed)} style={{ ...btnStyle(false), fontSize: 10, padding: "1px 5px" }}>{cityCollapsed ? "▸" : "▾"}</button>
          <span style={{ fontSize: 13, color: "#ffd740", letterSpacing: 2 }}>{city.name}</span></div>
        <button onClick={() => setShowCity(null)} style={{ ...btnStyle(false), fontSize: 10 }}>✕</button></div>
      {!cityCollapsed && <>
        <div style={{ fontSize: 9, marginBottom: 6, display: "flex", gap: 8 }}><span>Pop:{city.population}</span><span style={{ color: "#7db840" }}>🌾{y.food}</span><span style={{ color: "#b89040" }}>⚙{y.production}</span><span style={{ color: "#60a0d0" }}>🔬{y.science}</span><span style={{ color: "#d0c050" }}>💰{y.gold}</span></div>
        <div style={{ fontSize: 8, color: "#6a7a50", marginBottom: 4 }}>Food:{city.foodAccumulated}/{city.population * 25} HP:{city.hp}/{city.hpMax || 20}</div>
        {city.districts.length > 0 && <div style={{ fontSize: 8, marginBottom: 6 }}><span style={{ color: "#6a7a50" }}>Districts: </span>{city.districts.map(d => <span key={d} style={{ color: "#a0b880", marginRight: 4 }}>{DISTRICT_DEFS[d]?.icon}{DISTRICT_DEFS[d]?.name}</span>)}</div>}
        {city.currentProduction ? <div style={{ fontSize: 9, padding: "4px 8px", background: "rgba(80,120,40,.3)", borderRadius: 4, marginBottom: 6 }}>
          Building: {city.currentProduction.type === "unit" ? UNIT_DEFS[city.currentProduction.itemId]?.name : DISTRICT_DEFS[city.currentProduction.itemId]?.name}
          <span style={{ color: "#6a7a50" }}> ({city.productionProgress}/{(() => { const isU = city.currentProduction.type === "unit"; let c = isU ? UNIT_DEFS[city.currentProduction.itemId]?.cost : DISTRICT_DEFS[city.currentProduction.itemId]?.cost; if (isU) { if (cp.civilization === "Germany") c -= 3; if (cp.researchedTechs.includes("conscription")) c -= 2; c = Math.max(1, c); } return c; })()})</span>
          <button onClick={() => cancelProduction(city.id)} style={{ ...btnStyle(false), fontSize: 7, marginLeft: 6, padding: "2px 4px" }}>✕</button>
        </div>
          : <div><div style={{ fontSize: 9, color: "#c8d8a0", marginBottom: 4 }}>Build:</div>
            <div style={{ fontSize: 8, color: "#6a7a50", marginBottom: 2 }}>UNITS</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 2, marginBottom: 6 }}>{avU.map(u => <button key={u.id} onClick={() => setProd(city.id, "unit", u.id)} title={`Str:${u.strength} HP:${u.hp} Mv:${u.move}${u.range ? ` Rng:${u.range}` : ""} [${u.domain}]`} style={{ ...btnStyle(false), fontSize: 8, padding: "3px 6px" }}>{u.icon}{u.name}<span style={{ color: "#5a6a4a" }}>({u.cost}⚙)</span></button>)}</div>
            <div style={{ fontSize: 8, color: "#6a7a50", marginBottom: 2 }}>DISTRICTS</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 2 }}>{avD.map(d => <button key={d.id} onClick={() => setProd(city.id, "district", d.id)} style={{ ...btnStyle(false), fontSize: 8, padding: "3px 6px" }}>{d.icon}{d.name}<span style={{ color: "#5a6a4a" }}>({d.cost}⚙)</span></button>)}</div>
          </div>}</>}
    </div>
  );
}

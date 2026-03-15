import React from "react";
import { UNIT_DEFS } from '../data/units.js';
import { DISTRICT_DEFS } from '../data/districts.js';
import { TERRAIN_INFO, RESOURCE_INFO } from '../data/terrain.js';
import { calcCityYields, getHexYields, isWorkableHex } from '../engine/economy.js';
import { getAvailableUnits, getAvailableDistricts } from '../engine/economy.js';
import { btnStyle, panelStyle } from '../styles.js';

export function CityPanel({ city, cp, hexes, cityPosRef, cityCollapsed, setCityCollapsed, setShowCity, onPanelDown, setProd, cancelProduction }) {
  if (!city) return null;
  const y = calcCityYields(city, cp, hexes);
  const avU = getAvailableUnits(cp, city, hexes);
  const avD = getAvailableDistricts(cp, city);
  const cPos = cityPosRef.current;
  const cStyle = cPos.x != null ? { left: cPos.x, top: cPos.y } : { top: cPos.y, right: 14 };

  // Food surplus and growth
  const foodConsumed = city.population * 2;
  const surplus = y.food - foodConsumed;
  const growthThreshold = 5 + city.population * city.population * 2;

  // Worked tiles info
  const centerHex = hexes[city.hexId];
  const centerY = centerHex ? getHexYields(centerHex) : { food: 0, production: 0, gold: 0 };
  const workedTiles = (city.workedTileIds || []).map(hid => {
    const h = hexes[hid];
    return { hex: h, yields: getHexYields(h) };
  });

  return (
    <div data-panel="city" style={{ ...panelStyle, ...cStyle, width: 320, maxHeight: cityCollapsed ? 40 : 500, overflowY: cityCollapsed ? "hidden" : "auto", transition: "max-height .2s ease" }}>
      <div onMouseDown={e => onPanelDown(e, "city")} style={{ display: "flex", justifyContent: "space-between", marginBottom: cityCollapsed ? 0 : 6, cursor: "grab", userSelect: "none" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button onClick={() => setCityCollapsed(!cityCollapsed)} style={{ ...btnStyle(false), fontSize: 10, padding: "1px 5px" }}>{cityCollapsed ? "▸" : "▾"}</button>
          <span style={{ fontSize: 15, color: "#ffd740", fontWeight: 600, letterSpacing: 2 }}>{city.name}</span></div>
        <button onClick={() => setShowCity(null)} style={{ ...btnStyle(false), fontSize: 12 }}>✕</button></div>
      {!cityCollapsed && <>
        <div style={{ fontSize: 11, marginBottom: 4, display: "flex", gap: 8, fontWeight: 600 }}><span>Pop:{city.population}</span><span style={{ color: "#7db840" }}>🌾{y.food}</span><span style={{ color: "#b89040" }}>⚙{y.production}</span><span style={{ color: "#60a0d0" }}>🔬{y.science}</span><span style={{ color: "#d0c050" }}>💰{y.gold}</span></div>
        <div style={{ fontSize: 10, color: "#8a9a70", marginBottom: 2 }}>Growth: {city.foodAccumulated}/{growthThreshold} <span style={{ color: surplus > 0 ? "#90d070" : "#c08040" }}>(+{Math.max(0, surplus)}/turn)</span> Eats: {foodConsumed}🌾</div>
        <div style={{ fontSize: 10, color: "#8a9a70", marginBottom: 4 }}>HP: {city.hp}/{city.hpMax || 20}</div>

        {/* Worked Tiles */}
        <div style={{ fontSize: 10, color: "#c8d8a0", fontWeight: 600, marginBottom: 2 }}>Tiles ({(city.workedTileIds || []).length + 1} worked)</div>
        <div style={{ fontSize: 9, padding: "3px 5px", background: "rgba(80,120,40,.15)", borderRadius: 3, marginBottom: 1 }}>
          <span style={{ color: "#b0c890" }}>City Center ({TERRAIN_INFO[centerHex?.terrainType]?.label || "?"})</span>
          <span style={{ float: "right" }}>🌾{centerY.food} ⚙{centerY.production}{centerY.science > 0 && <> 🔬{centerY.science}</>} 💰{centerY.gold}</span>
        </div>
        {workedTiles.map(({ hex: h, yields: ty }) => (
          <div key={h.id} style={{ fontSize: 9, padding: "3px 5px", background: "rgba(80,120,40,.1)", borderRadius: 3, marginBottom: 1 }}>
            <span style={{ color: "#9aaa7a" }}>{TERRAIN_INFO[h.terrainType]?.label}{h.resource ? ` ${RESOURCE_INFO[h.resource]?.icon}` : ''}</span>
            <span style={{ float: "right" }}>🌾{ty.food} ⚙{ty.production}{ty.science > 0 && <> 🔬{ty.science}</>} 💰{ty.gold}</span>
          </div>
        ))}
        <div style={{ marginBottom: 4 }} />

        {city.districts.length > 0 && <div style={{ fontSize: 10, marginBottom: 6 }}><span style={{ color: "#8a9a70" }}>Districts: </span>{city.districts.map(d => <span key={d} style={{ color: "#b0c890", marginRight: 4 }}>{DISTRICT_DEFS[d]?.icon}{DISTRICT_DEFS[d]?.name}</span>)}</div>}
        {city.currentProduction ? <div style={{ fontSize: 11, padding: "5px 8px", background: "rgba(80,120,40,.3)", borderRadius: 4, marginBottom: 6 }}>
          Building: {city.currentProduction.type === "unit" ? UNIT_DEFS[city.currentProduction.itemId]?.name : DISTRICT_DEFS[city.currentProduction.itemId]?.name}
          <span style={{ color: "#8a9a70" }}> ({city.productionProgress}/{(() => { const isU = city.currentProduction.type === "unit"; let c = isU ? UNIT_DEFS[city.currentProduction.itemId]?.cost : DISTRICT_DEFS[city.currentProduction.itemId]?.cost; if (isU) { if (cp.civilization === "Germany") c -= 3; if (cp.researchedTechs.includes("conscription")) c -= 2; c = Math.max(1, c); } return c; })()})</span>
          <button onClick={() => cancelProduction(city.id)} style={{ ...btnStyle(false), fontSize: 8, marginLeft: 6, padding: "2px 5px" }}>✕</button>
        </div>
          : <div><div style={{ fontSize: 12, color: "#dce8c0", fontWeight: 600, marginBottom: 5 }}>Build:</div>
            <div style={{ fontSize: 10, color: "#8a9a70", fontWeight: 600, letterSpacing: 1, marginBottom: 3 }}>UNITS</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginBottom: 6 }}>{avU.map(u => <button key={u.id} onClick={() => setProd(city.id, "unit", u.id)} title={`Str:${u.strength} HP:${u.hp} Mv:${u.move}${u.range ? ` Rng:${u.range}` : ""} [${u.domain}]`} style={{ ...btnStyle(false), fontSize: 10, padding: "4px 8px" }}>{u.icon}{u.name}<span style={{ color: "#b89040", fontWeight: 700, fontSize: 11, marginLeft: 2 }}>({u.cost}⚙)</span></button>)}</div>
            <div style={{ fontSize: 10, color: "#8a9a70", fontWeight: 600, letterSpacing: 1, marginBottom: 3 }}>DISTRICTS</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>{avD.map(d => <button key={d.id} onClick={() => setProd(city.id, "district", d.id)} style={{ ...btnStyle(false), fontSize: 10, padding: "4px 8px" }}>{d.icon}{d.name}<span style={{ color: "#b89040", fontWeight: 700, fontSize: 11, marginLeft: 2 }}>({d.cost}⚙)</span></button>)}</div>
          </div>}</>}
    </div>
  );
}

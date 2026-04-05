import React from "react";
import { UNIT_DEFS } from '../data/units.js';
import { DISTRICT_DEFS } from '../data/districts.js';
import { PROJECT_DEFS } from '../data/projects.js';
import { TERRAIN_INFO, RESOURCE_INFO } from '../data/terrain.js';
import { calcCityYields, getHexYields, isWorkableHex } from '../engine/economy.js';
import { getAvailableUnits, getAvailableDistricts, getAvailableProjects } from '../engine/economy.js';
import { TRADE_FOCUS } from '../data/constants.js';
import { btnStyle, panelStyle } from '../styles.js';

export function CityPanel({ city, cp, hexes, cityPosRef, cityCollapsed, setCityCollapsed, setShowCity, onPanelDown, setProd, cancelProduction, toggleTile, maximizeTiles, setTradeFocus, allCities, discoveredResources }) {
  if (!city) return null;
  const y = calcCityYields(city, cp, hexes);
  const avU = getAvailableUnits(cp, city, hexes);
  const avD = getAvailableDistricts(cp, city, hexes);
  const avP = getAvailableProjects(cp, city);
  const cPos = cityPosRef.current;
  const cStyle = cPos.x != null ? { left: cPos.x, top: cPos.y } : { top: cPos.y, right: 14 };

  // Food surplus and growth
  const foodConsumed = city.population * 2;
  const surplus = y.food - foodConsumed;
  const growthThreshold = Math.floor(2 + city.population * 3);

  // Worked tiles info
  const centerHex = hexes[city.hexId];
  const centerY = centerHex ? getHexYields(centerHex, cp) : { food: 0, production: 0, gold: 0 };
  const workedTiles = (city.workedTileIds || []).map(hid => {
    const h = hexes[hid];
    return { hex: h, yields: getHexYields(h, cp) };
  });

  // Available (unworked) tiles in city borders
  const workedSet = new Set(city.workedTileIds || []);
  const slotsUsed = workedSet.size;
  const slotsAvailable = (city.population || 1) - slotsUsed;
  const unworkedTiles = (city.borderHexIds || [])
    .filter(hid => hid !== city.hexId && !workedSet.has(hid) && isWorkableHex(hexes[hid]))
    .map(hid => ({ hex: hexes[hid], yields: getHexYields(hexes[hid], cp) }))
    .sort((a, b) => (b.yields.food + b.yields.production + b.yields.gold) - (a.yields.food + a.yields.production + a.yields.gold));

  return (
    <div data-panel="city" style={{ ...panelStyle, ...cStyle, width: 320, maxHeight: cityCollapsed ? 40 : 560, overflowY: cityCollapsed ? "hidden" : "auto", transition: "max-height .2s ease" }}>
      <div onMouseDown={e => onPanelDown(e, "city")} style={{ display: "flex", justifyContent: "space-between", marginBottom: cityCollapsed ? 0 : 6, cursor: "grab", userSelect: "none" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button onClick={() => setCityCollapsed(!cityCollapsed)} style={{ ...btnStyle(false), fontSize: 10, padding: "1px 5px" }}>{cityCollapsed ? "▸" : "▾"}</button>
          <span style={{ fontSize: 15, color: "#ffd740", fontWeight: 600, letterSpacing: 2 }}>{city.name}</span></div>
        <button onClick={() => setShowCity(null)} style={{ ...btnStyle(false), fontSize: 12 }}>✕</button></div>
      {!cityCollapsed && <>
        <div style={{ fontSize: 11, marginBottom: 4, display: "flex", gap: 8, fontWeight: 600 }}><span>Pop:{city.population}</span><span style={{ color: "#7db840" }}>🌾{y.food}</span><span style={{ color: "#b89040" }}>⚙{y.production}</span><span style={{ color: "#60a0d0" }}>🔬{y.science}</span><span style={{ color: "#d0c050" }}>💰{y.gold}</span></div>
        <div style={{ fontSize: 10, color: "#8a9a70", marginBottom: 2 }}>Growth: {city.foodAccumulated}/{growthThreshold} <span style={{ color: surplus > 0 ? "#90d070" : "#c08040" }}>(+{Math.max(0, surplus)}/turn)</span> Eats: {foodConsumed}🌾</div>
        <div style={{ fontSize: 10, color: "#8a9a70", marginBottom: 4 }}>HP: {city.hp}/{city.hpMax || 20}</div>

        {/* Maximize buttons */}
        <div style={{ display: "flex", gap: 3, marginBottom: 4, alignItems: "center" }}>
          <span style={{ fontSize: 9, color: "#8a9a70", marginRight: 2 }}>Maximize:</span>
          {[{k:"food",icon:"🌾",c:"#7db840"},{k:"production",icon:"⚙",c:"#b89040"},{k:"gold",icon:"💰",c:"#d0c050"},{k:"science",icon:"🔬",c:"#60a0d0"}].map(p =>
            <button key={p.k} onClick={() => maximizeTiles(city.id, p.k)}
              style={{...btnStyle(false), fontSize: 9, padding: "3px 7px", marginBottom: 0, marginRight: 0}}
              title={`Auto-assign tiles for maximum ${p.k}`}><span style={{color: p.c}}>{p.icon}</span></button>
          )}
          {city.manualTiles && <span style={{ fontSize: 8, color: "#d0a040", marginLeft: 3, fontStyle: "italic" }}>(Manual)</span>}
        </div>

        {/* Worked Tiles */}
        <div style={{ fontSize: 10, color: "#c8d8a0", fontWeight: 600, marginBottom: 2 }}>Tiles ({slotsUsed}/{city.population} worked)</div>
        <div style={{ fontSize: 9, padding: "3px 5px", background: "rgba(80,120,40,.15)", borderRadius: 3, marginBottom: 1 }}>
          <span style={{ color: "#b0c890" }}>City Center ({TERRAIN_INFO[centerHex?.terrainType]?.label || "?"})</span>
          <span style={{ float: "right" }}>🌾{centerY.food} ⚙{centerY.production}{centerY.science > 0 && <> 🔬{centerY.science}</>} 💰{centerY.gold}</span>
        </div>
        {workedTiles.map(({ hex: h, yields: ty }) => (
          <div key={h.id} onClick={() => toggleTile(city.id, h.id)}
            style={{ fontSize: 9, padding: "3px 5px", background: "rgba(80,120,40,.18)", borderRadius: 3, marginBottom: 1, cursor: "pointer", border: "1px solid rgba(100,160,50,.25)", display: "flex", justifyContent: "space-between", alignItems: "center" }}
            title="Click to unassign this tile">
            <span style={{ color: "#b0c890" }}>{TERRAIN_INFO[h.terrainType]?.label}{h.resource && discoveredResources?.has(h.resource) ? ` ${RESOURCE_INFO[h.resource]?.icon}` : ''}</span>
            <span><span style={{ marginRight: 6 }}>🌾{ty.food} ⚙{ty.production}{ty.science > 0 && <> 🔬{ty.science}</>} 💰{ty.gold}</span><span style={{ color: "#c05050", fontSize: 8, fontWeight: 700 }}>✕</span></span>
          </div>
        ))}

        {/* Unworked (available) tiles */}
        {unworkedTiles.length > 0 && <>
          <div style={{ fontSize: 9, color: "#6a7a50", fontWeight: 600, marginTop: 4, marginBottom: 2, letterSpacing: 1 }}>AVAILABLE{slotsAvailable > 0 ? ` (${slotsAvailable} slot${slotsAvailable !== 1 ? 's' : ''})` : ' (full)'}</div>
          {unworkedTiles.map(({ hex: h, yields: ty }) => (
            <div key={h.id} onClick={() => slotsAvailable > 0 ? toggleTile(city.id, h.id) : null}
              style={{ fontSize: 9, padding: "3px 5px", background: "rgba(40,50,30,.3)", borderRadius: 3, marginBottom: 1, cursor: slotsAvailable > 0 ? "pointer" : "default", opacity: slotsAvailable > 0 ? 0.8 : 0.4, display: "flex", justifyContent: "space-between", alignItems: "center" }}
              title={slotsAvailable > 0 ? "Click to assign this tile" : "No available slots"}>
              <span style={{ color: "#7a8a6a" }}>{TERRAIN_INFO[h.terrainType]?.label}{h.resource && discoveredResources?.has(h.resource) ? ` ${RESOURCE_INFO[h.resource]?.icon}` : ''}</span>
              <span>{slotsAvailable > 0 && <span style={{ color: "#90d070", fontSize: 8, fontWeight: 700, marginRight: 6 }}>+</span>}🌾{ty.food} ⚙{ty.production}{ty.science > 0 && <> 🔬{ty.science}</>} 💰{ty.gold}</span>
            </div>
          ))}
        </>}
        <div style={{ marginBottom: 4 }} />

        {city.districts.length > 0 && <div style={{ fontSize: 10, marginBottom: 6 }}><span style={{ color: "#8a9a70" }}>Districts: </span>{city.districts.map(d => <span key={d} style={{ color: "#b0c890", marginRight: 4 }}>{DISTRICT_DEFS[d]?.icon}{DISTRICT_DEFS[d]?.name}</span>)}</div>}
        {(city.tradeRoutes || []).length > 0 && <>
          <div style={{ fontSize: 10, color: "#c8d8a0", fontWeight: 600, marginBottom: 2 }}>Trade Routes ({city.tradeRoutes.length})</div>
          {city.tradeRoutes.map((route, idx) => {
            const targetCity = (allCities || []).find(c => c.id === route.targetCityId);
            const focus = TRADE_FOCUS[route.focus] || TRADE_FOCUS.merchant;
            return (
              <div key={idx} style={{ fontSize: 9, padding: "3px 5px", background: "rgba(200,180,60,.1)", borderRadius: 3, marginBottom: 2, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>{route.isInternational ? "🌐" : "🛣"} {targetCity?.name || "?"} <span style={{ color: "#8a9a70" }}>({route.distance}hex)</span></span>
                <select value={route.focus} onChange={e => setTradeFocus && setTradeFocus(city.id, idx, e.target.value)}
                  style={{ fontSize: 8, background: "#1a2a10", color: "#c8d8a0", border: "1px solid #3a4a2a", borderRadius: 3, padding: "1px 3px" }}>
                  {Object.entries(TRADE_FOCUS).map(([k, v]) => (
                    <option key={k} value={k}>{v.icon} {v.label} ({v.desc})</option>
                  ))}
                </select>
              </div>
            );
          })}
          <div style={{ marginBottom: 4 }} />
        </>}
        {city.currentProduction ? <div style={{ fontSize: 11, padding: "5px 8px", background: "rgba(80,120,40,.3)", borderRadius: 4, marginBottom: 6 }}>
          Building: {city.currentProduction.type === "unit" ? UNIT_DEFS[city.currentProduction.itemId]?.name : city.currentProduction.type === "project" ? PROJECT_DEFS[city.currentProduction.itemId]?.name : DISTRICT_DEFS[city.currentProduction.itemId]?.name}
          <span style={{ color: "#8a9a70" }}> ({city.productionProgress}/{(() => { const isU = city.currentProduction.type === "unit"; const isP = city.currentProduction.type === "project"; let c = isU ? UNIT_DEFS[city.currentProduction.itemId]?.cost : isP ? PROJECT_DEFS[city.currentProduction.itemId]?.cost : DISTRICT_DEFS[city.currentProduction.itemId]?.cost; if (isU) { if (cp.civilization === "Germany") c -= 3; if (cp.researchedTechs.includes("conscription")) c -= 2; if (city.currentProduction.itemId === "settler") c += Math.max(0, ((cp.cities?.length || 1) - 1) * 4); c = Math.max(1, c); } return c; })()})</span>
          <button onClick={() => cancelProduction(city.id)} style={{ ...btnStyle(false), fontSize: 8, marginLeft: 6, padding: "2px 5px" }}>✕</button>
        </div>
          : <div><div style={{ fontSize: 12, color: "#dce8c0", fontWeight: 600, marginBottom: 5 }}>Build:</div>
            <div style={{ fontSize: 10, color: "#8a9a70", fontWeight: 600, letterSpacing: 1, marginBottom: 3 }}>UNITS</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginBottom: 6 }}>{avU.map(u => <button key={u.id} onClick={() => setProd(city.id, "unit", u.id)} title={`Str:${u.strength} HP:${u.hp} Mv:${u.move}${u.range ? ` Rng:${u.range}` : ""} [${u.domain}]`} style={{ ...btnStyle(false), fontSize: 10, padding: "4px 8px" }}>{u.icon}{u.name}<span style={{ color: "#b89040", fontWeight: 700, fontSize: 11, marginLeft: 2 }}>({u.id === "settler" ? u.cost + Math.max(0, ((cp.cities?.length || 1) - 1) * 4) : u.cost}⚙)</span></button>)}</div>
            <div style={{ fontSize: 10, color: "#8a9a70", fontWeight: 600, letterSpacing: 1, marginBottom: 3 }}>DISTRICTS</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginBottom: avP.length > 0 ? 6 : 0 }}>{avD.map(d => <button key={d.id} onClick={() => setProd(city.id, "district", d.id)} style={{ ...btnStyle(false), fontSize: 10, padding: "4px 8px" }}>{d.icon}{d.name}<span style={{ color: "#b89040", fontWeight: 700, fontSize: 11, marginLeft: 2 }}>({d.cost}⚙)</span></button>)}</div>
            {avP.length > 0 && <>
              <div style={{ fontSize: 10, color: "#8a9a70", fontWeight: 600, letterSpacing: 1, marginBottom: 3 }}>PROJECTS</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>{avP.map(p => <button key={p.id} onClick={() => setProd(city.id, "project", p.id)} style={{ ...btnStyle(false), fontSize: 10, padding: "4px 8px" }}>{p.icon}{p.name}<span style={{ color: "#60a0d0", fontWeight: 700, fontSize: 11, marginLeft: 2 }}>({p.cost}⚙)</span></button>)}</div>
            </>}
          </div>}</>}
    </div>
  );
}

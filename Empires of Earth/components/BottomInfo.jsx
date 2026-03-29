import React from "react";
import { TERRAIN_INFO, RESOURCE_INFO } from '../data/terrain.js';
import { UNIT_DEFS } from '../data/units.js';
import { getHexYields } from '../engine/economy.js';
import { getDisplayName, getDisplayColors } from '../engine/discovery.js';

export function BottomInfo({ selH, hexes, unitMap, players, settlerM, setSettlerM, nukeM, setNukeM, moveMsg, buildRoad, cp, gs, viewPlayerId }) {
  return (
    <>
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 48, background: "linear-gradient(0deg,rgba(10,14,6,.95) 0%,rgba(10,14,6,0) 100%)", zIndex: 10, display: "flex", alignItems: "flex-end", justifyContent: "center", paddingBottom: 8, pointerEvents: "none" }}>
        {selH != null && hexes[selH] ? (() => {
          const sd = hexes[selH], si = TERRAIN_INFO[sd.terrainType]; const uH = unitMap[`${sd.col},${sd.row}`] || []; const oP = sd.ownerPlayerId ? players.find(p => p.id === sd.ownerPlayerId) : null;
          return (
            <div style={{ background: "rgba(15,25,10,.9)", border: "1px solid rgba(100,140,50,.3)", borderRadius: 8, padding: "5px 16px", color: "#a0b880", fontSize: 9, letterSpacing: 1, display: "flex", gap: 10, alignItems: "center" }}>
              <span style={{ color: "#c8d8a0", fontWeight: 600 }}>({sd.col},{sd.row})</span><span style={{ color: si.color }}>{si.label}</span>
              {sd.resource && (!RESOURCE_INFO[sd.resource]?.techReq || cp?.researchedTechs?.includes(RESOURCE_INFO[sd.resource].techReq)) && <span>{RESOURCE_INFO[sd.resource].icon}{RESOURCE_INFO[sd.resource].label}</span>}
              {(() => { const hy = getHexYields(sd, cp); return <><span style={{ color: "#7db840" }}>F{hy.food}</span><span style={{ color: "#b89040" }}>P{hy.production}</span>{hy.gold > 0 && <span style={{ color: "#d0c050" }}>G{hy.gold}</span>}{hy.science > 0 && <span style={{ color: "#60a0d0" }}>S{hy.science}</span>}</>; })()}
              <span style={{ color: si.moveCost != null ? "#a0b880" : "#c05050" }}>{si.moveCost != null ? `Mv${sd.road ? "0.5" : si.moveCost}` : "—"}</span>
              {sd.road && <span style={{ color: "#c8a060" }}>🛣Road</span>}
              {!sd.road && buildRoad && cp && sd.ownerPlayerId === cp.id && cp.researchedTechs.includes("trade") && sd.terrainType !== "water" && sd.terrainType !== "mountain" && cp.gold >= 5 && <span style={{ pointerEvents: "auto", cursor: "pointer", color: "#c8a060", background: "rgba(160,128,96,.2)", borderRadius: 3, padding: "1px 4px" }} onClick={() => buildRoad(sd.id)}>🛣+Road(5g)</span>}
              {si.defBonus > 0 && <span style={{ color: "#60a0d0" }}>+{si.defBonus}def</span>}
              {uH.length > 0 && <span style={{ color: "#ffd740" }}>{uH.map(u => UNIT_DEFS[u.unitType]?.icon).join("")}</span>}
              {oP && (() => { const dc = getDisplayColors(oP.id, viewPlayerId, gs); const dn = getDisplayName(oP.id, viewPlayerId, gs); return <span style={{ color: dc.colorLight }}>⚑{dn.slice(0, 8)}</span>; })()}
            </div>
          );
        })() : (<span style={{ color: "#3a4a2a", fontSize: 9, letterSpacing: 2 }}>Tab=cycle Esc=deselect RightClick=move/attack</span>)}
      </div>

      {settlerM && <div style={{ position: "absolute", bottom: 52, left: "50%", transform: "translateX(-50%)", zIndex: 20, background: "rgba(40,80,20,.9)", border: "1px solid #40e040", borderRadius: 6, padding: "6px 16px", color: "#a0f0a0", fontSize: 10, pointerEvents: "auto" }}>🏕 Click land hex to found city · <span style={{ cursor: "pointer", color: "#f08080" }} onClick={() => setSettlerM(null)}>Cancel</span></div>}
      {nukeM && <div style={{ position: "absolute", bottom: 52, left: "50%", transform: "translateX(-50%)", zIndex: 20, background: "rgba(80,40,0,.9)", border: "1px solid #ffa000", borderRadius: 6, padding: "6px 16px", color: "#ffd080", fontSize: 10, pointerEvents: "auto" }}>☢ Click target for nuclear strike (1-hex blast) · <span style={{ cursor: "pointer", color: "#f08080" }} onClick={() => setNukeM(null)}>Cancel</span></div>}
      {moveMsg && <div style={{ position: "absolute", bottom: 52, left: "50%", transform: "translateX(-50%)", zIndex: 20, background: "rgba(80,20,10,.92)", border: "1px solid rgba(240,100,60,.6)", borderRadius: 6, padding: "6px 16px", color: "#ffa080", fontSize: 10, pointerEvents: "none" }}>⚠ {moveMsg}</div>}
    </>
  );
}

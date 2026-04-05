import React from "react";
import { TERRAIN_INFO, RESOURCE_INFO } from "../data/terrain.js";
import { UNIT_DEFS } from "../data/units.js";
import { getHexYields } from "../engine/economy.js";
import { getDisplayColors, getDisplayName } from "../engine/discovery.js";
import { hudButtonStyle, hudPanelStyle, hudSectionLabelStyle, hudValueStyle } from "../styles.js";

function ActionBanner({ tone = "neutral", children }) {
  const tones = {
    success: { background: "rgba(30,68,20,.94)", border: "1px solid rgba(90,210,90,.45)", color: "#b8efb8" },
    warning: { background: "rgba(88,42,6,.94)", border: "1px solid rgba(255,170,68,.5)", color: "#ffd49a" },
    danger: { background: "rgba(86,24,14,.94)", border: "1px solid rgba(240,100,60,.6)", color: "#ffb09a" },
  };
  const palette = tones[tone];
  return (
    <div style={{ position: "absolute", bottom: 70, left: "50%", transform: "translateX(-50%)", zIndex: 20, borderRadius: 12, padding: "10px 18px", pointerEvents: "auto", ...palette }}>
      {children}
    </div>
  );
}

export function BottomInfo({
  selH,
  hexes,
  unitMap,
  players,
  settlerM,
  setSettlerM,
  nukeM,
  setNukeM,
  moveMsg,
  buildRoad,
  cp,
  gs,
  viewPlayerId,
}) {
  const selectedHex = selH != null ? hexes[selH] : null;
  const expanded = !!selectedHex;

  return (
    <>
      <div style={{ position: "absolute", left: 14, right: 214, bottom: 12, zIndex: 12, display: "flex", justifyContent: "center", pointerEvents: "none" }}>
        {!expanded ? (
          <div
            style={{
              width: "min(760px, 100%)",
              padding: "6px 14px",
              borderRadius: 999,
              background: "rgba(10,16,8,.55)",
              border: "1px solid rgba(118,150,75,.22)",
              color: "#95a67a",
              fontSize: 12,
              letterSpacing: 0.2,
              textAlign: "center",
              pointerEvents: "auto",
            }}
          >
            Click a visible hex for terrain details. Tab cycles ready units.
          </div>
        ) : (
          <div
            style={{
              ...hudPanelStyle,
              width: "min(900px, 100%)",
              padding: "12px 16px",
              display: "grid",
              gridTemplateColumns: "1.25fr 1fr .9fr",
              gap: 14,
              pointerEvents: "auto",
            }}
          >
            {(() => {
              const terrain = TERRAIN_INFO[selectedHex.terrainType];
              const bucket = unitMap[`${selectedHex.col},${selectedHex.row}`];
              const unitsHere = bucket?.all || [];
              const owner = selectedHex.ownerPlayerId ? players.find((p) => p.id === selectedHex.ownerPlayerId) : null;
              const visibleResource =
                selectedHex.resource &&
                (!RESOURCE_INFO[selectedHex.resource]?.techReq || cp?.researchedTechs?.includes(RESOURCE_INFO[selectedHex.resource].techReq))
                  ? RESOURCE_INFO[selectedHex.resource]
                  : null;
              const yields = getHexYields(selectedHex, cp);
              return (
                <>
                  <div>
                    <div style={{ ...hudSectionLabelStyle, marginBottom: 5 }}>Selected Tile</div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
                      <div style={{ ...hudValueStyle, fontSize: 21, color: terrain.color }}>{terrain.label}</div>
                      <div style={{ color: "#93a679", fontSize: 12 }}>({selectedHex.col}, {selectedHex.row})</div>
                      {visibleResource && <div style={{ color: "#f1df94", fontSize: 13 }}>{visibleResource.icon} {visibleResource.label}</div>}
                    </div>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 8 }}>
                      <span style={{ color: "#9bd56e", fontSize: 13 }}>Food {yields.food}</span>
                      <span style={{ color: "#d0a46b", fontSize: 13 }}>Prod {yields.production}</span>
                      {yields.gold > 0 && <span style={{ color: "#eed36a", fontSize: 13 }}>Gold {yields.gold}</span>}
                      {yields.science > 0 && <span style={{ color: "#89bddb", fontSize: 13 }}>Sci {yields.science}</span>}
                    </div>
                    <div style={{ color: "#aebc96", fontSize: 12 }}>
                      {owner ? (() => {
                        const colors = getDisplayColors(owner.id, viewPlayerId, gs);
                        const name = getDisplayName(owner.id, viewPlayerId, gs);
                        return <span style={{ color: colors.colorLight }}>Owner: {name}</span>;
                      })() : "Unclaimed territory"}
                      <span style={{ marginLeft: 12, color: terrain.moveCost != null ? "#d7e2c0" : "#f19a8d" }}>
                        {terrain.moveCost != null ? `Move ${selectedHex.road ? "0.5" : terrain.moveCost}` : "Impassable"}
                      </span>
                      {terrain.defBonus > 0 && <span style={{ marginLeft: 12, color: "#91bde0" }}>Defense +{terrain.defBonus}</span>}
                    </div>
                  </div>
                  <div>
                    <div style={{ ...hudSectionLabelStyle, marginBottom: 5 }}>Occupants</div>
                    <div style={{ minHeight: 74, borderRadius: 12, border: "1px solid rgba(126,154,78,.2)", background: "rgba(18,26,12,.68)", padding: "10px 12px" }}>
                      {unitsHere.length > 0 ? (
                        <div style={{ display: "grid", gap: 7 }}>
                          {unitsHere.slice(0, 3).map((unit) => (
                            <div key={unit.id} style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                              <div style={{ color: unit.pLight || "#dbe7c4", fontSize: 13 }}>{UNIT_DEFS[unit.unitType]?.icon} {UNIT_DEFS[unit.unitType]?.name || unit.unitType}</div>
                              <div style={{ color: "#97ab7a", fontSize: 12 }}>HP {unit.hpCurrent}/{UNIT_DEFS[unit.unitType]?.hp}</div>
                            </div>
                          ))}
                          {unitsHere.length > 3 && <div style={{ color: "#8fa072", fontSize: 11 }}>+{unitsHere.length - 3} more units</div>}
                        </div>
                      ) : <div style={{ color: "#8da06f", fontSize: 12 }}>No units on this tile.</div>}
                    </div>
                  </div>
                  <div>
                    <div style={{ ...hudSectionLabelStyle, marginBottom: 5 }}>Context</div>
                    <div style={{ minHeight: 74, borderRadius: 12, border: "1px solid rgba(126,154,78,.2)", background: "rgba(18,26,12,.68)", padding: "10px 12px", display: "flex", flexDirection: "column", justifyContent: "space-between", gap: 8 }}>
                      {!selectedHex.road && buildRoad && cp && selectedHex.ownerPlayerId === cp.id && cp.researchedTechs.includes("trade") && selectedHex.terrainType !== "water" && selectedHex.terrainType !== "mountain" && cp.gold >= 5 ? (
                        <button onClick={() => buildRoad(selectedHex.id)} style={{ ...hudButtonStyle(false), width: "100%" }}>🛣 Build Road for 5 gold</button>
                      ) : (
                        <div style={{ color: "#a6b593", fontSize: 12 }}>{selectedHex.road ? "This tile already has a road." : "No direct tile action is available."}</div>
                      )}
                      <div style={{ color: "#8ea174", fontSize: 12, lineHeight: 1.4 }}>Right-click to move or attack. Esc clears selection.</div>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        )}
      </div>

      {settlerM && <ActionBanner tone="success">🏕 Click a land hex to found a city. <span style={{ cursor: "pointer", color: "#ffd0d0" }} onClick={() => setSettlerM(null)}>Cancel</span></ActionBanner>}
      {nukeM && <ActionBanner tone="warning">☢ Select a target for a one-hex nuclear strike. <span style={{ cursor: "pointer", color: "#ffd0d0" }} onClick={() => setNukeM(null)}>Cancel</span></ActionBanner>}
      {moveMsg && <ActionBanner tone="danger">⚠ {moveMsg}</ActionBanner>}
    </>
  );
}

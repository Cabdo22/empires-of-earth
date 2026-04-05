import React from "react";
import { UNIT_DEFS } from '../data/units.js';
import { canUpgradeUnit } from '../engine/economy.js';
import { btnStyle } from '../styles.js';

export function ActionBar({ showTech, setShowTech, showDiplomacy, setShowDiplomacy, showSaveLoad, setShowSaveLoad, tutorialOn, setTutorialOn, setTutorialDismissed, performanceMode, setPerformanceMode, sud, selU, settlerM, setSettlerM, nukeM, setNukeM, upgradeUnit, cp, actable }) {
  return (
    <>
      {/* Left sidebar buttons (Tech, Diplomacy, Save/Load, Tips) */}
      <div style={{ position: "absolute", top: 115, left: 14, zIndex: 10, display: "flex", flexDirection: "column", gap: 6, pointerEvents: "auto" }}>
        <button onClick={() => setShowTech(!showTech)} style={{ ...btnStyle(showTech), marginRight: 0, marginBottom: 0, padding: "8px 22px", fontSize: 13, letterSpacing: 1 }}>🔬 Tech Tree</button>
        <button onClick={() => setShowDiplomacy(!showDiplomacy)} style={{ ...btnStyle(showDiplomacy), marginRight: 0, marginBottom: 0, padding: "8px 22px", fontSize: 13, letterSpacing: 1 }}>🕊 Diplomacy</button>
        <button onClick={() => setShowSaveLoad(!showSaveLoad)} style={{ ...btnStyle(showSaveLoad), marginRight: 0, marginBottom: 0, padding: "8px 22px", fontSize: 13, letterSpacing: 1 }}>💾 Save/Load</button>
        <button onClick={() => { if (!tutorialOn) { setTutorialOn(true); setTutorialDismissed({}); } else { setTutorialOn(false); } }} style={{ ...btnStyle(tutorialOn), marginRight: 0, marginBottom: 0, padding: "8px 22px", fontSize: 13, letterSpacing: 1 }}>💡 Tips</button>
        <button onClick={() => setPerformanceMode(!performanceMode)} style={{ ...btnStyle(performanceMode), marginRight: 0, marginBottom: 0, padding: "8px 22px", fontSize: 13, letterSpacing: 1 }}>{performanceMode ? "⚡ Reduced FX" : "✨ Full FX"}</button>
      </div>

      {/* Unit action bar */}
      <div style={{ position: "absolute", top: 72, left: "50%", transform: "translateX(-50%)", zIndex: 10, display: "flex", gap: 4, alignItems: "center", pointerEvents: "auto" }}>
        {sud?.unitType === "settler" && <button onClick={() => setSettlerM(settlerM ? null : selU)} style={btnStyle(!!settlerM)}>🏕 Found City</button>}
        {(sud?.unitType === "nuke" || sud?.unitType === "icbm") && <button onClick={() => setNukeM(nukeM ? null : selU)} style={btnStyle(!!nukeM)}>☢ Launch</button>}
        {sud && (() => { const ui = canUpgradeUnit(sud, cp); return ui ? <button onClick={() => upgradeUnit(selU)} style={btnStyle(false)}>⬆ Upgrade → {ui.toDef.name} ({ui.cost}💰)</button> : null; })()}
        {sud && <div style={{ fontSize: 11, color: "#c8dca8", padding: "5px 10px", background: "rgba(10,14,6,.8)", borderRadius: 4, border: "1px solid rgba(100,140,50,.3)" }}>
          {sud.def?.icon} {sud.def?.name} HP:{sud.hpCurrent}/{sud.def?.hp} Str:{sud.def?.strength}
          {sud.def?.range > 0 && ` Rng:${sud.def.range}`} Mv:{sud.movementCurrent}/{sud.def?.move}
          {sud.def?.domain !== "land" && <span style={{ color: "#80c0e0" }}> [{sud.def.domain}]</span>}
          {sud.hasAttacked && <span style={{ color: "#e06060" }}> [fired]</span>}
        </div>}
      </div>

      {/* Tab cycle prompt */}
      {!selU && actable.size > 0 && <div style={{ position: "absolute", bottom: 18, right: 70, zIndex: 10, fontSize: 11, color: "#b0f070", padding: "5px 12px", background: "rgba(10,14,6,.8)", borderRadius: 5, border: "1px solid rgba(100,140,50,.3)", pointerEvents: "auto" }}>Tab: cycle {actable.size} units</div>}
    </>
  );
}

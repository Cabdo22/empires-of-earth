import React from "react";
import { UNIT_DEFS } from '../data/units.js';
import { canUpgradeUnit } from '../engine/economy.js';
import { btnStyle } from '../styles.js';

export function ActionBar({ showTech, setShowTech, tutorialOn, setTutorialOn, setTutorialDismissed, sud, selU, settlerM, setSettlerM, nukeM, setNukeM, upgradeUnit, cp, actable }) {
  return (
    <div style={{ position: "absolute", top: 72, left: "50%", transform: "translateX(-50%)", zIndex: 10, display: "flex", gap: 4, alignItems: "center", pointerEvents: "auto" }}>
      <button onClick={() => setShowTech(!showTech)} style={btnStyle(showTech)}>🔬 Tech</button>
      <button onClick={() => { if (!tutorialOn) { setTutorialOn(true); setTutorialDismissed({}); } else { setTutorialOn(false); } }} style={btnStyle(tutorialOn)}>💡 Tips</button>
      {sud?.unitType === "settler" && <button onClick={() => setSettlerM(settlerM ? null : selU)} style={btnStyle(!!settlerM)}>🏕 Found City</button>}
      {sud?.unitType === "nuke" && <button onClick={() => setNukeM(nukeM ? null : selU)} style={btnStyle(!!nukeM)}>☢ Launch</button>}
      {sud && (() => { const ui = canUpgradeUnit(sud, cp); return ui ? <button onClick={() => upgradeUnit(selU)} style={btnStyle(false)}>⬆ Upgrade → {ui.toDef.name} ({ui.cost}💰)</button> : null; })()}
      {sud && <div style={{ fontSize: 9, color: "#a0b880", padding: "4px 8px", background: "rgba(10,14,6,.8)", borderRadius: 4, border: "1px solid rgba(100,140,50,.3)" }}>
        {sud.def?.icon} {sud.def?.name} HP:{sud.hpCurrent}/{sud.def?.hp} Str:{sud.def?.strength}
        {sud.def?.range > 0 && ` Rng:${sud.def.range}`} Mv:{sud.movementCurrent}/{sud.def?.move}
        {sud.def?.domain !== "land" && <span style={{ color: "#60a0d0" }}> [{sud.def.domain}]</span>}
        {sud.hasAttacked && <span style={{ color: "#c05050" }}> [fired]</span>}
      </div>}
      {!selU && actable.size > 0 && <div style={{ fontSize: 8, color: "#a0e060", padding: "3px 8px", background: "rgba(10,14,6,.7)", borderRadius: 4 }}>Tab: cycle {actable.size} units</div>}
    </div>
  );
}

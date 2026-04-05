import React from "react";
import { canUpgradeUnit } from "../engine/economy.js";
import { hudButtonStyle, hudChipStyle, hudSectionLabelStyle } from "../styles.js";

const dockButtonStyle = (active) => ({
  ...hudButtonStyle(active),
  width: "100%",
  justifyContent: "space-between",
  display: "flex",
  alignItems: "center",
  padding: "11px 14px",
  fontSize: 13,
  letterSpacing: 0.4,
});

export function ActionBar({
  showTech,
  setShowTech,
  showDiplomacy,
  setShowDiplomacy,
  showSaveLoad,
  setShowSaveLoad,
  tutorialOn,
  setTutorialOn,
  setTutorialDismissed,
  performanceMode,
  setPerformanceMode,
  rendererMode,
  setRendererMode,
  sud,
  selU,
  settlerM,
  setSettlerM,
  nukeM,
  setNukeM,
  upgradeUnit,
  cp,
  actable,
  compact = false,
}) {
  const cycleRenderer = () => {
    const order = ["auto", "canvas", "svg"];
    const next = order[(order.indexOf(rendererMode) + 1) % order.length];
    setRendererMode(next);
  };

  const upgradeInfo = sud ? canUpgradeUnit(sud, cp) : null;

  return (
    <div>
      <div style={{ ...hudSectionLabelStyle, marginBottom: 8 }}>Command Dock</div>
      <div style={{ display: "grid", gap: 8, marginBottom: compact ? 0 : 14 }}>
        <button onClick={() => setShowTech(!showTech)} style={dockButtonStyle(showTech)}>
          <span>🔬 Tech Tree</span>
          <span>{showTech ? "Open" : "Closed"}</span>
        </button>
        <button onClick={() => setShowDiplomacy(!showDiplomacy)} style={dockButtonStyle(showDiplomacy)}>
          <span>🕊 Diplomacy</span>
          <span>{showDiplomacy ? "Open" : "Closed"}</span>
        </button>
        <button onClick={() => setShowSaveLoad(!showSaveLoad)} style={dockButtonStyle(showSaveLoad)}>
          <span>💾 Save Archive</span>
          <span>{showSaveLoad ? "Open" : "Closed"}</span>
        </button>
      </div>

      <div style={{ marginTop: compact ? 14 : 0 }}>
        <div style={{ ...hudSectionLabelStyle, marginBottom: 8 }}>Field Settings</div>
        <div style={{ display: "grid", gap: 8 }}>
          <button
            onClick={() => {
              if (!tutorialOn) {
                setTutorialOn(true);
                setTutorialDismissed({});
              } else {
                setTutorialOn(false);
              }
            }}
            style={dockButtonStyle(tutorialOn)}
          >
            <span>💡 Tips</span>
            <span>{tutorialOn ? "Shown" : "Hidden"}</span>
          </button>
          <button onClick={() => setPerformanceMode(!performanceMode)} style={dockButtonStyle(performanceMode)}>
            <span>{performanceMode ? "⚡ Reduced FX" : "✨ Full FX"}</span>
            <span>{performanceMode ? "Fast" : "Rich"}</span>
          </button>
          <button onClick={cycleRenderer} style={dockButtonStyle(rendererMode !== "svg")}>
            <span>🖼 Renderer</span>
            <span style={{ textTransform: "capitalize" }}>{rendererMode}</span>
          </button>
        </div>
      </div>

      {(sud || actable.size > 0) && (
        <div style={{ marginTop: 14 }}>
          <div style={{ ...hudSectionLabelStyle, marginBottom: 8 }}>Unit Status</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
            {sud ? (
              <>
                <span style={hudChipStyle}>HP {sud.hpCurrent}/{sud.def?.hp}</span>
                <span style={hudChipStyle}>Str {sud.def?.strength}</span>
                <span style={hudChipStyle}>Mv {sud.movementCurrent}/{sud.def?.move}</span>
                {sud.def?.range > 0 && <span style={hudChipStyle}>Rng {sud.def.range}</span>}
                {sud.hasAttacked && <span style={{ ...hudChipStyle, color: "#ffb09a", borderColor: "rgba(220,120,84,.35)" }}>Fired</span>}
                {sud.def?.domain && sud.def.domain !== "land" && <span style={{ ...hudChipStyle, color: "#9dd5e8" }}>{sud.def.domain}</span>}
              </>
            ) : (
              <span style={{ ...hudChipStyle, color: "#9db07d" }}>Tab cycles {actable.size} ready units</span>
            )}
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            {sud?.unitType === "settler" && (
              <button onClick={() => setSettlerM(settlerM ? null : selU)} style={hudButtonStyle(!!settlerM)}>
                🏕 {settlerM ? "Cancel Founding" : "Found City"}
              </button>
            )}
            {(sud?.unitType === "nuke" || sud?.unitType === "icbm") && (
              <button onClick={() => setNukeM(nukeM ? null : selU)} style={hudButtonStyle(!!nukeM)}>
                ☢ {nukeM ? "Cancel Strike" : "Launch Strike"}
              </button>
            )}
            {upgradeInfo && (
              <button onClick={() => upgradeUnit(selU)} style={hudButtonStyle(false)}>
                ⬆ Upgrade to {upgradeInfo.toDef.name} ({upgradeInfo.cost}💰)
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

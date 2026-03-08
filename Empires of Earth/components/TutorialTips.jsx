import React from "react";
import { TUTORIAL_TIPS } from '../data/tutorial.js';
import { hexDist } from '../data/constants.js';

export function TutorialTips({ gs, sud, op, aiThinking, tutorialOn, tutorialDismissed, setTutorialDismissed, setTutorialOn }) {
  if (!tutorialOn || !gs || aiThinking) return null;

  const extra = {
    selectedUnitNearEnemy: sud && op && op.units.some(eu => hexDist(sud.hexCol, sud.hexRow, eu.hexCol, eu.hexRow) <= (sud.def?.range || 1)),
    hasSettlerSelected: sud?.unitType === "settler",
  };

  const activeTip = TUTORIAL_TIPS.find(tip =>
    !tutorialDismissed[tip.id] && tip.trigger(gs, tutorialDismissed, extra)
  );
  if (!activeTip) return null;

  const posStyles = {
    center: { top: "50%", left: "50%", transform: "translate(-50%, -50%)" },
    top: { top: 100, left: "50%", transform: "translateX(-50%)" },
    bottom: { bottom: 80, left: "50%", transform: "translateX(-50%)" },
  };
  const pos = posStyles[activeTip.position] || posStyles.center;

  return (
    <div style={{
      position: "absolute", ...pos, zIndex: 35, pointerEvents: "auto",
      background: "rgba(12, 18, 8, .96)",
      border: "1px solid rgba(120, 170, 60, .5)",
      borderRadius: 10, padding: "16px 22px",
      color: "#b8d098", maxWidth: 340, minWidth: 240,
      boxShadow: "0 4px 24px rgba(0,0,0,.5), 0 0 20px rgba(80,120,40,.15)",
      fontFamily: "'Palatino Linotype', serif",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 20 }}>{activeTip.icon}</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#d0e8a0", letterSpacing: 1.5 }}>{activeTip.title}</span>
      </div>
      <div style={{ fontSize: 11, lineHeight: 1.5, color: "#98b078", marginBottom: 12 }}>
        {activeTip.body}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button
          onClick={() => setTutorialDismissed(prev => ({ ...prev, [activeTip.id]: true }))}
          style={{
            padding: "5px 14px", borderRadius: 5, fontSize: 10, cursor: "pointer",
            border: "1px solid rgba(120,170,60,.5)", background: "rgba(100,160,50,.35)",
            color: "#d0e8a0", fontFamily: "inherit", letterSpacing: 1,
          }}>
          Got it
        </button>
        <span
          onClick={() => setTutorialOn(false)}
          style={{ fontSize: 9, color: "#5a6a4a", cursor: "pointer", textDecoration: "underline" }}>
          Skip all tips
        </span>
      </div>
    </div>
  );
}

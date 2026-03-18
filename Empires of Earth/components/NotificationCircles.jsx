import React from "react";

const CIRCLE_CFG = {
  tech:  { emoji: "🔬", color: "#a0d8f0", border: "#40a0d0", bg: "rgba(6,14,30,.96)", glow: "rgba(60,160,220,.4)" },
  city:  { emoji: "⚙",  color: "#a0e0a0", border: "#60c060", bg: "rgba(10,20,10,.96)", glow: "rgba(60,180,60,.4)" },
};

export function NotificationCircles({ turnPopups, setTurnPopups, setShowTech, setShowCity }) {
  if (turnPopups.length === 0) return null;
  const popup = turnPopups[0];
  const cfg = CIRCLE_CFG[popup.type] || CIRCLE_CFG.tech;
  return (
    <div style={{ position: "absolute", bottom: 240, right: 14, zIndex: 35, pointerEvents: "auto" }}>
      {turnPopups.length > 1 && <div style={{ position: "absolute", top: -6, right: -6, width: 20, height: 20, borderRadius: "50%", background: "#c05050", color: "#fff", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 36, border: "1px solid #e07070" }}>{turnPopups.length}</div>}
      <div
        style={{
          width: 54, height: 54, borderRadius: "50%",
          background: cfg.bg, border: `3px solid ${cfg.border}`,
          boxShadow: `0 0 18px ${cfg.glow}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer",
          fontSize: 24, lineHeight: 1, userSelect: "none",
        }}
        title={popup.title}
        onClick={() => {
          if (popup.action === "tech") setShowTech(true);
          if (popup.action === "city" && popup.cityId) setShowCity(popup.cityId);
          setTurnPopups(prev => prev.filter(p => p.id !== popup.id));
        }}
      >
        <span style={{ color: cfg.color }}>{cfg.emoji}</span>
      </div>
    </div>
  );
}

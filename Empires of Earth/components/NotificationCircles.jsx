import React from "react";

const CIRCLE_CFG = {
  event: { emoji: "🎲", border: "#d0a040", bg: "rgba(30,18,6,.96)", glow: "rgba(200,160,40,.4)" },
  tech:  { emoji: "🔬", border: "#40a0d0", bg: "rgba(6,14,30,.96)", glow: "rgba(60,160,220,.4)" },
  city:  { emoji: "⚙",  border: "#60c060", bg: "rgba(10,20,10,.96)", glow: "rgba(60,180,60,.4)" },
};

export function NotificationCircles({ turnPopups, setTurnPopups, setShowTech, setShowCity }) {
  if (turnPopups.length === 0) return null;
  const popup = turnPopups[0];
  const cfg = CIRCLE_CFG[popup.type] || CIRCLE_CFG.event;
  return (
    <div
      style={{
        position: "absolute", bottom: 175, right: 14, zIndex: 35,
        width: 36, height: 36, borderRadius: "50%",
        background: cfg.bg, border: `2px solid ${cfg.border}`,
        boxShadow: `0 0 12px ${cfg.glow}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer", pointerEvents: "auto",
        fontSize: 16, lineHeight: 1, userSelect: "none",
      }}
      title={popup.title}
      onClick={() => {
        if (popup.action === "tech") setShowTech(true);
        if (popup.action === "city" && popup.cityId) setShowCity(popup.cityId);
        setTurnPopups(prev => prev.filter(p => p.id !== popup.id));
      }}
    >
      {cfg.emoji}
    </div>
  );
}

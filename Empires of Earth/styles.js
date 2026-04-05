// ============================================================
// SHARED STYLES
// ============================================================

export const btnStyle = (active) => ({
  padding: "6px 14px",
  borderRadius: 4,
  fontSize: 12,
  cursor: "pointer",
  border: "1px solid rgba(100,140,50,.5)",
  background: active ? "rgba(100,160,50,.5)" : "rgba(30,40,20,.8)",
  color: active ? "#e8f4d0" : "#b0c090",
  fontFamily: "inherit",
  marginRight: 4,
  marginBottom: 4,
});

export const hudSurfaceStyle = {
  background: "linear-gradient(180deg,rgba(14,20,10,.94) 0%,rgba(10,15,7,.9) 100%)",
  border: "1px solid rgba(132,165,84,.3)",
  borderRadius: 16,
  boxShadow: "0 18px 36px rgba(0,0,0,.28), inset 0 1px 0 rgba(240,245,220,.06)",
  backdropFilter: "blur(12px)",
};

export const hudPanelStyle = {
  ...hudSurfaceStyle,
  color: "#d7e2c0",
  pointerEvents: "auto",
};

export const hudSectionLabelStyle = {
  color: "#8fa072",
  fontSize: 10,
  letterSpacing: 2.2,
  textTransform: "uppercase",
  fontWeight: 700,
};

export const hudValueStyle = {
  color: "#edf4d8",
  fontSize: 15,
  fontWeight: 600,
};

export const hudChipStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "6px 10px",
  borderRadius: 999,
  border: "1px solid rgba(130,170,80,.24)",
  background: "rgba(22,30,14,.72)",
  color: "#d1dbb4",
  fontSize: 11,
  lineHeight: 1,
};

export const hudButtonStyle = (active = false) => ({
  ...btnStyle(active),
  marginRight: 0,
  marginBottom: 0,
  borderRadius: 10,
  border: active ? "1px solid rgba(186,220,120,.48)" : "1px solid rgba(116,148,72,.35)",
  background: active
    ? "linear-gradient(180deg,rgba(124,170,66,.55) 0%,rgba(72,110,34,.62) 100%)"
    : "linear-gradient(180deg,rgba(34,44,22,.94) 0%,rgba(20,26,14,.9) 100%)",
  color: active ? "#f0f6de" : "#d2ddb7",
  boxShadow: active ? "0 10px 18px rgba(50,80,24,.3)" : "none",
});

export const panelStyle = {
  position: "absolute",
  zIndex: 20,
  background: "rgba(10,14,6,.95)",
  border: "1px solid rgba(100,140,50,.4)",
  borderRadius: 8,
  padding: 12,
  color: "#c8dca8",
  fontFamily: "'Palatino Linotype',serif",
  pointerEvents: "auto",
};

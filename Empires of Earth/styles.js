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

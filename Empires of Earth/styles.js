// ============================================================
// SHARED STYLES
// ============================================================

export const btnStyle = (active) => ({
  padding: "4px 10px",
  borderRadius: 4,
  fontSize: 10,
  cursor: "pointer",
  border: "1px solid rgba(100,140,50,.5)",
  background: active ? "rgba(100,160,50,.5)" : "rgba(30,40,20,.8)",
  color: active ? "#e0f0c0" : "#7a8a60",
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
  color: "#a0b880",
  fontFamily: "'Palatino Linotype',serif",
  pointerEvents: "auto",
};

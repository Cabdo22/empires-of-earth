import React from "react";
import { hudPanelStyle, hudSectionLabelStyle } from "../styles.js";

export function MinimapDisplay({ minimapRef, MINIMAP_W, MINIMAP_H, onMinimapDown, onMinimapMove, onMinimapUp }) {
  return (
    <div
      style={{
        ...hudPanelStyle,
        position: "absolute",
        right: 14,
        bottom: 14,
        zIndex: 15,
        width: MINIMAP_W + 22,
        padding: "10px 10px 8px",
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div style={{ ...hudSectionLabelStyle, marginBottom: 6, textAlign: "center" }}>Minimap</div>
      <canvas
        ref={minimapRef}
        width={MINIMAP_W}
        height={MINIMAP_H}
        onMouseDown={onMinimapDown}
        onMouseMove={onMinimapMove}
        onMouseUp={onMinimapUp}
        onMouseLeave={onMinimapUp}
        style={{
          display: "block",
          cursor: "crosshair",
          borderRadius: 10,
          border: "1px solid rgba(146,182,93,.24)",
          background: "rgba(5,10,4,.9)",
        }}
      />
      <div style={{ color: "#96a97b", marginTop: 6, textAlign: "center", fontSize: 10, lineHeight: 1.3 }}>
        Drag or click to move the camera.
      </div>
    </div>
  );
}

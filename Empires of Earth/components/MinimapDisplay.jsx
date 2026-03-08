import React from "react";

export function MinimapDisplay({ minimapRef, MINIMAP_W, MINIMAP_H, onMinimapDown, onMinimapMove, onMinimapUp }) {
  return (
    <div style={{ position: "absolute", bottom: 60, right: 14, zIndex: 15, background: "rgba(10,14,6,.92)", border: "1px solid rgba(100,140,50,.4)", borderRadius: 6, padding: 4, pointerEvents: "auto" }} onMouseDown={e => e.stopPropagation()}>
      <canvas ref={minimapRef} width={MINIMAP_W} height={MINIMAP_H}
        onMouseDown={onMinimapDown} onMouseMove={onMinimapMove} onMouseUp={onMinimapUp} onMouseLeave={onMinimapUp}
        style={{ display: "block", cursor: "crosshair", borderRadius: 3, border: "1px solid rgba(100,140,50,.2)" }} />
      <div style={{ fontSize: 9, color: "#8a9a70", marginTop: 2, textAlign: "center", letterSpacing: 2, fontWeight: 600 }}>MINIMAP</div>
    </div>
  );
}

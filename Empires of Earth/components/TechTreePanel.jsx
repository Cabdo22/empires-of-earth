import React from "react";
import { TECH_TREE, ERAS, ERA_COLORS } from '../data/techs.js';
import { btnStyle, panelStyle } from '../styles.js';

export function TechTreePanel({ cp, techPosRef, techCollapsed, setTechCollapsed, setShowTech, onPanelDown, selResearch }) {
  const tPos = techPosRef.current;
  const posStyle = tPos.x != null ? { left: tPos.x, top: tPos.y } : { top: tPos.y, left: "50%", transform: "translateX(-50%)" };

  return (
    <div data-panel="tech" style={{ ...panelStyle, ...posStyle, width: Math.min(720, window.innerWidth - 40), maxHeight: techCollapsed ? 40 : 320, overflowY: techCollapsed ? "hidden" : "auto", transition: "max-height .2s ease" }}>
      <div onMouseDown={e => onPanelDown(e, "tech")} style={{ display: "flex", justifyContent: "space-between", marginBottom: techCollapsed ? 0 : 8, cursor: "grab", userSelect: "none" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button onClick={() => setTechCollapsed(!techCollapsed)} style={{ ...btnStyle(false), fontSize: 10, padding: "1px 5px" }}>{techCollapsed ? "▸" : "▾"}</button>
          <span style={{ fontSize: 13, color: "#c8d8a0", letterSpacing: 2 }}>TECHNOLOGY TREE</span></div>
        <button onClick={() => setShowTech(false)} style={{ ...btnStyle(false), fontSize: 10 }}>✕</button></div>
      {!techCollapsed && <div style={{ display: "flex", gap: 4 }}>
        {ERAS.map(era => {
          const techs = Object.values(TECH_TREE).filter(t => t.era === era).sort((a, b) => a.row - b.row);
          return (
            <div key={era} style={{ flex: 1, minWidth: 90 }}><div style={{ fontSize: 8, color: ERA_COLORS[era], letterSpacing: 1, marginBottom: 4, textAlign: "center", textTransform: "uppercase" }}>{era}</div>
              {techs.map(t => {
                const rd = cp.researchedTechs.includes(t.id); const av = !rd && t.prereqs.every(p2 => cp.researchedTechs.includes(p2)); const isR = cp.currentResearch?.techId === t.id;
                return (
                  <div key={t.id} style={{ padding: "4px 6px", marginBottom: 3, borderRadius: 4, fontSize: 8, background: rd ? "rgba(80,160,50,.3)" : isR ? "rgba(80,140,200,.3)" : "rgba(30,40,20,.6)", border: `1px solid ${rd ? "#5a9a30" : isR ? "#5090c0" : av ? "#6a7a50" : "#2a3020"}`, color: rd ? "#b0d890" : av ? "#a0b880" : "#4a5a3a", cursor: av && !cp.currentResearch ? "pointer" : "default", opacity: rd || av || isR ? 1 : .5 }} onClick={() => { if (av && !cp.currentResearch) selResearch(t.id); }}>
                    <div style={{ fontWeight: 600 }}>{t.name}</div><div style={{ fontSize: 7, color: "#6a7a50", marginTop: 1 }}>{rd ? "✓" : isR ? `${cp.currentResearch.progress}/${t.cost}` : `${t.cost}🔬`}</div>
                    <div style={{ fontSize: 6, color: "#5a6a4a", marginTop: 1 }}>{t.effects[0]}</div></div>
                );
              })}</div>
          );
        })}
      </div>}
    </div>
  );
}

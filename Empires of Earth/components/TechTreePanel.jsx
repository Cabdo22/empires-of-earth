import React from "react";
import { TECH_TREE, ERAS, ERA_COLORS } from '../data/techs.js';
import { btnStyle, panelStyle } from '../styles.js';

export function TechTreePanel({ cp, techPosRef, techCollapsed, setTechCollapsed, setShowTech, onPanelDown, selResearch }) {
  const tPos = techPosRef.current;
  const posStyle = tPos.x != null ? { left: tPos.x, top: tPos.y } : { top: tPos.y, left: "50%", transform: "translateX(-50%)" };

  // Check if a tech is available given prereqMin support
  const isTechAvailable = (t) => {
    if (cp.researchedTechs.includes(t.id)) return false;
    if (t.prereqs.length === 0) return true;
    const met = t.prereqs.filter(p => cp.researchedTechs.includes(p)).length;
    const needed = t.prereqMin || t.prereqs.length;
    return met >= needed;
  };

  return (
    <div data-panel="tech" style={{ ...panelStyle, ...posStyle, width: Math.min(880, window.innerWidth - 40), maxHeight: techCollapsed ? 40 : 340, overflowY: techCollapsed ? "hidden" : "auto", overflowX: "auto", transition: "max-height .2s ease" }}>
      <div onMouseDown={e => onPanelDown(e, "tech")} style={{ display: "flex", justifyContent: "space-between", marginBottom: techCollapsed ? 0 : 8, cursor: "grab", userSelect: "none" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button onClick={() => setTechCollapsed(!techCollapsed)} style={{ ...btnStyle(false), fontSize: 10, padding: "1px 5px" }}>{techCollapsed ? "▸" : "▾"}</button>
          <span style={{ fontSize: 13, color: "#c8d8a0", letterSpacing: 2 }}>TECHNOLOGY TREE</span></div>
        <button onClick={() => setShowTech(false)} style={{ ...btnStyle(false), fontSize: 10 }}>✕</button></div>
      {!techCollapsed && <div style={{ display: "flex", gap: 2, minWidth: 780 }}>
        {ERAS.map(era => {
          const p1Techs = Object.values(TECH_TREE).filter(t => t.era === era && t.phase === 1).sort((a, b) => a.row - b.row);
          const p2Techs = Object.values(TECH_TREE).filter(t => t.era === era && t.phase === 2).sort((a, b) => a.row - b.row);
          return (
            <div key={era} style={{ flex: 1, minWidth: 120 }}>
              <div style={{ fontSize: 8, color: ERA_COLORS[era], letterSpacing: 1, marginBottom: 3, textAlign: "center", textTransform: "uppercase" }}>{era}</div>
              <div style={{ display: "flex", gap: 2 }}>
                {[p1Techs, p2Techs].map((techs, pi) => (
                  <div key={pi} style={{ flex: 1, minWidth: 58 }}>
                    <div style={{ fontSize: 6, color: "#5a6a4a", textAlign: "center", marginBottom: 2 }}>{pi === 0 ? "I" : "II"}</div>
                    {techs.map(t => {
                      const rd = cp.researchedTechs.includes(t.id);
                      const av = isTechAvailable(t);
                      const isR = cp.currentResearch?.techId === t.id;
                      return (
                        <div key={t.id} style={{ padding: "3px 4px", marginBottom: 2, borderRadius: 4, fontSize: 7, background: rd ? "rgba(80,160,50,.3)" : isR ? "rgba(80,140,200,.3)" : "rgba(30,40,20,.6)", border: `1px solid ${rd ? "#5a9a30" : isR ? "#5090c0" : av ? "#6a7a50" : "#2a3020"}`, color: rd ? "#b0d890" : av ? "#a0b880" : "#4a5a3a", cursor: av && !cp.currentResearch ? "pointer" : "default", opacity: rd || av || isR ? 1 : .5 }} onClick={() => { if (av && !cp.currentResearch) selResearch(t.id); }}>
                          <div style={{ fontWeight: 600, fontSize: 7 }}>{t.name}</div>
                          <div style={{ fontSize: 6, color: "#6a7a50", marginTop: 1 }}>{rd ? "✓" : isR ? `${cp.currentResearch.progress}/${t.cost}` : `${t.cost}🔬`}</div>
                          <div style={{ fontSize: 5, color: "#5a6a4a", marginTop: 1 }}>{t.effects[0]}</div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>}
    </div>
  );
}

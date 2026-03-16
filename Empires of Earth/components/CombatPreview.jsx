import React from "react";
import { panelStyle } from '../styles.js';

function HpBar({ current, max, damage }) {
  const after = Math.max(0, current - damage);
  const pctBefore = current / max;
  const pctAfter = after / max;
  const barColor = pctAfter > 0.6 ? "#60c040" : pctAfter > 0.3 ? "#d0c040" : "#d04040";
  const dmgColor = "rgba(255,80,60,.5)";
  return (
    <div style={{ width: "100%", height: 8, background: "rgba(20,28,12,.8)", borderRadius: 4, overflow: "hidden", border: "1px solid rgba(100,140,50,.3)", position: "relative" }}>
      <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${pctBefore * 100}%`, background: dmgColor, borderRadius: 3 }} />
      <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${pctAfter * 100}%`, background: barColor, borderRadius: 3 }} />
    </div>
  );
}

export function CombatPreview({ preview }) {
  if (!preview) return null;
  const { an, dn, ahp, dhp, aMaxHp, dMaxHp, aDmg, dDmg, aMods = [], dMods = [], dmgMods = [], rapidShot } = preview;
  const aAfter = Math.max(0, ahp - dDmg);
  const dAfter = Math.max(0, dhp - aDmg);

  return (
    <div style={{ ...panelStyle, position: "fixed", top: window.innerHeight / 2 - 100, left: window.innerWidth / 2 - 150, width: 300, padding: 12, zIndex: 30, border: "1px solid rgba(200,100,80,.6)", pointerEvents: "none" }}>
      <div style={{ fontSize: 13, color: "#ffa0a0", marginBottom: 8, textAlign: "center", fontWeight: 700, letterSpacing: 1 }}>⚔ Combat Preview</div>

      <div style={{ display: "flex", gap: 10 }}>
        {/* Attacker column */}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: "#b0e090", fontWeight: 700, marginBottom: 4 }}>{an}</div>
          <HpBar current={ahp} max={aMaxHp || ahp} damage={dDmg} />
          <div style={{ fontSize: 9, color: "#8a9a70", marginTop: 2 }}>{aAfter}/{aMaxHp || ahp} HP</div>
          <div style={{ fontSize: 12, color: dDmg > 0 ? "#f08060" : "#8a9a70", fontWeight: 700, marginTop: 3 }}>
            {dDmg > 0 ? `-${dDmg} dmg` : "No counter"}
          </div>
          {aMods.length > 0 && <div style={{ marginTop: 5, borderTop: "1px solid rgba(100,140,50,.2)", paddingTop: 4 }}>
            {aMods.map((m, i) => <div key={i} style={{ fontSize: 9, color: "#a0d080" }}>+{m.value} {m.label}</div>)}
          </div>}
        </div>

        {/* VS divider */}
        <div style={{ display: "flex", alignItems: "center", color: "#6a7a50", fontSize: 11, fontWeight: 700, padding: "0 2px" }}>vs</div>

        {/* Defender column */}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: "#f09090", fontWeight: 700, marginBottom: 4 }}>{dn}</div>
          <HpBar current={dhp} max={dMaxHp || dhp} damage={aDmg} />
          <div style={{ fontSize: 9, color: "#8a9a70", marginTop: 2 }}>{dAfter}/{dMaxHp || dhp} HP</div>
          <div style={{ fontSize: 12, color: "#f08060", fontWeight: 700, marginTop: 3 }}>
            -{aDmg} dmg{rapidShot ? " (x1.5)" : ""}
          </div>
          {(dMods.length > 0 || dmgMods.length > 0) && <div style={{ marginTop: 5, borderTop: "1px solid rgba(100,140,50,.2)", paddingTop: 4 }}>
            {dMods.map((m, i) => <div key={i} style={{ fontSize: 9, color: "#a0d080" }}>+{m.value} {m.label}</div>)}
            {dmgMods.map((m, i) => <div key={`dm${i}`} style={{ fontSize: 9, color: "#80b0d0" }}>{m.value} {m.label}</div>)}
          </div>}
        </div>
      </div>

      <div style={{ textAlign: "center", fontSize: 9, color: "#8a9a6a", marginTop: 8 }}>Click or right-click to attack</div>
    </div>
  );
}

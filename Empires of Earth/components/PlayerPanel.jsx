import React from "react";
import { TECH_TREE } from "../data/techs.js";
import { calcPlayerIncome } from "../engine/economy.js";
import { hudSectionLabelStyle, hudValueStyle } from "../styles.js";

const metricCardStyle = {
  minWidth: 78,
  padding: "10px 12px",
  borderRadius: 12,
  background: "rgba(16,24,11,.7)",
  border: "1px solid rgba(126,154,78,.2)",
};

export function PlayerPanel({ cp, hexes, landOwned, totalLand, barbarians }) {
  const p = cp;
  const income = calcPlayerIncome(p, hexes);
  const research = p.currentResearch ? TECH_TREE[p.currentResearch.techId] : null;
  const territoryOwned = landOwned[p.id] || 0;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <div
          style={{
            width: 14,
            height: 14,
            borderRadius: "50%",
            background: p.color,
            boxShadow: `0 0 18px ${p.color}66`,
            border: `1px solid ${p.colorLight || p.color}`,
          }}
        />
        <div style={{ minWidth: 0 }}>
          <div style={{ ...hudSectionLabelStyle, marginBottom: 3 }}>Empire Overview</div>
          <div style={{ color: p.colorLight, fontSize: 22, fontWeight: 700, letterSpacing: 0.4 }}>{p.name}</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10, marginBottom: 12 }}>
        <div style={metricCardStyle} title={`Gold: ${p.gold} in treasury, earning ${income.gold} per turn`}>
          <div style={hudSectionLabelStyle}>Treasury</div>
          <div style={{ ...hudValueStyle, marginTop: 4 }}>💰 {p.gold}</div>
          <div style={{ color: "#9db07d", fontSize: 11, marginTop: 4 }}>+{income.gold} per turn</div>
        </div>
        <div style={metricCardStyle} title={`Science: earning ${income.science} research points per turn`}>
          <div style={hudSectionLabelStyle}>Research</div>
          <div style={{ ...hudValueStyle, marginTop: 4 }}>🔬 +{income.science}</div>
          <div style={{ color: "#8fc6df", fontSize: 11, marginTop: 4 }}>{research ? research.name : "Choose research"}</div>
        </div>
      </div>

      <div
        style={{
          background: "rgba(18,28,12,.76)",
          borderRadius: 12,
          border: "1px solid rgba(122,154,74,.22)",
          padding: "11px 12px",
          marginBottom: 12,
        }}
      >
        <div style={{ ...hudSectionLabelStyle, marginBottom: 6 }}>Current Program</div>
        {research ? (
          <>
            <div style={{ color: "#eef5dd", fontSize: 15, fontWeight: 600 }}>{research.name}</div>
            <div style={{ color: "#95abc3", fontSize: 12, marginTop: 4 }}>
              {p.currentResearch.progress}/{research.cost} science collected
            </div>
          </>
        ) : (
          <div style={{ color: "#d6e2bc", fontSize: 13 }}>No technology selected.</div>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 8 }}>
        <div style={metricCardStyle} title={`Food surplus: ${income.food} per turn`}>
          <div style={hudSectionLabelStyle}>Food</div>
          <div style={{ ...hudValueStyle, fontSize: 14, marginTop: 3 }}>🌾 {income.food}</div>
        </div>
        <div style={metricCardStyle} title={`Production: ${income.production} per turn`}>
          <div style={hudSectionLabelStyle}>Prod</div>
          <div style={{ ...hudValueStyle, fontSize: 14, marginTop: 3 }}>⚙ {income.production}</div>
        </div>
        <div style={metricCardStyle} title={`${p.cities.length} cities, ${p.units.length} units`}>
          <div style={hudSectionLabelStyle}>Forces</div>
          <div style={{ ...hudValueStyle, fontSize: 14, marginTop: 3 }}>🏛 {p.cities.length}</div>
          <div style={{ color: "#9db07d", fontSize: 11, marginTop: 2 }}>⚔ {p.units.length}</div>
        </div>
        <div style={metricCardStyle} title={`${territoryOwned} of ${totalLand} land tiles owned`}>
          <div style={hudSectionLabelStyle}>Land</div>
          <div style={{ ...hudValueStyle, fontSize: 14, marginTop: 3 }}>🗺 {territoryOwned}</div>
          <div style={{ color: "#9db07d", fontSize: 11, marginTop: 2 }}>{barbarians.length > 0 ? `🏴 ${barbarians.length}` : "Clear"}</div>
        </div>
      </div>
    </div>
  );
}

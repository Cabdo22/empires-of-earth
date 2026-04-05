import React, { useState } from "react";
import { panelStyle, btnStyle } from '../styles.js';
import { getLeaderDef } from '../data/leaders.js';

const treatyLabel = (type) => type.replace("_", " ");

function LeaderPortraitButton({ leader, playerId, onOpenLeader }) {
  const [imgError, setImgError] = useState(false);
  const initials = leader.leader.split(" ").map((part) => part[0]).join("").slice(0, 2);

  return (
    <button
      onClick={() => onOpenLeader(playerId)}
      style={{
        width: 52,
        height: 52,
        padding: 0,
        overflow: "hidden",
        borderRadius: 8,
        cursor: "pointer",
        background: "linear-gradient(180deg, rgba(44,34,16,.95), rgba(16,14,10,.96))",
        border: "1px solid rgba(165,140,76,.35)",
        boxShadow: "inset 0 1px 0 rgba(255,230,180,.05)",
        color: "#e7d8a8",
        fontFamily: "inherit",
        position: "relative",
      }}
      aria-label={`Open ${leader.leader}`}
      title={leader.leader}
    >
      {!imgError && leader.portrait ? (
        <img
          src={leader.portrait}
          alt={leader.leader}
          onError={() => setImgError(true)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: leader.portraitPosition || "50% 50%",
            transform: `scale(${leader.portraitScale || 1})`,
            transformOrigin: "center center",
            display: "block",
            filter: "saturate(.95) contrast(1.02)",
          }}
        />
      ) : (
        <span style={{ display: "flex", width: "100%", height: "100%", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 600, letterSpacing: 1.2 }}>
          {initials}
        </span>
      )}
      <span style={{ position: "absolute", inset: 0, borderRadius: 8, boxShadow: "inset 0 0 0 1px rgba(255,255,255,.03)" }} />
    </button>
  );
}

export function DiplomacyPanel({
  currentPlayer,
  knownPlayers,
  relations,
  tradePactBlockReasons,
  pendingIncoming,
  pendingOutgoing,
  onClose,
  onOpenLeader,
  onDeclareWar,
  onPropose,
  onAccept,
  onReject,
}) {
  if (!currentPlayer) return null;

  return (
    <div style={{ ...panelStyle, left: 14, top: 160, width: 360, maxHeight: "calc(100vh - 190px)", overflowY: "auto", zIndex: 35 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div>
          <div style={{ color: "#dce8c0", fontSize: 16, fontWeight: 600, letterSpacing: 2 }}>Diplomacy</div>
          <div style={{ color: "#7f9061", fontSize: 10, letterSpacing: 2, textTransform: "uppercase", marginTop: 2 }}>{currentPlayer.name}</div>
        </div>
        <button onClick={onClose} style={{ ...btnStyle(false), marginBottom: 0, marginRight: 0, padding: "4px 10px" }}>✕</button>
      </div>

      {knownPlayers.length === 0 && (
        <div style={{ color: "#76855b", fontSize: 11, lineHeight: 1.5 }}>
          No known civilizations yet. Explore the map to make first contact.
        </div>
      )}

      {knownPlayers.map((player) => {
        const relation = relations[player.id];
        const leader = getLeaderDef(player.civilization);
        const tradePactBlockedReason = tradePactBlockReasons?.[player.id] || null;
        const canProposeTradePact = relation?.status !== "war" && !tradePactBlockedReason;
        const score = relation?.score || 0;
        const scorePct = Math.max(0, Math.min(100, 50 + score / 2));
        return (
          <div key={player.id} style={{ background: "rgba(20,28,12,.78)", border: "1px solid rgba(100,140,50,.2)", borderRadius: 8, padding: 10, marginBottom: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <LeaderPortraitButton leader={leader} playerId={player.id} onOpenLeader={onOpenLeader} />
              <div style={{ flex: 1 }}>
                <div style={{ color: player.colorLight, fontSize: 12, fontWeight: 600 }}>{player.name}</div>
                <div style={{ color: "#8fa06e", fontSize: 9, textTransform: "uppercase", letterSpacing: 1.5 }}>{leader.leader}</div>
              </div>
              <div style={{ color: relation?.status === "war" ? "#e09080" : relation?.status === "alliance" ? "#98d0a8" : "#b4c18f", fontSize: 10, letterSpacing: 1.3, textTransform: "uppercase" }}>
                {relation?.status || "neutral"}
              </div>
            </div>

            <div style={{ marginTop: 8 }}>
              <div style={{ height: 6, borderRadius: 999, background: "rgba(0,0,0,.28)", overflow: "hidden" }}>
                <div style={{ width: `${scorePct}%`, height: "100%", background: score >= 0 ? "linear-gradient(90deg,#6f9f52,#abd581)" : "linear-gradient(90deg,#803631,#dc7c73)" }} />
              </div>
              <div style={{ color: "#8fa06e", fontSize: 9, marginTop: 4 }}>Favor {score >= 0 ? "+" : ""}{score}</div>
            </div>

            {(relation?.activeTreaties || []).length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                {relation.activeTreaties.map((treaty, idx) => (
                  <span key={`${player.id}-${idx}`} style={{ fontSize: 9, color: "#d7cfaa", padding: "2px 6px", borderRadius: 999, background: "rgba(74,64,32,.5)", border: "1px solid rgba(165,140,76,.25)", textTransform: "uppercase", letterSpacing: 1 }}>
                    {treatyLabel(treaty.type)}
                  </span>
                ))}
              </div>
            )}

            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
              {relation?.status !== "war" && (
                <button onClick={() => onDeclareWar(player.id)} style={{ ...btnStyle(false), marginBottom: 0, marginRight: 0, fontSize: 10, padding: "6px 10px", border: "1px solid rgba(170,70,54,.5)", color: "#ef9c8f" }}>
                  Declare War
                </button>
              )}
              {relation?.status === "war" && (
                <button onClick={() => onPropose(player.id, "peace")} style={{ ...btnStyle(false), marginBottom: 0, marginRight: 0, fontSize: 10, padding: "6px 10px" }}>
                  Offer Peace
                </button>
              )}
              {relation?.status !== "war" && relation?.status !== "alliance" && (
                <button onClick={() => onPropose(player.id, "alliance")} style={{ ...btnStyle(false), marginBottom: 0, marginRight: 0, fontSize: 10, padding: "6px 10px" }}>
                  Propose Alliance
                </button>
              )}
              {relation?.status !== "war" && (
                <button onClick={() => onPropose(player.id, "trade_pact")} disabled={!canProposeTradePact} title={tradePactBlockedReason || "Offer a trade pact"} style={{ ...btnStyle(false), marginBottom: 0, marginRight: 0, fontSize: 10, padding: "6px 10px", opacity: canProposeTradePact ? 1 : 0.45, cursor: canProposeTradePact ? "pointer" : "not-allowed" }}>
                  Trade Pact
                </button>
              )}
            </div>
            {tradePactBlockedReason && relation?.status !== "war" && (
              <div style={{ color: "#8fa06e", fontSize: 9, marginTop: 6 }}>
                {tradePactBlockedReason}
              </div>
            )}
          </div>
        );
      })}

      {(pendingIncoming.length > 0 || pendingOutgoing.length > 0) && (
        <div style={{ marginTop: 14 }}>
          <div style={{ color: "#9fb07d", fontSize: 10, letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 }}>Proposals</div>

          {pendingIncoming.map((proposal) => (
            <div key={proposal.id} style={{ border: "1px solid rgba(120,150,70,.24)", borderRadius: 8, padding: 8, marginBottom: 8, background: "rgba(18,24,10,.75)" }}>
              <div style={{ color: "#dce8c0", fontSize: 11 }}>
                Incoming {proposal.type.replace("_", " ")} from {proposal.fromName}
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                <button onClick={() => onAccept(proposal.id)} style={{ ...btnStyle(true), marginBottom: 0, marginRight: 0, fontSize: 10, padding: "6px 10px" }}>Accept</button>
                <button onClick={() => onReject(proposal.id)} style={{ ...btnStyle(false), marginBottom: 0, marginRight: 0, fontSize: 10, padding: "6px 10px" }}>Reject</button>
              </div>
            </div>
          ))}

          {pendingOutgoing.map((proposal) => (
            <div key={proposal.id} style={{ border: "1px solid rgba(120,150,70,.16)", borderRadius: 8, padding: 8, marginBottom: 8, background: "rgba(18,24,10,.46)" }}>
              <div style={{ color: "#a8b78b", fontSize: 11 }}>
                Awaiting response: {proposal.type.replace("_", " ")} to {proposal.toName}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

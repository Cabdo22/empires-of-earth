import React, { useState } from "react";
import { btnStyle } from '../styles.js';

export function LeaderMeetingScreen({ scene, onClose, onDeclareWar, onOpenDiplomacy }) {
  const [imgError, setImgError] = useState(false);

  if (!scene) return null;

  const canOpenDiplomacy = scene.context !== "firstMeet";

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 60,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "radial-gradient(circle at 50% 30%, rgba(88,72,32,.35), rgba(5,8,3,.94) 60%)",
        pointerEvents: "all",
      }}
    >
      <div
        style={{
          width: "min(920px, 92vw)",
          minHeight: 420,
          display: "grid",
          gridTemplateColumns: "minmax(260px, 34%) 1fr",
          background: "linear-gradient(145deg, rgba(20,16,9,.98), rgba(11,15,7,.98))",
          border: "1px solid rgba(165,140,76,.4)",
          borderRadius: 18,
          overflow: "hidden",
          boxShadow: "0 24px 80px rgba(0,0,0,.45)",
          fontFamily: "'Palatino Linotype','Book Antiqua',Palatino,serif",
        }}
      >
        <div style={{ position: "relative", background: "linear-gradient(180deg, rgba(74,52,22,.9), rgba(20,14,7,.95))", borderRight: "1px solid rgba(165,140,76,.18)" }}>
          {!imgError && scene.portrait ? (
            <img
              src={scene.portrait}
              alt={scene.leaderName}
              onError={() => setImgError(true)}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                objectPosition: scene.portraitPosition || "50% 50%",
                transform: `scale(${scene.portraitScale || 1})`,
                transformOrigin: "center center",
                display: "block",
                filter: "saturate(.92) contrast(1.03)",
              }}
            />
          ) : (
            <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
              <div style={{ width: 180, height: 240, borderRadius: 12, border: "1px solid rgba(220,190,120,.35)", background: "linear-gradient(180deg, rgba(70,54,24,.8), rgba(28,22,10,.92))", display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", color: "#e8d4a0", fontSize: 22, letterSpacing: 2, lineHeight: 1.3, textTransform: "uppercase", padding: 20 }}>
                {scene.leaderName}
              </div>
            </div>
          )}
          <div style={{ position: "absolute", left: 18, bottom: 18, right: 18, background: "rgba(9,10,6,.7)", border: "1px solid rgba(220,190,120,.25)", borderRadius: 10, padding: "10px 12px" }}>
            <div style={{ color: "#f1dfae", fontSize: 22, letterSpacing: 1.5 }}>{scene.leaderName}</div>
            <div style={{ color: "#c8b682", fontSize: 12, letterSpacing: 2, textTransform: "uppercase", marginTop: 4 }}>{scene.leaderTitle}</div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", padding: 28 }}>
          <div style={{ color: "#b99a56", fontSize: 12, letterSpacing: 3, textTransform: "uppercase" }}>
            {scene.context === "firstMeet" ? "First Contact" : "Diplomatic Audience"}
          </div>
          <div style={{ color: "#dce8c0", fontSize: 34, lineHeight: 1.1, marginTop: 8 }}>{scene.civName}</div>
          <div style={{ color: "#8fa06e", fontSize: 12, letterSpacing: 2, textTransform: "uppercase", marginTop: 10 }}>
            Relationship: {scene.relation?.status || "neutral"} {typeof scene.relation?.score === "number" ? `· ${scene.relation.score >= 0 ? "+" : ""}${scene.relation.score}` : ""}
          </div>

          {scene.historicalQuote && (
            <div style={{ marginTop: 22, padding: "16px 18px", borderRadius: 12, background: "rgba(26,22,12,.72)", border: "1px solid rgba(186,152,86,.22)", maxWidth: 560 }}>
              <div style={{ color: "#b99a56", fontSize: 10, letterSpacing: 2.2, textTransform: "uppercase", marginBottom: 8 }}>
                Historical Quote
              </div>
              <div style={{ color: "#f0e1b7", fontSize: 18, lineHeight: 1.6, fontStyle: "italic" }}>
                "{scene.historicalQuote}"
              </div>
              {(scene.quoteAttribution || scene.quoteSourceUrl) && (
                <div style={{ marginTop: 10, fontSize: 11, color: "#b8aa82", lineHeight: 1.5 }}>
                  {scene.quoteAttribution}
                  {scene.quoteSourceUrl && (
                    <>
                      {" "}
                      <a href={scene.quoteSourceUrl} target="_blank" rel="noreferrer" style={{ color: "#d6c58c" }}>
                        Source
                      </a>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          <div style={{ marginTop: scene.historicalQuote ? 18 : 28, color: "#eadfb8", fontSize: 22, lineHeight: 1.6, maxWidth: 520 }}>
            "{scene.dialogue}"
          </div>

          <div style={{ marginTop: "auto", display: "flex", flexWrap: "wrap", gap: 10 }}>
            <button onClick={onClose} style={{ ...btnStyle(true), marginBottom: 0, marginRight: 0, padding: "10px 24px", fontSize: 13, letterSpacing: 1.2 }}>
              {scene.context === "firstMeet" ? "Greetings" : "Leave Audience"}
            </button>
            {canOpenDiplomacy && (
              <button onClick={onOpenDiplomacy} style={{ ...btnStyle(false), marginBottom: 0, marginRight: 0, padding: "10px 24px", fontSize: 13, letterSpacing: 1.2 }}>
                Open Diplomacy
              </button>
            )}
            {scene.relation?.status !== "war" && (
              <button onClick={onDeclareWar} style={{ ...btnStyle(false), marginBottom: 0, marginRight: 0, padding: "10px 24px", fontSize: 13, letterSpacing: 1.2, border: "1px solid rgba(170,70,54,.5)", color: "#ef9c8f" }}>
                Declare War
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

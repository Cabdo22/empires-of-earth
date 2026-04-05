import React, { useEffect, useMemo, useRef } from "react";
import { HEX_POINTS, HEX_SIZE } from '../data/constants.js';
import { UNIT_DEFS } from '../data/units.js';
import { DISTRICT_DEFS } from '../data/districts.js';
import { RESOURCE_INFO } from '../data/terrain.js';
import UnitAnimationOverlay from './UnitAnimationOverlay.jsx';

const TERRAIN_COLORS = {
  grassland: "#4b7d28",
  forest: "#255a22",
  mountain: "#5a564c",
  water: "#2b618d",
};

function hexPath(ctx, x, y) {
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * 60 * i;
    const px = x + HEX_SIZE * Math.cos(angle);
    const py = y + HEX_SIZE * Math.sin(angle);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function drawHex(ctx, x, y, fill, stroke, lineWidth = 1, alpha = 1) {
  ctx.save();
  ctx.beginPath();
  hexPath(ctx, x, y);
  ctx.globalAlpha = alpha;
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
  ctx.restore();
}

function drawCenteredText(ctx, text, x, y, color, size, stroke) {
  ctx.save();
  ctx.font = `bold ${size}px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 3;
    ctx.strokeText(text, x, y);
  }
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.restore();
}

export function CanvasBoardRenderer({
  svgRef,
  gRef,
  wW,
  wH,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onMouseLeave,
  onClick,
  onContextMenu,
  onWheel,
  boardHexes,
  terrainCanvasTiles,
  entityCanvasTiles,
  overlayCanvasTiles,
  borderOverlay,
  cityBannerOverlay,
  overlayRef,
  animVisuals,
  animatingUnitId,
  combatAnims,
  tooltipData,
}) {
  const terrainCanvasRef = useRef(null);
  const entityCanvasRef = useRef(null);
  const overlayCanvasRef = useRef(null);

  const hexOutline = useMemo(() => HEX_POINTS, []);

  useEffect(() => {
    const canvas = terrainCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, wW, wH);
    for (const tile of terrainCanvasTiles || boardHexes) {
      const { hex, isFogged, isExplored, player } = tile;
      if (isFogged && !isExplored) {
        drawHex(ctx, hex.x, hex.y, "#bcc9d4", "rgba(180,195,210,.35)", 1, 1);
        continue;
      }
      const base = TERRAIN_COLORS[hex.terrainType] || "#444";
      if (isFogged) drawHex(ctx, hex.x, hex.y, base, "rgba(30,40,20,.35)", 1, 0.45);
      else drawHex(ctx, hex.x, hex.y, base, "rgba(0,0,0,.25)", 1, 1);
      if (hex.ownerPlayerId && player) {
        drawHex(ctx, hex.x, hex.y, player.color, null, 0, isFogged ? 0.08 : 0.14);
      }
      if (hex.road && !tile.city) {
        ctx.save();
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.arc(hex.x, hex.y, 5, 0, Math.PI * 2);
        ctx.fillStyle = "#a08060";
        ctx.fill();
        ctx.strokeStyle = "#705030";
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
      }
    }
  }, [terrainCanvasTiles, boardHexes, wW, wH, hexOutline]);

  useEffect(() => {
    const canvas = entityCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, wW, wH);
    for (const tile of entityCanvasTiles || boardHexes) {
      const { hex, city, player, units, unitCount, isFogged, discoveredResources } = tile;
      if (isFogged && !tile.isExplored) continue;
      if (hex.resource && discoveredResources?.has(hex.resource) && !city) {
        const icon = RESOURCE_INFO[hex.resource]?.icon || "?";
        drawCenteredText(ctx, icon, hex.x, hex.y, "#ffe090", 15, "rgba(0,0,0,.6)");
      }
      if (city && player) {
        drawHex(ctx, hex.x, hex.y, player.color, player.color, 1.5, 0.18);
        ctx.save();
        ctx.translate(hex.x, hex.y - 6);
        ctx.scale(1.2, 1.2);
        ctx.fillStyle = "#d4b080";
        ctx.strokeStyle = "#7a5c3a";
        ctx.lineWidth = 1;
        ctx.fillRect(-14, -9, 10, 12);
        ctx.strokeRect(-14, -9, 10, 12);
        ctx.fillRect(-2, -12, 12, 15);
        ctx.strokeRect(-2, -12, 12, 15);
        ctx.fillRect(12, -5, 8, 8);
        ctx.strokeRect(12, -5, 8, 8);
        ctx.restore();
      }
      if (unitCount > 0 && units?.[0]) {
        const unit = units[0];
        ctx.save();
        ctx.translate(hex.x, hex.y - 6);
        ctx.beginPath();
        ctx.arc(0, 0, 18, 0, Math.PI * 2);
        ctx.fillStyle = unit.pBg;
        ctx.fill();
        ctx.strokeStyle = tile.unitSelected ? "#60d0ff" : tile.canAct ? "#a0e060" : unit.pCol;
        ctx.lineWidth = tile.unitSelected ? 2.5 : tile.canAct ? 2 : 1.5;
        ctx.setLineDash(tile.canAct && !tile.unitSelected ? [4, 2] : []);
        ctx.stroke();
        drawCenteredText(ctx, UNIT_DEFS[unit.unitType]?.icon || "?", 0, 0, unit.pLight || "#fff", 16);
        if (unitCount > 1) {
          drawCenteredText(ctx, `+${unitCount - 1}`, 14, -14, "#ffd740", 9, "rgba(0,0,0,.7)");
        }
        ctx.setLineDash([]);
        ctx.fillStyle = "#222";
        ctx.strokeStyle = "#555";
        ctx.lineWidth = 0.5;
        ctx.fillRect(-14, 20, 28, 4);
        ctx.strokeRect(-14, 20, 28, 4);
        ctx.fillStyle = unit.hpCurrent > (UNIT_DEFS[unit.unitType]?.hp || 10) * 0.5 ? "#4a4" : "#c44";
        ctx.fillRect(-14, 20, 28 * (unit.hpCurrent / (UNIT_DEFS[unit.unitType]?.hp || 10)), 4);
        ctx.restore();
      }
    }
  }, [entityCanvasTiles, boardHexes, wW, wH]);

  useEffect(() => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, wW, wH);
    for (const tile of overlayCanvasTiles || boardHexes) {
      const { hex, inMoveRange, inAttackRange, inNukeRange, settlerMode, settlerBlocked, city, isHovered, isSelected, flash } = tile;
      if (inMoveRange) drawHex(ctx, hex.x, hex.y, "rgba(96,208,255,.1)", "#60d0ff", 2, 0.8);
      if (inAttackRange) drawHex(ctx, hex.x, hex.y, "rgba(255,60,60,.12)", "#ff4040", 2, 0.8);
      if (inNukeRange) drawHex(ctx, hex.x, hex.y, "rgba(255,200,0,.15)", "#ffa000", 2.5, 0.85);
      if (settlerMode && hex.terrainType !== "water" && hex.terrainType !== "mountain" && !city && !settlerBlocked) drawHex(ctx, hex.x, hex.y, "rgba(80,255,80,.12)", "#40e040", 2, 0.7);
      if (settlerMode && hex.terrainType !== "water" && hex.terrainType !== "mountain" && !city && settlerBlocked) drawHex(ctx, hex.x, hex.y, "rgba(255,60,60,.08)", "#ff4040", 1.5, 0.5);
      if (isHovered && !isSelected) drawHex(ctx, hex.x, hex.y, "rgba(255,255,200,.12)", "#e8d860", 2, 1);
      if (isSelected) drawHex(ctx, hex.x, hex.y, "rgba(255,255,200,.08)", "#f0e068", 2.5, 1);
      if (flash) {
        drawHex(
          ctx,
          hex.x,
          hex.y,
          flash === "nuke" ? "rgba(255,200,0,.5)" : flash === "blocked" ? "rgba(255,160,40,.25)" : "rgba(255,80,80,.35)",
          flash === "nuke" ? "#ff8000" : flash === "blocked" ? "#ffa030" : "#ff2020",
          flash === "blocked" ? 2 : 3,
          0.95
        );
      }
    }
  }, [overlayCanvasTiles, boardHexes, wW, wH]);

  return (
    <div
      ref={svgRef}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
      onContextMenu={onContextMenu}
      onWheel={onWheel}
      style={{ cursor: "grab", position: "absolute", top: 0, left: 0, width: "100%", height: "100%", zIndex: 1 }}
    >
      <div ref={gRef} style={{ position: "absolute", top: 0, left: 0, width: wW, height: wH, willChange: "transform" }}>
        <canvas ref={terrainCanvasRef} width={wW} height={wH} style={{ position: "absolute", inset: 0, pointerEvents: "none" }} />
        <canvas ref={entityCanvasRef} width={wW} height={wH} style={{ position: "absolute", inset: 0, pointerEvents: "none" }} />
        <canvas ref={overlayCanvasRef} width={wW} height={wH} style={{ position: "absolute", inset: 0, pointerEvents: "none" }} />
        <svg width={wW} height={wH} style={{ position: "absolute", inset: 0, overflow: "visible", pointerEvents: "none" }}>
          <defs>
            <clipPath id="canvasHexClip"><polygon points={HEX_POINTS} /></clipPath>
          </defs>
          {borderOverlay.map(b=><g key={b.key} transform={`translate(${b.x},${b.y})`} style={{pointerEvents:"none"}}><polyline points={b.pts.map(p=>`${p.x},${p.y}`).join(" ")} fill="none" stroke="#000" strokeWidth={6} strokeLinejoin="round" strokeLinecap="round" opacity={0.3}/><polyline points={b.pts.map(p=>`${p.x},${p.y}`).join(" ")} fill="none" stroke={b.color} strokeWidth={3.5} strokeLinejoin="round" strokeLinecap="round" opacity={0.9}/></g>)}
          {cityBannerOverlay.map(cb=><g key={cb.key} transform={`translate(${cb.x},${cb.y+30})`} style={{pointerEvents:"none"}}>
            <rect x={-35} y={-8} width={70} height={15} rx={3} fill={cb.colorBg} stroke={cb.color} strokeWidth="1"/>
            <text x={-3} y={.5} textAnchor="middle" dominantBaseline="middle" fill="#ffd740" fontSize={8} fontWeight="bold" fontFamily="'Palatino Linotype',serif" style={{letterSpacing:.5}}>{cb.name}</text>
            <circle cx={27} cy={.5} r={7} fill={cb.color} opacity=".8"/>
            <text x={27} y={1} textAnchor="middle" dominantBaseline="middle" fill="#fff" fontSize={7} fontWeight="bold">{cb.pop}</text>
            <rect x={-20} y={10} width={40} height={4} rx={1.5} fill="#333" opacity=".7"/><rect x={-20} y={10} width={40*(cb.hp/cb.hpMax)} height={4} rx={1.5} fill={cb.hp>cb.hpMax*.5?"#4a4":"#c44"} opacity=".9"/>
            {cb.prod&&<text x={0} y={-26} textAnchor="middle" fill="#ffd740" fontSize={8}>⚙ {cb.prod.type==="unit"?UNIT_DEFS[cb.prod.itemId]?.name:DISTRICT_DEFS[cb.prod.itemId]?.name}</text>}
          </g>)}
          <UnitAnimationOverlay ref={overlayRef} unitType={animVisuals?.unitType} playerColors={animVisuals||{}} visible={!!animatingUnitId}/>
          {combatAnims.map(a=><g key={a.id} transform={`translate(${a.x},${a.y})`} style={{pointerEvents:"none"}}>
            <text x={0} y={-20} textAnchor="middle" fill={a.color} fontSize={18} fontWeight="bold" fontFamily="'Palatino Linotype',serif" stroke="#000" strokeWidth="2" paintOrder="stroke">
              -{a.dmg}<animate attributeName="y" from="-20" to="-65" dur="1.1s" fill="freeze"/><animate attributeName="opacity" from="1" to="0" dur="1.1s" fill="freeze"/>
            </text>
          </g>)}
          {tooltipData&&<g transform={`translate(${tooltipData.x},${tooltipData.y-52})`} style={{pointerEvents:"none"}}>
            <rect x={-tooltipData.text.length*3.2} y={-10} width={tooltipData.text.length*6.4} height={18} rx={5} fill="rgba(50,15,5,.95)" stroke="rgba(240,100,60,.7)" strokeWidth="1"/>
            <text x={0} y={3} textAnchor="middle" dominantBaseline="middle" fill="#ffb090" fontSize={9} fontWeight="bold" fontFamily="'Palatino Linotype',serif" style={{pointerEvents:"none"}}>{tooltipData.text}</text>
          </g>}
        </svg>
      </div>
    </div>
  );
}

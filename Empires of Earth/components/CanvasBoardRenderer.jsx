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

const TERRAIN_HIGHLIGHTS = {
  grassland: "#7eb449",
  forest: "#4e8a48",
  mountain: "#908772",
  water: "#63a6d3",
};

const FOG_DIM = "rgba(7,9,6,0.48)";

function rand(seed) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function setupCanvas(canvas, wW, wH) {
  const dpr = window.devicePixelRatio || 1;
  const width = Math.round(wW * dpr);
  const height = Math.round(wH * dpr);
  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;
  canvas.style.width = `${wW}px`;
  canvas.style.height = `${wH}px`;
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return ctx;
}

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

function drawTerrainBase(ctx, tile) {
  const { hex, isFogged, isExplored, player, reducedEffects } = tile;
  if (isFogged && !isExplored) {
    drawHex(ctx, hex.x, hex.y, "#9eaebb", "rgba(214,226,236,.35)", 1.1, 1);
    if (!reducedEffects) {
      ctx.save();
      ctx.beginPath();
      hexPath(ctx, hex.x, hex.y);
      ctx.clip();
      for (let i = 0; i < 3; i++) {
        const rx = (rand(hex.id * 11 + i) - 0.5) * 42;
        const ry = (rand(hex.id * 19 + i) - 0.5) * 24;
        const rw = 16 + rand(hex.id * 23 + i) * 14;
        const rh = 10 + rand(hex.id * 29 + i) * 8;
        ctx.fillStyle = i === 0 ? "rgba(255,255,255,.22)" : "rgba(238,245,250,.16)";
        ctx.beginPath();
        ctx.ellipse(hex.x + rx, hex.y + ry, rw, rh, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
    return;
  }

  const base = TERRAIN_COLORS[hex.terrainType] || "#444";
  const hi = TERRAIN_HIGHLIGHTS[hex.terrainType] || "#777";
  ctx.save();
  ctx.beginPath();
  hexPath(ctx, hex.x, hex.y);
  const grad = ctx.createRadialGradient(hex.x - HEX_SIZE * 0.25, hex.y - HEX_SIZE * 0.35, HEX_SIZE * 0.2, hex.x, hex.y, HEX_SIZE * 1.1);
  grad.addColorStop(0, hi);
  grad.addColorStop(0.45, base);
  grad.addColorStop(1, "#162012");
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.strokeStyle = isFogged ? "rgba(28,36,20,.35)" : "rgba(0,0,0,.32)";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  hexPath(ctx, hex.x, hex.y);
  ctx.clip();

  if (hex.terrainType === "grassland") {
    ctx.strokeStyle = reducedEffects ? "rgba(156,214,109,.18)" : "rgba(163,223,107,.26)";
    ctx.lineWidth = 1;
    for (let i = 0; i < (reducedEffects ? 5 : 10); i++) {
      const dx = (rand(hex.id * 31 + i) - 0.5) * 54;
      const dy = (rand(hex.id * 37 + i) - 0.2) * 36;
      ctx.beginPath();
      ctx.moveTo(hex.x + dx, hex.y + dy + 3);
      ctx.quadraticCurveTo(hex.x + dx + 2, hex.y + dy - 5, hex.x + dx + 4, hex.y + dy - 8);
      ctx.stroke();
    }
  } else if (hex.terrainType === "forest") {
    for (let i = 0; i < (reducedEffects ? 4 : 7); i++) {
      const dx = (rand(hex.id * 41 + i) - 0.5) * 50;
      const dy = (rand(hex.id * 43 + i) - 0.45) * 38;
      ctx.fillStyle = i % 2 === 0 ? "rgba(33,86,31,.55)" : "rgba(62,128,56,.45)";
      ctx.beginPath();
      ctx.arc(hex.x + dx, hex.y + dy, 8 + rand(hex.id * 47 + i) * 5, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (hex.terrainType === "mountain") {
    ctx.strokeStyle = reducedEffects ? "rgba(236,236,236,.18)" : "rgba(245,245,245,.28)";
    ctx.lineWidth = 1.2;
    for (let i = 0; i < (reducedEffects ? 2 : 4); i++) {
      const dx = (rand(hex.id * 53 + i) - 0.5) * 28;
      const h = 12 + rand(hex.id * 59 + i) * 14;
      ctx.beginPath();
      ctx.moveTo(hex.x + dx - 10, hex.y + 14);
      ctx.lineTo(hex.x + dx, hex.y - h);
      ctx.lineTo(hex.x + dx + 10, hex.y + 14);
      ctx.stroke();
    }
  } else if (hex.terrainType === "water") {
    ctx.strokeStyle = reducedEffects ? "rgba(168,222,250,.16)" : "rgba(196,232,252,.22)";
    ctx.lineWidth = 1;
    for (let i = 0; i < (reducedEffects ? 3 : 6); i++) {
      const dx = (rand(hex.id * 61 + i) - 0.5) * 48;
      const dy = (rand(hex.id * 67 + i) - 0.5) * 28;
      ctx.beginPath();
      ctx.moveTo(hex.x + dx - 8, hex.y + dy);
      ctx.quadraticCurveTo(hex.x + dx, hex.y + dy - 3, hex.x + dx + 8, hex.y + dy);
      ctx.stroke();
    }
  }

  if (hex.ownerPlayerId && player) {
    drawHex(ctx, hex.x, hex.y, player.color, null, 0, isFogged ? 0.08 : 0.14);
  }

  if (isFogged) {
    drawHex(ctx, hex.x, hex.y, FOG_DIM, "rgba(18,24,14,.24)", 1, 1);
  }
  ctx.restore();
}

function drawRoad(ctx, hex) {
  ctx.save();
  ctx.strokeStyle = "#7d5b35";
  ctx.lineWidth = 2.2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(hex.x - 8, hex.y + 6);
  ctx.lineTo(hex.x, hex.y);
  ctx.lineTo(hex.x + 8, hex.y - 6);
  ctx.stroke();
  ctx.strokeStyle = "rgba(214,180,132,.8)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(hex.x - 7, hex.y + 5);
  ctx.lineTo(hex.x, hex.y);
  ctx.lineTo(hex.x + 7, hex.y - 5);
  ctx.stroke();
  ctx.restore();
}

function drawResourceBadge(ctx, hex, resourceType) {
  const icon = RESOURCE_INFO[resourceType]?.icon || "?";
  ctx.save();
  ctx.beginPath();
  ctx.arc(hex.x, hex.y, 12, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(16,20,14,.86)";
  ctx.fill();
  ctx.strokeStyle = "rgba(255,225,160,.7)";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  drawCenteredText(ctx, icon, hex.x, hex.y + 0.5, "#ffe090", 13, "rgba(0,0,0,.7)");
  ctx.restore();
}

function drawCity(ctx, tile) {
  const { hex, city, player, unitCount } = tile;
  drawHex(ctx, hex.x, hex.y, player.color, player.color, 1.7, 0.2);
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
  if (unitCount > 0) {
    ctx.beginPath();
    ctx.arc(0, 16, 7, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(12,16,10,.92)";
    ctx.fill();
    ctx.strokeStyle = player.colorLight || player.color;
    ctx.lineWidth = 1.4;
    ctx.stroke();
    drawCenteredText(ctx, "⚔", 0, 16.5, "#ffd986", 9);
  }
  ctx.restore();
}

function drawUnit(ctx, tile) {
  const { hex, units, unitCount, unitSelected, canAct, reducedEffects, city } = tile;
  const unit = units[0];
  ctx.save();
  ctx.translate(hex.x, hex.y - (city ? 10 : 6));
  if (canAct && !unitSelected && !reducedEffects) {
    ctx.beginPath();
    ctx.arc(0, 0, 21.5, 0, Math.PI * 2);
    ctx.strokeStyle = `${unit.pCol}aa`;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(0, 0, 18, 0, Math.PI * 2);
  const grad = ctx.createRadialGradient(-5, -6, 2, 0, 0, 18);
  grad.addColorStop(0, unit.pLight || "#fff");
  grad.addColorStop(0.18, unit.pBg);
  grad.addColorStop(1, "rgba(10,12,10,.96)");
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.strokeStyle = unitSelected ? "#60d0ff" : canAct ? "#a0e060" : unit.pCol;
  ctx.lineWidth = unitSelected ? 2.7 : canAct ? 2.2 : 1.6;
  if (canAct && !unitSelected) ctx.setLineDash([4, 2]);
  ctx.stroke();
  ctx.setLineDash([]);
  drawCenteredText(ctx, UNIT_DEFS[unit.unitType]?.icon || "?", 0, 0, unit.pLight || "#fff", 16, "rgba(0,0,0,.55)");
  if (unitCount > 1) drawCenteredText(ctx, `+${unitCount - 1}`, 14, -14, "#ffd740", 9, "rgba(0,0,0,.75)");
  ctx.fillStyle = "#222";
  ctx.strokeStyle = "#555";
  ctx.lineWidth = 0.5;
  ctx.fillRect(-14, 20, 28, 4);
  ctx.strokeRect(-14, 20, 28, 4);
  ctx.fillStyle = unit.hpCurrent > (UNIT_DEFS[unit.unitType]?.hp || 10) * 0.5 ? "#4a4" : "#c44";
  ctx.fillRect(-14, 20, 28 * (unit.hpCurrent / (UNIT_DEFS[unit.unitType]?.hp || 10)), 4);
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

  useEffect(() => {
    const canvas = terrainCanvasRef.current;
    if (!canvas) return;
    const ctx = setupCanvas(canvas, wW, wH);
    ctx.clearRect(0, 0, wW, wH);
    for (const tile of terrainCanvasTiles || boardHexes) {
      drawTerrainBase(ctx, tile);
      if (tile.hex.road && !tile.city) drawRoad(ctx, tile.hex);
    }
  }, [terrainCanvasTiles, boardHexes, wW, wH]);

  useEffect(() => {
    const canvas = entityCanvasRef.current;
    if (!canvas) return;
    const ctx = setupCanvas(canvas, wW, wH);
    ctx.clearRect(0, 0, wW, wH);
    for (const tile of entityCanvasTiles || boardHexes) {
      const { hex, city, player, units, unitCount, isFogged, discoveredResources } = tile;
      if (isFogged && !tile.isExplored) continue;
      if (hex.resource && discoveredResources?.has(hex.resource) && !city) {
        drawResourceBadge(ctx, hex, hex.resource);
      }
      if (city && player) {
        drawCity(ctx, tile);
      }
      if (unitCount > 0 && units?.[0]) {
        drawUnit(ctx, tile);
      }
    }
  }, [entityCanvasTiles, boardHexes, wW, wH]);

  useEffect(() => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;
    const ctx = setupCanvas(canvas, wW, wH);
    ctx.clearRect(0, 0, wW, wH);
    for (const tile of overlayCanvasTiles || boardHexes) {
      const { hex, inMoveRange, inAttackRange, inNukeRange, settlerMode, settlerBlocked, city, isHovered, isSelected, flash, reducedEffects } = tile;
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
      if (isSelected && !reducedEffects) {
        ctx.save();
        ctx.strokeStyle = "rgba(255,248,200,.55)";
        ctx.lineWidth = 1;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        hexPath(ctx, hex.x, hex.y);
        ctx.stroke();
        ctx.restore();
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
      <div ref={gRef} style={{ position: "absolute", top: 0, left: 0, width: wW, height: wH, willChange: "transform", transformOrigin: "0 0" }}>
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

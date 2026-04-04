import { useRef, useCallback, useEffect } from "react";
import { hexAt } from '../data/constants.js';
import { getDisplayColors } from '../engine/discovery.js';

export function useMinimap({ hexes, fogVisible, fogExplored, players, gs, wW, wH, MINIMAP_W, MINIMAP_H, minimapRenderRef, zoomRef, panRef, sched, viewPlayerId }) {
  const minimapRef = useRef(null);
  const mmDragRef = useRef(false);
  const baseCanvasRef = useRef(null);
  const viewportRafRef = useRef(0);
  // Store dynamic bounds so minimapNav can use them
  const dynBoundsRef = useRef({ minX: 0, minY: 0, scaleX: MINIMAP_W / wW, scaleY: MINIMAP_H / wH });

  const drawMiniHex = (ctx, cx2, cy2, r) => {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i * 60 - 30) * Math.PI / 180;
      const px = cx2 + r * Math.cos(a), py = cy2 + r * Math.sin(a);
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.closePath();
  };

  const drawViewportRect = useCallback(() => {
    if (!minimapRef.current || !baseCanvasRef.current) return;
    const ctx = minimapRef.current.getContext("2d");
    ctx.clearRect(0, 0, MINIMAP_W, MINIMAP_H);
    ctx.drawImage(baseCanvasRef.current, 0, 0);
    const { minX, minY, scaleX: dynScaleX, scaleY: dynScaleY } = dynBoundsRef.current;
    ctx.globalAlpha = 1;
    const z = zoomRef.current, pan = panRef.current;
    const vpCx = window.innerWidth / 2, vpCy = window.innerHeight / 2;
    const wl = ((wW * z) / 2 - pan.x - vpCx) / z, wt = ((wH * z) / 2 - pan.y - vpCy) / z;
    const vpW = window.innerWidth / z, vpH = window.innerHeight / z;
    ctx.strokeStyle = "rgba(255,220,100,.7)"; ctx.lineWidth = 1.5;
    ctx.strokeRect((wl - minX) * dynScaleX, (wt - minY) * dynScaleY, vpW * dynScaleX, vpH * dynScaleY);
  }, [MINIMAP_W, MINIMAP_H, zoomRef, panRef, wW, wH]);

  const scheduleViewportRender = useCallback(() => {
    if (viewportRafRef.current) return;
    viewportRafRef.current = requestAnimationFrame(() => {
      viewportRafRef.current = 0;
      drawViewportRect();
    });
  }, [drawViewportRect]);

  const renderMinimap = useCallback(() => {
    if (!minimapRef.current || !gs) return;
    if (!baseCanvasRef.current) {
      const canvas = document.createElement("canvas");
      canvas.width = MINIMAP_W;
      canvas.height = MINIMAP_H;
      baseCanvasRef.current = canvas;
    }
    const ctx = baseCanvasRef.current.getContext("2d");
    const MTC = { grassland: "#5a9030", forest: "#1e6a38", mountain: "#6a6a5a", water: "#2a5a8a" };
    ctx.fillStyle = "#0a0e06"; ctx.fillRect(0, 0, MINIMAP_W, MINIMAP_H);

    // Compute bounding box of explored/visible hexes for dynamic zoom
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    let hasAny = false;
    for (const h of hexes) {
      const uk = `${h.col},${h.row}`;
      if (fogVisible.has(uk) || fogExplored.has(uk)) {
        if (h.x < minX) minX = h.x;
        if (h.x > maxX) maxX = h.x;
        if (h.y < minY) minY = h.y;
        if (h.y > maxY) maxY = h.y;
        hasAny = true;
      }
    }

    // Fallback to full world if nothing explored
    if (!hasAny) { minX = 0; maxX = wW; minY = 0; maxY = wH; }

    // Add padding and clamp to world bounds
    const pad = 80;
    minX = Math.max(0, minX - pad); minY = Math.max(0, minY - pad);
    maxX = Math.min(wW, maxX + pad); maxY = Math.min(wH, maxY + pad);
    const rangeW = maxX - minX, rangeH = maxY - minY;
    const dynScaleX = MINIMAP_W / rangeW, dynScaleY = MINIMAP_H / rangeH;

    // Store for minimapNav
    dynBoundsRef.current = { minX, minY, scaleX: dynScaleX, scaleY: dynScaleY };

    // Compute hex radius to fill gaps — scale relative to dynamic zoom
    const COLS_EST = Math.round((wW - 100) / (1.5 * 30));
    const baseR = MINIMAP_W / (COLS_EST * 1.6);
    const zoomFactor = (wW / rangeW + wH / rangeH) / 2;
    const r = Math.max(3, Math.min(10, baseR * zoomFactor));

    // Draw terrain hexes
    for (const h of hexes) {
      const uk = `${h.col},${h.row}`;
      const vis = fogVisible.has(uk), expl = fogExplored.has(uk);
      if (!vis && !expl) continue;
      const cx2 = (h.x - minX) * dynScaleX, cy2 = (h.y - minY) * dynScaleY;
      ctx.globalAlpha = vis ? 1 : 0.35; ctx.fillStyle = MTC[h.terrainType] || "#444";
      drawMiniHex(ctx, cx2, cy2, r); ctx.fill();
      if (h.ownerPlayerId) {
        const dc = getDisplayColors(h.ownerPlayerId, viewPlayerId, gs);
        ctx.globalAlpha = vis ? 0.3 : 0.15; ctx.fillStyle = dc.color; drawMiniHex(ctx, cx2, cy2, r); ctx.fill();
      }
    }

    // Draw cities
    for (const p of players) {
      const dc = getDisplayColors(p.id, viewPlayerId, gs);
      ctx.fillStyle = dc.color; ctx.globalAlpha = 1;
      for (const c of p.cities) {
        const ch = hexes[c.hexId]; if (!ch) continue;
        const vis2 = fogVisible.has(`${ch.col},${ch.row}`) || fogExplored.has(`${ch.col},${ch.row}`); if (!vis2) continue;
        drawMiniHex(ctx, (ch.x - minX) * dynScaleX, (ch.y - minY) * dynScaleY, r + 1); ctx.fill();
        ctx.strokeStyle = "#fff"; ctx.lineWidth = 0.5; ctx.stroke();
      }
    }

    // Draw units
    for (const p of players) {
      const dc = getDisplayColors(p.id, viewPlayerId, gs);
      ctx.fillStyle = dc.colorLight || dc.color; ctx.globalAlpha = 0.9;
      for (const u of p.units) {
        const vis2 = fogVisible.has(`${u.hexCol},${u.hexRow}`); if (!vis2) continue;
        const uh = hexAt(hexes, u.hexCol, u.hexRow); if (!uh) continue;
        ctx.beginPath(); ctx.arc((uh.x - minX) * dynScaleX, (uh.y - minY) * dynScaleY, Math.max(1.5, r * 0.35), 0, Math.PI * 2); ctx.fill();
      }
    }

    drawViewportRect();
  }, [hexes, fogVisible, fogExplored, players, gs, wW, wH, MINIMAP_W, MINIMAP_H, viewPlayerId, drawViewportRect]);

  useEffect(() => {
    minimapRenderRef.current = scheduleViewportRender;
    renderMinimap();
    return () => {
      minimapRenderRef.current = null;
      if (viewportRafRef.current) cancelAnimationFrame(viewportRafRef.current);
      viewportRafRef.current = 0;
    };
  }, [renderMinimap, minimapRenderRef, scheduleViewportRender]);

  const minimapNav = useCallback(e => {
    if (!minimapRef.current) return;
    const rect = minimapRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    const { minX, minY, scaleX, scaleY } = dynBoundsRef.current;
    const worldX = mx / scaleX + minX, worldY = my / scaleY + minY;
    const z = zoomRef.current;
    panRef.current = { x: (wW * z) / 2 - worldX * z, y: (wH * z) / 2 - worldY * z };
    sched();
  }, [wW, wH, sched, zoomRef, panRef]);

  const onMinimapDown = useCallback(e => { mmDragRef.current = true; minimapNav(e); }, [minimapNav]);
  const onMinimapMove = useCallback(e => { if (mmDragRef.current) minimapNav(e); }, [minimapNav]);
  const onMinimapUp = useCallback(() => { mmDragRef.current = false; }, []);

  return { minimapRef, onMinimapDown, onMinimapMove, onMinimapUp, renderMinimap };
}

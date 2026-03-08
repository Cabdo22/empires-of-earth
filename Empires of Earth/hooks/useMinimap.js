import { useRef, useCallback, useEffect } from "react";
import { hexAt } from '../data/constants.js';

export function useMinimap({ hexes, fogVisible, fogExplored, players, gs, wW, wH, MINIMAP_W, MINIMAP_H, minimapRenderRef, zoomRef, panRef, sched }) {
  const minimapRef = useRef(null);
  const mmDragRef = useRef(false);
  const minimapScaleX = MINIMAP_W / wW;
  const minimapScaleY = MINIMAP_H / wH;
  const mmHexR = Math.max(2, Math.min(5, MINIMAP_W / (MINIMAP_W / 160 * (wW / (1.5 * 30 + 30 * 2 + 100)) * 2.2)));

  // Compute mmHexR from COLS if available, otherwise estimate
  const COLS_EST = Math.round((wW - 100) / (1.5 * 30)); // estimate COLS from wW

  const drawMiniHex = (ctx, cx2, cy2, r) => {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i * 60 - 30) * Math.PI / 180;
      const px = cx2 + r * Math.cos(a), py = cy2 + r * Math.sin(a);
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.closePath();
  };

  const renderMinimap = useCallback(() => {
    if (!minimapRef.current || !gs) return;
    const ctx = minimapRef.current.getContext("2d");
    const MTC = { grassland: "#5a9030", forest: "#1e6a38", mountain: "#6a6a5a", water: "#2a5a8a" };
    ctx.fillStyle = "#0a0e06"; ctx.fillRect(0, 0, MINIMAP_W, MINIMAP_H);
    const r = Math.max(2, Math.min(5, MINIMAP_W / (COLS_EST * 2.2)));
    for (const h of hexes) {
      const cx2 = h.x * minimapScaleX, cy2 = h.y * minimapScaleY;
      const vis = fogVisible.has(`${h.col},${h.row}`), expl = fogExplored.has(`${h.col},${h.row}`);
      if (!vis && !expl) continue;
      ctx.globalAlpha = vis ? 1 : 0.35; ctx.fillStyle = MTC[h.terrainType] || "#444";
      drawMiniHex(ctx, cx2, cy2, r); ctx.fill();
      if (h.ownerPlayerId) {
        const op2 = players.find(p2 => p2.id === h.ownerPlayerId);
        if (op2) { ctx.globalAlpha = vis ? 0.3 : 0.15; ctx.fillStyle = op2.color; drawMiniHex(ctx, cx2, cy2, r); ctx.fill(); }
      }
    }
    for (const p of players) {
      ctx.fillStyle = p.color; ctx.globalAlpha = 1;
      for (const c of p.cities) {
        const ch = hexes[c.hexId]; if (!ch) continue;
        const vis2 = fogVisible.has(`${ch.col},${ch.row}`) || fogExplored.has(`${ch.col},${ch.row}`); if (!vis2) continue;
        drawMiniHex(ctx, ch.x * minimapScaleX, ch.y * minimapScaleY, r + 1); ctx.fill();
        ctx.strokeStyle = "#fff"; ctx.lineWidth = 0.5; ctx.stroke();
      }
    }
    for (const p of players) {
      ctx.fillStyle = p.colorLight || p.color; ctx.globalAlpha = 0.9;
      for (const u of p.units) {
        const vis2 = fogVisible.has(`${u.hexCol},${u.hexRow}`); if (!vis2) continue;
        const uh = hexAt(hexes, u.hexCol, u.hexRow); if (!uh) continue;
        ctx.beginPath(); ctx.arc(uh.x * minimapScaleX, uh.y * minimapScaleY, 1.2, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    const z = zoomRef.current, pan = panRef.current;
    const vpCx = window.innerWidth / 2, vpCy = window.innerHeight / 2;
    const wl = ((wW * z) / 2 - pan.x - vpCx) / z, wt = ((wH * z) / 2 - pan.y - vpCy) / z;
    const vpW = window.innerWidth / z, vpH = window.innerHeight / z;
    ctx.strokeStyle = "rgba(255,220,100,.7)"; ctx.lineWidth = 1.5;
    ctx.strokeRect(wl * minimapScaleX, wt * minimapScaleY, vpW * minimapScaleX, vpH * minimapScaleY);
  }, [hexes, fogVisible, fogExplored, players, gs, minimapScaleX, minimapScaleY, wW, wH, COLS_EST, MINIMAP_W, MINIMAP_H, zoomRef, panRef]);

  useEffect(() => { minimapRenderRef.current = renderMinimap; renderMinimap(); }, [renderMinimap, minimapRenderRef]);

  const minimapNav = useCallback(e => {
    if (!minimapRef.current) return;
    const r = minimapRef.current.getBoundingClientRect();
    const mx = e.clientX - r.left, my = e.clientY - r.top;
    const worldX = mx / minimapScaleX, worldY = my / minimapScaleY;
    const z = zoomRef.current;
    panRef.current = { x: (wW * z) / 2 - worldX * z, y: (wH * z) / 2 - worldY * z };
    sched();
  }, [minimapScaleX, minimapScaleY, wW, wH, sched, zoomRef, panRef]);

  const onMinimapDown = useCallback(e => { mmDragRef.current = true; minimapNav(e); }, [minimapNav]);
  const onMinimapMove = useCallback(e => { if (mmDragRef.current) minimapNav(e); }, [minimapNav]);
  const onMinimapUp = useCallback(() => { mmDragRef.current = false; }, []);

  return { minimapRef, onMinimapDown, onMinimapMove, onMinimapUp, renderMinimap };
}

// ============================================================
// CAMERA HOOK — pan, zoom, minimap, viewport sync
// ============================================================

import { useRef, useCallback, useEffect } from "react";
import { HEX_SIZE, SQRT3, COLS, ROWS, hexAt } from '../data/constants.js';

export const MINIMAP_W = 160;
export const MINIMAP_H = 140;

export function useCamera({ hexes, gs, players, fogVisible, fogExplored }) {
  const panRef = useRef({ x: 0, y: 0 });
  const zoomRef = useRef(1);
  const isPanRef = useRef(false);
  const psRef = useRef({ x: 0, y: 0, px: 0, py: 0 });
  const gRef = useRef(null);
  const svgRef = useRef(null);
  const dirtyRef = useRef(false);
  const gameContainerRef = useRef(null);
  const uiOverlayRef = useRef(null);
  const minimapRef = useRef(null);
  const minimapRenderRef = useRef(null);
  const gameCenteredRef = useRef(false);
  const mmDragRef = useRef(false);

  const wW = COLS * 1.5 * HEX_SIZE + HEX_SIZE * 2 + 100;
  const wH = ROWS * SQRT3 * HEX_SIZE + SQRT3 * HEX_SIZE + 100;
  const minimapScaleX = MINIMAP_W / wW;
  const minimapScaleY = MINIMAP_H / wH;
  const mmHexR = Math.max(2, Math.min(5, MINIMAP_W / (COLS * 2.2)));

  const flush = useCallback(() => {
    const z = zoomRef.current, p = panRef.current, cx = window.innerWidth / 2, cy = window.innerHeight / 2;
    if (gRef.current) gRef.current.style.transform = `translate(${p.x + cx - (wW * z) / 2}px,${p.y + cy - (wH * z) / 2}px) scale(${z})`;
    dirtyRef.current = false;
    if (minimapRenderRef.current) minimapRenderRef.current();
  }, [wW, wH]);

  const sched = useCallback(() => {
    if (!dirtyRef.current) { dirtyRef.current = true; requestAnimationFrame(flush); }
  }, [flush]);

  useEffect(() => { flush(); }, [flush]);

  // Center camera on player's first city when game starts
  useEffect(() => {
    if (!gs || gameCenteredRef.current) return;
    const player = gs.players.find(p => p.id === gs.currentPlayerId);
    if (!player || !player.cities.length) return;
    const city = player.cities[0];
    const cityHex = hexes[city.hexId];
    if (!cityHex) return;
    const z = zoomRef.current;
    panRef.current = { x: (wW * z) / 2 - cityHex.x * z, y: (wH * z) / 2 - cityHex.y * z };
    gameCenteredRef.current = true;
    sched();
  }, [gs, hexes, wW, wH, sched]);

  // === MINIMAP ===
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
    for (const h of hexes) {
      const cx2 = h.x * minimapScaleX, cy2 = h.y * minimapScaleY;
      const vis = fogVisible.has(`${h.col},${h.row}`), expl = fogExplored.has(`${h.col},${h.row}`);
      if (!vis && !expl) continue;
      ctx.globalAlpha = vis ? 1 : 0.35;
      ctx.fillStyle = MTC[h.terrainType] || "#444";
      drawMiniHex(ctx, cx2, cy2, mmHexR); ctx.fill();
      if (h.ownerPlayerId) {
        const op2 = players.find(p2 => p2.id === h.ownerPlayerId);
        if (op2) { ctx.globalAlpha = vis ? 0.3 : 0.15; ctx.fillStyle = op2.color; drawMiniHex(ctx, cx2, cy2, mmHexR); ctx.fill(); }
      }
    }
    for (const p of players) {
      ctx.fillStyle = p.color; ctx.globalAlpha = 1;
      for (const c of p.cities) {
        const ch = hexes[c.hexId]; if (!ch) continue;
        const vis2 = fogVisible.has(`${ch.col},${ch.row}`) || fogExplored.has(`${ch.col},${ch.row}`);
        if (!vis2) continue;
        drawMiniHex(ctx, ch.x * minimapScaleX, ch.y * minimapScaleY, mmHexR + 1); ctx.fill();
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
  }, [hexes, fogVisible, fogExplored, players, gs, minimapScaleX, minimapScaleY, wW, wH, mmHexR]);

  useEffect(() => { minimapRenderRef.current = renderMinimap; renderMinimap(); }, [renderMinimap]);

  const minimapNav = useCallback(e => {
    if (!minimapRef.current) return;
    const r = minimapRef.current.getBoundingClientRect();
    const mx = e.clientX - r.left, my = e.clientY - r.top;
    const worldX = mx / minimapScaleX, worldY = my / minimapScaleY;
    const z = zoomRef.current;
    panRef.current = { x: (wW * z) / 2 - worldX * z, y: (wH * z) / 2 - worldY * z };
    sched();
  }, [minimapScaleX, minimapScaleY, wW, wH, sched]);

  const onMinimapDown = useCallback(e => { mmDragRef.current = true; minimapNav(e); }, [minimapNav]);
  const onMinimapMove = useCallback(e => { if (mmDragRef.current) minimapNav(e); }, [minimapNav]);
  const onMinimapUp = useCallback(() => { mmDragRef.current = false; }, []);

  // === PAN / ZOOM HANDLERS ===
  const onMD = useCallback(e => {
    isPanRef.current = true;
    psRef.current = { x: e.clientX, y: e.clientY, px: panRef.current.x, py: panRef.current.y };
    if (svgRef.current) svgRef.current.style.cursor = "grabbing";
  }, []);

  const onMM = useCallback(e => {
    if (!isPanRef.current) return;
    panRef.current = { x: psRef.current.px + e.clientX - psRef.current.x, y: psRef.current.py + e.clientY - psRef.current.y };
    sched();
  }, [sched]);

  const onMU = useCallback(() => {
    isPanRef.current = false;
    if (svgRef.current) svgRef.current.style.cursor = "grab";
  }, []);

  const onWh = useCallback(e => {
    e.preventDefault(); e.stopPropagation();
    const oldZ = zoomRef.current;
    const newZ = Math.min(3, Math.max(.3, oldZ - e.deltaY * .001));
    if (newZ === oldZ) return;
    const mx = e.clientX, my = e.clientY;
    const cx = window.innerWidth / 2, cy = window.innerHeight / 2;
    const p = panRef.current;
    const wx = (mx - p.x - cx + wW * oldZ / 2) / oldZ;
    const wy = (my - p.y - cy + wH * oldZ / 2) / oldZ;
    panRef.current = { x: mx - cx + wW * newZ / 2 - wx * newZ, y: my - cy + wH * newZ / 2 - wy * newZ };
    zoomRef.current = newZ;
    sched();
  }, [sched, wW, wH]);

  // Attach wheel listener as non-passive
  useEffect(() => {
    const el = svgRef.current; if (!el) return;
    const h = e => { e.preventDefault(); onWh(e); };
    el.addEventListener("wheel", h, { passive: false });
    const blockBrowserZoom = e => { if (e.ctrlKey || e.metaKey) e.preventDefault(); };
    document.addEventListener("wheel", blockBrowserZoom, { passive: false, capture: true });
    const blockKeyZoom = e => { if ((e.ctrlKey || e.metaKey) && (e.key === "+" || e.key === "-" || e.key === "=" || e.key === "0")) e.preventDefault(); };
    document.addEventListener("keydown", blockKeyZoom);
    return () => {
      el.removeEventListener("wheel", h);
      document.removeEventListener("wheel", blockBrowserZoom, { capture: true });
      document.removeEventListener("keydown", blockKeyZoom);
    };
  }, [onWh]);

  // Keep UI overlay sized to visual viewport
  useEffect(() => {
    const vv = window.visualViewport; if (!vv) return;
    let pollTimer = null, rafId = 0, polling = false;
    const sync = () => {
      const el = uiOverlayRef.current; if (!el) return;
      el.style.width = vv.width + "px"; el.style.height = vv.height + "px";
      el.style.left = vv.offsetLeft + "px"; el.style.top = vv.offsetTop + "px";
    };
    const pollLoop = () => { sync(); if (polling) rafId = requestAnimationFrame(pollLoop); };
    const startPoll = () => { if (!polling) { polling = true; pollLoop(); } clearTimeout(pollTimer); pollTimer = setTimeout(() => { polling = false; }, 500); };
    vv.addEventListener("resize", sync); vv.addEventListener("scroll", sync);
    document.addEventListener("wheel", startPoll, { capture: true, passive: true });
    sync();
    return () => {
      polling = false; cancelAnimationFrame(rafId); clearTimeout(pollTimer);
      vv.removeEventListener("resize", sync); vv.removeEventListener("scroll", sync);
      document.removeEventListener("wheel", startPoll, { capture: true });
    };
  }, []);

  return {
    svgRef, gRef, gameContainerRef, uiOverlayRef, minimapRef, isPanRef, panRef,
    wW, wH,
    sched, onMD, onMM, onMU, onWh,
    onMinimapDown, onMinimapMove, onMinimapUp,
  };
}

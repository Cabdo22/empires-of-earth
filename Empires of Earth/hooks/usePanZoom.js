import { useRef, useCallback, useEffect } from "react";

export function usePanZoom({ wW, wH }) {
  const panRef = useRef({ x: 0, y: 0 });
  const zoomRef = useRef(1);
  const isPanRef = useRef(false);
  const psRef = useRef({ x: 0, y: 0, px: 0, py: 0 });
  const gRef = useRef(null);
  const svgRef = useRef(null);
  const dirtyRef = useRef(false);
  const gameContainerRef = useRef(null);
  const uiOverlayRef = useRef(null);
  const minimapRenderRef = useRef(null);

  const flush = useCallback(() => {
    const z = zoomRef.current, p = panRef.current;
    const cx = window.innerWidth / 2, cy = window.innerHeight / 2;
    if (gRef.current) gRef.current.style.transform = `translate(${p.x + cx - (wW * z) / 2}px,${p.y + cy - (wH * z) / 2}px) scale(${z})`;
    dirtyRef.current = false;
    if (minimapRenderRef.current) minimapRenderRef.current();
  }, [wW, wH]);

  const sched = useCallback(() => {
    if (!dirtyRef.current) { dirtyRef.current = true; requestAnimationFrame(flush); }
  }, [flush]);

  useEffect(() => { flush(); }, [flush]);

  // Mouse handlers
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

  // Attach wheel listener as non-passive so preventDefault stops browser scroll/zoom
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

  // Keep UI overlay sized to VISUAL viewport
  useEffect(() => {
    const vv = window.visualViewport; if (!vv) return;
    let pollTimer = null, rafId = 0, polling = false;
    const sync = () => {
      const el = uiOverlayRef.current; if (!el) return;
      el.style.width = vv.width + "px"; el.style.height = vv.height + "px";
      el.style.left = vv.offsetLeft + "px"; el.style.top = vv.offsetTop + "px";
    };
    const pollLoop = () => { sync(); if (polling) rafId = requestAnimationFrame(pollLoop); };
    const startPoll = () => {
      if (!polling) { polling = true; pollLoop(); }
      clearTimeout(pollTimer); pollTimer = setTimeout(() => { polling = false; }, 500);
    };
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
    panRef, zoomRef, isPanRef, gRef, svgRef, gameContainerRef, uiOverlayRef, minimapRenderRef,
    flush, sched, onMD, onMM, onMU, onWh,
  };
}

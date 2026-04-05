import { useRef, useCallback, useEffect, useState } from "react";
import { clientPointToWorldPoint, getPanForWorldPointAtClientPoint, getWorldTransform } from "../utils/boardCoordinates.js";
import { getZoomBucket } from "../utils/rendererPolicy.js";

export function usePanZoom({ wW, wH }) {
  const panRef = useRef({ x: 0, y: 0 });
  const zoomRef = useRef(1);
  const [zoomBucket, setZoomBucket] = useState(() => getZoomBucket(1));
  const isPanRef = useRef(false);
  const pointerDownRef = useRef(false);
  const psRef = useRef({ x: 0, y: 0, px: 0, py: 0 });
  const gRef = useRef(null);
  const svgRef = useRef(null);
  const dirtyRef = useRef(false);
  const gameContainerRef = useRef(null);
  const uiOverlayRef = useRef(null);
  const minimapRenderRef = useRef(null);
  const viewportScaleRef = useRef(window.visualViewport?.scale || 1);
  const getContainerRect = useCallback(() => gameContainerRef.current?.getBoundingClientRect(), []);
  const syncZoomBucket = useCallback((zoom) => {
    const nextBucket = getZoomBucket(zoom);
    setZoomBucket(prev => prev === nextBucket ? prev : nextBucket);
  }, []);

  const flush = useCallback(() => {
    const z = zoomRef.current, p = panRef.current;
    const transform = getWorldTransform({
      containerRect: getContainerRect(),
      pan: p,
      zoom: z,
      worldWidth: wW,
      worldHeight: wH,
    });
    if (gRef.current) gRef.current.style.transform = `translate(${transform.translateX}px,${transform.translateY}px) scale(${z})`;
    dirtyRef.current = false;
    if (minimapRenderRef.current) minimapRenderRef.current();
  }, [getContainerRect, wW, wH]);

  const sched = useCallback(() => {
    if (!dirtyRef.current) { dirtyRef.current = true; requestAnimationFrame(flush); }
  }, [flush]);

  useEffect(() => { flush(); }, [flush]);

  // Mouse handlers
  const onMD = useCallback(e => {
    pointerDownRef.current = true;
    isPanRef.current = false;
    psRef.current = { x: e.clientX, y: e.clientY, px: panRef.current.x, py: panRef.current.y };
  }, []);

  const onMM = useCallback(e => {
    if (!pointerDownRef.current) return;
    const dx = e.clientX - psRef.current.x;
    const dy = e.clientY - psRef.current.y;
    if (!isPanRef.current) {
      if ((dx * dx) + (dy * dy) < 36) return;
      isPanRef.current = true;
      if (svgRef.current) svgRef.current.style.cursor = "grabbing";
    }
    panRef.current = { x: psRef.current.px + e.clientX - psRef.current.x, y: psRef.current.py + e.clientY - psRef.current.y };
    sched();
  }, [sched]);

  const onMU = useCallback(() => {
    pointerDownRef.current = false;
    isPanRef.current = false;
    if (svgRef.current) svgRef.current.style.cursor = "grab";
  }, []);

  const onWh = useCallback(e => {
    e.preventDefault(); e.stopPropagation();
    const oldZ = zoomRef.current;
    let dy = e.deltaY;
    if (e.deltaMode === 1) dy *= 30;
    if (e.deltaMode === 2) dy *= 300;
    const scale = (e.ctrlKey || e.metaKey) ? .005 : .001;
    const newZ = Math.min(3, Math.max(.3, oldZ - dy * scale));
    if (newZ === oldZ) return;
    const rect = getContainerRect();
    const { worldX, worldY } = clientPointToWorldPoint({
      clientX: e.clientX,
      clientY: e.clientY,
      containerRect: rect,
      pan: panRef.current,
      zoom: oldZ,
      worldWidth: wW,
      worldHeight: wH,
    });
    panRef.current = getPanForWorldPointAtClientPoint({
      worldX,
      worldY,
      clientX: e.clientX,
      clientY: e.clientY,
      containerRect: rect,
      zoom: newZ,
      worldWidth: wW,
      worldHeight: wH,
    });
    zoomRef.current = newZ;
    syncZoomBucket(newZ);
    sched();
  }, [getContainerRect, sched, syncZoomBucket, wW, wH]);

  // Attach wheel listener as non-passive so preventDefault stops browser scroll/zoom
  useEffect(() => {
    const el = gameContainerRef.current || svgRef.current; if (!el) return;
    const h = e => {
      if (!el.contains(e.target)) return;
      e.preventDefault();
      onWh(e);
    };
    document.addEventListener("wheel", h, { passive: false, capture: true });
    const blockKeyZoom = e => { if ((e.ctrlKey || e.metaKey) && (e.key === "+" || e.key === "-" || e.key === "=" || e.key === "0")) e.preventDefault(); };
    document.addEventListener("keydown", blockKeyZoom);
    return () => {
      document.removeEventListener("wheel", h, { capture: true });
      document.removeEventListener("keydown", blockKeyZoom);
    };
  }, [onWh]);

  // Keep UI overlay sized to VISUAL viewport
  useEffect(() => {
    const vv = window.visualViewport; if (!vv) return;
    let pollTimer = null, rafId = 0, polling = false;
    const applyViewportScaleZoom = () => {
      const prevScale = viewportScaleRef.current || 1;
      const nextScale = vv.scale || 1;
      viewportScaleRef.current = nextScale;
      if (Math.abs(nextScale - prevScale) < 0.001) return;
      const oldZ = zoomRef.current;
      const factor = nextScale / prevScale;
      const newZ = Math.min(3, Math.max(.3, oldZ * factor));
      if (Math.abs(newZ - oldZ) < 0.0001) return;
      const rect = getContainerRect();
      const centerClientX = (rect?.left ?? 0) + (rect?.width ?? window.innerWidth) / 2;
      const centerClientY = (rect?.top ?? 0) + (rect?.height ?? window.innerHeight) / 2;
      const { worldX, worldY } = clientPointToWorldPoint({
        clientX: centerClientX,
        clientY: centerClientY,
        containerRect: rect,
        pan: panRef.current,
        zoom: oldZ,
        worldWidth: wW,
        worldHeight: wH,
      });
      panRef.current = getPanForWorldPointAtClientPoint({
        worldX,
        worldY,
        clientX: centerClientX,
        clientY: centerClientY,
        containerRect: rect,
        zoom: newZ,
        worldWidth: wW,
        worldHeight: wH,
      });
      zoomRef.current = newZ;
      syncZoomBucket(newZ);
      sched();
    };
    const sync = () => {
      applyViewportScaleZoom();
      const el = uiOverlayRef.current; if (!el) return;
      el.style.width = vv.width + "px"; el.style.height = vv.height + "px";
      el.style.left = vv.offsetLeft + "px"; el.style.top = vv.offsetTop + "px";
    };
    const pollLoop = () => { sync(); if (polling) rafId = requestAnimationFrame(pollLoop); };
    const startPoll = () => {
      if (!polling) { polling = true; pollLoop(); }
      clearTimeout(pollTimer); pollTimer = setTimeout(() => { polling = false; }, 500);
    };
    const onViewportChange = () => {
      applyViewportScaleZoom();
      sync();
    };
    vv.addEventListener("resize", onViewportChange); vv.addEventListener("scroll", onViewportChange);
    document.addEventListener("wheel", startPoll, { capture: true, passive: true });
    sync();
    return () => {
      polling = false; cancelAnimationFrame(rafId); clearTimeout(pollTimer);
      vv.removeEventListener("resize", onViewportChange); vv.removeEventListener("scroll", onViewportChange);
      document.removeEventListener("wheel", startPoll, { capture: true });
    };
  }, [getContainerRect, sched, syncZoomBucket, wH, wW]);

  return {
    panRef, zoomRef, isPanRef, gRef, svgRef, gameContainerRef, uiOverlayRef, minimapRenderRef,
    flush, sched, onMD, onMM, onMU, onWh, zoomBucket,
  };
}

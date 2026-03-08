import { useRef, useState, useCallback } from "react";

export function usePanelDrag() {
  const techPosRef = useRef({ x: null, y: 95 });
  const cityPosRef = useRef({ x: null, y: 95 });
  const draggingPanelRef = useRef(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const [, forceRender] = useState(0);

  const onPanelDown = useCallback((e, panel) => {
    if (e.target.closest("button")) return;
    e.stopPropagation();
    e.preventDefault();
    draggingPanelRef.current = panel;
    const el = e.currentTarget.closest("[data-panel]");
    if (!el) return;
    const r = el.getBoundingClientRect();
    dragOffsetRef.current = { x: e.clientX - r.left, y: e.clientY - r.top };
  }, []);

  const onPanelMove = useCallback(e => {
    if (!draggingPanelRef.current) return;
    const ref = draggingPanelRef.current === "tech" ? techPosRef : cityPosRef;
    ref.current = {
      x: Math.max(0, e.clientX - dragOffsetRef.current.x),
      y: Math.max(0, e.clientY - dragOffsetRef.current.y),
    };
    forceRender(c => c + 1);
  }, []);

  const onPanelUp = useCallback(() => {
    draggingPanelRef.current = null;
  }, []);

  return { techPosRef, cityPosRef, onPanelDown, onPanelMove, onPanelUp, forceRender };
}

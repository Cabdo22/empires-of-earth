import { useState, useRef, useCallback, useEffect } from 'react';

const MAX_TOTAL_MS = 600;
const MIN_SEGMENT_MS = 100;
const DEFAULT_SEGMENT_MS = 200;

function easeInOutQuad(t) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

export default function useUnitAnimation() {
  const [animatingUnitId, setAnimatingUnitId] = useState(null);
  const [animVisuals, setAnimVisuals] = useState(null);
  const overlayRef = useRef(null);
  const animState = useRef(null);
  const rafId = useRef(null);

  const tick = useCallback((now) => {
    const st = animState.current;
    if (!st || !overlayRef.current) return;

    const elapsed = now - st.segmentStartTime;
    const t = Math.min(1, elapsed / st.segmentMs);
    const eased = easeInOutQuad(t);

    const from = st.waypoints[st.segmentIndex];
    const to = st.waypoints[st.segmentIndex + 1];
    const x = from.x + (to.x - from.x) * eased;
    const y = from.y + (to.y - from.y) * eased;

    overlayRef.current.setAttribute('transform', `translate(${x},${y})`);

    if (t >= 1) {
      st.segmentIndex++;
      if (st.segmentIndex >= st.waypoints.length - 1) {
        // Animation complete
        animState.current = null;
        setAnimatingUnitId(null);
        setAnimVisuals(null);
        if (st.onComplete) st.onComplete();
        return;
      }
      st.segmentStartTime = now;
    }
    rafId.current = requestAnimationFrame(tick);
  }, []);

  const startAnimation = useCallback((unitId, visuals, waypoints, onComplete) => {
    if (waypoints.length < 2) {
      onComplete?.();
      return;
    }

    const hops = waypoints.length - 1;
    const segmentMs = Math.max(MIN_SEGMENT_MS, Math.min(DEFAULT_SEGMENT_MS, MAX_TOTAL_MS / hops));

    setAnimatingUnitId(unitId);
    setAnimVisuals(visuals);

    animState.current = {
      waypoints,
      segmentIndex: 0,
      segmentMs,
      segmentStartTime: performance.now(),
      onComplete,
    };

    rafId.current = requestAnimationFrame(tick);
  }, [tick]);

  useEffect(() => {
    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, []);

  return { startAnimation, animatingUnitId, animVisuals, overlayRef };
}

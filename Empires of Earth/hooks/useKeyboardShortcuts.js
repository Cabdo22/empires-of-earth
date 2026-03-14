import { useEffect } from "react";
import { UNIT_DEFS } from '../data/units.js';

export function useKeyboardShortcuts({ sched, phase, cp, selU, setSelU, setSelH, setSettlerM, setNukeM, setPreview, panRef, endTurn, aiThinking, setShowTech, setShowCity }) {
  useEffect(() => {
    const h = e => {
      let m = false;
      if (e.key === "ArrowUp") { e.preventDefault(); panRef.current.y += 60; m = true; }
      if (e.key === "ArrowDown") { e.preventDefault(); panRef.current.y -= 60; m = true; }
      if (e.key === "ArrowLeft") { e.preventDefault(); panRef.current.x += 60; m = true; }
      if (e.key === "ArrowRight") { e.preventDefault(); panRef.current.x -= 60; m = true; }
      if (e.key === "Tab" && phase === "MOVEMENT") {
        e.preventDefault();
        const acts = cp.units.filter(u => u.movementCurrent > 0 || (!u.hasAttacked && (UNIT_DEFS[u.unitType]?.range || 0) > 0));
        if (acts.length > 0) {
          const ci = selU ? acts.findIndex(u => u.id === selU) : -1;
          setSelU(acts[(ci + 1) % acts.length].id);
          setSelH(null);
        }
        m = true;
      }
      if (e.key === "Escape") { setSelU(null); setSettlerM(null); setNukeM(null); setPreview(null); m = true; }
      if (e.key === "Enter" && phase === "MOVEMENT" && !aiThinking) { e.preventDefault(); endTurn(); m = true; }
      if ((e.key === "t" || e.key === "T") && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); setShowTech(prev => !prev); m = true; }
      if (e.ctrlKey && e.key >= "1" && e.key <= "9") { e.preventDefault(); const idx = parseInt(e.key) - 1; if (cp.cities && cp.cities[idx]) { setShowCity(cp.cities[idx].id); m = true; } }
      if (m) sched();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [sched, phase, cp, selU, setSelU, setSelH, setSettlerM, setNukeM, setPreview, panRef, endTurn, aiThinking]);
}

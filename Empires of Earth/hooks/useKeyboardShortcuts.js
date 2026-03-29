import { useEffect } from "react";
import { UNIT_DEFS } from '../data/units.js';
import { hexCenter } from '../data/constants.js';

export function useKeyboardShortcuts({ sched, phase, cp, selU, setSelU, setSelH, setSettlerM, setNukeM, setPreview, panRef, endTurn, aiThinking, setShowTech, setShowCity, turnTransition, setTurnTransition, upgradeUnit, buildRoad, sud, setShowSaveLoad, setTutorialOn, setTutorialDismissed, zoomRef, wW, wH, setMinimapVisible, hexes }) {
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
      if (e.key === "Enter") { e.preventDefault(); if (turnTransition) { setTurnTransition(null); m = true; } else if (phase === "MOVEMENT" && !aiThinking) { endTurn(); m = true; } }
      if ((e.key === "t" || e.key === "T") && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); setShowTech(prev => !prev); m = true; }
      if (e.ctrlKey && e.key >= "1" && e.key <= "9") { e.preventDefault(); const idx = parseInt(e.key) - 1; if (cp.cities && cp.cities[idx]) { setShowCity(cp.cities[idx].id); m = true; } }
      // Space = skip current unit, cycle to next actable unit
      if (e.key === " " && phase === "MOVEMENT" && selU) {
        e.preventDefault();
        const acts = cp.units.filter(u => u.id !== selU && (u.movementCurrent > 0 || (!u.hasAttacked && (UNIT_DEFS[u.unitType]?.range || 0) > 0)));
        if (acts.length > 0) { setSelU(acts[0].id); setSelH(null); }
        else { setSelU(null); }
        m = true;
      }
      // F = found city (settler mode toggle)
      if ((e.key === "f" || e.key === "F") && !e.ctrlKey && !e.metaKey && selU && sud?.unitType === "settler") {
        e.preventDefault(); setSettlerM(prev => prev ? null : selU); m = true;
      }
      // C = center camera on selected unit
      if ((e.key === "c" || e.key === "C") && !e.ctrlKey && !e.metaKey && selU && sud) {
        e.preventDefault();
        const pos = hexCenter(sud.hexCol, sud.hexRow);
        const z = zoomRef.current;
        panRef.current = { x: (wW * z) / 2 - pos.x * z, y: (wH * z) / 2 - pos.y * z };
        m = true;
      }
      // N = launch nuke toggle
      if ((e.key === "n" || e.key === "N") && !e.ctrlKey && !e.metaKey && selU && (sud?.unitType === "nuke" || sud?.unitType === "icbm")) {
        e.preventDefault(); setNukeM(prev => prev ? null : selU); m = true;
      }
      // U = upgrade selected unit
      if ((e.key === "u" || e.key === "U") && !e.ctrlKey && !e.metaKey && selU) {
        e.preventDefault(); upgradeUnit(selU); m = true;
      }
      // R = build road on selected unit's hex
      if ((e.key === "r" || e.key === "R") && !e.ctrlKey && !e.metaKey && selU && sud) {
        e.preventDefault();
        const hex = hexes.find(hx => hx.col === sud.hexCol && hx.row === sud.hexRow);
        if (hex) { buildRoad(hex.id); m = true; }
      }
      // H = toggle tutorial tips
      if ((e.key === "h" || e.key === "H") && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setTutorialOn(prev => { if (!prev) setTutorialDismissed({}); return !prev; });
        m = true;
      }
      // Ctrl+S or Ctrl+L = toggle save/load panel
      if (e.ctrlKey && (e.key === "s" || e.key === "S" || e.key === "l" || e.key === "L")) {
        e.preventDefault(); setShowSaveLoad(prev => !prev); m = true;
      }
      // M = toggle minimap visibility
      if ((e.key === "m" || e.key === "M") && !e.ctrlKey && !e.metaKey) {
        e.preventDefault(); setMinimapVisible(prev => !prev); m = true;
      }
      if (m) sched();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [sched, phase, cp, selU, setSelU, setSelH, setSettlerM, setNukeM, setPreview, panRef, endTurn, aiThinking, turnTransition, sud, upgradeUnit, buildRoad, zoomRef, wW, wH, hexes]);
}

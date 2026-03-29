// ============================================================
// RENDER HEX (memoized component — only re-renders when its own props change)
// ============================================================

import React, { memo } from "react";
import { HEX_POINTS, HEX_SIZE } from '../data/constants.js';
import { UNIT_DEFS } from '../data/units.js';
import { DISTRICT_DEFS } from '../data/districts.js';
import { ResourceIcon, UnitIcon } from './Icons.jsx';

const MemoHex = memo(function MemoHex({
  hex, vis, isHovered, isSelected, inMoveRange, inAttackRange, inNukeRange,
  units, unitCount, city, player, unitSelected, settlerMode, settlerBlocked, canAct, flash,
  isFogged, isExplored, blockReason, discoveredResources
}) {
  const t = hex.terrainType;

  // Unexplored: fluffy clouds
  if (isFogged && !isExplored) {
    const s = hex.id * 137 + 29;
    const r = (i) => ((s * (i + 1) * 9301 + 49297) % 233280) / 233280;
    return (
      <g data-hex={hex.id} data-col={hex.col} data-row={hex.row} transform={`translate(${hex.x},${hex.y})`}>
        <polygon points={HEX_POINTS} fill="#b8c8d8" stroke="rgba(200,210,220,.3)" strokeWidth="1"/>
        <g clipPath="url(#hexClip)" className="fog-cloud">
          <ellipse cx={r(0)*20-10} cy={r(1)*16-8} rx={28+r(2)*10} ry={18+r(3)*8} fill="#e8eef4" opacity=".85"/>
          <ellipse cx={r(4)*16-8} cy={r(5)*12-6} rx={22+r(6)*8} ry={14+r(7)*6} fill="#f4f8fc" opacity=".7"/>
          <ellipse cx={r(8)*10-5} cy={r(9)*10-5} rx={16+r(10)*6} ry={10+r(11)*4} fill="#fff" opacity=".6"/>
        </g>
        <polygon points={HEX_POINTS} fill="none" stroke="rgba(180,195,210,.4)" strokeWidth="1"/>
      </g>
    );
  }

  // Explored but not currently visible: dimmed terrain, no units/cities
  if (isFogged) return (
    <g data-hex={hex.id} data-col={hex.col} data-row={hex.row} transform={`translate(${hex.x},${hex.y})`}>
      {t === "grassland" && <polygon points={HEX_POINTS} fill="#2a4a1a"/>}
      {t === "forest" && <polygon points={HEX_POINTS} fill="#1a3012"/>}
      {t === "mountain" && <polygon points={HEX_POINTS} fill="#2a2a26"/>}
      {t === "water" && <polygon points={HEX_POINTS} fill="#1a3050"/>}
      <polygon points={HEX_POINTS} fill="rgba(0,0,0,.25)" stroke="rgba(30,40,20,.4)" strokeWidth="1"/>
      {hex.resource && discoveredResources?.has(hex.resource) && <g opacity=".3" style={{pointerEvents:"none"}}><ResourceIcon type={hex.resource} x={0} y={2} s={12}/></g>}
    </g>
  );

  return (
    <g data-hex={hex.id} data-col={hex.col} data-row={hex.row} transform={`translate(${hex.x},${hex.y})`}
       style={{cursor: settlerMode && t !== "water" && t !== "mountain" ? "crosshair" : blockReason ? "not-allowed" : "pointer"}}>

      {/* Terrain rendering */}
      {t === "grassland" && <>
        <polygon points={HEX_POINTS} fill="url(#gradGrass)"/>
        <polygon points={HEX_POINTS} fill="url(#varGrass)" opacity={.2 + (hex.id % 5) * .04}/>
        <path d={vis.detail} stroke="#3a5818" strokeWidth="1.5" fill="none" opacity=".25"/>
        <path d={vis.blades} stroke="#5a9830" strokeWidth="1" fill="none" opacity=".55"/>
        <path d={vis.blades} stroke="#78c040" strokeWidth=".5" fill="none" opacity=".3" transform="translate(0.5,-0.5)"/>
        <path d={vis.flowers} fill={hex.id % 3 === 0 ? "#e8d040" : hex.id % 3 === 1 ? "#e07060" : "#d080c0"} stroke="none" opacity=".6"/>
        <path d={vis.rocks} fill="#8a8a78" stroke="#6a6a5a" strokeWidth=".4" opacity=".35"/>
        {vis.coast && <g clipPath="url(#hexClip)">
          <path d={vis.coast[0]} stroke="#6ab8e0" strokeWidth="2.5" fill="none" opacity=".4" className="coast-wash1"/>
          <path d={vis.coast[1]} stroke="#88ccee" strokeWidth="2" fill="none" opacity=".35" className="coast-wash2"/>
          <path d={vis.coast[2]} stroke="#a0d8f4" strokeWidth="1.5" fill="none" opacity=".3" className="coast-wash3"/>
        </g>}
        <polygon points={HEX_POINTS} fill="none" stroke="#1a2e0a" strokeWidth="1" opacity=".5"/>
      </>}

      {t === "forest" && <>
        <polygon points={HEX_POINTS} fill="url(#gradForest)"/>
        <path d={vis.detail} stroke="#1a3a10" strokeWidth="1.5" fill="none" opacity=".2"/>
        <path d={vis.trees.undergrowth} stroke="#3a7a30" strokeWidth="1.5" fill="none" opacity=".4"/>
        <path d={vis.trees.trunks} stroke="#5a3a1a" strokeWidth="2" fill="none" opacity=".7"/>
        <path d={vis.trees.trunks} stroke="#3a2810" strokeWidth="1" fill="none" opacity=".3" transform="translate(1,0)"/>
        <path d={vis.trees.canopy} fill="#2a6a30" stroke="#1a5020" strokeWidth=".6" opacity=".8"/>
        <path d={vis.trees.canopy} fill="#3a8a3a" stroke="none" opacity=".25" transform="translate(-1,-1)"/>
        {vis.coast && <g clipPath="url(#hexClip)">
          <path d={vis.coast[0]} stroke="#6ab8e0" strokeWidth="2.5" fill="none" opacity=".4" className="coast-wash1"/>
          <path d={vis.coast[1]} stroke="#88ccee" strokeWidth="2" fill="none" opacity=".35" className="coast-wash2"/>
          <path d={vis.coast[2]} stroke="#a0d8f4" strokeWidth="1.5" fill="none" opacity=".3" className="coast-wash3"/>
        </g>}
        <polygon points={HEX_POINTS} fill="none" stroke="#0e2a08" strokeWidth="1.2" opacity=".6"/>
      </>}

      {t === "mountain" && <>
        <polygon points={HEX_POINTS} fill="url(#gradMountain)"/>
        <path d={vis.mtns.rocks} fill="#5a5548" stroke="#4a4538" strokeWidth=".5" opacity=".4"/>
        <path d={vis.mtns.peaks} fill="#6a6a6a" stroke="#4a4a4a" strokeWidth=".8" opacity=".85"/>
        <path d={vis.mtns.shadow} fill="#3a3530" stroke="none" opacity=".3"/>
        <path d={vis.mtns.snow} fill="#eaeaea" stroke="#d0d0d0" strokeWidth=".4" opacity=".92"/>
        <path d={vis.mtns.snow} fill="#fff" stroke="none" opacity=".3" transform="translate(-0.5,-0.5)"/>
        {vis.coast && <g clipPath="url(#hexClip)">
          <path d={vis.coast[0]} stroke="#6ab8e0" strokeWidth="2.5" fill="none" opacity=".4" className="coast-wash1"/>
          <path d={vis.coast[1]} stroke="#88ccee" strokeWidth="2" fill="none" opacity=".35" className="coast-wash2"/>
          <path d={vis.coast[2]} stroke="#a0d8f4" strokeWidth="1.5" fill="none" opacity=".3" className="coast-wash3"/>
        </g>}
        <polygon points={HEX_POINTS} fill="none" stroke="#2a2a2a" strokeWidth="1.2" opacity=".55"/>
      </>}

      {t === "water" && <>
        <polygon points={HEX_POINTS} fill="url(#gradWater)"/>
        <g clipPath="url(#hexClip)">
          <path d={vis.waves.waves} stroke="#5aa8d0" strokeWidth="1.2" fill="none" opacity=".45" className="wave-layer1"/>
          <path d={vis.waves.waves} stroke="#7ac0e8" strokeWidth=".7" fill="none" opacity=".35" className="wave-layer2"/>
          <path d={vis.waves.waves} stroke="#90d0f0" strokeWidth=".4" fill="none" opacity=".25" className="wave-layer3"/>
          <path d={vis.waves.foam} stroke="#c8e8f8" strokeWidth="1.5" fill="none" className="wave-foam"/>
          <path d={vis.waves.shimmer} stroke="#e0f4ff" strokeWidth=".8" fill="none" className="wave-shimmer"/>
          {vis.waterCoast && <path d={vis.waterCoast[0]} stroke="#6ab8e0" strokeWidth="2" fill="none" opacity=".3" className="coast-wash1"/>}
          {vis.waterCoast && <path d={vis.waterCoast[1]} stroke="#88ccee" strokeWidth="1.2" fill="none" opacity=".25" className="coast-wash2"/>}
        </g>
        <polygon points={HEX_POINTS} fill="none" stroke="#1a4a6a" strokeWidth="1.2" opacity=".5"/>
      </>}

      {/* Territory tint */}
      {hex.ownerPlayerId && player && <polygon points={HEX_POINTS} fill={player.color} opacity=".12"/>}

      {hex.resource && discoveredResources?.has(hex.resource) && !city && <g style={{pointerEvents:"none"}}><ResourceIcon type={hex.resource} x={0} y={0} s={16}/></g>}

      {/* Road indicator */}
      {hex.road && !city && <circle cx={0} cy={0} r={5} fill="#a08060" stroke="#705030" strokeWidth="1" opacity=".5" style={{pointerEvents:"none"}}/>}

      {/* City */}
      {city && <>
        <polygon points={HEX_POINTS} fill={player.color} opacity=".15"/>
        <polygon points={HEX_POINTS} fill="none" stroke={player.color} strokeWidth="1.5" opacity=".6"/>
        <g transform="translate(0,-6) scale(1.4)">
          <ellipse cx={0} cy={8} rx={20} ry={4} fill="#8a7050" opacity=".35"/>
          <rect x={-20} y={-6} width={13} height={12} fill="#c4a070" stroke="#7a5c3a" strokeWidth=".6" rx=".5"/><rect x={-20} y={-6} width={13} height={2.5} fill="#a88050" stroke="#7a5c3a" strokeWidth=".4"/>
          <rect x={-15.5} y={1} width={4} height={5} rx="1.8" fill="#2a1808"/>
          <line x1={-17} y1={-6} x2={-17} y2={-15} stroke="#9a7a4a" strokeWidth=".9"/><line x1={-15} y1={-6} x2={-15} y2={-15} stroke="#9a7a4a" strokeWidth=".9"/>
          {[-8,-10,-12,-14].map(yy => <line key={yy} x1={-17.2} y1={yy} x2={-14.8} y2={yy} stroke="#9a7a4a" strokeWidth=".7"/>)}
          <rect x={-5} y={-10} width={15} height={16} fill="#d4b080" stroke="#7a5c3a" strokeWidth=".7" rx=".5"/><rect x={-5} y={-10} width={15} height={3} fill="#b89060" stroke="#7a5c3a" strokeWidth=".4"/>
          <rect x={0} y={0} width={5} height={7} rx="2.2" fill="#1a0c04"/>
          <line x1={6} y1={-10} x2={6} y2={-19} stroke="#9a7a4a" strokeWidth=".9"/><line x1={8} y1={-10} x2={8} y2={-19} stroke="#9a7a4a" strokeWidth=".9"/>
          {[-12,-14,-16,-18].map(yy => <line key={yy} x1={5.8} y1={yy} x2={8.2} y2={yy} stroke="#9a7a4a" strokeWidth=".7"/>)}
          <rect x={12} y={-3} width={10} height={10} fill="#c4a070" stroke="#7a5c3a" strokeWidth=".6" rx=".5"/><rect x={12} y={-3} width={10} height={2.2} fill="#a88050" stroke="#7a5c3a" strokeWidth=".4"/>
          <rect x={15} y={2} width={3.5} height={5} rx="1.3" fill="#2a1808"/>
        </g>
        {/* City banner, HP bar, and production label rendered in overlay layer (HexStrategyGame.jsx) */}
      </>}

      {/* Units (not in city) */}
      {unitCount > 0 && !city && <g transform="translate(0,-6)" style={{pointerEvents:"none"}} className={canAct && !unitSelected ? "unit-bob" : undefined}>
        {canAct && !unitSelected && <circle cx={0} cy={0} r={22} fill="none" stroke={units[0].pCol} strokeWidth="2" className="unit-glow"/>}
        <circle cx={0} cy={0} r={18} fill={units[0].pBg} stroke={unitSelected ? "#60d0ff" : canAct ? "#a0e060" : units[0].pCol} strokeWidth={unitSelected ? "2.5" : canAct ? "2" : "1.5"} strokeDasharray={canAct && !unitSelected ? "4 2" : "none"}/>
        <UnitIcon unitType={units[0].unitType} x={0} y={0} fg={units[0].pLight || "#fff"} sz={15}/>
        {unitSelected && <circle cx={0} cy={0} r={20} fill="none" stroke="#60d0ff" strokeWidth="1.5" opacity=".5"/>}
        {unitCount > 1 && <text x={14} y={-14} textAnchor="middle" fill="#ffd740" fontSize={8} fontWeight="bold" style={{pointerEvents:"none"}}>+{unitCount - 1}</text>}
        <g transform="translate(0,20)">
          <rect x={-14} y={0} width={28} height={4} rx={1.5} fill="#222" opacity=".8" stroke="#555" strokeWidth=".5"/>
          <rect x={-14} y={0} width={28 * (units[0].hpCurrent / (UNIT_DEFS[units[0].unitType]?.hp || 10))} height={4} rx={1.5} fill={units[0].hpCurrent > (UNIT_DEFS[units[0].unitType]?.hp || 10) * .5 ? "#4a4" : "#c44"} opacity=".9"/>
        </g>
      </g>}

      {/* Units garrisoned in city */}
      {unitCount > 0 && city && <g transform="translate(0,-6)" style={{pointerEvents:"none"}} className={canAct && !unitSelected ? "unit-bob" : undefined}>
        {canAct && !unitSelected && <circle cx={0} cy={0} r={22} fill="none" stroke={units[0].pCol} strokeWidth="2" className="unit-glow"/>}
        <circle cx={0} cy={0} r={18} fill={units[0].pBg} stroke={unitSelected ? "#60d0ff" : canAct ? "#a0e060" : units[0].pCol} strokeWidth={unitSelected ? "2.5" : canAct ? "2" : "1.5"} strokeDasharray={canAct && !unitSelected ? "4 2" : "none"}/>
        <UnitIcon unitType={units[0].unitType} x={0} y={0} fg={units[0].pLight || "#fff"} sz={15}/>
        {unitSelected && <circle cx={0} cy={0} r={20} fill="none" stroke="#60d0ff" strokeWidth="1.5" opacity=".5"/>}
        {unitCount > 1 && <text x={14} y={-14} textAnchor="middle" fill="#ffd740" fontSize={8} fontWeight="bold" style={{pointerEvents:"none"}}>+{unitCount - 1}</text>}
        <g transform="translate(0,20)">
          <rect x={-14} y={0} width={28} height={4} rx={1.5} fill="#222" opacity=".8" stroke="#555" strokeWidth=".5"/>
          <rect x={-14} y={0} width={28 * (units[0].hpCurrent / (UNIT_DEFS[units[0].unitType]?.hp || 10))} height={4} rx={1.5} fill={units[0].hpCurrent > (UNIT_DEFS[units[0].unitType]?.hp || 10) * .5 ? "#4a4" : "#c44"} opacity=".9"/>
        </g>
      </g>}

      {/* Overlays */}
      {inMoveRange && <polygon points={HEX_POINTS} fill="rgba(96,208,255,.1)" stroke="#60d0ff" strokeWidth="2" opacity=".7"/>}
      {inAttackRange && <polygon points={HEX_POINTS} fill="rgba(255,60,60,.12)" stroke="#ff4040" strokeWidth="2" opacity=".7"/>}
      {inNukeRange && <polygon points={HEX_POINTS} fill="rgba(255,200,0,.15)" stroke="#ffa000" strokeWidth="2.5" opacity=".8" strokeDasharray="4 2"/>}
      {settlerMode && t !== "water" && t !== "mountain" && !city && !settlerBlocked && <polygon points={HEX_POINTS} fill="rgba(80,255,80,.12)" stroke="#40e040" strokeWidth="2" opacity=".6"/>}
      {settlerMode && t !== "water" && t !== "mountain" && !city && settlerBlocked && <polygon points={HEX_POINTS} fill="rgba(255,60,60,.08)" stroke="#ff4040" strokeWidth="1.5" opacity=".4"/>}
      {isHovered && !isSelected && <polygon points={HEX_POINTS} fill="rgba(255,255,200,.12)" stroke="#e8d860" strokeWidth="2" strokeLinejoin="round"/>}
      {isSelected && <polygon points={HEX_POINTS} fill="rgba(255,255,200,.08)" stroke="#f0e068" strokeWidth="2.5" strokeDasharray="6 3" strokeLinejoin="round"/>}
      {flash && <polygon points={HEX_POINTS} fill={flash === "nuke" ? "rgba(255,200,0,.5)" : flash === "blocked" ? "rgba(255,160,40,.25)" : "rgba(255,80,80,.35)"} stroke={flash === "nuke" ? "#ff8000" : flash === "blocked" ? "#ffa030" : "#ff2020"} strokeWidth={flash === "blocked" ? 2 : 3}>
        <animate attributeName="opacity" from="1" to="0" dur={flash === "blocked" ? "0.6s" : "0.8s"} fill="freeze"/>
      </polygon>}
    </g>
  );
}, (a, b) =>
  a.isHovered === b.isHovered && a.isSelected === b.isSelected &&
  a.inMoveRange === b.inMoveRange && a.inAttackRange === b.inAttackRange &&
  a.inNukeRange === b.inNukeRange && a.unitSelected === b.unitSelected &&
  a.settlerMode === b.settlerMode && a.settlerBlocked === b.settlerBlocked && a.canAct === b.canAct &&
  a.flash === b.flash && a.isFogged === b.isFogged &&
  a.isExplored === b.isExplored && a.blockReason === b.blockReason &&
  a.unitCount === b.unitCount && a.units === b.units &&
  a.city === b.city && a.player === b.player && a.hex === b.hex &&
  a.discoveredResources === b.discoveredResources
);

export default MemoHex;

// ============================================================
// RENDER TILE (memoized component — isometric 3D perspective)
// ============================================================

import React, { memo } from "react";
import { HEX_POINTS, ISO_HW, ISO_HH, TERRAIN_ELEV } from '../data/constants.js';
import { UNIT_DEFS } from '../data/units.js';
import { DISTRICT_DEFS } from '../data/districts.js';
import { ResourceIcon, UnitIcon } from './Icons.jsx';

// ---- 3D Isometric helpers ----

// Isometric box: draws a 3D box at (x, y) with half-widths (hw, hd) and height h
// Returns left face, right face, and top face polygons
const IsoBox = ({ x, y, hw, hd, h, fillTop, fillLeft, fillRight, stroke }) => {
  // hw = half-width (x-axis), hd = half-depth (y-axis on diamond), h = height
  const top = `${x},${y-h-hd} ${x+hw},${y-h} ${x},${y-h+hd} ${x-hw},${y-h}`;
  const left = `${x-hw},${y-h} ${x},${y-h+hd} ${x},${y+hd} ${x-hw},${y}`;
  const right = `${x+hw},${y-h} ${x},${y-h+hd} ${x},${y+hd} ${x+hw},${y}`;
  const s = stroke || "none";
  return <>
    <polygon points={left} fill={fillLeft} stroke={s} strokeWidth="0.4"/>
    <polygon points={right} fill={fillRight} stroke={s} strokeWidth="0.4"/>
    <polygon points={top} fill={fillTop} stroke={s} strokeWidth="0.4"/>
  </>;
};

// Isometric tree: trunk (box) + canopy (cone/pyramid)
const IsoTree = ({ x, y, trunkH, canopyH, canopyW, trunkW }) => {
  const tw = trunkW || 2, td = trunkW || 2;
  // Trunk
  const tTop = `${x},${y-trunkH-td} ${x+tw},${y-trunkH} ${x},${y-trunkH+td} ${x-tw},${y-trunkH}`;
  const tLeft = `${x-tw},${y-trunkH} ${x},${y-trunkH+td} ${x},${y+td} ${x-tw},${y}`;
  const tRight = `${x+tw},${y-trunkH} ${x},${y-trunkH+td} ${x},${y+td} ${x+tw},${y}`;
  // Canopy (pyramid) - base at top of trunk, peak at canopyH above
  const cw = canopyW || 6, cd = canopyW * 0.5 || 3;
  const cBase = y - trunkH;
  const peak = cBase - canopyH;
  const cLeft = `${x-cw},${cBase} ${x},${cBase+cd} ${x},${peak}`;
  const cRight = `${x+cw},${cBase} ${x},${cBase+cd} ${x},${peak}`;
  const cBack = `${x-cw},${cBase} ${x},${cBase-cd} ${x},${peak}`;
  const cBackR = `${x+cw},${cBase} ${x},${cBase-cd} ${x},${peak}`;
  return <>
    <polygon points={tLeft} fill="#5a3a1a" stroke="#4a2a10" strokeWidth="0.3"/>
    <polygon points={tRight} fill="#6a4a2a" stroke="#4a2a10" strokeWidth="0.3"/>
    <polygon points={tTop} fill="#7a5a3a" stroke="none"/>
    <polygon points={cBack} fill="#2a7a28" stroke="#1a6018" strokeWidth="0.3"/>
    <polygon points={cBackR} fill="#3a8a30" stroke="#1a6018" strokeWidth="0.3"/>
    <polygon points={cLeft} fill="#2a8830" stroke="#1a6018" strokeWidth="0.3"/>
    <polygon points={cRight} fill="#48a840" stroke="#2a7828" strokeWidth="0.3"/>
  </>;
};

// Seeded pseudo-random positions for trees within a tile (deterministic per hex id)
const getTreePositions = (id) => {
  const positions = [];
  const seed = id * 137 + 29;
  const count = 4 + (seed % 3); // 4-6 trees
  for (let i = 0; i < count; i++) {
    const v = (seed + i * 73 + i * i * 17) % 10000;
    const px = -20 + ((v * 11) % 40);
    const py = -6 + ((v * 7) % 12);
    const h = 10 + ((v * 3) % 8);
    const cw = 5 + ((v * 5) % 4);
    const tw = 1.5 + ((v * 2) % 2) * 0.5;
    positions.push({ x: px, y: py, trunkH: 4 + (v % 3), canopyH: h, canopyW: cw, trunkW: tw });
  }
  // Sort back-to-front (lower y = further back = draw first)
  positions.sort((a, b) => a.y - b.y);
  return positions;
};

// Seeded building positions for cities
const getCityBuildings = (id, pop) => {
  const buildings = [];
  const seed = id * 193 + 47;
  const count = Math.min(2 + Math.floor(pop / 2), 6);
  // Original tall buildings
  for (let i = 0; i < count; i++) {
    const v = (seed + i * 83 + i * i * 19) % 10000;
    const px = -18 + ((v * 11) % 36);
    const py = -4 + ((v * 7) % 10);
    const h = 8 + ((v * 3) % 10);
    const hw = 4 + ((v * 5) % 4);
    const hd = 2 + ((v * 2) % 2);
    buildings.push({ x: px, y: py, h, hw, hd });
  }
  // 3 extra shorter, wider buildings
  for (let i = 0; i < 3; i++) {
    const v = (seed + (count + i) * 127 + i * 31) % 10000;
    const px = -22 + ((v * 13) % 44);
    const py = -5 + ((v * 9) % 12);
    const h = 4 + ((v * 3) % 4);       // shorter
    const hw = 6 + ((v * 5) % 4);      // wider
    const hd = 3 + ((v * 2) % 2);      // wider depth
    buildings.push({ x: px, y: py, h, hw, hd });
  }
  buildings.sort((a, b) => a.y - b.y);
  return buildings;
};

const MemoHex = memo(function MemoHex({
  hex, vis, isHovered, isSelected, inMoveRange, inAttackRange, inNukeRange,
  units, unitCount, city, player, unitSelected, settlerMode, canAct, flash,
  isFogged, isExplored, blockReason
}) {
  const t = hex.terrainType;
  const elev = TERRAIN_ELEV[t] || 0;

  // Side wall polygon points for elevated/depressed terrain
  const leftWall = `${-ISO_HW},${elev} 0,${ISO_HH+elev} 0,${ISO_HH} ${-ISO_HW},0`;
  const rightWall = `${ISO_HW},${elev} 0,${ISO_HH+elev} 0,${ISO_HH} ${ISO_HW},0`;

  // Unexplored: completely black
  if (isFogged && !isExplored) return (
    <g data-hex={hex.id} data-col={hex.col} data-row={hex.row} transform={`translate(${hex.x},${hex.y})`}>
      <polygon points={HEX_POINTS} fill="#080a06" stroke="rgba(20,30,10,.2)" strokeWidth="0.5"/>
    </g>
  );

  // Explored but not currently visible: dimmed terrain
  if (isFogged) return (
    <g data-hex={hex.id} data-col={hex.col} data-row={hex.row} transform={`translate(${hex.x},${hex.y})`}>
      {elev < 0 && <>
        <polygon points={leftWall} fill="#1a1a18" opacity=".6"/>
        <polygon points={rightWall} fill="#252523" opacity=".6"/>
      </>}
      <g transform={`translate(0,${elev})`}>
        {t === "grassland" && <polygon points={HEX_POINTS} fill="#1a2a10"/>}
        {t === "forest" && <polygon points={HEX_POINTS} fill="#0e1a08"/>}
        {t === "mountain" && <polygon points={HEX_POINTS} fill="#2a2a28"/>}
        {t === "water" && <polygon points={HEX_POINTS} fill="#0a1a2a"/>}
        <polygon points={HEX_POINTS} fill="rgba(0,0,0,.45)" stroke="rgba(30,40,20,.3)" strokeWidth="0.5"/>
        {hex.resource && <g opacity=".3" style={{pointerEvents:"none"}}><ResourceIcon type={hex.resource} x={0} y={2} s={10}/></g>}
      </g>
    </g>
  );

  return (
    <g data-hex={hex.id} data-col={hex.col} data-row={hex.row} transform={`translate(${hex.x},${hex.y})`}
       style={{cursor: settlerMode && t !== "water" && t !== "mountain" ? "crosshair" : blockReason ? "not-allowed" : "pointer"}}>

      {/* Side walls for elevated terrain (mountains) */}
      {elev < 0 && <>
        <polygon points={leftWall} fill="#5a5548" stroke="#4a4538" strokeWidth="0.5"/>
        <polygon points={rightWall} fill="#6a6558" stroke="#4a4538" strokeWidth="0.5"/>
      </>}

      {/* Side walls for depressed terrain (water) */}
      {elev > 0 && <>
        <polygon points={`${-ISO_HW},0 0,${ISO_HH} 0,${ISO_HH+elev} ${-ISO_HW},${elev}`} fill="#1a4060" stroke="none"/>
        <polygon points={`${ISO_HW},0 0,${ISO_HH} 0,${ISO_HH+elev} ${ISO_HW},${elev}`} fill="#1a5070" stroke="none"/>
      </>}

      {/* Top face and all content at elevation */}
      <g transform={`translate(0,${elev})`}>

        {/* === GRASSLAND — flat diamond with subtle detail === */}
        {t === "grassland" && <>
          <polygon points={HEX_POINTS} fill="url(#gradGrass)"/>
          <polygon points={HEX_POINTS} fill="url(#varGrass)" opacity={.15 + (hex.id % 5) * .03}/>
          <path d={vis.detail} stroke="#4a7820" strokeWidth="1" fill="none" opacity=".2"/>
          <path d={vis.blades} stroke="#6aaa38" strokeWidth="0.8" fill="none" opacity=".3"/>
          <path d={vis.flowers} fill={hex.id % 3 === 0 ? "#f0e050" : hex.id % 3 === 1 ? "#e87868" : "#d888c8"} stroke="none" opacity=".4"/>
          {vis.coast && <path d={vis.coast} stroke="#d8c890" strokeWidth="2" fill="none" opacity=".45"/>}
          <polygon points={HEX_POINTS} fill="none" stroke="#3a6818" strokeWidth="0.8" opacity=".4"/>
        </>}

        {/* === FOREST — flat base + 3D trees (cones on prisms) === */}
        {t === "forest" && <>
          <polygon points={HEX_POINTS} fill="url(#gradForest)"/>
          {vis.coast && <path d={vis.coast} stroke="#d8c890" strokeWidth="2" fill="none" opacity=".45"/>}
          <polygon points={HEX_POINTS} fill="none" stroke="#1a4a10" strokeWidth="0.8" opacity=".5"/>
          {/* 3D trees */}
          {getTreePositions(hex.id).map((tr, i) => (
            <IsoTree key={i} x={tr.x} y={tr.y} trunkH={tr.trunkH} canopyH={tr.canopyH} canopyW={tr.canopyW} trunkW={tr.trunkW}/>
          ))}
        </>}

        {/* === MOUNTAIN — flat base + 3D pyramid filling the tile === */}
        {t === "mountain" && <>
          <polygon points={HEX_POINTS} fill="url(#gradMountain)"/>
          <polygon points={HEX_POINTS} fill="none" stroke="#3a3a38" strokeWidth="0.8" opacity=".45"/>
          {/* 3D Pyramid — base is the diamond, peak rises above */}
          {(() => {
            const peakH = 28 + (hex.id % 8);
            const peak = -peakH;
            // Four faces of the pyramid, draw back faces first then front
            // Back-left face (hidden mostly)
            // Back-right face (hidden mostly)
            // Front-left face (darker)
            const fLeft = `${-ISO_HW},0 0,${ISO_HH} 0,${peak}`;
            // Front-right face (lighter)
            const fRight = `${ISO_HW},0 0,${ISO_HH} 0,${peak}`;
            // Top-left face
            const tLeft = `${-ISO_HW},0 0,${-ISO_HH} 0,${peak}`;
            // Top-right face
            const tRight = `${ISO_HW},0 0,${-ISO_HH} 0,${peak}`;
            // Snow cap triangle near peak
            const snowH = peakH * 0.3;
            const snowScale = 0.3;
            const sLeft = `${-ISO_HW*snowScale},${peak+snowH} 0,${ISO_HH*snowScale+peak+snowH} 0,${peak}`;
            const sRight = `${ISO_HW*snowScale},${peak+snowH} 0,${ISO_HH*snowScale+peak+snowH} 0,${peak}`;
            return <>
              <polygon points={tLeft} fill="#7a7868" stroke="#5a5848" strokeWidth="0.4"/>
              <polygon points={tRight} fill="#8a8878" stroke="#5a5848" strokeWidth="0.4"/>
              <polygon points={fLeft} fill="#6a6858" stroke="#4a4838" strokeWidth="0.4"/>
              <polygon points={fRight} fill="#8a8a7a" stroke="#5a5848" strokeWidth="0.4"/>
              {/* Snow cap */}
              <polygon points={sLeft} fill="#dde8e8" stroke="#c8d4d4" strokeWidth="0.3" opacity=".9"/>
              <polygon points={sRight} fill="#f0f8f8" stroke="#c8d4d4" strokeWidth="0.3" opacity=".9"/>
            </>;
          })()}
        </>}

        {/* === WATER — flat diamond with waves === */}
        {t === "water" && <>
          <polygon points={HEX_POINTS} fill="url(#gradWater)"/>
          <path d={vis.waves.waves} stroke="#60b8e0" strokeWidth="1" fill="none" opacity=".4"/>
          <path d={vis.waves.waves} stroke="#80d0f0" strokeWidth=".5" fill="none" opacity=".3" transform="translate(1,2)"/>
          <path d={vis.waves.foam} stroke="#c8e8f8" strokeWidth="1.2" fill="none" opacity=".25"/>
          <path d={vis.waves.shimmer} stroke="#e0f4ff" strokeWidth=".6" fill="none" opacity=".35"/>
          {vis.waterCoast && <path d={vis.waterCoast} stroke="#a0c890" strokeWidth="1.8" fill="none" opacity=".25"/>}
          <polygon points={HEX_POINTS} fill="none" stroke="#2a6090" strokeWidth="0.8" opacity=".4"/>
        </>}

        {/* Territory tint */}
        {hex.ownerPlayerId && player && <polygon points={HEX_POINTS} fill={player.color} opacity=".1"/>}
        {hex.resource && !city && <g style={{pointerEvents:"none"}}><ResourceIcon type={hex.resource} x={0} y={0} s={13}/></g>}

        {/* === CITY — 3D isometric buildings === */}
        {city && <>
          <polygon points={HEX_POINTS} fill={player.color} opacity=".18"/>
          <polygon points={HEX_POINTS} fill="none" stroke={player.color} strokeWidth="1.5" opacity=".6"/>
          {/* 3D buildings */}
          {getCityBuildings(hex.id, city.population).map((b, i) => {
            // Alternate roof colors for variety
            const roofColors = ["#e08830", "#d07828", "#c86820", "#b85818"];
            const roofCol = roofColors[i % roofColors.length];
            return <IsoBox key={i} x={b.x} y={b.y} hw={b.hw} hd={b.hd} h={b.h}
              fillTop={roofCol}
              fillLeft="#c4a878"
              fillRight="#d8c098"
              stroke="#8a7050"
            />;
          })}
          {/* City name label */}
          <g transform="translate(0,22)">
            <rect x={-24} y={-7} width={48} height={13} rx={3} fill={player.colorBg} stroke={player.color} strokeWidth="1"/>
            <text x={-3} y={0} textAnchor="middle" dominantBaseline="middle" fill="#ffd740" fontSize={8} fontWeight="bold" fontFamily="'Palatino Linotype',serif" style={{pointerEvents:"none",letterSpacing:1}}>{city.name}</text>
            <text x={18} y={0} textAnchor="middle" dominantBaseline="middle" fill="#ffd740" fontSize={8} fontWeight="bold" style={{pointerEvents:"none"}}>{city.population}</text>
          </g>
          {city.hp < city.hpMax && <g transform="translate(0,14)">
            <rect x={-16} y={0} width={32} height={2.5} rx={1} fill="#333" opacity=".7"/>
            <rect x={-16} y={0} width={32 * (city.hp / city.hpMax)} height={2.5} rx={1} fill={city.hp > city.hpMax * .5 ? "#4a4" : "#c44"} opacity=".9"/>
          </g>}
          {city.currentProduction && <text x={0} y={-28} textAnchor="middle" fill="#ffd740" fontSize={7} style={{pointerEvents:"none"}}>⚙ {city.currentProduction.type === "unit" ? UNIT_DEFS[city.currentProduction.itemId]?.name : DISTRICT_DEFS[city.currentProduction.itemId]?.name}</text>}
        </>}

        {/* Units (not in city) */}
        {unitCount > 0 && !city && <g transform="translate(0,-5)" style={{pointerEvents:"none"}} className={canAct && !unitSelected ? "unit-bob" : undefined}>
          {canAct && !unitSelected && <circle cx={0} cy={0} r={18} fill="none" stroke={units[0].pCol} strokeWidth="1.5" className="unit-glow"/>}
          <circle cx={0} cy={0} r={15} fill={units[0].pBg} stroke={unitSelected ? "#60d0ff" : canAct ? "#a0e060" : units[0].pCol} strokeWidth={unitSelected ? "2" : canAct ? "1.5" : "1"} strokeDasharray={canAct && !unitSelected ? "3 2" : "none"}/>
          <UnitIcon unitType={units[0].unitType} x={0} y={0} fg={units[0].pLight || "#fff"} sz={12}/>
          {unitSelected && <circle cx={0} cy={0} r={17} fill="none" stroke="#60d0ff" strokeWidth="1.2" opacity=".5"/>}
          {unitCount > 1 && <text x={12} y={-12} textAnchor="middle" fill="#ffd740" fontSize={7} fontWeight="bold" style={{pointerEvents:"none"}}>+{unitCount - 1}</text>}
          <g transform="translate(0,16)">
            <rect x={-12} y={0} width={24} height={3} rx={1.2} fill="#222" opacity=".8" stroke="#555" strokeWidth=".4"/>
            <rect x={-12} y={0} width={24 * (units[0].hpCurrent / (UNIT_DEFS[units[0].unitType]?.hp || 10))} height={3} rx={1.2} fill={units[0].hpCurrent > (UNIT_DEFS[units[0].unitType]?.hp || 10) * .5 ? "#4a4" : "#c44"} opacity=".9"/>
          </g>
        </g>}

        {/* Units garrisoned in city */}
        {unitCount > 0 && city && <g transform="translate(22,-16)" style={{pointerEvents:"none"}}>
          <circle cx={0} cy={0} r={10} fill={units[0].pBg} stroke={unitSelected ? "#60d0ff" : canAct ? "#a0e060" : units[0].pCol} strokeWidth={unitSelected ? "1.5" : "1"} strokeDasharray={canAct && !unitSelected ? "3 2" : "none"}/>
          <UnitIcon unitType={units[0].unitType} x={0} y={0} fg={units[0].pLight || "#fff"} sz={8}/>
          {unitCount > 1 && <text x={8} y={-7} fill="#ffd740" fontSize={6} fontWeight="bold">+{unitCount - 1}</text>}
        </g>}

        {/* Coordinate labels for empty tiles */}
        {!city && unitCount === 0 && t !== "forest" && t !== "mountain" && <text x={0} y={1} textAnchor="middle" dominantBaseline="middle" fill={t === "water" ? "rgba(150,200,240,.15)" : "rgba(200,216,160,.12)"} fontSize={7} fontFamily="monospace" style={{pointerEvents:"none"}}>{hex.col},{hex.row}</text>}

        {/* Overlays */}
        {inMoveRange && <polygon points={HEX_POINTS} fill="rgba(96,208,255,.12)" stroke="#60d0ff" strokeWidth="1.5" opacity=".7"/>}
        {inAttackRange && <polygon points={HEX_POINTS} fill="rgba(255,60,60,.14)" stroke="#ff4040" strokeWidth="1.5" opacity=".7"/>}
        {inNukeRange && <polygon points={HEX_POINTS} fill="rgba(255,200,0,.15)" stroke="#ffa000" strokeWidth="2" opacity=".8" strokeDasharray="3 2"/>}
        {settlerMode && t !== "water" && t !== "mountain" && !city && <polygon points={HEX_POINTS} fill="rgba(80,255,80,.14)" stroke="#40e040" strokeWidth="1.5" opacity=".6"/>}
        {isHovered && !isSelected && <polygon points={HEX_POINTS} fill="rgba(255,255,200,.12)" stroke="#e8d860" strokeWidth="1.5"/>}
        {isSelected && <polygon points={HEX_POINTS} fill="rgba(255,255,200,.08)" stroke="#f0e068" strokeWidth="2" strokeDasharray="5 3"/>}
        {flash && <polygon points={HEX_POINTS} fill={flash === "nuke" ? "rgba(255,200,0,.5)" : flash === "blocked" ? "rgba(255,160,40,.25)" : "rgba(255,80,80,.35)"} stroke={flash === "nuke" ? "#ff8000" : flash === "blocked" ? "#ffa030" : "#ff2020"} strokeWidth={flash === "blocked" ? 1.5 : 2}>
          <animate attributeName="opacity" from="1" to="0" dur={flash === "blocked" ? "0.6s" : "0.8s"} fill="freeze"/>
        </polygon>}
      </g>
    </g>
  );
}, (a, b) =>
  a.isHovered === b.isHovered && a.isSelected === b.isSelected &&
  a.inMoveRange === b.inMoveRange && a.inAttackRange === b.inAttackRange &&
  a.inNukeRange === b.inNukeRange && a.unitSelected === b.unitSelected &&
  a.settlerMode === b.settlerMode && a.canAct === b.canAct &&
  a.flash === b.flash && a.isFogged === b.isFogged &&
  a.isExplored === b.isExplored && a.blockReason === b.blockReason &&
  a.unitCount === b.unitCount && a.units === b.units &&
  a.city === b.city && a.player === b.player && a.hex === b.hex
);

export default MemoHex;

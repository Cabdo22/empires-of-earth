import React from "react";
import { HEX_POINTS } from "../data/constants.js";
import { UNIT_DEFS } from "../data/units.js";
import { DISTRICT_DEFS } from "../data/districts.js";
import { CanvasBoardRenderer } from "./CanvasBoardRenderer.jsx";
import UnitAnimationOverlay from "./UnitAnimationOverlay.jsx";

export function GameViewport({ controller }) {
  const {
    activeRenderer,
    svgRef,
    gRef,
    wW,
    wH,
    onMD,
    onMM,
    onMU,
    onWh,
    onCanvasMove,
    onCanvasLeave,
    onCanvasClick,
    onCanvasContext,
    onHexHover,
    onHexLeave,
    onHexClick,
    onHexCtx,
    boardHexes,
    terrainCanvasTiles,
    entityCanvasTiles,
    overlayCanvasTiles,
    borderOverlay,
    cityBannerOverlay,
    overlayRef,
    animVisuals,
    animatingUnitId,
    combatAnims,
    tooltipData,
    renderAll,
  } = controller;

  return activeRenderer === "canvas" ? (
    <CanvasBoardRenderer
      svgRef={svgRef}
      gRef={gRef}
      wW={wW}
      wH={wH}
      onMouseDown={onMD}
      onMouseMove={onCanvasMove}
      onMouseUp={onMU}
      onMouseLeave={onCanvasLeave}
      onClick={onCanvasClick}
      onContextMenu={onCanvasContext}
      onWheel={onWh}
      boardHexes={boardHexes}
      terrainCanvasTiles={terrainCanvasTiles}
      entityCanvasTiles={entityCanvasTiles}
      overlayCanvasTiles={overlayCanvasTiles}
      borderOverlay={borderOverlay}
      cityBannerOverlay={cityBannerOverlay}
      overlayRef={overlayRef}
      animVisuals={animVisuals}
      animatingUnitId={animatingUnitId}
      combatAnims={combatAnims}
      tooltipData={tooltipData}
    />
  ) : (
    <svg ref={svgRef} onMouseDown={onMD} onMouseMove={onMM} onMouseUp={onMU} onMouseLeave={onMU} onWheel={onWh} onContextMenu={e=>e.preventDefault()} style={{cursor:"grab",position:"absolute",top:0,left:0,width:"100%",height:"100%",zIndex:1}}>
      <defs>
        <style>{`
          @keyframes unitPulse { 0%,100%{opacity:.4;} 50%{opacity:.8;} }
          @keyframes unitBob { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-2px)} }
          .unit-glow { animation: unitPulse 2s ease-in-out infinite; }
          .unit-bob { animation: unitBob 2.5s ease-in-out infinite; }
          @keyframes waveDrift1 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(3px,1.5px)} }
          @keyframes waveDrift2 { 0%,100%{transform:translate(2px,4px)} 50%{transform:translate(-1px,6px)} }
          @keyframes waveDrift3 { 0%,100%{transform:translate(-1px,8px)} 50%{transform:translate(2px,9.5px)} }
          @keyframes foamPulse { 0%,100%{opacity:.3} 50%{opacity:.15} }
          @keyframes shimmerFlicker { 0%,100%{opacity:.4} 30%{opacity:.15} 60%{opacity:.5} }
          .wave-layer1 { animation: waveDrift1 6s ease-in-out infinite; }
          .wave-layer2 { animation: waveDrift2 8s ease-in-out infinite; }
          .wave-layer3 { animation: waveDrift3 7s ease-in-out infinite; }
          .wave-foam { animation: foamPulse 5s ease-in-out infinite; }
          .wave-shimmer { animation: shimmerFlicker 4s ease-in-out infinite; }
          @keyframes coastWash1 { 0%,100%{transform:translate(0,0);opacity:.4} 50%{transform:scale(0.95);opacity:.55} }
          @keyframes coastWash2 { 0%,100%{transform:translate(0,0);opacity:.35} 50%{transform:scale(0.92);opacity:.5} }
          @keyframes coastWash3 { 0%,100%{transform:translate(0,0);opacity:.3} 50%{transform:scale(0.88);opacity:.45} }
          .coast-wash1 { animation: coastWash1 4s ease-in-out infinite; }
          .coast-wash2 { animation: coastWash2 4s ease-in-out infinite; animation-delay: -1.3s; }
          .coast-wash3 { animation: coastWash3 4s ease-in-out infinite; animation-delay: -2.6s; }
          @keyframes cloudDrift { 0%,100%{transform:translate(0,0)} 50%{transform:translate(2px,1px)} }
          .fog-cloud { animation: cloudDrift 8s ease-in-out infinite; }
        `}</style>
        <clipPath id="hexClip"><polygon points={HEX_POINTS}/></clipPath>
        <radialGradient id="gradGrass" cx="40%" cy="35%" r="70%"><stop offset="0%" stopColor="#5a9a2a"/><stop offset="30%" stopColor="#4e8826"/><stop offset="60%" stopColor="#437520"/><stop offset="100%" stopColor="#2a5014"/></radialGradient>
        <radialGradient id="varGrass" cx="60%" cy="55%" r="55%"><stop offset="0%" stopColor="#2a4a10"/><stop offset="100%" stopColor="#3a6a1a" stopOpacity="0"/></radialGradient>
        <radialGradient id="gradForest" cx="40%" cy="35%" r="70%"><stop offset="0%" stopColor="#306828"/><stop offset="30%" stopColor="#265a1e"/><stop offset="60%" stopColor="#1e4a16"/><stop offset="100%" stopColor="#12380c"/></radialGradient>
        <radialGradient id="gradMountain" cx="40%" cy="30%" r="70%"><stop offset="0%" stopColor="#6a6555"/><stop offset="30%" stopColor="#5a5545"/><stop offset="60%" stopColor="#4a4538"/><stop offset="100%" stopColor="#35302a"/></radialGradient>
        <radialGradient id="gradWater" cx="40%" cy="35%" r="70%"><stop offset="0%" stopColor="#3578aa"/><stop offset="30%" stopColor="#2a6a9a"/><stop offset="60%" stopColor="#1e5580"/><stop offset="100%" stopColor="#0e3050"/></radialGradient>
      </defs>
      <g ref={gRef} style={{willChange:"transform"}} onMouseMove={onHexHover} onMouseLeave={onHexLeave} onClick={onHexClick} onContextMenu={onHexCtx}>{renderAll()}
        {borderOverlay.map(b=><g key={b.key} transform={`translate(${b.x},${b.y})`} style={{pointerEvents:"none"}}><polyline points={b.pts.map(p=>`${p.x},${p.y}`).join(" ")} fill="none" stroke="#000" strokeWidth={6} strokeLinejoin="round" strokeLinecap="round" opacity={0.3}/><polyline points={b.pts.map(p=>`${p.x},${p.y}`).join(" ")} fill="none" stroke={b.color} strokeWidth={3.5} strokeLinejoin="round" strokeLinecap="round" opacity={0.9}/></g>)}
        {cityBannerOverlay.map(cb=><g key={cb.key} transform={`translate(${cb.x},${cb.y+30})`} style={{pointerEvents:"none"}}>
          <rect x={-35} y={-8} width={70} height={15} rx={3} fill={cb.colorBg} stroke={cb.color} strokeWidth="1"/>
          <text x={-3} y={.5} textAnchor="middle" dominantBaseline="middle" fill="#ffd740" fontSize={8} fontWeight="bold" fontFamily="'Palatino Linotype',serif" style={{letterSpacing:.5}}>{cb.name}</text>
          <circle cx={27} cy={.5} r={7} fill={cb.color} opacity=".8"/>
          <text x={27} y={1} textAnchor="middle" dominantBaseline="middle" fill="#fff" fontSize={7} fontWeight="bold">{cb.pop}</text>
          <rect x={-20} y={10} width={40} height={4} rx={1.5} fill="#333" opacity=".7"/><rect x={-20} y={10} width={40*(cb.hp/cb.hpMax)} height={4} rx={1.5} fill={cb.hp>cb.hpMax*.5?"#4a4":"#c44"} opacity=".9"/>
          {cb.prod&&<text x={0} y={-26} textAnchor="middle" fill="#ffd740" fontSize={8}>⚙ {cb.prod.type==="unit"?UNIT_DEFS[cb.prod.itemId]?.name:DISTRICT_DEFS[cb.prod.itemId]?.name}</text>}
        </g>)}
        <UnitAnimationOverlay ref={overlayRef} unitType={animVisuals?.unitType} playerColors={animVisuals||{}} visible={!!animatingUnitId}/>
        {combatAnims.map(a=><g key={a.id} transform={`translate(${a.x},${a.y})`} style={{pointerEvents:"none"}}>
          <text x={0} y={-20} textAnchor="middle" fill={a.color} fontSize={18} fontWeight="bold" fontFamily="'Palatino Linotype',serif" stroke="#000" strokeWidth="2" paintOrder="stroke">
            -{a.dmg}<animate attributeName="y" from="-20" to="-65" dur="1.1s" fill="freeze"/><animate attributeName="opacity" from="1" to="0" dur="1.1s" fill="freeze"/>
          </text>
        </g>)}
        {tooltipData&&<g transform={`translate(${tooltipData.x},${tooltipData.y-52})`} style={{pointerEvents:"none"}}>
          <rect x={-tooltipData.text.length*3.2} y={-10} width={tooltipData.text.length*6.4} height={18} rx={5} fill="rgba(50,15,5,.95)" stroke="rgba(240,100,60,.7)" strokeWidth="1"/>
          <text x={0} y={3} textAnchor="middle" dominantBaseline="middle" fill="#ffb090" fontSize={9} fontWeight="bold" fontFamily="'Palatino Linotype',serif" style={{pointerEvents:"none"}}>{tooltipData.text}</text>
        </g>}
      </g>
    </svg>
  );
}

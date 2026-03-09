import React, { useState, useMemo, useRef, useCallback, useEffect, memo } from "react";
import { HEX_SIZE, SQRT3, MAP_SIZES, HEX_POINTS, TERRAIN_INFO, RESOURCE_INFO, ERAS, ERA_IDX, ERA_COLORS, TECH_TREE, UNIT_DEFS, DISTRICT_DEFS, CIV_DEFS, BARB_UNITS, CITY_DEF_BONUS, TERRITORIAL_WIN, FOG_SIGHT, UPGRADE_PATHS, hexCenter, hexAt, getNeighbors, hexDist, getHexesInRadius, mulberry32, gameRng, EVEN_COL_NEIGHBORS, ODD_COL_NEIGHBORS, calcCombatPreview, getPlayerMaxEra, calcCityYields, calcPlayerIncome, getAvailableTechs, getAvailableUnits, getAvailableDistricts, canUpgradeUnit, getMoveCost, getMoveBlockReason, getReachableHexes, getRangedTargets, getVisibleHexes, checkVictoryState, buildMapConfig, createInitialState, processResearchAndIncome, processCityTurn, expandTerritory, refreshUnits, spawnBarbarians, processBarbarians, rollRandomEvent, addLogMsg, aiExecuteTurn, applyMoveUnit, applyAttack, applyLaunchNuke, applySelectResearch, applySetProduction, applyUpgradeUnit, applyFoundCity, applyCancelProduction, applyEndTurn } from '../engine/index.js';
import { SFX, ensureAudio } from './sfx.js';

// ============================================================
// PROCEDURAL VISUALS
// ============================================================
const genGrass=id=>{const s=id*137+29;let blades="",flowers="",rocks="";for(let i=0;i<30;i++){const v=(s+i*73+i*i*17)%10000;const a=((v%360)*Math.PI)/180,d2=((v*7+31)%100)/100;const r=d2*(HEX_SIZE-10),x=r*Math.cos(a),y=r*Math.sin(a);if(Math.abs(x)<HEX_SIZE*.75&&Math.abs(y)<HEX_SIZE*.72){const h=3+((v*3+7)%8),lean=(((v*11+3)%9)-4)*.5;blades+=`M${x.toFixed(1)},${y.toFixed(1)}Q${(x+lean*2).toFixed(1)},${(y-h*.6).toFixed(1)},${(x+lean).toFixed(1)},${(y-h).toFixed(1)}`;}}for(let i=0;i<4;i++){const v=(s+i*131+77)%10000;const a=((v%360)*Math.PI)/180,d2=((v*11+41)%80)/100;const r2=d2*(HEX_SIZE-18),fx=r2*Math.cos(a),fy=r2*Math.sin(a);if(Math.abs(fx)<HEX_SIZE*.6&&Math.abs(fy)<HEX_SIZE*.6){const fr=1.2+((v*3)%3)*.4;flowers+=`M${fx.toFixed(1)},${(fy-fr).toFixed(1)}A${fr},${fr},0,1,1,${fx.toFixed(1)},${(fy+fr).toFixed(1)}A${fr},${fr},0,1,1,${fx.toFixed(1)},${(fy-fr).toFixed(1)}`;}}for(let i=0;i<2;i++){const v=(s+i*199+53)%10000;const rx=-18+((v*7)%36),ry=-6+((v*11)%20),rw=3+((v*3)%4),rh=1.5+((v*5)%2);rocks+=`M${rx},${ry}L${rx+rw*.3},${ry-rh}L${rx+rw*.7},${ry-rh}L${rx+rw},${ry}Z`;}return{blades,flowers,rocks};};
const genTrees=id=>{const s=id*193+47;let tr="",ca="",under="";for(let i=0;i<10;i++){const v=(s+i*83+i*i*19)%10000;const a=((v%360)*Math.PI)/180,d2=((v*7+21)%85)/100;const r=d2*(HEX_SIZE-12),x=r*Math.cos(a),y=r*Math.sin(a);if(Math.abs(x)<HEX_SIZE*.7&&Math.abs(y)<HEX_SIZE*.65){const h=9+((v*3)%9);tr+=`M${x.toFixed(1)},${y.toFixed(1)}L${x.toFixed(1)},${(y-h).toFixed(1)}`;const cw=4+((v*7)%5),layers=2+((v*13)%2);for(let L=0;L<layers;L++){const ly=y-h+2+L*3,lw=cw-L*1.2;if(lw>1)ca+=`M${(x-lw).toFixed(1)},${ly.toFixed(1)}L${x.toFixed(1)},${(ly-lw-1).toFixed(1)}L${(x+lw).toFixed(1)},${ly.toFixed(1)}Z`;}}}for(let i=0;i<6;i++){const v=(s+i*109+31)%10000;const a=((v%360)*Math.PI)/180,d2=((v*9+11)%80)/100;const r2=d2*(HEX_SIZE-16),ux=r2*Math.cos(a),uy=r2*Math.sin(a);if(Math.abs(ux)<HEX_SIZE*.65&&Math.abs(uy)<HEX_SIZE*.6){const sw=2+((v*3)%3);under+=`M${(ux-sw).toFixed(1)},${uy.toFixed(1)}Q${ux.toFixed(1)},${(uy-sw).toFixed(1)},${(ux+sw).toFixed(1)},${uy.toFixed(1)}`;}}return{trunks:tr,canopy:ca,undergrowth:under};};
const genMtns=id=>{const s=id*211+61;let pk="",sn="",shadow="",rocks="";for(let i=0;i<5;i++){const v=(s+i*67+i*i*23)%10000;const xB=-22+((v*11)%44),yB=6+((v*7)%16),w=9+((v*3)%12),h=15+((v*5)%14);pk+=`M${(xB-w).toFixed(1)},${yB.toFixed(1)}L${xB.toFixed(1)},${(yB-h).toFixed(1)}L${(xB+w).toFixed(1)},${yB.toFixed(1)}Z`;shadow+=`M${xB.toFixed(1)},${(yB-h).toFixed(1)}L${(xB+w).toFixed(1)},${yB.toFixed(1)}L${(xB+w*.4).toFixed(1)},${yB.toFixed(1)}Z`;const sw2=w*.35,sh2=h*.28;sn+=`M${(xB-sw2).toFixed(1)},${(yB-h+sh2).toFixed(1)}L${xB.toFixed(1)},${(yB-h).toFixed(1)}L${(xB+sw2).toFixed(1)},${(yB-h+sh2).toFixed(1)}Z`;}for(let i=0;i<4;i++){const v=(s+i*151+89)%10000;const rx=-16+((v*7)%32),ry=2+((v*11)%18);rocks+=`M${rx},${ry}l${2+v%3},${-1-v%2}l${1+v%2},${1+v%2}Z`;}return{peaks:pk,snow:sn,shadow,rocks};};
const genWaves=id=>{const s=id*173+37;let waves="",foam="",shimmer="";for(let i=0;i<8;i++){const v=(s+i*61+i*i*11)%10000;const x=-28+((v*13)%56),y=-18+((v*7)%36),amp=2.5+(v%4);waves+=`M${x},${y}Q${x+7},${y-amp},${x+14},${y}Q${x+21},${y+amp},${x+28},${y}`;}for(let i=0;i<3;i++){const v=(s+i*97+19)%10000;const fx=-20+((v*11)%40),fy=-12+((v*7)%24),fw=4+((v*3)%6);foam+=`M${fx},${fy}Q${fx+fw*.5},${fy-1.5},${fx+fw},${fy}`;}for(let i=0;i<4;i++){const v=(s+i*79+41)%10000;const sx=-22+((v*13)%44),sy=-14+((v*7)%28);shimmer+=`M${sx},${sy}l${2+v%3},${-0.5}`;}return{waves,foam,shimmer};};
const genDetail=id=>{const s=id*251+43;let p="";for(let i=0;i<6;i++){const v=(s+i*97+i*i*13)%10000;const a=((v%360)*Math.PI)/180,d2=((v*11+19)%100)/100;const r=d2*(HEX_SIZE-16),x=r*Math.cos(a),y=r*Math.sin(a);if(Math.abs(x)<HEX_SIZE*.7&&Math.abs(y)<HEX_SIZE*.68)p+=`M${x.toFixed(1)},${y.toFixed(1)}L${(x+.5).toFixed(1)},${(y+.5).toFixed(1)}`;}return p;};
// Coastline: for each hex, check which neighbor directions border water
const genCoast=(hex,allHexes,mapConfig)=>{if(hex.terrainType==="water")return"";const nb=getNeighbors(hex.col,hex.row,mapConfig);let coast="";for(let d=0;d<6;d++){const angle0=(d*60-30)*Math.PI/180,angle1=((d+1)*60-30)*Math.PI/180;const x0=HEX_SIZE*Math.cos(angle0),y0=HEX_SIZE*Math.sin(angle0);const x1=HEX_SIZE*Math.cos(angle1),y1=HEX_SIZE*Math.sin(angle1);const ec2=hex.col%2===0?EVEN_COL_NEIGHBORS:ODD_COL_NEIGHBORS;const nc=hex.col+ec2[d][0],nr=hex.row+ec2[d][1];const nh=hexAt(allHexes,nc,nr,mapConfig);if(nh&&nh.terrainType==="water"){const mx=(x0+x1)/2,my=(y0+y1)/2;const inset=.78;coast+=`M${(x0*inset).toFixed(1)},${(y0*inset).toFixed(1)}Q${(mx*.7).toFixed(1)},${(my*.7).toFixed(1)},${(x1*inset).toFixed(1)},${(y1*inset).toFixed(1)}`;}}return coast;};
// Water-side coastline: for water hexes bordering land
const genWaterCoast=(hex,allHexes,mapConfig)=>{if(hex.terrainType!=="water")return"";const ec2=hex.col%2===0?EVEN_COL_NEIGHBORS:ODD_COL_NEIGHBORS;let coast="";for(let d=0;d<6;d++){const nc=hex.col+ec2[d][0],nr=hex.row+ec2[d][1];const nh=hexAt(allHexes,nc,nr,mapConfig);if(nh&&nh.terrainType!=="water"){const angle0=(d*60-30)*Math.PI/180,angle1=((d+1)*60-30)*Math.PI/180;const x0=HEX_SIZE*Math.cos(angle0),y0=HEX_SIZE*Math.sin(angle0);const x1=HEX_SIZE*Math.cos(angle1),y1=HEX_SIZE*Math.sin(angle1);const inset=.88;coast+=`M${(x0*inset).toFixed(1)},${(y0*inset).toFixed(1)}Q${((x0+x1)*.42).toFixed(1)},${((y0+y1)*.42).toFixed(1)},${(x1*inset).toFixed(1)},${(y1*inset).toFixed(1)}`;}}return coast;};

// ============================================================
// SVG ICONS -- resource & unit symbols drawn as paths
// ============================================================
const ResourceIcon=({type,x,y,s})=>{
  const sz=s||14;
  if(type==="wheat")return(<g transform={`translate(${x},${y})`}><ellipse cx={0} cy={-2} rx={sz*.3} ry={sz*.55} fill="#daa520" stroke="#b8860b" strokeWidth=".7"/><line x1={0} y1={sz*.4} x2={0} y2={-sz*.1} stroke="#8b7a40" strokeWidth="1.2"/>{[-2,0,2].map(i=><line key={i} x1={i*2} y1={-sz*.15+i} x2={i*2+1} y2={-sz*.35+i} stroke="#daa520" strokeWidth=".8"/>)}</g>);
  if(type==="iron")return(<g transform={`translate(${x},${y})`}><polygon points={`0,${-sz*.5} ${sz*.35},${sz*.15} ${-sz*.35},${sz*.15}`} fill="#8a8a8a" stroke="#5a5a5a" strokeWidth=".8"/><rect x={-1} y={sz*.1} width={2} height={sz*.4} fill="#6a5a3a" rx=".5"/></g>);
  if(type==="oil")return(<g transform={`translate(${x},${y})`}><rect x={-sz*.25} y={-sz*.35} width={sz*.5} height={sz*.6} rx={sz*.12} fill="#2a2a2a" stroke="#1a1a1a" strokeWidth=".6"/><ellipse cx={0} cy={-sz*.35} rx={sz*.25} ry={sz*.08} fill="#3a3a3a"/><circle cx={0} cy={sz*.4} r={sz*.25} fill="#1a1a2a" opacity=".6"/></g>);
  if(type==="uranium")return(<g transform={`translate(${x},${y})`}><circle cx={0} cy={0} r={sz*.35} fill="#2a4a2a" stroke="#40ff40" strokeWidth=".8" opacity=".9"/><circle cx={0} cy={0} r={sz*.15} fill="#40ff40" opacity=".7"/>{[0,120,240].map(a=><line key={a} x1={0} y1={0} x2={sz*.3*Math.cos(a*Math.PI/180)} y2={sz*.3*Math.sin(a*Math.PI/180)} stroke="#40ff40" strokeWidth=".8" opacity=".6"/>)}</g>);
  return null;
};

const UnitIcon=({unitType,x,y,fg,sz})=>{
  const s=sz||13;const bg=fg+"30";
  const g2=(ch)=><g transform={`translate(${x},${y})`}>{ch}</g>;
  switch(unitType){
    case"scout":return g2(<><circle cx={0} cy={-s*.1} r={s*.35} fill={bg} stroke={fg} strokeWidth="1.5"/><circle cx={-s*.1} cy={-s*.15} r={s*.1} fill={fg}/><circle cx={s*.1} cy={-s*.15} r={s*.1} fill={fg}/><path d={`M${-s*.15},${s*.05}Q0,${s*.15},${s*.15},${s*.05}`} fill="none" stroke={fg} strokeWidth="1"/><line x1={0} y1={s*.25} x2={0} y2={s*.5} stroke={fg} strokeWidth="1.3"/><line x1={-s*.15} y1={s*.4} x2={s*.15} y2={s*.4} stroke={fg} strokeWidth="1"/></>);
    case"warrior":return g2(<><rect x={-s*.2} y={-s*.15} width={s*.4} height={s*.55} rx={s*.06} fill={bg} stroke={fg} strokeWidth="1.3"/><circle cx={0} cy={-s*.3} r={s*.22} fill={bg} stroke={fg} strokeWidth="1.3"/><line x1={-s*.4} y1={-s*.05} x2={-s*.15} y2={-s*.2} stroke={fg} strokeWidth="1.8"/><line x1={-s*.4} y1={-s*.05} x2={-s*.42} y2={-s*.25} stroke={fg} strokeWidth="1.5"/><line x1={s*.2} y1={0} x2={s*.35} y2={s*.15} stroke={fg} strokeWidth="1.3"/></>);
    case"settler":return g2(<><rect x={-s*.3} y={-s*.2} width={s*.6} height={s*.45} rx={s*.1} fill={bg} stroke={fg} strokeWidth="1.3"/><line x1={0} y1={-s*.2} x2={0} y2={-s*.5} stroke={fg} strokeWidth="1.2"/><polygon points={`${s*.02},${-s*.5} ${s*.28},${-s*.38} ${s*.02},${-s*.26}`} fill={fg} opacity=".8"/><circle cx={-s*.15} cy={s*.0} r={s*.05} fill={fg} opacity=".5"/><circle cx={s*.15} cy={s*.0} r={s*.05} fill={fg} opacity=".5"/></>);
    case"archer":case"chu_ko_nu":return g2(<><path d={`M${-s*.15},${-s*.5}Q${-s*.45},0,${-s*.15},${s*.5}`} fill="none" stroke={fg} strokeWidth="1.5"/><line x1={-s*.15} y1={-s*.4} x2={-s*.15} y2={s*.4} stroke={fg} strokeWidth="1.2"/><line x1={-s*.1} y1={0} x2={s*.45} y2={-s*.05} stroke={fg} strokeWidth="1.3"/><polygon points={`${s*.45},${-s*.05} ${s*.3},${-s*.15} ${s*.32},${s*.05}`} fill={fg}/>{unitType==="chu_ko_nu"&&<><line x1={-s*.1} y1={s*.18} x2={s*.38} y2={s*.13} stroke={fg} strokeWidth="1" opacity=".8"/><polygon points={`${s*.38},${s*.13} ${s*.25},${s*.05} ${s*.27},${s*.22}`} fill={fg} opacity=".7"/></>}</>);
    case"swordsman":case"legionary":return g2(<><line x1={0} y1={-s*.55} x2={0} y2={s*.1} stroke={fg} strokeWidth="2"/><line x1={-s*.22} y1={-s*.35} x2={s*.22} y2={-s*.35} stroke={fg} strokeWidth="1.8"/><ellipse cx={0} cy={s*.3} rx={s*.32} ry={s*.22} fill={bg} stroke={fg} strokeWidth="1.3"/><line x1={0} y1={s*.1} x2={0} y2={s*.5} stroke={fg} strokeWidth="1"/>{unitType==="legionary"&&<><line x1={-s*.32} y1={s*.3} x2={s*.32} y2={s*.3} stroke={fg} strokeWidth="1"/><circle cx={0} cy={s*.3} r={s*.06} fill={fg}/></>}</>);
    case"knight":case"war_chariot":return g2(<><ellipse cx={0} cy={s*.08} rx={s*.35} ry={s*.25} fill={bg} stroke={fg} strokeWidth="1.3"/><path d={`M${-s*.18},${-s*.18}Q0,${-s*.58},${s*.18},${-s*.18}`} fill="none" stroke={fg} strokeWidth="1.3"/><path d={`M${s*.18},${-s*.18}L${s*.28},${-s*.3}`} fill="none" stroke={fg} strokeWidth="1"/><circle cx={s*.18} cy={-s*.12} r={s*.07} fill={fg}/><line x1={-s*.35} y1={s*.33} x2={s*.35} y2={s*.33} stroke={fg} strokeWidth="1"/>{unitType==="war_chariot"&&<><circle cx={-s*.3} cy={s*.38} r={s*.08} fill="none" stroke={fg} strokeWidth="1"/><circle cx={s*.3} cy={s*.38} r={s*.08} fill="none" stroke={fg} strokeWidth="1"/></>}</>);
    case"catapult":case"great_bombard":return g2(<><line x1={-s*.35} y1={s*.3} x2={s*.35} y2={s*.3} stroke={fg} strokeWidth="1.8"/><path d={`M${-s*.25},${s*.3}L${-s*.05},${-s*.2}L${s*.1},${-s*.3}`} fill="none" stroke={fg} strokeWidth="1.5"/><circle cx={s*.15} cy={-s*.25} r={s*.18} fill={unitType==="great_bombard"?bg:"none"} stroke={fg} strokeWidth="1.2"/>{unitType==="great_bombard"&&<circle cx={s*.15} cy={-s*.25} r={s*.08} fill={fg}/>}<circle cx={-s*.25} cy={s*.35} r={s*.06} fill={fg} opacity=".6"/><circle cx={s*.25} cy={s*.35} r={s*.06} fill={fg} opacity=".6"/></>);
    case"tank":case"panzer":return g2(<><rect x={-s*.42} y={-s*.12} width={s*.84} height={s*.38} rx={s*.1} fill={bg} stroke={fg} strokeWidth="1.5"/><path d={`M${-s*.42},${s*.15}L${-s*.48},${s*.26}L${s*.48},${s*.26}L${s*.42},${s*.15}`} fill="none" stroke={fg} strokeWidth="1" opacity=".6"/><rect x={-s*.15} y={-s*.38} width={s*.6} height={s*.26} rx={s*.06} fill={bg} stroke={fg} strokeWidth="1.2"/><line x1={s*.35} y1={-s*.25} x2={s*.55} y2={-s*.32} stroke={fg} strokeWidth="1.5"/><circle cx={s*.55} cy={-s*.32} r={s*.04} fill={fg}/>{unitType==="panzer"&&<><line x1={-s*.42} y1={s*.08} x2={s*.42} y2={s*.08} stroke={fg} strokeWidth=".8" strokeDasharray="2 2"/><path d={`M${-s*.35},${-s*.25}L${-s*.15},${-s*.25}`} stroke={fg} strokeWidth="1.5"/></>}</>);
    case"musketman":case"musketeer":return g2(<><line x1={-s*.08} y1={-s*.55} x2={-s*.08} y2={s*.2} stroke={fg} strokeWidth="1.8"/><rect x={-s*.18} y={s*.08} width={s*.28} height={s*.18} rx={s*.04} fill={bg} stroke={fg} strokeWidth="1"/><circle cx={-s*.08} cy={-s*.55} r={s*.05} fill={fg}/><path d={`M${-s*.08},${-s*.35}L${-s*.25},${-s*.25}`} stroke={fg} strokeWidth="1.2"/>{unitType==="musketeer"&&<><line x1={s*.12} y1={-s*.35} x2={s*.32} y2={-s*.1} stroke={fg} strokeWidth="1.5"/><line x1={s*.32} y1={-s*.1} x2={s*.25} y2={-s*.05} stroke={fg} strokeWidth="1"/></>}</>);
    case"modern_infantry":case"marine":return g2(<><circle cx={0} cy={-s*.32} r={s*.2} fill={bg} stroke={fg} strokeWidth="1.3"/><line x1={0} y1={-s*.12} x2={0} y2={s*.28} stroke={fg} strokeWidth="1.5"/><line x1={-s*.3} y1={s*.02} x2={s*.3} y2={s*.02} stroke={fg} strokeWidth="1.3"/><line x1={s*.3} y1={s*.02} x2={s*.4} y2={-s*.15} stroke={fg} strokeWidth="1.2"/><line x1={-s*.15} y1={s*.28} x2={-s*.25} y2={s*.5} stroke={fg} strokeWidth="1.3"/><line x1={s*.15} y1={s*.28} x2={s*.25} y2={s*.5} stroke={fg} strokeWidth="1.3"/>{unitType==="marine"&&<><path d={`M${-s*.15},${-s*.48}L0,${-s*.55}L${s*.15},${-s*.48}`} fill="none" stroke={fg} strokeWidth="1.2"/><circle cx={0} cy={-s*.32} r={s*.06} fill={fg}/></>}</>);
    case"galley":return g2(<><path d={`M${-s*.42},${s*.1}Q0,${s*.45},${s*.42},${s*.1}`} fill={bg} stroke={fg} strokeWidth="1.5"/><line x1={0} y1={s*.05} x2={0} y2={-s*.4} stroke={fg} strokeWidth="1.3"/><polygon points={`0,${-s*.4} ${s*.28},${-s*.1} 0,${-s*.08}`} fill={fg} opacity=".6"/><line x1={-s*.3} y1={s*.15} x2={s*.3} y2={s*.15} stroke={fg} strokeWidth=".8" opacity=".5"/></>);
    case"destroyer":case"man_o_war":return g2(<><path d={`M${-s*.42},${s*.05}L${-s*.32},${s*.22}L${s*.32},${s*.22}L${s*.42},${s*.05}Z`} fill={bg} stroke={fg} strokeWidth="1.3"/><line x1={0} y1={s*.05} x2={0} y2={-s*.42} stroke={fg} strokeWidth="1.5"/>{unitType==="man_o_war"?<><polygon points={`0,${-s*.42} ${s*.32},${-s*.2} 0,${-s*.15}`} fill={fg} opacity=".5"/><polygon points={`0,${-s*.15} ${s*.28},${s*.0} 0,${s*.05}`} fill={fg} opacity=".35"/><line x1={-s*.15} y1={s*.05} x2={-s*.15} y2={-s*.3} stroke={fg} strokeWidth="1"/></>:<><polygon points={`0,${-s*.42} ${s*.32},${-s*.15} 0,${s*.05}`} fill={fg} opacity=".5"/><circle cx={-s*.15} cy={s*.12} r={s*.04} fill={fg} opacity=".6"/><circle cx={s*.15} cy={s*.12} r={s*.04} fill={fg} opacity=".6"/></>}</>);
    case"battleship":return g2(<><rect x={-s*.42} y={-s*.08} width={s*.84} height={s*.28} rx={s*.08} fill={bg} stroke={fg} strokeWidth="1.5"/><line x1={-s*.12} y1={-s*.08} x2={-s*.12} y2={-s*.38} stroke={fg} strokeWidth="1.8"/><line x1={s*.15} y1={-s*.08} x2={s*.15} y2={-s*.32} stroke={fg} strokeWidth="1.3"/><circle cx={-s*.12} cy={-s*.38} r={s*.07} fill={fg}/><line x1={-s*.35} y1={s*.08} x2={-s*.25} y2={s*.08} stroke={fg} strokeWidth="2"/><line x1={s*.25} y1={s*.08} x2={s*.35} y2={s*.08} stroke={fg} strokeWidth="2"/></>);
    case"fighter":return g2(<><line x1={0} y1={-s*.55} x2={0} y2={s*.42} stroke={fg} strokeWidth="1.8"/><polygon points={`${-s*.48},${s*.08} ${0},${-s*.05} ${s*.48},${s*.08} ${0},${s*.02}`} fill={bg} stroke={fg} strokeWidth="1"/><line x1={-s*.22} y1={s*.38} x2={s*.22} y2={s*.38} stroke={fg} strokeWidth="1.2"/><polygon points={`0,${-s*.55} ${-s*.1},${-s*.38} ${s*.1},${-s*.38}`} fill={fg}/></>);
    case"bomber":return g2(<><ellipse cx={0} cy={0} rx={s*.18} ry={s*.42} fill={bg} stroke={fg} strokeWidth="1.5"/><polygon points={`${-s*.48},${s*.02} ${0},${-s*.08} ${s*.48},${s*.02} ${0},${s*.05}`} fill={bg} stroke={fg} strokeWidth="1"/><line x1={-s*.22} y1={s*.38} x2={s*.22} y2={s*.38} stroke={fg} strokeWidth="1.2"/><circle cx={0} cy={s*.28} r={s*.1} fill={fg} opacity=".7"/><circle cx={0} cy={-s*.3} r={s*.06} fill={fg}/></>);
    case"artillery":return g2(<><rect x={-s*.35} y={s*.1} width={s*.7} height={s*.2} rx={s*.05} fill={bg} stroke={fg} strokeWidth="1.2"/><line x1={-s*.15} y1={s*.1} x2={s*.25} y2={-s*.4} stroke={fg} strokeWidth="2"/><circle cx={s*.28} cy={-s*.42} r={s*.08} fill={fg}/><circle cx={-s*.25} cy={s*.32} r={s*.1} fill="none" stroke={fg} strokeWidth="1"/><circle cx={s*.25} cy={s*.32} r={s*.1} fill="none" stroke={fg} strokeWidth="1"/></>);
    case"mech":return g2(<><rect x={-s*.25} y={-s*.15} width={s*.5} height={s*.5} rx={s*.06} fill={bg} stroke={fg} strokeWidth="1.5"/><rect x={-s*.18} y={-s*.42} width={s*.36} height={s*.27} rx={s*.05} fill={bg} stroke={fg} strokeWidth="1.2"/><circle cx={-s*.08} cy={-s*.32} r={s*.05} fill={fg}/><circle cx={s*.08} cy={-s*.32} r={s*.05} fill={fg}/><line x1={-s*.25} y1={s*.0} x2={-s*.42} y2={-s*.15} stroke={fg} strokeWidth="1.5"/><line x1={s*.25} y1={s*.0} x2={s*.42} y2={-s*.15} stroke={fg} strokeWidth="1.5"/><line x1={-s*.15} y1={s*.35} x2={-s*.2} y2={s*.55} stroke={fg} strokeWidth="1.5"/><line x1={s*.15} y1={s*.35} x2={s*.2} y2={s*.55} stroke={fg} strokeWidth="1.5"/></>);
    case"nuke":return g2(<><circle cx={0} cy={-s*.1} r={s*.35} fill={bg} stroke={fg} strokeWidth="1.3"/><path d={`M${-s*.18},${-s*.18}L0,${-s*.4}L${s*.18},${-s*.18}`} fill="none" stroke={fg} strokeWidth="1.2"/><path d={`M${-s*.18},${s*.0}L0,${s*.22}L${s*.18},${s*.0}`} fill="none" stroke={fg} strokeWidth="1.2"/><path d={`M0,${-s*.1}L${-s*.22},${-s*.1}`} fill="none" stroke={fg} strokeWidth="1"/><path d={`M0,${-s*.1}L${s*.22},${-s*.1}`} fill="none" stroke={fg} strokeWidth="1"/><circle cx={0} cy={-s*.1} r={s*.1} fill={fg}/></>);
    case"jaguar":return g2(<><circle cx={0} cy={-s*.25} r={s*.25} fill={bg} stroke={fg} strokeWidth="1.3"/><circle cx={-s*.1} cy={-s*.28} r={s*.05} fill={fg}/><circle cx={s*.1} cy={-s*.28} r={s*.05} fill={fg}/><path d={`M${-s*.06},${-s*.18}L0,${-s*.14}L${s*.06},${-s*.18}`} fill="none" stroke={fg} strokeWidth="1"/><path d={`M${-s*.2},${-s*.45}L${-s*.15},${-s*.5}L${-s*.1},${-s*.45}`} fill={fg} opacity=".6"/><path d={`M${s*.1},${-s*.45}L${s*.15},${-s*.5}L${s*.2},${-s*.45}`} fill={fg} opacity=".6"/><line x1={0} y1={-s*.0} x2={0} y2={s*.25} stroke={fg} strokeWidth="1.5"/><line x1={-s*.28} y1={s*.08} x2={s*.28} y2={s*.08} stroke={fg} strokeWidth="1.3"/><path d={`M${s*.18},${s*.25}Q${s*.35},${s*.18},${s*.42},${s*.32}`} fill="none" stroke={fg} strokeWidth="1.2"/></>);
    default:return g2(<text x={0} y={s*.15} textAnchor="middle" dominantBaseline="middle" fill={fg} fontSize={s*1.2} style={{pointerEvents:"none"}}>{UNIT_DEFS[unitType]?.icon||"?"}</text>);
  }
};

// ============================================================
// RENDER HEX (memoized component -- only re-renders when its own props change)
// ============================================================
const MemoHex=memo(function MemoHex({hex,vis,isHovered,isSelected,inMoveRange,inAttackRange,inNukeRange,units,unitCount,city,player,unitSelected,settlerMode,canAct,flash,isFogged,isExplored,blockReason}){
  const t=hex.terrainType;
  // Unexplored: completely black
  if(isFogged&&!isExplored)return(
    <g data-hex={hex.id} data-col={hex.col} data-row={hex.row} transform={`translate(${hex.x},${hex.y})`}>
      <polygon points={HEX_POINTS} fill="#050805" stroke="rgba(20,30,10,.3)" strokeWidth="1"/>
    </g>
  );
  // Explored but not currently visible: dimmed terrain, no units/cities
  if(isFogged)return(
    <g data-hex={hex.id} data-col={hex.col} data-row={hex.row} transform={`translate(${hex.x},${hex.y})`}>
      {t==="grassland"&&<polygon points={HEX_POINTS} fill="#1a2a10"/>}
      {t==="forest"&&<polygon points={HEX_POINTS} fill="#0e1a08"/>}
      {t==="mountain"&&<polygon points={HEX_POINTS} fill="#1a1a18"/>}
      {t==="water"&&<polygon points={HEX_POINTS} fill="#0a1a2a"/>}
      <polygon points={HEX_POINTS} fill="rgba(0,0,0,.45)" stroke="rgba(30,40,20,.4)" strokeWidth="1"/>
      {hex.resource&&<g opacity=".3" style={{pointerEvents:"none"}}><ResourceIcon type={hex.resource} x={0} y={2} s={12}/></g>}
    </g>
  );
  return(
    <g data-hex={hex.id} data-col={hex.col} data-row={hex.row} transform={`translate(${hex.x},${hex.y})`} style={{cursor:settlerMode&&t!=="water"&&t!=="mountain"?"crosshair":blockReason?"not-allowed":"pointer"}}>
      {t==="grassland"&&<><polygon points={HEX_POINTS} fill="url(#gradGrass)"/><polygon points={HEX_POINTS} fill="url(#varGrass)" opacity={.2+(hex.id%5)*.04}/><path d={vis.detail} stroke="#3a5818" strokeWidth="1.5" fill="none" opacity=".25"/><path d={vis.blades} stroke="#5a9830" strokeWidth="1" fill="none" opacity=".55"/><path d={vis.blades} stroke="#78c040" strokeWidth=".5" fill="none" opacity=".3" transform="translate(0.5,-0.5)"/><path d={vis.flowers} fill={hex.id%3===0?"#e8d040":hex.id%3===1?"#e07060":"#d080c0"} stroke="none" opacity=".6"/><path d={vis.rocks} fill="#8a8a78" stroke="#6a6a5a" strokeWidth=".4" opacity=".35"/>{vis.coast&&<path d={vis.coast} stroke="#c8b480" strokeWidth="3" fill="none" opacity=".5"/>}{vis.coast&&<path d={vis.coast} stroke="#e8d8a0" strokeWidth="1.5" fill="none" opacity=".35"/>}<polygon points={HEX_POINTS} fill="none" stroke="#1a2e0a" strokeWidth="1" opacity=".5"/></>}
      {t==="forest"&&<><polygon points={HEX_POINTS} fill="url(#gradForest)"/><path d={vis.detail} stroke="#1a3a10" strokeWidth="1.5" fill="none" opacity=".2"/><path d={vis.trees.undergrowth} stroke="#3a7a30" strokeWidth="1.5" fill="none" opacity=".4"/><path d={vis.trees.trunks} stroke="#5a3a1a" strokeWidth="2" fill="none" opacity=".7"/><path d={vis.trees.trunks} stroke="#3a2810" strokeWidth="1" fill="none" opacity=".3" transform="translate(1,0)"/><path d={vis.trees.canopy} fill="#2a6a30" stroke="#1a5020" strokeWidth=".6" opacity=".8"/><path d={vis.trees.canopy} fill="#3a8a3a" stroke="none" opacity=".25" transform="translate(-1,-1)"/>{vis.coast&&<path d={vis.coast} stroke="#c8b480" strokeWidth="3" fill="none" opacity=".5"/>}{vis.coast&&<path d={vis.coast} stroke="#e8d8a0" strokeWidth="1.5" fill="none" opacity=".35"/>}<polygon points={HEX_POINTS} fill="none" stroke="#0e2a08" strokeWidth="1.2" opacity=".6"/></>}
      {t==="mountain"&&<><polygon points={HEX_POINTS} fill="url(#gradMountain)"/><path d={vis.mtns.rocks} fill="#5a5548" stroke="#4a4538" strokeWidth=".5" opacity=".4"/><path d={vis.mtns.peaks} fill="#6a6a6a" stroke="#4a4a4a" strokeWidth=".8" opacity=".85"/><path d={vis.mtns.shadow} fill="#3a3530" stroke="none" opacity=".3"/><path d={vis.mtns.snow} fill="#eaeaea" stroke="#d0d0d0" strokeWidth=".4" opacity=".92"/><path d={vis.mtns.snow} fill="#fff" stroke="none" opacity=".3" transform="translate(-0.5,-0.5)"/>{vis.coast&&<path d={vis.coast} stroke="#c8b480" strokeWidth="3" fill="none" opacity=".5"/>}<polygon points={HEX_POINTS} fill="none" stroke="#2a2a2a" strokeWidth="1.2" opacity=".55"/></>}
      {t==="water"&&<><polygon points={HEX_POINTS} fill="url(#gradWater)"/><path d={vis.waves.waves} stroke="#5aa8d0" strokeWidth="1.2" fill="none" opacity=".45"/><path d={vis.waves.waves} stroke="#7ac0e8" strokeWidth=".7" fill="none" opacity=".35" transform="translate(2,4)"/><path d={vis.waves.waves} stroke="#90d0f0" strokeWidth=".4" fill="none" opacity=".25" transform="translate(-1,8)"/><path d={vis.waves.foam} stroke="#c8e8f8" strokeWidth="1.5" fill="none" opacity=".3"/><path d={vis.waves.shimmer} stroke="#e0f4ff" strokeWidth=".8" fill="none" opacity=".4"/>{vis.waterCoast&&<path d={vis.waterCoast} stroke="#a0c890" strokeWidth="2.5" fill="none" opacity=".3"/>}{vis.waterCoast&&<path d={vis.waterCoast} stroke="#c8dca0" strokeWidth="1.2" fill="none" opacity=".25"/>}<polygon points={HEX_POINTS} fill="none" stroke="#1a4a6a" strokeWidth="1.2" opacity=".5"/></>}

      {/* Territory tint */}
      {hex.ownerPlayerId&&player&&<polygon points={HEX_POINTS} fill={player.color} opacity=".08"/>}
      {hex.resource&&!city&&<g style={{pointerEvents:"none"}}><ResourceIcon type={hex.resource} x={0} y={0} s={16}/></g>}

      {/* City */}
      {city&&<>
        <polygon points={HEX_POINTS} fill={player.color} opacity=".15"/>
        <polygon points={HEX_POINTS} fill="none" stroke={player.color} strokeWidth="1.5" opacity=".6"/>
        <g transform="translate(0,-6) scale(1.4)">
          <ellipse cx={0} cy={8} rx={20} ry={4} fill="#8a7050" opacity=".35"/>
          <rect x={-20} y={-6} width={13} height={12} fill="#c4a070" stroke="#7a5c3a" strokeWidth=".6" rx=".5"/><rect x={-20} y={-6} width={13} height={2.5} fill="#a88050" stroke="#7a5c3a" strokeWidth=".4"/>
          <rect x={-15.5} y={1} width={4} height={5} rx="1.8" fill="#2a1808"/>
          <line x1={-17} y1={-6} x2={-17} y2={-15} stroke="#9a7a4a" strokeWidth=".9"/><line x1={-15} y1={-6} x2={-15} y2={-15} stroke="#9a7a4a" strokeWidth=".9"/>
          {[-8,-10,-12,-14].map(yy=><line key={yy} x1={-17.2} y1={yy} x2={-14.8} y2={yy} stroke="#9a7a4a" strokeWidth=".7"/>)}
          <rect x={-5} y={-10} width={15} height={16} fill="#d4b080" stroke="#7a5c3a" strokeWidth=".7" rx=".5"/><rect x={-5} y={-10} width={15} height={3} fill="#b89060" stroke="#7a5c3a" strokeWidth=".4"/>
          <rect x={0} y={0} width={5} height={7} rx="2.2" fill="#1a0c04"/>
          <line x1={6} y1={-10} x2={6} y2={-19} stroke="#9a7a4a" strokeWidth=".9"/><line x1={8} y1={-10} x2={8} y2={-19} stroke="#9a7a4a" strokeWidth=".9"/>
          {[-12,-14,-16,-18].map(yy=><line key={yy} x1={5.8} y1={yy} x2={8.2} y2={yy} stroke="#9a7a4a" strokeWidth=".7"/>)}
          <rect x={12} y={-3} width={10} height={10} fill="#c4a070" stroke="#7a5c3a" strokeWidth=".6" rx=".5"/><rect x={12} y={-3} width={10} height={2.2} fill="#a88050" stroke="#7a5c3a" strokeWidth=".4"/>
          <rect x={15} y={2} width={3.5} height={5} rx="1.3" fill="#2a1808"/>
        </g>
        <g transform="translate(0,30)">
          <rect x={-28} y={-8} width={56} height={15} rx={3} fill={player.colorBg} stroke={player.color} strokeWidth="1"/>
          <text x={-4} y={.5} textAnchor="middle" dominantBaseline="middle" fill="#ffd740" fontSize={9} fontWeight="bold" fontFamily="'Palatino Linotype',serif" style={{pointerEvents:"none",letterSpacing:1.5}}>{city.name}</text>
          <text x={20} y={.5} textAnchor="middle" dominantBaseline="middle" fill="#ffd740" fontSize={9} fontWeight="bold" style={{pointerEvents:"none"}}>{city.population}</text>
        </g>
        {city.hp<city.hpMax&&<g transform="translate(0,18)"><rect x={-20} y={0} width={40} height={3} rx={1} fill="#333" opacity=".7"/><rect x={-20} y={0} width={40*(city.hp/city.hpMax)} height={3} rx={1} fill={city.hp>city.hpMax*.5?"#4a4":"#c44"} opacity=".9"/></g>}
        {city.currentProduction&&<text x={0} y={-36} textAnchor="middle" fill="#ffd740" fontSize={8} style={{pointerEvents:"none"}}>⚙ {city.currentProduction.type==="unit"?UNIT_DEFS[city.currentProduction.itemId]?.name:DISTRICT_DEFS[city.currentProduction.itemId]?.name}</text>}
      </>}

      {/* Units */}
      {unitCount>0&&!city&&<g transform="translate(0,-6)" style={{pointerEvents:"none"}} className={canAct&&!unitSelected?"unit-bob":undefined}>
        {canAct&&!unitSelected&&<circle cx={0} cy={0} r={22} fill="none" stroke={units[0].pCol} strokeWidth="2" className="unit-glow"/>}
        <circle cx={0} cy={0} r={18} fill={units[0].pBg} stroke={unitSelected?"#60d0ff":canAct?"#a0e060":units[0].pCol} strokeWidth={unitSelected?"2.5":canAct?"2":"1.5"} strokeDasharray={canAct&&!unitSelected?"4 2":"none"}/>
        <UnitIcon unitType={units[0].unitType} x={0} y={0} fg={units[0].pLight||"#fff"} sz={15}/>
        {unitSelected&&<circle cx={0} cy={0} r={20} fill="none" stroke="#60d0ff" strokeWidth="1.5" opacity=".5"/>}
        {unitCount>1&&<text x={14} y={-14} textAnchor="middle" fill="#ffd740" fontSize={8} fontWeight="bold" style={{pointerEvents:"none"}}>+{unitCount-1}</text>}
        <g transform="translate(0,20)"><rect x={-14} y={0} width={28} height={4} rx={1.5} fill="#222" opacity=".8" stroke="#555" strokeWidth=".5"/><rect x={-14} y={0} width={28*(units[0].hpCurrent/(UNIT_DEFS[units[0].unitType]?.hp||10))} height={4} rx={1.5} fill={units[0].hpCurrent>(UNIT_DEFS[units[0].unitType]?.hp||10)*.5?"#4a4":"#c44"} opacity=".9"/></g>
      </g>}
      {unitCount>0&&city&&<g transform="translate(28,-20)" style={{pointerEvents:"none"}}>
        <circle cx={0} cy={0} r={12} fill={units[0].pBg} stroke={unitSelected?"#60d0ff":canAct?"#a0e060":units[0].pCol} strokeWidth={unitSelected?"2":"1"} strokeDasharray={canAct&&!unitSelected?"3 2":"none"}/>
        <UnitIcon unitType={units[0].unitType} x={0} y={0} fg={units[0].pLight||"#fff"} sz={10}/>
        {unitCount>1&&<text x={10} y={-8} fill="#ffd740" fontSize={7} fontWeight="bold">+{unitCount-1}</text>}
      </g>}

      {!city&&unitCount===0&&<text x={0} y={2} textAnchor="middle" dominantBaseline="middle" fill={t==="water"?"rgba(150,200,240,.2)":t==="mountain"?"rgba(200,200,200,.18)":"rgba(200,216,160,.18)"} fontSize={8} fontFamily="monospace" style={{pointerEvents:"none"}}>{hex.col},{hex.row}</text>}

      {inMoveRange&&<polygon points={HEX_POINTS} fill="rgba(96,208,255,.1)" stroke="#60d0ff" strokeWidth="2" opacity=".7"/>}
      {inAttackRange&&<polygon points={HEX_POINTS} fill="rgba(255,60,60,.12)" stroke="#ff4040" strokeWidth="2" opacity=".7"/>}
      {inNukeRange&&<polygon points={HEX_POINTS} fill="rgba(255,200,0,.15)" stroke="#ffa000" strokeWidth="2.5" opacity=".8" strokeDasharray="4 2"/>}
      {settlerMode&&t!=="water"&&t!=="mountain"&&!city&&<polygon points={HEX_POINTS} fill="rgba(80,255,80,.12)" stroke="#40e040" strokeWidth="2" opacity=".6"/>}
      {isHovered&&!isSelected&&<polygon points={HEX_POINTS} fill="rgba(255,255,200,.12)" stroke="#e8d860" strokeWidth="2"/>}
      {isSelected&&<polygon points={HEX_POINTS} fill="rgba(255,255,200,.08)" stroke="#f0e068" strokeWidth="2.5" strokeDasharray="6 3"/>}
      {flash&&<polygon points={HEX_POINTS} fill={flash==="nuke"?"rgba(255,200,0,.5)":flash==="blocked"?"rgba(255,160,40,.25)":"rgba(255,80,80,.35)"} stroke={flash==="nuke"?"#ff8000":flash==="blocked"?"#ffa030":"#ff2020"} strokeWidth={flash==="blocked"?2:3}><animate attributeName="opacity" from="1" to="0" dur={flash==="blocked"?"0.6s":"0.8s"} fill="freeze"/></polygon>}
    </g>
  );
},(a,b)=>a.isHovered===b.isHovered&&a.isSelected===b.isSelected&&a.inMoveRange===b.inMoveRange&&a.inAttackRange===b.inAttackRange&&a.inNukeRange===b.inNukeRange&&a.unitSelected===b.unitSelected&&a.settlerMode===b.settlerMode&&a.canAct===b.canAct&&a.flash===b.flash&&a.isFogged===b.isFogged&&a.isExplored===b.isExplored&&a.blockReason===b.blockReason&&a.unitCount===b.unitCount&&a.units===b.units&&a.city===b.city&&a.player===b.player&&a.hex===b.hex);

const btnStyle=a=>({padding:"4px 10px",borderRadius:4,fontSize:10,cursor:"pointer",border:"1px solid rgba(100,140,50,.5)",background:a?"rgba(100,160,50,.5)":"rgba(30,40,20,.8)",color:a?"#e0f0c0":"#7a8a60",fontFamily:"inherit",marginRight:4,marginBottom:4});
const panelStyle={position:"absolute",zIndex:20,background:"rgba(10,14,6,.95)",border:"1px solid rgba(100,140,50,.4)",borderRadius:8,padding:12,color:"#a0b880",fontFamily:"'Palatino Linotype',serif",pointerEvents:"auto"};

const TUTORIAL_TIPS = [
  {
    id: "welcome",
    trigger: (gs) => gs && gs.turnNumber === 1,
    icon: "🏛",
    title: "Welcome to Empires of Earth!",
    body: "Your goal: build cities, research technology, and conquer the map. Move units, manage cities, and research tech all in one turn. Click \"End Turn →\" when you're done.",
    position: "center",
  },
  {
    id: "research_tip",
    trigger: (gs, dismissed) => gs && !gs.players.find(p => p.id === gs.currentPlayerId)?.currentResearch && dismissed["welcome"],
    icon: "🔬",
    title: "Research",
    body: "Click the \"Tech\" button to open the technology tree, then click an available tech to start researching it. Research unlocks new units, buildings, and bonuses.",
    position: "top",
  },
  {
    id: "city_tip",
    trigger: (gs, dismissed) => gs && gs.turnNumber <= 2 && dismissed["welcome"],
    icon: "🏗",
    title: "City Management",
    body: "Click on your cities (on the map) to open the city panel. From there you can choose what to build — units for your army or districts to boost your economy. Cities produce automatically each turn.",
    position: "top",
  },
  {
    id: "movement_tip",
    trigger: (gs, dismissed) => gs && gs.turnNumber <= 2 && dismissed["welcome"],
    icon: "🗺",
    title: "Movement & Combat",
    body: "Click a unit to select it (or press Tab to cycle). Blue highlights show where it can move — right-click to move there. Red highlights show attack targets — right-click to attack.",
    position: "top",
  },
  {
    id: "combat_tip",
    trigger: (gs, dismissed, extra) => gs && extra?.selectedUnitNearEnemy,
    icon: "⚔",
    title: "Combat",
    body: "Hover over an enemy in range to see a combat preview. Right-click to attack. Melee units advance into the hex if the defender dies. Ranged units attack without moving and take no counter-damage.",
    position: "bottom",
  },
  {
    id: "fog_of_war",
    trigger: (gs) => gs && gs.turnNumber === 1,
    icon: "👁",
    title: "Fog of War",
    body: "Dark hexes are unexplored. Dimmed hexes were explored but aren't currently visible. Move scouts to reveal the map — they have the longest sight range.",
    position: "bottom",
  },
  {
    id: "settler_tip",
    trigger: (gs, dismissed, extra) => gs && extra?.hasSettlerSelected,
    icon: "🏕",
    title: "Found a City",
    body: "You have a settler selected! Click the \"Found City\" button in the action bar, then click any valid land hex to establish a new city. Settlers are consumed when founding.",
    position: "center",
  },
  {
    id: "victory_conditions",
    trigger: (gs) => gs && gs.turnNumber === 3,
    icon: "🏆",
    title: "Victory Conditions",
    body: "There are three ways to win: Domination (capture all enemy cities), Science (research Quantum Computing + Fusion Power), or Territorial (control 60% of land). Plan your strategy accordingly!",
    position: "center",
  },
];

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function HexStrategyGame({ onlineMode, onShowOnline }){
  const isOnline = !!onlineMode;
  const[gameMode,setGameMode]=useState(null); // null | "local" | "ai"
  const[mapSizePick,setMapSizePick]=useState(null); // null | "small" | "medium" | "large"
  const[civPick,setCivPick]=useState({p1:"Rome",p2:"China"});
  const[civPickStep,setCivPickStep]=useState(1); // 1 = P1 picking, 2 = P2 picking
  const[gameStarted,setGameStarted]=useState(false);
  const[gs,setGs]=useState(null);
  const[hovH,setHovH]=useState(null);
  const[selH,setSelH]=useState(null);
  const[selU,setSelU]=useState(null);
  const[showTech,setShowTech]=useState(false);
  const[showCity,setShowCity]=useState(null);
  const[settlerM,setSettlerM]=useState(null);
  const[nukeM,setNukeM]=useState(null);
  const[preview,setPreview]=useState(null);
  const[flashes,setFlashes]=useState({});
  const[combatAnims,setCombatAnims]=useState([]); // [{id,x,y,dmg,color,t}] floating damage nums
  const[moveMsg,setMoveMsg]=useState(null); // transient "can't move" feedback
  const[aiThinking,setAiThinking]=useState(false);
  const[turnTransition,setTurnTransition]=useState(null); // null or {playerName, playerColor, playerColorLight}
  const[tutorialOn,setTutorialOn]=useState(true);
  const[tutorialDismissed,setTutorialDismissed]=useState({}); // keyed by tip id
  const[techCollapsed,setTechCollapsed]=useState(false);
  const[cityCollapsed,setCityCollapsed]=useState(false);
  const[turnPopups,setTurnPopups]=useState([]); // [{id,type,title,body,action}] turn-start popups
  const turnPopupShownRef=useRef(null); // tracks which turn+player combo we've shown popups for
  const[,forceRender]=useState(0); // bump to force re-render during panel drag
  const victoryPlayed=useRef(false);
  const prevCpId=useRef(null);

  // === ONLINE MODE: sync server state into local gs ===
  useEffect(()=>{
    if(!isOnline)return;
    if(onlineMode.gameState){
      setGs(onlineMode.gameState);
      if(!gameStarted)setGameStarted(true);
      if(!gameMode)setGameMode("online");
    }
  },[isOnline,onlineMode?.gameState]);

  // In online mode, the current player perspective is always myPlayerId
  const onlineMyId = onlineMode?.myPlayerId;
  const onlineIsMyTurn = onlineMode?.isMyTurn;

  // === ONLINE MODE: process server events (SFX, flash, combat anims) ===
  useEffect(()=>{
    if(!isOnline||!onlineMode.events||onlineMode.events.length===0)return;
    for(const evt of onlineMode.events){
      if(evt.type==="sfx")setTimeout(()=>SFX[evt.name]?.(),0);
      if(evt.type==="flash")setFlashes(prev=>({...prev,[evt.key]:evt.kind}));
      if(evt.type==="combat_anim"){
        const now=Date.now();const anims=[];
        if(evt.aDmg){const pos=hexCenter(evt.defender.col,evt.defender.row);anims.push({id:now,x:pos.x,y:pos.y,dmg:evt.aDmg,color:"#ff4040",t:now});}
        if(evt.dDmg>0&&evt.attacker){const pos=hexCenter(evt.attacker.col,evt.attacker.row);anims.push({id:now+1,x:pos.x,y:pos.y,dmg:evt.dDmg,color:"#ff8040",t:now});}
        if(anims.length>0)setCombatAnims(prev=>[...prev,...anims]);
      }
    }
    onlineMode.clearEvents();
  },[isOnline,onlineMode?.events]);

  // Derived state (safe when gs is null)
  const hexes=gs?.hexes||[];
  const players=gs?.players||[];
  const turnNumber=gs?.turnNumber||1;
  const cpId=isOnline?onlineMyId:(gs?.currentPlayerId||"p1");
  const rawPhase=gs?.phase||"MOVEMENT";
  // In online mode, disable actions when it's not your turn
  const phase=(isOnline&&!onlineIsMyTurn)?"WAITING":rawPhase;
  const log=gs?.log||[];
  const barbarians=gs?.barbarians||[];
  const cp=players.find(p=>p.id===cpId)||{units:[],cities:[],researchedTechs:[],civilization:"Rome",name:"",color:"#888",colorBg:"#444",colorLight:"#aaa",gold:0,science:0};
  const op=players.find(p=>p.id!==cpId);
  const inc=useMemo(()=>gs?calcPlayerIncome(cp,hexes,gs.mapConfig):{food:0,production:0,science:0,gold:0},[cp,hexes,gs]);
  const visData=useMemo(()=>hexes.map(h=>{
    const grass=genGrass(h.id);
    return{
      blades:grass.blades,flowers:grass.flowers,rocks:grass.rocks,
      detail:genDetail(h.id),
      trees:h.terrainType==="forest"?genTrees(h.id):{trunks:"",canopy:"",undergrowth:""},
      mtns:h.terrainType==="mountain"?genMtns(h.id):{peaks:"",snow:"",shadow:"",rocks:""},
      waves:h.terrainType==="water"?genWaves(h.id):{waves:"",foam:"",shimmer:""},
      coast:genCoast(h,hexes,gs?.mapConfig),
      waterCoast:genWaterCoast(h,hexes,gs?.mapConfig),
    };
  }),[hexes,gs?.mapConfig]);
  const cityMap=useMemo(()=>{const m={};players.forEach(p=>p.cities.forEach(c=>{m[c.hexId]={city:c,player:p};}));return m;},[players]);
  const unitMap=useMemo(()=>{const m={};
    players.forEach(p=>p.units.forEach(u=>{const k=`${u.hexCol},${u.hexRow}`;if(!m[k])m[k]=[];m[k].push({...u,pid:p.id,pCol:p.color,pBg:p.colorBg,pLight:p.colorLight});}));
    barbarians.forEach(b=>{const k=`${b.hexCol},${b.hexRow}`;if(!m[k])m[k]=[];m[k].push({...b,pid:"barb",pCol:"#c05050",pBg:"#4a1010",pLight:"#ff8080"});});
    return m;},[players,barbarians]);
  const fogVisible=useMemo(()=>{
    if(!gs)return new Set();
    // In online mode, server provides pre-computed visible hexes
    if(isOnline&&gs._visibleHexes)return new Set(gs._visibleHexes);
    return getVisibleHexes(cp,hexes);
  },[cp,hexes,gs,isOnline]);
  const fogExplored=useMemo(()=>{if(!gs)return new Set();return new Set(gs.explored?.[cpId]||[]);},[gs,cpId]);
  const sud=useMemo(()=>{if(!selU||!gs)return null;const u=cp.units.find(u2=>u2.id===selU);if(!u)return null;return{...u,def:UNIT_DEFS[u.unitType]};},[selU,cp,gs]);

  const reach=useMemo(()=>{
    if(!sud||phase!=="MOVEMENT"||sud.movementCurrent<=0)return new Set();
    return getReachableHexes(sud.hexCol,sud.hexRow,sud.movementCurrent,hexes,sud.def?.domain||"land",cpId,players,sud.def?.ability,gs.mapConfig);
  },[sud,hexes,phase,cpId,players,gs?.mapConfig]);

  const atkRange=useMemo(()=>{
    if(!sud||phase!=="MOVEMENT"||!sud.def?.range||sud.hasAttacked)return new Set();
    return getRangedTargets(sud.hexCol,sud.hexRow,sud.def.range,gs.mapConfig);
  },[sud,phase,gs?.mapConfig]);

  const nukeR=useMemo(()=>{
    if(!nukeM)return new Set();const nu=cp.units.find(u=>u.id===nukeM);
    if(!nu)return new Set();return getRangedTargets(nu.hexCol,nu.hexRow,3,gs.mapConfig);
  },[nukeM,cp,gs?.mapConfig]);

  const actable=useMemo(()=>{
    if(phase!=="MOVEMENT")return new Set();
    return new Set(cp.units.filter(u=>u.movementCurrent>0||(!u.hasAttacked&&(UNIT_DEFS[u.unitType]?.range||0)>0)).map(u=>u.id));
  },[cp,phase]);

  // Pan/zoom
  const panRef=useRef({x:0,y:0}),zoomRef=useRef(1),isPanRef=useRef(false),psRef=useRef({x:0,y:0,px:0,py:0});
  const gRef=useRef(null),svgRef=useRef(null),dirtyRef=useRef(false),gameContainerRef=useRef(null),uiOverlayRef=useRef(null);
  // Panel drag refs
  const techPosRef=useRef({x:null,y:95}),cityPosRef=useRef({x:null,y:95});
  const draggingPanelRef=useRef(null),dragOffsetRef=useRef({x:0,y:0});
  // Minimap
  const minimapRef=useRef(null),minimapRenderRef=useRef(null);
  const MINIMAP_W=160,MINIMAP_H=140;
  const mc=gs?.mapConfig||{cols:10,rows:10};
  const wW=mc.cols*1.5*HEX_SIZE+HEX_SIZE*2+100,wH=mc.rows*SQRT3*HEX_SIZE+SQRT3*HEX_SIZE+100;
  const flush=useCallback(()=>{const z=zoomRef.current,p=panRef.current,cx=window.innerWidth/2,cy=window.innerHeight/2;if(gRef.current)gRef.current.style.transform=`translate(${p.x+cx-(wW*z)/2}px,${p.y+cy-(wH*z)/2}px) scale(${z})`;dirtyRef.current=false;if(minimapRenderRef.current)minimapRenderRef.current();},[wW,wH]);
  const sched=useCallback(()=>{if(!dirtyRef.current){dirtyRef.current=true;requestAnimationFrame(flush);}},[flush]);
  useEffect(()=>{flush();},[flush]);
  // Center camera on player's first city when game starts
  const gameCenteredRef=useRef(false);
  useEffect(()=>{
    if(!gs||gameCenteredRef.current)return;
    const player=gs.players.find(p=>p.id===gs.currentPlayerId);
    if(!player||!player.cities.length)return;
    const city=player.cities[0];
    const cityHex=hexes[city.hexId];
    if(!cityHex)return;
    // Center pan on city hex
    const z=zoomRef.current;
    panRef.current={x:(wW*z)/2-cityHex.x*z, y:(wH*z)/2-cityHex.y*z};
    gameCenteredRef.current=true;
    sched();
  },[gs,hexes,wW,wH,sched]);
  useEffect(()=>{if(Object.keys(flashes).length>0){const t=setTimeout(()=>setFlashes({}),800);return()=>clearTimeout(t);}},[flashes]);
  useEffect(()=>{if(combatAnims.length>0){const t=setTimeout(()=>setCombatAnims([]),1200);return()=>clearTimeout(t);}},[combatAnims]);
  useEffect(()=>{if(moveMsg){const t=setTimeout(()=>setMoveMsg(null),1500);return()=>clearTimeout(t);}},[moveMsg]);
  // Update explored set when fog visibility changes (skip in online — server handles this)
  useEffect(()=>{if(isOnline||!gs||fogVisible.size===0)return;
    setGs(prev=>{if(!prev)return prev;const ex=prev.explored||{};const cur=ex[cpId]||[];const s=new Set(cur);let changed=false;
      for(const k of fogVisible){if(!s.has(k)){s.add(k);changed=true;}}
      if(!changed)return prev;return{...prev,explored:{...ex,[cpId]:[...s]}};});
  },[fogVisible,cpId]);

  // === processEvents helper ===
  const processEvents=useCallback((events)=>{
    for(const evt of events){
      if(evt.type==="sfx")setTimeout(()=>SFX[evt.name]?.(),0);
      if(evt.type==="flash")setFlashes(prev=>({...prev,[evt.key]:evt.kind}));
      if(evt.type==="combat_anim"){
        const now=Date.now();
        const anims=[];
        if(evt.aDmg){
          const pos=hexCenter(evt.defender.col,evt.defender.row);
          anims.push({id:now,x:pos.x,y:pos.y,dmg:evt.aDmg,color:"#ff4040",t:now});
        }
        if(evt.dDmg>0&&evt.attacker){
          const pos=hexCenter(evt.attacker.col,evt.attacker.row);
          anims.push({id:now+1,x:pos.x,y:pos.y,dmg:evt.dDmg,color:"#ff8040",t:now});
        }
        if(anims.length>0)setCombatAnims(prev=>[...prev,...anims]);
      }
    }
  },[]);

  // === MINIMAP ===
  const minimapScaleX=MINIMAP_W/wW,minimapScaleY=MINIMAP_H/wH;
  const mmHexR=Math.max(2,Math.min(5,MINIMAP_W/(mc.cols*2.2)));
  const mmDragRef=useRef(false);
  const drawMiniHex=(ctx,cx2,cy2,r)=>{ctx.beginPath();for(let i=0;i<6;i++){const a=(i*60-30)*Math.PI/180;const px=cx2+r*Math.cos(a),py=cy2+r*Math.sin(a);i===0?ctx.moveTo(px,py):ctx.lineTo(px,py);}ctx.closePath();};
  const renderMinimap=useCallback(()=>{
    if(!minimapRef.current||!gs)return;const ctx=minimapRef.current.getContext("2d");
    const MTC={grassland:"#5a9030",forest:"#1e6a38",mountain:"#6a6a5a",water:"#2a5a8a"};
    ctx.fillStyle="#0a0e06";ctx.fillRect(0,0,MINIMAP_W,MINIMAP_H);
    for(const h of hexes){const cx2=h.x*minimapScaleX,cy2=h.y*minimapScaleY;
      const vis=fogVisible.has(`${h.col},${h.row}`),expl=fogExplored.has(`${h.col},${h.row}`);
      if(!vis&&!expl)continue;
      ctx.globalAlpha=vis?1:0.35;ctx.fillStyle=MTC[h.terrainType]||"#444";
      drawMiniHex(ctx,cx2,cy2,mmHexR);ctx.fill();
      // Territory tint
      if(h.ownerPlayerId){const op2=players.find(p2=>p2.id===h.ownerPlayerId);if(op2){ctx.globalAlpha=vis?0.3:0.15;ctx.fillStyle=op2.color;drawMiniHex(ctx,cx2,cy2,mmHexR);ctx.fill();}}}
    // Cities as bright dots
    for(const p of players){ctx.fillStyle=p.color;ctx.globalAlpha=1;for(const c of p.cities){const ch=hexes[c.hexId];if(!ch)continue;
      const vis2=fogVisible.has(`${ch.col},${ch.row}`)||fogExplored.has(`${ch.col},${ch.row}`);if(!vis2)continue;
      drawMiniHex(ctx,ch.x*minimapScaleX,ch.y*minimapScaleY,mmHexR+1);ctx.fill();
      ctx.strokeStyle="#fff";ctx.lineWidth=0.5;ctx.stroke();}}
    // Units as small markers
    for(const p of players){ctx.fillStyle=p.colorLight||p.color;ctx.globalAlpha=0.9;for(const u of p.units){
      const vis2=fogVisible.has(`${u.hexCol},${u.hexRow}`);if(!vis2)continue;
      const uh=hexAt(hexes,u.hexCol,u.hexRow,gs.mapConfig);if(!uh)continue;
      ctx.beginPath();ctx.arc(uh.x*minimapScaleX,uh.y*minimapScaleY,1.2,0,Math.PI*2);ctx.fill();}}
    // Viewport rectangle
    ctx.globalAlpha=1;const z=zoomRef.current,pan=panRef.current;
    const vpCx=window.innerWidth/2,vpCy=window.innerHeight/2;
    const wl=((wW*z)/2-pan.x-vpCx)/z,wt=((wH*z)/2-pan.y-vpCy)/z;
    const vpW=window.innerWidth/z,vpH=window.innerHeight/z;
    ctx.strokeStyle="rgba(255,220,100,.7)";ctx.lineWidth=1.5;
    ctx.strokeRect(wl*minimapScaleX,wt*minimapScaleY,vpW*minimapScaleX,vpH*minimapScaleY);
  },[hexes,fogVisible,fogExplored,players,gs,minimapScaleX,minimapScaleY,wW,wH,mmHexR]);

  useEffect(()=>{minimapRenderRef.current=renderMinimap;renderMinimap();},[renderMinimap]);

  const minimapNav=useCallback(e=>{if(!minimapRef.current)return;const r=minimapRef.current.getBoundingClientRect();
    const mx=e.clientX-r.left,my=e.clientY-r.top;
    const worldX=mx/minimapScaleX,worldY=my/minimapScaleY;
    const z=zoomRef.current;
    panRef.current={x:(wW*z)/2-worldX*z,y:(wH*z)/2-worldY*z};
    sched();},[minimapScaleX,minimapScaleY,wW,wH,sched]);
  const onMinimapDown=useCallback(e=>{mmDragRef.current=true;minimapNav(e);},[minimapNav]);
  const onMinimapMove=useCallback(e=>{if(mmDragRef.current)minimapNav(e);},[minimapNav]);
  const onMinimapUp=useCallback(()=>{mmDragRef.current=false;},[]);
  const onMinimapClick=minimapNav;

  const onMD=useCallback(e=>{isPanRef.current=true;psRef.current={x:e.clientX,y:e.clientY,px:panRef.current.x,py:panRef.current.y};if(svgRef.current)svgRef.current.style.cursor="grabbing";},[]);
  const onMM=useCallback(e=>{if(!isPanRef.current)return;panRef.current={x:psRef.current.px+e.clientX-psRef.current.x,y:psRef.current.py+e.clientY-psRef.current.y};sched();},[sched]);
  const onMU=useCallback(()=>{isPanRef.current=false;if(svgRef.current)svgRef.current.style.cursor="grab";},[]);
  const onWh=useCallback(e=>{e.preventDefault();e.stopPropagation();
    const oldZ=zoomRef.current;
    const newZ=Math.min(3,Math.max(.3,oldZ-e.deltaY*.001));
    if(newZ===oldZ)return;
    // Zoom toward mouse cursor: adjust pan so the world-point under the cursor stays fixed
    const mx=e.clientX,my=e.clientY;
    const cx=window.innerWidth/2,cy=window.innerHeight/2;
    const p=panRef.current;
    // Current world-space point under cursor:
    const wx=(mx-p.x-cx+wW*oldZ/2)/oldZ;
    const wy=(my-p.y-cy+wH*oldZ/2)/oldZ;
    // After zoom, we want the same world point at the same screen position:
    panRef.current={x:mx-cx+wW*newZ/2-wx*newZ, y:my-cy+wH*newZ/2-wy*newZ};
    zoomRef.current=newZ;
    sched();},[sched,wW,wH]);
  // Attach wheel listener as non-passive so preventDefault stops browser scroll/zoom
  useEffect(()=>{const el=svgRef.current;if(!el)return;
    const h=e=>{e.preventDefault();onWh(e);};
    el.addEventListener("wheel",h,{passive:false});
    // CRITICAL: Block browser page zoom from Ctrl+wheel (trackpad pinch-to-zoom in Chromium/Edge).
    const blockBrowserZoom=e=>{if(e.ctrlKey||e.metaKey)e.preventDefault();};
    document.addEventListener("wheel",blockBrowserZoom,{passive:false,capture:true});
    // Block Ctrl+plus/minus keyboard zoom
    const blockKeyZoom=e=>{if((e.ctrlKey||e.metaKey)&&(e.key==="+"||e.key==="-"||e.key==="="||e.key==="0"))e.preventDefault();};
    document.addEventListener("keydown",blockKeyZoom);
    return()=>{el.removeEventListener("wheel",h);
      document.removeEventListener("wheel",blockBrowserZoom,{capture:true});
      document.removeEventListener("keydown",blockKeyZoom);};},[onWh]);
  // Keep UI overlay sized to VISUAL viewport (not layout viewport).
  useEffect(()=>{
    const vv=window.visualViewport;if(!vv)return;
    let pollTimer=null,rafId=0,polling=false;
    const sync=()=>{const el=uiOverlayRef.current;if(!el)return;
      el.style.width=vv.width+"px";el.style.height=vv.height+"px";
      el.style.left=vv.offsetLeft+"px";el.style.top=vv.offsetTop+"px";};
    const pollLoop=()=>{sync();if(polling)rafId=requestAnimationFrame(pollLoop);};
    const startPoll=()=>{if(!polling){polling=true;pollLoop();}
      clearTimeout(pollTimer);pollTimer=setTimeout(()=>{polling=false;},500);};
    // Sync on viewport change events
    vv.addEventListener("resize",sync);vv.addEventListener("scroll",sync);
    // Also poll briefly after any wheel event for faster response
    document.addEventListener("wheel",startPoll,{capture:true,passive:true});
    sync(); // initial
    return()=>{polling=false;cancelAnimationFrame(rafId);clearTimeout(pollTimer);
      vv.removeEventListener("resize",sync);vv.removeEventListener("scroll",sync);
      document.removeEventListener("wheel",startPoll,{capture:true});};
  },[]);
  // Panel drag handlers
  const onPanelDown=useCallback((e,panel)=>{if(e.target.closest("button"))return;e.stopPropagation();e.preventDefault();
    draggingPanelRef.current=panel;const el=e.currentTarget.closest("[data-panel]");if(!el)return;
    const r=el.getBoundingClientRect();dragOffsetRef.current={x:e.clientX-r.left,y:e.clientY-r.top};},[]);
  const onPanelMove=useCallback(e=>{if(!draggingPanelRef.current)return;const ref=draggingPanelRef.current==="tech"?techPosRef:cityPosRef;
    ref.current={x:Math.max(0,e.clientX-dragOffsetRef.current.x),y:Math.max(0,e.clientY-dragOffsetRef.current.y)};forceRender(c=>c+1);},[]);
  const onPanelUp=useCallback(()=>{draggingPanelRef.current=null;},[]);

  useEffect(()=>{const h=e=>{let m=false;
    if(e.key==="ArrowUp"){e.preventDefault();panRef.current.y+=60;m=true;}
    if(e.key==="ArrowDown"){e.preventDefault();panRef.current.y-=60;m=true;}
    if(e.key==="ArrowLeft"){e.preventDefault();panRef.current.x+=60;m=true;}
    if(e.key==="ArrowRight"){e.preventDefault();panRef.current.x-=60;m=true;}
    if(e.key==="Tab"&&phase==="MOVEMENT"){e.preventDefault();
      const acts=cp.units.filter(u=>u.movementCurrent>0||(!u.hasAttacked&&(UNIT_DEFS[u.unitType]?.range||0)>0));
      if(acts.length>0){const ci=selU?acts.findIndex(u=>u.id===selU):-1;setSelU(acts[(ci+1)%acts.length].id);setSelH(null);}m=true;}
    if(e.key==="Escape"){setSelU(null);setSettlerM(null);setNukeM(null);setPreview(null);m=true;}
    if(m)sched();};window.addEventListener("keydown",h);return()=>window.removeEventListener("keydown",h);},[sched,phase,cp,selU]);

  // addLog and checkVictory delegate to module-level pure functions
  const addLog=addLogMsg;
  const checkVictory=checkVictoryState;

  // === ACTION APPLIER CALLBACKS ===

  const launchNuke=useCallback((nuId,tc,tr)=>{
    if(isOnline){onlineMode.sendAction({type:"LAUNCH_NUKE",nukeId:nuId,col:tc,row:tr});}
    else{setGs(prev=>{
      const{state,events}=applyLaunchNuke(prev,{nukeId:nuId,col:tc,row:tr});
      processEvents(events);
      return state;
    });}
    setNukeM(null);setSelU(null);
  },[isOnline,onlineMode?.sendAction]);

  const doCombat=useCallback((attackerId,defCol,defRow)=>{
    if(isOnline){onlineMode.sendAction({type:"ATTACK",attackerId,col:defCol,row:defRow});}
    else{setGs(prev=>{
      const{state,events}=applyAttack(prev,{attackerId,col:defCol,row:defRow});
      processEvents(events);
      return state;
    });}
    setSelU(null);
    setPreview(null);
  },[isOnline,onlineMode?.sendAction]);

  const endTurn=useCallback(()=>{
    if(isOnline){onlineMode.sendAction({type:"END_TURN"});}
    else{setGs(prev=>{
      const{state,events}=applyEndTurn(prev);
      processEvents(events);
      return state;
    });}
    setSelU(null);setSelH(null);setSettlerM(null);setNukeM(null);setPreview(null);
    turnPopupShownRef.current=null;
  },[isOnline,onlineMode?.sendAction]);
  // Keep advPhase as alias for compatibility
  const advPhase=endTurn;

  // --- AI auto-play: when it's p2's turn in AI mode, execute AI after a short delay ---
  useEffect(()=>{
    if(isOnline||gameMode!=="ai"||!gs||gs.victoryStatus)return;
    if(gs.currentPlayerId!=="p2")return;
    setAiThinking(true);
    const timer=setTimeout(()=>{
      setGs(prev=>{
        if(!prev||prev.currentPlayerId!=="p2")return prev;
        const afterAi=aiExecuteTurn(prev);
        // End AI's turn
        const{state}=applyEndTurn(afterAi);
        // Update explored hexes for AI player
        const aiP=state.players.find(p=>p.id==="p2");
        const aiVis=getVisibleHexes(aiP,state.hexes);
        const aiEx=new Set(state.explored?.["p2"]||[]);
        for(const k of aiVis)aiEx.add(k);
        state.explored={...state.explored,"p2":[...aiEx]};
        return state;
      });
      setAiThinking(false);
      turnPopupShownRef.current=null;
    },800);
    return()=>clearTimeout(timer);
  },[gs?.currentPlayerId,gs?.turnNumber,gameMode,gs?.victoryStatus]);

  // --- Turn transition screen for local hotseat (skip in online mode) ---
  useEffect(()=>{
    if(isOnline||!gs||gameMode!=="local"){prevCpId.current=gs?.currentPlayerId||null;return;}
    // Show transition on first turn (prevCpId null) OR when player changes
    if((!prevCpId.current||prevCpId.current!==gs.currentPlayerId)&&!gs.victoryStatus){
      const nextP=gs.players.find(p=>p.id===gs.currentPlayerId);
      if(nextP)setTurnTransition({playerName:nextP.name,playerColor:nextP.color,playerColorLight:nextP.colorLight});
    }
    prevCpId.current=gs.currentPlayerId;
  },[gs?.currentPlayerId,gameMode,gs?.victoryStatus,gs?.players]);

  // --- Turn-start popups: show prompts for idle tech, idle city production, events ---
  useEffect(()=>{
    if(!gs||gs.victoryStatus)return;
    const key=`${gs.turnNumber}-${gs.currentPlayerId}`;
    if(turnPopupShownRef.current===key)return;
    // Don't show popups during turn transition or if AI is playing
    if(turnTransition)return;
    if(gameMode==="ai"&&gs.currentPlayerId==="p2")return;
    // In online mode, only show popups when it's your turn
    if(isOnline&&!onlineIsMyTurn)return;
    turnPopupShownRef.current=key;
    const popups=[];let pid=0;
    const cp2=gs.players.find(p=>p.id===gs.currentPlayerId);
    if(!cp2)return;
    // Event popup (from previous turn processing)
    if(gs.eventMsg){popups.push({id:pid++,type:"event",title:`🎲 ${gs.eventMsg.name}`,body:gs.eventMsg.desc});}
    // Idle research
    if(!cp2.currentResearch){popups.push({id:pid++,type:"tech",title:"🔬 Choose Research",body:"No technology is being researched. Open the tech tree to pick one!",action:"tech"});}
    // Idle city production
    for(const city of cp2.cities){
      if(!city.currentProduction){popups.push({id:pid++,type:"city",title:`🏛 ${city.name} — Idle`,body:`${city.name} has no production queue. Click it to choose what to build!`,action:"city",cityId:city.id});}
    }
    if(popups.length>0)setTurnPopups(popups);
  },[gs?.turnNumber,gs?.currentPlayerId,gs?.victoryStatus,turnTransition,gameMode]);

  // --- Player action callbacks ---

  const selResearch=useCallback((techId)=>{
    SFX.click();
    if(isOnline){onlineMode.sendAction({type:"SELECT_RESEARCH",techId});}
    else{setGs(prev=>{
      const{state,events}=applySelectResearch(prev,{techId});
      return state;
    });}
  },[isOnline,onlineMode?.sendAction]);

  const upgradeUnit=useCallback((unitId)=>{
    if(isOnline){onlineMode.sendAction({type:"UPGRADE_UNIT",unitId});}
    else{setGs(prev=>{
      const{state,events}=applyUpgradeUnit(prev,{unitId});
      processEvents(events);
      return state;
    });}
  },[isOnline,onlineMode?.sendAction]);

  const setProd=useCallback((cityId,type,itemId)=>{
    if(isOnline){onlineMode.sendAction({type:"SET_PRODUCTION",cityId,prodType:type,itemId});}
    else{setGs(prev=>{
      const{state}=applySetProduction(prev,{cityId,type,itemId});
      return state;
    });}
  },[isOnline,onlineMode?.sendAction]);

  const moveU=useCallback((unitId,targetCol,targetRow)=>{
    if(isOnline){onlineMode.sendAction({type:"MOVE_UNIT",unitId,col:targetCol,row:targetRow});}
    else{setGs(prev=>{
      const{state,events}=applyMoveUnit(prev,{unitId,col:targetCol,row:targetRow});
      processEvents(events);
      return state;
    });}
    setSelU(null);
  },[isOnline,onlineMode?.sendAction]);

  const foundCity=useCallback((unitId,col,row)=>{
    if(isOnline){onlineMode.sendAction({type:"FOUND_CITY",unitId,col,row});}
    else{setGs(prev=>{
      const{state,events}=applyFoundCity(prev,{unitId,col,row});
      processEvents(events);
      return state;
    });}
    setSettlerM(null);setSelU(null);
  },[isOnline,onlineMode?.sendAction]);

  // === RENDER HEXES (memoized) ===
  // Helper: find hex from SVG event via data attributes
  const findHexFromEvent=useCallback(e=>{const el=e.target.closest("[data-hex]");if(!el)return null;
    const id=+el.dataset.hex,col=+el.dataset.col,row=+el.dataset.row;
    return{id,col,row,hex:hexes[id],uk:`${col},${row}`};},[hexes]);

  // Delegated event handlers (single set on parent <g>, not per-hex)
  const onHexHover=useCallback(e=>{
    const h=findHexFromEvent(e);if(!h||isPanRef.current)return;
    const{hex,uk}=h;const fogged=!fogVisible.has(uk);if(fogged){if(hovH!=null){setHovH(null);setPreview(null);}return;}
    if(hovH!==hex.id)setHovH(hex.id);
    // Combat preview on hover
    if(selU&&phase==="MOVEMENT"&&sud){
      const uH=unitMap[uk]||[];const eU=uH.filter(u=>u.pid!==cpId);const cE=cityMap[hex.id];
      const hasTgt=eU.length>0||(cE&&cE.player.id!==cpId);
      const inMelee2=sud.def?.range===0&&!sud.hasAttacked&&reach.has(uk)&&hasTgt;
      const inRng2=sud.def?.range>0&&!sud.hasAttacked&&atkRange.has(uk)&&hasTgt;
      if((inMelee2||inRng2)&&eU.length>0){const eu=eU[0];
        const dP=eu.pid==="barb"?{researchedTechs:[],civilization:"Barbarian"}:players.find(p=>p.id===eu.pid);
        const pv=calcCombatPreview(sud,sud.def,eu,UNIT_DEFS[eu.unitType],hex.terrainType,cp,dP,!!(cE&&cE.player.id!==cpId));
        const effADmg=sud.def.ability==="rapid_shot"?Math.ceil(pv.aDmg*1.5):pv.aDmg;
        setPreview({...pv,aDmg:effADmg,an:sud.def.name,dn:UNIT_DEFS[eu.unitType]?.name,ahp:sud.hpCurrent,dhp:eu.hpCurrent,rapidShot:sud.def.ability==="rapid_shot"});
      }else setPreview(null);
    }else setPreview(null);
  },[findHexFromEvent,fogVisible,hovH,selU,phase,sud,unitMap,cityMap,cpId,reach,atkRange,players,cp]);

  const onHexLeave=useCallback(()=>{setHovH(null);setPreview(null);},[]);

  const onHexClick=useCallback(e=>{
    e.stopPropagation();const h=findHexFromEvent(e);if(!h||isPanRef.current)return;
    const{hex,uk}=h;if(!fogVisible.has(uk))return;
    const uH=unitMap[uk]||[];const myU=uH.filter(u=>u.pid===cpId);
    const eU=uH.filter(u=>u.pid!==cpId);const cE=cityMap[hex.id];const isMy=myU.length>0;
    const uSel2=selU&&isMy&&myU.some(u=>u.id===selU);
    const hasTgt=eU.length>0||(cE&&cE.player.id!==cpId);
    const inNk=nukeM&&nukeR.has(uk);
    if(nukeM&&inNk){launchNuke(nukeM,hex.col,hex.row);return;}
    if(nukeM){setNukeM(null);return;}
    if(settlerM&&hex.terrainType!=="water"&&hex.terrainType!=="mountain"&&!hex.cityId){foundCity(settlerM,hex.col,hex.row);return;}
    if(settlerM){setSettlerM(null);return;}
    if(cE&&cE.player.id===cpId){
      // City hex with our units: first click selects unit, second click opens city panel
      if(isMy&&!uSel2&&phase==="MOVEMENT"){setSelU(myU[0].id);setSelH(null);return;}
      if(isMy&&uSel2&&myU.length>1){const ci=myU.findIndex(u=>u.id===selU);setSelU(myU[(ci+1)%myU.length].id);return;}
      // No unit or already selected the only unit — open city panel
      setShowCity(cE.city.id);setSelU(null);return;
    }
    if(isMy&&!uSel2&&phase==="MOVEMENT"){setSelU(myU[0].id);setSelH(null);}
    else if(isMy&&uSel2){
      if(myU.length>1){const ci=myU.findIndex(u=>u.id===selU);setSelU(myU[(ci+1)%myU.length].id);}
      else{const su=myU[0];if(su.unitType==="settler"){setSettlerM(su.id);return;}if(su.unitType==="nuke"){setNukeM(su.id);return;}setSelU(null);setSelH(hex.id);}
    }else{setSelU(null);setSelH(selH===hex.id?null:hex.id);}
  },[findHexFromEvent,fogVisible,unitMap,cityMap,cpId,selU,nukeM,nukeR,settlerM,phase,selH,launchNuke,foundCity,doCombat,moveU]);

  const onHexCtx=useCallback(e=>{
    e.preventDefault();e.stopPropagation();if(isPanRef.current||phase!=="MOVEMENT")return;
    const h=findHexFromEvent(e);if(!h)return;const{hex,uk}=h;
    const uH=unitMap[uk]||[];const myU=uH.filter(u=>u.pid===cpId);
    const eU=uH.filter(u=>u.pid!==cpId);const cE=cityMap[hex.id];
    const uSel2=selU&&myU.some(u=>u.id===selU);
    const hasTgt=eU.length>0||(cE&&cE.player.id!==cpId);
    const inMv=selU&&!uSel2&&reach.has(uk)&&eU.length===0&&!(cE&&cE.player.id!==cpId);
    const inMelee=selU&&sud&&sud.def?.range===0&&!sud.hasAttacked&&reach.has(uk)&&!uSel2&&hasTgt;
    const inRng=selU&&sud&&sud.def?.range>0&&!sud.hasAttacked&&atkRange.has(uk)&&!uSel2&&hasTgt;
    if(selU&&(inMelee||inRng)){doCombat(selU,hex.col,hex.row);return;}
    if(selU&&inMv){moveU(selU,hex.col,hex.row);return;}
    if(selU&&!uSel2){const blk=getMoveBlockReason(hex,sud,sud?.def,reach,atkRange,phase,cpId,players);
      if(blk){setMoveMsg(blk);setFlashes(prev=>({...prev,[uk]:"blocked"}));}}
  },[findHexFromEvent,phase,unitMap,cityMap,cpId,selU,sud,reach,atkRange,doCombat,moveU,players]);

  const renderAll=useCallback(()=>hexes.map((hex,i)=>{
    const uk=hex.uk;
    const isVisible=fogVisible.has(uk);
    const isExplored2=fogExplored.has(uk);
    const fogged=!isVisible;
    const uH=unitMap[uk]||[];const myU=uH.filter(u=>u.pid===cpId);
    const eU=uH.filter(u=>u.pid!==cpId);const cE=cityMap[hex.id];const isMy=myU.length>0;
    const uSel=selU&&isMy&&myU.some(u=>u.id===selU);
    const hasTgt=eU.length>0||(cE&&cE.player.id!==cpId);
    const inMv=selU&&!uSel&&reach.has(uk)&&phase==="MOVEMENT"&&eU.length===0&&!(cE&&cE.player.id!==cpId);
    const inMelee=selU&&phase==="MOVEMENT"&&sud&&sud.def?.range===0&&!sud.hasAttacked&&reach.has(uk)&&!uSel&&hasTgt;
    const inRng=selU&&phase==="MOVEMENT"&&sud&&sud.def?.range>0&&!sud.hasAttacked&&atkRange.has(uk)&&!uSel&&hasTgt;
    const inNk=nukeM&&nukeR.has(uk);
    const canA=phase==="MOVEMENT"&&isMy&&myU.some(u=>actable.has(u.id));
    const ownerP=hex.ownerPlayerId?players.find(p=>p.id===hex.ownerPlayerId):null;
    const blkReason=selU&&phase==="MOVEMENT"&&sud&&!uSel&&!fogged?getMoveBlockReason(hex,sud,sud.def,reach,atkRange,phase,cpId,players):null;

    return <MemoHex key={hex.id} hex={hex} vis={visData[i]}
      isHovered={hovH===hex.id} isSelected={selH===hex.id} inMoveRange={inMv} inAttackRange={!!(inMelee||inRng)} inNukeRange={!!inNk}
      unitSelected={!!uSel} units={fogged?null:uH} unitCount={fogged?0:uH.length}
      city={fogged?null:(cE?.city||null)} player={cE?.player||ownerP} settlerMode={!!settlerM} canAct={!!canA} flash={flashes[uk]||null} isFogged={fogged} isExplored={isExplored2} blockReason={blkReason}/>;
  }),[hexes,hovH,selH,visData,unitMap,cityMap,selU,reach,atkRange,sud,cpId,phase,players,settlerM,actable,nukeM,nukeR,flashes,fogVisible,fogExplored]);

  // Tooltip overlay data (rendered above all hexes)
  const tooltipData=useMemo(()=>{
    if(hovH==null||!selU||phase!=="MOVEMENT"||!sud)return null;
    const hex=hexes.find(h2=>h2.id===hovH);if(!hex)return null;
    const uk2=hex.uk;const fogged=!fogVisible.has(uk2);if(fogged)return null;
    const uH=unitMap[uk2]||[];const myU=uH.filter(u=>u.pid===cpId);
    const uSel=myU.some(u=>u.id===selU);if(uSel)return null;
    const blk=getMoveBlockReason(hex,sud,sud.def,reach,atkRange,phase,cpId,players);
    if(!blk)return null;
    return{x:hex.x,y:hex.y,text:blk};
  },[hovH,selU,phase,sud,hexes,fogVisible,unitMap,cpId,reach,atkRange,players]);

  const tCounts=useMemo(()=>{const c={grassland:0,forest:0,mountain:0,water:0};hexes.forEach(h=>c[h.terrainType]++);return c;},[hexes]);
  const landOwned=useMemo(()=>{const o={};players.forEach(p=>{o[p.id]=hexes.filter(h=>h.ownerPlayerId===p.id).length;});return o;},[hexes,players]);
  const totalLand=useMemo(()=>hexes.filter(h=>h.terrainType!=="water").length,[hexes]);

  // === MODE SELECTION SCREEN (skip in online mode) ===
  if(!isOnline&&!gameMode){
    const modeBtn = (label, desc, icon, mode) => (
      <div onClick={()=>{SFX.click();setGameMode(mode);}}
        style={{padding:"24px 36px",borderRadius:8,cursor:"pointer",background:"rgba(30,40,20,.6)",
          border:"1px solid rgba(100,140,50,.4)",minWidth:220,textAlign:"center",
          transition:"background .2s"}}
        onMouseEnter={e=>e.currentTarget.style.background="rgba(100,160,50,.25)"}
        onMouseLeave={e=>e.currentTarget.style.background="rgba(30,40,20,.6)"}>
        <div style={{fontSize:36,marginBottom:8}}>{icon}</div>
        <div style={{color:"#c8d8a0",fontSize:16,fontWeight:600,letterSpacing:2}}>{label}</div>
        <div style={{color:"#6a7a50",fontSize:10,marginTop:6}}>{desc}</div>
      </div>
    );
    return(<div style={{width:"100vw",height:"100vh",background:"radial-gradient(ellipse at center,#1a2a10 0%,#0a0e06 70%)",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",fontFamily:"'Palatino Linotype',serif",gap:32}}>
      <h1 style={{color:"#c8d8a0",fontSize:32,fontWeight:400,letterSpacing:8,textTransform:"uppercase",margin:0}}>Empires of Earth</h1>
      <div style={{color:"#6a7a50",fontSize:12,letterSpacing:3}}>Select Game Mode</div>
      <div style={{display:"flex",gap:24,flexWrap:"wrap",justifyContent:"center"}}>
        {modeBtn("vs AI", "Play against the computer", "🤖", "ai")}
        {modeBtn("Local", "Two players, one screen", "👥", "local")}
        {onShowOnline&&<div onClick={()=>{SFX.click();onShowOnline();}}
          style={{padding:"24px 36px",borderRadius:8,cursor:"pointer",background:"rgba(30,40,20,.6)",
            border:"1px solid rgba(100,140,50,.4)",minWidth:220,textAlign:"center",
            transition:"background .2s"}}
          onMouseEnter={e=>e.currentTarget.style.background="rgba(100,160,50,.25)"}
          onMouseLeave={e=>e.currentTarget.style.background="rgba(30,40,20,.6)"}>
          <div style={{fontSize:36,marginBottom:8}}>🌐</div>
          <div style={{color:"#c8d8a0",fontSize:16,fontWeight:600,letterSpacing:2}}>Online</div>
          <div style={{color:"#6a7a50",fontSize:10,marginTop:6}}>Play against a friend online</div>
        </div>}
      </div>
      <div style={{color:"#3a4a2a",fontSize:9,marginTop:8}}>Fog of War · Barbarians · Random Events</div>
    </div>);
  }

  // === MAP SIZE SELECTION SCREEN (skip in online mode) ===
  if(!isOnline&&gameMode&&!mapSizePick){
    const sizeBtn=(key,cfg,icon)=>(
      <div onClick={()=>{SFX.click();setMapSizePick(key);}}
        style={{padding:"24px 36px",borderRadius:8,cursor:"pointer",background:"rgba(30,40,20,.6)",
          border:"1px solid rgba(100,140,50,.4)",minWidth:200,textAlign:"center",transition:"background .2s"}}
        onMouseEnter={e=>e.currentTarget.style.background="rgba(100,160,50,.25)"}
        onMouseLeave={e=>e.currentTarget.style.background="rgba(30,40,20,.6)"}>
        <div style={{fontSize:36,marginBottom:8}}>{icon}</div>
        <div style={{color:"#c8d8a0",fontSize:16,fontWeight:600,letterSpacing:2}}>{cfg.label}</div>
        <div style={{color:"#6a7a50",fontSize:10,marginTop:6}}>{cfg.desc}</div>
        <div style={{color:"#4a5a3a",fontSize:9,marginTop:4}}>{cfg.cols}×{cfg.rows} = {cfg.cols*cfg.rows} hexes</div>
      </div>
    );
    return(<div style={{width:"100vw",height:"100vh",background:"radial-gradient(ellipse at center,#1a2a10 0%,#0a0e06 70%)",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",fontFamily:"'Palatino Linotype',serif",gap:32}}>
      <h1 style={{color:"#c8d8a0",fontSize:32,fontWeight:400,letterSpacing:8,textTransform:"uppercase",margin:0}}>Empires of Earth</h1>
      <div style={{color:"#6a7a50",fontSize:12,letterSpacing:3}}>Select Map Size</div>
      <div style={{display:"flex",gap:24}}>
        {Object.entries(MAP_SIZES).map(([k,v])=>sizeBtn(k,v,k==="small"?"🗺":k==="medium"?"🌍":"🌏"))}
      </div>
      <div onClick={()=>{setGameMode(null);}} style={{color:"#6a7a50",fontSize:9,cursor:"pointer",textDecoration:"underline",marginTop:4}}>← Back</div>
    </div>);
  }

  // === CIV SELECTION SCREEN (sequential: P1 picks, then P2 picks; skip in online mode) ===
  if(!isOnline&&(!gameStarted||!gs)){
    const civKeys=Object.keys(CIV_DEFS);
    const isAiMode = gameMode === "ai";
    const step = isAiMode ? 1 : civPickStep; // AI mode always step 1
    const currentPid = step === 1 ? "p1" : "p2";
    const picked = civPick[currentPid];
    const otherPicked = step === 2 ? civPick.p1 : null; // P1's pick is locked in step 2

    const startGame = () => {
      let p2Civ = civPick.p2;
      if (isAiMode) {
        const available = civKeys.filter(k => k !== civPick.p1);
        p2Civ = available[Math.floor(Math.random() * available.length)];
      }
      SFX.found();
      const mcFinal = buildMapConfig(mapSizePick);
      setGs(createInitialState(civPick.p1, p2Civ, mcFinal));
      setGameStarted(true);
    };

    const advanceToP2 = () => {
      SFX.click();
      setCivPickStep(2);
      // Auto-select first available civ for P2
      const avail = civKeys.filter(k => k !== civPick.p1);
      if (!avail.includes(civPick.p2)) setCivPick(prev => ({...prev, p2: avail[0]}));
    };

    const stepLabel = isAiMode ? "Choose Your Civilization" : step === 1 ? "Player 1 — Choose Your Civilization" : "Player 2 — Choose Your Civilization";

    return(<div style={{width:"100vw",minHeight:"100vh",background:"#0a0e06",display:"flex",flexDirection:"column",alignItems:"center",fontFamily:"'Palatino Linotype',serif",overflowY:"auto"}}>
      <div style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"radial-gradient(ellipse at center,#1a2a10 0%,#0a0e06 70%)",zIndex:0,pointerEvents:"none"}}/>
      <div style={{position:"relative",zIndex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:16,padding:"24px 0 32px"}}>
      <h1 style={{color:"#c8d8a0",fontSize:28,fontWeight:400,letterSpacing:8,textTransform:"uppercase",margin:0}}>Empires of Earth</h1>
      <div style={{color:"#6a7a50",fontSize:12,letterSpacing:3}}>{stepLabel}</div>
      <div style={{display:"flex",flexDirection:"column",gap:4,maxWidth:280}}>
        {civKeys.map(ck=>{const cv=CIV_DEFS[ck];const sel=picked===ck;const taken=otherPicked===ck;
          return(<div key={ck} onClick={()=>{if(!taken){SFX.click();setCivPick(prev=>({...prev,[currentPid]:ck}));}}}
            style={{padding:"6px 16px",borderRadius:6,cursor:taken?"not-allowed":"pointer",
              background:sel?"rgba(100,160,50,.3)":taken?"rgba(40,40,40,.3)":"rgba(30,40,20,.6)",
              border:`1px solid ${sel?cv.color:taken?"#333":"#3a4a2a"}`,opacity:taken?.4:1,textAlign:"left"}}>
            <div style={{color:cv.colorLight,fontSize:11,fontWeight:600,letterSpacing:1}}>{cv.name}</div>
            <div style={{color:"#6a7a50",fontSize:8,marginTop:1}}>{cv.bonus}</div>
            <div style={{color:"#4a5a3a",fontSize:7,marginTop:1}}>Capital: {cv.capital} {(()=>{const uu=Object.values(UNIT_DEFS).find(u=>u.civReq===ck);return uu?<span style={{color:"#8a9a6a"}}> · ★ {uu.name}{uu.replaces?` (${UNIT_DEFS[uu.replaces]?.name})`:""}</span>:null;})()}</div>
          </div>);})}
      </div>
      {/* Button: "Next → Player 2" for step 1 in local, or "Start" for AI / step 2 */}
      {isAiMode||step===2?(
        <button onClick={startGame}
          style={{padding:"8px 28px",borderRadius:6,fontSize:14,cursor:"pointer",border:"1px solid rgba(100,140,50,.6)",background:"rgba(100,160,50,.4)",color:"#e0f0c0",fontFamily:"inherit",letterSpacing:3,marginTop:4}}>
          {isAiMode ? "Start vs AI" : "Start Game"}
        </button>
      ):(
        <button onClick={advanceToP2}
          style={{padding:"8px 28px",borderRadius:6,fontSize:14,cursor:"pointer",border:"1px solid rgba(100,140,50,.6)",background:"rgba(100,160,50,.4)",color:"#e0f0c0",fontFamily:"inherit",letterSpacing:3,marginTop:4}}>
          Next → Player 2
        </button>
      )}
      <div style={{display:"flex",gap:16,alignItems:"center"}}>
        <div style={{color:"#3a4a2a",fontSize:9}}>Fog of War · Barbarians · Random Events</div>
        <div onClick={()=>{if(!isAiMode&&step===2){setCivPickStep(1);}else{setMapSizePick(null);}}} style={{color:"#6a7a50",fontSize:9,cursor:"pointer",textDecoration:"underline"}}>← Back</div>
      </div>
      </div>
    </div>);
  }

  // Online mode: waiting for initial state from server
  if(isOnline&&!gs){
    return(<div style={{width:"100vw",height:"100vh",background:"radial-gradient(ellipse at center,#1a2a10 0%,#0a0e06 70%)",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Palatino Linotype',serif"}}>
      <div style={{color:"#6a7a50",fontSize:14,letterSpacing:3}}>Loading game state...</div>
    </div>);
  }

  // Turn transition screen (hotseat: hide board between turns)
  if(turnTransition){
    return(<div style={{width:"100vw",height:"100vh",background:"radial-gradient(ellipse at center,#1a2a10 0%,#0a0e06 70%)",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",fontFamily:"'Palatino Linotype',serif",gap:20}}>
      <div style={{fontSize:48,marginBottom:4}}>🔄</div>
      <div style={{color:"#6a7a50",fontSize:14,letterSpacing:3,textTransform:"uppercase"}}>Pass the device to</div>
      <h1 style={{color:turnTransition.playerColorLight||"#c8d8a0",fontSize:32,letterSpacing:6,margin:0}}>{turnTransition.playerName}</h1>
      <div style={{color:"#4a5a3a",fontSize:10}}>Turn {turnNumber}</div>
      <button onClick={()=>setTurnTransition(null)}
        style={{padding:"10px 32px",borderRadius:6,fontSize:16,cursor:"pointer",border:`1px solid ${turnTransition.playerColor}80`,background:`${turnTransition.playerColor}30`,color:turnTransition.playerColorLight||"#e0f0c0",fontFamily:"inherit",letterSpacing:3,marginTop:8}}>
        Ready
      </button>
    </div>);
  }

  // Victory
  if(gs.victoryStatus){const w=players.find(p=>p.id===gs.victoryStatus.winner);if(!victoryPlayed.current){victoryPlayed.current=true;SFX.victory();}
    return(<div style={{width:"100vw",height:"100vh",background:"radial-gradient(ellipse at center,#1a2a10 0%,#0a0e06 70%)",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",fontFamily:"'Palatino Linotype',serif"}}>
      <div style={{fontSize:60,marginBottom:16}}>🏆</div>
      <h1 style={{color:w?.color||"#fff",fontSize:36,letterSpacing:6,marginBottom:8,textTransform:"uppercase"}}>{w?.name}</h1>
      <div style={{color:"#c8d8a0",fontSize:20,letterSpacing:3,marginBottom:4}}>{gs.victoryStatus.type} Victory</div>
      <div style={{color:"#6a7a50",fontSize:14}}>Turn {turnNumber}</div>
      <button onClick={()=>{setGs(null);setGameStarted(false);setGameMode(null);setMapSizePick(null);setSelU(null);setSelH(null);setAiThinking(false);setTutorialOn(true);setTutorialDismissed({});victoryPlayed.current=false;techPosRef.current={x:null,y:95};cityPosRef.current={x:null,y:95};setTechCollapsed(false);setCityCollapsed(false);setCivPickStep(1);setTurnTransition(null);setTurnPopups([]);turnPopupShownRef.current=null;prevCpId.current=null;}} style={{...btnStyle(true),marginTop:24,fontSize:14,padding:"8px 24px"}}>New Game</button>
    </div>);}

  return(
    <div ref={gameContainerRef} onMouseMove={onPanelMove} onMouseUp={onPanelUp} style={{width:"100vw",height:"100vh",background:"linear-gradient(145deg,#0a0e06 0%,#141e0c 40%,#0e1608 100%)",overflow:"hidden",position:"relative",userSelect:"none",touchAction:"none",fontFamily:"'Palatino Linotype','Book Antiqua',Palatino,serif"}}>

      {/* === MAP LAYER (below UI) === */}
      <svg ref={svgRef} onMouseDown={onMD} onMouseMove={onMM} onMouseUp={onMU} onMouseLeave={onMU} onWheel={onWh} onContextMenu={e=>e.preventDefault()} style={{cursor:"grab",position:"absolute",top:0,left:0,width:"100%",height:"100%",zIndex:1}}>
        <defs>
          <style>{`
            @keyframes unitPulse { 0%,100%{opacity:.4;} 50%{opacity:.8;} }
            @keyframes unitBob { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-2px)} }
            .unit-glow { animation: unitPulse 2s ease-in-out infinite; }
            .unit-bob { animation: unitBob 2.5s ease-in-out infinite; }
          `}</style>
          <radialGradient id="gradGrass" cx="40%" cy="35%" r="70%"><stop offset="0%" stopColor="#5a9a2a"/><stop offset="30%" stopColor="#4e8826"/><stop offset="60%" stopColor="#437520"/><stop offset="100%" stopColor="#2a5014"/></radialGradient>
          <radialGradient id="varGrass" cx="60%" cy="55%" r="55%"><stop offset="0%" stopColor="#2a4a10"/><stop offset="100%" stopColor="#3a6a1a" stopOpacity="0"/></radialGradient>
          <radialGradient id="gradForest" cx="40%" cy="35%" r="70%"><stop offset="0%" stopColor="#306828"/><stop offset="30%" stopColor="#265a1e"/><stop offset="60%" stopColor="#1e4a16"/><stop offset="100%" stopColor="#12380c"/></radialGradient>
          <radialGradient id="gradMountain" cx="40%" cy="30%" r="70%"><stop offset="0%" stopColor="#6a6555"/><stop offset="30%" stopColor="#5a5545"/><stop offset="60%" stopColor="#4a4538"/><stop offset="100%" stopColor="#35302a"/></radialGradient>
          <radialGradient id="gradWater" cx="40%" cy="35%" r="70%"><stop offset="0%" stopColor="#3578aa"/><stop offset="30%" stopColor="#2a6a9a"/><stop offset="60%" stopColor="#1e5580"/><stop offset="100%" stopColor="#0e3050"/></radialGradient>
        </defs>
        <g ref={gRef} style={{willChange:"transform"}} onMouseMove={onHexHover} onMouseLeave={onHexLeave} onClick={onHexClick} onContextMenu={onHexCtx}>{renderAll()}
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

      {/* === UI OVERLAY (above map, fixed to viewport so browser zoom can't push it off-screen) === */}
      <div ref={uiOverlayRef} style={{position:"fixed",top:0,left:0,width:"100vw",height:"100vh",zIndex:10,pointerEvents:"none"}}>

      {/* Title */}
      <div style={{position:"absolute",top:0,left:0,right:0,height:50,background:"linear-gradient(180deg,rgba(10,14,6,.95) 0%,rgba(10,14,6,0) 100%)",zIndex:10,display:"flex",alignItems:"flex-start",justifyContent:"center",paddingTop:8,pointerEvents:"none"}}>
        <div style={{textAlign:"center"}}><h1 style={{color:"#c8d8a0",fontSize:18,fontWeight:400,letterSpacing:6,textTransform:"uppercase",margin:0}}>Empires of Earth</h1>
          <div style={{color:"#6a7a50",fontSize:8,letterSpacing:3,marginTop:1}}>Turn {turnNumber} · {cp.name}</div></div></div>

      {/* End Turn button */}
      <div style={{position:"absolute",top:48,left:"50%",transform:"translateX(-50%)",zIndex:10,display:"flex",gap:6,alignItems:"center",background:"rgba(10,14,6,.85)",borderRadius:6,padding:"3px 8px",border:"1px solid rgba(100,140,50,.3)",pointerEvents:"auto"}}>
        <button onClick={endTurn} disabled={isOnline&&!onlineIsMyTurn} style={{...btnStyle(isOnline?onlineIsMyTurn:true),marginBottom:0,marginRight:0,fontSize:10,padding:"5px 16px",letterSpacing:1,cursor:(isOnline&&!onlineIsMyTurn)?"not-allowed":"pointer"}}>{isOnline&&!onlineIsMyTurn?"Waiting...":"End Turn →"}</button>
      </div>

      {/* Player panel — only show current player's info */}
      {(()=>{const p=cp;const i2=calcPlayerIncome(p,hexes,gs.mapConfig);return(
        <div style={{position:"absolute",top:12,left:14,zIndex:10,background:"rgba(10,14,6,.8)",borderRadius:6,padding:"6px 10px",border:`1px solid ${p.color}60`,minWidth:120,pointerEvents:"auto"}}>
          <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:3}}><div style={{width:7,height:7,borderRadius:"50%",background:p.color,boxShadow:`0 0 6px ${p.color}50`}}/><span style={{color:p.colorLight,fontSize:10,letterSpacing:1.5}}>{p.name}</span></div>
          <div style={{display:"flex",flexDirection:"column",gap:1,fontSize:8,color:"#a0b880"}}>
            <div>💰{p.gold} <span style={{color:"#6a7a50"}}>+{i2.gold}/t</span></div>
            <div>🔬+{i2.science}/t{p.currentResearch&&<span style={{color:"#80b0d0"}}> →{TECH_TREE[p.currentResearch.techId]?.name} ({p.currentResearch.progress}/{TECH_TREE[p.currentResearch.techId]?.cost})</span>}</div>
            <div>🌾+{i2.food}/t ⚙+{i2.production}/t</div>
            <div style={{color:"#5a6a4a"}}>🏛{p.cities.length} ⚔{p.units.length} 🗺{landOwned[p.id]||0}/{totalLand}{barbarians.length>0&&<span style={{color:"#c05050"}}> 🏴‍☠️{barbarians.length}</span>}</div>
          </div>
        </div>);})()}

      {/* Action bar */}
      <div style={{position:"absolute",top:72,left:"50%",transform:"translateX(-50%)",zIndex:10,display:"flex",gap:4,alignItems:"center",pointerEvents:"auto"}}>
        <button onClick={()=>setShowTech(!showTech)} style={btnStyle(showTech)}>🔬 Tech</button>
        <button onClick={()=>{if(!tutorialOn){setTutorialOn(true);setTutorialDismissed({});}else{setTutorialOn(false);}}} style={btnStyle(tutorialOn)}>💡 Tips</button>
        {sud?.unitType==="settler"&&<button onClick={()=>setSettlerM(settlerM?null:selU)} style={btnStyle(!!settlerM)}>🏕 Found City</button>}
        {sud?.unitType==="nuke"&&<button onClick={()=>setNukeM(nukeM?null:selU)} style={btnStyle(!!nukeM)}>☢ Launch</button>}
        {sud&&(()=>{const ui=canUpgradeUnit(sud,cp);return ui?<button onClick={()=>upgradeUnit(selU)} style={btnStyle(false)}>⬆ Upgrade → {ui.toDef.name} ({ui.cost}💰)</button>:null;})()}
        {sud&&<div style={{fontSize:9,color:"#a0b880",padding:"4px 8px",background:"rgba(10,14,6,.8)",borderRadius:4,border:"1px solid rgba(100,140,50,.3)"}}>
          {sud.def?.icon} {sud.def?.name} HP:{sud.hpCurrent}/{sud.def?.hp} Str:{sud.def?.strength}
          {sud.def?.range>0&&` Rng:${sud.def.range}`} Mv:{sud.movementCurrent}/{sud.def?.move}
          {sud.def?.domain!=="land"&&<span style={{color:"#60a0d0"}}> [{sud.def.domain}]</span>}
          {sud.hasAttacked&&<span style={{color:"#c05050"}}> [fired]</span>}
        </div>}
        {!selU&&actable.size>0&&<div style={{fontSize:8,color:"#a0e060",padding:"3px 8px",background:"rgba(10,14,6,.7)",borderRadius:4}}>Tab: cycle {actable.size} units</div>}
      </div>

      {/* Combat preview */}
      {preview&&<div style={{...panelStyle,position:"fixed",top:window.innerHeight/2-60,left:window.innerWidth/2-100,width:200,padding:8,zIndex:30,border:"1px solid #c05050",pointerEvents:"auto"}}>
        <div style={{fontSize:10,color:"#ffa0a0",marginBottom:4,textAlign:"center"}}>⚔ Combat Preview</div>
        <div style={{display:"flex",justifyContent:"space-between",fontSize:9}}>
          <div style={{color:"#a0d080"}}>{preview.an} ({preview.aStr})</div>
          <div style={{color:"#f08080"}}>{preview.dn} ({preview.dStr})</div></div>
        <div style={{display:"flex",justifyContent:"space-between",fontSize:8,marginTop:2}}>
          <div>→{preview.aDmg}dmg{preview.dblShot?" (x2)":""}</div><div>{preview.dDmg>0?`←${preview.dDmg}dmg`:"no counter"}</div></div>
        <div style={{display:"flex",justifyContent:"space-between",fontSize:8,marginTop:2,color:"#6a7a50"}}>
          <div>{preview.ahp}→{Math.max(0,preview.ahp-preview.dDmg)}</div>
          <div>{preview.dhp}→{Math.max(0,preview.dhp-preview.aDmg)}</div></div>
        <div style={{textAlign:"center",fontSize:7,color:"#5a6a4a",marginTop:3}}>Right-click to attack</div>
      </div>}

      {/* Tech tree */}
      {showTech&&(()=>{const tPos=techPosRef.current,posStyle=tPos.x!=null?{left:tPos.x,top:tPos.y}:{top:tPos.y,left:"50%",transform:"translateX(-50%)"};return(
      <div data-panel="tech" style={{...panelStyle,...posStyle,width:Math.min(720,window.innerWidth-40),maxHeight:techCollapsed?40:320,overflowY:techCollapsed?"hidden":"auto",transition:"max-height .2s ease"}}>
        <div onMouseDown={e=>onPanelDown(e,"tech")} style={{display:"flex",justifyContent:"space-between",marginBottom:techCollapsed?0:8,cursor:"grab",userSelect:"none"}}>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <button onClick={()=>setTechCollapsed(!techCollapsed)} style={{...btnStyle(false),fontSize:10,padding:"1px 5px"}}>{techCollapsed?"▸":"▾"}</button>
            <span style={{fontSize:13,color:"#c8d8a0",letterSpacing:2}}>TECHNOLOGY TREE</span></div>
          <button onClick={()=>setShowTech(false)} style={{...btnStyle(false),fontSize:10}}>✕</button></div>
        {!techCollapsed&&<div style={{display:"flex",gap:4}}>
          {ERAS.map(era=>{const techs=Object.values(TECH_TREE).filter(t=>t.era===era).sort((a,b)=>a.row-b.row);return(
            <div key={era} style={{flex:1,minWidth:90}}><div style={{fontSize:8,color:ERA_COLORS[era],letterSpacing:1,marginBottom:4,textAlign:"center",textTransform:"uppercase"}}>{era}</div>
              {techs.map(t=>{const rd=cp.researchedTechs.includes(t.id);const av=!rd&&t.prereqs.every(p2=>cp.researchedTechs.includes(p2));const isR=cp.currentResearch?.techId===t.id;
                return(<div key={t.id} style={{padding:"4px 6px",marginBottom:3,borderRadius:4,fontSize:8,background:rd?"rgba(80,160,50,.3)":isR?"rgba(80,140,200,.3)":"rgba(30,40,20,.6)",border:`1px solid ${rd?"#5a9a30":isR?"#5090c0":av?"#6a7a50":"#2a3020"}`,color:rd?"#b0d890":av?"#a0b880":"#4a5a3a",cursor:av&&!cp.currentResearch?"pointer":"default",opacity:rd||av||isR?1:.5}} onClick={()=>{if(av&&!cp.currentResearch)selResearch(t.id);}}>
                  <div style={{fontWeight:600}}>{t.name}</div><div style={{fontSize:7,color:"#6a7a50",marginTop:1}}>{rd?"✓":isR?`${cp.currentResearch.progress}/${t.cost}`:`${t.cost}🔬`}</div>
                  <div style={{fontSize:6,color:"#5a6a4a",marginTop:1}}>{t.effects[0]}</div></div>);})}</div>);})}
        </div>}</div>);})()}

      {/* City panel */}
      {showCity&&(()=>{const city=cp.cities.find(c=>c.id===showCity);if(!city)return null;const y=calcCityYields(city,cp,hexes,gs.mapConfig);const avU=getAvailableUnits(cp,city);const avD=getAvailableDistricts(cp,city);
        const cPos=cityPosRef.current,cStyle=cPos.x!=null?{left:cPos.x,top:cPos.y}:{top:cPos.y,right:14};
        return(<div data-panel="city" style={{...panelStyle,...cStyle,width:280,maxHeight:cityCollapsed?40:420,overflowY:cityCollapsed?"hidden":"auto",transition:"max-height .2s ease"}}>
          <div onMouseDown={e=>onPanelDown(e,"city")} style={{display:"flex",justifyContent:"space-between",marginBottom:cityCollapsed?0:6,cursor:"grab",userSelect:"none"}}>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <button onClick={()=>setCityCollapsed(!cityCollapsed)} style={{...btnStyle(false),fontSize:10,padding:"1px 5px"}}>{cityCollapsed?"▸":"▾"}</button>
              <span style={{fontSize:13,color:"#ffd740",letterSpacing:2}}>{city.name}</span></div>
            <button onClick={()=>setShowCity(null)} style={{...btnStyle(false),fontSize:10}}>✕</button></div>
          {!cityCollapsed&&<><div style={{fontSize:9,marginBottom:6,display:"flex",gap:8}}><span>Pop:{city.population}</span><span style={{color:"#7db840"}}>🌾{y.food}</span><span style={{color:"#b89040"}}>⚙{y.production}</span><span style={{color:"#60a0d0"}}>🔬{y.science}</span><span style={{color:"#d0c050"}}>💰{y.gold}</span></div>
          <div style={{fontSize:8,color:"#6a7a50",marginBottom:4}}>Food:{city.foodAccumulated}/{city.population*10} HP:{city.hp}/{city.hpMax||20}</div>
          {city.districts.length>0&&<div style={{fontSize:8,marginBottom:6}}><span style={{color:"#6a7a50"}}>Districts: </span>{city.districts.map(d=><span key={d} style={{color:"#a0b880",marginRight:4}}>{DISTRICT_DEFS[d]?.icon}{DISTRICT_DEFS[d]?.name}</span>)}</div>}
          {city.currentProduction?<div style={{fontSize:9,padding:"4px 8px",background:"rgba(80,120,40,.3)",borderRadius:4,marginBottom:6}}>
            Building: {city.currentProduction.type==="unit"?UNIT_DEFS[city.currentProduction.itemId]?.name:DISTRICT_DEFS[city.currentProduction.itemId]?.name}
            <span style={{color:"#6a7a50"}}> ({city.productionProgress}/{(()=>{const isU=city.currentProduction.type==="unit";const c=isU?UNIT_DEFS[city.currentProduction.itemId]?.cost:DISTRICT_DEFS[city.currentProduction.itemId]?.cost;return isU&&cp.civilization==="Germany"?Math.max(1,c-1):c;})()})</span>
            <button onClick={()=>{if(isOnline){onlineMode.sendAction({type:"CANCEL_PRODUCTION",cityId:city.id});}else{setGs(prev=>{const{state}=applyCancelProduction(prev,{cityId:city.id});return state;});}}} style={{...btnStyle(false),fontSize:7,marginLeft:6,padding:"2px 4px"}}>✕</button>
          </div>
          :<div><div style={{fontSize:9,color:"#c8d8a0",marginBottom:4}}>Build:</div>
            <div style={{fontSize:8,color:"#6a7a50",marginBottom:2}}>UNITS</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:2,marginBottom:6}}>{avU.map(u=><button key={u.id} onClick={()=>setProd(city.id,"unit",u.id)} title={`Str:${u.strength} HP:${u.hp} Mv:${u.move}${u.range?` Rng:${u.range}`:""} [${u.domain}]`} style={{...btnStyle(false),fontSize:8,padding:"3px 6px"}}>{u.icon}{u.name}<span style={{color:"#5a6a4a"}}>({u.cost}⚙)</span></button>)}</div>
            <div style={{fontSize:8,color:"#6a7a50",marginBottom:2}}>DISTRICTS</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:2}}>{avD.map(d=><button key={d.id} onClick={()=>setProd(city.id,"district",d.id)} style={{...btnStyle(false),fontSize:8,padding:"3px 6px"}}>{d.icon}{d.name}<span style={{color:"#5a6a4a"}}>({d.cost}⚙)</span></button>)}</div>
          </div>}</>}
        </div>);})()}

      {/* Legend */}
      <div style={{position:"absolute",bottom:55,left:14,zIndex:10,background:"rgba(10,14,6,.7)",borderRadius:6,padding:"5px 8px",border:"1px solid rgba(100,140,50,.2)",pointerEvents:"auto"}}>
        <div style={{color:"#6a7a50",fontSize:7,letterSpacing:2,textTransform:"uppercase",marginBottom:2}}>Terrain</div>
        {["grassland","forest","mountain","water"].map(t=><div key={t} style={{display:"flex",alignItems:"center",gap:4,fontSize:8}}><div style={{width:5,height:5,borderRadius:t==="water"?0:"50%",background:TERRAIN_INFO[t].color}}/><span style={{color:"#a0b880",width:50}}>{TERRAIN_INFO[t].label}</span><span style={{color:"#6a7a50"}}>{TERRAIN_INFO[t].moveCost!=null?`mv${TERRAIN_INFO[t].moveCost}`:"—"}{TERRAIN_INFO[t].defBonus?` +${TERRAIN_INFO[t].defBonus}def`:""}</span><span style={{color:"#4a5a3a"}}>({tCounts[t]})</span></div>)}
      </div>

      {/* Log */}
      <div style={{position:"absolute",bottom:55,right:14,zIndex:10,background:"rgba(10,14,6,.7)",borderRadius:6,padding:"5px 8px",border:"1px solid rgba(100,140,50,.2)",maxWidth:240,maxHeight:110,overflowY:"auto",pointerEvents:"auto"}}>
        <div style={{color:"#6a7a50",fontSize:7,letterSpacing:2,textTransform:"uppercase",marginBottom:2}}>Log</div>
        {(log||[]).slice(-10).map((l,i)=><div key={i} style={{fontSize:7,color:l.includes("☠")||l.includes("captured")||l.includes("☢")?"#e07070":l.includes("built")||l.includes("researched")||l.includes("founded")?"#80c060":"#7a8a60",marginBottom:1}}>{l}</div>)}
      </div>

      {/* Bottom info */}
      <div style={{position:"absolute",bottom:0,left:0,right:0,height:48,background:"linear-gradient(0deg,rgba(10,14,6,.95) 0%,rgba(10,14,6,0) 100%)",zIndex:10,display:"flex",alignItems:"flex-end",justifyContent:"center",paddingBottom:8,pointerEvents:"none"}}>
        {selH!=null&&hexes[selH]?(()=>{const sd=hexes[selH],si=TERRAIN_INFO[sd.terrainType];const uH=unitMap[`${sd.col},${sd.row}`]||[];const oP=sd.ownerPlayerId?players.find(p=>p.id===sd.ownerPlayerId):null;
          return(<div style={{background:"rgba(15,25,10,.9)",border:"1px solid rgba(100,140,50,.3)",borderRadius:8,padding:"5px 16px",color:"#a0b880",fontSize:9,letterSpacing:1,display:"flex",gap:10,alignItems:"center"}}>
            <span style={{color:"#c8d8a0",fontWeight:600}}>({sd.col},{sd.row})</span><span style={{color:si.color}}>{si.label}</span>
            {sd.resource&&<span>{RESOURCE_INFO[sd.resource].icon}{RESOURCE_INFO[sd.resource].label}</span>}
            <span style={{color:"#7db840"}}>F{si.food}</span><span style={{color:"#b89040"}}>P{si.prod}</span>
            <span style={{color:si.moveCost!=null?"#a0b880":"#c05050"}}>{si.moveCost!=null?`Mv${si.moveCost}`:"—"}</span>
            {si.defBonus>0&&<span style={{color:"#60a0d0"}}>+{si.defBonus}def</span>}
            {uH.length>0&&<span style={{color:"#ffd740"}}>{uH.map(u=>UNIT_DEFS[u.unitType]?.icon).join("")}</span>}
            {oP&&<span style={{color:oP.colorLight}}>⚑{oP.name.slice(0,6)}</span>}
          </div>);})():(<span style={{color:"#3a4a2a",fontSize:9,letterSpacing:2}}>Tab=cycle Esc=deselect RightClick=move/attack</span>)}
      </div>

      {settlerM&&<div style={{position:"absolute",bottom:52,left:"50%",transform:"translateX(-50%)",zIndex:20,background:"rgba(40,80,20,.9)",border:"1px solid #40e040",borderRadius:6,padding:"6px 16px",color:"#a0f0a0",fontSize:10,pointerEvents:"auto"}}>🏕 Click land hex to found city · <span style={{cursor:"pointer",color:"#f08080"}} onClick={()=>setSettlerM(null)}>Cancel</span></div>}
      {nukeM&&<div style={{position:"absolute",bottom:52,left:"50%",transform:"translateX(-50%)",zIndex:20,background:"rgba(80,40,0,.9)",border:"1px solid #ffa000",borderRadius:6,padding:"6px 16px",color:"#ffd080",fontSize:10,pointerEvents:"auto"}}>☢ Click target for nuclear strike (1-hex blast) · <span style={{cursor:"pointer",color:"#f08080"}} onClick={()=>setNukeM(null)}>Cancel</span></div>}
      {moveMsg&&<div style={{position:"absolute",bottom:52,left:"50%",transform:"translateX(-50%)",zIndex:20,background:"rgba(80,20,10,.92)",border:"1px solid rgba(240,100,60,.6)",borderRadius:6,padding:"6px 16px",color:"#ffa080",fontSize:10,pointerEvents:"none"}}>⚠ {moveMsg}</div>}

      {/* AI thinking overlay */}
      {aiThinking&&<div style={{position:"absolute",inset:0,zIndex:40,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(5,8,3,.6)",pointerEvents:"all"}}>
        <div style={{background:"rgba(15,20,10,.95)",border:"2px solid rgba(100,140,50,.5)",borderRadius:12,padding:"24px 40px",textAlign:"center",boxShadow:"0 0 40px rgba(80,120,40,.2)"}}>
          <div style={{fontSize:28,marginBottom:8,animation:"pulse 1.5s ease-in-out infinite"}}>🤖</div>
          <div style={{color:"#c8d8a0",fontSize:16,fontWeight:600,letterSpacing:3}}>AI is thinking...</div>
          <div style={{color:"#6a7a50",fontSize:10,marginTop:6}}>The enemy plots its next move</div>
        </div>
      </div>}

      {/* Online: waiting for opponent's turn */}
      {isOnline&&!onlineIsMyTurn&&!gs?.victoryStatus&&<div style={{position:"absolute",top:8,right:14,zIndex:30,background:"rgba(10,14,6,.9)",border:"1px solid rgba(200,160,60,.4)",borderRadius:8,padding:"8px 16px",pointerEvents:"none"}}>
        <div style={{color:"#d0c060",fontSize:11,letterSpacing:2}}>⏳ Opponent's Turn</div>
      </div>}

      {/* Online: opponent disconnected */}
      {isOnline&&onlineMode.opponentDisconnected&&<div style={{position:"absolute",top:8,right:14,zIndex:35,background:"rgba(40,10,10,.95)",border:"1px solid rgba(200,60,60,.5)",borderRadius:8,padding:"8px 16px",pointerEvents:"none"}}>
        <div style={{color:"#ff8080",fontSize:11,letterSpacing:2}}>⚠ Opponent Disconnected</div>
        <div style={{color:"#a05050",fontSize:9,marginTop:2}}>Waiting for reconnect...</div>
      </div>}

      {/* Online: server error */}
      {isOnline&&onlineMode.error&&<div style={{position:"absolute",top:48,right:14,zIndex:35,background:"rgba(40,10,10,.9)",border:"1px solid rgba(200,60,60,.4)",borderRadius:6,padding:"6px 12px",pointerEvents:"none"}}>
        <div style={{color:"#ff6060",fontSize:10}}>{onlineMode.error}</div>
      </div>}

      {/* Turn-start popup queue */}
      {turnPopups.length>0&&<div style={{position:"absolute",top:90,left:"50%",transform:"translateX(-50%)",zIndex:35,display:"flex",flexDirection:"column",gap:8,alignItems:"center",pointerEvents:"auto"}}>
        {turnPopups.map((popup,pi)=><div key={popup.id} style={{background:popup.type==="event"?"rgba(30,18,6,.96)":popup.type==="tech"?"rgba(6,14,30,.96)":"rgba(10,20,10,.96)",border:`2px solid ${popup.type==="event"?"#d0a040":popup.type==="tech"?"#40a0d0":"#60c060"}`,borderRadius:10,padding:"12px 24px",color:popup.type==="event"?"#ffd080":popup.type==="tech"?"#a0d8f0":"#a0e0a0",textAlign:"center",boxShadow:`0 0 25px ${popup.type==="event"?"rgba(200,160,40,.3)":popup.type==="tech"?"rgba(60,160,220,.3)":"rgba(60,180,60,.3)"}`,minWidth:240,maxWidth:320,cursor:popup.action?"pointer":"default"}} onClick={()=>{
          if(popup.action==="tech"){setShowTech(true);}
          if(popup.action==="city"&&popup.cityId){setShowCity(popup.cityId);}
          setTurnPopups(prev=>prev.filter(p2=>p2.id!==popup.id));
        }}>
          <div style={{fontSize:13,fontWeight:600,letterSpacing:2,marginBottom:4}}>{popup.title}</div>
          <div style={{fontSize:10,opacity:.8}}>{popup.body}</div>
          {popup.action&&<div style={{fontSize:8,marginTop:6,opacity:.6,letterSpacing:1}}>Click to open</div>}
          {!popup.action&&<button onClick={e=>{e.stopPropagation();setTurnPopups(prev=>prev.filter(p2=>p2.id!==popup.id));}} style={{...btnStyle(false),marginTop:6,fontSize:8}}>OK</button>}
        </div>)}
      </div>}

      {/* Tutorial tip cards */}
      {tutorialOn && gs && !aiThinking && (() => {
        // Build extra context for conditional tips
        const extra = {
          selectedUnitNearEnemy: sud && op && op.units.some(eu => hexDist(sud.hexCol, sud.hexRow, eu.hexCol, eu.hexRow) <= (sud.def?.range || 1)),
          hasSettlerSelected: sud?.unitType === "settler",
        };

        // Find the first active tip that hasn't been dismissed
        const activeTip = TUTORIAL_TIPS.find(tip =>
          !tutorialDismissed[tip.id] && tip.trigger(gs, tutorialDismissed, extra)
        );
        if (!activeTip) return null;

        const posStyles = {
          center: { top: "50%", left: "50%", transform: "translate(-50%, -50%)" },
          top: { top: 100, left: "50%", transform: "translateX(-50%)" },
          bottom: { bottom: 80, left: "50%", transform: "translateX(-50%)" },
        };
        const pos = posStyles[activeTip.position] || posStyles.center;

        return (
          <div style={{
            position: "absolute", ...pos, zIndex: 35, pointerEvents: "auto",
            background: "rgba(12, 18, 8, .96)",
            border: "1px solid rgba(120, 170, 60, .5)",
            borderRadius: 10, padding: "16px 22px",
            color: "#b8d098", maxWidth: 340, minWidth: 240,
            boxShadow: "0 4px 24px rgba(0,0,0,.5), 0 0 20px rgba(80,120,40,.15)",
            fontFamily: "'Palatino Linotype', serif",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 20 }}>{activeTip.icon}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#d0e8a0", letterSpacing: 1.5 }}>{activeTip.title}</span>
            </div>
            <div style={{ fontSize: 11, lineHeight: 1.5, color: "#98b078", marginBottom: 12 }}>
              {activeTip.body}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <button
                onClick={() => setTutorialDismissed(prev => ({ ...prev, [activeTip.id]: true }))}
                style={{
                  padding: "5px 14px", borderRadius: 5, fontSize: 10, cursor: "pointer",
                  border: "1px solid rgba(120,170,60,.5)", background: "rgba(100,160,50,.35)",
                  color: "#d0e8a0", fontFamily: "inherit", letterSpacing: 1,
                }}>
                Got it
              </button>
              <span
                onClick={() => setTutorialOn(false)}
                style={{ fontSize: 9, color: "#5a6a4a", cursor: "pointer", textDecoration: "underline" }}>
                Skip all tips
              </span>
            </div>
          </div>
        );
      })()}

      {/* Minimap */}
      <div style={{position:"absolute",bottom:175,right:14,zIndex:15,background:"rgba(10,14,6,.92)",border:"1px solid rgba(100,140,50,.4)",borderRadius:6,padding:4,pointerEvents:"auto"}} onMouseDown={e=>e.stopPropagation()}>
        <canvas ref={minimapRef} width={MINIMAP_W} height={MINIMAP_H}
          onMouseDown={onMinimapDown} onMouseMove={onMinimapMove} onMouseUp={onMinimapUp} onMouseLeave={onMinimapUp}
          style={{display:"block",cursor:"crosshair",borderRadius:3,border:"1px solid rgba(100,140,50,.2)"}}/>
        <div style={{fontSize:7,color:"#5a6a40",marginTop:2,textAlign:"center",letterSpacing:2}}>MINIMAP</div>
      </div>

      </div>{/* close UI overlay */}
    </div>
  );
}

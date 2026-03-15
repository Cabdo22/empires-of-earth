// ============================================================
// SVG ICONS — resource & unit symbols drawn as paths
// ============================================================

import React from "react";
import { UNIT_DEFS } from '../data/units.js';

export const ResourceIcon = ({ type, x, y, s }) => {
  const sz = s || 14;
  if (type === "wheat") return (
    <g transform={`translate(${x},${y})`}>
      <ellipse cx={0} cy={-2} rx={sz * .3} ry={sz * .55} fill="#daa520" stroke="#b8860b" strokeWidth=".7" />
      <line x1={0} y1={sz * .4} x2={0} y2={-sz * .1} stroke="#8b7a40" strokeWidth="1.2" />
      {[-2, 0, 2].map(i => <line key={i} x1={i * 2} y1={-sz * .15 + i} x2={i * 2 + 1} y2={-sz * .35 + i} stroke="#daa520" strokeWidth=".8" />)}
    </g>
  );
  if (type === "iron") return (
    <g transform={`translate(${x},${y})`}>
      <polygon points={`0,${-sz * .5} ${sz * .35},${sz * .15} ${-sz * .35},${sz * .15}`} fill="#8a8a8a" stroke="#5a5a5a" strokeWidth=".8" />
      <rect x={-1} y={sz * .1} width={2} height={sz * .4} fill="#6a5a3a" rx=".5" />
    </g>
  );
  if (type === "oil") return (
    <g transform={`translate(${x},${y})`}>
      <rect x={-sz * .25} y={-sz * .35} width={sz * .5} height={sz * .6} rx={sz * .12} fill="#2a2a2a" stroke="#1a1a1a" strokeWidth=".6" />
      <ellipse cx={0} cy={-sz * .35} rx={sz * .25} ry={sz * .08} fill="#3a3a3a" />
      <circle cx={0} cy={sz * .4} r={sz * .25} fill="#1a1a2a" opacity=".6" />
    </g>
  );
  if (type === "uranium") return (
    <g transform={`translate(${x},${y})`}>
      <circle cx={0} cy={0} r={sz * .35} fill="#2a4a2a" stroke="#40ff40" strokeWidth=".8" opacity=".9" />
      <circle cx={0} cy={0} r={sz * .15} fill="#40ff40" opacity=".7" />
      {[0, 120, 240].map(a => <line key={a} x1={0} y1={0} x2={sz * .3 * Math.cos(a * Math.PI / 180)} y2={sz * .3 * Math.sin(a * Math.PI / 180)} stroke="#40ff40" strokeWidth=".8" opacity=".6" />)}
    </g>
  );
  if (type === "fish") return (
    <g transform={`translate(${x},${y})`}>
      <ellipse cx={0} cy={0} rx={sz * .4} ry={sz * .22} fill="#4a90c8" stroke="#2a6898" strokeWidth=".8" />
      <polygon points={`${sz * .35},0 ${sz * .55},${-sz * .18} ${sz * .55},${sz * .18}`} fill="#4a90c8" stroke="#2a6898" strokeWidth=".6" />
      <circle cx={-sz * .15} cy={-sz * .05} r={sz * .06} fill="#1a3a5a" />
    </g>
  );
  return null;
};

export const UnitIcon = ({ unitType, x, y, fg, sz }) => {
  const s = sz || 13;
  const bg = fg + "30";
  const g2 = (ch) => <g transform={`translate(${x},${y})`}>{ch}</g>;
  switch (unitType) {
    case "scout": return g2(<><circle cx={0} cy={-s * .1} r={s * .35} fill={bg} stroke={fg} strokeWidth="1.5" /><circle cx={-s * .1} cy={-s * .15} r={s * .1} fill={fg} /><circle cx={s * .1} cy={-s * .15} r={s * .1} fill={fg} /><path d={`M${-s * .15},${s * .05}Q0,${s * .15},${s * .15},${s * .05}`} fill="none" stroke={fg} strokeWidth="1" /><line x1={0} y1={s * .25} x2={0} y2={s * .5} stroke={fg} strokeWidth="1.3" /><line x1={-s * .15} y1={s * .4} x2={s * .15} y2={s * .4} stroke={fg} strokeWidth="1" /></>);
    case "warrior": return g2(<><rect x={-s * .2} y={-s * .15} width={s * .4} height={s * .55} rx={s * .06} fill={bg} stroke={fg} strokeWidth="1.3" /><circle cx={0} cy={-s * .3} r={s * .22} fill={bg} stroke={fg} strokeWidth="1.3" /><line x1={-s * .4} y1={-s * .05} x2={-s * .15} y2={-s * .2} stroke={fg} strokeWidth="1.8" /><line x1={-s * .4} y1={-s * .05} x2={-s * .42} y2={-s * .25} stroke={fg} strokeWidth="1.5" /><line x1={s * .2} y1={0} x2={s * .35} y2={s * .15} stroke={fg} strokeWidth="1.3" /></>);
    case "settler": return g2(<><rect x={-s * .3} y={-s * .2} width={s * .6} height={s * .45} rx={s * .1} fill={bg} stroke={fg} strokeWidth="1.3" /><line x1={0} y1={-s * .2} x2={0} y2={-s * .5} stroke={fg} strokeWidth="1.2" /><polygon points={`${s * .02},${-s * .5} ${s * .28},${-s * .38} ${s * .02},${-s * .26}`} fill={fg} opacity=".8" /><circle cx={-s * .15} cy={s * .0} r={s * .05} fill={fg} opacity=".5" /><circle cx={s * .15} cy={s * .0} r={s * .05} fill={fg} opacity=".5" /></>);
    case "archer": case "chu_ko_nu": return g2(<><path d={`M${-s * .15},${-s * .5}Q${-s * .45},0,${-s * .15},${s * .5}`} fill="none" stroke={fg} strokeWidth="1.5" /><line x1={-s * .15} y1={-s * .4} x2={-s * .15} y2={s * .4} stroke={fg} strokeWidth="1.2" /><line x1={-s * .1} y1={0} x2={s * .45} y2={-s * .05} stroke={fg} strokeWidth="1.3" /><polygon points={`${s * .45},${-s * .05} ${s * .3},${-s * .15} ${s * .32},${s * .05}`} fill={fg} />{unitType === "chu_ko_nu" && <><line x1={-s * .1} y1={s * .18} x2={s * .38} y2={s * .13} stroke={fg} strokeWidth="1" opacity=".8" /><polygon points={`${s * .38},${s * .13} ${s * .25},${s * .05} ${s * .27},${s * .22}`} fill={fg} opacity=".7" /></>}</>);
    case "swordsman": case "legionary": return g2(<><line x1={0} y1={-s * .55} x2={0} y2={s * .1} stroke={fg} strokeWidth="2" /><line x1={-s * .22} y1={-s * .35} x2={s * .22} y2={-s * .35} stroke={fg} strokeWidth="1.8" /><ellipse cx={0} cy={s * .3} rx={s * .32} ry={s * .22} fill={bg} stroke={fg} strokeWidth="1.3" /><line x1={0} y1={s * .1} x2={0} y2={s * .5} stroke={fg} strokeWidth="1" />{unitType === "legionary" && <><line x1={-s * .32} y1={s * .3} x2={s * .32} y2={s * .3} stroke={fg} strokeWidth="1" /><circle cx={0} cy={s * .3} r={s * .06} fill={fg} /></>}</>);
    case "knight": case "war_chariot": return g2(<><ellipse cx={0} cy={s * .08} rx={s * .35} ry={s * .25} fill={bg} stroke={fg} strokeWidth="1.3" /><path d={`M${-s * .18},${-s * .18}Q0,${-s * .58},${s * .18},${-s * .18}`} fill="none" stroke={fg} strokeWidth="1.3" /><path d={`M${s * .18},${-s * .18}L${s * .28},${-s * .3}`} fill="none" stroke={fg} strokeWidth="1" /><circle cx={s * .18} cy={-s * .12} r={s * .07} fill={fg} /><line x1={-s * .35} y1={s * .33} x2={s * .35} y2={s * .33} stroke={fg} strokeWidth="1" />{unitType === "war_chariot" && <><circle cx={-s * .3} cy={s * .38} r={s * .08} fill="none" stroke={fg} strokeWidth="1" /><circle cx={s * .3} cy={s * .38} r={s * .08} fill="none" stroke={fg} strokeWidth="1" /></>}</>);
    case "catapult": case "great_bombard": return g2(<><line x1={-s * .35} y1={s * .3} x2={s * .35} y2={s * .3} stroke={fg} strokeWidth="1.8" /><path d={`M${-s * .25},${s * .3}L${-s * .05},${-s * .2}L${s * .1},${-s * .3}`} fill="none" stroke={fg} strokeWidth="1.5" /><circle cx={s * .15} cy={-s * .25} r={s * .18} fill={unitType === "great_bombard" ? bg : "none"} stroke={fg} strokeWidth="1.2" />{unitType === "great_bombard" && <circle cx={s * .15} cy={-s * .25} r={s * .08} fill={fg} />}<circle cx={-s * .25} cy={s * .35} r={s * .06} fill={fg} opacity=".6" /><circle cx={s * .25} cy={s * .35} r={s * .06} fill={fg} opacity=".6" /></>);
    case "tank": case "panzer": return g2(<><rect x={-s * .42} y={-s * .12} width={s * .84} height={s * .38} rx={s * .1} fill={bg} stroke={fg} strokeWidth="1.5" /><path d={`M${-s * .42},${s * .15}L${-s * .48},${s * .26}L${s * .48},${s * .26}L${s * .42},${s * .15}`} fill="none" stroke={fg} strokeWidth="1" opacity=".6" /><rect x={-s * .15} y={-s * .38} width={s * .6} height={s * .26} rx={s * .06} fill={bg} stroke={fg} strokeWidth="1.2" /><line x1={s * .35} y1={-s * .25} x2={s * .55} y2={-s * .32} stroke={fg} strokeWidth="1.5" /><circle cx={s * .55} cy={-s * .32} r={s * .04} fill={fg} />{unitType === "panzer" && <><line x1={-s * .42} y1={s * .08} x2={s * .42} y2={s * .08} stroke={fg} strokeWidth=".8" strokeDasharray="2 2" /><path d={`M${-s * .35},${-s * .25}L${-s * .15},${-s * .25}`} stroke={fg} strokeWidth="1.5" /></>}</>);
    case "musketman": case "musketeer": return g2(<><line x1={-s * .08} y1={-s * .55} x2={-s * .08} y2={s * .2} stroke={fg} strokeWidth="1.8" /><rect x={-s * .18} y={s * .08} width={s * .28} height={s * .18} rx={s * .04} fill={bg} stroke={fg} strokeWidth="1" /><circle cx={-s * .08} cy={-s * .55} r={s * .05} fill={fg} /><path d={`M${-s * .08},${-s * .35}L${-s * .25},${-s * .25}`} stroke={fg} strokeWidth="1.2" />{unitType === "musketeer" && <><line x1={s * .12} y1={-s * .35} x2={s * .32} y2={-s * .1} stroke={fg} strokeWidth="1.5" /><line x1={s * .32} y1={-s * .1} x2={s * .25} y2={-s * .05} stroke={fg} strokeWidth="1" /></>}</>);
    case "modern_infantry": case "marine": return g2(<><circle cx={0} cy={-s * .32} r={s * .2} fill={bg} stroke={fg} strokeWidth="1.3" /><line x1={0} y1={-s * .12} x2={0} y2={s * .28} stroke={fg} strokeWidth="1.5" /><line x1={-s * .3} y1={s * .02} x2={s * .3} y2={s * .02} stroke={fg} strokeWidth="1.3" /><line x1={s * .3} y1={s * .02} x2={s * .4} y2={-s * .15} stroke={fg} strokeWidth="1.2" /><line x1={-s * .15} y1={s * .28} x2={-s * .25} y2={s * .5} stroke={fg} strokeWidth="1.3" /><line x1={s * .15} y1={s * .28} x2={s * .25} y2={s * .5} stroke={fg} strokeWidth="1.3" />{unitType === "marine" && <><path d={`M${-s * .15},${-s * .48}L0,${-s * .55}L${s * .15},${-s * .48}`} fill="none" stroke={fg} strokeWidth="1.2" /><circle cx={0} cy={-s * .32} r={s * .06} fill={fg} /></>}</>);
    case "galley": return g2(<><path d={`M${-s * .42},${s * .1}Q0,${s * .45},${s * .42},${s * .1}`} fill={bg} stroke={fg} strokeWidth="1.5" /><line x1={0} y1={s * .05} x2={0} y2={-s * .4} stroke={fg} strokeWidth="1.3" /><polygon points={`0,${-s * .4} ${s * .28},${-s * .1} 0,${-s * .08}`} fill={fg} opacity=".6" /><line x1={-s * .3} y1={s * .15} x2={s * .3} y2={s * .15} stroke={fg} strokeWidth=".8" opacity=".5" /></>);
    case "destroyer": case "man_o_war": return g2(<><path d={`M${-s * .42},${s * .05}L${-s * .32},${s * .22}L${s * .32},${s * .22}L${s * .42},${s * .05}Z`} fill={bg} stroke={fg} strokeWidth="1.3" /><line x1={0} y1={s * .05} x2={0} y2={-s * .42} stroke={fg} strokeWidth="1.5" />{unitType === "man_o_war" ? <><polygon points={`0,${-s * .42} ${s * .32},${-s * .2} 0,${-s * .15}`} fill={fg} opacity=".5" /><polygon points={`0,${-s * .15} ${s * .28},${s * .0} 0,${s * .05}`} fill={fg} opacity=".35" /><line x1={-s * .15} y1={s * .05} x2={-s * .15} y2={-s * .3} stroke={fg} strokeWidth="1" /></> : <><polygon points={`0,${-s * .42} ${s * .32},${-s * .15} 0,${s * .05}`} fill={fg} opacity=".5" /><circle cx={-s * .15} cy={s * .12} r={s * .04} fill={fg} opacity=".6" /><circle cx={s * .15} cy={s * .12} r={s * .04} fill={fg} opacity=".6" /></>}</>);
    case "battleship": return g2(<><rect x={-s * .42} y={-s * .08} width={s * .84} height={s * .28} rx={s * .08} fill={bg} stroke={fg} strokeWidth="1.5" /><line x1={-s * .12} y1={-s * .08} x2={-s * .12} y2={-s * .38} stroke={fg} strokeWidth="1.8" /><line x1={s * .15} y1={-s * .08} x2={s * .15} y2={-s * .32} stroke={fg} strokeWidth="1.3" /><circle cx={-s * .12} cy={-s * .38} r={s * .07} fill={fg} /><line x1={-s * .35} y1={s * .08} x2={-s * .25} y2={s * .08} stroke={fg} strokeWidth="2" /><line x1={s * .25} y1={s * .08} x2={s * .35} y2={s * .08} stroke={fg} strokeWidth="2" /></>);
    case "fighter": return g2(<><line x1={0} y1={-s * .55} x2={0} y2={s * .42} stroke={fg} strokeWidth="1.8" /><polygon points={`${-s * .48},${s * .08} ${0},${-s * .05} ${s * .48},${s * .08} ${0},${s * .02}`} fill={bg} stroke={fg} strokeWidth="1" /><line x1={-s * .22} y1={s * .38} x2={s * .22} y2={s * .38} stroke={fg} strokeWidth="1.2" /><polygon points={`0,${-s * .55} ${-s * .1},${-s * .38} ${s * .1},${-s * .38}`} fill={fg} /></>);
    case "bomber": return g2(<><ellipse cx={0} cy={0} rx={s * .18} ry={s * .42} fill={bg} stroke={fg} strokeWidth="1.5" /><polygon points={`${-s * .48},${s * .02} ${0},${-s * .08} ${s * .48},${s * .02} ${0},${s * .05}`} fill={bg} stroke={fg} strokeWidth="1" /><line x1={-s * .22} y1={s * .38} x2={s * .22} y2={s * .38} stroke={fg} strokeWidth="1.2" /><circle cx={0} cy={s * .28} r={s * .1} fill={fg} opacity=".7" /><circle cx={0} cy={-s * .3} r={s * .06} fill={fg} /></>);
    case "artillery": return g2(<><rect x={-s * .35} y={s * .1} width={s * .7} height={s * .2} rx={s * .05} fill={bg} stroke={fg} strokeWidth="1.2" /><line x1={-s * .15} y1={s * .1} x2={s * .25} y2={-s * .4} stroke={fg} strokeWidth="2" /><circle cx={s * .28} cy={-s * .42} r={s * .08} fill={fg} /><circle cx={-s * .25} cy={s * .32} r={s * .1} fill="none" stroke={fg} strokeWidth="1" /><circle cx={s * .25} cy={s * .32} r={s * .1} fill="none" stroke={fg} strokeWidth="1" /></>);
    case "mech": return g2(<><rect x={-s * .25} y={-s * .15} width={s * .5} height={s * .5} rx={s * .06} fill={bg} stroke={fg} strokeWidth="1.5" /><rect x={-s * .18} y={-s * .42} width={s * .36} height={s * .27} rx={s * .05} fill={bg} stroke={fg} strokeWidth="1.2" /><circle cx={-s * .08} cy={-s * .32} r={s * .05} fill={fg} /><circle cx={s * .08} cy={-s * .32} r={s * .05} fill={fg} /><line x1={-s * .25} y1={s * .0} x2={-s * .42} y2={-s * .15} stroke={fg} strokeWidth="1.5" /><line x1={s * .25} y1={s * .0} x2={s * .42} y2={-s * .15} stroke={fg} strokeWidth="1.5" /><line x1={-s * .15} y1={s * .35} x2={-s * .2} y2={s * .55} stroke={fg} strokeWidth="1.5" /><line x1={s * .15} y1={s * .35} x2={s * .2} y2={s * .55} stroke={fg} strokeWidth="1.5" /></>);
    case "nuke": return g2(<><circle cx={0} cy={-s * .1} r={s * .35} fill={bg} stroke={fg} strokeWidth="1.3" /><path d={`M${-s * .18},${-s * .18}L0,${-s * .4}L${s * .18},${-s * .18}`} fill="none" stroke={fg} strokeWidth="1.2" /><path d={`M${-s * .18},${s * .0}L0,${s * .22}L${s * .18},${s * .0}`} fill="none" stroke={fg} strokeWidth="1.2" /><path d={`M0,${-s * .1}L${-s * .22},${-s * .1}`} fill="none" stroke={fg} strokeWidth="1" /><path d={`M0,${-s * .1}L${s * .22},${-s * .1}`} fill="none" stroke={fg} strokeWidth="1" /><circle cx={0} cy={-s * .1} r={s * .1} fill={fg} /></>);
    case "jaguar": return g2(<><circle cx={0} cy={-s * .25} r={s * .25} fill={bg} stroke={fg} strokeWidth="1.3" /><circle cx={-s * .1} cy={-s * .28} r={s * .05} fill={fg} /><circle cx={s * .1} cy={-s * .28} r={s * .05} fill={fg} /><path d={`M${-s * .06},${-s * .18}L0,${-s * .14}L${s * .06},${-s * .18}`} fill="none" stroke={fg} strokeWidth="1" /><path d={`M${-s * .2},${-s * .45}L${-s * .15},${-s * .5}L${-s * .1},${-s * .45}`} fill={fg} opacity=".6" /><path d={`M${s * .1},${-s * .45}L${s * .15},${-s * .5}L${s * .2},${-s * .45}`} fill={fg} opacity=".6" /><line x1={0} y1={-s * .0} x2={0} y2={s * .25} stroke={fg} strokeWidth="1.5" /><line x1={-s * .28} y1={s * .08} x2={s * .28} y2={s * .08} stroke={fg} strokeWidth="1.3" /><path d={`M${s * .18},${s * .25}Q${s * .35},${s * .18},${s * .42},${s * .32}`} fill="none" stroke={fg} strokeWidth="1.2" /></>);
    default: return g2(<text x={0} y={s * .15} textAnchor="middle" dominantBaseline="middle" fill={fg} fontSize={s * 1.2} style={{ pointerEvents: "none" }}>{UNIT_DEFS[unitType]?.icon || "?"}</text>);
  }
};

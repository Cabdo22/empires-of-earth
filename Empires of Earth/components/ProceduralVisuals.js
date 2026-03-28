// ============================================================
// PROCEDURAL TERRAIN VISUALS — SVG path generators
// ============================================================

import { HEX_SIZE, hexAt, getNeighbors, EVEN_COL_NEIGHBORS, ODD_COL_NEIGHBORS } from '../data/constants.js';

export const genGrass = (id) => {
  const s = id * 137 + 29;
  let blades = "", flowers = "", rocks = "";
  for (let i = 0; i < 30; i++) {
    const v = (s + i * 73 + i * i * 17) % 10000;
    const a = ((v % 360) * Math.PI) / 180, d2 = ((v * 7 + 31) % 100) / 100;
    const r = d2 * (HEX_SIZE - 10), x = r * Math.cos(a), y = r * Math.sin(a);
    if (Math.abs(x) < HEX_SIZE * .75 && Math.abs(y) < HEX_SIZE * .72) {
      const h = 3 + ((v * 3 + 7) % 8), lean = (((v * 11 + 3) % 9) - 4) * .5;
      blades += `M${x.toFixed(1)},${y.toFixed(1)}Q${(x + lean * 2).toFixed(1)},${(y - h * .6).toFixed(1)},${(x + lean).toFixed(1)},${(y - h).toFixed(1)}`;
    }
  }
  for (let i = 0; i < 4; i++) {
    const v = (s + i * 131 + 77) % 10000;
    const a = ((v % 360) * Math.PI) / 180, d2 = ((v * 11 + 41) % 80) / 100;
    const r2 = d2 * (HEX_SIZE - 18), fx = r2 * Math.cos(a), fy = r2 * Math.sin(a);
    if (Math.abs(fx) < HEX_SIZE * .6 && Math.abs(fy) < HEX_SIZE * .6) {
      const fr = 1.2 + ((v * 3) % 3) * .4;
      flowers += `M${fx.toFixed(1)},${(fy - fr).toFixed(1)}A${fr},${fr},0,1,1,${fx.toFixed(1)},${(fy + fr).toFixed(1)}A${fr},${fr},0,1,1,${fx.toFixed(1)},${(fy - fr).toFixed(1)}`;
    }
  }
  for (let i = 0; i < 2; i++) {
    const v = (s + i * 199 + 53) % 10000;
    const rx = -18 + ((v * 7) % 36), ry = -6 + ((v * 11) % 20), rw = 3 + ((v * 3) % 4), rh = 1.5 + ((v * 5) % 2);
    rocks += `M${rx},${ry}L${rx + rw * .3},${ry - rh}L${rx + rw * .7},${ry - rh}L${rx + rw},${ry}Z`;
  }
  return { blades, flowers, rocks };
};

export const genTrees = (id) => {
  const s = id * 193 + 47;
  let tr = "", ca = "", under = "";
  for (let i = 0; i < 10; i++) {
    const v = (s + i * 83 + i * i * 19) % 10000;
    const a = ((v % 360) * Math.PI) / 180, d2 = ((v * 7 + 21) % 85) / 100;
    const r = d2 * (HEX_SIZE - 12), x = r * Math.cos(a), y = r * Math.sin(a);
    if (Math.abs(x) < HEX_SIZE * .7 && Math.abs(y) < HEX_SIZE * .65) {
      const h = 9 + ((v * 3) % 9);
      tr += `M${x.toFixed(1)},${y.toFixed(1)}L${x.toFixed(1)},${(y - h).toFixed(1)}`;
      const cw = 4 + ((v * 7) % 5), layers = 2 + ((v * 13) % 2);
      for (let L = 0; L < layers; L++) {
        const ly = y - h + 2 + L * 3, lw = cw - L * 1.2;
        if (lw > 1) ca += `M${(x - lw).toFixed(1)},${ly.toFixed(1)}L${x.toFixed(1)},${(ly - lw - 1).toFixed(1)}L${(x + lw).toFixed(1)},${ly.toFixed(1)}Z`;
      }
    }
  }
  for (let i = 0; i < 6; i++) {
    const v = (s + i * 109 + 31) % 10000;
    const a = ((v % 360) * Math.PI) / 180, d2 = ((v * 9 + 11) % 80) / 100;
    const r2 = d2 * (HEX_SIZE - 16), ux = r2 * Math.cos(a), uy = r2 * Math.sin(a);
    if (Math.abs(ux) < HEX_SIZE * .65 && Math.abs(uy) < HEX_SIZE * .6) {
      const sw = 2 + ((v * 3) % 3);
      under += `M${(ux - sw).toFixed(1)},${uy.toFixed(1)}Q${ux.toFixed(1)},${(uy - sw).toFixed(1)},${(ux + sw).toFixed(1)},${uy.toFixed(1)}`;
    }
  }
  return { trunks: tr, canopy: ca, undergrowth: under };
};

export const genMtns = (id) => {
  const s = id * 211 + 61;
  let pk = "", sn = "", shadow = "", rocks = "";
  for (let i = 0; i < 5; i++) {
    const v = (s + i * 67 + i * i * 23) % 10000;
    const xB = -22 + ((v * 11) % 44), yB = 6 + ((v * 7) % 16), w = 9 + ((v * 3) % 12), h = 15 + ((v * 5) % 14);
    pk += `M${(xB - w).toFixed(1)},${yB.toFixed(1)}L${xB.toFixed(1)},${(yB - h).toFixed(1)}L${(xB + w).toFixed(1)},${yB.toFixed(1)}Z`;
    shadow += `M${xB.toFixed(1)},${(yB - h).toFixed(1)}L${(xB + w).toFixed(1)},${yB.toFixed(1)}L${(xB + w * .4).toFixed(1)},${yB.toFixed(1)}Z`;
    const sw2 = w * .35, sh2 = h * .28;
    sn += `M${(xB - sw2).toFixed(1)},${(yB - h + sh2).toFixed(1)}L${xB.toFixed(1)},${(yB - h).toFixed(1)}L${(xB + sw2).toFixed(1)},${(yB - h + sh2).toFixed(1)}Z`;
  }
  for (let i = 0; i < 4; i++) {
    const v = (s + i * 151 + 89) % 10000;
    const rx = -16 + ((v * 7) % 32), ry = 2 + ((v * 11) % 18);
    rocks += `M${rx},${ry}l${2 + v % 3},${-1 - v % 2}l${1 + v % 2},${1 + v % 2}Z`;
  }
  return { peaks: pk, snow: sn, shadow, rocks };
};

export const genWaves = (id) => {
  const s = id * 173 + 37;
  let waves = "", foam = "", shimmer = "";
  for (let i = 0; i < 8; i++) {
    const v = (s + i * 61 + i * i * 11) % 10000;
    const x = -28 + ((v * 13) % 56), y = -18 + ((v * 7) % 36), amp = 2.5 + (v % 4);
    waves += `M${x},${y}Q${x + 7},${y - amp},${x + 14},${y}Q${x + 21},${y + amp},${x + 28},${y}`;
  }
  for (let i = 0; i < 3; i++) {
    const v = (s + i * 97 + 19) % 10000;
    const fx = -20 + ((v * 11) % 40), fy = -12 + ((v * 7) % 24), fw = 4 + ((v * 3) % 6);
    foam += `M${fx},${fy}Q${fx + fw * .5},${fy - 1.5},${fx + fw},${fy}`;
  }
  for (let i = 0; i < 4; i++) {
    const v = (s + i * 79 + 41) % 10000;
    const sx = -22 + ((v * 13) % 44), sy = -14 + ((v * 7) % 28);
    shimmer += `M${sx},${sy}l${2 + v % 3},${-0.5}`;
  }
  return { waves, foam, shimmer };
};

export const genDetail = (id) => {
  const s = id * 251 + 43;
  let p = "";
  for (let i = 0; i < 6; i++) {
    const v = (s + i * 97 + i * i * 13) % 10000;
    const a = ((v % 360) * Math.PI) / 180, d2 = ((v * 11 + 19) % 100) / 100;
    const r = d2 * (HEX_SIZE - 16), x = r * Math.cos(a), y = r * Math.sin(a);
    if (Math.abs(x) < HEX_SIZE * .7 && Math.abs(y) < HEX_SIZE * .68)
      p += `M${x.toFixed(1)},${y.toFixed(1)}L${(x + .5).toFixed(1)},${(y + .5).toFixed(1)}`;
  }
  return p;
};

// Coastline: generate 3 wave layers at different insets for wash-up animation
export const genCoast = (hex, allHexes) => {
  if (hex.terrainType === "water") return null;
  const ec2 = hex.col % 2 === 0 ? EVEN_COL_NEIGHBORS : ODD_COL_NEIGHBORS;
  const insets = [0.88, 0.78, 0.68]; // outer (edge), mid, inner (shore wash)
  const curves = ["", "", ""];
  let hasCoast = false;
  for (let d = 0; d < 6; d++) {
    const nc = hex.col + ec2[d][0], nr = hex.row + ec2[d][1];
    const nh = hexAt(allHexes, nc, nr);
    if (nh && nh.terrainType === "water") {
      hasCoast = true;
      const angle0 = (d * 60 - 30) * Math.PI / 180, angle1 = ((d + 1) * 60 - 30) * Math.PI / 180;
      const x0 = HEX_SIZE * Math.cos(angle0), y0 = HEX_SIZE * Math.sin(angle0);
      const x1 = HEX_SIZE * Math.cos(angle1), y1 = HEX_SIZE * Math.sin(angle1);
      const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
      for (let i = 0; i < 3; i++) {
        const ins = insets[i], ctrl = ins - 0.12;
        curves[i] += `M${(x0 * ins).toFixed(1)},${(y0 * ins).toFixed(1)}Q${(mx * ctrl).toFixed(1)},${(my * ctrl).toFixed(1)},${(x1 * ins).toFixed(1)},${(y1 * ins).toFixed(1)}`;
      }
    }
  }
  return hasCoast ? curves : null;
};

// Water-side coastline: foam on water hexes bordering land
export const genWaterCoast = (hex, allHexes) => {
  if (hex.terrainType !== "water") return null;
  const ec2 = hex.col % 2 === 0 ? EVEN_COL_NEIGHBORS : ODD_COL_NEIGHBORS;
  const insets = [0.92, 0.84];
  const curves = ["", ""];
  let hasCoast = false;
  for (let d = 0; d < 6; d++) {
    const nc = hex.col + ec2[d][0], nr = hex.row + ec2[d][1];
    const nh = hexAt(allHexes, nc, nr);
    if (nh && nh.terrainType !== "water") {
      hasCoast = true;
      const angle0 = (d * 60 - 30) * Math.PI / 180, angle1 = ((d + 1) * 60 - 30) * Math.PI / 180;
      const x0 = HEX_SIZE * Math.cos(angle0), y0 = HEX_SIZE * Math.sin(angle0);
      const x1 = HEX_SIZE * Math.cos(angle1), y1 = HEX_SIZE * Math.sin(angle1);
      const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
      for (let i = 0; i < 2; i++) {
        const ins = insets[i], ctrl = ins - 0.1;
        curves[i] += `M${(x0 * ins).toFixed(1)},${(y0 * ins).toFixed(1)}Q${(mx * ctrl).toFixed(1)},${(my * ctrl).toFixed(1)},${(x1 * ins).toFixed(1)},${(y1 * ins).toFixed(1)}`;
      }
    }
  }
  return hasCoast ? curves : null;
};

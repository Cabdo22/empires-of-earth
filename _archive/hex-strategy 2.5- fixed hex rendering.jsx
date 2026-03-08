import React, { useState, useMemo, useRef, useCallback, useEffect, memo } from "react";
import * as Tone from "tone";

// ============================================================
// SOUND SYSTEM
// ============================================================
let audioStarted = false;

const ensureAudio = async () => {
  if (!audioStarted) {
    try { await Tone.start(); audioStarted = true; } catch (e) {}
  }
};

// Helper: create a synth, play note(s), then auto-dispose
const playTone = (synthOpts, notes, disposeAfter = 300) => {
  ensureAudio();
  try {
    const synth = new Tone.Synth(synthOpts).toDestination();
    if (Array.isArray(notes)) {
      notes.forEach(([note, dur, vol, delay], i) =>
        setTimeout(() => synth.triggerAttackRelease(note, dur, undefined, vol), delay || i * 150)
      );
    } else {
      synth.triggerAttackRelease(notes.note, notes.dur, undefined, notes.vol);
    }
    setTimeout(() => synth.dispose(), disposeAfter);
  } catch (e) {}
};

const playNoise = (noiseOpts, dur, vol, disposeAfter = 400) => {
  ensureAudio();
  try {
    const n = new Tone.NoiseSynth(noiseOpts).toDestination();
    n.triggerAttackRelease(dur, undefined, vol);
    setTimeout(() => n.dispose(), disposeAfter);
  } catch (e) {}
};

const SFX = {
  click: () => playTone(
    { oscillator: { type: "triangle" }, envelope: { attack: 0.005, decay: 0.08, sustain: 0, release: 0.05 } },
    { note: "C5", dur: "32n", vol: -12 }, 200
  ),
  move: () => playTone(
    { oscillator: { type: "sine" }, envelope: { attack: 0.01, decay: 0.1, sustain: 0, release: 0.1 } },
    { note: "E4", dur: "16n", vol: -10 }, 300
  ),
  combat: () => playNoise(
    { noise: { type: "white" }, envelope: { attack: 0.005, decay: 0.15, sustain: 0, release: 0.05 } },
    "16n", -8, 400
  ),
  build: () => playTone(
    { oscillator: { type: "square" }, envelope: { attack: 0.01, decay: 0.15, sustain: 0.05, release: 0.2 } },
    [["G4", "8n", -10, 0], ["B4", "8n", -10, 150]], 550
  ),
  research: () => playTone(
    { oscillator: { type: "sine" }, envelope: { attack: 0.02, decay: 0.2, sustain: 0.1, release: 0.3 } },
    [["C5", "8n", -8, 0], ["E5", "8n", -8, 150], ["G5", "8n", -8, 300]], 800
  ),
  nuke: () => playNoise(
    { noise: { type: "brown" }, envelope: { attack: 0.02, decay: 0.8, sustain: 0.1, release: 0.5 } },
    "4n", -2, 2000
  ),
  turn: () => playTone(
    { oscillator: { type: "triangle" }, envelope: { attack: 0.01, decay: 0.12, sustain: 0, release: 0.1 } },
    { note: "A4", dur: "16n", vol: -12 }, 300
  ),
  event: () => playTone(
    { oscillator: { type: "sawtooth" }, envelope: { attack: 0.01, decay: 0.3, sustain: 0.05, release: 0.2 } },
    [["D5", "8n", -14, 0], ["A4", "8n", -14, 200]], 600
  ),
  victory: () => playTone(
    { oscillator: { type: "triangle" }, envelope: { attack: 0.02, decay: 0.3, sustain: 0.15, release: 0.4 } },
    [["C5", "8n", -6, 0], ["E5", "8n", -6, 200], ["G5", "8n", -6, 400], ["C6", "8n", -6, 600]], 1500
  ),
  found: () => playTone(
    { oscillator: { type: "square" }, envelope: { attack: 0.01, decay: 0.2, sustain: 0.1, release: 0.3 } },
    [["C4", "8n", -10, 0], ["E4", "8n", -10, 120], ["G4", "8n", -10, 240]], 740
  ),
  barbarian: () => playTone(
    { oscillator: { type: "sawtooth" }, envelope: { attack: 0.01, decay: 0.2, sustain: 0, release: 0.1 } },
    [["D3", "16n", -8, 0], ["Bb2", "16n", -8, 120]], 420
  ),
};

// ============================================================
// CONSTANTS
// ============================================================
const HEX_SIZE = 48;
const SQRT3 = Math.sqrt(3);
const COLS = 10;
const ROWS = 10;

// Pre-compute the 6 vertices of a flat-top hexagon
const HEX_POINTS = Array.from({ length: 6 }, (_, i) => {
  const angle = (Math.PI / 180) * 60 * i;
  return `${HEX_SIZE * Math.cos(angle)},${HEX_SIZE * Math.sin(angle)}`;
}).join(" ");

// Convert grid (col, row) to pixel center for rendering
const hexCenter = (col, row) => ({
  x: col * 1.5 * HEX_SIZE + HEX_SIZE + 50,
  y: row * SQRT3 * HEX_SIZE + HEX_SIZE + 50 + (col % 2 === 1 ? (SQRT3 * HEX_SIZE) / 2 : 0),
});

// Offset-coordinate neighbor deltas differ for even vs odd columns
const EVEN_COL_NEIGHBORS = [[1, -1], [1, 0], [0, 1], [-1, 0], [-1, -1], [0, -1]];
const ODD_COL_NEIGHBORS  = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [0, -1]];

// Get neighbor coords with wrapping (toroidal map)
const getNeighbors = (col, row) => {
  const deltas = col % 2 === 0 ? EVEN_COL_NEIGHBORS : ODD_COL_NEIGHBORS;
  return deltas.map(([dc, dr]) => [
    ((col + dc) % COLS + COLS) % COLS,
    ((row + dr) % ROWS + ROWS) % ROWS,
  ]);
};

// Seeded PRNG (Mulberry32)
const mulberry32 = (seed) => {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

// Game-state RNG: advances a counter stored in the game state for deterministic randomness
const gameRng = (g) => {
  g.rngCounter = (g.rngCounter || 0) + 1;
  const rng = mulberry32(g.rngSeed + g.rngCounter);
  return rng();
};

// Convert offset coords to cube coords (for hex distance)
const offsetToCube = (col, row) => {
  const q = col;
  const r = row - (col - (col & 1)) / 2;
  return { q, r, s: -q - r };
};

// Hex distance accounting for toroidal wrapping
const hexDist = (c1, r1, c2, r2) => {
  let minDist = Infinity;
  for (let dc = -1; dc <= 1; dc++) {
    for (let dr = -1; dr <= 1; dr++) {
      const a = offsetToCube(c1 + dc * COLS, r1 + dr * ROWS);
      const b = offsetToCube(c2, r2);
      const dist = Math.max(Math.abs(a.q - b.q), Math.abs(a.r - b.r), Math.abs(a.s - b.s));
      minDist = Math.min(minDist, dist);
    }
  }
  return minDist;
};

// All hexes within a given radius of (col, row)
const getHexesInRadius = (col, row, radius, hexes) =>
  hexes.filter(h => hexDist(col, row, h.col, h.row) <= radius);

// ============================================================
// DATA
// ============================================================
const TERRAIN_INFO={
  grassland:{label:"Grassland",moveCost:1,food:2,prod:1,science:0,gold:1,color:"#7db840",defBonus:0},
  forest:{label:"Forest",moveCost:2,food:1,prod:2,science:0,gold:0,color:"#2d8a4e",defBonus:1},
  mountain:{label:"Mountain",moveCost:null,food:0,prod:3,science:0,gold:0,color:"#8a8a8a",defBonus:2},
  water:{label:"Water",moveCost:null,food:1,prod:0,science:0,gold:1,color:"#3a8acd",defBonus:0},
};
const RESOURCE_INFO={wheat:{label:"Wheat",icon:"🌾",bonus:{food:1}},iron:{label:"Iron",icon:"⛏",bonus:{prod:1}},oil:{label:"Oil",icon:"🛢",bonus:{prod:1,gold:1}},uranium:{label:"Uranium",icon:"☢",bonus:{prod:2}}};

const ERAS=["Dawn","Classical","Medieval","Industrial","Modern","Future"];
const ERA_IDX={Dawn:0,Classical:1,Medieval:2,Industrial:3,Modern:4,Future:5};
const ERA_COLORS={Dawn:"#a08060",Classical:"#80a060",Medieval:"#6080a0",Industrial:"#a0a060",Modern:"#8060a0",Future:"#60a0a0"};

const TECH_TREE={
  basic_tools:{id:"basic_tools",name:"Basic Tools",era:"Dawn",cost:5,prereqs:[],effects:["Unlocks Warrior, Scout, Settler"],row:0},
  agriculture:{id:"agriculture",name:"Agriculture",era:"Dawn",cost:5,prereqs:[],effects:["+1 food on grassland"],row:1},
  hunting:{id:"hunting",name:"Hunting",era:"Dawn",cost:5,prereqs:[],effects:["Unlocks Archer"],row:2},
  mysticism:{id:"mysticism",name:"Mysticism",era:"Dawn",cost:5,prereqs:[],effects:["+1 science per city"],row:3},
  bronze_working:{id:"bronze_working",name:"Bronze Working",era:"Classical",cost:6,prereqs:["basic_tools"],effects:["Unlocks Swordsman"],row:0},
  irrigation:{id:"irrigation",name:"Irrigation",era:"Classical",cost:6,prereqs:["agriculture"],effects:["+1 food forests"],row:1},
  animal_husbandry:{id:"animal_husbandry",name:"Animal Husbandry",era:"Classical",cost:6,prereqs:["hunting"],effects:["Unlocks cavalry"],row:2},
  writing:{id:"writing",name:"Writing",era:"Classical",cost:6,prereqs:["mysticism"],effects:["Unlocks Library"],row:3},
  feudalism:{id:"feudalism",name:"Feudalism",era:"Medieval",cost:7,prereqs:["bronze_working"],effects:["Unlocks Knight"],row:0},
  forestry:{id:"forestry",name:"Forestry",era:"Medieval",cost:7,prereqs:["irrigation"],effects:["+1 prod forests"],row:1},
  steelworking:{id:"steelworking",name:"Steelworking",era:"Medieval",cost:7,prereqs:["animal_husbandry"],effects:["+1 melee str"],row:2},
  guilds:{id:"guilds",name:"Guilds",era:"Medieval",cost:7,prereqs:["writing"],effects:["+2 gold/city"],row:3},
  machinery:{id:"machinery",name:"Machinery",era:"Industrial",cost:8,prereqs:["feudalism"],effects:["Unlocks Catapult"],row:0},
  engineering:{id:"engineering",name:"Engineering",era:"Industrial",cost:8,prereqs:["forestry"],effects:["+1 prod/city"],row:1},
  gunpowder:{id:"gunpowder",name:"Gunpowder",era:"Industrial",cost:8,prereqs:["steelworking"],effects:["Unlocks Musketman"],row:2},
  steam_power:{id:"steam_power",name:"Steam Power",era:"Industrial",cost:8,prereqs:["guilds"],effects:["Unlocks Galley"],row:3},
  electronics:{id:"electronics",name:"Electronics",era:"Modern",cost:9,prereqs:["machinery"],effects:["Unlocks Tank"],row:0},
  aviation:{id:"aviation",name:"Aviation",era:"Modern",cost:9,prereqs:["engineering"],effects:["Unlocks Fighter/Bomber"],row:1},
  ballistics:{id:"ballistics",name:"Ballistics",era:"Modern",cost:9,prereqs:["gunpowder"],effects:["Unlocks Artillery"],row:2},
  combustion:{id:"combustion",name:"Combustion",era:"Modern",cost:9,prereqs:["steam_power"],effects:["Unlocks Ships"],row:3},
  quantum_computing:{id:"quantum_computing",name:"Quantum Computing",era:"Future",cost:10,prereqs:["electronics"],effects:["Nuclear Facility"],row:0},
  ai_governance:{id:"ai_governance",name:"AI Governance",era:"Future",cost:10,prereqs:["aviation"],effects:["Unlocks Marine"],row:1},
  nanotech:{id:"nanotech",name:"Nanotech",era:"Future",cost:10,prereqs:["ballistics"],effects:["Super-Unit"],row:2},
  fusion_power:{id:"fusion_power",name:"Fusion Power",era:"Future",cost:10,prereqs:["combustion"],effects:["+3 sci, Victory"],row:3},
};

const UNIT_DEFS={
  scout:{name:"Scout",icon:"👁",strength:1,hp:10,move:3,range:0,cost:3,techReq:null,domain:"land"},
  warrior:{name:"Warrior",icon:"🛡",strength:2,hp:15,move:2,range:0,cost:4,techReq:null,domain:"land"},
  settler:{name:"Settler",icon:"🏕",strength:0,hp:10,move:2,range:0,cost:6,techReq:null,domain:"land"},
  archer:{name:"Archer",icon:"🏹",strength:2,hp:12,move:2,range:2,cost:5,techReq:"hunting",domain:"land"},
  swordsman:{name:"Swordsman",icon:"⚔",strength:4,hp:20,move:2,range:0,cost:6,techReq:"bronze_working",domain:"land"},
  knight:{name:"Knight",icon:"🐴",strength:3,hp:18,move:3,range:0,cost:7,techReq:"feudalism",domain:"land"},
  catapult:{name:"Catapult",icon:"🪨",strength:3,hp:10,move:1,range:3,cost:7,techReq:"machinery",domain:"land"},
  tank:{name:"Tank",icon:"🔩",strength:6,hp:25,move:3,range:0,cost:10,techReq:"electronics",domain:"land"},
  marine:{name:"Marine",icon:"🎖",strength:5,hp:22,move:2,range:0,cost:8,techReq:"ai_governance",domain:"amphibious"},
  galley:{name:"Galley",icon:"⛵",strength:2,hp:15,move:3,range:0,cost:5,techReq:"steam_power",domain:"sea"},
  destroyer:{name:"Destroyer",icon:"🚢",strength:5,hp:22,move:4,range:0,cost:8,techReq:"combustion",domain:"sea"},
  battleship:{name:"Battleship",icon:"⚓",strength:6,hp:28,move:3,range:3,cost:12,techReq:"combustion",domain:"sea"},
  fighter:{name:"Fighter",icon:"✈",strength:4,hp:18,move:5,range:0,cost:8,techReq:"aviation",domain:"air"},
  bomber:{name:"Bomber",icon:"💣",strength:5,hp:16,move:4,range:3,cost:10,techReq:"aviation",domain:"air"},
  nuke:{name:"Nuke",icon:"☢",strength:99,hp:1,move:0,range:3,cost:25,techReq:"quantum_computing",domain:"special"},
};

const DISTRICT_DEFS={
  farm:{name:"Farm",icon:"🌾",cost:8,effects:{food:2},techReq:null},
  workshop:{name:"Workshop",icon:"🔨",cost:8,effects:{production:2},techReq:null},
  library:{name:"Library",icon:"📚",cost:8,effects:{science:2},techReq:"writing"},
  market:{name:"Market",icon:"💰",cost:8,effects:{gold:2},techReq:null},
  military:{name:"Military",icon:"⚔",cost:10,effects:{},techReq:"bronze_working"},
  nuclear:{name:"Nuclear",icon:"☢",cost:14,effects:{},techReq:"quantum_computing"},
};

const CIV_DEFS={
  Rome:{name:"Roman Empire",color:"#e74c3c",colorBg:"#8b1a1a",colorLight:"#e07070",bonus:"+1 production per city",desc:"Master builders who forge empires through industry.",capital:"Rome",cityNames:["Roma","Antium","Capua","Neapolis","Pompeii"]},
  China:{name:"Chinese Dynasty",color:"#3498db",colorBg:"#1a4a8b",colorLight:"#60b0d8",bonus:"+1 science per city",desc:"Ancient scholars who unlock the secrets of the world.",capital:"Beijing",cityNames:["Chang'an","Luoyang","Nanjing","Suzhou","Hangzhou"]},
  Egypt:{name:"Egyptian Kingdom",color:"#f1c40f",colorBg:"#8b7a0a",colorLight:"#f0e060",bonus:"+1 food on grassland cities",desc:"River-fed civilization of pharaohs and pyramids.",capital:"Thebes",cityNames:["Memphis","Alexandria","Luxor","Giza","Aswan"]},
  Aztec:{name:"Aztec Empire",color:"#27ae60",colorBg:"#1a6b3a",colorLight:"#60d890",bonus:"+1 strength for melee units",desc:"Fierce warriors who conquer through blood and sacrifice.",capital:"Tenochtitlan",cityNames:["Texcoco","Tlacopan","Cholula","Tlaxcala","Xochimilco"]},
};

const BARB_UNITS=["warrior","archer","swordsman"];
const RANDOM_EVENTS=[
  {id:"gold_rush",name:"Gold Rush!",desc:"Traders bring wealth.",effect:g=>{ const cp2=g.players.find(p=>p.id===g.currentPlayerId);cp2.gold+=8; }},
  {id:"plague",name:"Plague Strikes",desc:"Disease reduces city population.",effect:g=>{ const cp2=g.players.find(p=>p.id===g.currentPlayerId);const c=cp2.cities[Math.floor(gameRng(g)*cp2.cities.length)];if(c&&c.population>1){c.population--;c.foodAccumulated=0;} }},
  {id:"eureka",name:"Eureka!",desc:"A breakthrough advances research.",effect:g=>{ const cp2=g.players.find(p=>p.id===g.currentPlayerId);if(cp2.currentResearch)cp2.currentResearch.progress+=3; }},
  {id:"harvest",name:"Bountiful Harvest",desc:"Surplus food for all cities.",effect:g=>{ const cp2=g.players.find(p=>p.id===g.currentPlayerId);cp2.cities.forEach(c=>c.foodAccumulated+=5); }},
  {id:"raid",name:"Barbarian Raid!",desc:"Barbarians attack your borders.",effect:(g,addLog2)=>{
    const empties=g.hexes.filter(h=>h.terrainType!=="water"&&h.terrainType!=="mountain"&&!h.cityId);
    const border=empties.filter(h=>!h.ownerPlayerId);
    if(border.length>0){const bh=border[Math.floor(gameRng(g)*border.length)];
      g.nextUnitId=(g.nextUnitId||0)+1;
      g.barbarians.push({id:`barb-${g.nextUnitId}`,unitType:"warrior",hexCol:bh.col,hexRow:bh.row,hpCurrent:15,movementCurrent:0,hasAttacked:false});
      addLog2("⚠ Barbarians spotted near your borders!",g);}
  }},
];

const PHASES=["RESEARCH","CITY","MOVEMENT","COMBAT","END"];
const PHASE_LABELS={RESEARCH:"Research",CITY:"City Mgmt",MOVEMENT:"Movement",COMBAT:"Combat",END:"End Turn"};
const CITY_DEF_BONUS=2, TERRITORIAL_WIN=0.6;
const FOG_SIGHT={scout:3,fighter:4,bomber:3,default:2};

// ============================================================
// COMBAT
// ============================================================
// Highest era a player has researched (for era-advantage bonus)
const getPlayerMaxEra = (player) => {
  let maxEra = 0;
  for (const techId of player.researchedTechs) {
    const tech = TECH_TREE[techId];
    if (tech) maxEra = Math.max(maxEra, ERA_IDX[tech.era] || 0);
  }
  return maxEra;
};

// Calculate combat damage preview between two units
const calcCombatPreview = (attUnit, attDef, defUnit, defDef, defTerrain, attPlayer, defPlayer, inCity) => {
  let attStr = attDef.strength;
  let defStr = defDef.strength;

  // Terrain and city defense bonuses
  if (defTerrain && TERRAIN_INFO[defTerrain]) defStr += TERRAIN_INFO[defTerrain].defBonus;
  if (inCity) defStr += CITY_DEF_BONUS;

  // Era advantage: +1 str for the more advanced player
  const attEra = getPlayerMaxEra(attPlayer);
  const defEra = getPlayerMaxEra(defPlayer);
  if (attEra > defEra) attStr += 1;
  if (defEra > attEra) defStr += 1;

  // Steelworking bonus for melee units
  if (attPlayer.researchedTechs.includes("steelworking") && attDef.range === 0) attStr += 1;
  if (defPlayer.researchedTechs.includes("steelworking") && defDef.range === 0) defStr += 1;

  // Aztec melee bonus
  if (attPlayer.civilization === "Aztec" && attDef.range === 0) attStr += 1;
  if (defPlayer.civilization === "Aztec" && defDef.range === 0) defStr += 1;

  // Damage formula: attacker deals (str*3 - enemy str), ranged units take no counter-damage
  const attackDmg = Math.max(1, Math.round(attStr * 3 - defStr));
  const counterDmg = attDef.range > 0 ? 0 : Math.max(1, Math.round(defStr * 2 - attStr));

  return {
    aDmg: attackDmg,
    dDmg: counterDmg,
    aStr: attStr,
    dStr: defStr,
    defDies: defUnit.hpCurrent - attackDmg <= 0,
    atkDies: attUnit.hpCurrent - counterDmg <= 0,
  };
};

// ============================================================
// MAP
// ============================================================
const P1_START = { col: 2, row: 5 };
const P2_START = { col: 8, row: 3 };

// Grow a blob of terrain using flood-fill from a random seed point
const growTerrainBlob = (grid, rng, terrain, minSize, maxSize, protectedHexes) => {
  const size = minSize + Math.floor(rng() * (maxSize - minSize + 1));
  const key = (c, r) => `${c},${r}`;

  // Find a valid starting cell
  let startCol, startRow, attempts = 0;
  do {
    startCol = Math.floor(rng() * COLS);
    startRow = Math.floor(rng() * ROWS);
    attempts++;
  } while ((grid[startCol][startRow].terrain !== "grassland" || protectedHexes.has(key(startCol, startRow))) && attempts < 200);
  if (attempts >= 200) return 0;

  // Flood-fill outward from start
  grid[startCol][startRow].terrain = terrain;
  let placed = 1;
  const visited = new Set([key(startCol, startRow)]);
  let frontier = getNeighbors(startCol, startRow).filter(
    ([c, r]) => grid[c][r].terrain === "grassland" && !visited.has(key(c, r)) && !protectedHexes.has(key(c, r))
  );

  while (placed < size && frontier.length > 0) {
    const idx = Math.floor(rng() * frontier.length);
    const [nc, nr] = frontier[idx];
    frontier.splice(idx, 1);
    if (grid[nc][nr].terrain !== "grassland") continue;

    grid[nc][nr].terrain = terrain;
    placed++;
    visited.add(key(nc, nr));

    for (const [fc, fr] of getNeighbors(nc, nr)) {
      if (!visited.has(key(fc, fr)) && grid[fc][fr].terrain === "grassland" && !protectedHexes.has(key(fc, fr))) {
        frontier.push([fc, fr]);
        visited.add(key(fc, fr));
      }
    }
  }
  return placed;
};

// Scatter resources across the map
const placeResources = (grid, rng, protectedHexes) => {
  const key = (c, r) => `${c},${r}`;
  const land = [], water = [];

  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < ROWS; r++) {
      if (grid[c][r].terrain !== "water") land.push([c, r]);
      else water.push([c, r]);
    }
  }

  // ~12% of land tiles get a resource
  const numResources = Math.round(land.length * 0.12);
  const shuffled = land.sort(() => rng() - 0.5);

  for (let i = 0; i < numResources && i < shuffled.length; i++) {
    const [c, r] = shuffled[i];
    if (protectedHexes.has(key(c, r))) continue;

    const roll = rng();
    if (grid[c][r].terrain === "mountain") {
      grid[c][r].resource = "uranium";
    } else if (roll < 0.4) {
      grid[c][r].resource = grid[c][r].terrain === "grassland" ? "wheat" : "iron";
    } else if (roll < 0.7) {
      grid[c][r].resource = "iron";
    } else {
      grid[c][r].resource = "oil";
    }
  }

  // 25% of water tiles get oil
  for (const [c, r] of water) {
    if (rng() < 0.25) grid[c][r].resource = "oil";
  }
};

const generateMap = () => {
  const rng = mulberry32(42);
  const key = (c, r) => `${c},${r}`;
  const protectedHexes = new Set([key(P1_START.col, P1_START.row), key(P2_START.col, P2_START.row)]);

  // Initialize all cells as grassland
  const grid = Array.from({ length: COLS }, () =>
    Array.from({ length: ROWS }, () => ({ terrain: "grassland", resource: null }))
  );

  // Grow terrain blobs (target tile counts with max-attempt safety)
  const growUntil = (terrain, targetTiles, minBlob, maxBlob) => {
    let placed = 0, safety = 0;
    while (placed < targetTiles && safety < 50) {
      placed += growTerrainBlob(grid, rng, terrain, minBlob, maxBlob, protectedHexes);
      safety++;
    }
  };
  growUntil("forest", 25, 3, 7);
  growUntil("mountain", 10, 2, 4);
  growUntil("water", 10, 3, 6);

  // Ensure player starts are always grassland
  grid[P1_START.col][P1_START.row].terrain = "grassland";
  grid[P2_START.col][P2_START.row].terrain = "grassland";

  placeResources(grid, rng, protectedHexes);
  return grid;
};

// ============================================================
// INITIAL STATE
// ============================================================
let uidCtr=0;const mkId=pid=>`${pid}-u${uidCtr++}`;
const mkUnit=(pid,type,col,row)=>{const d=UNIT_DEFS[type];return{id:mkId(pid),unitType:type,hexCol:col,hexRow:row,movementCurrent:d.move,hpCurrent:d.hp,hasAttacked:false};};

const createInitialState=(civ1="Rome",civ2="China")=>{
  uidCtr=0;const gridData=generateMap();const hexes=[];let id=0;
  for(let col=0;col<COLS;col++)for(let row=0;row<ROWS;row++){const{x,y}=hexCenter(col,row);const g=gridData[col][row];hexes.push({id:id++,col,row,x,y,uk:`${col},${row}`,terrainType:g.terrain,resource:g.resource,ownerPlayerId:null,cityId:null});}
  const p1H=hexes.find(h=>h.col===P1_START.col&&h.row===P1_START.row);
  const p2H=hexes.find(h=>h.col===P2_START.col&&h.row===P2_START.row);
  const c1=CIV_DEFS[civ1],c2=CIV_DEFS[civ2];
  const players=[
    {id:"p1",civilization:civ1,name:c1.name,color:c1.color,colorBg:c1.colorBg,colorLight:c1.colorLight,gold:5,science:5,researchedTechs:["basic_tools"],currentResearch:null,
      cities:[{id:c1.capital.toLowerCase(),name:c1.capital,hexId:p1H.id,population:1,districts:[],currentProduction:null,productionProgress:0,foodAccumulated:0,hp:20,hpMax:20}],
      units:[mkUnit("p1","warrior",P1_START.col,P1_START.row),mkUnit("p1","scout",P1_START.col,P1_START.row)]},
    {id:"p2",civilization:civ2,name:c2.name,color:c2.color,colorBg:c2.colorBg,colorLight:c2.colorLight,gold:5,science:5,researchedTechs:["basic_tools"],currentResearch:null,
      cities:[{id:c2.capital.toLowerCase(),name:c2.capital,hexId:p2H.id,population:1,districts:[],currentProduction:null,productionProgress:0,foodAccumulated:0,hp:20,hpMax:20}],
      units:[mkUnit("p2","warrior",P2_START.col,P2_START.row),mkUnit("p2","scout",P2_START.col,P2_START.row)]}
  ];
  p1H.cityId=c1.capital.toLowerCase();p1H.ownerPlayerId="p1";p2H.cityId=c2.capital.toLowerCase();p2H.ownerPlayerId="p2";
  // Compute initial explored hexes
  const explored={};
  for(const p of players){explored[p.id]=[...getVisibleHexes(p,hexes)];}
  return{turnNumber:1,currentPlayerId:"p1",phase:"RESEARCH",players,hexes,victoryStatus:null,nextUnitId:uidCtr,log:[`Game started. Turn 1 — ${c1.name}`],barbarians:[],eventMsg:null,rngSeed:42,rngCounter:0,explored};
};

// ============================================================
// ECONOMY
// ============================================================
const calcCityYields = (city, player, hexes) => {
  const cityHex = hexes[city.hexId];
  let food = 1, prod = 1, science = 0, gold = 0;

  // Civilization bonuses
  if (player.civilization === "Rome") prod += 1;
  if (player.civilization === "China") science += 1;
  if (player.civilization === "Egypt" && cityHex.terrainType === "grassland") food += 1;

  // Tech bonuses
  if (player.researchedTechs.includes("agriculture") && cityHex.terrainType === "grassland") food += 1;
  if (player.researchedTechs.includes("mysticism")) science += 1;
  if (player.researchedTechs.includes("engineering")) prod += 1;
  if (player.researchedTechs.includes("guilds")) gold += 2;
  if (player.researchedTechs.includes("fusion_power")) science += 3;

  // District bonuses
  for (const districtId of city.districts) {
    const def = DISTRICT_DEFS[districtId];
    if (def?.effects) {
      food += (def.effects.food || 0);
      prod += (def.effects.production || 0);
      science += (def.effects.science || 0);
      gold += (def.effects.gold || 0);
    }
  }

  // Neighboring resource bonuses
  for (const [nc, nr] of getNeighbors(cityHex.col, cityHex.row)) {
    const neighbor = hexes.find(h => h.col === nc && h.row === nr);
    if (neighbor?.resource && RESOURCE_INFO[neighbor.resource]) {
      const bonus = RESOURCE_INFO[neighbor.resource].bonus;
      food += (bonus.food || 0);
      prod += (bonus.prod || 0);
      gold += (bonus.gold || 0);
    }
  }

  return { food, production: prod, science, gold };
};

const calcPlayerIncome = (player, hexes) => {
  let food = 0, production = 0, science = 0, gold = 0;
  for (const city of player.cities) {
    const yields = calcCityYields(city, player, hexes);
    food += yields.food;
    production += yields.production;
    science += yields.science;
    gold += yields.gold;
  }
  return { food, production, science, gold };
};

const getAvailableTechs = (player) =>
  Object.values(TECH_TREE).filter(
    t => !player.researchedTechs.includes(t.id) && t.prereqs.every(p => player.researchedTechs.includes(p))
  );

const getAvailableUnits = (player, city) => {
  const hasNuclearDistrict = city ? city.districts.includes("nuclear") : false;
  return Object.entries(UNIT_DEFS)
    .filter(([id, u]) => {
      if (u.techReq && !player.researchedTechs.includes(u.techReq)) return false;
      if (id === "nuke") return hasNuclearDistrict && player.gold >= 15;
      return true;
    })
    .map(([id, u]) => ({ id, ...u }));
};

const getAvailableDistricts = (player, city) =>
  Object.entries(DISTRICT_DEFS)
    .filter(([id, d]) => !city.districts.includes(id) && (!d.techReq || player.researchedTechs.includes(d.techReq)))
    .map(([id, d]) => ({ id, ...d }));

// ============================================================
// REACHABILITY
// ============================================================
// Calculate movement cost for a hex based on unit domain
const getMoveCost = (terrain, domain) => {
  if (domain === "air") return 1;
  if (domain === "sea") return terrain === "water" ? 1 : null;
  if (domain === "amphibious") {
    if (terrain === "water") return 2;
    const cost = TERRAIN_INFO[terrain].moveCost;
    return cost === null ? null : cost;
  }
  // Land unit
  const info = TERRAIN_INFO[terrain];
  return info.moveCost; // null means impassable
};

// Returns null if hex is actionable, or a short reason string explaining why a unit can't act on this hex
const getMoveBlockReason = (hex, unit, unitDef, reachSet, atkRangeSet, phaseStr, currentPlayerId, allPlayers) => {
  if (phaseStr !== "MOVEMENT" || !unit || !unitDef) return null;
  const uk = `${hex.col},${hex.row}`;
  if (reachSet.has(uk) || atkRangeSet.has(uk)) return null; // can act here
  const domain = unitDef.domain || "land";
  const t = hex.terrainType;
  if (unit.movementCurrent <= 0 && unit.hasAttacked) return "No actions remaining";
  if (unit.movementCurrent <= 0) return "No movement points";
  if (t === "mountain" && domain !== "air") return "Mountains — impassable";
  if (t === "water" && domain === "land") return "Water — need naval unit";
  if (t === "water" && domain !== "sea" && domain !== "amphibious" && domain !== "air") return "Can't cross water";
  // Check for friendly units blocking
  const friendlyUnits = allPlayers?.find(p => p.id === currentPlayerId)?.units.filter(u => u.hexCol === hex.col && u.hexRow === hex.row) || [];
  if (friendlyUnits.length > 0 && !(friendlyUnits.length === 1 && friendlyUnits[0].id === unit.id)) return "Hex occupied by friendly unit";
  return "Out of movement range";
};

// Dijkstra-based pathfinding: returns set of hex keys reachable within movePoints
const getReachableHexes = (startCol, startRow, movePoints, hexes, domain = "land", playerId = null, allPlayers = null) => {
  // Build terrain lookup for fast access
  const terrainAt = {};
  hexes.forEach(h => { terrainAt[`${h.col},${h.row}`] = h.terrainType; });

  const startKey = `${startCol},${startRow}`;
  const reachable = new Set();
  const costTo = { [startKey]: 0 };
  const queue = [{ col: startCol, row: startRow, cost: 0 }];

  while (queue.length > 0) {
    queue.sort((a, b) => a.cost - b.cost);
    const current = queue.shift();
    const currentKey = `${current.col},${current.row}`;

    if (current.cost > movePoints) continue;
    if (currentKey !== startKey) reachable.add(currentKey);

    for (const [nc, nr] of getNeighbors(current.col, current.row)) {
      const neighborKey = `${nc},${nr}`;
      const terrain = terrainAt[neighborKey];
      if (!terrain) continue;

      const moveCost = getMoveCost(terrain, domain);
      if (moveCost === null) continue; // impassable

      const totalCost = current.cost + moveCost;
      if (totalCost > movePoints) continue;
      if (costTo[neighborKey] !== undefined && costTo[neighborKey] <= totalCost) continue;

      costTo[neighborKey] = totalCost;
      queue.push({ col: nc, row: nr, cost: totalCost });
    }
  }

  // Air units can only land on friendly cities
  if (domain === "air" && playerId && allPlayers) {
    const myPlayer = allPlayers.find(p => p.id === playerId);
    const myCityHexes = new Set();
    if (myPlayer) myPlayer.cities.forEach(c => {
      const h = hexes[c.hexId];
      myCityHexes.add(`${h.col},${h.row}`);
    });
    return new Set([...reachable].filter(k => myCityHexes.has(k)));
  }

  return reachable;
};

// All hex keys within ranged-attack distance
const getRangedTargets = (col, row, range) => {
  const targets = new Set();
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < ROWS; r++) {
      if (c === col && r === row) continue;
      if (hexDist(col, row, c, r) <= range) targets.add(`${c},${r}`);
    }
  }
  return targets;
};

// Fog of war: compute currently visible hex keys for a player
const getVisibleHexes = (player, hexes) => {
  const visible = new Set();

  // Each unit reveals hexes within its sight range
  for (const unit of player.units) {
    const sight = FOG_SIGHT[unit.unitType] || FOG_SIGHT.default;
    for (const h of hexes) {
      if (hexDist(unit.hexCol, unit.hexRow, h.col, h.row) <= sight) {
        visible.add(`${h.col},${h.row}`);
      }
    }
  }

  // Cities reveal a slightly larger radius
  for (const city of player.cities) {
    const cityHex = hexes[city.hexId];
    for (const h of hexes) {
      if (hexDist(cityHex.col, cityHex.row, h.col, h.row) <= FOG_SIGHT.default + 1) {
        visible.add(`${h.col},${h.row}`);
      }
    }
  }

  return visible;
};

// ============================================================
// PROCEDURAL VISUALS
// ============================================================
const genGrass=id=>{const s=id*137+29;let p="";for(let i=0;i<24;i++){const v=(s+i*73+i*i*17)%10000;const a=((v%360)*Math.PI)/180,d2=((v*7+31)%100)/100;const r=d2*(HEX_SIZE-12),x=r*Math.cos(a),y=r*Math.sin(a);if(Math.abs(x)<HEX_SIZE*.75&&Math.abs(y)<HEX_SIZE*.72){const h=3+((v*3+7)%7),l=(((v*11+3)%7)-3)*.4;p+=`M${x.toFixed(1)},${y.toFixed(1)}L${(x+l).toFixed(1)},${(y-h).toFixed(1)}`;}}return p;};
const genTrees=id=>{const s=id*193+47;let tr="",ca="";for(let i=0;i<8;i++){const v=(s+i*83+i*i*19)%10000;const a=((v%360)*Math.PI)/180,d2=((v*7+21)%85)/100;const r=d2*(HEX_SIZE-14),x=r*Math.cos(a),y=r*Math.sin(a);if(Math.abs(x)<HEX_SIZE*.7&&Math.abs(y)<HEX_SIZE*.65){const h=8+((v*3)%8);tr+=`M${x.toFixed(1)},${y.toFixed(1)}L${x.toFixed(1)},${(y-h).toFixed(1)}`;const cw=3+((v*7)%4);ca+=`M${(x-cw).toFixed(1)},${(y-h+2).toFixed(1)}L${x.toFixed(1)},${(y-h-cw).toFixed(1)}L${(x+cw).toFixed(1)},${(y-h+2).toFixed(1)}Z`;}}return{trunks:tr,canopy:ca};};
const genMtns=id=>{const s=id*211+61;let pk="",sn="";for(let i=0;i<4;i++){const v=(s+i*67+i*i*23)%10000;const xB=-20+((v*11)%40),yB=5+((v*7)%15),w=10+((v*3)%10),h=14+((v*5)%12);pk+=`M${(xB-w).toFixed(1)},${yB.toFixed(1)}L${xB.toFixed(1)},${(yB-h).toFixed(1)}L${(xB+w).toFixed(1)},${yB.toFixed(1)}Z`;const sw2=w*.3,sh2=h*.25;sn+=`M${(xB-sw2).toFixed(1)},${(yB-h+sh2).toFixed(1)}L${xB.toFixed(1)},${(yB-h).toFixed(1)}L${(xB+sw2).toFixed(1)},${(yB-h+sh2).toFixed(1)}Z`;}return{peaks:pk,snow:sn};};
const genWaves=id=>{const s=id*173+37;let p="";for(let i=0;i<6;i++){const v=(s+i*61+i*i*11)%10000;const x=-25+((v*13)%50),y=-15+((v*7)%30),amp=2+(v%3);p+=`M${x},${y}Q${x+8},${y-amp},${x+16},${y}Q${x+24},${y+amp},${x+32},${y}`;}return p;};
const genDetail=id=>{const s=id*251+43;let p="";for(let i=0;i<6;i++){const v=(s+i*97+i*i*13)%10000;const a=((v%360)*Math.PI)/180,d2=((v*11+19)%100)/100;const r=d2*(HEX_SIZE-16),x=r*Math.cos(a),y=r*Math.sin(a);if(Math.abs(x)<HEX_SIZE*.7&&Math.abs(y)<HEX_SIZE*.68)p+=`M${x.toFixed(1)},${y.toFixed(1)}L${(x+.5).toFixed(1)},${(y+.5).toFixed(1)}`;}return p;};

// ============================================================
// RENDER HEX (memoized component — only re-renders when its own props change)
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
      {hex.resource&&<text x={0} y={2} textAnchor="middle" fontSize={8} opacity=".25" style={{pointerEvents:"none"}}>{RESOURCE_INFO[hex.resource]?.icon}</text>}
    </g>
  );
  return(
    <g data-hex={hex.id} data-col={hex.col} data-row={hex.row} transform={`translate(${hex.x},${hex.y})`} style={{cursor:settlerMode&&t!=="water"&&t!=="mountain"?"crosshair":blockReason?"not-allowed":"pointer"}}>
      {t==="grassland"&&<><polygon points={HEX_POINTS} fill="url(#gradGrass)"/><polygon points={HEX_POINTS} fill="url(#varGrass)" opacity={.2+(hex.id%5)*.04}/><path d={vis.detail} stroke="#3a5818" strokeWidth="2" fill="none" opacity=".3"/><path d={vis.blades} stroke="#5a9830" strokeWidth=".9" fill="none" opacity=".5"/><polygon points={HEX_POINTS} fill="none" stroke="#1a2e0a" strokeWidth="1" opacity=".5"/></>}
      {t==="forest"&&<><polygon points={HEX_POINTS} fill="url(#gradForest)"/><path d={vis.detail} stroke="#1a3a10" strokeWidth="2" fill="none" opacity=".25"/><path d={vis.trees.trunks} stroke="#5a3a1a" strokeWidth="1.8" fill="none" opacity=".7"/><path d={vis.trees.canopy} fill="#2a6a30" stroke="#1a5020" strokeWidth=".5" opacity=".75"/><polygon points={HEX_POINTS} fill="none" stroke="#0e2a08" strokeWidth="1.2" opacity=".6"/></>}
      {t==="mountain"&&<><polygon points={HEX_POINTS} fill="url(#gradMountain)"/><path d={vis.mtns.peaks} fill="#6a6a6a" stroke="#4a4a4a" strokeWidth=".8" opacity=".85"/><path d={vis.mtns.snow} fill="#e8e8e8" stroke="#d0d0d0" strokeWidth=".3" opacity=".9"/><polygon points={HEX_POINTS} fill="none" stroke="#2a2a2a" strokeWidth="1.2" opacity=".55"/></>}
      {t==="water"&&<><polygon points={HEX_POINTS} fill="url(#gradWater)"/><path d={vis.waves} stroke="#7ac0e8" strokeWidth="1" fill="none" opacity=".5"/><path d={vis.waves} stroke="#a0d8f0" strokeWidth=".6" fill="none" opacity=".3" transform="translate(0,5)"/><polygon points={HEX_POINTS} fill="none" stroke="#1a4a6a" strokeWidth="1.2" opacity=".5"/></>}

      {/* Territory tint */}
      {hex.ownerPlayerId&&player&&<polygon points={HEX_POINTS} fill={player.color} opacity=".08"/>}
      {hex.resource&&!city&&<text x={0} y={HEX_SIZE*.55} textAnchor="middle" fontSize={10} style={{pointerEvents:"none"}}>{RESOURCE_INFO[hex.resource].icon}</text>}

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
      {unitCount>0&&!city&&<g transform="translate(0,-6)" style={{pointerEvents:"none"}}>
        <circle cx={0} cy={0} r={18} fill={units[0].pBg} stroke={unitSelected?"#60d0ff":canAct?"#a0e060":units[0].pCol} strokeWidth={unitSelected?"2.5":canAct?"2":"1.5"} strokeDasharray={canAct&&!unitSelected?"4 2":"none"}/>
        <text x={0} y={1} textAnchor="middle" dominantBaseline="middle" fontSize={16} style={{pointerEvents:"none"}}>{UNIT_DEFS[units[0].unitType]?.icon||"?"}</text>
        {unitSelected&&<circle cx={0} cy={0} r={20} fill="none" stroke="#60d0ff" strokeWidth="1.5" opacity=".5"/>}
        {unitCount>1&&<text x={14} y={-14} textAnchor="middle" fill="#ffd740" fontSize={8} fontWeight="bold" style={{pointerEvents:"none"}}>+{unitCount-1}</text>}
        {units[0].hpCurrent<(UNIT_DEFS[units[0].unitType]?.hp||10)&&<g transform="translate(0,16)"><rect x={-14} y={0} width={28} height={3} rx={1} fill="#333" opacity=".7"/><rect x={-14} y={0} width={28*(units[0].hpCurrent/(UNIT_DEFS[units[0].unitType]?.hp||10))} height={3} rx={1} fill={units[0].hpCurrent>(UNIT_DEFS[units[0].unitType]?.hp||10)*.5?"#4a4":"#c44"} opacity=".9"/></g>}
      </g>}
      {unitCount>0&&city&&<g transform="translate(28,-20)" style={{pointerEvents:"none"}}>
        <circle cx={0} cy={0} r={12} fill={units[0].pBg} stroke={unitSelected?"#60d0ff":canAct?"#a0e060":units[0].pCol} strokeWidth={unitSelected?"2":"1"} strokeDasharray={canAct&&!unitSelected?"3 2":"none"}/>
        <text x={0} y={1} textAnchor="middle" dominantBaseline="middle" fontSize={11} style={{pointerEvents:"none"}}>{UNIT_DEFS[units[0].unitType]?.icon||"?"}</text>
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
      {/* Movement block tooltip */}
      {isHovered&&blockReason&&<g transform="translate(0,-52)" style={{pointerEvents:"none"}}>
        <rect x={-blockReason.length*2.8} y={-10} width={blockReason.length*5.6} height={16} rx={4} fill="rgba(60,20,10,.92)" stroke="rgba(240,100,60,.6)" strokeWidth=".8"/>
        <text x={0} y={2} textAnchor="middle" dominantBaseline="middle" fill="#ffa080" fontSize={8} fontFamily="'Palatino Linotype',serif" style={{pointerEvents:"none"}}>{blockReason}</text>
      </g>}
    </g>
  );
},(a,b)=>a.isHovered===b.isHovered&&a.isSelected===b.isSelected&&a.inMoveRange===b.inMoveRange&&a.inAttackRange===b.inAttackRange&&a.inNukeRange===b.inNukeRange&&a.unitSelected===b.unitSelected&&a.settlerMode===b.settlerMode&&a.canAct===b.canAct&&a.flash===b.flash&&a.isFogged===b.isFogged&&a.isExplored===b.isExplored&&a.blockReason===b.blockReason&&a.unitCount===b.unitCount&&a.units===b.units&&a.city===b.city&&a.player===b.player&&a.hex===b.hex);

const btnStyle=a=>({padding:"4px 10px",borderRadius:4,fontSize:10,cursor:"pointer",border:"1px solid rgba(100,140,50,.5)",background:a?"rgba(100,160,50,.5)":"rgba(30,40,20,.8)",color:a?"#e0f0c0":"#7a8a60",fontFamily:"inherit",marginRight:4,marginBottom:4});
const panelStyle={position:"absolute",zIndex:20,background:"rgba(10,14,6,.95)",border:"1px solid rgba(100,140,50,.4)",borderRadius:8,padding:12,color:"#a0b880",fontFamily:"'Palatino Linotype',serif"};

// ============================================================
// AI DECISION ENGINE
// ============================================================

// Pick a tech to research. Strategy: early economy → military if threatened → science victory late
const aiPickResearch = (player, hexes, enemyPlayer) => {
  if (player.currentResearch) return null; // already researching
  const available = getAvailableTechs(player);
  if (available.length === 0) return null;

  const maxEra = getPlayerMaxEra(player);
  const enemyNearby = enemyPlayer.units.some(eu => {
    return player.cities.some(c => {
      const ch = hexes[c.hexId];
      return hexDist(eu.hexCol, eu.hexRow, ch.col, ch.row) <= 4;
    });
  });

  // Score each tech
  const scored = available.map(tech => {
    let score = 10 - tech.cost; // prefer cheaper techs slightly

    // Military techs get priority when threatened
    const isMilitary = tech.effects.some(e =>
      /unlock.*warrior|unlock.*sword|unlock.*knight|unlock.*archer|unlock.*tank|unlock.*musket|unlock.*artillery|unlock.*catapult|strength/i.test(e)
    );
    if (isMilitary && enemyNearby) score += 8;
    if (isMilitary && !enemyNearby) score += 2;

    // Economy techs are good early
    const isEcon = tech.effects.some(e => /food|gold|prod/i.test(e));
    if (isEcon && maxEra <= 2) score += 5;

    // Science victory path in late game
    const isSciVictory = tech.id === "quantum_computing" || tech.id === "fusion_power";
    if (isSciVictory && maxEra >= 4) score += 10;

    // Settler/expansion unlocks are valuable early
    if (tech.effects.some(e => /settler|library/i.test(e))) score += 4;

    return { tech, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0].tech.id;
};

// Pick what a city should produce
const aiPickProduction = (city, player, hexes, enemyPlayer) => {
  if (city.currentProduction) return null; // already building

  const availUnits = getAvailableUnits(player, city);
  const availDistricts = getAvailableDistricts(player, city);
  const militaryCount = player.units.filter(u =>
    u.unitType !== "scout" && u.unitType !== "settler" && u.unitType !== "nuke"
  ).length;
  const enemyMilitary = enemyPlayer.units.length;
  const settlerCount = player.units.filter(u => u.unitType === "settler").length;

  // Priority 1: Settler if <3 cities and none building/existing
  if (player.cities.length < 3 && settlerCount === 0 && availUnits.some(u => u.id === "settler")) {
    return { type: "unit", itemId: "settler" };
  }

  // Priority 2: Military if outnumbered or enemy nearby
  const enemyNearby = enemyPlayer.units.some(eu => {
    const ch = hexes[city.hexId];
    return hexDist(eu.hexCol, eu.hexRow, ch.col, ch.row) <= 5;
  });

  if ((militaryCount < enemyMilitary + 1) || enemyNearby) {
    // Pick the strongest available military unit
    const military = availUnits
      .filter(u => u.id !== "settler" && u.id !== "scout" && u.id !== "nuke" && u.domain === "land")
      .sort((a, b) => b.strength - a.strength);
    if (military.length > 0) return { type: "unit", itemId: military[0].id };
  }

  // Priority 3: Districts for economy (if city has few)
  if (city.districts.length < 2 && availDistricts.length > 0) {
    const distPriority = ["library", "farm", "workshop", "market", "military"];
    for (const dId of distPriority) {
      if (availDistricts.some(d => d.id === dId)) return { type: "district", itemId: dId };
    }
  }

  // Priority 4: Nuclear facility + nuke if available late game
  if (availDistricts.some(d => d.id === "nuclear") && !city.districts.includes("nuclear")) {
    return { type: "district", itemId: "nuclear" };
  }

  // Default: build a military unit
  const fallback = availUnits
    .filter(u => u.id !== "settler" && u.id !== "nuke" && u.domain === "land")
    .sort((a, b) => b.strength - a.strength);
  if (fallback.length > 0) return { type: "unit", itemId: fallback[0].id };

  return null;
};

// Find a good location for a settler to found a city
const aiFindCityLocation = (settler, player, hexes) => {
  const existingCityHexes = new Set(
    player.cities.map(c => `${hexes[c.hexId].col},${hexes[c.hexId].row}`)
  );

  // Score each reachable hex
  const reachable = getReachableHexes(settler.hexCol, settler.hexRow, settler.movementCurrent, hexes, "land");
  let bestHex = null, bestScore = -Infinity;

  for (const key of reachable) {
    const [col, row] = key.split(",").map(Number);
    const hex = hexes.find(h => h.col === col && h.row === row);
    if (!hex || hex.terrainType === "water" || hex.terrainType === "mountain" || hex.cityId) continue;

    let score = 0;

    // Prefer grassland
    if (hex.terrainType === "grassland") score += 3;

    // Count neighboring resources
    for (const [nc, nr] of getNeighbors(col, row)) {
      const nh = hexes.find(h => h.col === nc && h.row === nr);
      if (nh?.resource) score += 2;
      if (nh?.terrainType === "grassland") score += 1;
    }

    // Penalize being too close to own cities (want spread)
    for (const cityKey of existingCityHexes) {
      const [cc, cr] = cityKey.split(",").map(Number);
      const dist = hexDist(col, row, cc, cr);
      if (dist < 3) score -= 5;
      if (dist >= 3 && dist <= 5) score += 2;
    }

    if (score > bestScore) { bestScore = score; bestHex = hex; }
  }

  return bestHex;
};

// AI movement and combat for all units
const aiPlanAndExecuteMoves = (g, aiPlayer, enemyPlayer, addLogFn) => {
  // Refresh unit movement
  for (const unit of aiPlayer.units) {
    unit.movementCurrent = UNIT_DEFS[unit.unitType]?.move || 2;
    unit.hasAttacked = false;
  }

  // Process each unit
  const processedUnits = new Set();

  // First pass: settlers
  for (const unit of [...aiPlayer.units]) {
    if (unit.unitType !== "settler" || processedUnits.has(unit.id)) continue;
    processedUnits.add(unit.id);

    const bestLoc = aiFindCityLocation(unit, aiPlayer, g.hexes);
    if (bestLoc) {
      // If standing on a good spot or can reach one, found city
      const hex = g.hexes.find(h => h.col === unit.hexCol && h.row === unit.hexRow);
      const standingGood = hex && hex.terrainType === "grassland" && !hex.cityId;

      // Check if no city too close
      const tooClose = aiPlayer.cities.some(c => {
        const ch = g.hexes[c.hexId];
        return hexDist(unit.hexCol, unit.hexRow, ch.col, ch.row) < 3;
      });

      if (standingGood && !tooClose && aiPlayer.cities.length < 5) {
        // Found city here
        const cityNum = aiPlayer.cities.length + 1;
        const civNames = CIV_DEFS[aiPlayer.civilization]?.cityNames || ["Colony"];
        const cityName = civNames[cityNum - 1] || `City ${cityNum}`;
        const cityId = `${aiPlayer.id}-c${cityNum}`;

        aiPlayer.units = aiPlayer.units.filter(u => u.id !== unit.id);
        aiPlayer.cities.push({
          id: cityId, name: cityName, hexId: hex.id, population: 1,
          districts: [], currentProduction: null, productionProgress: 0,
          foodAccumulated: 0, hp: 20, hpMax: 20,
        });
        hex.cityId = cityId;
        hex.ownerPlayerId = aiPlayer.id;
        for (const [nc, nr] of getNeighbors(unit.hexCol, unit.hexRow)) {
          const nh = g.hexes.find(h => h.col === nc && h.row === nr);
          if (nh && !nh.ownerPlayerId && nh.terrainType !== "water") nh.ownerPlayerId = aiPlayer.id;
        }
        addLogFn(`${aiPlayer.name} founded ${cityName}!`, g);
        continue;
      }

      // Move toward best location
      if (bestLoc) {
        unit.hexCol = bestLoc.col;
        unit.hexRow = bestLoc.row;
        unit.movementCurrent = 0;
      }
    }
  }

  // Second pass: nukes
  for (const unit of [...aiPlayer.units]) {
    if (unit.unitType !== "nuke" || processedUnits.has(unit.id)) continue;
    processedUnits.add(unit.id);

    // Target enemy cities
    for (const eCity of enemyPlayer.cities) {
      const eCityHex = g.hexes[eCity.hexId];
      const dist = hexDist(unit.hexCol, unit.hexRow, eCityHex.col, eCityHex.row);
      if (dist <= 3) {
        // Launch nuke — damages but doesn't auto-capture
        const blast = getHexesInRadius(eCityHex.col, eCityHex.row, 1, g.hexes);
        for (const bh of blast) {
          enemyPlayer.units = enemyPlayer.units.filter(u => !(u.hexCol === bh.col && u.hexRow === bh.row));
          aiPlayer.units = aiPlayer.units.filter(u => !(u.hexCol === bh.col && u.hexRow === bh.row && u.id !== unit.id));
          g.barbarians = (g.barbarians || []).filter(b => !(b.hexCol === bh.col && b.hexRow === bh.row));
          const dc = enemyPlayer.cities.find(c => { const h = g.hexes[c.hexId]; return h.col === bh.col && h.row === bh.row; });
          if (dc) {
            dc.hp = Math.max(1, (dc.hp || 20) - 10);
            addLogFn(`☢ ${dc.name} hit! (${dc.hp}HP)`, g);
          }
        }
        aiPlayer.units = aiPlayer.units.filter(u => u.id !== unit.id);
        addLogFn(`☢ AI NUCLEAR STRIKE!`, g);
        break;
      }
    }
  }

  // Third pass: combat units (attack then move)
  for (const unit of [...aiPlayer.units]) {
    if (processedUnits.has(unit.id)) continue;
    if (unit.unitType === "settler") continue;
    processedUnits.add(unit.id);

    const unitDef = UNIT_DEFS[unit.unitType];
    if (!unitDef) continue;

    // Check for attack targets
    if (!unit.hasAttacked) {
      const range = unitDef.range || 1;
      let bestTarget = null, bestTargetScore = -Infinity;

      // Check enemy units in range
      for (const eu of enemyPlayer.units) {
        const dist = hexDist(unit.hexCol, unit.hexRow, eu.hexCol, eu.hexRow);
        if (dist > range) continue;

        const euDef = UNIT_DEFS[eu.unitType];
        const preview = calcCombatPreview(
          unit, unitDef, eu, euDef,
          g.hexes.find(h => h.col === eu.hexCol && h.row === eu.hexRow)?.terrainType,
          aiPlayer, enemyPlayer, false
        );

        // Score: prefer kills, avoid suicidal attacks
        let score = preview.aDmg;
        if (preview.defDies) score += 20;
        if (preview.atkDies) score -= 30;
        if (score > bestTargetScore) {
          bestTargetScore = score;
          bestTarget = { col: eu.hexCol, row: eu.hexRow, isUnit: true, unit: eu };
        }
      }

      // Check barbarians in range
      for (const barb of (g.barbarians || [])) {
        const dist = hexDist(unit.hexCol, unit.hexRow, barb.hexCol, barb.hexRow);
        if (dist > range) continue;

        const barbDef = UNIT_DEFS[barb.unitType];
        const fakePlayer = { researchedTechs: [], civilization: "Barbarian" };
        const preview = calcCombatPreview(unit, unitDef, barb, barbDef, null, aiPlayer, fakePlayer, false);

        let score = preview.aDmg + 5; // slight preference for barbs (gold reward)
        if (preview.defDies) score += 20;
        if (preview.atkDies) score -= 30;
        if (score > bestTargetScore) {
          bestTargetScore = score;
          bestTarget = { col: barb.hexCol, row: barb.hexRow, isBarb: true, unit: barb };
        }
      }

      // Check enemy cities in range (bombardment)
      for (const eCity of enemyPlayer.cities) {
        const eCH = g.hexes[eCity.hexId];
        const dist = hexDist(unit.hexCol, unit.hexRow, eCH.col, eCH.row);
        if (dist > range) continue;

        // Check if there's a garrison
        const garrison = enemyPlayer.units.find(u => u.hexCol === eCH.col && u.hexRow === eCH.row);
        if (!garrison) {
          let score = unitDef.strength * 2;
          if (eCity.hp - unitDef.strength * 2 <= 0) score += 30; // can capture
          if (score > bestTargetScore) {
            bestTargetScore = score;
            bestTarget = { col: eCH.col, row: eCH.row, isCity: true, city: eCity };
          }
        }
      }

      // Execute attack if favorable
      if (bestTarget && bestTargetScore > 0) {
        const tc = bestTarget.col, tr = bestTarget.row;
        const defender = bestTarget.isUnit ? bestTarget.unit : bestTarget.isBarb ? bestTarget.unit : null;

        if (defender) {
          const defDef = UNIT_DEFS[defender.unitType];
          const defOwner = bestTarget.isBarb ? { researchedTechs: [], civilization: "Barbarian" } : enemyPlayer;
          const defHex = g.hexes.find(h => h.col === tc && h.row === tr);
          const defCity = enemyPlayer.cities.find(c => { const h = g.hexes[c.hexId]; return h.col === tc && h.row === tr; });
          const pv = calcCombatPreview(unit, unitDef, defender, defDef, defHex?.terrainType, aiPlayer, defOwner, !!defCity);

          unit.hpCurrent = Math.max(0, unit.hpCurrent - pv.dDmg);
          defender.hpCurrent = Math.max(0, defender.hpCurrent - pv.aDmg);
          unit.hasAttacked = true;

          let msg = `AI ${unitDef.name}→${bestTarget.isBarb ? "Barb " : ""}${defDef.name}: ${pv.aDmg}dmg`;
          if (pv.dDmg > 0) msg += ` took ${pv.dDmg}`;

          if (pv.defDies) {
            if (bestTarget.isUnit) enemyPlayer.units = enemyPlayer.units.filter(u => u.id !== defender.id);
            if (bestTarget.isBarb) { g.barbarians = g.barbarians.filter(b => b.id !== defender.id); aiPlayer.gold += 5; }
            msg += ` ☠${defDef.name}`;

            if (unitDef.range === 0 && !pv.atkDies) {
              unit.hexCol = tc; unit.hexRow = tr; unit.movementCurrent = 0;
              if (defCity && bestTarget.isUnit) {
                defCity.hp = (defCity.hp || 20) - 5;
                if (defCity.hp <= 0) {
                  enemyPlayer.cities = enemyPlayer.cities.filter(c => c.id !== defCity.id);
                  defCity.hp = 10; defCity.hpMax = 20; aiPlayer.cities.push(defCity);
                  if (defHex) defHex.ownerPlayerId = aiPlayer.id;
                  msg += ` 🏛${defCity.name} captured!`;
                }
              }
              if (bestTarget.isBarb && defHex && !defHex.ownerPlayerId) defHex.ownerPlayerId = aiPlayer.id;
            }
          }
          if (pv.atkDies) { aiPlayer.units = aiPlayer.units.filter(u => u.id !== unit.id); msg += ` ☠${unitDef.name}`; }
          addLogFn(msg, g);
        } else if (bestTarget.isCity) {
          const defCity = bestTarget.city;
          defCity.hp = (defCity.hp || 20) - unitDef.strength * 2;
          unit.hasAttacked = true;
          if (unitDef.range === 0) unit.movementCurrent = 0;

          let msg = `AI ${unitDef.name}→${defCity.name} (${Math.max(0, defCity.hp)}HP)`;
          if (defCity.hp <= 0) {
            const defHex = g.hexes.find(h => h.col === tc && h.row === tr);
            enemyPlayer.cities = enemyPlayer.cities.filter(c => c.id !== defCity.id);
            defCity.hp = 10; defCity.hpMax = 20; aiPlayer.cities.push(defCity);
            if (defHex) defHex.ownerPlayerId = aiPlayer.id;
            if (unitDef.range === 0) { unit.hexCol = tc; unit.hexRow = tr; }
            msg = `AI ${unitDef.name} 🏛captured ${defCity.name}!`;
          }
          addLogFn(msg, g);
        }
      }
    }

    // Move toward nearest enemy city if still has movement
    if (unit.movementCurrent > 0 && aiPlayer.units.includes(unit)) {
      const domain = unitDef.domain || "land";
      const reachable = getReachableHexes(unit.hexCol, unit.hexRow, unit.movementCurrent, g.hexes, domain, aiPlayer.id, g.players);
      if (reachable.size > 0) {
        // Find best move: toward nearest enemy city or unit
        let goalCol = null, goalRow = null, goalDist = Infinity;

        for (const eCity of enemyPlayer.cities) {
          const eCH = g.hexes[eCity.hexId];
          const dist = hexDist(unit.hexCol, unit.hexRow, eCH.col, eCH.row);
          if (dist < goalDist) { goalDist = dist; goalCol = eCH.col; goalRow = eCH.row; }
        }

        if (goalCol !== null) {
          let bestMove = null, bestMoveDist = goalDist;
          for (const key of reachable) {
            const [mc, mr] = key.split(",").map(Number);
            // Don't move onto own cities with units already there
            const dist = hexDist(mc, mr, goalCol, goalRow);
            if (dist < bestMoveDist) { bestMoveDist = dist; bestMove = { col: mc, row: mr }; }
          }
          if (bestMove) {
            unit.hexCol = bestMove.col;
            unit.hexRow = bestMove.row;
            unit.movementCurrent = 0;
          }
        } else if (unit.unitType === "scout") {
          // Scouts move randomly to explore
          const keys = [...reachable];
          if (keys.length > 0) {
            const rk = keys[Math.floor(gameRng(g) * keys.length)];
            const [mc, mr] = rk.split(",").map(Number);
            unit.hexCol = mc;
            unit.hexRow = mr;
            unit.movementCurrent = 0;
          }
        }
      }
    }
  }
};

// Execute an entire AI turn: research → city → movement/combat → end
const aiExecuteTurn = (gameState, addLogFn) => {
  const g = JSON.parse(JSON.stringify(gameState));
  const aiPlayer = g.players.find(p => p.id === g.currentPlayerId);
  const enemyPlayer = g.players.find(p => p.id !== g.currentPlayerId);

  // --- RESEARCH ---
  const techPick = aiPickResearch(aiPlayer, g.hexes, enemyPlayer);
  if (techPick) {
    aiPlayer.currentResearch = { techId: techPick, progress: 0 };
    addLogFn(`${aiPlayer.name} researching ${TECH_TREE[techPick].name}`, g);
  }

  // --- CITY PHASE (income, production, growth) ---
  const income = calcPlayerIncome(aiPlayer, g.hexes);

  // Research progress
  if (aiPlayer.currentResearch) {
    aiPlayer.currentResearch.progress += income.science;
    const tech = TECH_TREE[aiPlayer.currentResearch.techId];
    if (tech && aiPlayer.currentResearch.progress >= tech.cost) {
      aiPlayer.researchedTechs.push(aiPlayer.currentResearch.techId);
      addLogFn(`${aiPlayer.name} researched ${tech.name}!`, g);
      aiPlayer.currentResearch = null;
    }
  }

  aiPlayer.gold += income.gold;
  aiPlayer.science += income.science;

  // Process each city
  for (const city of aiPlayer.cities) {
    const yields = calcCityYields(city, aiPlayer, g.hexes);

    // Set production if idle
    if (!city.currentProduction) {
      const prod = aiPickProduction(city, aiPlayer, g.hexes, enemyPlayer);
      if (prod) {
        city.currentProduction = prod;
        city.productionProgress = 0;
      }
    }

    // Advance production
    if (city.currentProduction) {
      city.productionProgress += yields.production;
      const isUnit = city.currentProduction.type === "unit";
      const def = isUnit ? UNIT_DEFS[city.currentProduction.itemId] : DISTRICT_DEFS[city.currentProduction.itemId];

      if (def && city.productionProgress >= def.cost) {
        if (isUnit) {
          const cityHex = g.hexes[city.hexId];
          g.nextUnitId = (g.nextUnitId || 0) + 1;
          aiPlayer.units.push({
            id: `${aiPlayer.id}-u${g.nextUnitId}`, unitType: city.currentProduction.itemId,
            hexCol: cityHex.col, hexRow: cityHex.row,
            movementCurrent: def.move, hpCurrent: def.hp, hasAttacked: false,
          });
          if (city.currentProduction.itemId === "nuke") aiPlayer.gold -= 15;
        } else {
          city.districts.push(city.currentProduction.itemId);
        }
        addLogFn(`${city.name} built ${def.name}!`, g);
        city.currentProduction = null;
        city.productionProgress = 0;
      }
    }

    // Food/growth
    city.foodAccumulated += yields.food;
    const growthThreshold = city.population * 10;
    if (city.foodAccumulated >= growthThreshold) {
      city.population++;
      city.foodAccumulated -= growthThreshold;
      addLogFn(`${city.name} grew to pop ${city.population}!`, g);
    }

    // Healing
    if (city.hp < (city.hpMax || 20)) city.hp = Math.min(city.hpMax || 20, city.hp + 2);
  }

  // Territory expansion
  for (const city of aiPlayer.cities) {
    const cityHex = g.hexes[city.hexId];
    for (const [nc, nr] of getNeighbors(cityHex.col, cityHex.row)) {
      const neighbor = g.hexes.find(h => h.col === nc && h.row === nr);
      if (neighbor && !neighbor.ownerPlayerId && neighbor.terrainType !== "water") {
        neighbor.ownerPlayerId = aiPlayer.id;
      }
    }
  }

  // --- MOVEMENT & COMBAT ---
  aiPlanAndExecuteMoves(g, aiPlayer, enemyPlayer, addLogFn);

  // Garrison healing after moves
  for (const unit of aiPlayer.units) {
    const inCity = aiPlayer.cities.some(c => {
      const h = g.hexes[c.hexId];
      return h.col === unit.hexCol && h.row === unit.hexRow;
    });
    if (inCity) {
      const maxHp = UNIT_DEFS[unit.unitType]?.hp || 10;
      unit.hpCurrent = Math.min(maxHp, unit.hpCurrent + 3);
    }
  }

  return g;
};

// ============================================================
// TUTORIAL TIPS
// ============================================================
// Each tip has an id, a trigger condition, a title, body text, and an optional position hint.
// Tips appear as dismissible cards when their condition is met and the tutorial is active.
const TUTORIAL_TIPS = [
  {
    id: "welcome",
    trigger: (gs) => gs && gs.turnNumber === 1 && gs.phase === "RESEARCH",
    icon: "🏛",
    title: "Welcome to Empires of Earth!",
    body: "Your goal: build cities, research technology, and conquer the map. Each turn has phases — Research, City, Movement, Combat, and End Turn. Use the \"Next →\" button to advance through them.",
    position: "center",
  },
  {
    id: "research_phase",
    trigger: (gs, dismissed) => gs && gs.phase === "RESEARCH" && !gs.players.find(p => p.id === gs.currentPlayerId)?.currentResearch && dismissed["welcome"],
    icon: "🔬",
    title: "Research Phase",
    body: "Click the \"Tech\" button to open the technology tree, then click an available tech to start researching it. Research unlocks new units, buildings, and bonuses. You can skip this if you already have research queued.",
    position: "top",
  },
  {
    id: "city_phase",
    trigger: (gs) => gs && gs.phase === "CITY",
    icon: "🏗",
    title: "City Management Phase",
    body: "Click on your cities (on the map) to open the city panel. From there you can choose what to build — units for your army or districts to boost your economy. Cities produce automatically each turn.",
    position: "top",
  },
  {
    id: "movement_phase",
    trigger: (gs) => gs && gs.phase === "MOVEMENT",
    icon: "🗺",
    title: "Movement Phase",
    body: "Click a unit to select it (or press Tab to cycle). Blue highlights show where it can move — right-click to move there. Red highlights show attack targets — right-click to attack. Settlers can found new cities (click the \"Found City\" button).",
    position: "top",
  },
  {
    id: "combat_tip",
    trigger: (gs, dismissed, extra) => gs && gs.phase === "MOVEMENT" && extra?.selectedUnitNearEnemy,
    icon: "⚔",
    title: "Combat",
    body: "Hover over an enemy in range to see a combat preview. Right-click to attack. Melee units advance into the hex if the defender dies. Ranged units attack without moving and take no counter-damage.",
    position: "bottom",
  },
  {
    id: "fog_of_war",
    trigger: (gs) => gs && gs.turnNumber === 1 && gs.phase === "MOVEMENT",
    icon: "👁",
    title: "Fog of War",
    body: "Dark hexes are unexplored. Dimmed hexes were explored but aren't currently visible. Move scouts to reveal the map — they have the longest sight range.",
    position: "bottom",
  },
  {
    id: "end_turn",
    trigger: (gs) => gs && gs.phase === "END",
    icon: "⏭",
    title: "End Turn",
    body: "Click \"End Turn →\" to pass to the next player (or the AI). Barbarians may spawn and random events can occur between turns.",
    position: "top",
  },
  {
    id: "settler_tip",
    trigger: (gs, dismissed, extra) => gs && gs.phase === "MOVEMENT" && extra?.hasSettlerSelected,
    icon: "🏕",
    title: "Found a City",
    body: "You have a settler selected! Click the \"Found City\" button in the action bar, then click any valid land hex to establish a new city. Settlers are consumed when founding.",
    position: "center",
  },
  {
    id: "victory_conditions",
    trigger: (gs) => gs && gs.turnNumber === 3 && gs.phase === "RESEARCH",
    icon: "🏆",
    title: "Victory Conditions",
    body: "There are three ways to win: Domination (capture all enemy cities), Science (research Quantum Computing + Fusion Power), or Territorial (control 60% of land). Plan your strategy accordingly!",
    position: "center",
  },
];

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function HexStrategyGame(){
  const[gameMode,setGameMode]=useState(null); // null | "local" | "ai"
  const[civPick,setCivPick]=useState({p1:"Rome",p2:"China"});
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
  const[moveMsg,setMoveMsg]=useState(null); // transient "can't move" feedback
  const[eventPopup,setEventPopup]=useState(null);
  const[aiThinking,setAiThinking]=useState(false);
  const[tutorialOn,setTutorialOn]=useState(true);
  const[tutorialDismissed,setTutorialDismissed]=useState({}); // keyed by tip id
  const[techCollapsed,setTechCollapsed]=useState(false);
  const[cityCollapsed,setCityCollapsed]=useState(false);
  const[,forceRender]=useState(0); // bump to force re-render during panel drag
  const victoryPlayed=useRef(false);

  // Derived state (safe when gs is null)
  const hexes=gs?.hexes||[];
  const players=gs?.players||[];
  const turnNumber=gs?.turnNumber||1;
  const cpId=gs?.currentPlayerId||"p1";
  const phase=gs?.phase||"RESEARCH";
  const log=gs?.log||[];
  const barbarians=gs?.barbarians||[];
  const cp=players.find(p=>p.id===cpId)||{units:[],cities:[],researchedTechs:[],civilization:"Rome",name:"",color:"#888",colorBg:"#444",colorLight:"#aaa",gold:0,science:0};
  const op=players.find(p=>p.id!==cpId);
  const inc=useMemo(()=>gs?calcPlayerIncome(cp,hexes):{food:0,production:0,science:0,gold:0},[cp,hexes,gs]);
  const visData=useMemo(()=>hexes.map(h=>({blades:genGrass(h.id),detail:genDetail(h.id),trees:h.terrainType==="forest"?genTrees(h.id):{trunks:"",canopy:""},mtns:h.terrainType==="mountain"?genMtns(h.id):{peaks:"",snow:""},waves:h.terrainType==="water"?genWaves(h.id):""})),[hexes]);
  const cityMap=useMemo(()=>{const m={};players.forEach(p=>p.cities.forEach(c=>{m[c.hexId]={city:c,player:p};}));return m;},[players]);
  const unitMap=useMemo(()=>{const m={};
    players.forEach(p=>p.units.forEach(u=>{const k=`${u.hexCol},${u.hexRow}`;if(!m[k])m[k]=[];m[k].push({...u,pid:p.id,pCol:p.color,pBg:p.colorBg});}));
    barbarians.forEach(b=>{const k=`${b.hexCol},${b.hexRow}`;if(!m[k])m[k]=[];m[k].push({...b,pid:"barb",pCol:"#c05050",pBg:"#4a1010"});});
    return m;},[players,barbarians]);
  const fogVisible=useMemo(()=>gs?getVisibleHexes(cp,hexes):new Set(),[cp,hexes,gs]);
  const fogExplored=useMemo(()=>{if(!gs)return new Set();return new Set(gs.explored?.[cpId]||[]);},[gs,cpId]);
  const sud=useMemo(()=>{if(!selU||!gs)return null;const u=cp.units.find(u2=>u2.id===selU);if(!u)return null;return{...u,def:UNIT_DEFS[u.unitType]};},[selU,cp,gs]);

  const reach=useMemo(()=>{
    if(!sud||phase!=="MOVEMENT"||sud.movementCurrent<=0)return new Set();
    return getReachableHexes(sud.hexCol,sud.hexRow,sud.movementCurrent,hexes,sud.def?.domain||"land",cpId,players);
  },[sud,hexes,phase,cpId,players]);

  const atkRange=useMemo(()=>{
    if(!sud||phase!=="MOVEMENT"||!sud.def?.range||sud.hasAttacked)return new Set();
    return getRangedTargets(sud.hexCol,sud.hexRow,sud.def.range);
  },[sud,phase]);

  const nukeR=useMemo(()=>{
    if(!nukeM)return new Set();const nu=cp.units.find(u=>u.id===nukeM);
    if(!nu)return new Set();return getRangedTargets(nu.hexCol,nu.hexRow,3);
  },[nukeM,cp]);

  const actable=useMemo(()=>{
    if(phase!=="MOVEMENT")return new Set();
    return new Set(cp.units.filter(u=>u.movementCurrent>0||(!u.hasAttacked&&(UNIT_DEFS[u.unitType]?.range||0)>0)).map(u=>u.id));
  },[cp,phase]);

  // Pan/zoom
  const panRef=useRef({x:0,y:0}),zoomRef=useRef(1),isPanRef=useRef(false),psRef=useRef({x:0,y:0,px:0,py:0});
  const gRef=useRef(null),svgRef=useRef(null),dirtyRef=useRef(false);
  // Panel drag refs
  const techPosRef=useRef({x:null,y:95}),cityPosRef=useRef({x:null,y:95});
  const draggingPanelRef=useRef(null),dragOffsetRef=useRef({x:0,y:0});
  // Minimap
  const minimapRef=useRef(null),minimapRenderRef=useRef(null);
  const MINIMAP_W=160,MINIMAP_H=140;
  const wW=COLS*1.5*HEX_SIZE+HEX_SIZE*2+100,wH=ROWS*SQRT3*HEX_SIZE+SQRT3*HEX_SIZE+100;
  const flush=useCallback(()=>{const z=zoomRef.current,p=panRef.current,cx=window.innerWidth/2,cy=window.innerHeight/2;if(gRef.current)gRef.current.style.transform=`translate(${p.x+cx-(wW*z)/2}px,${p.y+cy-(wH*z)/2}px) scale(${z})`;dirtyRef.current=false;if(minimapRenderRef.current)minimapRenderRef.current();},[wW,wH]);
  const sched=useCallback(()=>{if(!dirtyRef.current){dirtyRef.current=true;requestAnimationFrame(flush);}},[flush]);
  useEffect(()=>{flush();},[flush]);
  useEffect(()=>{if(Object.keys(flashes).length>0){const t=setTimeout(()=>setFlashes({}),800);return()=>clearTimeout(t);}},[flashes]);
  useEffect(()=>{if(moveMsg){const t=setTimeout(()=>setMoveMsg(null),1500);return()=>clearTimeout(t);}},[moveMsg]);
  // Update explored set when fog visibility changes
  useEffect(()=>{if(!gs||fogVisible.size===0)return;
    setGs(prev=>{if(!prev)return prev;const ex=prev.explored||{};const cur=ex[cpId]||[];const s=new Set(cur);let changed=false;
      for(const k of fogVisible){if(!s.has(k)){s.add(k);changed=true;}}
      if(!changed)return prev;return{...prev,explored:{...ex,[cpId]:[...s]}};});
  },[fogVisible,cpId]);

  // === MINIMAP ===
  const minimapScaleX=MINIMAP_W/wW,minimapScaleY=MINIMAP_H/wH;
  const renderMinimap=useCallback(()=>{
    if(!minimapRef.current||!gs)return;const ctx=minimapRef.current.getContext("2d");
    const MTC={grassland:"#5a9030",forest:"#1e6a38",mountain:"#6a6a5a",water:"#2a5a8a"};
    ctx.fillStyle="#0a0e06";ctx.fillRect(0,0,MINIMAP_W,MINIMAP_H);
    for(const h of hexes){const cx2=h.x*minimapScaleX,cy2=h.y*minimapScaleY;
      const vis=fogVisible.has(`${h.col},${h.row}`),expl=fogExplored.has(`${h.col},${h.row}`);
      if(!vis&&!expl)continue;
      ctx.globalAlpha=vis?1:0.35;ctx.fillStyle=MTC[h.terrainType]||"#444";ctx.fillRect(cx2-1.5,cy2-1.5,3,3);}
    for(const p of players){ctx.fillStyle=p.color;for(const c of p.cities){const ch=hexes[c.hexId];if(!ch)continue;
      const vis2=fogVisible.has(`${ch.col},${ch.row}`)||fogExplored.has(`${ch.col},${ch.row}`);if(!vis2)continue;
      ctx.globalAlpha=1;ctx.fillRect(ch.x*minimapScaleX-2,ch.y*minimapScaleY-2,5,5);}}
    ctx.globalAlpha=1;const z=zoomRef.current,pan=panRef.current;
    const vpCx=window.innerWidth/2,vpCy=window.innerHeight/2;
    const wl=((wW*z)/2-pan.x-vpCx)/z,wt=((wH*z)/2-pan.y-vpCy)/z;
    const vpW=window.innerWidth/z,vpH=window.innerHeight/z;
    ctx.strokeStyle="rgba(255,255,255,.55)";ctx.lineWidth=1;
    ctx.strokeRect(wl*minimapScaleX,wt*minimapScaleY,vpW*minimapScaleX,vpH*minimapScaleY);
  },[hexes,fogVisible,fogExplored,players,gs,minimapScaleX,minimapScaleY,wW,wH]);

  useEffect(()=>{minimapRenderRef.current=renderMinimap;renderMinimap();},[renderMinimap]);

  const onMinimapClick=useCallback(e=>{if(!minimapRef.current)return;const r=minimapRef.current.getBoundingClientRect();
    const mx=e.clientX-r.left,my=e.clientY-r.top;
    const worldX=mx/minimapScaleX,worldY=my/minimapScaleY;
    const z=zoomRef.current;
    panRef.current={x:(wW*z)/2-worldX*z,y:(wH*z)/2-worldY*z};
    sched();},[minimapScaleX,minimapScaleY,wW,wH,sched]);

  const onMD=useCallback(e=>{isPanRef.current=true;psRef.current={x:e.clientX,y:e.clientY,px:panRef.current.x,py:panRef.current.y};if(svgRef.current)svgRef.current.style.cursor="grabbing";},[]);
  const onMM=useCallback(e=>{if(!isPanRef.current)return;panRef.current={x:psRef.current.px+e.clientX-psRef.current.x,y:psRef.current.py+e.clientY-psRef.current.y};sched();},[sched]);
  const onMU=useCallback(()=>{isPanRef.current=false;if(svgRef.current)svgRef.current.style.cursor="grab";},[]);
  const onWh=useCallback(e=>{e.preventDefault();zoomRef.current=Math.min(3,Math.max(.3,zoomRef.current-e.deltaY*.001));sched();},[sched]);

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

  const addLog=useCallback((msg,g)=>{g.log=[...(g.log||[]).slice(-30),msg];},[]);

  const checkVictory=useCallback(g=>{
    const p1=g.players[0],p2=g.players[1];
    if(p1.cities.length===0){g.victoryStatus={winner:"p2",type:"Domination"};return;}
    if(p2.cities.length===0){g.victoryStatus={winner:"p1",type:"Domination"};return;}
    for(const p of g.players){
      if(p.researchedTechs.includes("quantum_computing")&&p.researchedTechs.includes("fusion_power")){g.victoryStatus={winner:p.id,type:"Science"};return;}}
    const land=g.hexes.filter(h=>h.terrainType!=="water");
    for(const p of g.players){const own=land.filter(h=>h.ownerPlayerId===p.id).length;
      if(own>=Math.ceil(land.length*TERRITORIAL_WIN)){g.victoryStatus={winner:p.id,type:"Territorial"};return;}}
  },[]);

  // === NUKE ===
  const launchNuke=useCallback((nuId,tc,tr)=>{
    setGs(prev=>{const g=JSON.parse(JSON.stringify(prev));const aP=g.players.find(p=>p.id===g.currentPlayerId);const dP=g.players.find(p=>p.id!==g.currentPlayerId);
      const ni=aP.units.findIndex(u=>u.id===nuId);if(ni===-1)return prev;aP.units.splice(ni,1);
      const blast=getHexesInRadius(tc,tr,1,g.hexes);const fl={};
      for(const bh of blast){const k=`${bh.col},${bh.row}`;fl[k]="nuke";
        // Kill all units in blast (both sides — friendly fire)
        dP.units=dP.units.filter(u=>!(u.hexCol===bh.col&&u.hexRow===bh.row));
        aP.units=aP.units.filter(u=>!(u.hexCol===bh.col&&u.hexRow===bh.row));
        g.barbarians=(g.barbarians||[]).filter(b=>!(b.hexCol===bh.col&&b.hexRow===bh.row));
        // Damage cities but do NOT auto-capture — need ground troops for that
        const dc=dP.cities.find(c=>{const h=g.hexes[c.hexId];return h&&h.col===bh.col&&h.row===bh.row;});
        if(dc){dc.hp=Math.max(1,(dc.hp||20)-10);addLog(`☢ ${dc.name} hit! (${dc.hp}HP)`,g);}}
      addLog(`☢ NUCLEAR STRIKE at (${tc},${tr})!`,g);setFlashes(fl);checkVictory(g);return g;});
    setNukeM(null);setSelU(null);SFX.nuke();
  },[addLog,checkVictory]);

  // === COMBAT ===
  // Try to capture a city after killing its garrison (or attacking it directly)
  const tryCaptureCity = (city, attackerPlayer, defenderPlayer, hex, g) => {
    defenderPlayer.cities = defenderPlayer.cities.filter(c => c.id !== city.id);
    city.hp = 10;
    city.hpMax = 20;
    attackerPlayer.cities.push(city);
    if (hex) hex.ownerPlayerId = attackerPlayer.id;
    return `🏛${city.name} captured!`;
  };

  const doCombat = useCallback((attackerId, defCol, defRow) => {
    setGs(prev => {
      const g = JSON.parse(JSON.stringify(prev));
      const attPlayer = g.players.find(p => p.id === g.currentPlayerId);
      const defPlayer = g.players.find(p => p.id !== g.currentPlayerId);

      const attUnit = attPlayer.units.find(u => u.id === attackerId);
      if (!attUnit) return prev;
      const attDef = UNIT_DEFS[attUnit.unitType];

      // Find what we're attacking: enemy unit, barbarian, or undefended city
      const defUnit = defPlayer.units.find(u => u.hexCol === defCol && u.hexRow === defRow);
      if (!g.barbarians) g.barbarians = [];
      const barbUnit = g.barbarians.find(b => b.hexCol === defCol && b.hexRow === defRow);
      const defCity = defPlayer.cities.find(c => {
        const h = g.hexes[c.hexId];
        return h.col === defCol && h.row === defRow;
      });
      const defHex = g.hexes.find(h => h.col === defCol && h.row === defRow);
      const flashKey = `${defCol},${defRow}`;

      const defender = defUnit || barbUnit;

      if (defender) {
        // --- Unit vs unit combat ---
        const defDef = UNIT_DEFS[defender.unitType];
        const defOwner = defUnit ? defPlayer : { researchedTechs: [], civilization: "Barbarian" };
        const preview = calcCombatPreview(attUnit, attDef, defender, defDef, defHex?.terrainType, attPlayer, defOwner, !!defCity);

        // Apply damage
        attUnit.hpCurrent = Math.max(0, attUnit.hpCurrent - preview.dDmg);
        defender.hpCurrent = Math.max(0, defender.hpCurrent - preview.aDmg);
        attUnit.hasAttacked = true;

        let msg = `${attDef.name}→${barbUnit ? "Barb " : ""}${defDef.name}: ${preview.aDmg}dmg`;
        if (preview.dDmg > 0) msg += ` took ${preview.dDmg}`;

        // Defender killed
        if (preview.defDies) {
          if (defUnit) defPlayer.units = defPlayer.units.filter(u => u.id !== defUnit.id);
          if (barbUnit) { g.barbarians = g.barbarians.filter(b => b.id !== barbUnit.id); attPlayer.gold += 5; }
          msg += ` ☠${barbUnit ? "Barb +5💰 " : ""}${defDef.name}`;

          // Melee attacker advances into the hex
          if (attDef.range === 0 && !preview.atkDies) {
            attUnit.hexCol = defCol;
            attUnit.hexRow = defRow;
            attUnit.movementCurrent = 0;

            // Damage/capture city if garrison was killed
            if (defCity && defUnit) {
              defCity.hp = (defCity.hp || 20) - 5;
              if (defCity.hp <= 0) msg += ` ${tryCaptureCity(defCity, attPlayer, defPlayer, defHex, g)}`;
            }
            // Claim unclaimed barbarian hex
            if (barbUnit && defHex && !defHex.ownerPlayerId) defHex.ownerPlayerId = attPlayer.id;
          }
        }

        // Attacker killed
        if (preview.atkDies) {
          attPlayer.units = attPlayer.units.filter(u => u.id !== attUnit.id);
          msg += ` ☠${attDef.name}`;
        }

        addLog(msg, g);

      } else if (defCity) {
        // --- Direct city bombardment (no garrison) ---
        defCity.hp = (defCity.hp || 20) - attDef.strength * 2;
        attUnit.hasAttacked = true;
        if (attDef.range === 0) attUnit.movementCurrent = 0;

        let msg = `${attDef.name}→${defCity.name} (${Math.max(0, defCity.hp)}HP)`;
        if (defCity.hp <= 0) {
          msg = `${attDef.name} ${tryCaptureCity(defCity, attPlayer, defPlayer, defHex, g)}`;
          if (attDef.range === 0) { attUnit.hexCol = defCol; attUnit.hexRow = defRow; }
        }

        addLog(msg, g);
      }

      setFlashes({ [flashKey]: "combat" });
      checkVictory(g);
      return g;
    });

    setSelU(null);
    setPreview(null);
    SFX.combat();
  }, [addLog, checkVictory]);

  // === PHASE ===
  // --- Phase sub-steps (extracted from advPhase for readability) ---

  // Process research progress and collect income
  const processResearchAndIncome = (player, g, sfxQ) => {
    const income = calcPlayerIncome(player, g.hexes);

    if (player.currentResearch) {
      player.currentResearch.progress += income.science;
      const tech = TECH_TREE[player.currentResearch.techId];
      if (tech && player.currentResearch.progress >= tech.cost) {
        player.researchedTechs.push(player.currentResearch.techId);
        addLog(`${player.name} researched ${tech.name}!`, g);
        player.currentResearch = null;
        sfxQ.push("research");
      }
    }

    player.gold += income.gold;
    player.science += income.science;
  };

  // Process a single city's production, food/growth, and healing
  const processCityTurn = (city, player, g, sfxQ) => {
    const yields = calcCityYields(city, player, g.hexes);

    // Production progress
    if (city.currentProduction) {
      city.productionProgress += yields.production;
      const isUnit = city.currentProduction.type === "unit";
      const def = isUnit
        ? UNIT_DEFS[city.currentProduction.itemId]
        : DISTRICT_DEFS[city.currentProduction.itemId];

      if (def && city.productionProgress >= def.cost) {
        if (isUnit) {
          const cityHex = g.hexes[city.hexId];
          g.nextUnitId = (g.nextUnitId || 0) + 1;
          player.units.push({
            id: `${player.id}-u${g.nextUnitId}`,
            unitType: city.currentProduction.itemId,
            hexCol: cityHex.col, hexRow: cityHex.row,
            movementCurrent: def.move, hpCurrent: def.hp, hasAttacked: false,
          });
          if (city.currentProduction.itemId === "nuke") player.gold -= 15;
        } else {
          city.districts.push(city.currentProduction.itemId);
        }
        addLog(`${city.name} built ${def.name}!`, g);
        sfxQ.push("build");
        city.currentProduction = null;
        city.productionProgress = 0;
      }
    }

    // Food accumulation and population growth
    city.foodAccumulated += yields.food;
    const growthThreshold = city.population * 10;
    if (city.foodAccumulated >= growthThreshold) {
      city.population++;
      city.foodAccumulated -= growthThreshold;
      addLog(`${city.name} grew to pop ${city.population}!`, g);
    }

    // City wall healing
    if (city.hp < (city.hpMax || 20)) {
      city.hp = Math.min(city.hpMax || 20, city.hp + 2);
    }
  };

  // Expand territory around all of a player's cities
  const expandTerritory = (player, g) => {
    for (const city of player.cities) {
      const cityHex = g.hexes[city.hexId];
      for (const [nc, nr] of getNeighbors(cityHex.col, cityHex.row)) {
        const neighbor = g.hexes.find(h => h.col === nc && h.row === nr);
        if (neighbor && !neighbor.ownerPlayerId && neighbor.terrainType !== "water") {
          neighbor.ownerPlayerId = player.id;
        }
      }
    }
  };

  // Reset movement for all units and heal those garrisoned in cities
  const refreshUnits = (player, g) => {
    for (const unit of player.units) {
      unit.movementCurrent = UNIT_DEFS[unit.unitType]?.move || 2;
      unit.hasAttacked = false;
    }
    // Garrison healing
    for (const unit of player.units) {
      const inCity = player.cities.some(c => {
        const h = g.hexes[c.hexId];
        return h.col === unit.hexCol && h.row === unit.hexRow;
      });
      if (inCity) {
        const maxHp = UNIT_DEFS[unit.unitType]?.hp || 10;
        unit.hpCurrent = Math.min(maxHp, unit.hpCurrent + 3);
      }
    }
  };

  // Spawn a barbarian if conditions are met (every 3 turns, max 6)
  const spawnBarbarians = (g) => {
    if (!g.barbarians) g.barbarians = [];
    if (g.turnNumber % 3 !== 0 || g.barbarians.length >= 6) return;

    const emptyHexes = g.hexes.filter(
      h => h.terrainType !== "water" && h.terrainType !== "mountain" && !h.cityId && !h.ownerPlayerId
    );
    if (emptyHexes.length === 0) return;

    const spawnHex = emptyHexes[Math.floor(gameRng(g) * emptyHexes.length)];
    const barbType = BARB_UNITS[Math.min(Math.floor(g.turnNumber / 6), BARB_UNITS.length - 1)];
    const barbDef = UNIT_DEFS[barbType];

    g.nextUnitId = (g.nextUnitId || 0) + 1;
    g.barbarians.push({
      id: `barb-${g.nextUnitId}`, unitType: barbType,
      hexCol: spawnHex.col, hexRow: spawnHex.row,
      hpCurrent: barbDef.hp, movementCurrent: barbDef.move, hasAttacked: false,
    });
    addLog(`⚠ Barbarian ${barbDef.name} spotted at (${spawnHex.col},${spawnHex.row})!`, g);
  };

  // Find nearest player unit or city to a barbarian
  const findNearestTarget = (barb, players, hexes) => {
    let bestHex = null, bestDist = Infinity;
    for (const player of players) {
      for (const unit of player.units) {
        const dist = hexDist(barb.hexCol, barb.hexRow, unit.hexCol, unit.hexRow);
        if (dist < bestDist) { bestDist = dist; bestHex = { col: unit.hexCol, row: unit.hexRow }; }
      }
      for (const city of player.cities) {
        const cityH = hexes[city.hexId];
        const dist = hexDist(barb.hexCol, barb.hexRow, cityH.col, cityH.row);
        if (dist < bestDist) { bestDist = dist; bestHex = { col: cityH.col, row: cityH.row }; }
      }
    }
    return { bestHex, bestDist };
  };

  // Move and attack with all barbarians
  const processBarbarians = (g) => {
    for (const barb of g.barbarians) {
      barb.movementCurrent = UNIT_DEFS[barb.unitType]?.move || 2;
      barb.hasAttacked = false;

      const { bestHex, bestDist } = findNearestTarget(barb, g.players, g.hexes);

      // Move one step toward nearest target
      if (bestHex && bestDist > 1) {
        const neighbors = getNeighbors(barb.hexCol, barb.hexRow);
        let moveTarget = null, moveTargetDist = Infinity;
        for (const [nc, nr] of neighbors) {
          const hex = g.hexes.find(h => h.col === nc && h.row === nr);
          if (!hex || hex.terrainType === "water" || hex.terrainType === "mountain") continue;
          const dist = hexDist(nc, nr, bestHex.col, bestHex.row);
          if (dist < moveTargetDist) { moveTargetDist = dist; moveTarget = { col: nc, row: nr }; }
        }
        if (moveTarget) { barb.hexCol = moveTarget.col; barb.hexRow = moveTarget.row; }
      }

      // Auto-attack adjacent player units
      if (bestDist <= 1 && !barb.hasAttacked) {
        for (const player of g.players) {
          const target = player.units.find(u => u.hexCol === bestHex.col && u.hexRow === bestHex.row);
          if (!target) continue;

          const barbDef = UNIT_DEFS[barb.unitType];
          const targetDef = UNIT_DEFS[target.unitType];
          const dmg = Math.max(1, Math.round(barbDef.strength * 3 - targetDef.strength));
          const counterDmg = Math.max(1, Math.round(targetDef.strength * 2 - barbDef.strength));

          target.hpCurrent -= dmg;
          barb.hpCurrent -= counterDmg;
          barb.hasAttacked = true;
          addLog(`⚠ Barbarian ${barbDef.name}→${targetDef.name}: ${dmg}dmg`, g);

          if (target.hpCurrent <= 0) {
            player.units = player.units.filter(u => u.id !== target.id);
            addLog(`☠ ${targetDef.name} killed by barbarians!`, g);
          }
          if (barb.hpCurrent <= 0) {
            g.barbarians = g.barbarians.filter(b => b.id !== barb.id);
            addLog(`☠ Barbarian ${barbDef.name} destroyed!`, g);
          }
          break;
        }
      }
    }
  };

  // Roll for a random event (20% chance per full turn)
  const rollRandomEvent = (g) => {
    if (gameRng(g) < 0.20) {
      const evt = RANDOM_EVENTS[Math.floor(gameRng(g) * RANDOM_EVENTS.length)];
      evt.effect(g, addLog);
      g.eventMsg = { name: evt.name, desc: evt.desc };
      addLog(`🎲 Event: ${evt.name} — ${evt.desc}`, g);
    } else {
      g.eventMsg = null;
    }
  };

  // --- Main phase advancement ---
  const advPhase = useCallback(() => {
    let sfxQ = [];

    setGs(prev => {
      const g = JSON.parse(JSON.stringify(prev));
      const phaseIdx = PHASES.indexOf(g.phase);
      const currentPlayer = g.players.find(p => p.id === g.currentPlayerId);

      if (phaseIdx < PHASES.length - 1) {
        // Advance to next phase within the same turn
        g.phase = PHASES[phaseIdx + 1];

        if (g.phase === "CITY") {
          processResearchAndIncome(currentPlayer, g, sfxQ);
          for (const city of currentPlayer.cities) processCityTurn(city, currentPlayer, g, sfxQ);
          expandTerritory(currentPlayer, g);
        }

        if (g.phase === "MOVEMENT") {
          refreshUnits(currentPlayer, g);
        }
      } else {
        // End of turn — swap to other player
        g.currentPlayerId = g.currentPlayerId === "p1" ? "p2" : "p1";

        // If we've looped back to p1, a full round is complete
        if (g.currentPlayerId === "p1") {
          g.turnNumber++;
          spawnBarbarians(g);
          processBarbarians(g);
          rollRandomEvent(g);
        }

        g.phase = "RESEARCH";
        const nextPlayer = g.players.find(p => p.id === g.currentPlayerId);
        refreshUnits(nextPlayer, g);
        addLog(`Turn ${g.turnNumber} — ${nextPlayer.name}`, g);
        checkVictory(g);
      }

      return g;
    });

    setSelU(null); setSelH(null); setSettlerM(null); setNukeM(null); setPreview(null);
    if (sfxQ.length > 0) sfxQ.forEach((s, i) => setTimeout(() => SFX[s]?.(), i * 150));

    // Show event popup if one was triggered
    setGs(prev => {
      if (prev?.eventMsg) {
        setEventPopup(prev.eventMsg);
        SFX.event();
        setTimeout(() => setEventPopup(null), 3500);
      }
      return prev;
    });
  }, [addLog, checkVictory]);

  // --- AI auto-play: when it's p2's turn in AI mode, execute AI after a short delay ---
  useEffect(() => {
    if (gameMode !== "ai" || !gs || gs.victoryStatus) return;
    if (gs.currentPlayerId !== "p2") return;

    setAiThinking(true);

    const timer = setTimeout(() => {
      setGs(prev => {
        if (!prev || prev.currentPlayerId !== "p2") return prev;

        // Run the AI turn
        const afterAi = aiExecuteTurn(prev, (msg, g) => { g.log = [...(g.log || []).slice(-30), msg]; });

        // Now end AI's turn: swap back to p1, handle barbarians/events
        afterAi.currentPlayerId = "p1";
        afterAi.turnNumber++;

        spawnBarbarians(afterAi);
        processBarbarians(afterAi);
        rollRandomEvent(afterAi);

        afterAi.phase = "RESEARCH";
        const p1 = afterAi.players.find(p => p.id === "p1");
        for (const u of p1.units) { u.movementCurrent = UNIT_DEFS[u.unitType]?.move || 2; u.hasAttacked = false; }
        // Garrison healing for p1
        for (const u of p1.units) {
          const inCity = p1.cities.some(c => { const h = afterAi.hexes[c.hexId]; return h.col === u.hexCol && h.row === u.hexRow; });
          if (inCity) { const maxHp = UNIT_DEFS[u.unitType]?.hp || 10; u.hpCurrent = Math.min(maxHp, u.hpCurrent + 3); }
        }
        afterAi.log = [...(afterAi.log || []).slice(-30), `Turn ${afterAi.turnNumber} — ${p1.name}`];
        checkVictory(afterAi);

        // Update explored hexes for AI player
        const aiP = afterAi.players.find(p => p.id === "p2");
        const aiVis = getVisibleHexes(aiP, afterAi.hexes);
        const aiEx = new Set(afterAi.explored?.["p2"] || []);
        for (const k of aiVis) aiEx.add(k);
        afterAi.explored = { ...afterAi.explored, "p2": [...aiEx] };

        return afterAi;
      });

      setAiThinking(false);

      // Check for event popup
      setGs(prev => {
        if (prev?.eventMsg) {
          setEventPopup(prev.eventMsg);
          SFX.event();
          setTimeout(() => setEventPopup(null), 3500);
        }
        return prev;
      });
    }, 800);

    return () => clearTimeout(timer);
  }, [gs?.currentPlayerId, gs?.turnNumber, gameMode, gs?.victoryStatus, checkVictory]);

  // --- Player action callbacks ---

  const selResearch = useCallback((techId) => {
    SFX.click();
    setGs(prev => {
      const g = JSON.parse(JSON.stringify(prev));
      const player = g.players.find(p => p.id === g.currentPlayerId);
      player.currentResearch = { techId, progress: 0 };
      addLog(`${player.name} researching ${TECH_TREE[techId].name}`, g);
      return g;
    });
  }, [addLog]);

  const setProd = useCallback((cityId, type, itemId) => {
    setGs(prev => {
      const g = JSON.parse(JSON.stringify(prev));
      const city = g.players.find(p => p.id === g.currentPlayerId).cities.find(c => c.id === cityId);
      if (city) {
        city.currentProduction = { type, itemId };
        city.productionProgress = 0;
      }
      return g;
    });
  }, []);

  const moveU = useCallback((unitId, targetCol, targetRow) => {
    setGs(prev => {
      const g = JSON.parse(JSON.stringify(prev));
      const unit = g.players.find(p => p.id === g.currentPlayerId).units.find(u => u.id === unitId);
      if (!unit) return prev;
      unit.hexCol = targetCol;
      unit.hexRow = targetRow;
      unit.movementCurrent = 0;
      return g;
    });
    setSelU(null);
    SFX.move();
  }, []);

  const foundCity = useCallback((unitId, col, row) => {
    setGs(prev => {
      const g = JSON.parse(JSON.stringify(prev));
      const player = g.players.find(p => p.id === g.currentPlayerId);
      const unitIdx = player.units.findIndex(u => u.id === unitId);
      if (unitIdx === -1) return prev;

      const hex = g.hexes.find(h => h.col === col && h.row === row);
      if (!hex || hex.terrainType === "water" || hex.terrainType === "mountain" || hex.cityId) return prev;

      // Remove settler
      player.units.splice(unitIdx, 1);

      // Name the new city from the civ's name list
      const cityNum = player.cities.length + 1;
      const civNames = CIV_DEFS[player.civilization]?.cityNames || ["Colony"];
      const cityName = civNames[cityNum - 1] || `City ${cityNum}`;
      const cityId = `${player.id}-c${cityNum}`;

      player.cities.push({
        id: cityId, name: cityName, hexId: hex.id, population: 1,
        districts: [], currentProduction: null, productionProgress: 0,
        foodAccumulated: 0, hp: 20, hpMax: 20,
      });

      hex.cityId = cityId;
      hex.ownerPlayerId = player.id;

      // Claim adjacent unclaimed land
      for (const [nc, nr] of getNeighbors(col, row)) {
        const neighbor = g.hexes.find(h => h.col === nc && h.row === nr);
        if (neighbor && !neighbor.ownerPlayerId && neighbor.terrainType !== "water") {
          neighbor.ownerPlayerId = player.id;
        }
      }

      addLog(`${player.name} founded ${cityName}!`, g);
      return g;
    });
    setSettlerM(null);
    setSelU(null);
    SFX.found();
  }, [addLog]);

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
        setPreview({...pv,an:sud.def.name,dn:UNIT_DEFS[eu.unitType]?.name,ahp:sud.hpCurrent,dhp:eu.hpCurrent});
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
    if(cE&&cE.player.id===cpId&&(phase==="CITY"||phase==="RESEARCH")){setShowCity(cE.city.id);setSelU(null);return;}
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

  const tCounts=useMemo(()=>{const c={grassland:0,forest:0,mountain:0,water:0};hexes.forEach(h=>c[h.terrainType]++);return c;},[hexes]);
  const landOwned=useMemo(()=>{const o={};players.forEach(p=>{o[p.id]=hexes.filter(h=>h.ownerPlayerId===p.id).length;});return o;},[hexes,players]);
  const totalLand=useMemo(()=>hexes.filter(h=>h.terrainType!=="water").length,[hexes]);

  // === MODE SELECTION SCREEN ===
  if(!gameMode){
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
      <div style={{display:"flex",gap:24}}>
        {modeBtn("vs AI", "Play against the computer", "🤖", "ai")}
        {modeBtn("Local", "Two players, one screen", "👥", "local")}
      </div>
      <div style={{color:"#3a4a2a",fontSize:9,marginTop:8}}>Fog of War · Barbarians · Random Events</div>
    </div>);
  }

  // === CIV SELECTION SCREEN ===
  if(!gameStarted||!gs){
    const civKeys=Object.keys(CIV_DEFS);
    const isAiMode = gameMode === "ai";
    const playerColumns = isAiMode ? ["p1"] : ["p1", "p2"];

    // In AI mode, auto-pick a civ for p2 that isn't what p1 picked
    const startGame = () => {
      let p2Civ = civPick.p2;
      if (isAiMode) {
        const available = civKeys.filter(k => k !== civPick.p1);
        p2Civ = available[Math.floor(Math.random() * available.length)];
      }
      SFX.found();
      setGs(createInitialState(civPick.p1, p2Civ));
      setGameStarted(true);
    };

    return(<div style={{width:"100vw",height:"100vh",background:"radial-gradient(ellipse at center,#1a2a10 0%,#0a0e06 70%)",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",fontFamily:"'Palatino Linotype',serif",gap:24}}>
      <h1 style={{color:"#c8d8a0",fontSize:28,fontWeight:400,letterSpacing:8,textTransform:"uppercase",margin:0}}>Empires of Earth</h1>
      <div style={{color:"#6a7a50",fontSize:12,letterSpacing:3}}>
        {isAiMode ? "Choose Your Civilization" : "Choose Your Civilizations"}
      </div>
      <div style={{display:"flex",gap:40}}>
        {playerColumns.map(pid=>{const label=pid==="p1"?(isAiMode?"Your Civilization":"Player 1"):"Player 2";const picked=civPick[pid];
          return(<div key={pid} style={{textAlign:"center"}}>
            <div style={{color:CIV_DEFS[picked]?.colorLight||"#aaa",fontSize:14,letterSpacing:2,marginBottom:12}}>{label}</div>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              {civKeys.map(ck=>{const cv=CIV_DEFS[ck];const sel=picked===ck;const taken=!isAiMode&&civPick[pid==="p1"?"p2":"p1"]===ck;
                return(<div key={ck} onClick={()=>{if(!taken){SFX.click();setCivPick(prev=>({...prev,[pid]:ck}));}}}
                  style={{padding:"10px 20px",borderRadius:6,cursor:taken?"not-allowed":"pointer",
                    background:sel?"rgba(100,160,50,.3)":taken?"rgba(40,40,40,.3)":"rgba(30,40,20,.6)",
                    border:`1px solid ${sel?cv.color:taken?"#333":"#3a4a2a"}`,opacity:taken?.4:1,minWidth:220,textAlign:"left"}}>
                  <div style={{color:cv.colorLight,fontSize:12,fontWeight:600,letterSpacing:1}}>{cv.name}</div>
                  <div style={{color:"#6a7a50",fontSize:9,marginTop:2}}>{cv.bonus}</div>
                  <div style={{color:"#4a5a3a",fontSize:8,marginTop:1}}>Capital: {cv.capital}</div>
                  <div style={{color:"#3a4a2a",fontSize:7,marginTop:2,fontStyle:"italic"}}>{cv.desc||""}</div>
                </div>);})}</div></div>);})}
      </div>
      <button onClick={startGame}
        style={{padding:"10px 32px",borderRadius:6,fontSize:16,cursor:"pointer",border:"1px solid rgba(100,140,50,.6)",background:"rgba(100,160,50,.4)",color:"#e0f0c0",fontFamily:"inherit",letterSpacing:3,marginTop:8}}>
        {isAiMode ? "Start vs AI" : "Begin Game"}
      </button>
      <div style={{display:"flex",gap:16,alignItems:"center"}}>
        <div style={{color:"#3a4a2a",fontSize:9}}>Fog of War · Barbarians · Random Events</div>
        <div onClick={()=>{setGameMode(null);}} style={{color:"#6a7a50",fontSize:9,cursor:"pointer",textDecoration:"underline"}}>← Back</div>
      </div>
    </div>);
  }

  // Victory
  if(gs.victoryStatus){const w=players.find(p=>p.id===gs.victoryStatus.winner);if(!victoryPlayed.current){victoryPlayed.current=true;SFX.victory();}
    return(<div style={{width:"100vw",height:"100vh",background:"radial-gradient(ellipse at center,#1a2a10 0%,#0a0e06 70%)",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",fontFamily:"'Palatino Linotype',serif"}}>
      <div style={{fontSize:60,marginBottom:16}}>🏆</div>
      <h1 style={{color:w?.color||"#fff",fontSize:36,letterSpacing:6,marginBottom:8,textTransform:"uppercase"}}>{w?.name}</h1>
      <div style={{color:"#c8d8a0",fontSize:20,letterSpacing:3,marginBottom:4}}>{gs.victoryStatus.type} Victory</div>
      <div style={{color:"#6a7a50",fontSize:14}}>Turn {turnNumber}</div>
      <button onClick={()=>{uidCtr=0;setGs(null);setGameStarted(false);setGameMode(null);setSelU(null);setSelH(null);setAiThinking(false);setTutorialOn(true);setTutorialDismissed({});victoryPlayed.current=false;techPosRef.current={x:null,y:95};cityPosRef.current={x:null,y:95};setTechCollapsed(false);setCityCollapsed(false);}} style={{...btnStyle(true),marginTop:24,fontSize:14,padding:"8px 24px"}}>New Game</button>
    </div>);}

  return(
    <div onMouseMove={onPanelMove} onMouseUp={onPanelUp} style={{width:"100vw",height:"100vh",background:"linear-gradient(145deg,#0a0e06 0%,#141e0c 40%,#0e1608 100%)",overflow:"hidden",position:"relative",userSelect:"none",fontFamily:"'Palatino Linotype','Book Antiqua',Palatino,serif"}}>
      {/* Title */}
      <div style={{position:"absolute",top:0,left:0,right:0,height:50,background:"linear-gradient(180deg,rgba(10,14,6,.95) 0%,rgba(10,14,6,0) 100%)",zIndex:10,display:"flex",alignItems:"flex-start",justifyContent:"center",paddingTop:8,pointerEvents:"none"}}>
        <div style={{textAlign:"center"}}><h1 style={{color:"#c8d8a0",fontSize:18,fontWeight:400,letterSpacing:6,textTransform:"uppercase",margin:0}}>Empires of Earth</h1>
          <div style={{color:"#6a7a50",fontSize:8,letterSpacing:3,marginTop:1}}>Turn {turnNumber} · {cp.name} · {PHASE_LABELS[phase]}</div></div></div>

      {/* Phase bar */}
      <div style={{position:"absolute",top:48,left:"50%",transform:"translateX(-50%)",zIndex:10,display:"flex",gap:2,background:"rgba(10,14,6,.85)",borderRadius:6,padding:"3px 5px",border:"1px solid rgba(100,140,50,.3)"}}>
        {PHASES.map(p=><div key={p} style={{padding:"3px 8px",borderRadius:4,fontSize:9,letterSpacing:1,background:phase===p?"rgba(100,160,50,.4)":"transparent",color:phase===p?"#c8d8a0":"#4a5a3a",fontWeight:phase===p?700:400}}>{PHASE_LABELS[p]}</div>)}
        <button onClick={advPhase} style={{...btnStyle(true),marginBottom:0,marginRight:0,fontSize:9}}>{phase==="END"?"End Turn →":"Next →"}</button>
      </div>

      {/* Player panels */}
      {players.map(p=>{const isCur=p.id===cpId;const i2=calcPlayerIncome(p,hexes);return(
        <div key={p.id} style={{position:"absolute",top:12,[p.id==="p1"?"left":"right"]:14,zIndex:10,background:"rgba(10,14,6,.8)",borderRadius:6,padding:"6px 10px",border:`1px solid ${isCur?p.color+"60":"rgba(60,60,60,.3)"}`,opacity:isCur?1:.5,minWidth:120}}>
          <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:3}}><div style={{width:7,height:7,borderRadius:"50%",background:p.color,boxShadow:`0 0 6px ${p.color}50`}}/><span style={{color:p.colorLight,fontSize:10,letterSpacing:1.5}}>{p.name}</span></div>
          <div style={{display:"flex",flexDirection:"column",gap:1,fontSize:8,color:"#a0b880"}}>
            <div>💰{p.gold} <span style={{color:"#6a7a50"}}>+{i2.gold}/t</span></div>
            <div>🔬{p.science} <span style={{color:"#6a7a50"}}>+{i2.science}/t</span>{p.currentResearch&&<span style={{color:"#80b0d0"}}> →{TECH_TREE[p.currentResearch.techId]?.name} ({p.currentResearch.progress}/{TECH_TREE[p.currentResearch.techId]?.cost})</span>}</div>
            <div>🌾+{i2.food}/t ⚙+{i2.production}/t</div>
            <div style={{color:"#5a6a4a"}}>🏛{p.cities.length} ⚔{p.units.length} 🗺{landOwned[p.id]||0}/{totalLand}{barbarians.length>0&&<span style={{color:"#c05050"}}> 🏴‍☠️{barbarians.length}</span>}</div>
          </div>
        </div>);})}

      {/* Action bar */}
      <div style={{position:"absolute",top:72,left:"50%",transform:"translateX(-50%)",zIndex:10,display:"flex",gap:4,alignItems:"center"}}>
        <button onClick={()=>setShowTech(!showTech)} style={btnStyle(showTech)}>🔬 Tech</button>
        <button onClick={()=>{if(!tutorialOn){setTutorialOn(true);setTutorialDismissed({});}else{setTutorialOn(false);}}} style={btnStyle(tutorialOn)}>💡 Tips</button>
        {phase==="MOVEMENT"&&sud?.unitType==="settler"&&<button onClick={()=>setSettlerM(settlerM?null:selU)} style={btnStyle(!!settlerM)}>🏕 Found City</button>}
        {phase==="MOVEMENT"&&sud?.unitType==="nuke"&&<button onClick={()=>setNukeM(nukeM?null:selU)} style={btnStyle(!!nukeM)}>☢ Launch</button>}
        {phase==="MOVEMENT"&&sud&&<div style={{fontSize:9,color:"#a0b880",padding:"4px 8px",background:"rgba(10,14,6,.8)",borderRadius:4,border:"1px solid rgba(100,140,50,.3)"}}>
          {sud.def?.icon} {sud.def?.name} HP:{sud.hpCurrent}/{sud.def?.hp} Str:{sud.def?.strength}
          {sud.def?.range>0&&` Rng:${sud.def.range}`} Mv:{sud.movementCurrent}/{sud.def?.move}
          {sud.def?.domain!=="land"&&<span style={{color:"#60a0d0"}}> [{sud.def.domain}]</span>}
          {sud.hasAttacked&&<span style={{color:"#c05050"}}> [fired]</span>}
        </div>}
        {phase==="MOVEMENT"&&!selU&&actable.size>0&&<div style={{fontSize:8,color:"#a0e060",padding:"3px 8px",background:"rgba(10,14,6,.7)",borderRadius:4}}>Tab: cycle {actable.size} units</div>}
      </div>

      {/* Combat preview */}
      {preview&&<div style={{...panelStyle,position:"fixed",top:window.innerHeight/2-60,left:window.innerWidth/2-100,width:200,padding:8,zIndex:30,border:"1px solid #c05050"}}>
        <div style={{fontSize:10,color:"#ffa0a0",marginBottom:4,textAlign:"center"}}>⚔ Combat Preview</div>
        <div style={{display:"flex",justifyContent:"space-between",fontSize:9}}>
          <div style={{color:"#a0d080"}}>{preview.an} ({preview.aStr})</div>
          <div style={{color:"#f08080"}}>{preview.dn} ({preview.dStr})</div></div>
        <div style={{display:"flex",justifyContent:"space-between",fontSize:8,marginTop:2}}>
          <div>→{preview.aDmg}dmg</div><div>{preview.dDmg>0?`←${preview.dDmg}dmg`:"no counter"}</div></div>
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
                return(<div key={t.id} style={{padding:"4px 6px",marginBottom:3,borderRadius:4,fontSize:8,background:rd?"rgba(80,160,50,.3)":isR?"rgba(80,140,200,.3)":"rgba(30,40,20,.6)",border:`1px solid ${rd?"#5a9a30":isR?"#5090c0":av?"#6a7a50":"#2a3020"}`,color:rd?"#b0d890":av?"#a0b880":"#4a5a3a",cursor:av&&phase==="RESEARCH"&&!cp.currentResearch?"pointer":"default",opacity:rd||av||isR?1:.5}} onClick={()=>{if(av&&phase==="RESEARCH"&&!cp.currentResearch)selResearch(t.id);}}>
                  <div style={{fontWeight:600}}>{t.name}</div><div style={{fontSize:7,color:"#6a7a50",marginTop:1}}>{rd?"✓":isR?`${cp.currentResearch.progress}/${t.cost}`:`${t.cost}🔬`}</div>
                  <div style={{fontSize:6,color:"#5a6a4a",marginTop:1}}>{t.effects[0]}</div></div>);})}</div>);})}
        </div>}</div>);})()}

      {/* City panel */}
      {showCity&&(()=>{const city=cp.cities.find(c=>c.id===showCity);if(!city)return null;const y=calcCityYields(city,cp,hexes);const avU=getAvailableUnits(cp,city);const avD=getAvailableDistricts(cp,city);
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
            <span style={{color:"#6a7a50"}}> ({city.productionProgress}/{city.currentProduction.type==="unit"?UNIT_DEFS[city.currentProduction.itemId]?.cost:DISTRICT_DEFS[city.currentProduction.itemId]?.cost})</span>
            <button onClick={()=>{setGs(prev=>{const g=JSON.parse(JSON.stringify(prev));const c=g.players.find(p=>p.id===g.currentPlayerId).cities.find(c2=>c2.id===city.id);if(c){c.currentProduction=null;c.productionProgress=0;}return g;});}} style={{...btnStyle(false),fontSize:7,marginLeft:6,padding:"2px 4px"}}>✕</button>
          </div>
          :<div><div style={{fontSize:9,color:"#c8d8a0",marginBottom:4}}>Build:</div>
            <div style={{fontSize:8,color:"#6a7a50",marginBottom:2}}>UNITS</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:2,marginBottom:6}}>{avU.map(u=><button key={u.id} onClick={()=>setProd(city.id,"unit",u.id)} title={`Str:${u.strength} HP:${u.hp} Mv:${u.move}${u.range?` Rng:${u.range}`:""} [${u.domain}]`} style={{...btnStyle(false),fontSize:8,padding:"3px 6px"}}>{u.icon}{u.name}<span style={{color:"#5a6a4a"}}>({u.cost}⚙)</span></button>)}</div>
            <div style={{fontSize:8,color:"#6a7a50",marginBottom:2}}>DISTRICTS</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:2}}>{avD.map(d=><button key={d.id} onClick={()=>setProd(city.id,"district",d.id)} style={{...btnStyle(false),fontSize:8,padding:"3px 6px"}}>{d.icon}{d.name}<span style={{color:"#5a6a4a"}}>({d.cost}⚙)</span></button>)}</div>
          </div>}</>}
        </div>);})()}

      {/* Legend */}
      <div style={{position:"absolute",bottom:55,left:14,zIndex:10,background:"rgba(10,14,6,.7)",borderRadius:6,padding:"5px 8px",border:"1px solid rgba(100,140,50,.2)"}}>
        <div style={{color:"#6a7a50",fontSize:7,letterSpacing:2,textTransform:"uppercase",marginBottom:2}}>Terrain</div>
        {["grassland","forest","mountain","water"].map(t=><div key={t} style={{display:"flex",alignItems:"center",gap:4,fontSize:8}}><div style={{width:5,height:5,borderRadius:t==="water"?0:"50%",background:TERRAIN_INFO[t].color}}/><span style={{color:"#a0b880",width:50}}>{TERRAIN_INFO[t].label}</span><span style={{color:"#6a7a50"}}>{TERRAIN_INFO[t].moveCost!=null?`mv${TERRAIN_INFO[t].moveCost}`:"—"}{TERRAIN_INFO[t].defBonus?` +${TERRAIN_INFO[t].defBonus}def`:""}</span><span style={{color:"#4a5a3a"}}>({tCounts[t]})</span></div>)}
      </div>

      {/* Log */}
      <div style={{position:"absolute",bottom:55,right:14,zIndex:10,background:"rgba(10,14,6,.7)",borderRadius:6,padding:"5px 8px",border:"1px solid rgba(100,140,50,.2)",maxWidth:240,maxHeight:110,overflowY:"auto"}}>
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

      {settlerM&&<div style={{position:"absolute",bottom:52,left:"50%",transform:"translateX(-50%)",zIndex:20,background:"rgba(40,80,20,.9)",border:"1px solid #40e040",borderRadius:6,padding:"6px 16px",color:"#a0f0a0",fontSize:10}}>🏕 Click land hex to found city · <span style={{cursor:"pointer",color:"#f08080"}} onClick={()=>setSettlerM(null)}>Cancel</span></div>}
      {nukeM&&<div style={{position:"absolute",bottom:52,left:"50%",transform:"translateX(-50%)",zIndex:20,background:"rgba(80,40,0,.9)",border:"1px solid #ffa000",borderRadius:6,padding:"6px 16px",color:"#ffd080",fontSize:10}}>☢ Click target for nuclear strike (1-hex blast) · <span style={{cursor:"pointer",color:"#f08080"}} onClick={()=>setNukeM(null)}>Cancel</span></div>}
      {moveMsg&&<div style={{position:"absolute",bottom:52,left:"50%",transform:"translateX(-50%)",zIndex:20,background:"rgba(80,20,10,.92)",border:"1px solid rgba(240,100,60,.6)",borderRadius:6,padding:"6px 16px",color:"#ffa080",fontSize:10,pointerEvents:"none"}}>⚠ {moveMsg}</div>}

      {/* AI thinking overlay */}
      {aiThinking&&<div style={{position:"absolute",inset:0,zIndex:40,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(5,8,3,.6)",pointerEvents:"all"}}>
        <div style={{background:"rgba(15,20,10,.95)",border:"2px solid rgba(100,140,50,.5)",borderRadius:12,padding:"24px 40px",textAlign:"center",boxShadow:"0 0 40px rgba(80,120,40,.2)"}}>
          <div style={{fontSize:28,marginBottom:8,animation:"pulse 1.5s ease-in-out infinite"}}>🤖</div>
          <div style={{color:"#c8d8a0",fontSize:16,fontWeight:600,letterSpacing:3}}>AI is thinking...</div>
          <div style={{color:"#6a7a50",fontSize:10,marginTop:6}}>The enemy plots its next move</div>
        </div>
      </div>}

      {/* Event popup */}
      {eventPopup&&<div style={{position:"absolute",top:100,left:"50%",transform:"translateX(-50%)",zIndex:30,background:"rgba(20,14,6,.95)",border:"2px solid #d0a040",borderRadius:10,padding:"14px 28px",color:"#ffd080",textAlign:"center",boxShadow:"0 0 30px rgba(200,160,40,.3)",minWidth:220}}>
        <div style={{fontSize:22,marginBottom:4}}>🎲</div>
        <div style={{fontSize:14,fontWeight:600,letterSpacing:2,marginBottom:6,color:"#ffd080"}}>{eventPopup.name}</div>
        <div style={{fontSize:10,color:"#c0a060"}}>{eventPopup.desc}</div>
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
            position: "absolute", ...pos, zIndex: 35,
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
      <div style={{position:"absolute",bottom:175,right:14,zIndex:15,background:"rgba(10,14,6,.92)",border:"1px solid rgba(100,140,50,.4)",borderRadius:6,padding:4}} onMouseDown={e=>e.stopPropagation()}>
        <canvas ref={minimapRef} width={MINIMAP_W} height={MINIMAP_H} onClick={onMinimapClick}
          style={{display:"block",cursor:"crosshair",borderRadius:3,border:"1px solid rgba(100,140,50,.2)"}}/>
        <div style={{fontSize:7,color:"#5a6a40",marginTop:2,textAlign:"center",letterSpacing:2}}>MINIMAP</div>
      </div>

      <svg ref={svgRef} width="100%" height="100%" onMouseDown={onMD} onMouseMove={onMM} onMouseUp={onMU} onMouseLeave={onMU} onWheel={onWh} onContextMenu={e=>e.preventDefault()} style={{cursor:"grab"}}>
        <defs>
          <radialGradient id="gradGrass" cx="45%" cy="38%" r="65%"><stop offset="0%" stopColor="#4e8826"/><stop offset="40%" stopColor="#437520"/><stop offset="100%" stopColor="#2e5516"/></radialGradient>
          <radialGradient id="varGrass" cx="60%" cy="55%" r="55%"><stop offset="0%" stopColor="#2a4a10"/><stop offset="100%" stopColor="#3a6a1a" stopOpacity="0"/></radialGradient>
          <radialGradient id="gradForest" cx="45%" cy="38%" r="65%"><stop offset="0%" stopColor="#2a5a1e"/><stop offset="40%" stopColor="#1e4a16"/><stop offset="100%" stopColor="#143a0e"/></radialGradient>
          <radialGradient id="gradMountain" cx="45%" cy="38%" r="65%"><stop offset="0%" stopColor="#5a5545"/><stop offset="40%" stopColor="#4a4538"/><stop offset="100%" stopColor="#3a3530"/></radialGradient>
          <radialGradient id="gradWater" cx="45%" cy="38%" r="65%"><stop offset="0%" stopColor="#2a6a9a"/><stop offset="40%" stopColor="#1e5580"/><stop offset="100%" stopColor="#143a5a"/></radialGradient>
        </defs>
        <g ref={gRef} style={{willChange:"transform"}} onMouseMove={onHexHover} onMouseLeave={onHexLeave} onClick={onHexClick} onContextMenu={onHexCtx}>{renderAll()}</g>
      </svg>
    </div>
  );
}

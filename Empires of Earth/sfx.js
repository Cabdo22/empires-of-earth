// ============================================================
// SOUND SYSTEM
// ============================================================

import * as Tone from "tone";

let audioStarted = false;

const ensureAudio = async () => {
  if (!audioStarted) {
    try { await Tone.start(); audioStarted = true; } catch (e) {}
  }
};

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

export const SFX = {
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

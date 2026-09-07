// Silnik dźwięku WebAudio — syntezowane efekty, bez plików. Głośność z ustawień.
"use client";

import { getSettings } from "./settings";

let ctx: AudioContext | null = null;
let master: GainNode | null = null;

function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") void ctx.resume();
  const s = getSettings();
  if (master) master.gain.value = s.muted ? 0 : s.volume;
  return ctx;
}

export function setMuted(m: boolean) {
  void m;
  ac(); // odświeży gain z ustawień
}

function blip(freq: number, dur: number, type: OscillatorType, vol: number, when = 0, slideTo?: number) {
  const s = getSettings();
  if (s.muted) return;
  const audio = ac();
  if (!audio || !master) return;
  const t0 = audio.currentTime + when;
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(30, slideTo), t0 + dur);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

function noise(dur: number, vol: number, when = 0, hp = 800) {
  const s = getSettings();
  if (s.muted) return;
  const audio = ac();
  if (!audio || !master) return;
  const len = Math.floor(audio.sampleRate * dur);
  const buf = audio.createBuffer(1, len, audio.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = audio.createBufferSource();
  src.buffer = buf;
  const f = audio.createBiquadFilter();
  f.type = "highpass";
  f.frequency.value = hp;
  const g = audio.createGain();
  g.gain.value = vol;
  src.connect(f).connect(g).connect(master);
  src.start(audio.currentTime + when);
}

let lastTick = 0;
export const sfx = {
  tick() {
    const now = performance.now();
    if (now - lastTick < 18) return;
    lastTick = now;
    blip(1500, 0.025, "square", 0.05, 0, 900);
  },
  click() {
    blip(700, 0.05, "triangle", 0.09);
  },
  hover() {
    blip(1000, 0.03, "sine", 0.03);
  },
  open() {
    // "klik zamka" + whoosh
    blip(220, 0.06, "square", 0.08);
    noise(0.35, 0.09, 0.04, 400);
    blip(300, 0.25, "sawtooth", 0.07, 0.05, 90);
  },
  spinStart() {
    noise(0.5, 0.07, 0, 300);
    blip(160, 0.4, "sawtooth", 0.06, 0, 60);
  },
  land(rarityOrder: number) {
    // uderzenie przy zatrzymaniu
    noise(0.12, 0.14, 0, 200);
    blip(90, 0.18, "sine", 0.16, 0, 45);
    if (rarityOrder >= 2) blip(1800, 0.2, "triangle", 0.08, 0.05, 2600);
  },
  sell() {
    blip(880, 0.07, "sine", 0.09);
    blip(1320, 0.09, "sine", 0.09, 0.07);
  },
  win(rarityOrder: number) {
    const base = rarityOrder >= 4 ? 523 : rarityOrder >= 3 ? 440 : 392;
    const seq = rarityOrder >= 3 ? [0, 4, 7, 12, 16, 19] : rarityOrder >= 1 ? [0, 4, 7, 12] : [0, 5, 9];
    seq.forEach((st, i) => {
      const f = base * Math.pow(2, st / 12);
      blip(f, 0.16, "triangle", 0.1, i * 0.07);
    });
    if (rarityOrder >= 3) {
      blip(base * 4, 0.7, "sine", 0.07, seq.length * 0.07);
      noise(0.6, 0.06, seq.length * 0.07, 2000);
    }
  },
  lose() {
    blip(320, 0.12, "sawtooth", 0.08, 0, 200);
    blip(220, 0.25, "sawtooth", 0.08, 0.12, 110);
  },
  coin() {
    blip(1200, 0.05, "square", 0.06);
    blip(1600, 0.08, "square", 0.06, 0.06);
  },
  countdown(n: number) {
    // 3, 2, 1 rosnąco; 0 = GO
    if (n <= 0) {
      blip(880, 0.12, "square", 0.1);
      blip(1320, 0.3, "square", 0.1, 0.1);
      noise(0.3, 0.08, 0.1, 1200);
    } else {
      blip(440 + (3 - n) * 110, 0.14, "square", 0.09);
    }
  },
  roundWin() {
    blip(660, 0.08, "triangle", 0.08);
    blip(990, 0.12, "triangle", 0.08, 0.08);
  },
  roundLose() {
    blip(330, 0.1, "sawtooth", 0.06, 0, 240);
  },
  drumroll(durMs: number) {
    const n = Math.floor(durMs / 70);
    for (let i = 0; i < n; i++) noise(0.04, 0.05 + (i / n) * 0.06, i * 0.07, 600);
  },
  fanfare() {
    [0, 4, 7, 12, 7, 12, 16].forEach((st, i) => blip(523 * Math.pow(2, st / 12), 0.18, "triangle", 0.11, i * 0.09));
    noise(0.8, 0.07, 0.6, 1500);
  },
  daily() {
    [0, 7, 12, 19, 24].forEach((st, i) => blip(392 * Math.pow(2, st / 12), 0.2, "sine", 0.1, i * 0.08));
  },
};

"use client";

// Ustawienia gracza trzymane w localStorage: prędkość animacji, dźwięk, efekty.
export interface Settings {
  spinSpeed: number; // 0.5 (wolno) .. 2 (szybko) — mnożnik skracający czas
  volume: number; // 0..1
  muted: boolean;
  shake: boolean;
  particles: boolean;
  countdown: boolean; // odliczanie 3-2-1 przed bitwą
  reducedMotion: boolean; // pomija długie animacje (fast-track)
}

export const DEFAULT_SETTINGS: Settings = {
  spinSpeed: 1,
  volume: 0.7,
  muted: false,
  shake: true,
  particles: true,
  countdown: true,
  reducedMotion: false,
};

const KEY = "kavper_settings_v1";
type Listener = (s: Settings) => void;
const listeners = new Set<Listener>();
let cache: Settings | null = null;

export function getSettings(): Settings {
  if (cache) return cache;
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(KEY);
    cache = raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : { ...DEFAULT_SETTINGS };
  } catch {
    cache = { ...DEFAULT_SETTINGS };
  }
  return cache!;
}

export function setSettings(patch: Partial<Settings>) {
  const next = { ...getSettings(), ...patch };
  cache = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l(next));
}

export function subscribeSettings(l: Listener) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

// Skala czasu animacji: speed 2 => 0.5× czasu; speed 0.5 => 2× czasu
export function animMs(baseMs: number): number {
  const s = getSettings();
  if (s.reducedMotion) return Math.min(baseMs, 500);
  return Math.round(baseMs / Math.max(0.25, s.spinSpeed));
}

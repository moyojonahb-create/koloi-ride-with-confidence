// Configurable "driver arrived" notification sound.
// Stored in localStorage so it works without a DB migration.

import { playArrivedSound } from "./notificationSounds";

export type ArrivedSoundChoice = "chime" | "bell" | "horn" | "soft" | "off";

const KEY = "pickme.arrivedSound";
const DEFAULT: ArrivedSoundChoice = "chime";

export const ARRIVED_SOUND_OPTIONS: { value: ArrivedSoundChoice; label: string; description: string }[] = [
  { value: "chime", label: "Chime", description: "Bright ascending notes (default)" },
  { value: "bell", label: "Bell", description: "Two clear bell tones" },
  { value: "horn", label: "Horn", description: "Quick double car horn" },
  { value: "soft", label: "Soft Ping", description: "Gentle single ping" },
  { value: "off", label: "Off", description: "No sound, vibration only" },
];

export function getArrivedSound(): ArrivedSoundChoice {
  try {
    const v = localStorage.getItem(KEY) as ArrivedSoundChoice | null;
    if (v && ARRIVED_SOUND_OPTIONS.some((o) => o.value === v)) return v;
  } catch { /* noop */ }
  return DEFAULT;
}

export function setArrivedSound(choice: ArrivedSoundChoice): void {
  try { localStorage.setItem(KEY, choice); } catch { /* noop */ }
}

// ── Audio helpers (Web Audio) ──
function ctx(): AudioContext | null {
  try {
    const Ctor = (window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext);
    if (!Ctor) return null;
    return new Ctor();
  } catch { return null; }
}

function tone(ac: AudioContext, freq: number, start: number, dur: number, vol: number, type: OscillatorType = "sine") {
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.connect(g); g.connect(ac.destination);
  osc.type = type; osc.frequency.value = freq;
  g.gain.setValueAtTime(0, start);
  g.gain.linearRampToValueAtTime(vol, start + 0.02);
  g.gain.setValueAtTime(vol, start + dur - 0.04);
  g.gain.linearRampToValueAtTime(0, start + dur);
  osc.start(start); osc.stop(start + dur + 0.02);
}

function playBell() {
  const ac = ctx(); if (!ac) return;
  const t = ac.currentTime;
  tone(ac, 988, t, 0.45, 0.5, "sine");
  tone(ac, 1318, t + 0.18, 0.55, 0.45, "sine");
}

function playHorn() {
  const ac = ctx(); if (!ac) return;
  const t = ac.currentTime;
  // Two short horn blasts (square wave for honk feel)
  tone(ac, 330, t, 0.18, 0.55, "square");
  tone(ac, 220, t, 0.18, 0.4, "sawtooth");
  tone(ac, 330, t + 0.28, 0.22, 0.55, "square");
  tone(ac, 220, t + 0.28, 0.22, 0.4, "sawtooth");
}

function playSoft() {
  const ac = ctx(); if (!ac) return;
  const t = ac.currentTime;
  tone(ac, 1175, t, 0.5, 0.35, "sine");
}

/** Play the configured arrived sound (or nothing if off). Best-effort. */
export function playConfiguredArrivedSound(): void {
  try {
    const choice = getArrivedSound();
    switch (choice) {
      case "off": return;
      case "bell": return playBell();
      case "horn": return playHorn();
      case "soft": return playSoft();
      case "chime":
      default:
        return playArrivedSound();
    }
  } catch (e) {
    console.warn("[arrivedSound] playback failed", e);
  }
}

/** Preview helper used in the settings UI. */
export function previewArrivedSound(choice: ArrivedSoundChoice): void {
  const prev = getArrivedSound();
  setArrivedSound(choice);
  try { playConfiguredArrivedSound(); } finally { setArrivedSound(prev); }
}

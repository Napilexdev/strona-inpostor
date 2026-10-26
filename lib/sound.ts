'use client';

/**
 * Efekty dźwiękowe generowane w locie (Web Audio API) — bez plików audio.
 * Przeglądarki pozwalają odtwarzać dźwięk dopiero po pierwszym kliknięciu,
 * dlatego kontekst audio jest tworzony przy pierwszej interakcji.
 */
export type SoundName =
  | 'join'
  | 'leave'
  | 'start'
  | 'myTurn'
  | 'clue'
  | 'vote'
  | 'tick'
  | 'impostor'
  | 'innocent'
  | 'win'
  | 'lose'
  | 'click';

const MUTE_KEY = 'impostor:muted';
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = false;
const listeners = new Set<(m: boolean) => void>();

try {
  if (typeof window !== 'undefined') muted = localStorage.getItem(MUTE_KEY) === '1';
} catch {
  /* brak localStorage */
}

function ensure(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.35;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

if (typeof window !== 'undefined') {
  const unlock = () => {
    ensure();
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
  };
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);
}

export function isMuted() {
  return muted;
}

export function setMuted(m: boolean) {
  muted = m;
  try {
    localStorage.setItem(MUTE_KEY, m ? '1' : '0');
  } catch {
    /* ignoruj */
  }
  listeners.forEach((l) => l(m));
}

export function onMuteChange(fn: (m: boolean) => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'sine', vol = 1, slideTo?: number) {
  const c = ctx!;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, c.currentTime + start);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, c.currentTime + start + dur);
  g.gain.setValueAtTime(0.0001, c.currentTime + start);
  g.gain.exponentialRampToValueAtTime(vol, c.currentTime + start + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + start + dur);
  o.connect(g).connect(master!);
  o.start(c.currentTime + start);
  o.stop(c.currentTime + start + dur + 0.05);
}

const notes = (seq: [number, number, number?][], type: OscillatorType = 'triangle', vol = 0.8) =>
  seq.forEach(([f, t, d = 0.16]) => tone(f, t, d, type, vol));

export function play(name: SoundName) {
  if (muted) return;
  const c = ensure();
  if (!c || c.state !== 'running') return;
  switch (name) {
    case 'join':
      notes([[660, 0], [880, 0.09, 0.2]]);
      break;
    case 'leave':
      notes([[520, 0], [390, 0.1, 0.22]]);
      break;
    case 'start':
      notes([[392, 0], [523, 0.12], [659, 0.24], [784, 0.36, 0.35]], 'triangle', 0.7);
      break;
    case 'myTurn':
      notes([[784, 0, 0.12], [1046, 0.1, 0.12], [1318, 0.2, 0.3]], 'sine', 0.9);
      break;
    case 'clue':
      tone(520, 0, 0.12, 'sine', 0.6, 780);
      break;
    case 'vote':
      tone(300, 0, 0.08, 'square', 0.25);
      break;
    case 'tick':
      tone(1200, 0, 0.05, 'square', 0.15);
      break;
    case 'impostor':
      notes([[220, 0, 0.25], [208, 0.22, 0.25], [196, 0.44, 0.6]], 'sawtooth', 0.35);
      break;
    case 'innocent':
      notes([[440, 0, 0.3], [349, 0.25, 0.5]], 'triangle', 0.6);
      break;
    case 'win':
      notes([[523, 0], [659, 0.12], [784, 0.24], [1046, 0.36, 0.5], [784, 0.62, 0.12], [1046, 0.74, 0.6]], 'triangle', 0.7);
      break;
    case 'lose':
      notes([[392, 0, 0.3], [370, 0.3, 0.3], [349, 0.6, 0.3], [330, 0.9, 0.7]], 'triangle', 0.6);
      break;
    case 'click':
      tone(900, 0, 0.03, 'square', 0.1);
      break;
  }
}

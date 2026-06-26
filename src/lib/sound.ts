/**
 * Лёгкий синтезатор «гонга» на WebAudio — без бинарных ассетов.
 * Тон + затухающие гармоники имитируют тибетскую чашу.
 */
let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor =
      (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext })
        .AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

type Kind = "roll" | "ladder" | "snake" | "moksha" | "tap";

const PRESETS: Record<Kind, { freqs: number[]; duration: number; gain: number }> = {
  tap: { freqs: [880], duration: 0.12, gain: 0.06 },
  roll: { freqs: [330, 660], duration: 0.35, gain: 0.08 },
  ladder: { freqs: [523.25, 783.99, 1046.5], duration: 1.6, gain: 0.1 }, // C5 G5 C6 — восходящий аккорд
  snake: { freqs: [196, 146.83, 110], duration: 1.8, gain: 0.1 }, // G3 D3 A2 — нисходящий
  moksha: { freqs: [261.63, 392, 523.25, 783.99], duration: 3.2, gain: 0.14 }, // C4 G4 C5 G5
};

export function playGong(kind: Kind, enabled: boolean) {
  if (!enabled) return;
  const c = getCtx();
  if (!c) return;
  const { freqs, duration, gain } = PRESETS[kind];
  const t0 = c.currentTime;
  freqs.forEach((f, i) => {
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = i === 0 ? "sine" : "triangle";
    osc.frequency.setValueAtTime(f, t0);
    const start = t0 + i * 0.06;
    g.gain.setValueAtTime(0, start);
    g.gain.linearRampToValueAtTime(gain / (i + 1), start + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(g).connect(c.destination);
    osc.start(start);
    osc.stop(start + duration + 0.05);
  });
}

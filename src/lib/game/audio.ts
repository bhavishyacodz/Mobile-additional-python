/**
 * Synthesized SFX — no external files required.
 * Categories: ui click, success, failure, level complete, level up, reward unlock.
 */

type Bus = { ctx: AudioContext; master: GainNode; sfx: GainNode };

let bus: Bus | null = null;
let muted = false;

function getBus(): Bus | null {
  if (typeof window === "undefined") return null;
  if (bus) return bus;
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  const ctx = new AC({ latencyHint: "interactive" });
  const master = ctx.createGain();
  const sfx = ctx.createGain();
  sfx.gain.value = 0.28;
  master.gain.value = muted ? 0 : 1;
  sfx.connect(master);
  master.connect(ctx.destination);
  bus = { ctx, master, sfx };
  return bus;
}

function resume() {
  const b = getBus();
  if (!b) return;
  if (b.ctx.state === "suspended") void b.ctx.resume();
}

function beep(opts: { freq: number; dur: number; type?: OscillatorType; gain?: number; slide?: number; delay?: number }) {
  if (muted) return;
  const b = getBus();
  if (!b) return;
  resume();
  const t0 = b.ctx.currentTime + (opts.delay ?? 0);
  const osc = b.ctx.createOscillator();
  const g = b.ctx.createGain();
  osc.type = opts.type ?? "sine";
  osc.frequency.setValueAtTime(opts.freq, t0);
  if (opts.slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, opts.slide), t0 + opts.dur);
  const vol = opts.gain ?? 0.22;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + opts.dur);
  osc.connect(g);
  g.connect(b.sfx);
  osc.start(t0);
  osc.stop(t0 + opts.dur + 0.02);
  osc.onended = () => {
    osc.disconnect();
    g.disconnect();
  };
}

export const audio = {
  unlock() {
    resume();
  },
  setMuted(v: boolean) {
    muted = v;
    if (bus) bus.master.gain.setTargetAtTime(v ? 0 : 1, bus.ctx.currentTime, 0.02);
  },
  click() {
    beep({ freq: 720, dur: 0.05, type: "square", gain: 0.08 });
  },
  success() {
    beep({ freq: 523, dur: 0.09, type: "triangle", gain: 0.16 });
    beep({ freq: 784, dur: 0.12, type: "triangle", gain: 0.14, delay: 0.07 });
  },
  fail() {
    beep({ freq: 220, dur: 0.16, type: "sawtooth", gain: 0.1, slide: 110 });
  },
  complete() {
    beep({ freq: 392, dur: 0.12, type: "triangle", gain: 0.14 });
    beep({ freq: 523, dur: 0.12, type: "triangle", gain: 0.14, delay: 0.1 });
    beep({ freq: 659, dur: 0.18, type: "triangle", gain: 0.16, delay: 0.2 });
  },
  levelup() {
    beep({ freq: 440, dur: 0.1, type: "square", gain: 0.1 });
    beep({ freq: 554, dur: 0.1, type: "square", gain: 0.1, delay: 0.09 });
    beep({ freq: 659, dur: 0.1, type: "square", gain: 0.1, delay: 0.18 });
    beep({ freq: 880, dur: 0.2, type: "triangle", gain: 0.14, delay: 0.28 });
  },
  unlockReward() {
    beep({ freq: 330, dur: 0.16, type: "sine", gain: 0.14 });
    beep({ freq: 495, dur: 0.16, type: "sine", gain: 0.12, delay: 0.12 });
    beep({ freq: 660, dur: 0.28, type: "triangle", gain: 0.16, delay: 0.24 });
  },
  go() {
    beep({ freq: 880, dur: 0.14, type: "square", gain: 0.12 });
  },
};

if (typeof window !== "undefined") {
  window.addEventListener("pointerdown", () => audio.unlock(), { once: true });
  window.addEventListener("keydown", () => audio.unlock(), { once: true });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") audio.unlock();
  });
}

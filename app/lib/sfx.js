// ---------------------------------------------------------------------
// Little sounds for answers: a bright two-note "ding" when right, a soft
// low "bonk" when wrong, and a short rising chime when a session is done.
// Made with Web Audio (no files to download). Quiet by design.
// ---------------------------------------------------------------------
let ctx = null;
function audio() {
  if (typeof window === 'undefined') return null;
  try {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  } catch { return null; }
}

function note(c, freq, at, dur, { type = 'sine', gain = 0.16, slideTo } = {}) {
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, c.currentTime + at);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, c.currentTime + at + dur);
  g.gain.setValueAtTime(0.0001, c.currentTime + at);
  g.gain.exponentialRampToValueAtTime(gain, c.currentTime + at + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + at + dur);
  o.connect(g).connect(c.destination);
  o.start(c.currentTime + at);
  o.stop(c.currentTime + at + dur + 0.05);
}

export function soundRight() {
  const c = audio(); if (!c) return;
  note(c, 880, 0, 0.12, { type: 'triangle', gain: 0.14 });
  note(c, 1318.5, 0.09, 0.22, { type: 'triangle', gain: 0.14 });
}

export function soundWrong() {
  const c = audio(); if (!c) return;
  note(c, 233, 0, 0.26, { type: 'sine', gain: 0.2, slideTo: 175 });
}

export function soundDone() {
  const c = audio(); if (!c) return;
  [523.3, 659.3, 784, 1046.5].forEach((f, i) => note(c, f, i * 0.09, 0.32, { type: 'triangle', gain: 0.12 }));
}

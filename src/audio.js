// Synthesized storm sound: no audio files. Only runs after the visitor turns sound on.
let ctx = null;
let rain = null;

function noiseBuffer(c, seconds) {
  const buf = c.createBuffer(1, c.sampleRate * seconds, c.sampleRate);
  const data = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < data.length; i++) {
    const white = Math.random() * 2 - 1;
    last = (last + 0.02 * white) / 1.02; // brown noise: deep, rumbly
    data[i] = last * 3.5;
  }
  return buf;
}

export function audioContext() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

export function thunder(strength = 1) {
  const c = audioContext();
  if (!c) return;
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(c, 4);
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 180 + Math.random() * 160;
  const g = c.createGain();
  const now = c.currentTime;
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(0.9 * strength, now + 0.08);
  g.gain.exponentialRampToValueAtTime(0.35 * strength, now + 0.6);
  g.gain.exponentialRampToValueAtTime(0.0001, now + 3.6);
  src.connect(lp).connect(g).connect(c.destination);
  src.start(now);
  src.stop(now + 4);
}

export function setRain(on) {
  const c = on ? audioContext() : ctx;
  if (!c) return;
  if (on && !rain) {
    const src = c.createBufferSource();
    const buf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    src.buffer = buf;
    src.loop = true;
    const bp = c.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1800;
    bp.Q.value = 0.5;
    const g = c.createGain();
    g.gain.value = 0;
    g.gain.linearRampToValueAtTime(0.08, c.currentTime + 1.2);
    src.connect(bp).connect(g).connect(c.destination);
    src.start();
    rain = { src, g };
  } else if (!on && rain) {
    const r = rain;
    rain = null;
    r.g.gain.linearRampToValueAtTime(0, c.currentTime + 0.6);
    setTimeout(() => r.src.stop(), 700);
  }
}

import { createContext, useCallback, useContext, useEffect, useRef } from 'react';
import { usePrefs } from '../prefs.jsx';
import { thunder } from '../audio.js';

// Screen transitions. Each one covers the screen, the page jumps while covered, then it reveals the target.
export const KINDS = {
  wave: { label: 'Wave', inMs: 1200, outMs: 1000 },
  petals: { label: 'Sakura petals', inMs: 950, outMs: 1100 },
  leaves: { label: 'Maple leaves', inMs: 1000, outMs: 1100 },
  ink: { label: 'Sumi ink', inMs: 850, outMs: 900 },
  storm: { label: 'Lightning', inMs: 520, outMs: 1000 }
};
const MIXED = { top: 'petals', work: 'wave', experience: 'leaves', contact: 'petals' };

const SEA = '#1d3557', MID = '#2a4a78', LIGHT = '#7fa3c9', CREAM = '#fff8ee', NIGHT = '#0f1729';
const ease = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeIn = t => t * t * t;
const rnd = (a, b) => a + Math.random() * (b - a);

function seigaiha() {
  const c = document.createElement('canvas'); c.width = 80; c.height = 40; const t = c.getContext('2d');
  t.fillStyle = SEA; t.fillRect(0, 0, 80, 40);
  for (let k = -1; k <= 3; k++) for (let i = -1; i <= 2; i++) {
    const x = 80 * i + 40 * (((k % 2) + 2) % 2), y = 20 * k;
    [40, 30, 20, 10].forEach((r, j) => { t.beginPath(); t.arc(x, y, r, Math.PI, 0); t.fillStyle = j % 2 ? MID : SEA; t.fill(); t.strokeStyle = 'rgba(255,248,238,.35)'; t.lineWidth = 1.2; t.stroke(); });
  }
  return c;
}

function drawWave(c, W, H, p, phase, parts, tile) {
  const R = Math.max(H * 0.26, 180), pat = c.createPattern(tile, 'repeat');
  if (phase === 0) {
    const F = -R * 2 + ease(p) * (W + R * 3.2), dy = -H * 0.55 * easeIn(p), y = v => v + dy;
    c.save(); c.beginPath(); c.moveTo(-20, H + 20); c.lineTo(-20, y(H * 0.34)); c.quadraticCurveTo(F - R * 1.2, y(H * 0.3), F - R * 0.15, y(H * 0.12));
    c.bezierCurveTo(F + R * 0.55, y(H * 0.04), F + R * 1.15, y(H * 0.2), F + R * 0.95, y(H * 0.42)); c.bezierCurveTo(F + R * 0.75, y(H * 0.3), F + R * 0.3, y(H * 0.3), F + R * 0.25, y(H * 0.5));
    c.bezierCurveTo(F + R * 0.2, y(H * 0.72), F + R * 0.55, y(H * 0.9), F + R * 0.85, H + 20); c.closePath();
    const gr = c.createLinearGradient(F - R * 2, 0, F + R, 0); gr.addColorStop(0, SEA); gr.addColorStop(0.7, MID); gr.addColorStop(1, LIGHT); c.fillStyle = gr; c.fill(); c.clip();
    c.globalAlpha = 0.55; c.fillStyle = pat; c.fillRect(-20, -H, F - R * 0.6 + 20, H * 3); c.globalAlpha = 1;
    c.strokeStyle = 'rgba(255,248,238,.55)'; c.lineWidth = 3;
    for (let k = 1; k < 7; k++) { const o = k * R * 0.16; c.beginPath(); c.moveTo(F + R * 0.25 - o, y(H * 0.5) + k * 6); c.bezierCurveTo(F + R * 0.2 - o, y(H * 0.72), F + R * 0.55 - o, y(H * 0.9), F + R * 0.85 - o, H + 20); c.stroke(); }
    c.restore();
    for (let i = 0; i <= 22; i++) {
      const t = i / 22, m = 1 - t;
      const bx = m * m * m * (F - R * 0.15) + 3 * m * m * t * (F + R * 0.55) + 3 * m * t * t * (F + R * 1.15) + t * t * t * (F + R * 0.95);
      const by = m * m * m * (H * 0.12) + 3 * m * m * t * (H * 0.04) + 3 * m * t * t * (H * 0.2) + t * t * t * (H * 0.42) + dy;
      const s = R * (0.05 + 0.05 * Math.sin(t * 9 + p * 20)); c.fillStyle = CREAM; c.strokeStyle = SEA; c.lineWidth = 2;
      for (let j = 0; j < 3; j++) { c.beginPath(); c.arc(bx + (j - 1) * s * 0.9 + s * 0.5, by - s * 0.6 - (j % 2) * s * 0.5, s * (0.7 - j * 0.12), 0, 7); c.fill(); c.stroke(); }
      if (Math.random() < 0.5) parts.push({ x: bx, y: by, vx: rnd(2, 7), vy: rnd(-5, 1), r: rnd(1.5, 4), l: 1 });
    }
  } else {
    const lvl = -H * 0.1 + easeIn(p) * H * 1.2, ph = p * 12;
    const yy = x => lvl + Math.sin(x / 90 + ph) * 14 + Math.sin(x / 37 - ph * 1.3) * 6;
    c.beginPath(); c.moveTo(-20, H + 20); c.lineTo(-20, lvl); for (let x = 0; x <= W + 40; x += 20) c.lineTo(x, yy(x)); c.lineTo(W + 40, H + 20); c.closePath();
    c.fillStyle = SEA; c.fill(); c.save(); c.clip(); c.globalAlpha = 0.55; c.fillStyle = pat; c.fillRect(0, 0, W, H); c.restore();
    c.strokeStyle = CREAM; c.lineWidth = 4; c.beginPath(); for (let x = 0; x <= W + 40; x += 20) (x ? c.lineTo(x, yy(x)) : c.moveTo(x, yy(x))); c.stroke();
  }
  for (let n = parts.length - 1; n >= 0; n--) { const q = parts[n]; q.x += q.vx; q.y += q.vy; q.vy += 0.25; q.l -= 0.025; if (q.l <= 0) { parts.splice(n, 1); continue; } c.globalAlpha = q.l; c.fillStyle = CREAM; c.beginPath(); c.arc(q.x, q.y, q.r, 0, 7); c.fill(); c.globalAlpha = 1; }
}

function petal(c, s) { c.beginPath(); c.moveTo(0, -s * 0.55); c.lineTo(s * 0.22, -s); c.bezierCurveTo(s * 1.05, -s * 0.7, s * 0.65, s * 0.75, 0, s); c.bezierCurveTo(-s * 0.65, s * 0.75, -s * 1.05, -s * 0.7, -s * 0.22, -s); c.closePath(); }
function maple(c, s) {
  // seven lobed momiji leaf with a stem
  c.beginPath();
  const lobes = [[0, -1], [0.55, -0.65], [0.95, -0.15], [0.55, 0.25], [0, 0.35], [-0.55, 0.25], [-0.95, -0.15], [-0.55, -0.65]];
  for (let i = 0; i < 7; i++) {
    const a = lobes[i], b = lobes[i + 1] || lobes[0];
    const tip = [a[0] * s, a[1] * s], notch = [(a[0] + b[0]) * 0.28 * s, (a[1] + b[1]) * 0.28 * s];
    if (i === 0) c.moveTo(tip[0], tip[1]); else c.lineTo(tip[0], tip[1]);
    c.lineTo(notch[0], notch[1]);
  }
  c.closePath();
}

function drawFall(kind, c, W, H, p, phase, parts) {
  const leaves = kind === 'leaves';
  if (!parts.length) {
    const n = Math.min(leaves ? 260 : 700, (W * H) / (leaves ? 2600 : 1000));
    const cols = leaves ? ['#b8432a', '#d9622b', '#e98b2e', '#c9a24a', '#8e2a1e'] : ['#f2b8c6', '#fdf0f2', '#d9788f'];
    for (let i = 0; i < n; i++) parts.push({ x: rnd(-W * 1.2, -20), y: rnd(-H * 0.7, H), s: leaves ? rnd(12, 30) : rnd(6, 16), r: rnd(0, 6), vr: rnd(-0.15, 0.15), sp: rnd(0.8, 1.4), ph: rnd(0, 6), col: cols[i % cols.length] });
  }
  const t = phase === 0 ? p : 1 + p, wash = phase === 0 ? Math.max(0, (p - 0.45) / 0.55) : 1 - ease(p);
  c.globalAlpha = wash; c.fillStyle = leaves ? '#5a2216' : '#fdf0f2'; c.fillRect(0, 0, W, H); c.globalAlpha = 1;
  for (const q of parts) {
    const x = q.x + t * q.sp * W * 1.3, y = q.y + t * q.sp * H * (leaves ? 0.75 : 0.5) + Math.sin(q.ph + t * 6) * 20; q.r += q.vr;
    c.save(); c.translate(x, y); c.rotate(q.r); c.scale(1, Math.cos(q.ph + t * 8));
    leaves ? maple(c, q.s) : petal(c, q.s); c.fillStyle = q.col; c.fill();
    if (leaves) { c.strokeStyle = 'rgba(60,20,10,.45)'; c.lineWidth = 1; c.beginPath(); c.moveTo(0, q.s * 0.35); c.lineTo(0, q.s * 0.75); c.stroke(); }
    c.restore();
  }
}

function blob(c, x, y, r, seed) { c.beginPath(); for (let a = 0; a <= 64; a++) { const t = (a / 64) * 6.283, k = 1 + 0.09 * Math.sin(t * 5 + seed) + 0.06 * Math.sin(t * 11 + seed * 2) + 0.04 * Math.sin(t * 17 + seed * 3); const px = x + Math.cos(t) * r * k, py = y + Math.sin(t) * r * k; a ? c.lineTo(px, py) : c.moveTo(px, py); } c.closePath(); }
function drawInk(c, W, H, p, phase, parts, from) {
  const D = Math.hypot(W, H);
  if (!parts.length) {
    parts.push({ x: from.x * W, y: from.y * H, d: 0, s: 1 });
    for (let i = 0; i < 5; i++) parts.push({ x: rnd(0, W), y: rnd(0, H), d: rnd(0.1, 0.35), s: rnd(0, 9) });
    for (let j = 0; j < 40; j++) parts.push({ x: from.x * W + rnd(-1, 1) * W * 0.4, y: from.y * H + rnd(-1, 1) * H * 0.4, d: rnd(0, 0.4), s: rnd(0, 9), dot: rnd(3, 14) });
  }
  c.fillStyle = NIGHT;
  if (phase === 0) {
    const e = ease(p);
    parts.forEach(b => { const q = Math.max(0, (e - b.d) / (1 - b.d)); if (!q) return; if (b.dot) { c.beginPath(); c.arc(b.x, b.y, b.dot * Math.min(1, q * 3), 0, 7); c.fill(); return; } blob(c, b.x, b.y, q * D * 1.05, b.s); c.fill(); });
  } else {
    c.fillRect(0, 0, W, H); c.globalCompositeOperation = 'destination-out'; blob(c, W * 0.5, H * 0.5, ease(p) * D * 0.62, 3); c.fill(); c.globalCompositeOperation = 'source-over';
  }
}

function drawStorm(c, W, H, p, phase, parts) {
  if (!parts.length) {
    let x = W * rnd(0.3, 0.7), y = 0; const pts = [[x, y]];
    while (y < H) { y += rnd(18, 40); x += rnd(-40, 40); pts.push([x, y]); }
    parts.push({ pts });
    for (let i = 0; i < 220; i++) parts.push({ x: rnd(0, W + 200), y: rnd(0, H), l: rnd(14, 34), v: rnd(20, 34) });
  }
  const bolt = parts[0];
  if (phase === 0) {
    const flash = p < 0.25 ? 1 : p < 0.4 ? 0.3 : p < 0.55 ? 0.9 : 0;
    c.fillStyle = NIGHT; c.globalAlpha = Math.min(1, p * 2.2); c.fillRect(0, 0, W, H); c.globalAlpha = 1;
    if (flash) { c.fillStyle = `rgba(225,235,255,${flash})`; c.fillRect(0, 0, W, H); }
    c.strokeStyle = '#eef3ff'; c.lineWidth = 3; c.shadowColor = '#b8c8ff'; c.shadowBlur = 18; c.beginPath(); bolt.pts.forEach(([a, b], i) => (i ? c.lineTo(a, b) : c.moveTo(a, b))); c.stroke(); c.shadowBlur = 0;
  } else {
    c.fillStyle = NIGHT; c.globalAlpha = 1 - ease(p); c.fillRect(0, 0, W, H); c.globalAlpha = 1;
  }
  c.strokeStyle = `rgba(200,215,235,${phase === 0 ? 0.5 : 0.5 * (1 - p)})`; c.lineWidth = 1; c.beginPath();
  for (let i = 1; i < parts.length; i++) { const r = parts[i]; r.y += r.v; r.x -= r.v * 0.25; if (r.y > H) { r.y = -20; r.x = rnd(0, W + 200); } c.moveTo(r.x, r.y); c.lineTo(r.x + r.l * 0.25, r.y - r.l); }
  c.stroke();
}

// One frame of a transition, used by the provider and handy for checking a single frame in tests.
export function renderTransitionFrame(kind, c, W, H, p, phase, parts, tile, from = { x: 0.5, y: 0.5 }) {
  if (kind === 'wave') drawWave(c, W, H, p, phase, parts, tile || seigaiha());
  else if (kind === 'ink') drawInk(c, W, H, p, phase, parts, from);
  else if (kind === 'storm') drawStorm(c, W, H, p, phase, parts);
  else drawFall(kind, c, W, H, p, phase, parts);
}

const TransitionContext = createContext(null);

export function TransitionProvider({ children }) {
  const { motionOn, transition, sound } = usePrefs();
  const ref = useRef(null), busy = useRef(false), tile = useRef(null), live = useRef({});
  live.current = { motionOn, transition, sound };

  useEffect(() => {
    const cv = ref.current;
    const size = () => { const d = Math.min(devicePixelRatio || 1, 1.5); cv.width = innerWidth * d; cv.height = innerHeight * d; cv.getContext('2d').setTransform(d, 0, 0, d, 0, 0); };
    size(); addEventListener('resize', size); tile.current = seigaiha();
    return () => removeEventListener('resize', size);
  }, []);

  const jump = useCallback(id => {
    const el = document.getElementById(id);
    if (!el) return;
    scrollTo({ top: el.getBoundingClientRect().top + scrollY, behavior: 'instant' });
    try { history.replaceState(null, '', '#' + id); } catch { /* sandboxed frames */ }
  }, []);

  const go = useCallback((id, from = { x: 0.5, y: 0.5 }, forced) => {
    const { motionOn: mo, transition: tr, sound: snd } = live.current;
    if (busy.current) return;
    if (!mo) { jump(id); return; }
    const kind = forced || (tr === 'mixed' ? MIXED[id] || 'wave' : tr);
    const spec = KINDS[kind];
    const cv = ref.current, c = cv.getContext('2d'), W = innerWidth, H = innerHeight;
    busy.current = true; cv.classList.add('on');
    if (kind === 'storm' && snd) setTimeout(() => thunder(0.9), 250);
    const t0 = performance.now(); let jumped = false; const parts = [];
    const step = now => {
      const t = now - t0; c.clearRect(0, 0, W, H);
      let phase = 0, p = t / spec.inMs;
      if (t >= spec.inMs) { if (!jumped) { jumped = true; jump(id); } phase = 1; p = Math.min(1, (t - spec.inMs) / spec.outMs); }
      renderTransitionFrame(kind, c, W, H, p, phase, parts, tile.current, from);
      if (phase === 1 && p >= 1) { c.clearRect(0, 0, W, H); cv.classList.remove('on'); busy.current = false; return; }
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [jump]);

  useEffect(() => {
    const onClick = e => {
      const a = e.target.closest('[data-go]');
      if (!a) return;
      e.preventDefault();
      go(a.dataset.go, { x: e.clientX / innerWidth || 0.5, y: e.clientY / innerHeight || 0.5 });
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [go]);

  return (
    <TransitionContext.Provider value={{ go, jump }}>
      {children}
      <canvas ref={ref} className="fxlayer" aria-hidden="true" />
    </TransitionContext.Provider>
  );
}

export const useTransition = () => useContext(TransitionContext);

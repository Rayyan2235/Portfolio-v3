import { createContext, useCallback, useContext, useEffect, useRef } from 'react';
import { usePrefs } from '../prefs.jsx';
import { thunder } from '../audio.js';

// Screen transitions. Each one covers the screen, the page jumps while covered, then it reveals the target.
export const KINDS = {
  wave: { label: 'Wave', inMs: 1200, outMs: 1000 },
  petals: { label: 'Sakura petals', inMs: 950, outMs: 1100 },
  leaves: { label: 'Maple leaves', inMs: 1000, outMs: 1100 },
  ink: { label: 'Sumi ink', inMs: 850, outMs: 900 },
  storm: { label: 'Lightning', inMs: 520, outMs: 1000 },
  water: { label: 'Water slash', inMs: 900, outMs: 900 },
  thunder: { label: 'Thunder slash', inMs: 760, outMs: 900 }
};
const MIXED = { top: 'petals', work: 'water', experience: 'leaves', hobbies: 'thunder', contact: 'petals' };

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

// Sword slashes, in the spirit of the breathing styles: an original effect, no characters or anime art.
// Water: one blade stroke cuts the screen on a diagonal, then a wave floods out from the cut and covers it;
// on the way out the water drains back into the cut.
function drawWaterSlash(c, W, H, p, phase, parts) {
  const ax = -W * 0.1, ay = H * 0.86, bx = W * 1.1, by = H * 0.14, len = Math.hypot(bx - ax, by - ay);
  const ux = (bx - ax) / len, uy = (by - ay) / len, nx = -uy, ny = ux, D = Math.hypot(W, H);
  const cut = (t, w, col, glow) => { c.save(); c.strokeStyle = col; c.lineWidth = w; c.lineCap = 'round'; c.shadowColor = glow; c.shadowBlur = 24; c.beginPath(); c.moveTo(ax, ay); c.lineTo(ax + (bx - ax) * t, ay + (by - ay) * t); c.stroke(); c.restore(); };
  const ribbon = (h, wob) => {
    // a band around the cut, its two edges rolling like water
    const steps = 40, edge = s => { const pts = []; for (let i = 0; i <= steps; i++) { const t = i / steps, x = ax + (bx - ax) * t, y = ay + (by - ay) * t, o = h + Math.sin(t * 14 + wob) * h * 0.08 + Math.sin(t * 31 - wob) * 10; pts.push([x + nx * o * s, y + ny * o * s]); } return pts; };
    const top = edge(1), bot = edge(-1).reverse();
    c.beginPath(); [...top, ...bot].forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath();
    const g = c.createLinearGradient(ax + nx * h, ay + ny * h, ax - nx * h, ay - ny * h); g.addColorStop(0, SEA); g.addColorStop(0.5, MID); g.addColorStop(1, SEA); c.fillStyle = g; c.fill();
    c.strokeStyle = 'rgba(255,248,238,.85)'; c.lineWidth = 5;
    [top, bot].forEach(e => { c.beginPath(); e.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.stroke(); });
    c.strokeStyle = 'rgba(159,211,255,.35)'; c.lineWidth = 2;
    for (let k = 1; k < 5; k++) { const o = h * (k / 5); c.beginPath(); c.moveTo(ax + nx * o, ay + ny * o); c.lineTo(bx + nx * o, by + ny * o); c.moveTo(ax - nx * o, ay - ny * o); c.lineTo(bx - nx * o, by - ny * o); c.stroke(); }
  };
  if (phase === 0) {
    const t1 = Math.min(1, p / 0.28), t2 = Math.max(0, (p - 0.22) / 0.78);
    if (t2 > 0) ribbon(ease(t2) * D * 0.72, p * 9);
    cut(easeIn(t1) * 0.4 + t1 * 0.6, 4, '#ffffff', '#9fd3ff');
    if (t1 < 1 || Math.random() < 0.6) for (let i = 0; i < 4; i++) { const t = Math.random() * t1; parts.push({ x: ax + (bx - ax) * t, y: ay + (by - ay) * t, vx: rnd(-3, 3) + nx * rnd(-4, 4), vy: rnd(-3, 3) + ny * rnd(-4, 4), l: 1 }); }
  } else {
    const h = (1 - ease(p)) * D * 0.72;
    if (h > 12) ribbon(h, 9 + p * 9);
    if (p < 0.98) cut(1, 4 * (1 - p), `rgba(255,255,255,${1 - p})`, '#9fd3ff');
  }
  c.fillStyle = CREAM;
  for (let n = parts.length - 1; n >= 0; n--) { const q = parts[n]; q.x += q.vx; q.y += q.vy; q.l -= 0.03; if (q.l <= 0) { parts.splice(n, 1); continue; } c.globalAlpha = q.l; c.beginPath(); c.arc(q.x, q.y, 2.5, 0, 7); c.fill(); }
  c.globalAlpha = 1;
}

// Thunder: one flash step. The room drops to a warm dark, a white hot streak zigzags across with blue white arcs
// crackling around it, throwing sparks and dust; a flash; the jagged cut is left glowing in the dark, and the
// screen parts along it to show the page.
function drawThunderSlash(c, W, H, p, phase, parts) {
  if (!parts.length) {
    // sharp switchbacks from edge to edge, alternating high and low
    const n = W < 700 ? 5 : 7, y0 = H * rnd(0.46, 0.54), A = H * 0.2, pts = [[-40, y0]];
    for (let i = 1; i < n; i++) pts.push([-40 + ((W + 80) * i) / n + rnd(-W * 0.03, W * 0.03), y0 + (i % 2 ? -1 : 1) * A * rnd(0.6, 1)]);
    pts.push([W + 40, y0]);
    const len = [0];
    for (let i = 1; i < pts.length; i++) len.push(len[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    parts.push({ pts, len, sparks: [], smoke: [] });
  }
  const S = parts[0], { pts, len } = S, total = len[len.length - 1], BG = '#120d1f';
  const upTo = d => {
    // the path from the start to distance d along it, ending exactly at the head
    const out = [pts[0]];
    for (let i = 1; i < pts.length; i++) {
      if (len[i] <= d) { out.push(pts[i]); continue; }
      const t = (d - len[i - 1]) / (len[i] - len[i - 1]);
      out.push([pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * t, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t]);
      break;
    }
    return out;
  };
  const line = (ps, col, w) => { c.beginPath(); ps.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.strokeStyle = col; c.lineWidth = w; c.stroke(); };
  const jag = (ps, amp) => {
    // the same path broken into small kinks, new every frame so it flickers
    const out = [ps[0]];
    for (let i = 1; i < ps.length; i++) {
      const [ax, ay] = ps[i - 1], [bx, by] = ps[i], L = Math.hypot(bx - ax, by - ay), k = Math.max(1, Math.round(L / 22));
      for (let j = 1; j <= k; j++) { const t = j / k, o = j === k ? 0 : rnd(-amp, amp); out.push([ax + (bx - ax) * t - ((by - ay) / L) * o, ay + (by - ay) * t + ((bx - ax) / L) * o]); }
    }
    return out;
  };
  const crackle = (ps, a) => {
    if (ps.length < 2) return;
    c.save(); c.globalAlpha = a; c.lineJoin = 'miter'; c.shadowColor = '#7fd8ff'; c.shadowBlur = 14;
    line(jag(ps, 20), '#bfeaff', 2.5); line(jag(ps, 26), '#bfeaff', 1.8); line(jag(ps, 12), '#ffffff', 1.4);
    c.restore();
  };
  const cut = (ps, a) => {
    if (a <= 0) return;
    c.save(); c.globalAlpha = a; c.lineJoin = 'miter'; c.lineCap = 'round';
    line(ps, 'rgba(255,140,50,.28)', 46);
    c.shadowColor = '#ff9a3c'; c.shadowBlur = 26; line(ps, '#ffd27a', 6);
    c.shadowBlur = 0; line(ps, '#fffbe6', 2); c.restore();
  };
  if (phase === 0) {
    c.globalAlpha = Math.min(1, p * 3); c.fillStyle = BG; c.fillRect(0, 0, W, H);
    const room = c.createRadialGradient(W * 0.5, H * 0.5, 0, W * 0.5, H * 0.5, Math.max(W, H) * 0.7);
    room.addColorStop(0, 'rgba(190,90,30,.4)'); room.addColorStop(1, 'rgba(190,90,30,0)');
    c.fillStyle = room; c.fillRect(0, 0, W, H); c.globalAlpha = 1;
    const d = Math.max(0, Math.min(1, (p - 0.16) / 0.3));
    if (p > 0.04 && p < 0.16) crackle(upTo(total * 0.05), 0.8); // charging at the edge
    if (d > 0 && d < 1) {
      const dist = easeIn(d) * total, trail = upTo(dist), head = trail[trail.length - 1], th = Math.max(16, H * 0.026);
      c.save(); c.lineJoin = 'miter'; c.lineCap = 'round';
      line(trail, 'rgba(255,200,110,.35)', th * 2.2);
      c.shadowColor = '#ffd27a'; c.shadowBlur = 36; line(trail, '#ffe4a0', th);
      c.shadowBlur = 0; line(trail, '#ffffff', th * 0.4);
      const g = c.createRadialGradient(head[0], head[1], 0, head[0], head[1], th * 3);
      g.addColorStop(0, '#ffffff'); g.addColorStop(1, 'rgba(255,230,160,0)'); c.fillStyle = g; c.beginPath(); c.arc(head[0], head[1], th * 3, 0, 7); c.fill();
      c.restore();
      crackle(upTo(dist).filter(([x]) => x > head[0] - W * 0.6), 0.95);
      for (let i = 0; i < 7; i++) S.sparks.push({ x: head[0], y: head[1] + rnd(-th, th), vx: rnd(-14, 4), vy: rnd(-10, 10), l: 1, dust: i % 2 });
      if (Math.random() < 0.6) S.smoke.push({ x: head[0] - rnd(0, 60), y: head[1] + rnd(-40, 40), r: rnd(30, 70), l: 1 });
    }
    if (d >= 1) { cut(pts, Math.min(1, (p - 0.46) / 0.08)); if (Math.random() < 0.6) crackle(pts, 0.55); }
    if (p > 0.46 && p < 0.72) { c.fillStyle = `rgba(255,244,214,${0.9 * (1 - Math.abs(p - 0.54) / 0.18)})`; c.fillRect(0, 0, W, H); }
  } else {
    // the two halves slide apart along the jagged cut; dust stays behind in the dark
    S.smoke.length = 0;
    const off = ease(p) * H * 0.75, half = (dy, edge) => {
      c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y + dy) : c.moveTo(x, y + dy)));
      c.lineTo(W + 40, edge + dy); c.lineTo(-40, edge + dy); c.closePath(); c.fill();
    };
    c.fillStyle = BG; half(-off, -H); half(off, H * 2);
    cut(pts, 1 - Math.min(1, p * 1.6));
    if (p < 0.35 && Math.random() < 0.5) crackle(pts, 0.6 * (1 - p / 0.35));
  }
  for (let n = S.smoke.length - 1; n >= 0; n--) {
    const q = S.smoke[n]; q.r += 3; q.x -= 1.5; q.l -= 0.035;
    if (q.l <= 0) { S.smoke.splice(n, 1); continue; }
    const puff = c.createRadialGradient(q.x, q.y, 0, q.x, q.y, q.r);
    puff.addColorStop(0, `rgba(138,106,82,${0.3 * q.l})`); puff.addColorStop(1, 'rgba(138,106,82,0)');
    c.fillStyle = puff; c.beginPath(); c.arc(q.x, q.y, q.r, 0, 7); c.fill();
  }
  for (let n = S.sparks.length - 1; n >= 0; n--) {
    const q = S.sparks[n]; q.x += q.vx; q.y += q.vy; q.vy += 0.35; q.l -= 0.04;
    if (q.l <= 0) { S.sparks.splice(n, 1); continue; }
    c.globalAlpha = q.l; c.fillStyle = q.dust ? '#3a2418' : '#ffe9a8'; c.fillRect(q.x, q.y, q.dust ? 4 : 3, q.dust ? 4 : 2);
  }
  c.globalAlpha = 1;
}

// One frame of a transition, used by the provider and handy for checking a single frame in tests.
export function renderTransitionFrame(kind, c, W, H, p, phase, parts, tile, from = { x: 0.5, y: 0.5 }) {
  if (kind === 'wave') drawWave(c, W, H, p, phase, parts, tile || seigaiha());
  else if (kind === 'water') drawWaterSlash(c, W, H, p, phase, parts);
  else if (kind === 'thunder') drawThunderSlash(c, W, H, p, phase, parts);
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
    if ((kind === 'storm' || kind === 'thunder') && snd) setTimeout(() => thunder(0.9), kind === 'thunder' ? 120 : 250);
    const t0 = performance.now(); let jumped = false; const parts = [];
    const finish = () => { if (!jumped) { jumped = true; jump(id); } c.clearRect(0, 0, W, H); cv.classList.remove('on'); busy.current = false; };
    const step = now => {
      // the first frame's timestamp can fall a hair before t0, so clamp at zero
      const t = Math.max(0, now - t0); c.clearRect(0, 0, W, H);
      let phase = 0, p = t / spec.inMs;
      if (t >= spec.inMs) { if (!jumped) { jumped = true; jump(id); } phase = 1; p = Math.min(1, (t - spec.inMs) / spec.outMs); }
      // a drawing error must never leave the screen covered: land on the target and lift the cover
      try { renderTransitionFrame(kind, c, W, H, p, phase, parts, tile.current, from); } catch (err) { console.error(err); finish(); return; }
      if (phase === 1 && p >= 1) { finish(); return; }
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

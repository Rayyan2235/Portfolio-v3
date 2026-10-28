import { useEffect, useRef } from 'react';
import { usePrefs } from '../prefs.jsx';

// Pieces reverse engineered from award winning portfolios and redrawn for the prints.
// Each one runs only while on screen and touches a single canvas or a transform.

// Currents, after Antoine Wodniack's hero waves (wodniack.dev, Awwwards Portfolio Honors): rows of points bent by
// a slow noise field, drawn as long ink lines. A moving cursor shoves the lines along its path and they spring back.
// His version is SVG paths at 60fps; this is one canvas, one stroke call, 30fps, fewer lines.
export function Currents() {
  const { motionOn } = usePrefs();
  const ref = useRef(null);
  useEffect(() => {
    const cv = ref.current, c = cv.getContext('2d');
    const noise = makeNoise();
    let W = 0, H = 0, lines = [], raf = 0, vis = false, last = 0;
    const mouse = { x: -999, y: -999, sx: -999, sy: -999, lx: 0, ly: 0, vs: 0, a: 0, set: false };
    const size = () => {
      W = cv.clientWidth; H = cv.clientHeight; cv.width = W; cv.height = H;
      const gx = W < 700 ? 30 : 24, gy = 34;
      lines = [];
      for (let y = -gy; y <= H + gy; y += gx) {
        const row = [];
        for (let x = -gy; x <= W + gy; x += gy) row.push({ x, y, cx: 0, cy: 0, vx: 0, vy: 0 });
        lines.push(row);
      }
    };
    const draw = t => {
      c.clearRect(0, 0, W, H);
      c.beginPath();
      for (const row of lines) {
        row.forEach((p, i) => {
          const n = noise((p.x + t * 0.0125) * 0.002, (p.y + t * 0.005) * 0.0015) * 12;
          const wx = Math.cos(n) * 16, wy = Math.sin(n) * 22;
          if (mouse.set) {
            const dx = p.x - mouse.sx, dy = p.y - mouse.sy, d = Math.hypot(dx, dy), r = Math.max(160, mouse.vs);
            if (d < r) {
              const f = (1 - d / r) * Math.cos(d * 0.001);
              p.vx += Math.cos(mouse.a) * f * r * mouse.vs * 0.0008;
              p.vy += Math.sin(mouse.a) * f * r * mouse.vs * 0.0008;
            }
          }
          p.vx += -p.cx * 0.01; p.vy += -p.cy * 0.01; p.vx *= 0.9; p.vy *= 0.9;
          p.cx = Math.max(-90, Math.min(90, p.cx + p.vx * 2)); p.cy = Math.max(-90, Math.min(90, p.cy + p.vy * 2));
          const X = p.x + wx + p.cx, Y = p.y + wy + p.cy;
          if (i) c.lineTo(X, Y); else c.moveTo(X, Y);
        });
      }
      c.stroke();
    };
    const tick = now => {
      raf = 0;
      if (!vis) return;
      raf = requestAnimationFrame(tick);
      if (now - last < 31) return;
      last = now;
      mouse.sx += (mouse.x - mouse.sx) * 0.15; mouse.sy += (mouse.y - mouse.sy) * 0.15;
      const v = Math.hypot(mouse.x - mouse.lx, mouse.y - mouse.ly);
      mouse.vs += (Math.min(100, v) - mouse.vs) * 0.15; mouse.lx = mouse.x; mouse.ly = mouse.y;
      draw(now);
    };
    const style = () => { c.strokeStyle = getComputedStyle(cv).color; c.lineWidth = 1; c.lineJoin = 'round'; };
    const onMove = e => {
      const r = cv.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      if (!mouse.set) { mouse.sx = mouse.lx = x; mouse.sy = mouse.ly = y; mouse.set = true; }
      mouse.a = Math.atan2(y - mouse.y, x - mouse.x);
      mouse.x = x; mouse.y = y;
    };
    size(); style();
    if (!motionOn) { draw(4000); return undefined; }
    const io = new IntersectionObserver(([e]) => { vis = e.isIntersecting; if (vis && !raf) raf = requestAnimationFrame(tick); });
    io.observe(cv);
    const ro = new ResizeObserver(() => { size(); style(); });
    ro.observe(cv);
    addEventListener('pointermove', onMove, { passive: true });
    return () => { cancelAnimationFrame(raf); io.disconnect(); ro.disconnect(); removeEventListener('pointermove', onMove); };
  }, [motionOn]);
  return <canvas ref={ref} className="currents" aria-hidden="true" />;
}

// 2D Perlin noise (Ken Perlin's improved gradients), enough for a flow field.
function makeNoise() {
  const p = new Uint8Array(512), perm = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [perm[i], perm[j]] = [perm[j], perm[i]]; }
  for (let i = 0; i < 512; i++) p[i] = perm[i & 255];
  const g = [[1, 1], [-1, 1], [1, -1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]];
  const fade = t => t * t * t * (t * (t * 6 - 15) + 10);
  const dot = (h, x, y) => { const v = g[h & 7]; return v[0] * x + v[1] * y; };
  return (x, y) => {
    const X = Math.floor(x) & 255, Y = Math.floor(y) & 255;
    x -= Math.floor(x); y -= Math.floor(y);
    const u = fade(x), v = fade(y);
    const a = dot(p[X + p[Y]], x, y), b = dot(p[X + 1 + p[Y]], x - 1, y);
    const cc = dot(p[X + p[Y + 1]], x, y - 1), d = dot(p[X + 1 + p[Y + 1]], x - 1, y - 1);
    return (a + u * (b - a)) + v * ((cc + u * (d - cc)) - (a + u * (b - a)));
  };
}

// A name that rolls across the foot of the page, after Dennis Snellenberg's footer (dennissnellenberg.com):
// it runs left while you scroll down and turns around when you scroll back up.
export function NameRoll() {
  const { motionOn } = usePrefs();
  const ref = useRef(null);
  useEffect(() => {
    const track = ref.current?.querySelector('.roll-track');
    if (!motionOn || !track || !track.getAnimations) return undefined;
    const anim = track.getAnimations()[0];
    if (!anim) return undefined;
    let lastY = scrollY, dir = 1, on = false;
    const io = new IntersectionObserver(([e]) => { on = e.isIntersecting; if (on) anim.play(); else anim.pause(); });
    io.observe(ref.current);
    const onScroll = () => {
      if (!on) return;
      const d = scrollY > lastY ? 1 : scrollY < lastY ? -1 : dir;
      lastY = scrollY;
      if (d !== dir) { dir = d; anim.playbackRate = dir; }
    };
    addEventListener('scroll', onScroll, { passive: true });
    return () => { io.disconnect(); removeEventListener('scroll', onScroll); };
  }, [motionOn]);
  const phrase = <span>Rayyan Syed<i aria-hidden="true" />Walk quietly<i aria-hidden="true" />Leave a mark<i aria-hidden="true" /></span>;
  return (
    <div className="roll" ref={ref} aria-label="Rayyan Syed. Walk quietly, leave a mark.">
      <div className="roll-track" aria-hidden="true">{phrase}{phrase}</div>
    </div>
  );
}

import { useEffect, useRef } from 'react';
import { motion, useScroll, useTransform } from 'motion/react';
import { usePrefs } from '../prefs.jsx';
import { loopWhileVisible } from '../loop.js';

// A fourth round of pieces after award winning portfolios, kept to one canvas or plain transforms.

// Koi in the currents. Three fish swim the statement section, each a spine of points that follows its head, the
// way creative coders build snakes and fish. They wander, drift toward a moving cursor, and dart to a tap or click,
// which also drops a ripple. 30fps, and only while the section is on screen.
const KOI = [
  { body: '#fff8ee', spots: ['#e4572e', '#e4572e'], len: 1.8 },
  { body: '#f2a541', spots: ['#fff8ee'], len: 1.5 },
  { body: '#fff8ee', spots: ['#1b2433', '#e4572e'], len: 1.3 }
];
export function Koi({ host }) {
  const { motionOn } = usePrefs();
  const ref = useRef(null);
  useEffect(() => {
    const cv = ref.current, el = host.current, c = cv.getContext('2d');
    if (!motionOn || !el) return undefined;
    let W = 0, H = 0;
    const ripples = [], aim = { x: 0, y: 0, until: 0, near: false };
    const size = () => { W = cv.clientWidth; H = cv.clientHeight; cv.width = W; cv.height = H; };
    size();
    const fish = KOI.map((k, i) => {
      const seg = 11, gap = 9 * k.len, x = W * (0.2 + i * 0.3), y = H * (0.3 + (i % 2) * 0.4);
      return { ...k, seg, gap, a: i * 2.1, v: 1.4, wob: i, pts: Array.from({ length: seg }, (_, j) => ({ x: x - j * gap, y })) };
    });
    const step = (f, now) => {
      const h = f.pts[0];
      // wander, steer toward the cursor or the last tap, and turn away from the edges
      let ta = f.a + Math.sin(now * 0.0006 + f.wob * 3) * 0.04;
      const chasing = now < aim.until || aim.near;
      if (chasing) {
        const want = Math.atan2(aim.y - h.y, aim.x - h.x), d = Math.hypot(aim.x - h.x, aim.y - h.y);
        let diff = ((want - f.a + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
        if (d > 40) ta = f.a + diff * 0.08;
      }
      const m = 60;
      if (h.x < m || h.x > W - m || h.y < m || h.y > H - m) {
        const home = Math.atan2(H / 2 - h.y, W / 2 - h.x);
        ta += ((((home - ta + Math.PI * 3) % (Math.PI * 2)) - Math.PI)) * 0.06;
      }
      f.a = ta;
      const speed = now < aim.until ? 3.4 : chasing ? 2 : 1.3;
      f.v += (speed * (0.8 + f.len * 0.2) - f.v) * 0.05;
      h.x += Math.cos(f.a) * f.v; h.y += Math.sin(f.a) * f.v;
      h.x = Math.max(-20, Math.min(W + 20, h.x)); h.y = Math.max(-20, Math.min(H + 20, h.y));
      for (let j = 1; j < f.seg; j++) {
        const p = f.pts[j], q = f.pts[j - 1], an = Math.atan2(p.y - q.y, p.x - q.x);
        p.x = q.x + Math.cos(an) * f.gap; p.y = q.y + Math.sin(an) * f.gap;
      }
    };
    const outline = (f, dx = 0, dy = 0) => {
      const L = [], R = [];
      f.pts.forEach((p, j) => {
        const q = f.pts[Math.min(j + 1, f.seg - 1)], o = f.pts[Math.max(j - 1, 0)];
        const an = Math.atan2(o.y - q.y, o.x - q.x), w = 9 * f.len * Math.sin(Math.PI * Math.min(1, (j + 1.6) / (f.seg + 1))) ** 0.8;
        L.push([p.x - Math.sin(an) * w + dx, p.y + Math.cos(an) * w + dy]); R.push([p.x + Math.sin(an) * w + dx, p.y - Math.cos(an) * w + dy]);
      });
      c.beginPath(); L.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); for (let i = R.length - 1; i >= 0; i--) c.lineTo(R[i][0], R[i][1]); c.closePath();
    };
    const draw = now => {
      c.clearRect(0, 0, W, H);
      for (let n = ripples.length - 1; n >= 0; n--) {
        const r = ripples[n]; r.t += 1;
        const k = r.t / 46; if (k >= 1) { ripples.splice(n, 1); continue; }
        c.strokeStyle = `rgba(29,53,87,${0.35 * (1 - k)})`; c.lineWidth = 1.5;
        for (let i = 0; i < 3; i++) { const rr = (k * 90 - i * 16); if (rr > 0) { c.beginPath(); c.ellipse(r.x, r.y, rr, rr * 0.55, 0, 0, 7); c.stroke(); } }
      }
      for (const f of fish) {
        step(f, now);
        const flick = Math.sin(now * 0.012 + f.wob) * 0.5;
        // shadow on the river bed, then fins, body, spots and tail
        c.fillStyle = 'rgba(29,53,87,.12)'; outline(f, 6, 9); c.fill();
        const head = f.pts[0], a2 = Math.atan2(f.pts[2].y - f.pts[3].y, f.pts[2].x - f.pts[3].x);
        c.fillStyle = 'rgba(255,248,238,.75)';
        [-1, 1].forEach(s => { c.beginPath(); c.ellipse(f.pts[3].x + Math.cos(a2 + s * 1.6) * 9 * f.len, f.pts[3].y + Math.sin(a2 + s * 1.6) * 9 * f.len, 7 * f.len, 3.5 * f.len, a2 + s * (0.9 + flick * 0.3), 0, 7); c.fill(); });
        const tail = f.pts[f.seg - 1], ta = Math.atan2(f.pts[f.seg - 2].y - tail.y, f.pts[f.seg - 2].x - tail.x) + Math.PI;
        c.beginPath(); c.moveTo(tail.x, tail.y);
        c.quadraticCurveTo(tail.x + Math.cos(ta + 0.6 + flick) * 16 * f.len, tail.y + Math.sin(ta + 0.6 + flick) * 16 * f.len, tail.x + Math.cos(ta + flick * 0.6) * 22 * f.len, tail.y + Math.sin(ta + flick * 0.6) * 22 * f.len);
        c.quadraticCurveTo(tail.x + Math.cos(ta - 0.6 + flick) * 16 * f.len, tail.y + Math.sin(ta - 0.6 + flick) * 16 * f.len, tail.x, tail.y);
        c.fillStyle = f.spots[0] === '#fff8ee' ? '#f2a541' : 'rgba(255,248,238,.85)'; c.fill();
        outline(f); c.fillStyle = f.body; c.fill();
        c.save(); outline(f); c.clip();
        f.spots.forEach((col, i) => { const p = f.pts[2 + i * 4] || head; c.fillStyle = col; c.beginPath(); c.ellipse(p.x, p.y, 9 * f.len, 6 * f.len, i, 0, 7); c.fill(); });
        c.restore();
        outline(f); c.strokeStyle = 'rgba(27,36,51,.35)'; c.lineWidth = 1; c.stroke();
      }
    };
    const local = e => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    const move = e => { if (e.pointerType !== 'mouse') return; [aim.x, aim.y] = local(e); aim.near = true; };
    const leave = () => { aim.near = false; };
    const tap = e => { const [x, y] = local(e); aim.x = x; aim.y = y; aim.until = performance.now() + 1600; ripples.push({ x, y, t: 0 }); };
    el.addEventListener('pointermove', move, { passive: true }); el.addEventListener('pointerleave', leave); el.addEventListener('pointerdown', tap, { passive: true });
    const stop = loopWhileVisible(cv, draw, { onResize: size });
    return () => { stop(); el.removeEventListener('pointermove', move); el.removeEventListener('pointerleave', leave); el.removeEventListener('pointerdown', tap); };
  }, [motionOn, host]);
  return <canvas ref={ref} className="koi" aria-hidden="true" />;
}

// Ink words, after the scroll linked paragraph reveals on Apple's product pages and Olivier Larose's breakdown of
// them: every word starts as a faint wash and inks in, one after another, as the line scrolls up the screen.
function Word({ children, range, progress }) {
  const opacity = useTransform(progress, range, [0.16, 1]);
  return <motion.span className="iw" style={{ opacity }}>{children} </motion.span>;
}
export function InkWords({ parts, className = '' }) {
  const { motionOn } = usePrefs();
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.9', 'end 0.5'] });
  const words = parts.flatMap(({ text, cls }) => text.split(' ').map(w => [w, cls]));
  if (!motionOn) return <p className={className}>{parts.map(({ text, cls }, i) => (cls ? <span key={i} className={cls}>{text} </span> : `${text} `))}</p>;
  return (
    <p ref={ref} className={className}>
      {words.map(([w, cls], i) => {
        const word = <Word key={i} progress={scrollYProgress} range={[i / words.length, (i + 1) / words.length]}>{w}</Word>;
        return cls ? <span key={i} className={cls}>{word}</span> : word;
      })}
    </p>
  );
}

// Print gallery zoom, after exoape.com's project pages as taken apart in Olivier Larose's "Zoom Parallax": seven
// prints pinned in a screen, each scaled from its own centre at a different rate, so the middle one grows to fill
// the screen while the others fly past the edges. The middle print is Red Fuji, which hands over to the mountain
// sky in the contact section below.
const ZOOM = [
  { src: '/art/story/red-fuji-clear.jpg', s: 4 },
  { src: '/art/story/fireworks.jpg', s: 5 },
  { src: '/art/story/kameido.jpg', s: 6 },
  { src: '/art/story/gotenyama.jpg', s: 5 },
  { src: '/art/mountains.jpg', s: 6 },
  { src: '/art/story/kinryuzan.jpg', s: 8 },
  { src: '/art/story/terashima.jpg', s: 9 }
];
function ZoomTile({ src, s, i, progress }) {
  const scale = useTransform(progress, [0, 1], [1, s]);
  return (
    <motion.div className={`zp-el z${i}`} style={{ scale }}>
      <div className="zp-img"><img src={src} alt="" loading="lazy" decoding="async" draggable={false} /></div>
    </motion.div>
  );
}
export function ZoomPrints() {
  const { motionOn } = usePrefs();
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  const line = useTransform(scrollYProgress, [0.72, 0.92], [0, 1]);
  const lineY = useTransform(scrollYProgress, [0.72, 0.92], [24, 0]);
  if (!motionOn) return null;
  return (
    <section ref={ref} className="zp" aria-label="Prints from the road">
      <div className="zp-sticky">
        {ZOOM.map((z, i) => <ZoomTile key={z.src} {...z} i={i} progress={scrollYProgress} />)}
        <motion.p className="zp-line" style={{ opacity: line, y: lineY }}>Every road on this page ends at the same mountain.</motion.p>
      </div>
    </section>
  );
}

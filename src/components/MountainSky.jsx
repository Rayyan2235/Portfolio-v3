import { useEffect, useRef } from 'react';
import { motion, useScroll, useTransform } from 'motion/react';
import { usePrefs } from '../prefs.jsx';
import { resolveSky } from '../sky.js';
import { thunder } from '../audio.js';

// The mountain valley behind Work: Rayyan's ink painting (public/art/mountains.jpg), kept in step with the
// visitor's sky like the hero. Dawn and dusk wash it warm and turn the painted moon into a sun, day leaves the
// ink blue, night sinks it into indigo with the real moon glowing and stars out. Kumo clouds drift across it.
// Everything sits on a frame with the painting's own aspect ratio, so the sun and stars line up with the art
// however the section crops it.

function Kumo({ x, y, w, flip }) {
  const curl = (cx, dir) => (
    <g transform={`translate(${cx} ${y + 11}) scale(${dir} 1)`}>
      <circle r="17" />
      <path d="M0 -9 a9 9 0 1 1 -9 9 a5 5 0 1 1 5 -5" fill="none" />
    </g>
  );
  return (
    <g className="mtn-kumo">
      <rect x={x} y={y} width={w} height="22" rx="11" />
      {curl(flip ? x + w : x, flip ? 1 : -1)}
      <rect x={x + w * 0.2} y={y - 16} width={w * 0.45} height="18" rx="9" />
      {curl(x + w * 0.2, -1)}
    </g>
  );
}

// Storm over the valley: slanted rain, and every few seconds a forked bolt with a white flash
// (plus thunder if the visitor turned sound on). One 1x canvas, only runs while on screen.
export function Storm({ sound }) {
  const cv = useRef(null), flash = useRef(null), snd = useRef(sound);
  snd.current = sound;
  useEffect(() => {
    const c = cv.current, ctx = c.getContext('2d');
    let W = 0, H = 0, raf = 0, vis = false, last = performance.now(), next = last + 1200, bolt = null;
    const size = () => { W = c.clientWidth; H = c.clientHeight; c.width = W; c.height = H; };
    size();
    const ro = new ResizeObserver(size); ro.observe(c);
    const io = new IntersectionObserver(es => { vis = es[0].isIntersecting; }); io.observe(c);
    const drops = Array.from({ length: innerWidth < 700 ? 70 : 150 }, () => ({ x: Math.random() * 1.3, y: Math.random(), v: 0.9 + Math.random() * 0.6, l: 12 + Math.random() * 16 }));
    const makeBolt = () => {
      let x = W * (0.2 + Math.random() * 0.6), y = 0; const pts = [[x, y]];
      while (y < H * (0.35 + Math.random() * 0.2)) { y += 14 + Math.random() * 24; x += (Math.random() - 0.5) * 40; pts.push([x, y]); }
      const fork = pts.slice(Math.floor(pts.length / 2)).map(([a, b], i) => [a + i * 10 * (Math.random() > 0.5 ? 1 : -1), b + i * 5]).slice(0, 5);
      return { pts, fork, life: 1 };
    };
    const loop = now => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (!vis) return;
      ctx.clearRect(0, 0, W, H);
      ctx.strokeStyle = 'rgba(214, 224, 238, .55)'; ctx.lineWidth = 1; ctx.beginPath();
      for (const d of drops) {
        d.y += d.v * dt * 1.5; d.x -= d.v * dt * 0.35;
        if (d.y > 1.05) { d.y = -0.05; d.x = Math.random() * 1.3; }
        const x = d.x * W, y = d.y * H; ctx.moveTo(x, y); ctx.lineTo(x + d.l * 0.3, y - d.l);
      }
      ctx.stroke();
      if (now > next) {
        bolt = makeBolt(); next = now + 3500 + Math.random() * 6000;
        flash.current?.animate([{ opacity: 0.75 }, { opacity: 0.1 }, { opacity: 0.5 }, { opacity: 0 }], { duration: 700, easing: 'ease-out' });
        if (snd.current) setTimeout(() => thunder(0.5 + Math.random() * 0.4), 300 + Math.random() * 1200);
      }
      if (bolt) {
        ctx.strokeStyle = `rgba(240, 245, 255, ${bolt.life})`; ctx.lineWidth = 2.2; ctx.shadowColor = 'rgba(190, 210, 255, .9)'; ctx.shadowBlur = 12;
        [bolt.pts, bolt.fork].forEach(line => { ctx.beginPath(); line.forEach(([a, b], i) => (i ? ctx.lineTo(a, b) : ctx.moveTo(a, b))); ctx.stroke(); });
        ctx.shadowBlur = 0; bolt.life -= dt * 2.5; if (bolt.life <= 0) bolt = null;
      }
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); };
  }, []);
  return <><canvas ref={cv} className="mtn-rain" /><span ref={flash} className="mtn-flash" /></>;
}

// A loose flock crossing the valley, wings flapping. CSS only.
const BIRDS = [[18, 0, 34, 1], [22, -6, 34, 0.8], [15, -11, 34, 0.7], [30, -20, 46, 0.9], [27, -26, 46, 0.65], [40, -3, 58, 0.75]];
export function Birds() {
  return (
    <div className="mtn-birds">
      {BIRDS.map(([top, delay, dur, s], i) => (
        <span key={i} className="mtn-bird" style={{ top: `${top}%`, animationDuration: `${dur}s`, animationDelay: `${delay}s`, scale: s }}>
          <svg viewBox="0 0 24 10" style={{ animationDelay: `${-i * 0.13}s` }}><path d="M1 6 Q6 0 12 6 Q18 0 23 6" /></svg>
        </span>
      ))}
    </div>
  );
}

const STARS = Array.from({ length: 34 }, (_, i) => ({ x: (i * 41.3) % 100, y: (i * 17.9) % 34, d: (i * 0.53) % 4, s: i % 7 === 0 ? 3 : 1.6 }));

export default function MountainSky() {
  const ref = useRef(null);
  const { motionOn, sky, sound } = usePrefs();
  const mode = resolveSky(sky);
  const { scrollYProgress: p } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(p, [0, 1], [50, -50]);
  return (
    <div ref={ref} className={`mtn mtn-${mode}`} aria-hidden="true">
      <motion.div className="mtn-frame" style={motionOn ? { y } : undefined}>
        <img className="mtn-art" src="/art/mountains.jpg" alt="" />
        <svg className="mtn-clouds" viewBox="0 0 1584 672" preserveAspectRatio="none">
          <g className="mtn-drift slow"><Kumo x={120} y={300} w={300} /><Kumo x={1060} y={250} w={260} flip /></g>
          <g className="mtn-drift"><Kumo x={560} y={440} w={420} flip /><Kumo x={-30} y={520} w={300} /></g>
        </svg>
        <span className="mtn-tint" />
        <span className="mtn-orb" />
        <div className="mtn-stars">{STARS.map((s, i) => <i key={i} style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.s, height: s.s, animationDelay: `${-s.d}s` }} />)}</div>
      </motion.div>
      {motionOn && mode !== 'night' && mode !== 'storm' && <Birds />}
      {motionOn && mode === 'storm' && <Storm sound={sound} />}
    </div>
  );
}

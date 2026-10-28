import { useEffect, useRef, useState } from 'react';
import Lenis from 'lenis';
import { usePrefs } from '../prefs.jsx';

// The small details that make the page feel made by hand. Each one is cheap: CSS animations, a single rAF loop
// that only moves transforms, or pure SVG. All of them stand down when the Motion switch is off.

const finePointer = () => typeof matchMedia === 'function' && matchMedia('(pointer: fine)').matches;

// Enso preloader: a Zen brush circle paints itself while a counter runs to 100, then the paper lifts away.
// Shown once per browser session, about 1.5 seconds, never with motion off.
export function Preloader() {
  const { motionOn } = usePrefs();
  const [show, setShow] = useState(() => {
    try { return motionOn && !sessionStorage.getItem('v3-loaded'); } catch { return false; }
  });
  const num = useRef(null);
  useEffect(() => {
    if (!show) return undefined;
    try { sessionStorage.setItem('v3-loaded', '1'); } catch { /* storage blocked */ }
    const t0 = performance.now(), dur = 1300;
    let id = 0;
    // a timer, not rAF, so the count still finishes in a background tab
    id = setInterval(() => {
      const p = Math.min(1, (performance.now() - t0) / dur);
      if (num.current) num.current.textContent = String(Math.round(p * 100)).padStart(3, '0');
      if (p >= 1) clearInterval(id);
    }, 30);
    const done = setTimeout(() => setShow(false), dur + 650);
    return () => { clearInterval(id); clearTimeout(done); };
  }, [show]);
  if (!show) return null;
  return (
    <div className="pre" aria-hidden="true">
      <svg className="pre-enso" viewBox="0 0 200 200">
        <defs>
          <filter id="pre-ink" x="-10%" y="-10%" width="120%" height="120%">
            <feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves="2" seed="3" result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale="5" />
          </filter>
        </defs>
        <path className="pre-stroke" pathLength="1" filter="url(#pre-ink)" d="M128 34 C 78 18, 28 52, 30 104 C 32 152, 78 178, 120 168 C 160 158, 182 120, 172 82 C 166 60, 150 44, 132 38" />
      </svg>
      <span className="pre-num" ref={num}>000</span>
    </div>
  );
}

// Ink cursor: a soft ring trails the pointer, swells over anything clickable, and a click scatters a few petals.
// Elements marked data-magnet lean toward the pointer and spring back with an elastic settle when it leaves (traced
// with rea from dennissnellenberg.com: a 1.5s ease toward the pointer, an elastic return, the frame lagging for depth).
// Desktop mouse only; the system cursor stays visible.
export function InkCursor() {
  const { motionOn } = usePrefs();
  const ring = useRef(null);
  useEffect(() => {
    if (!motionOn || !finePointer()) return undefined;
    const el = ring.current;
    let x = innerWidth / 2, y = innerHeight / 2, tx = x, ty = y, raf = 0, hot = false, magnet = null;
    const loop = () => {
      x += (tx - x) * 0.2; y += (ty - y) * 0.2;
      el.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${hot ? 2.2 : 1})`;
      if (Math.abs(tx - x) > 0.1 || Math.abs(ty - y) > 0.1) raf = requestAnimationFrame(loop); else raf = 0;
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(loop); };
    const move = e => {
      tx = e.clientX; ty = e.clientY; el.style.opacity = '1';
      const t = e.target instanceof Element ? e.target : null;
      hot = !!t?.closest('a, button, [role="button"], input, .dcard');
      el.classList.toggle('hot', hot);
      const m = t?.closest('[data-magnet]');
      if (magnet && magnet !== m) { release(magnet); magnet = null; }
      if (m) {
        const r = m.getBoundingClientRect();
        m.classList.remove('magnet-off');
        m.style.setProperty('--pull-x', `${(e.clientX - (r.left + r.width / 2)) * 0.3}px`);
        m.style.setProperty('--pull-y', `${(e.clientY - (r.top + r.height / 2)) * 0.35}px`);
        magnet = m;
      }
      kick();
    };
    const release = m => { m.classList.add('magnet-off'); m.style.setProperty('--pull-x', '0px'); m.style.setProperty('--pull-y', '0px'); };
    const leave = () => { el.style.opacity = '0'; if (magnet) { release(magnet); magnet = null; } };
    const click = e => {
      for (let i = 0; i < 5; i++) {
        const p = document.createElement('i');
        p.className = 'petal-spark';
        const a = (i / 5) * Math.PI * 2 + Math.random() * 0.6, d = 26 + Math.random() * 22;
        p.style.left = `${e.clientX}px`; p.style.top = `${e.clientY}px`;
        p.style.setProperty('--dx', `${Math.cos(a) * d}px`); p.style.setProperty('--dy', `${Math.sin(a) * d}px`);
        p.style.setProperty('--r', `${(Math.random() * 240) | 0}deg`);
        document.body.appendChild(p);
        setTimeout(() => p.remove(), 700);
      }
    };
    addEventListener('pointermove', move, { passive: true });
    document.addEventListener('pointerleave', leave);
    addEventListener('pointerdown', click, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      removeEventListener('pointermove', move); document.removeEventListener('pointerleave', leave); removeEventListener('pointerdown', click);
      if (magnet) release(magnet);
    };
  }, [motionOn]);
  if (!motionOn) return null;
  return <span ref={ring} className="ink-cursor" aria-hidden="true" />;
}

// Lenis smooth scrolling for mouse wheels on desktop. Touch keeps native scrolling, and sticky sections keep working
// because Lenis drives the real scroll position.
export function SmoothScroll() {
  const { motionOn } = usePrefs();
  useEffect(() => {
    if (!motionOn || !finePointer()) return undefined;
    const lenis = new Lenis({ duration: 1.05, smoothWheel: true, syncTouch: false });
    let raf = requestAnimationFrame(function tick(t) { lenis.raf(t); raf = requestAnimationFrame(tick); });
    return () => { cancelAnimationFrame(raf); lenis.destroy(); };
  }, [motionOn]);
  return null;
}

// A line of the tools used, flowing along a wave (after React Bits' Curved Loop). Pure SVG with a SMIL offset
// animation, so no JavaScript runs per frame.
const TOOLS = 'TypeScript · Claude · Python · FastAPI · React · Next.js · MongoDB · LiveKit · Ollama · Gemini · Postgres · ';
export function ToolWave() {
  const { motionOn } = usePrefs();
  return (
    <div className="toolwave" aria-label="Tools I use: TypeScript, Claude, Python, FastAPI, React, Next.js, MongoDB, LiveKit, Ollama, Gemini, Postgres">
      <svg viewBox="0 0 1440 160" preserveAspectRatio="none" aria-hidden="true">
        <path id="tw-path" d="M-40 96 C 200 30, 420 150, 720 90 S 1240 30, 1480 96" fill="none" />
        <text className="tw-text">
          <textPath href="#tw-path" startOffset="0%">
            {TOOLS.repeat(3)}
            {motionOn && <animate attributeName="startOffset" from="0%" to="-50%" dur="38s" repeatCount="indefinite" />}
          </textPath>
        </text>
      </svg>
    </div>
  );
}

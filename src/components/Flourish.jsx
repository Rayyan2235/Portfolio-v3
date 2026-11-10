import { useEffect, useRef, useState } from 'react';
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
    // the count runs to 90 on its own, then waits for the opening scene to be built (or 5 seconds at most), so the
    // first thing after the ink circle is the mountain, not a half built page
    const t0 = performance.now(), dur = 1300;
    let id = 0, ready = !!window.__v3OpeningReady, finished = 0, done = 0;
    const onReady = () => { ready = true; };
    addEventListener('v3:opening-ready', onReady);
    // a timer, not rAF, so the count still finishes in a background tab
    id = setInterval(() => {
      const el = performance.now() - t0, p = Math.min(0.9, el / dur);
      const go = ready || el > 5000;
      if (num.current) num.current.textContent = String(Math.round((go && el > dur ? 1 : p) * 100)).padStart(3, '0');
      if (go && el > dur && !finished) { finished = 1; clearInterval(id); done = setTimeout(() => setShow(false), 450); }
    }, 30);
    return () => { clearInterval(id); clearTimeout(done); removeEventListener('v3:opening-ready', onReady); };
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

// A line of the tools used, flowing along a wave (after React Bits' Curved Loop). Pure SVG with a SMIL offset
// animation, so no JavaScript runs per frame.
const TOOLS = 'TypeScript · Claude · Python · FastAPI · React · Next.js · MongoDB · LiveKit · Ollama · Gemini · Postgres · ';
export function ToolWave() {
  const { motionOn } = usePrefs();
  const svg = useRef(null);
  // SMIL keeps animating (and laying out the text on its path) even off screen, so pause it whenever it is not seen
  useEffect(() => {
    const el = svg.current;
    if (!el || !el.pauseAnimations) return undefined;
    el.pauseAnimations();
    const io = new IntersectionObserver(([e]) => (e.isIntersecting ? el.unpauseAnimations() : el.pauseAnimations()));
    io.observe(el);
    return () => io.disconnect();
  }, [motionOn]);
  return (
    <div className="toolwave" aria-label="Tools I use: TypeScript, Claude, Python, FastAPI, React, Next.js, MongoDB, LiveKit, Ollama, Gemini, Postgres">
      <svg ref={svg} viewBox="0 0 1440 160" preserveAspectRatio="none" aria-hidden="true">
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

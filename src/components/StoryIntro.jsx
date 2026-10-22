import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useScroll, useTransform, useMotionValueEvent } from 'motion/react';
import { usePrefs } from '../prefs.jsx';
import { featured } from '../data.js';

// Story intro, rough art pass. Five beats, phone first, SVG + CSS + motion only (no WebGL here).
// Each beat is a tall section with a pinned stage; scroll progress inside it drives the beat.
// Lines are placeholders until Rayyan writes them (ADR 0014). Component picks: vault reference/story-components.
export const BEATS = [
  { id: 'hello', label: 'Hello', line: '[YOUR LINE: greeting, e.g. who you are in one breath]' },
  { id: 'from', label: 'Where from', line: '[YOUR LINE: where you come from and where you are now]' },
  { id: 'why', label: 'What drives me', line: '[YOUR LINE: what pulls you toward building things]' },
  { id: 'build', label: 'What I build', line: '[YOUR LINE: what you make and for whom]' },
  { id: 'enter', label: 'Come in', line: '[YOUR LINE: the invitation into the portfolio]' }
];

const SEEN_KEY = 'v3-story-seen';
const C = { sun: '#e4572e', torii: '#c8361f', ink: '#1b2433', sea: '#1d3557', paper: '#fff8ee', glow: '#f7b27a' };

function Words({ text, progress, range = [0.1, 0.6] }) {
  // reveals the line word by word as the beat scrolls
  const words = text.split(' ');
  return (
    <p className="st-line">
      {words.map((w, i) => {
        const a = range[0] + ((range[1] - range[0]) * i) / words.length;
        return <Word key={i} progress={progress} from={a} to={a + 0.08}>{w}</Word>;
      })}
    </p>
  );
}
function Word({ progress, from, to, children }) {
  const opacity = useTransform(progress, [from, to], [0.15, 1]);
  return <motion.span style={{ opacity }}>{children} </motion.span>;
}

function Beat({ beat, index, children }) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  return (
    <section ref={ref} className={`st-beat st-${beat.id}`} aria-labelledby={`st-${beat.id}-label`}>
      <div className="st-stage">
        <span className="st-label" id={`st-${beat.id}-label`}>0{index + 1} · {beat.label}</span>
        {children(scrollYProgress)}
        <Words text={beat.line} progress={scrollYProgress} />
      </div>
    </section>
  );
}

// Rough brush edge for strokes: noise displaces the path so it reads as ink, not vector.
function InkDefs() {
  return (
    <svg width="0" height="0" aria-hidden="true" style={{ position: 'absolute' }}>
      <filter id="st-ink" x="-5%" y="-40%" width="110%" height="180%">
        <feTurbulence type="fractalNoise" baseFrequency="0.035 0.6" numOctaves="2" seed="4" result="n" />
        <feDisplacementMap in="SourceGraphic" in2="n" scale="7" />
      </filter>
    </svg>
  );
}

const Visual = {
  // 01: a red sun rises out of the paper behind mist bands, then a brush stroke is painted under it.
  hello: function Visual_hello({ p }) {
    const y = useTransform(p, [0, 0.55], [110, 0]);
    const opacity = useTransform(p, [0, 0.2], [0, 1]);
    const pathLength = useTransform(p, [0.2, 0.62], [0, 1]);
    return (
      <svg className="st-art" viewBox="0 0 400 260" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        <defs>
          <radialGradient id="st-glow"><stop offset="0" stopColor={C.glow} stopOpacity=".75" /><stop offset="1" stopColor={C.glow} stopOpacity="0" /></radialGradient>
          <clipPath id="st-horizon"><rect width="400" height="196" /></clipPath>
        </defs>
        <g clipPath="url(#st-horizon)">
          <motion.g style={{ y, opacity }}>
            <circle cx="200" cy="122" r="128" fill="url(#st-glow)" />
            <circle cx="200" cy="122" r="68" fill={C.sun} />
          </motion.g>
        </g>
        <rect x="46" y="110" width="196" height="9" rx="4.5" fill={C.paper} />
        <rect x="176" y="140" width="184" height="7" rx="3.5" fill={C.paper} />
        <rect x="96" y="166" width="150" height="5" rx="2.5" fill={C.paper} />
        <motion.path d="M34 222 C 120 200, 220 236, 366 208" stroke={C.ink} strokeWidth="13" strokeLinecap="round" fill="none"
          filter="url(#st-ink)" style={{ pathLength }} />
      </svg>
    );
  },

  // 02: woodblock map. The voyage line is drawn as you scroll and a boat sails along it.
  from: function Visual_from({ p }) {
    const route = useRef(null);
    const boat = useRef(null);
    const pathLength = useTransform(p, [0.15, 0.85], [0, 1]);
    const place = v => {
      const el = route.current;
      if (!el || !boat.current) return;
      const L = el.getTotalLength();
      const a = el.getPointAtLength(v * L), b = el.getPointAtLength(Math.min(L, v * L + 2));
      const tilt = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
      boat.current.setAttribute('transform', `translate(${a.x} ${a.y}) rotate(${tilt * 0.25})`);
    };
    useMotionValueEvent(pathLength, 'change', place);
    useEffect(() => place(pathLength.get()), []); // eslint-disable-line react-hooks/exhaustive-deps
    return (
      <svg className="st-art st-map" viewBox="0 0 400 240" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        <defs>
          <pattern id="st-sei" width="24" height="12" patternUnits="userSpaceOnUse">
            <path d="M0 12a12 12 0 0 1 24 0M4 12a8 8 0 0 1 16 0M8 12a4 4 0 0 1 8 0" fill="none" stroke={C.sea} strokeOpacity=".16" />
          </pattern>
        </defs>
        <rect x="2" y="2" width="396" height="236" rx="14" fill="#fbf0de" stroke="#e6cfae" />
        <rect x="2" y="2" width="396" height="236" rx="14" fill="url(#st-sei)" />
        <path d="M14 168 C 40 150, 84 156, 104 176 C 120 196, 104 226, 78 232 L 14 232 Z" fill="#efd9b6" stroke={C.ink} strokeOpacity=".5" />
        <path d="M300 112 C 330 100, 372 108, 388 120 L 388 232 L 318 232 C 296 214, 280 170, 300 112 Z" fill="#efd9b6" stroke={C.ink} strokeOpacity=".5" />
        <path d="M70 176 C 120 54, 268 46, 322 142" fill="none" stroke={C.ink} strokeOpacity=".25" strokeDasharray="3 6" />
        <motion.path ref={route} d="M70 176 C 120 54, 268 46, 322 142" fill="none" stroke={C.sun} strokeWidth="2.5" strokeLinecap="round" style={{ pathLength }} />
        <circle cx="70" cy="176" r="5" fill={C.sun} />
        <circle cx="322" cy="142" r="5" fill={C.sea} />
        <text x="70" y="200" className="st-map-label" textAnchor="middle">Jeddah</text>
        <text x="322" y="166" className="st-map-label" textAnchor="middle">Penn State</text>
        <g ref={boat}>
          <path d="M-13 0 L13 0 L8 7 L-8 7 Z" fill={C.ink} />
          <path d="M-1 -2 L-1 -22 L11 -4 Z" fill={C.paper} stroke={C.ink} strokeWidth="1.2" />
        </g>
      </svg>
    );
  },

  // 03: the Chikanobu crane crosses gold mist bands (kasumi), clouds on two parallax layers.
  why: function Visual_why({ p }) {
    const x = useTransform(p, [0, 1], ['-10%', '-300%']);
    const y = useTransform(p, [0, 0.5, 1], [24, -8, 14]);
    const far = useTransform(p, [0, 1], ['0%', '-18%']);
    const near = useTransform(p, [0, 1], ['10%', '-40%']);
    return (
      <div className="st-art st-sky" aria-hidden="true">
        <motion.span className="st-cloud c1" style={{ x: far }} />
        <motion.span className="st-cloud c2" style={{ x: far }} />
        <motion.img className="st-crane" src="/art/crane-ink.jpg" alt="" style={{ x, y }} />
        <motion.span className="st-cloud c3" style={{ x: near }} />
      </div>
    );
  },

  // 04: featured projects unroll as hanging scrolls, each lit by a lantern glow.
  build: function Visual_build({ p }) {
    return (
      <div className="st-art st-hang" aria-hidden="true">
        {featured.map((f, i) => <Hang key={f.name} p={p} i={i} f={f} />)}
      </div>
    );
  },

  // 05: walk through a torii gate toward the sun; the gate scales past the edges and hands off to the hero.
  enter: function Visual_enter({ p }) {
    const scale = useTransform(p, [0.1, 1], [1, 4.4]);
    const opacity = useTransform(p, [0.5, 0.85], [1, 0]);
    const sun = useTransform(p, [0, 0.7], [0.6, 1.5]);
    return (
      <div className="st-art st-gate" aria-hidden="true">
        <motion.span className="st-gate-sun" style={{ scale: sun }} />
        <motion.svg viewBox="0 0 300 240" style={{ scale, opacity }}>
          <path d="M6 44 Q150 18 294 44 L286 62 Q150 40 14 62 Z" fill={C.torii} />
          <rect x="30" y="62" width="240" height="11" fill={C.ink} />
          <rect x="44" y="96" width="212" height="12" fill={C.torii} />
          <rect x="141" y="73" width="18" height="23" fill={C.torii} />
          <rect x="72" y="62" width="18" height="170" fill={C.torii} />
          <rect x="210" y="62" width="18" height="170" fill={C.torii} />
          <rect x="66" y="224" width="30" height="16" fill={C.ink} />
          <rect x="204" y="224" width="30" height="16" fill={C.ink} />
        </motion.svg>
      </div>
    );
  }
};

function Hang({ p, i, f }) {
  const start = 0.08 + i * 0.14;
  const y = useTransform(p, [start, start + 0.3], [140, 0]);
  const opacity = useTransform(p, [start, start + 0.16], [0, 1]);
  const height = useTransform(p, [start + 0.12, start + 0.42], [0, 1], { clamp: true });
  const h = useTransform(height, v => `calc(var(--kh) * ${v})`);
  return (
    <motion.figure className="st-kake" style={{ y, opacity }}>
      <span className="st-lantern" />
      <i className="rod" />
      <motion.div className="st-kake-body" style={{ height: h }}>
        <div className="st-kake-in"><b>{f.name}</b><small>{f.meta}</small><i className="seal" /></div>
      </motion.div>
      <i className="rod" />
    </motion.figure>
  );
}

// Where the portfolio starts: the end of the hanging scroll, fully open (or the hero when motion is off).
function portfolioTop() {
  const sx = document.querySelector('.sx');
  if (sx) return sx.getBoundingClientRect().top + scrollY + sx.offsetHeight - innerHeight;
  const el = document.getElementById('top');
  return el ? el.getBoundingClientRect().top + scrollY : 0;
}

export default function StoryIntro() {
  const { motionOn } = usePrefs();
  const ref = useRef(null);
  const [seen] = useState(() => { try { return localStorage.getItem(SEEN_KEY) === '1'; } catch { return false; } });
  const [active, setActive] = useState(0);
  const [inStory, setInStory] = useState(true);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  useMotionValueEvent(scrollYProgress, 'change', v => {
    setActive(Math.min(BEATS.length - 1, Math.floor(v * BEATS.length)));
    setInStory(v < 0.97);
    if (v > 0.95) { try { localStorage.setItem(SEEN_KEY, '1'); } catch { /* storage blocked */ } }
  });

  // Returning visitors land past the story, at the portfolio.
  useEffect(() => {
    if (seen && !location.hash) {
      requestAnimationFrame(() => scrollTo({ top: portfolioTop(), behavior: 'instant' }));
    }
  }, [seen]);

  const skip = () => {
    try { localStorage.setItem(SEEN_KEY, '1'); } catch { /* storage blocked */ }
    scrollTo({ top: portfolioTop(), behavior: motionOn ? 'smooth' : 'instant' });
  };

  if (!motionOn) {
    // Motion off: the story as plain text, then the portfolio.
    return (
      <section className="st-plain" aria-label="About Rayyan">
        {BEATS.map((b, i) => <p key={b.id}><span className="st-label">0{i + 1} · {b.label}</span>{b.line}</p>)}
      </section>
    );
  }

  return (
    <div ref={ref} className="st-root" aria-label="A short story about Rayyan">
      <InkDefs />
      {BEATS.map((b, i) => (
        <Beat key={b.id} beat={b} index={i}>{p => { const V = Visual[b.id]; return <V p={p} />; }}</Beat>
      ))}
      <AnimatePresence>{inStory && (
      <motion.div className="st-dock" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}>
        <div className="st-dots" aria-hidden="true">{BEATS.map((b, i) => <i key={b.id} className={i <= active ? 'on' : ''} />)}</div>
        <button type="button" className="st-skip" onClick={skip}>Skip to portfolio</button>
      </motion.div>
      )}</AnimatePresence>
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useScroll, useTransform, useMotionValueEvent, useVelocity } from 'motion/react';
import { usePrefs } from '../prefs.jsx';
import { featured } from '../data.js';
import MountainSky from './MountainSky.jsx';

// Story intro: one pinned stage, five scenes cut together like a film. The sky runs one long day
// (dawn, bright sea, dusk, lantern night, sunrise through the torii) and the text flips light or dark with it.
// SVG + CSS + canvas + motion only. Lines are placeholders until Rayyan writes them (ADR 0014).
// Research: vault reference/story-components, docs/story-handoff.md.
export const BEATS = [
  { id: 'hello', label: 'Hello', line: '[YOUR LINE: greeting, e.g. who you are in one breath]' },
  { id: 'from', label: 'Where from', line: '[YOUR LINE: where you come from and where you are now]' },
  { id: 'why', label: 'What drives me', line: '[YOUR LINE: what pulls you toward building things]' },
  { id: 'build', label: 'What I build', line: '[YOUR LINE: what you make and for whom]' },
  { id: 'enter', label: 'Come in', line: '[YOUR LINE: the invitation into the portfolio]' }
];
const N = BEATS.length;
const SEEN_KEY = 'v3-story-seen';
const C = { sun: '#e4572e', torii: '#c8361f', ink: '#1b2433', sea: '#1d3557', paper: '#fff8ee', glow: '#f7b27a', peach: '#fde7c4' };

// The day, keyed to whole-story progress g (scene i spans i/5 .. (i+1)/5).
const SKY_AT = [0, 0.16, 0.26, 0.38, 0.47, 0.56, 0.64, 0.8, 0.87, 0.95, 1];
const SKY_TOP = ['#fde2bd', '#fde7c4', '#cfe5ec', '#d6e6e6', '#f2a46b', '#7d4a6e', '#101a2e', '#0b1424', '#2a2346', '#f7b27a', '#fff3e2'];
const SKY_BOT = ['#fff8ee', '#fff8ee', '#fff8ee', '#f6eedf', '#f9cf9e', '#e7926a', '#1d3557', '#16294a', '#6a4a62', '#fde7c4', '#fff8ee'];
const TEXT_AT = [0, 0.5, 0.57, 0.88, 0.94, 1];
const TEXT = [C.ink, C.ink, C.paper, C.paper, C.ink, C.ink];

function Words({ text, progress, range = [0.08, 0.5] }) {
  // reveals the line word by word, each word sharpening out of a blur
  const words = text.split(' ');
  return (
    <p className="st-line">
      {words.map((w, i) => {
        const a = range[0] + ((range[1] - range[0]) * i) / words.length;
        return <Word key={i} progress={progress} from={a} to={a + 0.1}>{w}</Word>;
      })}
    </p>
  );
}
function Word({ progress, from, to, children }) {
  const opacity = useTransform(progress, [from, to], [0.12, 1]);
  const filter = useTransform(progress, [from, to], ['blur(6px)', 'blur(0px)']);
  const y = useTransform(progress, [from, to], [10, 0]);
  return <motion.span style={{ opacity, filter, y, display: 'inline-block' }}>{children}&nbsp;</motion.span>;
}

// A scene fades and pushes in as the previous one pushes past the camera.
function Scene({ i, g, children }) {
  const q = useTransform(g, v => v * N - i);
  const first = i === 0, last = i === N - 1;
  const opacity = useTransform(q, [-0.12, 0.06, 0.88, 1.06], [first ? 1 : 0, 1, 1, last ? 1 : 0]);
  const scale = useTransform(q, [-0.12, 0.06, 0.88, 1.06], [first ? 1 : 0.94, 1, 1, last ? 1 : 1.1]);
  const visibility = useTransform(opacity, o => (o < 0.01 ? 'hidden' : 'visible'));
  const beat = BEATS[i];
  return (
    <motion.section className={`st-scene st-${beat.id}`} style={{ opacity, scale, visibility }} aria-labelledby={`st-${beat.id}-label`}>
      {children(q)}
      <div className="st-cap">
        <span className="st-label" id={`st-${beat.id}-label`}>0{i + 1} · {beat.label}</span>
        <Words text={beat.line} progress={q} />
      </div>
    </motion.section>
  );
}

// Rough brush edge: noise displaces the stroke so it reads as ink soaked into paper.
function InkDefs() {
  return (
    <svg width="0" height="0" aria-hidden="true" style={{ position: 'absolute' }}>
      <filter id="st-ink" x="-5%" y="-40%" width="110%" height="180%">
        <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="3" seed="7" result="n" />
        <feDisplacementMap in="SourceGraphic" in2="n" scale="5" xChannelSelector="R" yChannelSelector="G" />
      </filter>
      <pattern id="st-sei" width="24" height="12" patternUnits="userSpaceOnUse">
        <path d="M0 12a12 12 0 0 1 24 0M4 12a8 8 0 0 1 16 0M8 12a4 4 0 0 1 8 0" fill="none" stroke={C.sea} strokeOpacity=".22" />
      </pattern>
    </svg>
  );
}

// Fixed pseudo random so stars and fireflies sit in the same place every render.
const STARS = Array.from({ length: 70 }, (_, i) => ({ x: (i * 37.7) % 100, y: (i * 53.3) % 64, s: i % 9 === 0 ? 2.6 : 1.3, d: (i * 0.37) % 4 }));
const FLIES = Array.from({ length: 12 }, (_, i) => ({ x: 8 + ((i * 29) % 84), y: 30 + ((i * 41) % 55), d: (i * 0.7) % 6, t: 7 + (i % 5) }));

function Birds() {
  return (
    <div className="st-birds" aria-hidden="true">
      {[0, 1, 2].map(i => (
        <svg key={i} className={`b${i}`} viewBox="0 0 24 10"><path d="M1 6 Q6 0 12 6 Q18 0 23 6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
      ))}
    </div>
  );
}

const Scenes = {
  // 01 dawn: the sun lifts out of a moving sea behind drifting mist, birds cross, a brush stroke is painted.
  hello: function Hello({ q }) {
    const y = useTransform(q, [0, 0.55], ['62%', '4%']);
    const pathLength = useTransform(q, [0.3, 0.75], [0, 1]);
    return (
      <div className="st-art st-dawn">
        <motion.div className="st-sunwrap" style={{ y }}><span className="st-sunglow" /><span className="st-sundisk" /></motion.div>
        <span className="st-mist m1" /><span className="st-mist m2" /><span className="st-mist m3" />
        <div className="st-seaband"><svg width="100%" height="100%"><rect width="200%" height="100%" fill="url(#st-sei)" className="st-sea-drift" /></svg></div>
        <Birds />
        <svg className="st-swash" viewBox="0 0 400 40" aria-hidden="true">
          <motion.path d="M20 26 C 110 8, 230 38, 380 16" stroke="currentColor" strokeWidth="9" strokeLinecap="round" fill="none" filter="url(#st-ink)" style={{ pathLength }} />
        </svg>
      </div>
    );
  },

  // 02 bright day at sea: the camera pans across a woodblock map while the boat sails the brushed route.
  from: function Voyage({ q }) {
    const route = useRef(null);
    const boat = useRef(null);
    const pathLength = useTransform(q, [0.1, 0.85], [0, 1]);
    const x = useTransform(q, [0.05, 0.9], ['0%', '-37.5%']);
    const place = v => {
      const el = route.current;
      if (!el || !boat.current) return;
      const L = el.getTotalLength();
      const a = el.getPointAtLength(v * L), b = el.getPointAtLength(Math.min(L, v * L + 2));
      const tilt = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
      boat.current.setAttribute('transform', `translate(${a.x} ${a.y}) rotate(${tilt * 0.3})`);
    };
    useMotionValueEvent(pathLength, 'change', place);
    useEffect(() => place(pathLength.get()), []); // eslint-disable-line react-hooks/exhaustive-deps
    const route_d = 'M96 196 C 200 60, 330 230, 430 130 S 560 90, 580 150';
    return (
      <div className="st-art st-voyage">
        <motion.div className="st-pan" style={{ x }}>
          <svg viewBox="0 0 640 260" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
            <rect width="640" height="260" fill="url(#st-sei)" />
            <g className="st-clouds-svg">
              <rect x="40" y="28" width="150" height="10" rx="5" /><rect x="250" y="46" width="200" height="12" rx="6" /><rect x="480" y="22" width="130" height="9" rx="4.5" />
            </g>
            <path d="M0 150 C 40 140, 90 160, 120 196 C 136 220, 120 252, 96 260 L 0 260 Z" fill="#efd9b6" stroke={C.ink} strokeOpacity=".55" />
            <path d="M560 120 C 590 104, 630 112, 640 118 L 640 260 L 560 260 C 540 230, 530 160, 560 120 Z" fill="#efd9b6" stroke={C.ink} strokeOpacity=".55" />
            {[[200, 150], [300, 200], [380, 90], [470, 210], [250, 110]].map(([cx, cy], k) => (
              <path key={k} className="st-curl" d={`M${cx - 14} ${cy} q7 -10 14 0 q7 -10 14 0`} fill="none" stroke={C.sea} strokeOpacity=".45" strokeWidth="1.6" />
            ))}
            <path d={route_d} fill="none" stroke={C.ink} strokeOpacity=".22" strokeDasharray="3 7" />
            <motion.path ref={route} d={route_d} fill="none" stroke={C.ink} strokeWidth="5" strokeLinecap="round" filter="url(#st-ink)" style={{ pathLength }} />
            <circle cx="96" cy="196" r="6" fill={C.sun} />
            <circle cx="580" cy="150" r="6" fill={C.sea} />
            <text x="96" y="226" className="st-place" textAnchor="middle">Jeddah</text>
            <text x="330" y="176" className="st-place" textAnchor="middle">across the sea</text>
            <text x="580" y="178" className="st-place" textAnchor="middle">Penn State</text>
            <g ref={boat}>
              <g className="st-bob">
                <path d="M-15 0 L15 0 L9 8 L-9 8 Z" fill={C.ink} />
                <path d="M-1 -2 L-1 -25 L13 -4 Z" fill={C.paper} stroke={C.ink} strokeWidth="1.3" />
                <path d="M-24 10 q4 -3 8 0 M-34 12 q4 -3 8 0" fill="none" stroke={C.sea} strokeOpacity=".5" strokeWidth="1.4" />
              </g>
            </g>
          </svg>
        </motion.div>
      </div>
    );
  },

  // 03 dusk: the sun sinks behind layered mountains while the crane flies across gold mist.
  why: function Dusk({ q }) {
    const sunY = useTransform(q, [0, 1], ['-6%', '42%']);
    const far = useTransform(q, [0, 1], ['0%', '-6%']);
    const near = useTransform(q, [0, 1], ['2%', '-14%']);
    const crane = useTransform(q, [0, 1], ['-5%', '-290%']);
    const craneY = useTransform(q, [0, 0.5, 1], [26, -6, 10]);
    const mist = useTransform(q, [0, 1], ['6%', '-30%']);
    return (
      <div className="st-art st-duskart">
        <motion.span className="st-setsun" style={{ y: sunY }} />
        <motion.svg className="st-ridge far" viewBox="0 0 400 100" preserveAspectRatio="none" style={{ x: far }} aria-hidden="true">
          <path d="M0 70 L40 40 L70 58 L120 18 L170 56 L210 34 L260 62 L310 26 L360 54 L400 38 L400 100 L0 100 Z" />
        </motion.svg>
        <span className="st-mist m4" />
        <motion.svg className="st-ridge near" viewBox="0 0 400 100" preserveAspectRatio="none" style={{ x: near }} aria-hidden="true">
          <path d="M0 80 L60 52 L100 70 L150 44 L220 78 L280 50 L330 72 L400 56 L400 100 L0 100 Z" />
        </motion.svg>
        <motion.span className="st-mist m5" style={{ x: mist }} />
        <motion.img className="st-crane" src="/art/crane-alpha.png" alt="" style={{ x: crane, y: craneY }} />
      </div>
    );
  },

  // 04 night: lanterns sway on their strings, fireflies drift, the projects unroll as hanging scrolls.
  build: function Night({ q }) {
    return (
      <div className="st-art st-nightart">
        <span className="st-moon" />
        <div className="st-lanterns" aria-hidden="true">{[0, 1, 2].map(i => <span key={i} className={`st-chochin l${i}`}><i /></span>)}</div>
        {FLIES.map((f, i) => <span key={i} className="st-fly" style={{ left: `${f.x}%`, top: `${f.y}%`, animationDelay: `${-f.d}s`, animationDuration: `${f.t}s` }} />)}
        <div className="st-hang">{featured.map((f, i) => <Hang key={f.name} q={q} i={i} f={f} />)}</div>
      </div>
    );
  },

  // 05 sunrise: the torii stands dark against the night, the sun comes up behind it and we walk through into the light.
  enter: function Sunrise({ q }) {
    const sunY = useTransform(q, [0, 0.55], ['70%', '0%']);
    const fill = useTransform(q, [0.2, 0.6], [C.ink, C.torii]);
    const scale = useTransform(q, [0.45, 1], [1, 4.6]);
    const gate = useTransform(q, [0.82, 0.98], [1, 0]);
    const rays = useTransform(q, [0.15, 0.6], [0, 0.9]);
    return (
      <div className="st-art st-gate">
        <motion.span className="st-rays" style={{ opacity: rays }} />
        <motion.span className="st-gate-sun" style={{ y: sunY }} />
        <motion.svg viewBox="0 0 300 240" style={{ scale, opacity: gate }} aria-hidden="true">
          <motion.g style={{ fill }}>
            <path d="M6 44 Q150 18 294 44 L286 62 Q150 40 14 62 Z" />
            <rect x="44" y="96" width="212" height="12" /><rect x="141" y="73" width="18" height="23" />
            <rect x="72" y="62" width="18" height="170" /><rect x="210" y="62" width="18" height="170" />
          </motion.g>
          <rect x="30" y="62" width="240" height="11" fill={C.ink} />
          <rect x="66" y="224" width="30" height="16" fill={C.ink} /><rect x="204" y="224" width="30" height="16" fill={C.ink} />
        </motion.svg>
      </div>
    );
  }
};

function Hang({ q, i, f }) {
  const start = 0.08 + i * 0.12;
  const y = useTransform(q, [start, start + 0.25], [120, 0]);
  const opacity = useTransform(q, [start, start + 0.14], [0, 1]);
  const open = useTransform(q, [start + 0.1, start + 0.38], [0, 1]);
  const h = useTransform(open, v => `calc(var(--kh) * ${v})`);
  return (
    <motion.figure className="st-kake" style={{ y, opacity }}>
      <i className="rod" />
      <motion.div className="st-kake-body" style={{ height: h }}>
        <div className="st-kake-in"><b>{f.name}</b><small>{f.meta}</small><i className="seal" /></div>
      </motion.div>
      <i className="rod" />
    </motion.figure>
  );
}

// Petals on one canvas in three depth layers; scroll speed blows a gust through them. Capped for phones.
function Petals({ strength, wind, live }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!live) return;
    const c = ref.current, ctx = c.getContext('2d');
    const phone = innerWidth < 700, count = phone ? 12 : 40;
    // near layer is big and faint instead of blurred: canvas blur per petal is too heavy for phones
    const LAYERS = [{ s: [6, 9], v: 0.4, a: 0.5 }, { s: [10, 14], v: 1, a: 0.85 }, { s: [22, 34], v: 1.8, a: 0.55 }];
    const TINTS = ['#f9c9a8', '#f7b27a', '#fde0c8', '#f4b49a'];
    let W = 0, H = 0, raf = 0, gust = 0, last = performance.now();
    const size = () => {
      const r = c.getBoundingClientRect(), d = Math.min(devicePixelRatio || 1, 2);
      W = r.width; H = r.height; c.width = W * d; c.height = H * d; ctx.setTransform(d, 0, 0, d, 0, 0);
    };
    const spawn = (p, top) => {
      const L = LAYERS[p.layer];
      p.size = L.s[0] + Math.random() * (L.s[1] - L.s[0]);
      p.x = Math.random() * W; p.y = top ? -40 - Math.random() * H * 0.5 : Math.random() * H;
      p.rot = Math.random() * 6.28; p.spin = (Math.random() - 0.5) * 2; p.phase = Math.random() * 6.28;
      p.tint = TINTS[(Math.random() * TINTS.length) | 0];
      return p;
    };
    size();
    const ps = Array.from({ length: count }, (_, i) => spawn({ layer: i % 9 === 0 ? 2 : i % 3 === 0 ? 0 : 1 }, false));
    const draw = p => {
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      const s = p.size;
      ctx.beginPath();
      ctx.moveTo(0, -s / 2);
      ctx.bezierCurveTo(s / 2, -s / 2, s / 2, s / 3, 0, s / 2);
      ctx.bezierCurveTo(-s / 2, s / 3, -s / 2, -s / 2, 0, -s / 2);
      ctx.fillStyle = p.tint; ctx.fill(); ctx.restore();
    };
    const tick = now => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      gust += (Math.max(-14, Math.min(14, wind.get() / 60)) - gust) * 0.06;
      const k = strength.get();
      ctx.clearRect(0, 0, W, H);
      if (k > 0.01) {
        for (const p of ps) {
          const L = LAYERS[p.layer];
          p.phase += dt * 1.4;
          p.y += (24 + gust * 2) * L.v * dt * 2.2;
          p.x += (Math.sin(p.phase) * 14 + 10 + gust * 22) * L.v * dt;
          p.rot += p.spin * dt;
          if (p.y > H + 40 || p.x > W + 60 || p.x < -60) spawn(p, true);
          ctx.globalAlpha = L.a * k;
          draw(p);
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    addEventListener('resize', size);
    return () => { cancelAnimationFrame(raf); removeEventListener('resize', size); };
  }, [live, strength, wind]);
  return <canvas ref={ref} className="st-petals" aria-hidden="true" />;
}

// Where the portfolio starts: the end of the hanging scroll, fully open (or the hero when motion is off).
function portfolioTop() {
  const sx = document.querySelector('.sx');
  if (sx) return sx.getBoundingClientRect().top + scrollY + sx.offsetHeight - innerHeight;
  const el = document.getElementById('top');
  return el ? el.getBoundingClientRect().top + scrollY : 0;
}

// Letters rise into place one after another (after the "Prisma" hero on 21st.dev, ported to plain React + motion).
function PullUp({ text }) {
  const ref = useRef(null);
  const { motionOn } = usePrefs();
  const [shown, setShown] = useState(!motionOn);
  useEffect(() => { if (motionOn) { const id = requestAnimationFrame(() => setShown(true)); return () => cancelAnimationFrame(id); } }, [motionOn]);
  return (
    <span ref={ref} className="tc-name" aria-label={text}>
      {[...text].map((ch, i) => (
        <motion.span key={i} aria-hidden="true" initial={false} animate={shown ? { y: '0%', opacity: 1 } : { y: '60%', opacity: 0 }}
          transition={{ duration: 0.9, delay: 0.15 + i * 0.07, ease: [0.16, 1, 0.3, 1] }}>{ch}</motion.span>
      ))}
      <motion.sup aria-hidden="true" initial={false} animate={shown ? { opacity: 1, rotate: 0 } : { opacity: 0, rotate: -90 }}
        transition={{ duration: 0.8, delay: 0.15 + text.length * 0.07 }}>*</motion.sup>
    </span>
  );
}

// The opening shot: a framed window onto the living valley (it follows the visitor's sky), the name pulling up
// in the corner, one line and a way in or a way past.
function TitleCard() {
  const { motionOn } = usePrefs();
  const begin = () => {
    const r = document.querySelector('.st-root, .st-plain');
    if (r) scrollTo({ top: r.getBoundingClientRect().top + scrollY, behavior: motionOn ? 'smooth' : 'instant' });
  };
  const skip = () => {
    try { localStorage.setItem(SEEN_KEY, '1'); } catch { /* storage blocked */ }
    scrollTo({ top: portfolioTop(), behavior: motionOn ? 'smooth' : 'instant' });
  };
  const rise = d => (motionOn ? { initial: { y: 20, opacity: 0 }, animate: { y: 0, opacity: 1 }, transition: { duration: 0.8, delay: d, ease: [0.16, 1, 0.3, 1] } } : {});
  return (
    <section className="tc" aria-labelledby="tc-title">
      <div className="tc-frame">
        <MountainSky />
        <span className="tc-shade" aria-hidden="true" />
        <div className="tc-content">
          <h1 id="tc-title"><PullUp text="Rayyan" /></h1>
          <div className="tc-side">
            <motion.p {...rise(0.6)}>CS at Penn State. I build AI you can talk to. Scroll, and I will tell you how I got here.</motion.p>
            <motion.div className="tc-btns" {...rise(0.8)}>
              <button type="button" className="tc-pill" onClick={begin}>
                Begin the story
                <span className="tc-arrow" aria-hidden="true"><svg width="16" height="16" viewBox="0 0 16 16"><path d="M8 3v10M4 9l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" /></svg></span>
              </button>
              <button type="button" className="tc-skip" onClick={skip}>Skip to portfolio</button>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function StoryIntro() {
  const { motionOn } = usePrefs();
  if (!motionOn) {
    // Motion off: the title card, the story as plain text, then the portfolio.
    return (
      <>
        <TitleCard />
        <section className="st-plain" aria-label="About Rayyan">
          {BEATS.map((b, i) => <p key={b.id}><span className="st-label">0{i + 1} · {b.label}</span>{b.line}</p>)}
        </section>
      </>
    );
  }
  return <><TitleCard /><Film /></>;
}

function Film() {
  const ref = useRef(null);
  const [seen] = useState(() => { try { return localStorage.getItem(SEEN_KEY) === '1'; } catch { return false; } });
  const [active, setActive] = useState(0);
  const [inStory, setInStory] = useState(true);
  const { scrollYProgress: g } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  const { scrollY } = useScroll();
  const wind = useVelocity(scrollY);
  useMotionValueEvent(g, 'change', v => {
    setActive(Math.min(N - 1, Math.floor(v * N)));
    setInStory(v > 0.002 && v < 0.995); // the title card has its own buttons, so the dock waits for the story
    if (v > 0.95) { try { localStorage.setItem(SEEN_KEY, '1'); } catch { /* storage blocked */ } }
  });

  const top = useTransform(g, SKY_AT, SKY_TOP);
  const bot = useTransform(g, SKY_AT, SKY_BOT);
  const background = useTransform([top, bot], ([t, b]) => `linear-gradient(180deg, ${t} 0%, ${b} 100%)`);
  const color = useTransform(g, TEXT_AT, TEXT);
  const night = useTransform(g, [0, 0.5, 0.6, 0.86, 0.94], [0, 0, 1, 1, 0]);
  const petals = useTransform(g, [0, 0.14, 0.22, 0.82, 0.88, 1], [1, 1, 0, 0, 1, 1]);
  // walking through the torii ends in light; lives on the stage so it can never cover the page below
  const flash = useTransform(g, [0.956, 1], [0, 1]);

  // Returning visitors land past the story, at the portfolio.
  useEffect(() => {
    if (seen && !location.hash) {
      requestAnimationFrame(() => scrollTo({ top: portfolioTop(), behavior: 'instant' }));
    }
  }, [seen]);

  const skip = () => {
    try { localStorage.setItem(SEEN_KEY, '1'); } catch { /* storage blocked */ }
    scrollTo({ top: portfolioTop(), behavior: 'smooth' });
  };

  return (
    <div ref={ref} className="st-root" aria-label="A short story about Rayyan">
      <InkDefs />
      <motion.div className="st-stage" style={{ color }}>
        <motion.div className="st-sky" style={{ background }} />
        <motion.div className="st-stars" style={{ opacity: night }} aria-hidden="true">
          {STARS.map((s, i) => <i key={i} style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.s, height: s.s, animationDelay: `${-s.d}s` }} />)}
        </motion.div>
        {BEATS.map((b, i) => {
          const Art = Scenes[b.id];
          return <Scene key={b.id} i={i} g={g}>{q => <Art q={q} />}</Scene>;
        })}
        <Petals strength={petals} wind={wind} live={inStory} />
        <motion.span className="st-flash" style={{ opacity: flash }} aria-hidden="true" />
        <span className="st-grain" aria-hidden="true" />
      </motion.div>
      <AnimatePresence>{inStory && (
      <motion.div className="st-dock" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}>
        <div className="st-dots" aria-hidden="true">{BEATS.map((b, i) => <i key={b.id} className={i <= active ? 'on' : ''} />)}</div>
        <button type="button" className="st-skip" onClick={skip}>Skip to portfolio</button>
      </motion.div>
      )}</AnimatePresence>
    </div>
  );
}

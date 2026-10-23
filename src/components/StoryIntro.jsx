import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useScroll, useTransform, useMotionValueEvent, useVelocity } from 'motion/react';
import { usePrefs } from '../prefs.jsx';
import { featured } from '../data.js';
import { Birds as SkyBirds, Storm } from './MountainSky.jsx';
import { resolveSky } from '../sky.js';

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

// The opening shot, no words: a lone figure (Rayyan) sits on a cliff edge above a sea of clouds, laptop glowing,
// facing a low sun. It follows the visitor's sky like the hero (moon, stars and fireflies at night, rain and
// lightning in a storm, birds by day), and the camera eases in as the story begins.
const TC_STARS = Array.from({ length: 40 }, (_, i) => ({ x: (i * 37.3) % 100, y: (i * 23.1) % 46, d: (i * 0.41) % 4, s: i % 6 === 0 ? 2.6 : 1.4 }));
const TC_FLIES = Array.from({ length: 8 }, (_, i) => ({ x: 38 + ((i * 13) % 26), y: 58 + ((i * 7) % 18), d: (i * 0.9) % 6, t: 6 + (i % 4) }));

function TitleCard() {
  const ref = useRef(null);
  const { motionOn, sky, sound } = usePrefs();
  const mode = resolveSky(sky);
  const { scrollYProgress: p } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const scale = useTransform(p, [0, 1], [1, 1.14]);
  const cue = useTransform(p, [0, 0.15], [1, 0]);
  const skip = () => {
    try { localStorage.setItem(SEEN_KEY, '1'); } catch { /* storage blocked */ }
    scrollTo({ top: portfolioTop(), behavior: motionOn ? 'smooth' : 'instant' });
  };
  return (
    <section ref={ref} className={`tc tc-${mode}`} aria-label="Rayyan, sitting on a cliff above the clouds with a laptop, watching the sun">
      <div className="tc-frame">
        <motion.svg className="tc-scene" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice" style={motionOn ? { scale } : undefined} aria-hidden="true">
          <defs>
            <radialGradient id="tc-sunglow"><stop offset="0" className="tc-glow-in" /><stop offset="1" className="tc-glow-out" /></radialGradient>
            <radialGradient id="tc-screen"><stop offset="0" stopColor="#cfe3ff" stopOpacity=".9" /><stop offset="1" stopColor="#cfe3ff" stopOpacity="0" /></radialGradient>
            <linearGradient id="tc-mist" x1="0" y1="0" x2="0" y2="1"><stop offset="0" className="tc-mist-top" /><stop offset="1" className="tc-mist-bot" /></linearGradient>
          </defs>
          <circle cx="960" cy="560" r="330" fill="url(#tc-sunglow)" />
          <circle className="tc-orb" cx="960" cy="560" r="130" />
          {/* a far peak with a snow cap, printed slightly off register */}
          <path className="tc-peak" d="M1010 700 C 1110 640, 1200 560, 1262 486 L 1300 482 C 1360 556, 1460 640, 1620 700 Z" />
          <path className="tc-snow" d="M1262 486 L1300 482 C 1318 504, 1336 526, 1352 548 L 1334 542 L 1318 558 L 1304 540 L 1288 556 L 1274 538 L 1256 552 L 1242 538 C 1248 520, 1254 502, 1262 486 Z" transform="translate(2 1)" />
          {/* kasumi mist bands across the sun */}
          <g className="tc-kasumi mtn-drift slow">
            <rect x="760" y="520" width="300" height="12" rx="6" /><rect x="900" y="572" width="340" height="10" rx="5" /><rect x="820" y="616" width="220" height="8" rx="4" />
          </g>

          {/* sea of clouds below the cliff, three drifting banks */}
          <pattern id="tc-sei" width="40" height="20" patternUnits="userSpaceOnUse">
            <rect width="40" height="20" className="tc-sei-bg" />
            <path d="M0 20a20 20 0 0 1 40 0M7 20a13 13 0 0 1 26 0M14 20a6 6 0 0 1 12 0M-20 10a20 20 0 0 1 40 0M20 10a20 20 0 0 1 40 0" className="tc-sei-line" />
          </pattern>
          <rect x="560" y="690" width="1100" height="220" fill="url(#tc-sei)" className="tc-sea" />
          <rect x="0" y="640" width="1600" height="260" fill="url(#tc-mist)" />
          {/* kumo: outlined cloud bands with curled ends, drifting over the sea of clouds */}
          <g className="tc-kumo mtn-drift">
            {[[820, 712, 360, 1], [1180, 760, 300, -1], [700, 812, 420, -1], [1260, 840, 320, 1]].map(([x, y, w, d]) => (
              <g key={x + '-' + y}>
                <rect x={x} y={y} width={w} height="24" rx="12" />
                <g transform={`translate(${d > 0 ? x + w : x} ${y + 12}) scale(${d} 1)`}><circle r="19" /><path d="M0 -10 a10 10 0 1 1 -10 10 a6 6 0 1 1 6 -6" fill="none" /></g>
              </g>
            ))}
          </g>

          {/* the cliff, a wind bent pine, grass along the edge */}
          <path className="tc-cliff" d="M-20 900 L-20 690 C 160 650, 380 628, 600 640 C 680 645, 740 652, 790 668 C 800 700, 792 760, 770 820 C 760 860, 770 880, 780 900 Z" />
          <g className="tc-pine">
            <path d="M372 640 C 368 600, 380 560, 410 528 C 430 506, 470 494, 520 488 L 522 494 C 478 502, 442 516, 424 538 C 400 566, 388 600, 384 640 Z" />
            <ellipse cx="540" cy="486" rx="70" ry="13" /><ellipse cx="498" cy="470" rx="48" ry="11" /><ellipse cx="452" cy="512" rx="44" ry="10" />
            <ellipse cx="560" cy="466" rx="34" ry="9" /><ellipse cx="414" cy="548" rx="34" ry="8" />
          </g>
          {/* a small red torii on the cliff behind him */}
          <g className="tc-torii" transform="translate(600 642)">
            <path d="M-50 -112 Q0 -122 50 -112 L47 -104 Q0 -112 -47 -104 Z" />
            <rect x="-44" y="-104" width="88" height="5" className="tc-torii-dark" />
            <rect x="-40" y="-86" width="80" height="5" />
            <rect x="-30" y="-104" width="6" height="104" /><rect x="24" y="-104" width="6" height="104" />
          </g>
          <g className="tc-grass">
            {[612, 640, 664, 700, 726, 752].map((x, i) => <path key={x} style={{ animationDelay: `${-i * 0.4}s` }} d={`M${x} ${646 + i * 3} q-3 -14 2 -24 M${x + 6} ${646 + i * 3} q4 -12 10 -18`} />)}
          </g>

          {/* Rayyan: sitting at the edge, knees up, laptop on his lap, facing the sun */}
          <g transform="translate(736 662) scale(1.45)">
            <circle cx="16" cy="-36" r="34" fill="url(#tc-screen)" className="tc-screen-glow" />
            <g className="tc-me">
              <circle cx="-4" cy="-62" r="9" />
              <path d="M-12 -52 C -18 -38, -18 -24, -14 -10 L 6 -10 C 8 -24, 6 -40, 2 -52 Z" />
              <path d="M-14 -12 L 20 -26 L 30 -2 L 21 -1 L 15 -16 L -8 -2 Z" />
              <path d="M-2 -46 L 14 -30 L 22 -32" fill="none" strokeWidth="5" strokeLinecap="round" className="tc-arm" />
            </g>
            <path d="M10 -26 L 30 -40 L 33 -36 L 14 -24 Z" className="tc-laptop" />
          </g>
        </motion.svg>

        <div className="tc-stars" aria-hidden="true">{TC_STARS.map((s, i) => <i key={i} style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.s, height: s.s, animationDelay: `${-s.d}s` }} />)}</div>
        {mode === 'night' && motionOn && TC_FLIES.map((f, i) => <span key={i} className="st-fly" style={{ left: `${f.x}%`, top: `${f.y}%`, animationDelay: `${-f.d}s`, animationDuration: `${f.t}s` }} />)}
        {motionOn && mode !== 'night' && mode !== 'storm' && <SkyBirds crane />}
        {motionOn && mode === 'storm' && <Storm sound={sound} />}

        {motionOn && mode !== 'night' && mode !== 'storm' && (
          <div className="tc-petals" aria-hidden="true">{[0, 1, 2, 3, 4, 5, 6, 7].map(i => <i key={i} style={{ left: `${8 + i * 12}%`, animationDelay: `${-i * 1.7}s`, animationDuration: `${9 + (i % 3) * 3}s` }} />)}</div>
        )}
        <span className="tc-grain" aria-hidden="true" />
        <span className="tc-seal" aria-hidden="true"><i /><i /><i /></span>
        <motion.div className="tc-cue" style={motionOn ? { opacity: cue } : undefined}>
          <span className="tc-scroll" aria-hidden="true"><i /></span>
          <button type="button" className="tc-skip" onClick={skip}>Skip to portfolio</button>
        </motion.div>
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
  const [inStory, setInStory] = useState(false);
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

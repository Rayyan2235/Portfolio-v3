import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useScroll, useTransform, useMotionValueEvent, useVelocity } from 'motion/react';
import { usePrefs } from '../prefs.jsx';
import { featured } from '../data.js';
import { loopWhileVisible } from '../loop.js';
import FujiOpening from './FujiOpening.jsx';
import { secret } from './Secrets.jsx';

const SKY_LANTERNS = [...new Set(featured.flatMap(f => f.stack))].slice(0, 9);

// Story intro: the Fuji opening, then one pinned stage of three scenes cut together like a film. The sky runs on
// from the opening's night: bright sea, lantern night, snow at the temple gate, and the text flips light or dark with it.
// SVG + CSS + canvas + motion only. Lines are placeholders until Rayyan writes them (ADR 0014).
// Research: vault reference/story-components.
export const BEATS = [
  { id: 'from', label: 'Where from', line: 'From the sands of Dubai to the snows of State College, I crossed the water.' },
  { id: 'build', label: 'What I build', line: 'Lanterns for dark roads, bridges over fast water, a light left on for whoever comes next.' },
  { id: 'enter', label: 'Come in', line: 'The lanterns are lit. Step inside.' }
];
const N = BEATS.length;
const SEEN_KEY = 'v3-story-seen';
const C = { sun: '#e4572e', torii: '#c8361f', ink: '#1b2433', sea: '#1d3557', paper: '#fff8ee', glow: '#f7b27a', peach: '#fde7c4' };


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
  const y = useTransform(progress, [from, to], [10, 0]);
  return <motion.span style={{ opacity, y, display: 'inline-block' }}>{children}&nbsp;</motion.span>;
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


// A chapter's painting: a public domain print (public/art/story) filling the whole stage, with a slow camera move
// driven by the chapter's progress, a color grade for where the day is, and a dark shade at the foot for the line.
function Painting({ q, src, origin = '50% 50%', pos = '50% 50%', zoom = [1.04, 1.18], pan, grade = '', wide = false, dims, overlay, children }) {
  const scale = useTransform(q, [-0.12, 1.1], zoom);
  const x = useTransform(q, [0, 1], pan || ['0%', '0%']);
  const box = useRef(null);
  const cover = useCover(box, dims, pos);
  return (
    <div ref={box} className={`st-paint ${grade}${wide ? ' wide' : ''}`} aria-hidden="true">
      <motion.img src={src} alt="" draggable={false} style={{ scale, x, objectPosition: pos, transformOrigin: origin }} />
      {overlay && cover && (
        <motion.svg className="st-over" viewBox={`0 0 ${cover.W} ${cover.H}`} style={{ scale, x, transformOrigin: origin }}>{overlay(cover)}</motion.svg>
      )}
      <span className="st-grade" />
      {children}
      <span className="st-shade" />
    </div>
  );
}

// Maps a point on a print (in its own pixels) onto the stage, following object-fit: cover and the object position,
// so ink drawn over a painting stays on the mountain or the gate at any screen size.
function useCover(ref, dims, pos) {
  const [box, setBox] = useState(null);
  useEffect(() => {
    if (!dims || !ref.current) return;
    const ro = new ResizeObserver(([e]) => setBox({ W: e.contentRect.width, H: e.contentRect.height }));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, [dims, ref]);
  if (!box || !dims) return null;
  const [w, h] = dims;
  const s = Math.max(box.W / w, box.H / h);
  const [px, py] = pos.split(' ').map(v => parseFloat(v) / 100);
  const ox = (box.W - w * s) * px, oy = (box.H - h * s) * py;
  return { W: box.W, H: box.H, s, at: (x, y) => [ox + x * s, oy + y * s] };
}

// Footprints in the snow, one by one, from the viewer to the temple gate.
function Prints({ q, cover }) {
  const steps = 14;
  return Array.from({ length: steps }, (_, i) => {
    const t = i / (steps - 1);
    const x = 560 + (775 - 560) * t + (i % 2 ? 14 : -14) * (1 - t * 0.6);
    const y = 1190 - (1190 - 1000) * Math.pow(t, 0.8);
    const [px, py] = cover.at(x, y);
    return <Print key={i} q={q} at={0.12 + t * 0.55} x={px} y={py} r={cover.s * (13 - t * 8)} tilt={i % 2 ? 8 : -8} />;
  });
}
function Print({ q, at, x, y, r, tilt }) {
  const opacity = useTransform(q, [at, at + 0.04], [0, 0.85]);
  return <motion.ellipse cx={x} cy={y} rx={r * 0.55} ry={r} className="st-print" style={{ opacity }} transform={`rotate(${tilt} ${x} ${y})`} />;
}

// tap a red lantern over the scrolls: it swings and flares (a secret)
const lightLantern = e => { const l = e.currentTarget; l.classList.remove('lit'); void l.offsetWidth; l.classList.add('lit'); secret('lantern'); };

// Sky lanterns carry the tools the projects are built with up past the fireworks.
function SkyLantern({ q, i, name }) {
  const start = 0.04 + (i % 5) * 0.06;
  const y = useTransform(q, [start, start + 0.9], ['45svh', `${-70 - (i % 3) * 12}svh`]);
  const opacity = useTransform(q, [start, start + 0.08, start + 0.75, start + 0.9], [0, 1, 1, 0]);
  return (
    <motion.span className={`st-skylan k${i}`} style={{ y, opacity, left: `${6 + ((i * 37) % 86)}%` }}>
      <i /><small>{name}</small>
    </motion.span>
  );
}

const Scenes = {
  // 01 the voyage: Hiroshige's Whirlpools of Awa, a triptych wide enough for the camera to sail across it, with
  // the route from Dubai to State College inked over it and a small boat sailing the line as it draws.
  from: function Voyage({ q }) {
    const route = useRef(null);
    const boat = useRef(null);
    const pathLength = useTransform(q, [0.08, 0.8], [0, 1]);
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
    const d = 'M110 330 C 270 120, 470 380, 640 220 S 850 140, 890 250';
    return (
      <Painting q={q} src="/art/story/naruto.jpg" wide pan={['0%', '-33%']} zoom={[1.06, 1.1]} origin="0% 50%">
        <svg className="st-route" viewBox="0 0 1000 480" preserveAspectRatio="xMidYMid meet">
          <path d={d} className="st-route-guide" />
          <motion.path d={d} className="st-route-halo" style={{ pathLength }} />
          <motion.path ref={route} d={d} className="st-route-ink" style={{ pathLength }} />
          <circle cx="110" cy="330" r="10" className="st-pin a" />
          <circle cx="890" cy="250" r="10" className="st-pin b" />
          <g className="st-tag" transform="translate(110 380)"><rect x="-62" y="-24" width="124" height="40" rx="20" /><text textAnchor="middle" y="6">Dubai</text></g>
          <g className="st-tag" transform="translate(890 300)"><rect x="-92" y="-24" width="184" height="40" rx="20" /><text textAnchor="middle" y="6">State College</text></g>
          <g ref={boat}>
            <g className="st-bob">
              <path d="M-24 0 L24 0 L15 13 L-15 13 Z" className="hull" />
              <path d="M-2 -3 L-2 -40 L21 -6 Z" className="sail" />
            </g>
          </g>
        </svg>
      </Painting>
    );
  },

  // 02 night: Hiroshige's Fireworks at Ryogoku. New bursts open over the river while the projects hang in the dark.
  build: function Night({ q }) {
    return (
      <>
        <Painting q={q} src="/art/story/fireworks.jpg" pos="50% 22%" origin="60% 20%" zoom={[1.02, 1.12]}>
          {[0, 1, 2, 3].map(i => <span key={i} className={`st-burst b${i}`} />)}
          <div className="st-skylans">{SKY_LANTERNS.map((s, i) => <SkyLantern key={s} q={q} i={i} name={s} />)}</div>
        </Painting>
        <div className="st-art st-nightart">
          <div className="st-lanterns" aria-hidden="true">{[0, 1, 2].map(i => <span key={i} className={`st-chochin l${i}`} onClick={lightLantern}><i /></span>)}</div>
          <div className="st-hang">{featured.map((f, i) => <Hang key={f.name} q={q} i={i} f={f} />)}</div>
        </div>
      </>
    );
  },

  // 03 come in: Hiroshige's Kinryuzan Temple at Asakusa, cropped to the snowy court and the red gate. Footprints
  // walk to the gate, the lanterns over it light one by one and the camera follows the steps in until the flash.
  enter: function Gate({ q }) {
    const glow = useTransform(q, [0.3, 0.85], [0, 1]);
    return (
      <Painting q={q} src="/art/story/kinryuzan.jpg" pos="50% 55%" origin="62% 76%" zoom={[1, 1.12]} dims={[1254, 1200]}
        overlay={cover => {
          const [gx, gy] = cover.at(770, 900);
          return (
            <>
              <defs><radialGradient id="st-gate-glow"><stop offset="0" stopColor="#ffd38a" stopOpacity=".95" /><stop offset="1" stopColor="#ffb25a" stopOpacity="0" /></radialGradient></defs>
              <motion.ellipse cx={gx} cy={gy} rx={cover.s * 150} ry={cover.s * 120} fill="url(#st-gate-glow)" style={{ opacity: glow }} />
              <Prints q={q} cover={cover} />
            </>
          );
        }}>
        <span className="st-snow" />
        <div className="st-lanterns st-gate-lanterns">{[0, 1, 2, 3, 4].map(i => <GateLantern key={i} q={q} i={i} />)}</div>
      </Painting>
    );
  }
};

function GateLantern({ q, i }) {
  const on = useTransform(q, [0.2 + i * 0.09, 0.27 + i * 0.09], [0, 1]);
  return <span className={`st-chochin g${i}`}><motion.em style={{ opacity: on }} /><i /></span>;
}

function Hang({ q, i, f }) {
  const start = 0.08 + i * 0.12;
  const y = useTransform(q, [start, start + 0.25], [120, 0]);
  const opacity = useTransform(q, [start, start + 0.14], [0, 1]);
  const open = useTransform(q, [start + 0.1, start + 0.38], [0, 1]);
  // unrolls with a clip and a moving bottom rod rather than a growing height, so nothing lays out per frame
  const clip = useTransform(open, v => `inset(0 0 ${(1 - v) * 100}% 0)`);
  const drop = useTransform(open, v => `translateY(calc(var(--kh) * ${v - 1}))`);
  return (
    <motion.figure className="st-kake" style={{ y, opacity }}>
      <i className="rod" />
      <motion.div className="st-kake-body" style={{ clipPath: clip }}>
        <div className="st-kake-in"><b>{f.name}</b><small>{f.meta}</small><p>{f.line}</p><i className="seal" /></div>
      </motion.div>
      <motion.i className="rod" style={{ transform: drop }} />
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
    let W = 0, H = 0, gust = 0, drawn = false;
    const size = () => {
      const r = c.getBoundingClientRect(), d = Math.min(devicePixelRatio || 1, 1.25);
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
    const tick = (now, dt) => {
      gust += (Math.max(-14, Math.min(14, wind.get() / 60)) - gust) * 0.06;
      const k = strength.get();
      if (k <= 0.01) { if (drawn) { ctx.clearRect(0, 0, W, H); drawn = false; } return; }
      drawn = true;
      ctx.clearRect(0, 0, W, H);
      {
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
    };
    return loopWhileVisible(c, tick, { fps: 30, onResize: size });
  }, [live, strength, wind]);
  return <canvas ref={ref} className="st-petals" aria-hidden="true" />;
}

// Where the portfolio starts: the hanging scroll before the hero, so it still opens (or the hero if motion is off).
function portfolioTop() {
  const el = document.querySelector('.sx') || document.getElementById('top');
  return el ? el.getBoundingClientRect().top + scrollY : 0;
}

// Skipping marks the story as seen, so returning visitors land straight on the portfolio.
function skipStory(smooth) {
  try { localStorage.setItem(SEEN_KEY, '1'); } catch { /* storage blocked */ }
  scrollTo({ top: portfolioTop(), behavior: smooth ? 'smooth' : 'instant' });
}

export default function StoryIntro() {
  const { motionOn } = usePrefs();
  if (!motionOn) {
    // Motion off: Fuji as a still, the story as plain text, then the portfolio.
    return (
      <>
        <FujiOpening onSkip={() => skipStory(false)} />
        <section className="st-plain" aria-label="About Rayyan">
          {BEATS.map((b, i) => <p key={b.id}><span className="st-label">0{i + 1} · {b.label}</span>{b.line}</p>)}
        </section>
      </>
    );
  }
  return <><FujiOpening onSkip={() => skipStory(true)} /><Film /></>;
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
    setInStory(v > 0.002 && v < 0.995); // the opening has its own buttons, so the dock waits for the story
    if (v > 0.95) { try { localStorage.setItem(SEEN_KEY, '1'); } catch { /* storage blocked */ } }
  });

  const petals = useTransform(g, [0, 0.18, 0.28], [1, 1, 0]); // dawn only; the last chapter has its own snow
  // walking through the torii ends in light; lives on the stage so it can never cover the page below
  const flash = useTransform(g, [0.956, 1], [0, 1]);

  // Returning visitors land past the story, at the portfolio.
  useEffect(() => {
    if (seen && !location.hash) {
      requestAnimationFrame(() => scrollTo({ top: portfolioTop(), behavior: 'instant' }));
    }
  }, [seen]);

  const skip = () => skipStory(true);

  return (
    <div ref={ref} className="st-root" aria-label="A short story about Rayyan">
      <div className="st-stage">
        {BEATS.map((b, i) => {
          const Art = Scenes[b.id];
          return <Scene key={b.id} i={i} g={g}>{q => <Art q={q} />}</Scene>;
        })}
        <Petals strength={petals} wind={wind} live={inStory} />
        <motion.span className="st-flash" style={{ opacity: flash }} aria-hidden="true" />
      </div>
      <AnimatePresence>{inStory && (
      <motion.div className="st-dock" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}>
        <div className="st-dots" aria-hidden="true">{BEATS.map((b, i) => <i key={b.id} className={i <= active ? 'on' : ''} />)}</div>
        <button type="button" className="st-skip" onClick={skip}>Skip to portfolio</button>
      </motion.div>
      )}</AnimatePresence>
    </div>
  );
}

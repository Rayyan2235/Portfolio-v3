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

// A chapter's painting: a public domain print (public/art/story) filling the whole stage, with a slow camera move
// driven by the chapter's progress, a color grade for where the day is, and a dark shade at the foot for the line.
function Painting({ q, src, origin = '50% 50%', pos = '50% 50%', zoom = [1.04, 1.18], pan, grade = '', wide = false, children }) {
  const scale = useTransform(q, [-0.12, 1.1], zoom);
  const x = useTransform(q, [0, 1], pan || ['0%', '0%']);
  return (
    <div className={`st-paint ${grade}${wide ? ' wide' : ''}`} aria-hidden="true">
      <motion.img src={src} alt="" draggable={false} style={{ scale, x, objectPosition: pos, transformOrigin: origin }} />
      <span className="st-grade" />
      {children}
      <span className="st-shade" />
    </div>
  );
}

const Scenes = {
  // 01 dawn: Hokusai's Red Fuji. The camera drifts up toward the summit while mist crosses and birds pass.
  hello: function Hello({ q }) {
    return (
      <Painting q={q} src="/art/story/red-fuji.jpg" pos="70% 50%" origin="70% 25%" zoom={[1.02, 1.2]} grade="g-dawn">
        <span className="st-mist m1" /><span className="st-mist m2" /><span className="st-mist m3" />
        <Birds />
      </Painting>
    );
  },

  // 02 the voyage: Hiroshige's Whirlpools of Awa, a triptych wide enough for the camera to sail across it.
  from: function Voyage({ q }) {
    return <Painting q={q} src="/art/story/naruto.jpg" wide pan={['0%', '-33%']} zoom={[1.06, 1.1]} origin="0% 50%" />;
  },

  // 03 what drives me: Hokusai's Fuji with lightning below the summit. The painted bolt flashes, the crane crosses.
  why: function Drive({ q }) {
    const crane = useTransform(q, [0, 1], ['-5%', '-290%']);
    const craneY = useTransform(q, [0, 0.5, 1], [26, -6, 10]);
    return (
      <Painting q={q} src="/art/story/thunder-fuji.jpg" pos="64% 50%" origin="62% 30%" zoom={[1.05, 1.22]} grade="g-dusk">
        <span className="st-bolt" />
        <div className="st-skyband"><motion.img className="st-crane" src="/art/crane-alpha.png" alt="" style={{ x: crane, y: craneY }} /></div>
      </Painting>
    );
  },

  // 04 night: Hiroshige's Fireworks at Ryogoku. New bursts open over the river while the projects hang in the dark.
  build: function Night({ q }) {
    return (
      <>
        <Painting q={q} src="/art/story/fireworks.jpg" pos="50% 22%" origin="60% 20%" zoom={[1.02, 1.12]}>
          {[0, 1, 2, 3].map(i => <span key={i} className={`st-burst b${i}`} />)}
        </Painting>
        <div className="st-art st-nightart">
          <div className="st-lanterns" aria-hidden="true">{[0, 1, 2].map(i => <span key={i} className={`st-chochin l${i}`}><i /></span>)}</div>
          <div className="st-hang">{featured.map((f, i) => <Hang key={f.name} q={q} i={i} f={f} />)}</div>
        </div>
      </>
    );
  },

  // 05 come in: Hokusai's travellers on the pine road at Hodogaya. The camera walks with them toward Fuji,
  // closer and closer, until the light takes over and hands off to the portfolio.
  enter: function Road({ q }) {
    return <Painting q={q} src="/art/story/hodogaya.jpg" pos="40% 50%" origin="40% 45%" zoom={[1, 1.7]} grade="g-sunrise" />;
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
    <section ref={ref} className={`tc tc-${mode}`} aria-label="A lone fisherman on a rock above crashing waves, Mount Fuji in the distance (Hokusai)">
      <div className="tc-frame">
        {/* Hokusai, Kajikazawa in Kai Province: a lone fisherman on a rock over the surf, Fuji beyond */}
        <motion.img className="tc-paint" src="/art/story/kajikazawa.jpg" alt="" draggable={false} style={motionOn ? { scale } : undefined} />
        <span className="tc-grade" aria-hidden="true" />
        <span className="tc-mist m1" aria-hidden="true" /><span className="tc-mist m2" aria-hidden="true" />

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

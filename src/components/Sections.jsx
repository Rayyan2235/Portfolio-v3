import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useInView, useScroll, useTransform } from 'motion/react';
import MountainSky from './MountainSky.jsx';
import { RotatingText, Counted } from './TextMotion.jsx';
import { Hanko } from './Charms.jsx';
import { Storm, Birds as SkyFlock } from './MountainSky.jsx';
import { usePrefs } from '../prefs.jsx';
import { resolveSky } from '../sky.js';
import { featured, scraps, experience, EMAIL, GITHUB, LINKEDIN, RESUME } from '../data.js';

const head = { initial: { opacity: 0, y: 16 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: '-80px' }, transition: { duration: 0.6, ease: [0.2, 0.8, 0.2, 1] } };

// The hero line keeps "I build" and turns over what comes next; every phrase is something on this site.
const HERO_PHRASES = ['what outlasts the storm.', 'bridges where there were none.', 'paths others can follow.', 'like the tide, a little every day.'];

export function HeroText() {
  const [time, setTime] = useState('');
  useEffect(() => {
    const t = () => { try { setTime(new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' }).format(new Date()) + ' local'); } catch { /* old browsers */ } };
    t(); const id = setInterval(t, 30000); return () => clearInterval(id);
  }, []);
  return (
    <>
      <p className="corner">Rayyan Syed<br />CS at Penn State, May 2027<br />University Park, {time}</p>
      <div className="ed">
        <h1 id="hero-title" aria-label="I build what outlasts the storm."><span aria-hidden="true">I build </span><RotatingText className="rt-hero" phrases={HERO_PHRASES} /></h1>
        <p>Patient as the tide, steady as the mountain. Every line written to leave the path a little wider.</p>
      </div>
      <nav className="idx" aria-label="Sections">
        <a href="#work" data-go="work"><span>01</span>Work</a>
        <a href="#experience" data-go="experience"><span>02</span>Experience</a>
        <a href="#contact" data-go="contact"><span>03</span>Contact</a>
      </nav>
    </>
  );
}

// Real paintings set into the page. The silk was lifted out ahead of time (public/art/*-ink.jpg),
// so they multiply into the cream paper with no box around them.

// The crane glides across the statement as you scroll past it.
function CraneGlide() {
  const ref = useRef(null);
  const { motionOn } = usePrefs();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const x = useTransform(scrollYProgress, [0, 1], ['38vw', '-46vw']);
  const y = useTransform(scrollYProgress, [0, 0.5, 1], [60, -10, -70]);
  const rotate = useTransform(scrollYProgress, [0, 1], [4, -6]);
  return (
    <div ref={ref} className="crane-sky" aria-hidden="true">
      <motion.img className="crane-ink" src="/art/crane-alpha.png" alt="" style={motionOn ? { x, y, rotate } : undefined} />
    </div>
  );
}

export function Statement() {
  return (
    <section className="statement" aria-label="Summary">
      <CraneGlide />
      <div className="wrap">
        <motion.p {...head}>Like water, begin where people need it most. <span>Then wear down the stone, one drop at a time.</span></motion.p>
      </div>
    </section>
  );
}

// Every project in one list: the featured three first, then the smaller builds.
const projects = [
  ...featured.map(f => ({ ...f, featured: true, blurb: f.text.split('. ')[0] + '.' })),
  ...scraps.map(s => ({ name: s.name, meta: s.year, text: s.result, blurb: s.result, stack: [], spec: [], url: s.url }))
];

function Drawer({ p, i, onClose }) {
  const closeRef = useRef(null);
  useEffect(() => { closeRef.current?.focus(); const k = e => { if (e.key === 'Escape') onClose(); }; document.addEventListener('keydown', k); return () => document.removeEventListener('keydown', k); }, [onClose]);
  return (
    <>
      <motion.div className="scrim" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
      <motion.aside className="drawer" role="dialog" aria-modal="true" aria-labelledby="dr-title"
        initial={{ x: '105%' }} animate={{ x: 0 }} exit={{ x: '105%' }} transition={{ type: 'spring', stiffness: 260, damping: 32 }}>
        <div className="top"><span className="label">{p.meta}</span>
          <button ref={closeRef} className="x" type="button" onClick={onClose} aria-label="Close case study">
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" /></svg>
          </button>
        </div>
        <h3 id="dr-title">{p.name}</h3>
        <p className="dr-text">{p.text}</p>
        {p.spec.length > 0 && (
          <div className="spec">
            <div className="hd"><span>SPEC 0{i + 1}</span><span>REV 2026.10</span></div>
            <dl>{p.spec.map(([k, v]) => <div className="row" key={k}><dt>{k}</dt><i aria-hidden="true" /><dd>{v}</dd></div>)}</dl>
          </div>
        )}
        {p.stack.length > 0 && <div className="tags">{p.stack.map(s => <span key={s}>{s}</span>)}</div>}
        {p.url && p.url !== '#' && <a className="btn solid" href={p.url}>Read the code on GitHub</a>}
      </motion.aside>
    </>
  );
}

// Behind the deck: the sky and blossoms of Hiroshige's Evening Cherry Blossoms at Gotenyama (cropped above the
// figures), washed to the visitor's sky. Blossoms drift in fair weather; in a storm it rains instead.
function CherryBackdrop() {
  const { motionOn, sky } = usePrefs();
  const mode = resolveSky(sky);
  return (
    <div className={`cherry cherry-${mode}`} aria-hidden="true">
      <img src="/art/story/gotenyama.jpg" alt="" draggable={false} />
      <span className="cherry-wash" />
      {motionOn && mode === 'storm' && <span className="st-rain cherry-rain" />}
      {motionOn && mode !== 'storm' && <div className="cherry-fall">{Array.from({ length: 18 }, (_, i) => <i key={i} style={{ left: `${(i * 37) % 100}%`, animationDelay: `${-i * 1.3}s`, animationDuration: `${9 + (i % 5) * 2}s` }} />)}</div>}
    </div>
  );
}

// Work as a thrown deck (reverse engineered from fancy.design's benefits cards, smaller and ours): a sticky stage
// in front of the valley painting. On desktop the row slides left as you scroll while every card drifts at its own
// speed and tilt; on phones the cards stack, each sliding up over the last while the ones beneath shrink back.
const DECK_INK = [
  ['#1b2433', '#fff3e2'], ['#8a5a6a', '#fff3e2'], ['#1d3557', '#fff3e2'], ['#b2351f', '#fff3e2'],
  ['#4f6b45', '#fff3e2'], ['#4a3550', '#fff3e2'], ['#f7b27a', '#1b2433'], ['#fff8ee', '#1b2433']
];
const DECK_MOVE = [[1.6, -6], [0.9, 5], [1.2, -4], [0.5, 3], [0.8, -3], [0.3, 2], [1, -5], [0.6, 4]];

function useIsPhone() {
  const q = '(max-width: 767px)';
  const [phone, setPhone] = useState(() => typeof matchMedia === 'function' && matchMedia(q).matches);
  useEffect(() => {
    const m = matchMedia(q), on = () => setPhone(m.matches);
    m.addEventListener('change', on); return () => m.removeEventListener('change', on);
  }, []);
  return phone;
}

function DeckCard({ p, i, n, prog, phone, onOpen }) {
  const [bg, fg] = DECK_INK[i % DECK_INK.length];
  const [speed, angle] = DECK_MOVE[i % DECK_MOVE.length];
  // desktop: drift and tilt with the whole deck's progress
  const x = useTransform(prog, v => (phone ? '0%' : `${-v * speed * 32}%`));
  const rotate = useTransform(prog, v => (phone ? 0 : angle * v * 2));
  // phones: card i rises over its slice of the scroll; every later card pushes it back a little
  const y = useTransform(prog, v => {
    if (!phone) return '0%';
    const s = v * (n - 1) - (i - 1);
    return i === 0 ? '0%' : `${Math.max(0, Math.min(1, 1 - s)) * 110}%`;
  });
  const scale = useTransform(prog, v => (phone ? 1 - 0.06 * Math.max(0, Math.min(n - 1 - i, v * (n - 1) - i)) : 1));
  const github = p.url && p.url !== '#' && p.url.includes('github.com');
  return (
    <motion.li className="dcard" style={{ x, rotate, y, scale, '--bg': bg, '--fg': fg, zIndex: i + 1 }}>
      {/* a soft light follows the pointer across the card (after React Bits' Spotlight Card) */}
      <div className="dc-inner" onPointerMove={e => { const r = e.currentTarget.getBoundingClientRect(); e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`); e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`); }}>
        <div className="dc-shot">
          {p.img ? <img src={p.img} alt={`${p.name} screenshot`} loading="lazy" /> : <span className="dc-mono" aria-hidden="true">{p.name.slice(0, 1)}</span>}
          {p.featured && <span className="dc-seal">Featured</span>}
        </div>
        <span className="dc-meta">{String(i + 1).padStart(2, '0')} · {p.meta}</span>
        <h3>{p.name}</h3>
        <p>{p.blurb}</p>
        {p.stack.length > 0 && <span className="dc-tags">{p.stack.slice(0, 3).map(s => <span key={s}>{s}</span>)}</span>}
        <span className="dc-btns">
          {github && <a className="dc-gh" href={p.url} target="_blank" rel="noreferrer">GitHub <span aria-hidden="true">↗</span></a>}
          <button type="button" className="dc-open" onClick={onOpen}>Details <span aria-hidden="true">→</span></button>
        </span>
      </div>
    </motion.li>
  );
}

export function Work() {
  const [open, setOpen] = useState(-1);
  const ref = useRef(null);
  const phone = useIsPhone();
  const { motionOn } = usePrefs();
  const { scrollYProgress: prog } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  // the whole row: starts with the first card right of center, ends with the last card near the middle
  const listX = useTransform(prog, v => (phone ? '0px' : `calc(${56 - 6 * v}vw - ${v * 100}%)`));
  const hint = useTransform(prog, [0, 0.08], [1, 0]);
  const n = projects.length;
  return (
    <section className="work" id="work" aria-labelledby="work-title">
      <div className="wrap">
        <motion.div className="head" {...head}><span className="label"><Hanko n="02" />Work</span><h2 id="work-title">What I have built</h2></motion.div>
      </div>
      {motionOn ? (
        <div className="deck" ref={ref} style={{ '--n': n }}>
          <div className="deck-stage">
            <CherryBackdrop />
            <motion.ul className="deck-list" style={{ x: listX }} aria-label={`${n} projects`}>
              {projects.map((p, i) => <DeckCard key={p.name} p={p} i={i} n={n} prog={prog} phone={phone} onOpen={() => setOpen(i)} />)}
            </motion.ul>
            <motion.span className="deck-hint" style={{ opacity: hint }}>{n} projects · keep scrolling</motion.span>
          </div>
        </div>
      ) : (
        <ul className="deck-still wrap">
          {projects.map((p, i) => <DeckCard key={p.name} p={p} i={i} n={n} prog={prog} phone={false} onOpen={() => setOpen(i)} />)}
        </ul>
      )}
      <AnimatePresence>{open >= 0 && <Drawer p={projects[open]} i={open} onClose={() => setOpen(-1)} />}</AnimatePresence>
    </section>
  );
}

export function Experience() {
  return (
    <section className="exp" id="experience" aria-labelledby="exp-title">
      <MountainSky />
      <div className="wrap">
      <motion.div className="head" {...head}><span className="label"><Hanko n="01" />Experience</span><h2 id="exp-title">Where I have worked</h2></motion.div>
      <ol className="rows">
        {experience.map(([when, title, body]) => (
          <li key={title}><span className="when">{when}</span><div><h3>{title}</h3><p><Counted text={body} /></p></div></li>
        ))}
      </ol>
      </div>
    </section>
  );
}

export function Island({ Scene }) {
  const ref = useRef(null);
  const near = useInView(ref, { once: true, margin: '800px 0px' });
  return (
    <section ref={ref} className="island" id="island" aria-labelledby="island-title">
      <div className="wrap island-head">
        <motion.div className="head" {...head}><span className="label">A quiet place</span><h2 id="island-title">Stay a while</h2></motion.div>
        <p className="hint">Drag to look around. The light follows the sky you picked.</p>
      </div>
      {near ? <Scene /> : <div className="shrine3d" />}
    </section>
  );
}

export function Contact({ toast }) {
  const ref = useRef(null);
  const { motionOn } = usePrefs();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end end'] });
  const sunY = useTransform(scrollYProgress, [0, 1], [140, 0]);
  const sunOpacity = useTransform(scrollYProgress, [0, 1], [0.35, 1]);
  const { sky, sound } = usePrefs();
  const mode = resolveSky(sky);
  const copy = () => (navigator.clipboard ? navigator.clipboard.writeText(EMAIL) : Promise.reject()).then(() => toast('Email copied'), () => toast(EMAIL));
  return (
    <section className={`close close-${mode}`} id="contact" ref={ref} aria-labelledby="contact-title">
      <ContactSky mode={mode} motionOn={motionOn} sound={sound} />
      <div className="sunwrap" aria-hidden="true"><motion.div className="sun" style={motionOn ? { y: sunY, opacity: mode === 'storm' ? 0.2 : sunOpacity } : undefined} /></div>
      <div className="wrap">
        <span className="label"><Hanko n="04" />Contact</span>
        <h2 id="contact-title">The tea is warm. Bring me a problem worth solving.</h2>
        <p>Open to software and AI engineering internships and new grad roles. Email is fastest.</p>
        <div className="mail"><code>{EMAIL}</code><button className="btn solid" type="button" onClick={copy} data-magnet>Copy email</button></div>
        <div className="btns center"><a className="btn" href={GITHUB} data-magnet>GitHub</a><a className="btn" href={LINKEDIN} data-magnet>LinkedIn</a><a className="btn" href={RESUME} data-magnet>Resume</a></div>
      </div>
      <SeaBand />
    </section>
  );
}

// The last view, painted like a print: the sky of the moment, the sun (or the moon) rising over Fuji, mist bands
// drifting across the ridges; stars at night, rain and lightning in a storm, birds by day.
function ContactSky({ mode, motionOn, sound }) {
  return (
    <div className="csky" aria-hidden="true">
      {mode === 'night' && <span className="csky-stars" />}
      {motionOn && mode === 'storm' && <div className="csky-storm"><Storm sound={sound} /></div>}
      {motionOn && (mode === 'dawn' || mode === 'day' || mode === 'dusk') && <SkyFlock crane={mode !== 'day'} />}
      <div className="csky-mist">{[0, 1, 2, 3, 4].map(i => <i key={i} className={`m${i}`} />)}</div>
      <svg className="csky-land" viewBox="0 0 1600 400" preserveAspectRatio="xMidYMax slice">
        <path className="far" d="M380 400 C 590 330, 720 210, 772 118 L 828 118 C 880 210, 1010 330, 1220 400 Z" />
        <path className="snow" d="M772 118 L 828 118 C 842 142, 856 166, 872 190 L 852 180 L 834 200 L 816 178 L 798 198 L 780 176 L 760 192 L 744 186 C 752 166, 762 142, 772 118 Z" />
        <path className="mid" d="M0 400 L0 300 Q 150 250 300 290 T 600 285 T 900 312 T 1250 272 T 1600 300 L1600 400Z" />
        <path className="near" d="M0 400 L0 352 Q 200 318 400 344 T 800 338 T 1200 356 T 1600 334 L1600 400Z" />
      </svg>
    </div>
  );
}

function SeaBand() {
  const ref = useRef(null);
  useEffect(() => {
    const NS = 'http://www.w3.org/2000/svg', svg = ref.current;
    if (svg.childNodes.length) return;
    const el = (t, a, p) => { const e = document.createElementNS(NS, t); Object.entries(a).forEach(([k, v]) => e.setAttribute(k, v)); (p || svg).appendChild(e); return e; };
    const defs = el('defs', {}), pat = el('pattern', { id: 'sg', width: 80, height: 40, patternUnits: 'userSpaceOnUse' }, defs);
    for (let k = -2; k <= 4; k++) for (let i = -1; i <= 2; i++) { const x = 80 * i + 40 * (((k % 2) + 2) % 2), y = 20 * k; [40, 30, 20, 10].forEach((r, j) => el('circle', { cx: x, cy: y, r, fill: j % 2 ? '#2a4a78' : '#1d3557', stroke: '#fff8ee', 'stroke-width': 1.2, 'stroke-opacity': 0.5 }, pat)); }
    const wave = (P, amp, base, n, fill, foam, cls) => { let d = 'M0 ' + base; for (let i = 0; i < n; i++) d += ` Q${i * P + P / 4} ${base - amp} ${i * P + P / 2} ${base} T${(i + 1) * P} ${base}`; const g = el('g', { class: cls }); el('path', { d: d + ' V200 H0Z', fill }, g); if (foam) el('path', { d, fill: 'none', stroke: '#fff8ee', 'stroke-width': 3, 'stroke-linecap': 'round' }, g); };
    wave(200, 12, 90, 10, '#7fa3c9', false, 'sea-s'); wave(400, 20, 120, 6, '#2a4a78', true, 'sea-s'); wave(400, 18, 150, 8, 'url(#sg)', true, 'sea-s r');
  }, []);
  return <svg ref={ref} className="waves" viewBox="0 0 1200 200" preserveAspectRatio="xMidYMax slice" aria-hidden="true" />;
}

export function Footer() {
  return <footer><div className="wrap"><span>Rayyan Syed, 2026. Drawn with the Daybreak design system.</span><span>Art after Kawase Hasui, Katsushika Hokusai, Utagawa Hiroshige and Kano Chikanobu: public domain prints via Wikimedia Commons and The Met.</span></div></footer>;
}

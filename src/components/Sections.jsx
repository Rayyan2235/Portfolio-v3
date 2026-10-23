import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useInView, useScroll, useSpring, useTransform } from 'motion/react';
import MountainSky from './MountainSky.jsx';
import { usePrefs } from '../prefs.jsx';
import { featured, scraps, experience, EMAIL, GITHUB, LINKEDIN, RESUME } from '../data.js';

const head = { initial: { opacity: 0, y: 16 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: '-80px' }, transition: { duration: 0.6, ease: [0.2, 0.8, 0.2, 1] } };

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
        <h1 id="hero-title">I build AI you can <em>talk to</em>.</h1>
        <p>Voice tutors, a therapy companion, and agents that run real warehouse yards.</p>
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
      <motion.img className="crane-ink" src="/art/crane-ink.jpg" alt="" style={motionOn ? { x, y, rotate } : undefined} />
    </div>
  );
}

// The cherry branch hangs in from the corner, sways, and lets petals go.
function BlossomBranch() {
  const { motionOn } = usePrefs();
  const cvRef = useRef(null), boxRef = useRef(null);
  useEffect(() => {
    if (!motionOn) return undefined;
    const cv = cvRef.current, box = boxRef.current, c = cv.getContext('2d');
    let W = 0, H = 0, raf = 0, vis = false;
    const petals = [];
    const size = () => { const d = Math.min(devicePixelRatio || 1, 2); W = box.clientWidth; H = box.clientHeight; cv.width = W * d; cv.height = H * d; c.setTransform(d, 0, 0, d, 0, 0); };
    size(); const ro = new ResizeObserver(size); ro.observe(box);
    const io = new IntersectionObserver(es => { vis = es[0].isIntersecting; }); io.observe(box);
    // petals leave from where the blossoms are: the right half, upper two thirds
    const spawn = () => ({ x: W * (0.55 + Math.random() * 0.45), y: H * (0.05 + Math.random() * 0.6), vx: -0.25 - Math.random() * 0.45, vy: 0.35 + Math.random() * 0.45, r: Math.random() * 6, s: 3 + Math.random() * 3.5, ph: Math.random() * 6, a: 0 });
    const loop = () => {
      raf = requestAnimationFrame(loop);
      if (!vis) return;
      if (petals.length < 26 && Math.random() < 0.08) petals.push(spawn());
      c.clearRect(0, 0, W, H);
      for (let i = petals.length - 1; i >= 0; i--) {
        const p = petals[i]; p.ph += 0.03; p.x += p.vx + Math.sin(p.ph) * 0.35; p.y += p.vy; p.r += 0.02; p.a = Math.min(1, p.a + 0.03);
        if (p.y > H + 10 || p.x < -10) { petals.splice(i, 1); continue; }
        c.save(); c.globalAlpha = p.a * 0.85; c.translate(p.x, p.y); c.rotate(p.r); c.scale(1, Math.cos(p.ph * 1.4));
        c.beginPath(); c.moveTo(0, -p.s * 0.55); c.lineTo(p.s * 0.22, -p.s); c.bezierCurveTo(p.s * 1.05, -p.s * 0.7, p.s * 0.65, p.s * 0.75, 0, p.s); c.bezierCurveTo(-p.s * 0.65, p.s * 0.75, -p.s * 1.05, -p.s * 0.7, -p.s * 0.22, -p.s); c.closePath();
        c.fillStyle = i % 3 ? '#f2b8c6' : '#e9a3b4'; c.fill(); c.restore();
      }
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); };
  }, [motionOn]);
  return (
    <div ref={boxRef} className="branch" aria-hidden="true">
      <img className="branch-ink" src="/art/blossom-ink.jpg" alt="" />
      <canvas ref={cvRef} className="branch-petals" />
    </div>
  );
}

export function Statement() {
  return (
    <section className="statement" aria-label="Summary">
      <CraneGlide />
      <div className="wrap">
        <motion.p {...head}>Software that listens first. <span>Then it does the work, and shows what it did.</span></motion.p>
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

// A card in the project rail. Tilts toward the pointer (after React Bits' Tilted Card); opens the case drawer.
function ProjectCard({ p, i, onOpen }) {
  const { motionOn } = usePrefs();
  const rx = useSpring(0, { stiffness: 220, damping: 18 }), ry = useSpring(0, { stiffness: 220, damping: 18 });
  const tilt = e => {
    if (!motionOn || e.pointerType !== 'mouse') return;
    const r = e.currentTarget.getBoundingClientRect();
    ry.set(((e.clientX - r.left) / r.width - 0.5) * 12); rx.set(-((e.clientY - r.top) / r.height - 0.5) * 10);
  };
  return (
    <motion.button type="button" className={`pcard${p.featured ? ' feat' : ''}`} onClick={onOpen}
      onPointerMove={tilt} onPointerLeave={() => { rx.set(0); ry.set(0); }} style={{ rotateX: rx, rotateY: ry }}
      initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.6, delay: Math.min(i, 4) * 0.07, ease: [0.2, 0.8, 0.2, 1] }}>
      <span className="pc-top"><span className="n">{String(i + 1).padStart(2, '0')}</span>{p.featured && <span className="pc-seal">Featured</span>}</span>
      <span className="label">{p.meta}</span>
      <b>{p.name}</b>
      <span className="pc-blurb">{p.blurb}</span>
      {p.stack.length > 0 && <span className="tags">{p.stack.slice(0, 3).map(s => <span key={s}>{s}</span>)}</span>}
      <span className="pc-open">Open <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.6" /></svg></span>
    </motion.button>
  );
}

// Work: the valley painting gets the top of the section, every project sits in one sideways rail below it
// (after 21st.dev's Apple Cards Carousel). Native scroll with snap, so phones swipe and the page never gets hijacked.
export function Work() {
  const [open, setOpen] = useState(-1);
  const rail = useRef(null);
  const page = dir => { const r = rail.current; r.scrollBy({ left: dir * r.clientWidth * 0.8, behavior: 'smooth' }); };
  return (
    <section className="work" id="work" aria-labelledby="work-title">
      <MountainSky />
      <div className="wrap">
        <motion.div className="head" {...head}><span className="label"><span className="jp" aria-hidden="true">波</span> · Work</span><h2 id="work-title">What I have built</h2></motion.div>
      </div>
      <div className="rail-wrap">
        <div className="wrap rail-bar">
          <span className="label">{projects.length} projects · swipe sideways</span>
          <span className="rail-btns">
            <button type="button" onClick={() => page(-1)} aria-label="Previous projects">‹</button>
            <button type="button" onClick={() => page(1)} aria-label="Next projects">›</button>
          </span>
        </div>
        <div className="rail" ref={rail} role="list">
          {projects.map((p, i) => <div role="listitem" key={p.name}><ProjectCard p={p} i={i} onOpen={() => setOpen(i)} /></div>)}
        </div>
      </div>
      <AnimatePresence>{open >= 0 && <Drawer p={projects[open]} i={open} onClose={() => setOpen(-1)} />}</AnimatePresence>
    </section>
  );
}

export function Experience() {
  return (
    <section className="exp" id="experience" aria-labelledby="exp-title">
      <BlossomBranch />
      <div className="wrap">
      <motion.div className="head" {...head}><span className="label"><span className="jp" aria-hidden="true">葉</span> · Experience</span><h2 id="exp-title">Where I have worked</h2></motion.div>
      <ol className="rows">
        {experience.map(([when, title, body]) => (
          <li key={title}><span className="when">{when}</span><div><h3>{title}</h3><p>{body}</p></div></li>
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
        <motion.div className="head" {...head}><span className="label"><span className="jp" aria-hidden="true">島</span> · A quiet place</span><h2 id="island-title">Stay a while</h2></motion.div>
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
  const copy = () => (navigator.clipboard ? navigator.clipboard.writeText(EMAIL) : Promise.reject()).then(() => toast('Email copied'), () => toast(EMAIL));
  return (
    <section className="close" id="contact" ref={ref} aria-labelledby="contact-title">
      <div className="sunwrap" aria-hidden="true"><motion.div className="sun" style={motionOn ? { y: sunY, opacity: sunOpacity } : undefined} /></div>
      <div className="wrap">
        <span className="label"><span className="jp" aria-hidden="true">日</span> · Contact</span>
        <h2 id="contact-title">Let's build something people can talk to.</h2>
        <p>Open to software and AI engineering internships and new grad roles. Email is fastest.</p>
        <div className="mail"><code>{EMAIL}</code><button className="btn solid" type="button" onClick={copy}>Copy email</button></div>
        <div className="btns center"><a className="btn" href={GITHUB}>GitHub</a><a className="btn" href={LINKEDIN}>LinkedIn</a><a className="btn" href={RESUME}>Resume</a></div>
      </div>
      <SeaBand />
    </section>
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
  return <footer><div className="wrap"><span>Rayyan Syed, 2026. Drawn with the Daybreak design system.</span><span>Art after Hokusai, Kano Chikanobu and Matsumura Goshun. The Met, public domain.</span></div></footer>;
}

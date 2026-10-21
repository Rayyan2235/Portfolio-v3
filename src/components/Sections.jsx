import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useScroll, useTransform } from 'motion/react';
import Stack from './reactbits/Stack/Stack.jsx';
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

export function Statement() {
  return (
    <section className="statement wrap" aria-label="Summary">
      <motion.p {...head}>Software that listens first. <span>Then it does the work, and shows what it did.</span></motion.p>
    </section>
  );
}

function Sheet({ p, i }) {
  return (
    <div className="sheet">
      <span className="n" aria-hidden="true">0{i + 1}</span>
      <span className="label">{p.meta}</span>
      <h3>{p.name}</h3>
      <p>{p.text}</p>
      <span className="tags">{p.stack.map(s => <span key={s}>{s}</span>)}</span>
    </div>
  );
}

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
        <div className="spec">
          <div className="hd"><span>SPEC 0{i + 1}</span><span>REV 2026.10</span></div>
          <dl>{p.spec.map(([k, v]) => <div className="row" key={k}><dt>{k}</dt><i aria-hidden="true" /><dd>{v}</dd></div>)}</dl>
        </div>
        <div className="tags">{p.stack.map(s => <span key={s}>{s}</span>)}</div>
        <a className="btn solid" href={p.url}>Read the code on GitHub</a>
      </motion.aside>
    </>
  );
}

function HoverIndex() {
  const { motionOn } = usePrefs();
  const pv = useRef(null), st = useRef({ x: 0, y: 0, tx: 0, ty: 0, on: false });
  const loop = () => {
    const s = st.current, k = motionOn ? 0.16 : 1;
    s.x += (s.tx - s.x) * k; s.y += (s.ty - s.y) * k;
    const r = motionOn ? Math.max(-8, Math.min(8, (s.tx - s.x) * 0.08)) : 0;
    if (pv.current) pv.current.style.transform = `translate(${s.x + 28}px,${s.y - 80}px) rotate(${r}deg)`;
    if (s.on) requestAnimationFrame(loop);
  };
  return (
    <>
      <ol className="hx" onMouseMove={e => { st.current.tx = e.clientX; st.current.ty = e.clientY; }}>
        {scraps.map((s, i) => (
          <li key={s.name}>
            <a href={s.url}
              onMouseEnter={e => { Object.assign(st.current, { x: e.clientX, y: e.clientY, tx: e.clientX, ty: e.clientY }); pv.current.style.backgroundPosition = s.pos; pv.current.classList.add('on'); if (!st.current.on) { st.current.on = true; loop(); } }}
              onMouseLeave={() => { pv.current.classList.remove('on'); st.current.on = false; }}>
              <span className="n">0{i + 4}</span><span className="t">{s.name}</span><span className="r">{s.result}</span><span className="y">{s.year}</span>
            </a>
          </li>
        ))}
      </ol>
      <div className="pv" ref={pv} aria-hidden="true" />
    </>
  );
}

export function Work() {
  const [top, setTop] = useState(0);
  const [open, setOpen] = useState(false);
  const p = featured[top];
  return (
    <section className="work" id="work" aria-labelledby="work-title">
      <div className="wrap">
        <motion.div className="head" {...head}><span className="label"><span className="jp" aria-hidden="true">波</span> · Work</span><h2 id="work-title">What I have built</h2></motion.div>
        <div className="stage">
          <div className="stack-wrap">
            <Stack cards={featured.map((f, i) => <Sheet key={f.name} p={f} i={i} />)} layout="pile" spread={0.5} radius={10}
              sendToBackOnClick onChange={setTop} />
            <p className="hint">Drag or flick the top sheet. Arrow keys work too.</p>
          </div>
          <div className="detail" aria-live="polite">
            <div className="dots" aria-hidden="true">{featured.map((f, i) => <i key={f.name} className={i === top ? 'on' : ''} />)}</div>
            <span className="label">0{top + 1} of 03 · {p.meta}</span>
            <h3>{p.name}</h3>
            <p>{p.text.split('. ')[0]}.</p>
            {p.note && <p className="note">{p.note}</p>}
            <div className="btns"><button className="btn solid" type="button" onClick={() => setOpen(true)}>Open the case</button></div>
          </div>
        </div>
        <div className="scraps">
          <motion.div className="head" {...head}><span className="label">Scraps · smaller things</span><h2 className="h-sm">Also built</h2></motion.div>
          <HoverIndex />
        </div>
      </div>
      <AnimatePresence>{open && <Drawer p={p} i={top} onClose={() => setOpen(false)} />}</AnimatePresence>
    </section>
  );
}

export function Experience() {
  return (
    <section className="exp wrap" id="experience" aria-labelledby="exp-title">
      <motion.div className="head" {...head}><span className="label"><span className="jp" aria-hidden="true">葉</span> · Experience</span><h2 id="exp-title">Where I have worked</h2></motion.div>
      <ol className="rows">
        {experience.map(([when, title, body]) => (
          <li key={title}><span className="when">{when}</span><div><h3>{title}</h3><p>{body}</p></div></li>
        ))}
      </ol>
    </section>
  );
}

export function Lessons() {
  return (
    <section className="sea" id="lessons" aria-labelledby="lessons-title">
      <svg className="crest" viewBox="0 0 1440 80" preserveAspectRatio="none" aria-hidden="true"><path d="M0 0H1440V30C1320 62 1200 62 1080 34C960 6 840 6 720 34C600 62 480 62 360 34C240 6 120 6 0 30Z" fill="#fff8ee" /></svg>
      <div className="pat" aria-hidden="true" />
      <div className="wrap">
        <motion.div className="head" {...head}><span className="label">Honest notes</span><h2 id="lessons-title">What went wrong</h2></motion.div>
        <aside className="mnote"><svg viewBox="0 0 110 54" aria-hidden="true"><path d="M104 6 C 80 3, 48 9, 31 27 C 24 35, 20 41, 16 48 M16 48 L 28 44 M16 48 L 18 36" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg><span>[one honest aside in your own words]</span></aside>
        <div className="stories">
          {featured.map(f => (
            <article className="story" key={f.name}><span className="label">{f.name}</span><b>[What broke]</b><span>[What you did about it, and what you would do differently.]</span></article>
          ))}
        </div>
      </div>
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
  return <footer><div className="wrap"><span>Rayyan Syed, 2026. Drawn with the Daybreak design system.</span><span>Wave after Hokusai, The Met, public domain.</span></div></footer>;
}

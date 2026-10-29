import { useEffect, useRef, useState } from 'react';
import { motion, useMotionValueEvent, useScroll, useTransform } from 'motion/react';
import { usePrefs } from '../prefs.jsx';
import { useTransition } from './Transitions.jsx';

// A second round of pieces taken apart from award winning portfolios (traced over the DevTools protocol alongside
// rea) and redrawn for the prints. CSS transforms and offsets only; nothing here draws to a canvas.

// Rolling label, after art-yakushev.com: each letter sits on a copy of itself; on hover the letters roll up one
// after another and the copy takes their place. The real text stays for screen readers.
export function Roll({ children }) {
  const text = String(children);
  return (
    <span className="rl">
      <span className="sr-only">{text}</span>
      {[...text].map((ch, i) => {
        const c = ch === ' ' ? ' ' : ch;
        return <span key={i} className="rl-ch" style={{ '--i': i }} data-c={c} aria-hidden="true">{c}</span>;
      })}
    </span>
  );
}

// Scroll ruler, after Rauno Freiberg's minimap (rauno.me): a column of hairline ticks down the right edge, longer
// red ticks where each section starts, and a small frame that slides to where you are. Tap a section tick to go there.
const RULER_SECTIONS = [['top', 'Home'], ['experience', 'Experience'], ['work', 'Work'], ['hobbies', 'Off the clock'], ['contact', 'Contact']];
const RULER_H = 260;
export function ScrollRuler() {
  const { motionOn } = usePrefs();
  const { go } = useTransition();
  const { scrollY } = useScroll();
  const [range, setRange] = useState({ start: 0, end: 1, marks: [] });
  const [show, setShow] = useState(false);
  const live = useRef({ start: 0, end: 1 }); // read every frame, so the tracker never runs on a stale measurement
  useEffect(() => {
    const measure = () => {
      const top = document.getElementById('top');
      if (!top) return;
      const start = top.getBoundingClientRect().top + window.scrollY;
      const end = Math.max(start + 1, document.documentElement.scrollHeight - innerHeight);
      const marks = RULER_SECTIONS.map(([id, label]) => {
        const el = document.getElementById(id);
        const y = el ? el.getBoundingClientRect().top + window.scrollY : start;
        return { id, label, at: Math.min(1, Math.max(0, (y - start) / (end - start))) };
      });
      live.current = { start, end };
      setRange({ start, end, marks });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(document.body);
    const late = setTimeout(measure, 1500);
    addEventListener('load', measure);
    return () => { ro.disconnect(); clearTimeout(late); removeEventListener('load', measure); };
  }, []);
  useMotionValueEvent(scrollY, 'change', v => setShow(v > live.current.start - innerHeight * 0.4));
  const y = useTransform(scrollY, v => { const { start, end } = live.current; return Math.min(1, Math.max(0, (v - start) / (end - start))) * RULER_H; });
  const ticks = Array.from({ length: 27 }, (_, i) => i / 26);
  return (
    <motion.nav className="ruler" aria-label="Sections" initial={false} animate={{ opacity: show ? 1 : 0, x: show ? 0 : 16 }}
      transition={{ duration: motionOn ? 0.4 : 0 }} style={{ '--h': `${RULER_H}px`, pointerEvents: show ? 'auto' : 'none' }}>
      {ticks.map(t => <i key={t} className="ruler-tick" style={{ top: `${t * RULER_H}px` }} aria-hidden="true" />)}
      {range.marks.map(m => (
        <a key={m.id} href={`#${m.id}`} className="ruler-mark" style={{ top: `${m.at * RULER_H}px` }}
          onClick={e => { e.preventDefault(); go(m.id); }}>
          <span>{m.label}</span>
        </a>
      ))}
      <motion.span className="ruler-tracker" style={{ y }} aria-hidden="true" />
    </motion.nav>
  );
}

// Orbit, after Pacôme Pertant's showreel badge (pacomepertant.com): letters travel one after another along the
// outline of the email chip with CSS offset-path. Paused off screen.
export function Orbit({ text, children }) {
  const ref = useRef(null);
  const [shape, setShape] = useState(null);
  useEffect(() => {
    const el = ref.current;
    const measure = () => {
      const w = el.offsetWidth + 28, h = el.offsetHeight + 28, r = h / 2;
      const d = `M ${r} 0 H ${w - r} A ${r} ${r} 0 0 1 ${w - r} ${h} H ${r} A ${r} ${r} 0 0 1 ${r} 0 Z`;
      const per = 2 * (w - 2 * r) + 2 * Math.PI * r;
      setShape({ d, n: text.length * Math.max(1, Math.floor(per / 9 / text.length)) }); // whole phrases only, evenly spaced
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    const io = new IntersectionObserver(([e]) => el.classList.toggle('orbit-off', !e.isIntersecting));
    io.observe(el);
    return () => { ro.disconnect(); io.disconnect(); };
  }, []);
  const chars = shape ? Array.from({ length: shape.n }, (_, i) => text[i % text.length]) : [];
  return (
    <span className="orbit" ref={ref}>
      {children}
      <span className="orbit-ring" aria-hidden="true" style={shape ? { '--path': `path("${shape.d}")` } : undefined}>
        {chars.map((ch, i) => <i key={i} style={{ animationDelay: `${-(i / chars.length) * 22}s` }}>{ch}</i>)}
      </span>
    </span>
  );
}

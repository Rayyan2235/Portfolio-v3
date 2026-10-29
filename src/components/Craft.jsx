import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useMotionValue, useMotionValueEvent, useScroll } from 'motion/react';
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

// Section counter, after the rolling numbers on art-yakushev.com and Elliott Mangham's counters: a small chip in the
// bottom left corner that rolls to the number of the section you are in, with a hairline showing how far through it
// you are. Tap it for the next section. Sits in a corner so it never covers the work.
const SECTIONS = [['top', 'Home'], ['experience', 'Experience'], ['work', 'Work'], ['hobbies', 'Off the clock'], ['contact', 'Contact']];
export function SectionCounter() {
  const { go } = useTransition();
  const { scrollY } = useScroll();
  const [i, setI] = useState(-1);
  const bar = useMotionValue(0);
  const tops = useRef([]);
  useEffect(() => {
    const measure = () => {
      tops.current = SECTIONS.map(([id]) => {
        const el = document.getElementById(id);
        return el ? el.getBoundingClientRect().top + window.scrollY : Infinity;
      });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(document.body);
    const late = setTimeout(measure, 1500);
    return () => { ro.disconnect(); clearTimeout(late); };
  }, []);
  useMotionValueEvent(scrollY, 'change', v => {
    const t = tops.current, mid = v + innerHeight * 0.45;
    let k = -1;
    t.forEach((top, n) => { if (mid >= top) k = n; });
    setI(k);
    if (k >= 0) {
      const end = k + 1 < t.length ? t[k + 1] : document.documentElement.scrollHeight;
      bar.set(Math.min(1, Math.max(0, (mid - t[k]) / (end - t[k]))));
    }
  });
  const show = i >= 0;
  const next = SECTIONS[Math.min(SECTIONS.length - 1, i + 1)];
  const pad = n => String(n).padStart(2, '0');
  return (
    <AnimatePresence>{show && (
      <motion.button type="button" className="sc" onClick={() => go(i + 1 < SECTIONS.length ? next[0] : 'top')}
        aria-label={i + 1 < SECTIONS.length ? `Next section: ${next[1]}` : 'Back to the top'}
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }} transition={{ duration: 0.35 }}>
        <span className="sc-num" aria-hidden="true">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.b key={i} initial={{ y: '100%' }} animate={{ y: '0%' }} exit={{ y: '-100%' }} transition={{ duration: 0.45, ease: [0.65, 0, 0.35, 1] }}>{pad(i + 1)}</motion.b>
          </AnimatePresence>
        </span>
        <span className="sc-of" aria-hidden="true">/ {pad(SECTIONS.length)}</span>
        <span className="sc-name" aria-hidden="true">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span key={i} initial={{ y: '100%', opacity: 0 }} animate={{ y: '0%', opacity: 1 }} exit={{ y: '-100%', opacity: 0 }} transition={{ duration: 0.45, ease: [0.65, 0, 0.35, 1] }}>{SECTIONS[i][1]}</motion.span>
          </AnimatePresence>
        </span>
        <motion.i className="sc-bar" style={{ scaleX: bar }} aria-hidden="true" />
      </motion.button>
    )}</AnimatePresence>
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

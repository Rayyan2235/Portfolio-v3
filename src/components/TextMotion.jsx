import { useEffect, useRef, useState } from 'react';
import { animate, useInView } from 'motion/react';
import { usePrefs } from '../prefs.jsx';

// Small text motions, rebuilt on `motion` so they add no dependency and only touch transforms, opacity and text.
// They sit still when the Motion switch is off.

// Typewriter: types a phrase, rests, backspaces it, types the next. An invisible copy of the longest phrase holds
// the space so nothing below jumps while letters come and go. Rests while off screen.
export function Typewriter({ phrases, className = '', type = 62, erase = 32, hold = 1700 }) {
  const { motionOn } = usePrefs();
  const ref = useRef(null);
  const [text, setText] = useState(phrases[0]);
  useEffect(() => {
    if (!motionOn) { setText(phrases[0]); return undefined; }
    let p = 0, n = phrases[0].length, dir = -1, t, seen = true;
    const step = () => {
      if (!seen) { t = setTimeout(step, 400); return; }
      const full = phrases[p];
      if (dir > 0 && n === full.length) { dir = -1; t = setTimeout(step, hold); return; }
      if (dir < 0 && n === 0) { dir = 1; p = (p + 1) % phrases.length; t = setTimeout(step, 380); return; }
      n += dir;
      setText(phrases[p].slice(0, n));
      t = setTimeout(step, dir > 0 ? type + Math.random() * 60 : erase);
    };
    t = setTimeout(step, hold);
    const io = new IntersectionObserver(([e]) => { seen = e.isIntersecting; });
    if (ref.current) io.observe(ref.current);
    return () => { clearTimeout(t); io.disconnect(); };
  }, [motionOn, phrases, type, erase, hold]);
  const longest = phrases.reduce((a, b) => (b.length > a.length ? b : a), '');
  return (
    <span className={`tw ${className}`} ref={ref} aria-hidden="true">
      <span className="tw-ghost">{longest}</span>
      <span className="tw-text">{text}<i className="tw-caret" /></span>
    </span>
  );
}

// One number that counts up from zero the first time it scrolls into view.
export function CountUp({ to, suffix = '', duration = 1.4 }) {
  const ref = useRef(null);
  const { motionOn } = usePrefs();
  const seen = useInView(ref, { once: true, margin: '-60px' });
  useEffect(() => {
    if (!seen || !motionOn || !ref.current) return undefined;
    const c = animate(0, to, { duration, ease: [0.16, 1, 0.3, 1], onUpdate: v => { if (ref.current) ref.current.textContent = Math.round(v) + suffix; } });
    return () => c.stop();
  }, [seen, motionOn, to, suffix, duration]);
  return (
    <span className="cu">
      <span ref={ref} className="cu-n" aria-hidden="true">{motionOn ? `0${suffix}` : `${to}${suffix}`}</span>
      <span className="sr-only">{to}{suffix}</span>
    </span>
  );
}

// Body copy with every "60%" or "10+" in it turned into a CountUp; the rest of the sentence stays plain text.
export function Counted({ text }) {
  const parts = [];
  const re = /(\d+)(%|\+)/g;
  let last = 0, m;
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    parts.push(<CountUp key={m.index} to={+m[1]} suffix={m[2]} />);
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, animate, motion, useInView } from 'motion/react';
import { usePrefs } from '../prefs.jsx';

// Small text motions after React Bits (Rotating Text, Count Up), rebuilt on `motion` so they add no dependency
// and only touch transforms, opacity and text. Both sit still when the Motion switch is off.

// Cycles through phrases: the old one's letters lift away, the new one's rise in from below, one after another.
export function RotatingText({ phrases, interval = 2800, className = '' }) {
  const { motionOn } = usePrefs();
  const [i, setI] = useState(0);
  useEffect(() => {
    if (!motionOn) return undefined;
    const id = setInterval(() => setI(n => (n + 1) % phrases.length), interval);
    return () => clearInterval(id);
  }, [motionOn, phrases.length, interval]);
  const text = phrases[motionOn ? i : 0];
  // letters animate one by one, but each word is its own unbreakable box so a line never splits a word
  let k = 0;
  return (
    <span className={`rt ${className}`} aria-hidden="true">
      <AnimatePresence mode="wait" initial={false}>
        <motion.span key={text} className="rt-phrase">
          {text.split(' ').map((word, w) => (
            <span key={w}>
              {w > 0 && ' '}
              <span className="rt-word">
                {[...word].map(ch => {
                  const n = k++;
                  return (
                    <motion.span key={n} className="rt-ch"
                      initial={{ y: '105%', opacity: 0 }} animate={{ y: '0%', opacity: 1 }} exit={{ y: '-105%', opacity: 0 }}
                      transition={{ duration: 0.5, delay: n * 0.022, ease: [0.16, 1, 0.3, 1] }}>
                      {ch}
                    </motion.span>
                  );
                })}
              </span>
            </span>
          ))}
        </motion.span>
      </AnimatePresence>
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

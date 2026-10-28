import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useScroll, useTransform } from 'motion/react';
import { useTransition } from './Transitions.jsx';

// Small charms in the spirit of the prints: a seal stamped on each heading, a family crest that carries you
// home, and a fortune slip to draw at the end. SVG + transforms only.

// A red seal pressed onto a section heading the first time it scrolls into view.
export function Hanko({ n }) {
  return (
    <motion.span className="hanko" aria-hidden="true"
      initial={{ opacity: 0, scale: 1.9, rotate: -18 }}
      whileInView={{ opacity: 1, scale: 1, rotate: -6 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ type: 'spring', stiffness: 520, damping: 18, delay: 0.25 }}>
      <svg viewBox="0 0 48 48"><rect x="3" y="3" width="42" height="42" rx="5" /><rect x="8" y="8" width="32" height="32" rx="2" className="in" /><text x="24" y="31" textAnchor="middle">{n}</text></svg>
    </motion.span>
  );
}

// A crest of three waves that fills its ring as you read; tap it to ride a wave back to the top.
export function KamonTop() {
  const { go } = useTransition();
  const { scrollY, scrollYProgress } = useScroll();
  const [show, setShow] = useState(false);
  useEffect(() => scrollY.on('change', v => {
    const top = document.getElementById('top');
    setShow(!!top && v > top.offsetTop + innerHeight * 0.8);
  }), [scrollY]);
  const ring = useTransform(scrollYProgress, [0.35, 1], [0, 1]);
  return (
    <AnimatePresence>{show && (
      <motion.button type="button" className="kamon" aria-label="Back to the top" data-magnet onClick={() => go('top')}
        initial={{ opacity: 0, scale: 0.6, rotate: -90 }} animate={{ opacity: 1, scale: 1, rotate: 0 }} exit={{ opacity: 0, scale: 0.6, rotate: 90 }}
        whileHover={{ rotate: 30 }} whileTap={{ scale: 0.9 }}>
        <svg viewBox="0 0 56 56" aria-hidden="true">
          <circle cx="28" cy="28" r="25" className="track" />
          <motion.circle cx="28" cy="28" r="25" className="fill" style={{ pathLength: ring }} transform="rotate(-90 28 28)" />
          <g className="waves">
            <path d="M16 31a6 6 0 0 1 12 0a6 6 0 0 1 12 0" />
            <path d="M19 31a3 3 0 0 1 6 0M31 31a3 3 0 0 1 6 0" />
            <path d="M22 22a6 6 0 0 1 12 0" />
            <path d="M25 22a3 3 0 0 1 6 0" />
          </g>
        </svg>
      </motion.button>
    )}</AnimatePresence>
  );
}

// Omikuji: shake the box, a slip rises with a fortune and an old proverb.
const FORTUNES = [
  ['Great blessing', 'Fall seven times, stand up eight.'],
  ['Blessing', 'After the rain, the earth hardens.'],
  ['Great blessing', 'Even dust, piled up, becomes a mountain.'],
  ['Small blessing', 'When in a hurry, take the long way round.'],
  ['Blessing', 'One meeting, one chance. Make it count.'],
  ['Middle blessing', 'Sit on a cold stone for three years and it grows warm.'],
  ['Future blessing', 'The frog in the well knows nothing of the sea. Go see the sea.']
];
export function Omikuji() {
  const [draw, setDraw] = useState(-1);
  const [shake, setShake] = useState(0);
  const pull = () => {
    setShake(s => s + 1);
    setDraw(-1);
    setTimeout(() => setDraw(d => {
      let k = Math.floor(Math.random() * FORTUNES.length);
      if (k === d) k = (k + 1) % FORTUNES.length;
      return k;
    }), 650);
  };
  const f = FORTUNES[draw];
  return (
    <div className="omikuji">
      <motion.button type="button" className="omi-box" onClick={pull} data-magnet
        key={shake} animate={shake ? { rotate: [0, -14, 12, -10, 8, -4, 0] } : {}} transition={{ duration: 0.6 }}>
        <svg viewBox="0 0 40 64" aria-hidden="true"><rect x="4" y="10" width="32" height="50" rx="3" /><rect x="17" y="2" width="6" height="12" rx="1" className="stick" /><path d="M4 22h32M4 48h32" /></svg>
        <span>{draw < 0 && !shake ? 'Draw a fortune' : 'Draw again'}</span>
      </motion.button>
      <div className="omi-slot" aria-live="polite">
        <AnimatePresence mode="wait">{f && (
          <motion.div key={draw} className="omi-slip" initial={{ opacity: 0, y: 30, scaleY: 0.2 }} animate={{ opacity: 1, y: 0, scaleY: 1 }} exit={{ opacity: 0, y: -16 }}
            transition={{ type: 'spring', stiffness: 260, damping: 24 }}>
            <b>{f[0]}</b><p>{f[1]}</p>
          </motion.div>
        )}</AnimatePresence>
      </div>
    </div>
  );
}

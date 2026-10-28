import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useScroll, useTransform } from 'motion/react';
import { useTransition } from './Transitions.jsx';

// Small charms in the spirit of the prints: a seal stamped on each heading and a family crest that carries you
// home. SVG + transforms only.

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
    setShow(!!top && top.getBoundingClientRect().top < -innerHeight * 0.8);
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

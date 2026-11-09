import { useRef, useState } from 'react';
import { motion, useScroll, useTransform } from 'motion/react';
import { usePrefs } from '../prefs.jsx';
import { secret } from './Secrets.jsx';

// The last thing on the page, after the footers on littlebird.ai: a landscape at the bottom of the page with the
// name set huge across its sky and a crane for a mark. Here the landscape is the ink valley, washed lighter,
// rising into the paper. Tap the crane and it takes off.
const Crane = () => (
  <svg viewBox="0 0 120 80" aria-hidden="true">
    <path d="M6 18 C 26 22, 40 30, 52 40 C 58 30, 70 10, 96 2 C 84 14, 74 28, 70 40 C 80 40, 92 42, 104 46 L 118 44 L 106 50 C 94 52, 80 50, 68 48 C 60 54, 48 58, 36 58 L 20 70 L 30 56 C 22 52, 16 46, 14 40 C 30 42, 40 44, 48 44 C 38 36, 24 26, 6 18 Z" />
  </svg>
);

export default function Finale() {
  const { motionOn } = usePrefs();
  const ref = useRef(null);
  const [flying, setFlying] = useState(false);
  const { scrollYProgress: p } = useScroll({ target: ref, offset: ['start end', 'end end'] });
  const wordY = useTransform(p, [0, 1], [70, 0]);
  const artScale = useTransform(p, [0, 1], [1.1, 1]);
  const fly = () => {
    if (flying) return;
    setFlying(true); secret('crane');
    setTimeout(() => setFlying(false), 4200);
  };
  return (
    <section ref={ref} className="fin" aria-label="Rayyan Syed">
      <motion.div className="fin-art" style={motionOn ? { scale: artScale } : undefined} aria-hidden="true">
        <img src="/art/mountains.jpg" alt="" loading="lazy" decoding="async" draggable={false} />
      </motion.div>
      <motion.div className="fin-mark" style={motionOn ? { y: wordY } : undefined}>
        <button type="button" className={`fin-crane${flying ? ' fly' : ''}`} onClick={fly} aria-label="A crane. Tap it.">
          <Crane />
        </button>
        <span className="fin-word" aria-hidden="true">Rayyan Syed</span>
      </motion.div>
    </section>
  );
}

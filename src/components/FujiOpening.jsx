import { useEffect, useRef, useState } from 'react';
import { motion, useScroll, useTransform } from 'motion/react';
import { usePrefs } from '../prefs.jsx';

// The opening: a porcelain Red Fuji that turns over one day as you scroll (the scene lives in scenes/fuji.js).
// Laid out like the 3D hero sites on motionsites.ai: one object in soft light, big type behind it, little else.
// three.js loads in its own chunk while the story plays, so nothing before it waits on it.
export default function FujiOpening() {
  const { motionOn } = usePrefs();
  const ref = useRef(null), cv = useRef(null), api = useRef(null);
  const [state, setState] = useState('loading');
  const { scrollYProgress: p } = useScroll({ target: ref, offset: ['start start', 'end end'] });

  useEffect(() => {
    let dead = false;
    import('../scenes/fuji.js')
      .then(({ createFuji }) => {
        if (dead) return;
        api.current = createFuji(cv.current, { phone: innerWidth < 700, moving: motionOn, progress: () => (motionOn ? p.get() : 0) });
        setState('ready');
      })
      .catch(err => { console.error(err); if (!dead) setState('failed'); });
    const move = e => { if (e.pointerType === 'mouse') api.current?.pointer(e.clientX / innerWidth * 2 - 1, e.clientY / innerHeight * 2 - 1); };
    addEventListener('pointermove', move, { passive: true });
    return () => { dead = true; removeEventListener('pointermove', move); api.current?.dispose(); api.current = null; };
  }, [motionOn, p]);

  // the sky behind the canvas follows the same day (dawn paper, a clear noon, night with stars) through --day in CSS:
  // scroll linked opacity set straight from motion values did not apply inside this sticky stage
  const ink = useTransform(p, [0.55, 0.9], ['#1b2433', '#fff8ee']);
  const nameY = useTransform(p, [0, 1], ['0vh', '-3vh']);

  return (
    <section ref={ref} className={`fj fj-${state}${motionOn ? '' : ' fj-still'}`} aria-label="Rayyan Syed, software engineer">
      <motion.div className="fj-stage" style={motionOn ? { '--day': p } : undefined}>
        <span className="fj-sky" aria-hidden="true" />
        <span className="fj-sky noon" aria-hidden="true" />
        <span className="fj-sky night" aria-hidden="true" />
        <img className="fj-print" src="/art/story/red-fuji-clear.jpg" alt="" aria-hidden="true" />
        <motion.p className="fj-name" style={{ color: ink, y: nameY }} aria-hidden="true">Rayyan <br className="fj-br" />Syed</motion.p>
        <span className="fj-shadow" aria-hidden="true" />
        <canvas ref={cv} className="fj-canvas" aria-hidden="true" />
        <motion.div className="fj-copy" style={{ color: ink }}>
          <p className="fj-kicker">Software engineer</p>
          <p className="fj-line">Start at the mountain. Every road on this page leads back to it.</p>
        </motion.div>
        <motion.p className="fj-hint" style={{ color: ink }} aria-hidden="true"><i />Scroll to turn the day</motion.p>
        <motion.p className="fj-credit" style={{ color: ink }}>Red Fuji in porcelain, after Hokusai</motion.p>
      </motion.div>
    </section>
  );
}

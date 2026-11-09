import { useEffect, useRef, useState } from 'react';
import { motion, useScroll } from 'motion/react';
import { usePrefs } from '../prefs.jsx';

// The first page of the story: Mount Fuji from real elevation data, rising out of a sea of clouds under a twilight
// sky that turns to night as you scroll (the scene lives in scenes/fuji.js). Skip jumps straight to the portfolio.
// three.js loads in its own chunk, so the page around it never waits on it.
export default function FujiOpening({ onSkip }) {
  const { motionOn } = usePrefs();
  const ref = useRef(null), cv = useRef(null), api = useRef(null);
  const [state, setState] = useState('loading');
  const { scrollYProgress: p } = useScroll({ target: ref, offset: ['start start', 'end end'] });

  useEffect(() => {
    let dead = false;
    import('../scenes/fuji.js')
      .then(({ createFuji }) => createFuji(cv.current, { phone: innerWidth < 700, moving: motionOn, progress: () => p.get() }))
      .then(scene => { if (dead) scene.dispose(); else { api.current = scene; setState('ready'); } })
      .catch(err => { console.error(err); if (!dead) setState('failed'); });
    const move = e => { if (e.pointerType === 'mouse') api.current?.pointer(e.clientX / innerWidth * 2 - 1, e.clientY / innerHeight * 2 - 1); };
    addEventListener('pointermove', move, { passive: true });
    return () => { dead = true; removeEventListener('pointermove', move); api.current?.dispose(); api.current = null; };
  }, [motionOn, p]);

  // the cue fades through --day in CSS: scroll linked opacity set straight from a motion value does not apply here
  return (
    <section ref={ref} className={`fj fj-${state}${motionOn ? '' : ' fj-still'}`} aria-labelledby="fj-name">
      <motion.div className="fj-stage" style={motionOn ? { '--day': p } : undefined}>
        <img className="fj-print" src="/art/story/red-fuji-clear.jpg" alt="" aria-hidden="true" />
        <canvas ref={cv} className="fj-canvas" aria-hidden="true" />
        <span className="fj-film" aria-hidden="true" />
        <h1 className="fj-name" id="fj-name">Rayyan Syed</h1>
        <p className="fj-kicker">Software engineer</p>
        <p className="fj-line">Walk quietly. Leave a mark.</p>
        <div className="fj-cue">
          {motionOn && <span className="fj-hint" aria-hidden="true"><i />Scroll into the night</span>}
          <button type="button" className="fj-skip" onClick={onSkip}>Skip to portfolio</button>
        </div>
        <p className="fj-credit">Mount Fuji from real elevation data, under a twilight sky</p>
      </motion.div>
    </section>
  );
}

import { useEffect, useRef, useState } from 'react';
import { motion, useScroll } from 'motion/react';
import { usePrefs } from '../prefs.jsx';
import { secret } from './Secrets.jsx';

// The first page of the story: Mount Fuji from real elevation data, rising out of a sea of clouds under a twilight
// sky that turns to night as you scroll (the scene lives in scenes/fuji.js). Skip jumps straight to the portfolio.
// three.js loads in its own chunk, so the page around it never waits on it. The download starts as soon as this
// file runs, and until the scene is built a painted sky with the word in it holds the screen, so nobody lands on
// an empty page.
const fujiModule = import('../scenes/fuji.js');
// tells the preloader the opening is ready to be seen
const opened = () => { window.__v3OpeningReady = true; dispatchEvent(new Event('v3:opening-ready')); };
export default function FujiOpening({ onSkip }) {
  const { motionOn } = usePrefs();
  const ref = useRef(null), cv = useRef(null), api = useRef(null);
  const [state, setState] = useState('loading');
  const { scrollYProgress: p } = useScroll({ target: ref, offset: ['start start', 'end end'] });

  useEffect(() => {
    let dead = false;
    fujiModule
      .then(({ createFuji }) => dead ? null : createFuji(cv.current, { phone: innerWidth < 700, moving: motionOn, progress: () => p.get() }))
      .then(scene => { if (!scene) return; if (dead) scene.dispose(); else { api.current = scene; setState('ready'); opened(); } })
      .catch(err => { console.error(err); if (!dead) setState('failed'); opened(); });
    const move = e => { if (e.pointerType === 'mouse') api.current?.pointer(e.clientX / innerWidth * 2 - 1, e.clientY / innerHeight * 2 - 1); };
    addEventListener('pointermove', move, { passive: true });
    return () => { dead = true; removeEventListener('pointermove', move); api.current?.dispose(); api.current = null; };
  }, [motionOn, p]);

  // tap the sky and a shooting star falls toward the spot: make a wish
  const wish = e => {
    if (!motionOn || !api.current || e.target.closest('button, a')) return;
    const r = cv.current.getBoundingClientRect();
    api.current.wish((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height * 2 - 1));
    secret('wish');
  };

  // the cue fades through --day in CSS: scroll linked opacity set straight from a motion value does not apply here
  return (
    <section ref={ref} className={`fj fj-${state}${motionOn ? '' : ' fj-still'}`} aria-labelledby="fj-name">
      <motion.div className="fj-stage" style={motionOn ? { '--day': p } : undefined} onPointerDown={wish}>
        <img className="fj-print" src="/art/story/red-fuji-clear.jpg" alt="" aria-hidden="true" />
        <div className="fj-paint" aria-hidden="true"><span>Welcome</span></div>
        <canvas ref={cv} className="fj-canvas" aria-hidden="true" />
        <span className="fj-film" aria-hidden="true" />
        <h1 className="fj-name" id="fj-name">Welcome</h1>
        <p className="fj-kicker">A night above the clouds</p>
        <div className="fj-intro">
          <p>You made it to the mountain.</p>
          <p className="soft">Make a wish on a falling star, then scroll. There is a story up there, and a few secrets on the way down.</p>
        </div>
        <div className="fj-cue">
          {motionOn && <span className="fj-hint" aria-hidden="true"><i />Tap the sky, then scroll</span>}
          <button type="button" className="fj-skip" onClick={onSkip}>Skip to portfolio</button>
        </div>
        <p className="fj-credit">Mount Fuji from real elevation data, under a comet night</p>
      </motion.div>
    </section>
  );
}

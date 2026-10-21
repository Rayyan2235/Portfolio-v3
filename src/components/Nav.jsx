import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'motion/react';
import { usePrefs } from '../prefs.jsx';
import { SKIES, resolveSky } from '../sky.js';
import { KINDS } from './Transitions.jsx';
import { RESUME } from '../data.js';
import { audioContext } from '../audio.js';

export default function Nav({ onOpenMenu }) {
  const { motionOn, setMotionOn, sky, setSky, transition, setTransition, sound, setSound } = usePrefs();
  const [hidden, setHidden] = useState(false);
  const [open, setOpen] = useState(false);
  const { scrollY } = useScroll();
  const panelRef = useRef(null), btnRef = useRef(null);

  useMotionValueEvent(scrollY, 'change', y => {
    const prev = scrollY.getPrevious() ?? 0;
    setHidden(y > 300 && y > prev + 4);
    if (y < prev - 4) setHidden(false);
  });

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = e => { if (!panelRef.current?.contains(e.target) && !btnRef.current?.contains(e.target)) setOpen(false); };
    const onKey = e => { if (e.key === 'Escape') { setOpen(false); btnRef.current?.focus(); } };
    document.addEventListener('pointerdown', onDoc); document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('pointerdown', onDoc); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const now = resolveSky(sky);

  return (
    <motion.nav className="nav" aria-label="Main" initial={false}
      animate={{ y: hidden && !open ? -90 : 0 }} transition={{ type: 'spring', stiffness: 380, damping: 36 }}>
      <a className="who" href="#top" data-go="top">Rayyan Syed</a>
      <a className="l" href="#work" data-go="work">Work</a>
      <a className="l opt" href="#experience" data-go="experience">Experience</a>
      <a className="l opt" href="#lessons" data-go="lessons">What went wrong</a>
      <a className="l" href={RESUME}>Resume</a>
      <a className="cta" href="#contact" data-go="contact">Email</a>
      <button ref={btnRef} type="button" className="l sky-btn" aria-expanded={open} aria-haspopup="true" onClick={() => setOpen(o => !o)}>
        <span className={`sky-dot sky-dot-${now}`} aria-hidden="true" />{SKIES[now].label}
      </button>
      <button type="button" className="kbtn" onClick={onOpenMenu} aria-haspopup="dialog">Jump <kbd>Ctrl K</kbd></button>

      <AnimatePresence>
        {open && (
          <motion.div ref={panelRef} className="panel" role="group" aria-label="Scene settings"
            initial={{ opacity: 0, y: -8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}>
            <fieldset>
              <legend>Sky</legend>
              <div className="seg">
                {['auto', 'dawn', 'day', 'dusk', 'night', 'storm'].map(k => (
                  <button key={k} type="button" aria-pressed={sky === k} onClick={() => setSky(k)}>{k === 'auto' ? 'Your time' : SKIES[k].label}</button>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend>Transition</legend>
              <div className="seg">
                {['mixed', ...Object.keys(KINDS)].map(k => (
                  <button key={k} type="button" aria-pressed={transition === k} onClick={() => setTransition(k)}>{k === 'mixed' ? 'Mixed' : KINDS[k].label}</button>
                ))}
              </div>
            </fieldset>
            <div className="toggles">
              <button type="button" aria-pressed={motionOn} onClick={() => setMotionOn(!motionOn)}>Motion {motionOn ? 'on' : 'off'}</button>
              <button type="button" aria-pressed={sound} onClick={() => { if (!sound) audioContext(); setSound(!sound); }}>Storm sound {sound ? 'on' : 'off'}</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}

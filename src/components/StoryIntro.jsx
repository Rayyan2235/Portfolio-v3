import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useScroll, useTransform, useMotionValueEvent } from 'motion/react';
import { usePrefs } from '../prefs.jsx';

// Story intro, grey pass (pacing only, art comes later). Five beats, phone first.
// Each beat is a tall section with a pinned stage; scroll progress inside it drives the beat.
// Lines are placeholders until Rayyan writes them (ADR 0014).
export const BEATS = [
  { id: 'hello', label: 'Hello', line: '[YOUR LINE: greeting, e.g. who you are in one breath]' },
  { id: 'from', label: 'Where from', line: '[YOUR LINE: where you come from and where you are now]' },
  { id: 'why', label: 'What drives me', line: '[YOUR LINE: what pulls you toward building things]' },
  { id: 'build', label: 'What I build', line: '[YOUR LINE: what you make and for whom]' },
  { id: 'enter', label: 'Come in', line: '[YOUR LINE: the invitation into the portfolio]' }
];

const SEEN_KEY = 'v3-story-seen';

function Words({ text, progress, range = [0.1, 0.6] }) {
  // reveals the line word by word as the beat scrolls
  const words = text.split(' ');
  return (
    <p className="st-line">
      {words.map((w, i) => {
        const a = range[0] + ((range[1] - range[0]) * i) / words.length;
        return <Word key={i} progress={progress} from={a} to={a + 0.08}>{w}</Word>;
      })}
    </p>
  );
}
function Word({ progress, from, to, children }) {
  const opacity = useTransform(progress, [from, to], [0.15, 1]);
  return <motion.span style={{ opacity }}>{children} </motion.span>;
}

function Beat({ beat, index, children }) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  return (
    <section ref={ref} className={`st-beat st-${beat.id}`} aria-labelledby={`st-${beat.id}-label`}>
      <div className="st-stage">
        <span className="st-label" id={`st-${beat.id}-label`}>0{index + 1} · {beat.label}</span>
        {children(scrollYProgress)}
        <Words text={beat.line} progress={scrollYProgress} />
      </div>
    </section>
  );
}

// Grey placeholder visuals, one per beat. Shapes only, to judge timing and layout.
const Visual = {
  hello: function Visual_hello({ p }) {
    const scale = useTransform(p, [0, 0.5], [0.6, 1]);
    const opacity = useTransform(p, [0, 0.3], [0, 1]);
    return <motion.div className="st-ph st-sun" style={{ scale, opacity }}><span>brush stroke greeting</span></motion.div>;
  },
  from: function Visual_from({ p }) {
    const left = useTransform(p, [0.15, 0.85], ['8%', '86%']);
    const top = useTransform(p, [0.15, 0.5, 0.85], ['62%', '42%', '58%']);
    return (
      <div className="st-ph st-map">
        <span className="st-pin a">Jeddah</span><span className="st-pin b">Penn State</span>
        <motion.span className="st-boat" style={{ left, top }}>boat</motion.span>
        <span className="st-note">woodblock map</span>
      </div>
    );
  },
  why: function Visual_why({ p }) {
    const x = useTransform(p, [0, 1], ['60vw', '-60vw']);
    return <div className="st-ph st-sky"><motion.span className="st-crane" style={{ x }}>crane</motion.span></div>;
  },
  build: function Visual_build({ p }) {
    const items = ['mic', 'lantern', 'book'];
    return (
      <div className="st-ph st-sea">
        {items.map((name, i) => <Rise key={name} p={p} i={i} name={name} />)}
        <span className="st-note">3D objects rise from the sea</span>
      </div>
    );
  },
  enter: function Visual_enter({ p }) {
    const scale = useTransform(p, [0, 1], [1, 1.25]);
    return <motion.div className="st-ph st-scroll" style={{ scale }}><span>hanging scroll opens below</span></motion.div>;
  }
};
function Rise({ p, i, name }) {
  const y = useTransform(p, [0.1 + i * 0.15, 0.45 + i * 0.15], [120, 0]);
  const opacity = useTransform(p, [0.1 + i * 0.15, 0.3 + i * 0.15], [0, 1]);
  return <motion.span className="st-obj" style={{ y, opacity }}>{name}</motion.span>;
}

// Where the portfolio starts: the end of the hanging scroll, fully open (or the hero when motion is off).
function portfolioTop() {
  const sx = document.querySelector('.sx');
  if (sx) return sx.getBoundingClientRect().top + scrollY + sx.offsetHeight - innerHeight;
  const el = document.getElementById('top');
  return el ? el.getBoundingClientRect().top + scrollY : 0;
}

export default function StoryIntro() {
  const { motionOn } = usePrefs();
  const ref = useRef(null);
  const [seen] = useState(() => { try { return localStorage.getItem(SEEN_KEY) === '1'; } catch { return false; } });
  const [active, setActive] = useState(0);
  const [inStory, setInStory] = useState(true);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  useMotionValueEvent(scrollYProgress, 'change', v => {
    setActive(Math.min(BEATS.length - 1, Math.floor(v * BEATS.length)));
    setInStory(v < 0.97);
    if (v > 0.95) { try { localStorage.setItem(SEEN_KEY, '1'); } catch { /* storage blocked */ } }
  });

  // Returning visitors land past the story, at the portfolio.
  useEffect(() => {
    if (seen && !location.hash) {
      requestAnimationFrame(() => scrollTo({ top: portfolioTop(), behavior: 'instant' }));
    }
  }, [seen]);

  const skip = () => {
    try { localStorage.setItem(SEEN_KEY, '1'); } catch { /* storage blocked */ }
    scrollTo({ top: portfolioTop(), behavior: motionOn ? 'smooth' : 'instant' });
  };

  if (!motionOn) {
    // Motion off: the story as plain text, then the portfolio.
    return (
      <section className="st-plain" aria-label="About Rayyan">
        {BEATS.map((b, i) => <p key={b.id}><span className="st-label">0{i + 1} · {b.label}</span>{b.line}</p>)}
      </section>
    );
  }

  return (
    <div ref={ref} className="story" aria-label="A short story about Rayyan">
      {BEATS.map((b, i) => (
        <Beat key={b.id} beat={b} index={i}>{p => { const V = Visual[b.id]; return <V p={p} />; }}</Beat>
      ))}
      <AnimatePresence>{inStory && (
      <motion.div className="st-dock" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}>
        <div className="st-dots" aria-hidden="true">{BEATS.map((b, i) => <i key={b.id} className={i <= active ? 'on' : ''} />)}</div>
        <button type="button" className="st-skip" onClick={skip}>Skip to portfolio</button>
      </motion.div>
      )}</AnimatePresence>
    </div>
  );
}

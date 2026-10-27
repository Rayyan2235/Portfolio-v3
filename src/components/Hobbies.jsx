import { useState } from 'react';
import { motion } from 'motion/react';
import { usePrefs } from '../prefs.jsx';
import { siu } from '../audio.js';

// Off the clock: the things outside code, written on ema, the wooden wish plaques that hang at Japanese shrines.
// Behind them, the red sky and plum branches of Hiroshige's Plum Garden at Kameido (red, like Old Trafford).
// Ink drawings are plain SVG; the plaques sway with CSS and tilt toward the pointer.

const Ball = () => (
  <svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="24" /><path d="M32 20 l10 7 -4 12 h-12 l-4 -12 z" className="fill" /><path d="M32 8 v12 M42 27 l13 -5 M38 39 l8 11 M26 39 l-8 11 M22 27 l-13 -5" /></svg>
);
const Dumbbell = () => (
  <svg viewBox="0 0 64 64" aria-hidden="true"><rect x="8" y="22" width="8" height="20" rx="2" className="fill" /><rect x="48" y="22" width="8" height="20" rx="2" className="fill" /><rect x="16" y="26" width="5" height="12" rx="1.5" /><rect x="43" y="26" width="5" height="12" rx="1.5" /><path d="M21 32 h22" /></svg>
);
const Bowl = () => (
  <svg viewBox="0 0 64 64" aria-hidden="true"><path d="M10 32 h44 c0 12 -10 20 -22 20 s-22 -8 -22 -20 z" /><path d="M20 26 c2 -4 0 -6 2 -10 M32 26 c2 -4 0 -6 2 -10 M44 26 c2 -4 0 -6 2 -10" /><path d="M38 8 l14 22 M44 6 l12 22" /></svg>
);
const Pad = () => (
  <svg viewBox="0 0 64 64" aria-hidden="true"><path d="M16 22 h32 c7 0 10 6 10 14 s-3 12 -8 12 c-5 0 -7 -6 -12 -6 h-12 c-5 0 -7 6 -12 6 s-8 -4 -8 -12 s3 -14 10 -14 z" /><path d="M20 30 v8 M16 34 h8" /><circle cx="42" cy="31" r="2" className="fill" /><circle cx="47" cy="36" r="2" className="fill" /></svg>
);

const EMA = [
  { id: 'football', Icon: Ball, title: 'Football', line: 'Manchester United, every season.', extra: 'GOAT: Ronaldo', number: '7' },
  { id: 'gym', Icon: Dumbbell, title: 'The gym', line: 'Where I go to reset.' },
  { id: 'food', Icon: Bowl, title: 'Good food', line: 'I like to eat. Send me your best spot.' },
  { id: 'games', Icon: Pad, title: 'Games', line: 'A few rounds here and there.' }
];

function Ema({ e, i }) {
  const { motionOn } = usePrefs();
  const [siu, setSiu] = useState(0);
  const tilt = ev => {
    if (!motionOn || ev.pointerType !== 'mouse') return;
    const r = ev.currentTarget.getBoundingClientRect();
    ev.currentTarget.style.setProperty('--tx', `${((ev.clientX - r.left) / r.width - 0.5) * 14}deg`);
  };
  const isBall = e.id === 'football';
  return (
    <motion.li className={`ema ema-${e.id}`} style={{ '--i': i }}
      initial={{ opacity: 0, y: -30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.7, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}>
      <span className="ema-cord" aria-hidden="true" />
      <div className="ema-board" onPointerMove={tilt} onPointerLeave={ev => ev.currentTarget.style.setProperty('--tx', '0deg')}
        {...(isBall ? { role: 'button', tabIndex: 0, 'aria-label': 'Football: Manchester United. GOAT: Ronaldo. Press for his celebration, with sound.',
          onClick: () => { setSiu(n => n + 1); siu(); }, onKeyDown: ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); setSiu(n => n + 1); siu(); } } } : {})}>
        <span className="ema-hole" aria-hidden="true" />
        <span className="ema-icon"><e.Icon /></span>
        <h3>{e.title}</h3>
        <p>{e.line}</p>
        {e.extra && <span className="ema-extra"><b>{e.number}</b>{e.extra}</span>}
        {isBall && siu > 0 && <span key={siu} className="ema-siu" aria-hidden="true">Siuuu!</span>}
      </div>
    </motion.li>
  );
}

export default function Hobbies() {
  return (
    <section className="hobby" id="hobbies" aria-labelledby="hobby-title">
      <div className="hobby-art" aria-hidden="true"><img src="/art/story/kameido.jpg" alt="" draggable={false} /></div>
      <div className="wrap hobby-wrap">
        <div className="hobby-head">
          <span className="label">Off the clock</span>
          <h2 id="hobby-title">When the laptop closes</h2>
        </div>
        <ul className="ema-rail">{EMA.map((e, i) => <Ema key={e.id} e={e} i={i} />)}</ul>
        <p className="hobby-hint" aria-hidden="true">Tap the football one.</p>
      </div>
    </section>
  );
}

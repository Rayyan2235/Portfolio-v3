import { useEffect, useState, useRef } from 'react';
import { motion, useScroll, useSpring, useTransform } from 'motion/react';
import { usePrefs } from '../prefs.jsx';

// Adapted from 21st.dev's "scroll-expansion-hero" (ScrollExpandMedia).
// Changes for this site: plain React + motion instead of Next.js, Tailwind and TypeScript;
// a sticky scroll section instead of hijacking the wheel, so keyboard and trackpad scrolling keep working;
// the media is the live Great Wave hero, opening like a hanging scroll.
const ease = t => 1 - Math.pow(1 - t, 3);

export default function ScrollExpandHero({ children, first = 'Rayyan', rest = 'Syed', kicker = 'Software engineer', hint = 'Scroll to open' }) {
  const { motionOn } = usePrefs();
  const ref = useRef(null);
  const [vp, setVp] = useState(() => ({ w: typeof innerWidth === 'number' ? innerWidth : 1440, h: typeof innerHeight === 'number' ? innerHeight : 900 }));
  useEffect(() => {
    const on = () => setVp({ w: innerWidth, h: innerHeight });
    addEventListener('resize', on); return () => removeEventListener('resize', on);
  }, []);

  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  const p = useSpring(scrollYProgress, { stiffness: 140, damping: 26, mass: 0.35 });
  const mobile = vp.w < 768;
  const w0 = mobile ? Math.min(240, vp.w * 0.62) : 300, h0 = mobile ? 340 : 420;
  // read the live viewport: the size captured at load can be stale (or 0 in a background tab)
  const width = useTransform(p, v => w0 + ((innerWidth || vp.w) - w0) * ease(v));
  const height = useTransform(p, v => h0 + ((innerHeight || vp.h) - h0) * ease(v));
  const radius = useTransform(p, [0, 0.9, 1], [14, 6, 0]);
  const spread = useTransform(p, [0, 0.85], [0, mobile ? 70 : 48]);
  const left = useTransform(spread, s => `-${s}vw`), right = useTransform(spread, s => `${s}vw`);
  const titleOpacity = useTransform(p, [0.55, 0.85], [1, 0]);
  const bgOpacity = useTransform(p, [0, 0.9], [1, 0]);
  const reveal = useTransform(p, [0.86, 1], [0, 1]);
  const frame = useTransform(p, [0, 0.8], [1, 0]);

  if (!motionOn) return <div className="sx-off">{children}</div>;

  return (
    <div ref={ref} className="sx">
      <div className="sx-sticky">
        <motion.div className="sx-bg" style={{ opacity: bgOpacity }} aria-hidden="true" />
        <motion.div className="sx-media" style={{ width, height, borderRadius: radius, '--reveal': reveal }}>
          {children}
          <motion.span className="sx-rod top" style={{ opacity: frame }} aria-hidden="true" />
          <motion.span className="sx-rod bottom" style={{ opacity: frame }} aria-hidden="true" />
        </motion.div>
        <motion.div className="sx-title" style={{ opacity: titleOpacity }} aria-hidden="true">
          <motion.span className="sx-kicker" style={{ x: left }}>{kicker}</motion.span>
          <motion.span className="sx-word" style={{ x: left }}>{first}</motion.span>
          <motion.span className="sx-word" style={{ x: right }}>{rest}</motion.span>
          <motion.span className="sx-hint" style={{ x: right }}>{hint}</motion.span>
        </motion.div>
      </div>
    </div>
  );
}

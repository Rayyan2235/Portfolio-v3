import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'motion/react';
import { usePrefs } from '../prefs.jsx';
import { resolveSky } from '../sky.js';

// The mountain valley behind Work: Rayyan's ink painting (public/art/mountains.jpg), kept in step with the
// visitor's sky like the hero. Dawn and dusk wash it warm and turn the painted moon into a sun, day leaves the
// ink blue, night sinks it into indigo with the real moon glowing and stars out. Kumo clouds drift across it.
// Everything sits on a frame with the painting's own aspect ratio, so the sun and stars line up with the art
// however the section crops it.

function Kumo({ x, y, w, flip }) {
  const curl = (cx, dir) => (
    <g transform={`translate(${cx} ${y + 11}) scale(${dir} 1)`}>
      <circle r="17" />
      <path d="M0 -9 a9 9 0 1 1 -9 9 a5 5 0 1 1 5 -5" fill="none" />
    </g>
  );
  return (
    <g className="mtn-kumo">
      <rect x={x} y={y} width={w} height="22" rx="11" />
      {curl(flip ? x + w : x, flip ? 1 : -1)}
      <rect x={x + w * 0.2} y={y - 16} width={w * 0.45} height="18" rx="9" />
      {curl(x + w * 0.2, -1)}
    </g>
  );
}

const STARS = Array.from({ length: 34 }, (_, i) => ({ x: (i * 41.3) % 100, y: (i * 17.9) % 34, d: (i * 0.53) % 4, s: i % 7 === 0 ? 3 : 1.6 }));

export default function MountainSky() {
  const ref = useRef(null);
  const { motionOn, sky } = usePrefs();
  const mode = resolveSky(sky);
  const { scrollYProgress: p } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(p, [0, 1], [50, -50]);
  return (
    <div ref={ref} className={`mtn mtn-${mode}`} aria-hidden="true">
      <motion.div className="mtn-frame" style={motionOn ? { y } : undefined}>
        <img className="mtn-art" src="/art/mountains.jpg" alt="" />
        <svg className="mtn-clouds" viewBox="0 0 1584 672" preserveAspectRatio="none">
          <g className="mtn-drift slow"><Kumo x={120} y={300} w={300} /><Kumo x={1060} y={250} w={260} flip /></g>
          <g className="mtn-drift"><Kumo x={560} y={440} w={420} flip /><Kumo x={-30} y={520} w={300} /></g>
        </svg>
        <span className="mtn-tint" />
        <span className="mtn-orb" />
        <div className="mtn-stars">{STARS.map((s, i) => <i key={i} style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.s, height: s.s, animationDelay: `${-s.d}s` }} />)}</div>
      </motion.div>
    </div>
  );
}

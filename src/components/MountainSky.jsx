import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'motion/react';
import { usePrefs } from '../prefs.jsx';

// Rose dusk mountains behind Work: a lone figure on a cliff watches a far peak through Japanese clouds.
// Drawn as woodblock layers (bokashi gradients, outlined kumo clouds), all SVG, transforms only.
// The key pieces sit near x 600 to 1000 so a phone's narrow crop still shows the peak and the figure.

const rng = s => () => (s = (s * 16807) % 2147483647) / 2147483647;
function ridge(seed, y, amp, step) {
  const r = rng(seed);
  let d = `M0 900 L0 ${y}`;
  for (let x = 0; x <= 1600; x += step) {
    const h = 0.55 * Math.sin(x / 190 + seed) + 0.3 * Math.sin(x / 67 + seed * 2) + 0.35 * r();
    d += ` L${x} ${(y - amp * h).toFixed(1)}`;
  }
  return d + ' L1600 900 Z';
}
const FAR = ridge(11, 600, 70, 28);
const MID = ridge(29, 690, 80, 22);

// a kumo cloud: a long band with spiral curls at the ends, outlined like a print
function Kumo({ x, y, w, flip, className }) {
  const curl = (cx, dir) => (
    <g transform={`translate(${cx} ${y + 11}) scale(${dir} 1)`}>
      <circle r="17" />
      <path d="M0 -9 a9 9 0 1 1 -9 9 a5 5 0 1 1 5 -5" fill="none" />
    </g>
  );
  return (
    <g className={`st-kumo ${className || ''}`}>
      <rect x={x} y={y} width={w} height="22" rx="11" />
      {curl(flip ? x + w : x, flip ? 1 : -1)}
      <rect x={x + w * 0.2} y={y - 16} width={w * 0.45} height="18" rx="9" />
      {curl(x + w * 0.2, -1)}
    </g>
  );
}

export default function MountainSky() {
  const ref = useRef(null);
  const { motionOn } = usePrefs();
  const { scrollYProgress: p } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const far = useTransform(p, [0, 1], [50, -40]);
  const mid = useTransform(p, [0, 1], [90, -70]);
  const near = useTransform(p, [0, 1], [150, -120]);
  const sun = useTransform(p, [0, 1], [80, -20]);
  const m = v => (motionOn ? { y: v } : undefined);
  return (
    <div ref={ref} className="mtn" aria-hidden="true">
      <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice">
        <defs>
          <linearGradient id="mtn-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff8ee" /><stop offset=".3" stopColor="#fbe1d8" /><stop offset=".75" stopColor="#f2bfbd" /><stop offset="1" stopColor="#efb3b5" />
          </linearGradient>
          <linearGradient id="mtn-peak" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#9a5a74" /><stop offset=".55" stopColor="#c98c9c" /><stop offset="1" stopColor="#f2c6c4" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="mtn-far" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#b97c90" /><stop offset="1" stopColor="#f0c4c3" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="mtn-mid" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#7d4a63" /><stop offset=".8" stopColor="#d9a3ad" stopOpacity=".2" />
          </linearGradient>
          <linearGradient id="mtn-near" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#3b2436" /><stop offset="1" stopColor="#5a3a4f" />
          </linearGradient>
          <filter id="mtn-ink" x="-2%" y="-2%" width="104%" height="104%">
            <feTurbulence type="fractalNoise" baseFrequency="0.012 0.05" numOctaves="2" seed="5" result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale="10" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
        <rect width="1600" height="900" fill="url(#mtn-sky)" />

        <motion.circle cx="1120" cy="170" r="70" fill="#d9493a" style={m(sun)} />

        {/* the lone peak, snow cap printed slightly off register */}
        <motion.g style={m(far)}>
          <path d="M420 640 C 600 560, 730 360, 800 268 L 836 262 C 900 350, 1040 560, 1240 640 Z" fill="url(#mtn-peak)" />
          <path d="M800 268 L836 262 C 858 292, 880 322, 902 352 L 880 344 L 862 362 L 846 340 L 826 360 L 808 338 L 788 356 L 770 340 C 780 316, 790 290, 800 268 Z" fill="#fff8ee" transform="translate(2 1)" />
          <path d={FAR} fill="url(#mtn-far)" filter="url(#mtn-ink)" />
        </motion.g>

        <g className="mtn-drift slow"><Kumo x={180} y={250} w={360} /><Kumo x={1080} y={200} w={300} flip /></g>
        <motion.g style={m(mid)}>
          <path d={MID} fill="url(#mtn-mid)" filter="url(#mtn-ink)" />
        </motion.g>
        <g className="mtn-drift"><Kumo x={560} y={520} w={480} flip className="front" /><Kumo x={-40} y={600} w={340} className="front" /></g>

        {/* near cliff with pines and the lone figure at its edge */}
        <motion.g style={m(near)}>
          <path d="M0 900 L0 690 L120 676 L260 700 L380 684 L520 712 L640 698 L700 706 L740 760 L760 900 Z" fill="url(#mtn-near)" filter="url(#mtn-ink)" />
          <g fill="#2e1c2b">
            <path d="M210 690 C 214 640, 230 600, 222 560 L 228 560 C 238 600, 226 646, 222 692 Z" />
            <path d="M222 600 L170 586 M224 572 L270 552 M224 548 L196 532" stroke="#2e1c2b" strokeWidth="5" strokeLinecap="round" />
            <ellipse cx="158" cy="584" rx="38" ry="9" /><ellipse cx="186" cy="576" rx="26" ry="8" />
            <ellipse cx="270" cy="550" rx="36" ry="9" /><ellipse cx="292" cy="544" rx="20" ry="7" />
            <ellipse cx="196" cy="530" rx="28" ry="8" /><ellipse cx="226" cy="514" rx="20" ry="7" />
            <path d="M420 690 C 424 662, 432 640, 428 616 L 433 616 C 440 640, 432 664, 430 692 Z" />
            <ellipse cx="412" cy="626" rx="36" ry="8" /><ellipse cx="444" cy="610" rx="28" ry="7" />
          </g>
          <g transform="translate(676 702)" fill="#24161f">
            <path d="M-13 -46 L13 -46 L0 -56 Z" />
            <circle cx="0" cy="-42" r="5" />
            <path d="M-6 -38 L6 -38 L11 -8 L5 -8 L4 0 L-4 0 L-5 -8 L-11 -8 Z" />
            <path d="M8 -30 L22 -16" stroke="#24161f" strokeWidth="2" strokeLinecap="round" />
          </g>
        </motion.g>
      </svg>
    </div>
  );
}

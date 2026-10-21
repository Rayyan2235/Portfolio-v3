import { useEffect, useRef } from 'react';
import { usePrefs } from '../prefs.jsx';
import { resolveSky } from '../sky.js';

// A few things drifting across the whole page, keyed to the sky:
// petals at dawn and day, maple leaves at dusk, fireflies at night (a nod to FireFly), nothing in a storm.
export default function Ambient() {
  const { motionOn, sky } = usePrefs();
  const ref = useRef(null);
  const live = useRef({});
  live.current = { motionOn, mode: resolveSky(sky) };

  useEffect(() => {
    const cv = ref.current, c = cv.getContext('2d');
    let W = 0, H = 0, raf = 0, items = [], lastMode = '';
    const size = () => { const d = Math.min(devicePixelRatio || 1, 2); W = innerWidth; H = innerHeight; cv.width = W * d; cv.height = H * d; c.setTransform(d, 0, 0, d, 0, 0); };
    size(); addEventListener('resize', size);
    const spawn = (mode, any) => ({
      x: Math.random() * W, y: any ? Math.random() * H : -20, s: mode === 'dusk' ? 7 + Math.random() * 6 : 4 + Math.random() * 4,
      vx: 0.2 + Math.random() * 0.4, vy: mode === 'night' ? (Math.random() - 0.5) * 0.2 : 0.35 + Math.random() * 0.5,
      r: Math.random() * 6, ph: Math.random() * 6,
      col: mode === 'dusk' ? ['#b8432a', '#d9622b', '#c9a24a'][(Math.random() * 3) | 0] : ['#f2b8c6', '#d9788f', '#fdf0f2'][(Math.random() * 3) | 0]
    });
    const loop = () => {
      const { motionOn: mo, mode } = live.current;
      c.clearRect(0, 0, W, H);
      if (!mo || mode === 'storm') { items = []; raf = requestAnimationFrame(loop); return; }
      if (mode !== lastMode) { lastMode = mode; items = Array.from({ length: mode === 'night' ? 22 : 12 }, () => spawn(mode, true)); }
      // fireflies belong to the night hero; fade them out once you scroll past it
      cv.style.opacity = mode === 'night' ? String(Math.max(0, 1 - scrollY / (innerHeight * 0.8))) : '1';
      for (const p of items) {
        p.ph += 0.02;
        if (mode === 'night') {
          p.x += p.vx * 0.4 * Math.sin(p.ph); p.y += p.vy + Math.cos(p.ph * 0.7) * 0.15;
          if (p.y < -10 || p.y > H + 10 || p.x > W + 10) Object.assign(p, spawn(mode, true));
          const a = 0.35 + 0.65 * Math.max(0, Math.sin(p.ph * 1.7));
          const g = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, 10); g.addColorStop(0, `rgba(255,214,120,${a})`); g.addColorStop(1, 'rgba(255,214,120,0)');
          c.fillStyle = g; c.beginPath(); c.arc(p.x, p.y, 10, 0, 7); c.fill();
          continue;
        }
        p.x += p.vx + Math.sin(p.ph) * 0.4; p.y += p.vy; p.r += 0.01;
        if (p.y > H + 20 || p.x > W + 20) Object.assign(p, spawn(mode, false));
        c.save(); c.translate(p.x, p.y); c.rotate(p.r); c.scale(1, Math.cos(p.ph * 1.3)); c.globalAlpha = 0.75;
        c.beginPath(); c.ellipse(0, 0, p.s * 0.6, p.s, 0, 0, 7); c.fillStyle = p.col; c.fill(); c.restore();
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); removeEventListener('resize', size); };
  }, []);

  return <canvas ref={ref} className="ambient" aria-hidden="true" />;
}

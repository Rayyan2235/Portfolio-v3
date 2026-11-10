import { useEffect, useRef } from 'react';
import { usePrefs } from '../prefs.jsx';

// Third round of pieces after award winning portfolios, kept to DOM transforms and clip paths.

// Footprints, after the Codrops image trail: walk the mouse across a section and small ink footprints follow,
// left and right in turn, turned toward where you are heading, fading as they go. A fixed pool of 14 elements
// is reused, so nothing piles up. Mouse only.
export function Footprints({ target }) {
  const { motionOn } = usePrefs();
  const layer = useRef(null);
  useEffect(() => {
    const host = target.current, el = layer.current;
    if (!motionOn || !host || !el || !matchMedia('(pointer: fine)').matches) return undefined;
    const pool = Array.from({ length: 14 }, () => {
      const f = document.createElement('i');
      f.className = 'fp';
      el.appendChild(f);
      return f;
    });
    let n = 0, lx = null, ly = null, side = 1;
    const move = e => {
      const r = host.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      if (lx === null) { lx = x; ly = y; return; }
      const dx = x - lx, dy = y - ly, d = Math.hypot(dx, dy);
      if (d < 46) return;
      const a = Math.atan2(dy, dx), nx = -Math.sin(a), ny = Math.cos(a);
      side = -side;
      const f = pool[n++ % pool.length];
      f.style.left = `${x + nx * 9 * side}px`;
      f.style.top = `${y + ny * 9 * side}px`;
      f.style.setProperty('--a', `${(a * 180) / Math.PI + 90}deg`);
      f.classList.toggle('r', side > 0);
      f.classList.remove('on'); void f.offsetWidth; f.classList.add('on');
      lx = x; ly = y;
    };
    const leave = () => { lx = ly = null; };
    host.addEventListener('pointermove', move, { passive: true });
    host.addEventListener('pointerleave', leave);
    return () => { host.removeEventListener('pointermove', move); host.removeEventListener('pointerleave', leave); pool.forEach(f => f.remove()); };
  }, [motionOn, target]);
  return <div className="fp-layer" ref={layer} aria-hidden="true" />;
}


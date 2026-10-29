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

// Ink lens, after Olivier Larose's mask cursor (the awwwards style "hidden text" hover): a soft circle follows the
// pointer over the statement and shows a second line written underneath. On touch it stays closed.
export function InkLens({ under, children }) {
  const ref = useRef(null);
  const { motionOn } = usePrefs();
  useEffect(() => {
    const el = ref.current;
    if (!motionOn || !el || !matchMedia('(pointer: fine)').matches) return undefined;
    const move = e => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--lx', `${e.clientX - r.left}px`);
      el.style.setProperty('--ly', `${e.clientY - r.top}px`);
      el.classList.add('lens-on');
    };
    const leave = () => el.classList.remove('lens-on');
    el.addEventListener('pointermove', move, { passive: true });
    el.addEventListener('pointerleave', leave);
    return () => { el.removeEventListener('pointermove', move); el.removeEventListener('pointerleave', leave); };
  }, [motionOn]);
  return (
    <div className="lens" ref={ref}>
      {children}
      <p className="lens-under" aria-hidden="true">{under}</p>
    </div>
  );
}

// The one frame loop every canvas effect shares. It draws only while the element is on screen, at most `fps` frames a
// second, and stops asking for frames at all once the element scrolls away. `frame(now, dt)` gets dt in seconds,
// capped so a tab coming back from the background never jumps. Returns the cleanup for a useEffect.
//
// When nobody is scrolling, moving the pointer, touching or typing for a moment, a loop with an `idleFps` eases down
// to it: twinkles and drifting clouds read the same at 30 frames a second, and a page left open stays cool and quiet.
// The first seconds after a loop starts count as active, so an opening animation always plays at full rate.
const IDLE_AFTER = 1500;
let lastActive = performance.now();
const wake = () => { lastActive = performance.now(); };
if (typeof addEventListener === 'function') {
  for (const type of ['scroll', 'wheel', 'pointermove', 'pointerdown', 'touchmove', 'keydown']) addEventListener(type, wake, { passive: true, capture: true });
}
/** true while the visitor is interacting (or just was) */
export const activeNow = (now = performance.now()) => now - lastActive < IDLE_AFTER;

export function loopWhileVisible(el, frame, { fps = 30, idleFps = fps, onResize } = {}) {
  // a little under the frame budget, so a 120 or 144 Hz screen draws every second refresh instead of every third
  const gap = 1000 / fps * 0.8, idleGap = 1000 / idleFps * 0.8;
  let raf = 0, vis = false, last = 0;
  const started = performance.now(), warm = started + 4500;
  const tick = now => {
    raf = 0;
    if (!vis) return;
    raf = requestAnimationFrame(tick);
    if (now - last < (now < warm || activeNow(now) ? gap : idleGap)) return;
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / fps;
    last = now;
    frame(now, dt);
  };
  const io = new IntersectionObserver(([e]) => {
    vis = e.isIntersecting;
    if (vis && !raf) { last = 0; raf = requestAnimationFrame(tick); }
  });
  io.observe(el);
  const ro = onResize && new ResizeObserver(onResize);
  if (ro) ro.observe(el);
  return () => { cancelAnimationFrame(raf); io.disconnect(); if (ro) ro.disconnect(); };
}

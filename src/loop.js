// The one frame loop every canvas effect shares. It draws only while the element is on screen, at most `fps` frames a
// second, and stops asking for frames at all once the element scrolls away. `frame(now, dt)` gets dt in seconds,
// capped so a tab coming back from the background never jumps. Returns the cleanup for a useEffect.
export function loopWhileVisible(el, frame, { fps = 30, onResize } = {}) {
  const gap = 1000 / fps - 2;
  let raf = 0, vis = false, last = 0;
  const tick = now => {
    raf = 0;
    if (!vis) return;
    raf = requestAnimationFrame(tick);
    if (now - last < gap) return;
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

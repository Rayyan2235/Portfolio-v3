// One way to move the page. While Lenis is gliding, a plain window.scrollTo is overwritten on its next frame, so a
// nav jump or a Skip made mid glide would bounce back. Every scripted scroll goes through here instead: Lenis when it
// is running (desktop wheel with motion on), the browser otherwise.
let lenis = null;
export const setLenis = l => { lenis = l; };

export function scrollToY(top, { smooth = false } = {}) {
  if (lenis) lenis.scrollTo(top, smooth ? { duration: 1.6, force: true } : { immediate: true, force: true });
  else scrollTo({ top, behavior: smooth ? 'smooth' : 'instant' });
}

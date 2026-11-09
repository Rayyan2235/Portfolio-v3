import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';

// Snapshots: photos from life off the screen, as instant prints pegged to a line. Any image dropped into
// src/assets/gallery/ shows up here, captioned from its file name ("football-sunday-league.jpg" reads
// "Football sunday league"); prefix a number to set the order ("01-football.jpg"). With no photos yet, the
// section shows empty frames while developing and nothing at all on the live site.
const FILES = import.meta.glob('../assets/gallery/*.{jpg,jpeg,png,webp,avif}', { eager: true, import: 'default' });
const PHOTOS = Object.entries(FILES).sort(([a], [b]) => a.localeCompare(b)).map(([path, src]) => {
  const words = path.split('/').pop().replace(/\.\w+$/, '').replace(/^\d+[-_ ]*/, '').replace(/[-_]+/g, ' ').trim();
  return { src, caption: words.charAt(0).toUpperCase() + words.slice(1) };
});
const PLACEHOLDERS = ['Football', 'Hiking', 'The gym', 'Good food', 'Games'].map(caption => ({ caption }));
const TILT = [-3, 2, -1.5, 3, -2.5, 1];

export default function Gallery() {
  const items = PHOTOS.length ? PHOTOS : import.meta.env.DEV ? PLACEHOLDERS : [];
  const [open, setOpen] = useState(null);
  useEffect(() => {
    if (open === null) return undefined;
    const onKey = e => { if (e.key === 'Escape') setOpen(null); };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [open]);
  if (!items.length) return null;
  return (
    <section className="gal" id="gallery" aria-labelledby="gal-title">
      <div className="wrap">
        <div className="head"><span className="label">Snapshots</span><h2 id="gal-title">A little about me</h2></div>
      </div>
      <ul className="gal-line">
        {items.map((g, i) => (
          <li key={g.caption + i} className="gal-print" style={{ '--r': `${TILT[i % TILT.length]}deg`, '--i': i }}>
            <span className="gal-peg" aria-hidden="true" />
            {g.src
              ? <button type="button" className="gal-photo" onClick={() => setOpen(i)} aria-label={`Open photo: ${g.caption}`}><img src={g.src} alt="" loading="lazy" decoding="async" /></button>
              : <span className="gal-photo gal-empty">Drop a photo in<br /><code>src/assets/gallery</code></span>}
            <p>{g.caption}</p>
          </li>
        ))}
      </ul>
      <AnimatePresence>
        {open !== null && items[open]?.src && (
          <motion.div className="gal-view" role="dialog" aria-label={items[open].caption} onClick={() => setOpen(null)}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.figure initial={{ scale: 0.92, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, opacity: 0 }}>
              <img src={items[open].src} alt={items[open].caption} />
              <figcaption>{items[open].caption}</figcaption>
            </motion.figure>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

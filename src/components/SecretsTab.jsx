import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { SECRETS, read } from './Secrets.jsx';

// A small tab on the right edge says how many secrets the page hides and how many you have found. Open it for a
// hint to each one; a found secret shows what you did instead of its hint. Ctrl K can open it too.
const IDS = Object.keys(SECRETS);

export default function SecretsTab() {
  const [open, setOpen] = useState(false);
  const [found, setFound] = useState(read);
  const close = useRef(null), tab = useRef(null);
  useEffect(() => {
    const sync = () => setFound(read());
    const show = () => setOpen(true);
    addEventListener('v3:secrets-changed', sync); addEventListener('v3:secrets-open', show);
    return () => { removeEventListener('v3:secrets-changed', sync); removeEventListener('v3:secrets-open', show); };
  }, []);
  useEffect(() => {
    if (!open) return undefined;
    close.current?.focus();
    const k = e => { if (e.key === 'Escape') setOpen(false); };
    addEventListener('keydown', k);
    return () => { removeEventListener('keydown', k); tab.current?.focus({ preventScroll: true }); };
  }, [open]);
  const n = found.filter(id => SECRETS[id]).length;
  return (
    <>
      <button ref={tab} type="button" className="sec-tab" onClick={() => setOpen(true)} aria-haspopup="dialog" aria-label={`Secrets: ${n} of ${IDS.length} found`}>
        <span className="sec-lamp" aria-hidden="true" />
        <span className="sec-word">Secrets</span>
        <b>{n}/{IDS.length}</b>
      </button>
      <AnimatePresence>
        {open && (
          <>
            <motion.div className="scrim" onClick={() => setOpen(false)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
            <motion.aside className="sec-panel" role="dialog" aria-modal="true" aria-labelledby="sec-title"
              initial={{ x: '105%' }} animate={{ x: 0 }} exit={{ x: '105%' }} transition={{ type: 'spring', stiffness: 260, damping: 32 }}>
              <div className="sec-top">
                <h2 id="sec-title">{IDS.length} secrets</h2>
                <button ref={close} type="button" className="x" onClick={() => setOpen(false)} aria-label="Close secrets">
                  <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" /></svg>
                </button>
              </div>
              <p className="sec-sub">{n === IDS.length ? 'You found every one. Thank you for looking so closely.' : `You have found ${n}. Easiest first; your finds stay with this browser.`}</p>
              <div className="sec-bar" aria-hidden="true"><i style={{ transform: `scaleX(${n / IDS.length})` }} /></div>
              <ol className="sec-list">
                {IDS.map(id => {
                  const got = found.includes(id);
                  return (
                    <li key={id} className={got ? 'got' : ''}>
                      <span className="sec-mark" aria-hidden="true" />
                      <span>{got ? SECRETS[id].found : SECRETS[id].hint}<span className="sr-only">{got ? ' (found)' : ' (not found yet)'}</span></span>
                    </li>
                  );
                })}
              </ol>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

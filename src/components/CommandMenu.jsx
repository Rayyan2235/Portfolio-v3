import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { usePrefs } from '../prefs.jsx';
import { useTransition, KINDS } from './Transitions.jsx';
import { SKIES } from '../sky.js';
import { EMAIL, GITHUB, LINKEDIN } from '../data.js';

export default function CommandMenu({ open, setOpen, toast }) {
  const { setSky, setTransition, motionOn, setMotionOn } = usePrefs();
  const { go } = useTransition();
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);
  const inputRef = useRef(null), opener = useRef(null);

  const cmds = useMemo(() => [
    ['Work', 'Section', () => go('work')],
    ['Experience', 'Section', () => go('experience')],
    ['Off the clock', 'Section', () => go('hobbies')],
    ['Contact', 'Section', () => go('contact')],
    ['Copy email address', EMAIL, () => (navigator.clipboard ? navigator.clipboard.writeText(EMAIL) : Promise.reject()).then(() => toast('Email copied'), () => toast(EMAIL))],
    ['Open GitHub', 'github.com/Rayyan2235', () => { location.href = GITHUB; }],
    ['Open LinkedIn', 'linkedin.com/in/rayyan-syed-5a846725a', () => { location.href = LINKEDIN; }],
    ...['auto', 'dawn', 'day', 'dusk', 'night', 'storm'].map(k => [`Sky: ${k === 'auto' ? 'your time' : SKIES[k].label}`, 'Scene', () => { setSky(k); go('top', undefined, k === 'storm' ? 'storm' : undefined); }]),
    ...['mixed', ...Object.keys(KINDS)].map(k => [`Transition: ${k === 'mixed' ? 'Mixed' : KINDS[k].label}`, 'Preference', () => { setTransition(k); toast('Transition set'); }]),
    [motionOn ? 'Turn motion off' : 'Turn motion on', 'Preference', () => setMotionOn(!motionOn)]
  ], [go, setSky, setTransition, motionOn, setMotionOn, toast]);

  const shown = cmds.filter(c => (c[0] + ' ' + c[1]).toLowerCase().includes(q.toLowerCase()));

  useEffect(() => {
    const onKey = e => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setOpen(o => !o); } };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [setOpen]);

  useEffect(() => {
    if (open) { opener.current = document.activeElement; setQ(''); setSel(0); setTimeout(() => inputRef.current?.focus(), 20); }
    else opener.current?.focus?.();
  }, [open]);

  const run = c => { setOpen(false); setTimeout(c[2], 60); };
  const onKeyDown = e => {
    if (e.key === 'Escape') setOpen(false);
    else if (e.key === 'ArrowDown') { e.preventDefault(); setSel(s => (s + 1) % Math.max(1, shown.length)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSel(s => (s - 1 + shown.length) % Math.max(1, shown.length)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (shown[sel]) run(shown[sel]); }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="cm-wrap" onMouseDown={e => { if (e.target === e.currentTarget) setOpen(false); }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
          <motion.div className="cm" role="dialog" aria-modal="true" aria-label="Jump to" onKeyDown={onKeyDown}
            initial={{ y: -12, scale: 0.98 }} animate={{ y: 0, scale: 1 }} exit={{ y: -8, scale: 0.98 }} transition={{ type: 'spring', stiffness: 420, damping: 34 }}>
            <input ref={inputRef} value={q} onChange={e => { setQ(e.target.value); setSel(0); }} placeholder="Jump to a section, change the sky, or run a command"
              aria-controls="cml" aria-activedescendant={shown.length ? 'cmo' + sel : undefined} />
            <ul id="cml" role="listbox">
              {shown.map((c, i) => (
                <li key={c[0]} id={'cmo' + i} role="option" aria-selected={i === sel} onMouseEnter={() => setSel(i)} onClick={() => run(c)}>
                  <span>{c[0]}</span><small>{c[1]}</small>
                </li>
              ))}
            </ul>
            <div className="foot"><span><kbd>↑</kbd> <kbd>↓</kbd> move</span><span><kbd>Enter</kbd> run</span><span><kbd>Esc</kbd> close</span></div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

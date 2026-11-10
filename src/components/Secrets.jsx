import { useEffect, useRef, useState } from 'react';
import { usePrefs } from '../prefs.jsx';
import { siu as playSiu } from '../audio.js';

// Easter eggs. Anything hidden on the page announces itself with secret('id'); this keeps count across visits,
// thanks the visitor with a toast, and plays the bigger effects. Adding one is a SECRETS entry plus one call.
export const SECRETS = {
  ball: 'You tapped the ball',
  siu: 'You typed siu',
  konami: 'Konami code',
  wish: 'You made a wish on the night sky',
  away: 'You came back',
  crane: 'You set the crane flying',
  ggmu: 'Glory glory Man United',
  owl: 'Up late, like me',
  koi: 'You fed the koi',
  torii: 'You rang the shrine gate',
  stamp: 'You stamped the seal',
  console: 'You knocked on the console door'
};
export const secret = id => window.dispatchEvent(new CustomEvent('v3:secret', { detail: id }));
const KEY = 'v3-secrets';
const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; } };
export const secretsFound = () => read().length;

const KONAMI = ['arrowup', 'arrowup', 'arrowdown', 'arrowdown', 'arrowleft', 'arrowright', 'arrowleft', 'arrowright', 'b', 'a'];
const typing = el => el && (el.isContentEditable || /^(input|textarea|select)$/i.test(el.tagName));

export default function Secrets({ toast }) {
  const { motionOn } = usePrefs();
  const [party, setParty] = useState(null);
  const keys = useRef([]), timer = useRef(0);

  useEffect(() => {
    const play = (kind) => {
      if (!motionOn) return;
      clearTimeout(timer.current);
      setParty({ kind, key: Date.now() });
      timer.current = setTimeout(() => setParty(null), kind === 'shower' ? 4200 : 2600);
    };
    const onSecret = ({ detail: id }) => {
      if (id === 'siu') { playSiu(); play('siu'); }
      if (id === 'konami') play('shower');
      if (id === 'ggmu') play('ggmu');
      const found = read();
      if (found.includes(id) || !SECRETS[id]) return;
      found.push(id);
      try { localStorage.setItem(KEY, JSON.stringify(found)); } catch { /* storage blocked */ }
      toast(`Secret ${found.length} of ${Object.keys(SECRETS).length}: ${SECRETS[id]}`);
    };
    const onKey = e => {
      if (typing(document.activeElement) || e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      keys.current = [...keys.current, k].slice(-KONAMI.length);
      const tail = keys.current.join(' ');
      if (tail.endsWith('s i u')) { keys.current = []; secret('siu'); }
      else if (tail.endsWith('g g m u')) { keys.current = []; secret('ggmu'); }
      else if (tail === KONAMI.join(' ')) { keys.current = []; secret('konami'); }
    };
    // leaving the tab: the title calls you back; coming back counts as a secret
    const title = document.title;
    let left = false;
    const onVis = () => {
      if (document.hidden) { left = true; document.title = 'The lanterns are still lit'; }
      else { document.title = title; if (left) secret('away'); }
    };
    window.addEventListener('v3:secret', onSecret);
    // the R seal in the nav: press it five times in a row and it stamps itself
    let presses = [];
    const onPress = e => {
      const seal = e.target.closest?.('.who-seal');
      if (!seal) return;
      const now = Date.now(); presses = [...presses.filter(p => now - p < 2500), now];
      if (presses.length >= 5) { presses = []; seal.classList.remove('stamped'); void seal.offsetWidth; seal.classList.add('stamped'); secret('stamp'); }
    };
    document.addEventListener('click', onPress);
    // night owls: anyone here between eleven at night and five in the morning, local time
    const hour = new Date().getHours();
    const owl = hour >= 23 || hour < 5 ? setTimeout(() => secret('owl'), 9000) : 0;
    window.addEventListener('keydown', onKey);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.removeEventListener('v3:secret', onSecret); window.removeEventListener('keydown', onKey); document.removeEventListener('click', onPress);
      document.removeEventListener('visibilitychange', onVis); clearTimeout(timer.current); clearTimeout(owl); document.title = title;
    };
  }, [motionOn, toast]);

  // a note for anyone who opens the console
  useEffect(() => {
    console.log('%c\n        /\\\n       /  \\      Rayyan Syed\n      / /\\ \\     you found the console.\n     /_/  \\_\\\n', 'color:#e4572e;font:12px monospace');
    console.log(`%cThere are ${Object.keys(SECRETS).length} secrets on this page. Start with: type siu, try the Konami code, tap the night sky, find the crane. Or type hire() right here.`, 'color:#1d3557;font:13px sans-serif');
    window.hire = () => {
      secret('console');
      console.log('%cThanks for knocking. The fastest way in is email: open the Contact section, or press Ctrl K and pick Email.', 'color:#e4572e;font:13px sans-serif');
      return 'The lanterns are lit.';
    };
    return () => { delete window.hire; };
  }, []);

  if (!party) return null;
  if (party.kind === 'siu' || party.kind === 'ggmu') {
    return (
      <div className="egg-party siu" key={party.key} aria-hidden="true">
        <b>{party.kind === 'siu' ? 'SIUUU' : 'GGMU'}</b>
        {Array.from({ length: 46 }, (_, i) => (
          <i key={i} style={{ '--x': `${(i * 37) % 100}vw`, '--d': `${(i % 9) * 0.06}s`, '--r': `${(i * 53) % 360}deg`, '--c': ['#da291c', '#fff8ee', '#f7b27a', '#1b2433'][i % 4] }} />
        ))}
      </div>
    );
  }
  return (
    <div className="egg-party shower" key={party.key} aria-hidden="true">
      {Array.from({ length: 22 }, (_, i) => <i key={i} style={{ '--x': `${(i * 41) % 110 - 5}vw`, '--y': `${(i * 23) % 40}vh`, '--d': `${(i % 11) * 0.28}s` }} />)}
    </div>
  );
}

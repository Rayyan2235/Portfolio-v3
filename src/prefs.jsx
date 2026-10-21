import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const PrefsContext = createContext(null);

function read(key, fallback) {
  try {
    const v = localStorage.getItem('v3-' + key);
    return v === null ? fallback : JSON.parse(v);
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem('v3-' + key, JSON.stringify(value));
  } catch {
    /* storage blocked: preference lasts for this visit only */
  }
}

export function PrefsProvider({ children }) {
  const systemReduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const [motionOn, setMotionOn] = useState(() => read('motion', !systemReduce));
  const [sky, setSky] = useState(() => read('sky', 'auto'));
  const [transition, setTransition] = useState(() => read('transition', 'mixed'));
  const [sound, setSound] = useState(false);

  useEffect(() => write('motion', motionOn), [motionOn]);
  useEffect(() => write('sky', sky), [sky]);
  useEffect(() => write('transition', transition), [transition]);
  useEffect(() => {
    document.documentElement.classList.toggle('still', !motionOn);
  }, [motionOn]);

  const value = useMemo(
    () => ({ motionOn, setMotionOn, sky, setSky, transition, setTransition, sound, setSound }),
    [motionOn, sky, transition, sound]
  );
  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>;
}

export const usePrefs = () => useContext(PrefsContext);

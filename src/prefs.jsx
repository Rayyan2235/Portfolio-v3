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
  // Motion is the point of this site, so it starts on even when the system asks for less.
  // Visitors can switch it off in the sky panel or the Ctrl K menu, and the choice is remembered.
  const [motionOn, setMotionOn] = useState(() => read('motion2', true));
  const [sky, setSky] = useState(() => read('sky', 'auto'));
  const [transition, setTransition] = useState(() => read('transition', 'mixed'));
  const [sound, setSound] = useState(false);

  useEffect(() => write('motion2', motionOn), [motionOn]);
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

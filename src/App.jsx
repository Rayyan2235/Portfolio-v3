import { useCallback, useRef, useState } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { PrefsProvider, usePrefs } from './prefs.jsx';
import { TransitionProvider } from './components/Transitions.jsx';
import GreatWaveHero from './components/GreatWaveHero.jsx';
import Nav from './components/Nav.jsx';
import CommandMenu from './components/CommandMenu.jsx';
import Ambient from './components/Ambient.jsx';
import { lazy, Suspense } from 'react';
import { HeroText, Statement, Work, Experience, Lessons, Island, Contact, Footer } from './components/Sections.jsx';

// three.js loads only when this section is reached, so the first screen stays light.
const Shrine3D = lazy(() => import('./components/Shrine3D.jsx'));
const LazyShrine = () => <Suspense fallback={<div className="shrine3d" />}><Shrine3D /></Suspense>;

function Page() {
  const [menu, setMenu] = useState(false);
  const [msg, setMsg] = useState('');
  const timer = useRef(0);
  const toast = useCallback(m => { setMsg(m); clearTimeout(timer.current); timer.current = setTimeout(() => setMsg(''), 1800); }, []);
  const { motionOn } = usePrefs();
  return (
    <MotionConfig reducedMotion={motionOn ? 'never' : 'always'}>
    <TransitionProvider>
      <Ambient />
      <Nav onOpenMenu={() => setMenu(true)} />
      <main>
        <GreatWaveHero><HeroText /></GreatWaveHero>
        <Statement />
        <Work />
        <Experience />
        <Lessons />
        <Island Scene={LazyShrine} />
        <Contact toast={toast} />
      </main>
      <Footer />
      <CommandMenu open={menu} setOpen={setMenu} toast={toast} />
      <AnimatePresence>
        {msg && <motion.div className="toast" role="status" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>{msg}</motion.div>}
      </AnimatePresence>
    </TransitionProvider>
    </MotionConfig>
  );
}

export default function App() {
  return <PrefsProvider><Page /></PrefsProvider>;
}

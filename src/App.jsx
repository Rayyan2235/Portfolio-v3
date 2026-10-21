import { useCallback, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { PrefsProvider } from './prefs.jsx';
import { TransitionProvider } from './components/Transitions.jsx';
import GreatWaveHero from './components/GreatWaveHero.jsx';
import Nav from './components/Nav.jsx';
import CommandMenu from './components/CommandMenu.jsx';
import Ambient from './components/Ambient.jsx';
import { HeroText, Statement, Work, Experience, Lessons, Contact, Footer } from './components/Sections.jsx';

function Page() {
  const [menu, setMenu] = useState(false);
  const [msg, setMsg] = useState('');
  const timer = useRef(0);
  const toast = useCallback(m => { setMsg(m); clearTimeout(timer.current); timer.current = setTimeout(() => setMsg(''), 1800); }, []);
  return (
    <TransitionProvider>
      <Ambient />
      <Nav onOpenMenu={() => setMenu(true)} />
      <main>
        <GreatWaveHero><HeroText /></GreatWaveHero>
        <Statement />
        <Work />
        <Experience />
        <Lessons />
        <Contact toast={toast} />
      </main>
      <Footer />
      <CommandMenu open={menu} setOpen={setMenu} toast={toast} />
      <AnimatePresence>
        {msg && <motion.div className="toast" role="status" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>{msg}</motion.div>}
      </AnimatePresence>
    </TransitionProvider>
  );
}

export default function App() {
  return <PrefsProvider><Page /></PrefsProvider>;
}

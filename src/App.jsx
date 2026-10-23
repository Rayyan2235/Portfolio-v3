import { useCallback, useRef, useState } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { PrefsProvider, usePrefs } from './prefs.jsx';
import { TransitionProvider } from './components/Transitions.jsx';
import GreatWaveHero from './components/GreatWaveHero.jsx';
import ScrollExpandHero from './components/ScrollExpandHero.jsx';
import StoryIntro from './components/StoryIntro.jsx';
import Nav from './components/Nav.jsx';
import CommandMenu from './components/CommandMenu.jsx';
import Ambient from './components/Ambient.jsx';
import { HeroText, Statement, Work, Experience, Contact, Footer } from './components/Sections.jsx';

// The 3D island (Shrine3D.jsx, Island in Sections.jsx) is hidden for now: too much GPU for visitors.
// To bring it back: lazy import Shrine3D and render <Island Scene={...} /> after <Experience />.

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
        <StoryIntro />
        {/* the story's title card already says "Rayyan", so the opening scroll leads with the role */}
        <ScrollExpandHero first="Software" rest="engineer" kicker="Rayyan Syed"><GreatWaveHero><HeroText /></GreatWaveHero></ScrollExpandHero>
        <Statement />
        <Work />
        <Experience />
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

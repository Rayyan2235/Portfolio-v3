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
import Hobbies from './components/Hobbies.jsx';
import { Preloader, InkCursor, SmoothScroll, ToolWave } from './components/Flourish.jsx';
import { KamonTop } from './components/Charms.jsx';
import { NameRoll } from './components/Flow.jsx';
import { SectionCounter } from './components/Craft.jsx';
import { HeroText, Statement, Work, Experience, Contact, Footer } from './components/Sections.jsx';
import { ZoomPrints } from './components/Immerse.jsx';

function Page() {
  const [menu, setMenu] = useState(false);
  const [msg, setMsg] = useState('');
  const timer = useRef(0);
  const toast = useCallback(m => { setMsg(m); clearTimeout(timer.current); timer.current = setTimeout(() => setMsg(''), 1800); }, []);
  const { motionOn } = usePrefs();
  return (
    <MotionConfig reducedMotion={motionOn ? 'never' : 'always'}>
    <TransitionProvider>
      <Preloader />
      <SmoothScroll />
      <InkCursor />
      <Ambient />
      <Nav onOpenMenu={() => setMenu(true)} />
      <main>
        <StoryIntro />
        <ScrollExpandHero><GreatWaveHero><HeroText /></GreatWaveHero></ScrollExpandHero>
        <Statement />
        <Experience />
        <ToolWave />
        <Work />
        <Hobbies />
        <ZoomPrints />
        <Contact toast={toast} />
      </main>
      <NameRoll />
      <Footer />
      <KamonTop />
      <SectionCounter />
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

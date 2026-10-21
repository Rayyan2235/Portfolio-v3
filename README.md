# Portfolio v3

Rayyan Syed's portfolio on the Daybreak design system (dawn theme). React 18, Vite 6, Motion (Framer Motion).

```bash
npm install
npm run dev
```

## What is in it

- **Great Wave hero** (`src/components/GreatWaveHero.jsx`): Hokusai's print animated in WebGL. The sky follows the visitor's local time (dawn, day, dusk, night) or a manual choice in the nav. Night has stars, a moon and stronger waves; Storm adds rain, lightning and optional synthesized thunder. The sun or moon moves as you scroll and the boats bob.
- **Transitions** (`src/components/Transitions.jsx`): wave, sakura petals, maple leaves, sumi ink and lightning. "Mixed" gives each section its own; any one can be picked in the nav or the Ctrl K menu. Only on clicks, never on scroll.
- **Ambient layer**: petals at dawn and day, maple leaves at dusk, fireflies at night.
- **Command menu** (Ctrl K), project drawer with a spec sheet, hover index, all animated with Motion.

## Credits and licenses

- Wave: Katsushika Hokusai, *Under the Wave off Kanagawa*, ca. 1830–32. The Metropolitan Museum of Art, object 45434, public domain.
- `src/components/reactbits/Stack`: from React Bits by David Haz (reactbits.dev), MIT + Commons Clause. Free to use in this site; the component itself may not be resold or redistributed.
- Fonts: Fraunces, Figtree, Geist Mono, Caveat. SIL Open Font License 1.1, loaded from Google Fonts.

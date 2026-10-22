# Handoff: Japanese theme and the story intro

For an agent researching components to make the story intro more immersive. Read this first so your picks fit what exists.

## The site

Rayyan Syed's portfolio v3. React 18, Vite 6, `motion` (Framer Motion), three.js on the main page only. Repo `Rayyan2235/Portfolio-v3`, story work on branch `story-intro`. Run `npm run dev` (port 5191 in the preview config).

## The Japanese theme

The feel is an Edo period woodblock print at dawn. It should look hand made and real, never like an AI template.

* **Palette** (CSS tokens in `src/styles.css`): paper `#fff8ee`, ink `#1b2433`, sea indigo `#1d3557`, sun red `#e4572e`, glow `#f7b27a`, peach `#fde7c4`. Torii red `#c8361f` in the story. One red sun per screen, used sparingly.
* **Type:** Fraunces (display), Figtree (body), Geist Mono (small labels, uppercase, tracked), Caveat (rare handwritten notes).
* **Real art, not drawn art:** public domain Met prints. Hokusai's Great Wave (animated in a WebGL shader in the hero), a Chikanobu crane, a Goshun cherry blossom. The aged silk is lifted out offline so only ink shows, then `mix-blend-mode: multiply` onto the paper.
* **Motifs in use:** rising sun, Great Wave with foam, cranes, cherry petals, maple leaves, gold mist bands (kasumi), seigaiha wave pattern, torii gate, hanging scrolls, lanterns, sumi ink brush strokes, boats.
* **Living sky:** the hero follows the visitor's clock (dawn, day, dusk, starry night) and has a storm mode with rain, lightning and opt in thunder.
* **Transitions** between sections: wave, sakura petals, falling leaves, sumi ink, lightning.

## Rules

* No Japanese words or characters on screen. Rayyan felt they threw the design off.
* No Studio Ghibli or other copyrighted characters or models.
* Avoid neon, glassmorphism, chrome, glitch, cyber looks. They read as generic AI template.
* Phone friendly is a must. Everything works and reads at 375px, no sideways scroll, no scroll hijacking.
* Respect the Motion switch in the nav (motion off shows the story as plain text).
* No 3D in the story for now (too costly). Keep the story to SVG, CSS, canvas and `motion`; WebGL only if it earns its place and has a phone fallback.
* Licenses must allow use in a personal portfolio. Note the license for every pick.

## The story intro so far

A scroll story before the portfolio: five pinned beats, each a tall section whose scroll progress drives the art. Code in `src/components/StoryIntro.jsx`, styles under `.st-*` in `src/styles.css`. A dock shows progress dots and a "Skip to portfolio" button; returning visitors skip automatically. The last beat hands off to the hanging scroll hero (a port of 21st.dev's scroll expansion hero).

| Beat | Rough art now |
| --- | --- |
| 01 Hello | Red sun rises behind mist bands, an ink brush stroke paints under it |
| 02 Where from | Woodblock style map, route draws from Jeddah to Penn State, a boat sails it |
| 03 What drives me | The ink crane flies across gold cloud bands with parallax |
| 04 What I build | Projects (FireFly, Mashwara, EmpathAI) unroll as hanging scrolls with lantern glow |
| 05 Come in | Torii gate grows as you walk through it toward the sun |

The text lines are still placeholders. Each line reveals word by word on scroll.

## Already used, already scouted

Used: React Bits `Stack` (project cards), 21st.dev scroll expansion hero.

Scouted, not built yet: React Bits Split Text, Blur Text, Scroll Float, Gradual Blur, Noise, Topography, Scroll Stack, Card Swap, Image Trail; 21st.dev Scroll 01 and Scroll Reveal Text; Aceternity Sticky Scroll Reveal; Magic UI Text Reveal; ink spread sprite reveals; SVG `feTurbulence` ink edges; GSAP DrawSVG for brush strokes.

## What would help

Components or techniques that make the beats feel more alive in this style, for example: better ink and brush reveals, paper and woodblock textures, water and foam that matches the Great Wave, petals or mist with depth, scroll driven page or scroll unrolling, smooth scroll (Lenis) if it plays well with sticky sections. For each pick give: source link, license, what beat it fits, phone cost, and how it would be restyled to the palette above.

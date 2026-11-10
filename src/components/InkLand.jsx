import { useState } from 'react';
import { secret } from './Secrets.jsx';

// The land under the Contact sky, painted in code like a sumi-e scroll: karst peaks fading into mist, cedar
// ridges, a pagoda on the far hill, matsu pines on the shore and a torii standing in the shallows. Every layer
// takes its colour from the section's sky mode (--far, --mid, --near, --mist, --torii), so dawn, day, dusk,
// night and storm each repaint it for free. It is built once from a fixed seed, so the drawing never changes
// and costs nothing after the first paint.
let s = 7;
const rnd = () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const NOISE = Array.from({ length: 512 }, rnd);
const noise = x => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return NOISE[i & 511] * (1 - u) + NOISE[(i + 1) & 511] * u; };
const r1 = n => Math.round(n * 10) / 10;

// a ridgeline: the highest of a few round topped, steep sided peaks (karst, as in the scroll paintings), roughened by two octaves of noise
function ridge(base, peaks, amp, freq, off) {
  const pts = [];
  for (let x = -40; x <= 1640; x += 6) {
    let h = 0;
    for (const [px, ph, pw] of peaks) { const d = Math.abs(x - px) / pw; if (d < 1) h = Math.max(h, ph * (1 - d ** 2.4) ** 3.2); }
    const n = (noise(x * freq + off) - 0.5) + (noise(x * freq * 3.1 + off) - 0.5) * 0.4;
    pts.push([x, r1(base - h + n * amp)]);
  }
  return pts;
}
const crestOf = pts => 'M' + pts.map(p => p.join(' ')).join(' L');
const fillOf = pts => crestOf(pts) + ' L1640 400 L-40 400 Z';
const yAt = (pts, x) => pts[Math.max(0, Math.min(pts.length - 1, Math.round((x + 40) / 6)))][1];

// distant cedars: a row of thin spires along a crest, one path
function cedars(pts, from, to, step, size) {
  let d = '';
  for (let x = from; x < to; x += step * (0.6 + rnd() * 0.8)) {
    const y = yAt(pts, x) + 2, h = size * (0.7 + rnd() * 0.6), w = h * 0.22;
    d += `M${r1(x - w)} ${y} L${r1(x)} ${r1(y - h)} L${r1(x + w)} ${y} Z`;
  }
  return d;
}

// a matsu: a leaning tapered trunk and flat cloud pads of needles on the ends of its branches
function pine(x, y, sc, lean) {
  const tip = [x + lean * 70 * sc, y - 110 * sc], mid = [x + lean * 10 * sc, y - 60 * sc];
  const at = t => [(1 - t) ** 2 * x + 2 * (1 - t) * t * mid[0] + t * t * tip[0], (1 - t) ** 2 * y + 2 * (1 - t) * t * mid[1] + t * t * tip[1]];
  const L = [], R = [];
  for (let i = 0; i <= 10; i++) { const t = i / 10, [px, py] = at(t), w = (7 - 5 * t) * sc; L.push(`${r1(px - w)} ${r1(py)}`); R.unshift(`${r1(px + w)} ${r1(py)}`); }
  let trunk = `M${L.join(' L')} L${R.join(' L')} Z`;
  const pads = [];
  [0.42, 0.58, 0.72, 0.86, 1].forEach((t, i) => {
    const [bx, by] = at(t), side = i === 4 ? lean : (i % 2 ? 1 : -1), reach = (i === 4 ? 10 : 34 + rnd() * 26) * sc;
    const ex = bx + side * reach, ey = by - (6 + rnd() * 12) * sc;
    trunk += `M${r1(bx)} ${r1(by)} Q${r1(bx + side * reach * 0.5)} ${r1(by + 4 * sc)} ${r1(ex)} ${r1(ey)} L${r1(ex)} ${r1(ey - 3 * sc)} Q${r1(bx + side * reach * 0.4)} ${r1(by - 2 * sc)} ${r1(bx)} ${r1(by - 5 * sc)} Z`;
    const rx = (26 + rnd() * 16) * sc, ry = (6 + rnd() * 3) * sc;
    pads.push([r1(ex), r1(ey - ry * 0.4), r1(rx), r1(ry)], [r1(ex - side * rx * 0.35), r1(ey - ry * 1.5), r1(rx * 0.6), r1(ry * 0.8)]);
  });
  return { trunk, pads };
}

// a five storey pagoda: bodies shrinking upward, each roof with turned up eaves, a spire on top
function pagoda(x, y, sc) {
  let d = `M${r1(x - 20 * sc)} ${y} h${r1(40 * sc)} v${r1(-4 * sc)} h${r1(-40 * sc)} Z`, cy = y - 4 * sc;
  for (let i = 0; i < 5; i++) {
    const w = (30 - i * 3.6) * sc, bw = (12 - i * 1.5) * sc, bh = (i ? 8 : 11) * sc;
    d += `M${r1(x - bw)} ${r1(cy)} h${r1(2 * bw)} v${r1(-bh)} h${r1(-2 * bw)} Z`; cy -= bh;
    d += `M${r1(x - w)} ${r1(cy - 3 * sc)} Q${r1(x - w * 0.6)} ${r1(cy + 1 * sc)} ${r1(x - w * 0.3)} ${r1(cy - 5 * sc)} L${r1(x + w * 0.3)} ${r1(cy - 5 * sc)} Q${r1(x + w * 0.6)} ${r1(cy + 1 * sc)} ${r1(x + w)} ${r1(cy - 3 * sc)} L${r1(x + w * 0.8)} ${r1(cy + 1.5 * sc)} L${r1(x - w * 0.8)} ${r1(cy + 1.5 * sc)} Z`;
    cy -= 5 * sc;
  }
  d += `M${r1(x - 1.2 * sc)} ${r1(cy)} h${r1(2.4 * sc)} v${r1(-26 * sc)} h${r1(-2.4 * sc)} Z`;
  return d;
}

// a torii: two splayed posts, the curved kasagi on top, the nuki through the posts
function torii(x, y, h) {
  const t = y - h, k = h / 70;
  return `M${r1(x - 27 * k)} ${y} L${r1(x - 23 * k)} ${r1(t)} L${r1(x - 17 * k)} ${r1(t)} L${r1(x - 20 * k)} ${y} Z`
    + `M${r1(x + 27 * k)} ${y} L${r1(x + 23 * k)} ${r1(t)} L${r1(x + 17 * k)} ${r1(t)} L${r1(x + 20 * k)} ${y} Z`
    + `M${r1(x - 47 * k)} ${r1(t - 11 * k)} Q${x} ${r1(t + 1 * k)} ${r1(x + 47 * k)} ${r1(t - 11 * k)} L${r1(x + 44 * k)} ${r1(t - 3 * k)} Q${x} ${r1(t + 8 * k)} ${r1(x - 44 * k)} ${r1(t - 3 * k)} Z`
    + `M${r1(x - 37 * k)} ${r1(t + 1 * k)} h${r1(74 * k)} v${r1(5 * k)} h${r1(-74 * k)} Z`
    + `M${r1(x - 2.5 * k)} ${r1(t + 4 * k)} h${r1(5 * k)} v${r1(11 * k)} h${r1(-5 * k)} Z`
    + `M${r1(x - 34 * k)} ${r1(t + 15 * k)} h${r1(68 * k)} v${r1(5 * k)} h${r1(-68 * k)} Z`;
}

// a stone lantern on the shore
function lantern(x, y, sc) {
  return `M${r1(x - 6 * sc)} ${y} h${r1(12 * sc)} v${r1(-3 * sc)} h${r1(-12 * sc)} Z M${r1(x - 2 * sc)} ${r1(y - 3 * sc)} h${r1(4 * sc)} v${r1(-12 * sc)} h${r1(-4 * sc)} Z`
    + `M${r1(x - 5 * sc)} ${r1(y - 15 * sc)} h${r1(10 * sc)} v${r1(-8 * sc)} h${r1(-10 * sc)} Z M${r1(x - 10 * sc)} ${r1(y - 23 * sc)} Q${x} ${r1(y - 33 * sc)} ${r1(x + 10 * sc)} ${r1(y - 23 * sc)} Z`;
}

const far = ridge(318, [[110, 170, 110], [290, 236, 86], [430, 150, 120], [600, 205, 78], [760, 120, 140], [975, 226, 92], [1130, 160, 116], [1295, 250, 84], [1450, 176, 110], [1590, 214, 100]], 16, 0.021, 0);
const back = ridge(346, [[50, 110, 140], [250, 86, 120], [520, 132, 108], [700, 92, 150], [905, 140, 100], [1160, 104, 140], [1385, 150, 100], [1565, 116, 130]], 12, 0.026, 40);
const hills = ridge(378, [[170, 72, 270], [610, 36, 210], [1075, 96, 240], [1450, 58, 220]], 6, 0.03, 90);
const shore = ridge(397, [[0, 62, 240], [300, 20, 180], [1290, 26, 200], [1600, 74, 270]], 4, 0.04, 140);
const LAND = {
  far: fillOf(far), farCrest: crestOf(far), back: fillOf(back), backCrest: crestOf(back),
  hills: fillOf(hills), hillsCrest: crestOf(hills), shore: fillOf(shore),
  cedars: cedars(hills, 20, 430, 13, 14) + cedars(hills, 850, 1010, 12, 13) + cedars(hills, 1140, 1330, 12, 13),
  pagoda: pagoda(1075, yAt(hills, 1075) + 3, 1),
  pines: [pine(110, yAt(shore, 110) + 4, 1.35, 0.9), pine(450, yAt(shore, 450) + 3, 0.75, -0.5), pine(1270, yAt(shore, 1270) + 3, 0.7, 0.6), pine(1510, yAt(shore, 1510) + 4, 1.2, -0.85)],
  torii: torii(650, 398, 64),
  lantern: lantern(548, yAt(shore, 548) + 2, 1),
};

const Wash = ({ id, color, top = 1, foot = 0 }) => (
  <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" style={{ stopColor: `var(${color})`, stopOpacity: top }} />
    <stop offset=".62" style={{ stopColor: `var(${color})`, stopOpacity: top * 0.8 }} />
    <stop offset="1" style={{ stopColor: `var(${color})`, stopOpacity: foot }} />
  </linearGradient>
);
const MistBand = ({ y, h, o }) => <rect x="-40" y={y} width="1680" height={h} fill="url(#il-mist)" opacity={o} />;

export function InkLand() {
  // tap the torii and it glows like a struck bell: a secret
  const ring = e => { const g = e.currentTarget; g.classList.remove('rang'); void g.getBBox(); g.classList.add('rang'); secret('torii'); };
  return (
    <svg className="csky-land ink" viewBox="0 0 1600 400" preserveAspectRatio="xMidYMax slice">
      <defs>
        <Wash id="il-far" color="--far" top={0.72} />
        <Wash id="il-back" color="--mid" top={0.62} foot={0.05} />
        <Wash id="il-hills" color="--mid" top={1} foot={0.35} />
        <linearGradient id="il-mist" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: 'var(--mist)', stopOpacity: 0 }} />
          <stop offset=".55" style={{ stopColor: 'var(--mist)' }} />
          <stop offset="1" style={{ stopColor: 'var(--mist)', stopOpacity: 0 }} />
        </linearGradient>
      </defs>
      <path d={LAND.far} fill="url(#il-far)" />
      <path className="crest" d={LAND.farCrest} opacity=".22" />
      <MistBand y={236} h={110} o={0.9} />
      <path d={LAND.back} fill="url(#il-back)" />
      <path className="crest" d={LAND.backCrest} opacity=".3" />
      <MistBand y={290} h={80} o={1} />
      <path d={LAND.hills} fill="url(#il-hills)" />
      <path className="crest" d={LAND.hillsCrest} opacity=".35" />
      <path className="tree" d={LAND.cedars} />
      <path className="tree" d={LAND.pagoda} />
      <MistBand y={346} h={50} o={0.8} />
      <path className="near" d={LAND.shore} />
      <path className="near" d={LAND.lantern} />
      <path className="torii" d={LAND.torii} onClick={ring} />
      {LAND.pines.map((p, i) => (
        <g key={i} className="near">
          <path d={p.trunk} />
          {p.pads.map(([cx, cy, rx, ry], j) => <ellipse key={j} cx={cx} cy={cy} rx={rx} ry={ry} />)}
        </g>
      ))}
    </svg>
  );
}

// the crane from the old finale lives in the Contact sky now: tap it and it flies off, then circles back
export function SkyCrane() {
  const [flying, setFlying] = useState(false);
  const fly = () => {
    if (flying) return;
    setFlying(true); secret('crane');
    setTimeout(() => setFlying(false), 4200);
  };
  return (
    <button type="button" className={`ct-crane${flying ? ' fly' : ''}`} onClick={fly} aria-label="A crane. Tap it.">
      <svg viewBox="0 0 120 80" aria-hidden="true">
        <path d="M6 18 C 26 22, 40 30, 52 40 C 58 30, 70 10, 96 2 C 84 14, 74 28, 70 40 C 80 40, 92 42, 104 46 L 118 44 L 106 50 C 94 52, 80 50, 68 48 C 60 54, 48 58, 36 58 L 20 70 L 30 56 C 22 52, 16 46, 14 40 C 30 42, 40 44, 48 44 C 38 36, 24 26, 6 18 Z" />
      </svg>
    </button>
  );
}

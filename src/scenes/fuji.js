import * as THREE from 'three';
import { loopWhileVisible } from '../loop.js';

// Mount Fuji under a magic hour sky, the first page of the story. The mountain is real elevation data
// (public/terrain/fuji-288.u16: 288 x 288 heights in metres, 125 m apart, from the Mapzen Terrarium tiles on AWS
// Open Data), rising out of a sea of cloud. The sky follows the look of anime twilight skies: a vivid band of
// gold, coral and magenta under deep indigo, a dense field of stars, a bright Milky Way, shooting stars and a
// twin tailed comet. Scroll carries it from that twilight into full night and tilts the view up into the stars.
//
// Built to run on phones: no shadows and no environment maps; the Milky Way is painted once into a texture;
// stars are points that twinkle in the vertex shader; meteors are three pooled quads; and the render resolution
// steps down when frames run slow and back up when they recover. Units are kilometres.

const GRID = 288, SPACING = 0.1247, SIZE = (GRID - 1) * SPACING, TOP = 4.2;
const lerp = (a, b, t) => a + (b - a) * t;
const ss = THREE.MathUtils.smoothstep;

// value noise and fbm shared by the shaders
const NOISE = /* glsl */`
  float h21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
  float vn(vec2 p) {
    vec2 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f);
    return mix(mix(h21(i), h21(i + vec2(1, 0)), u.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), u.x), u.y);
  }
  float fbm(vec2 p) { float a = 0.5, s = 0.0; for (int i = 0; i < OCTAVES; i++) { s += a * vn(p); p = p * 2.03 + 17.1; a *= 0.5; } return s; }
`;

// --- the day: three keys, magic hour, violet dusk, night ---------------------------------------------------------
// sky stops run from the horizon up: horizon, low, mid, upper, zenith
const KEYS = [
  { sky: ['#ffc27a', '#ff7486', '#b8458f', '#4b2f8f', '#1b1f63'], hemiSky: '#ffb0b8', hemiGround: '#2a2462', hemiI: 1.25, glow: '#ff9a72', glowI: 0.9, haze: '#e7809a', lit: '#ffc6c0', shade: '#5b4590', stars: 0.35, comet: 0.25 },
  { sky: ['#f39389', '#c65c9e', '#6c3c9c', '#2c2a7a', '#0d1245'], hemiSky: '#b08ad0', hemiGround: '#1c1a4e', hemiI: 0.95, glow: '#ff8a8a', glowI: 0.45, haze: '#8a5aa6', lit: '#d9a8d6', shade: '#3a2f74', stars: 0.75, comet: 0.75 },
  { sky: ['#4f3f8f', '#34307a', '#1c2366', '#0b1240', '#03061a'], hemiSky: '#6f78c8', hemiGround: '#0b0d2a', hemiI: 0.7, glow: '#8ea2ff', glowI: 0.3, haze: '#2b2b6a', lit: '#8f97d6', shade: '#1c1f4e', stars: 1, comet: 1 }
];
const ca = new THREE.Color(), cb = new THREE.Color();
function day(p) {
  const s = Math.min(1.999, Math.max(0, p) * 2), i = Math.floor(s), t = ss(s - i, 0, 1), A = KEYS[i], B = KEYS[i + 1], out = {};
  for (const k of Object.keys(A)) {
    if (typeof A[k] === 'number') out[k] = lerp(A[k], B[k], t);
    else if (Array.isArray(A[k])) out[k] = A[k].map((c, j) => new THREE.Color(c).lerp(cb.set(B[k][j]), t));
    else out[k] = ca.set(A[k]).clone().lerp(cb.set(B[k]), t);
  }
  return out;
}

// the afterglow sits low in the west, just off the right edge of the view
const GLOW = new THREE.Vector3(-0.62, 0, 0.78).normalize();

// --- terrain -----------------------------------------------------------------------------------------------------
// Catmull-Rom between the 125 m samples, so a finer mesh gets smooth ridgelines rather than facets
function heightAt(h, x, y) {
  const cr = (a, b, c, d, t) => b + 0.5 * t * (c - a + t * (2 * a - 5 * b + 4 * c - d + t * (3 * (b - c) + d - a)));
  const X = Math.floor(x), Y = Math.floor(y), tx = x - X, ty = y - Y;
  const at = (i, j) => h[Math.min(GRID - 1, Math.max(0, Y + j)) * GRID + Math.min(GRID - 1, Math.max(0, X + i))];
  const row = j => cr(at(-1, j), at(0, j), at(1, j), at(2, j), tx);
  return cr(row(-1), row(0), row(1), row(2), ty);
}

// the glow every lit edge carries in anime landscapes: a rim of sky colour where a surface turns away from us
const RIM = { value: new THREE.Color() };
const rimLight = (s, strength) => {
  s.uniforms.uRim = RIM;
  s.fragmentShader = s.fragmentShader
    .replace('#include <common>', '#include <common>\nuniform vec3 uRim;')
    .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      float facing = clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0);
      totalEmissiveRadiance += uRim * pow(1.0 - facing, 3.0) * ${strength};`);
};

async function terrain(phone) {
  const h = new Uint16Array(await (await fetch('/terrain/fuji-288.u16')).arrayBuffer());
  // laptops get the data at one and a half times its density, smoothly interpolated; phones take every other sample
  const scale = phone ? 0.5 : 1.5, n = Math.round((GRID - 1) * scale) + 1;
  const geo = new THREE.PlaneGeometry(SIZE, SIZE, n - 1, n - 1).rotateX(-Math.PI / 2); // row 0 of the data is north, at -z
  const pos = geo.attributes.position;
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) pos.setY(r * n + c, heightAt(h, c / scale, r / scale) / 1000 * 1.08);
  geo.computeVertexNormals();
  const bytes = new Uint8Array(GRID * GRID);
  for (let i = 0; i < bytes.length; i++) bytes[i] = Math.min(255, Math.round(h[i] / 1000 * 1.08 / TOP * 255));
  const heights = new THREE.DataTexture(bytes, GRID, GRID, THREE.RedFormat, THREE.UnsignedByteType);
  heights.magFilter = heights.minFilter = THREE.LinearFilter; heights.needsUpdate = true;

  // Lambert: per pixel, but far cheaper than the physical material, and twilight has no hard sun to need it
  const mat = new THREE.MeshLambertMaterial();
  mat.onBeforeCompile = s => {
    s.vertexShader = s.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vW;\nvarying vec3 vWN;')
      .replace('#include <defaultnormal_vertex>', '#include <defaultnormal_vertex>\nvWN = normalize(mat3(modelMatrix) * objectNormal);')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    s.fragmentShader = s.fragmentShader
      .replace('#include <common>', `#include <common>\nvarying vec3 vW;\nvarying vec3 vWN;\n#define OCTAVES ${phone ? 2 : 3}\n${NOISE}\nfloat snowAmt;`)
      .replace('#include <color_fragment>', /* glsl */`
        // radial gullies running down from the crater; snow lingers in them below the snowline,
        // wind scoured rock ribs break through it, and the crater rim is bare
        float rad = length(vW.xz), ang = atan(vW.z, vW.x);
        float gully = vn(vec2(ang * 40.0, rad * 0.7)) * 0.6 + vn(vec2(ang * 95.0, rad * 1.8)) * 0.4;
        float nz = fbm(vW.xz * 1.6);
        float slope = 1.0 - clamp(vWN.y, 0.0, 1.0);
        float line = 2.85 + (nz - 0.5) * 0.45 - gully * 0.6 + slope * 0.5;
        snowAmt = smoothstep(line - 0.05, line + 0.05, vW.y);
        float ribs = vn(vec2(ang * 170.0, rad * 3.5)) * 0.65 + vn(vec2(ang * 330.0, rad * 7.0)) * 0.35;
        snowAmt *= 1.0 - smoothstep(0.62, 0.86, ribs) * smoothstep(0.15, 0.5, slope) * 0.85;
        snowAmt *= 1.0 - smoothstep(0.55, 0.3, rad) * smoothstep(3.95, 4.05, vW.y) * 0.6;
        float trees = 1.0 - smoothstep(2.2, 2.5, vW.y + (nz - 0.5) * 0.35);
        vec3 rock = mix(vec3(0.07, 0.045, 0.05), vec3(0.13, 0.07, 0.07), fbm(vW.xz * 7.0));
        vec3 forest = vec3(0.02, 0.03, 0.03);
        vec3 col = mix(rock, forest, trees * (1.0 - slope * 0.7));
        diffuseColor.rgb = mix(col, vec3(0.86, 0.88, 0.95), snowAmt);
      `);
    rimLight(s, '(0.35 + snowAmt * 0.65)');
  };
  return { mesh: new THREE.Mesh(geo, mat), heights, raw: h };
}

// --- clouds ------------------------------------------------------------------------------------------------------
// value noise on the CPU for the cloud bed
const hashJ = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
const smJ = v => v * v * (3 - 2 * v);
function vnJ(x, y) {
  const X = Math.floor(x), Y = Math.floor(y), u = smJ(x - X), v = smJ(y - Y);
  const a = hashJ(X, Y), b = hashJ(X + 1, Y), c = hashJ(X, Y + 1), d = hashJ(X + 1, Y + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
const fbmJ = (x, y) => vnJ(x, y) * 0.55 + vnJ(x * 2.1 + 7, y * 2.1) * 0.28 + vnJ(x * 4.4, y * 4.4 + 3) * 0.17;

// lit tops glow along their edges like painted cloud
function cloudMat() {
  const m = new THREE.MeshLambertMaterial({ color: '#efe8f2', emissive: '#ffffff', emissiveIntensity: 0.04 });
  m.onBeforeCompile = s => rimLight(s, '0.8');
  return m;
}

// a bed of rounded billows, built once, sunk below the ground where the mountain rises through it
function cloudBed(phone, h) {
  const span = 64, n = phone ? 140 : 240;
  const geo = new THREE.PlaneGeometry(span, span, n, n).rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const billow = ss(fbmJ(x * 0.7, z * 0.7), 0.3, 0.78) * 0.3 + Math.pow(fbmJ(x * 2.2 + 4, z * 2.2), 2) * 0.08;
    // sink toward the edge so the bed slips under the far cloud sheets instead of ending in a line
    const edge = Math.max(Math.abs(x), Math.abs(z)) / (span / 2);
    const c = Math.round((x + SIZE / 2) / SPACING), r = Math.round((z - 6 + SIZE / 2) / SPACING); // the bed sits 6 km north
    const ground = c >= 0 && r >= 0 && c < GRID && r < GRID ? h[r * GRID + c] / 1000 * 1.08 : 0;
    pos.setY(i, 1.42 + billow * (1 - ss(edge, 0.6, 1)) - ss(edge, 0.75, 1) * 0.3 - Math.max(0, ground - 1.5) * 0.6);
  }
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, cloudMat());
  mesh.position.z = -6;
  return mesh;
}

// thin noise sheets over the bed: wisps close up, one continuous sea toward the horizon
function cloudSheets(phone, heights) {
  const layers = 1, group = new THREE.Group(), mats = [];
  const geo = new THREE.PlaneGeometry(220, 220, 1, 1).rotateX(-Math.PI / 2);
  for (let i = 0; i < layers; i++) {
    const m = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      uniforms: { uHeight: { value: heights }, uSize: { value: SIZE }, uTop: { value: TOP }, uTime: { value: 0 }, uLit: { value: new THREE.Color() }, uShade: { value: new THREE.Color() }, uHaze: { value: new THREE.Color() }, uLayer: { value: i / Math.max(1, layers - 1) } },
      vertexShader: 'varying vec3 vW; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
      fragmentShader: /* glsl */`
        #define OCTAVES 3
        uniform float uTime, uLayer, uSize, uTop; uniform sampler2D uHeight; uniform vec3 uLit, uShade, uHaze; varying vec3 vW;
        ${NOISE}
        void main() {
          vec2 p = vW.xz * 0.32 + vec2(uTime * 0.02, uTime * 0.008);
          float n = fbm(p), ns = fbm(p + vec2(-0.06, 0.05));
          float d = length(vW.xz - cameraPosition.xz), far = smoothstep(14.0, 34.0, d);
          float dens = mix(smoothstep(0.5 + uLayer * 0.1, 0.8, n) * (0.55 - uLayer * 0.3), 0.97 - uLayer * 0.3, far);
          vec3 col = mix(uShade, uLit, clamp(0.5 + (n - ns) * 7.0 + uLayer * 0.25, 0.0, 1.0)) * (0.8 + 0.4 * n);
          // thin out where the slope comes up through the sheet, instead of a hard waterline
          vec2 uv = (vW.xz + uSize * 0.5) / uSize;
          float ground = all(greaterThan(uv, vec2(0.0))) && all(lessThan(uv, vec2(1.0))) ? texture2D(uHeight, uv).r * uTop : 0.0;
          dens *= smoothstep(-0.02, 0.16, vW.y - ground);
          col = mix(col, uHaze, smoothstep(6.0, 90.0, d));
          gl_FragColor = vec4(col, dens * (1.0 - smoothstep(80.0, 105.0, d)));
          #include <colorspace_fragment>
        }`
    });
    const mesh = new THREE.Mesh(geo, m);
    mesh.position.y = 1.6 + i * 0.09; // the lowest sheet lies in the valleys of the bed, softening it
    mesh.renderOrder = 2 + i;
    group.add(mesh); mats.push(m);
  }
  return { group, mats };
}

// --- sky ---------------------------------------------------------------------------------------------------------
// directions on the sky from texture coordinates of the region we paint and scatter stars in:
// u runs east (0.5) through south (0.75, straight ahead) to west (1.0); v runs from the horizon (0.5) to the zenith (1)
const U0 = 0.6, U1 = 0.93, V0 = 0.47, V1 = 0.74;
const dirOf = (u, v, out = new THREE.Vector3()) => {
  const az = (u - 0.5) * Math.PI * 2, el = (v - 0.5) * Math.PI;
  return out.set(Math.cos(el) * Math.cos(az), Math.sin(el), Math.cos(el) * Math.sin(az));
};
// the Milky Way's spine across the painted region, rising toward the west
const band = t => [lerp(0.6, 0.93, t), 0.5 + t * 0.15 + Math.sin(t * 3.1) * 0.025];

// The Milky Way painted once, the way anime night skies paint it: a broad violet glow, saturated knots of cyan,
// magenta and gold along the core, a granular dust of tens of thousands of faint stars, and thin dark lanes
// threaded through it. Painted at roughly screen resolution for the part of the sky the camera sees.
function milkyWay(phone) {
  const W = phone ? 1536 : 3072, H = Math.round(W / 2.45), cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  const at = (u, v) => [(u - U0) / (U1 - U0) * W, (1 - (v - V0) / (V1 - V0)) * H];
  const blob = (x, y, r, color, a) => {
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, color.replace('A', a)); gr.addColorStop(1, color.replace('A', 0));
    g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
  };
  const near = (spread) => { const t = Math.random(), [u, v] = band(t); return at(u + (Math.random() - 0.5) * spread * 0.4, v + (Math.random() - 0.5) * spread); };
  // start from opaque black and add light: transparent canvas pixels would come back with garbage colour
  g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
  g.globalCompositeOperation = 'lighter';
  // the broad glow
  for (let i = 0; i < 260; i++) { const [x, y] = near(0.12); blob(x, y, (0.06 + Math.random() * 0.12) * H, i % 2 ? 'rgba(120,100,255,A)' : 'rgba(90,150,255,A)', 0.03 + Math.random() * 0.04); }
  // bright knots along the core, in the saturated hues of a painted sky
  const knots = ['rgba(120,230,255,A)', 'rgba(255,110,210,A)', 'rgba(190,140,255,A)', 'rgba(255,214,150,A)'];
  for (let i = 0; i < 900; i++) { const [x, y] = near(0.05); blob(x, y, (0.01 + Math.random() * 0.045) * H, knots[i % 4], 0.04 + Math.random() * 0.08); }
  // star dust: fractional one pixel squares come out as soft points
  const dust = phone ? 18000 : 46000;
  for (let i = 0; i < dust; i++) {
    const [x, y] = Math.random() < 0.7 ? near(0.07) : [Math.random() * W, Math.random() * H];
    g.fillStyle = `rgba(${200 + (i % 55)},${210 + (i % 45)},255,${0.12 + Math.random() * 0.5})`;
    const s = 0.6 + Math.random() * 0.9; g.fillRect(x, y, s, s);
  }
  // dark lanes: thin soft filaments along the core
  g.globalCompositeOperation = 'source-over';
  g.filter = `blur(${phone ? 2 : 4}px)`; g.lineCap = 'round';
  for (let i = 0; i < 26; i++) {
    const t = Math.random() * 0.85, [a, b] = at(...band(t)), [c, d] = at(...band(t + 0.06 + Math.random() * 0.1));
    const off = (Math.random() - 0.5) * H * 0.05;
    g.strokeStyle = `rgba(0,0,0,${0.18 + Math.random() * 0.2})`; g.lineWidth = (0.002 + Math.random() * 0.006) * H;
    g.beginPath(); g.moveTo(a, b + off); g.quadraticCurveTo((a + c) / 2, (b + d) / 2 + off + (Math.random() - 0.5) * H * 0.04, c, d + off); g.stroke();
  }
  g.filter = 'none';
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  return tex;
}

function skyDome(phone) {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { uStops: { value: [0, 1, 2, 3, 4].map(() => new THREE.Color()) }, uGlowCol: { value: new THREE.Color() }, uGlowDir: { value: GLOW }, uGlow: { value: 1 }, uMilky: { value: milkyWay(phone) }, uStars: { value: 0 }, uBox: { value: new THREE.Vector4(U0, U1, V0, V1) } },
    vertexShader: 'varying vec3 vD; void main() { vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: /* glsl */`
      uniform vec3 uStops[5]; uniform vec3 uGlowCol, uGlowDir; uniform float uGlow, uStars; uniform sampler2D uMilky; uniform vec4 uBox;
      varying vec3 vD;
      void main() {
        vec3 d = normalize(vD);
        float h = max(d.y, 0.0);
        // a five stop gradient packed close to the horizon, where the colour lives at magic hour
        vec3 c = mix(uStops[0], uStops[1], smoothstep(0.0, 0.06, h));
        c = mix(c, uStops[2], smoothstep(0.04, 0.16, h));
        c = mix(c, uStops[3], smoothstep(0.12, 0.34, h));
        c = mix(c, uStops[4], smoothstep(0.3, 0.75, h));
        // the afterglow: brightest low in the west, a broad warm bloom
        float side = max(dot(normalize(vec2(d.x, d.z)), uGlowDir.xz), 0.0);
        c += uGlowCol * uGlow * pow(side, 3.0) * (1.0 - smoothstep(0.0, 0.32, h)) * 0.55;
        // the Milky Way, faded into the horizon glow
        vec2 uv = vec2(atan(d.z, d.x) / 6.2831853 + 0.5, asin(clamp(d.y, -1.0, 1.0)) / 3.1415926 + 0.5);
        vec2 box = (uv - uBox.xz) / (uBox.yw - uBox.xz);
        if (all(greaterThan(box, vec2(0.0))) && all(lessThan(box, vec2(1.0))))
          c += texture2D(uMilky, box).rgb * uStars * smoothstep(0.02, 0.18, h);
        gl_FragColor = vec4(c, 1.0);
        #include <colorspace_fragment>
        // a whisper of noise so the long gradients never band into stripes
        gl_FragColor.rgb += (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) / 255.0;
      }`
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1000, 48, 24), mat);
  mesh.renderOrder = -1;
  return mesh;
}

// crisp stars as points: most scattered across the visible sky, many crowded along the Milky Way, each twinkling
function starField(phone) {
  const count = phone ? 1800 : 4200, R = 900;
  const pos = new Float32Array(count * 3), size = new Float32Array(count), phase = new Float32Array(count), tint = new Float32Array(count * 3);
  const v3 = new THREE.Vector3(), c = new THREE.Color();
  const tints = ['#ffffff', '#cfe0ff', '#ffe9d6', '#d8d0ff'];
  for (let i = 0; i < count; i++) {
    let u, v;
    if (Math.random() < 0.4) { const [bu, bv] = band(Math.random()); u = bu + (Math.random() - 0.5) * 0.05; v = bv + (Math.random() - 0.5) * 0.07; }
    else { u = lerp(0.56, 0.96, Math.random()); v = lerp(0.47, 0.78, Math.pow(Math.random(), 1.3)); }
    dirOf(u, v, v3).multiplyScalar(R); pos.set([v3.x, v3.y, v3.z], i * 3);
    const bright = Math.random();
    // mostly pinpricks, some clear stars, and a rare few big enough to throw a glint
    size[i] = bright > 0.988 ? 16 + Math.random() * 8 : bright > 0.9 ? 2.4 + Math.random() * 1.2 : 0.9 + Math.random() * 0.9;
    phase[i] = Math.random() * 100;
    c.set(tints[i % 4]); tint.set([c.r, c.g, c.b], i * 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('size', new THREE.BufferAttribute(size, 1));
  geo.setAttribute('phase', new THREE.BufferAttribute(phase, 1));
  geo.setAttribute('tint', new THREE.BufferAttribute(tint, 3));
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
    uniforms: { uTime: { value: 0 }, uVis: { value: 0 }, uPR: { value: 1 } },
    vertexShader: /* glsl */`
      attribute float size, phase; attribute vec3 tint; uniform float uTime, uVis, uPR; varying vec3 vC; varying float vA, vBig;
      void main() {
        float tw = 0.7 + 0.3 * sin(uTime * (1.3 + fract(phase) * 2.4) + phase);
        float low = smoothstep(0.0, 0.14, normalize(position).y);
        vBig = step(10.0, size);
        vA = uVis * low * tw; vC = tint;
        gl_PointSize = max(1.0, size * uPR * (0.9 + 0.15 * tw));
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */`
      varying vec3 vC; varying float vA, vBig;
      void main() {
        vec2 q = gl_PointCoord - 0.5; float r2 = dot(q, q);
        // small stars: a sharp round point; big ones: a tiny hot core, a soft halo and four thin spikes of light
        float a = mix(exp(-r2 * 14.0), exp(-r2 * 420.0) * 1.6 + exp(-r2 * 40.0) * 0.25, vBig);
        float spikes = pow(max(0.0, 1.0 - abs(q.x) * 40.0), 2.0) * (1.0 - abs(q.y) * 2.0) + pow(max(0.0, 1.0 - abs(q.y) * 40.0), 2.0) * (1.0 - abs(q.x) * 2.0);
        a += spikes * 0.7 * vBig;
        gl_FragColor = vec4(vC * a * vA, 1.0);
        #include <colorspace_fragment>
      }`
  });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  return pts;
}

// a comet with two tails, a straight blue ion tail and a broad rose dust tail, painted once and shown as a sprite
function comet() {
  const W = 1024, H = 256, cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const g = cv.getContext('2d'), cx = W * 0.9, cy = H * 0.5;
  g.globalCompositeOperation = 'lighter';
  // dust tail: wide, curving slightly, warm
  for (let i = 0; i < 60; i++) {
    const t = i / 60, x = cx - t * W * 0.85, y = cy + t * t * H * 0.22, r = 10 + t * 90;
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, `rgba(255,190,220,${0.16 * (1 - t)})`); gr.addColorStop(1, 'rgba(255,190,220,0)');
    g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // ion tail: straight, narrow, blue
  const ion = g.createLinearGradient(cx, cy, 0, cy);
  ion.addColorStop(0, 'rgba(160,220,255,0.9)'); ion.addColorStop(0.35, 'rgba(110,170,255,0.35)'); ion.addColorStop(1, 'rgba(90,120,255,0)');
  g.fillStyle = ion; g.beginPath(); g.moveTo(cx, cy - 3); g.lineTo(0, cy - 10); g.lineTo(0, cy + 6); g.lineTo(cx, cy + 3); g.fill();
  // the head: a hot core in a soft coma
  const head = g.createRadialGradient(cx, cy, 0, cx, cy, 46);
  head.addColorStop(0, 'rgba(255,255,255,1)'); head.addColorStop(0.15, 'rgba(210,240,255,0.95)'); head.addColorStop(0.5, 'rgba(140,200,255,0.3)'); head.addColorStop(1, 'rgba(140,200,255,0)');
  g.fillStyle = head; g.fillRect(cx - 46, cy - 46, 92, 92);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const mk = () => new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, rotation: -0.42 }));
  const main = mk(), piece = mk();
  return { main, piece };
}

// shooting stars: three quads reused, each a streak that runs for under a second with a bright head
function meteors() {
  const group = new THREE.Group(), list = [];
  const geo = new THREE.PlaneGeometry(1, 1).translate(0.5, 0, 0);
  for (let i = 0; i < 3; i++) {
    const mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
      uniforms: { uA: { value: 0 } },
      vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: /* glsl */`
        uniform float uA; varying vec2 vUv;
        void main() {
          float across = 1.0 - abs(vUv.y * 2.0 - 1.0);
          float a = pow(vUv.x, 2.4) * across * across * uA;
          vec3 c = mix(vec3(1.0, 0.55, 0.85), vec3(0.85, 0.95, 1.0), vUv.x);
          gl_FragColor = vec4(c * a * 1.6, 1.0);
          #include <colorspace_fragment>
        }`
    });
    const m = new THREE.Mesh(geo, mat);
    m.matrixAutoUpdate = false; m.frustumCulled = false; m.visible = false;
    group.add(m); list.push({ m, life: -1, dur: 0.8, start: new THREE.Vector3(), dir: new THREE.Vector3(), len: 0 });
  }
  return { group, list };
}

// The name set in the sky well behind the summit, so the mountain stands in front of it
function nameInSky(lines) {
  const cv = document.createElement('canvas'), W = 2048, H = lines.length > 1 ? 900 : 520;
  cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  let size = lines.length > 1 ? 400 : 380;
  g.font = `600 ${size}px "Shippori Mincho B1", Georgia, serif`;
  const widest = Math.max(...lines.map(l => g.measureText(l).width));
  if (widest > W * 0.94) { size = Math.floor(size * W * 0.94 / widest); g.font = `600 ${size}px "Shippori Mincho B1", Georgia, serif`; }
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#fff8ee';
  lines.forEach((l, i) => g.fillText(l, W / 2, H / 2 + (i - (lines.length - 1) / 2) * size * 0.92));
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, fog: false, opacity: 0.9 });
  return new THREE.Mesh(new THREE.PlaneGeometry(1, H / W), mat);
}

export async function createFuji(canvas, { phone, moving, progress, still = 0.12 }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !phone, powerPreference: 'high-performance' });
  // colour is authored directly: no tone curve to wash out the twilight hues
  renderer.toneMapping = THREE.NoToneMapping;
  // full screen sharpness to start with (up to 2x on laptops, 1.5x on phones); adapt() steps down only if frames run slow
  const maxPR = Math.min(devicePixelRatio || 1, phone ? 1.5 : 2);
  let pr = phone ? Math.min(maxPR, 1.25) : maxPR;
  renderer.setPixelRatio(pr);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x8a5aa6, 0.02);
  const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 3000);

  const sky = skyDome(phone); scene.add(sky);
  const stars = starField(phone); scene.add(stars);
  const { main: cometMain, piece: cometPiece } = comet(); scene.add(cometMain, cometPiece);
  const { group: meteorGroup, list: meteorList } = meteors(); scene.add(meteorGroup);
  const { mesh: land, heights, raw } = await terrain(phone); scene.add(land);
  const bed = cloudBed(phone, raw); scene.add(bed);
  const { group: sheets, mats: sheetMats } = cloudSheets(phone, heights); scene.add(sheets);
  await document.fonts?.load?.('600 100px "Shippori Mincho B1"').catch(() => {});
  const name = nameInSky(phone ? ['Rayyan', 'Syed'] : ['Rayyan Syed']); scene.add(name);

  const hemi = new THREE.HemisphereLight(0xffffff, 0x000000, 1); scene.add(hemi);
  const glowLight = new THREE.DirectionalLight(0xffffff, 1); glowLight.position.copy(GLOW).setY(0.25).multiplyScalar(50); scene.add(glowLight);

  // where we stand: on a ridge to the north, just above the clouds, looking south at the summit
  const eye = new THREE.Vector3(4, 2.25, -18.5);
  const NAME_DIST = 48, ray = new THREE.Vector3(), tmp = new THREE.Vector3(), toCam = new THREE.Vector3(), side = new THREE.Vector3();
  let W = 0, H = 0;
  const size = () => {
    W = canvas.clientWidth; H = canvas.clientHeight;
    if (!W || !H) return;
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    // keep at least 22 degrees across on tall phones: the flanks crop, the mountain stays big
    camera.fov = Math.max(30, THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(11)) / camera.aspect)));
    camera.updateProjectionMatrix();
    const across = 2 * NAME_DIST * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect;
    name.scale.setScalar(across * (phone ? 0.86 : 0.7));
  };

  // Resolution follows the device: if frames come slower than the target, drop the pixel ratio a step;
  // after a few seconds of headroom, raise it again. Checked once a second, never every frame.
  const target = phone ? 1 / 30 : 1 / 60;
  let acc = 0, frames = 0, calm = 0;
  const adapt = dt => {
    acc += dt; frames++;
    if (acc < 1) return;
    const avg = acc / frames; acc = 0; frames = 0;
    if (avg > target * 1.45 && pr > 0.6) { pr = Math.max(0.6, pr - 0.15); calm = 0; }
    else if (avg < target * 1.08 && pr < maxPR && ++calm >= 8) { pr = Math.min(maxPR, pr + 0.1); calm = 0; }
    else return;
    renderer.setPixelRatio(pr); renderer.setSize(W, H, false);
  };

  // meteors start somewhere in the upper sky in view and fall diagonally; more of them as night comes on
  let nextMeteor = 1.5;
  const launch = (m, t) => {
    const u = lerp(0.66, 0.86, Math.random()), v = lerp(0.56, 0.7, Math.random());
    dirOf(u, v, m.start).multiplyScalar(800);
    dirOf(u + (Math.random() < 0.5 ? -1 : 1) * 0.05, v - 0.06, tmp).multiplyScalar(800);
    m.dir.copy(tmp).sub(m.start).normalize();
    m.len = 60 + Math.random() * 70; m.dur = 0.6 + Math.random() * 0.5; m.life = t;
  };
  const drawMeteor = (m, t) => {
    const k = (t - m.life) / m.dur;
    if (k >= 1) { m.life = -1; m.m.visible = false; return; }
    const head = tmp.copy(m.start).addScaledVector(m.dir, k * 160);
    const len = m.len * Math.min(1, k * 3);
    toCam.copy(camera.position).sub(head).normalize();
    side.crossVectors(m.dir, toCam).normalize().multiplyScalar(1.4);
    const back = head.clone().addScaledVector(m.dir, -len);
    m.m.matrix.makeBasis(m.dir.clone().multiplyScalar(len), side, toCam).setPosition(back);
    m.m.material.uniforms.uA.value = Math.sin(Math.PI * k);
    m.m.visible = true;
  };

  const tilt = { x: 0, y: 0, tx: 0, ty: 0 };
  const t0 = performance.now();
  const frame = (now, dt = 1 / 60) => {
    const t = (now - t0) / 1000, p = moving ? progress() : still;
    if (moving) adapt(dt);
    tilt.x += (tilt.tx - tilt.x) * 0.05; tilt.y += (tilt.ty - tilt.y) * 0.05;
    const D = day(p);

    const su = sky.material.uniforms;
    D.sky.forEach((c, i) => su.uStops.value[i].copy(c));
    su.uGlowCol.value.copy(D.glow); su.uGlow.value = D.glowI; su.uStars.value = D.stars;
    stars.material.uniforms.uTime.value = t; stars.material.uniforms.uVis.value = D.stars; stars.material.uniforms.uPR.value = pr;
    hemi.color.copy(D.hemiSky); hemi.groundColor.copy(D.hemiGround); hemi.intensity = D.hemiI;
    glowLight.color.copy(D.glow); glowLight.intensity = D.glowI;
    RIM.value.copy(D.lit).multiplyScalar(0.55);
    scene.fog.color.copy(D.haze);
    bed.position.x = moving ? -t * 0.012 : 0;
    for (const m of sheetMats) { const u = m.uniforms; u.uTime.value = moving ? t : 0; u.uLit.value.copy(D.lit); u.uShade.value.copy(D.shade); u.uHaze.value.copy(D.haze); }

    // the view lifts from the mountain toward the stars as night comes on
    const lift = ss(p, 0.2, 1);
    camera.position.set(eye.x + tilt.x * 0.5, eye.y - tilt.y * 0.12, eye.z + p * 1.6 + (moving ? Math.sin(t * 0.1) * 0.05 : 0));
    camera.lookAt(tilt.x * 0.3, 2.55 + lift * 2.4 - tilt.y * 0.1, 0);
    camera.updateMatrixWorld();

    // the comet hangs high in the east, its tails streaming away from the afterglow; at night a piece breaks off
    dirOf(0.717, 0.572, tmp).multiplyScalar(850); cometMain.position.copy(tmp);
    const cs = 110 + (moving ? Math.sin(t * 0.7) * 3 : 0);
    cometMain.scale.set(cs * 3.2, cs * 0.8, 1); cometMain.material.opacity = D.comet;
    const split = ss(p, 0.7, 1);
    cometPiece.position.copy(tmp).add(side.set(6, -4, 0).multiplyScalar(split * 2.2));
    cometPiece.scale.set(cs * 2.4, cs * 0.6, 1); cometPiece.material.opacity = D.comet * split * 0.8;

    if (moving) {
      if (t > nextMeteor) {
        const free = meteorList.find(m => m.life < 0);
        if (free) launch(free, t);
        nextMeteor = t + lerp(4.5, 1.2, D.stars) * (0.5 + Math.random());
      }
      for (const m of meteorList) if (m.life >= 0) drawMeteor(m, t);
    }

    ray.set(0, phone ? 0.36 : 0.24, 0.5).unproject(camera).sub(camera.position).normalize();
    name.position.copy(camera.position).addScaledVector(ray, NAME_DIST);
    name.lookAt(camera.position);
    renderer.render(scene, camera);
  };
  size();
  // compile every shader now, while the story is still loading, not on the first frame the visitor sees
  // (hidden meteors would otherwise compile on the frame the first one appears, a visible stall)
  meteorList.forEach(m => { m.m.visible = true; });
  renderer.compile(scene, camera);
  meteorList.forEach(m => { m.m.visible = false; });

  const ro = moving ? null : new ResizeObserver(() => { size(); frame(performance.now()); });
  const stop = moving ? loopWhileVisible(canvas, frame, { fps: phone ? 30 : 60, onResize: size }) : (ro.observe(canvas), () => ro.disconnect());
  if (!moving) frame(performance.now());
  return {
    pointer: (x, y) => { tilt.tx = x; tilt.ty = y; },
    // a shooting star aimed at a point on screen (normalised -1..1), for the make a wish easter egg
    wish(x, y) {
      const m = meteorList.find(n => n.life < 0) || meteorList[0];
      ray.set(x, y, 0.5).unproject(camera).sub(camera.position).normalize();
      tmp.copy(ray).applyAxisAngle(camera.up, 0.09).add(side.set(0, 0.07, 0)).normalize();
      m.start.copy(tmp).multiplyScalar(800);
      m.dir.copy(ray).multiplyScalar(800).sub(m.start).normalize();
      m.len = 110; m.dur = 0.9; m.life = (performance.now() - t0) / 1000;
    },
    dispose() {
      stop();
      scene.traverse(o => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) [].concat(o.material).forEach(m => { if (m.map) m.map.dispose(); if (m.uniforms?.uMilky) m.uniforms.uMilky.value.dispose(); m.dispose(); });
      });
      renderer.dispose();
    }
  };
}

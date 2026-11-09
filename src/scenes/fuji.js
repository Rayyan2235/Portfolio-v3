import * as THREE from 'three';
import { loopWhileVisible } from '../loop.js';

// Mount Fuji under an anime night sky, the first page of the story. The mountain is real elevation data
// (public/terrain/fuji-288.u16: 288 x 288 heights in metres, 125 m apart, from the Mapzen Terrarium tiles on AWS
// Open Data), rising out of a sea of painted cloud puffs. The sky follows the comet night skies of anime films:
// a magic hour band that deepens into blue, dabbed clouds drifting across a dense field of stars, the Milky Way,
// shooting stars and a twin ribbon comet. "Welcome" gathers itself out of the stars, and scroll carries the scene
// into full night as the word scatters back into the sky.
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
  { sky: ['#ffc58a', '#f08e9a', '#8e70b8', '#3d4f98', '#16235c'], hemiSky: '#e0b4c8', hemiGround: '#24285e', hemiI: 1.15, glow: '#ffa585', glowI: 0.8, haze: '#b98aaa', lit: '#f6d2d6', shade: '#5a5592', stars: 0.45, comet: 0.4 },
  { sky: ['#e8909f', '#9b6cb4', '#4d5aa6', '#253a7c', '#0e1a48'], hemiSky: '#a99ad6', hemiGround: '#1c1f50', hemiI: 0.95, glow: '#ff9aa0', glowI: 0.45, haze: '#6f6aa8', lit: '#c9c3ec', shade: '#3a3c7c', stars: 0.8, comet: 0.8 },
  { sky: ['#5f86c2', '#406aa8', '#2a4b88', '#172f62', '#08132f'], hemiSky: '#8eaee6', hemiGround: '#0c1430', hemiI: 0.8, glow: '#a8d2ff', glowI: 0.3, haze: '#3d5c94', lit: '#a9c4ec', shade: '#2c4476', stars: 1, comet: 1 }
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
// Painted cloud puffs. Four variants share one atlas, each built per pixel: a heap of soft elliptical masses,
// wide and flat underneath, lit from above (red channel) and cut out by streaky noise into ragged dry brush edges
// (alpha), the way background painters dab clouds in anime night skies.
function puffAtlas(phone) {
  const T = phone ? 160 : 256, S = T * 2, img = new ImageData(S, S);
  const hash = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
  const vn = (x, y) => {
    const X = Math.floor(x), Y = Math.floor(y), u = x - X, v = y - Y, a = hash(X, Y), b = hash(X + 1, Y), c = hash(X, Y + 1), d = hash(X + 1, Y + 1);
    const su = u * u * (3 - 2 * u), sv = v * v * (3 - 2 * v);
    return a + (b - a) * su + (c - a) * sv + (a - b - c + d) * su * sv;
  };
  const fbm = (x, y) => vn(x, y) * 0.5 + vn(x * 2.1 + 5, y * 2.1) * 0.3 + vn(x * 4.3, y * 4.3 + 9) * 0.2;
  for (let k = 0; k < 4; k++) {
    const ox = (k % 2) * T, oy = Math.floor(k / 2) * T, base = 0.68;
    const blobs = Array.from({ length: 9 + k * 2 }, () => {
      const u = Math.random(), hump = Math.sin(u * Math.PI);
      const rx = 0.09 + Math.random() * 0.13, ry = rx * (0.45 + Math.random() * 0.25);
      return [0.14 + u * 0.72, base - ry * 0.6 - hump * Math.random() * 0.22, rx, ry];
    });
    for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
      const px = x / T, py = y / T;
      let dens = 0, lit = 0;
      for (const [cx, cy, rx, ry] of blobs) {
        const dx = (px - cx) / rx, dy = (py - cy) / ry, w = Math.exp(-(dx * dx + dy * dy) * 1.6);
        dens += w; lit += w * Math.min(1, Math.max(0, 0.5 - dy * 0.45));
      }
      lit = dens > 0 ? lit / dens : 0;
      // streaky noise, stretched sideways like dry brush, eats the edges
      const n = fbm(px * 5 + k * 7, py * 14), n2 = vn(px * 40 + k, py * 90);
      let a = Math.min(1, Math.max(0, (Math.min(dens, 1.4) - 0.42 + (n - 0.5) * 0.7 + (n2 - 0.5) * 0.18) * 2.6));
      a *= Math.min(1, Math.max(0, (base + 0.05 - py) / 0.09)); // soft flat underside
      a *= Math.min(1, px * 8, (1 - px) * 8, py * 8);            // nothing reaches the tile edge
      const i = ((oy + y) * S + ox + x) * 4;
      img.data[i] = Math.round(255 * Math.min(1, lit * 0.85 + (1 - py) * 0.25 + (n - 0.5) * 0.15));
      img.data[i + 3] = Math.round(255 * a * 0.92);
    }
  }
  const tex = new THREE.DataTexture(img.data, S, S, THREE.RGBAFormat);
  tex.flipY = true; tex.colorSpace = THREE.NoColorSpace; tex.magFilter = THREE.LinearFilter; tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true; tex.needsUpdate = true;
  return tex;
}

// One instanced mesh of camera facing puffs: one draw call however many there are. Each instance carries its
// centre, size, atlas tile and a seed; light and colour come from the shared lit and shaded colours, a silver
// lining brightens thin edges, and distance blends into the haze.
function puffMesh(atlas, list, { far = 1, rim = 0.35 }) {
  const n = list.length, geo = new THREE.InstancedBufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0]), 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]), 2));
  geo.setIndex([0, 1, 2, 0, 2, 3]);
  const off = new Float32Array(n * 3), scl = new Float32Array(n * 2), tile = new Float32Array(n), seed = new Float32Array(n);
  list.forEach((p, i) => { off.set(p.at, i * 3); scl.set(p.size, i * 2); tile[i] = p.tile; seed[i] = p.seed; });
  geo.setAttribute('aOff', new THREE.InstancedBufferAttribute(off, 3));
  geo.setAttribute('aScale', new THREE.InstancedBufferAttribute(scl, 2));
  geo.setAttribute('aTile', new THREE.InstancedBufferAttribute(tile, 1));
  geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seed, 1));
  geo.instanceCount = n;
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, fog: false,
    uniforms: { uAtlas: { value: atlas }, uTime: { value: 0 }, uLit: { value: new THREE.Color() }, uShade: { value: new THREE.Color() }, uHaze: { value: new THREE.Color() }, uAlpha: { value: 1 }, uFar: { value: far }, uRim: { value: rim } },
    vertexShader: /* glsl */`
      attribute vec3 aOff; attribute vec2 aScale; attribute float aTile, aSeed;
      uniform float uTime; varying vec2 vUv; varying float vDist;
      void main() {
        vec3 c = aOff + vec3(uTime * (0.02 + aSeed * 0.02), 0.0, 0.0);
        vec4 mv = modelViewMatrix * vec4(c, 1.0);
        mv.xy += position.xy * aScale;
        vDist = length(mv.xyz);
        vUv = (uv + vec2(mod(aTile, 2.0), floor(aTile / 2.0))) * 0.5;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      uniform sampler2D uAtlas; uniform vec3 uLit, uShade, uHaze; uniform float uAlpha, uFar, uRim;
      varying vec2 vUv; varying float vDist;
      void main() {
        vec4 t = texture2D(uAtlas, vUv);
        float a = t.a;
        if (a < 0.01) discard;
        vec3 col = mix(uShade, uLit, t.r);
        col += uLit * uRim * smoothstep(0.5, 0.05, a);   // a faint silver lining where the cloud thins out
        col = mix(col, uHaze, smoothstep(6.0, 70.0, vDist) * uFar);
        // fade the nearest puffs so none ever fills the lens
        a *= uAlpha * smoothstep(2.5, 6.0, vDist);
        gl_FragColor = vec4(col * a, a);
        #include <colorspace_fragment>
      }`,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  return mesh;
}

// the sea of cloud: puffs scattered over the valleys around the mountain, kept clear of slopes that rise above
// them, sized up with distance so they read evenly to the horizon, and sorted far to near once for blending
function cloudSea(phone, atlas, h, eye) {
  const list = [], want = phone ? 260 : 620, ground = (x, z) => {
    const c = Math.round((x + SIZE / 2) / SPACING), r = Math.round((z + SIZE / 2) / SPACING);
    return c >= 0 && r >= 0 && c < GRID && r < GRID ? h[r * GRID + c] / 1000 * 1.08 : 0;
  };
  let tries = 0;
  while (list.length < want && tries++ < want * 20) {
    // banks toward the horizon only: up close the mottled sheet reads better than single puffs
    const x = (Math.random() - 0.5) * 120, z = 2 + Math.pow(Math.random(), 0.7) * 62;
    const y = 1.35 + Math.random() * 0.3;
    if (ground(x, z) > y - 0.15) continue;
    const d = Math.hypot(x - eye.x, z - eye.z), s = 1.1 + d * 0.06 + Math.random() * 0.9;
    list.push({ at: [x, y, z], size: [s * (1.4 + Math.random() * 0.6), s * 0.75], tile: Math.floor(Math.random() * 4), seed: Math.random(), d });
  }
  list.sort((a, b) => b.d - a.d);
  return puffMesh(atlas, list, { far: 1, rim: 0.12 });
}

// clouds high in the night sky, broad and thin, drifting across the stars
function skyClouds(phone, atlas) {
  const list = [], v3 = new THREE.Vector3(), n = phone ? 9 : 16;
  for (let i = 0; i < n; i++) {
    const u = lerp(0.6, 0.92, (i + Math.random() * 0.8) / n), v = lerp(0.505, 0.62, Math.random());
    dirOf(u, v, v3).multiplyScalar(600);
    const s = 50 + Math.random() * 70;
    list.push({ at: [v3.x, v3.y, v3.z], size: [s * (1.8 + Math.random()), s * (0.55 + Math.random() * 0.25)], tile: Math.floor(Math.random() * 4), seed: Math.random(), d: 600 });
  }
  const mesh = puffMesh(atlas, list, { far: 0, rim: 0.2 });
  mesh.renderOrder = 1;
  return mesh;
}

// a flat sheet of mottled cloud under the puffs, so no ground shows between them
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
          // billows on billows: a broad pattern warped by a finer one, lit along its rises like cloud tops
          vec2 p = vW.xz * 0.5 + vec2(uTime * 0.02, uTime * 0.008);
          vec2 warp = vec2(fbm(p * 0.7 + 3.0), fbm(p * 0.7 + 8.0)) * 1.6;
          float n = fbm(p + warp) * 0.65 + fbm(p * 2.6 + warp * 0.5) * 0.35;
          float ns = fbm(p + warp + vec2(-0.05, 0.04)) * 0.65 + fbm(p * 2.6 + warp * 0.5 + vec2(-0.13, 0.1)) * 0.35;
          float d = length(vW.xz - cameraPosition.xz);
          float dens = 0.9 + 0.1 * n;
          vec3 col = mix(uShade, uLit, clamp(smoothstep(0.3, 0.75, n) * 0.7 + (n - ns) * 7.0 + 0.15, 0.0, 1.0));
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
    mesh.position.y = 1.32;
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

// The comet as anime paints it: two long ribbons running side by side, one cyan and one violet to rose, brightest
// at the head and thinning out along the sky, with a couple of hairline threads alongside. Head on the left;
// the sprite is turned so the tails stream up and to the right.
function comet() {
  const W = 2048, H = 256, cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const g = cv.getContext('2d'), hx = W * 0.04, cy = H * 0.5;
  g.globalCompositeOperation = 'lighter';
  const ribbon = (dy, spread, width, stops) => {
    for (let i = 0; i < 120; i++) {
      const t = i / 120, x = hx + t * W * 0.93, y = cy + dy + t * spread, w = width * (0.35 + t * 0.9), a = Math.pow(1 - t, 1.4);
      const gr = g.createLinearGradient(0, y - w, 0, y + w);
      const c = stops(t);
      gr.addColorStop(0, `rgba(${c},0)`); gr.addColorStop(0.5, `rgba(${c},${0.22 * a})`); gr.addColorStop(1, `rgba(${c},0)`);
      g.fillStyle = gr; g.fillRect(x, y - w, W * 0.93 / 120 + 2, w * 2);
    }
  };
  const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(',');
  ribbon(-10, -26, 22, t => mix([200, 250, 255], [90, 220, 235], t));
  ribbon(14, 30, 26, t => mix([255, 210, 250], t < 0.5 ? [190, 140, 255] : [255, 150, 210], Math.abs(t - 0.5) * 2));
  // hairline threads
  g.lineWidth = 1.2;
  [[-30, -50, 'rgba(190,240,255,0.5)'], [36, 60, 'rgba(255,200,240,0.4)']].forEach(([dy, spread, col]) => {
    const gr = g.createLinearGradient(hx, 0, W * 0.6, 0);
    gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.strokeStyle = gr; g.beginPath(); g.moveTo(hx + 40, cy + dy * 0.3); g.lineTo(W * 0.6, cy + dy + spread * 0.6); g.stroke();
  });
  // the head
  const head = g.createRadialGradient(hx, cy, 0, hx, cy, 60);
  head.addColorStop(0, 'rgba(255,255,255,1)'); head.addColorStop(0.18, 'rgba(220,245,255,0.85)'); head.addColorStop(0.55, 'rgba(160,210,255,0.22)'); head.addColorStop(1, 'rgba(160,210,255,0)');
  g.fillStyle = head; g.fillRect(hx - 60, cy - 60, 120, 120);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const mk = () => new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, rotation: 0.62 }));
  // the sprite's centre sits mid ribbon: shift the texture so the head is the anchor
  const main = mk(), piece = mk();
  main.center.set(0.04, 0.5); piece.center.set(0.04, 0.5);
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

// "Welcome", written in stars. Points are sampled from the word set in the display face; each starts scattered
// across the sky and drifts into place, one after another, so the word gathers itself like a constellation. The
// cursor brushes stars aside and they settle back; as night falls on scroll they scatter up into the sky.
function welcomeStars(phone) {
  const W = 1600, H = 480, cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  let size = 360;
  g.font = `600 ${size}px "Shippori Mincho B1", Georgia, serif`;
  const w = g.measureText('Welcome').width;
  if (w > W * 0.94) { size = Math.floor(size * W * 0.94 / w); g.font = `600 ${size}px "Shippori Mincho B1", Georgia, serif`; }
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#fff';
  g.fillText('Welcome', W / 2, H / 2);
  const data = g.getImageData(0, 0, W, H).data, pts = [], step = phone ? 6 : 4;
  for (let y = 0; y < H; y += step) for (let x = 0; x < W; x += step) {
    const jx = x + (Math.random() - 0.5) * step, jy = y + (Math.random() - 0.5) * step;
    if (data[(Math.round(jy) * W + Math.round(jx)) * 4 + 3] > 140) pts.push([jx / W - 0.5, (0.5 - jy / H) * H / W]);
  }
  const n = pts.length;
  const target = new Float32Array(n * 3), start = new Float32Array(n * 3), meta = new Float32Array(n * 3), tint = new Float32Array(n * 3);
  const tints = [[1, 1, 1], [0.75, 0.95, 1], [1, 0.85, 0.95], [0.95, 0.92, 1]];
  pts.forEach(([x, y], i) => {
    target.set([x, y, 0], i * 3);
    start.set([(Math.random() - 0.5) * 2.2, (Math.random() - 0.2) * 1.2, -0.4 - Math.random() * 1.2], i * 3);
    // delay sweeps left to right with a little scatter; size; phase
    meta.set([(x + 0.5) * 0.55 + Math.random() * 0.25, 0.8 + Math.random() * 1.4, Math.random() * 50], i * 3);
    tint.set(tints[i % 4], i * 3);
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(target, 3));
  geo.setAttribute('aStart', new THREE.BufferAttribute(start, 3));
  geo.setAttribute('aMeta', new THREE.BufferAttribute(meta, 3));
  geo.setAttribute('aTint', new THREE.BufferAttribute(tint, 3));
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
    uniforms: { uForm: { value: 0 }, uScatter: { value: 0 }, uTime: { value: 0 }, uPR: { value: 1 }, uMouse: { value: new THREE.Vector2(9, 9) }, uPx: { value: 1 } },
    vertexShader: /* glsl */`
      attribute vec3 aStart, aMeta, aTint; uniform float uForm, uScatter, uTime, uPR, uPx; uniform vec2 uMouse;
      varying vec3 vC; varying float vA;
      void main() {
        float k = clamp((uForm - aMeta.x) / 0.45, 0.0, 1.0); k = k * k * (3.0 - 2.0 * k);
        vec3 p = mix(aStart, position, k);
        // a soft drift once in place, and the cursor brushing the stars aside
        p.xy += vec2(sin(uTime * 0.7 + aMeta.z), cos(uTime * 0.6 + aMeta.z * 1.3)) * 0.0016 * k;
        vec2 dm = p.xy - uMouse; float dl = length(dm);
        p.xy += dm / max(dl, 1e-4) * smoothstep(0.09, 0.0, dl) * 0.05;
        // night: the word lifts and scatters back into the sky
        p += vec3((aStart.x - p.x) * 0.6, 0.35 + aStart.y * 0.4, aStart.z * 0.5) * uScatter;
        float tw = 0.75 + 0.25 * sin(uTime * (1.5 + fract(aMeta.z) * 2.0) + aMeta.z);
        vA = mix(0.25, 1.0, k) * tw * (1.0 - uScatter * 0.85) * step(0.001, uForm);
        vC = aTint;
        gl_PointSize = aMeta.y * uPx * uPR * (0.85 + 0.3 * tw);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: /* glsl */`
      varying vec3 vC; varying float vA;
      void main() {
        vec2 q = gl_PointCoord - 0.5; float r2 = dot(q, q);
        float a = exp(-r2 * 18.0) + exp(-r2 * 140.0);
        gl_FragColor = vec4(vC * a * vA, 1.0);
        #include <colorspace_fragment>
      }`
  });
  const pointsMesh = new THREE.Points(geo, mat);
  pointsMesh.frustumCulled = false;
  return pointsMesh;
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
  const { group: sheets, mats: sheetMats } = cloudSheets(phone, heights); scene.add(sheets);
  await document.fonts?.load?.('600 100px "Shippori Mincho B1"').catch(() => {});
  const word = welcomeStars(phone); scene.add(word);

  const hemi = new THREE.HemisphereLight(0xffffff, 0x000000, 1); scene.add(hemi);
  const glowLight = new THREE.DirectionalLight(0xffffff, 1); glowLight.position.copy(GLOW).setY(0.25).multiplyScalar(50); scene.add(glowLight);

  // where we stand: on a ridge to the north, just above the clouds, looking south at the summit
  const eye = new THREE.Vector3(4, 2.25, -18.5);
  const atlas = puffAtlas(phone);
  const sea = cloudSea(phone, atlas, raw, eye); scene.add(sea);
  const high = skyClouds(phone, atlas); scene.add(high);
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
    word.scale.setScalar(across * (phone ? 0.9 : 0.62));
    // stars keep the same size on screen whatever the word's scale
    word.material.uniforms.uPx.value = Math.min(2.2, Math.max(1.3, W / 900));
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
  let mouseOn = false;
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
    for (const m of [sea.material, high.material]) { const u = m.uniforms; u.uTime.value = moving ? t : 0; u.uLit.value.copy(D.lit); u.uShade.value.copy(D.shade); u.uHaze.value.copy(D.haze); }
    high.material.uniforms.uAlpha.value = 0.35 + D.stars * 0.5;
    for (const m of sheetMats) { const u = m.uniforms; u.uTime.value = moving ? t : 0; u.uLit.value.copy(D.lit); u.uShade.value.copy(D.shade); u.uHaze.value.copy(D.haze); }

    // the view lifts from the mountain toward the stars as night comes on; on arrival it glides in from further back
    const lift = ss(p, 0.2, 1), arrive = moving ? 1 - ss(t, 0, 3.2) : 0;
    camera.position.set(eye.x + tilt.x * 0.5, eye.y - tilt.y * 0.12 + arrive * 0.25, eye.z + p * 1.6 - arrive * 3 + (moving ? Math.sin(t * 0.1) * 0.05 : 0));
    camera.lookAt(tilt.x * 0.3, 2.55 + lift * 2.4 - tilt.y * 0.1, 0);
    camera.updateMatrixWorld();

    // the comet's head hangs low in the east with its ribbons streaming up across the sky; late at night a
    // fragment breaks off and falls its own way
    dirOf(0.69, 0.545, tmp).multiplyScalar(850); cometMain.position.copy(tmp);
    const cs = 120 + (moving ? Math.sin(t * 0.7) * 2 : 0);
    cometMain.scale.set(cs * 4.6, cs * 0.58, 1); cometMain.material.opacity = D.comet;
    const split = ss(p, 0.7, 1);
    cometPiece.position.copy(tmp).add(side.set(-10, -14, 0).multiplyScalar(split * 2.2));
    cometPiece.material.rotation = 0.9;
    cometPiece.scale.set(cs * 2.2, cs * 0.3, 1); cometPiece.material.opacity = D.comet * split * 0.9;

    if (moving) {
      if (t > nextMeteor) {
        const free = meteorList.find(m => m.life < 0);
        if (free) launch(free, t);
        nextMeteor = t + lerp(4.5, 1.2, D.stars) * (0.5 + Math.random());
      }
      for (const m of meteorList) if (m.life >= 0) drawMeteor(m, t);
    }

    ray.set(0, phone ? 0.4 : 0.36, 0.5).unproject(camera).sub(camera.position).normalize();
    word.position.copy(camera.position).addScaledVector(ray, NAME_DIST);
    word.lookAt(camera.position); word.updateMatrixWorld();
    const wu = word.material.uniforms;
    wu.uTime.value = t; wu.uPR.value = pr;
    wu.uForm.value = moving ? ss(t, 0.4, 4.2) * 1.45 : 1.45;
    wu.uScatter.value = ss(p, 0.32, 0.75);
    // where the cursor meets the word's plane, in the word's own units
    if (mouseOn) {
      ray.set(tilt.tx, -tilt.ty, 0.5).unproject(camera).sub(camera.position).normalize();
      tmp.copy(camera.position).addScaledVector(ray, NAME_DIST);
      word.worldToLocal(tmp); wu.uMouse.value.set(tmp.x, tmp.y);
    }
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
    pointer: (x, y) => { tilt.tx = x; tilt.ty = y; mouseOn = true; },
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

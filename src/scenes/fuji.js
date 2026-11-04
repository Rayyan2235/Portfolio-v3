import * as THREE from 'three';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import { loopWhileVisible } from '../loop.js';

// Mount Fuji at sunrise above a sea of clouds. The mountain is real elevation data (public/terrain/fuji-288.u16:
// 288 x 288 heights in metres, 125 m apart, from the Mapzen Terrarium tiles on AWS Open Data). The look follows
// what makes igloo.inc read as real (taken apart with rea): physically based light, haze that thickens with
// distance, and grain over the top, rather than glossy toy materials. Scroll raises the sun from the blue hour
// through the red glow on the slopes (aka fuji) into morning. Units are kilometres. Only draws while on screen.

const GRID = 288, SPACING = 0.1247, SIZE = (GRID - 1) * SPACING, TOP = 4.2;

// value noise and fbm shared by the terrain and cloud shaders
const NOISE = /* glsl */`
  float h21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
  float vn(vec2 p) {
    vec2 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f);
    return mix(mix(h21(i), h21(i + vec2(1, 0)), u.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), u.x), u.y);
  }
  float fbm(vec2 p) { float a = 0.5, s = 0.0; for (int i = 0; i < OCTAVES; i++) { s += a * vn(p); p = p * 2.03 + 17.1; a *= 0.5; } return s; }
`;

async function terrain(phone) {
  const buf = await (await fetch('/terrain/fuji-288.u16')).arrayBuffer();
  const h = new Uint16Array(buf);
  // phones take every other sample: a quarter of the triangles, still the same mountain
  const stepN = phone ? 2 : 1, n = Math.floor((GRID - 1) / stepN) + 1;
  const geo = new THREE.PlaneGeometry(SIZE, SIZE, n - 1, n - 1);
  geo.rotateX(-Math.PI / 2); // row 0 of the data is north, which lands at -z
  const pos = geo.attributes.position;
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) pos.setY(r * n + c, h[(r * stepN) * GRID + c * stepN] / 1000 * 1.08);
  geo.computeVertexNormals();
  const bytes = new Uint8Array(GRID * GRID);
  for (let i = 0; i < bytes.length; i++) bytes[i] = Math.min(255, Math.round(h[i] / 1000 * 1.08 / TOP * 255));
  const heights = new THREE.DataTexture(bytes, GRID, GRID, THREE.RedFormat, THREE.UnsignedByteType);
  heights.magFilter = heights.minFilter = THREE.LinearFilter; heights.needsUpdate = true;

  const mat = new THREE.MeshStandardMaterial({ roughness: 0.9, metalness: 0 });
  mat.onBeforeCompile = s => {
    s.vertexShader = s.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vW;\nvarying vec3 vWN;')
      .replace('#include <defaultnormal_vertex>', '#include <defaultnormal_vertex>\nvWN = normalize(mat3(modelMatrix) * objectNormal);')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    s.fragmentShader = s.fragmentShader
      .replace('#include <common>', `#include <common>\nvarying vec3 vW;\nvarying vec3 vWN;\n#define OCTAVES ${phone ? 3 : 5}\n${NOISE}\nfloat snowAmt;`)
      .replace('#include <color_fragment>', /* glsl */`
        // radial gullies running down from the crater; snow lingers in them below the snowline
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
        vec3 rock = mix(vec3(0.10, 0.055, 0.042), vec3(0.19, 0.095, 0.065), fbm(vW.xz * 7.0));
        rock = mix(rock, vec3(0.06, 0.05, 0.05), smoothstep(0.35, 0.75, gully) * 0.5);
        vec3 forest = mix(vec3(0.025, 0.04, 0.022), vec3(0.05, 0.06, 0.03), nz);
        vec3 col = mix(rock, forest, trees * (1.0 - slope * 0.7));
        diffuseColor.rgb = mix(col, vec3(0.82, 0.85, 0.9), snowAmt);
      `)
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = mix(0.95, 0.55, snowAmt);')
      .replace('#include <normal_fragment_maps>', /* glsl */`#include <normal_fragment_maps>
        // fine relief the 125 m grid cannot hold: lava ribs and scree, softened under snow
        vec2 q = vW.xz * 9.0; float d0 = fbm(q);
        vec3 dn = vec3(d0 - fbm(q + vec2(0.14, 0.0)), 0.0, d0 - fbm(q + vec2(0.0, 0.14))) * (1.5 - snowAmt);
        normal = normalize(normal + (viewMatrix * vec4(dn, 0.0)).xyz);
      `);
  };
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = mesh.receiveShadow = true;
  return { mesh, heights, raw: h };
}

// value noise on the CPU for the cloud bed, matching the shaders' feel
const hashJ = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
const smJ = v => v * v * (3 - 2 * v);
function vnJ(x, y) {
  const X = Math.floor(x), Y = Math.floor(y), u = smJ(x - X), v = smJ(y - Y);
  const a = hashJ(X, Y), b = hashJ(X + 1, Y), c = hashJ(X, Y + 1), d = hashJ(X + 1, Y + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
const fbmJ = (x, y) => vnJ(x, y) * 0.55 + vnJ(x * 2.1 + 7, y * 2.1) * 0.28 + vnJ(x * 4.4, y * 4.4 + 3) * 0.17;

function cloudBed(phone, h) {
  const span = 64, n = phone ? 170 : 300;
  const geo = new THREE.PlaneGeometry(span, span, n, n).rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    // rounded tops and creased valleys, low and broad like a real sea of cloud seen from above
    const billow = THREE.MathUtils.smoothstep(fbmJ(x * 0.7, z * 0.7), 0.3, 0.78) * 0.3 + Math.pow(fbmJ(x * 2.2 + 4, z * 2.2), 2) * 0.08;
    // sink toward the edge of the bed so it slips under the far cloud sheets instead of ending in a line
    const edge = Math.max(Math.abs(x), Math.abs(z)) / (span / 2);
    // where the mountain stands, the bed sinks below the ground so the slopes rise cleanly out of it
    const c = Math.round((x + SIZE / 2) / SPACING), r = Math.round((z - 6 + SIZE / 2) / SPACING); // the bed sits 6 km north
    const ground = c >= 0 && r >= 0 && c < GRID && r < GRID ? h[r * GRID + c] / 1000 * 1.08 : 0;
    pos.setY(i, 1.42 + billow * (1 - THREE.MathUtils.smoothstep(edge, 0.6, 1)) - THREE.MathUtils.smoothstep(edge, 0.75, 1) * 0.3 - Math.max(0, ground - 1.5) * 0.6);
  }
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: '#f3eff2', roughness: 1, metalness: 0, emissive: '#ffffff', emissiveIntensity: 0.06 }));
  mesh.position.z = -6; mesh.receiveShadow = true;
  return mesh;
}

// A sea of clouds: stacked sheets of the same noise, densest at the bottom so the mountain rises out of something
// with depth, lit pink from the sun side and fading into the horizon haze
function cloudSea(phone, heights) {
  const layers = phone ? 2 : 3, group = new THREE.Group(), mats = [];
  const geo = new THREE.PlaneGeometry(220, 220, 1, 1).rotateX(-Math.PI / 2);
  for (let i = 0; i < layers; i++) {
    const m = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      uniforms: { uHeight: { value: heights }, uSize: { value: SIZE }, uTop: { value: TOP }, uTime: { value: 0 }, uSun: { value: new THREE.Vector3() }, uLit: { value: new THREE.Color() }, uShade: { value: new THREE.Color() }, uHaze: { value: new THREE.Color() }, uLayer: { value: i / Math.max(1, layers - 1) } },
      vertexShader: 'varying vec3 vW; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
      fragmentShader: /* glsl */`
        #define OCTAVES ${phone ? 4 : 5}
        uniform float uTime, uLayer, uSize, uTop; uniform sampler2D uHeight; uniform vec3 uSun, uLit, uShade, uHaze; varying vec3 vW;
        ${NOISE}
        void main() {
          vec2 p = vW.xz * 0.32 + vec2(uTime * 0.02, uTime * 0.008);
          float n = fbm(p), ns = fbm(p + normalize(uSun.xz + 1e-4) * 0.08);
          float far = smoothstep(14.0, 34.0, length(vW.xz - cameraPosition.xz));
          float dens = mix(smoothstep(0.5 + uLayer * 0.1, 0.8, n) * (0.55 - uLayer * 0.3), 0.97 - uLayer * 0.3, far);
          // brighter where the billows rise toward the sun, darker in their lee
          float lit = clamp(0.5 + (n - ns) * 7.0 + uLayer * 0.25, 0.0, 1.0);
          vec3 col = mix(uShade, uLit, lit) * (0.8 + 0.4 * n);
          // thin out where the slope comes up through the sheet, instead of a hard waterline
          vec2 uv = (vW.xz + uSize * 0.5) / uSize;
          float ground = all(greaterThan(uv, vec2(0.0))) && all(lessThan(uv, vec2(1.0))) ? texture2D(uHeight, uv).r * uTop : 0.0;
          dens *= smoothstep(-0.02, 0.16, vW.y - ground);
          float d = length(vW.xz - cameraPosition.xz);
          col = mix(col, uHaze, smoothstep(6.0, 90.0, d));
          gl_FragColor = vec4(col, dens * (1.0 - smoothstep(80.0, 105.0, d)));
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`
    });
    const mesh = new THREE.Mesh(geo, m);
    mesh.position.y = 1.6 + i * 0.09; // the lowest sheet lies in the valleys of the bed, softening it mesh.renderOrder = 1 + i;
    group.add(mesh); mats.push(m);
  }
  return { group, mats };
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
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false, fog: false, opacity: 0.92 });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, H / W), mat);
  return mesh;
}

// light by sun elevation in degrees: the blue hour, the red glow at sunrise, then morning
const KEYS = [
  { e: -5, sun: [0.3, 0.35, 0.6], sunI: 0, hemi: [0.16, 0.2, 0.4], hemiI: 0.9, haze: [0.2, 0.24, 0.42], lit: [0.42, 0.47, 0.68], shade: [0.16, 0.19, 0.34], exp: 0.62, ink: 0.9 },
  { e: 0.6, sun: [1, 0.36, 0.16], sunI: 3.2, hemi: [0.5, 0.42, 0.6], hemiI: 0.6, haze: [0.9, 0.55, 0.45], lit: [1, 0.62, 0.5], shade: [0.42, 0.34, 0.48], exp: 0.5, ink: 0.92 },
  { e: 5, sun: [1, 0.66, 0.42], sunI: 3.6, hemi: [0.6, 0.66, 0.85], hemiI: 0.6, haze: [0.92, 0.8, 0.72], lit: [1, 0.9, 0.8], shade: [0.55, 0.55, 0.66], exp: 0.44, ink: 0.8 },
  { e: 14, sun: [1, 0.94, 0.86], sunI: 3.8, hemi: [0.55, 0.68, 0.95], hemiI: 0.7, haze: [0.74, 0.82, 0.93], lit: [1, 0.98, 0.96], shade: [0.6, 0.65, 0.76], exp: 0.38, ink: 0.7 }
];
function light(e) {
  let i = 0; while (i < KEYS.length - 2 && e > KEYS[i + 1].e) i++;
  const A = KEYS[i], B = KEYS[i + 1], t = THREE.MathUtils.smoothstep(e, A.e, B.e), out = {};
  for (const k of Object.keys(A)) out[k] = Array.isArray(A[k]) ? A[k].map((v, j) => v + (B[k][j] - v) * t) : A[k] + (B[k] - A[k]) * t;
  return out;
}

export async function createFuji(canvas, { phone, moving, progress, still = 0.32 }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !phone, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, phone ? 1 : 1.25));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x334466, 0.018);
  const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 9000);

  const sky = new Sky(); sky.scale.setScalar(4000); scene.add(sky);
  const su = sky.material.uniforms;
  su.turbidity.value = 5; su.rayleigh.value = 2.2; su.mieCoefficient.value = 0.004; su.mieDirectionalG.value = 0.82;
  // the sky also lights the scene: a second sky in its own scene is rendered into an environment map now and then
  const envSky = new Sky(); envSky.scale.setScalar(4000); envSky.material = sky.material;
  const envScene = new THREE.Scene(); envScene.add(envSky);
  const pmrem = new THREE.PMREMGenerator(renderer);
  let envRT = null, envE = 99;

  const { mesh: land, heights, raw } = await terrain(phone); scene.add(land);
  const bed = cloudBed(phone, raw); scene.add(bed);
  const { group: clouds, mats: cloudMats } = cloudSea(phone, heights); scene.add(clouds);
  await document.fonts?.load?.('600 100px "Shippori Mincho B1"').catch(() => {});
  const name = nameInSky(phone ? ['Rayyan', 'Syed'] : ['Rayyan Syed']); scene.add(name);

  const sun = new THREE.DirectionalLight(0xffffff, 3); sun.castShadow = true;
  sun.shadow.mapSize.set(phone ? 1024 : 2048, phone ? 1024 : 2048);
  Object.assign(sun.shadow.camera, { left: -20, right: 20, top: 20, bottom: -20, near: 1, far: 120 });
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.04;
  scene.add(sun, sun.target);
  const hemi = new THREE.HemisphereLight(0xffffff, 0x1a1410, 0.6); scene.add(hemi);

  // where we stand: on a ridge to the north, just above the clouds, looking south at the summit
  const eye = new THREE.Vector3(4, 2.25, -18.5), look = new THREE.Vector3(0, 2.55, 0);
  const sunDir = new THREE.Vector3();
  const size = () => {
    const W = canvas.clientWidth, h = canvas.clientHeight;
    if (!W || !h) return;
    renderer.setSize(W, h, false);
    camera.aspect = W / h;
    // keep at least 22 degrees across on tall phones: the flanks crop, the mountain stays big
    camera.fov = Math.max(30, THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(11)) / camera.aspect)));
    camera.updateProjectionMatrix();
    // the name spans about 70% of the view, wherever the screen is
    const across = 2 * NAME_DIST * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect;
    name.scale.setScalar(across * (phone ? 0.86 : 0.7));
  };
  const NAME_DIST = 48, ray = new THREE.Vector3();

  const tilt = { x: 0, y: 0, tx: 0, ty: 0 };
  const t0 = performance.now();
  const frame = now => {
    const t = (now - t0) / 1000, p = moving ? progress() : still;
    tilt.x += (tilt.tx - tilt.x) * 0.05; tilt.y += (tilt.ty - tilt.y) * 0.05;
    const e = -5 + p * 19, L = light(e);
    // summer sunrise is east-northeast: behind the left shoulder from here, so the face we see takes the red light
    const er = THREE.MathUtils.degToRad(e), az = THREE.MathUtils.degToRad(-35);
    sunDir.set(Math.cos(er) * Math.cos(az), Math.sin(er), Math.cos(er) * Math.sin(az));
    su.sunPosition.value.copy(sunDir);
    sun.position.copy(sunDir).multiplyScalar(60); sun.color.setRGB(...L.sun); sun.intensity = L.sunI;
    hemi.color.setRGB(...L.hemi); hemi.intensity = L.hemiI;
    scene.fog.color.setRGB(...L.haze);
    renderer.toneMappingExposure = L.exp;
    name.material.opacity = L.ink;
    bed.position.x = moving ? -t * 0.012 : 0;
    for (const m of cloudMats) { const u = m.uniforms; u.uTime.value = moving ? t : 0; u.uSun.value.copy(sunDir); u.uLit.value.setRGB(...L.lit); u.uShade.value.setRGB(...L.shade); u.uHaze.value.setRGB(...L.haze); }
    if (Math.abs(e - envE) > 0.75) {
      const next = pmrem.fromScene(envScene, 0, 1, 9000);
      if (envRT) envRT.dispose();
      envRT = next; envE = e; scene.environment = envRT.texture;
    }
    // a slow drift forward as the sun comes up, and a little give toward the cursor
    camera.position.set(eye.x + tilt.x * 0.5, eye.y + p * 0.15 - tilt.y * 0.12, eye.z + p * 2.2 + (moving ? Math.sin(t * 0.1) * 0.05 : 0));
    camera.lookAt(look.x + tilt.x * 0.3, look.y - tilt.y * 0.1, look.z);
    camera.updateMatrixWorld();
    ray.set(0, phone ? 0.36 : 0.24, 0.5).unproject(camera).sub(camera.position).normalize();
    name.position.copy(camera.position).addScaledVector(ray, NAME_DIST);
    name.lookAt(camera.position);
    renderer.render(scene, camera);
  };
  size();

  const ro = moving ? null : new ResizeObserver(() => { size(); frame(performance.now()); });
  const stop = moving ? loopWhileVisible(canvas, frame, { fps: phone ? 30 : 60, onResize: size }) : (ro.observe(canvas), () => ro.disconnect());
  if (!moving) frame(performance.now());
  return {
    pointer: (x, y) => { tilt.tx = x; tilt.ty = y; },
    dispose() {
      stop();
      scene.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) [].concat(o.material).forEach(m => { if (m.map) m.map.dispose(); m.dispose(); }); });
      if (envRT) envRT.dispose(); pmrem.dispose(); renderer.dispose();
    }
  };
}

import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { loopWhileVisible } from '../loop.js';

// Red Fuji in glazed porcelain, after Hokusai's Fine Wind, Clear Morning: brick red slopes, snow running down the
// gullies, a band of forest at the foot. It sits on a floating island of indigo glaze with a kintsugi gold rim, and
// gold mist clouds (the kasumi of folding screens) orbit it. Everything is modelled here in code, no assets.
// Scroll turns one day over it, dawn to night; the cursor tilts it. Only draws while on screen.

// value noise, enough for erosion gullies and lumpy rock
const hash = (x, y, z) => { const h = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return h - Math.floor(h); };
const sm = t => t * t * (3 - 2 * t);
const lerp = (a, b, t) => a + (b - a) * t;
function noise(x, y, z) {
  const X = Math.floor(x), Y = Math.floor(y), Z = Math.floor(z), u = sm(x - X), v = sm(y - Y), w = sm(z - Z);
  const c = (i, j, k) => hash(X + i, Y + j, Z + k);
  return lerp(lerp(lerp(c(0, 0, 0), c(1, 0, 0), u), lerp(c(0, 1, 0), c(1, 1, 0), u), v),
    lerp(lerp(c(0, 0, 1), c(1, 0, 1), u), lerp(c(0, 1, 1), c(1, 1, 1), u), v), w);
}
const fbm = (x, y, z) => noise(x, y, z) * 0.55 + noise(x * 2.1, y * 2.1, z * 2.1) * 0.3 + noise(x * 4.3, y * 4.3, z * 4.3) * 0.15;
const step = (a, b, x) => sm(Math.min(1, Math.max(0, (x - a) / (b - a))));

// Lathe geometry duplicates its seam; average the two columns' normals so no line shows down the side
function healSeam(geo, rows) {
  const n = geo.attributes.normal, last = n.count - rows;
  for (let j = 0; j < rows; j++) {
    const a = j, b = last + j;
    const x = n.getX(a) + n.getX(b), y = n.getY(a) + n.getY(b), z = n.getZ(a) + n.getZ(b), l = Math.hypot(x, y, z) || 1;
    n.setXYZ(a, x / l, y / l, z / l); n.setXYZ(b, x / l, y / l, z / l);
  }
}

const H = 2.45, BASE = 2.5, CRATER = 0.26, SEA = 2.78;
function mountain(phone) {
  const pts = [new THREE.Vector2(0.001, H - 0.12), new THREE.Vector2(CRATER * 0.7, H - 0.08), new THREE.Vector2(CRATER, H)];
  const rows = phone ? 48 : 76;
  // concave like the real cone: steep near the top, flaring out at the foot
  for (let i = 1; i <= rows; i++) { const t = i / rows; pts.push(new THREE.Vector2(CRATER + (BASE - CRATER) * Math.pow(t, 1.85), H * (1 - t))); }
  const geo = new THREE.LatheGeometry(pts, phone ? 128 : 200);
  const pos = geo.attributes.position, col = new Float32Array(pos.count * 3);
  const red = new THREE.Color('#c0391a'), deep = new THREE.Color('#842611'), snow = new THREE.Color('#f7f2e8'), forest = new THREE.Color('#2b4a33');
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i), z = pos.getZ(i); const y = pos.getY(i), r = Math.hypot(x, z), h = y / H;
    const a = Math.atan2(z, x);
    // two sets of uneven ridges running down the slope, so the gullies never read as pleats
    const n1 = fbm(x * 0.6 + 3, y * 0.5, z * 0.6), n2 = fbm(x * 1.3, y * 0.9 + 5, z * 1.3);
    const ridge = Math.pow(0.55 * Math.abs(Math.sin(a * 9 + n1 * 6)) + 0.45 * Math.abs(Math.sin(a * 21 + n2 * 9)), 0.7);
    const dent = (1 - ridge) * 0.075 * step(0.15, 0.75, h) * (1 - step(0.82, 0.97, h)) + (fbm(x * 1.4, y * 1.4, z * 1.4) - 0.5) * 0.16 * (1 - h);
    if (r > 0.01) { const k = Math.max(0.2, (r - dent) / r); x *= k; z *= k; pos.setX(i, x); pos.setZ(i, z); }
    // snow reaches further down the gullies; forest along the foot; streaky red glaze between
    const line = 0.6 + (fbm(x * 2, 3, z * 2) - 0.5) * 0.22 - (1 - ridge) * 0.22;
    const wood = 0.14 + fbm(x * 3, 1, z * 3) * 0.1;
    c.copy(red).lerp(deep, step(0.35, 0.8, fbm(a * 3, y * 4, 1)) * 0.55 + (1 - h) * 0.25);
    c.lerp(forest, 1 - step(wood - 0.03, wood + 0.03, h));
    c.lerp(snow, step(line - 0.02, line + 0.02, h));
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.computeVertexNormals(); healSeam(geo, pts.length);
  return new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.4, clearcoat: 0.55, clearcoatRoughness: 0.12 }));
}

function island(phone) {
  const g = new THREE.Group();
  const glaze = (color, roughness) => new THREE.MeshPhysicalMaterial({ color, roughness, clearcoat: 1, clearcoatRoughness: 0.1 });
  // the sea around the foot, with a ring of foam where it meets the mountain
  const waves = glaze('#ffffff', 0.3); waves.map = seigaiha();
  const sea = new THREE.Mesh(new THREE.CylinderGeometry(SEA, SEA - 0.06, 0.14, phone ? 96 : 160), [glaze('#173a66', 0.26), waves, glaze('#173a66', 0.26)]);
  sea.position.y = -0.07; g.add(sea);
  const foam = new THREE.Mesh(new THREE.TorusGeometry(BASE + 0.05, 0.022, 8, phone ? 120 : 200), new THREE.MeshPhysicalMaterial({ color: '#f7f2e8', roughness: 0.3, clearcoat: 1 }));
  foam.rotation.x = Math.PI / 2; foam.position.y = 0.004; g.add(foam);
  // the rock hanging underneath, lumpy and tapering to a point
  const pts = [], depth = 1.7, top = SEA - 0.06;
  for (let i = 0; i <= 30; i++) { const t = i / 30; pts.push(new THREE.Vector2(Math.max(0.02, top * Math.pow(1 - t, 0.7)), -0.14 - t * depth)); }
  const geo = new THREE.LatheGeometry(pts, phone ? 72 : 120), pos = geo.attributes.position;
  const lump = (x, y, z) => 1 + (fbm(x * 1.1 + 9, y * 1.5, z * 1.1) - 0.5) * 0.4 * step(-0.25, -0.7, y);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i), r = Math.hypot(x, z);
    if (r < 0.03) continue;
    const k = lump(x, y, z);
    pos.setX(i, x * k); pos.setZ(i, z * k);
  }
  geo.computeVertexNormals(); healSeam(geo, pts.length);
  g.add(new THREE.Mesh(geo, glaze('#16233f', 0.42)));
  // kintsugi: a gold rim, and one gold seam running down the rock
  const gold = new THREE.MeshStandardMaterial({ color: '#d9a441', metalness: 1, roughness: 0.26 });
  const rim = new THREE.Mesh(new THREE.TorusGeometry(SEA + 0.005, 0.045, 16, phone ? 140 : 240), gold);
  rim.rotation.x = Math.PI / 2; g.add(rim);
  const seam = [];
  for (let i = 0; i <= 24; i++) {
    // follow the rock's own lumps so the gold sits in the surface instead of floating off it
    const t = i / 24, y = -0.16 - t * 0.92 * depth, a = 0.9 + Math.sin(t * 9) * 0.12 + t * 0.4;
    const r0 = top * Math.pow(1 - (-y - 0.14) / depth, 0.7), x0 = Math.cos(a) * r0, z0 = Math.sin(a) * r0, k = lump(x0, y, z0) * 1.005;
    seam.push(new THREE.Vector3(x0 * k, y, z0 * k));
  }
  g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(seam), 80, 0.022, 6), gold));
  return { group: g, gold };
}

// Gold clouds as folding screens draw them: a flat band with a row of round bumps along the top, cut from one
// outline and given a soft bevel, with a smaller band tucked behind for depth
function cloudShape(bumps) {
  const s = new THREE.Shape(), total = bumps.reduce((n, r) => n + r * 1.7, 0);
  let x = -total / 2;
  s.moveTo(x, 0);
  bumps.forEach(r => { x += r * 0.85; s.absarc(x, 0, r, Math.PI, 0, true); x += r * 0.85; });
  s.lineTo(x, 0); s.lineTo(-total / 2, 0);
  return s;
}
function clouds(gold, phone) {
  const opts = { depth: 0.12, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: phone ? 2 : 4, curveSegments: phone ? 8 : 16 };
  const shapes = [[0.32, 0.5, 0.62, 0.44, 0.3], [0.28, 0.46, 0.36], [0.3, 0.52, 0.4, 0.26]].map(b => { const g = new THREE.ExtrudeGeometry(cloudShape(b), opts); g.center(); return g; });
  const ring = new THREE.Group(), list = [];
  const spots = [[0.2, 1.2, 3.5, 0.62], [1.9, 2.05, 3.25, 0.5], [3.4, 0.8, 3.7, 0.7], [4.8, 1.7, 3.35, 0.52], [5.7, 0.45, 3.9, 0.46]];
  spots.forEach(([a, y, r, s], n) => {
    const c = new THREE.Group();
    const front = new THREE.Mesh(shapes[n % 3], gold), back = new THREE.Mesh(shapes[(n + 1) % 3], gold);
    back.position.set(0.7, -0.22, -0.18); back.scale.setScalar(0.75);
    c.add(front, back);
    c.scale.setScalar(s);
    list.push({ c, a, y, r, speed: 0.04 + (n % 2) * 0.025 });
    ring.add(c);
  });
  return { ring, list };
}

// Seigaiha, the overlapping wave scallops of Edo textiles, painted once onto the sea's top
function seigaiha() {
  const cv = document.createElement('canvas'), S = 256, R = S / 4;
  cv.width = cv.height = S;
  const g = cv.getContext('2d');
  g.fillStyle = '#173a66'; g.fillRect(0, 0, S, S);
  g.lineWidth = 4;
  for (let row = -1; row <= 8; row++) {
    for (let col = -1; col <= 4; col++) {
      const cx = col * R * 2 + (row % 2 ? R : 0), cy = row * R / 2;
      for (let k = 4; k >= 1; k--) {
        g.beginPath(); g.arc(cx, cy, R * k / 4, Math.PI, 0);
        g.fillStyle = k % 2 ? '#173a66' : '#1d4677'; g.fill();
        g.strokeStyle = 'rgba(240, 232, 214, .55)'; g.stroke();
      }
    }
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(2.5, 2.5); tex.anisotropy = 4;
  return tex;
}

// one day over the mountain: dawn, noon, night
const DAY = [
  { key: '#ffad7a', keyI: 3.0, keyPos: [-7, 2.4, 5], hemi: '#ffe2c6', hemiI: 0.6, rimI: 0.5, env: 0.5, exp: 1.0, glow: 0 },
  { key: '#fff6ea', keyI: 2.6, keyPos: [-2, 8, 6], hemi: '#eaf1ff', hemiI: 0.75, rimI: 0.6, env: 0.6, exp: 1.0, glow: 0 },
  { key: '#8fa6ff', keyI: 0.9, keyPos: [6, 6, 3], hemi: '#2b3763', hemiI: 0.4, rimI: 1.2, env: 0.2, exp: 0.95, glow: 0.5 }
];
const ca = new THREE.Color(), cb = new THREE.Color();
function at(p, k) {
  const s = Math.min(1.999, Math.max(0, p) * 2), i = Math.floor(s), t = sm(s - i), A = DAY[i][k], B = DAY[i + 1][k];
  if (typeof A === 'number') return lerp(A, B, t);
  if (Array.isArray(A)) return A.map((v, j) => lerp(v, B[j], t));
  return ca.set(A).lerp(cb.set(B), t);
}

export function createFuji(canvas, { phone, moving, progress }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, phone ? 1.25 : 1.5));
  // neutral keeps the brick red red; filmic curves push it to pink
  renderer.toneMapping = THREE.NeutralToneMapping;
  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = env; pmrem.dispose();

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 200);
  const world = new THREE.Group(); scene.add(world);
  const spin = new THREE.Group(); world.add(spin);
  spin.add(mountain(phone));
  const { group: base, gold } = island(phone); spin.add(base);
  const { ring, list } = clouds(gold, phone); world.add(ring);
  gold.emissive.set('#e0a040');

  const hemi = new THREE.HemisphereLight('#ffe2c6', '#2a2440', 0.6); scene.add(hemi);
  const key = new THREE.DirectionalLight('#ffad7a', 3); scene.add(key);
  const rim = new THREE.DirectionalLight('#9fb8ff', 0.5); rim.position.set(5, 3, -6); scene.add(rim);

  let dist = 13.5;
  const size = () => {
    const W = canvas.clientWidth, h = canvas.clientHeight;
    if (!W || !h) return;
    renderer.setSize(W, h, false);
    camera.aspect = W / h; camera.updateProjectionMatrix();
    // keep the island in frame on tall phones
    dist = Math.max(13.5, (phone ? 6 : 6.6) / (2 * Math.tan(THREE.MathUtils.degToRad(15)) * camera.aspect));
  };
  const tilt = { x: 0, y: 0, tx: 0, ty: 0 };
  const t0 = performance.now();
  const frame = now => {
    const t = (now - t0) / 1000, p = progress();
    tilt.x += (tilt.tx - tilt.x) * 0.06; tilt.y += (tilt.ty - tilt.y) * 0.06;
    spin.rotation.y = (moving ? t * 0.07 : 0) + p * 1.3;
    world.position.y = moving ? Math.sin(t * 0.6) * 0.07 : 0;
    world.rotation.x = tilt.y * 0.12; world.rotation.z = -tilt.x * 0.06;
    list.forEach(({ c, a, y, r, speed }, n) => {
      const ang = a + (moving ? t * speed : 0) + p * 0.8;
      c.position.set(Math.cos(ang) * r, y + (moving ? Math.sin(t * 0.8 + n) * 0.06 : 0), Math.sin(ang) * r);
      c.rotation.y = Math.cos(ang) * 0.35; // face the viewer, turning a little as they pass
    });
    // the camera climbs a little and comes closer as the day turns
    camera.position.set(tilt.x * 0.6, 1.4 + p * 1.2, dist - p * 2);
    camera.lookAt(0, (phone ? 0.9 : 0.3) + p * 0.3, 0); // phones look higher so the island sits lower on the tall screen
    key.color.copy(at(p, 'key')); key.intensity = at(p, 'keyI'); key.position.set(...at(p, 'keyPos'));
    hemi.color.copy(at(p, 'hemi')); hemi.intensity = at(p, 'hemiI'); rim.intensity = at(p, 'rimI');
    scene.environmentIntensity = at(p, 'env');
    renderer.toneMappingExposure = at(p, 'exp');
    gold.emissiveIntensity = at(p, 'glow');
    renderer.render(scene, camera);
  };
  size();

  // with motion off it draws one still frame, and again only when the canvas changes size
  const still = () => { size(); frame(performance.now()); };
  const ro = moving ? null : new ResizeObserver(still);
  const stop = moving ? loopWhileVisible(canvas, frame, { fps: phone ? 30 : 60, onResize: size }) : (ro.observe(canvas), () => ro.disconnect());
  return {
    pointer: (x, y) => { tilt.tx = x; tilt.ty = y; },
    dispose() {
      stop();
      scene.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) [].concat(o.material).forEach(m => { if (m.map) m.map.dispose(); m.dispose(); }); });
      env.dispose(); renderer.dispose();
    }
  };
}

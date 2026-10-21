import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { usePrefs } from '../prefs.jsx';
import { SKIES, resolveSky } from '../sky.js';

// A small island shrine: torii with a curved roof, stone lantern, a cherry tree shedding petals,
// pines, and calm water that fades into the page. Lit by the same sky as the hero.
// Drop a model at public/models/scene.glb to replace the island.
const MODEL_URL = '/models/scene.glb';

const LIGHT = {
  dawn: { sun: 0xffc08a, sunI: 2.4, sky: 0xfde7c4, ground: 0x31476a, hemiI: 1.0, water: 0x3a6c98, fog: 0xfbe3c7, lantern: 0, exp: 1.0 },
  day: { sun: 0xfff4dc, sunI: 2.8, sky: 0xe4f1fb, ground: 0x3a5a80, hemiI: 1.2, water: 0x3f7fb4, fog: 0xf6efe4, lantern: 0, exp: 1.05 },
  dusk: { sun: 0xff8a5a, sunI: 2.0, sky: 0xf2a66a, ground: 0x2b2347, hemiI: 0.85, water: 0x34466e, fog: 0xf0c3a6, lantern: 0.8, exp: 0.95 },
  night: { sun: 0xa9bbff, sunI: 0.9, sky: 0x2a3a6a, ground: 0x05070f, hemiI: 0.6, water: 0x14213f, fog: 0x101a33, lantern: 3, exp: 0.9 },
  storm: { sun: 0x9aa6ba, sunI: 0.7, sky: 0x4a5668, ground: 0x0a0d14, hemiI: 0.7, water: 0x223042, fog: 0x2e3846, lantern: 2.2, exp: 0.9 }
};

const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.75, ...o });

function islandGeometry() {
  // an organic island: a lathe profile with a noisy rim, smooth shaded
  const g = new THREE.CylinderGeometry(3.3, 3.9, 1.2, 72, 6);
  const p = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const a = Math.atan2(v.z, v.x), r = Math.hypot(v.x, v.z);
    if (r > 0.01) {
      const k = 1 + 0.07 * Math.sin(a * 3 + 0.5) + 0.04 * Math.sin(a * 7 + 1.3) + 0.02 * Math.sin(a * 13);
      v.x *= k; v.z *= k;
    }
    if (v.y > 0.55) v.y += 0.12 * Math.sin(v.x * 1.3) * Math.cos(v.z * 1.1);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

function curvedBeam(len, h, d, lift) {
  // kasagi: the top beam of a torii, with ends that sweep up
  const g = new THREE.BoxGeometry(len, h, d, 40, 1, 1), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i) / (len / 2); p.setY(i, p.getY(i) + lift * Math.pow(Math.abs(x), 3)); }
  g.computeVertexNormals(); return g;
}

function shrine() {
  const g = new THREE.Group();
  const shadow = m => { m.castShadow = true; m.receiveShadow = true; return m; };
  const rock = shadow(new THREE.Mesh(islandGeometry(), std(0x6a5f55, { roughness: 0.95 })));
  rock.position.y = -0.15; g.add(rock);
  const moss = shadow(new THREE.Mesh(new THREE.CylinderGeometry(3.25, 3.3, 0.18, 72), std(0x6f8f4e, { roughness: 1 })));
  moss.geometry = islandGeometry(); moss.scale.set(0.96, 0.15, 0.96); moss.position.y = 0.5; g.add(moss);

  // torii
  const red = std(0xc8382b, { roughness: 0.5 }), black = std(0x1d1a18, { roughness: 0.45 });
  [-0.95, 0.95].forEach(x => { const p = shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, 2.5, 24), red)); p.position.set(x, 1.8, 1.7); g.add(p); });
  const nuki = shadow(new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.15, 0.16), red)); nuki.position.set(0, 2.45, 1.7); g.add(nuki);
  const shimaki = shadow(new THREE.Mesh(curvedBeam(2.9, 0.15, 0.26, 0.08), red)); shimaki.position.set(0, 2.92, 1.7); g.add(shimaki);
  const kasagi = shadow(new THREE.Mesh(curvedBeam(3.4, 0.18, 0.34, 0.26), black)); kasagi.position.set(0, 3.1, 1.7); g.add(kasagi);
  const gakuzuka = shadow(new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.42, 0.14), red)); gakuzuka.position.set(0, 2.7, 1.7); g.add(gakuzuka);

  // stone lantern
  const stone = std(0xa59f93, { roughness: 0.9 });
  const lantern = new THREE.Group();
  [[new THREE.CylinderGeometry(0.42, 0.48, 0.18, 24), 0.62], [new THREE.CylinderGeometry(0.11, 0.13, 0.75, 20), 1.06], [new THREE.CylinderGeometry(0.36, 0.3, 0.12, 6), 1.47],
   [new THREE.BoxGeometry(0.5, 0.36, 0.5), 1.7], [new THREE.ConeGeometry(0.55, 0.32, 6), 2.03], [new THREE.SphereGeometry(0.08, 16, 12), 2.24]]
    .forEach(([geo, y]) => { const m = shadow(new THREE.Mesh(geo, stone)); m.position.y = y; lantern.add(m); });
  const glow = new THREE.PointLight(0xffb45a, 0, 7, 1.6); glow.position.y = 1.7; lantern.add(glow);
  const flame = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.24, 0.3), new THREE.MeshBasicMaterial({ color: 0xffc070, transparent: true, opacity: 0 })); flame.position.y = 1.7; lantern.add(flame);
  lantern.position.set(-1.6, 0, -0.2); g.add(lantern);

  // cherry tree: curving trunk, soft pink canopy
  const tree = new THREE.Group();
  const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0.5, 0), new THREE.Vector3(0.25, 1.4, 0.1), new THREE.Vector3(-0.1, 2.3, 0.05), new THREE.Vector3(0.35, 3.0, -0.1)]);
  tree.add(shadow(new THREE.Mesh(new THREE.TubeGeometry(curve, 40, 0.13, 12), std(0x4a3528, { roughness: 0.9 }))));
  const pink = [0xf4c3cf, 0xeaa6b8, 0xf8d6de];
  for (let i = 0; i < 14; i++) {
    const s = 0.5 + Math.random() * 0.45, m = shadow(new THREE.Mesh(new THREE.IcosahedronGeometry(s, 3), std(pink[i % 3], { roughness: 0.9 })));
    const a = Math.random() * Math.PI * 2, r = Math.random() * 1.1;
    m.position.set(0.3 + Math.cos(a) * r, 3.05 + Math.random() * 0.75, Math.sin(a) * r);
    tree.add(m);
  }
  tree.position.set(1.4, 0, -0.9); g.add(tree);

  // pines
  const pine = (x, z, s) => {
    const t = new THREE.Group();
    t.add(shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.06 * s, 0.1 * s, 1.1 * s, 10), std(0x4a3426))));
    t.children[0].position.y = 0.55 * s + 0.5;
    [[0.75, 1.15], [0.6, 1.55], [0.42, 1.9]].forEach(([r, y]) => { const c = shadow(new THREE.Mesh(new THREE.SphereGeometry(r * s, 18, 10), std(0x2f5236, { roughness: 1 }))); c.scale.y = 0.42; c.position.y = y * s + 0.35; t.add(c); });
    t.position.set(x, 0, z); return t;
  };
  g.add(pine(-0.4, -2.0, 0.9), pine(2.4, 0.9, 0.7));
  g.userData = { glow, flame, canopy: tree.position.clone().add(new THREE.Vector3(0.3, 3.3, 0)) };
  return g;
}

export default function Shrine3D() {
  const { motionOn, sky } = usePrefs();
  const hostRef = useRef(null);
  const live = useRef({});
  live.current = { motionOn, mode: resolveSky(sky) };

  useEffect(() => {
    const host = hostRef.current;
    let renderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' }); } catch { host.classList.add('no-3d'); return undefined; }
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0xfbe3c7, 16, 40);
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 120);
    camera.position.set(8.5, 4.6, 10.5);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 1.6, 0); controls.enableZoom = false; controls.enablePan = false; controls.enableDamping = true; controls.dampingFactor = 0.06;
    controls.minPolarAngle = 0.75; controls.maxPolarAngle = 1.42; controls.autoRotateSpeed = 0.45;

    const hemi = new THREE.HemisphereLight(0xfde7c4, 0x31476a, 1); scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xffc08a, 2.4); sun.position.set(7, 10, 5); sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048); sun.shadow.camera.left = -7; sun.shadow.camera.right = 7; sun.shadow.camera.top = 7; sun.shadow.camera.bottom = -7; sun.shadow.bias = -0.0004; sun.shadow.radius = 4;
    scene.add(sun);

    const water = new THREE.Mesh(new THREE.CircleGeometry(40, 160, 0, Math.PI * 2), new THREE.MeshPhysicalMaterial({ color: 0x3a6c98, roughness: 0.18, metalness: 0.05, clearcoat: 0.6, clearcoatRoughness: 0.25, transparent: true, opacity: 0.94 }));
    // circle geometry has too few rings for waves; use a dense ring grid instead
    water.geometry = new THREE.RingGeometry(3.4, 40, 160, 48);
    water.rotation.x = -Math.PI / 2; water.receiveShadow = true; scene.add(water);
    const wpos = water.geometry.attributes.position, base = wpos.array.slice();

    let island = shrine(); scene.add(island);
    fetch(MODEL_URL, { method: 'HEAD' }).then(r => {
      if (!r.ok || !(r.headers.get('content-type') || '').includes('model')) return;
      new GLTFLoader().load(MODEL_URL, gltf => {
        const m = gltf.scene; m.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
        const k = 6.5 / Math.max(...new THREE.Box3().setFromObject(m).getSize(new THREE.Vector3()).toArray().filter((_, i) => i !== 1)); m.scale.setScalar(k);
        const bx = new THREE.Box3().setFromObject(m), c = bx.getCenter(new THREE.Vector3()); m.position.sub(new THREE.Vector3(c.x, bx.min.y, c.z));
        scene.remove(island); island = m; scene.add(m);
      });
    }).catch(() => {});

    // 3D petals drifting off the cherry tree
    const PET = 70, petalGeo = new THREE.PlaneGeometry(0.09, 0.07), petalMat = new THREE.MeshStandardMaterial({ color: 0xf4c3cf, side: THREE.DoubleSide, roughness: 0.8 });
    const petals = new THREE.InstancedMesh(petalGeo, petalMat, PET); scene.add(petals);
    const pState = Array.from({ length: PET }, () => ({ p: new THREE.Vector3(), v: new THREE.Vector3(), r: new THREE.Euler(), life: Math.random() }));
    const dummy = new THREE.Object3D();
    const resetPetal = s => { const c = island.userData.canopy || new THREE.Vector3(1.7, 3.3, -0.9); s.p.set(c.x + (Math.random() - 0.5) * 1.8, c.y + Math.random() * 0.8, c.z + (Math.random() - 0.5) * 1.8); s.v.set(-0.25 - Math.random() * 0.3, -0.25 - Math.random() * 0.2, (Math.random() - 0.5) * 0.3); s.life = 0; };
    pState.forEach(resetPetal);

    const size = () => { const w = host.clientWidth, h = host.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); };
    size(); const ro = new ResizeObserver(size); ro.observe(host);
    let vis = false; const io = new IntersectionObserver(es => { vis = es[0].isIntersecting; }); io.observe(host);

    const cur = { ...LIGHT.dawn }; const tmp = new THREE.Color(), tmp2 = new THREE.Color();
    const lerp = (key, t) => { cur[key] = tmp.setHex(cur[key]).lerp(tmp2.setHex(LIGHT[live.current.mode][key]), t).getHex(); };
    let raf = 0, last = performance.now(); const t0 = last;
    const loop = now => {
      raf = requestAnimationFrame(loop);
      if (!vis) return;
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const { motionOn: mo, mode } = live.current, L = LIGHT[mode], S = SKIES[mode];
      ['sun', 'sky', 'ground', 'water', 'fog'].forEach(k => lerp(k, 0.05));
      ['sunI', 'hemiI', 'lantern', 'exp'].forEach(k => { cur[k] += (L[k] - cur[k]) * 0.05; });
      hemi.color.setHex(cur.sky); hemi.groundColor.setHex(cur.ground); hemi.intensity = cur.hemiI;
      sun.color.setHex(cur.sun); sun.intensity = cur.sunI; scene.fog.color.setHex(cur.fog); water.material.color.setHex(cur.water);
      renderer.toneMappingExposure = cur.exp;
      if (island.userData.glow) { island.userData.glow.intensity = cur.lantern; island.userData.flame.material.opacity = Math.min(1, cur.lantern / 2); }

      const t = mo ? (now - t0) / 1000 : 0, amp = 0.06 * S.waves;
      for (let i = 0; i < wpos.count; i++) {
        const x = base[i * 3], y = base[i * 3 + 1], d = Math.hypot(x, y);
        const fade = Math.min(1, (d - 3.4) / 2.5);
        wpos.setZ(i, (Math.sin(x * 0.55 + t * 1.1) + Math.sin(y * 0.4 - t * 0.8) * 0.8 + Math.sin(d * 1.6 - t * 1.8) * 0.35) * amp * fade);
      }
      wpos.needsUpdate = true; water.geometry.computeVertexNormals();

      if (mo) {
        for (let i = 0; i < PET; i++) {
          const s = pState[i]; s.life += dt * 0.25; s.p.addScaledVector(s.v, dt); s.p.x += Math.sin(t * 1.3 + i) * 0.004; s.r.x += dt * 1.5; s.r.y += dt * 1.1;
          if (s.p.y < 0.05 || s.life > 1) resetPetal(s);
          dummy.position.copy(s.p); dummy.rotation.copy(s.r); dummy.updateMatrix(); petals.setMatrixAt(i, dummy.matrix);
        }
        petals.instanceMatrix.needsUpdate = true;
      }
      petals.visible = mo && mode !== 'storm';
      controls.autoRotate = mo; controls.update();
      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); controls.dispose(); renderer.dispose(); host.innerHTML = ''; };
  }, []);

  return <div ref={hostRef} className="shrine3d" aria-label="A small island shrine with a torii gate, a stone lantern, a cherry tree and pines. Drag to look around." role="img" />;
}

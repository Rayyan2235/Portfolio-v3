import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { usePrefs } from '../prefs.jsx';
import { SKIES, resolveSky } from '../sky.js';

// A small island shrine in three.js: torii, stone lantern, pines, moving water.
// Lit by the same sky as the hero. Drop a model at public/models/scene.glb to replace the island.
const MODEL_URL = '/models/scene.glb';

const LIGHT = {
  dawn: { sun: 0xffb27a, sunI: 2.2, hemi: [0xfde7c4, 0x1d3557, 1.1], water: 0x2a5a8a, fog: 0xf7cfa8, lantern: 0 },
  day: { sun: 0xfff3d6, sunI: 2.6, hemi: [0xdcefff, 0x2a4a78, 1.3], water: 0x2f6ea6, fog: 0xd8ecf6, lantern: 0 },
  dusk: { sun: 0xff7a4a, sunI: 1.8, hemi: [0xf2a66a, 0x2b2347, 0.9], water: 0x2b3f66, fog: 0xc98f86, lantern: 0.6 },
  night: { sun: 0x9fb4ff, sunI: 0.7, hemi: [0x22305a, 0x05070f, 0.5], water: 0x101b36, fog: 0x0b1226, lantern: 2.2 },
  storm: { sun: 0x8a96aa, sunI: 0.6, hemi: [0x3a4658, 0x0a0d14, 0.6], water: 0x1a2532, fog: 0x2a3340, lantern: 1.6 }
};

function shrine() {
  const g = new THREE.Group();
  const mat = (color, rough = 0.85) => new THREE.MeshStandardMaterial({ color, roughness: rough, flatShading: true });
  // island: moss on rock
  const rock = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.8, 1.1, 9), mat(0x5b5148));
  rock.position.y = -0.2; g.add(rock);
  const moss = new THREE.Mesh(new THREE.CylinderGeometry(3.05, 3.2, 0.25, 9), mat(0x5d7a45));
  moss.position.y = 0.45; g.add(moss);
  // torii
  const red = mat(0xc8382b, 0.6), black = mat(0x1b1b1b, 0.6);
  [-0.9, 0.9].forEach(x => { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 2.4, 10), red); p.position.set(x, 1.75, 1.6); g.add(p); });
  const nuki = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.14, 0.16), red); nuki.position.set(0, 2.45, 1.6); g.add(nuki);
  const kasagi = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.18, 0.3), black); kasagi.position.set(0, 3.0, 1.6); g.add(kasagi);
  [-1, 1].forEach(s => { const tip = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 0.3), black); tip.position.set(s * 1.55, 3.06, 1.6); tip.rotation.z = s * 0.18; g.add(tip); });
  const shimaki = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.14, 0.24), red); shimaki.position.set(0, 2.84, 1.6); g.add(shimaki);
  // stone lantern (toro)
  const stone = mat(0x9a958a);
  const parts = [[0.42, 0.18, 0.62], [0.12, 0.7, 1.05], [0.36, 0.12, 1.45], [0.3, 0.34, 1.68], [0.5, 0.14, 1.92], [0.1, 0.16, 2.06]];
  const lantern = new THREE.Group();
  parts.forEach(([w, h, y], i) => { const m = new THREE.Mesh(i === 1 ? new THREE.CylinderGeometry(w, w, h, 8) : new THREE.BoxGeometry(w * 2, h, w * 2), stone); m.position.y = y; lantern.add(m); });
  const glow = new THREE.PointLight(0xffb45a, 0, 6, 1.6); glow.position.y = 1.68; lantern.add(glow);
  const flame = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.22), new THREE.MeshBasicMaterial({ color: 0xffc070 })); flame.position.y = 1.68; lantern.add(flame);
  lantern.position.set(-1.5, 0, -0.4); g.add(lantern);
  // pines
  const pine = (x, z, s) => {
    const t = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.08 * s, 0.14 * s, 1.2 * s, 6), mat(0x4a3426)); trunk.position.y = 0.6 * s + 0.5; t.add(trunk);
    [[1.0, 1.3], [0.8, 1.75], [0.55, 2.15]].forEach(([r, y]) => { const c = new THREE.Mesh(new THREE.ConeGeometry(r * s, 0.7 * s, 7), mat(0x2f4f34)); c.position.y = y * s + 0.3; t.add(c); });
    t.position.set(x, 0, z); return t;
  };
  g.add(pine(1.6, -0.9, 1.1), pine(0.6, -1.9, 0.85), pine(2.3, 0.4, 0.7));
  g.userData = { glow, flame };
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
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); } catch { host.classList.add('no-3d'); return undefined; }
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0xf7cfa8, 14, 42);
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(7.5, 5, 9.5);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 1.4, 0); controls.enableZoom = false; controls.enablePan = false; controls.enableDamping = true;
    controls.minPolarAngle = 0.6; controls.maxPolarAngle = 1.45; controls.autoRotateSpeed = 0.6;

    const hemi = new THREE.HemisphereLight(0xfde7c4, 0x1d3557, 1.1); scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xffb27a, 2.2); sun.position.set(6, 8, 4); scene.add(sun);

    const water = new THREE.Mesh(new THREE.PlaneGeometry(60, 60, 90, 90), new THREE.MeshStandardMaterial({ color: 0x2a5a8a, roughness: 0.35, metalness: 0.1, flatShading: true }));
    water.rotation.x = -Math.PI / 2; water.position.y = 0; scene.add(water);
    const base = water.geometry.attributes.position.array.slice();

    let island = shrine(); scene.add(island);
    // Optional: a real model replaces the placeholder island when public/models/scene.glb exists.
    fetch(MODEL_URL, { method: 'HEAD' }).then(r => {
      if (!r.ok || !(r.headers.get('content-type') || '').includes('model')) return;
      new GLTFLoader().load(MODEL_URL, gltf => {
        const m = gltf.scene, box = new THREE.Box3().setFromObject(m), size = box.getSize(new THREE.Vector3());
        const k = 6 / Math.max(size.x, size.z); m.scale.setScalar(k);
        const c = new THREE.Box3().setFromObject(m).getCenter(new THREE.Vector3()); m.position.sub(new THREE.Vector3(c.x, new THREE.Box3().setFromObject(m).min.y, c.z));
        scene.remove(island); island = m; scene.add(m);
      });
    }).catch(() => {});

    const size = () => { const w = host.clientWidth, h = host.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); };
    size(); const ro = new ResizeObserver(size); ro.observe(host);
    let vis = false; const io = new IntersectionObserver(es => { vis = es[0].isIntersecting; }); io.observe(host);

    const cur = { ...LIGHT.dawn }; const col = new THREE.Color();
    const lerpHex = (a, b, t) => col.setHex(a).lerp(new THREE.Color(b), t).getHex();
    let raf = 0; const t0 = performance.now();
    const loop = now => {
      raf = requestAnimationFrame(loop);
      if (!vis) return;
      const { motionOn: mo, mode } = live.current, L = LIGHT[mode], S = SKIES[mode];
      ['sun', 'water', 'fog'].forEach(k => { cur[k] = lerpHex(cur[k], L[k], 0.05); });
      cur.sunI += (L.sunI - cur.sunI) * 0.05; cur.lantern += (L.lantern - cur.lantern) * 0.05;
      hemi.color.setHex(L.hemi[0]); hemi.groundColor.setHex(L.hemi[1]); hemi.intensity = L.hemi[2];
      sun.color.setHex(cur.sun); sun.intensity = cur.sunI; scene.fog.color.setHex(cur.fog); water.material.color.setHex(cur.water);
      if (island.userData.glow) { island.userData.glow.intensity = cur.lantern; island.userData.flame.visible = cur.lantern > 0.2; }
      const t = mo ? (now - t0) / 1000 : 0, amp = 0.12 * S.waves;
      const pos = water.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = base[i * 3], y = base[i * 3 + 1], d = Math.hypot(x, y);
        pos.array[i * 3 + 2] = d < 3.6 ? -0.05 : (Math.sin(x * 0.6 + t * 1.3) + Math.sin(y * 0.45 - t * 0.9) * 0.8 + Math.sin((x + y) * 0.3 + t * 2) * 0.4) * amp;
      }
      pos.needsUpdate = true; water.geometry.computeVertexNormals();
      controls.autoRotate = mo; controls.update();
      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); controls.dispose(); renderer.dispose(); host.innerHTML = ''; };
  }, []);

  return <div ref={hostRef} className="shrine3d" aria-label="A small island shrine with a torii gate, a stone lantern and pine trees. Drag to look around." role="img" />;
}

import { useEffect, useRef, useState } from 'react';
import { useScroll } from 'motion/react';
import { usePrefs } from '../prefs.jsx';
import { SKIES, resolveSky } from '../sky.js';
import { thunder, setRain } from '../audio.js';

const IMG = '/great-wave.jpg';
const IA = 1.488; // image aspect

const VS = 'attribute vec2 p;varying vec2 uv;void main(){uv=vec2(p.x*.5+.5,.5-p.y*.5);gl_Position=vec4(p,0.,1.);}';
const FS = `precision highp float;varying vec2 uv;
uniform sampler2D tex,msk;uniform float t,sunX,sunY,night,storm,flash,amp;uniform vec2 m,cov,off,boat;uniform vec3 skyTop,skyBot,glow,body;
float hash(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
float lum(vec3 c){return dot(c,vec3(.299,.587,.114));}
void main(){
  vec2 q=(uv-.5)*cov+.5+off+m*vec2(.006,.004);
  vec3 c0=texture2D(tex,q).rgb;
  float water=smoothstep(.06,.2,c0.b-c0.r);
  float sp=1.+storm*.9;
  float sway=sin(t*.6*sp)*.0025*amp*(1.-q.y);
  vec2 d=vec2(sin(q.y*55.+t*1.4*sp)+sin(q.x*23.-t*.9*sp),cos(q.x*41.+t*1.1*sp))*.0011*amp*water;
  vec2 q2=q+d+vec2(sway,0.)*(1.-water*.3);
  vec3 c=texture2D(tex,q2).rgb;
  float bFrom=texture2D(msk,q2-boat).g, bNow=texture2D(msk,q2).g;
  if(bFrom>.5){c=texture2D(tex,q2-boat).rgb;}else if(bNow>.5){c=texture2D(tex,q2+boat*1.8+vec2(.003,.0)).rgb;}
  float s=texture2D(msk,q).r;float L=lum(c);
  float foam=step(.82,L)*step(c.r-c.b,.1)*(1.-s);c+=foam*.05*sin(t*3.+q.x*80.+q.y*60.);
  vec2 sv=vec2((q.x-sunX)*1.488,q.y-sunY);float r=length(sv);
  vec3 sky=mix(skyTop,skyBot,smoothstep(0.,.6,q.y));
  sky=mix(sky,glow,smoothstep(.55,.0,r)*.6*(1.-storm)*(1.-night*.6));
  vec2 cell=floor(q*vec2(900.,600.));
  float star=step(.993,hash(cell))*(.55+.45*sin(t*2.+hash(cell+3.)*40.))+step(.9992,hash(cell+7.))*.8;
  sky+=vec3(.95,.95,1.)*star*1.3*night*(1.-storm)*(1.-smoothstep(.2,.6,q.y));
  sky*=.97+.06*hash(cell);
  float disc=1.-smoothstep(.075,.081,r);
  vec3 o=mix(c,sky,s);
  vec3 dark=c*vec3(.30,.35,.52)+vec3(.0,.012,.04);
  o=mix(o,mix(dark,sky,s),night);
  vec3 bod=body*(1.-night*(.14*smoothstep(-.06,.07,sv.x-sv.y)+.08*(1.-smoothstep(.0,.022,length(sv-vec2(-.018,-.02))))+.06*(1.-smoothstep(.0,.015,length(sv-vec2(.025,.018))))));
  o=mix(o,bod,disc*(1.-water)*smoothstep(.4,.55,lum(c0))*(1.-storm));
  o+=flash*vec3(.55,.6,.78)*(.35+.65*s);
  gl_FragColor=vec4(o,1.);
}`;

function sm(a, b, x) { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); }

// R channel: sky (replaced by the live sky). G channel: boats (moved with scroll).
function buildMask(img) {
  const w = 600, h = Math.round(600 / IA);
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const x = cv.getContext('2d'); x.drawImage(img, 0, 0, w, h);
  const d = x.getImageData(0, 0, w, h).data;
  let sky = new Float32Array(w * h), boat = new Float32Array(w * h);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const k = (j * w + i) * 4, R = d[k] / 255, G = d[k + 1] / 255, B = d[k + 2] / 255, L = 0.299 * R + 0.587 * G + 0.114 * B, u = i / w, v = j / h;
    const beige = sm(0.06, 0.13, R - B) * sm(0.42, 0.55, L) * (1 - sm(0.9, 0.96, L)) * (1 - sm(0.47, 0.56, v));
    const gray = (1 - sm(0.05, 0.1, Math.abs(R - B))) * sm(0.12, 0.22, L) * (1 - sm(0.78, 0.86, L)) * sm(0.4, 0.47, u) * (1 - sm(0.75, 0.83, u)) * (1 - sm(0.6, 0.68, v)) * sm(0.3, 0.4, v);
    const cart = sm(0.025, 0.035, u) * (1 - sm(0.1, 0.11, u)) * sm(0.045, 0.055, v) * (1 - sm(0.33, 0.345, v));
    sky[j * w + i] = Math.max(beige, gray, cart);
    boat[j * w + i] = v > 0.44 ? sm(0.12, 0.2, R - B) * sm(0.45, 0.6, L) * (1 - sm(0.92, 0.97, L)) : 0;
  }
  const blur = (m, passes, rad) => {
    for (let p = 0; p < passes; p++) {
      const o = new Float32Array(w * h);
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
        let s = 0, n = 0;
        for (let dj = -rad; dj <= rad; dj++) for (let di = -rad; di <= rad; di++) {
          const ii = i + di, jj = j + dj;
          if (ii >= 0 && jj >= 0 && ii < w && jj < h) { s += m[jj * w + ii]; n++; }
        }
        o[j * w + i] = s / n;
      }
      m = o;
    }
    return m;
  };
  sky = blur(sky, 3, 2);
  boat = blur(boat, 1, 2);
  const out = new Uint8Array(w * h * 4);
  for (let p = 0; p < w * h; p++) {
    out[p * 4] = Math.round(sm(0.35, 0.65, sky[p]) * 255);
    out[p * 4 + 1] = Math.round(sm(0.25, 0.5, boat[p]) * 255);
    out[p * 4 + 3] = 255;
  }
  return { w, h, data: out };
}

export default function GreatWaveHero({ children }) {
  const { motionOn, sky: skyPref, sound } = usePrefs();
  const hostRef = useRef(null), glRef = useRef(null), fxRef = useRef(null);
  const [mode, setMode] = useState(() => resolveSky(skyPref));
  const live = useRef({ mode, motionOn, sound });
  const { scrollYProgress } = useScroll({ target: hostRef, offset: ['start start', 'end start'] });

  useEffect(() => {
    const tick = () => setMode(resolveSky(skyPref));
    tick();
    const id = setInterval(tick, 60000);
    return () => clearInterval(id);
  }, [skyPref]);

  useEffect(() => { live.current = { mode, motionOn, sound }; }, [mode, motionOn, sound]);

  useEffect(() => {
    const on = sound && mode === 'storm' && motionOn;
    setRain(on);
    return () => setRain(false);
  }, [sound, mode, motionOn]);

  useEffect(() => {
    const host = hostRef.current, cv = glRef.current, fx = fxRef.current, fc = fx.getContext('2d');
    const gl = cv.getContext('webgl', { premultipliedAlpha: false });
    if (!gl) { host.classList.add('fallback'); return; }
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
    const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr); gl.useProgram(pr);
    const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const U = {}; ['t', 'sunX', 'sunY', 'night', 'storm', 'flash', 'amp', 'm', 'cov', 'off', 'boat', 'skyTop', 'skyBot', 'glow', 'body', 'tex', 'msk'].forEach(n => { U[n] = gl.getUniformLocation(pr, n); });
    const texture = (unit, fmt, w, h, data, el) => {
      gl.activeTexture(gl.TEXTURE0 + unit); const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
      if (el) gl.texImage2D(gl.TEXTURE_2D, 0, fmt, fmt, gl.UNSIGNED_BYTE, el); else gl.texImage2D(gl.TEXTURE_2D, 0, fmt, w, h, 0, fmt, gl.UNSIGNED_BYTE, data);
      [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER].forEach(p => gl.texParameteri(gl.TEXTURE_2D, p, gl.LINEAR));
      [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T].forEach(p => gl.texParameteri(gl.TEXTURE_2D, p, gl.CLAMP_TO_EDGE));
    };

    let W = 0, H = 0, cov = [1, 1], off = [0, 0], ready = false, vis = true, raf = 0;
    let mx = 0, my = 0, tmx = 0, tmy = 0, flash = 0, nextBolt = performance.now() + 2500, bolt = null;
    const cur = {}; // smoothed palette
    const t0 = performance.now();
    const rain = [];

    const size = () => {
      // render at 1x, never at the screen's 2x: a full screen shader at 2x is what spins up laptop fans
      const d = 1; W = host.clientWidth; H = host.clientHeight;
      cv.width = W * d; cv.height = H * d; fx.width = W * d; fx.height = H * d; gl.viewport(0, 0, W * d, H * d); fc.setTransform(d, 0, 0, d, 0, 0);
      const A = W / H;
      if (A > IA) { cov = [1, IA / A]; off = [0, (0.46 - 0.5) * (1 - cov[1])]; } else { cov = [A / IA, 1]; off = [(0.42 - 0.5) * (1 - cov[0]), 0]; }
    };

    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (cancelled) return;
      gl.useProgram(pr);
      texture(0, gl.RGB, 0, 0, null, img);
      const mk = buildMask(img); texture(1, gl.RGBA, mk.w, mk.h, mk.data);
      gl.uniform1i(U.tex, 0); gl.uniform1i(U.msk, 1);
      ready = true;
    };
    img.onerror = () => host.classList.add('fallback');
    img.src = IMG;

    const onMove = e => { const r = host.getBoundingClientRect(); tmx = (e.clientX - r.left) / r.width - 0.5; tmy = (e.clientY - r.top) / r.height - 0.5; };
    const onLeave = () => { tmx = tmy = 0; };
    host.addEventListener('pointermove', onMove); host.addEventListener('pointerleave', onLeave);
    const io = new IntersectionObserver(es => { vis = es[0].isIntersecting; }); io.observe(host);
    size();
    // the hero can grow inside the scroll-expand frame, so watch the element, not just the window
    // while the frame is opening it resizes every frame. Reallocating the canvas each frame stutters, but waiting for it
    // to settle shows a stretched, pixelated picture; so resize once it has grown 5%, and once more when it settles
    let rt = 0;
    const resize = () => { size(); if (ready) gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); };
    const ro = new ResizeObserver(() => {
      clearTimeout(rt);
      const w = host.clientWidth, h = host.clientHeight;
      if (Math.abs(w - W) > W * 0.05 || Math.abs(h - H) > H * 0.05) resize(); else rt = setTimeout(resize, 120);
    });
    ro.observe(host);

    const makeBolt = () => {
      let x = W * (0.45 + Math.random() * 0.5), y = 0; const pts = [[x, y]];
      while (y < H * (0.35 + Math.random() * 0.15)) { y += 12 + Math.random() * 22; x += (Math.random() - 0.5) * 34; pts.push([x, y]); }
      const branch = pts.slice(Math.floor(pts.length / 3)).map(([a, c], i) => [a + i * 9 * (Math.random() > 0.5 ? 1 : -1), c + i * 4]).slice(0, 6);
      return { pts, branch, life: 1 };
    };

    const frame = now => {
      const { mode: md, motionOn: mo, sound: snd } = live.current;
      const S = SKIES[md];
      const k = cur.top ? 0.04 : 1; // ease toward the new sky
      ['top', 'bottom', 'glow', 'body'].forEach(key => { cur[key] = (cur[key] || S[key]).map((v, i) => v + (S[key][i] - v) * k); });
      ['night', 'storm', 'waves'].forEach(key => { cur[key] = cur[key] === undefined ? S[key] : cur[key] + (S[key] - cur[key]) * k; });
      const t = mo ? (now - t0) / 1000 : 2;
      const p = scrollYProgress.get();
      mx += (tmx - mx) * 0.05; my += (tmy - my) * 0.05;
      const intro = mo ? 1 - Math.pow(1 - Math.min(1, t / 7), 3) : 1;
      const sunY = S.sun.y + (S.sun.rise > 0 ? S.sun.rise * (1 - intro) : 0) - p * 0.22 * Math.sign(S.sun.rise || 1);
      const sunX = (cov[0] < 0.99 ? 0.5 + off[0] + cov[0] * 0.28 : S.sun.x) + p * 0.05;
      const boat = mo ? [Math.sin(p * 9 + t * 0.6) * 0.004 * cur.waves, Math.sin(p * 7 + 1 + t * 1.1) * 0.003 * cur.waves - p * 0.006] : [0, 0];

      // lightning
      if (mo && cur.storm > 0.5 && now > nextBolt) {
        bolt = makeBolt(); flash = 1; nextBolt = now + 3500 + Math.random() * 6000;
        if (snd) setTimeout(() => thunder(0.6 + Math.random() * 0.4), 300 + Math.random() * 1200);
      }
      flash *= 0.9; if (flash < 0.01) flash = 0;
      if (flash > 0 && flash < 0.35 && Math.random() < 0.03) flash = 0.6;

      gl.uniform1f(U.t, t); gl.uniform1f(U.sunX, sunX); gl.uniform1f(U.sunY, sunY);
      gl.uniform1f(U.night, cur.night); gl.uniform1f(U.storm, cur.storm); gl.uniform1f(U.flash, flash); gl.uniform1f(U.amp, cur.waves);
      gl.uniform2f(U.m, mx, my); gl.uniform2f(U.cov, cov[0], cov[1]); gl.uniform2f(U.off, off[0], off[1]); gl.uniform2f(U.boat, boat[0], boat[1]);
      gl.uniform3fv(U.skyTop, cur.top); gl.uniform3fv(U.skyBot, cur.bottom); gl.uniform3fv(U.glow, cur.glow); gl.uniform3fv(U.body, cur.body);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      // overlay: rain, bolt (the foam spray dots were removed; the print's own foam is enough)
      fc.clearRect(0, 0, W, H);
      if (!mo) return;
      const dt = 1 / 60;
      if (cur.storm > 0.3) {
        const n = Math.round(160 * cur.storm);
        while (rain.length < n) rain.push({ x: Math.random() * (W + 200) - 100, y: Math.random() * H, v: 900 + Math.random() * 500, l: 14 + Math.random() * 18 });
        fc.strokeStyle = 'rgba(200,215,235,.45)'; fc.lineWidth = 1; fc.beginPath();
        for (const r of rain) { r.y += r.v * dt; r.x -= r.v * dt * 0.25; if (r.y > H) { r.y = -20; r.x = Math.random() * (W + 200); } fc.moveTo(r.x, r.y); fc.lineTo(r.x + r.l * 0.25, r.y - r.l); }
        fc.stroke();
      }
      if (bolt) {
        fc.strokeStyle = `rgba(235,242,255,${bolt.life})`; fc.lineWidth = 2.4; fc.shadowColor = 'rgba(180,200,255,.9)'; fc.shadowBlur = 14;
        [bolt.pts, bolt.branch].forEach(line => { fc.beginPath(); line.forEach(([a, c], i) => (i ? fc.lineTo(a, c) : fc.moveTo(a, c))); fc.stroke(); });
        fc.shadowBlur = 0; bolt.life -= 0.06; if (bolt.life <= 0) bolt = null;
      }
    };

    // the sky moves slowly: 30 frames a second is plenty and halves the GPU work
    let lastDraw = 0;
    const loop = now => {
      if (ready && vis && now - lastDraw > 31) { lastDraw = now; frame(now); }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelled = true; gl.deleteProgram(pr);
      cancelAnimationFrame(raf); clearTimeout(rt); io.disconnect(); ro.disconnect();
      host.removeEventListener('pointermove', onMove); host.removeEventListener('pointerleave', onLeave);
    };
  }, [scrollYProgress]);

  const S = SKIES[mode];
  return (
    <section ref={hostRef} className={`hero sky-${mode}`} id="top" aria-labelledby="hero-title"
      style={{ '--hero-ink': S.ink, '--hero-fade': S.fade }}>
      <canvas ref={glRef} className="gl" aria-hidden="true" />
      <canvas ref={fxRef} className="fx" aria-hidden="true" />
      <img className="still" src={IMG} alt="" aria-hidden="true" />
      <div className="fade" aria-hidden="true" />
      {children}
      <span className="credit">Wave after Katsushika Hokusai, ca. 1830–32. The Met, public domain.</span>
    </section>
  );
}

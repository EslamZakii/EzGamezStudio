import * as THREE from 'three';

const canvas = document.getElementById('bg');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
} catch (e) {
  canvas.style.background = 'radial-gradient(circle at 70% 40%, #3a0808, #0d0d0d 60%)';
  throw e; // no WebGL: CSS fallback only
}
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x0d0d0d, 0.035);
const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 200);
camera.position.set(0, 0, 9);

const RED = 0xe02b2b;
scene.add(new THREE.AmbientLight(0xffffff, 0.35));
const key = new THREE.PointLight(RED, 60, 40); key.position.set(4, 3, 6); scene.add(key);
const rim = new THREE.PointLight(0xffffff, 25, 40); rim.position.set(-6, -2, 4); scene.add(rim);

// Hero object: the real EZ GAMEZ logo image on a plane, with a glitch shader
const hero = new THREE.Group();
const logoMat = new THREE.ShaderMaterial({
  transparent: true,
  uniforms: { map: { value: new THREE.TextureLoader().load('assets/logo.webp', t => { t.colorSpace = THREE.SRGBColorSpace; }) }, time: { value: 0 }, boost: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
  fragmentShader: `
    uniform sampler2D map; uniform float time; uniform float boost; varying vec2 vUv;
    float h(float n){ return fract(sin(n*127.1)*43758.5453); }
    void main(){
      float tick = floor(time * 12.0);
      // glitch bursts: ~0.3s every ~2.5s, plus extra on hover
      float burst = step(0.82, fract(time / 2.5)) + boost;
      burst = clamp(burst, 0.0, 1.0);
      vec2 uv = vUv;
      float band = floor(uv.y * 24.0);
      float r = h(band + tick * 1.7);
      float slice = step(0.75, r) * (h(band * 3.1 + tick) - 0.5) * 0.12;
      uv.x += slice * burst;
      float split = (0.004 + 0.02 * burst * h(tick)) ;
      float cr = texture2D(map, uv + vec2(split, 0.0)).r;
      float cg = texture2D(map, uv).g;
      float cb = texture2D(map, uv - vec2(split, 0.0)).b;
      vec3 c = vec3(cr, cg, cb);
      // scanlines + flicker
      c *= 0.94 + 0.06 * sin(vUv.y * 700.0 + time * 10.0);
      c *= 1.0 - 0.15 * burst * h(tick + 9.0);
      // logo bg is near-black: use brightness as alpha so it blends with the page
      float a = smoothstep(0.04, 0.2, max(c.r, max(c.g, c.b)));
      gl_FragColor = vec4(c, a);
      #include <colorspace_fragment>
    }`
});
const logo = new THREE.Mesh(new THREE.PlaneGeometry(7, 7), logoMat);
hero.add(logo);
scene.add(hero);

// Floating shards
const shards = [];
const geos = [new THREE.TetrahedronGeometry(0.35), new THREE.OctahedronGeometry(0.3), new THREE.BoxGeometry(0.4, 0.12, 0.4)];
for (let i = 0; i < 40; i++) {
  const m = new THREE.Mesh(
    geos[i % 3],
    i % 4 === 0
      ? new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true })
      : new THREE.MeshStandardMaterial({ color: i % 3 ? RED : 0x222222, metalness: 0.6, roughness: 0.4 })
  );
  m.position.set((Math.random() - 0.5) * 30, (Math.random() - 0.5) * 22, -Math.random() * 25 - 2);
  m.userData = { sp: 0.2 + Math.random() * 0.6, rot: new THREE.Vector3(Math.random(), Math.random(), Math.random()) };
  shards.push(m); scene.add(m);
}

// Embers
const N = 500, pos = new Float32Array(N * 3), vel = new Float32Array(N);
for (let i = 0; i < N; i++) {
  pos.set([(Math.random() - 0.5) * 40, (Math.random() - 0.5) * 30, (Math.random() - 0.5) * 30 - 5], i * 3);
  vel[i] = 0.2 + Math.random() * 0.8;
}
const pg = new THREE.BufferGeometry();
pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
const embers = new THREE.Points(pg, new THREE.PointsMaterial({ color: RED, size: 0.07, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending }));
scene.add(embers);

// Input
const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
addEventListener('pointermove', e => { mouse.tx = e.clientX / innerWidth - 0.5; mouse.ty = e.clientY / innerHeight - 0.5; });
let hover = false;
addEventListener('pointerdown', () => { hover = true; setTimeout(() => hover = false, 350); });
let scrollY = 0;
addEventListener('scroll', () => { scrollY = window.scrollY; }, { passive: true });

function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  // place hero object right on wide screens, behind text-center on narrow
  hero.userData.baseX = w > 900 ? 3.4 : 0;
  hero.userData.baseY = w > 900 ? 0 : 2.6;
  hero.scale.setScalar(w > 900 ? 1 : 0.7);
}
addEventListener('resize', resize); resize();

const clock = new THREE.Clock();
let visible = true;
document.addEventListener('visibilitychange', () => { visible = !document.hidden; });

function frame() {
  requestAnimationFrame(frame);
  if (!visible) return;
  const t = clock.getElapsedTime();
  logoMat.uniforms.time.value = t;
  logoMat.uniforms.boost.value += ((hover ? 1 : 0) - logoMat.uniforms.boost.value) * 0.2;
  mouse.x += (mouse.tx - mouse.x) * 0.05;
  mouse.y += (mouse.ty - mouse.y) * 0.05;

  const fade = Math.max(0, 1 - scrollY / (innerHeight * 0.9));
  hero.visible = fade > 0.01;
  hero.position.set(hero.userData.baseX - scrollY * 0.004, hero.userData.baseY + Math.sin(t) * 0.15, -scrollY * 0.006);
  hero.rotation.y = mouse.x * 0.9 + Math.sin(t * 0.5) * 0.12;
  hero.rotation.x = mouse.y * 0.6;
  hero.scale.setScalar((innerWidth > 900 ? 1 : 0.7) * (0.6 + 0.4 * fade));

  shards.forEach(s => {
    s.rotation.x += s.userData.rot.x * 0.01 * s.userData.sp;
    s.rotation.y += s.userData.rot.y * 0.01 * s.userData.sp;
    s.position.y += Math.sin(t * s.userData.sp + s.position.x) * 0.002;
  });

  const p = pg.attributes.position;
  for (let i = 0; i < N; i++) {
    let y = p.getY(i) + vel[i] * 0.012;
    if (y > 15) y = -15;
    p.setY(i, y);
  }
  p.needsUpdate = true;

  camera.position.x = mouse.x * 1.2;
  camera.position.y = -mouse.y * 0.8 - scrollY * 0.0012;
  camera.lookAt(0, -scrollY * 0.0012, 0);
  key.position.x = 4 + Math.sin(t) * 2;

  renderer.render(scene, camera);
}
if (reduce) { renderer.render(scene, camera); } else { frame(); }

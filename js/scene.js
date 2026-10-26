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

// Hero object: slanted slab (echoes the logo) with three claw slashes cut through it
const hero = new THREE.Group();
const shape = new THREE.Shape();
shape.moveTo(-2.2, -1.4); shape.lineTo(-1.6, 1.4); shape.lineTo(2.4, 1.4); shape.lineTo(1.8, -1.4); shape.closePath();
const slab = new THREE.Mesh(
  new THREE.ExtrudeGeometry(shape, { depth: 0.6, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05, bevelSegments: 2 }),
  new THREE.MeshStandardMaterial({ color: RED, metalness: 0.5, roughness: 0.35, emissive: 0x330404 })
);
slab.position.z = -0.3;
hero.add(slab);
const slashMat = new THREE.MeshBasicMaterial({ color: 0x0d0d0d });
for (let i = -1; i <= 1; i++) {
  const s = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 3.6), slashMat);
  s.position.set(i * 1.1 + 0.1, 0, 0.36);
  s.rotation.z = 0.32;
  hero.add(s);
}
const edges = new THREE.LineSegments(
  new THREE.EdgesGeometry(slab.geometry),
  new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35 })
);
edges.position.copy(slab.position);
hero.add(edges);
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
  mouse.x += (mouse.tx - mouse.x) * 0.05;
  mouse.y += (mouse.ty - mouse.y) * 0.05;

  const fade = Math.max(0, 1 - scrollY / (innerHeight * 0.9));
  hero.visible = fade > 0.01;
  hero.position.set(hero.userData.baseX - scrollY * 0.004, hero.userData.baseY + Math.sin(t) * 0.15, -scrollY * 0.006);
  hero.rotation.y = -0.35 + mouse.x * 0.9 + Math.sin(t * 0.5) * 0.12;
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

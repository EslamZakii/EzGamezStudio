// Nav
const nav = document.getElementById('nav');
const burger = document.getElementById('burger');
const menu = document.getElementById('menu');
addEventListener('scroll', () => nav.classList.toggle('solid', scrollY > 40), { passive: true });
burger.addEventListener('click', () => {
  const open = menu.classList.toggle('open');
  burger.setAttribute('aria-expanded', open);
});
menu.addEventListener('click', () => { menu.classList.remove('open'); burger.setAttribute('aria-expanded', false); });
document.getElementById('yr').textContent = new Date().getFullYear();

// Reveal on scroll
const io = new IntersectionObserver(es => es.forEach(e => {
  if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); if (e.target.dataset.count !== undefined) count(e.target); }
}), { threshold: 0.15 });
document.querySelectorAll('.head, .card, .split > *, .stats div, .item, .about, .contact > *').forEach(el => { el.classList.add('reveal'); io.observe(el); });
document.querySelectorAll('[data-count]').forEach(el => io.observe(el));
function count(el) {
  const to = +el.dataset.count, suf = el.dataset.suffix || '';
  const t0 = performance.now();
  (function step(t) {
    const k = Math.min((t - t0) / 1200, 1);
    el.textContent = Math.round(to * (1 - Math.pow(1 - k, 3))) + suf;
    if (k < 1) requestAnimationFrame(step);
  })(t0);
}

// Card tilt
if (matchMedia('(hover:hover)').matches) {
  document.querySelectorAll('.tilt').forEach(c => {
    c.addEventListener('pointermove', e => {
      const r = c.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      c.style.transform = `perspective(700px) rotateY(${x * 10}deg) rotateX(${-y * 10}deg) translateY(-4px)`;
    });
    c.addEventListener('pointerleave', () => { c.style.transform = ''; });
  });
}

// Mini game: "Easy to play, hard to master"
(() => {
  const cv = document.getElementById('mini'), ctx = cv.getContext('2d');
  const $ = id => document.getElementById(id);
  const btn = $('start');
  let best = 0;
  try { best = +localStorage.getItem('ez-best') || 0; } catch (e) {}
  $('best').textContent = best;

  let targets, score, left, running, last, spawnT, elapsed;
  const W = cv.width, H = cv.height;

  function start() {
    targets = []; score = 0; left = 20; elapsed = 0; spawnT = 0; running = true; last = performance.now();
    btn.style.display = 'none'; $('score').textContent = 0;
    requestAnimationFrame(loop);
  }
  function spawn() {
    const shrink = Math.min(elapsed / 20, 1);           // gets harder with time
    const r = 38 - shrink * 22;
    targets.push({ x: r + Math.random() * (W - 2 * r), y: r + Math.random() * (H - 2 * r), r, max: r, life: 1.6 - shrink * 0.9, age: 0 });
  }
  function end() {
    running = false; btn.style.display = ''; btn.textContent = 'Play again';
    if (score > best) { best = score; $('best').textContent = best; try { localStorage.setItem('ez-best', best); } catch (e) {} }
    draw(true);
  }
  function loop(now) {
    if (!running) return;
    const dt = Math.min((now - last) / 1000, 0.05); last = now;
    elapsed += dt; left -= dt; spawnT -= dt;
    if (spawnT <= 0) { spawn(); spawnT = Math.max(0.25, 0.8 - elapsed * 0.03); }
    targets.forEach(t => t.age += dt);
    targets = targets.filter(t => t.age < t.life);
    $('time').textContent = Math.max(0, Math.ceil(left));
    if (left <= 0) return end();
    draw();
    requestAnimationFrame(loop);
  }
  function draw(over) {
    ctx.fillStyle = '#0a0a0a'; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = '#161616'; ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    (targets || []).forEach(t => {
      const k = 1 - t.age / t.life, r = t.max * (0.4 + 0.6 * k);
      ctx.fillStyle = '#e02b2b'; ctx.beginPath(); ctx.arc(t.x, t.y, r, 0, 7); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(t.x, t.y, r * 0.4, 0, 7); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(t.x, t.y, t.max, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2); ctx.stroke();
    });
    ctx.textAlign = 'center';
    if (over || !running) {
      ctx.fillStyle = 'rgba(13,13,13,.75)'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#fff'; ctx.font = '700 36px "Chakra Petch", sans-serif';
      ctx.fillText(over ? 'TIME! SCORE ' + score : 'CLICK THE TARGETS', W / 2, H / 2 - 6);
      ctx.fillStyle = '#e02b2b'; ctx.font = '600 18px "Chakra Petch", sans-serif';
      ctx.fillText(over ? (score >= best && score > 0 ? 'NEW BEST!' : 'Can you beat ' + best + '?') : 'Press Start', W / 2, H / 2 + 28);
    }
  }
  cv.addEventListener('pointerdown', e => {
    if (!running) return;
    const r = cv.getBoundingClientRect();
    const x = (e.clientX - r.left) * W / r.width, y = (e.clientY - r.top) * H / r.height;
    for (let i = targets.length - 1; i >= 0; i--) {
      const t = targets[i];
      if (Math.hypot(t.x - x, t.y - y) <= t.max) { targets.splice(i, 1); score++; $('score').textContent = score; return; }
    }
    score = Math.max(0, score - 1); $('score').textContent = score; // misses cost a point: mastery
  });
  btn.addEventListener('click', start);
  draw();
})();

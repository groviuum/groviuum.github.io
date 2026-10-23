import { PRODUCTS, CATEGORIES } from './data.js';
import { ICON, productUrl, observeReveals } from './app.js';

/* ── HERO SHOWCASE ─────────────────────────────────── */
// pieces ticked "Show on home page" in the admin; falls back to the first cut-outs if none are ticked
const withCutout = PRODUCTS.filter(p => p.cutout);
const hero = withCutout.some(p => p.hero) ? withCutout.filter(p => p.hero) : withCutout.slice(0, 6);
const sc = document.getElementById('showcase');
const wordBox = sc.querySelector('.word-inner');
const stage = sc.querySelector('.stage-inner');
const meta = sc.querySelector('.showcase-meta');
const thumbs = sc.querySelector('.showcase-thumbs');
const bar = sc.querySelector('.showcase-progress i');
const f = name => sc.querySelector(`[data-f="${name}"]`);
const DURATION = 6500;
let current = -1, progress, busy = false;

const pieces = hero.map((p, i) => {
  const d = document.createElement('div');
  d.className = 'piece';
  d.innerHTML = `<img src="${p.cutout}" alt="${p.name} — ${p.type}" ${i ? 'loading="lazy"' : 'fetchpriority="high"'}>`;
  stage.append(d);
  return d;
});
thumbs.innerHTML = hero.map((p, i) => `<button class="thumb" role="tab" aria-label="${p.name}" data-i="${i}"><img src="${p.cutout}" alt="" loading="lazy"></button>`).join('');
f('total').textContent = String(hero.length).padStart(2, '0');

function fitWord(w) {
  w.style.fontSize = '100px';
  const width = w.scrollWidth;
  const size = Math.min(100 * innerWidth * 0.95 / width, innerHeight * (innerWidth < 760 ? 0.24 : 0.4));
  w.style.fontSize = size + 'px';
}

function showWord(text) {
  wordBox.querySelectorAll('.w').forEach(old => {
    old.classList.remove('in'); old.classList.add('out');
    setTimeout(() => old.remove(), 1000);
  });
  const w = document.createElement('div');
  w.className = 'w';
  // each letter samples a different patch of the stone texture
  w.innerHTML = [...text].map((c, i) => `<span class="ch" style="transition-delay:${120 + i * 45}ms;background-position:0 0, ${-i * 0.66}em ${(i % 3) * -0.35}em">${c === ' ' ? '&nbsp;' : c}</span>`).join('');
  wordBox.append(w);
  fitWord(w);
  void w.offsetWidth;
  w.classList.add('in');
}

function go(i, dir = 1) {
  if (busy || i === current) return;
  if (current >= 0) { busy = true; setTimeout(() => busy = false, 700); }
  i = (i + hero.length) % hero.length;
  const p = hero[i];

  // stage: old piece leaves in the direction of travel, new one arrives from the other side
  const prev = pieces[current], next = pieces[i];
  if (prev) {
    prev.style.setProperty('--dir', dir);
    prev.classList.remove('in'); prev.classList.add('out');
    setTimeout(() => prev.classList.remove('out'), 1000);
  }
  next.style.transition = 'none';
  next.style.setProperty('--dir', dir);
  void next.offsetWidth;
  next.style.transition = '';
  next.classList.add('in');
  current = i;
  // warm up the following piece so it never arrives empty
  const ahead = pieces[(i + 1) % hero.length].querySelector('img');
  if (ahead.loading === 'lazy') ahead.loading = 'eager';

  showWord(p.name.toUpperCase());

  meta.classList.add('hide');
  setTimeout(() => {
    f('type').textContent = p.type;
    f('name').textContent = p.name;
    f('dims').textContent = p.dims;
    f('link').href = productUrl(p);
    f('add').dataset.add = p.id;
    meta.classList.remove('hide');
  }, prev ? 380 : 0);

  f('idx').textContent = String(i + 1).padStart(2, '0');
  thumbs.querySelectorAll('.thumb').forEach((t, k) => t.classList.toggle('active', k === i));

  progress?.cancel();
  progress = bar.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: DURATION, easing: 'linear' });
  progress.onfinish = () => go(current + 1, 1);
}

sc.querySelectorAll('.arrow-btn').forEach(b => {
  b.innerHTML = b.dataset.dir === '1' ? ICON.arrowR : ICON.arrowL;
  b.addEventListener('click', () => go(current + +b.dataset.dir, +b.dataset.dir));
});
thumbs.addEventListener('click', e => { const t = e.target.closest('.thumb'); if (t) go(+t.dataset.i, +t.dataset.i > current ? 1 : -1); });
addEventListener('keydown', e => {
  if (scrollY > innerHeight * .6 || document.body.classList.contains('drawer-open')) return;
  if (e.key === 'ArrowRight') go(current + 1, 1);
  if (e.key === 'ArrowLeft') go(current - 1, -1);
});
let tx = null;
sc.addEventListener('touchstart', e => tx = e.touches[0].clientX, { passive: true });
sc.addEventListener('touchend', e => {
  if (tx === null) return;
  const dx = e.changedTouches[0].clientX - tx; tx = null;
  if (Math.abs(dx) > 50) go(current + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
});
// hovering the piece pauses the timer
sc.querySelector('.showcase-meta').addEventListener('mouseenter', () => progress?.pause());
sc.querySelector('.showcase-meta').addEventListener('mouseleave', () => progress?.play());
document.addEventListener('visibilitychange', () => document.hidden ? progress?.pause() : progress?.play());

// depth: piece and word drift in opposite directions with the cursor
if (matchMedia('(pointer: fine)').matches) {
  sc.addEventListener('mousemove', e => {
    const x = e.clientX / innerWidth - .5, y = e.clientY / innerHeight - .5;
    stage.style.transform = `translate(${x * -34}px, ${y * -20}px)`;
    wordBox.style.transform = `translate(${x * 18}px, ${y * 10}px)`;
  });
}
addEventListener('resize', () => wordBox.querySelectorAll('.w').forEach(fitWord));
go(0);

/* ── 3D STUDIO (three.js is only loaded when the viewer comes near) ── */
const viewerEl = document.getElementById('viewer');
viewerEl.querySelector('[data-icon]').innerHTML = ICON.rotate;
let viewer;
const choice = { top: 'Travertine', base: 'Walnut' };
new IntersectionObserver(async ([e], obs) => {
  if (!e.isIntersecting) return;
  obs.disconnect();
  try {
    const { mountMonolith } = await import('./viewer3d.js');
    viewer = mountMonolith(viewerEl);
    viewer.setTop(choice.top); viewer.setBase(choice.base);
  } catch (err) {
    viewerEl.querySelector('.viewer-loading').textContent = '3D preview unavailable';
    console.error(err);
  }
}, { rootMargin: '300px' }).observe(viewerEl);

document.querySelectorAll('.studio .swatches').forEach(group => group.addEventListener('click', e => {
  const s = e.target.closest('.swatch'); if (!s) return;
  const key = group.dataset.group;
  group.querySelectorAll('.swatch').forEach(x => x.classList.toggle('active', x === s));
  choice[key] = s.dataset.value;
  document.querySelector(`[data-label="${key}"]`).textContent = s.dataset.value;
  document.getElementById('studio-add').dataset.finish = `${choice.top} / ${choice.base}`;
  if (key === 'top') viewer?.setTop(s.dataset.value); else viewer?.setBase(s.dataset.value);
}));

/* ── MARQUEE ───────────────────────────────────────── */
const mqItem = p => `<div class="mq-item"><a href="${productUrl(p)}"><img src="${p.cutout}" alt="" loading="lazy"><span class="mq-name">${p.name}</span></a><span class="star">✦</span></div>`;
const fill = (id, list) => { const html = list.map(mqItem).join(''); document.getElementById(id).innerHTML = html + html; };
const cut = PRODUCTS.filter(p => p.cutout);
fill('mq1', cut.filter(p => p.category === 'tables'));
fill('mq2', cut.filter(p => p.category === 'mirrors'));

/* ── CATEGORIES ────────────────────────────────────── */
const catImage = { tables: 'assets/img/mesa-room.jpg', mirrors: 'assets/img/erosion-room.jpg', lighting: 'assets/img/light-3.jpg', walls: 'assets/img/wall-6.jpg' };
document.getElementById('cats').innerHTML = CATEGORIES.map((c, i) => {
  const n = PRODUCTS.filter(p => p.category === c.id).length;
  return `<a class="cat-card reveal reveal-d${i % 4}" href="collection.html?cat=${c.id}">
    <img src="${catImage[c.id]}" alt="" loading="lazy">
    <div class="cat-info"><div><div class="cat-count">${String(n).padStart(2, '0')} pieces</div><div class="cat-name">${c.label}</div></div><span class="cat-go">${ICON.arrowUR}</span></div>
  </a>`;
}).join('');
observeReveals();

/* ── gentle scroll parallax on large images ───────── */
const par = [...document.querySelectorAll('[data-speed]')];
const onScroll = () => par.forEach(img => {
  const r = img.parentElement.getBoundingClientRect();
  const off = (r.top + r.height / 2 - innerHeight / 2) * +img.dataset.speed;
  img.style.transform = `translateY(${off}px)`;
});
addEventListener('scroll', onScroll, { passive: true }); onScroll();

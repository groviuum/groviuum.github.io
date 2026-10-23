import { PRODUCTS, CATEGORIES, byId } from './data.js';
import { ICON, card, waLink, observeReveals, fillIcons } from './app.js';

const p = byId(new URLSearchParams(location.search).get('id')) || PRODUCTS[0];
const cat = CATEGORIES.find(c => c.id === p.category);
document.title = `${p.name} ${p.type} — Grovium`;

const MATERIAL = {
  tables: 'Grovium stone-look composite, hand-finished',
  mirrors: 'Grovium stone-look composite, mirror glass',
  lighting: 'Stone-look shade, warm LED',
  walls: 'Sculpted on site or as panels',
};

// slides: optional live 3D, the cut-out on a stage, then room photos
const slides = [];
if (p.model3d) slides.push({ kind: '3d' });
if (p.cutout) slides.push({ kind: 'cut', src: p.cutout });
p.gallery.forEach(src => slides.push({ kind: 'photo', src }));

const slideHtml = (s, i) => s.kind === '3d'
  ? `<div class="slide viewer ${i ? '' : 'active'}" id="pviewer"><div class="viewer-loading">Loading 3D</div><div class="viewer-hint">${ICON.rotate} Drag to rotate</div></div>`
  : `<div class="slide ${i ? '' : 'active'}"><img class="${s.kind}" src="${s.src}" alt="${p.name}" ${i ? 'loading="lazy"' : ''}></div>`;
const thumbHtml = (s, i) => `<button class="p-thumb ${i ? '' : 'active'}" data-i="${i}" aria-label="View ${i + 1}">${
  s.kind === '3d' ? '3D' : `<img class="${s.kind}" src="${s.src}" alt="" loading="lazy">`}</button>`;

document.getElementById('product').innerHTML = `
  <div class="p-media reveal">
    <div class="p-stage">${slides.map(slideHtml).join('')}</div>
    ${slides.length > 1 ? `<div class="p-thumbs">${slides.map(thumbHtml).join('')}</div>` : ''}
  </div>
  <div class="p-info reveal reveal-d1">
    <div class="crumbs"><a href="collection.html">Collection</a> / <a href="collection.html?cat=${p.category}">${cat.label}</a></div>
    <span class="type">${p.type}</span>
    <h1>${p.name}</h1>
    <p class="line">${p.line}</p>
    <p class="desc">${p.text}</p>

    ${p.finishes?.length ? `<div class="option-group" style="margin-top:34px">
      <div class="label">Finish <b data-label="finish">${p.finishes[0]}</b></div>
      <div class="filters" style="margin-top:0" data-finishes>${p.finishes.map((f, i) => `<button class="pill ${i ? '' : 'active'}" data-finish="${f}">${f}</button>`).join('')}</div>
    </div>` : ''}

    <ul class="spec-list">
      <li><span>Dimensions</span><span>${p.dims}</span></li>
      <li><span>Material</span><span>${MATERIAL[p.category]}</span></li>
      ${p.specs.map(s => `<li><span>${s.label}</span><span>${s.value}</span></li>`).join('')}
      <li><span>Sizes</span><span>Standard or made to measure</span></li>
      <li><span>Made in</span><span>Vienna · delivered worldwide</span></li>
    </ul>

    <div class="price-note">Price on request — tell us your size and country</div>
    <div class="p-actions">
      <button class="btn btn-solid" data-add="${p.id}" data-finish="${p.finishes?.[0] || ''}" id="p-add">Add to inquiry</button>
      <a class="btn btn-ghost" id="p-wa" target="_blank" rel="noopener">${ICON.wa} Ask on WhatsApp</a>
    </div>
  </div>`;

const waText = finish => `Hello Grovium, I'm interested in ${p.name} (${p.type}${finish ? ', ' + finish : ''}, ${p.dims}). Could you send me a price?`;
const wa = document.getElementById('p-wa');
wa.href = waLink(waText(p.finishes?.[0]));

/* gallery */
const stageSlides = [...document.querySelectorAll('.p-stage > .slide')];
const thumbs = [...document.querySelectorAll('.p-thumb')];
let viewer, viewerLoading = false;
function show(i) {
  stageSlides.forEach((s, k) => s.classList.toggle('active', k === i));
  thumbs.forEach((t, k) => t.classList.toggle('active', k === i));
  if (slides[i].kind === '3d') mount3d();
}
thumbs.forEach(t => t.addEventListener('click', () => show(+t.dataset.i)));

async function mount3d() {
  if (viewer || viewerLoading) return;
  viewerLoading = true;
  const el = document.getElementById('pviewer');
  try {
    const { mountMonolith, FINISHES } = await import('./viewer3d.js');
    viewer = mountMonolith(el);
    const f = document.querySelector('[data-finishes] .active')?.dataset.finish;
    if (f && FINISHES.top[f]) viewer.setTop(f);
  } catch (err) {
    el.querySelector('.viewer-loading').textContent = '3D preview unavailable';
    console.error(err);
  }
}
if (slides[0]?.kind === '3d') mount3d();

/* finish choice */
document.querySelector('[data-finishes]')?.addEventListener('click', e => {
  const b = e.target.closest('.pill'); if (!b) return;
  document.querySelectorAll('[data-finishes] .pill').forEach(x => x.classList.toggle('active', x === b));
  const f = b.dataset.finish;
  document.querySelector('[data-label="finish"]').textContent = f;
  document.getElementById('p-add').dataset.finish = f;
  wa.href = waLink(waText(f));
  viewer?.setTop(f);
});

/* related: same category first */
const others = PRODUCTS.filter(x => x.id !== p.id);
const related = [...others.filter(x => x.category === p.category), ...others.filter(x => x.category !== p.category)].slice(0, 4);
document.getElementById('related').innerHTML = related.map(card).join('');
fillIcons(); observeReveals();

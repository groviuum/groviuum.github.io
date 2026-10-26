// Shared layout: header, footer, inquiry drawer, reveal-on-scroll.
import { CONTACT, PRODUCTS, byId, imageOf } from './data.js';

export const ICON = {
  arrowR: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M4 12h16M14 6l6 6-6 6"/></svg>',
  arrowL: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M20 12H4M10 6l-6 6 6 6"/></svg>',
  arrowUR: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M7 17 17 7M8 7h9v9"/></svg>',
  plus: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 5v14M5 12h14"/></svg>',
  close: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  rotate: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M3 12a9 9 0 0 1 15.5-6.2L21 8M21 3v5h-5M21 12a9 9 0 0 1-15.5 6.2L3 16M3 21v-5h5"/></svg>',
  wa: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.5 14.4c-.3-.1-1.8-.9-2-1-.3-.1-.5-.1-.7.1-.2.3-.8 1-.9 1.2-.2.2-.3.2-.6.1-.3-.1-1.3-.5-2.4-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6l.4-.5c.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.1.2 2.1 3.2 5.1 4.5 2.5 1 3 .8 3.6.7.6-.1 1.8-.7 2-1.4.2-.7.2-1.3.2-1.4-.1-.1-.3-.2-.6-.3zM12 21.8c-1.8 0-3.5-.5-5-1.4l-.4-.2-3.7 1 1-3.6-.2-.4A9.8 9.8 0 1 1 12 21.8zM12 0a12 12 0 0 0-10.3 18L0 24l6.2-1.6A12 12 0 1 0 12 0z"/></svg>',
  ig: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".8" fill="currentColor"/></svg>',
  phone: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2z"/></svg>',
  mail: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>',
};

export const waLink = text => `https://wa.me/${CONTACT.whatsapp}${text ? '?text=' + encodeURIComponent(text) : ''}`;
export const productUrl = p => `product.html?id=${p.id}`;

/* ── inquiry store (per-visitor, survives reloads) ── */
const KEY = 'grovium-inquiry';
let items = [];
try { items = JSON.parse(localStorage.getItem(KEY) || '[]').filter(i => byId(i.id)); } catch { items = []; }
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(items)); } catch {} };

export const inquiry = {
  items: () => items,
  add(id, finish) {
    const p = byId(id); if (!p) return;
    finish = finish || p.finishes?.[0] || '';
    if (!items.some(i => i.id === id && i.finish === finish)) items.push({ id, finish });
    save(); renderDrawer(); bumpCount(); toast(p);
  },
  remove(idx) { items.splice(idx, 1); save(); renderDrawer(); updateCount(); },
};

/* ── layout ─────────────────────────────────── */
const page = document.body.dataset.page;
const navLink = (href, label, key) => `<a href="${href}" class="${page === key ? 'active' : ''}">${label}</a>`;

function header() {
  const h = document.createElement('header');
  h.className = 'site-header';
  h.innerHTML = `
    <a class="logo" href="index.html" aria-label="Grovium home"><img src="assets/img/logo-light.png" alt="Grovium"></a>
    <nav class="nav">
      ${navLink('collection.html', 'Collection', 'collection')}
      ${navLink('bespoke.html', 'Bespoke', 'bespoke')}
      ${navLink('index.html#atelier', 'Atelier', 'atelier')}
    </nav>
    <div class="header-actions">
      <button class="inquiry-btn" data-open-inquiry aria-label="Open inquiry list">
        <span class="label">Inquiry</span><span class="inquiry-count">0</span>
      </button>
      <button class="menu-btn" aria-label="Menu"><span></span><span></span></button>
    </div>`;
  document.body.prepend(h);

  const mm = document.createElement('div');
  mm.className = 'mobile-menu';
  mm.innerHTML = `<a href="index.html">Home</a><a href="collection.html">Collection</a><a href="bespoke.html">Bespoke</a><a href="index.html#atelier">Atelier</a>
    <p class="eyebrow" style="margin-top:40px">${CONTACT.city}</p>`;
  document.body.append(mm);
  h.querySelector('.menu-btn').addEventListener('click', () => document.body.classList.toggle('menu-open'));
  mm.addEventListener('click', e => { if (e.target.tagName === 'A') document.body.classList.remove('menu-open'); });

  const onScroll = () => h.classList.toggle('scrolled', scrollY > 40);
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
}

function footer() {
  const f = document.createElement('footer');
  f.className = 'site-footer';
  f.innerHTML = `
    <div class="footer-top">
      <div>
        <p class="footer-cta serif">Have a space in mind?<br><em>Let's shape it.</em></p>
        <a class="btn btn-solid" href="${waLink('Hello Grovium, I would like to ask about ')}" target="_blank" rel="noopener">${ICON.wa} Chat on WhatsApp</a>
      </div>
      <div class="footer-col">
        <h4>Contact</h4>
        <a href="tel:${CONTACT.phone.replace(/\s/g, '')}">${ICON.phone} ${CONTACT.phone}</a>
        <a href="${waLink()}" target="_blank" rel="noopener">${ICON.wa} WhatsApp</a>
        <a href="https://instagram.com/${CONTACT.instagram}" target="_blank" rel="noopener">${ICON.ig} @${CONTACT.instagram}</a>
      </div>
      <div class="footer-col">
        <h4>Atelier</h4>
        <p>${CONTACT.city}</p>
        <p style="color:var(--muted)">Handcrafted to order.<br>Delivered worldwide.</p>
      </div>
    </div>
    <div class="footer-bottom">
      <img src="assets/img/logo-light.png" alt="Grovium">
      <span>Stone-look pieces, sculpted by hand — not quarried. © ${new Date().getFullYear()} Grovium</span>
    </div>`;
  document.body.append(f);

  const wa = document.createElement('a');
  wa.className = 'wa-float'; wa.href = waLink(); wa.target = '_blank'; wa.rel = 'noopener';
  wa.setAttribute('aria-label', 'Chat on WhatsApp'); wa.innerHTML = ICON.wa;
  document.body.append(wa);
}

/* ── inquiry drawer ─────────────────────────── */
let drawer;
function buildDrawer() {
  const scrim = document.createElement('div'); scrim.className = 'scrim';
  drawer = document.createElement('aside'); drawer.className = 'drawer'; drawer.setAttribute('aria-label', 'Inquiry list');
  drawer.innerHTML = `
    <div class="drawer-head"><h3>Your inquiry</h3><button class="close-btn" aria-label="Close">${ICON.close}</button></div>
    <div class="drawer-body"></div>
    <div class="drawer-foot">
      <button class="btn btn-solid" data-send="wa">${ICON.wa} Send via WhatsApp</button>
      ${CONTACT.email ? `<button class="btn btn-ghost" data-send="mail">${ICON.mail} Send via email</button>` : ''}
      <small>Prices on request · we reply within 24 hours</small>
    </div>`;
  document.body.append(scrim, drawer);
  const close = () => document.body.classList.remove('drawer-open');
  scrim.addEventListener('click', close);
  drawer.querySelector('.close-btn').addEventListener('click', close);
  addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
  drawer.addEventListener('click', e => {
    const rm = e.target.closest('[data-remove]'); if (rm) inquiry.remove(+rm.dataset.remove);
    const send = e.target.closest('[data-send]'); if (send) sendInquiry(send.dataset.send);
  });
  document.addEventListener('click', e => {
    if (e.target.closest('[data-open-inquiry]')) { renderDrawer(); document.body.classList.add('drawer-open'); }
    const add = e.target.closest('[data-add]');
    if (add) { e.preventDefault(); e.stopPropagation(); inquiry.add(add.dataset.add, add.dataset.finish); }
  });
  renderDrawer();
}

function renderDrawer() {
  if (!drawer) return;
  const body = drawer.querySelector('.drawer-body');
  const form = body.querySelector('.inq-form');
  const values = form ? Object.fromEntries(new FormData(form)) : {};
  const list = items.length ? items.map((it, i) => {
    const p = byId(it.id);
    return `<div class="inq-item">
      <a class="im" href="${productUrl(p)}"><img class="${p.cutout ? '' : 'photo'}" src="${imageOf(p)}" alt=""></a>
      <div><div class="n">${p.name}</div><div class="s">${p.type}${it.finish ? ' · ' + it.finish : ''}</div></div>
      <button class="rm" data-remove="${i}">Remove</button></div>`;
  }).join('') : `<div class="drawer-empty"><span class="serif">Nothing here yet.</span>Add pieces from the collection, or simply write to us about a custom project.</div>`;
  body.innerHTML = list + `
    <form class="inq-form" onsubmit="return false">
      <div class="field"><label for="f-name">Name</label><input id="f-name" name="name" autocomplete="name" value="${values.name || ''}"></div>
      <div class="field"><label for="f-country">Country / City</label><input id="f-country" name="country" autocomplete="country-name" value="${values.country || ''}"></div>
      <div class="field"><label for="f-msg">Message — sizes, finish, room</label><textarea id="f-msg" name="message" rows="3">${values.message || ''}</textarea></div>
    </form>`;
}

function inquiryText() {
  const v = Object.fromEntries(new FormData(drawer.querySelector('.inq-form')));
  const lines = items.map(it => { const p = byId(it.id); return `• ${p.name} — ${p.type}${it.finish ? ' (' + it.finish + ')' : ''}, ${p.dims}`; });
  return [
    'Hello Grovium,', '',
    lines.length ? 'I would like a price for:\n' + lines.join('\n') : 'I would like to ask about a custom piece.',
    v.message ? '\n' + v.message : '',
    '', [v.name, v.country].filter(Boolean).join(', '),
  ].join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

function sendInquiry(via) {
  const text = inquiryText();
  if (via === 'wa') window.open(waLink(text), '_blank', 'noopener');
  else location.href = `mailto:${CONTACT.email}?subject=${encodeURIComponent('Grovium inquiry')}&body=${encodeURIComponent(text)}`;
}

function updateCount() { document.querySelectorAll('.inquiry-count').forEach(c => c.textContent = items.length); }
function bumpCount() {
  updateCount();
  document.querySelectorAll('.inquiry-count').forEach(c => { c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump'); });
}

let toastEl, toastTimer;
function toast(p) {
  if (!toastEl) {
    toastEl = document.createElement('div'); toastEl.className = 'toast';
    document.body.append(toastEl);
  }
  toastEl.innerHTML = `<img src="${imageOf(p)}" alt=""><span>${p.name} added to inquiry</span><button data-open-inquiry>View</button>`;
  toastEl.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => toastEl.classList.remove('show'), 3200);
}

/* ── reveal on scroll ───────────────────────── */
export function observeReveals(root = document) {
  const io = new IntersectionObserver(entries => entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); }
  }), { threshold: .12, rootMargin: '0px 0px -40px 0px' });
  root.querySelectorAll('.reveal:not(.visible)').forEach(el => io.observe(el));
}

/* ── product card (collection + related) ───── */
export function card(p) {
  const room = p.gallery[0];
  const media = p.cutout
    ? `${room ? `<img class="room" src="${room}" alt="" loading="lazy">` : ''}<img class="cut ${room ? 'has-room' : ''}" src="${p.cutout}" alt="${p.name}" loading="lazy">`
    : p.category === 'walls' && p.gallery.length > 1
      // walls cross-fade through all their photos right on the card
      ? p.gallery.map((src, i) => `<img class="room solo fade ${i ? '' : 'on'}" src="${src}" alt="${i ? '' : p.name}" loading="lazy">`).join('')
        + `<div class="slide-dots">${p.gallery.map((_, i) => `<i class="${i ? '' : 'on'}"></i>`).join('')}</div>`
      : `<img class="room solo" src="${room}" alt="${p.name}" loading="lazy" onload="if(this.naturalHeight>this.naturalWidth)this.style.objectPosition='50% 35%'">`;
  return `<a class="card reveal" href="${productUrl(p)}" data-cat="${p.category}">
    <div class="stage">${media}<button class="add" data-add="${p.id}">${ICON.plus.replace('width="14" height="14"', 'width="10" height="10"')} Inquiry</button></div>
    <div class="info"><div><div class="n">${p.name}</div><div class="t">${p.type} · ${p.dims}</div></div></div>
  </a>`;
}

export function fillIcons(root = document) {
  root.querySelectorAll('.arrow:empty').forEach(a => a.innerHTML = ICON.arrowR);
}

// advance every sliding card; cards take turns so they don't all change at once
let slideTick = 0;
setInterval(() => {
  slideTick++;
  document.querySelectorAll('.card:not(.hidden) .stage').forEach((stage, n) => {
    const imgs = stage.querySelectorAll('.room.fade');
    if (imgs.length < 2 || (slideTick + n) % 2) return;
    const dots = stage.querySelectorAll('.slide-dots i');
    const cur = [...imgs].findIndex(i => i.classList.contains('on'));
    const next = (cur + 1) % imgs.length;
    imgs[cur].classList.remove('on'); imgs[next].classList.add('on');
    dots[cur]?.classList.remove('on'); dots[next]?.classList.add('on');
  });
}, 2200);

header(); footer(); buildDrawer(); updateCount(); fillIcons(); observeReveals();
export { PRODUCTS };

// ─────────────────────────────────────────────────────────────
//  GROVIUM — site content
//  Products and contact details live in /content/*.json and are
//  edited through the admin panel (Pages CMS). This module loads
//  and tidies them so every page gets clean data.
// ─────────────────────────────────────────────────────────────

export const CATEGORIES = [
  { id: 'tables',   label: 'Tables' },
  { id: 'mirrors',  label: 'Mirrors' },
  { id: 'lighting', label: 'Lighting' },
  { id: 'walls',    label: 'Walls' },
];

const load = async (path, fallback) => {
  try {
    const res = await fetch(path, { cache: 'no-cache' });
    if (!res.ok) throw new Error(res.status);
    return await res.json();
  } catch (err) {
    console.error(`Could not load ${path}`, err);
    return fallback;
  }
};

const [settings, rawProducts] = await Promise.all([
  load('content/settings.json', {}),
  load('content/products.json', []),
]);

// the CMS may write "/assets/img/x.png"; keep paths relative so the site works under any sub-folder
const img = v => (typeof v === 'string' ? v.trim().replace(/^\/+/, '') : '');
const list = v => (Array.isArray(v) ? v : v ? [v] : []);
const slug = s => String(s || '').toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/[\s_]+/g, '-');

export const CONTACT = {
  phone: settings.phone || '',
  whatsapp: String(settings.whatsapp || '').replace(/\D/g, ''),
  instagram: String(settings.instagram || '').replace(/^@/, ''),
  email: settings.email || '',
  city: settings.city || 'Vienna, Austria',
};

const seen = new Set();
export const PRODUCTS = list(rawProducts)
  .filter(p => p && p.name)
  .map(p => {
    let id = slug(p.id) || slug(`${p.name} ${p.type || ''}`);
    while (seen.has(id)) id += '-2';
    seen.add(id);
    return {
      id,
      name: p.name,
      category: CATEGORIES.some(c => c.id === p.category) ? p.category : 'tables',
      type: p.type || '',
      dims: p.dims || 'Made to measure',
      line: p.line || '',
      text: p.text || '',
      cutout: img(p.cutout),
      gallery: list(p.gallery).map(img).filter(Boolean),
      finishes: list(p.finishes).map(String).filter(Boolean),
      specs: list(p.specs).filter(s => s && s.label && s.value),
      hero: !!p.hero,
      model3d: id === 'monolith',   // the live 3D viewer is built for this exact table
    };
  })
  .filter(p => p.cutout || p.gallery.length);

export const byId = id => PRODUCTS.find(p => p.id === id);
export const imageOf = p => p.cutout || p.gallery[0];

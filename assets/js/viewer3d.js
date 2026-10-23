// Live 3D Monolith coffee table.
// Proportions and camera were fitted to the studio product photo (see raw/23):
// height ≈ 0.258 × width; stone 52 %, shadow gap 11 %, walnut plinth 37 % of the height;
// the plinth is flush with the top, the gap is a deep recessed core.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export const FINISHES = {
  top:  { Travertine: '#ffffff', Sand: '#f1dfc4', Graphite: '#6b655f' },
  base: { Walnut: '#ffffff', Ebony: '#4a403a' },
};

// dimensions in table widths (1 = 100 cm)
const W = 1.0;
const H = 0.258;
const TOP_H = 0.135, GAP_H = 0.028, BASE_H = H - TOP_H - GAP_H;
const BASE_W = 0.996, CORE_W = 0.82;

// the photo's point of view: 33° to the side, 15° above the table
const VIEW = { az: THREE.MathUtils.degToRad(33), el: THREE.MathUtils.degToRad(15), fov: 20 };
const TARGET = new THREE.Vector3(0, H * 0.42, 0);
// projected half-width of the table at its widest turn (the diagonal), plus a margin for perspective
const HALF_SPAN = Math.SQRT1_2 * 1.08;

export function mountMonolith(el, opts = {}) {
  const { autoRotate = true, intro = true, camera: camOverride, preserve = false, onReady } = opts;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: preserve });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  // no filmic curve: it bleached and shifted the stone's warm beige
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  el.prepend(renderer.domElement);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(VIEW.fov, 1, 0.05, 50);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.copy(TARGET);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.enablePan = false;
  controls.minPolarAngle = THREE.MathUtils.degToRad(20);
  controls.maxPolarAngle = THREE.MathUtils.degToRad(87);
  controls.autoRotate = autoRotate;
  controls.autoRotateSpeed = 0.6;
  controls.enabled = false;

  // ── light: soft studio key from above-right, broad sky fill, faint warm rim ──
  const key = new THREE.DirectionalLight('#fff4e8', 1.04);
  key.position.set(2.3, 3.6, 0.56);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -1.2, right: 1.2, top: 1.2, bottom: -1.2, near: 0.5, far: 10 });
  key.shadow.bias = -0.0003;
  key.shadow.normalBias = 0.01;
  key.shadow.radius = 4;
  scene.add(key);
  const hemi = new THREE.HemisphereLight('#fff6ec', '#2a1e16', 1.11);
  scene.add(hemi);
  const rim = new THREE.DirectionalLight('#d9b07a', 0.21);
  rim.position.set(2.6, 1.4, -2.8);
  scene.add(rim);

  // ── floor: shadow catcher + soft contact shadow ──
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), new THREE.ShadowMaterial({ opacity: 0.42 }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);
  const blob = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 1.7), new THREE.MeshBasicMaterial({ map: radialTexture(), transparent: true, depthWrite: false }));
  blob.rotation.x = -Math.PI / 2;
  blob.position.y = 0.001;
  scene.add(blob);

  // ── textures (both taken from the real product images) ──
  const loader = new THREE.TextureLoader();
  const maxAniso = renderer.capabilities.getMaxAnisotropy();
  let pending = 2;
  const loaded = () => { if (--pending === 0) { el.classList.add('ready'); onReady?.(); start(); } };
  const prep = (t, setup) => {
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = maxAniso;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    setup?.(t);
    return t;
  };
  // clones made before the image arrives must be flagged for upload once it does
  const stoneClones = [], woodClones = [];
  const stoneSrc = loader.load('assets/img/tex-stone.jpg', () => { stoneClones.forEach(t => t.needsUpdate = true); loaded(); });
  const woodSrc = loader.load('assets/img/tex-wood.jpg', () => { woodClones.forEach(t => t.needsUpdate = true); loaded(); });

  const stoneTop = prep(stoneSrc);
  // side faces are W × TOP_H: sample a strip of the same stone so the grain keeps its scale
  // (only the vertical offset varies per side — a horizontal one would wrap and leave a seam)
  const stoneSide = (offset) => { const t = prep(stoneSrc.clone(), t => { t.repeat.set(1, TOP_H / W); t.offset.set(0, 0.15 + offset * 0.8); }); stoneClones.push(t); return t; };
  // the wood crop is the plinth's own face (W × BASE_H); trim its edge rows, vary the start per side
  const woodSide = (offset, flip) => { const t = prep(woodSrc.clone(), t => { t.repeat.set(flip ? -1 : 1, 0.9); t.offset.set(offset, 0.05); }); woodClones.push(t); return t; };

  // light and material values below were calibrated against the product photo (≈3/255 average colour error)
  const stoneMat = map => new THREE.MeshPhysicalMaterial({
    map, bumpMap: map, bumpScale: 0.35, roughness: 0.5, clearcoat: 0.45, clearcoatRoughness: 0.22, envMapIntensity: 0.62,
  });
  const woodMat = map => new THREE.MeshPhysicalMaterial({
    map, roughness: 0.4, clearcoat: 0.6, clearcoatRoughness: 0.18, envMapIntensity: 0.74,
  });
  const topFace = stoneMat(stoneTop);
  const sideMats = [0.0, 0.25, 0.5, 0.75].map(o => stoneMat(stoneSide(o)));
  // whole-face mapping (offset 0) so no texture seam shows; mirrored on two sides for variety
  const woodMats = [[0, false], [0, true], [0, false], [0, true]].map(([o, f]) => woodMat(woodSide(o, f)));
  // surfaces inside the shadow gap stay near-black, as in the photo
  const woodCap = new THREE.MeshStandardMaterial({ color: '#0d0806', roughness: 1, envMapIntensity: 0 });
  const stoneMats = [sideMats[0], sideMats[1], topFace, sideMats[2], sideMats[2], sideMats[3]];   // +x −x +y −y +z −z
  const baseMats = [woodMats[0], woodMats[1], woodCap, woodCap, woodMats[2], woodMats[3]];

  // ── geometry ──
  const table = new THREE.Group();
  const top = new THREE.Mesh(planarUVs(new RoundedBoxGeometry(W, TOP_H, W, 3, 0.0035)), stoneMats);
  top.position.y = H - TOP_H / 2;
  const core = new THREE.Mesh(new THREE.BoxGeometry(CORE_W, GAP_H + 0.002, CORE_W), new THREE.MeshStandardMaterial({ color: '#070504', roughness: 1, envMapIntensity: 0 }));
  core.position.y = BASE_H + GAP_H / 2;
  const base = new THREE.Mesh(planarUVs(new RoundedBoxGeometry(BASE_W, BASE_H, BASE_W, 2, 0.0025)), baseMats);
  base.position.y = BASE_H / 2;
  [top, core, base].forEach(m => { m.castShadow = m.receiveShadow = true; table.add(m); });
  scene.add(table);

  // ── finishes: soft colour fade ──
  const topTarget = new THREE.Color(FINISHES.top.Travertine);
  const baseTarget = new THREE.Color(FINISHES.base.Walnut);
  const stoneAll = [topFace, ...sideMats];

  // ── camera framing ──
  let fitDist = 3.5;
  const dirFor = (az, elv) => new THREE.Vector3(Math.cos(elv) * Math.sin(az), Math.sin(elv), Math.cos(elv) * Math.cos(az));
  const resize = () => {
    const { clientWidth: w, clientHeight: h } = el;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = camOverride?.fov ?? (w / h < 1 ? 26 : VIEW.fov);
    camera.updateProjectionMatrix();
    // distance so the table, at any turn, fills ~90 % of the narrower direction
    const halfH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const halfW = halfH * camera.aspect;
    fitDist = HALF_SPAN / (Math.min(halfW, halfH * 1.9) * 0.9);
    controls.minDistance = fitDist * 0.55;
    controls.maxDistance = fitDist * 1.6;
    if (camOverride) placeOverride();
    else if (!introRunning && !touched) camera.position.copy(TARGET).addScaledVector(dirFor(VIEW.az, VIEW.el), fitDist);
  };
  function placeOverride() {
    const o = camOverride;
    controls.target.set(...o.target);
    camera.position.copy(controls.target).addScaledVector(dirFor(o.az, o.el), o.dist);
    camera.lookAt(controls.target);
  }

  let touched = false, introRunning = intro && !camOverride, t0 = 0;
  const ro = new ResizeObserver(resize); ro.observe(el); resize();

  const hint = el.querySelector('.viewer-hint');
  renderer.domElement.addEventListener('pointerdown', () => {
    touched = true; introRunning = false; controls.enabled = true; controls.autoRotate = false;
    hint?.classList.add('gone');
  }, { once: true });

  let visible = true, running = false, raf = 0;
  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible && running) loop(); }, { threshold: 0 });
  io.observe(el);

  function start() { running = true; t0 = performance.now(); if (!introRunning && !camOverride) controls.enabled = true; loop(); }
  function loop() {
    cancelAnimationFrame(raf);
    if (!visible) return;
    raf = requestAnimationFrame(loop);
    if (introRunning) {
      // glide down from a higher, wider view into the photo angle
      const k = Math.min(1, (performance.now() - t0) / 2200), e = 1 - Math.pow(1 - k, 3);
      const az = VIEW.az - 0.6 * (1 - e), elv = VIEW.el + THREE.MathUtils.degToRad(22) * (1 - e);
      camera.position.copy(TARGET).addScaledVector(dirFor(az, elv), fitDist * (1 + 0.5 * (1 - e)));
      camera.lookAt(TARGET);
      if (k >= 1) { introRunning = false; controls.enabled = true; }
    }
    for (const m of stoneAll) m.color.lerp(topTarget, 0.08);
    for (const m of woodMats) m.color.lerp(baseTarget, 0.08);
    if (controls.enabled) controls.update();
    renderer.render(scene, camera);
  }

  function dispose() {
    running = false; cancelAnimationFrame(raf); ro.disconnect(); io.disconnect();
    controls.dispose(); renderer.dispose(); renderer.domElement.remove();
  }

  return {
    setTop: name => topTarget.set(FINISHES.top[name] || '#ffffff'),
    setBase: name => baseTarget.set(FINISHES.base[name] || '#ffffff'),
    renderNow: () => renderer.render(scene, camera),
    dispose,
  };
}

// RoundedBoxGeometry derives UVs from vertex normals, which squeezes the texture into a band
// along the edges of thin, wide boxes. Re-map every face by planar projection instead
// (u along the face's horizontal axis, v along its height), so the stone and grain run evenly.
function planarUVs(geo) {
  geo.computeBoundingBox();
  const { min } = geo.boundingBox, size = geo.boundingBox.getSize(new THREE.Vector3());
  const pos = geo.attributes.position, uv = geo.attributes.uv;
  for (const g of geo.groups) {
    for (let i = g.start; i < g.start + g.count; i++) {
      const x = (pos.getX(i) - min.x) / size.x, y = (pos.getY(i) - min.y) / size.y, z = (pos.getZ(i) - min.z) / size.z;
      const [u, v] = [
        [1 - z, y],   // +x
        [z, y],       // −x
        [x, 1 - z],   // +y
        [x, z],       // −y
        [x, y],       // +z
        [1 - x, y],   // −z
      ][g.materialIndex];
      uv.setXY(i, u, v);
    }
  }
  uv.needsUpdate = true;
  return geo;
}

function radialTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(128, 128, 30, 128, 128, 128);
  grd.addColorStop(0, 'rgba(0,0,0,.6)'); grd.addColorStop(.5, 'rgba(0,0,0,.3)'); grd.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
}

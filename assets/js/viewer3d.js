// Live 3D Monolith coffee table (100 × 100 × 35 cm), built from real texture crops.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export const FINISHES = {
  top:  { Travertine: '#ffffff', Sand: '#f3dcb6', Graphite: '#5f5953' },
  base: { Walnut: '#ffffff', Ebony: '#4a403a' },
};

// dimensions in metres
const W = 1.0, H = 0.35, TOP_H = 0.21, GAP_H = 0.025, BASE_H = H - TOP_H - GAP_H, BASE_W = 0.97;

export function mountMonolith(el, { autoRotate = true, onReady } = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  el.prepend(renderer.domElement);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  // eye-level view, like the product photos
  const camEnd = new THREE.Vector3(2.25, 0.85, 2.25);
  camera.position.copy(camEnd).multiplyScalar(1.45);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0.17, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.enablePan = false;
  controls.minDistance = 1.5;
  controls.maxDistance = 4.6;
  controls.minPolarAngle = 0.25;
  controls.maxPolarAngle = 1.42;
  controls.autoRotate = autoRotate;
  controls.autoRotateSpeed = 0.7;
  controls.enabled = false;           // enabled after the intro move

  // ── light: warm key from a window, soft fill, golden rim ──
  const key = new THREE.DirectionalLight('#ffe1b8', 2.1);
  key.position.set(2.2, 3.6, 1.4);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -1.4, right: 1.4, top: 1.4, bottom: -1.4, near: 0.5, far: 10 });
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.01;
  scene.add(key);
  scene.add(new THREE.HemisphereLight('#fff1e0', '#1a120c', 0.55));
  const rim = new THREE.DirectionalLight('#c9a46a', 1.4);
  rim.position.set(-3, 1.6, -2.4);
  scene.add(rim);

  // ── floor: shadow catcher + soft contact shadow ──
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), new THREE.ShadowMaterial({ opacity: 0.5 }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);
  const blob = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 1.9), new THREE.MeshBasicMaterial({ map: radialTexture(), transparent: true, depthWrite: false }));
  blob.rotation.x = -Math.PI / 2;
  blob.position.y = 0.001;
  scene.add(blob);

  // ── textures ──
  const loader = new THREE.TextureLoader();
  const maxAniso = renderer.capabilities.getMaxAnisotropy();
  const tex = (url, setup) => {
    const t = loader.load(url, () => loaded());
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = maxAniso;
    setup?.(t);
    return t;
  };
  let pending = 3;
  const loaded = () => { if (--pending === 0) { el.classList.add('ready'); onReady?.(); start(); } };

  const stoneTop = tex('assets/img/tex-stone.jpg');
  // side faces are 1 m × 0.22 m — sample a matching strip so the grain isn't stretched
  const stoneSide = tex('assets/img/tex-stone.jpg', t => { t.repeat.set(1, TOP_H / W); t.offset.set(0, 0.4); });
  const wood = tex('assets/img/tex-wood.jpg');

  const stoneMat = map => new THREE.MeshPhysicalMaterial({
    map, bumpMap: map, bumpScale: 0.6, roughness: 0.55, clearcoat: 0.2, clearcoatRoughness: 0.45, envMapIntensity: 0.4,
  });
  const sideMat = stoneMat(stoneSide), faceMat = stoneMat(stoneTop);
  const topMats = [sideMat, sideMat, faceMat, faceMat, sideMat, sideMat];   // +x −x +y −y +z −z
  // the walnut crop is quite dark; a little self-light keeps the grain readable in shadow
  const woodMat = new THREE.MeshPhysicalMaterial({
    map: wood, roughness: 0.36, clearcoat: 0.55, clearcoatRoughness: 0.22, envMapIntensity: 0.7,
    emissive: '#ffffff', emissiveMap: wood, emissiveIntensity: 0.35,
  });
  const woodCap = new THREE.MeshStandardMaterial({ color: '#2a1a12', roughness: 0.6 });
  const baseMats = [woodMat, woodMat, woodCap, woodCap, woodMat, woodMat];

  // ── geometry ──
  const table = new THREE.Group();
  const top = new THREE.Mesh(new RoundedBoxGeometry(W, TOP_H, W, 4, 0.006), topMats);
  top.position.y = H - TOP_H / 2;
  const gap = new THREE.Mesh(new THREE.BoxGeometry(BASE_W - 0.05, GAP_H, BASE_W - 0.05), new THREE.MeshStandardMaterial({ color: '#0b0807', roughness: 1 }));
  gap.position.y = BASE_H + GAP_H / 2;
  const base = new THREE.Mesh(new RoundedBoxGeometry(BASE_W, BASE_H, BASE_W, 2, 0.004), baseMats);
  base.position.y = BASE_H / 2;
  [top, gap, base].forEach(m => { m.castShadow = m.receiveShadow = true; table.add(m); });
  scene.add(table);

  // ── finish switching with a soft colour fade ──
  const topTarget = new THREE.Color(FINISHES.top.Travertine);
  const baseTarget = new THREE.Color(FINISHES.base.Walnut);
  const api = {
    setTop: name => topTarget.set(FINISHES.top[name] || '#ffffff'),
    setBase: name => baseTarget.set(FINISHES.base[name] || '#ffffff'),
    dispose,
  };

  // ── sizing, visibility, loop ──
  const resize = () => {
    const { clientWidth: w, clientHeight: h } = el;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = w / h < 1 ? 38 : 30;   // portrait screens need a wider lens
    camera.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(resize); ro.observe(el); resize();

  let visible = true, running = false, raf = 0, t0 = 0;
  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible && running) loop(); }, { threshold: 0 });
  io.observe(el);

  const hint = el.querySelector('.viewer-hint');
  renderer.domElement.addEventListener('pointerdown', () => { hint?.classList.add('gone'); controls.autoRotate = false; }, { once: true });

  function start() { running = true; t0 = performance.now(); loop(); }
  function loop() {
    cancelAnimationFrame(raf);
    if (!visible) return;
    raf = requestAnimationFrame(loop);
    // intro: glide the camera in
    const k = Math.min(1, (performance.now() - t0) / 1800);
    if (k < 1) {
      const e = 1 - Math.pow(1 - k, 3);
      camera.position.copy(camEnd).multiplyScalar(1.45 - 0.45 * e);
      camera.lookAt(controls.target);
    } else if (!controls.enabled) controls.enabled = true;
    faceMat.color.lerp(topTarget, 0.08); sideMat.color.copy(faceMat.color);
    woodMat.color.lerp(baseTarget, 0.08); woodMat.emissive.copy(woodMat.color);
    if (controls.enabled) controls.update();
    renderer.render(scene, camera);
  }

  function dispose() {
    running = false; cancelAnimationFrame(raf); ro.disconnect(); io.disconnect();
    controls.dispose(); renderer.dispose(); renderer.domElement.remove();
  }
  return api;
}

function radialTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(128, 128, 20, 128, 128, 128);
  grd.addColorStop(0, 'rgba(0,0,0,.65)'); grd.addColorStop(.45, 'rgba(0,0,0,.35)'); grd.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
}

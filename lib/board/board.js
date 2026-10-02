// Real-time 3D view of the nucula PCB (ported from the btc++ talk deck).
// Renders in three styles that can be blended continuously:
//   line  – flat paper fill + ink outlines (technical drawing)
//   solid – shaded, monochrome materials
//   xray  – translucent fills, glowing outlines (dark theme)
// and supports an exploded layer stack, component focus and callout labels.
// On the web page it sits fixed behind the content; scroll position picks the state.

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { STATES, STYLES, LAYERS, EXTRA_PARTS } from './states.js';

const DEG = Math.PI / 180;
const _bg = new THREE.Color(), _ink = new THREE.Color(), _tone = new THREE.Color(), _xray = new THREE.Color();
const _target = new THREE.Vector3(), _anchor = new THREE.Vector3(), _corner = new THREE.Vector3();
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const lerp = (a, b, t) => a + (b - a) * t;
const easeInOutQuart = (t) => (t < 0.5 ? 8 * t ** 4 : 1 - (-2 * t + 2) ** 4 / 2);

// World-space float copies of (possibly meshopt-quantised) geometry, for merging.
function bakeTriangles(geom, matrix) {
  const pos = geom.getAttribute('position'), idx = geom.getIndex();
  const n = idx ? idx.count : pos.count;
  const out = new Float32Array(n * 3), v = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    v.fromBufferAttribute(pos, idx ? idx.getX(i) : i).applyMatrix4(matrix);
    out[i * 3] = v.x; out[i * 3 + 1] = v.y; out[i * 3 + 2] = v.z;
  }
  return out;
}
function bakeLines(geom, matrix) {
  const pos = geom.getAttribute('position');
  const out = new Float32Array(pos.count * 3), v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).applyMatrix4(matrix);
    out[i * 3] = v.x; out[i * 3 + 1] = v.y; out[i * 3 + 2] = v.z;
  }
  return out;
}
function concat(chunks) {
  const out = new Float32Array(chunks.reduce((n, c) => n + c.length, 0));
  let o = 0;
  for (const c of chunks) { out.set(c, o); o += c.length; }
  return out;
}

const THEMES = {
  light: { bg: new THREE.Color('#f4f4f4'), ink: new THREE.Color('#101010') },
  dark: { bg: new THREE.Color('#101010'), ink: new THREE.Color('#f4f4f4') },
};

export class Board {
  // compact: narrow screens. The board sits centred and faint behind the text, without callouts.
  // still: prefers-reduced-motion. No idle drift, no spin, state changes cut instead of glide.
  constructor(canvas, labelLayer, { compact = false, still = false } = {}) {
    this.canvas = canvas;
    this.labelLayer = labelLayer;
    this.compact = compact;
    this.still = still;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.NeutralToneMapping;

    this.scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    const key = new THREE.DirectionalLight(0xffffff, 1.4);
    key.position.set(-60, 120, 80);
    this.scene.add(key, new THREE.AmbientLight(0xffffff, 0.25));

    this.camera = new THREE.PerspectiveCamera(26, 16 / 9, 1, 5000);
    this.root = new THREE.Group();
    this.scene.add(this.root);

    this.layers = {}; // name -> { group, fill, edges, base }
    this.parts = {}; // ref -> { group, fills[], edges[], box }
    this.theme = THEMES.light;
    this.themeMix = 0; // 0 light, 1 dark

    // Animated numeric state. Everything visual is derived from this each frame.
    this.cur = this.snapshot(STATES.hidden);
    this.from = null;
    this.to = null;
    this.t0 = 0;
    this.duration = 1;
    this.look = { az: 0, el: 0, taz: 0, tel: 0 };
    this.labels = [];
    this.ready = this.load();
    this.bindPointer();
  }

  dispose() {
    this.disposed = true;
    removeEventListener('pointermove', this.onPointer);
    this.renderer.dispose();
    this.scene.traverse((o) => {
      o.geometry?.dispose();
      o.material?.dispose();
    });
    this.labelLayer.replaceChildren();
  }

  async load() {
    const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
    const [layers, comps] = await Promise.all([
      loader.loadAsync('/models/layers.glb'),
      loader.loadAsync('/models/components.glb'),
    ]);
    if (this.disposed) return;

    // Scene units: millimetres, board centred at origin, +Y up (top side).
    const body = layers.scene.getObjectByName('body');
    const box = new THREE.Box3().setFromObject(body);
    const center = box.getCenter(new THREE.Vector3());
    this.root.scale.setScalar(1000);
    this.root.position.copy(center).multiplyScalar(-1000);
    this.size = box.getSize(new THREE.Vector3()).multiplyScalar(1000);

    // Nodes carry meshopt dequantisation transforms, so bake world matrices into the copies.
    layers.scene.updateWorldMatrix(true, true);
    for (const def of LAYERS) {
      const node = layers.scene.getObjectByName(def.name);
      if (!node) continue;
      const group = new THREE.Group();
      group.name = def.name;
      const entry = { group, def, fills: [], edges: [] };
      node.traverse((o) => {
        let obj;
        if (o.isLineSegments) {
          obj = new THREE.LineSegments(o.geometry, new THREE.LineBasicMaterial({ transparent: true, depthWrite: false }));
          entry.edges.push(obj);
        } else if (o.isMesh) {
          o.geometry.computeVertexNormals();
          const m = new THREE.MeshStandardMaterial({
            roughness: def.roughness ?? 0.7, metalness: def.metalness ?? 0,
            side: THREE.DoubleSide, transparent: true, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1,
          });
          obj = new THREE.Mesh(o.geometry, m);
          entry.fills.push(obj);
        }
        obj?.applyMatrix4(o.matrixWorld);
      });
      group.add(...entry.fills, ...entry.edges);
      this.root.add(group);
      this.layers[def.name] = entry;
    }

    // Components: one group per reference designator, recoloured to greys by luminance.
    const compRoot = new THREE.Group();
    compRoot.name = 'components';
    this.root.add(compRoot);
    this.compRoot = compRoot;
    // KiCad STEP models arrive as thousands of sub-meshes (one per face colour). Drawing them
    // individually meant >10k draw calls per frame, so each part is merged into one mesh per
    // grey tone plus a single outline mesh.
    const addPart = (ref, obj) => {
      const group = new THREE.Group();
      group.name = ref;
      const entry = { group, fills: [], edges: [] };
      const buckets = new Map(); // tone key -> { tone, metal, rough, chunks: Float32Array[] }
      const edgeChunks = [];
      obj.updateWorldMatrix(true, true);
      obj.traverse((o) => {
        if (!o.isMesh) return;
        const c = o.material.color ?? new THREE.Color(0.5, 0.5, 0.5);
        const lum = 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
        const tone = Math.round(THREE.MathUtils.clamp(Math.pow(lum, 0.6), 0.06, 0.92) * 20) / 20;
        const metal = Math.min(o.material.metalness ?? 0, 0.6) > 0.3;
        const key = `${tone}|${metal}`;
        if (!buckets.has(key)) buckets.set(key, { tone, metal, rough: o.material.roughness ?? 0.5, chunks: [] });
        buckets.get(key).chunks.push(bakeTriangles(o.geometry, o.matrixWorld));
        edgeChunks.push(bakeLines(new THREE.EdgesGeometry(o.geometry, 32), o.matrixWorld));
      });
      if (!buckets.size) return;
      for (const b of buckets.values()) {
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.BufferAttribute(concat(b.chunks), 3));
        g.computeVertexNormals();
        const m = new THREE.MeshStandardMaterial({
          roughness: b.rough, metalness: b.metal ? 0.6 : 0,
          transparent: true, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1,
        });
        m.userData.tone = b.tone;
        entry.fills.push(new THREE.Mesh(g, m));
      }
      const eg = new THREE.BufferGeometry();
      eg.setAttribute('position', new THREE.BufferAttribute(concat(edgeChunks), 3));
      entry.edges.push(new THREE.LineSegments(eg, new THREE.LineBasicMaterial({ transparent: true, depthWrite: false })));
      group.add(...entry.fills, ...entry.edges);
      compRoot.add(group);
      this.parts[ref] = entry;
    };
    comps.scene.updateWorldMatrix(true, true);
    for (const child of [...comps.scene.children[0]?.children ?? comps.scene.children]) {
      if (child.name) addPart(child.name, child);
    }

    // Parts without a redistributable 3D model get simple blocks (sizes in mm, board coords).
    for (const p of EXTRA_PARTS) {
      const g = new THREE.BoxGeometry(p.w / 1000, p.h / 1000, p.d / 1000);
      const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0x222222, transparent: true }));
      m.position.set(p.x / 1000, (1.6 + p.h / 2) / 1000, p.y / 1000);
      m.name = p.ref;
      addPart(p.ref, m);
      this.parts[p.ref].tone = p.tone;
    }

    this.scene.updateMatrixWorld(true);
    const inv = this.root.matrixWorld.clone().invert();
    for (const e of [...Object.values(this.layers), ...Object.values(this.parts)]) {
      e.localBox = new THREE.Box3().setFromObject(e.group, true).applyMatrix4(inv);
    }

    this.resize();
    // Warm up: compile shaders and upload every buffer now. Otherwise the first frame that shows
    // the board after a board-less slide blocks for seconds while ~70 MB of geometry uploads.
    await this.renderer.compileAsync(this.scene, this.camera);
    if (this.disposed) return;
    this.renderer.setViewport(0, 0, 1, 1);
    this.renderer.render(this.scene, this.camera);
    this.renderer.setViewport(0, 0, this.w, this.h);
    this.loaded = true;
  }

  // ---- state -------------------------------------------------------------

  // Resolve a preset (or object) into a flat, numeric, interpolatable state.
  snapshot(s) {
    const style = STYLES[s.style ?? 'line'];
    let cam = s.cam ?? {};
    if (this.compact) {
      // Phones: text runs full width, so the board shrinks into the lower part of the screen.
      cam = { ...cam, dist: (cam.dist ?? 190) * 1.45 };
      s = { ...s, frame: [0, 0.3], labels: [], layerLabels: false };
    }
    return {
      az: cam.az ?? -30, el: cam.el ?? 30, dist: cam.dist ?? 190, fov: cam.fov ?? 26,
      tx: cam.target?.[0] ?? 0, ty: cam.target?.[1] ?? 0, tz: cam.target?.[2] ?? 0,
      // Nudge right-hand framings a little further right: page text columns run wider than the deck's.
      ox: (s.frame?.[0] ?? 0) + (!this.compact && s.frame?.[0] > 0 ? 0.03 : 0), oy: s.frame?.[1] ?? 0,
      solid: style.solid, xray: style.xray, edge: style.edge,
      explode: s.explode ?? 0,
      vias: s.vias ?? 1,
      opacity: s.opacity ?? 1,
      spin: this.still ? 0 : s.spin ?? 0,
      lift: s.lift ?? 0, // board drop for enter/exit
      focus: s.focus ?? null,
      hide: s.hide ?? null,
      labels: s.labels ?? [],
      layerLabels: s.layerLabels ?? false,
      _focusMix: 0,
    };
  }

  set(name, { duration = 1700, instant = false } = {}) {
    if (this.still) instant = true;
    const def = typeof name === 'string' ? STATES[name] : name;
    if (!def) {
      console.warn('unknown board state', name);
      return;
    }
    this.stateName = typeof name === 'string' ? name : null;
    const to = this.snapshot(def);
    // shortest azimuth path
    const d = ((to.az - this.cur.az + 540) % 360) - 180;
    to.az = this.cur.az + d;
    this.from = { ...this.cur, _focus: this.cur.focus, _hide: this.cur.hide };
    this.to = to;
    this.t0 = performance.now();
    this.duration = instant ? 1 : duration;
    this.setLabels(to.labels, to.layerLabels, instant);
  }

  setTheme(name, instant = false) {
    this.themeTarget = name === 'dark' ? 1 : 0;
    if (instant || this.still) this.themeMix = this.themeTarget;
  }

  setCompact(compact) {
    this.compact = compact;
  }

  // ---- labels ------------------------------------------------------------

  // Callouts: a dot on the part, a leader that exits the board outline, and a label beside it.
  setLabels(labels, layerLabels, instant) {
    if (this.disposed) return;
    if (!this.svg) {
      this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      this.svg.classList.add('leaders');
      this.labelLayer.appendChild(this.svg);
    }
    for (const l of this.labels) {
      for (const n of [l.el, l.path, l.dot]) n.classList.remove('on');
      setTimeout(() => [l.el, l.path, l.dot].forEach((n) => n.remove()), 600);
    }
    this.labels = [];
    const NS = 'http://www.w3.org/2000/svg';
    const make = (text, sub, anchor, side, idx) => {
      const delay = `${(instant ? 0 : 1000) + idx * 110}ms`;
      const el = document.createElement('div');
      el.className = `callout ${side}`;
      el.innerHTML = `<b>${text}</b>${sub ? `<i>${sub}</i>` : ''}`;
      const path = document.createElementNS(NS, 'path');
      path.setAttribute('pathLength', '1');
      const dot = document.createElementNS(NS, 'circle');
      for (const n of [el, path, dot]) n.style.setProperty('--d', delay);
      this.svg.append(path, dot);
      this.labelLayer.appendChild(el);
      requestAnimationFrame(() => requestAnimationFrame(() => [el, path, dot].forEach((n) => n.classList.add('on'))));
      this.labels.push({ el, path, dot, anchor, side });
    };
    labels.forEach((l, i) => make(l.text, l.sub, { ref: l.ref, at: l.at }, l.side ?? 'right', i));
    if (layerLabels) {
      LAYERS.filter((d) => d.label).forEach((d, i) => make(d.label, d.sub, { layer: d.name }, 'right', i));
    }
  }

  // World position for a callout anchor. Boxes are in root-local metres, measured unexploded.
  anchorPoint(a) {
    const v = _anchor;
    const entry = (a.ref && this.parts[a.ref]) || (a.layer && this.layers[a.layer]);
    if (entry) {
      const b = entry.localBox;
      const body = this.layers.body.localBox;
      if (a.layer) v.set(body.max.x, (b.min.y + b.max.y) / 2, lerp(body.min.z, body.max.z, 0.3)); // right edge of the layer
      else v.set((b.min.x + b.max.x) / 2, b.max.y, (b.min.z + b.max.z) / 2);
      v.y += entry.group.position.y;
      return this.root.localToWorld(v);
    }
    if (a.at) return v.set(...a.at);
    return v;
  }

  // ---- loop --------------------------------------------------------------

  resize() {
    const r = this.canvas.getBoundingClientRect();
    if (!r.width) return;
    this.renderer.setSize(r.width, r.height, false);
    this.camera.aspect = r.width / r.height;
    this.w = r.width;
    this.h = r.height;
    // Callout text scales with the viewport like the deck's 1920 px stage, within reason.
    this.labelLayer.style.setProperty('--s', Math.min(1.1, Math.max(0.78, r.width / 1920)));
  }

  tick(now) {
    if (!this.loaded || this.disposed) return;
    const dt = Math.min(0.05, (now - (this.last ?? now)) / 1000);
    this.last = now;

    // Interpolate state.
    if (this.to) {
      const t = clamp01((now - this.t0) / this.duration);
      const e = easeInOutQuart(t);
      for (const k of Object.keys(this.to)) {
        if (typeof this.to[k] === 'number' && !k.startsWith('_')) this.cur[k] = lerp(this.from[k], this.to[k], e);
      }
      // Focus/hide sets cross-fade: fade out old set during first half, new set during second.
      this.cur.focus = this.to.focus;
      this.cur.hide = this.to.hide;
      this.cur._fromFocus = this.from._focus;
      this.cur._fromHide = this.from._hide;
      this.cur._mix = e;
      this.cur.labels = this.to.labels;
      if (t >= 1) {
        this.cur._fromFocus = this.to.focus;
        this.cur._fromHide = this.to.hide;
        this.to = null;
      }
    }
    this.themeMix += ((this.themeTarget ?? 0) - this.themeMix) * (1 - Math.exp(-dt * 5));

    const s = this.cur;
    // Nothing on screen and nothing moving: clear once, then skip the frame.
    if (s.opacity < 0.002 && !this.to && !this.labels.length) {
      if (!this.idle) this.renderer.clear();
      this.idle = true;
      return;
    }
    this.idle = false;
    // The board leans gently toward the mouse.
    const k = 1 - Math.exp(-dt * 2.4);
    this.look.az += (this.look.taz - this.look.az) * k;
    this.look.el += (this.look.tel - this.look.el) * k;
    this.spinAngle = (this.spinAngle ?? 0) + dt * s.spin * 6;
    const drift = this.still ? 0 : Math.sin(now / 1000 * 0.21) * 2.2 + Math.sin(now / 1000 * 0.13) * 1.2;

    const az = (s.az + drift + this.spinAngle + this.look.az) * DEG;
    const el = THREE.MathUtils.clamp(s.el + this.look.el, -89, 89.9) * DEG;
    const target = _target.set(s.tx, s.ty, s.tz);
    // Presets are framed for a 16:9 stage. On narrower desktop windows back the camera off so the
    // board keeps the same share of the width and stays clear of the text column.
    const dist = s.dist * (this.compact ? 1 : Math.max(1, 16 / 9 / (this.w / this.h)));
    this.camera.position.set(
      target.x + dist * Math.cos(el) * Math.sin(az),
      target.y + dist * Math.sin(el),
      target.z + dist * Math.cos(el) * Math.cos(az),
    );
    this.camera.up.set(0, 1, 0);
    if (el > 89 * DEG) this.camera.up.set(-Math.sin(az), 0, -Math.cos(az));
    this.camera.lookAt(target);
    this.camera.fov = s.fov;
    // Shift the framed centre in screen space (fractions of the viewport).
    this.camera.setViewOffset(this.w, this.h, -s.ox * this.w, -s.oy * this.h, this.w, this.h);
    this.camera.updateProjectionMatrix();

    this.applyLook(s);
    this.renderer.render(this.scene, this.camera);
    this.placeLabels();
  }

  applyLook(s) {
    // Runs every frame while anything animates, so it must not allocate (GC pauses = stutter).
    const bg = _bg.copy(THEMES.light.bg).lerp(THEMES.dark.bg, this.themeMix);
    const ink = _ink.copy(THEMES.light.ink).lerp(THEMES.dark.ink, this.themeMix);
    const vis = s.opacity;
    const gap = 7 / 1000; // metres between exploded layers
    const mix = s._mix ?? 1;
    // Weight of "is focused / hidden" crossfading between the previous and next set.
    const weight = (name, from, to) => lerp(from?.includes(name) ? 1 : 0, to?.includes(name) ? 1 : 0, mix);
    const anyFocus = lerp(s._fromFocus ? 1 : 0, s.focus ? 1 : 0, mix);

    const paintFill = (m, tone, alpha, dim) => {
      _tone.setRGB(tone, tone, tone, THREE.SRGBColorSpace);
      m.color.copy(bg).lerp(_tone, s.solid).multiplyScalar(1 - s.xray);
      _xray.copy(ink).multiplyScalar(0.05 + 0.08 * tone);
      m.emissive.copy(bg).multiplyScalar(1 - s.solid).lerp(_xray, s.xray);
      m.envMapIntensity = s.solid;
      const o = alpha * vis * lerp(1, 0.18, s.xray) * lerp(dim, 1, 0.5 * (1 - s.solid) * (1 - s.xray));
      m.opacity = o;
      m.depthWrite = o > 0.6;
      // Never toggle .visible: meshes that skip drawing let their GPU buffers go cold and
      // re-upload when revealed, which stalls for dozens of frames. Opacity 0 is cheap enough.
    };
    const paintEdge = (m, alpha, dim, extra) => {
      m.color.copy(ink);
      const o = s.edge * extra * alpha * vis * lerp(0.05, 1, dim) * lerp(1, 1.3, s.xray);
      m.opacity = Math.min(1, o);
    };
    const dimOf = (focusW) => lerp(1, lerp(0.12, 1, focusW), anyFocus);

    for (const name in this.layers) {
      const L = this.layers[name];
      const d = L.def;
      L.group.position.y = d.stack * gap * s.explode;
      let alpha = d.alpha ?? 1;
      if (name === 'vias') alpha *= s.vias * (1 - s.explode);
      if (d.hideWhenFlat) alpha *= clamp01(s.explode * 3);
      alpha *= 1 - weight(name, s._fromHide, s.hide);
      const dim = dimOf(weight(name, s._fromFocus, s.focus));
      for (const f of L.fills) paintFill(f.material, d.tone, alpha, dim);
      for (const e of L.edges) paintEdge(e.material, alpha, dim, d.edge ?? 1);
    }
    const lift = 8.5 * gap * s.explode;
    const hidden = weight('components', s._fromHide, s.hide);
    for (const ref in this.parts) {
      const P = this.parts[ref];
      P.group.position.y = lift;
      const alpha = (1 - weight(ref, s._fromHide, s.hide)) * (1 - hidden);
      const dim = dimOf(weight(ref, s._fromFocus, s.focus));
      for (const f of P.fills) paintFill(f.material, P.tone ?? f.material.userData.tone, alpha, dim);
      for (const e of P.edges) paintEdge(e.material, alpha, dim, 1);
    }
    this.scene.position.y = -s.lift;
  }

  toScreen(v) { // projects v in place
    const p = v.project(this.camera);
    return [(p.x * 0.5 + 0.5) * this.w, (-p.y * 0.5 + 0.5) * this.h];
  }

  // Screen-space bounds of the (possibly exploded) board.
  screenBounds() {
    let x0 = Infinity, x1 = -Infinity;
    const v = _corner;
    for (const L of Object.values(this.layers)) {
      const b = L.localBox;
      for (let i = 0; i < 8; i++) {
        v.set(i & 1 ? b.max.x : b.min.x, (i & 2 ? b.max.y : b.min.y) + L.group.position.y, i & 4 ? b.max.z : b.min.z);
        const [x] = this.toScreen(this.root.localToWorld(v));
        x0 = Math.min(x0, x);
        x1 = Math.max(x1, x);
      }
    }
    return [x0, x1];
  }

  placeLabels() {
    if (!this.labels.length) return;
    this.svg.setAttribute('viewBox', `0 0 ${this.w} ${this.h}`);
    const s = this.w / 1920;
    const [bx0, bx1] = this.screenBounds();
    const gap = 58 * s;
    for (const side of ['left', 'right']) {
      const group = this.labels.filter((l) => l.side === side);
      for (const l of group) [l.ax, l.ay] = this.toScreen(this.anchorPoint(l.anchor));
      group.sort((a, b) => a.ay - b.ay);
      // Spread labels vertically so they never overlap, keeping them near their anchors.
      let prev = -Infinity;
      for (const l of group) prev = l.ly = Math.max(l.ay, prev + gap);
      const overflow = prev - (this.h - 60 * s);
      if (overflow > 0) for (const l of group) l.ly -= overflow;
      for (const l of group) {
        let ex = side === 'right' ? Math.max(bx1, l.ax) + 48 * s : Math.min(bx0, l.ax) - 48 * s;
        ex = side === 'right' ? Math.min(ex, this.w - 320 * s) : Math.max(ex, 320 * s);
        const kx = ex + (side === 'right' ? -28 : 28) * s;
        l.path.setAttribute('d', `M${l.ax},${l.ay} L${kx},${l.ly} L${ex},${l.ly}`);
        l.dot.setAttribute('cx', l.ax);
        l.dot.setAttribute('cy', l.ay);
        l.dot.setAttribute('r', 4.5 * s);
        const tx = side === 'right' ? ex + 10 * s : ex - 10 * s;
        l.el.style.transform = `translate(${tx}px, ${l.ly}px) translate(${side === 'right' ? 0 : -100}%, -0.65em)`;
      }
    }
  }

  bindPointer() {
    this.onPointer = (e) => {
      if (e.pointerType !== 'mouse' || this.still) return;
      this.look.taz = (e.clientX / innerWidth - 0.5) * -10;
      this.look.tel = (e.clientY / innerHeight - 0.5) * 6;
    };
    addEventListener('pointermove', this.onPointer, { passive: true });
  }
}

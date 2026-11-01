/* Access+ 3D assistive robotic arm (Three.js r128).
   A tabletop scene: the arm sits at the back of a table and reaches across a
   half-circle in two dimensions (turn left/right, reach in/out) plus height.
   Joints: base turn, shoulder, elbow, wrist pitch, wrist roll, two-finger gripper.
   Modes: Navigate (grasp a tile to open a page) and Pick things up (cup, phone,
   pill bottle, elevator button), with a Confirm step before moving near the user's
   face, a Stop button, and Manual control one axis at a time (like JACO users). */
(function () {
  'use strict';
  window.initArm3D = function (opts) {
    var THREE = window.THREE;
    var host = opts.host, ui = opts.ui;
    var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ---------- renderer, scene, camera ----------
    var renderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); } catch (e) { return null; }
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    host.appendChild(renderer.domElement);
    var bigLabel = document.createElement('div'); bigLabel.className = 'arm3d-label'; bigLabel.setAttribute('aria-hidden', 'true');
    bigLabel.innerHTML = '<b></b><span></span>'; host.appendChild(bigLabel);
    function showLabel(title, sub) {
      bigLabel.querySelector('b').textContent = title || ''; bigLabel.querySelector('span').textContent = sub || '';
      bigLabel.classList.remove('pop'); void bigLabel.offsetWidth; bigLabel.classList.add('pop');
      bigLabel.style.opacity = title ? '1' : '0';
    }
    renderer.domElement.setAttribute('aria-hidden', 'true');

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(38, 1.6, 0.1, 100);
    var CAM = { pos: new THREE.Vector3(0.1, 3.7, 5.3), look: new THREE.Vector3(-0.45, 0.55, -0.3) };
    camera.position.copy(CAM.pos); camera.lookAt(CAM.look);

    scene.add(new THREE.HemisphereLight(0xbcd6f0, 0x05080f, 0.9));
    var key = new THREE.DirectionalLight(0xffffff, 1.1);
    key.position.set(2.5, 6, 3.5); key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    var sc = key.shadow.camera; sc.left = -4; sc.right = 4; sc.top = 4; sc.bottom = -4; sc.near = 1; sc.far = 16;
    key.shadow.radius = 4;
    scene.add(key);
    var rim = new THREE.DirectionalLight(0x5fe0a8, 0.25); rim.position.set(-4, 3, -3); scene.add(rim);

    // ---------- table ----------
    var GREEN = 0x5fe0a8;
    var TR = 3.1;
    var table = new THREE.Mesh(new THREE.CircleGeometry(TR, 64, 0, Math.PI),
      new THREE.MeshStandardMaterial({ color: 0x0c1524, roughness: 0.95, metalness: 0.0, side: THREE.DoubleSide }));
    table.rotation.x = Math.PI / 2; table.position.set(0, 0, -1.7);
    table.receiveShadow = true; scene.add(table);
    var lines = [], k, a;
    for (k = 1; k <= 5; k++) { var rr = TR * k / 5; for (a = 0; a < 48; a++) { var t1 = Math.PI * a / 48, t2 = Math.PI * (a + 1) / 48; lines.push(Math.cos(t1) * rr, 0, Math.sin(t1) * rr, Math.cos(t2) * rr, 0, Math.sin(t2) * rr); } }
    for (a = 0; a <= 12; a++) { var th = Math.PI * a / 12; lines.push(0, 0, 0, Math.cos(th) * TR, 0, Math.sin(th) * TR); }
    lines.push(-TR, 0, 0, TR, 0, 0);
    var lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(lines, 3));
    var gridL = new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: 0x2b5a50, transparent: true, opacity: 0.55 }));
    gridL.position.set(0, 0.004, -1.7); scene.add(gridL);
    var edgePts = []; for (a = 0; a <= 96; a++) { var te = Math.PI * a / 96; edgePts.push(new THREE.Vector3(Math.cos(te) * TR, 0, Math.sin(te) * TR)); }
    var edge = new THREE.Line(new THREE.BufferGeometry().setFromPoints(edgePts), new THREE.LineBasicMaterial({ color: GREEN, transparent: true, opacity: 0.8 }));
    edge.position.set(0, 0.006, -1.7); scene.add(edge);
    var env = new THREE.Mesh(new THREE.RingGeometry(0.9, 2.9, 64, 1, 0, Math.PI),
      new THREE.MeshBasicMaterial({ color: GREEN, transparent: true, opacity: 0.045, side: THREE.DoubleSide }));
    env.rotation.x = Math.PI / 2; env.position.set(0, 0.005, -1.7); scene.add(env);

    // ---------- arm ----------
    var BASE = new THREE.Vector3(0, 0, -1.7), SH_H = 0.62, L1 = 1.55, L2 = 1.45, LT = 0.42;
    var metal = new THREE.MeshStandardMaterial({ color: 0xc9d3de, metalness: 0.55, roughness: 0.35 });
    var dark = new THREE.MeshStandardMaterial({ color: 0x1c2636, metalness: 0.4, roughness: 0.5 });
    var accent = new THREE.MeshStandardMaterial({ color: GREEN, emissive: GREEN, emissiveIntensity: 0.6, roughness: 0.4 });
    function mesh(geo, mat) { var m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true; return m; }

    var base = new THREE.Group(); base.position.copy(BASE); scene.add(base);
    var pedestal = mesh(new THREE.CylinderGeometry(0.42, 0.5, 0.18, 40), dark); pedestal.position.y = 0.09; base.add(pedestal);
    var yawG = new THREE.Group(); base.add(yawG);
    var turret = mesh(new THREE.CylinderGeometry(0.3, 0.34, 0.44, 36), metal); turret.position.y = 0.4; yawG.add(turret);
    var ring1 = mesh(new THREE.TorusGeometry(0.31, 0.02, 8, 40), accent); ring1.rotation.x = Math.PI / 2; ring1.position.y = 0.2; yawG.add(ring1);
    var shoulder = new THREE.Group(); shoulder.position.y = SH_H; yawG.add(shoulder);
    var shJoint = mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.42, 32), dark); shJoint.rotation.z = Math.PI / 2; shoulder.add(shJoint);
    var upperG = new THREE.Group(); shoulder.add(upperG);
    var upper = mesh(new THREE.CylinderGeometry(0.13, 0.16, L1, 28), metal); upper.position.y = L1 / 2; upperG.add(upper);
    var stripe1 = mesh(new THREE.BoxGeometry(0.03, L1 * 0.7, 0.03), accent); stripe1.position.set(0, L1 / 2, 0.15); upperG.add(stripe1);
    var elbowG = new THREE.Group(); elbowG.position.y = L1; upperG.add(elbowG);
    var elJoint = mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.34, 28), dark); elJoint.rotation.z = Math.PI / 2; elbowG.add(elJoint);
    var foreG = new THREE.Group(); elbowG.add(foreG);
    var fore = mesh(new THREE.CylinderGeometry(0.1, 0.12, L2, 26), metal); fore.position.y = L2 / 2; foreG.add(fore);
    var wristG = new THREE.Group(); wristG.position.y = L2; foreG.add(wristG);
    var wrJoint = mesh(new THREE.SphereGeometry(0.12, 24, 16), dark); wristG.add(wrJoint);
    var rollG = new THREE.Group(); wristG.add(rollG);
    var hand = mesh(new THREE.CylinderGeometry(0.1, 0.09, 0.18, 24), metal); hand.position.y = 0.12; rollG.add(hand);
    var led = mesh(new THREE.TorusGeometry(0.1, 0.012, 8, 32), accent); led.rotation.x = Math.PI / 2; led.position.y = 0.06; rollG.add(led);
    var palm = mesh(new THREE.BoxGeometry(0.34, 0.06, 0.12), dark); palm.position.y = 0.23; rollG.add(palm);
    function finger() { var g = new THREE.Group(); var f = mesh(new THREE.BoxGeometry(0.04, 0.22, 0.09), metal); f.position.y = 0.11; g.add(f); var tip = mesh(new THREE.BoxGeometry(0.06, 0.05, 0.09), dark); tip.position.set(0, 0.22, 0); g.add(tip); return g; }
    var fL = finger(), fR = finger(); fL.position.y = fR.position.y = 0.25; rollG.add(fL); rollG.add(fR);
    var tipMarker = new THREE.Object3D(); tipMarker.position.y = LT; rollG.add(tipMarker);

    // ---------- the user (abstract head) ----------
    var USER = new THREE.Group(); USER.position.set(-2.15, 0, 0.45); scene.add(USER);
    var userMat = new THREE.MeshStandardMaterial({ color: 0x8fa3b8, transparent: true, opacity: 0.22, roughness: 0.8 });
    var wire = new THREE.MeshBasicMaterial({ color: 0x8fa3b8, wireframe: true, transparent: true, opacity: 0.35 });
    var torso = mesh(new THREE.CylinderGeometry(0.42, 0.55, 0.9, 24, 1, true), userMat); torso.position.y = 0.45; USER.add(torso);
    var neck = mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.2, 16), userMat); neck.position.y = 1.0; USER.add(neck);
    var head = new THREE.Mesh(new THREE.SphereGeometry(0.34, 24, 18), userMat); head.scale.set(0.92, 1.12, 1); head.position.y = 1.38; USER.add(head);
    var headW = new THREE.Mesh(new THREE.SphereGeometry(0.345, 14, 10), wire); headW.scale.copy(head.scale); headW.position.copy(head.position); USER.add(headW);
    USER.rotation.y = Math.PI / 2 - 0.35; // faces the arm
    var mouth = new THREE.Object3D(); mouth.position.set(0, 1.27, 0.33); USER.add(mouth);
    var ear = new THREE.Object3D(); ear.position.set(0.33, 1.4, 0.02); USER.add(ear);
    var mRing = new THREE.Mesh(new THREE.RingGeometry(0.05, 0.07, 32), new THREE.MeshBasicMaterial({ color: GREEN, side: THREE.DoubleSide, transparent: true, opacity: 0.8 }));
    mRing.position.copy(mouth.position); mRing.position.z += 0.02; USER.add(mRing);
    var label = makeLabel('USER', 0x8fa3b8, 0.5); label.position.set(0, 1.95, 0); USER.add(label);
    var tray = mesh(new THREE.BoxGeometry(0.7, 0.05, 0.45), new THREE.MeshStandardMaterial({ color: 0x1d2a3c, roughness: 0.7 }));
    tray.position.set(-1.25, 0.025, 1.05); scene.add(tray);
    var trayRim = new THREE.LineSegments(new THREE.EdgesGeometry(tray.geometry), new THREE.LineBasicMaterial({ color: 0x3b5476 }));
    trayRim.position.copy(tray.position); scene.add(trayRim);
    var trayLabel = makeLabel('TRAY', 0x6f86a0, 0.32); trayLabel.position.set(-1.25, 0.25, 1.05); scene.add(trayLabel);

    function makeLabel(text, color, w) {
      var c = document.createElement('canvas'); c.width = 256; c.height = 64; var x = c.getContext('2d');
      x.font = '600 34px IBM Plex Mono, monospace'; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.fillStyle = '#' + color.toString(16).padStart(6, '0'); x.fillText(text, 128, 34);
      var t = new THREE.CanvasTexture(c);
      var s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false })); s.scale.set(w, w / 4, 1); return s;
    }
    function polar(deg, r, y) { var a = deg * Math.PI / 180; return new THREE.Vector3(BASE.x + Math.sin(a) * r, y || 0, BASE.z + Math.cos(a) * r); }

    // ---------- objects ----------
    var glass = new THREE.MeshStandardMaterial({ color: 0xcfe8ff, transparent: true, opacity: 0.35, roughness: 0.1, metalness: 0.1 });
    function makeCup() {
      var g = new THREE.Group();
      var body = mesh(new THREE.CylinderGeometry(0.13, 0.11, 0.32, 28, 1, true), glass); body.position.y = 0.16; g.add(body);
      var bottom = mesh(new THREE.CircleGeometry(0.11, 24), glass); bottom.rotation.x = -Math.PI / 2; bottom.position.y = 0.005; g.add(bottom);
      var water = mesh(new THREE.CylinderGeometry(0.115, 0.105, 0.2, 24), new THREE.MeshStandardMaterial({ color: GREEN, transparent: true, opacity: 0.45 }));
      water.position.y = 0.11; g.add(water); g.userData.water = water;
      var straw = mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.46, 8), new THREE.MeshStandardMaterial({ color: 0xf0f5fa }));
      straw.position.set(0, 0.33, -0.04); straw.rotation.x = -0.3; g.add(straw); g.userData.straw = straw;
      g.userData.h = 0.32; return g;
    }
    function makePhone() {
      var g = new THREE.Group();
      var body = mesh(new THREE.BoxGeometry(0.18, 0.36, 0.03), dark); body.position.y = 0.18; g.add(body);
      var screen = mesh(new THREE.PlaneGeometry(0.15, 0.3), new THREE.MeshBasicMaterial({ color: 0x1e3a52 })); screen.position.set(0, 0.19, 0.016); g.add(screen);
      g.userData.h = 0.36; return g;
    }
    function makePill() {
      var g = new THREE.Group();
      var body = mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.2, 20), new THREE.MeshStandardMaterial({ color: 0xffb347, transparent: true, opacity: 0.8, roughness: 0.3 })); body.position.y = 0.1; g.add(body);
      var cap = mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.06, 20), new THREE.MeshStandardMaterial({ color: 0xf0f5fa })); cap.position.y = 0.23; g.add(cap);
      g.userData.h = 0.26; return g;
    }
    function makeButton() {
      var g = new THREE.Group();
      var post = mesh(new THREE.BoxGeometry(0.34, 0.62, 0.1), dark); post.position.y = 0.31; g.add(post);
      var lamp = mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.04, 24), new THREE.MeshStandardMaterial({ color: 0x3b5476, emissive: 0x000000 }));
      lamp.rotation.x = Math.PI / 2; lamp.position.set(0, 0.42, 0.07); g.add(lamp); g.userData.lamp = lamp;
      var arrow = makeLabel('▲', 0xa9e4c4, 0.2); arrow.position.set(0, 0.24, 0.08); g.add(arrow);
      g.userData.h = 0.62; return g;
    }
    function makeBlock() {
      var g = new THREE.Group();
      var b = mesh(new THREE.BoxGeometry(0.2, 0.2, 0.2), new THREE.MeshStandardMaterial({ color: GREEN, emissive: GREEN, emissiveIntensity: 0.25, roughness: 0.5 }));
      b.position.y = 0.1; g.add(b); g.userData.h = 0.2; return g;
    }
    var BLOCK = { key: 'block', name: 'Green block', g: makeBlock(), at: new THREE.Vector3() };
    BLOCK.g.visible = false; scene.add(BLOCK.g);
    BLOCK.halo = new THREE.Mesh(new THREE.RingGeometry(0.2, 0.24, 40), new THREE.MeshBasicMaterial({ color: GREEN, transparent: true, opacity: 0, side: THREE.DoubleSide }));
    BLOCK.halo.rotation.x = -Math.PI / 2; scene.add(BLOCK.halo);
    var test = null;
    var OBJ = [
      { key: 'cup', name: 'Cup of water', at: polar(-38, 1.85), make: makeCup, deliver: 'mouth', done: 'Cup at the mouth: drinking through the straw' },
      { key: 'phone', name: 'Phone', at: polar(4, 2.55), make: makePhone, deliver: 'ear', done: 'Phone held at the ear for a hands-free call' },
      { key: 'pill', name: 'Pill bottle', at: polar(30, 1.35), make: makePill, deliver: 'tray', done: 'Pill bottle placed in the tray' },
      { key: 'button', name: 'Elevator call button', at: polar(58, 2.25), make: makeButton, deliver: 'press', done: 'Button pressed' }
    ];
    OBJ.forEach(function (o) {
      o.g = o.make(); o.g.position.copy(o.at); o.home = o.at.clone();
      o.g.rotation.y = Math.atan2(BASE.x - o.at.x, BASE.z - o.at.z) + Math.PI; scene.add(o.g);
      o.halo = new THREE.Mesh(new THREE.RingGeometry(0.2, 0.24, 40), new THREE.MeshBasicMaterial({ color: GREEN, transparent: true, opacity: 0, side: THREE.DoubleSide }));
      o.halo.rotation.x = -Math.PI / 2; o.halo.position.set(o.at.x, 0.006, o.at.z); scene.add(o.halo);
    });

    // ---------- navigation tiles ----------
    var DEST = opts.dests;
    var TILES = DEST.map(function (d, i) {
      var n = DEST.length, deg = -64 + (128 / (n - 1)) * i, r = (i % 2) ? 2.45 : 1.85;
      var c = document.createElement('canvas'); c.width = 512; c.height = 256; var x = c.getContext('2d');
      x.fillStyle = '#0f1828'; x.fillRect(0, 0, 512, 256); x.strokeStyle = '#3b5476'; x.lineWidth = 8; x.strokeRect(4, 4, 504, 248);
      x.fillStyle = '#e6edf5'; x.font = '700 68px IBM Plex Sans, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
      var words = d.short.split('\n'); words.forEach(function (w, k) { x.fillText(w, 256, 128 + (k - (words.length - 1) / 2) * 66); });
      var tex = new THREE.CanvasTexture(c); tex.anisotropy = 4;
      var top = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7 }), side = new THREE.MeshStandardMaterial({ color: 0x1c2636 });
      var tile = mesh(new THREE.BoxGeometry(0.86, 0.06, 0.43), [side, side, top, side, side, side]);
      var at = polar(deg, r, 0.03); tile.position.copy(at);
      tile.rotation.y = Math.atan2(at.x - BASE.x, at.z - BASE.z) * 0.35;
      scene.add(tile);
      var halo = new THREE.Mesh(new THREE.RingGeometry(0.44, 0.48, 48), new THREE.MeshBasicMaterial({ color: GREEN, transparent: true, opacity: 0, side: THREE.DoubleSide }));
      halo.rotation.x = -Math.PI / 2; halo.scale.set(1, 0.62, 1); halo.position.set(at.x, 0.006, at.z); scene.add(halo);
      return { d: d, mesh: tile, at: at.clone(), home: at.clone(), halo: halo, h: 0.06 };
    });

    // ---------- kinematics ----------
    // state: tool tip target P (world), tool pitch phi (0 = up, PI/2 = horizontal, PI = down), wrist roll, grip (0 open .. 1 closed)
    var cur = { p: polar(0, 1.6, 1.6), phi: Math.PI * 0.62, roll: 0, grip: 0 };
    var goal = { p: cur.p.clone(), phi: cur.phi, roll: 0, grip: 0 };
    var joints = { yaw: 0, a1: 0, a2: 0, a3: 0 };
    function solve(p, phi) {
      var dx = p.x - BASE.x, dz = p.z - BASE.z, yaw = Math.atan2(dx, dz);
      var r = Math.hypot(dx, dz), h = p.y - SH_H;
      var wr = r - LT * Math.sin(phi), wh = h - LT * Math.cos(phi);
      var d = Math.hypot(wr, wh), maxd = L1 + L2 - 0.02; if (d > maxd) { wr *= maxd / d; wh *= maxd / d; d = maxd; }
      if (d < 0.35) d = 0.35;
      var beta = Math.atan2(wr, wh);
      var g = Math.acos(Math.max(-1, Math.min(1, (L1 * L1 + d * d - L2 * L2) / (2 * L1 * d))));
      var e = Math.acos(Math.max(-1, Math.min(1, (L1 * L1 + L2 * L2 - d * d) / (2 * L1 * L2))));
      var a1 = beta - g, a2 = Math.PI - e, a3 = phi - a1 - a2;
      return { yaw: yaw, a1: a1, a2: a2, a3: a3 };
    }
    function apply() {
      var j = solve(cur.p, cur.phi); joints = j;
      yawG.rotation.y = j.yaw; upperG.rotation.x = j.a1; foreG.rotation.x = j.a2; wristG.rotation.x = j.a3; rollG.rotation.y = cur.roll;
      var spread = 0.13 - 0.085 * cur.grip; fL.position.x = -spread; fR.position.x = spread;
    }
    function tipWorld() { var v = new THREE.Vector3(); tipMarker.getWorldPosition(v); return v; }

    // ---------- motion planner ----------
    var queue = [], moving = false, stopped = false, slowNearFace = false, onStep = null;
    function to(p, phi, o) { queue.push({ p: p.clone(), phi: phi, roll: (o && o.roll != null) ? o.roll : null, grip: (o && o.grip != null) ? o.grip : null, speed: (o && o.speed) || 1.6, then: o && o.then, wait: o && o.wait }); }
    function run(cb) { onStep = cb || null; moving = true; stopped = false; }
    function clearQueue() { queue = []; moving = false; }

    var held = null, heldOffset = 0, tiltCup = 0;
    function step(dt) {
      if (!moving || stopped) return;
      var s = queue[0]; if (!s) { moving = false; if (onStep) { var f = onStep; onStep = null; f(); } return; }
      if (s.wait) { s.wait -= dt * 1000 * (window.__armSpeed || 1); if (s.wait <= 0) { queue.shift(); if (s.then) s.then(); } return; }
      var v = (slowNearFace ? 0.45 : 1) * s.speed * (reduce ? 1.4 : 1) * (window.__armSpeed || 1);
      var d = s.p.clone().sub(cur.p), dist = d.length();
      var dphi = s.phi - cur.phi, done = true;
      if (dist > 0.004) { done = false; var stepLen = Math.min(dist, v * dt * Math.max(0.35, Math.min(1, dist / 0.35))); cur.p.add(d.multiplyScalar(stepLen / dist)); }
      if (Math.abs(dphi) > 0.003) { done = false; cur.phi += Math.sign(dphi) * Math.min(Math.abs(dphi), 2.4 * dt * (window.__armSpeed || 1)); }
      if (s.roll != null && Math.abs(s.roll - cur.roll) > 0.003) { done = false; cur.roll += Math.sign(s.roll - cur.roll) * Math.min(Math.abs(s.roll - cur.roll), 3 * dt); }
      if (s.grip != null && Math.abs(s.grip - cur.grip) > 0.01) { done = false; cur.grip += Math.sign(s.grip - cur.grip) * Math.min(Math.abs(s.grip - cur.grip), 3.2 * dt * (window.__armSpeed || 1)); }
      if (done) { queue.shift(); if (s.then) s.then(); }
    }

    // ---------- interaction state ----------
    var mode = 'nav', sel = 2, busy = false, awaitingConfirm = null, manual = false, axis = 0;
    var AXES = ['Turn', 'Reach', 'Lift', 'Wrist', 'Grip'];
    function list() { return mode === 'nav' ? TILES : OBJ; }
    function setStatus(t) { ui.status.textContent = t; }
    function highlight() {
      TILES.forEach(function (t, i) { t.halo.material.opacity = (mode === 'nav' && i === sel) ? 0.9 : 0; t.mesh.visible = mode === 'nav' || t === held; });
      OBJ.forEach(function (o, i) { o.halo.material.opacity = (mode === 'play' && i === sel && held !== o) ? 0.9 : 0; o.g.visible = mode === 'play' || held === o; });
      [tray, trayRim, trayLabel].forEach(function (m) { m.visible = mode === 'play' || !!test; });
      if (test) { OBJ.forEach(function (o) { o.g.visible = false; o.halo.material.opacity = 0; }); TILES.forEach(function (t) { t.mesh.visible = false; t.halo.material.opacity = 0; }); }
      BLOCK.g.visible = !!test; BLOCK.halo.material.opacity = (test && held !== BLOCK) ? 0.8 : 0;
    }
    function describe() {
      if (test) { setStatus('Skill test · Trial ' + (test.trial + 1) + ' of ' + test.trials + ': pick up the green block and put it in the tray · Mode: ' + AXES[axis]); showLabel('Mode: ' + AXES[axis], 'Skill test · trial ' + (test.trial + 1) + ' of ' + test.trials); return; }
      if (manual) { setStatus('Manual control · Mode: ' + AXES[axis] + ' · Use Left and Right, Next mode to switch'); showLabel('Mode: ' + AXES[axis], 'Manual control'); return; }
      var it = list()[sel]; if (!it) return;
      if (mode === 'nav') { setStatus(it.d.name + (it.d.cap ? ': ' + it.d.cap : '')); showLabel(it.d.name, it.d.cap); }
      else { setStatus('Selected: ' + it.name + '. Press Pick up.'); showLabel(it.name, { cup: 'Bring a drink to the mouth', phone: 'Hold the phone at the ear', pill: 'Move it to the tray', button: 'Press the elevator button' }[it.key]); }
    }
    function point() {
      if (manual || busy) return;
      var it = list()[sel]; var at = mode === 'nav' ? it.at : it.at;
      var hover = at.clone(); hover.y = mode === 'nav' ? 0.75 : (it.g.userData.h + 0.55);
      queue = []; to(hover, Math.PI * 0.82, { speed: 2.2, grip: 0 }); run();
    }
    function select(i) { var L = list(); sel = (i + L.length) % L.length; highlight(); describe(); point(); }

    function lock(on) { busy = on; ui.left.disabled = ui.right.disabled = on && !awaitingConfirm; }

    function grabTile(t) {
      busy = true; lock(true); setStatus('Going to: ' + t.d.name);
      var above = t.at.clone(); above.y = 0.5;
      var grasp = t.at.clone(); grasp.y = 0.07;
      queue = [];
      to(above, Math.PI, { grip: 0, speed: 2 });
      to(grasp, Math.PI, { speed: 1.2 });
      to(grasp, Math.PI, { grip: 1, then: function () { held = t; heldOffset = 0.09; } });
      to(above, Math.PI, { speed: 1.2 });
      to(above, Math.PI, { wait: 250 });
      to(grasp, Math.PI, { speed: 1.2 });
      to(grasp, Math.PI, { grip: 0, then: function () { held = null; t.mesh.position.copy(t.home); } });
      to(above, Math.PI, { speed: 2 });
      run(function () { busy = false; lock(false); describe(); opts.go(t.d.go); });
    }

    function pickUp(o) {
      busy = true; lock(true); setStatus('Reaching for: ' + o.name);
      var h = o.g.userData.h, side = o.key !== 'phone';
      var graspY = side ? Math.max(0.12, h * 0.5) : h + 0.02, phi = side ? Math.PI / 2 : Math.PI;
      var dir = o.at.clone().sub(BASE).setY(0).normalize();
      var grasp = o.at.clone().add(dir.clone().multiplyScalar(side ? -0.02 : 0)); grasp.y = graspY + (side ? 0 : 0);
      var pre = grasp.clone().add(dir.clone().multiplyScalar(side ? -0.45 : 0)); pre.y = side ? graspY + 0.05 : h + 0.45;
      if (o.key === 'button') {
        var face = o.at.clone().add(dir.clone().multiplyScalar(-0.1)); face.y = 0.42;
        var back = face.clone().add(dir.clone().multiplyScalar(-0.4));
        queue = []; to(back, Math.PI / 2, { grip: 1, speed: 2 }); to(face, Math.PI / 2, { speed: 0.8, then: function () { o.g.userData.lamp.material.emissive.setHex(GREEN); o.g.userData.lamp.material.color.setHex(GREEN); setStatus(o.done); } });
        to(face, Math.PI / 2, { wait: 400 }); to(back, Math.PI / 2, { speed: 1.2, grip: 0 });
        run(function () { busy = false; lock(false); setTimeout(function () { o.g.userData.lamp.material.emissive.setHex(0); o.g.userData.lamp.material.color.setHex(0x3b5476); }, 2500); });
        return;
      }
      queue = [];
      to(pre, phi, { grip: 0, roll: side ? 0 : Math.PI / 2, speed: 2 });
      to(grasp, phi, { speed: 0.9 });
      to(grasp, phi, { grip: 0.82, then: function () { held = o; heldOffset = side ? -graspY + 0.0 : -h + 0.0; o.side = side; } });
      var lift = grasp.clone(); lift.y += 0.45; to(lift, phi, { speed: 1 });
      var stage;
      if (o.deliver === 'tray') {
        var over = tray.position.clone(); over.y = 0.75; var put = tray.position.clone(); put.y = graspY + 0.05;
        to(over, phi, { speed: 1.6 }); to(put, phi, { speed: 0.8 });
        to(put, phi, { grip: 0, then: function () { held = null; } });
        to(over, phi, { speed: 1.4 });
        run(function () { busy = false; lock(false); setStatus(o.done); o.placed = true; ui.go.textContent = 'Put it back'; awaitingConfirm = 'return'; });
        return;
      }
      var target = new THREE.Vector3(); (o.deliver === 'ear' ? ear : mouth).getWorldPosition(target);
      var towardUser = target.clone().sub(BASE).setY(0).normalize();
      stage = target.clone().add(towardUser.clone().multiplyScalar(-0.75)); stage.y = target.y;
      to(stage, Math.PI / 2, { speed: 1.6, roll: 0 });
      run(function () {
        lock(false); busy = false; awaitingConfirm = 'deliver';
        setStatus('Ready to bring the ' + o.name.toLowerCase() + ' to the ' + (o.deliver === 'ear' ? 'ear' : 'mouth') + '. Press Confirm to continue, or Stop.');
        ui.go.textContent = 'Confirm';
        o._target = target; o._stage = stage;
      });
    }
    function deliver(o) {
      busy = true; lock(true); awaitingConfirm = null; slowNearFace = true;
      var t = o._target.clone(), dir = t.clone().sub(BASE).setY(0).normalize();
      var near = t.clone().add(dir.multiplyScalar(o.deliver === 'ear' ? -0.16 : 0.09));
      if (o.deliver === 'mouth') near.y -= 0.36;
      queue = []; to(near, Math.PI / 2, { speed: 0.9, then: function () { if (o.key === 'cup') tiltCup = 1; setStatus(o.done); } });
      to(near, Math.PI / 2, { wait: o.key === 'cup' ? 2400 : 1600 });
      run(function () {
        slowNearFace = false; busy = false; lock(false); tiltCup = 0;
        if (o.key === 'cup') { var w = o.g.userData.water; w.scale.y = 0.35; w.position.y = 0.045; }
        ui.go.textContent = 'Put it back'; awaitingConfirm = 'return';
        setStatus(o.done + '. Press Put it back when finished.');
      });
    }
    function putBack(o) {
      busy = true; lock(true); awaitingConfirm = null; setStatus('Putting back: ' + o.name);
      var side = o.side !== false && o.key !== 'phone';
      var h = o.g.userData.h, graspY = side ? Math.max(0.12, h * 0.5) : h + 0.02, phi = side ? Math.PI / 2 : Math.PI;
      var dir = o.home.clone().sub(BASE).setY(0).normalize();
      queue = [];
      if (o.placed) {
        var put = tray.position.clone(); put.y = graspY; var over = put.clone(); over.y = 0.75;
        to(over, phi, { speed: 1.6, grip: 0 }); to(put, phi, { speed: 0.9 }); to(put, phi, { grip: 0.82, then: function () { held = o; heldOffset = side ? -graspY : -h; } });
        to(over, phi, { speed: 1 });
      } else {
        var away = cur.p.clone().add(cur.p.clone().sub(mouthWorld()).setY(0).normalize().multiplyScalar(0.5)); to(away, Math.PI / 2, { speed: 0.9 });
      }
      var g2 = o.home.clone(); g2.y = graspY; var above = g2.clone(); above.y += 0.45;
      to(above, phi, { speed: 1.6 }); to(g2, phi, { speed: 0.8 });
      to(g2, phi, { grip: 0, then: function () { held = null; o.g.position.copy(o.home); o.g.rotation.x = o.g.rotation.z = 0; if (o.key === 'cup') { var w = o.g.userData.water; w.scale.y = 1; w.position.y = 0.11; } } });
      var back = g2.clone().add(dir.multiplyScalar(-0.45)); back.y = g2.y + 0.1; to(back, phi, { speed: 1.4 });
      run(function () { o.placed = false; busy = false; lock(false); ui.go.textContent = 'Pick up'; describe(); point(); });
    }
    function mouthWorld() { var v = new THREE.Vector3(); mouth.getWorldPosition(v); return v; }

    // ---------- manual control (one axis at a time) ----------
    function nudge(sign) {
      var p = goal.p, d = sign * 0.08;
      if (!manual) return;
      if (test) test.inputs++;
      var dx = cur.p.x - BASE.x, dz = cur.p.z - BASE.z, yaw = Math.atan2(dx, dz), r = Math.hypot(dx, dz), np = cur.p.clone();
      if (axis === 0) { yaw += sign * 0.07; np.x = BASE.x + Math.sin(yaw) * r; np.z = BASE.z + Math.cos(yaw) * r; }
      else if (axis === 1) { r = Math.max(0.7, Math.min(3.1, r + d)); np.x = BASE.x + Math.sin(yaw) * r; np.z = BASE.z + Math.cos(yaw) * r; }
      else if (axis === 2) { np.y = Math.max(0.06, Math.min(2.6, np.y + d)); }
      var roll = cur.roll, grip = cur.grip;
      if (axis === 3) roll += sign * 0.25;
      if (axis === 4) { grip = sign > 0 ? 1 : 0; }
      queue = []; to(np, cur.phi, { roll: roll, grip: grip, speed: 2.2, then: axis === 4 ? manualGrip : null }); run(); readout();
    }
    function manualGrip() {
      if (cur.grip > 0.5 && !held) {
        var t = tipWorld(), best = null, bd = 0.32;
        OBJ.concat(TILES).concat([BLOCK]).forEach(function (o) { var m = o.g || o.mesh; if (!m.visible || o.key === 'button') return; var c = m.position.clone(); c.y += (o.g ? o.g.userData.h * 0.5 : 0.03); var dd = c.distanceTo(t); if (dd < bd) { bd = dd; best = o; } });
        if (best) { held = best; heldOffset = best.g ? -best.g.userData.h * 0.5 : -0.03; setStatus('Holding: ' + (best.name || best.d.name) + '. Open the grip to release.'); }
        else setStatus('Grip closed. Nothing within reach of the fingers.');
      } else if (cur.grip < 0.5 && held) {
        var m = held.g || held.mesh; m.position.y = held.g ? 0 : 0.03; m.rotation.x = m.rotation.z = 0;
        if (held.d) { held.mesh.position.copy(held.home); }
        var wasBlock = held === BLOCK; held = null;
        if (wasBlock && test) {
          var inTray = Math.abs(m.position.x - tray.position.x) < 0.42 && Math.abs(m.position.z - tray.position.z) < 0.32;
          if (inTray) { m.position.y = 0.05; trialDone(); return; }
          BLOCK.halo.position.set(m.position.x, 0.006, m.position.z); setStatus('Released outside the tray. Pick it up again.'); return;
        }
        setStatus('Released.');
      }
    }

    // ---------- skill test ----------
    var HOME_POSE = polar(0, 1.5, 1.0);
    function placeBlock() {
      var deg = -48 + Math.random() * 96, r = 1.25 + Math.random() * 1.3;
      var at = polar(deg, r); if (at.distanceTo(tray.position) < 0.8) at = polar(deg > 0 ? deg - 30 : deg + 30, r);
      BLOCK.at.copy(at); BLOCK.g.position.copy(at); BLOCK.g.rotation.set(0, Math.random() * Math.PI, 0);
      BLOCK.halo.position.set(at.x, 0.006, at.z);
      // estimate the fewest inputs needed (turn, reach, lift down and up, grip twice, mode switches)
      var y0 = Math.atan2(HOME_POSE.x - BASE.x, HOME_POSE.z - BASE.z), y1 = Math.atan2(at.x - BASE.x, at.z - BASE.z), y2 = Math.atan2(tray.position.x - BASE.x, tray.position.z - BASE.z);
      var r0 = Math.hypot(HOME_POSE.x - BASE.x, HOME_POSE.z - BASE.z), r2 = Math.hypot(tray.position.x - BASE.x, tray.position.z - BASE.z);
      var steps = Math.abs(y1 - y0) / 0.07 + Math.abs(r - r0) / 0.08 + (HOME_POSE.y - 0.12) / 0.08 * 2 + Math.abs(y2 - y1) / 0.07 + Math.abs(r2 - r) / 0.08;
      test.opt = Math.max(16, Math.round(steps / 3) + 14 + 2);
      test.t0 = performance.now(); test.inputs = 0; test.switches = 0;
    }
    function resetPose() { queue = []; to(HOME_POSE, Math.PI / 2, { grip: 0, roll: 0, speed: 3 }); run(); }
    function startTest() {
      if (busy || held) return;
      test = { trial: 0, trials: 3, results: [], inputs: 0, switches: 0 };
      if (!manual) ui.manual.click();
      mode = 'play'; ui.navTab.setAttribute('aria-pressed', 'false'); ui.playTab.setAttribute('aria-pressed', 'true');
      axis = 0; ui.test.textContent = 'End test'; if (ui.results) ui.results.hidden = true;
      placeBlock(); resetPose(); highlight(); describe();
    }
    function trialDone() {
      var t = (performance.now() - test.t0) / 1000;
      var eff = Math.min(1, test.opt / Math.max(1, test.inputs)), spd = Math.min(1, (test.opt * 0.9 + 8) / Math.max(1, t));
      test.results.push({ trial: test.trial + 1, seconds: +t.toFixed(1), inputs: test.inputs, modeSwitches: test.switches, fewestInputsEstimate: test.opt, score: Math.round(100 * (0.6 * eff + 0.4 * spd)) });
      test.trial++;
      if (test.trial >= test.trials) return finishTest();
      setStatus('Trial ' + test.trial + ' complete. Next block placed.');
      setTimeout(function () { if (!test) return; placeBlock(); resetPose(); highlight(); describe(); }, 900);
    }
    function finishTest() {
      var R = test.results, total = Math.round(R.reduce(function (a, r) { return a + r.score; }, 0) / R.length);
      var secs = R.reduce(function (a, r) { return a + r.seconds; }, 0), inputs = R.reduce(function (a, r) { return a + r.inputs; }, 0), sw = R.reduce(function (a, r) { return a + r.modeSwitches; }, 0);
      var summary = { test: 'Access+ robotic arm reach and grasp', version: 1, date: new Date().toISOString(), control: 'Manual, one axis at a time (Turn, Reach, Lift, Wrist, Grip)', score: total, totalSeconds: +secs.toFixed(1), totalInputs: inputs, modeSwitches: sw, trials: R };
      lastResult = summary; test = null; highlight();
      ui.test.textContent = 'Skill test';
      setStatus('Skill test complete. Score ' + total + ' out of 100.');
      if (ui.results) {
        ui.results.hidden = false;
        ui.results.querySelector('[data-r="score"]').textContent = total;
        ui.results.querySelector('[data-r="time"]').textContent = secs.toFixed(0) + ' s';
        ui.results.querySelector('[data-r="inputs"]').textContent = inputs;
        ui.results.querySelector('[data-r="switch"]').textContent = sw;
        var tb = ui.results.querySelector('[data-r="trials"]'); tb.innerHTML = '';
        R.forEach(function (r) { var li = document.createElement('li'); li.textContent = 'Trial ' + r.trial + ': ' + r.score + ' points · ' + r.seconds + ' s · ' + r.inputs + ' inputs'; tb.appendChild(li); });
      }
      resetPose();
    }
    function endTest() { if (!test) return; test = null; held = null; highlight(); ui.test.textContent = 'Skill test'; setStatus('Skill test ended.'); resetPose(); }
    var lastResult = null;
    ui.test.addEventListener('click', function () { if (test) endTest(); else startTest(); });
    if (ui.save) ui.save.addEventListener('click', function () {
      if (!lastResult) return;
      var name = 'access-plus-arm-test-' + lastResult.date.slice(0, 10) + '.json', data = JSON.stringify(lastResult, null, 2);
      function fallback() { var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([data], { type: 'application/json' })); a.download = name; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500); }
      if (window.claude && window.claude.use) window.claude.use('downloads').then(function (d) { if (d) d.save({ filename: name, data: data }).catch(function () {}); else fallback(); }).catch(fallback);
      else fallback();
    });
    if (ui.again) ui.again.addEventListener('click', function () { startTest(); });

    // ---------- readout ----------
    function readout() {
      if (!ui.readout) return;
      var deg = function (r) { return Math.round(r * 180 / Math.PI); };
      var dx = cur.p.x - BASE.x, dz = cur.p.z - BASE.z;
      ui.readout.textContent = (test ? 'SKILL TEST ' + (test.trial + 1) + '/' + test.trials + ' · ' + AXES[axis].toUpperCase() + ' · INPUTS ' + test.inputs + ' · ' + ((performance.now() - test.t0) / 1000).toFixed(0) + ' S' : manual ? 'MANUAL · ' + AXES[axis].toUpperCase() : (mode === 'nav' ? 'NAVIGATE' : 'PICK UP')) +
        '  ·  TURN ' + deg(joints.yaw) + '°  ·  REACH ' + Math.hypot(dx, dz).toFixed(2) + ' m  ·  LIFT ' + cur.p.y.toFixed(2) + ' m  ·  WRIST ' + deg(cur.roll) + '°  ·  GRIP ' + (cur.grip > 0.5 ? 'CLOSED' : 'OPEN');
    }

    // ---------- UI wiring ----------
    ui.left.addEventListener('click', function (e) { if (manual) { if (e.detail === 0) nudge(-1); return; } if (!busy && !awaitingConfirm) select(sel - 1); });
    ui.right.addEventListener('click', function (e) { if (manual) { if (e.detail === 0) nudge(1); return; } if (!busy && !awaitingConfirm) select(sel + 1); });
    var rep = null;
    function holdStart(sign) { return function (e) { if (!manual) return; e.preventDefault(); nudge(sign); clearInterval(rep); var first = setTimeout(function () { rep = setInterval(function () { nudge(sign); if (test) test.inputs--; }, 140); }, 380); rep = first; }; }
    function holdEnd() { clearInterval(rep); clearTimeout(rep); rep = null; }
    ['pointerdown'].forEach(function (ev) { ui.left.addEventListener(ev, holdStart(-1)); ui.right.addEventListener(ev, holdStart(1)); });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (ev) { ui.left.addEventListener(ev, holdEnd); ui.right.addEventListener(ev, holdEnd); });
    ui.go.addEventListener('click', function () {
      if (manual) { axis = (axis + 1) % AXES.length; if (test) { test.inputs++; test.switches++; } describe(); readout(); return; }
      if (busy) return;
      var it = list()[sel];
      if (mode === 'nav') return grabTile(it);
      if (awaitingConfirm === 'deliver') return deliver(held);
      if (awaitingConfirm === 'return') return putBack(OBJ.filter(function (o) { return o === held || o.placed; })[0] || held);
      pickUp(it);
    });
    ui.stop.addEventListener('click', function () {
      stopped = true; queue = []; moving = false; busy = false; slowNearFace = false; tiltCup = 0; lock(false);
      setStatus('Stopped. The arm is holding still.' + (held ? ' Press ' + (awaitingConfirm ? ui.go.textContent : 'Put it back') + ' when ready.' : ''));
      if (held && !awaitingConfirm) { awaitingConfirm = 'return'; ui.go.textContent = 'Put it back'; }
    });
    ui.manual.addEventListener('click', function () {
      if (busy || (test && manual)) return;
      manual = !manual; ui.manual.setAttribute('aria-pressed', manual ? 'true' : 'false');
      ui.manual.textContent = manual ? 'Manual: on' : 'Manual: off';
      ui.go.textContent = manual ? 'Next mode' : (mode === 'nav' ? 'Go' : (awaitingConfirm === 'deliver' ? 'Confirm' : awaitingConfirm === 'return' ? 'Put it back' : 'Pick up'));
      ui.left.textContent = manual ? '← Less' : '← Left'; ui.right.textContent = manual ? 'More →' : 'Right →';
      describe(); readout();
    });
    function setMode(m) {
      if (test) endTest();
      if (busy || m === mode) return;
      if (held) return setStatus('Put the ' + (held.name || 'item').toLowerCase() + ' back first.');
      mode = m; sel = m === 'nav' ? 2 : 0; awaitingConfirm = null;
      ui.navTab.setAttribute('aria-pressed', m === 'nav' ? 'true' : 'false');
      ui.playTab.setAttribute('aria-pressed', m === 'play' ? 'true' : 'false');
      if (!manual) ui.go.textContent = m === 'nav' ? 'Go' : 'Pick up';
      highlight(); describe(); point();
    }
    ui.navTab.addEventListener('click', function () { setMode('nav'); });
    ui.playTab.addEventListener('click', function () { setMode('play'); });
    host.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') { ui.left.click(); e.preventDefault(); }
      else if (e.key === 'ArrowRight') { ui.right.click(); e.preventDefault(); }
      else if (e.key === 'Enter' || e.key === ' ') { ui.go.click(); e.preventDefault(); }
      else if (e.key === 'Escape') { ui.stop.click(); }
    });
    renderer.domElement.addEventListener('click', function (e) {
      var r = renderer.domElement.getBoundingClientRect(), m = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      var rc = new THREE.Raycaster(); rc.setFromCamera(m, camera);
      var L = list(), targets = L.map(function (o) { return o.g || o.mesh; });
      var hits = rc.intersectObjects(targets, true); if (!hits.length || busy || manual || awaitingConfirm) return;
      var obj = hits[0].object; while (obj && targets.indexOf(obj) < 0) obj = obj.parent;
      var i = targets.indexOf(obj); if (i >= 0) { if (i === sel) ui.go.click(); else select(i); }
    });

    // ---------- render loop ----------
    var last = performance.now(), visible = true, t0 = last;
    function resize() {
      var w = host.clientWidth || 400, h = Math.round(w / 1.6);
      renderer.setSize(w, h, false); renderer.domElement.style.width = '100%'; renderer.domElement.style.height = 'auto';
      camera.aspect = w / h; camera.updateProjectionMatrix();
    }
    window.addEventListener('resize', resize); resize();
    try { new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }).observe(host); } catch (e) {}
    function frame(now) {
      requestAnimationFrame(frame);
      var dt = Math.max(0, Math.min(0.05, (now - last) / 1000)); last = now;
      if (!visible || host.offsetParent === null) return;
      step(dt); apply();
      if (held) {
        var tip = tipWorld(), m = held.g || held.mesh;
        m.position.set(tip.x, tip.y + heldOffset, tip.z);
        var yaw = joints.yaw; m.rotation.set(0, yaw + Math.PI, 0);
        if (held.key === 'cup') { m.rotation.z = 0; m.rotateOnWorldAxis(new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw)), -0.35 * tiltCup); var w = held.g.userData.water; if (tiltCup) { w.scale.y = Math.max(0.35, w.scale.y - dt * 0.25); w.position.y = 0.11 * w.scale.y; } }
      }
      var pulse = 0.55 + 0.35 * Math.sin((now - t0) / 380);
      mRing.material.opacity = (held && (awaitingConfirm === 'deliver' || slowNearFace)) ? 0.4 + 0.5 * Math.abs(Math.sin((now - t0) / 260)) : 0.5;
      if (!reduce && !moving && !held && !manual) { cur.p.y += Math.sin(now / 900) * 0.0006; }
      readout();
      renderer.render(scene, camera);
    }
    highlight(); describe(); point(); requestAnimationFrame(frame);
    window.__arm3d = { st: function () { return { test: test ? { trial: test.trial, inputs: test.inputs } : null, axis: axis, held: held ? held.key || 'tile' : null, block: [BLOCK.g.position.x, BLOCK.g.position.z], tray: [tray.position.x, tray.position.z], base: [BASE.x, BASE.z], p: [cur.p.x, cur.p.y, cur.p.z], q: queue.length, last: lastResult }; }, dbg: function () { var a = new THREE.Vector3(), m = new THREE.Vector3(); mouth.getWorldPosition(m); var c = OBJ[0].g.userData.straw; c.updateMatrixWorld(); a.set(0, 0.23, 0).applyMatrix4(c.matrixWorld); return { strawTop: [a.x, a.y, a.z], mouth: [m.x, m.y, m.z] }; }, cur: cur, joints: function () { return joints; }, queue: function () { return queue.length; }, moving: function () { return moving; }, tip: function () { var v = tipWorld(); return [v.x, v.y, v.z]; } };
    return { setMode: setMode };
  };
})();

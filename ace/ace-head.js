/* Ace head: a 3D wireframe face mesh drawn on a canvas.
   const head = AceHead(canvas); head.set({smile, open, blink, brow, yaw, pitch, roll}); head.talk(ms);
   With no input it idles: slow head turns, blinks and a scan line. */
function AceHead(canvas, opts) {
  opts = opts || {};
  var ctx = canvas.getContext('2d');
  var GREEN = opts.color || '95,224,168', MINT = '169,228,196', WHITE = '240,245,250';
  var A = 0.74, B = 1.0, C = 0.82;
  var cur = { smile: 0, open: 0, blink: 0, brow: 0, yaw: 0, pitch: 0, roll: 0, pucker: 0, ears: 0 };
  var tgt = Object.assign({}, cur);
  var live = false, lastLive = 0, talkUntil = 0, nextBlink = 2000, blinkStart = -1;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  function taper(y) { var k = y < 0 ? Math.min(1, -y / B) : 0; return { x: 1 - 0.32 * k, z: 1 - 0.12 * k }; }
  function surfZ(x, y) {
    var t = taper(y), xs = x / t.x, v = 1 - (xs / A) * (xs / A) - (y / B) * (y / B);
    return C * Math.sqrt(Math.max(0, v)) * t.z;
  }
  // mesh grid
  var LAT = 18, LON = 28, grid = [];
  for (var i = 0; i <= LAT; i++) {
    var th = -1.22 + 2.42 * i / LAT, row = [];
    for (var j = 0; j < LON; j++) {
      var ph = 2 * Math.PI * j / LON;
      var x = A * Math.cos(th) * Math.sin(ph), y = B * Math.sin(th), z = C * Math.cos(th) * Math.cos(ph);
      var t = taper(y); row.push([x * t.x, y, z * t.z]);
    }
    grid.push(row);
  }
  function rot(p, r) {
    var x = p[0], y = p[1], z = p[2], c, s, nx, ny, nz;
    c = Math.cos(r.yaw); s = Math.sin(r.yaw); nx = x * c + z * s; nz = -x * s + z * c; x = nx; z = nz;
    c = Math.cos(r.pitch); s = Math.sin(r.pitch); ny = y * c - z * s; nz = y * s + z * c; y = ny; z = nz;
    c = Math.cos(r.roll); s = Math.sin(r.roll); nx = x * c - y * s; ny = x * s + y * c;
    return [nx, ny, z];
  }
  var W, H, cx, cy, sc;
  function size() {
    var dpr = Math.min(2, window.devicePixelRatio || 1), rect = canvas.getBoundingClientRect();
    var w = Math.max(40, rect.width || canvas.width), h = Math.max(40, rect.height || canvas.height);
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); W = w; H = h; cx = w / 2; cy = h * 0.52; sc = Math.min(w, h) * 0.40;
  }
  function proj(p, r) { var q = rot(p, r), f = 3.2 / (3.2 - q[2]); return [cx + q[0] * sc * f, cy - q[1] * sc * f, q[2]]; }
  function onFace(x, y, dz) { return [x, y, surfZ(x, y) + (dz || 0)]; }
  function line(pts, r, rgb, a, w) {
    ctx.beginPath(); var vis = 0;
    for (var k = 0; k < pts.length; k++) { var q = proj(pts[k], r); if (q[2] > -0.15) vis++; k ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); }
    if (!vis) return; ctx.strokeStyle = 'rgba(' + rgb + ',' + a + ')'; ctx.lineWidth = w; ctx.stroke();
  }
  function curve(fn, n) { var out = []; for (var k = 0; k <= n; k++) out.push(fn(k / n)); return out; }

  function frame(now) {
    if (!canvas.offsetParent) { requestAnimationFrame(frame); return; }
    size();
    // idle motion or live smoothing
    if (live && now - lastLive > 1500) live = false;
    if (!live) {
      var tt = reduce ? 0 : now / 1000;
      tgt.yaw = 16 * Math.sin(tt / 3.1); tgt.pitch = 5 * Math.sin(tt / 4.3); tgt.roll = 3 * Math.sin(tt / 5.2);
      tgt.smile = 0.25 + 0.15 * Math.sin(tt / 2.7); tgt.brow = 0.1; tgt.open = 0; tgt.pucker = 0; tgt.ears = 0;
      if (!reduce && now > nextBlink) { blinkStart = now; nextBlink = now + 2500 + Math.random() * 3500; }
      tgt.blink = blinkStart > 0 && now - blinkStart < 160 ? 1 : 0;
    }
    if (now < talkUntil) tgt.open = 0.25 + 0.25 * Math.abs(Math.sin(now / 90));
    // unwind full spins so the head never turns back the long way
    while (cur.yaw - tgt.yaw > 180) cur.yaw -= 360; while (tgt.yaw - cur.yaw > 180) cur.yaw += 360;
    for (var key in cur) cur[key] += (tgt[key] - cur[key]) * (key === 'blink' ? 0.6 : 0.25);
    var D = Math.PI / 180, r = { yaw: cur.yaw * D, pitch: cur.pitch * D, roll: cur.roll * D };

    ctx.clearRect(0, 0, W, H);
    // halo
    var g = ctx.createRadialGradient(cx, cy, sc * 0.2, cx, cy, sc * 1.5);
    g.addColorStop(0, 'rgba(' + GREEN + ',0.10)'); g.addColorStop(1, 'rgba(' + GREEN + ',0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

    // mesh: back first, then front
    var P = grid.map(function (row) { return row.map(function (p) { return proj(p, r); }); });
    ctx.lineWidth = 0.6;
    for (var pass = 0; pass < 2; pass++) {
      for (var i2 = 0; i2 <= LAT; i2++) for (var j2 = 0; j2 < LON; j2++) {
        var a = P[i2][j2], b = P[i2][(j2 + 1) % LON], c2 = i2 < LAT ? P[i2 + 1][j2] : null, d = i2 < LAT ? P[i2 + 1][(j2 + 1) % LON] : null;
        var zz = a[2];
        if ((pass === 0) !== (zz < 0.05)) continue;
        var al = zz < 0.05 ? 0.07 : 0.16 + 0.34 * Math.min(1, zz / C);
        ctx.strokeStyle = 'rgba(' + GREEN + ',' + al.toFixed(3) + ')';
        ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
        if (c2) { ctx.moveTo(a[0], a[1]); ctx.lineTo(c2[0], c2[1]); if (zz > 0.05) { ctx.moveTo(a[0], a[1]); ctx.lineTo(d[0], d[1]); } }
        ctx.stroke();
      }
    }
    // vertices on the front
    ctx.fillStyle = 'rgba(' + GREEN + ',0.75)';
    for (var i3 = 0; i3 <= LAT; i3++) for (var j3 = 0; j3 < LON; j3++) { var q = P[i3][j3]; if (q[2] > 0.25) ctx.fillRect(q[0] - 0.8, q[1] - 0.8, 1.6, 1.6); }

    // features
    ctx.save(); ctx.shadowColor = 'rgba(' + GREEN + ',0.9)'; ctx.shadowBlur = 6;
    var s = cur.smile, o = cur.open, bl = cur.blink, br = cur.brow;
    [-1, 1].forEach(function (side) {
      var ex = 0.29 * side, ey = 0.13, ew = 0.13, open1 = Math.max(0.05, 1 - bl);
      line(curve(function (u) { var x = ex + ew * (u * 2 - 1); return onFace(x, ey + 0.055 * open1 * Math.sin(Math.PI * u) - 0.012 * s, 0.01); }, 14), r, WHITE, 0.95, 1.4);
      line(curve(function (u) { var x = ex + ew * (u * 2 - 1); return onFace(x, ey - (0.035 * open1 + 0.01 * s) * Math.sin(Math.PI * u), 0.01); }, 14), r, WHITE, 0.8, 1.2);
      if (bl < 0.6) {
        line(curve(function (u) { var an = u * Math.PI * 2; return onFace(ex + 0.038 * Math.cos(an), ey + 0.01 + 0.032 * Math.sin(an) * open1, 0.02); }, 20), r, GREEN, 1, 1.4);
        line(curve(function (u) { var an = u * Math.PI * 2; return onFace(ex + 0.014 * Math.cos(an), ey + 0.01 + 0.012 * Math.sin(an), 0.025); }, 10), r, WHITE, 1, 1.2);
      }
      line(curve(function (u) { var x = ex + 0.16 * (u * 2 - 1) * 0.95; return onFace(x, 0.29 + 0.07 * br + 0.035 * Math.sin(Math.PI * (side > 0 ? u * 0.9 + 0.1 : u * 0.9)), 0.03); }, 12), r, MINT, 0.95, 2);
      // cheekbone and jaw contours
      line(curve(function (u) { return onFace(side * (0.2 + 0.32 * u), -0.05 - 0.08 * u + 0.02 * s, 0.005); }, 10), r, GREEN, 0.45, 1);
      line(curve(function (u) { return onFace(side * (0.5 - 0.42 * u), -0.38 - 0.42 * Math.sin(u * Math.PI / 2), 0.0); }, 12), r, GREEN, 0.5, 1);
      // nostril wing
      line(curve(function (u) { var an = Math.PI * (0.2 + 1.1 * u); return onFace(side * (0.055 + 0.04 * Math.cos(an)), -0.17 + 0.03 * Math.sin(an), 0.13); }, 8), r, MINT, 0.85, 1.2);
    });
    // nose bridge and tip
    line(curve(function (u) { return onFace(0, 0.18 - 0.36 * u, 0.02 + 0.13 * u * u); }, 10), r, MINT, 0.8, 1.2);
    line(curve(function (u) { return onFace(-0.05 + 0.1 * u, -0.19 - 0.012 * Math.sin(Math.PI * u), 0.15); }, 6), r, WHITE, 0.85, 1.2);
    // lips
    var pk = cur.pucker, mw = (0.17 + 0.05 * s) * (1 - 0.6 * pk), my = -0.44, lift = 0.06 * s * (1 - pk), drop = 0.16 * o;
    if (pk > 0.3) {
      line(curve(function (u) { var an = u * Math.PI * 2; return onFace(0.05 * pk * Math.cos(an), my - 0.025 + 0.04 * pk * Math.sin(an), 0.06 + 0.05 * pk); }, 20), r, WHITE, 0.95, 1.8);
      line(curve(function (u) { var an = u * Math.PI * 2; return onFace(0.022 * pk * Math.cos(an), my - 0.025 + 0.018 * pk * Math.sin(an), 0.08 + 0.05 * pk); }, 12), r, GREEN, 1, 1.4);
      [-1, 1].forEach(function (side) { line(curve(function (u) { return onFace(side * (0.2 + 0.02 * Math.sin(Math.PI * u)), -0.22 - 0.2 * u, -0.01); }, 8), r, GREEN, 0.6 * pk, 1); });
    }
    if (pk <= 0.3) line(curve(function (u) { var x = mw * (u * 2 - 1); return onFace(x, my + 0.03 * Math.sin(Math.PI * u) + lift * Math.pow(Math.abs(u * 2 - 1), 2) - 0.012 * Math.cos(u * Math.PI * 4) * (1 - s), 0.04); }, 20), r, WHITE, 0.95, 1.6);
    if (pk <= 0.3) line(curve(function (u) { var x = mw * (u * 2 - 1); return onFace(x, my + lift * Math.pow(Math.abs(u * 2 - 1), 2) - (0.01 + drop + 0.02 * s) * Math.sin(Math.PI * u), 0.04); }, 20), r, GREEN, 1, 1.6);
    if (pk <= 0.3) line(curve(function (u) { var x = mw * (u * 2 - 1); return onFace(x, my - 0.05 - drop - 0.02 * s - 0.03 * Math.sin(Math.PI * u) + lift * Math.pow(Math.abs(u * 2 - 1), 2) * 0.7, 0.03); }, 20), r, WHITE, 0.85, 1.4);
    // ears: grow outward from the sides of the head
    var ea = cur.ears;
    if (ea > 0.02) {
      [-1, 1].forEach(function (side) {
        function ear(scale, out) {
          return curve(function (u) {
            var an = Math.PI * u, x0 = A * 0.93;
            return [side * (x0 + ea * out * scale * Math.sin(an)), 0.24 * scale - 0.46 * scale * u + 0.04, 0.06 - 0.04 * u];
          }, 16);
        }
        line(ear(1, 0.42), r, WHITE, 0.9 * Math.min(1, ea * 1.5), 1.6);
        line(ear(0.62, 0.36), r, GREEN, 0.85 * Math.min(1, ea * 1.5), 1.2);
        for (var k = 1; k < 6; k++) {
          var u = k / 6, an = Math.PI * u, x0 = A * 0.93;
          line([[side * (x0 + ea * 0.42 * Math.sin(an)), 0.24 - 0.46 * u + 0.04, 0.06 - 0.04 * u],
                [side * (x0 + ea * 0.62 * 0.36 * Math.sin(an)), 0.62 * (0.24 - 0.46 * u) + 0.04, 0.06 - 0.04 * u]], r, GREEN, 0.45 * ea, 0.8);
        }
      });
    }
    // chin and hairline
    line(curve(function (u) { return onFace(0.12 * (u * 2 - 1), -0.8 - 0.03 * Math.sin(Math.PI * u), 0); }, 10), r, GREEN, 0.5, 1);
    line(curve(function (u) { return onFace(0.5 * (u * 2 - 1), 0.62 + 0.06 * Math.sin(Math.PI * u), 0); }, 16), r, GREEN, 0.4, 1);
    ctx.restore();

    // scan line
    if (!reduce) {
      var period = 3600, sy = cy - sc * 1.15 + ((now % period) / period) * sc * 2.3;
      var sg = ctx.createLinearGradient(0, sy - 18, 0, sy + 2);
      sg.addColorStop(0, 'rgba(' + GREEN + ',0)'); sg.addColorStop(1, 'rgba(' + GREEN + ',0.22)');
      ctx.fillStyle = sg; ctx.fillRect(cx - sc * 1.0, sy - 18, sc * 2.0, 20);
      ctx.fillStyle = 'rgba(' + GREEN + ',0.6)'; ctx.fillRect(cx - sc * 1.0, sy, sc * 2.0, 1);
    }
    // corner ticks
    ctx.strokeStyle = 'rgba(' + GREEN + ',0.55)'; ctx.lineWidth = 1.2;
    var m = 6, L = Math.min(W, H) * 0.08;
    [[m, m, 1, 1], [W - m, m, -1, 1], [m, H - m, 1, -1], [W - m, H - m, -1, -1]].forEach(function (k) {
      ctx.beginPath(); ctx.moveTo(k[0], k[1] + L * k[3]); ctx.lineTo(k[0], k[1]); ctx.lineTo(k[0] + L * k[2], k[1]); ctx.stroke();
    });
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  return {
    set: function (p) { live = true; lastLive = performance.now(); for (var k in p) if (k in tgt && isFinite(p[k])) tgt[k] = p[k]; },
    talk: function (ms) { talkUntil = performance.now() + (ms || 1200); }
  };
}

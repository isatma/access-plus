/* Access+ AI agent: an abstract, amorphous cloud of drifting specks on a canvas.
   const cloud = AgentCloud(canvas); cloud.talk(ms); cloud.pulse('#hex'); cloud.set({ energy, hue });
   Idles as a slow, breathing swirl. Talking makes it shimmer; pulse() sends a soft colored wave through it. */
function AgentCloud(canvas, opts) {
  opts = opts || {};
  var ctx = canvas.getContext('2d');
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var N = opts.count || 320, P = [];
  var PAL = [[95, 224, 168], [124, 196, 255], [169, 228, 196], [200, 220, 255], [247, 178, 196]];
  for (var i = 0; i < N; i++) {
    var u = Math.random() * 2 - 1, th = Math.random() * Math.PI * 2, r = Math.pow(Math.random(), 0.6);
    P.push({ u: u, th: th, r: r, sp: 0.15 + Math.random() * 0.5, ph: Math.random() * 6.28, sz: 0.6 + Math.random() * 1.6,
      c: PAL[Math.random() < 0.55 ? 0 : Math.random() < 0.6 ? 1 : Math.floor(Math.random() * PAL.length)] });
  }
  var energy = 0, eTarget = 0, talkUntil = 0, pulses = [], W, H, last = performance.now(), t = 0;
  function size() {
    var dpr = Math.min(2, window.devicePixelRatio || 1), rect = canvas.getBoundingClientRect();
    var w = Math.max(30, rect.width || canvas.width), h = Math.max(30, rect.height || canvas.height);
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); W = w; H = h;
  }
  function hexRgb(h) { var m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(h || ''); return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [95, 224, 168]; }
  function frame(now) {
    if (!canvas.offsetParent) { last = now; requestAnimationFrame(frame); return; }
    size();
    var dt = Math.min(0.05, (now - last) / 1000); last = now;
    var talking = now < talkUntil;
    var want = Math.max(eTarget, talking ? 0.75 + 0.25 * Math.sin(now / 110) : 0);
    energy += (want - energy) * 0.08;
    if (!reduce) t += dt * (0.35 + energy * 1.4);
    var cx = W / 2, cy = H / 2, R = Math.min(W, H) * 0.34 * (1 + 0.04 * Math.sin(t * 0.9) + energy * 0.08);
    ctx.clearRect(0, 0, W, H);
    var g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 1.6);
    g.addColorStop(0, 'rgba(95,224,168,' + (0.10 + energy * 0.10).toFixed(3) + ')');
    g.addColorStop(0.5, 'rgba(124,196,255,0.05)'); g.addColorStop(1, 'rgba(124,196,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    pulses = pulses.filter(function (p) { return now - p.t0 < 1600; });
    ctx.globalCompositeOperation = 'lighter';
    for (var i = 0; i < N; i++) {
      var p = P[i], th = p.th + t * p.sp, u = p.u + 0.25 * Math.sin(t * 0.4 + p.ph);
      var s = Math.sqrt(Math.max(0, 1 - u * u));
      var wob = 1 + 0.18 * Math.sin(t * 1.3 + p.ph * 2) + energy * 0.25 * Math.sin(t * 4 + p.ph);
      var rr = R * p.r * wob;
      var x = Math.cos(th) * s * rr, z = Math.sin(th) * s * rr, y = u * rr * 0.85;
      x += Math.sin(t * 0.7 + p.ph) * R * 0.06; y += Math.cos(t * 0.5 + p.ph * 1.3) * R * 0.06;
      var depth = (z / (R + 1e-6) + 1) / 2, a = 0.18 + 0.6 * depth, col = p.c;
      for (var k = 0; k < pulses.length; k++) {
        var q = pulses[k], age = (now - q.t0) / 1600, ring = Math.abs(p.r - age * 1.2);
        if (ring < 0.18) { var f = (1 - ring / 0.18) * (1 - age); col = [col[0] + (q.c[0] - col[0]) * f, col[1] + (q.c[1] - col[1]) * f, col[2] + (q.c[2] - col[2]) * f]; a += 0.5 * f; }
      }
      ctx.fillStyle = 'rgba(' + (col[0] | 0) + ',' + (col[1] | 0) + ',' + (col[2] | 0) + ',' + Math.min(1, a).toFixed(3) + ')';
      var sz = p.sz * (0.7 + depth * 0.8) * (Math.min(W, H) / 200 + 0.4);
      ctx.beginPath(); ctx.arc(cx + x, cy + y, sz, 0, 6.283); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  return {
    talk: function (ms) { talkUntil = performance.now() + (ms || 1200); },
    pulse: function (hex) { pulses.push({ t0: performance.now(), c: hexRgb(hex) }); },
    set: function (o) { if (o && isFinite(o.energy)) eTarget = Math.max(0, Math.min(1, o.energy)); }
  };
}

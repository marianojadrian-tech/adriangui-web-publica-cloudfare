/* Hero background: a lightweight node network (Obsidian-graph style) plus a
   few small rockets with a blue->green exhaust trail, both reacting to the
   pointer. Vanilla canvas, no dependencies. Respects prefers-reduced-motion
   (renders one static frame, no listeners) and pauses while the hero is
   scrolled out of view or the tab is hidden. */
(function () {
  var canvas = document.querySelector('.hero-canvas');
  var hero = canvas && canvas.closest('.hero');
  if (!canvas || !hero) return;

  var ctx = canvas.getContext('2d');
  var reduceMotion = matchMedia('(prefers-reduced-motion:reduce)').matches;
  var ACCENT = [47, 93, 255];   // #2f5dff
  var GREEN = [18, 184, 134];   // #12b886
  var INK = '#141a26';

  var W = 0, H = 0, DPR = Math.min(window.devicePixelRatio || 1, 2);
  var nodes = [], rockets = [];
  var pointer = { x: -9999, y: -9999, active: false };
  var running = false, rafId = null;

  function rand(a, b) { return a + Math.random() * (b - a); }
  function mix(c1, c2, t) {
    return 'rgba(' +
      Math.round(c1[0] + (c2[0] - c1[0]) * t) + ',' +
      Math.round(c1[1] + (c2[1] - c1[1]) * t) + ',' +
      Math.round(c1[2] + (c2[2] - c1[2]) * t) + ',';
  }

  function makeRocket() {
    var speed = rand(.16, .3);
    var angle = rand(-.35, .1);
    return {
      x: rand(-60, -10),
      y: rand(H * .12, H * .92),
      vx: Math.cos(angle) * speed + .08,
      vy: Math.sin(angle) * speed,
      size: rand(8, 12),
      trail: []
    };
  }

  function seed() {
    var narrow = W < 640, mid = W < 960;
    var count = narrow ? 16 : mid ? 32 : 50;
    nodes = [];
    for (var i = 0; i < count; i++) {
      nodes.push({
        x: rand(0, W), y: rand(0, H),
        vx: rand(-.1, .1), vy: rand(-.1, .1),
        r: rand(1.2, 2.3),
        c: Math.random() < .5 ? ACCENT : GREEN
      });
    }
    rockets = [];
    var rc = narrow ? 0 : mid ? 2 : 4;
    for (var j = 0; j < rc; j++) {
      var r = makeRocket();
      r.x = rand(0, W); // scatter on seed instead of all starting off-screen
      rockets.push(r);
    }
  }

  function resize() {
    var rect = hero.getBoundingClientRect();
    W = Math.max(1, rect.width);
    H = Math.max(1, rect.height);
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    seed();
  }

  function step() {
    var pointerRadius = 150;

    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      n.x += n.vx; n.y += n.vy;
      if (n.x < -12) n.x = W + 12; else if (n.x > W + 12) n.x = -12;
      if (n.y < -12) n.y = H + 12; else if (n.y > H + 12) n.y = -12;
      if (pointer.active) {
        var dx = n.x - pointer.x, dy = n.y - pointer.y, d = Math.hypot(dx, dy);
        if (d < pointerRadius && d > .01) {
          var f = (1 - d / pointerRadius) * .8;
          n.x += (dx / d) * f; n.y += (dy / d) * f;
        }
      }
    }

    for (var k = 0; k < rockets.length; k++) {
      var r = rockets[k];
      var vx = r.vx, vy = r.vy;
      if (pointer.active) {
        var rdx = r.x - pointer.x, rdy = r.y - pointer.y, rd = Math.hypot(rdx, rdy);
        if (rd < 170 && rd > .01) { vx += (rdx / rd) * .05; vy += (rdy / rd) * .05; }
      }
      r.x += vx; r.y += vy;
      r.trail.push({ x: r.x, y: r.y });
      if (r.trail.length > 16) r.trail.shift();
      if (r.x > W + 70 || r.x < -70 || r.y > H + 70 || r.y < -70) {
        var fresh = makeRocket();
        r.x = fresh.x; r.y = fresh.y; r.vx = fresh.vx; r.vy = fresh.vy; r.trail = [];
      }
    }
  }

  function drawRocket(r) {
    for (var i = 1; i < r.trail.length; i++) {
      var p0 = r.trail[i - 1], p1 = r.trail[i], t = i / r.trail.length;
      ctx.strokeStyle = mix(ACCENT, GREEN, t) + (t * .5) + ')';
      ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.stroke();
    }
    var angle = Math.atan2(r.vy, r.vx);
    ctx.save();
    ctx.translate(r.x, r.y);
    ctx.rotate(angle);
    ctx.fillStyle = INK;
    ctx.globalAlpha = .8;
    ctx.beginPath();
    ctx.moveTo(r.size, 0);
    ctx.lineTo(-r.size * .6, r.size * .38);
    ctx.lineTo(-r.size * .3, 0);
    ctx.lineTo(-r.size * .6, -r.size * .38);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    var connectDist = W < 640 ? 90 : 120;
    for (var i = 0; i < nodes.length; i++) {
      for (var j = i + 1; j < nodes.length; j++) {
        var a = nodes[i], b = nodes[j];
        var dx = a.x - b.x, dy = a.y - b.y, d = Math.hypot(dx, dy);
        if (d < connectDist) {
          ctx.strokeStyle = 'rgba(47,93,255,' + ((1 - d / connectDist) * .22) + ')';
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
      }
      if (pointer.active) {
        var n = nodes[i];
        var pdx = n.x - pointer.x, pdy = n.y - pointer.y, pd = Math.hypot(pdx, pdy);
        if (pd < 150) {
          ctx.strokeStyle = 'rgba(18,184,134,' + ((1 - pd / 150) * .35) + ')';
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(n.x, n.y); ctx.lineTo(pointer.x, pointer.y); ctx.stroke();
        }
      }
    }
    for (var k = 0; k < nodes.length; k++) {
      var node = nodes[k];
      ctx.beginPath();
      ctx.fillStyle = 'rgb(' + node.c[0] + ',' + node.c[1] + ',' + node.c[2] + ')';
      ctx.globalAlpha = .55;
      ctx.arc(node.x, node.y, node.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    for (var m = 0; m < rockets.length; m++) drawRocket(rockets[m]);
  }

  function frame() {
    step();
    draw();
    if (running) rafId = requestAnimationFrame(frame);
  }

  function start() {
    if (running || reduceMotion) return;
    running = true;
    rafId = requestAnimationFrame(frame);
  }
  function stop() {
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
  }

  function onMove(clientX, clientY) {
    var rect = canvas.getBoundingClientRect();
    var x = clientX - rect.left, y = clientY - rect.top;
    pointer.active = x >= 0 && x <= W && y >= 0 && y <= H;
    pointer.x = x; pointer.y = y;
  }

  window.addEventListener('mousemove', function (e) { onMove(e.clientX, e.clientY); }, { passive: true });
  window.addEventListener('mouseleave', function () { pointer.active = false; });
  window.addEventListener('touchmove', function (e) {
    if (e.touches && e.touches[0]) onMove(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: true });
  window.addEventListener('touchend', function () { pointer.active = false; });

  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 150);
  });

  var visState = { lastVisible: true };
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stop(); else if (visState.lastVisible) start();
  });

  if ('IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        visState.lastVisible = en.isIntersecting;
        if (en.isIntersecting && !document.hidden) start(); else stop();
      });
    }, { threshold: 0 });
    observer.observe(hero);
  } else {
    start();
  }

  resize();
  if (reduceMotion) draw(); // single static frame, no loop, no pointer reactivity
})();

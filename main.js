(function () {
  var root = document.documentElement;
  root.classList.add('js');

  /* ---------- Theme: light | dark | system ---------- */
  var buttons = document.querySelectorAll('[data-set-theme]');
  function stored() {
    try { return localStorage.getItem('theme') || 'system'; } catch (e) { return 'system'; }
  }
  function applyTheme(mode) {
    if (mode === 'light' || mode === 'dark') root.setAttribute('data-theme', mode);
    else root.removeAttribute('data-theme');
    try { mode === 'system' ? localStorage.removeItem('theme') : localStorage.setItem('theme', mode); } catch (e) {}
    buttons.forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.setTheme === mode)); });
    drawPixels();
  }
  buttons.forEach(function (b) {
    b.addEventListener('click', function () { applyTheme(b.dataset.setTheme); });
  });

  /* ---------- Mobile menu ---------- */
  var burger = document.querySelector('.burger');
  var menu = document.getElementById('menu');
  function setMenu(open) {
    menu.classList.toggle('open', open);
    burger.setAttribute('aria-expanded', String(open));
  }
  burger.addEventListener('click', function () { setMenu(!menu.classList.contains('open')); });
  menu.addEventListener('click', function (e) { if (e.target.tagName === 'A') setMenu(false); });

  /* ---------- Scroll reveal ---------- */
  var items = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.12 });
    items.forEach(function (el, i) {
      el.style.transitionDelay = (i % 4) * 70 + 'ms';
      io.observe(el);
    });
  } else {
    items.forEach(function (el) { el.classList.add('in'); });
  }

  /* ---------- Contact form ---------- */
  var form = document.getElementById('form');
  var status = document.getElementById('form-status');
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var btn = form.querySelector('button[type="submit"]');
    var data = {};
    new FormData(form).forEach(function (v, k) { data[k] = v; });
    btn.disabled = true;
    status.className = 'form-status';
    status.textContent = 'Sending…';
    fetch(form.getAttribute('action'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok) throw new Error(j.error || 'Something went wrong');
        form.reset();
        status.className = 'form-status ok';
        status.textContent = 'Thanks! We’ll get back to you within one business day.';
      });
    }).catch(function (err) {
      status.className = 'form-status err';
      status.textContent = err.message + '.';
    }).then(function () { btn.disabled = false; });
  });

  /* ---------- Pixel avatars (deterministic, symmetric) ---------- */
  document.querySelectorAll('.avatar').forEach(function (el) {
    var seed = +el.dataset.seed * 9301 + 49297;
    function rnd() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
    var hue = Math.floor(rnd() * 360);
    var cols = 7, rows = 7, html = '';
    for (var y = 0; y < rows; y++) {
      var row = [];
      for (var x = 0; x < 4; x++) row.push(rnd() > 0.5);
      row = row.concat(row.slice(0, 3).reverse());
      row.forEach(function (on) {
        html += '<i style="background:' + (on ? 'hsl(' + hue + ',70%,55%)' : 'hsl(' + hue + ',30%,50%,.12)') + '"></i>';
      });
    }
    el.innerHTML = html;
  });

  /* ---------- Hero pixel field ---------- */
  var canvas = document.getElementById('pixels');
  var ctx = canvas.getContext('2d');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var cell = 22, cols = 0, rows = 0, phase = [], raf = 0, mouse = { x: -999, y: -999 };

  function size() {
    var r = canvas.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = r.width * dpr; canvas.height = r.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cols = Math.ceil(r.width / cell); rows = Math.ceil(r.height / cell);
    phase = [];
    for (var i = 0; i < cols * rows; i++) phase.push(Math.random() * Math.PI * 2);
  }
  function rgb() {
    return getComputedStyle(root).getPropertyValue('--pixel').trim() || '10,143,79';
  }
  function drawPixels(t) {
    if (!cols) return;
    var c = rgb(), w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    t = (t || 0) / 1000;
    for (var y = 0; y < rows; y++) {
      for (var x = 0; x < cols; x++) {
        var p = phase[y * cols + x];
        var a = reduce ? 0.07 : 0.05 + 0.1 * (0.5 + 0.5 * Math.sin(t * 0.9 + p));
        var dx = x * cell + cell / 2 - mouse.x, dy = y * cell + cell / 2 - mouse.y;
        var d = Math.sqrt(dx * dx + dy * dy);
        if (d < 130) a += (1 - d / 130) * 0.55;
        ctx.fillStyle = 'rgba(' + c + ',' + a.toFixed(3) + ')';
        ctx.fillRect(x * cell + 2, y * cell + 2, cell - 4, cell - 4);
      }
    }
  }
  function loop(t) { drawPixels(t); raf = requestAnimationFrame(loop); }
  function start() {
    cancelAnimationFrame(raf);
    size();
    if (reduce) drawPixels(0); else raf = requestAnimationFrame(loop);
  }
  canvas.parentElement.addEventListener('pointermove', function (e) {
    var r = canvas.getBoundingClientRect();
    mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
  });
  canvas.parentElement.addEventListener('pointerleave', function () { mouse.x = mouse.y = -999; });
  window.addEventListener('resize', start);
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () { drawPixels(); });

  // Pause when hero is off-screen
  if ('IntersectionObserver' in window && !reduce) {
    new IntersectionObserver(function (en) {
      cancelAnimationFrame(raf);
      if (en[0].isIntersecting) raf = requestAnimationFrame(loop);
    }).observe(canvas.parentElement);
  }

  document.getElementById('year').textContent = new Date().getFullYear();
  applyTheme(stored());
  start();
})();

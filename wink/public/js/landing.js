/* W.I.N.K — landing deck interactions v2 */
(function () {
  'use strict';

  var slides = Array.prototype.slice.call(document.querySelectorAll('.slide'));
  var nav = document.getElementById('deckNav');
  var curEl = document.getElementById('curSlide');
  var totalEl = document.getElementById('totalSlides');
  var progress = document.getElementById('progress');
  totalEl.textContent = String(slides.length).padStart(2, '0');

  slides.forEach(function (s, i) {
    var dot = document.createElement('a');
    dot.href = '#' + s.id;
    dot.className = 'dot';
    dot.dataset.idx = i;
    nav.appendChild(dot);
  });
  var dots = Array.prototype.slice.call(nav.children);

  function updateProgress() {
    var h = document.documentElement;
    var max = h.scrollHeight - h.clientHeight;
    var pct = max > 0 ? (h.scrollTop / max) * 100 : 0;
    progress.style.width = pct + '%';
  }

  // Reveal on scroll + slide tracking
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        var idx = slides.indexOf(e.target);
        if (idx > -1) {
          dots.forEach(function (d) { d.classList.toggle('active', Number(d.dataset.idx) === idx); });
          curEl.textContent = String(idx + 1).padStart(2, '0');
          if (idx === 1) animateCounters();
        }
      }
    });
  }, { threshold: 0.25 });
  document.querySelectorAll('.reveal').forEach(function (el) { io.observe(el); });
  slides.forEach(function (s) { io.observe(s); });

  window.addEventListener('scroll', updateProgress, { passive: true });
  updateProgress();

  // pointer-follow glow on feature cards
  document.querySelectorAll('.feature').forEach(function (card) {
    card.addEventListener('pointermove', function (e) {
      var r = card.getBoundingClientRect();
      card.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100) + '%');
      card.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100) + '%');
    });
  });

  // Animated stat counters
  function animateCounters() {
    document.querySelectorAll('.stat-num[data-count]').forEach(function (el) {
      if (el.dataset.done) return;
      el.dataset.done = '1';
      var target = parseFloat(el.dataset.count);
      var decimals = parseInt(el.dataset.decimals || '0', 10);
      var suffix = el.dataset.suffix || '';
      var start = null;
      function tick(ts) {
        if (!start) start = ts;
        var p = Math.min((ts - start) / 1500, 1);
        var eased = 1 - Math.pow(1 - p, 3);
        var val = target * eased;
        el.textContent = (decimals ? val.toFixed(decimals) : Math.round(val).toLocaleString()) + suffix;
        if (p < 1) requestAnimationFrame(tick);
        else el.textContent = (decimals ? target.toFixed(decimals) : Math.round(target).toLocaleString()) + suffix;
      }
      requestAnimationFrame(tick);
    });
  }
})();

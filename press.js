/* Press and settle — adapted from BrewedOps Motion Library (buttons-press).
   Pressing scales a button to .94 in 90ms; releasing settles it back on a spring curve.
   Uses the Web Animations API on the individual `scale` property, so it layers on top of
   any existing transition/transform on the button instead of replacing it. */
(function () {
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var SEL = 'button:not(.faq-q), .push-btn, .nav-cta, .btn-resume-big';
  var SPRING = (window.CSS && CSS.supports && CSS.supports('animation-timing-function', 'linear(0,1)'))
    ? 'linear(0, 0.0941 5.6%, 0.2736 11.1%, 0.4548 16.7%, 0.6076 22.2%, 0.7255 27.8%, 0.8119 33.3%, 0.8732 38.9%, 0.9156 44.4%, 0.9444 50%, 0.9636 55.6%, 0.9764 61.1%, 0.9848 66.7%, 0.9902 72.2%, 0.9938 77.8%, 0.996 83.3%, 0.9975 88.9%, 0.9984 94.4%, 1 100%)'
    : 'cubic-bezier(.22,1,.36,1)';
  if (!document.documentElement.animate) return;
  var held = new WeakMap();

  function down(el) {
    if (held.has(el) || el.disabled || el.getAttribute('aria-disabled') === 'true') return;
    held.set(el, el.animate({ scale: ['1', '0.94'] }, { duration: 90, easing: 'ease-out', fill: 'forwards' }));
  }
  function up(el) {
    var a = held.get(el);
    if (!a) return;
    held.delete(el);
    var cur = getComputedStyle(el).scale;
    a.cancel();
    el.animate({ scale: [cur && cur !== 'none' ? cur : '1', '1'] }, { duration: 587, easing: SPRING });
  }

  document.addEventListener('pointerdown', function (e) {
    if (e.button !== 0) return;
    var el = e.target.closest && e.target.closest(SEL);
    if (el) down(el);
  }, true);
  ['pointerup', 'pointercancel'].forEach(function (t) {
    document.addEventListener(t, function () {
      document.querySelectorAll(SEL).forEach(function (el) { if (held.has(el)) up(el); });
    }, true);
  });
  document.addEventListener('pointerout', function (e) {
    var el = e.target.closest && e.target.closest(SEL);
    if (el && held.has(el) && !el.contains(e.relatedTarget)) up(el);
  }, true);
  document.addEventListener('keydown', function (e) {
    if (e.repeat) return;
    var el = e.target.closest && e.target.closest(SEL);
    if (!el) return;
    var isBtn = el.tagName === 'BUTTON';
    if (e.key === 'Enter' || (isBtn && e.key === ' ')) down(el);
  }, true);
  document.addEventListener('keyup', function (e) {
    var el = e.target.closest && e.target.closest(SEL);
    if (el && held.has(el)) up(el);
  }, true);
})();

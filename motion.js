/* ==========================================================================
   motion.js — GSAP + ScrollTrigger + SplitText + Lenis animation layer.
   Plain vanilla JS, no build step. Loaded after the vendor scripts and after
   the page's own inline scripts, so nothing existing is modified.
   If reduced motion is requested (or a library is missing) it does nothing
   and the site behaves exactly as it did before.
   ========================================================================== */
(function () {
  'use strict';

  var root = document.documentElement;
  var qs  = function (s, c) { return (c || document).querySelector(s); };
  var qsa = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  // Bail out cleanly: reduced motion, or libraries failed to load.
  if (!root.classList.contains('has-motion')) return;
  if (!window.gsap || !window.ScrollTrigger) {
    root.classList.remove('has-motion', 'm-arriving');
    return;
  }

  gsap.registerPlugin.apply(gsap, [ScrollTrigger].concat(window.SplitText ? [SplitText] : []));
  ScrollTrigger.config({ ignoreMobileResize: true });
  window.__motionReady = true;

  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var EASE_OUT = 'expo.out';

  /* ------------------------------------------------------------------
     1. LENIS smooth scrolling, driven by GSAP's ticker so ScrollTrigger
        and Lenis share one clock.
     ------------------------------------------------------------------ */
  var lenis = null;
  (function initLenis() {
    if (!window.Lenis) return;

    // Let nested scrollers (modals, terminals, code boxes) scroll natively.
    function insideScroller(node) {
      while (node && node !== document.body && node.nodeType === 1) {
        if (node.hasAttribute('data-lenis-prevent')) return true;
        var oy = getComputedStyle(node).overflowY;
        if ((oy === 'auto' || oy === 'scroll') && node.scrollHeight > node.clientHeight + 2) return true;
        node = node.parentElement;
      }
      return false;
    }

    lenis = new Lenis({
      lerp: 0.1,
      smoothWheel: true,
      anchors: { offset: -90 },       // clear the fixed navbar for #hash links
      prevent: insideScroller
    });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);

    // Freeze page scroll while the site's modals / lightbox are open.
    var lock = function () {
      var b = document.body;
      if (b.classList.contains('modal-open') || b.classList.contains('viewer-open')) lenis.stop();
      else lenis.start();
    };
    new MutationObserver(lock).observe(document.body, { attributes: true, attributeFilter: ['class'] });
    lock();
  })();

  /* ------------------------------------------------------------------
     2. PAGE TRANSITION (leave + arrive)
     ------------------------------------------------------------------ */
  var pt = document.createElement('div');
  pt.className = 'm-pt';
  pt.setAttribute('aria-hidden', 'true');
  pt.innerHTML = '<div class="m-pt__a"></div><div class="m-pt__b"><span class="m-pt__label"></span></div>';
  document.body.appendChild(pt);
  var ptA = qs('.m-pt__a', pt), ptB = qs('.m-pt__b', pt), ptLabel = qs('.m-pt__label', pt);
  var leaving = false;

  function resetPT() {
    leaving = false;
    pt.classList.remove('is-on', 'is-block');
    gsap.set([ptA, ptB], { clipPath: 'inset(100% 0% 0% 0%)' });
    gsap.set(ptB, { opacity: 1 });
    gsap.set(ptLabel, { opacity: 0 });
  }
  resetPT();

  function leave(href, label) {
    if (leaving) return;
    leaving = true;
    try { sessionStorage.setItem('mtIn', '1'); sessionStorage.setItem('mtLabel', label || ''); } catch (e) {}
    ptLabel.textContent = label || '';
    pt.classList.add('is-on', 'is-block');
    if (lenis) lenis.stop();
    var went = false;
    var go = function () { if (went) return; went = true; window.location.href = href; };
    // Soft fade-through: the page dims into the site background, the next page fades up out of it.
    gsap.set(ptA, { clipPath: 'inset(100% 0% 0% 0%)' });
    gsap.fromTo(ptB, { clipPath: 'inset(0% 0% 0% 0%)', opacity: 0 }, { opacity: 1, duration: 0.42, ease: 'power2.inOut', onComplete: go });
    setTimeout(go, 1800); // never trap the visitor
  }

  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a || (a.target && a.target !== '_self') || a.hasAttribute('download')) return;
    var u;
    try { u = new URL(a.href, location.href); } catch (err) { return; }
    if (u.protocol !== location.protocol || u.host !== location.host) return;             // external
    if (u.pathname === location.pathname && u.search === location.search) return;         // same page / #hash
    if (!/(\.html?|\/)$/.test(u.pathname)) return;                                         // files, mailto…
    if (/\/work\.html$/.test(u.pathname)) return;   // keep the site's existing blur-crossfade into Work
    e.preventDefault();
    var txt = (a.textContent || '').replace(/\s+/g, ' ').trim();
    leave(u.href, txt.length && txt.length <= 22 ? txt : '');
  }, false);

  // Back/forward cache: restoring a page must not leave the cover up.
  window.addEventListener('pageshow', function (ev) { if (ev.persisted) { resetPT(); if (lenis) lenis.start(); } });

  /* ------------------------------------------------------------------
     3. SMALL, ALWAYS-ON PIECES: progress bar, cursor, magnetic buttons,
        mobile menu stagger
     ------------------------------------------------------------------ */
  (function progress() {
    var bar = document.createElement('div');
    bar.className = 'm-progress';
    bar.setAttribute('aria-hidden', 'true');
    document.body.appendChild(bar);
    gsap.to(bar, { scaleX: 1, ease: 'none',
      scrollTrigger: { start: 0, end: 'max', scrub: 0.2 } });
  })();

  if (finePointer) {
    (function cursor() {
      var c = document.createElement('div');
      c.className = 'm-cursor';
      c.setAttribute('aria-hidden', 'true');
      document.body.appendChild(c);
      var cx = gsap.quickTo(c, 'x', { duration: 0.35, ease: 'power3.out' });
      var cy = gsap.quickTo(c, 'y', { duration: 0.35, ease: 'power3.out' });
      var sc = gsap.quickTo(c, 'scale', { duration: 0.4, ease: 'power3.out' });
      var shown = false;
      var HOT = 'a[href], button, [role="button"], summary, label, input, textarea, select, .svc-card, .work-card, .faq-item';
      window.addEventListener('pointermove', function (e) {
        if (e.pointerType && e.pointerType !== 'mouse') return;
        if (!shown) { shown = true; gsap.set(c, { x: e.clientX, y: e.clientY }); gsap.to(c, { opacity: 0.55, duration: 0.4 }); }
        cx(e.clientX); cy(e.clientY);
        var hot = e.target.closest && e.target.closest(HOT);
        c.classList.toggle('is-hover', !!hot);
        sc(hot ? 1.7 : 1);
      }, { passive: true });
      window.addEventListener('pointerdown', function () { c.classList.add('is-down'); sc(0.8); });
      window.addEventListener('pointerup',   function () { c.classList.remove('is-down'); });
      document.documentElement.addEventListener('mouseleave', function () { gsap.to(c, { opacity: 0, duration: 0.3 }); shown = false; });
    })();

    (function magnetic() {
      qsa('.push-btn, .nav-cta, .theme-btn').forEach(function (el) {
        var xTo = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'power3.out' });
        var yTo = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'power3.out' });
        el.addEventListener('pointermove', function (e) {
          var r = el.getBoundingClientRect();
          xTo((e.clientX - r.left - r.width / 2) * 0.22);
          yTo((e.clientY - r.top - r.height / 2) * 0.32);
        });
        el.addEventListener('pointerleave', function () { xTo(0); yTo(0); });
      });
    })();
  }

  (function mobileMenu() {
    var panel = qs('#navMobilePanel');
    if (!panel) return;
    var was = panel.classList.contains('open');
    new MutationObserver(function () {
      var now = panel.classList.contains('open');
      if (now && !was) {
        gsap.fromTo(qsa('.nav-mobile-links li, .nav-cta-mobile', panel),
          { y: 22, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.7, stagger: 0.06, ease: 'power3.out', delay: 0.08, clearProps: 'transform,opacity' });
      }
      was = now;
    }).observe(panel, { attributes: true, attributeFilter: ['class'] });
  })();

  /* ------------------------------------------------------------------
     4. CONTENT ANIMATIONS (run once the arrival cover has lifted)
     ------------------------------------------------------------------ */

  // 4a. Navbar entrance
  function navIntro() {
    if (root.classList.contains('curtain-in')) return;        // work.html arrival already fades the page in
    var nav = qs('#navbar');
    if (!nav) return;
    gsap.from(nav, { y: -36, opacity: 0, duration: 1, ease: 'power3.out', clearProps: 'transform,opacity' });
    gsap.from(qsa('.nav-logo, .nav-links li, .nav-right > *', nav),
      { y: -14, opacity: 0, duration: 0.8, stagger: 0.05, delay: 0.15, ease: 'power3.out', clearProps: 'transform,opacity' });
  }

  // 4b. Cinematic hero (index.html)
  function heroIntro(done) {
    var hero = qs('#hero');
    var lines = qsa('#hero .split-line > span');
    if (!hero || !lines.length) { root.classList.add('m-hero-done'); done && done(); return; }

    var badge = qs('#hero .hero-badge'), sub = qs('#hero .hero-sub');
    var btns  = qsa('#hero .hero-btns > *'), proof = qs('#hero .hero-proof');
    var frame = qs('#hero .hero-photo-frame');
    var all = [badge, sub, proof, frame].concat(btns, lines).filter(Boolean);

    gsap.set(lines, { yPercent: 115, y: 0, rotate: 3, transformOrigin: '0% 100%' });

    var tl = gsap.timeline({
      defaults: { ease: EASE_OUT },
      onComplete: function () {
        root.classList.add('m-hero-done');          // releases the CSS "start hidden" rules
        gsap.set(all, { clearProps: 'transform,opacity,clipPath,rotate' });
        done && done();
      }
    });
    tl.fromTo(badge, { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: 1 }, 0)
      .to(lines, { yPercent: 0, rotate: 0, duration: 1.5, stagger: 0.16 }, 0.12)
      .fromTo(sub, { y: 26, opacity: 0 }, { y: 0, opacity: 1, duration: 1.1 }, 0.65)
      .fromTo(btns, { y: 22, opacity: 0, scale: 0.96 }, { y: 0, opacity: 1, scale: 1, duration: 1, stagger: 0.1 }, 0.8)
      .fromTo(proof, { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 1.1 }, 1.0);
    if (frame) {
      tl.fromTo(frame,
        { clipPath: 'inset(0% 0% 100% 0%)', scale: 1.1, opacity: 1 },
        { clipPath: 'inset(0% 0% 0% 0%)', scale: 1, duration: 1.7, ease: 'expo.inOut' }, 0.2);
    }
  }

  // 4c. Headings: split into masked lines, rise in staggered
  function headings() {
    if (!window.SplitText) return;
    var targets = qsa('.section-heading, .cta-band h3');
    targets.forEach(function (el) {
      // The legacy .reveal fade would double up with the line animation — hand it over.
      if (el.classList.contains('reveal')) el.classList.add('visible', 'm-done');
      try {
        SplitText.create(el, {
          type: 'lines', mask: 'lines', linesClass: 'm-line', aria: 'auto', autoSplit: true,
          onSplit: function (self) {
            return gsap.from(self.lines, {
              yPercent: 110, rotate: 2, transformOrigin: '0% 100%',
              duration: 1.2, ease: 'power4.out', stagger: 0.1,
              scrollTrigger: { trigger: el, start: 'top 88%', once: true }
            });
          }
        });
      } catch (err) { el.classList.add('visible', 'm-done'); }
    });
    return targets;
  }

  // 4d. Staggered scroll reveals for everything else that was a .reveal
  function reveals(skip) {
    var items = qsa('.reveal').filter(function (el) {
      return !el.closest('#hero') &&
             skip.indexOf(el) < 0 &&
             !el.matches('.svc-card, .tool-chip');     // these keep their own bespoke entrance / tilt
    });
    if (!items.length) return;

    function finish(el) {
      el.classList.add('visible', 'm-done');
      gsap.set(el, { clearProps: 'opacity,transform' });  // hand back to CSS so hover transforms work
    }
    function show(els) {
      els = els.filter(function (el) { return !el._mShown; });
      if (!els.length) return;
      els.forEach(function (el) { el._mShown = true; });
      gsap.to(els, {
        opacity: 1, y: 0, duration: 1, ease: 'power3.out', stagger: 0.09, overwrite: 'auto',
        onComplete: function () { els.forEach(finish); }
      });
    }

    gsap.set(items, { opacity: 0, y: 34 });
    ScrollTrigger.batch(items, {
      start: 'top 90%', once: true, interval: 0.1, batchMax: 8, onEnter: show
    });

    // Fail-safes: an item that is on screen but was never triggered (e.g. a card
    // un-hidden by the Work filter) still appears; keyboard focus reveals too.
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        setTimeout(function () { show([e.target]); }, 900);
      });
    }, { threshold: 0.05 });
    items.forEach(function (el) { io.observe(el); });
    document.addEventListener('focusin', function (e) {
      var host = e.target.closest && e.target.closest('.reveal');
      if (host && items.indexOf(host) > -1) show([host]);
    });
  }

  // 4e. Subtle parallax (desktop / tablet only)
  function parallax() {
    var mm = gsap.matchMedia();
    mm.add('(min-width: 900px)', function () {
      if (qs('#hero .hero-photo-col')) {
        gsap.to('#hero .hero-photo-col', { yPercent: -9, ease: 'none',
          scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: 0.6 } });
      }
      if (qs('#hero .hero-left')) {
        gsap.to('#hero .hero-left', { y: 48, ease: 'none',
          scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: 0.6 } });
      }
      // Opt-in anywhere: <div data-parallax="0.15"> (positive = drifts up, negative = down)
      qsa('[data-parallax]').forEach(function (el) {
        var k = parseFloat(el.getAttribute('data-parallax')) || 0.1;
        gsap.fromTo(el, { y: 90 * k }, { y: -90 * k, ease: 'none',
          scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: 0.6 } });
      });
    });
  }

  // 4f. Footer
  function footer() {
    var f = qs('footer');
    if (!f) return;
    var kids = qsa('.footer-top > *, .footer-bottom > *', f);
    if (!kids.length) return;
    gsap.from(kids, { y: 26, opacity: 0, duration: 1, stagger: 0.08, ease: 'power3.out',
      clearProps: 'transform,opacity',
      scrollTrigger: { trigger: f, start: 'top 94%', once: true } });
  }

  function initContent() {
    navIntro();
    heroIntro();
    reveals(headings() || []);
    parallax();
    footer();
    ScrollTrigger.refresh();
  }

  /* ------------------------------------------------------------------
     5. BOOT: wait for fonts (so line splits are accurate), play the
        arrival transition if we came from another page, then start.
     ------------------------------------------------------------------ */
  var started = false;
  function start() {
    if (started) return; started = true;

    var arriving = root.classList.contains('m-arriving');
    if (arriving) {
      var label = '';
      try { label = sessionStorage.getItem('mtLabel') || ''; sessionStorage.removeItem('mtIn'); sessionStorage.removeItem('mtLabel'); } catch (e) {}
      ptLabel.textContent = '';
      pt.classList.add('is-on');
      gsap.set(ptA, { clipPath: 'inset(100% 0% 0% 0%)' });
      gsap.set(ptB, { clipPath: 'inset(0% 0% 0% 0%)', opacity: 1 });
      gsap.set(ptLabel, { opacity: 0 });
      root.classList.remove('m-arriving');           // JS cover is in place → drop the CSS one
      gsap.timeline({ onComplete: resetPT })
        .to(ptB, { opacity: 0, duration: 0.7, ease: 'power2.out' }, 0.05)
        .add(initContent, 0.2);
    } else {
      initContent();
    }
  }

  var fontsReady = (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve();
  var gate = Promise.race([fontsReady, new Promise(function (r) { setTimeout(r, 900); })]);
  var go = function () { gate.then(start); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();

  /* ------------------------------------------------------------------
     6. KEEP TRIGGERS ACCURATE as the page changes height (filters,
        accordions, simulator, late images)
     ------------------------------------------------------------------ */
  window.addEventListener('load', function () { setTimeout(function () { ScrollTrigger.refresh(); }, 120); });
  (function watchHeight() {
    if (!window.ResizeObserver) return;
    var last = document.body.scrollHeight, t;
    new ResizeObserver(function () {
      clearTimeout(t);
      t = setTimeout(function () {
        var h = document.body.scrollHeight;
        if (Math.abs(h - last) > 2) { last = h; ScrollTrigger.refresh(); }
      }, 250);
    }).observe(document.body);
  })();
  document.addEventListener('click', function (e) {
    if (e.target.closest && e.target.closest('.filter-btn')) setTimeout(function () { ScrollTrigger.refresh(); }, 450);
  });
})();

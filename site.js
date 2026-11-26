// ══════════════════════════════════════
// AI CIRCUIT BOARD — animated gold PCB-trace background
// ══════════════════════════════════════
(function () {
  const canvas = document.getElementById('ai-lines-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H, DPR;
  let traces = [];
  let chips = [];
  let running = true;

  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    build();
  }

  function rand(a, b) { return a + Math.random() * (b - a); }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  // Build an orthogonal (right-angle) PCB-style trace: a sequence of
  // horizontal/vertical segments, like real circuit board routing.
  function buildTrace(grid) {
    const segCount = Math.floor(rand(4, 8));
    let x = Math.round(rand(0, W) / grid) * grid;
    let y = Math.round(rand(0, H) / grid) * grid;
    const pts = [{ x, y }];
    for (let i = 0; i < segCount; i++) {
      const vertical = Math.random() < 0.82; // strongly biased vertical
      if (vertical) {
        const len = Math.round(rand(2, 5)) * grid; // longer vertical runs
        y += Math.random() < 0.5 ? len : -len;
      } else {
        const len = grid; // small horizontal connector between vertical runs
        x += Math.random() < 0.5 ? len : -len;
      }
      pts.push({ x, y });
    }
    // precompute cumulative length for pulse travel
    let total = 0;
    const segs = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      const d = Math.abs(b.x - a.x) + Math.abs(b.y - a.y);
      segs.push({ a, b, d });
      total += d;
    }
    return { pts, segs, total, t: Math.random(), speed: rand(0.00025, 0.0006) };
  }

  function pointOnTrace(tr, t) {
    let target = t * tr.total;
    for (const s of tr.segs) {
      if (target <= s.d || s === tr.segs[tr.segs.length - 1]) {
        const ratio = s.d === 0 ? 0 : Math.min(target / s.d, 1);
        return { x: s.a.x + (s.b.x - s.a.x) * ratio, y: s.a.y + (s.b.y - s.a.y) * ratio };
      }
      target -= s.d;
    }
    return tr.pts[0];
  }

  function build() {
    const grid = 42;
    const count = W < 700 ? 12 : 24;
    traces = [];
    for (let i = 0; i < count; i++) traces.push(buildTrace(grid));

    chips = [];
  }

  function isLight() {
    return document.documentElement.getAttribute('data-theme') === 'light';
  }

  function drawTraceStatic(tr) {
    const light = isLight();
    ctx.beginPath();
    ctx.moveTo(tr.pts[0].x, tr.pts[0].y);
    for (let i = 1; i < tr.pts.length; i++) ctx.lineTo(tr.pts[i].x, tr.pts[i].y);
    ctx.strokeStyle = light ? 'rgba(120,84,20,0.4)' : 'rgba(217,164,65,0.34)';
    ctx.lineWidth = 1.3;
    ctx.stroke();

    // small junction dots at bends
    ctx.fillStyle = light ? 'rgba(120,84,20,0.55)' : 'rgba(217,164,65,0.48)';
    for (let i = 1; i < tr.pts.length - 1; i++) {
      ctx.beginPath();
      ctx.arc(tr.pts[i].x, tr.pts[i].y, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawChip(c) {
    const half = c.size / 2;
    ctx.strokeStyle = 'rgba(217,164,65,0.28)';
    ctx.lineWidth = 1;
    ctx.strokeRect(c.x - half, c.y - half, c.size, c.size);

    // pin ticks on each side
    ctx.strokeStyle = 'rgba(217,164,65,0.22)';
    const step = c.size / (c.pins + 1);
    for (let i = 1; i <= c.pins; i++) {
      const off = -half + step * i;
      // top & bottom
      ctx.beginPath(); ctx.moveTo(c.x + off, c.y - half); ctx.lineTo(c.x + off, c.y - half - 6); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(c.x + off, c.y + half); ctx.lineTo(c.x + off, c.y + half + 6); ctx.stroke();
      // left & right
      ctx.beginPath(); ctx.moveTo(c.x - half, c.y + off); ctx.lineTo(c.x - half - 6, c.y + off); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(c.x + half, c.y + off); ctx.lineTo(c.x + half + 6, c.y + off); ctx.stroke();
    }

    // soft glow core
    const grad = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, c.size * 0.9);
    grad.addColorStop(0, 'rgba(217,164,65,0.08)');
    grad.addColorStop(1, 'rgba(217,164,65,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(c.x - c.size, c.y - c.size, c.size * 2, c.size * 2);
  }

  function draw() {
    if (!running) return;
    ctx.clearRect(0, 0, W, H);

    chips.forEach(drawChip);

    traces.forEach(tr => {
      drawTraceStatic(tr);
      const light = isLight();

      tr.t += tr.speed;
      if (tr.t > 1) tr.t = 0;
      const p = pointOnTrace(tr, tr.t);
      const fade = Math.sin(tr.t * Math.PI);

      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 14);
      if (light) {
        grad.addColorStop(0, 'rgba(140,98,20,' + (0.9 * fade) + ')');
        grad.addColorStop(0.4, 'rgba(120,84,20,' + (0.45 * fade) + ')');
        grad.addColorStop(1, 'rgba(120,84,20,0)');
      } else {
        grad.addColorStop(0, 'rgba(247,231,159,' + (0.85 * fade) + ')');
        grad.addColorStop(0.4, 'rgba(217,164,65,' + (0.4 * fade) + ')');
        grad.addColorStop(1, 'rgba(217,164,65,0)');
      }
      ctx.beginPath();
      ctx.fillStyle = grad;
      ctx.arc(p.x, p.y, 14, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.fillStyle = light ? 'rgba(80,56,10,' + (0.9 * fade) + ')' : 'rgba(253,246,227,' + (0.9 * fade) + ')';
      ctx.arc(p.x, p.y, 1.7, 0, Math.PI * 2);
      ctx.fill();
    });

    requestAnimationFrame(draw);
  }

  resize();
  window.addEventListener('resize', resize);

  if (reduceMotion) {
    chips.forEach(drawChip);
    traces.forEach(drawTraceStatic);
  } else {
    requestAnimationFrame(draw);
  }

  document.addEventListener('visibilitychange', () => {
    running = !document.hidden;
    if (running && !reduceMotion) requestAnimationFrame(draw);
  });
})();

// ══════════════════════════════════════
// THEME TOGGLE
// ══════════════════════════════════════
const html = document.documentElement;
const themeToggle = document.getElementById('themeToggle');
const themeIcon = document.getElementById('themeIcon');
let isDark = true;

function setTheme(dark) {
  isDark = dark;
  html.setAttribute('data-theme', dark ? 'dark' : 'light');
  themeIcon.classList.add('swap');
  setTimeout(() => {
    themeIcon.textContent = dark ? '🌙' : '☀️';
    themeIcon.classList.remove('swap');
  }, 175);
  localStorage.setItem('theme', dark ? 'dark' : 'light');

  // Keep the Cal.com booking widget in sync with the site's theme
  if (window.Cal && window.__calBookingNamespace && window.Cal.ns && window.Cal.ns[window.__calBookingNamespace]) {
    try {
      window.Cal.ns[window.__calBookingNamespace]('ui', { theme: dark ? 'dark' : 'light' });
    } catch (e) { /* Cal not ready yet — initial embed config already matches current theme */ }
  }
}

themeToggle.addEventListener('click', () => setTheme(!isDark));

// Restore saved theme
const saved = localStorage.getItem('theme');
if (saved === 'light') setTheme(false);

// ══════════════════════════════════════

// ══════════════════════════════════════
// INTERACTIVE CARDS — tilt, cursor spotlight, ghost numerals
// ══════════════════════════════════════
(function () {
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cards = document.querySelectorAll('.svc-card');

  cards.forEach(card => {
    // Ghost number pulled from the visible "00 · AI ASSISTANT" label
    const numEl = card.querySelector('.svc-num');
    if (numEl) {
      const match = numEl.textContent.match(/\d+/);
      if (match) card.setAttribute('data-num-big', match[0]);
    }

    // Cursor-tracking spotlight layer
    const spotlight = document.createElement('div');
    spotlight.className = 'svc-spotlight';
    card.insertBefore(spotlight, card.firstChild);

    if (reduceMotion) return;

    // Fluid, spring-like tilt: mousemove sets a target, a rAF loop eases
    // the current transform toward it every frame so motion stays smooth
    // even when the cursor darts between edges or corners.
    let targetRX = 0, targetRY = 0, targetScale = 1, targetTY = 0;
    let curRX = 0, curRY = 0, curScale = 1, curTY = 0;
    let raf = null;
    const ease = 0.14;
    const settleThreshold = 0.01;

    function animate() {
      curRX += (targetRX - curRX) * ease;
      curRY += (targetRY - curRY) * ease;
      curScale += (targetScale - curScale) * ease;
      curTY += (targetTY - curTY) * ease;

      card.style.transform = `perspective(900px) rotateX(${curRX}deg) rotateY(${curRY}deg) translateY(${curTY}px) scale(${curScale})`;

      const settled =
        Math.abs(targetRX - curRX) < settleThreshold &&
        Math.abs(targetRY - curRY) < settleThreshold &&
        Math.abs(targetTY - curTY) < settleThreshold &&
        Math.abs(targetScale - curScale) < 0.0004;

      if (!settled) {
        raf = requestAnimationFrame(animate);
      } else {
        raf = null;
      }
    }

    card.addEventListener('mousemove', e => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      card.style.setProperty('--mx', x + 'px');
      card.style.setProperty('--my', y + 'px');

      const px = (x / rect.width) - 0.5;
      const py = (y / rect.height) - 0.5;
      targetRY = px * 9;
      targetRX = py * -9;
      targetScale = 1.016;
      targetTY = -7;

      if (!raf) raf = requestAnimationFrame(animate);
    });

    card.addEventListener('mouseleave', () => {
      targetRX = 0; targetRY = 0; targetScale = 1; targetTY = 0;
      if (!raf) raf = requestAnimationFrame(animate);
    });
  });
})();

// ══════════════════════════════════════
(function () {
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) return;
  const icons = document.querySelectorAll('.tool-chip-icon');

  icons.forEach(icon => {
    let targetRX = 0, targetRY = 0, targetScale = 1;
    let curRX = 0, curRY = 0, curScale = 1;
    let raf = null;
    const ease = 0.16;
    const settleThreshold = 0.02;

    function animate() {
      curRX += (targetRX - curRX) * ease;
      curRY += (targetRY - curRY) * ease;
      curScale += (targetScale - curScale) * ease;

      icon.style.transform = `perspective(300px) rotateX(${curRX}deg) rotateY(${curRY}deg) scale(${curScale})`;

      const settled =
        Math.abs(targetRX - curRX) < settleThreshold &&
        Math.abs(targetRY - curRY) < settleThreshold &&
        Math.abs(targetScale - curScale) < 0.0004;

      if (!settled) {
        raf = requestAnimationFrame(animate);
      } else {
        raf = null;
      }
    }

    icon.addEventListener('mousemove', e => {
      const rect = icon.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const px = (x / rect.width) - 0.5;
      const py = (y / rect.height) - 0.5;
      targetRY = px * 26;
      targetRX = py * -26;
      targetScale = 1.12;

      if (!raf) raf = requestAnimationFrame(animate);
    });

    icon.addEventListener('mouseleave', () => {
      targetRX = 0; targetRY = 0; targetScale = 1;
      if (!raf) raf = requestAnimationFrame(animate);
    });
  });
})();
const obs = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); } });
}, { threshold: 0.08, rootMargin: '0px 0px -24px 0px' });
document.querySelectorAll('.reveal').forEach(el => obs.observe(el));

// NAV shadow
// ══════════════════════════════════════
// BLUR CROSSFADE — "See My Work" → work.html
// (concept: BrewedOps Motion Library, "Crossfade with blur")
// ══════════════════════════════════════
(function () {
  const link = document.querySelector('a.btn-ghost[href="work.html"]');
  if (!link || !document.documentElement.animate) return;
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const EASE = 'cubic-bezier(.32,.72,0,1)';
  let leaving = null;

  link.addEventListener('click', e => {
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    if (reduceMotion) return;
    e.preventDefault();
    if (leaving) return;
    const href = link.href;
    try { sessionStorage.setItem('blurIn', '1'); } catch (_) {}
    // Fade the page content (not the background canvas) so the dark backdrop never flashes
    const parts = Array.from(document.body.children).filter(el => !el.matches('script,style,link,canvas,#aurora-mesh,#pageCurtain'));
    const anims = parts.map(el => el.animate(
      [{ opacity: 1, filter: 'blur(0px)', transform: 'none' },
       { opacity: 0, filter: 'blur(7px)', transform: 'scale(1.03)' }],
      { duration: 700, easing: EASE, fill: 'forwards' }));
    leaving = { cancel: () => anims.forEach(a => a.cancel()) };
    let went = false;
    const go = () => { if (went) return; went = true; window.location.href = href; };
    setTimeout(go, 700);
  });

  // Returning via the browser's back button: undo the fade-out
  window.addEventListener('pageshow', ev => {
    if (ev.persisted && leaving) { leaving.cancel(); leaving = null; }
  });
})();

(function(){
  const nb = document.getElementById('navbar');
  const upd = () => {
    nb.classList.toggle('shadow', window.scrollY > 20);
    const y = window.scrollY, on = nb.classList.contains('pill');
    if (!on && y > 40) nb.classList.add('pill');
    else if (on && y < 8) nb.classList.remove('pill');
  };
  window.addEventListener('scroll', upd, { passive: true });
  upd();
})();

// MOBILE NAV BURGER
const navBurger = document.getElementById('navBurger');
const navMobilePanel = document.getElementById('navMobilePanel');
if (navBurger && navMobilePanel) {
  navBurger.addEventListener('click', () => {
    const open = navMobilePanel.classList.toggle('open');
    navBurger.classList.toggle('open', open);
    navBurger.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  navMobilePanel.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
    navMobilePanel.classList.remove('open');
    navBurger.classList.remove('open');
    navBurger.setAttribute('aria-expanded', 'false');
  }));
}

// ══════════════════════════════════════
// PORTFOLIO LIGHTBOX
// ══════════════════════════════════════
(function() {
  if (!document.getElementById('port-modal')) return;
  const modal = document.getElementById('port-modal');
  const modalImg = document.getElementById('modal-img');
  const modalTitle = document.getElementById('modal-title');
  const modalGroup = document.getElementById('modal-group');
  const closeBtn = document.getElementById('modal-close');
  const prevBtn = document.getElementById('modal-prev');
  const nextBtn = document.getElementById('modal-next');

  let allCards = [], currentIdx = 0;

  function openModal(idx) {
    currentIdx = idx;
    const card = allCards[idx];
    modalImg.src = card.dataset.img;
    modalTitle.textContent = card.dataset.title;
    modalGroup.textContent = card.dataset.group;
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    prevBtn.style.opacity = idx > 0 ? '1' : '0.3';
    nextBtn.style.opacity = idx < allCards.length - 1 ? '1' : '0.3';
  }

  function closeModal() {
    modal.classList.remove('active');
    document.body.style.overflow = '';
    setTimeout(() => { modalImg.src = ''; }, 300);
  }

  function navigate(dir) {
    const newIdx = currentIdx + dir;
    if (newIdx >= 0 && newIdx < allCards.length) openModal(newIdx);
  }

  document.addEventListener('DOMContentLoaded', () => {
    allCards = Array.from(document.querySelectorAll('.port-card'));

    // Set group counts
    ['pg1','pg2','pg3'].forEach(id => {
      const grid = document.getElementById(id);
      const countEl = document.getElementById(id + '-count');
      if (grid && countEl) countEl.textContent = grid.querySelectorAll('.port-card').length + ' projects';
    });

    allCards.forEach((card, idx) => {
      card.addEventListener('click', () => openModal(idx));
    });

    closeBtn.addEventListener('click', closeModal);
    prevBtn.addEventListener('click', () => navigate(-1));
    nextBtn.addEventListener('click', () => navigate(1));

    modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });

    document.addEventListener('keydown', e => {
      if (!modal.classList.contains('active')) return;
      if (e.key === 'Escape') closeModal();
      if (e.key === 'ArrowLeft') navigate(-1);
      if (e.key === 'ArrowRight') navigate(1);
    });
  });
})();

// ══════════════════════════════════════
// LIVE AUTOMATION SIMULATOR — MULTI-INDUSTRY
// ══════════════════════════════════════
(function () {
  const runBtn = document.getElementById('pgRunBtn');
  const runLabel = document.getElementById('pgRunLabel');
  const consoleBody = document.getElementById('pgConsoleBody');
  const result = document.getElementById('pgResult');
  const stepsWrap = document.getElementById('pgSteps');
  const tabsWrap = document.getElementById('indTabs');
  const attrib = document.getElementById('indAttrib');
  if (!runBtn || !stepsWrap || !tabsWrap) return;

  const scenarios = [
    {
      id: 'ecom',
      tab: '🛒 E-commerce',
      badge: 'Recovered Cart',
      steps: [
        { icon: '🛒', label: 'Trigger', title: 'Cart Abandoned', desc: 'Make.com watches the store and catches the checkout drop-off 20 minutes later', badge: 'trigger' },
        { icon: '🔎', label: 'Step 01', title: 'Cart Data Formatted', desc: 'Make.com cleans email, items, and cart value into one payload', badge: 'action' },
        { icon: '🤖', label: 'Step 02', title: 'AI Writes Follow-up', desc: 'Make.com AI Agent (Claude) drafts a personalized recovery email', badge: 'action' },
        { icon: '<svg viewBox="0 0 24 24" width="26" height="26" xmlns="http://www.w3.org/2000/svg" style="display:block;margin:0 auto" fill="#EA4335"><path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z"/></svg>', label: 'Step 03', title: 'Email Queued', desc: 'Sent through Gmail, orchestrated by Make.com', badge: 'action' },
        { icon: '📊', label: 'Step 04', title: 'Logged to Sheet', desc: 'Make.com appends the recovery attempt to Google Sheets', badge: 'action' },
        { icon: '✅', label: 'Done', title: 'Team Notified', desc: 'Make.com pings Slack if cart value is over $200', badge: 'done' }
      ],
      logLines: [
        'Trigger fired → cart abandoned 20 minutes ago ($214.50, 3 items) via Make.com',
        'Make.com → payload formatted: email ✓  3 items ✓  cart value ✓',
        'Make.com AI Agent (Claude) → drafting recovery email... tone: friendly, 10% offer included',
        'Gmail → email queued, send-time optimized for 6:00 PM local',
        'Make.com → row appended to "Cart Recovery Log" in Google Sheets',
        'Make.com → Slack #sales notified: high-value cart ($214.50) recovery sent'
      ],
      result: 'data formatted by Make.com, an AI-personalized recovery email drafted and sent via Gmail, and everything logged — with zero manual follow-up.',
      stepDelay: 650,
      aiExtra: 1500
    },
    {
      id: 'coaching',
      tab: '🎯 Coaching',
      badge: 'Discovery Call',
      noTimer: true,
      steps: [
        { icon: '📋', label: 'Trigger', title: 'Application Submitted', desc: 'Make.com watches the form and catches the discovery call submission', badge: 'trigger' },
        { icon: '🔎', label: 'Step 01', title: 'Answers Formatted', desc: 'Make.com parses goals, budget, and timeline from the form', badge: 'action' },
        { icon: '🤖', label: 'Step 02', title: 'AI Fit Score', desc: 'Make.com AI Agent (Claude) scores lead fit against your ideal client profile', badge: 'action' },
        { icon: '📞', label: 'Step 03', title: 'AI Voice Call Placed', desc: 'Vapi voice agent calls the prospect to confirm interest and availability', badge: 'action' },
        { icon: '{}', label: 'Step 04', title: 'Call Outcome Checked', desc: 'IF the prospect confirms on the call → continue to booking. IF not → log the outcome and end.', badge: 'condition' },
        { icon: '📊', label: 'Step 05', title: 'Logged in GoHighLevel', desc: 'Prospect added to your GHL pipeline with an AI summary', badge: 'action' },
        { icon: '📅', label: 'Step 06', title: 'Call Auto-Booked', desc: 'GoHighLevel calendar link sent, high-fit leads prioritized', badge: 'action' },
        { icon: '📈', label: 'Step 07', title: 'Logged to Sheets', desc: 'Prospect appended to a Google Sheets pipeline tracker for reporting', badge: 'action' },
        { icon: '🗒️', label: 'Step 08', title: 'Logged to Notion', desc: 'Call summary and AI notes saved to your Notion client database', badge: 'action' },
        { icon: '📌', label: 'Step 09', title: 'Task Assigned', desc: 'Make.com creates an Asana task — "Prep call notes" — assigned to you', badge: 'action' },
        { icon: '✅', label: 'Done', title: 'Coach Notified', desc: 'Make.com pings Slack with the AI summary before the call', badge: 'done' }
      ],
      logLines: [
        'Trigger fired → new discovery call application received via Make.com',
        'Make.com → parsed: goal ✓  budget ✓  timeline ✓',
        'Make.com AI Agent (Claude) → scoring fit against ICP... match: 91/100, "high intent"',
        'Vapi → AI voice call placed... prospect confirmed availability and interest',
        'IF confirmed on call → TRUE → continuing to booking (ELSE branch would log & end here)',
        'GoHighLevel → prospect card created in pipeline with AI notes',
        'GoHighLevel calendar → priority slot booked for Thursday 10:00 AM',
        'Make.com → prospect logged to Google Sheets "Pipeline Tracker"',
        'Make.com → call summary logged to Notion client database',
        'Make.com → Asana task "Prep call notes" assigned to coach',
        'Make.com → Slack notified with 2-line AI summary before the call'
      ],
      result: 'the application was scored for fit by AI, confirmed live over an automated Vapi call, and routed by a simple IF/ELSE check — confirmed prospects get booked, logged to Sheets and Notion, and prepped for you in Asana automatically; anything unconfirmed gets logged instead of filling your calendar with a no-show.',
      stepDelay: 700,
      aiExtra: 2000
    },
    {
      id: 'realestate',
      tab: '🏠 Real Estate',
      badge: 'Buyer Inquiry',
      noTimer: true,
      steps: [
        { icon: '🏠', label: 'Trigger', title: 'New Inquiry Captured', desc: 'Make.com watches the listing page and catches the buyer inquiry', badge: 'trigger' },
        { icon: '🔎', label: 'Step 01', title: 'Contact Formatted', desc: 'Make.com parses name, phone, and listing ID', badge: 'action' },
        { icon: '🤖', label: 'Step 02', title: 'AI Qualifies Lead', desc: 'Make.com AI Agent (Claude) reads the message for budget & urgency', badge: 'action' },
        { icon: '📞', label: 'Step 03', title: 'AI Voice Call Placed', desc: 'Vapi voice agent calls the buyer to confirm interest and showing time', badge: 'action' },
        { icon: '{}', label: 'Step 04', title: 'Call Outcome Checked', desc: 'IF the buyer confirms on the call → continue to booking. IF not → log the outcome and end.', badge: 'condition' },
        { icon: '📊', label: 'Step 05', title: 'Synced to GoHighLevel', desc: 'Contact created in GoHighLevel, tagged by property type', badge: 'action' },
        { icon: '📅', label: 'Step 06', title: 'Showing Scheduled', desc: 'Make.com sends the Calendly link, showing auto-booked', badge: 'action' },
        { icon: '📈', label: 'Step 07', title: 'Logged to Sheets', desc: 'Buyer activity appended to a Google Sheets tracker for the team', badge: 'action' },
        { icon: '🗒️', label: 'Step 08', title: 'Logged to Notion', desc: 'Call summary and AI notes saved to your Notion CRM database', badge: 'action' },
        { icon: '📌', label: 'Step 09', title: 'Task Assigned', desc: 'Make.com creates an Asana task — "Confirm showing" — assigned to the agent', badge: 'action' },
        { icon: '✅', label: 'Done', title: 'Agent Notified', desc: 'Make.com sends a Slack alert for same-day follow-up', badge: 'done' }
      ],
      logLines: [
        'Trigger fired → buyer inquiry received on listing #4471 via Make.com',
        'Make.com → parsed: name ✓  phone ✓  listing ID ✓',
        'Make.com AI Agent (Claude) → reading message... budget: $450–500k, urgency: "this month"',
        'Vapi → AI voice call placed... buyer confirmed interest and showing time',
        'IF confirmed on call → TRUE → continuing to booking (ELSE branch would log & end here)',
        'POST /contacts → GoHighLevel API (201 Created), tagged "hot-buyer"',
        'Make.com → Calendly showing slot sent for tomorrow 4:00 PM',
        'Make.com → buyer logged to Google Sheets "Buyer Activity" tracker',
        'Make.com → call summary logged to Notion CRM database',
        'Make.com → Asana task "Confirm showing" assigned to agent',
        'Make.com → Slack notified: showing confirmed for tomorrow 4:00 PM'
      ],
      result: 'the inquiry was qualified by AI, confirmed live over an automated Vapi call, and routed by a simple IF/ELSE check — confirmed buyers get scheduled, logged to Sheets and Notion, and assigned to the agent in Asana automatically; anything unconfirmed gets logged instead of wasting a showing slot.',
      stepDelay: 750,
      aiExtra: 2300
    },
    {
      id: 'clinic',
      tab: '🩺 Clinics',
      badge: 'Patient Intake',
      noTimer: true,
      steps: [
        { icon: '📋', label: 'Trigger', title: 'Appointment Requested', desc: 'Make.com watches the form and catches the patient intake submission', badge: 'trigger' },
        { icon: '🔎', label: 'Step 01', title: 'Info Formatted', desc: 'Make.com parses name, insurance, and reason for visit', badge: 'action' },
        { icon: '🤖', label: 'Step 02', title: 'AI Pre-Triage', desc: 'Make.com AI Agent (Claude) reads and flags urgency from the symptoms described', badge: 'action' },
        { icon: '📞', label: 'Step 03', title: 'AI Voice Call Placed', desc: 'Vapi voice agent calls the patient to confirm symptoms and preferred time', badge: 'action' },
        { icon: '{}', label: 'Step 04', title: 'Call Outcome Checked', desc: 'IF the patient confirms on the call → continue to booking. IF not → log the outcome and end.', badge: 'condition' },
        { icon: '📊', label: 'Step 05', title: 'Synced to GoHighLevel', desc: 'Patient record created in your GoHighLevel CRM', badge: 'action' },
        { icon: '📅', label: 'Step 06', title: 'Slot Scheduled', desc: 'Make.com books the next available slot based on urgency level', badge: 'action' },
        { icon: '📈', label: 'Step 07', title: 'Logged to Sheets', desc: 'Patient intake appended to a Google Sheets tracker for the front desk', badge: 'action' },
        { icon: '🗒️', label: 'Step 08', title: 'Logged to Notion', desc: 'Call summary and triage notes saved to your Notion patient log', badge: 'action' },
        { icon: '📌', label: 'Step 09', title: 'Task Assigned', desc: 'Make.com creates an Asana task — "Prep patient file" — assigned to staff', badge: 'action' },
        { icon: '✅', label: 'Done', title: 'Front Desk Notified', desc: 'Make.com alerts staff via Slack/SMS with the AI summary', badge: 'done' }
      ],
      logLines: [
        'Trigger fired → new patient intake form submitted via Make.com',
        'Make.com → parsed: name ✓  insurance ✓  reason for visit ✓',
        'Make.com AI Agent (Claude) → pre-triage read... urgency flagged: "moderate, same-week"',
        'Vapi → AI voice call placed... patient confirmed symptoms and preferred time',
        'IF confirmed on call → TRUE → continuing to booking (ELSE branch would log & end here)',
        'POST /contacts → GoHighLevel API (201 Created)',
        'Make.com → next available same-week slot booked automatically',
        'Make.com → patient logged to Google Sheets front-desk tracker',
        'Make.com → triage notes logged to Notion patient log',
        'Make.com → Asana task "Prep patient file" assigned to staff',
        'Make.com → Slack/SMS front desk notified with AI triage summary'
      ],
      result: 'the intake was pre-triaged by AI, confirmed live over an automated Vapi call, and routed by a simple IF/ELSE check — confirmed patients get scheduled, logged to Sheets and Notion, and prepped for staff in Asana automatically; anything unconfirmed gets logged instead of holding a slot open.',
      stepDelay: 800,
      aiExtra: 3200
    },
    {
      id: 'agency',
      tab: '🎨 Agencies',
      badge: 'New Brief',
      steps: [
        { icon: '📋', label: 'Trigger', title: 'New Brief Submitted', desc: 'Make.com watches the form and catches the project brief submission', badge: 'trigger' },
        { icon: '🔎', label: 'Step 01', title: 'Brief Formatted', desc: 'Make.com parses scope, budget, and deadline', badge: 'action' },
        { icon: '🤖', label: 'Step 02', title: 'AI Scopes Project', desc: 'Make.com AI Agent (Claude) estimates hours and suggests a package tier', badge: 'action' },
        { icon: '📊', label: 'Step 03', title: 'Logged in GoHighLevel', desc: 'Project card created on your GHL pipeline board', badge: 'action' },
        { icon: '📌', label: 'Step 04', title: 'Tasks Created', desc: 'Make.com auto-assigns kickoff tasks to the team in Asana', badge: 'action' },
        { icon: '✅', label: 'Done', title: 'PM Notified', desc: 'Make.com alerts Slack with the AI project summary', badge: 'done' }
      ],
      logLines: [
        'Trigger fired → new project brief submitted via Make.com',
        'Make.com → parsed: scope ✓  budget ✓  deadline ✓',
        'Make.com AI Agent (Claude) → estimating scope... suggested tier: "Growth Package", ~18 hrs',
        'GoHighLevel → project card created in "New Requests" pipeline',
        'Make.com → 4 kickoff tasks created and assigned to team in Asana',
        'Make.com → Slack PM notified with AI project summary, ready to review'
      ],
      result: 'the brief was formatted and scoped by AI, logged in GoHighLevel, and kickoff tasks were assigned — before your team even opened their inbox.',
      stepDelay: 850,
      aiExtra: 3600
    }
  ];

  let current = 0;
  let running = false;
  const stepDelay = 700;

  function renderTabs() {
    tabsWrap.innerHTML = scenarios
      .map((s, i) => '<button class="ind-tab' + (i === current ? ' active' : '') + '" data-i="' + i + '">' + s.tab + '</button>')
      .join('');
    Array.from(tabsWrap.querySelectorAll('.ind-tab')).forEach(btn => {
      btn.addEventListener('click', () => {
        if (running) return;
        current = parseInt(btn.dataset.i, 10);
        renderTabs();
        renderSteps();
        resetStage();
      });
    });
  }

  function renderSteps() {
    const scenario = scenarios[current];
    stepsWrap.innerHTML = scenario.steps
      .map((s, i) => {
        const arrow = i < scenario.steps.length - 1 ? '<div class="flow-arrow">→</div>' : '';
        return (
          '<div class="flow-step" data-step="' + i + '">' +
          '<span class="flow-icon">' + s.icon + '</span>' +
          '<div class="flow-step-label">' + s.label + '</div>' +
          '<div class="flow-step-title">' + s.title + '</div>' +
          '<div class="flow-step-desc">' + s.desc + '</div>' +
          '<span class="flow-badge ' + s.badge + '">' + s.badge + '</span>' +
          '</div>' + arrow
        );
      })
      .join('');
    attrib.textContent = 'Scenario: ' + scenario.badge + ' · built the way I\'d wire it for a real ' + scenario.tab.replace(/^[^\s]+\s/, '') + ' business.';
  }

  function timestamp(ms) {
    return '[+' + (ms / 1000).toFixed(1) + 's]';
  }

  function resetStage() {
    consoleBody.innerHTML = '<div class="pg-console-line pg-console-idle">// waiting for trigger — click "Run this automation live"</div>';
    result.classList.remove('show');
    result.innerHTML = '';
    runBtn.disabled = false;
    runLabel.textContent = '▶ Run this automation live';
  }

  function appendLine(text, cls, ms) {
    const line = document.createElement('div');
    line.className = 'pg-console-line' + (cls ? ' ' + cls : '');
    line.innerHTML = '<span class="pg-ts">' + timestamp(ms) + '</span>' + text;
    consoleBody.appendChild(line);
    consoleBody.scrollTop = consoleBody.scrollHeight;
  }

  function centerStep(step) {
    const maxScroll = stepsWrap.scrollWidth - stepsWrap.clientWidth;
    if (maxScroll <= 0) return;
    const target = step.offsetLeft - (stepsWrap.clientWidth / 2) + (step.offsetWidth / 2);
    stepsWrap.scrollTo({ left: Math.max(0, Math.min(target, maxScroll)), behavior: 'smooth' });
  }

  function resetScroll() {
    stepsWrap.scrollTo({ left: 0, behavior: 'smooth' });
  }

  function runSimulation() {
    if (running) return;
    const scenario = scenarios[current];
    const steps = Array.from(stepsWrap.querySelectorAll('.flow-step'));
    running = true;
    steps.forEach(s => s.classList.remove('pg-active', 'pg-done'));
    consoleBody.innerHTML = '';
    result.classList.remove('show');
    result.innerHTML = '';
    runBtn.disabled = true;
    runLabel.textContent = 'Running…';
    resetScroll();

    const stepDelay = scenario.stepDelay || 700;
    const aiExtra = scenario.aiExtra || 2100;
    const isAiStep = i => scenario.steps[i].icon.indexOf('🤖') !== -1;
    const durations = steps.map((_, i) => stepDelay + (isAiStep(i) ? aiExtra : 0));
    const elapsedAt = durations.reduce((acc, d, i) => {
      acc.push(i === 0 ? 0 : acc[i - 1] + durations[i - 1]);
      return acc;
    }, []);

    steps.forEach((step, i) => {
      setTimeout(() => {
        if (i > 0) steps[i - 1].classList.remove('pg-active');
        if (i > 0) steps[i - 1].classList.add('pg-done');
        step.classList.add('pg-active');
        centerStep(step);
        appendLine(scenario.logLines[i], i === steps.length - 1 ? 'pg-ok' : '', elapsedAt[i]);

        if (isAiStep(i)) {
          setTimeout(() => {
            appendLine('…still thinking, cross-checking context', 'pg-thinking', elapsedAt[i] + 900);
          }, 900);
        }
      }, elapsedAt[i] + 350);
    });

    const totalTime = elapsedAt[elapsedAt.length - 1] + durations[durations.length - 1];
    setTimeout(() => {
      steps[steps.length - 1].classList.remove('pg-active');
      steps[steps.length - 1].classList.add('pg-done');

      const resultText = scenario.noTimer
        ? '<div class="pg-result-text"><b>IF / ELSE resolved</b> — ' + scenario.result + '</div>'
        : '<div class="pg-result-text">Pipeline completed in <b>' + (totalTime / 1000).toFixed(1) + 's</b> — ' + scenario.result + '</div>';

      result.innerHTML =
        '<div class="pg-result-icon">✓</div>' +
        resultText;
      result.classList.add('show');

      runBtn.disabled = false;
      runLabel.textContent = '↻ Run it again';
      running = false;

      setTimeout(resetScroll, 900);
    }, totalTime + 650);
  }

  renderTabs();
  renderSteps();
  runBtn.addEventListener('click', runSimulation);
})();

// PROCESS TIMELINE — the line fills as you scroll; each step lights up when the line reaches it
(function () {
  var tl = document.getElementById('procTimeline');
  if (!tl) return;
  var ln = tl.querySelector('.proc-ln'), fill = ln && ln.querySelector('i'), items = Array.prototype.slice.call(tl.querySelectorAll('.proc-it'));
  if (!ln || !fill || !items.length) return;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var marks = [], raf = 0;

  function layout() {
    var f = items[0], l = items[items.length - 1];
    var top = f.offsetTop + f.offsetHeight / 2;
    var bottom = l.offsetTop + l.offsetHeight / 2;
    ln.style.top = top + 'px';
    ln.style.bottom = (tl.offsetHeight - bottom) + 'px';
    marks = items.map(function (li) { return li.offsetTop + li.offsetHeight / 2 - top; });
  }
  function update() {
    raf = 0;
    var r = ln.getBoundingClientRect();
    var trigger = window.innerHeight * 0.62;
    var h = Math.max(0, Math.min(r.height, trigger - r.top));
    fill.style.height = h + 'px';
    items.forEach(function (li, i) { li.classList.toggle('on', h >= marks[i] - 2); });
  }
  function req() { if (!raf) raf = requestAnimationFrame(update); }
  layout();
  if (reduce) { items.forEach(function (li) { li.classList.add('on'); }); fill.style.height = '100%'; return; }
  update();
  window.addEventListener('scroll', req, { passive: true });
  window.addEventListener('resize', function () { layout(); req(); });
  window.addEventListener('load', function () { layout(); req(); });
})();

// RESUME BUTTON — loading to success, then the download starts
(function () {
  var link = document.querySelector('a.btn-resume-big');
  if (!link || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)) return;
  var status = link.parentNode.querySelector('.rb-status');
  var busy = false;
  var sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  function fit() {
    var o = link.querySelector('.push-outer');
    if (o) link.style.setProperty('--rb-clip', Math.max(0, (o.offsetWidth - o.offsetHeight) / 2) + 'px');
  }
  fit(); window.addEventListener('resize', fit); window.addEventListener('load', fit);
  link.setAttribute('data-s', 'idle');
  link.addEventListener('click', function (e) {
    e.preventDefault();
    if (busy) return;
    busy = true; fit();
    (async function () {
      link.dataset.s = 'load'; link.setAttribute('aria-busy', 'true');
      var started = Date.now(), url = null, ok = false;
      try {
        // read the PDF itself; the check only appears once the file is ready and handed to the browser
        var res = await fetch(link.getAttribute('href'));
        var blob = await res.blob();
        url = URL.createObjectURL(blob);
        var wait = 900 - (Date.now() - started);
        if (wait > 0) await sleep(wait);
        var a = document.createElement('a');
        a.href = url; a.download = link.getAttribute('download') || 'resume.pdf';
        document.body.appendChild(a); a.click(); a.remove();
        ok = true;
      } catch (err) {
        // fallback: let the browser handle the plain link
        var f = document.createElement('a');
        f.href = link.getAttribute('href'); f.download = link.getAttribute('download') || 'resume.pdf';
        document.body.appendChild(f); f.click(); f.remove();
        ok = true;
      }
      link.setAttribute('aria-busy', 'false');
      if (ok) {
        await sleep(350);
        link.dataset.s = 'done';
        if (status) status.textContent = 'Resume downloaded';
        await sleep(1700);
      }
      link.dataset.s = 'idle'; if (status) status.textContent = '';
      if (url) setTimeout(function () { URL.revokeObjectURL(url); }, 10000);
      await sleep(700);
      busy = false;
    })();
  });
})();

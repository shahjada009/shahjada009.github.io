'use strict';
(() => {
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => Array.from(document.querySelectorAll(selector));
  const menuButton = $('#menu-btn');
  const navLinks = $('#nav-links');
  const effectsButton = $('#effects-btn');
  const canvas = $('#binary-canvas');
  const progressBar = $('#top-progress');
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let animationsPaused = prefersReducedMotion.matches;
  let frameId = null;
  let animationActive = true;
  let streams = [];
  let ctx = null;
  let width = 0, height = 0, lastFrame = 0;

  function toggleMenu(open) {
    const isOpen = Boolean(open);
    menuButton.setAttribute('aria-expanded', String(isOpen));
    menuButton.setAttribute('aria-label', isOpen ? 'Close menu' : 'Open menu');
    navLinks.classList.toggle('open', isOpen);
    document.body.classList.toggle('menu-open', isOpen && innerWidth <= 760);
  }
  menuButton.addEventListener('click', () => toggleMenu(menuButton.getAttribute('aria-expanded') !== 'true'));
  navLinks.addEventListener('click', event => {
    if (event.target.closest('a')) toggleMenu(false);
  });
  window.addEventListener('keydown', event => { if (event.key === 'Escape') toggleMenu(false); });
  window.addEventListener('resize', () => { if (innerWidth > 760) toggleMenu(false); });

  function updateProgress() {
    const max = document.documentElement.scrollHeight - innerHeight;
    progressBar.style.width = `${max > 0 ? scrollY / max * 100 : 0}%`;
  }
  window.addEventListener('scroll', updateProgress, { passive: true });
  updateProgress();

  const revealObserver = ('IntersectionObserver' in window) ? new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      }
    }
  }, {threshold: .1, rootMargin: '0px 0px -35px 0px'}) : null;
  $$('.reveal').forEach(el => revealObserver ? revealObserver.observe(el) : el.classList.add('is-visible'));

  const navSections = $$('#about, #work, #research, #skills, #contact');
  if ('IntersectionObserver' in window) {
    const navObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          $$('[data-nav]').forEach(link => link.classList.toggle('active', link.getAttribute('href') === `#${entry.target.id}`));
        }
      });
    }, {rootMargin: '-25% 0px -60% 0px'});
    navSections.forEach(section => navObserver.observe(section));
  }

  function prepareStreams() {
    if (!canvas || !ctx) return;
    const pixelRatio = Math.min(devicePixelRatio || 1, 2);
    width = innerWidth; height = innerHeight;
    canvas.width = Math.floor(width * pixelRatio);
    canvas.height = Math.floor(height * pixelRatio);
    canvas.style.width = width + 'px'; canvas.style.height = height + 'px';
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    const step = width < 640 ? 26 : 31;
    const count = Math.ceil(width / step);
    streams = Array.from({ length: count }, (_, i) => ({
      x: i * step + (Math.random() * 8 - 4),
      y: Math.random() * height,
      speed: .22 + Math.random() * .62,
      dir: i % 3 === 0 ? -1 : 1,
      length: 5 + Math.floor(Math.random() * 14),
      charOffset: Math.floor(Math.random() * 100),
      alpha: (.04 + Math.random() * .16) * (width < 640 ? .6 : 1)
    }));
    ctx.clearRect(0, 0, width, height);
  }
  function drawBinary(now) {
    if (!animationActive || animationsPaused || !ctx) { frameId = null; return; }
    if (now - lastFrame >= 35) {
      const delta = Math.min((now - lastFrame) / 35, 2.5);
      lastFrame = now;
      ctx.clearRect(0, 0, width, height);
      const size = width < 640 ? 10 : 11;
      ctx.font = `${size}px monospace`;
      streams.forEach((s, index) => {
        for (let j = 0; j < s.length; j++) {
          const py = s.y - j * 23 * s.dir;
          if (py < -25 || py > height + 25) continue;
          const fade = (1 - j / s.length);
          const light = j === 0 ? 1.6 : 1;
          const n = ((Math.floor(now / 260) + j * 13 + index * 3 + s.charOffset) % 7 > 3) ? '1' : '0';
          ctx.fillStyle = `rgba(${index % 5 === 0 ? '125,117,255' : '23,209,191'},${Math.min(s.alpha * fade * light, .34)})`;
          ctx.fillText(n, s.x, py);
        }
        s.y += s.speed * s.dir * delta;
        if (s.dir > 0 && s.y - s.length * 23 > height + 30) s.y = -30;
        if (s.dir < 0 && s.y + s.length * 23 < -30) s.y = height + 30;
      });
    }
    frameId = requestAnimationFrame(drawBinary);
  }
  function applyEffectsState() {
    document.body.classList.toggle('paused', animationsPaused);
    effectsButton.setAttribute('aria-pressed', String(animationsPaused));
    effectsButton.setAttribute('aria-label', animationsPaused ? 'Resume background animation' : 'Pause background animation');
    effectsButton.title = animationsPaused ? 'Resume background animation' : 'Pause background animation';
    const text = $('.effects-label');
    if (text) text.textContent = animationsPaused ? 'MOTION PAUSED' : 'LIVE SYSTEM';
    if (animationsPaused) {
      if (frameId !== null) cancelAnimationFrame(frameId);
      frameId = null;
      if (ctx) ctx.clearRect(0, 0, width, height);
    } else if (frameId === null && animationActive) {
      lastFrame = performance.now();
      frameId = requestAnimationFrame(drawBinary);
    }
  }
  if (canvas && canvas.getContext) {
    ctx = canvas.getContext('2d', { alpha: true });
    prepareStreams();
    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(prepareStreams, 130);
    });
    document.addEventListener('visibilitychange', () => {
      animationActive = !document.hidden;
      if (!animationActive && frameId !== null) { cancelAnimationFrame(frameId); frameId = null; }
      if (animationActive && !animationsPaused && frameId === null) frameId = requestAnimationFrame(drawBinary);
    });
  }
  effectsButton.addEventListener('click', () => { animationsPaused = !animationsPaused; applyEffectsState(); });
  applyEffectsState();
  prefersReducedMotion.addEventListener?.('change', e => { animationsPaused = e.matches; applyEffectsState(); });

  const toast = $('#toast');
  let toastTimer;
  const showToast = message => {
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
  };
  $('#copy-email').addEventListener('click', async () => {
    const email = 'shahjada009@gmail.com';
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(email);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = email;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.focus(); textarea.select();
        const copied = document.execCommand('copy');
        textarea.remove();
        if (!copied) throw new Error('copy failed');
      }
      showToast('Email address copied to clipboard');
    } catch {
      showToast('Select the email address above to copy it');
    }
  });
  $('#year').textContent = new Date().getFullYear();

  const terminalOutput = $('#terminal-output');
  const terminalInput = $('#terminal-input');
  const responses = {
    help: ['Available commands:', 'whoami   - Learn about me', 'projects - See what I am building', 'research - Current research focus', 'skills   - Development & research areas', 'contact  - Email address', 'clear    - Clear terminal', 'help     - Show commands'],
    whoami: ['Shahjada Parvez', 'Software builder • AI explorer • Cybersecurity researcher', 'Interested in useful products and explainable intelligent systems.'],
    projects: ['[01] NEXT-CRM    — Laravel CRM / business software (in development)', '[02] Sovranio AI — AI-focused initiative', '[03] HexWisp    — Cybersecurity-inspired technology brand', 'Scroll to Portfolio to explore project links.'],
    research: ['TNEM: Temporal-Native Explainability in CNN–LSTM intrusion detection.', 'Current state: research proposal / evaluation planning.', 'Goal: study whether temporal explanations can be faithful and coherent.'],
    skills: ['Build: Laravel, PHP, MySQL, JavaScript, HTML, CSS, APIs', 'Explore: Explainable AI, CNN–LSTM, intrusion detection', 'Workflow: Docker, Codex CLI, XAMPP, cPanel'],
    contact: ['Say hello: shahjada009@gmail.com', 'Tip: The contact section has a one-click copy-email action.']
  };
  function appendLine(message, cssClass = 'term-success') {
    const div = document.createElement('div');
    div.className = `term-line ${cssClass}`;
    div.textContent = message;
    terminalOutput.appendChild(div);
    terminalOutput.scrollTop = terminalOutput.scrollHeight;
  }
  function runCommand(raw) {
    const command = raw.trim().toLowerCase();
    if (!command) return;
    if (command === 'clear') { terminalOutput.textContent = ''; return; }
    appendLine(`visitor@msparvez:~$ ${command}`, 'term-command');
    if (Object.prototype.hasOwnProperty.call(responses, command)) responses[command].forEach(line => appendLine(line));
    else appendLine(`Command not found: ${command}. Type help for options.`, 'term-warning');
  }
  $('#terminal-form').addEventListener('submit', event => {
    event.preventDefault(); runCommand(terminalInput.value); terminalInput.value = ''; terminalInput.focus();
  });
  $$('[data-command]').forEach(button => button.addEventListener('click', () => { runCommand(button.dataset.command); terminalInput.focus(); }));
})();

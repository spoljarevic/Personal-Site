/**
 * Main site JavaScript
 * Navbar, dropdowns, Codeberg API integration
 */

document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initDropdowns();
  initScrollHideNavbar();
  initParticles();
  initScrollAnimations();

  // Only load dynamic content on index page
  if (document.body.dataset.page === 'index') {
    initTerminalTyping();
    loadGitActivity();
    initFastfetchArt();
  }

  if (document.body.dataset.page === 'git') {
    loadProjects();
    loadGitActivity();
  }

  if (document.body.dataset.page === 'blog') {
    loadBlogList();
  }

  if (document.body.dataset.page === 'blog-post') {
    loadBlogPost();
  }
});

function initNavbar() {
  const nav = document.querySelector('.navbar');
  if (!nav) return;

  const links = nav.querySelectorAll('.nav-link[href]');
  const currentPath = window.location.pathname.replace(/\/$/, '') || '/';
  links.forEach(link => {
    if (link.closest('.nav-item[data-dropdown]')) return;
    const href = new URL(link.href).pathname.replace(/\/$/, '') || '/';
    if (currentPath === href || (currentPath.startsWith('/blog/') && href === '/blog')) {
      link.classList.add('active');
    }
  });
}

function initDropdowns() {
  const navItems = document.querySelectorAll('.nav-item[data-dropdown]');
  navItems.forEach(item => {
    const link = item.querySelector('.nav-link');
    if (!link) return;

    link.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const isOpen = item.classList.contains('open');
      navItems.forEach(i => i.classList.remove('open'));
      if (!isOpen) item.classList.add('open');
    });
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.nav-item')) {
      navItems.forEach(i => i.classList.remove('open'));
    }
  });
}

function initFastfetchArt() {
  const pre = document.getElementById('fastfetch-art');
  if (!pre) return;

  const embedded = document.getElementById('fastfetch-ascii-src');
  if (embedded) {
    // Read from the DocumentFragment, not textContent
    const text = embedded.innerHTML;
    if (text.trim()) {
      pre.textContent = text.replace(/\r\n/g, '\n');
      return;
    }
  }

  const url = new URL('images/ascii/ls-pipe.txt', window.location.href);
  fetch(url, { cache: 'force-cache' })
    .then(r => (r.ok ? r.text() : Promise.reject()))
    .then(text => {
      pre.textContent = text.replace(/\r\n/g, '\n');
    })
    .catch(() => { /* keep placeholder */ });
}

function initScrollHideNavbar() {
  const nav = document.querySelector('.navbar');
  if (!nav) return;

  let lastScroll = 0;
  window.addEventListener('scroll', () => {
    const scroll = window.scrollY;
    if (scroll > 100 && scroll > lastScroll) {
      nav.classList.add('hidden');
    } else {
      nav.classList.remove('hidden');
    }
    lastScroll = scroll;
  });
}

// ========== Codeberg API ==========

async function apiFetch(url) {
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) throw new Error(res.status);
    return await res.json();
  } catch (e) {
    console.warn('API fetch failed:', url, e.message);
    return null;
  }
}

async function loadProjects() {
  const personalEl = document.getElementById('projects-personal');
  const companyEl = document.getElementById('projects-company');
  if (!personalEl && !companyEl) return;

  const { REPOS, CODEBERG_API } = typeof CONFIG !== 'undefined' ? CONFIG : { REPOS: {}, CODEBERG_API: '' };

  for (const [key, { owner, label }] of Object.entries(REPOS)) {
    const el = key === 'personal' ? personalEl : companyEl;
    if (!el) continue;

    const data = await apiFetch(`${CODEBERG_API}/users/${owner}/repos?limit=50`);
    if (!data || !Array.isArray(data)) {
      el.innerHTML = `<p class="project-fallback">Projects load from Codeberg API. <a href="https://codeberg.org/${owner}" target="_blank" rel="noopener">View on Codeberg</a></p>`;
      continue;
    }

    const html = data
      .filter(r => !r.archived)
      .map(
        r =>
          `<div class="project-card">
            <a href="${r.html_url}" target="_blank" rel="noopener">${escapeHtml(r.name)}</a>
            <p class="project-desc">${escapeHtml(r.description || 'No description')}</p>
          </div>`
      )
      .join('');
    el.innerHTML = html;
  }
}

async function loadGitActivity() {
  const container = document.getElementById('git-activity');
  if (!container) return;

  const { GIT_ACTIVITY, CODEBERG_API } = typeof CONFIG !== 'undefined' ? CONFIG : { GIT_ACTIVITY: {}, CODEBERG_API: '' };
  const { owner, repo, branches } = GIT_ACTIVITY;

  if (!owner || !repo || !branches?.length) return;

  const tabsEl = container.querySelector('.git-branch-tabs');
  const listEl = container.querySelector('.git-commits-list');

  if (!tabsEl || !listEl) return;

  const commitsByBranch = {};
  let loaded = 0;

  async function loadBranch(branch) {
    const data = await apiFetch(
      `${CODEBERG_API}/repos/${owner}/${repo}/commits?sha=${branch}&limit=10`
    );
    commitsByBranch[branch] = Array.isArray(data) ? data : [];
  }

  for (const branch of branches) {
    const btn = document.createElement('button');
    btn.className = `git-branch-tab ${loaded === 0 ? 'active' : ''}`;
    btn.textContent = branch;
    btn.dataset.branch = branch;
    tabsEl.appendChild(btn);
    await loadBranch(branch);
    loaded++;
  }

  function renderCommits(branch) {
    const commits = commitsByBranch[branch] || [];
    if (commits.length === 0) {
      listEl.innerHTML = '<div class="git-loading">No commits or API unavailable. Codeberg API may require a CORS proxy.</div>';
      return;
    }
    listEl.innerHTML = commits
      .map(
        c =>
          `<div class="git-commit">
            <span class="git-commit-msg">${escapeHtml(c.commit?.message?.split('\n')[0] || '—')}</span>
            <span class="git-commit-date">${formatDate(c.commit?.author?.date)}</span>
          </div>`
      )
      .join('');
  }

  renderCommits(branches[0]);

  tabsEl.querySelectorAll('.git-branch-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      tabsEl.querySelectorAll('.git-branch-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderCommits(btn.dataset.branch);
    });
  });
}

async function loadBlogList() {
  const container = document.getElementById('blog-list');
  if (!container) return;

  const { BLOG, CODEBERG_API, RAW_CODEBERG } = typeof CONFIG !== 'undefined' ? CONFIG : { BLOG: {}, CODEBERG_API: '', RAW_CODEBERG: '' };
  const { owner, repo, branch, fallbackPosts } = BLOG;

  let posts = fallbackPosts || [];

  const contents = await apiFetch(
    `${CODEBERG_API}/repos/${owner}/${repo}/contents?ref=${branch}`
  );

  if (contents && Array.isArray(contents)) {
    posts = contents
      .filter(c => c.type === 'dir' && c.name !== '.git')
      .map(c => c.name)
      .sort()
      .reverse();
  }

  if (posts.length === 0) {
    container.innerHTML = '<p>No blog posts yet.</p>';
    return;
  }

  container.innerHTML = posts
    .map(name => {
      const slug = encodeURIComponent(name);
      const dateMatch = name.match(/^(\d{4}-\d{2}-\d{2})/);
      const date = dateMatch ? dateMatch[1] : '';
      const title = date ? name.replace(/^\d{4}-\d{2}-\d{2}\s*-\s*/, '') : name;
      return `
        <a href="/blog/${slug}" class="blog-item">
          <h3>${escapeHtml(title)}</h3>
          <time>${date}</time>
        </a>
      `;
    })
    .join('');
}

async function loadBlogPost() {
  const container = document.getElementById('blog-post-content');
  const titleEl = document.getElementById('blog-post-title');
  if (!container) return;

  const slug = document.body.dataset.postSlug;
  if (!slug) return;

  const { BLOG, RAW_CODEBERG } = typeof CONFIG !== 'undefined' ? CONFIG : { BLOG: {}, RAW_CODEBERG: '' };
  const { owner, repo, branch } = BLOG;

  const url = `${RAW_CODEBERG}/${owner}/${repo}/${branch}/${encodeURIComponent(slug)}/README.md`;
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) throw new Error(res.status);
    const md = await res.text();
    container.innerHTML = marked(md);
    if (titleEl) {
      const dateMatch = decodeURIComponent(slug).match(/^(\d{4}-\d{2}-\d{2})/);
      const title = decodeURIComponent(slug).replace(/^\d{4}-\d{2}-\d{2}\s*-\s*/, '');
      titleEl.textContent = title;
      const metaEl = document.getElementById('blog-post-meta');
      if (metaEl && dateMatch) metaEl.textContent = dateMatch[1];
    }
  } catch (e) {
    container.innerHTML = '<p>Could not load post. raw.codeberg.org may be unavailable.</p>';
  }
}

// ========== Terminal Typing Animation ==========

async function initTerminalTyping() {
  const ids = ['tl-whoami', 'tl-whoami-out', 'tl-fastfetch', 'tl-fastfetch-out', 'tl-cattitle', 'tl-cattitle-out', 'tl-cursor'];
  const els = {};
  for (const id of ids) {
    const el = document.getElementById(id);
    if (!el) return; // bail if HTML doesn't have the expected IDs
    els[id] = el;
    el.style.visibility = 'hidden';
  }

  const delay = ms => new Promise(r => setTimeout(r, ms));
  const CHAR_SPEED = 55;
  const JITTER = 35;

  async function typeCommand(lineEl, text) {
    const cmdSpan = lineEl.querySelector('.command');
    lineEl.style.visibility = 'visible';
    cmdSpan.innerHTML = '<span class="terminal-cursor"></span>';
    await delay(150);
    let typed = '';
    for (const char of text) {
      typed += char;
      cmdSpan.innerHTML = escapeHtml(typed) + '<span class="terminal-cursor"></span>';
      await delay(CHAR_SPEED + Math.random() * JITTER);
    }
    // Remove inline cursor — final prompt cursor line takes over
    cmdSpan.textContent = typed;
    await delay(220);
  }

  async function showOutput(lineEl) {
    lineEl.style.visibility = 'visible';
    await delay(100);
  }

  // Reduced-motion: just reveal everything instantly
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    ids.forEach(id => (els[id].style.visibility = 'visible'));
    return;
  }

  await delay(350);

  await typeCommand(els['tl-whoami'], 'whoami');
  await showOutput(els['tl-whoami-out']);
  await delay(280);

  await typeCommand(els['tl-fastfetch'], 'fastfetch');
  await showOutput(els['tl-fastfetch-out']);
  await delay(280);

  await typeCommand(els['tl-cattitle'], 'cat ~/.title');
  await showOutput(els['tl-cattitle-out']);
  await delay(180);

  els['tl-cursor'].style.visibility = 'visible';
}

// ========== Particles ==========

function initParticles() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const canvas = document.createElement('canvas');
  canvas.id = 'particle-canvas';
  document.body.prepend(canvas);

  const ctx = canvas.getContext('2d');
  const COLORS = [
    [34, 211, 238],   // cyan
    [59, 130, 246],   // blue
    [139, 92, 246],   // purple
  ];

  let particles = [];
  let rafId = null;
  let running = true;

  function createParticles() {
    particles = [];
    const count = Math.min(35, Math.floor((canvas.width + canvas.height) / 50));
    for (let i = 0; i < count; i++) {
      const color = COLORS[Math.floor(Math.random() * COLORS.length)];
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 1.2 + 0.3,
        alpha: Math.random() * 0.15 + 0.04,
        vx: (Math.random() - 0.5) * 0.15,
        vy: (Math.random() - 0.5) * 0.15,
        color,
      });
    }
  }

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    createParticles();
  }

  function draw() {
    if (!running) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = 'lighter';

    for (const p of particles) {
      const [r, g, b] = p.color;
      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 7);
      grad.addColorStop(0, `rgba(${r},${g},${b},${p.alpha})`);
      grad.addColorStop(0.5, `rgba(${r},${g},${b},${p.alpha * 0.5})`);
      grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * 7, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();

      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0) p.x = canvas.width;
      if (p.x > canvas.width) p.x = 0;
      if (p.y < 0) p.y = canvas.height;
      if (p.y > canvas.height) p.y = 0;
    }

    rafId = requestAnimationFrame(draw);
  }

  resize();
  window.addEventListener('resize', resize);
  draw();

  window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
    if (e.matches && running) {
      running = false;
      cancelAnimationFrame(rafId);
      canvas.remove();
    }
  });
}

// ========== Scroll Animations ==========

function initScrollAnimations() {
  const elements = document.querySelectorAll('.fade-in');
  if (!elements.length) return;

  if (!('IntersectionObserver' in window)) {
    elements.forEach(el => el.classList.add('visible'));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );

  elements.forEach(el => observer.observe(el));
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { dateStyle: 'short' });
}

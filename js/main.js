/**
 * Main site JavaScript
 * Navbar, dropdowns, Codeberg API integration
 */

document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initDropdowns();
  initScrollHideNavbar();

  // Only load dynamic content on index page
  if (document.body.dataset.page === 'index') {
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
      if (window.innerWidth < 768) {
        return; // Allow default on mobile
      }
      e.preventDefault();
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
      .slice(0, 12)
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

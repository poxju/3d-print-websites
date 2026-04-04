/* ===================================================
   3D Print Hub — app.js
   Loads data/sites.json and renders the full UI.
   =================================================== */

(function () {
  'use strict';

  // ---- Category accent class map ----
  const ACCENT_CLASS = {
    'stl-sites':     'accent-stl',
    'manufacturers': 'accent-mfr',
    'blogs':         'accent-blog',
    'communities':   'accent-comm',
    'software':      'accent-soft',
    'materials':     'accent-mat',
  };

  // ---- State ----
  let allCategories = [];
  let currentQuery  = '';

  // ---- DOM refs ----
  const navTabsEl       = document.getElementById('nav-tabs');
  const statsInnerEl    = document.getElementById('stats-inner') || document.querySelector('.stats-inner');
  const categoriesRoot  = document.getElementById('categories-root');
  const searchInput     = document.getElementById('search-input');
  const searchClearBtn  = document.getElementById('search-clear');
  const noResultsEl     = document.getElementById('no-results');
  const noResultsQuery  = document.getElementById('no-results-query');
  const clearSearchBtn  = document.getElementById('clear-search-btn');
  const backToTopBtn    = document.getElementById('back-to-top');

  // ===================================================
  // INIT
  // ===================================================
  async function init() {
    try {
      const resp = await fetch('data/sites.json');
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      allCategories = data.categories || [];
      render();
      setupSearch();
      setupScrollSpy();
      setupBackToTop();
    } catch (err) {
      categoriesRoot.innerHTML = `
        <div style="text-align:center;padding:80px 24px;color:var(--color-text-muted)">
          <p style="font-size:32px;margin-bottom:16px">⚠️</p>
          <p>Could not load <code>data/sites.json</code>.</p>
          <p style="font-size:13px;margin-top:8px">${err.message}</p>
          <p style="font-size:13px;margin-top:8px">Make sure you're serving this via a local server (e.g. <code>npx serve .</code>).</p>
        </div>`;
    }
  }

  // ===================================================
  // RENDER
  // ===================================================
  function render() {
    renderNavTabs();
    renderStats();
    renderCategories();
  }

  // ---- Nav Tabs ----
  function renderNavTabs() {
    navTabsEl.innerHTML = allCategories.map(cat => `
      <a
        href="#${cat.id}"
        class="nav-tab"
        data-cat="${cat.id}"
        aria-label="Jump to ${cat.label}"
      >
        <span class="nav-tab-icon">${cat.icon}</span>
        ${cat.label}
      </a>
    `).join('');
  }

  // ---- Stats Bar ----
  function renderStats() {
    const statsEl = document.querySelector('.stats-inner');
    if (!statsEl) return;

    const total = allCategories.reduce((sum, c) => sum + c.sites.length, 0);

    const catStats = allCategories.map(cat => {
      const accentClass = ACCENT_CLASS[cat.id] || 'accent-stl';
      return `
        <div class="stat-item">
          <span class="stat-dot ${accentClass}"></span>
          <span>${cat.label}</span>
          <span class="stat-count">${cat.sites.length}</span>
        </div>
      `;
    }).join('');

    statsEl.innerHTML = `
      <div class="stat-item" style="margin-right:8px">
        <span style="font-size:13px;font-weight:700;color:var(--color-text)">${total}</span>
        <span>resources across ${allCategories.length} categories</span>
      </div>
      <span style="width:1px;height:20px;background:var(--color-border);flex-shrink:0"></span>
      ${catStats}
    `;
  }

  // ---- Category Sections ----
  function renderCategories(query = '') {
    categoriesRoot.innerHTML = allCategories.map(cat => renderCategory(cat, query)).join('');
  }

  function renderCategory(cat, query) {
    const matchingSites = query
      ? cat.sites.filter(site => siteMatchesQuery(site, query))
      : cat.sites;

    if (query && matchingSites.length === 0) return '';

    const accentClass = ACCENT_CLASS[cat.id] || 'accent-stl';
    const cards = matchingSites.map(site => renderCard(site, cat.id, query)).join('');

    return `
      <section
        class="category-section"
        id="${cat.id}"
        data-cat="${cat.id}"
        aria-labelledby="cat-title-${cat.id}"
      >
        <div class="category-header">
          <div class="category-title-group">
            <span class="category-accent-bar ${accentClass}"></span>
            <span class="category-icon">${cat.icon}</span>
            <div>
              <h2 class="category-title" id="cat-title-${cat.id}">${cat.label}</h2>
              <p class="category-desc">${cat.description}</p>
            </div>
          </div>
          <span class="category-count">${matchingSites.length} resource${matchingSites.length !== 1 ? 's' : ''}</span>
        </div>
        <div class="cards-grid" role="list">
          ${cards}
        </div>
      </section>
    `;
  }

  // ---- Individual Card ----
  function renderCard(site, catId, query) {
    const domain    = extractDomain(site.url);
    const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
    const initial   = site.name.charAt(0).toUpperCase();
    const tags      = (site.tags || []).map(t => `<span class="tag">${escHtml(t)}</span>`).join('');

    const displayName = query ? highlight(site.name, query) : escHtml(site.name);
    const displayDesc = query ? highlight(site.description, query) : escHtml(site.description);

    return `
      <article class="site-card" data-cat="${catId}" role="listitem">
        <div class="card-top">
          <img
            class="card-favicon"
            src="${faviconUrl}"
            alt="${escHtml(site.name)} favicon"
            width="32"
            height="32"
            onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"
          />
          <div class="card-favicon-fallback" style="display:none">${initial}</div>
          <div class="card-name-group">
            <div class="card-name">${displayName}</div>
            <div class="card-domain">${domain}</div>
          </div>
        </div>
        <p class="card-description">${displayDesc}</p>
        <div class="card-footer">
          <div class="card-tags">${tags}</div>
          <a
            href="${escHtml(site.url)}"
            target="_blank"
            rel="noopener noreferrer"
            class="card-link"
            aria-label="Visit ${escHtml(site.name)} (opens in new tab)"
          >
            Visit
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/>
            </svg>
          </a>
        </div>
      </article>
    `;
  }

  // ===================================================
  // SEARCH
  // ===================================================
  function setupSearch() {
    searchInput.addEventListener('input', () => {
      const q = searchInput.value.trim().toLowerCase();
      currentQuery = q;
      searchClearBtn.hidden = !q;
      applySearch(q);
    });

    searchClearBtn.addEventListener('click', clearSearch);
    clearSearchBtn.addEventListener('click', clearSearch);
  }

  function clearSearch() {
    searchInput.value = '';
    currentQuery = '';
    searchClearBtn.hidden = true;
    applySearch('');
    searchInput.focus();
  }

  function applySearch(query) {
    if (!query) {
      renderCategories('');
      noResultsEl.hidden = true;
      return;
    }

    // Count total matches
    const totalMatches = allCategories.reduce((sum, cat) => {
      return sum + cat.sites.filter(site => siteMatchesQuery(site, query)).length;
    }, 0);

    if (totalMatches === 0) {
      categoriesRoot.innerHTML = '';
      noResultsEl.hidden = false;
      noResultsQuery.textContent = `"${query}"`;
    } else {
      noResultsEl.hidden = true;
      renderCategories(query);
    }
  }

  function siteMatchesQuery(site, query) {
    const q = query.toLowerCase();
    return (
      site.name.toLowerCase().includes(q) ||
      site.description.toLowerCase().includes(q) ||
      (site.tags || []).some(t => t.toLowerCase().includes(q))
    );
  }

  // ===================================================
  // SCROLL SPY  (IntersectionObserver)
  // ===================================================
  function setupScrollSpy() {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setActiveTab(entry.target.id);
          }
        });
      },
      {
        rootMargin: '-20% 0px -70% 0px',
        threshold: 0,
      }
    );

    // Re-observe whenever categories re-render (search changes DOM)
    const mutationObserver = new MutationObserver(() => {
      observer.disconnect();
      categoriesRoot.querySelectorAll('.category-section').forEach(el => observer.observe(el));
    });
    mutationObserver.observe(categoriesRoot, { childList: true, subtree: false });

    categoriesRoot.querySelectorAll('.category-section').forEach(el => observer.observe(el));
  }

  function setActiveTab(catId) {
    navTabsEl.querySelectorAll('.nav-tab').forEach(tab => {
      const isActive = tab.dataset.cat === catId;
      tab.classList.toggle('active', isActive);
      if (isActive) {
        tab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    });
  }

  // ===================================================
  // BACK TO TOP
  // ===================================================
  function setupBackToTop() {
    window.addEventListener('scroll', () => {
      backToTopBtn.hidden = window.scrollY < 400;
    }, { passive: true });

    backToTopBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // ===================================================
  // UTILITIES
  // ===================================================
  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function extractDomain(url) {
    try {
      return new URL(url).hostname.replace(/^www\./, '');
    } catch {
      return url;
    }
  }

  function highlight(text, query) {
    if (!query) return escHtml(text);
    const safe  = escHtml(text);
    const safeQ = escHtml(query).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return safe.replace(new RegExp(`(${safeQ})`, 'gi'), '<mark class="search-highlight">$1</mark>');
  }

  // ===================================================
  // BOOT
  // ===================================================
  document.addEventListener('DOMContentLoaded', init);

})();

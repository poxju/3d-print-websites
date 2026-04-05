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
  let currentSort = 'az'; // 'az' | 'users'

  // ---- DOM refs ----
  const categoriesRoot  = document.getElementById('categories-root');
  const noResultsEl     = document.getElementById('no-results');
  const noResultsQuery  = document.getElementById('no-results-query');
  const clearSearchBtn  = document.getElementById('clear-search-btn');
  const backToTopBtn    = document.getElementById('back-to-top');
  const stlSearchForm   = document.getElementById('stl-search-form');
  const stlSearchInput  = document.getElementById('stl-search-input');
  const stlResults      = document.getElementById('stl-results');

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
      setupSort();
      setupStlSearch();
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
    renderStats();
    renderCategories();
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

  // ---- Sorting ----
  function sortedSites(sites) {
    const arr = [...sites];
    if (currentSort === 'users') {
      return arr.sort((a, b) => (b.users || 0) - (a.users || 0));
    }
    return arr.sort((a, b) => a.name.localeCompare(b.name));
  }

  function formatUsers(n) {
    if (!n) return null;
    if (n >= 1000000) return (n / 1000000).toFixed(n % 1000000 === 0 ? 0 : 1) + 'M';
    if (n >= 1000) return Math.round(n / 1000) + 'K';
    return n.toString();
  }

  // ---- Category Sections ----
  function renderCategories(query = '') {
    const inner = allCategories.map(cat => renderCategory(cat, query)).join('');
    categoriesRoot.innerHTML = `<div class="category-columns">${inner}</div>`;
  }

  function renderCategory(cat, query) {
    let sites = sortedSites(cat.sites);
    if (query) sites = sites.filter(site => siteMatchesQuery(site, query));
    if (query && sites.length === 0) return '';

    const accentClass = ACCENT_CLASS[cat.id] || 'accent-stl';
    const rows = sites.map(site => renderRow(site, cat.id, query)).join('');

    return `
      <section
        class="category-col"
        id="${cat.id}"
        data-cat="${cat.id}"
        aria-labelledby="cat-title-${cat.id}"
      >
        <div class="col-header">
          <span class="col-accent-bar ${accentClass}"></span>
          <h2 class="col-title" id="cat-title-${cat.id}">${cat.label}</h2>
          <span class="col-count">${sites.length}</span>
        </div>
        <div class="site-list" role="list">
          ${rows}
        </div>
      </section>
    `;
  }

  // ---- Individual Row ----
  function renderRow(site, catId, query) {
    const domain     = extractDomain(site.url);
    const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
    const initial    = site.name.charAt(0).toUpperCase();
    const displayName = query ? highlight(site.name, query) : escHtml(site.name);
    const userCount  = formatUsers(site.users);
    const approxMark = (userCount && site.usersApproximate) ? '<span class="row-users-approx" title="Approximate figure">*</span>' : '';
    const userBadge  = (currentSort === 'users' && userCount)
      ? `<span class="row-users">${userCount}${approxMark}</span>`
      : '';

    return `
      <a
        class="site-row"
        href="${escHtml(site.url)}"
        target="_blank"
        rel="noopener noreferrer"
        data-cat="${catId}"
        role="listitem"
        aria-label="${escHtml(site.name)}"
      >
        <img
          class="row-favicon"
          src="${faviconUrl}"
          alt=""
          width="16"
          height="16"
          onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"
        />
        <span class="row-favicon-fallback" style="display:none">${initial}</span>
        <span class="row-body">
          <span class="row-name">${displayName}</span>
        </span>
        ${userBadge}
        <svg class="row-arrow" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/>
        </svg>
      </a>
    `;
  }

  // ===================================================
  // STL SEARCH
  // ===================================================
  function setupStlSearch() {
    stlSearchForm.addEventListener('submit', e => {
      e.preventDefault();
      const q = stlSearchInput.value.trim();
      if (!q) return;
      fetchAndRenderResults(q);
    });

    stlSearchInput.addEventListener('input', () => {
      if (!stlSearchInput.value.trim()) {
        stlResults.hidden = true;
        stlResults.innerHTML = '';
      }
    });
  }

  function fetchAndRenderResults(query) {
    const stlCat  = allCategories.find(c => c.id === 'stl-sites');
    const encoded = encodeURIComponent(query);
    const yeggiUrl = `https://www.yeggi.com/q/${encoded}/`;

    const others = stlCat
      ? stlCat.sites.filter(s => s.searchUrl)
      : [];

    const otherLinks = others.map(site => {
      const domain     = extractDomain(site.url);
      const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
      const href       = site.searchUrl.replace('{q}', encoded);
      return `
        <a class="sr-also-btn" href="${escHtml(href)}" target="_blank" rel="noopener noreferrer">
          <img class="sr-also-fav" src="${faviconUrl}" alt="" width="13" height="13"
            onerror="this.style.display='none'" />
          ${escHtml(site.name)}
          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/>
          </svg>
        </a>`;
    }).join('');

    stlResults.innerHTML = `
      <a class="yeggi-hero" href="${escHtml(yeggiUrl)}" target="_blank" rel="noopener noreferrer">
        <img src="https://www.google.com/s2/favicons?domain=yeggi.com&sz=64" class="yeggi-favicon" alt="" width="32" height="32" />
        <span class="yeggi-info">
          <span class="yeggi-title">Search <strong>"${escHtml(query)}"</strong> across all STL platforms</span>
          <span class="yeggi-sub">via Yeggi — searches Thingiverse, Printables, MyMiniFactory, Cults3D &amp; more</span>
        </span>
        <span class="yeggi-cta">
          Open Yeggi
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/>
          </svg>
        </span>
      </a>
      <div class="sr-also">
        <span class="sr-also-label">Or search directly on</span>
        ${otherLinks}
      </div>`;
    stlResults.hidden = false;
  }

  // ===================================================
  // SORT
  // ===================================================
  function setupSort() {
    document.querySelectorAll('.sort-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        currentSort = btn.dataset.sort;
        document.querySelectorAll('.sort-btn').forEach(b => b.classList.toggle('active', b.dataset.sort === currentSort));
        renderCategories();
      });
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

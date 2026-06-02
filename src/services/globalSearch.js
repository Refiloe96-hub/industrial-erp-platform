// Global search — extracted from main.js
import db from '../db/index.js';
import { esc, sym } from '../utils/safeJson.js';

export function initGlobalSearch(app) {
    // Inject overlay into DOM once
    if (!document.getElementById('global-search-overlay')) {
      const el = document.createElement('div');
      el.id = 'global-search-overlay';
      el.className = 'gs-overlay';
      el.style.display = 'none';
      el.setAttribute('aria-modal', 'true');
      el.setAttribute('role', 'dialog');
      el.innerHTML = `
        <div class="gs-modal" id="gs-modal">
          <div class="gs-input-row">
            <i class="ph ph-magnifying-glass"></i>
            <input type="text" id="gs-input" placeholder="Search products, customers, modules…" autocomplete="off" spellcheck="false">
            <kbd class="gs-esc">ESC</kbd>
          </div>
          <div id="gs-results" class="gs-results"></div>
          <div class="gs-hint">
            <span><kbd>↑↓</kbd> navigate</span>
            <span><kbd>↵</kbd> open</span>
            <span><kbd>ESC</kbd> close</span>
          </div>
        </div>
      `;
      document.body.appendChild(el);
    }

    const overlay = document.getElementById('global-search-overlay');
    const input = document.getElementById('gs-input');
    let debounceTimer = null;
    let selectedIndex = -1;

    const open = () => {
      overlay.style.display = 'flex';
      input.value = '';
      selectedIndex = -1;
      app._renderSearchResults([]);
      setTimeout(() => input.focus(), 50);
    };

    const close = () => {
      overlay.style.display = 'none';
      input.value = '';
    };

    // Keyboard shortcut
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        overlay.style.display === 'none' ? open() : close();
      }
      if (e.key === 'Escape' && overlay.style.display !== 'none') close();
    });

    // Click outside to close
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

    // Header search buttons (desktop + mobile)
    document.getElementById('search-toggle-btn')?.addEventListener('click', open);
    document.getElementById('mobile-search-btn')?.addEventListener('click', open);

    // Typing handler
    input?.addEventListener('input', (e) => {
      clearTimeout(debounceTimer);
      const q = e.target.value.trim();
      if (!q) { app._renderSearchResults([]); selectedIndex = -1; return; }
      debounceTimer = setTimeout(() => app._runSearch(q), 220);
    });

    // Keyboard navigation within results
    input?.addEventListener('keydown', (e) => {
      const items = document.querySelectorAll('.gs-item');
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
        items.forEach((item, i) => item.classList.toggle('gs-selected', i === selectedIndex));
        items[selectedIndex]?.scrollIntoView({ block: 'nearest' });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        selectedIndex = Math.max(selectedIndex - 1, 0);
        items.forEach((item, i) => item.classList.toggle('gs-selected', i === selectedIndex));
        items[selectedIndex]?.scrollIntoView({ block: 'nearest' });
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const selected = items[selectedIndex] ?? items[0];
        selected?.click();
      }
    });
  }

export async function runSearch(app, query) {
    const q = query.toLowerCase();
    const results = [];

    // Modules (instant, no DB)
    const moduleList = [
      { id: 'dashboard',    label: 'Dashboard',    icon: 'ph-duotone ph-chart-bar' },
      { id: 'sales',        label: 'Sales (POS)',  icon: 'ph-duotone ph-shopping-cart' },
      { id: 'pocketbooks',  label: 'PocketBooks',  icon: 'ph-duotone ph-wallet' },
      { id: 'poolstock',    label: 'PoolStock',    icon: 'ph-duotone ph-package' },
      { id: 'smartshift',   label: 'SmartShift',   icon: 'ph-duotone ph-gear' },
      { id: 'trustcircle',  label: 'TrustCircle',  icon: 'ph-duotone ph-users-three' },
      { id: 'pocketwallet', label: 'PocketWallet', icon: 'ph-duotone ph-credit-card' },
      { id: 'reports',      label: 'Reports',      icon: 'ph-duotone ph-trend-up' },
      { id: 'customers',    label: 'Customers',    icon: 'ph-duotone ph-user-list' },
      { id: 'settings',     label: 'Settings',     icon: 'ph-duotone ph-gear-six' },
    ].filter(m => m.label.toLowerCase().includes(q) || m.id.includes(q));

    if (moduleList.length) results.push({ group: 'Modules', items: moduleList.map(m => ({ ...m, action: () => { document.getElementById('global-search-overlay').style.display = 'none'; app.navigateTo(m.id); }, sub: 'Navigate' })) });

    // Products
    try {
      const items = await db.getAll('inventory');
      const matched = items.filter(i => (i.name || '').toLowerCase().includes(q) || (i.sku || '').toLowerCase().includes(q) || (i.category || '').toLowerCase().includes(q)).slice(0, 6);
      if (matched.length) results.push({ group: 'Products', items: matched.map(i => ({ id: i.sku, label: i.name, icon: 'ph-duotone ph-package', sub: `${i.category || '—'}  ·  ${i.quantity ?? '?'} in stock`, action: () => { document.getElementById('global-search-overlay').style.display = 'none'; app.navigateTo('poolstock'); } })) });
    } catch {}

    // Customers
    try {
      const customers = await db.getAll('customers');
      const matched = customers.filter(c => (c.name || '').toLowerCase().includes(q) || (c.phone || '').includes(q)).slice(0, 4);
      if (matched.length) results.push({ group: 'Customers', items: matched.map(c => ({ id: c.id, label: c.name, icon: 'ph-duotone ph-user', sub: c.phone || 'No phone', action: () => { document.getElementById('global-search-overlay').style.display = 'none'; app.navigateTo('customers'); } })) });
    } catch {}

    // Transactions
    try {
      const txs = await db.getAll('transactions');
      const matched = txs.filter(t => (t.description || t.category || '').toLowerCase().includes(q)).slice(0, 4);
      if (matched.length) results.push({ group: 'Transactions', items: matched.map(t => ({ id: t.id, label: t.description || t.category, icon: 'ph-duotone ph-receipt', sub: `${sym()}${(t.amount || 0).toFixed(2)}`, action: () => { document.getElementById('global-search-overlay').style.display = 'none'; app.navigateTo('pocketbooks'); } })) });
    } catch {}

    app._renderSearchResults(results, query);
  }

export function renderSearchResults(app, results, query = '') {
    const container = document.getElementById('gs-results');
    if (!container) return;

    if (!query || results.length === 0) {
      container.innerHTML = query
        ? `<div class="gs-empty">No results for "<strong>${esc(query)}</strong>"</div>`
        : `<div class="gs-empty" style="padding:1.5rem 1rem;">Type to search across products, customers, modules…</div>`;
      return;
    }

    container.innerHTML = results.map(group => `
      <div class="gs-group-label">${esc(group.group)}</div>
      ${group.items.map(item => `
        <button class="gs-item" data-action-id="${esc(item.id)}">
          <span class="gs-item-icon"><i class="${esc(item.icon)}"></i></span>
          <span class="gs-item-title">${esc(item.label)}</span>
          ${item.sub ? `<span class="gs-item-sub">${esc(item.sub)}</span>` : ''}
        </button>
      `).join('')}
    `).join('');

    // Wire click handlers (using stored actions map to avoid XSS via data attrs)
    const actionMap = {};
    results.forEach(group => group.items.forEach(item => { actionMap[item.id] = item.action; }));
    container.querySelectorAll('.gs-item').forEach(btn => {
      btn.addEventListener('click', () => { actionMap[btn.dataset.actionId]?.(); });
    });
  }
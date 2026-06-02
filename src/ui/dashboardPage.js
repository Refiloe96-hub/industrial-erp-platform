// Dashboard page rendering — extracted from main.js
import { esc } from '../utils/safeJson.js';

export function renderDashboard(app) {
    const userModules = app.getModulesForUser();
    const businessLabel = BUSINESS_LABELS[app.currentUser.businessType] || 'Dashboard';

    // Generate sidebar nav items dynamically
    const navItems = userModules.map(mod => {
      const info = MODULE_INFO[mod];
      return `
        <li class="nav-item ${mod === 'dashboard' ? 'active' : ''}" data-module="${mod}">
          <i class="nav-icon ${info.icon}"></i>
          <span>${info.label}</span>
          ${info.badge ? `<span class="nav-badge">${info.badge}</span>` : ''}
        </li>
      `;
    }).join('');

    // Generate bottom nav items (limited to 5 for mobile)
    const bottomNavItems = userModules.slice(0, 5).map(mod => {
      const info = MODULE_INFO[mod];
      return `
        <li class="bottom-nav-item ${mod === 'dashboard' ? 'active' : ''}" data-module="${mod}">
          <i class="nav-icon ${info.icon}"></i>
          <span>${info.label}</span>
        </li>
      `;
    }).join('');

    return `
      <!-- Mobile Header -->
      <header class="mobile-header">
        <button class="menu-toggle" id="menu-toggle" aria-label="Open navigation menu"><i class="ph ph-list"></i></button>
        <h1>${esc(app.currentUser.businessName)}</h1>
        <div style="display:flex;gap:0.375rem;align-items:center;">
          <button class="btn-icon" id="mobile-search-btn" aria-label="Search" style="font-size:1rem;"><i class="ph ph-magnifying-glass"></i></button>
          <button class="btn-icon notification-btn" id="mobile-notification-btn" aria-label="Notifications"><i class="ph-duotone ph-bell"></i></button>
        </div>
      </header>

      <!-- Sidebar Overlay -->
      <div class="sidebar-overlay" id="sidebar-overlay"></div>

      <div class="app-layout">
        <nav class="sidebar" id="sidebar">
          <div class="sidebar-header">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:0.5rem;">
              <div style="display:flex;align-items:center;gap:0.625rem;min-width:0;">
                <span style="width:28px;height:28px;border-radius:6px;background:rgba(37,99,235,0.15);border:1px solid rgba(37,99,235,0.2);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                  ${app.config?.businessLogo ? `<img src="${app.config.businessLogo}" style="width:100%;height:100%;object-fit:contain;border-radius:6px;">` : '<i class="ph-bold ph-buildings" style="font-size:0.875rem;color:#60a5fa;"></i>'}
                </span>
                <div style="min-width:0;">
                  <p class="business-name">${esc(app.currentUser.businessName)}</p>
                  <p class="business-type">${businessLabel}</p>
                </div>
              </div>
              <button id="sidebar-toggle-btn" class="btn-icon" aria-label="Collapse sidebar" style="background:transparent;border:none;width:28px;height:28px;padding:4px;flex-shrink:0;color:var(--text-muted);">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
              </button>
            </div>
          </div>
          
          <ul class="nav-menu">
            ${navItems}
          </ul>
          
          <!-- Sync status indicator -->
          <div id="sync-indicator" class="sync-indicator" title="Cloud sync status">
            <span class="sync-dot"></span>
            <span class="sync-label">Offline</span>
          </div>

          <div class="sidebar-footer" style="position:relative;">
            <!-- User dropdown (opens upward) -->
            <div id="user-dropdown" class="user-dropdown" aria-hidden="true">
              <div class="ud-header">
                <span class="ud-hname">${esc(app.currentUser.businessName)}</span>
                <span class="ud-hemail">${esc(app.currentUser.email || '')}</span>
              </div>
              <div class="ud-section">
                <button class="ud-item" id="settings-nav-btn"><i class="ph ph-gear-six"></i> Settings</button>
                <button class="ud-item" id="upgrade-btn"><i class="ph ph-arrow-circle-up"></i> Upgrade Plan</button>
                <button class="ud-item" id="install-btn" style="display:none;"><i class="ph ph-device-mobile"></i> Install App</button>
              </div>
              <div class="ud-section ud-section--danger">
                <button class="ud-item ud-item--danger" id="logout-btn"><i class="ph ph-sign-out"></i> Log out</button>
              </div>
            </div>
            <!-- Trigger -->
            <button id="user-menu-btn" class="user-profile-trigger" aria-label="User menu" aria-haspopup="true" aria-expanded="false">
              <div class="user-avatar">${esc(app.currentUser.businessName.charAt(0).toUpperCase())}</div>
              <div class="user-meta">
                <span class="user-meta-name">${esc(app.currentUser.businessName)}</span>
                <span class="user-meta-email">${esc(app.currentUser.email || '')}</span>
              </div>
              <i class="ph ph-dots-three user-menu-dots"></i>
            </button>
          </div>
        </nav>
        
        <main class="main-content">
          <header class="content-header">
            <h1 id="module-title">${businessLabel}</h1>
            <div class="header-actions">
              <button class="btn-icon" id="search-toggle-btn" title="Search (Ctrl+K)" aria-label="Search" style="font-size:1rem;">
                <i class="ph ph-magnifying-glass"></i>
              </button>
              <button class="theme-toggle" id="theme-toggle-btn" aria-label="Toggle theme">
                <i class="ph ph-sun" id="theme-icon"></i>
              </button>
              <button class="btn-icon notification-btn" id="notification-btn" title="Notifications" aria-label="Notifications">
                <i class="ph-duotone ph-bell"></i>
                <span class="notification-badge" id="notification-badge" style="display: none;">0</span>
              </button>
            </div>
          </header>

          <!-- Notification Panel -->
          <div id="notification-panel" class="notification-panel" style="display: none;">
            <div class="notification-header">
              <h3>Notifications</h3>
              <button id="mark-all-read" class="btn btn-sm btn-secondary">Mark All Read</button>
            </div>
            <div id="notification-list" class="notification-list">
              <p class="text-muted">Loading notifications...</p>
            </div>
          </div>
          
          <div id="content-area" class="content-area">
            ${app.renderDashboardContent()}
          </div>
        </main>

        <!-- Bottom Navigation (Mobile) - PERSISTENT ACROSS ALL PAGES -->
        <nav class="bottom-nav" id="bottom-nav">
          <ul class="bottom-nav-items" id="bottom-nav-items">
            ${bottomNavItems}
          </ul>
        </nav>
      </div>
      
      ${app.renderStyles()}
    `;
  }

export function renderDashboardContent(app, bottomNavItems) {
    return `
      <div class="dashboard-grid">
        <!-- Quick Stats: 2-column sub-grid on mobile -->
        <div class="dashboard-stats-row">
          <div class="card stat-card" data-card="cashflow" style="cursor:pointer" title="Click for details">
            <div class="stat-content">
              <p class="stat-label">Cash Flow</p>
              <h3 id="stat-cash-flow" class="stat-value">—</h3>
            </div>
          </div>

          <div class="card stat-card" data-card="inventory" style="cursor:pointer" title="Click for details">
            <div class="stat-content">
              <p class="stat-label">Inventory</p>
              <h3 id="stat-inventory" class="stat-value">—</h3>
            </div>
          </div>

          <div class="card stat-card" data-card="machines" style="cursor:pointer" title="Click for details">
            <div class="stat-content">
              <p class="stat-label">Machine Utilization</p>
              <h3 id="stat-machine-util" class="stat-value">—</h3>
            </div>
          </div>

          <div class="card stat-card" data-card="syndicates" style="cursor:pointer" title="Click for details">
            <div class="stat-content">
              <p class="stat-label">Syndicates</p>
              <h3 id="stat-syndicates" class="stat-value">—</h3>
            </div>
          </div>
        </div>

        <!-- Charts Section -->
        <div class="card chart-card">
          <div class="card-header">
            <h3>Cash Flow</h3>
          </div>
          <div class="card-body" id="chart-cashflow"></div>
        </div>

        <div class="card chart-card">
          <div class="card-header">
            <h3>Inventory Breakdown</h3>
          </div>
          <div class="card-body" id="chart-inventory"></div>
        </div>

        <div class="card chart-card">
          <div class="card-header">
            <h3>Machine Status</h3>
          </div>
          <div class="card-body" id="chart-machines"></div>
        </div>

        <div class="card chart-card">
          <div class="card-header">
            <h3>Syndicate Health</h3>
          </div>
          <div class="card-body" id="chart-syndicates"></div>
        </div>

        <!-- Business Insights — below charts, not the first thing you see -->
        <div class="card full-width" id="ai-advisor-card" style="margin-top:0.25rem;">
          <div class="card-header" style="display:flex;align-items:center;justify-content:space-between;">
            <div>
              <h3 style="margin:0;font-size:0.875rem;font-weight:600;">Business Insights</h3>
              <p style="margin:0.125rem 0 0;font-size:0.75rem;color:var(--text-muted);">Across all modules</p>
            </div>
            <button id="ai-refresh-btn" style="background:none;border:1px solid var(--border);border-radius:6px;padding:0.3rem 0.625rem;cursor:pointer;color:var(--text-secondary);font-size:0.75rem;display:flex;align-items:center;gap:0.3rem;" aria-label="Refresh insights">
              <i class="ph ph-arrows-clockwise"></i> Refresh
            </button>
          </div>
          <div class="card-body">
            <div id="ai-module-scores" style="display:flex;gap:0.625rem;flex-wrap:wrap;margin-bottom:0.875rem;padding-bottom:0.75rem;border-bottom:1px solid var(--border);"></div>
            <div id="ai-insights-list" style="display:flex;flex-direction:column;gap:0.375rem;">
              <span style="font-size:0.8125rem;color:var(--text-muted);">Analysing your data...</span>
            </div>
            <p id="ai-source-note" style="margin:0.75rem 0 0;font-size:0.6875rem;color:var(--text-muted);display:none;">
              Add a Groq API key in Settings for deeper analysis.
            </p>
          </div>
        </div>
      </div>
    `;
  }
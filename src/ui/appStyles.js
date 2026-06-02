// App shell CSS — extracted from main.js for maintainability
// Called by IndustrialERPApp.renderDashboard() in main.js

export function renderAppStyles() {
    return `
      <style>
        :root {
          --bg-base:        #0d0d0f;
          --bg-sidebar:     #0d0d0f;
          --bg-secondary:   #111113;
          --bg-primary:     #18181b;
          --bg-elevated:    #232326;
          --bg-hover:       rgba(255,255,255,0.04);

          --text-primary:   #f4f4f5;
          --text-secondary: #a1a1aa;
          --text-muted:     #52525b;

          --border:         rgba(255,255,255,0.08);
          --border-color:   rgba(255,255,255,0.08);
          --border-strong:  rgba(255,255,255,0.14);

          /* Single accent — consistent with landing page */
          --accent:         #2563eb;
          --accent-hover:   #1d4ed8;
          --primary:        #2563eb;
          --primary-color:  #2563eb;
          --accent-primary: #2563eb;

          --success: #10b981;
          --warning: #f59e0b;
          --danger:  #ef4444;

          --card-shadow:  0 1px 3px rgba(0,0,0,0.4);
          --modal-shadow: 0 24px 48px rgba(0,0,0,0.6);

          --radius-sm: 6px;
          --radius-md: 8px;
          --radius-lg: 10px;
          --shadow-sm:  0 1px 3px rgba(0,0,0,0.4);
          --shadow-lg:  0 24px 48px rgba(0,0,0,0.6);
        }

        /* Global dark dialog override - browser renders dialog with white Canvas background by default */
        dialog,
        .tc-modal,
        .item-modal {
          background: var(--bg-primary) !important;
          color: var(--text-primary) !important;
          border: 1px solid var(--border) !important;
          border-radius: 12px !important;
        }

        dialog::backdrop,
        .tc-modal::backdrop {
          background: rgba(0, 0, 0, 0.75) !important;
          backdrop-filter: blur(4px);
        }

        dialog h3,
        .tc-modal h3 {
          color: var(--text-primary) !important;
        }

        dialog label,
        .tc-modal label {
          color: var(--text-secondary) !important;
        }

        dialog input,
        dialog select,
        dialog textarea,
        .tc-modal input,
        .tc-modal select,
        .tc-modal textarea {
          background: var(--bg-secondary) !important;
          color: var(--text-primary) !important;
          border: 1px solid var(--border) !important;
          border-radius: 6px !important;
          padding: 0.5rem !important;
          width: 100% !important;
        }

        dialog button[value="cancel"],
        dialog .btn-secondary,
        .tc-modal button[value="cancel"],
        .tc-modal .btn-secondary {
          background: var(--bg-secondary) !important;
          color: var(--text-primary) !important;
          border: 1px solid var(--border) !important;
        }

        /* DeepPCB Table Styles */
        .table-container {
          background: var(--bg-primary);
          border-radius: 12px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
          overflow: hidden;
          margin-bottom: 1.5rem;
          border: 1px solid var(--border);
        }

        .data-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.95rem;
        }

        .data-table th {
          background: var(--bg-secondary);
          padding: 1rem 1.5rem;
          text-align: left;
          font-weight: 600;
          color: var(--text-secondary);
          border-bottom: 1px solid var(--border);
          white-space: nowrap;
        }

        .data-table td {
          padding: 1rem 1.5rem;
          border-bottom: 1px solid var(--border);
          color: var(--text-primary);
        }

        .data-table tr:last-child td {
          border-bottom: none;
        }

        .data-table tr:hover {
          background-color: var(--bg-secondary);
        }

        .data-table .risk-score {
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-weight: 600;
          font-size: 0.85rem;
        }
        
        .risk-score.good   { background: rgba(16,185,129,0.12); color: #34d399; }
        .risk-score.medium { background: rgba(245,158,11,0.12); color: #fbbf24; }
        .risk-score.bad    { background: rgba(239,68,68,0.12);  color: #f87171; }

        .app-layout {
          display: flex;
          min-height: 100vh;
        }
        
        .sidebar {
          width: 16.25rem; /* 260px -> rem */
          background: var(--bg-sidebar); 
          color: var(--text-primary);
          border-right: 1px solid var(--border-color);
          display: flex;
          flex-direction: column;
          position: fixed;
          height: 100vh;
          overflow-y: hidden; /* Outer sidebar never scrolls */
          transition: width 0.3s ease;
          z-index: 100;
        }

        /* Make the nav-menu scrollable so footer is always visible */
        .nav-menu {
          flex: 1;
          overflow-y: auto;
          padding: 0.5rem 0;
        }

        /* Footer always pinned to the bottom of the sidebar */
        .sidebar-footer {
          flex-shrink: 0;
          position: sticky;
          bottom: 0;
          background: var(--bg-sidebar);
          padding: 0.5rem;
          border-top: 1px solid var(--border);
          z-index: 2;
        }

        /* ── Global search ── */
        .gs-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.6);
          z-index: 9000;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding-top: 10vh;
          animation: gsFadeIn 0.12s ease;
        }
        @keyframes gsFadeIn {
          from { opacity:0; }
          to   { opacity:1; }
        }
        .gs-modal {
          background: var(--bg-elevated, #232326);
          border: 1px solid var(--border-strong);
          border-radius: 12px;
          width: min(600px, 94vw);
          box-shadow: 0 24px 48px rgba(0,0,0,0.5);
          overflow: hidden;
          animation: gsSlideDown 0.14s ease;
        }
        @keyframes gsSlideDown {
          from { transform: translateY(-12px); opacity:0; }
          to   { transform: translateY(0); opacity:1; }
        }
        .gs-input-row {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.875rem 1rem;
          border-bottom: 1px solid var(--border);
        }
        .gs-input-row i { color: var(--text-muted); font-size: 1.1rem; flex-shrink: 0; }
        .gs-input-row input {
          flex: 1;
          background: none;
          border: none;
          outline: none;
          font-size: 1rem;
          color: var(--text-primary);
          font-family: inherit;
        }
        .gs-input-row input::placeholder { color: var(--text-muted); }
        .gs-esc {
          font-size: 0.6875rem;
          background: var(--bg-hover);
          border: 1px solid var(--border);
          border-radius: 4px;
          padding: 0.125rem 0.375rem;
          color: var(--text-muted);
          flex-shrink: 0;
          font-family: inherit;
        }
        .gs-results {
          max-height: 400px;
          overflow-y: auto;
        }
        .gs-group-label {
          font-size: 0.6875rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.07em;
          color: var(--text-muted);
          padding: 0.625rem 1rem 0.25rem;
        }
        .gs-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.625rem 1rem;
          cursor: pointer;
          transition: background 0.1s;
          border: none;
          background: none;
          width: 100%;
          text-align: left;
          font-family: inherit;
          color: var(--text-primary);
        }
        .gs-item:hover, .gs-item.gs-selected {
          background: var(--bg-hover);
        }
        .gs-item-icon {
          width: 28px; height: 28px;
          border-radius: 6px;
          background: rgba(37,99,235,0.1);
          color: #60a5fa;
          display: flex; align-items: center; justify-content: center;
          font-size: 0.875rem;
          flex-shrink: 0;
        }
        .gs-item-title {
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          flex: 1;
        }
        .gs-item-sub {
          font-size: 0.75rem;
          color: var(--text-muted);
          white-space: nowrap;
        }
        .gs-empty {
          padding: 2.5rem 1rem;
          text-align: center;
          color: var(--text-muted);
          font-size: 0.875rem;
        }
        .gs-hint {
          padding: 0.625rem 1rem;
          border-top: 1px solid var(--border);
          display: flex;
          gap: 1rem;
          font-size: 0.6875rem;
          color: var(--text-muted);
        }
        .gs-hint kbd {
          background: var(--bg-hover);
          border: 1px solid var(--border);
          border-radius: 3px;
          padding: 0 0.3rem;
          font-family: inherit;
        }

        /* ── Theme toggle ── */
        .theme-toggle {
          width: 32px; height: 32px;
          border-radius: 6px;
          border: none;
          background: transparent;
          color: var(--text-muted);
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          font-size: 1rem;
          transition: background 0.15s, color 0.15s;
        }
        .theme-toggle:hover { background: var(--bg-hover); color: var(--text-primary); }

        /* ── Light mode overrides ── */
        [data-theme="light"] {
          --bg-base:        #f8f9fb;
          --bg-sidebar:     #f1f3f7;
          --bg-secondary:   #f1f3f7;
          --bg-primary:     #ffffff;
          --bg-elevated:    #eef0f4;
          --bg-hover:       rgba(0,0,0,0.04);

          --text-primary:   #111118;
          --text-secondary: #4b5563;
          --text-muted:     #9ca3af;

          --border:         rgba(0,0,0,0.09);
          --border-color:   rgba(0,0,0,0.09);
          --border-strong:  rgba(0,0,0,0.16);

          --accent:         #2563eb;
          --accent-hover:   #1d4ed8;
          --primary:        #2563eb;
          --primary-color:  #2563eb;
          --accent-primary: #2563eb;

          --card-shadow: 0 1px 3px rgba(0,0,0,0.08);
        }

        [data-theme="light"] body,
        [data-theme="light"] #app {
          background: var(--bg-base);
          color: var(--text-primary);
        }

        [data-theme="light"] .sidebar { box-shadow: 1px 0 0 var(--border); }

        [data-theme="light"] .nav-item.active {
          background: rgba(37,99,235,0.08);
          color: #1d4ed8;
        }

        [data-theme="light"] .content-header {
          background: var(--bg-primary);
        }

        [data-theme="light"] .user-dropdown {
          background: #ffffff;
        }

        [data-theme="light"] .bottom-nav {
          background: var(--bg-primary);
        }

        /* ── User profile trigger ── */
        .user-profile-trigger {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          width: 100%;
          padding: 0.5rem 0.625rem;
          background: none;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          text-align: left;
          transition: background 0.15s;
          color: var(--text-primary);
          min-width: 0;
        }
        .user-profile-trigger:hover { background: var(--bg-hover); }

        .user-avatar {
          width: 28px; height: 28px;
          border-radius: 50%;
          background: rgba(37,99,235,0.18);
          border: 1px solid rgba(37,99,235,0.25);
          color: #93c5fd;
          font-size: 0.6875rem;
          font-weight: 700;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          text-transform: uppercase;
        }

        .user-meta {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 1px;
        }
        .user-meta-name {
          font-size: 0.8125rem;
          font-weight: 600;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          line-height: 1.2;
        }
        .user-meta-email {
          font-size: 0.6875rem;
          color: var(--text-muted);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          line-height: 1.2;
        }
        .user-menu-dots {
          color: var(--text-muted);
          flex-shrink: 0;
          font-size: 1.1rem;
        }

        /* ── User dropdown ── */
        .user-dropdown {
          position: absolute;
          bottom: calc(100% + 6px);
          left: 0.375rem;
          right: 0.375rem;
          background: var(--bg-elevated, #232326);
          border: 1px solid var(--border-strong, rgba(255,255,255,0.14));
          border-radius: 10px;
          box-shadow: 0 -8px 24px rgba(0,0,0,0.45), 0 2px 8px rgba(0,0,0,0.3);
          overflow: hidden;
          z-index: 300;
          display: none;
          animation: udFadeIn 0.12s ease;
        }
        @keyframes udFadeIn {
          from { opacity:0; transform:translateY(6px); }
          to   { opacity:1; transform:translateY(0); }
        }
        .user-dropdown.open { display: block; }

        .ud-header {
          padding: 0.875rem 1rem 0.75rem;
          border-bottom: 1px solid var(--border);
        }
        .ud-hname {
          display: block;
          font-size: 0.8125rem;
          font-weight: 600;
          color: var(--text-primary);
          line-height: 1.3;
        }
        .ud-hemail {
          display: block;
          font-size: 0.6875rem;
          color: var(--text-muted);
          margin-top: 0.125rem;
          word-break: break-all;
        }
        .ud-section {
          padding: 0.3rem;
        }
        .ud-section--danger {
          border-top: 1px solid var(--border);
          padding: 0.3rem;
        }
        .ud-item {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          width: 100%;
          padding: 0.5rem 0.75rem;
          background: none;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.8125rem;
          color: var(--text-primary);
          text-align: left;
          transition: background 0.1s;
          font-family: inherit;
        }
        .ud-item:hover { background: var(--bg-hover); }
        .ud-item i { color: var(--text-muted); font-size: 0.9375rem; flex-shrink: 0; }
        .ud-item--danger { color: var(--danger, #ef4444); }
        .ud-item--danger i { color: var(--danger, #ef4444); }
        .ud-item--danger:hover { background: rgba(239,68,68,0.08); }

        /* Collapsed sidebar: hide meta, center avatar */
        .sidebar.collapsed .user-meta,
        .sidebar.collapsed .user-menu-dots { display: none; }
        .sidebar.collapsed .user-profile-trigger { justify-content: center; padding: 0.5rem; }
        .sidebar.collapsed .user-dropdown { left: 100%; bottom: 0; top: auto; margin-left: 4px; width: 220px; }

        .sidebar.collapsed {
            width: 4.375rem; /* 70px -> rem */
        }

        /* Hide text elements when collapsed */
        .sidebar.collapsed .business-name,
        .sidebar.collapsed .business-type,
        .sidebar.collapsed .nav-item span:nth-child(2),
        .sidebar.collapsed .nav-badge,
        .sidebar.collapsed .sidebar-header h2 {
            display: none;
        }
        
        /* Collapsed footer handled by .user-profile-trigger rules above */

        /* Ensure header layout adapts */
        .sidebar.collapsed .sidebar-header div {
            justify-content: center !important;
        }

        .sidebar.collapsed .sidebar-header {
            padding: 1rem 0.5rem;
            display: flex;
            flex-direction: column;
            align-items: center;
        }

        .sidebar.collapsed .nav-item {
            padding: 0.6rem 0.5rem;
            justify-content: center;
        }

        .sidebar.collapsed .nav-icon {
            font-size: 1.5rem;
            margin: 0;
        }
        
        .sidebar-toggle-btn {
            display: block !important;
        }

        .sidebar.collapsed .sidebar-footer {
            padding: 0.5rem;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 0.5rem;
        }
        
        .main-content {
          margin-left: 260px;
          flex: 1;
          background: var(--bg-secondary);
          transition: margin-left 0.3s ease;
          min-width: 0;
        }

        .sidebar.collapsed + .main-content {
            margin-left: 4.375rem; /* 70px -> rem */
        }

        /* Hidden sidebar (for full-screen pages like Pricing) */
        .sidebar.hidden {
            transform: translateX(-100%);
            width: 0 !important;
        }
        
        .sidebar.hidden + .main-content {
            margin-left: 0 !important;
        }
        
        .sidebar-header {
          padding: 1rem 1rem 1rem 1.25rem;
          border-bottom: 1px solid var(--border);
          flex-shrink: 0;
        }

        .sidebar-header h2 {
          margin-bottom: 0.25rem;
          font-size: 0.9375rem;
          font-weight: 600;
          letter-spacing: -0.01em;
        }

        .business-name {
          font-size: 0.8125rem;
          font-weight: 600;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .business-type {
          font-size: 0.75rem;
          color: var(--text-muted);
          margin-top: 0.125rem;
          text-transform: capitalize;
        }
        
        .nav-menu {
          flex: 1;
          list-style: none;
          padding: 0.5rem 0;
          overflow-y: auto; /* Allow scrolling if needed, better than hiding */
          display: flex;
          flex-direction: column;
          /* Removed justify-content: center to prevent clipping top items */
        }
        
        .nav-menu::-webkit-scrollbar {
            width: 4px;
        }
        
        .nav-menu::-webkit-scrollbar-thumb {
            background: rgba(255,255,255,0.2);
            border-radius: 2px;
        }
        
        .nav-item {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          padding: 0.5rem 0.875rem;
          margin: 1px 0.5rem;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.875rem;
          color: var(--text-secondary);
          transition: background 0.15s, color 0.15s;
        }

        .nav-item:hover {
          background: var(--bg-hover);
          color: var(--text-primary);
        }

        .nav-item.active {
          background: rgba(37,99,235,0.1);
          color: #93c5fd;
        }

        .nav-icon {
          font-size: 1rem;
          flex-shrink: 0;
        }

        .nav-badge { display: none; }
        
        .sidebar-footer {
          padding: 1rem;
          border-top: 1px solid rgba(255,255,255,0.1);
        }
        
        /* NOTE: duplicate removed - see .main-content above */
        
        .content-header {
          background: var(--bg-secondary);
          padding: 0.875rem 1.75rem;
          border-bottom: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: space-between;
          position: sticky;
          top: 0;
          z-index: 10;
        }

        .content-header h1 {
          margin: 0;
          font-size: 1rem;
          font-weight: 600;
          letter-spacing: -0.01em;
        }
        
        .header-actions {
          display: flex;
          gap: 0.5rem;
        }
        
        .btn-icon {
          width: 40px;
          height: 40px;
          border: none;
          background: var(--bg-secondary);
          color: var(--text-primary); /* Ensure icon takes text color */
          border-radius: 8px;
          cursor: pointer;
          font-size: 1.25rem;
          transition: background 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .btn-icon:hover {
          background: var(--border);
        }
        
        .content-area {
          padding: 2rem;
          /* Prevent content from being hidden behind fixed bottom nav on mobile */
          padding-bottom: 5rem;
          overflow-x: hidden;
        }
        
        .dashboard-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr));
          gap: 1rem;
        }

        .dashboard-stats-row {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1rem;
          grid-column: 1 / -1;
        }
        
        .card {
          background: var(--bg-primary);
          border-radius: 8px;
          padding: 0;
          box-shadow: var(--card-shadow);
          border: 1px solid var(--border);
          overflow: hidden;
        }
        
        .card.full-width {
          grid-column: 1 / -1;
        }
        
        .card-header {
          margin-bottom: 1rem;
        }
        
        .card-header h3 {
          font-size: 0.875rem;
          font-weight: 600;
          letter-spacing: -0.005em;
          color: var(--text-primary);
        }
        
        .ai-alert {
          background: var(--bg-primary);
          border-left: 3px solid var(--accent);
          position: relative;
          overflow: hidden;
        }
        .ai-alert .card-header h3 { color: var(--accent); }
        .ai-alert .alert-text { color: var(--text-secondary); font-size: 0.875rem; margin-bottom: 1rem; }
        .ai-alert .btn-primary { background: var(--accent); font-size: 0.875rem; padding: 0.5rem 1.25rem; }
        .ai-alert .btn-primary:hover { background: var(--accent-hover); }
        
        .stat-card {
          padding: 1.125rem 1.25rem;
          cursor: pointer;
          transition: background 0.15s;
        }
        .stat-card:hover { background: var(--bg-elevated); }

        .stat-icon { display: none; }

        .stat-content { display: block; }

        .stat-label {
          font-size: 0.6875rem;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.07em;
          color: var(--text-muted);
          margin-bottom: 0.375rem;
        }

        .stat-value {
          font-size: 1.5rem;
          font-weight: 700;
          letter-spacing: -0.02em;
          color: var(--text-primary);
          margin-bottom: 0.25rem;
          line-height: 1.2;
        }

        .stat-change {
          font-size: 0.75rem;
          color: var(--text-muted);
        }

        .stat-change.positive { color: var(--success); }
        
        .btn-secondary {
          background: rgba(255,255,255,0.1);
          color: white;
          border: 1px solid rgba(255,255,255,0.2);
          cursor: pointer;
        }
        
        .btn-sm {
          padding: 0.5rem 1rem;
          font-size: 0.875rem;
          cursor: pointer;
        }
        
        /* ── Global utility classes ─────────────────────────────── */
        .text-muted    { color: var(--text-muted); }
        .text-secondary { color: var(--text-secondary); }
        .text-danger   { color: var(--danger); }
        .text-success  { color: var(--success); }
        .text-warning  { color: var(--warning); }
        .text-center   { text-align: center; }
        .text-right    { text-align: right; }
        .font-bold     { font-weight: 700; }
        .font-medium   { font-weight: 500; }

        .mt-1 { margin-top: 0.25rem; }
        .mt-2 { margin-top: 0.5rem; }
        .mt-3 { margin-top: 0.75rem; }
        .mt-4 { margin-top: 1rem; }
        .mb-1 { margin-bottom: 0.25rem; }
        .mb-2 { margin-bottom: 0.5rem; }
        .mb-3 { margin-bottom: 0.75rem; }
        .mb-4 { margin-bottom: 1rem; }
        .w-100 { width: 100%; }
        .col-span-full { grid-column: 1 / -1; }

        /* Text button (looks like a link) */
        .btn-text {
          background: none;
          border: none;
          cursor: pointer;
          font-size: inherit;
          font-family: inherit;
          padding: 0;
          color: var(--text-secondary);
          transition: color 0.15s;
        }
        .btn-text:hover { color: var(--text-primary); }
        .btn-text.text-danger { color: var(--danger); }
        .btn-text.text-danger:hover { opacity: 0.8; }

        .btn-block { width: 100%; }

        @media (max-width: 768px) {
          .sidebar {
            width: 100%;
            height: auto;
            position: relative;
          }
          
          .main-content {
            margin-left: 0;
          }
          
          .dashboard-grid {
            grid-template-columns: 1fr;
          }
        }

        /* Module Nav */
        .module-nav {
            display: flex;
            gap: 1rem;
            margin-bottom: 1.5rem;
            border-bottom: 1px solid var(--border);
            padding-bottom: 0.5rem;
        }

        .btn-tab {
            background: none;
            border: none;
            padding: 0.5rem 1rem;
            font-size: 1rem;
            color: var(--text-secondary);
            cursor: pointer;
            border-bottom: 2px solid transparent;
        }

        .btn-tab.active {
            color: var(--accent);
            border-bottom-color: var(--accent);
            font-weight: 600;
        }

        /* SmartShift Styles */
        .big-number {
            font-size: 2.5rem;
            font-weight: 700;
            letter-spacing: -0.03em;
            color: var(--text-primary);
        }

        .action-bar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1.5rem;
        }

        .machine-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
            gap: 1.5rem;
        }

        .machine-card {
            border-left: 4px solid var(--border);
        }

        .machine-card.operational { border-left-color: var(--success); }
        .machine-card.broken { border-left-color: var(--danger); }
        .machine-card.maintenance { border-left-color: var(--warning); }

        .machine-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 0.5rem;
        }

        .badge {
            padding: 0.25rem 0.5rem;
            border-radius: 4px;
            font-size: 0.75rem;
            font-weight: 600;
            text-transform: uppercase;
        }

        .badge.operational, .badge.available, .badge.completed { background: rgba(16,185,129,0.12); color: #34d399; border: 1px solid rgba(16,185,129,0.2); }
        .badge.broken, .badge.blocked, .badge.failed { background: rgba(239,68,68,0.12); color: #f87171; border: 1px solid rgba(239,68,68,0.2); }
        .badge.maintenance, .badge.pending, .badge.warning { background: rgba(245,158,11,0.12); color: #fbbf24; border: 1px solid rgba(245,158,11,0.2); }
        .badge.in_progress, .badge.scheduled { background: rgba(37,99,235,0.12); color: #60a5fa; border: 1px solid rgba(37,99,235,0.2); }

        .progress-bar {
            height: 6px;
            background: var(--border-strong);
            border-radius: 3px;
            margin: 0.75rem 0 0.5rem;
            overflow: hidden;
        }

        .progress-bar .fill {
            height: 100%;
            background: var(--primary);
            transition: width 0.3s ease;
        }

        /* .data-table duplicate removed — defined above with correct dark-mode styles */

        /* Modal */
        dialog {
            border: none;
            border-radius: 8px;
            padding: 2rem;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            max-width: 400px;
            width: 100%;
            margin: auto;
        }

        dialog::backdrop {
            background: rgba(0,0,0,0.5);
        }

        dialog form {
            display: flex;
            flex-direction: column;
            gap: 1rem;
        }

        dialog input {
            padding: 0.75rem;
            border: 1px solid var(--border);
            border-radius: 6px;
        }

        /* Notification Badge */
        .notification-btn {
            position: relative;
        }

        .notification-badge {
            position: absolute;
            top: -5px;
            right: -5px;
            background: #ef4444;
            color: white;
            font-size: 10px;
            font-weight: 700;
            min-width: 18px;
            height: 18px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 2px;
        }

        /* Notification Panel */
        .notification-panel {
            position: fixed;
            top: 60px;
            right: 20px;
            width: 380px;
            max-height: 500px;
            background: var(--bg-primary);
            border-radius: 12px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            z-index: 1000;
            overflow: hidden;
        }

        .notification-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 1rem 1.25rem;
            border-bottom: 1px solid var(--border);
        }

        .notification-header h3 {
            margin: 0;
            font-size: 1rem;
        }

        .notification-list {
            max-height: 400px;
            overflow-y: auto;
        }

        .notification-item {
            display: flex;
            gap: 0.75rem;
            padding: 1rem 1.25rem;
            border-bottom: 1px solid #f3f4f6;
            cursor: pointer;
            transition: background 0.2s;
        }

        .notification-item:hover {
            background: var(--bg-hover);
        }

        .notification-item.unread {
            background: rgba(37,99,235,0.06);
        }

        .notification-item.critical {
            border-left: 4px solid #ef4444;
        }

        .notification-item.warning {
            border-left: 4px solid #f59e0b;
        }

        .notification-item.info {
            border-left: 4px solid #2563eb;
        }

        .notification-icon {
            font-size: 1.25rem;
        }

        .notification-content {
            flex: 1;
        }

        .notification-content strong {
            display: block;
            margin-bottom: 0.25rem;
        }

        .notification-content p {
            margin: 0;
            font-size: 0.875rem;
            color: var(--text-secondary);
        }

        .notification-details {
            margin: 0.5rem 0 0;
            padding-left: 1rem;
            font-size: 0.75rem;
            color: var(--text-secondary);
        }

        .notification-action {
            align-self: center;
            white-space: nowrap;
        }

        .empty-notifications {
            text-align: center;
            padding: 2rem;
            color: var(--text-secondary);
        }

        /* Chart Cards */
        .chart-card {
            display: flex;
            flex-direction: column;
            align-items: center;
        }

        .chart-card .card-body {
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 160px;
        }

        /* ========== COMPONENTS (continued) ========== */
        /* .card already defined above — no duplicate needed */

        .card-header {
            padding: 0.875rem 1.25rem;
            border-bottom: 1px solid var(--border);
            font-weight: 600;
            font-size: 0.875rem;
            color: var(--text-primary);
        }

        .card-body { padding: 1.25rem; }

        .btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
            padding: 0.5rem 1rem;
            border-radius: 8px;
            font-weight: 500;
            cursor: pointer;
            transition: background 0.15s, opacity 0.15s;
            border: none;
            font-size: 0.875rem;
        }

        .btn-primary {
            background: #2563eb;
            color: white;
        }
        .btn-primary:hover { background: #1d4ed8; }

        .btn-secondary {
            background: var(--bg-elevated, #232326);
            color: var(--text-primary);
            border: 1px solid var(--border);
        }
        .btn-secondary:hover { background: var(--bg-hover); }

        /* Form elements */
        input, select, textarea {
            width: 100%;
            padding: 0.5rem 0.75rem;
            border: 1px solid var(--border);
            border-radius: 8px;
            font-family: inherit;
            font-size: 0.875rem;
            transition: border-color 0.15s;
            background: rgba(255,255,255,0.04);
            color: var(--text-primary);
        }
        input:focus, select:focus, textarea:focus {
            outline: none;
            border-color: #2563eb;
            box-shadow: 0 0 0 3px rgba(37,99,235,0.15);
        }

        /* Tables */
        .table-container {
            background: var(--bg-primary);
            border-radius: 8px;
            border: 1px solid var(--border);
            overflow: hidden;
        }

        .data-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 0.9rem;
        }

        .data-table th {
            background: var(--bg-secondary);
            color: var(--text-primary);
            font-weight: 600;
            text-align: left;
            padding: 1rem 1.5rem;
            border-bottom: 1px solid var(--border-color);
        }

        .data-table td {
            padding: 1rem 1.5rem;
            border-bottom: 1px solid var(--border-color);
            color: var(--text-secondary);
            background: transparent; /* Force transparency to show card background */
        }

        .data-table tbody tr {
            background: transparent;
        }

        .data-table tr:last-child td {
            border-bottom: none;
        }
        
        .data-table tr:hover td {
            background: var(--bg-secondary);
            color: var(--text-primary);
        }

        /* Modals (DeepPCB Style) */
        .modal {
            background: rgba(0, 0, 0, 0.4); /* Darker overlay */

        }

        .modal-content {
            background: var(--bg-primary);
            border-radius: var(--radius-lg);
            box-shadow: var(--shadow-lg);
            border: 1px solid var(--border-color);
            padding: 0; /* Reset padding for header/body split */
            overflow: hidden;
        }
        
        .modal-header {
            padding: 1.5rem;
            border-bottom: 1px solid var(--border-color);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .modal-header h2 {
            margin: 0;
            font-size: 1.25rem;
            color: var(--text-primary);
        }
        
        .modal-body {
            padding: 1.5rem;
        }
        
        .modal-footer {
            padding: 1rem 1.5rem;
            background: var(--bg-secondary);
            border-top: 1px solid var(--border-color);
            display: flex;
            justify-content: flex-end;
            gap: 1rem;
        }

        /* ========== MOBILE NAVIGATION ========== */
        .mobile-header {
            display: none;
            position: fixed;
            top: 0; left: 0; right: 0;
            height: 52px;
            background: var(--bg-sidebar);
            border-bottom: 1px solid var(--border);
            color: var(--text-primary);
            z-index: 1000;
            padding: 0 1rem;
            align-items: center;
            justify-content: space-between;
        }

        .mobile-header h1 {
            font-size: 1.25rem;
            margin: 0;
        }

        .menu-toggle {
            background: none;
            border: none;
            color: white;
            font-size: 1.5rem;
            cursor: pointer;
            padding: 0.5rem;
        }

        .bottom-nav {
            display: none;
            position: fixed;
            bottom: 0; left: 0; right: 0;
            height: 56px;
            background: var(--bg-sidebar);
            border-top: 1px solid var(--border);
            z-index: 1000;
            padding: 0;
        }

        .bottom-nav-items {
            display: flex;
            justify-content: space-around;
            align-items: center;
            height: 100%;
            list-style: none;
            margin: 0;
            padding: 0 0.5rem;
            overflow-x: auto;
            flex-wrap: nowrap;
            gap: 0.25rem;
        }

        .bottom-nav-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            color: var(--text-secondary);
            font-size: 0.625rem;
            font-weight: 500;
            cursor: pointer;
            padding: 0.375rem 0.25rem;
            flex: 1;
            text-align: center;
            border-radius: 6px;
            transition: color 0.15s;
            letter-spacing: 0.01em;
        }

        .bottom-nav-item:hover { color: var(--text-primary); }

        .bottom-nav-item.active { color: var(--accent); }

        .bottom-nav-item .nav-icon {
            font-size: 1.2rem;
            margin-bottom: 0.125rem;
        }

        /* Sidebar overlay for mobile */
        .sidebar-overlay {
            display: none;
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.5);
            z-index: 999;
        }

        .sidebar-overlay.active {
            display: block;
        }

        /* ========== RESPONSIVE BREAKPOINTS ========== */
        @media (max-width: 768px) {
            .mobile-header {
                display: flex;
            }

            .bottom-nav {
                display: block;
            }

            /* Sidebar: fixed overlay — takes zero layout space when hidden */
            .sidebar {
                position: fixed !important;
                top: 0;
                left: 0;
                height: 100dvh !important;
                height: 100vh !important; /* fallback */
                width: 280px !important;
                transform: translateX(-100%);
                z-index: 1001;
                transition: transform 0.3s ease;
                display: flex !important;
                flex-direction: column !important;
                overflow: hidden !important;
            }

            /* Nav menu scrolls internally, footer stays pinned */
            .sidebar .nav-menu {
                flex: 1 !important;
                overflow-y: auto !important;
                overflow-x: hidden !important;
            }

            .sidebar .sidebar-footer {
                flex-shrink: 0 !important;
                padding: 0.5rem !important;
                border-top: 1px solid var(--border) !important;
            }

            .sidebar.open {
                transform: translateX(0);
            }

            /* Main content: full width since sidebar is out of flow */
            .main-content {
                margin-left: 0 !important;
                padding-top: 52px !important;
                padding-bottom: 72px !important;
                width: 100% !important;
                max-width: 100vw !important;
                overflow-x: hidden !important;
            }

            .content-header {
                display: none; /* Use mobile header instead */
            }

            /* Dashboard: full single-column stack on mobile */
            .dashboard-grid {
                grid-template-columns: 1fr !important;
                gap: 0.75rem !important;
            }

            /* Stat cards stay as block on mobile — the stats-row handles the 2-col grid */
            .dashboard-grid .stat-card {
                padding: 0.875rem 1rem !important;
            }

            /* Chart cards and AI alert: full width */
            .dashboard-grid .ai-alert,
            .dashboard-grid .chart-card,
            .dashboard-grid .full-width {
                grid-column: 1 / -1 !important;
                width: 100% !important;
            }

            /* Stat cards sit side by side using a nested grid trick */
            .dashboard-stats-row {
                display: grid !important;
                grid-template-columns: 1fr 1fr !important;
                gap: 0.75rem !important;
                grid-column: 1 / -1;
            }

            .stats-grid {
                grid-template-columns: repeat(2, 1fr);
                gap: 0.75rem;
            }

            .stat-card {
                padding: 1rem;
            }

            .stat-value {
                font-size: 1.25rem;
            }

            .filters-bar {
                flex-direction: column;
                gap: 0.75rem;
            }

            .table-container {
                overflow-x: auto;
            }

            .data-table {
                min-width: 600px;
            }

            .card {
                padding: 1rem;
            }

            .notification-panel {
                width: calc(100% - 2rem);
                right: 1rem;
                left: 1rem;
            }

            /* Touch-friendly buttons */
            .btn, button {
                min-height: 44px;
                padding: 0.75rem 1rem;
            }

            .btn-icon {
                min-width: 44px;
                min-height: 44px;
            }
        }

        @media (max-width: 480px) {
            .stats-grid {
                grid-template-columns: 1fr;
            }

            .form-row {
                flex-direction: column;
            }

            .auth-card {
                padding: 1.5rem;
                margin: 1rem;
            }
        }

        /* Theme toggle button */
        .theme-toggle {
            background: none;
            border: none;
            font-size: 1.25rem;
            cursor: pointer;
            padding: 0.5rem;
            border-radius: 50%;
            transition: background 0.2s;
        }

        .theme-toggle:hover {
            background: rgba(255,255,255,0.1);
        }
      </style>
    `;
  }
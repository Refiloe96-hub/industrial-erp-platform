// Dashboard event handlers — extracted from main.js
import WelcomeWizardUI from './welcomeWizardUI.js';

export function attachDashboardHandlers(app) {
    // Listen for custom navigation events (from modules like Pricing)
    document.addEventListener('navigate-to', (e) => {
      app.navigateTo(e.detail);
    });

    // Listen for incoming real-time backend updates
    window.addEventListener('data-refreshed', (e) => {
      console.log('🔄 Data refreshed event received:', e.detail);

      // If we are looking at the dashboard, update stats
      const activeNav = document.querySelector('.nav-item.active') || document.querySelector('.bottom-nav-item.active');
      const currentModule = activeNav ? activeNav.dataset.module : null;

      if (currentModule === 'dashboard' || !currentModule) {
        app.updateDashboardStats();
      } else {
        // Re-render the current module to show fresh data
        app.navigateTo(currentModule);
      }
    });

    // Listen for Plan Updates
    document.addEventListener('update-plan', async (e) => {
      const newType = e.detail; // e.g. 'trader'
      if (!app.currentUser) return;

      console.log(`🚀 Upgrading plan to: ${newType}`);

      try {
        // 1. Update Local State
        app.currentUser.businessType = newType;
        localStorage.setItem('erp_session', JSON.stringify(app.currentUser));

        // 2. Update DB
        // We need to fetch the full user record first to ensure we don't overwrite other fields
        // although db.update generally merges or replaces.
        // Safe approach:
        const user = await db.get('users', app.currentUser.username);
        if (user) {
          user.businessType = newType;
          await db.update('users', user);
        }

        // 3. Notify and Reload
        alert(`🎉 Success! You are now on the ${newType.toUpperCase()} plan.\n\nNew features have been unlocked.`);
        location.reload(); // Reload to refresh sidebar and modules

      } catch (err) {
        console.error('Failed to upgrade plan:', err);
        alert('Failed to upgrade plan. Please try again.');
      }
    });

    // Navigation — single delegated listener instead of one per item
    document.querySelector('.nav-menu')?.addEventListener('click', (e) => {
      const item = e.target.closest('.nav-item[data-module]');
      if (item) app.navigateTo(item.dataset.module);
    });

    // User menu dropdown toggle
    const userMenuBtn = document.getElementById('user-menu-btn');
    const userDropdown = document.getElementById('user-dropdown');
    userMenuBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = userDropdown?.classList.toggle('open');
      userMenuBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });
    document.addEventListener('click', (e) => {
      if (!e.target.closest('#user-menu-btn') && !e.target.closest('#user-dropdown')) {
        userDropdown?.classList.remove('open');
        userMenuBtn?.setAttribute('aria-expanded', 'false');
      }
    });

    // Settings from dropdown
    document.getElementById('settings-nav-btn')?.addEventListener('click', () => {
      userDropdown?.classList.remove('open');
      app.navigateTo('settings');
    });

    // Upgrade Button
    document.getElementById('upgrade-btn')?.addEventListener('click', () => {
      userDropdown?.classList.remove('open');
      app.navigateTo('pricing');
    });

    // Logout
    document.getElementById('logout-btn')?.addEventListener('click', () => {
      localStorage.removeItem('erp_session');
      app.currentUser = null;
      app.render();
    });

    // Sidebar Toggle (Desktop)
    {
      const toggleBtn = document.getElementById('sidebar-toggle-btn');
      const sidebar = document.getElementById('sidebar');

      if (toggleBtn && sidebar) {
        // Restore sidebar state - only on desktop, and only if user explicitly collapsed it
        const isCollapsed = localStorage.getItem('erp_sidebar_collapsed') === 'true';
        const isDesktop = window.innerWidth > 768;
        if (isCollapsed && isDesktop) {
          sidebar.classList.add('collapsed');
        } else {
          // Ensure clean expanded state by default
          sidebar.classList.remove('collapsed');
        }

        toggleBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          sidebar.classList.toggle('collapsed');
          const collapsed = sidebar.classList.contains('collapsed');
          localStorage.setItem('erp_sidebar_collapsed', collapsed);
        });
      }
    }

    // Initialize notifications
    app.initNotifications();

    // Mobile sidebar toggle
    const menuToggle = document.getElementById('menu-toggle');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');

    menuToggle?.addEventListener('click', () => {
      sidebar.classList.toggle('open');
      overlay.classList.toggle('active');
    });

    // Sidebar Header -> Dashboard
    document.querySelector('.sidebar-header')?.addEventListener('click', () => {
      app.navigateTo('dashboard');
      // On mobile, close sidebar
      const sidebar = document.getElementById('sidebar');
      const overlay = document.getElementById('sidebar-overlay');
      sidebar?.classList.remove('open');
      overlay?.classList.remove('active');
    });

    overlay?.addEventListener('click', () => {
      sidebar.classList.remove('open');
      overlay.classList.remove('active');
    });

    // Close sidebar when nav item clicked (mobile) — delegated
    document.querySelector('.nav-menu')?.addEventListener('click', () => {
      sidebar?.classList.remove('open');
      overlay?.classList.remove('active');
    });

    // Bottom navigation — delegated
    document.querySelector('.bottom-nav')?.addEventListener('click', (e) => {
      const item = e.target.closest('.bottom-nav-item[data-module]');
      if (!item) return;
      document.querySelectorAll('.bottom-nav-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      app.navigateTo(item.dataset.module);
    });

    // Mobile notification button
    document.getElementById('mobile-notification-btn')?.addEventListener('click', () => {
      const panel = document.getElementById('notification-panel');
      if (panel) panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    });

    // Theme toggle
    app.initTheme();

    // PWA Install
    app.initPWA();

    // Offline Status Monitoring
    app.setupOfflineMonitoring();
  }
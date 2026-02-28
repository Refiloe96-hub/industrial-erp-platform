import SeedData from './utils/seedData.js';
import db from './db/index.js';
import { initRouter } from './router.js';
import { initSync } from './sync/syncManager.js';
import { registerSW } from 'virtual:pwa-register';
import { AIEngine } from './ai/engine.js';
import { supabaseClient, isSupabaseEnabled } from './services/supabase.js';
import SmartShiftUI from './ui/smartShiftUI.js';
import TrustCircleUI from './ui/trustCircleUI.js';
import PocketWalletUI from './ui/pocketWalletUI.js';
import PocketBooksUI from './ui/pocketBooksUI.js';
import PoolStockUI from './ui/poolStockUI.js';
import SalesUI from './ui/salesUI.js';
import ReportsUI from './ui/reportsUI.js';
import ChartUtils from './utils/charts.js';
import notificationService from './services/notifications.js';
import PocketBooks from './modules/PocketBooks.js';
import PoolStock from './modules/PoolStock.js';

// Module access by business type
const MODULE_ACCESS = {
  manufacturer: ['dashboard', 'pocketbooks', 'poolstock', 'smartshift', 'trustcircle', 'pocketwallet', 'reports', 'settings', 'customers'],
  warehouse: ['dashboard', 'pocketbooks', 'poolstock', 'smartshift', 'trustcircle', 'pocketwallet', 'reports', 'settings', 'customers'],
  trader: ['dashboard', 'sales', 'pocketbooks', 'poolstock', 'trustcircle', 'pocketwallet', 'reports', 'settings', 'customers'],
  shopowner: ['dashboard', 'sales', 'pocketbooks', 'poolstock', 'trustcircle', 'pocketwallet', 'reports', 'settings', 'customers']
};

// Module metadata
const MODULE_INFO = {
  dashboard: { icon: 'ph-duotone ph-chart-bar', label: 'Dashboard', badge: null },
  sales: { icon: 'ph-duotone ph-shopping-cart', label: 'Sales', badge: 'POS' },
  pocketbooks: { icon: 'ph-duotone ph-wallet', label: 'PocketBooks', badge: 'Ledger' },
  poolstock: { icon: 'ph-duotone ph-package', label: 'PoolStock', badge: 'Inventory' },
  smartshift: { icon: 'ph-duotone ph-gear', label: 'SmartShift', badge: 'MES' },
  trustcircle: { icon: 'ph-duotone ph-users-three', label: 'TrustCircle', badge: 'Syndicates' },
  pocketwallet: { icon: 'ph-duotone ph-credit-card', label: 'PocketWallet', badge: 'Payments' },
  reports: { icon: 'ph-duotone ph-trend-up', label: 'Reports', badge: 'Analytics' },
  settings: { icon: 'ph-duotone ph-gear-six', label: 'Settings', badge: null },
  customers: { icon: 'ph-duotone ph-user-list', label: 'Customers', badge: null }
};

// Business type labels
const BUSINESS_LABELS = {
  manufacturer: 'Manufacturing Operations',
  warehouse: 'Warehouse Management',
  trader: 'Trading & Distribution',
  shopowner: 'Shop Management'
};

class IndustrialERPApp {
  constructor() {
    this.isInitialized = false;
    this.currentUser = null;
    this.aiEngine = null;
    this.pocketBooks = null;
    this.poolStock = null;
    this.deferredPrompt = null;

    // Capture PWA install prompt
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      this.showInstallButton();
    });
  }

  getModulesForUser() {
    const type = this.currentUser?.businessType || 'manufacturer';
    return MODULE_ACCESS[type] || MODULE_ACCESS.manufacturer;
  }

  async navigateTo(module) {
    console.log('Navigating to module:', module); // Debug log

    // Update sidebar nav active state
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.remove('active');
    });
    document.querySelector(`[data-module="${module}"]`)?.classList.add('active');

    // Update persistent bottom nav active state
    document.querySelectorAll('.bottom-nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.module === module);
    });

    // Update title based on module and business type
    const businessLabel = BUSINESS_LABELS[this.currentUser?.businessType] || 'Dashboard';
    const titles = {
      dashboard: businessLabel,
      sales: 'Sales - Point of Sale',
      pocketbooks: 'PocketBooks - Financial Ledger',
      poolstock: 'PoolStock - Inventory',
      smartshift: 'SmartShift - Production',
      trustcircle: 'TrustCircle - Syndicates',
      pocketwallet: 'PocketWallet - Payments',
      reports: 'Reports - Analytics'
    };

    document.getElementById('module-title').textContent = titles[module] || businessLabel;

    let contentArea = document.getElementById('content-area');

    // Performance Fix: Destroy all stale event listeners from previous modules
    // This prevents massive memory leaks when navigating between tabs
    const newContentArea = contentArea.cloneNode(false);
    contentArea.parentNode.replaceChild(newContentArea, contentArea);
    contentArea = newContentArea;
    contentArea.innerHTML = '<div class="loading-spinner"><i class="ph ph-spinner ph-spin"></i> Loading...</div>';

    const sidebar = document.getElementById('sidebar');

    // Handle Full-Screen Modules (Pricing)
    if (module === 'pricing') {
      sidebar?.classList.add('hidden');
    } else {
      sidebar?.classList.remove('hidden');
    }

    if (module === 'smartshift') {
      console.log('Instantiating SmartShiftUI...');
      try {
        const ui = new SmartShiftUI(contentArea, this.aiEngine, this.pocketBooks);
        await ui.render();
      } catch (err) {
        console.error('Error rendering SmartShiftUI:', err);
        contentArea.innerHTML = `<p class="error">Error loading module: ${err.message}</p>`;
      }
    } else if (module === 'trustcircle') {
      console.log('Instantiating TrustCircleUI...');
      try {
        const ui = new TrustCircleUI(contentArea, this.aiEngine);
        await ui.render();
      } catch (err) {
        console.error('Error rendering TrustCircleUI:', err);
        contentArea.innerHTML = `<p class="error">Error loading module: ${err.message}</p>`;
      }
    } else if (module === 'pocketwallet') {
      console.log('Instantiating PocketWalletUI...');
      try {
        const ui = new PocketWalletUI(contentArea, this.pocketBooks);
        await ui.render();
      } catch (err) {
        console.error('Error rendering PocketWalletUI:', err);
        contentArea.innerHTML = `<p class="error">Error loading module: ${err.message}</p>`;
      }
    } else if (module === 'pocketbooks') {
      try {
        console.log('Loading PocketBooksUI...');
        const ui = new PocketBooksUI(contentArea);
        await ui.render();
      } catch (err) {
        console.error('PocketBooksUI error:', err);
        contentArea.innerHTML = `<p class="error">Error loading PocketBooks: ${err.message}</p>`;
      }
    } else if (module === 'poolstock') {
      try {
        console.log('Loading PoolStockUI...');
        const ui = new PoolStockUI(contentArea);
        await ui.render();
      } catch (err) {
        console.error('PoolStockUI error:', err);
        contentArea.innerHTML = `<p class="error">Error loading PoolStock: ${err.message}</p>`;
      }
    } else if (module === 'sales') {
      try {
        console.log('Loading SalesUI...');
        await SalesUI.render(contentArea);
      } catch (err) {
        console.error('SalesUI error:', err);
        contentArea.innerHTML = `<p class="error">Error loading Sales: ${err.message}</p>`;
      }
    } else if (module === 'reports') {
      try {
        console.log('Loading ReportsUI...');
        await ReportsUI.render(contentArea);
      } catch (err) {
        console.error('ReportsUI error:', err);
        contentArea.innerHTML = `<p class="error">Error loading Reports: ${err.message}</p>`;
      }
    } else if (module === 'settings') {
      try {
        console.log('Loading SettingsUI...');
        const SettingsUI = (await import('./ui/settingsUI.js')).default;
        await SettingsUI.render(contentArea);
      } catch (err) {
        console.error('SettingsUI error:', err);
        contentArea.innerHTML = `<p class="error">Error loading Settings: ${err.message}</p>`;
      }
    } else if (module === 'customers') {
      try {
        console.log('Loading CustomersUI...');
        const CustomersUI = (await import('./ui/customersUI.js')).default;
        await CustomersUI.render(contentArea);
      } catch (err) {
        console.error('CustomersUI error:', err);
        contentArea.innerHTML = `<p class="error">Error loading Customers: ${err.message}</p>`;
      }
    } else if (module === 'pricing') {
      try {
        console.log('Loading PricingUI...');
        const PricingUI = (await import('./ui/pricingUI.js')).default;
        await PricingUI.render(contentArea, this.currentUser);
      } catch (err) {
        console.error('PricingUI error:', err);
        contentArea.innerHTML = `<p class="error">Error loading Pricing: ${err.message}</p>`;
      }
    } else if (module === 'dashboard' || !module) {
      const userModules = this.getModulesForUser();
      // UX Fix: Limit mobile bottom nav to 4 items so it doesn't overflow horizontally
      const bottomNavItems = userModules.slice(0, 4).map(mod => {
        const info = MODULE_INFO[mod];
        return `
          <li class="bottom-nav-item ${mod === 'dashboard' ? 'active' : ''}" data-module="${mod}">
            <i class="nav-icon ${info.icon}"></i>
            <span>${info.label}</span>
          </li>
        `;
      }).join('');
      contentArea.innerHTML = this.renderDashboardContent(bottomNavItems);
      this.updateDashboardStats();
    } else {
      // 404 Fallback
      contentArea.innerHTML = `
          <div class="card">
            <div class="card-header">
              <h3>${titles[module]}</h3>
            </div>
            <div class="card-body">
              <p>Module content will be loaded here...</p>
            </div>
          </div>
        `;
    }
  }

  async init() {
    console.log('🚀 Initializing Industrial ERP Platform...');

    try {
      // Initialize IndexedDB
      await db.init();
      console.log('✅ Database ready');

      // Initialize AI Engine
      this.aiEngine = new AIEngine();
      await this.aiEngine.init();
      console.log('✅ AI Engine ready');

      // Initialize PocketBooks
      this.pocketBooks = new PocketBooks();

      // Initialize PoolStock
      this.poolStock = new PoolStock(db); // PoolStock might need db instance or just uses import
      console.log('✅ PoolStock ready');

      console.log('✅ PocketBooks ready');
      await this.checkAuth();

      // Initialize Router
      initRouter();
      console.log('✅ Router ready');

      // Initialize Background Sync
      if (this.currentUser) {
        initSync();
        console.log('✅ Sync manager ready');
      }

      // Render initial UI
      this.render();

      // Register PWA Service Worker for offline asset caching
      if ('serviceWorker' in navigator) {
        registerSW({ immediate: true });
        console.log('✅ Service Worker registered');
      }

      // Add Seed Data Button (Dev Tool)
      const nav = document.querySelector('nav');
      if (nav) {
        const seedBtn = document.createElement('button');
        seedBtn.className = 'btn btn-outline-light mt-4 w-100';
        seedBtn.innerHTML = '<i class="ph-duotone ph-plant"></i> Seed Data';
        seedBtn.style.marginTop = 'auto'; // Push to bottom
        seedBtn.onclick = () => SeedData.init();
        nav.appendChild(seedBtn);
      }

      this.isInitialized = true;
      console.log('✅ Industrial ERP Platform ready');

    } catch (error) {
      console.error('❌ Initialization failed:', error);
      this.renderError(error);
    }
  }

  async checkAuth() {
    // Check for stored session
    const session = localStorage.getItem('erp_session');

    if (session) {
      try {
        this.currentUser = JSON.parse(session);
        console.log('✅ User authenticated:', this.currentUser.businessName);
      } catch (error) {
        console.error('Invalid session:', error);
        localStorage.removeItem('erp_session');
      }
    }
  }

  render() {
    const app = document.getElementById('app');

    if (!this.currentUser) {
      app.innerHTML = this.renderLogin();
      this.attachLoginHandlers();
    } else {
      app.innerHTML = this.renderDashboard();
      this.attachDashboardHandlers();
      if (!this.currentUser.onboardingComplete) {
        this.showOnboardingWizard();
      }
    }
  }

  renderLogin() {
    return `
      <div class="auth-container">
        <div class="auth-card">
          <div class="auth-header">
            <h1><i class="ph-duotone ph-chart-bar"></i> Business Platform</h1>
            <p>AI-Powered Operations</p>
          </div>
          
          <!-- Login Form -->
          <form id="login-form" class="auth-form">
            <h3 class="form-title">Welcome Back</h3>
            <div class="form-group">
              <label>Username</label>
              <input type="text" name="username" placeholder="Enter username" required autofocus />
            </div>
            
            <div class="form-group">
              <label>Password</label>
              <input type="password" name="password" placeholder="••••••••" required />
            </div>
            
            <button type="submit" class="btn btn-primary btn-block">
              <i class="ph-duotone ph-lock-key"></i> Login
            </button>
            <p class="auth-link">New here? <a href="#" id="show-register">Create Account</a></p>
          </form>

          <!-- Register Form -->
          <form id="register-form" class="auth-form" style="display: none;">
            <h3 class="form-title">Create Account</h3>
            
            <div class="form-group">
              <label>Business Name</label>
              <input type="text" name="businessName" placeholder="e.g., Thabo's Shop" required />
            </div>
            
            <div class="form-group">
              <label>Business Type</label>
              <select name="businessType" required>
                <option value="">Select type...</option>
                <option value="shopowner">Storefront / Spaza</option>
                <option value="trader">Distributor</option>
                <option value="warehouse">Warehouse</option>
                <option value="manufacturer">Manufacturer</option>
              </select>
            </div>
            
            <div class="form-group">
              <label>Username (Login ID)</label>
              <input type="text" name="username" placeholder="Pick a username" required />
            </div>

            <div class="form-group">
              <label>Email <span style="color:#9ca3af;font-size:0.8rem">(required for cloud sync)</span></label>
              <input type="email" name="email" placeholder="you@example.com" />
            </div>

            <div class="form-group">
              <label>Password</label>
              <input type="password" name="password" placeholder="Create password" required />
            </div>

            <div class="form-group">
              <label>Your Name</label>
              <input type="text" name="ownerName" placeholder="Full Name" required />
            </div>

            <div class="form-group">
              <label>Phone (Optional)</label>
              <input type="tel" name="phone" placeholder="072 123 4567" />
            </div>

            <button type="submit" class="btn btn-primary btn-block">
              <i class="ph-duotone ph-rocket-launch"></i> Get Started
            </button>
            <p class="auth-link">Already have an account? <a href="#" id="show-login">Login</a></p>
          </form>
          
          <div class="auth-footer">
            <p>Works Offline • Secure • Syncs</p>
          </div>
        </div>
      </div>
      <style>
        .auth-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        .auth-card {
          background: white;
          border-radius: 12px;
          padding: 2rem;
          max-width: 400px;
          width: 100%;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }
        .auth-header { text-align: center; margin-bottom: 2rem; }
        .auth-header h1 { font-size: 2rem; margin-bottom: 0.5rem; color: #1a1a1a; }
        .auth-header p { color: #6b7280; }
        .form-group { margin-bottom: 1.5rem; }
        .form-group label { display: block; margin-bottom: 0.5rem; font-weight: 500; color: #374151; }
        .form-group input, .form-group select { width: 100%; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 6px; font-size: 1rem; }
        .form-group input:focus, .form-group select:focus { outline: none; border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1); }
        .btn { padding: 0.75rem 1.5rem; border: none; border-radius: 6px; font-size: 1rem; font-weight: 500; cursor: pointer; transition: all 0.2s; }
        .btn-primary { background: #2563eb; color: white; }
        .btn-primary:hover { background: #1e40af; }
        .btn-block { width: 100%; }
        .auth-footer { margin-top: 2rem; text-align: center; color: #6b7280; font-size: 0.875rem; }
        .auth-link { margin-top: 1rem; text-align: center; font-size: 0.9rem; }
        .auth-link a { color: var(--primary); text-decoration: none; font-weight: 500; }
        .form-title { margin-bottom: 1rem; text-align: center; color: var(--text-secondary); }
      </style>
    `;
  }

  attachLoginHandlers() {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const showRegisterBtn = document.getElementById('show-register');
    const showLoginBtn = document.getElementById('show-login');

    // Toggle Forms
    showRegisterBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      loginForm.style.display = 'none';
      registerForm.style.display = 'block';
    });

    showLoginBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      registerForm.style.display = 'none';
      loginForm.style.display = 'block';
    });

    // Helper: Hash Password
    const hashPassword = async (password) => {
      const msgBuffer = new TextEncoder().encode(password);
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    };

    // Handle Login
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = loginForm.querySelector('button');
      const originalText = btn.textContent;
      btn.textContent = 'Verifying...';
      btn.disabled = true;

      try {
        const formData = new FormData(loginForm);
        const username = formData.get('username');
        const password = formData.get('password');

        // Fetch local user record first (needed for both paths)
        const localUser = await db.get('users', username);

        if (isSupabaseEnabled() && localUser?.email) {
          // --- Supabase auth path ---
          const { data, error } = await supabaseClient.auth.signInWithPassword({
            email: localUser.email,
            password
          });
          if (error) throw new Error(error.message);

          // Fetch full profile from Supabase
          const { data: profile } = await supabaseClient
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

          const user = profile || localUser;
          user.lastLogin = Date.now();
          this.currentUser = user;
          localStorage.setItem('erp_session', JSON.stringify(user));
          this.render();
          initSync();
        } else {
          // --- Local auth path ---
          const hashedPassword = await hashPassword(password);

          if (localUser && localUser.password === hashedPassword) {
            this.currentUser = localUser;
            localStorage.setItem('erp_session', JSON.stringify(localUser));
            localUser.lastLogin = Date.now();
            await db.update('users', localUser);
            this.render();
            initSync();
          } else {
            alert('Invalid username or password');
            btn.textContent = originalText;
            btn.disabled = false;
          }
        }
      } catch (err) {
        console.error('Login error:', err);
        alert('Login failed: ' + err.message);
        btn.textContent = originalText;
        btn.disabled = false;
      }
    });

    // Handle Register
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = registerForm.querySelector('button');
      btn.textContent = 'Creating Account...';
      btn.disabled = true;

      try {
        const formData = new FormData(registerForm);
        const username = formData.get('username');

        // Check availability
        const existing = await db.get('users', username);
        if (existing) {
          alert('Username already taken');
          btn.innerHTML = '<i class="ph-duotone ph-rocket-launch"></i> Get Started';
          btn.disabled = false;
          return;
        }

        const password = formData.get('password');
        const email = formData.get('email') || '';
        const hashedPassword = await hashPassword(password);

        const userData = {
          username,
          password: hashedPassword,
          businessName: formData.get('businessName'),
          businessType: formData.get('businessType'),
          ownerName: formData.get('ownerName'),
          phone: formData.get('phone') || '',
          email,
          createdAt: Date.now(),
          role: 'admin'
        };

        if (isSupabaseEnabled() && email) {
          // --- Supabase auth path ---
          const { data, error } = await supabaseClient.auth.signUp({ email, password });
          if (error) throw new Error(error.message);

          // Store profile in Supabase
          await supabaseClient.from('profiles').upsert({
            id: data.user.id,
            username,
            business_name: userData.businessName,
            business_type: userData.businessType,
            owner_name: userData.ownerName,
            phone: userData.phone,
            email,
            role: 'admin',
            created_at: new Date().toISOString()
          });

          userData.supabaseId = data.user.id;
        }

        // Always store locally for offline operation
        await db.add('users', userData);

        // Set session
        localStorage.setItem('erp_session', JSON.stringify(userData));
        this.currentUser = userData;

        // Also save settings for backward compatibility
        await db.update('settings', {
          key: 'businessProfile',
          ...userData
        });

        this.render();
        initSync();

      } catch (err) {
        console.error('Registration error:', err);
        alert('Registration failed: ' + err.message);
        btn.innerHTML = '<i class="ph-duotone ph-rocket-launch"></i> Get Started';
        btn.disabled = false;
      }
    });
  }

  renderDashboard() {
    const userModules = this.getModulesForUser();
    const businessLabel = BUSINESS_LABELS[this.currentUser.businessType] || 'Dashboard';

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
        <button class="menu-toggle" id="menu-toggle"><i class="ph ph-list"></i></button>
        <h1>${this.currentUser.businessName}</h1>
        <div style="display: flex; gap: 0.5rem;">
          <button class="theme-toggle" id="theme-toggle" title="Toggle Theme"><i class="ph-duotone ph-moon"></i></button>
          <button class="btn-icon notification-btn" id="mobile-notification-btn"><i class="ph-duotone ph-bell"></i></button>
        </div>
      </header>

      <!-- Sidebar Overlay -->
      <div class="sidebar-overlay" id="sidebar-overlay"></div>

      <div class="app-layout">
        <nav class="sidebar" id="sidebar">
          <div class="sidebar-header">
            <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                <h2><i class="ph-duotone ph-chart-bar"></i> Business</h2>
                <button id="sidebar-toggle-btn" class="btn-icon" title="Toggle Sidebar" style="background: transparent; color: var(--text-primary); width: 32px; height: 32px; padding: 4px;">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line></svg>
                </button>
            </div>
            <p class="business-name">${this.currentUser.businessName}</p>
            <p class="business-type">${businessLabel}</p>
          </div>
          
          <ul class="nav-menu">
            ${navItems}
          </ul>
          
           <div class="sidebar-footer">
            <button id="upgrade-btn" class="btn-block btn-primary btn-sm" style="margin-bottom: 0.5rem; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); border: none;"><i class="ph-duotone ph-rocket"></i> Upgrade Plan</button>
            <button id="install-btn" class="btn-primary btn-sm" style="display: none;"><i class="ph-duotone ph-download-simple"></i> Install</button>
            <button class="theme-toggle" id="desktop-theme-toggle" title="Toggle Theme"><i class="ph-duotone ph-moon"></i></button>
            <button id="logout-btn" class="btn-secondary btn-sm"><i class="ph-duotone ph-sign-out"></i> Logout</button>
          </div>
        </nav>
        
        <main class="main-content">
          <header class="content-header">
            <h1 id="module-title">${businessLabel}</h1>
            <div class="header-actions">
              <button class="btn-icon" title="AI Insights"><i class="ph-duotone ph-magic-wand"></i></button>
              <button class="btn-icon notification-btn" id="notification-btn" title="Notifications">
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
            ${this.renderDashboardContent()}
          </div>
        </main>

        <!-- Bottom Navigation (Mobile) - PERSISTENT ACROSS ALL PAGES -->
        <nav class="bottom-nav" id="bottom-nav">
          <ul class="bottom-nav-items" id="bottom-nav-items">
            ${bottomNavItems}
          </ul>
        </nav>
      </div>
      
      ${this.renderStyles()}
    `;
  }

  renderDashboardContent(bottomNavItems) {
    return `
      <div class="dashboard-grid">
        <!-- AI Supervisor Alert -->
        <div class="card ai-alert">
          <div class="card-header">
            <h3><i class="ph-duotone ph-robot"></i> AI Supervisor</h3>
          </div>
          <div class="card-body">
            <p class="alert-text">System is analyzing your operations...</p>
            <button class="btn btn-primary btn-sm">View Insights</button>
          </div>
        </div>
        
        <!-- Quick Stats -->
        <div class="card stat-card">
          <div class="stat-icon"><i class="ph-duotone ph-wallet"></i></div>
          <div class="stat-content">
            <p class="stat-label">Cash Flow</p>
            <h3 id="stat-cash-flow" class="stat-value">Loading...</h3>
            <p class="stat-change positive"><i class="ph-bold ph-arrow-up"></i> Track via PocketBooks</p>
          </div>
        </div>
        
        <div class="card stat-card">
          <div class="stat-icon"><i class="ph-duotone ph-package"></i></div>
          <div class="stat-content">
            <p class="stat-label">Inventory Health</p>
            <h3 id="stat-inventory" class="stat-value">Loading...</h3>
            <p class="stat-change"><i class="ph-bold ph-arrow-up-right"></i> View in PoolStock</p>
          </div>
        </div>
        
        <div class="card stat-card">
          <div class="stat-icon"><i class="ph-duotone ph-gear"></i></div>
          <div class="stat-content">
            <p class="stat-label">Machine Utilization</p>
            <h3 id="stat-machine-util" class="stat-value">Loading...</h3>
            <p class="stat-change"><i class="ph-bold ph-arrow-right"></i> Optimize in SmartShift</p>
          </div>
        </div>
        
        <div class="card stat-card">
          <div class="stat-icon"><i class="ph-duotone ph-users-three"></i></div>
          <div class="stat-content">
            <p class="stat-label">Syndicate Status</p>
            <h3 id="stat-syndicates" class="stat-value">Loading...</h3>
            <p class="stat-change"><i class="ph-bold ph-check"></i> Active in TrustCircle</p>
          </div>
        </div>
        
        <!-- Recent Activity -->
        <div class="card full-width">
          <div class="card-header">
            <h3>Recent Activity</h3>
          </div>
          <div class="card-body">
            <p class="text-muted">No recent activity. Start by exploring modules.</p>
          </div>
        </div>

        <!-- Charts Section -->
        <div class="card chart-card">
          <div class="card-header">
            <h3><i class="ph-duotone ph-chart-line-up"></i> Cash Flow Trend</h3>
          </div>
          <div class="card-body" id="chart-cashflow">
            <p class="text-muted">Loading chart...</p>
          </div>
        </div>

        <div class="card chart-card">
          <div class="card-header">
            <h3><i class="ph-duotone ph-package"></i> Inventory Breakdown</h3>
          </div>
          <div class="card-body" id="chart-inventory">
            <p class="text-muted">Loading chart...</p>
          </div>
        </div>

        <div class="card chart-card">
          <div class="card-header">
            <h3><i class="ph-duotone ph-gear"></i> Machine Status</h3>
          </div>
          <div class="card-body" id="chart-machines">
            <p class="text-muted">Loading chart...</p>
          </div>
        </div>

        <div class="card chart-card">
          <div class="card-header">
            <h3><i class="ph-duotone ph-handshake"></i> Syndicate Health</h3>
          </div>
          <div class="card-body" id="chart-syndicates">
            <p class="text-muted">Loading chart...</p>
          </div>
        </div>
      </div>
    `;
  }

  renderStyles() {
    return `
      <style>
        :root {
          /* DeepPCB Design System */
          --bg-primary: #ffffff;
          --bg-secondary: #f8fafc;
          --bg-sidebar: #0f172a;
          --text-primary: #1e293b;
          --text-secondary: #64748b;
          --accent-primary: #f97316; /* DeepPCB Orange */
          --accent-hover: #ea580c;
          --border: #e2e8f0;
          --success: #10b981;
          --warning: #f59e0b;
          --danger: #ef4444;
          --card-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
        }

        [data-theme="dark"] {
          --bg-primary: #1e1e1e; /* Neutral Dark */
          --bg-secondary: #121212;
          --bg-sidebar: #000000;
          --text-primary: #f8fafc;
          --text-secondary: #94a3b8;
          --border: #333333;
          --accent-primary: #fb923c; /* Lighter Orange for Dark Mode */
          --accent-hover: #f97316;
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
        
        .risk-score.good { background: #d1fae5; color: #065f46; }
        .risk-score.medium { background: #fef3c7; color: #92400e; }
        .risk-score.bad { background: #fee2e2; color: #991b1b; }

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
          margin-top: auto;
          flex-shrink: 0;
          position: sticky;
          bottom: 0;
          background: var(--bg-sidebar);
          padding: 1rem;
          border-top: 1px solid rgba(255,255,255,0.08);
          z-index: 2;
        }

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
        
        /* Show footer buttons as icon-only when collapsed */
        .sidebar.collapsed #upgrade-btn,
        .sidebar.collapsed #logout-btn,
        .sidebar.collapsed #install-btn,
        .sidebar.collapsed #seed-data-btn {
            width: 44px;
            height: 44px;
            min-width: 44px;
            padding: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 8px;
            font-size: 0;
        }
        
        .sidebar.collapsed #upgrade-btn i,
        .sidebar.collapsed #logout-btn i,
        .sidebar.collapsed #install-btn i,
        .sidebar.collapsed #seed-data-btn i {
            font-size: 1.25rem;
            margin: 0;
        }

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
          padding: 1rem 1.5rem;
          border-bottom: 1px solid rgba(255,255,255,0.1);
          flex-shrink: 0;
          cursor: pointer; /* clickable */
        }

        .sidebar-header:hover {
            background: rgba(255,255,255,0.05);
        }
        
        .sidebar-header h2 {
          margin-bottom: 0.1rem;
          font-size: 1.25rem;
        }
        
        .business-name {
          font-size: 0.8rem;
          color: #9ca3af;
        }

        .business-type {
          font-size: 0.75rem;
          color: #93c5fd; /* Light blue text */
          margin-top: 0.25rem;
          padding: 0.25rem 0.5rem;
          background: rgba(37, 99, 235, 0.2); /* Blue background */
          border-radius: 4px;
          display: inline-block;
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
          gap: 0.75rem;
          padding: 0.6rem 1.5rem; /* Reduced padding */
          cursor: pointer;
          transition: background 0.2s;
        }
        
        .nav-icon {
          font-size: 1.1rem;
        }
        
        .nav-badge {
          margin-left: auto;
          font-size: 0.7rem;
          padding: 0.15rem 0.4rem;
          background: rgba(255,255,255,0.1);
          border-radius: 4px;
        }
        
        .sidebar-footer {
          padding: 1rem;
          border-top: 1px solid rgba(255,255,255,0.1);
        }
        
        .main-content {
          margin-left: 260px;
          flex: 1;
          background: var(--bg-secondary);
        }
        
        .content-header {
          background: var(--bg-primary);
          padding: 1rem 2rem;
          border-bottom: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: space-between;
          position: sticky;
          top: 0;
          top: 0;
          z-index: 10;
        }
        
        .content-header h1 {
          margin: 0;
          font-size: 1.5rem;
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
        }
        
        .dashboard-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1.5rem;
        }
        
        .card {
          background: var(--bg-primary);
          border-radius: 8px;
          padding: 1.5rem;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        
        .card.full-width {
          grid-column: 1 / -1;
        }
        
        .card-header {
          margin-bottom: 1rem;
        }
        
        .card-header h3 {
          font-size: 1.125rem;
          font-weight: 600;
        }
        
        .ai-alert {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }
        
        .stat-card {
          display: flex;
          gap: 1rem;
        }
        
        .stat-icon {
          font-size: 2.5rem;
        }
        
        .stat-content {
          flex: 1;
        }
        
        .stat-label {
          color: var(--text-secondary);
          font-size: 0.875rem;
          margin-bottom: 0.25rem;
        }
        
        .stat-value {
          font-size: 1.75rem;
          font-weight: 700;
          margin-bottom: 0.25rem;
        }
        
        .stat-change {
          font-size: 0.875rem;
          color: var(--text-secondary);
        }
        
        .stat-change.positive {
          color: var(--success);
        }
        
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
        
        .text-muted {
          color: var(--text-secondary);
        }

        /* Global Button Styles */
        .btn {
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 6px;
          font-size: 1rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .btn-primary {
          background: #2563eb;
          color: white;
        }
        
        .btn-primary:hover {
          background: #1e40af;
        }
        
        .btn-block {
          width: 100%;
        }

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
            color: var(--primary);
            border-bottom-color: var(--primary);
            font-weight: 500;
        }

        /* SmartShift Styles */
        .big-number {
            font-size: 2.5rem;
            font-weight: 700;
            color: var(--primary);
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

        .badge.operational, .badge.available, .badge.completed { background: #d1fae5; color: #065f46; }
        .badge.broken, .badge.blocked, .badge.failed { background: #fee2e2; color: #991b1b; }
        .badge.maintenance, .badge.pending, .badge.warning { background: #fef3c7; color: #92400e; }
        .badge.in_progress, .badge.scheduled { background: #dbeafe; color: #1e40af; }

        .progress-bar {
            height: 8px;
            background: #e5e7eb;
            border-radius: 4px;
            margin: 1rem 0 0.5rem 0;
            overflow: hidden;
        }

        .progress-bar .fill {
            height: 100%;
            background: var(--primary);
            transition: width 0.3s ease;
        }

        .data-table {
            width: 100%;
            border-collapse: collapse;
            background: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }

        .data-table th, .data-table td {
            padding: 1rem;
            text-align: left;
            border-bottom: 1px solid var(--border);
        }

        .data-table th {
            background: #f9fafb;
            font-weight: 600;
            color: var(--text-secondary);
        }

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
            background: #f9fafb;
        }

        .notification-item.unread {
            background: #eff6ff;
        }

        .notification-item.critical {
            border-left: 4px solid #ef4444;
        }

        .notification-item.warning {
            border-left: 4px solid #f59e0b;
        }

        .notification-item.info {
            border-left: 4px solid #6366f1;
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

        /* ========== THEME VARIABLES ========== */
        :root {
            font-size: 81.25%; /* ~13px base size (80% zoom emulation) */
            
            /* Light Theme (DeepPCB Style) */
            --bg-primary: #ffffff;
            --bg-secondary: #f8fafc;     /* Very Light Slate */
            --bg-sidebar: #ffffff;       /* White Sidebar */
            --text-primary: #0f172a;     /* Slate 900 */
            --text-secondary: #64748b;   /* Slate 500 */
            --border-color: #e2e8f0;     /* Slate 200 */
            
            /* DeepPCB Brand Colors */
            --accent-primary: #f97316;   /* DeepPCB Orange */
            --accent-hover: #ea580c;     
            --accent-success: #10b981;
            --accent-warning: #f59e0b;
            --accent-danger: #ef4444;
            
            --radius-md: 8px;
            --radius-lg: 12px;
            --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
            --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
        }

        [data-theme="dark"] {
            --bg-primary: #334155;       /* Slate 700 - Cards/Headers (Lighter) */
            --bg-secondary: #0f172a;     /* Slate 900 - Main BG (Darkest) - WAIT User said NO BLACK */
            /* User said: "make the dark theme to be the same theme as that on the navigation bar" */
            /* Navbar is --bg-sidebar. Let's make bg-secondary match bg-sidebar */
             
            --bg-primary: #1e293b;       /* Slate 800 - Cards (Matches Sidebar) */
            --bg-secondary: #0f172a;     /* Slate 900 - Page Background */
            /* Re-reading request: "make the dark theme to be the same theme as that on the navigation bar" */
            /* Sidebar is using var(--bg-sidebar). */
            /* Currently Sidebar is #1e293b. Main content is #0f172a. User dislikes "black" on pages. */
            /* So Main Content should be #1e293b. */
            /* If Main Content is #1e293b, then Sidebar #1e293b. They blend. */
            /* Then Cards need to be lighter: #334155 (Slate 700). */
            
            --bg-sidebar: #1e293b;       /* Slate 800 */
            --bg-secondary: #1e293b;     /* Slate 800 - Match Sidebar */
            --bg-primary: #334155;       /* Slate 700 - Cards */
            
            --text-primary: #f8fafc;     /* Slate 50 */
            --text-secondary: #cbd5e1;   /* Slate 300 */
            --border-color: #475569;     /* Slate 600 */
            --accent-primary: #fb923c;   /* Lighter Orange */
        }

        /* ========== COMPONENT STYLES ========== */
        
        /* Buttons */
        .btn {
            border-radius: var(--radius-md);
            font-weight: 500;
            padding: 0.6rem 1.2rem;
            transition: all 0.2s;
        }

        .btn-primary {
            background: var(--accent-primary);
            color: white;
            border: none;
        }

        .btn-primary:hover {
            background: var(--accent-hover);
            transform: translateY(-1px);
        }

        /* Inputs */
        input, select, textarea {
            border: 1px solid var(--border-color);
            border-radius: var(--radius-md);
            padding: 0.6rem 1rem;
            background: var(--bg-primary);
            color: var(--text-primary);
            transition: border-color 0.2s, box-shadow 0.2s;
        }

        input:focus, select:focus {
            outline: none;
            border-color: var(--accent-primary);
            box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.1);
        }

        /* Tables (DeepPCB Style) */
        .table-container {
            background: var(--bg-primary);
            border-radius: var(--radius-lg);
            border: 1px solid var(--border-color);
            overflow: hidden;
            box-shadow: var(--shadow-sm);
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
            top: 0;
            left: 0;
            right: 0;
            height: 56px;
            background: var(--bg-sidebar);
            color: white;
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
            bottom: 0;
            left: 0;
            right: 0;
            height: 60px;
            background: var(--bg-sidebar);
            z-index: 1000;
            padding: 0;
        }

        .bottom-nav-items {
            display: flex;
            justify-content: space-between; /* Spread items evenly */
            align-items: center;
            height: 100%;
            list-style: none;
            margin: 0;
            padding: 0 0.5rem; /* Add padding to prevent edge hugging */
            overflow-x: auto; /* Prevent squishing on tiny screens */
            flex-wrap: nowrap;
            gap: 0.25rem;
        }

        .bottom-nav-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            color: #9ca3af;
            font-size: 0.65rem;
            cursor: pointer;
            padding: 0.5rem 0.25rem;
            flex: 1; /* Allow items to stretch evenly */
            text-align: center;
            min-width: 0; /* Prevent flex blowout */
        }

        .bottom-nav-item.active {
            color: var(--accent-primary);
        }

        .bottom-nav-item .nav-icon {
            font-size: 1.25rem;
            margin-bottom: 0.15rem;
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

            .sidebar {
                transform: translateX(-100%);
                z-index: 1001;
                transition: transform 0.3s ease;
            }

            .sidebar.open {
                transform: translateX(0);
            }

            .main-content {
                margin-left: 0;
                padding-top: 70px;
                padding-bottom: 80px;
            }

            .content-header {
                display: none; /* Use mobile header instead */
            }

            .dashboard-grid {
                grid-template-columns: 1fr;
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

  async showOnboardingWizard() {
    const MODULE_DESCRIPTIONS = {
      dashboard: 'Live overview of revenue, inventory, and operations.',
      sales: 'Point-of-sale terminal — ring up items, apply VAT, print receipts.',
      pocketbooks: 'Financial ledger — income, expenses, accounts, and P&L.',
      poolstock: 'Inventory management — stock levels, purchase orders, suppliers.',
      smartshift: 'Manufacturing execution — production orders, machines, shifts.',
      trustcircle: 'B2B syndicates — group buying, equipment financing, mutual credit.',
      pocketwallet: 'Payment rails — wallets, M-Pesa, card payments, payroll.',
      reports: 'Analytics — sales trends, stock reports, financial summaries.',
      customers: 'CRM — customer records, loyalty points, purchase history.',
    };

    const userModules = this.getModulesForUser().filter(m => m !== 'settings');
    const businessName = this.currentUser.businessName || this.currentUser.username;

    const steps = [
      {
        title: `Welcome to ${businessName}'s ERP!`,
        body: `<p>You're all set up and ready to go. This quick tour takes about 60 seconds and shows you around your new platform.</p>
               <p style="margin-top:1rem;color:#6b7280;">Click <strong>Next</strong> to continue or <em>Skip setup</em> to go straight to your dashboard.</p>`
      },
      {
        title: 'Your Modules',
        body: `<p style="color:#6b7280;margin-bottom:1rem;">Based on your business type, you have access to:</p>
               <div class="ob-modules-list">
                 ${userModules.map(m => {
          const info = MODULE_INFO[m] || {};
          return `<div class="ob-module-item">
                     <i class="${info.icon || 'ph ph-cube'}" style="font-size:1.5rem;color:#2563eb"></i>
                     <div>
                       <strong>${info.label || m}</strong>
                       <p>${MODULE_DESCRIPTIONS[m] || ''}</p>
                     </div>
                   </div>`;
        }).join('')}
               </div>`
      },
      {
        title: 'Load Sample Data?',
        body: `<p>Want to explore the platform with realistic demo data? This will add sample inventory, sales records, and financial transactions.</p>
               <button id="ob-load-seed-btn" class="btn btn-secondary" style="margin-top:1.5rem;width:100%">
                 <i class="ph ph-database"></i> Yes, load demo data
               </button>
               <p id="ob-seed-status" style="text-align:center;color:#10b981;margin-top:0.75rem;display:none">
                 <i class="ph ph-check-circle"></i> Demo data loaded!
               </p>
               <p style="margin-top:1rem;color:#9ca3af;font-size:0.85rem">You can always reset data from Settings → Data Management.</p>`
      },
      {
        title: "You're Ready!",
        body: `<div style="text-align:center;padding:1rem 0">
                 <i class="ph-duotone ph-rocket-launch" style="font-size:4rem;color:#2563eb"></i>
                 <p style="margin-top:1rem;font-size:1.1rem">Your ERP is fully configured and ready to use.</p>
                 <p style="color:#6b7280">Start by recording a sale, checking inventory, or exploring your dashboard.</p>
               </div>`
      }
    ];

    let currentStep = 0;

    const modal = document.createElement('dialog');
    modal.className = 'onboarding-modal';

    const renderStep = () => {
      const step = steps[currentStep];
      const isLast = currentStep === steps.length - 1;
      const isFirst = currentStep === 0;
      const dots = steps.map((_, i) =>
        `<span class="ob-dot ${i === currentStep ? 'active' : ''}"></span>`
      ).join('');

      modal.innerHTML = `
        <div class="ob-content">
          <div class="ob-header">
            <span class="ob-step-label">Step ${currentStep + 1} of ${steps.length}</span>
            <button id="ob-skip-btn" class="ob-skip">Skip setup</button>
          </div>
          <h2 class="ob-title">${step.title}</h2>
          <div class="ob-body">${step.body}</div>
          <div class="ob-footer">
            <div class="ob-dots">${dots}</div>
            <div class="ob-nav-btns">
              ${!isFirst ? '<button id="ob-prev-btn" class="btn btn-secondary">Back</button>' : ''}
              <button id="ob-next-btn" class="btn btn-primary">${isLast ? 'Go to Dashboard' : 'Next'}</button>
            </div>
          </div>
        </div>
      `;

      modal.querySelector('#ob-skip-btn').addEventListener('click', () => completeOnboarding());
      modal.querySelector('#ob-next-btn').addEventListener('click', () => {
        if (isLast) {
          completeOnboarding();
        } else {
          currentStep++;
          renderStep();
        }
      });
      modal.querySelector('#ob-prev-btn')?.addEventListener('click', () => {
        currentStep--;
        renderStep();
      });

      // Seed data button (step 3)
      modal.querySelector('#ob-load-seed-btn')?.addEventListener('click', async (e) => {
        const btn = e.target.closest('button');
        btn.disabled = true;
        btn.textContent = 'Loading...';
        try {
          await SeedData.init();
          btn.style.display = 'none';
          modal.querySelector('#ob-seed-status').style.display = 'block';
        } catch (err) {
          btn.disabled = false;
          btn.textContent = 'Retry';
          console.error('Seed failed:', err);
        }
      });
    };

    const completeOnboarding = async () => {
      try {
        const user = await db.get('users', this.currentUser.username);
        if (user) {
          user.onboardingComplete = true;
          await db.update('users', user);
        }
        this.currentUser.onboardingComplete = true;
        localStorage.setItem('erp_session', JSON.stringify(this.currentUser));
      } catch (err) {
        console.warn('Could not save onboarding state:', err);
      }
      modal.close();
      modal.remove();
    };

    // Add styles
    const style = document.createElement('style');
    style.textContent = `
      .onboarding-modal {
        border: none; border-radius: 20px; padding: 0;
        box-shadow: 0 25px 60px rgba(0,0,0,0.3);
        width: 540px; max-width: 96vw; max-height: 90vh;
      }
      .onboarding-modal::backdrop { background: rgba(0,0,0,0.55); }
      .ob-content { padding: 2rem; display: flex; flex-direction: column; gap: 1.25rem; }
      .ob-header { display: flex; justify-content: space-between; align-items: center; }
      .ob-step-label { font-size: 0.8rem; color: #9ca3af; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
      .ob-skip { background: none; border: none; color: #6b7280; cursor: pointer; font-size: 0.875rem; text-decoration: underline; }
      .ob-skip:hover { color: #374151; }
      .ob-title { margin: 0; font-size: 1.5rem; font-weight: 700; color: #111827; }
      .ob-body { color: #4b5563; line-height: 1.7; max-height: 50vh; overflow-y: auto; }
      .ob-body p { margin: 0 0 0.5rem; }
      .ob-modules-list { display: flex; flex-direction: column; gap: 0.75rem; }
      .ob-module-item { display: flex; align-items: flex-start; gap: 0.75rem; padding: 0.75rem; background: #f9fafb; border-radius: 10px; }
      .ob-module-item p { margin: 0.15rem 0 0; font-size: 0.85rem; color: #6b7280; }
      .ob-footer { display: flex; justify-content: space-between; align-items: center; padding-top: 1rem; border-top: 1px solid #f3f4f6; }
      .ob-dots { display: flex; gap: 0.5rem; align-items: center; }
      .ob-dot { width: 8px; height: 8px; border-radius: 50%; background: #e5e7eb; transition: background 0.2s; }
      .ob-dot.active { background: #2563eb; width: 24px; border-radius: 4px; }
      .ob-nav-btns { display: flex; gap: 0.75rem; }
    `;
    document.head.appendChild(style);

    document.body.appendChild(modal);
    renderStep();
    modal.showModal();
  }

  attachDashboardHandlers() {
    // Listen for custom navigation events (from modules like Pricing)
    document.addEventListener('navigate-to', (e) => {
      this.navigateTo(e.detail);
    });

    // Listen for incoming real-time backend updates
    window.addEventListener('data-refreshed', (e) => {
      console.log('🔄 Data refreshed event received:', e.detail);

      // If we are looking at the dashboard, update stats
      const activeNav = document.querySelector('.nav-item.active') || document.querySelector('.bottom-nav-item.active');
      const currentModule = activeNav ? activeNav.dataset.module : null;

      if (currentModule === 'dashboard' || !currentModule) {
        this.updateDashboardStats();
      } else {
        // Re-render the current module to show fresh data
        this.navigateTo(currentModule);
      }
    });

    // Listen for Plan Updates
    document.addEventListener('update-plan', async (e) => {
      const newType = e.detail; // e.g. 'trader'
      if (!this.currentUser) return;

      console.log(`🚀 Upgrading plan to: ${newType}`);

      try {
        // 1. Update Local State
        this.currentUser.businessType = newType;
        localStorage.setItem('erp_session', JSON.stringify(this.currentUser));

        // 2. Update DB
        // We need to fetch the full user record first to ensure we don't overwrite other fields
        // although db.update generally merges or replaces.
        // Safe approach:
        const user = await db.get('users', this.currentUser.username);
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

    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', () => {
        const module = item.dataset.module;
        this.navigateTo(module);
      });
    });

    // Upgrade Button
    document.getElementById('upgrade-btn')?.addEventListener('click', () => {
      this.navigateTo('pricing');
    });

    // Logout
    document.getElementById('logout-btn')?.addEventListener('click', () => {
      localStorage.removeItem('erp_session');
      this.currentUser = null;
      this.render();
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
    this.initNotifications();

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
      this.navigateTo('dashboard');
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

    // Close sidebar when nav item clicked (mobile)
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', () => {
        sidebar?.classList.remove('open');
        overlay?.classList.remove('active');
      });
    });

    // Bottom navigation
    document.querySelectorAll('.bottom-nav-item').forEach(item => {
      item.addEventListener('click', () => {
        const module = item.dataset.module;
        document.querySelectorAll('.bottom-nav-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        this.navigateTo(module);
      });
    });

    // Mobile notification button
    document.getElementById('mobile-notification-btn')?.addEventListener('click', () => {
      const panel = document.getElementById('notification-panel');
      if (panel) panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    });

    // Theme toggle
    this.initTheme();

    // PWA Install
    this.initPWA();
  }

  showInstallButton() {
    const btn = document.getElementById('install-btn');
    if (btn && this.deferredPrompt) {
      btn.style.display = 'block';
    }
  }

  initPWA() {
    this.showInstallButton();

    document.getElementById('install-btn')?.addEventListener('click', async () => {
      if (!this.deferredPrompt) return;

      this.deferredPrompt.prompt();
      const { outcome } = await this.deferredPrompt.userChoice;

      console.log(`User response to install prompt: ${outcome}`);

      this.deferredPrompt = null;
      document.getElementById('install-btn').style.display = 'none';
    });
  }

  initTheme() {
    // Load saved theme
    const savedTheme = localStorage.getItem('erp_theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    this.updateThemeIcons(savedTheme);

    // Desktop theme toggle
    document.getElementById('desktop-theme-toggle')?.addEventListener('click', () => this.toggleTheme());

    // Mobile theme toggle
    document.getElementById('theme-toggle')?.addEventListener('click', () => this.toggleTheme());
  }

  toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('erp_theme', next);
    this.updateThemeIcons(next);
  }

  updateThemeIcons(theme) {
    const icon = theme === 'dark' ? '☀️' : '🌙';
    document.getElementById('desktop-theme-toggle')?.textContent && (document.getElementById('desktop-theme-toggle').textContent = icon);
    document.getElementById('theme-toggle')?.textContent && (document.getElementById('theme-toggle').textContent = icon);
  }

  renderError(error) {
    const app = document.getElementById('app');
    app.innerHTML = `
      <div style="padding: 2rem; text-align: center;">
        <h1>⚠️ Initialization Error</h1>
        <p style="color: #ef4444;">${error.message}</p>
        <button onclick="location.reload()" class="btn btn-primary" style="margin-top: 1rem;">
          Retry
        </button>
      </div>
    `;
  }

  async updateDashboardStats() {
    console.log('🔄 updateDashboardStats: Starting...');

    try {
      if (!this.pocketBooks) console.warn('⚠️ this.pocketBooks is missing');
      if (!this.poolStock) console.warn('⚠️ this.poolStock is missing');
      if (!db) console.error('❌ DB is missing');

      // 1. Cash Flow
      try {
        if (this.pocketBooks) {
          console.log('📊 Fetching transactions...');
          const txs = await this.pocketBooks.getTransactions();
          console.log(`✅ Got ${txs.length} transactions`);
          const balance = txs.reduce((sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount), 0);
          const el = document.getElementById('stat-cash-flow');
          if (el) el.textContent = `R ${balance.toLocaleString()}`;

          // Chart
          const chartCashflow = document.getElementById('chart-cashflow');
          if (chartCashflow) {
            const now = Date.now();
            const dayMs = 24 * 60 * 60 * 1000;
            const dailyData = [];
            for (let i = 6; i >= 0; i--) {
              const dayStart = now - (i * dayMs);
              const dayEnd = dayStart + dayMs;
              const dayTxs = txs.filter(t => t.date >= dayStart && t.date < dayEnd);
              const net = dayTxs.reduce((sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount), 0);
              const dayLabel = new Date(dayStart).toLocaleDateString('en-ZA', { weekday: 'short' });
              dailyData.push({ label: dayLabel, value: Math.max(0, net) });
            }
            chartCashflow.innerHTML = ChartUtils.renderBarChart(dailyData, { width: 280, height: 150 });
          }
        }
      } catch (e) {
        console.error('❌ Cash Flow Error:', e);
        document.getElementById('stat-cash-flow').textContent = 'Error';
        const c = document.getElementById('chart-cashflow');
        if (c) c.innerHTML = `<p class="error">${e.message}</p>`;
      }

      // 2. Inventory
      try {
        if (this.poolStock) {
          console.log('📦 Fetching inventory...');
          const items = await this.poolStock.getInventory();
          console.log(`✅ Got ${items.length} items`);
          const lowStock = items.filter(i => i.quantity <= i.reorderLevel).length;
          const total = items.length;
          const el = document.getElementById('stat-inventory');
          if (el) el.textContent = `${total} Items (${lowStock} Low)`;

          // Chart
          const chartInventory = document.getElementById('chart-inventory');
          if (chartInventory) {
            const categories = items.reduce((acc, item) => {
              const cat = item.category || 'Other';
              acc[cat] = (acc[cat] || 0) + 1;
              return acc;
            }, {});
            const catData = Object.entries(categories).slice(0, 4).map(([label, value]) => ({ label, value }));
            if (catData.length) {
              chartInventory.innerHTML = ChartUtils.renderDonutChart(catData, { size: 140, thickness: 25 });
            } else {
              chartInventory.innerHTML = '<p class="text-muted">No inventory data</p>';
            }
          }
        }
      } catch (e) {
        console.error('❌ Inventory Error:', e);
        document.getElementById('stat-inventory').textContent = 'Error';
      }

      // 3. Machines
      try {
        console.log('⚙️ Fetching machines...');
        const machines = await db.getAll('machines');
        console.log(`✅ Got ${machines.length} machines`);
        const elMachine = document.getElementById('stat-machine-util');
        if (elMachine) {
          if (machines.length) {
            const operational = machines.filter(m => m.status === 'operational').length;
            const util = Math.round((operational / machines.length) * 100);
            elMachine.textContent = `${util}% Operational`;
          } else {
            elMachine.textContent = '0 Machines';
          }
        }
        // Chart
        const chartMachines = document.getElementById('chart-machines');
        if (chartMachines) {
          if (machines.length) {
            const operational = machines.filter(m => m.status === 'operational').length;
            chartMachines.innerHTML = ChartUtils.renderGauge(operational, machines.length, {
              size: 140,
              color: operational / machines.length > 0.7 ? '#10b981' : '#f59e0b',
              label: 'Operational'
            });
          } else {
            chartMachines.innerHTML = '<p class="text-muted">No machines registered</p>';
          }
        }
      } catch (e) {
        console.error('❌ Machine Error:', e);
        document.getElementById('stat-machine-util').textContent = 'Error';
      }

      // 4. Syndicates
      try {
        console.log('🤝 Fetching syndicates...');
        const syndicates = await db.getAll('syndicates');
        const elSyndicates = document.getElementById('stat-syndicates');
        if (elSyndicates) elSyndicates.textContent = `${syndicates.length} Active`;

        // Chart
        const chartSyndicates = document.getElementById('chart-syndicates');
        if (chartSyndicates) {
          if (syndicates.length) {
            const contributions = await db.getAll('contributions');
            const statusData = [
              { label: 'Paid', value: contributions.filter(c => c.status === 'completed').length },
              { label: 'Pending', value: contributions.filter(c => c.status === 'pending').length },
              { label: 'Late', value: contributions.filter(c => c.status === 'late').length }
            ].filter(d => d.value > 0);

            if (statusData.length) {
              chartSyndicates.innerHTML = ChartUtils.renderDonutChart(statusData, { size: 140, thickness: 25 });
            } else {
              chartSyndicates.innerHTML = `<p class="text-muted">${syndicates.length} syndicate(s), no contributions yet</p>`;
            }
          } else {
            chartSyndicates.innerHTML = '<p class="text-muted">No syndicates created</p>';
          }
        }
      } catch (e) {
        console.error('❌ Syndicate Error:', e);
      }

      console.log('✅ updateDashboardStats: Complete');

    } catch (error) {
      console.error('🔥 CRITICAL FAIL in updateDashboardStats:', error);
      const chartCashflow = document.getElementById('chart-cashflow');
      if (chartCashflow) {
        chartCashflow.innerHTML = `<div class="text-center p-3">
            <p class="text-danger">⚠️ Chart Error</p>
            <small class="text-muted">${error.message}</small>
          </div>`;
      }
    }
  }

  // ========== NOTIFICATIONS ==========
  async initNotifications() {
    try {
      await notificationService.init();
      this.updateNotificationBadge();
      this.renderNotificationList();

      // Bell button toggle
      document.getElementById('notification-btn')?.addEventListener('click', () => {
        const panel = document.getElementById('notification-panel');
        if (panel) {
          panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
          // Mark visible notifications as read
          if (panel.style.display === 'block') {
            this.renderNotificationList();
          }
        }
      });

      // Mark all as read
      document.getElementById('mark-all-read')?.addEventListener('click', () => {
        notificationService.markAllAsRead();
        this.updateNotificationBadge();
        this.renderNotificationList();
      });

      // Close panel when clicking outside
      document.addEventListener('click', (e) => {
        const panel = document.getElementById('notification-panel');
        const btn = document.getElementById('notification-btn');
        if (panel && !panel.contains(e.target) && !btn.contains(e.target)) {
          panel.style.display = 'none';
        }
      });

    } catch (err) {
      console.warn('Failed to init notifications:', err);
    }
  }

  updateNotificationBadge() {
    const badge = document.getElementById('notification-badge');
    if (badge) {
      const count = notificationService.getUnreadCount();
      badge.textContent = count > 9 ? '9+' : count;
      badge.style.display = count > 0 ? 'flex' : 'none';
    }
  }

  renderNotificationList() {
    const list = document.getElementById('notification-list');
    if (!list) return;

    const notifications = notificationService.getAll();

    if (notifications.length === 0) {
      list.innerHTML = '<p class="empty-notifications">✅ All clear! No alerts.</p>';
      return;
    }

    list.innerHTML = notifications.map(n => `
      <div class="notification-item ${n.type} ${n.read ? 'read' : 'unread'}" data-id="${n.id}">
        <div class="notification-icon">${this.getNotificationIcon(n.type)}</div>
        <div class="notification-content">
          <strong>${n.title}</strong>
          <p>${n.message}</p>
          ${n.details ? `<ul class="notification-details">${n.details.slice(0, 3).map(d => `<li>${d}</li>`).join('')}</ul>` : ''}
        </div>
        ${n.action ? `<button class="btn btn-sm btn-primary notification-action" data-module="${n.action.module}">${n.action.label}</button>` : ''}
      </div>
    `).join('');

    // Add action button handlers
    list.querySelectorAll('.notification-action').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const module = e.target.dataset.module;
        document.getElementById('notification-panel').style.display = 'none';
        this.navigateTo(module);
      });
    });

    // Mark as read on click
    list.querySelectorAll('.notification-item').forEach(item => {
      item.addEventListener('click', () => {
        notificationService.markAsRead(item.dataset.id);
        item.classList.add('read');
        item.classList.remove('unread');
        this.updateNotificationBadge();
      });
    });
  }

  getNotificationIcon(type) {
    const icons = {
      critical: '<i class="ph-fill ph-warning-circle" style="color: var(--danger)"></i>',
      warning: '<i class="ph-fill ph-warning" style="color: var(--warning)"></i>',
      info: '<i class="ph-fill ph-info" style="color: var(--primary)"></i>',
      success: '<i class="ph-fill ph-check-circle" style="color: var(--success)"></i>'
    };
    return icons[type] || '📢';
  }
}

// Initialize app when DOM is ready
const app = new IndustrialERPApp();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => app.init());
} else {
  app.init();
}

export default app;

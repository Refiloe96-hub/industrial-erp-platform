import './mobile.css'; // Global mobile responsive fixes for all pages
import SeedData from './utils/seedData.js';
import db from './db/index.js';
import { initRouter } from './router.js';
import { initSync } from './sync/syncManager.js';
import { registerSW } from 'virtual:pwa-register';
import { AIEngine } from './ai/engine.js';
import { supabaseClient, isSupabaseEnabled, checkSupabaseReachable } from './services/supabase.js';
import { esc } from './utils/safeJson.js';
import DailySummary from './services/dailySummary.js';
import { renderLoginHTML, renderPasskeySetupHTML } from './ui/authPage.js';
import { renderAppStyles } from './ui/appStyles.js';
import { renderDashboard, renderDashboardContent } from './ui/dashboardPage.js';
import { updateDashboardStats, loadAIAdvisor } from './ui/dashboardData.js';
import { initGlobalSearch, runSearch, renderSearchResults } from './services/globalSearch.js';
import SmartShiftUI from './ui/smartShiftUI.js';
import TrustCircleUI from './ui/trustCircleUI.js';
import PocketWalletUI from './ui/pocketWalletUI.js';
import PocketBooksUI from './ui/pocketBooksUI.js';
import PoolStockUI from './ui/poolStockUI.js';
import SalesUI from './ui/salesUI.js';
import ReportsUI from './ui/reportsUI.js';
import SettingsUI from './ui/settingsUI.js'; // Added for consistency, though dynamically imported later
import LandingUI from './ui/landingUI.js'; // New import
import WelcomeWizardUI from './ui/welcomeWizardUI.js';
import ChartUtils from './utils/charts.js';
import notificationService from './services/notifications.js';
import PocketBooks from './modules/PocketBooks.js';
import PoolStock from './modules/PoolStock.js';
import Analytics from './utils/analytics.js';

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
    const role = this.currentUser?.role || 'admin';
    let modules = [...(MODULE_ACCESS[type] || MODULE_ACCESS.manufacturer)];

    if (role === 'staff') {
      modules = modules.filter(m => !['settings', 'reports', 'trustcircle', 'pocketwallet', 'pocketbooks'].includes(m));
    } else if (role === 'manager') {
      modules = modules.filter(m => !['settings', 'trustcircle'].includes(m));
    }

    return modules;
  }

  async navigateTo(module) {
    console.log('Navigating to module:', module); // Debug log

    // RBAC: Check Deep Link Authorization
    const allowedModules = this.getModulesForUser();
    if (module && module !== 'dashboard' && module !== 'pricing' && !allowedModules.includes(module)) {
      document.getElementById('content-area').innerHTML = `
        <div class="card" style="margin:2rem;text-align:center;padding:3rem">
          <i class="ph-duotone ph-shield-warning" style="font-size:4rem;color:#ef4444;margin-bottom:1rem"></i>
          <h2 style="margin-bottom:0.5rem">Access Denied</h2>
          <p style="color:var(--text-secondary)">Your current role (${this.currentUser?.role || 'staff'}) does not have permission to view this module.</p>
          <button class="btn btn-primary mt-4" onclick="window.location.hash=''">Return to Dashboard</button>
        </div>
      `;
      // Ensure nav limits active state safely
      document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
      document.querySelectorAll('.bottom-nav-item').forEach(item => item.classList.remove('active'));
      return;
    }

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
    if (!contentArea) return;

    // Performance Fix: Destroy all stale event listeners from previous modules
    // This prevents massive memory leaks when navigating between tabs
    if (contentArea.parentNode) {
      const newContentArea = contentArea.cloneNode(false);
      contentArea.parentNode.replaceChild(newContentArea, contentArea);
      contentArea = newContentArea;
    }
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
        contentArea.innerHTML = `<p class="error">Error loading module: ${esc(err.message)}</p>`;
      }
    } else if (module === 'trustcircle') {
      console.log('Instantiating TrustCircleUI...');
      try {
        const ui = new TrustCircleUI(contentArea, this.aiEngine);
        await ui.render();
      } catch (err) {
        console.error('Error rendering TrustCircleUI:', err);
        contentArea.innerHTML = `<p class="error">Error loading module: ${esc(err.message)}</p>`;
      }
    } else if (module === 'pocketwallet') {
      console.log('Instantiating PocketWalletUI...');
      try {
        const ui = new PocketWalletUI(contentArea, this.pocketBooks);
        await ui.render();
      } catch (err) {
        console.error('Error rendering PocketWalletUI:', err);
        contentArea.innerHTML = `<p class="error">Error loading module: ${esc(err.message)}</p>`;
      }
    } else if (module === 'pocketbooks') {
      try {
        console.log('Loading PocketBooksUI...');
        const ui = new PocketBooksUI(contentArea);
        await ui.render();
      } catch (err) {
        console.error('PocketBooksUI error:', err);
        contentArea.innerHTML = `<p class="error">Error loading PocketBooks: ${esc(err.message)}</p>`;
      }
    } else if (module === 'poolstock') {
      try {
        console.log('Loading PoolStockUI...');
        const ui = new PoolStockUI(contentArea);
        await ui.render();
      } catch (err) {
        console.error('PoolStockUI error:', err);
        contentArea.innerHTML = `<p class="error">Error loading PoolStock: ${esc(err.message)}</p>`;
      }
    } else if (module === 'sales') {
      try {
        console.log('Loading SalesUI...');
        await SalesUI.render(contentArea);
      } catch (err) {
        console.error('SalesUI error:', err);
        contentArea.innerHTML = `<p class="error">Error loading Sales: ${esc(err.message)}</p>`;
      }
    } else if (module === 'reports') {
      try {
        console.log('Loading ReportsUI...');
        await ReportsUI.render(contentArea);
      } catch (err) {
        console.error('ReportsUI error:', err);
        contentArea.innerHTML = `<p class="error">Error loading Reports: ${esc(err.message)}</p>`;
      }
    } else if (module === 'settings') {
      try {
        console.log('Loading SettingsUI...');
        const SettingsUI = (await import('./ui/settingsUI.js')).default;
        await SettingsUI.render(contentArea);
      } catch (err) {
        console.error('SettingsUI error:', err);
        contentArea.innerHTML = `<p class="error">Error loading Settings: ${esc(err.message)}</p>`;
      }
    } else if (module === 'customers') {
      try {
        console.log('Loading CustomersUI...');
        const CustomersUI = (await import('./ui/customersUI.js')).default;
        await CustomersUI.render(contentArea);
      } catch (err) {
        console.error('CustomersUI error:', err);
        contentArea.innerHTML = `<p class="error">Error loading Customers: ${esc(err.message)}</p>`;
      }
    } else if (module === 'pricing') {
      try {
        console.log('Loading PricingUI...');
        const PricingUI = (await import('./ui/pricingUI.js')).default;
        await PricingUI.render(contentArea, this.currentUser);
      } catch (err) {
        console.error('PricingUI error:', err);
        contentArea.innerHTML = `<p class="error">Error loading Pricing: ${esc(err.message)}</p>`;
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
    Analytics.init();

    try {
      // Force Dark Mode
      document.documentElement.setAttribute('data-theme', 'dark');

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

      // Load User Configuration/Settings
      this.config = (await db.get('settings', 'config')) || {};

      // Initialize Router
      initRouter();
      console.log('✅ Router ready');

      // Initialize Background Sync
      if (this.currentUser) {
        initSync();
        console.log('✅ Sync manager ready');
      }

      // Render initial UI
      this.initNotifications();
      this.render();

      // Register PWA Service Worker for offline asset caching
      if ('serviceWorker' in navigator) {
        registerSW({ immediate: true });
        console.log('✅ Service Worker registered');
      }

      // Seed data and onboarding test are accessible from Settings → Data & Storage

      this.isInitialized = true;
      console.log('✅ Industrial ERP Platform ready');

    } catch (error) {
      console.error('❌ Initialization failed:', error);
      this.renderError(error);
    }
  }

  async checkAuth() {
    // 1. Process Supabase OAuth Redirects (Listen for auth changes)
    if (isSupabaseEnabled()) {
      supabaseClient.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          const email = session.user.email;
          const supabaseId = session.user.id;

          // Rebuild or fetch user profile
          const { data: profile } = await supabaseClient
            .from('profiles')
            .select('*')
            .eq('id', supabaseId)
            .maybeSingle();

          const finalizeOAuthLogin = async (finalProfile) => {
            const rebuiltUser = {
              username: finalProfile?.username || email.split('@')[0],
              email: email,
              businessName: finalProfile?.business_name || 'My Business',
              businessType: finalProfile?.business_type || 'shopowner',
              ownerName: finalProfile?.owner_name || session.user.user_metadata?.full_name || '',
              phone: finalProfile?.phone || '',
              supabaseId: supabaseId,
              role: finalProfile?.role || 'admin',
              lastLogin: Date.now(),
              createdAt: finalProfile?.created_at ? new Date(finalProfile.created_at).getTime() : Date.now(),
            };

            // Save locally
            try { await db.update('users', rebuiltUser); } catch { await db.add('users', rebuiltUser); }
            await db.update('settings', { key: 'businessProfile', ...rebuiltUser });

            this.currentUser = rebuiltUser;
            localStorage.setItem('erp_session', JSON.stringify(rebuiltUser));

            // Force UI refresh, remove hash fragments from URL (cleanup)
            window.history.replaceState({}, document.title, window.location.pathname);
            this.render();
            initSync(); // Start background sync
            console.log('✅ OAuth user authenticated via Supabase');

            // Trigger Welcome Wizard for first-time login
            if (localStorage.getItem('erp_onboarding_complete') !== 'true') {
              WelcomeWizardUI.show(() => {
                console.log('Wizard complete');
              });
            }
          };

          // If this is a new OAuth user, they won't have a business_type yet. Target them.
          if (!profile?.business_type) {
            // Unskippable modal to collect business info
            const modal = document.createElement('dialog');
            modal.className = 'item-modal'; // REUSING poolStock modal styles for consistency
            modal.style.zIndex = '9999';
            modal.innerHTML = `
              <form id="oauth-profile-form">
                  <h2 style="font-size:1.5rem;font-weight:800;color:var(--text-primary);">Complete your profile</h2>
                  <p style="color:var(--text-secondary);margin-bottom:1.5rem;font-size:0.9rem;">Please define your business structure to customize your workspace.</p>
                  
                  <div class="form-group" style="margin-bottom:1.5rem;">
                      <label style="display:block;margin-bottom:0.5rem;font-weight:700;">Business Name *</label>
                      <input type="text" id="oauth-biz-name" required placeholder="e.g. Acme Corp" 
                             style="width:100%;padding:0.75rem;border-radius:8px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.05);color:white;">
                  </div>
                  
                  <div class="form-group" style="margin-bottom:2rem;">
                      <label style="display:block;margin-bottom:0.5rem;font-weight:700;">Business Type *</label>
                      <select id="oauth-biz-type" required style="width:100%;padding:0.75rem;border-radius:8px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.05);color:white;">
                          <option value="shopowner" style="background:#18181b">Retail / Spaza Shop (POS, Inventory, Ledgers)</option>
                          <option value="warehouse" style="background:#18181b">Warehouse / Distribution (Bulk Stock, POs, Clients)</option>
                          <option value="manufacturer" style="background:#18181b">Manufacturing / Factory (Raw Materials, Production)</option>
                      </select>
                  </div>

                  <button type="submit" class="btn btn-primary" style="width:100%;padding:1rem;font-size:1.1rem;font-weight:700;">Complete Setup & Login</button>
              </form>
            `;
            
            // Minimal reset for dialog just in case app styles ain't fully mounted
            Object.assign(modal.style, {
              background: '#18181b', color: 'white', padding: '2rem', borderRadius: '10px',
              border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 24px 48px rgba(0,0,0,0.7)',
              maxWidth: '500px', width: '90%'
            });

            document.body.appendChild(modal);
            modal.showModal();

            modal.querySelector('#oauth-profile-form').addEventListener('submit', async (e) => {
              e.preventDefault();
              const bName = document.getElementById('oauth-biz-name').value;
              const bType = document.getElementById('oauth-biz-type').value;
              
              const btn = e.target.querySelector('button[type="submit"]');
              btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Saving...';
              btn.disabled = true;

              const updatedProfile = {
                  id: supabaseId,
                  username: email.split('@')[0], // safety default
                  business_name: bName,
                  business_type: bType,
                  email: email,
                  role: 'admin',
                  created_at: new Date().toISOString()
              };

              // Overwrite or create the profile
              await supabaseClient.from('profiles').upsert(updatedProfile);
              
              modal.close();
              modal.remove();
              
              // Proceed with login
              await finalizeOAuthLogin(updatedProfile);
            });
          } else {
            // Existing user who already has a profile / business_type
            await finalizeOAuthLogin(profile);
          }
        } else if (event === 'SIGNED_OUT') {
          this.currentUser = null;
          localStorage.removeItem('erp_session');
          this.render();
        }
      });
    }

    // 2. Check for stored local session
    const session = localStorage.getItem('erp_session');

    if (session) {
      try {
        this.currentUser = JSON.parse(session);
        console.log('✅ User authenticated locally:', this.currentUser.businessName);
      } catch (error) {
        console.error('Invalid session:', error);
        localStorage.removeItem('erp_session');
      }
    }

    // 3. Listen for path changes (SPA Routing)
    window.addEventListener('popstate', () => {
      this.render();
    });
  }

  render() {
    const app = document.getElementById('app');
    const path = window.location.pathname;

    if (!this.currentUser) {
      if (path === '/' || path === '') {
        // Show public landing page
        LandingUI.render(app);
      } else {
        // Show Auth UI (for /app, /login, etc)
        app.innerHTML = this.renderLogin();
        this.attachLoginHandlers();
      }
    } else {
      if (path === '/' || path === '') {
        // Logged in users trying to hit the landing page get redirected to app
        window.history.replaceState({}, '', '/app');
      }
      app.innerHTML = this.renderDashboard();
      this.attachDashboardHandlers();
      this.initGlobalSearch();
      this.applyTheme();
      DailySummary.init(this.currentUser.businessName).catch(() => {});
      if (!this.currentUser.onboardingComplete) {
        this.showOnboardingWizard();
      }
    }
  }

  renderLogin() { return renderLoginHTML(); }

  renderPasskeySetup() { return renderPasskeySetupHTML(); }

  attachLoginHandlers() {
    const form = document.getElementById('unified-auth-form');
    const step1Div = document.getElementById('step-1-email');
    const step2Div = document.getElementById('step-2-fields');
    const emailInput = document.getElementById('unified-email');
    const continueEmailBtn = document.getElementById('continue-email-btn');
    const backBtn = document.getElementById('back-to-email-btn');
    const displayEmailText = document.getElementById('display-email-text');
    const passwordInput = document.getElementById('unified-password');
    const regFieldsDiv = document.getElementById('register-only-fields');
    const finalSubmitBtn = document.getElementById('final-submit-btn');

    let currentAction = 'login'; // 'login' or 'register'
    let localUser = null;

    const CLOUD_UNREACHABLE_MSG = 'Cloud backend is currently unreachable.\n\nYour Supabase project may be paused or deleted.\nPlease use email + password to sign in, or contact the site owner to restore cloud access.';

    // --- Social & OAuth Login Handlers ---
    document.getElementById('btn-google')?.addEventListener('click', async () => {
      if (!isSupabaseEnabled()) return alert('Google login requires cloud sync to be enabled.');
      if (!await checkSupabaseReachable()) return alert(CLOUD_UNREACHABLE_MSG);
      try {
        const { error } = await supabaseClient.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } });
        if (error) throw error;
      } catch (err) { alert('Google login failed: ' + err.message); }
    });

    document.getElementById('btn-apple')?.addEventListener('click', async () => {
      if (!isSupabaseEnabled()) return alert('Apple login requires cloud sync to be enabled.');
      if (!await checkSupabaseReachable()) return alert(CLOUD_UNREACHABLE_MSG);
      try {
        const { error } = await supabaseClient.auth.signInWithOAuth({ provider: 'apple', options: { redirectTo: window.location.origin } });
        if (error) throw error;
      } catch (err) { alert('Apple login failed: ' + err.message); }
    });

    document.getElementById('btn-phone')?.addEventListener('click', async () => {
      if (!isSupabaseEnabled()) return alert('Phone login requires cloud sync to be enabled.');
      if (!await checkSupabaseReachable()) return alert(CLOUD_UNREACHABLE_MSG);
      const phone = prompt("Enter your phone number (e.g. +1234567890):");
      if (!phone) return;
      try {
        const { error } = await supabaseClient.auth.signInWithOtp({ phone });
        if (error) throw error;

        const token = prompt("Enter the 6-digit code sent to " + phone + ":");
        if (!token) return;

        const { error: verifyError } = await supabaseClient.auth.verifyOtp({ phone, token, type: 'sms' });
        if (verifyError) throw verifyError;
        // The onAuthStateChange listener should pick up the session now.
      } catch (err) { alert('Phone verification failed: ' + err.message); }
    });
    // -------------------------------------

    // Password hashing — PBKDF2 with random salt (format: "pbkdf2v1:{salt64}:{hash64}")
    // Legacy format is 64-char hex SHA-256; detected automatically for migration.
    const _pbkdf2Key = async (password, salt) => {
      const km = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
      const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 100000 }, km, 256);
      return new Uint8Array(bits);
    };
    const hashPassword = async (password) => {
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const hash = await _pbkdf2Key(password, salt);
      return `pbkdf2v1:${btoa(String.fromCharCode(...salt))}:${btoa(String.fromCharCode(...hash))}`;
    };
    const verifyPassword = async (password, stored) => {
      if (!stored) return false;
      if (stored.startsWith('pbkdf2v1:')) {
        const [, salt64, hash64] = stored.split(':');
        const salt = Uint8Array.from(atob(salt64), c => c.charCodeAt(0));
        const hash = await _pbkdf2Key(password, salt);
        return btoa(String.fromCharCode(...hash)) === hash64;
      }
      // Legacy SHA-256 — compare and upgrade on success
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password));
      return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('') === stored;
    };

    // Go back to Step 1
    backBtn?.addEventListener('click', () => {
      step2Div.style.display = 'none';
      regFieldsDiv.style.display = 'none';
      step1Div.style.display = 'block';
      passwordInput.value = '';
      passwordInput.required = false;
      document.querySelectorAll('#register-only-fields input, #register-only-fields select').forEach(el => el.required = false);
    });

    // Step 1: Identify Email
    continueEmailBtn?.addEventListener('click', async () => {
      if (!emailInput.checkValidity()) {
        emailInput.reportValidity();
        return;
      }

      const email = emailInput.value.trim().toLowerCase();
      const originalHTML = continueEmailBtn.innerHTML;
      continueEmailBtn.innerHTML = '<i class="ph ph-circle-notch ph-spin"></i> Checking...';
      continueEmailBtn.disabled = true;

      try {
        const allUsers = await db.getAll('users').catch(() => []);
        localUser = allUsers.find(u => u.email && u.email.toLowerCase() === email) || null;

        // If not found locally but cloud is enabled, check the cloud profiles
        if (!localUser && isSupabaseEnabled() && await checkSupabaseReachable()) {
          const { data: cloudProfile } = await supabaseClient.from('profiles').select('*').eq('email', email).maybeSingle();
          if (cloudProfile) {
            // Mock enough of a localUser to confidently route them to the login path
            localUser = { 
              email: cloudProfile.email, 
              supabaseId: cloudProfile.id, 
              businessName: cloudProfile.business_name 
            };
          }
        }

        // If returning user with a passkey, try Passkey login first
        if (localUser && localUser.passkeyId && window.PublicKeyCredential) {
          try {
            const challenge = new Uint8Array(32); crypto.getRandomValues(challenge);
            const credential = await navigator.credentials.get({
              publicKey: {
                challenge: challenge,
                allowCredentials: [{
                  id: Uint8Array.from(atob(localUser.passkeyId), c => c.charCodeAt(0)),
                  type: 'public-key',
                  transports: ['internal', 'usb', 'ble', 'nfc'],
                }],
                userVerification: "preferred"
              }
            });

            if (credential) {
              await this.completeLogin(localUser);
              return; // logged in!
            }
          } catch (pkErr) {
            console.warn('Passkey cancelled/failed, falling back to password...', pkErr);
          }
        }

        // Setup Step 2 UI
        step1Div.style.display = 'none';
        step2Div.style.display = 'block';
        displayEmailText.textContent = email;
        passwordInput.required = true;

        if (localUser) {
          // Returning User (Local) -> Login Flow
          currentAction = 'login';
          regFieldsDiv.style.display = 'none';
          document.querySelectorAll('#register-only-fields input, #register-only-fields select').forEach(el => el.required = false);
          setTimeout(() => passwordInput.focus(), 100);
        } else {
          // New User -> Registration Flow
          currentAction = 'register';
          regFieldsDiv.style.display = 'block';
          document.querySelectorAll('#register-only-fields input, #register-only-fields select').forEach(el => el.required = true);
          // Phone is optional
          document.getElementById('reg-phone').required = false;
          setTimeout(() => passwordInput.focus(), 100);
        }

      } catch (err) {
        console.error("Identity check error:", err);
      } finally {
        continueEmailBtn.innerHTML = originalHTML;
        continueEmailBtn.disabled = false;
      }
    });

    // Step 2: Form Submit (Login or Register)
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();

      const email = emailInput.value.trim().toLowerCase();
      const password = passwordInput.value;

      const originalHTML = finalSubmitBtn.innerHTML;
      finalSubmitBtn.innerHTML = '<i class="ph ph-circle-notch ph-spin"></i> Processing...';
      finalSubmitBtn.disabled = true;

      try {
        if (currentAction === 'login') {
          // LOGIN PATH
          if (localUser && await verifyPassword(password, localUser.password)) {
            // Transparently upgrade legacy SHA-256 hashes to PBKDF2 on next login
            if (localUser.password && !localUser.password.startsWith('pbkdf2v1:')) {
              localUser.password = await hashPassword(password);
              try { await db.update('users', localUser); } catch {}
            }
            await this.completeLogin(localUser, password);
            return;
          }

          if (!isSupabaseEnabled()) {
            throw new Error('Invalid email or password. (Supabase disabled)');
          }

          if (!await checkSupabaseReachable()) {
            throw new Error('Cloud backend is unreachable. Your Supabase project may be paused or deleted. Please contact the site owner.');
          }

          const { data: sbData, error: sbError } = await supabaseClient.auth.signInWithPassword({ email, password });
          if (sbError || !sbData?.user) throw new Error('Invalid email or password.');

          const { data: profile } = await supabaseClient.from('profiles').select('*').eq('id', sbData.user.id).maybeSingle();

          const rebuiltUser = {
            username: profile?.username || email.split('@')[0],
            password: await hashPassword(password),
            email: email,
            businessName: profile?.business_name || '',
            businessType: profile?.business_type || 'shopowner',
            ownerName: profile?.owner_name || '',
            phone: profile?.phone || '',
            supabaseId: sbData.user.id,
            role: profile?.role || 'admin',
            lastLogin: Date.now(),
            createdAt: profile?.created_at ? new Date(profile.created_at).getTime() : Date.now(),
          };

          try { await db.update('users', rebuiltUser); } catch { await db.add('users', rebuiltUser); }
          await db.update('settings', { key: 'businessProfile', ...rebuiltUser });
          await this.completeLogin(rebuiltUser, password);

        } else {
          // REGISTER PATH
          const username = email.split('@')[0] + Math.floor(Math.random() * 1000); // generate safety username
          const userData = {
            username,
            password: await hashPassword(password),
            businessName: document.getElementById('reg-biz-name').value,
            businessType: document.getElementById('reg-biz-type').value,
            ownerName: document.getElementById('reg-owner-name').value,
            phone: document.getElementById('reg-phone').value || '',
            email: email,
            createdAt: Date.now(),
            role: 'admin'
          };

          // Basic email validation for Supabase
          const emailIsValid = email && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) &&
            !email.endsWith('@test.com') && !email.endsWith('@example.com') &&
            !email.includes('test@') && !email.includes('fake@');

          if (isSupabaseEnabled() && emailIsValid) {
            try {
              const { data, error } = await supabaseClient.auth.signUp({
                email,
                password,
                options: { emailRedirectTo: null, data: { username, business_name: userData.businessName } }
              });
              if (!error && data?.user) {
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
            } catch (sbErr) { console.warn('Supabase signUp failed:', sbErr.message); }
          }

          // Always store locally for offline operation
          await db.add('users', userData);
          await db.update('settings', { key: 'businessProfile', ...userData });
          await this.completeLogin(userData, password);
        }

      } catch (err) {
        console.error('Auth error:', err);
        alert(err.message || 'Authentication failed');
        finalSubmitBtn.innerHTML = originalHTML;
        finalSubmitBtn.disabled = false;
      }
    });

    // Helper: Finalize Login & Optionally Create Passkey
    this.completeLogin = async (user, passwordStr = null) => {
      user.lastLogin = Date.now();

      Analytics.identify(user.id || user.email, {
        email: user.email,
        businessName: user.businessName,
        businessType: user.businessType,
        role: user.role
      });
      Analytics.track('Login Success', { method: passwordStr ? 'Password' : 'OAuth' });

      // Setup Background Supabase Sync if password is known
      if (passwordStr && isSupabaseEnabled() && user.email) {
        supabaseClient.auth.signInWithPassword({ email: user.email, password: passwordStr })
          .then(({ data }) => { if (data?.user) initSync(); })
          .catch(err => console.warn('Supabase bg-sync skipped:', err.message));
      } else {
        initSync();
      }

      const finishAuth = async () => {
        this.currentUser = user;
        localStorage.setItem('erp_session', JSON.stringify(user));
        await db.update('users', user);
        this.render();
      };

      // Check if we should prompt for Passkey setup
      if (window.PublicKeyCredential && !user.passkeyId) {
        document.getElementById('app').innerHTML = this.renderPasskeySetup();

        document.getElementById('setup-passkey-btn').addEventListener('click', async (e) => {
          const btn = e.target.closest('button');
          btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Waiting for Device...';
          btn.disabled = true;
          try {
            const challenge = new Uint8Array(32); crypto.getRandomValues(challenge);
            const userId = new Uint8Array(16); crypto.getRandomValues(userId);

            const credential = await navigator.credentials.create({
              publicKey: {
                challenge: challenge,
                rp: { name: window.location.hostname || "Industrial ERP" },
                user: {
                  id: userId,
                  name: user.email,
                  displayName: user.businessName || user.email
                },
                pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
                authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required" },
                timeout: 60000
              }
            });

            if (credential) {
              user.passkeyId = btoa(String.fromCharCode.apply(null, new Uint8Array(credential.rawId)));
            }
          } catch (pkErr) {
            console.warn("Passkey setup failed or cancelled:", pkErr);
          }
          await finishAuth();
        });

        document.getElementById('skip-passkey-btn').addEventListener('click', async () => {
          await finishAuth();
        });

        return; // Halt here until the user interacts with the Passkey UI
      }

      await finishAuth();
    };
  }

  renderDashboard() { return renderDashboard(this); }

  renderDashboardContent(bottomNavItems) { return renderDashboardContent(this, bottomNavItems); }

  renderStyles() { return renderAppStyles(); }

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
        border: 1px solid var(--border-color); 
        border-radius: var(--radius-lg); 
        padding: 0;
        background: var(--bg-primary); /* Glassmorphism inherited */
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        box-shadow: var(--shadow-lg);
        width: 540px; max-width: 96vw; max-height: 90vh;
        color: var(--text-primary);
      }
      .onboarding-modal::backdrop { background: rgba(0,0,0,0.7); }
      .ob-content { padding: 2.5rem; display: flex; flex-direction: column; gap: 1.5rem; }
      .ob-header { display: flex; justify-content: space-between; align-items: center; }
      .ob-step-label { font-size: 0.8rem; color: var(--text-secondary); font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
      .ob-skip { background: none; border: none; color: var(--text-secondary); cursor: pointer; font-size: 0.875rem; text-decoration: underline; }
      .ob-skip:hover { color: var(--text-primary); }
      .ob-title { margin: 0; font-size: 1.75rem; font-weight: 700; color: var(--text-primary); }
      .ob-body { color: var(--text-secondary); line-height: 1.7; max-height: 50vh; overflow-y: auto; font-size: 1.05rem; }
      .ob-body p { margin: 0 0 0.5rem; }
      .ob-modules-list { display: flex; flex-direction: column; gap: 0.75rem; }
      .ob-module-item { display: flex; align-items: flex-start; gap: 1rem; padding: 1rem; background: rgba(255,255,255,0.03); border-radius: var(--radius-lg); border: 1px solid var(--border-color); }
      .ob-module-item p { margin: 0.15rem 0 0; font-size: 0.9rem; color: var(--text-secondary); }
      .ob-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--border-color); }
      .ob-dots { display: flex; gap: 0.5rem; }
      .ob-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--border-color); transition: all 0.3s; }
      .ob-dot.active { background: var(--accent-primary); width: 24px; border-radius: 9999px; }
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

    // Navigation — single delegated listener instead of one per item
    document.querySelector('.nav-menu')?.addEventListener('click', (e) => {
      const item = e.target.closest('.nav-item[data-module]');
      if (item) this.navigateTo(item.dataset.module);
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
      this.navigateTo('settings');
    });

    // Upgrade Button
    document.getElementById('upgrade-btn')?.addEventListener('click', () => {
      userDropdown?.classList.remove('open');
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
      this.navigateTo(item.dataset.module);
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

    // Offline Status Monitoring
    this.setupOfflineMonitoring();
  }

  setupOfflineMonitoring() {
    const syncWidget = document.getElementById('sync-status-widget');
    if (!syncWidget) return;

    const updateStatus = async () => {
      const isOnline = navigator.onLine;
      let pendingCount = 0;

      try {
        const pendingItems = await db.getPendingSyncItems();
        pendingCount = Array.isArray(pendingItems) ? pendingItems.length : 0;
      } catch (e) {
        console.warn('Could not fetch pending sync items for HUD');
      }

      if (!isOnline) {
        syncWidget.className = 'offline';
        syncWidget.innerHTML = `<i class="ph-bold ph-wifi-slash"></i> Offline ${pendingCount > 0 ? `(${pendingCount} pending)` : ''}`;
      } else if (pendingCount > 0) {
        syncWidget.className = 'syncing';
        syncWidget.innerHTML = `<i class="ph-bold ph-arrows-clockwise ph-spin"></i> Syncing ${pendingCount}...`;
      } else {
        syncWidget.className = '';
        syncWidget.innerHTML = `<i class="ph-bold ph-cloud-check"></i> Connected`;
      }
    };

    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);

    // Poll for queue changes every few seconds while online
    setInterval(updateStatus, 3000);

    // Initial check
    updateStatus();
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
        <h1>Initialization Error</h1>
        <p style="color: #ef4444;">${error.message}</p>
        <button onclick="location.reload()" class="btn btn-primary" style="margin-top: 1rem;">
          Retry
        </button>
      </div>
    `;
  }

  async updateDashboardStats() { return updateDashboardStats(this); }

  // ========== AI ADVISOR ==========
  async loadAIAdvisor() { return loadAIAdvisor(this); }

  // ========== THEME ==========

  applyTheme() {
    const saved = localStorage.getItem('erp_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', saved);
    this._updateThemeIcon(saved);

    document.getElementById('theme-toggle-btn')?.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') || 'dark';
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('erp_theme', next);
      this._updateThemeIcon(next);
    });
  }

  _updateThemeIcon(theme) {
    const icon = document.getElementById('theme-icon');
    if (icon) icon.className = theme === 'dark' ? 'ph ph-sun' : 'ph ph-moon';
  }

  // ========== GLOBAL SEARCH ==========

  initGlobalSearch() { return initGlobalSearch(this); }

  async _runSearch(query) { return runSearch(this, query); }

  _renderSearchResults(results, query = '') { return renderSearchResults(this, results, query); }

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
      list.innerHTML = '<p class="empty-notifications">No alerts.</p>';
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

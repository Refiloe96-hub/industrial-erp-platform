import './mobile.css'; // Global mobile responsive fixes for all pages
import SeedData from './utils/seedData.js';
import db from './db/index.js';
import { initRouter } from './router.js';
import { initSync } from './sync/syncManager.js';
import { registerSW } from 'virtual:pwa-register';
import { AIEngine } from './ai/engine.js';
import { supabaseClient, isSupabaseEnabled, checkSupabaseReachable } from './services/supabase.js';
import { esc } from './utils/safeJson.js';
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
            <div class="auth-logo"><i class="ph-bold ph-buildings"></i></div>
            <h1>Industrial ERP</h1>
            <p>Sign in to your workspace or create a new account.</p>
          </div>
          
          <div id="auth-social-buttons">
             <button class="btn btn-social" type="button" id="btn-google">
                <i class="ph-fill ph-google-logo" style="color: #ea4335;"></i> Continue with Google
             </button>
             <button class="btn btn-social" type="button" id="btn-apple">
                <i class="ph-fill ph-apple-logo" style="color: #ffffff;"></i> Continue with Apple
             </button>
             <button class="btn btn-social" type="button" id="btn-phone">
                <i class="ph-duotone ph-phone"></i> Continue with phone
             </button>
          </div>

          <div class="auth-divider" id="auth-divider">
            <span>OR</span>
          </div>

          <form id="unified-auth-form" class="auth-form">
            <!-- STEP 1: Email -->
            <div id="step-1-email">
              <div class="form-group">
                <input type="email" name="email" id="unified-email" placeholder="Email address" required autofocus />
              </div>
              <button type="button" class="btn btn-primary btn-block" id="continue-email-btn">
                Continue
              </button>
            </div>

            <!-- STEP 2: Login or Register Fields (Injected dynamically) -->
            <div id="step-2-fields" style="display: none;">
              <!-- Back button / Email display -->
              <div class="auth-email-display" id="auth-email-display">
                <button type="button" id="back-to-email-btn" class="back-btn">Edit</button>
                <span id="display-email-text"></span>
              </div>

              <!-- General Password -->
              <div class="form-group">
                <input type="password" name="password" id="unified-password" placeholder="Password" />
              </div>

              <!-- Registration Only Fields -->
              <div id="register-only-fields" style="display: none;">
                <div class="form-group">
                  <input type="text" name="businessName" id="reg-biz-name" placeholder="Business Name" />
                </div>
                <div class="form-group">
                  <select name="businessType" id="reg-biz-type">
                    <option value="" disabled selected>Business Type...</option>
                    <option value="shopowner">Storefront / Spaza</option>
                    <option value="trader">Distributor</option>
                    <option value="warehouse">Warehouse</option>
                    <option value="manufacturer">Manufacturer</option>
                  </select>
                </div>
                <div class="form-group">
                  <input type="text" name="ownerName" id="reg-owner-name" placeholder="Your Name" />
                </div>
                <div class="form-group">
                  <input type="tel" name="phone" id="reg-phone" placeholder="Phone (Optional)" />
                </div>
              </div>

              <button type="submit" class="btn btn-primary btn-block" id="final-submit-btn">
                Continue
              </button>
            </div>
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
          background: #0d0d0f;
        }

        .auth-card {
          background: #18181b;
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px;
          padding: 2.25rem 2.5rem;
          max-width: 420px;
          width: 100%;
          box-shadow: 0 8px 24px rgba(0,0,0,0.4);
          color: white;
        }

        .auth-logo {
          width: 40px; height: 40px;
          background: rgba(37,99,235,0.12);
          border: 1px solid rgba(37,99,235,0.2);
          border-radius: 9px;
          display: flex; align-items: center; justify-content: center;
          font-size: 1.1rem; color: #60a5fa;
          margin: 0 auto 1.25rem;
        }

        .auth-header { text-align: center; margin-bottom: 1.75rem; }
        .auth-header h1 {
          font-size: 1.25rem;
          font-weight: 700;
          letter-spacing: -0.02em;
          margin-bottom: 0.375rem;
          color: #f4f4f5;
        }
        .auth-header p { color: #a1a1aa; font-size: 0.875rem; line-height: 1.5; }

        .btn-social {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.625rem;
          background: transparent;
          border: 1px solid rgba(255,255,255,0.1);
          color: #e4e4e7;
          border-radius: 8px;
          padding: 0.625rem 1rem;
          margin-bottom: 0.625rem;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.15s, border-color 0.15s;
        }
        .btn-social:hover { background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.18); }
        .btn-social i { font-size: 1rem; }

        .auth-divider {
          display: flex;
          align-items: center;
          text-align: center;
          margin: 1.5rem 0;
          color: rgba(255, 255, 255, 0.5);
          font-size: 0.85rem;
        }
        .auth-divider::before, .auth-divider::after {
          content: '';
          flex: 1;
          border-bottom: 1px solid rgba(255, 255, 255, 0.2);
        }
        .auth-divider span { padding: 0 10px; }

        .form-group { margin-bottom: 1rem; }
        .form-group input, .form-group select {
          width: 100%;
          padding: 0.625rem 0.875rem;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.1);
          color: #f4f4f5;
          border-radius: 8px;
          font-size: 0.875rem;
          transition: border-color 0.15s;
        }
        .form-group select option { background: #18181b; color: #f4f4f5; }
        .form-group input::placeholder { color: #52525b; }
        .form-group input:focus, .form-group select:focus {
          outline: none;
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37,99,235,0.15);
        }

        .btn-primary {
          width: 100%;
          padding: 0.625rem 1rem;
          border: none;
          border-radius: 8px;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.15s;
          background: #2563eb;
          color: white;
        }
        .btn-primary:hover  { background: #1d4ed8; }
        .btn-primary:active { opacity: 0.9; }
        .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

        .auth-email-display {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 8px;
          padding: 0.5rem 0.875rem;
          margin-bottom: 1rem;
          font-size: 0.875rem;
        }
        .back-btn {
          background: transparent;
          color: #60a5fa;
          border: none;
          cursor: pointer;
          font-weight: 600;
          font-size: 0.85rem;
        }
        .back-btn:hover { text-decoration: underline; }

        .auth-footer { 
          margin-top: 1.5rem; 
          text-align: center; 
          color: rgba(255, 255, 255, 0.4); 
          font-size: 0.8rem; 
        }
      </style>
    `;
  }

  renderPasskeySetup() {
    return `
      <div class="auth-container">
        <div class="auth-card" style="text-align: center; padding: 3rem 2rem;">
          <div class="auth-header" style="margin-bottom: 2rem;">
            <i class="ph-duotone ph-fingerprint" style="font-size: 5rem; color: var(--primary); margin-bottom: 1rem;"></i>
            <h1 style="font-size: 1.8rem;">Secure Your Account</h1>
            <p style="margin-top: 1rem; line-height: 1.5;">Set up a Passkey for faster, passwordless logins using your fingerprint, face, or device PIN.</p>
          </div>
          
          <button id="setup-passkey-btn" class="btn btn-primary btn-block" style="margin-bottom: 1rem; font-size: 1.1rem; padding: 1rem; display: flex; align-items: center; justify-content: center; gap: 0.5rem;">
            <i class="ph-bold ph-plus"></i> Create Passkey
          </button>
          
          <button id="skip-passkey-btn" class="btn btn-block" style="background: transparent; color: var(--text-secondary); border: 1px solid var(--border); padding: 0.625rem 1rem; border-radius: 8px; cursor: pointer;">
            Skip for now
          </button>
        </div>
      </div>
    `;
  }

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
        <button class="menu-toggle" id="menu-toggle" aria-label="Open navigation menu"><i class="ph ph-list"></i></button>
        <h1>${esc(this.currentUser.businessName)}</h1>
        <div style="display: flex; gap: 0.5rem;">
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
                  ${this.config?.businessLogo ? `<img src="${this.config.businessLogo}" style="width:100%;height:100%;object-fit:contain;border-radius:6px;">` : '<i class="ph-bold ph-buildings" style="font-size:0.875rem;color:#60a5fa;"></i>'}
                </span>
                <div style="min-width:0;">
                  <p class="business-name">${esc(this.currentUser.businessName)}</p>
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
          
          <div class="sidebar-footer" style="position:relative;">
            <!-- User dropdown (opens upward) -->
            <div id="user-dropdown" class="user-dropdown" aria-hidden="true">
              <div class="ud-header">
                <span class="ud-hname">${esc(this.currentUser.businessName)}</span>
                <span class="ud-hemail">${esc(this.currentUser.email || '')}</span>
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
              <div class="user-avatar">${esc(this.currentUser.businessName.charAt(0).toUpperCase())}</div>
              <div class="user-meta">
                <span class="user-meta-name">${esc(this.currentUser.businessName)}</span>
                <span class="user-meta-email">${esc(this.currentUser.email || '')}</span>
              </div>
              <i class="ph ph-dots-three user-menu-dots"></i>
            </button>
          </div>
        </nav>
        
        <main class="main-content">
          <header class="content-header">
            <h1 id="module-title">${businessLabel}</h1>
            <div class="header-actions">
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

  renderStyles() {
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

  async updateDashboardStats() {
    console.log('🔄 updateDashboardStats: Starting...');

    try {
      // Lazy-load missing dependencies (happens if user just logged in without page refresh)
      if (!this.pocketBooks) {
        const { default: PocketBooks } = await import('./modules/PocketBooks.js');
        this.pocketBooks = new PocketBooks();
      }
      if (!this.poolStock) {
        const { default: PoolStock } = await import('./modules/PoolStock.js');
        this.poolStock = new PoolStock(db);
      }
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
            chartCashflow.innerHTML = ChartUtils.renderBarChart(dailyData);
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
              chartInventory.innerHTML = ChartUtils.renderDonutChart(catData);
            } else {
              chartInventory.innerHTML = '<p class="text-muted">No inventory data</p>';
            }
          }
        }
      } catch (e) {
        console.error('❌ Inventory Error:', e);
        document.getElementById('stat-inventory').textContent = 'Error';
      }

      // 3. SmartShift - Machines + Production Orders
      try {
        console.log('⚙️ Fetching SmartShift data...');
        const machines = await db.getAll('machines');
        const productionOrders = await db.getAll('productionOrders');
        console.log(`✅ Got ${machines.length} machines, ${productionOrders.length} orders`);
        const elMachine = document.getElementById('stat-machine-util');
        if (elMachine) {
          if (machines.length) {
            const operational = machines.filter(m => m.status === 'operational' || m.status === 'running').length;
            const util = Math.round((operational / machines.length) * 100);
            const pendingOrders = productionOrders.filter(o => o.status === 'pending' || o.status === 'in_progress').length;
            elMachine.textContent = `${util}% (${pendingOrders} Orders)`;
          } else {
            const pendingOrders = productionOrders.filter(o => o.status === 'pending' || o.status === 'in_progress').length;
            elMachine.textContent = pendingOrders > 0 ? `${pendingOrders} Pending Orders` : 'No Machines Yet';
          }
        }
        // Chart
        const chartMachines = document.getElementById('chart-machines');
        if (chartMachines) {
          if (machines.length) {
            const operational = machines.filter(m => m.status === 'operational' || m.status === 'running').length;
            chartMachines.innerHTML = ChartUtils.renderGauge(operational, machines.length, {
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
              chartSyndicates.innerHTML = ChartUtils.renderDonutChart(statusData);
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

      // Attach click handlers to dashboard stat cards (data now available)
      try {
        const { showDetailPanel, dpBar, dpKV } = await import('./ui/panelHelper.js');
        const txs = this.pocketBooks ? await this.pocketBooks.getTransactions() : [];
        const items = this.poolStock ? await this.poolStock.getInventory() : [];
        const machines = await db.getAll('machines');
        const syndicates = await db.getAll('syndicates');

        const balance = txs.reduce((s, t) => s + (t.type === 'income' ? t.amount : -t.amount), 0);
        const lowStock = items.filter(i => i.quantity <= (i.reorderLevel || 10)).length;
        const operational = machines.filter(m => m.status === 'operational' || m.status === 'running').length;
        const totalPool = syndicates.reduce((s, sy) => s + (sy.totalPool || 0), 0);
        const byCategory = {};
        items.forEach(i => { const c = i.category || 'Other'; byCategory[c] = (byCategory[c] || 0) + 1; });
        const maxCat = Math.max(...Object.values(byCategory), 1);
        const maxMUtil = Math.max(...machines.map(m => m.utilization || 0), 1);

        const dashPanels = {
          cashflow: {
            title: 'Cash Flow Summary',
            subtitle: `Net balance: R ${balance.toLocaleString()}`,
            bodyHTML: `<div class="dp-section"><div class="dp-section-title">Overview</div><div class="dp-kv-grid">
              ${dpKV('Total Income', 'R ' + txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0).toLocaleString())}
              ${dpKV('Total Expenses', 'R ' + txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0).toLocaleString())}
              ${dpKV('Net Balance', (balance >= 0 ? '+' : '') + 'R ' + balance.toLocaleString(), true)}
            </div></div>
            <div class="dp-section"><div class="dp-section-title">Recent Transactions</div>
              <ul class="dp-list">${txs.slice(0, 6).map(t => `<li><span>${t.description || t.category}</span>
                <span style="color:${t.type === 'income' ? '#16a34a' : '#dc2626'};font-weight:600">${t.type === 'income' ? '+' : '-'}R ${(t.amount || 0).toLocaleString()}</span>
              </li>`).join('') || '<li>No transactions yet</li>'}</ul>
            </div>`
          },
          inventory: {
            title: 'Inventory Health',
            subtitle: `${items.length} items, ${lowStock} below reorder level`,
            bodyHTML: `<div class="dp-section"><div class="dp-section-title">Stock Health</div><div class="dp-kv-grid">
              ${dpKV('Total SKUs', items.length)}
              ${dpKV('Low Stock', lowStock + ' items')}
              ${dpKV('Out of Stock', items.filter(i => i.quantity === 0).length + ' items')}
              ${dpKV('Total Value', 'R ' + items.reduce((s, i) => s + (i.quantity * (i.unitPrice || 0)), 0).toLocaleString())}
            </div></div>
            <div class="dp-section"><div class="dp-section-title">By Category</div>
              ${Object.entries(byCategory).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([cat, n]) => dpBar(cat, n, maxCat, '#2563eb')).join('')}
            </div>`
          },
          machines: {
            title: 'Machine Utilization',
            subtitle: `${machines.length} machines registered`,
            bodyHTML: `<div class="dp-section"><div class="dp-section-title">Overview</div><div class="dp-kv-grid">
              ${dpKV('Operational', operational)}
              ${dpKV('Total', machines.length)}
              ${dpKV('Utilization', machines.length ? Math.round((operational / machines.length) * 100) + '%' : '—')}
            </div></div>
            ${machines.length ? `<div class="dp-section"><div class="dp-section-title">By Machine</div>
              ${machines.sort((a, b) => (b.utilization || 0) - (a.utilization || 0)).map(m => dpBar(m.name, m.utilization || 0, maxMUtil, m.status === 'running' || m.status === 'operational' ? '#16a34a' : '#94a3b8', v => v + '%')).join('')}
            </div>` : '<div class="dp-empty">No machines yet. Add machines in SmartShift.</div>'}`
          },
          syndicates: {
            title: 'Syndicate Status',
            subtitle: `${syndicates.length} active syndicates, R ${totalPool.toLocaleString()} in capital pools`,
            bodyHTML: `<div class="dp-section"><div class="dp-section-title">Summary</div><div class="dp-kv-grid">
              ${dpKV('Active Syndicates', syndicates.length)}
              ${dpKV('Total Capital', 'R ' + totalPool.toLocaleString())}
            </div></div>
            ${syndicates.length ? `<div class="dp-section"><div class="dp-section-title">Capital by Syndicate</div>
              ${syndicates.sort((a, b) => (b.totalPool || 0) - (a.totalPool || 0)).map(s => dpBar(s.name, s.totalPool || 0, Math.max(...syndicates.map(x => x.totalPool || 0), 1), '#f97316', v => 'R ' + v.toLocaleString())).join('')}
            </div>` : '<div class="dp-empty">No syndicates yet. Create one in TrustCircle.</div>'}`
          }
        };

        document.querySelectorAll('.card.stat-card[data-card]').forEach(card => {
          card.addEventListener('click', () => {
            const p = dashPanels[card.dataset.card];
            if (p) showDetailPanel(p);
          });
        });
      } catch (panelErr) {
        console.warn('Panel wiring skipped:', panelErr.message);
      }

      console.log('✅ updateDashboardStats: Complete');

      // 5. Load AI Advisor card
      this.loadAIAdvisor();

    } catch (error) {
      console.error('🔥 CRITICAL FAIL in updateDashboardStats:', error);
      const chartCashflow = document.getElementById('chart-cashflow');
      if (chartCashflow) {
        chartCashflow.innerHTML = `<div class="text-center p-3">
            <p class="text-danger">Chart unavailable</p>
            <small class="text-muted">${error.message}</small>
          </div>`;
      }
    }
  }

  // ========== AI ADVISOR ==========
  async loadAIAdvisor() {
    const scoresEl = document.getElementById('ai-module-scores');
    const insightsEl = document.getElementById('ai-insights-list');
    const noteEl = document.getElementById('ai-source-note');
    if (!scoresEl || !insightsEl) return;

    const scoreColor = (s) => s >= 70 ? '#10b981' : s >= 40 ? '#f59e0b' : '#ef4444';
    const moduleLabels = { finance: 'Finance', inventory: 'Inventory', production: 'Production', syndicate: 'Syndicate', sales: 'Sales' };

    try {
      const { default: aiEngine } = await import('./services/aiEngine.js');
      const snapshot = await aiEngine.getBusinessSnapshot();

      // Render module health scores
      scoresEl.innerHTML = Object.entries(moduleLabels).map(([key, label]) => {
        const s = snapshot[key]?.score ?? 50;
        return `<div style="display:flex;align-items:center;gap:0.4rem;font-size:0.78rem;">
          <span style="width:10px;height:10px;border-radius:50%;background:${scoreColor(s)};flex-shrink:0;"></span>
          <span style="color:var(--text-secondary)">${label}</span>
          <span style="font-weight:700;color:${scoreColor(s)}">${s}</span>
        </div>`;
      }).join('') + `<div style="margin-left:auto;font-size:0.78rem;font-weight:700;color:var(--text-secondary)">
        Overall: <span style="color:${scoreColor(snapshot.overallScore)}">${snapshot.overallScore}/100</span>
      </div>`;

      // Get NL insights
      const apiKey = aiEngine.getApiKey();
      const insights = await aiEngine.getNLInsights(snapshot, apiKey);

      const severityColor = { critical: '#ef4444', warning: '#f59e0b', good: '#10b981' };
      insightsEl.innerHTML = insights.map(ins => `
        <div style="display:flex;align-items:flex-start;gap:0.625rem;padding:0.5rem 0.75rem;
          border-radius:6px;border-left:2px solid ${severityColor[ins.severity] || '#2563eb'};">
          <span style="font-size:0.8125rem;line-height:1.55;color:var(--text-primary)">${ins.text}</span>
        </div>`).join('');

      if (!apiKey && noteEl) noteEl.style.display = 'block';

    } catch (err) {
      console.warn('AI Advisor load error:', err.message);
      if (insightsEl) insightsEl.innerHTML = `<p style="font-size:0.8125rem;color:var(--text-muted)">Add data to your modules to generate insights.</p>`;
    }

    // Wire Refresh button
    document.getElementById('ai-refresh-btn')?.addEventListener('click', () => {
      if (insightsEl) insightsEl.innerHTML = '<p style="font-size:0.8125rem;color:var(--text-muted);">Refreshing...</p>';
      this.loadAIAdvisor();
    });
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

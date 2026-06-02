import { getSession, safeParseJSON } from '../utils/safeJson.js';
import db from '../db/index.js';
import DataImportService from '../services/DataImportService.js';
import HardwareService from '../services/HardwareService.js';
import P2PSyncManager from '../sync/P2PSyncManager.js';

class SettingsUI {
  constructor() {
    this.settings = {
      taxRate: 15,
      currency: 'ZAR',
      businessName: '',
      businessLogo: null,
      printerIp: ''
    };
  }

  async init() {
    // Load settings from DB
    const saved = await db.get('settings', 'config');
    if (saved) {
      this.settings = { ...this.settings, ...saved };
    } else {
      // Try to get business profile if config doesn't exist
      const profile = await db.get('settings', 'businessProfile');
      if (profile) {
        this.settings.businessName = profile.businessName;
      }
    }
  }

  async render(container) {
    await this.init();

    container.innerHTML = `
      <div class="settings-layout">
        <!-- LEFT COLUMN: Navigation Master -->
        <div class="settings-nav">
          <div class="nav-header">
            <h2>Settings</h2>
          </div>
          <div class="nav-menu">
            <button class="nav-item active" data-target="pane-business">
              <i class="ph-duotone ph-buildings"></i> Your Business
            </button>
            <button class="nav-item" data-target="pane-financials">
              <i class="ph-duotone ph-currency-dollar"></i> Financials
            </button>
            <button class="nav-item" data-target="pane-team">
              <i class="ph-duotone ph-users"></i> Team Management
            </button>
            <button class="nav-item" data-target="pane-data">
              <i class="ph-duotone ph-floppy-disk"></i> Data & Storage
            </button>
            <button class="nav-item" data-target="pane-hardware">
              <i class="ph-duotone ph-plugs-connected"></i> Hardware Integrations
            </button>
            <button class="nav-item" data-target="pane-sync">
              <i class="ph-duotone ph-wifi-slash"></i> Offline P2P Sync
            </button>
            <button class="nav-item" data-target="pane-ai">
              <i class="ph-duotone ph-cpu"></i> AI & Forecasting
            </button>
          </div>
        </div>

        <!-- RIGHT COLUMN: Content Detail -->
        <div class="settings-pane">
          <!-- Mobile Header (Hidden on Desktop) -->
          <div class="pane-mobile-header" style="display:none;">
            <button class="btn-icon" id="btn-back-nav"><i class="ph-bold ph-arrow-left"></i></button>
            <h3 id="mobile-pane-title">Your Business</h3>
          </div>

          <!-- PANE: Business -->
          <div class="pane-content active" id="pane-business">
            <div class="pane-header">
              <h3>Your Business</h3>
              <p>Configure your workspace details and branding.</p>
            </div>
            <div class="pane-body">
              <div class="form-group">
                <label>Business Logo</label>
                <div style="display:flex;align-items:center;gap:1rem;">
                  <div id="logo-preview" style="width:56px;height:56px;border-radius:8px;background:rgba(255,255,255,0.04);display:flex;align-items:center;justify-content:center;overflow:hidden;border:1px solid var(--border);flex-shrink:0;">
                    ${this.settings.businessLogo ? `<img src="${this.settings.businessLogo}" style="max-width:100%;max-height:100%;object-fit:contain;">` : '<i class="ph-duotone ph-image" style="font-size:1.25rem;color:var(--text-muted);"></i>'}
                  </div>
                  <input type="file" id="set-logo" accept="image/*" style="font-size:0.8125rem;color:var(--text-secondary);">
                </div>
                <small style="font-size:0.75rem;color:var(--text-muted);margin-top:0.375rem;display:block;">Shown in the sidebar and on receipts. Max 1MB.</small>
              </div>
              <div class="form-group">
                <label>Business Name</label>
                <input type="text" id="set-name" value="${this.settings.businessName}" placeholder="My Shop">
                <small style="font-size:0.75rem;color:var(--text-muted);margin-top:0.375rem;display:block;">Shown on receipts and financial documents.</small>
              </div>
              <div class="form-group">
                <label>Tagline / Slogan</label>
                <input type="text" id="set-tagline" value="${this.settings.businessTagline || ''}" placeholder="e.g. Fresh Quality Every Day">
              </div>
              <div class="form-group">
                <label>VAT Registration Number</label>
                <input type="text" id="set-vat-number" value="${this.settings.vatNumber || ''}" placeholder="e.g. 4123456789">
                <small style="font-size:0.75rem;color:var(--text-muted);margin-top:0.375rem;display:block;">Printed on invoices as required by SARS.</small>
              </div>
              <div class="form-group">
                <label>Business Address</label>
                <input type="text" id="set-address" value="${this.settings.businessAddress || ''}" placeholder="123 Main Road, Soweto, 1804">
              </div>
              <div class="form-group">
                <label>Contact Phone</label>
                <input type="tel" id="set-biz-phone" value="${this.settings.businessPhone || ''}" placeholder="011 000 0000">
              </div>
              <div class="form-group">
                <label>Contact Email</label>
                <input type="email" id="set-biz-email" value="${this.settings.businessEmail || ''}" placeholder="info@mybusiness.co.za">
              </div>
              <div class="form-group">
                <label>Default Currency</label>
                <select id="set-currency">
                   <option value="ZAR" ${this.settings.currency === 'ZAR' ? 'selected' : ''}>South African Rand (ZAR)</option>
                   <option value="KES" ${this.settings.currency === 'KES' ? 'selected' : ''}>Kenyan Shilling (KES)</option>
                   <option value="NGN" ${this.settings.currency === 'NGN' ? 'selected' : ''}>Nigerian Naira (NGN)</option>
                   <option value="USD" ${this.settings.currency === 'USD' ? 'selected' : ''}>US Dollar (USD)</option>
                   <option value="EUR" ${this.settings.currency === 'EUR' ? 'selected' : ''}>Euro (EUR)</option>
                </select>
                <small style="font-size:0.75rem;color:var(--text-muted);margin-top:0.375rem;display:block;">Sets the currency symbol across dashboards and receipts.</small>
              </div>
              <div class="pane-actions">
                <button class="btn btn-primary" id="save-settings-business">Save Changes</button>
              </div>
            </div>
          </div>

          <!-- PANE: Financials -->
          <div class="pane-content" id="pane-financials">
            <div class="pane-header">
              <h3>Financials</h3>
              <p>Manage tax rates and accounting preferences.</p>
            </div>
            <div class="pane-body">
              <div class="form-group">
                <label>VAT / Tax Rate (%)</label>
                <input type="number" id="set-tax" value="${this.settings.taxRate}" min="0" max="100">
                <small style="font-size:0.75rem;color:var(--text-muted);margin-top:0.375rem;display:block;">Applied automatically at the Point of Sale to calculate VAT.</small>
              </div>
              <div class="pane-actions">
                <button class="btn btn-primary" id="save-settings-finance">Save Changes</button>
              </div>
            </div>
          </div>

          <!-- PANE: Team -->
          <div class="pane-content" id="pane-team">
            <div class="pane-header">
              <h3>Team Management</h3>
              <p>Manage staff access and roles for your business.</p>
            </div>
            <div class="pane-body">
              <button class="btn btn-secondary" id="btn-add-team-member" style="margin-bottom:1rem;">
                <i class="ph-bold ph-user-plus"></i> Add Team Member
              </button>
              <div id="team-list" class="slim-list">
                <div class="loading-spinner"><i class="ph ph-spinner ph-spin"></i> Loading team...</div>
              </div>
            </div>
          </div>

          <!-- PANE: Data -->
          <div class="pane-content" id="pane-data">
            <div class="pane-header">
              <h3>Data & Storage</h3>
              <p>Back up your database, restore from a file, or import templates.</p>
            </div>
            <div class="pane-body">
              <div class="form-group">
                <label>Backup & Restore</label>
                <div style="display:flex;flex-direction:column;gap:0.5rem;">
                  <button class="btn btn-secondary" id="btn-backup" style="justify-content:flex-start;">
                    <i class="ph-bold ph-download-simple"></i> Download Backup (JSON)
                  </button>
                  <button class="btn btn-secondary" id="btn-restore" style="justify-content:flex-start;color:var(--danger);border-color:rgba(239,68,68,0.3);">
                    <i class="ph-bold ph-upload-simple"></i> Restore from Backup
                  </button>
                  <input type="file" id="file-restore" style="display:none;" accept=".json">
                </div>
                <small style="font-size:0.75rem;color:var(--text-muted);margin-top:0.5rem;display:block;">Restore will overwrite all current data.</small>
              </div>

              <div class="settings-section-divider"></div>

              <div class="form-group">
                <label>Import Wizard</label>
                <p style="font-size:0.8125rem;color:var(--text-secondary);margin:0 0 0.75rem;">Load your workspace with industry-specific inventory templates.</p>
                <button class="btn btn-secondary" id="btn-import-wizard" style="justify-content:flex-start;">
                  Open Import Wizard
                </button>
              </div>

              <div class="settings-section-divider"></div>

              <div class="form-group">
                <label>Developer Tools</label>
                <p style="font-size:0.8125rem;color:var(--text-secondary);margin:0 0 0.75rem;">Populate your workspace with realistic sample data for testing.</p>
                <div style="display:flex;gap:0.5rem;flex-wrap:wrap;">
                  <button class="btn btn-secondary" id="btn-seed-data" style="justify-content:flex-start;">
                    Load Sample Data
                  </button>
                  <button class="btn btn-secondary" id="btn-test-onboarding" style="justify-content:flex-start;">
                    Preview Onboarding
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- PANE: Hardware -->
          <div class="pane-content" id="pane-hardware">
            <div class="pane-header">
              <h3>Hardware Integrations</h3>
              <p>Connect physical devices via Web Serial and Web Bluetooth.</p>
            </div>
            <div class="pane-body">
              <p class="text-sm text-muted mb-4">Legacy rugged hardware connects directly to the browser. Fallbacks to simulator mode if physical devices aren't found.</p>
              
              <button class="btn btn-secondary w-100 mb-3" id="btn-connect-scale">
                  <i class="ph-bold ph-scales"></i> Connect Weighing Scale (Serial)
              </button>
              <button class="btn btn-secondary w-100 mb-4" id="btn-connect-printer">
                  <i class="ph-bold ph-printer"></i> Connect Thermal Printer (Bluetooth)
              </button>
              
              <div id="hardware-status" class="status-box">
                 Status: Waiting for connection...
              </div>
            </div>
          </div>

          <!-- PANE: Sync -->
          <div class="pane-content" id="pane-sync">
            <div class="pane-header">
              <h3>Offline P2P Sync</h3>
              <p>Sync data directly across local devices without internet.</p>
            </div>
            <div class="pane-body">
              <div class="form-group mb-4">
                  <label>Host a Session (Server)</label>
                  <p class="text-xs text-muted mb-2">Generate a token for other devices to join.</p>
                  <div class="flex-input-group">
                      <input type="text" id="p2p-host-token" readonly placeholder="Click 'Host' ->">
                      <button class="btn btn-secondary" id="btn-p2p-host"><i class="ph-bold ph-qr-code"></i> Host</button>
                  </div>
              </div>
              
              <div class="settings-section-divider"></div>

              <div class="form-group mb-4">
                  <label>Join a Session (Client)</label>
                  <p class="text-xs text-muted mb-2">Paste the token from the Host device.</p>
                  <div class="flex-input-group">
                      <input type="text" id="p2p-join-token" placeholder="Paste Host Token Here">
                      <button class="btn btn-secondary" id="btn-p2p-join"><i class="ph-bold ph-plug"></i> Join</button>
                  </div>
              </div>

              <div id="p2p-status" class="status-box">
                 Status: Disconnected
              </div>
            </div>
          </div>

          <!-- PANE: AI -->
          <div class="pane-content" id="pane-ai">
            <div class="pane-header">
              <h3>AI & Forecasting</h3>
              <p>Configure the intelligence engine for PocketBooks and SmartShift.</p>
            </div>
            <div class="pane-body">
              <div class="form-group mb-4">
                <label>Groq API Key</label>
                <p class="text-xs text-muted mb-2">Powers the Business Advisor. Leave blank for rule-based mode. <br><a href="https://console.groq.com" target="_blank" class="text-accent underline">Get a free key here</a>.</p>
                <input type="password" id="set-groq-key"
                  value="${localStorage.getItem('erp_groq_api_key') || ''}"
                  placeholder="gsk_xxxxxxxxxxxxxxxxxxxxxxxx"
                  autocomplete="off">
              </div>
              <div class="form-group mb-4">
                <label>Forecast Horizon</label>
                <select id="set-forecast-horizon">
                  <option value="7" ${(localStorage.getItem('erp_forecast_horizon') || '14') === '7' ? 'selected' : ''}>7 Days</option>
                  <option value="14" ${(localStorage.getItem('erp_forecast_horizon') || '14') === '14' ? 'selected' : ''}>14 Days</option>
                  <option value="30" ${(localStorage.getItem('erp_forecast_horizon') || '14') === '30' ? 'selected' : ''}>30 Days</option>
                </select>
              </div>
              <div class="settings-section-divider"></div>

              <div class="form-group">
                <label>Daily Summary Notification</label>
                <p class="text-xs text-muted mb-2">
                  Get a browser notification at end of day with today's revenue, sales count, and low-stock alerts.
                </p>
                <div style="display:flex;align-items:center;gap:0.75rem;flex-wrap:wrap;">
                  <label style="display:flex;align-items:center;gap:0.5rem;cursor:pointer;font-size:0.875rem;">
                    <input type="checkbox" id="set-daily-summary"
                      ${localStorage.getItem('erp_daily_summary_enabled') === 'true' ? 'checked' : ''}
                      style="width:auto;accent-color:var(--accent);">
                    Enable daily summary
                  </label>
                  <div style="display:flex;align-items:center;gap:0.375rem;">
                    <span style="font-size:0.8125rem;color:var(--text-secondary);">at</span>
                    <select id="set-summary-hour" style="width:auto;padding:0.25rem 0.5rem;font-size:0.8125rem;">
                      ${[15,16,17,18,19,20].map(h => `<option value="${h}" ${parseInt(localStorage.getItem('erp_daily_summary_hour')||'17')===h?'selected':''}>${h}:00</option>`).join('')}
                    </select>
                  </div>
                  <button class="btn btn-secondary" id="test-notification-btn" style="font-size:0.75rem;padding:0.3rem 0.75rem;">
                    Test now
                  </button>
                </div>
                <p id="notif-permission-note" class="text-xs" style="margin-top:0.5rem;color:var(--text-muted);display:none;">
                  Browser notifications are blocked. Enable them in your browser settings.
                </p>
              </div>

              <div class="pane-actions">
                <button class="btn btn-primary" id="save-ai-settings">Save AI Settings</button>
              </div>
            </div>
          </div>

        </div> <!-- /.settings-pane -->
      </div> <!-- /.settings-layout -->

      <!-- Add Team Member Modal -->
      <dialog id="add-team-modal" class="x-modal">
        <div class="x-modal-content">
           <div class="x-modal-header">
              <h3>Add Team Member</h3>
              <button type="button" class="btn-icon" id="close-add-team">&times;</button>
           </div>
           <form id="add-team-form" class="x-modal-body">
             <div class="form-group">
               <label>Full Name</label>
               <input type="text" name="ownerName" required placeholder="e.g. Thabo Molefe">
             </div>
             <div class="form-group">
               <label>Username</label>
               <input type="text" name="username" required placeholder="e.g. thabo">
             </div>
             <div class="form-group">
               <label>Password</label>
               <input type="password" name="password" required>
             </div>
             <div class="form-group">
               <label>POS PIN (4 digits)</label>
               <input type="text" name="posPin" maxlength="4" pattern="[0-9]{4}" inputmode="numeric" placeholder="e.g. 1234">
               <small style="font-size:0.75rem;color:var(--text-muted);margin-top:0.25rem;display:block;">Optional — lets staff switch users at the POS without entering a full password.</small>
             </div>
             <div class="form-group">
               <label>Role</label>
               <select name="role" required>
                 <option value="staff">Staff (Limited Access)</option>
                 <option value="manager">Manager</option>
                 <option value="admin">Admin / Owner</option>
               </select>
             </div>
             <button type="submit" class="btn btn-primary w-100 mt-2">Create Account</button>
           </form>
        </div>
      </dialog>

      ${this.renderStyles()}
      ${this.renderImportModal()}
    `;

    this.attachHandlers(container);
    this.loadTeamList(container);
  }

  async loadTeamList(container) {
    const listContainer = container.querySelector('#team-list');
    if (!listContainer) return;
    try {
      const users = await db.getAll('users');
      if (!users || users.length === 0) {
        listContainer.innerHTML = '<p class="text-muted text-sm" style="font-size:0.875rem">No team members found.</p>';
        return;
      }
      listContainer.innerHTML = users.map(u => `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:0.75rem; background:var(--bg-secondary); border-radius:6px; margin-bottom:0.5rem">
          <div>
            <div style="font-weight:600">${u.username || u.email || 'User'}</div>
            <div style="font-size:0.75rem; color:var(--text-secondary); text-transform:capitalize">${u.role || 'staff'}</div>
          </div>
          <button class="btn btn-sm" style="background:transparent;border:1px solid var(--danger);color:var(--danger);padding:0.25rem 0.5rem;font-size:0.75rem;" onclick="alert('Account deletion not enabled in demo mode.')">Remove</button>
        </div>
      `).join('');
    } catch {
      listContainer.innerHTML = '<p style="color:var(--danger);font-size:0.875rem">Error loading team list.</p>';
    }
  }

  attachHandlers(container) {
    // --- Navigation Routing (Master-Detail Split Pane) ---
    const navItems = container.querySelectorAll('.nav-item');
    const panes = container.querySelectorAll('.pane-content');
    const layout = container.querySelector('.settings-layout');
    const mobileBackBtn = container.querySelector('#btn-back-nav');
    const mobileTitle = container.querySelector('#mobile-pane-title');

    navItems.forEach(btn => {
      btn.addEventListener('click', () => {
        // Remove active class from all
        navItems.forEach(n => n.classList.remove('active'));
        panes.forEach(p => p.classList.remove('active'));

        // Add active class to clicked
        btn.classList.add('active');
        const targetId = btn.getAttribute('data-target');
        container.querySelector(`#${targetId}`).classList.add('active');
        
        // Mobile handling
        if (window.innerWidth <= 768) {
           layout.classList.add('pane-active');
           const iconHtml = btn.querySelector('i').outerHTML;
           const textTitle = btn.textContent.trim();
           mobileTitle.innerHTML = `${iconHtml} ${textTitle}`;
        }
      });
    });

    mobileBackBtn?.addEventListener('click', () => {
       layout.classList.remove('pane-active');
    });

    // Image Logo Upload Preview
    const logoInput = container.querySelector('#set-logo');
    let currentLogoBase64 = this.settings.businessLogo || null;
    if (logoInput) {
      logoInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 1024 * 1024) {
          alert('Logo file must be less than 1MB');
          return;
        }
        const reader = new FileReader();
        reader.onload = (event) => {
          currentLogoBase64 = event.target.result;
          const preview = container.querySelector('#logo-preview');
          if (preview) preview.innerHTML = `<img src="${currentLogoBase64}" style="max-width:100%; max-height:100%; object-fit:contain;">`;
        };
        reader.readAsDataURL(file);
      });
    }

    // --- Save Settings ---
    const handleSave = async (e) => {
      const btn = e.target;
      const originalText = btn.innerHTML;
      btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Saving...';

      const newSettings = {
        ...this.settings,
        businessName:     container.querySelector('#set-name')?.value    || this.settings.businessName,
        businessTagline:  container.querySelector('#set-tagline')?.value  || '',
        vatNumber:        container.querySelector('#set-vat-number')?.value || '',
        businessAddress:  container.querySelector('#set-address')?.value  || '',
        businessPhone:    container.querySelector('#set-biz-phone')?.value || '',
        businessEmail:    container.querySelector('#set-biz-email')?.value || '',
        currency:         container.querySelector('#set-currency')?.value  || this.settings.currency,
        businessLogo:     currentLogoBase64,
        taxRate:          parseFloat(container.querySelector('#set-tax')?.value) || 0,
        printerIp:        container.querySelector('#set-printer')?.value   || ''
      };

      try {
        await db.update('settings', { key: 'config', ...newSettings });
        this.settings = newSettings;
        
        // Update sidebar dynamically
        const brandLogo = document.querySelector('.brand .logo');
        const brandName = document.querySelector('.brand h2');
        if (brandLogo && currentLogoBase64) {
          brandLogo.innerHTML = `<img src="${currentLogoBase64}" style="width: 100%; height: 100%; object-fit: contain;">`;
          brandLogo.style.background = 'none';
        } else if (brandLogo && !currentLogoBase64) {
          brandLogo.innerHTML = '<i class="ph-duotone ph-buildings"></i>';
        }
        if (brandName && newSettings.businessName) brandName.textContent = newSettings.businessName;

        // Update user profile
        const currentUser = getSession();
        if (currentUser) {
          currentUser.businessName = newSettings.businessName;
          localStorage.setItem('erp_session', JSON.stringify(currentUser));
        }

        setTimeout(() => btn.innerHTML = 'Saved!', 500);
        setTimeout(() => btn.innerHTML = originalText, 2000);
      } catch (err) {
        console.error(err);
        alert('Failed to save settings');
        btn.innerHTML = originalText;
      }
    };

    container.querySelector('#save-settings-business')?.addEventListener('click', handleSave);
    container.querySelector('#save-settings-finance')?.addEventListener('click', handleSave);

    // AI Settings Save
    container.querySelector('#save-ai-settings')?.addEventListener('click', async () => {
      const key = (container.querySelector('#set-groq-key')?.value || '').trim();
      const horizon = container.querySelector('#set-forecast-horizon')?.value || '14';
      localStorage.setItem('erp_groq_api_key', key);
      localStorage.setItem('erp_forecast_horizon', horizon);

      // Daily summary settings
      const summaryEnabled = container.querySelector('#set-daily-summary')?.checked || false;
      const summaryHour = container.querySelector('#set-summary-hour')?.value || '17';

      if (summaryEnabled) {
        // Request permission if not already granted
        const granted = await Notification.requestPermission?.().catch(() => 'denied');
        if (granted !== 'granted') {
          const note = container.querySelector('#notif-permission-note');
          if (note) note.style.display = 'block';
          container.querySelector('#set-daily-summary').checked = false;
          alert('Notifications are blocked in your browser. Please allow notifications for this site in browser settings.');
          return;
        }
      }

      localStorage.setItem('erp_daily_summary_enabled', summaryEnabled ? 'true' : 'false');
      localStorage.setItem('erp_daily_summary_hour', summaryHour);

      alert(key ? 'Settings saved. AI insights enabled.' : 'Settings saved.');
    });

    // Test notification button
    container.querySelector('#test-notification-btn')?.addEventListener('click', async () => {
      if (!('Notification' in window)) { alert('Browser notifications not supported.'); return; }
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') {
        const note = container.querySelector('#notif-permission-note');
        if (note) note.style.display = 'block';
        return;
      }
      const session = getSession();
      const businessName = session?.businessName || 'My Business';
      // Dynamically import to avoid loading on settings open
      const { DailySummary } = await import('../services/dailySummary.js');
      const { title, body } = await DailySummary.buildSummary(businessName);
      new Notification(title, { body, icon: '/icons/icon.svg', tag: 'erp-test' });
    });

    // P2P Offline Sync (WebRTC)
    const p2pStatus = container.querySelector('#p2p-status');
    const hostTokenInput = container.querySelector('#p2p-host-token');
    const joinTokenInput = container.querySelector('#p2p-join-token');

    // Global listener for connection status changes
    window.addEventListener('p2p-status', (e) => {
      if (e.detail === 'connected') {
        p2pStatus.innerHTML = '<i class="ph-fill ph-wifi-high" style="color:var(--success)"></i> Devices Syncing...';
      } else {
        p2pStatus.innerHTML = '<i class="ph-fill ph-wifi-slash" style="color:var(--text-secondary)"></i> Disconnected';
      }
    });

    window.addEventListener('p2p-sync-complete', (e) => {
      p2pStatus.innerHTML = `<i class="ph-fill ph-check-circle" style="color:var(--success)"></i> ${e.detail.store} synced!`;
      setTimeout(() => p2pStatus.innerHTML = '<i class="ph-fill ph-wifi-high" style="color:var(--success)"></i> Connection Active', 2000);
    });

    container.querySelector('#btn-p2p-host')?.addEventListener('click', async () => {
      try {
        p2pStatus.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Generating Local P2P Node...';
        const offerToken = await P2PSyncManager.hostSession();
        hostTokenInput.value = offerToken;
        hostTokenInput.select();
        document.execCommand('copy');
        p2pStatus.innerHTML = 'Token copied! Give it to the joining device.';
      } catch (err) {
        console.error(err);
        p2pStatus.innerHTML = '<i class="ph-fill ph-warning" style="color:var(--danger)"></i> Failed to start node.';
      }
    });

    container.querySelector('#btn-p2p-join')?.addEventListener('click', async () => {
      const token = joinTokenInput.value.trim();
      if (!token) {
        alert('Please paste the Host Token from the other device.');
        return;
      }

      try {
        p2pStatus.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Joining Host...';
        // If we are a client joining an offer
        if (!P2PSyncManager.peerConnection) {
          const answerToken = await P2PSyncManager.joinSession(token);
          joinTokenInput.value = answerToken;
          joinTokenInput.select();
          document.execCommand('copy');
          p2pStatus.innerHTML = 'Connected! Answer token copied back to clipboard. Paste this back into the Host device to finalize.';
          alert('Please paste this ANSWER token back into the Host device.');
        }
        // If we are the Host accepting the answer back
        else {
          await P2PSyncManager.completeHandshake(token);
        }
      } catch (err) {
        console.error(err);
        p2pStatus.innerHTML = '<i class="ph-fill ph-warning" style="color:var(--danger)"></i> Connection failed.';
      }
    });

    // Hardware Integration (WebSerial / WebBluetooth)
    const hardwareStatus = container.querySelector('#hardware-status');

    container.querySelector('#btn-connect-scale')?.addEventListener('click', async () => {
      hardwareStatus.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Connecting to scale...';
      const success = await HardwareService.connectScale();
      if (success) {
        hardwareStatus.innerHTML = HardwareService.simulatorMode
          ? '<i class="ph-fill ph-warning" style="color:#f59e0b"></i> Scale Simulator Active (No physical device)'
          : '<i class="ph-fill ph-check-circle" style="color:var(--success)"></i> Physical Scale Connected via USB';
      } else {
        hardwareStatus.innerHTML = '<i class="ph-fill ph-x-circle" style="color:var(--danger)"></i> Scale connection failed.';
      }
    });

    container.querySelector('#btn-connect-printer')?.addEventListener('click', async () => {
      hardwareStatus.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Pairing with printer...';
      const success = await HardwareService.connectPrinter();
      if (success) {
        hardwareStatus.innerHTML = HardwareService.simulatorMode
          ? '<i class="ph-fill ph-warning" style="color:#f59e0b"></i> Printer Simulator Active (No physical device)'
          : `<i class="ph-fill ph-check-circle" style="color:var(--success)"></i> Connected to ${HardwareService.printerDevice?.name || 'Bluetooth Printer'}`;
      } else {
        hardwareStatus.innerHTML = '<i class="ph-fill ph-x-circle" style="color:var(--danger)"></i> Printer connection failed.';
      }
    });

    // Backup
    container.querySelector('#btn-backup').addEventListener('click', async () => {
      await this.backupData();
    });

    // Restore
    const restoreInput = container.querySelector('#file-restore');
    container.querySelector('#btn-restore').addEventListener('click', () => {
      if (confirm('Restore backup? This will overwrite all current data and cannot be undone.')) {
        restoreInput.click();
      }
    });

    restoreInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (file) {
        await this.restoreData(file);
      }
    });

    // Import Wizard
    const wizardBtn = container.querySelector('#btn-import-wizard');
    const wizardModal = container.querySelector('#import-wizard-modal');
    const closeWizard = container.querySelector('#close-import-wizard');

    // Open Modal
    wizardBtn?.addEventListener('click', () => {
      wizardModal.style.display = 'flex';
    });

    // Close Modal
    closeWizard?.addEventListener('click', () => {
      wizardModal.style.display = 'none';
    });

    // Developer tools — seed data and onboarding test
    container.querySelector('#btn-seed-data')?.addEventListener('click', async () => {
      const btn = container.querySelector('#btn-seed-data');
      const orig = btn.textContent;
      btn.textContent = 'Loading...';
      btn.disabled = true;
      try {
        const { default: SeedData } = await import('../utils/seedData.js');
        await SeedData.init();
        btn.textContent = 'Done';
        setTimeout(() => { btn.textContent = orig; btn.disabled = false; }, 2000);
      } catch (err) {
        btn.textContent = orig;
        btn.disabled = false;
        alert('Seed failed: ' + err.message);
      }
    });
    container.querySelector('#btn-test-onboarding')?.addEventListener('click', async () => {
      const { default: WelcomeWizardUI } = await import('./welcomeWizardUI.js');
      WelcomeWizardUI.show(() => {});
    });

    // Template Download
    container.querySelector('#btn-download-template')?.addEventListener('click', () => {
      const currentUser = getSession();
      const type = currentUser?.businessType || 'shop'; // Default to shop if undefined
      const url = DataImportService.generateTemplateFile(type);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}_template.json`;
      a.click();
      URL.revokeObjectURL(url);
    });

    // Contact Support Modal
    const supportBtn = container.querySelector('#btn-contact-support');
    const supportModal = container.querySelector('#support-modal');
    const closeSupport = container.querySelector('#close-support');

    supportBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      wizardModal.style.display = 'none'; // Close wizard
      supportModal.style.display = 'flex';
    });

    closeSupport?.addEventListener('click', () => {
      supportModal.style.display = 'none';
    });

    container.querySelector('#support-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      alert('Support ping sent! We will contact you at your registered email.');
      supportModal.style.display = 'none';
    });

    // Team Management Modal
    const addTeamModal = container.querySelector('#add-team-modal');
    container.querySelector('#btn-add-team-member')?.addEventListener('click', () => {
      addTeamModal.showModal();
    });
    container.querySelector('#close-add-team')?.addEventListener('click', () => {
      addTeamModal.close();
    });

    // Create Staff Account
    container.querySelector('#add-team-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const currentUser = getSession() ?? {};
      const formData = new FormData(e.target);
      const username = formData.get('username');
      const password = formData.get('password');
      const role     = formData.get('role');
      const pinRaw   = (formData.get('posPin') || '').trim();
      const ownerName = formData.get('ownerName') || '';

      try {
        // Hash password with PBKDF2
        const km = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
        const salt = crypto.getRandomValues(new Uint8Array(16));
        const bits = await crypto.subtle.deriveBits({ name:'PBKDF2', hash:'SHA-256', salt, iterations:100000 }, km, 256);
        const hashedPassword = `pbkdf2v1:${btoa(String.fromCharCode(...salt))}:${btoa(String.fromCharCode(...new Uint8Array(bits)))}`;

        // Hash PIN if provided (simple SHA-256 is fine for a 4-digit PIN)
        let hashedPin = null;
        if (pinRaw && /^\d{4}$/.test(pinRaw)) {
          const pinBuf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pinRaw));
          hashedPin = Array.from(new Uint8Array(pinBuf)).map(b => b.toString(16).padStart(2,'0')).join('');
        }

        const newUser = {
          username,
          password: hashedPassword,
          posPin: hashedPin,
          role,
          ownerName,
          email: '',
          businessName: currentUser.businessName || 'Platform Business',
          businessType: currentUser.businessType || 'shopowner',
          createdAt: Date.now()
        };

        const existing = await db.get('users', username);
        if (existing) {
          alert('Username already exists!');
          return;
        }

        await db.add('users', newUser);
        alert('Team member created! They can now log in.');
        addTeamModal.close();
        e.target.reset();
        this.loadTeamList(container);
      } catch (err) {
        console.error('Failed to create user:', err);
        alert('Failed to create account.');
      }
    });


    // Verify & Import
    const importInput = container.querySelector('#file-import-wizard');
    container.querySelector('#btn-select-import')?.addEventListener('click', () => {
      importInput.click();
    });

    importInput?.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      if (confirm(`Import data from ${file.name}?`)) {
        try {
          const btn = container.querySelector('#btn-select-import');
          const originalText = btn.innerHTML;
          btn.innerHTML = `<i class="ph-bold ph-spinner ph-spin"></i> Importing...`;
          btn.disabled = true;

          const result = await DataImportService.importData(file);

          // Show success state in modal
          const modalBody = container.querySelector('.modal-body');
          modalBody.innerHTML = `
                    <div class="text-center py-8">
                        <i class="ph-duotone ph-check-circle text-success" style="font-size: 4rem; color: var(--success);"></i>
                        <h3 class="mt-4 mb-2">Import Successful!</h3>
                        <p class="text-muted mb-6">Successfully imported ${result.count} data items.</p>
                        <button class="btn btn-primary w-100" onclick="location.reload()">
                            <i class="ph-bold ph-arrows-clockwise"></i> Reload Workspace
                        </button>
                    </div>
                `;
        } catch (err) {
          alert(`Import failed: ${err.message}`);
          container.querySelector('#btn-select-import').innerHTML = originalText;
          container.querySelector('#btn-select-import').disabled = false;
        }
      }
    });
  }

  async backupData() {
    try {
      const data = {};
      // Export all known stores
      const stores = ['transactions', 'accounts', 'users', 'inventory', 'suppliers', 'settings'];
      for (const store of stores) {
        data[store] = await db.getAll(store);
      }

      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `erp_backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('Backup failed: ' + err.message);
    }
  }

  async restoreData(file) {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target.result);

        // Import each store
        for (const [storeName, items] of Object.entries(data)) {
          // Clear store first? Or merge?
          // For restore, typically clear.
          // But IDB doesn't have easy clear in our wrapper.
          // We'll iterate and put (upsert). 
          // Ideally we should adhere to "Overwrite" warning.

          // For now, let's just upsert all items.
          for (const item of items) {
            // Adjust based on store key
            // Using our db.update wrapper which handles upsert mostly
            if (storeName === 'transactions' || storeName === 'accounts' || storeName === 'inventory') {
              await db.update(storeName, item);
            }
          }
        }
        alert('Data restored successfully. Reloading...');
        location.reload();
      } catch (err) {
        console.error(err);
        alert('Restore failed: ' + err.message);
      }
    };
    reader.readAsText(file);
  }

  renderStyles() {
    return `
      <style>
        .settings-layout {
          display: flex;
          height: calc(100vh - 60px);
          width: 100%;
          max-width: 1100px;
          margin: 0 auto;
          background: var(--bg-secondary);
          color: var(--text-primary);
          overflow-x: hidden;
          overflow-y: hidden;
          position: relative;
        }

        /* --- NAV COLUMN --- */
        .settings-nav {
          width: 200px;
          flex-shrink: 0;
          border-right: 1px solid var(--border);
          overflow-y: auto;
          background: var(--bg-secondary);
          height: 100%;
          padding: 0.5rem 0;
        }

        .nav-header {
          padding: 0.75rem 1rem 0.5rem;
          position: sticky;
          top: 0;
          background: var(--bg-secondary);
          z-index: 10;
        }

        .nav-header h2 {
          margin: 0;
          font-size: 0.6875rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.07em;
          color: var(--text-muted);
        }

        .nav-menu {
          display: flex;
          flex-direction: column;
          padding: 0.25rem 0.5rem 1rem;
          gap: 1px;
        }

        .nav-item {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          width: 100%;
          padding: 0.5rem 0.75rem;
          background: transparent;
          border: none;
          border-radius: 6px;
          color: var(--text-secondary);
          font-size: 0.875rem;
          text-align: left;
          cursor: pointer;
          transition: background 0.12s, color 0.12s;
          font-family: inherit;
        }
        .nav-item i { font-size: 0.9375rem; flex-shrink: 0; }

        .nav-item:hover {
          background: var(--bg-hover);
          color: var(--text-primary);
        }

        .nav-item.active {
          background: rgba(37,99,235,0.1);
          color: #93c5fd;
        }
        .nav-item.active i { color: #93c5fd; }

        /* --- CONTENT PANE --- */
        .settings-pane {
          flex: 1;
          overflow-y: auto;
          background: var(--bg-secondary);
          position: relative;
          height: 100%;
        }

        .pane-content {
          display: none;
          padding: 1.75rem 2rem;
          max-width: 600px;
          animation: fadeIn 0.2s ease;
        }
        .pane-content.active { display: block; }

        .pane-header {
          margin-bottom: 1.5rem;
          padding-bottom: 1.25rem;
          border-bottom: 1px solid var(--border);
        }
        .pane-header h3 {
          margin: 0 0 0.25rem;
          font-size: 1.125rem;
          font-weight: 700;
          letter-spacing: -0.01em;
        }
        .pane-header p {
          margin: 0;
          color: var(--text-muted);
          font-size: 0.8125rem;
          line-height: 1.5;
        }

        /* --- FORM ELEMENTS --- */
        .form-group {
          margin-bottom: 1.25rem;
        }
        .form-group label {
          display: block;
          font-size: 0.75rem;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: var(--text-muted);
          margin-bottom: 0.375rem;
        }
        .form-group input, .form-group select {
          width: 100%;
          padding: 0.5rem 0.75rem;
          background: rgba(255,255,255,0.04);
          border: 1px solid var(--border);
          border-radius: 8px;
          color: var(--text-primary);
          font-family: inherit;
          font-size: 0.875rem;
          transition: border-color 0.15s;
        }
        .form-group input:focus, .form-group select:focus {
          outline: none;
          border-color: var(--accent);
          box-shadow: 0 0 0 3px rgba(37,99,235,0.15);
        }
        
        /* Flex Input Row (for buttons next to inputs) */
        .flex-input-group {
          display: flex;
          gap: 0.5rem;
        }
        .flex-input-group input {
          flex: 1;
        }
        .flex-input-group .btn {
          width: auto;
          white-space: nowrap;
        }

        .settings-section-divider {
          height: 1px;
          background: var(--border);
          margin: 1.5rem 0;
        }

        .pane-actions {
          margin-top: 1.5rem;
          display: flex;
          justify-content: flex-end;
        }
        .pane-actions .btn {
          padding: 0.5rem 1.25rem;
          font-weight: 600;
        }

        .status-box {
          margin-top: 0.75rem;
          font-size: 0.8125rem;
          padding: 0.625rem 0.875rem;
          border-radius: 8px;
          background: rgba(255,255,255,0.02);
          border: 1px solid var(--border);
          text-align: center;
          color: var(--text-secondary);
        }

        /* Custom Slim List (for Team members) */
        .slim-list {
          border: 1px solid var(--border);
          border-radius: 8px;
          overflow: hidden;
        }
        .slim-list > div {
          padding: 1rem;
          border-bottom: 1px solid var(--border);
        }
        .slim-list > div:last-child {
          border-bottom: none;
        }

        /* --- MODALS --- */
        .x-modal {
          border: none;
          border-radius: 16px;
          padding: 0;
          background: var(--bg-secondary);
          color: var(--text-primary);
          box-shadow: 0 20px 50px rgba(0,0,0,0.7);
          width: 400px;
          max-width: 95vw;
          border: 1px solid rgba(255,255,255,0.1);
        }
        .x-modal::backdrop { background: rgba(0,0,0,0.7); }
        .x-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.5rem 1.5rem 1rem;
        }
        .x-modal-header h3 { margin: 0; font-weight: 800; font-size: 1.25rem; }
        .x-modal-body { padding: 0 1.5rem 1.5rem; }

        /* Utility classes used in pane content */
        .w-100   { width: 100%; }
        .mt-2    { margin-top: 0.5rem; }
        .mt-4    { margin-top: 1rem; }
        .mb-2    { margin-bottom: 0.5rem; }
        .mb-3    { margin-bottom: 0.75rem; }
        .mb-4    { margin-bottom: 1rem; }
        .text-xs   { font-size: 0.75rem; color: var(--text-muted); }
        .text-sm   { font-size: 0.8125rem; }
        .text-muted { color: var(--text-muted); }
        .text-accent { color: var(--accent); }
        .underline { text-decoration: underline; }
        .block     { display: block; }
        .font-bold { font-weight: 700; }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        @media (max-width: 768px) {
          .settings-layout {
            position: relative;
            overflow: hidden;
            height: calc(100vh - 120px);
          }

          .settings-nav {
            width: 100%;
            border-right: none;
            height: 100%;
            overflow-y: auto;
            transition: transform 0.3s ease;
            background: var(--bg-secondary);
            padding: 0.5rem 0;
          }

          /* Show chevron on mobile to indicate drill-down */
          .nav-item::after {
            content: '›';
            margin-left: auto;
            font-size: 1.125rem;
            color: var(--text-muted);
          }

          .settings-pane {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: var(--bg-secondary);
            transform: translateX(100%);
            transition: transform 0.3s ease;
            z-index: 20;
            display: flex;
            flex-direction: column;
            overflow: hidden;
          }

          /* pane-content scrolls inside */
          .pane-content {
            flex: 1;
            overflow-y: auto;
            padding: 1.5rem 1.25rem;
            padding-bottom: 2rem; /* Extra bottom breathing room */
          }

          /* Slide pane in when active */
          .settings-layout.pane-active .settings-nav {
            transform: translateX(-100%);
            pointer-events: none;
          }
          .settings-layout.pane-active .settings-pane {
            transform: translateX(0);
          }

          .pane-mobile-header {
            display: flex !important;
            align-items: center;
            gap: 1rem;
            padding: 1rem 1.25rem;
            border-bottom: 1px solid rgba(255,255,255,0.08);
            flex-shrink: 0;
            background: var(--bg-secondary);
            z-index: 30;
          }
          .pane-mobile-header h3 { margin: 0; font-size: 1.1rem; font-weight: 700; }
          .pane-mobile-header #btn-back-nav {
            background: rgba(255,255,255,0.06);
            border: 1px solid rgba(255,255,255,0.1);
            color: var(--text-primary);
            border-radius: 8px;
            padding: 0.4rem 0.6rem;
            cursor: pointer;
            font-size: 1rem;
            flex-shrink: 0;
          }
          .pane-header { display: none; }
        }
      </style>
    `;
  }
  renderImportModal() {
    const currentUser = getSession();
    const businessType = currentUser?.businessType || 'shop';
    const displayType = businessType.charAt(0).toUpperCase() + businessType.slice(1);

    return `
      <div id="import-wizard-modal" class="modal" style="display: none; position: fixed; inset: 0; z-index: 2000; align-items: center; justify-content: center;">
        <div class="modal-content" style="width: 90%; max-width: 500px;">
          <div class="modal-header">
            <h2 style="margin:0 0 1.25rem;font-size:1rem;font-weight:700;">Import Data</h2>
            <button class="btn-icon" id="close-import-wizard"><i class="ph-bold ph-x"></i></button>
          </div>
          <div class="modal-body">
            <div class="step mb-4">
              <label class="block mb-2 font-bold">1. Business Type Detected</label>
              <div style="padding:0.75rem;background:rgba(37,99,235,0.08);color:#93c5fd;border-radius:6px;border:1px solid rgba(37,99,235,0.2);">
                <i class="ph-fill ph-check-circle"></i> Using template for: <strong>${displayType}</strong>
              </div>
              <p class="text-xs text-muted mt-2">
                Need a different business type? <a href="#" id="btn-contact-support" class="text-primary hover:underline">Contact Support</a> to switch vertical.
              </p>
            </div>
            
            <div class="step mb-4">
              <label class="block mb-2 font-bold">2. Get Template</label>
              <p class="text-sm text-muted mb-2">Download a JSON template structure to fill in.</p>
              <button class="btn btn-secondary w-100" id="btn-download-template"><i class="ph-bold ph-download"></i> Download Template</button>
            </div>

            <div class="step">
              <label class="block mb-2 font-bold">3. Upload Data</label>
              <p class="text-sm text-muted mb-2">Upload your filled JSON file.</p>
              <button class="btn btn-primary w-100" id="btn-select-import"><i class="ph-bold ph-upload"></i> Select File to Import</button>
              <input type="file" id="file-import-wizard" style="display: none" accept=".json">
            </div>
          </div>
        </div>
      </div>
      ${this.renderSupportModal()}
    `;
  }

  renderSupportModal() {
    return `
      <div id="support-modal" class="modal" style="display: none; position: fixed; inset: 0; z-index: 2100; align-items: center; justify-content: center;">
        <div class="modal-content" style="width: 90%; max-width: 450px;">
          <div class="modal-header">
            <h2 style="margin:0 0 1rem;font-size:1rem;font-weight:700;">Contact Support</h2>
            <button class="btn-icon" id="close-support"><i class="ph-bold ph-x"></i></button>
          </div>
          <div class="modal-body">
            <p class="text-sm text-muted mb-4">To switch your business vertical (e.g. from Shop to Warehouse), please let us know below. This requires a manual account migration.</p>
            <form id="support-form">
                <div class="form-group">
                    <label>Current Type</label>
                    <input type="text" value="${getSession()?.businessType || 'Unknown'}" disabled style="background:var(--bg-elevated);color:var(--text-secondary);border:1px solid var(--border);border-radius:6px;padding:0.5rem;">
                </div>
                <div class="form-group">
                    <label>Requested Type</label>
                    <select class="w-full p-2 border rounded">
                        <option>Spaza Shop / Retail</option>
                        <option>Warehouse / Distribution</option>
                        <option>Manufacturing / Factory</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Message</label>
                    <textarea rows="3" class="w-full p-2 border rounded" placeholder="Please migrate my account..."></textarea>
                </div>
                <button type="submit" class="btn btn-primary w-100">Send Request</button>
            </form>
          </div>
        </div>
      </div>
    `;
  }
}

export default new SettingsUI();

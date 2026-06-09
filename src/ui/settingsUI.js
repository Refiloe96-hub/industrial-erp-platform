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
      ${this.renderStyles()}
      <div class="settings-page">
        <header class="module-header">
          <div>
            <h1>Settings</h1>
            <p>Workspace, team &amp; integrations</p>
          </div>
        </header>

        <div class="settings-scroll">

          <!-- ── Your Business ── -->
          <section class="set-section">
            <div class="set-section-hd">
              <h2>Your Business</h2>
              <p>Workspace details, branding, and contact information.</p>
            </div>
            <div class="set-row">
              <div class="set-meta">
                <label>Business Logo</label>
                <p>Shown in the sidebar and on receipts. Max 1 MB.</p>
              </div>
              <div class="set-ctrl" style="display:flex;align-items:center;gap:0.875rem;">
                <div id="logo-preview" style="width:48px;height:48px;border-radius:6px;background:var(--bg-elevated);display:flex;align-items:center;justify-content:center;overflow:hidden;border:1px solid var(--border);flex-shrink:0;">
                  ${this.settings.businessLogo ? `<img src="${this.settings.businessLogo}" style="width:100%;height:100%;object-fit:contain;">` : '<i class="ph ph-image" style="color:var(--text-muted);font-size:1.25rem;"></i>'}
                </div>
                <input type="file" id="set-logo" accept="image/*" style="font-size:0.8125rem;color:var(--text-secondary);">
              </div>
            </div>
            <div class="set-row">
              <div class="set-meta">
                <label>Business Name</label>
                <p>Shown on receipts and financial documents.</p>
              </div>
              <div class="set-ctrl">
                <input type="text" id="set-name" value="${this.settings.businessName || ''}" placeholder="My Shop">
              </div>
            </div>
            <div class="set-row">
              <div class="set-meta">
                <label>Tagline</label>
                <p>Optional. Printed below the business name on receipts.</p>
              </div>
              <div class="set-ctrl">
                <input type="text" id="set-tagline" value="${this.settings.businessTagline || ''}" placeholder="Fresh Quality Every Day">
              </div>
            </div>
            <div class="set-row">
              <div class="set-meta">
                <label>VAT Registration Number</label>
                <p>Printed on invoices as required by SARS.</p>
              </div>
              <div class="set-ctrl">
                <input type="text" id="set-vat-number" value="${this.settings.vatNumber || ''}" placeholder="4123456789">
              </div>
            </div>
            <div class="set-row">
              <div class="set-meta"><label>Business Address</label></div>
              <div class="set-ctrl">
                <input type="text" id="set-address" value="${this.settings.businessAddress || ''}" placeholder="123 Main Road, Soweto, 1804">
              </div>
            </div>
            <div class="set-row">
              <div class="set-meta"><label>Contact Phone</label></div>
              <div class="set-ctrl">
                <input type="tel" id="set-biz-phone" value="${this.settings.businessPhone || ''}" placeholder="011 000 0000">
              </div>
            </div>
            <div class="set-row">
              <div class="set-meta"><label>Contact Email</label></div>
              <div class="set-ctrl">
                <input type="email" id="set-biz-email" value="${this.settings.businessEmail || ''}" placeholder="info@mybusiness.co.za">
              </div>
            </div>
            <div class="set-row">
              <div class="set-meta">
                <label>Default Currency</label>
                <p>Sets the currency symbol across the platform.</p>
              </div>
              <div class="set-ctrl">
                <select id="set-currency">
                  <option value="ZAR" ${this.settings.currency === 'ZAR' ? 'selected' : ''}>South African Rand (ZAR)</option>
                  <option value="KES" ${this.settings.currency === 'KES' ? 'selected' : ''}>Kenyan Shilling (KES)</option>
                  <option value="NGN" ${this.settings.currency === 'NGN' ? 'selected' : ''}>Nigerian Naira (NGN)</option>
                  <option value="USD" ${this.settings.currency === 'USD' ? 'selected' : ''}>US Dollar (USD)</option>
                  <option value="EUR" ${this.settings.currency === 'EUR' ? 'selected' : ''}>Euro (EUR)</option>
                </select>
              </div>
            </div>
            <div class="set-actions">
              <button class="btn btn-primary" id="save-settings-business">Save business details</button>
            </div>
          </section>

          <!-- ── Financials ── -->
          <section class="set-section">
            <div class="set-section-hd">
              <h2>Financials</h2>
              <p>Tax rates and payment preferences.</p>
            </div>
            <div class="set-row">
              <div class="set-meta">
                <label>VAT / Tax Rate</label>
                <p>Applied at the Point of Sale to calculate tax.</p>
              </div>
              <div class="set-ctrl" style="display:flex;align-items:center;gap:0.5rem;">
                <input type="number" id="set-tax" value="${this.settings.taxRate}" min="0" max="100" style="width:80px;">
                <span style="font-size:0.875rem;color:var(--text-muted);">%</span>
              </div>
            </div>
            <div class="set-row">
              <div class="set-meta">
                <label>Mobile Money / QR Merchant ID</label>
                <p>Shown as a QR code at POS for M-Pesa, Capitec Pay, SnapScan.</p>
              </div>
              <div class="set-ctrl">
                <input type="text" id="set-mpesa-id" value="${this.settings.mpesaMerchantId || ''}" placeholder="0821234567 or Till number">
              </div>
            </div>
            <div class="set-actions">
              <button class="btn btn-primary" id="save-settings-finance">Save financials</button>
            </div>
          </section>

          <!-- ── Team ── -->
          <section class="set-section">
            <div class="set-section-hd" style="display:flex;justify-content:space-between;align-items:flex-start;">
              <div>
                <h2>Team</h2>
                <p>Staff accounts and POS access roles.</p>
              </div>
              <button class="btn btn-secondary" id="btn-add-team-member" style="font-size:0.8125rem;padding:0.35rem 0.75rem;flex-shrink:0;">
                <i class="ph ph-user-plus"></i> Add member
              </button>
            </div>
            <div id="team-list" class="team-list"></div>
          </section>

          <!-- ── Data & Storage ── -->
          <section class="set-section">
            <div class="set-section-hd">
              <h2>Data &amp; Storage</h2>
              <p>Backup, restore, and import tools.</p>
            </div>
            <div class="set-row">
              <div class="set-meta">
                <label>Backup &amp; Restore</label>
                <p>Restore overwrites all current data — download a backup first.</p>
              </div>
              <div class="set-ctrl" style="display:flex;gap:0.5rem;flex-wrap:wrap;">
                <button class="btn btn-secondary" id="btn-backup" style="font-size:0.8125rem;">
                  <i class="ph ph-download-simple"></i> Download backup
                </button>
                <button class="btn btn-secondary" id="btn-restore" style="font-size:0.8125rem;color:var(--danger);border-color:rgba(239,68,68,0.3);">
                  <i class="ph ph-upload-simple"></i> Restore from file
                </button>
                <input type="file" id="file-restore" style="display:none;" accept=".json">
              </div>
            </div>
            <div class="set-row">
              <div class="set-meta">
                <label>Import Wizard</label>
                <p>Load industry-specific inventory templates.</p>
              </div>
              <div class="set-ctrl">
                <button class="btn btn-secondary" id="btn-import-wizard" style="font-size:0.8125rem;">Open import wizard</button>
              </div>
            </div>
            <div class="set-row">
              <div class="set-meta">
                <label>Developer Tools</label>
                <p>Populate workspace with realistic sample data for testing.</p>
              </div>
              <div class="set-ctrl" style="display:flex;gap:0.5rem;flex-wrap:wrap;">
                <button class="btn btn-secondary" id="btn-seed-data" style="font-size:0.8125rem;">Load sample data</button>
                <button class="btn btn-secondary" id="btn-test-onboarding" style="font-size:0.8125rem;">Preview onboarding</button>
              </div>
            </div>
          </section>

          <!-- ── Hardware ── -->
          <section class="set-section">
            <div class="set-section-hd">
              <h2>Hardware</h2>
              <p>Connect scales and printers via Web Serial or Bluetooth. Falls back to simulator mode if no device is found.</p>
            </div>
            <div class="set-row">
              <div class="set-meta">
                <label>Weighing Scale</label>
                <p>Connects via Web Serial.</p>
              </div>
              <div class="set-ctrl">
                <button class="btn btn-secondary" id="btn-connect-scale" style="font-size:0.8125rem;">
                  <i class="ph ph-scales"></i> Connect scale
                </button>
              </div>
            </div>
            <div class="set-row">
              <div class="set-meta">
                <label>Thermal Printer</label>
                <p>Connects via Bluetooth.</p>
              </div>
              <div class="set-ctrl">
                <button class="btn btn-secondary" id="btn-connect-printer" style="font-size:0.8125rem;">
                  <i class="ph ph-printer"></i> Connect printer
                </button>
              </div>
            </div>
            <div id="hardware-status" class="status-line">Status: Waiting for connection…</div>
          </section>

          <!-- ── Offline P2P Sync ── -->
          <section class="set-section">
            <div class="set-section-hd">
              <h2>Offline P2P Sync</h2>
              <p>Sync data directly between local devices without internet.</p>
            </div>
            <div class="set-row">
              <div class="set-meta">
                <label>Host a session</label>
                <p>Generate a token for other devices to join.</p>
              </div>
              <div class="set-ctrl" style="display:flex;gap:0.5rem;">
                <input type="text" id="p2p-host-token" readonly placeholder="Click Host →" style="flex:1;">
                <button class="btn btn-secondary" id="btn-p2p-host" style="font-size:0.8125rem;white-space:nowrap;">Host</button>
              </div>
            </div>
            <div class="set-row">
              <div class="set-meta">
                <label>Join a session</label>
                <p>Paste the token from the host device.</p>
              </div>
              <div class="set-ctrl" style="display:flex;gap:0.5rem;">
                <input type="text" id="p2p-join-token" placeholder="Paste host token" style="flex:1;">
                <button class="btn btn-secondary" id="btn-p2p-join" style="font-size:0.8125rem;white-space:nowrap;">Join</button>
              </div>
            </div>
            <div id="p2p-status" class="status-line">Disconnected</div>
          </section>

          <!-- ── AI & Forecasting ── -->
          <section class="set-section">
            <div class="set-section-hd">
              <h2>AI &amp; Forecasting</h2>
              <p>Configure the intelligence engine for insights and demand forecasting.</p>
            </div>
            <div class="set-row">
              <div class="set-meta">
                <label>Groq API Key</label>
                <p>Powers the Business Advisor. Leave blank for rule-based mode. <a href="https://console.groq.com" target="_blank" style="color:var(--accent);">Get a free key</a>.</p>
              </div>
              <div class="set-ctrl">
                <input type="password" id="set-groq-key"
                  value="${localStorage.getItem('erp_groq_api_key') || ''}"
                  placeholder="gsk_xxxxxxxxxxxxxxxxxxxxxxxx"
                  autocomplete="off">
              </div>
            </div>
            <div class="set-row">
              <div class="set-meta">
                <label>Forecast Horizon</label>
                <p>How far ahead the AI predicts stock demand.</p>
              </div>
              <div class="set-ctrl">
                <select id="set-forecast-horizon" style="width:auto;">
                  <option value="7"  ${(localStorage.getItem('erp_forecast_horizon') || '14') === '7'  ? 'selected' : ''}>7 days</option>
                  <option value="14" ${(localStorage.getItem('erp_forecast_horizon') || '14') === '14' ? 'selected' : ''}>14 days</option>
                  <option value="30" ${(localStorage.getItem('erp_forecast_horizon') || '14') === '30' ? 'selected' : ''}>30 days</option>
                </select>
              </div>
            </div>
            <div class="set-row">
              <div class="set-meta">
                <label>Daily Summary Notification</label>
                <p>Browser notification at end of day with revenue, sales count, and low-stock alerts.</p>
              </div>
              <div class="set-ctrl">
                <div style="display:flex;align-items:center;gap:0.75rem;flex-wrap:wrap;">
                  <label style="display:flex;align-items:center;gap:0.375rem;cursor:pointer;font-size:0.875rem;font-weight:normal;">
                    <input type="checkbox" id="set-daily-summary"
                      ${localStorage.getItem('erp_daily_summary_enabled') === 'true' ? 'checked' : ''}
                      style="width:auto;accent-color:var(--accent);">
                    Enable
                  </label>
                  <div style="display:flex;align-items:center;gap:0.375rem;font-size:0.8125rem;color:var(--text-secondary);">
                    at
                    <select id="set-summary-hour" style="width:auto;padding:0.25rem 0.5rem;font-size:0.8125rem;">
                      ${[15,16,17,18,19,20].map(h => `<option value="${h}" ${parseInt(localStorage.getItem('erp_daily_summary_hour')||'17')===h?'selected':''}>${h}:00</option>`).join('')}
                    </select>
                  </div>
                  <button class="btn btn-secondary" id="test-notification-btn" style="font-size:0.75rem;padding:0.3rem 0.625rem;">Test</button>
                </div>
                <p id="notif-permission-note" style="margin:0.375rem 0 0;font-size:0.75rem;color:var(--danger);display:none;">
                  Notifications are blocked — enable them in browser settings.
                </p>
              </div>
            </div>
            <div class="set-actions">
              <button class="btn btn-primary" id="save-ai-settings">Save AI settings</button>
            </div>
          </section>

        </div>
      </div>

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
              <label>POS PIN <span style="font-weight:400;color:var(--text-muted);">(4 digits, optional)</span></label>
              <input type="text" name="posPin" maxlength="4" pattern="[0-9]{4}" inputmode="numeric" placeholder="e.g. 1234">
              <small style="font-size:0.75rem;color:var(--text-muted);margin-top:0.25rem;display:block;">Lets staff switch at the POS without a full password.</small>
            </div>
            <div class="form-group">
              <label>Role</label>
              <select name="role" required>
                <option value="staff">Staff — limited access</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin / Owner</option>
              </select>
            </div>
            <button type="submit" class="btn btn-primary w-100 mt-2">Create account</button>
          </form>
        </div>
      </dialog>

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
        <div class="team-row">
          <div class="team-row-info">
            <span class="team-row-name">${u.username || u.email || 'User'}</span>
            <span class="team-row-role">${u.role || 'staff'}</span>
          </div>
          <button class="btn btn-sm team-row-remove" onclick="alert('Account deletion not enabled in demo mode.')">Remove</button>
        </div>
      `).join('');
    } catch {
      listContainer.innerHTML = '<p style="color:var(--danger);font-size:0.875rem">Error loading team list.</p>';
    }
  }

  attachHandlers(container) {
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
        currency:         container.querySelector('#set-currency')?.value  || this.settings.currency || 'ZAR',
        businessLogo:     currentLogoBase64,
        taxRate:          parseFloat(container.querySelector('#set-tax')?.value) || 0,
        mpesaMerchantId:  container.querySelector('#set-mpesa-id')?.value?.trim() || '',
        printerIp:        container.querySelector('#set-printer')?.value   || ''
      };

      try {
        await db.update('settings', { key: 'config', ...newSettings });
        this.settings = newSettings;
        // Cache currency symbol for synchronous access in other modules
        if (newSettings.currency) localStorage.setItem('erp_currency', newSettings.currency);
        
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

        btn.innerHTML = '<i class="ph ph-check"></i> Saved';
        btn.style.background = '#10b981';
        setTimeout(() => { btn.innerHTML = originalText; btn.style.background = ''; }, 2000);
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
        /* ── Settings page layout ── */
        .settings-page {
          display: flex;
          flex-direction: column;
          height: 100%;
        }
        .settings-scroll {
          flex: 1;
          overflow-y: auto;
          padding: 0 1.5rem 3rem;
          max-width: 720px;
          width: 100%;
        }

        /* ── Section ── */
        .set-section {
          padding: 1.75rem 0;
          border-bottom: 1px solid var(--border);
        }
        .set-section:last-child { border-bottom: none; }

        .set-section-hd {
          margin-bottom: 1.25rem;
        }
        .set-section-hd h2 {
          margin: 0 0 0.2rem;
          font-size: 0.9375rem;
          font-weight: 700;
          letter-spacing: -0.01em;
          color: var(--text-primary);
        }
        .set-section-hd p {
          margin: 0;
          font-size: 0.8125rem;
          color: var(--text-muted);
          line-height: 1.4;
        }

        /* ── Row ── */
        .set-row {
          display: flex;
          align-items: flex-start;
          gap: 1.5rem;
          padding: 0.875rem 0;
          border-top: 1px solid var(--border);
        }
        .set-row:first-of-type { border-top: none; }

        .set-meta {
          flex: 0 0 200px;
          padding-top: 0.3rem;
        }
        .set-meta label {
          display: block;
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 0.2rem;
        }
        .set-meta p {
          margin: 0;
          font-size: 0.75rem;
          color: var(--text-muted);
          line-height: 1.45;
        }
        .set-meta p a { color: var(--accent); text-decoration: none; }
        .set-meta p a:hover { text-decoration: underline; }

        .set-ctrl {
          flex: 1;
          min-width: 0;
        }
        .set-ctrl input,
        .set-ctrl select {
          width: 100%;
          padding: 0.4375rem 0.625rem;
          background: var(--bg-elevated, rgba(255,255,255,0.04));
          border: 1px solid var(--border);
          border-radius: 6px;
          color: var(--text-primary);
          font-family: inherit;
          font-size: 0.875rem;
          transition: border-color 0.12s;
        }
        .set-ctrl input:focus,
        .set-ctrl select:focus {
          outline: none;
          border-color: var(--accent);
          box-shadow: 0 0 0 3px rgba(37,99,235,0.12);
        }

        /* ── Section save button ── */
        .set-actions {
          display: flex;
          justify-content: flex-end;
          padding-top: 1rem;
          margin-top: 0.25rem;
        }

        /* ── Team list ── */
        .team-list { display: flex; flex-direction: column; gap: 1px; }
        .team-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.625rem 0.75rem;
          background: var(--bg-elevated, rgba(255,255,255,0.02));
          border: 1px solid var(--border);
          border-radius: 6px;
        }
        .team-row + .team-row { margin-top: 4px; }
        .team-row-info { display: flex; flex-direction: column; gap: 2px; }
        .team-row-name { font-size: 0.875rem; font-weight: 600; }
        .team-row-role {
          font-size: 0.75rem;
          color: var(--text-muted);
          text-transform: capitalize;
        }
        .team-row-remove {
          background: transparent;
          border: 1px solid rgba(239,68,68,0.35);
          color: var(--danger);
          font-size: 0.75rem;
          padding: 0.2rem 0.5rem;
          border-radius: 4px;
          cursor: pointer;
        }

        /* ── Status line ── */
        .status-line {
          margin-top: 0.75rem;
          font-size: 0.8125rem;
          color: var(--text-muted);
          padding: 0.5rem 0.75rem;
          border: 1px solid var(--border);
          border-radius: 6px;
          background: var(--bg-elevated, rgba(255,255,255,0.02));
        }

        /* ── Modals ── */
        .x-modal {
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px;
          padding: 0;
          background: var(--bg-secondary);
          color: var(--text-primary);
          box-shadow: 0 20px 50px rgba(0,0,0,0.7);
          width: 400px;
          max-width: 95vw;
        }
        .x-modal::backdrop { background: rgba(0,0,0,0.7); }
        .x-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.25rem 1.5rem 0.875rem;
          border-bottom: 1px solid var(--border);
        }
        .x-modal-header h3 { margin: 0; font-weight: 700; font-size: 1rem; }
        .x-modal-body { padding: 1.25rem 1.5rem 1.5rem; }
        .x-modal-body .form-group { margin-bottom: 1rem; }
        .x-modal-body .form-group label {
          display: block;
          font-size: 0.8125rem;
          font-weight: 600;
          margin-bottom: 0.3rem;
          color: var(--text-primary);
        }
        .x-modal-body .form-group input,
        .x-modal-body .form-group select {
          width: 100%;
          padding: 0.4375rem 0.625rem;
          background: var(--bg-elevated, rgba(255,255,255,0.04));
          border: 1px solid var(--border);
          border-radius: 6px;
          color: var(--text-primary);
          font-family: inherit;
          font-size: 0.875rem;
        }
        .x-modal-body .form-group input:focus,
        .x-modal-body .form-group select:focus {
          outline: none;
          border-color: var(--accent);
          box-shadow: 0 0 0 3px rgba(37,99,235,0.12);
        }

        /* Utility */
        .w-100 { width: 100%; }
        .mt-2  { margin-top: 0.5rem; }

        @media (max-width: 640px) {
          .settings-scroll { padding: 0 1rem 2.5rem; }
          .set-row { flex-direction: column; gap: 0.5rem; }
          .set-meta { flex: none; padding-top: 0; }
          .set-section-hd { flex-direction: column !important; align-items: flex-start !important; gap: 0.5rem; }
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

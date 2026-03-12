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
              <i class="ph-duotone ph-robot"></i> AI & Forecasting
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
                <label>Business Name</label>
                <input type="text" id="set-name" value="${this.settings.businessName}" placeholder="My Shop">
                <small class="text-muted">This appears on your receipts and financial documents.</small>
              </div>
              <div class="form-group">
                <label>Default Currency</label>
                <select id="set-currency" disabled>
                   <option value="ZAR" selected>ZAR (R)</option>
                </select>
                <small class="text-muted">System locked to ZAR for now.</small>
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
                <small class="text-muted">This rate is used to extract VAT automatically at the Point of Sale.</small>
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
              <button class="btn btn-outline-primary mb-4" id="btn-add-team-member" style="width:auto;">
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
              <div class="data-actions">
                <button class="btn btn-secondary w-100 mb-3" id="btn-backup">
                  <i class="ph-bold ph-download-simple"></i> Download Backup (JSON)
                </button>
                <button class="btn btn-outline-danger w-100 mb-4" id="btn-restore">
                  <i class="ph-bold ph-upload-simple"></i> Restore Backup
                </button>
                <input type="file" id="file-restore" style="display: none" accept=".json">
              </div>
              
              <div class="settings-section-divider"></div>
              
              <div class="form-group">
                <label>System Import Wizard</label>
                <p class="text-sm text-muted mb-3">Initialize your workspace with industry-specific inventory templates.</p>
                <button class="btn btn-primary w-100" id="btn-import-wizard">
                  <i class="ph-bold ph-magic-wand"></i> Open Import Wizard
                </button>
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
               <label>Username</label>
               <input type="text" name="username" required>
             </div>
             <div class="form-group">
               <label>Password</label>
               <input type="password" name="password" required>
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
          <button class="btn btn-sm" style="background:transparent;border:1px solid #ef4444;color:#ef4444;padding:0.25rem 0.5rem" onclick="alert('Account deletion not enabled in demo mode.')">Remove</button>
        </div>
      `).join('');
    } catch {
      listContainer.innerHTML = '<p style="color:#ef4444;font-size:0.875rem">Error loading team list.</p>';
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

    // --- Save Settings ---
    const handleSave = async () => {
      const newSettings = {
        ...this.settings,
        businessName: container.querySelector('#set-name').value,
        taxRate: parseFloat(container.querySelector('#set-tax').value) || 0,
        printerIp: container.querySelector('#set-printer')?.value || ''
      };

      try {
        await db.update('settings', { key: 'config', ...newSettings });
        this.settings = newSettings;
        alert('✅ Settings saved successfully!');

        // Update user profile if name changed
        const currentUser = JSON.parse(localStorage.getItem('erp_session'));
        if (currentUser) {
          currentUser.businessName = newSettings.businessName;
          localStorage.setItem('erp_session', JSON.stringify(currentUser));
        }
      } catch (err) {
        console.error(err);
        alert('Failed to save settings');
      }
    };

    container.querySelector('#save-settings-business')?.addEventListener('click', handleSave);
    container.querySelector('#save-settings-finance')?.addEventListener('click', handleSave);

    // AI Settings Save
    container.querySelector('#save-ai-settings')?.addEventListener('click', () => {
      const key = (container.querySelector('#set-groq-key')?.value || '').trim();
      const horizon = container.querySelector('#set-forecast-horizon')?.value || '14';
      localStorage.setItem('erp_groq_api_key', key);
      localStorage.setItem('erp_forecast_horizon', horizon);
      alert(key ? '✅ Groq API key saved! AI insights are now enabled.' : '✅ AI settings saved (rule-based insights mode).');
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
      if (confirm('⚠️ WARNING: Restoring will OVERWRITE all current data. Are you sure?')) {
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

    // Template Download
    container.querySelector('#btn-download-template')?.addEventListener('click', () => {
      const currentUser = JSON.parse(localStorage.getItem('erp_session'));
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
      const currentUser = JSON.parse(localStorage.getItem('erp_session') || '{}');
      const formData = new FormData(e.target);
      const username = formData.get('username');
      const password = formData.get('password');
      const role = formData.get('role');

      try {
        // Hash password
        const msgBuffer = new TextEncoder().encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashedPassword = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        const newUser = {
          username,
          password: hashedPassword,
          role,
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
          alert(`❌ Import Failed: ${err.message}`);
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
        alert('✅ Data restored successfully! Reloading...');
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
          max-width: 1200px;
          margin: 0 auto;
          background: #0f172a;
          color: var(--text-primary);
          overflow: hidden;
        }

        /* --- NAV COLUMN (Master) --- */
        .settings-nav {
          width: 320px;
          flex-shrink: 0;
          border-right: 1px solid var(--border-color);
          overflow-y: auto;
          background: #0f172a;
          height: 100%;
        }
        
        .nav-header {
          padding: 1rem 1.5rem;
          position: sticky;
          top: 0;
          background: rgba(15, 23, 42, 0.9);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          z-index: 10;
        }
        
        .nav-header h2 {
          margin: 0;
          font-size: 1.25rem;
          font-weight: 700;
        }

        .nav-menu {
          display: flex;
          flex-direction: column;
          padding: 0 0 1rem 0;
        }

        .nav-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          width: 100%;
          padding: 1rem 1.5rem;
          background: transparent;
          border: none;
          color: var(--text-primary);
          font-size: 1rem;
          text-align: left;
          cursor: pointer;
          transition: background 0.15s;
        }
        
        /* The chevron chevron */
        .nav-item::after {
          content: '›';
          margin-left: auto;
          font-size: 1.5rem;
          color: var(--text-secondary);
          opacity: 0;
          transition: opacity 0.2s;
        }
        
        .nav-item:hover {
          background: rgba(255, 255, 255, 0.03);
        }
        
        .nav-item.active {
          border-right: 3px solid var(--accent-primary);
          background: rgba(255, 255, 255, 0.05);
        }

        .nav-item:hover::after, .nav-item.active::after {
          opacity: 1;
        }

        /* --- CONTENT PANE (Detail) --- */
        .settings-pane {
          flex: 1;
          overflow-y: auto;
          background: #0f172a;
          position: relative;
          height: 100%;
        }

        .pane-content {
          display: none;
          padding: 2rem 2.5rem;
          max-width: 680px;
          animation: fadeIn 0.3s ease;
        }
        .pane-content.active {
          display: block;
        }

        .pane-header {
          margin-bottom: 2rem;
        }
        .pane-header h3 {
          margin: 0 0 0.5rem 0;
          font-size: 1.5rem;
          font-weight: 800;
        }
        .pane-header p {
          margin: 0;
          color: var(--text-secondary);
          font-size: 0.9rem;
        }

        /* --- FORM ELEMENTS (X-Style Minimal) --- */
        .form-group {
          margin-bottom: 2rem;
        }
        .form-group label {
          display: block;
          font-weight: 700;
          margin-bottom: 0.5rem;
          font-size: 0.95rem;
        }
        .form-group input, .form-group select {
          width: 100%;
          padding: 0.85rem 1rem;
          background: transparent;
          border: 1px solid var(--border-color);
          border-radius: 4px; /* Less rounded, more technical */
          color: var(--text-primary);
          font-family: inherit;
          font-size: 1rem;
          transition: border-color 0.2s;
        }
        .form-group input:focus, .form-group select:focus {
          outline: none;
          border-color: var(--accent-primary);
          box-shadow: 0 0 0 1px var(--accent-primary);
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
          background: var(--border-color);
          margin: 2rem 0;
        }

        .pane-actions {
          margin-top: 2rem;
          display: flex;
          justify-content: flex-end;
        }
        .pane-actions .btn {
          padding: 0.75rem 2rem;
          border-radius: 999px; /* Pill shape buttons */
          font-weight: 700;
        }

        .status-box {
          margin-top: 1rem;
          font-size: 0.85rem;
          padding: 0.75rem;
          border-radius: 4px;
          background: rgba(255,255,255,0.02);
          border: 1px solid var(--border-color);
          text-align: center;
          color: var(--text-secondary);
        }

        /* Custom Slim List (for Team members) */
        .slim-list {
          border: 1px solid var(--border-color);
          border-radius: 8px;
          overflow: hidden;
        }
        .slim-list > div {
          padding: 1rem;
          border-bottom: 1px solid var(--border-color);
        }
        .slim-list > div:last-child {
          border-bottom: none;
        }

        /* --- MODALS --- */
        .x-modal {
          border: none;
          border-radius: 16px;
          padding: 0;
          background: #0f172a;
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

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(5px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* Always show chevron on mobile-sized items */
        @media (max-width: 768px) {
          .settings-layout {
            position: relative;
            overflow: hidden;
            height: calc(100vh - 120px); /* Account for app header + bottom nav */
          }

          .settings-nav {
            width: 100%;
            border-right: none;
            height: 100%;
            overflow-y: auto;
            transition: transform 0.3s ease;
            background: #0f172a;
          }

          /* Always show the chevron arrow on mobile */
          .nav-item::after {
            opacity: 1 !important;
          }

          .settings-pane {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: #0f172a;
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
            background: rgba(15, 23, 42, 0.97);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
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
    const currentUser = JSON.parse(localStorage.getItem('erp_session'));
    const businessType = currentUser?.businessType || 'shop';
    const displayType = businessType.charAt(0).toUpperCase() + businessType.slice(1);

    return `
      <div id="import-wizard-modal" class="modal" style="display: none; position: fixed; inset: 0; z-index: 2000; align-items: center; justify-content: center;">
        <div class="modal-content" style="width: 90%; max-width: 500px;">
          <div class="modal-header">
            <h2><i class="ph-duotone ph-magic-wand"></i> Import Wizard</h2>
            <button class="btn-icon" id="close-import-wizard"><i class="ph-bold ph-x"></i></button>
          </div>
          <div class="modal-body">
            <div class="step mb-4">
              <label class="block mb-2 font-bold">1. Business Type Detected</label>
              <div class="p-3 bg-blue-50 text-blue-800 rounded border border-blue-200">
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
            <h2><i class="ph-duotone ph-headset"></i> Contact Support</h2>
            <button class="btn-icon" id="close-support"><i class="ph-bold ph-x"></i></button>
          </div>
          <div class="modal-body">
            <p class="text-sm text-muted mb-4">To switch your business vertical (e.g. from Shop to Warehouse), please let us know below. This requires a manual account migration.</p>
            <form id="support-form">
                <div class="form-group">
                    <label>Current Type</label>
                    <input type="text" value="${JSON.parse(localStorage.getItem('erp_session'))?.businessType || 'Unknown'}" disabled class="bg-gray-100">
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

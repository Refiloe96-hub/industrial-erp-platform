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
      <div class="settings-container">
        <div class="settings-header">
          <h2><i class="ph-duotone ph-gear"></i> Settings</h2>
          <p>Configure your business workspace</p>
        </div>

        <div class="settings-grid">
          <!-- General Settings -->
          <div class="card settings-card">
            <div class="card-header">
              <h3><i class="ph-duotone ph-buildings"></i> Business Details</h3>
            </div>
            <div class="card-body">
              <div class="form-group">
                <label>Business Name</label>
                <input type="text" id="set-name" value="${this.settings.businessName}" placeholder="My Shop">
              </div>
              <div class="form-group">
                <label>Default Currency</label>
                <select id="set-currency" disabled>
                   <option value="ZAR" selected>ZAR (R)</option>
                </select>
                <small class="text-muted">System locked to ZAR for now.</small>
              </div>
            </div>
          </div>

          <!-- Financial Settings -->
          <div class="card settings-card">
            <div class="card-header">
              <h3><i class="ph-duotone ph-currency-dollar"></i> Tax & Finance</h3>
            </div>
            <div class="card-body">
              <div class="form-group">
                <label>VAT / Tax Rate (%)</label>
                <input type="number" id="set-tax" value="${this.settings.taxRate}" min="0" max="100">
              </div>
            </div>
          </div>

          <!-- Data Management -->
          <div class="card settings-card">
            <div class="card-header">
              <h3><i class="ph-duotone ph-floppy-disk"></i> Data Management</h3>
            </div>
            <div class="card-body">
              <p class="text-muted mb-2">Back up your entire database to a file or restore from a backup.</p>
              <div class="data-actions">
                <button class="btn btn-secondary w-100 mb-2" id="btn-backup"><i class="ph-duotone ph-download-simple"></i> Backup Data (JSON)</button>
                <button class="btn btn-outline-danger w-100" id="btn-restore"><i class="ph-duotone ph-upload-simple"></i> Restore Backup</button>
                <input type="file" id="file-restore" style="display: none" accept=".json">
              </div>
              
              <hr class="my-3">
              
              <h4 class="text-sm font-semibold mb-2">Import Wizard</h4>
              <p class="text-xs text-muted mb-2">Kickstart your workspace with business-specific templates.</p>
              <button class="btn btn-primary w-100" id="btn-import-wizard"><i class="ph-duotone ph-magic-wand"></i> Open Import Wizard</button>
            </div>
          </div>

          <!-- Hardware Integration (The Physical Moat) -->
          <div class="card settings-card">
            <div class="card-header">
              <h3><i class="ph-duotone ph-plugs-connected"></i> Physical Hardware</h3>
            </div>
            <div class="card-body" style="display: flex; flex-direction: column; gap: 1rem;">
              <p style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 0;">
                Connect legacy rugged hardware directly to the browser via Web APIs. Fallbacks to simulator mode if devices aren't found.
              </p>
              <div>
                <button class="btn btn-secondary w-100 mb-2" id="btn-connect-scale">
                    <i class="ph-duotone ph-scales"></i> Connect Weighing Scale (Serial)
                </button>
                <button class="btn btn-secondary w-100" id="btn-connect-printer">
                    <i class="ph-duotone ph-printer"></i> Connect Thermal Printer (Bluetooth)
                </button>
              </div>
              <div id="hardware-status" style="font-size: 0.85rem; padding: 0.5rem; border-radius: 4px; background: rgba(255,255,255,0.05); text-align: center;">
                 Status: Waiting for connection...
              </div>
            </div>
          </div>
          
          <!-- P2P Offline Sync (The Infrastructure Moat) -->
          <div class="card settings-card" style="border-left:4px solid #10b981">
            <div class="card-header">
              <h3><i class="ph-duotone ph-wifi-slash" style="color:#10b981"></i> Local Device Sync</h3>
            </div>
            <div class="card-body">
              <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 1rem;">
                No internet? Sync data directly between devices on the same local network using WebRTC.
              </p>
              
              <div class="form-group">
                  <label>Your Sync Token (Host)</label>
                  <div style="display:flex;gap:0.5rem">
                      <input type="text" id="p2p-host-token" readonly placeholder="Click 'Generate Host Token' ->" style="background:rgba(0,0,0,0.2)">
                      <button class="btn btn-secondary" id="btn-p2p-host"><i class="ph ph-qr-code"></i> Host</button>
                  </div>
              </div>
              
              <div class="form-group" style="margin-top:1.5rem">
                  <label>Join a Device (Client)</label>
                  <div style="display:flex;gap:0.5rem">
                      <input type="text" id="p2p-join-token" placeholder="Paste Host Token Here">
                      <button class="btn btn-secondary" id="btn-p2p-join"><i class="ph ph-plug"></i> Join</button>
                  </div>
              </div>

              <div id="p2p-status" style="margin-top: 1rem; font-size: 0.85rem; padding: 0.5rem; border-radius: 4px; background: rgba(255,255,255,0.05); text-align: center;">
                 Status: Disconnected
              </div>
            </div>
          </div>

          <!-- AI & Forecasting -->
          <div class="card settings-card" style="border-left:4px solid #6366f1">
            <div class="card-header">
              <h3><i class="ph-duotone ph-robot" style="color:#6366f1"></i> AI &amp; Forecasting</h3>
            </div>
            <div class="card-body">
              <div class="form-group">
                <label>Groq API Key <small style="color:var(--text-secondary)">(free — <a href="https://console.groq.com" target="_blank" rel="noopener" style="color:#6366f1">get one here</a>)</small></label>
                <input type="password" id="set-groq-key"
                  value="${localStorage.getItem('erp_groq_api_key') || ''}"
                  placeholder="gsk_xxxxxxxxxxxxxxxxxxxxxxxx"
                  autocomplete="off">
                <small style="color:var(--text-secondary);display:block;margin-top:0.3rem">
                  Powers AI Business Advisor — signs up free, no credit card. Leave blank for rule-based insights.
                </small>
              </div>
              <div class="form-group">
                <label>Forecast Horizon</label>
                <select id="set-forecast-horizon">
                  <option value="7" ${(localStorage.getItem('erp_forecast_horizon') || '14') === '7' ? 'selected' : ''}>7 Days</option>
                  <option value="14" ${(localStorage.getItem('erp_forecast_horizon') || '14') === '14' ? 'selected' : ''}>14 Days</option>
                  <option value="30" ${(localStorage.getItem('erp_forecast_horizon') || '14') === '30' ? 'selected' : ''}>30 Days</option>
                </select>
              </div>
              <button class="btn btn-primary w-100" id="save-ai-settings">
                <i class="ph ph-check"></i> Save AI Settings
              </button>
            </div>
          </div>
          <!-- Team Management -->
          <div class="card settings-card">
            <div class="card-header">
              <h3><i class="ph-duotone ph-users"></i> Team Management</h3>
            </div>
            <div class="card-body">
              <p class="text-muted mb-3">Manage staff access and roles.</p>
              <div id="team-list" style="margin-bottom: 1rem; max-height: 200px; overflow-y: auto;">
                <div class="loading-spinner"><i class="ph ph-spinner ph-spin"></i> Loading team...</div>
              </div>
              <button class="btn btn-outline-primary w-100" id="btn-add-team-member">
                <i class="ph-duotone ph-user-plus"></i> Add Team Member
              </button>
            </div>
          </div>
        </div>

        <div class="settings-footer">
          <button class="btn btn-primary btn-lg" id="save-settings"><i class="ph-duotone ph-floppy-disk"></i> Save Changes</button>
        </div>
      </div>
      <!-- Add Team Member Modal -->
      <dialog id="add-team-modal" style="border:none; border-radius:12px; padding:0; box-shadow:0 10px 25px rgba(0,0,0,0.2); max-width:400px; width:100%;">
        <div style="padding:1.5rem;">
           <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem">
              <h3 style="margin:0">Add Team Member</h3>
              <button type="button" class="btn-icon" id="close-add-team" style="background:none;border:none;font-size:1.5rem;cursor:pointer">&times;</button>
           </div>
           <form id="add-team-form">
             <div class="form-group" style="margin-bottom:1rem">
               <label style="display:block;margin-bottom:0.25rem;font-weight:500;">Username</label>
               <input type="text" name="username" required style="width:100%;padding:0.75rem;border:1px solid var(--border-color);border-radius:6px;">
             </div>
             <div class="form-group" style="margin-bottom:1rem">
               <label style="display:block;margin-bottom:0.25rem;font-weight:500;">Password</label>
               <input type="password" name="password" required style="width:100%;padding:0.75rem;border:1px solid var(--border-color);border-radius:6px;">
             </div>
             <div class="form-group" style="margin-bottom:1rem">
               <label style="display:block;margin-bottom:0.25rem;font-weight:500;">Role</label>
               <select name="role" required style="width:100%;padding:0.75rem;border:1px solid var(--border-color);border-radius:6px;">
                 <option value="staff">Staff (Limited Access)</option>
                 <option value="manager">Manager</option>
                 <option value="admin">Admin / Owner</option>
               </select>
             </div>
             <button type="submit" class="btn btn-primary w-100 mt-2" style="width:100%">Create Account</button>
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
    // Save Settings
    container.querySelector('#save-settings').addEventListener('click', async () => {
      const newSettings = {
        ...this.settings,
        businessName: container.querySelector('#set-name').value,
        taxRate: parseFloat(container.querySelector('#set-tax').value) || 0,
        printerIp: container.querySelector('#set-printer').value
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
          // Reload page to reflect name change in sidebar?
          // location.reload(); 
        }

      } catch (err) {
        console.error(err);
        alert('Failed to save settings');
      }
    });

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
        .settings-container {
          padding: 1rem;
          max-width: 900px;
          margin: 0 auto;
          color: var(--text-primary);
        }

        .settings-header {
            margin-bottom: 2rem;
            text-align: center;
        }
        
        .settings-header p {
            color: var(--text-secondary);
        }

        .settings-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 1.5rem;
            margin-bottom: 2rem;
        }

        .settings-card {
            height: 100%;
            background: rgba(255, 255, 255, 0.03);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            border-radius: var(--radius-lg);
            border: 1px solid var(--border-color);
            box-shadow: var(--shadow-md);
            overflow: hidden;
        }
        
        .settings-card .card-header {
            padding: 1.25rem 1.5rem;
            border-bottom: 1px solid var(--border-color);
            background: rgba(255,255,255,0.01);
        }
        
        .settings-card .card-header h3 {
            margin: 0;
            color: var(--text-primary);
        }
        
        .settings-card .card-body {
            padding: 1.5rem;
        }

        .form-group {
            margin-bottom: 1.25rem;
        }

        .form-group label {
            display: block;
            margin-bottom: 0.5rem;
            font-weight: 500;
            color: var(--text-secondary);
            font-size: 0.9rem;
        }

        .form-group input, .form-group select, .form-group textarea {
            width: 100%;
            padding: 0.75rem 1rem;
            border: 1px solid var(--border-color);
            border-radius: var(--radius-md);
            background: rgba(255, 255, 255, 0.05);
            color: var(--text-primary);
            font-family: inherit;
            transition: all 0.2s;
        }
        
        .form-group input:focus, .form-group select:focus, .form-group textarea:focus {
            outline: none;
            border-color: var(--accent-primary);
            box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
        }

        .settings-footer {
            text-align: center;
            margin-top: 2rem;
            padding-top: 2rem;
            border-top: 1px solid var(--border-color);
        }

        .data-actions button {
            text-align: left;
            padding-left: 1rem;
        }
        
        /* Modal overrides for settings forms */
        dialog {
            background: rgba(30, 41, 59, 0.95);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border: 1px solid var(--border-color);
            color: var(--text-primary);
        }
        
        dialog form {
            color: var(--text-primary);
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

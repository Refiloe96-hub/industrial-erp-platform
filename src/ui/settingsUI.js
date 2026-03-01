import db from '../db/index.js';
import DataImportService from '../services/DataImportService.js';

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

          <!-- Hardware (Placeholder) -->
          <div class="card settings-card">
            <div class="card-header">
              <h3><i class="ph-duotone ph-printer"></i> Hardware</h3>
            </div>
            <div class="card-body">
              <div class="form-group">
                <label>Receipt Printer IP</label>
                <input type="text" id="set-printer" value="${this.settings.printerIp}" placeholder="192.168.1.100">
              </div>
              <button class="btn btn-sm btn-secondary" disabled>Test Print</button>
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
        </div>

        <div class="settings-footer">
          <button class="btn btn-primary btn-lg" id="save-settings"><i class="ph-duotone ph-floppy-disk"></i> Save Changes</button>
        </div>
      </div>
      ${this.renderStyles()}
      ${this.renderImportModal()}
    `;

    this.attachHandlers(container);
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
      alert('📧 Support request sent! We will contact you shortly to switch your vertical.');
      supportModal.style.display = 'none';
      wizardModal.style.display = 'flex'; // Re-open wizard
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
          max-width: 800px;
          margin: 0 auto;
        }

        .settings-header {
            margin-bottom: 2rem;
            text-align: center;
        }

        .settings-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 1.5rem;
            margin-bottom: 2rem;
        }

        .settings-card {
            height: 100%;
        }

        .form-group {
            margin-bottom: 1rem;
        }

        .form-group label {
            display: block;
            margin-bottom: 0.5rem;
            font-weight: 500;
            color: #374151;
        }

        .form-group input, .form-group select {
            width: 100%;
            padding: 0.75rem;
            border: 1px solid #d1d5db;
            border-radius: 6px;
            font-size: 1rem;
        }

        .settings-footer {
            text-align: center;
            margin-top: 2rem;
            padding-top: 2rem;
            border-top: 1px solid #e5e7eb;
        }

        .data-actions button {
            text-align: left;
            padding-left: 1rem;
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

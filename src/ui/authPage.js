// Auth page HTML — extracted from main.js for maintainability
// Called by IndustrialERPApp.checkAuth() in main.js

export function renderLoginHTML() {
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

export function renderPasskeySetupHTML() {
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
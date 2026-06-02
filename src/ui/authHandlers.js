// Auth event handlers — extracted from main.js
import db from '../db/index.js';
import { supabaseClient, isSupabaseEnabled, checkSupabaseReachable } from '../services/supabase.js';
import { getSession, esc } from '../utils/safeJson.js';
import WelcomeWizardUI from './welcomeWizardUI.js';

export function attachLoginHandlers(app) {
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
              await app.completeLogin(localUser);
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
            await app.completeLogin(localUser, password);
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
          await app.completeLogin(rebuiltUser, password);

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
          await app.completeLogin(userData, password);
        }

      } catch (err) {
        console.error('Auth error:', err);
        alert(err.message || 'Authentication failed');
        finalSubmitBtn.innerHTML = originalHTML;
        finalSubmitBtn.disabled = false;
      }
    });

    // Helper: Finalize Login & Optionally Create Passkey
    app.completeLogin = async (user, passwordStr = null) => {
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
        app.currentUser = user;
        localStorage.setItem('erp_session', JSON.stringify(user));
        await db.update('users', user);
        app.render();
      };

      // Check if we should prompt for Passkey setup
      if (window.PublicKeyCredential && !user.passkeyId) {
        document.getElementById('app').innerHTML = app.renderPasskeySetup();

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
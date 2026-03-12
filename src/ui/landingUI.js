class LandingUI {
  render(container) {
    container.innerHTML = `
      <style>
        /* ================================================================
           INDUSTRIAL ERP · LANDING PAGE
           Inspired by Linear, Stripe, and Vercel.
           Clean, dark, typographic-first. No gimmicks.
        ================================================================ */

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .lp {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          color: #e2e8f0;
          background: #080d17;
          min-height: 100vh;
          -webkit-font-smoothing: antialiased;
        }

        /* --- NAVBAR --- */
        .lp-nav {
          position: fixed;
          top: 0; left: 0; right: 0;
          height: 60px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 2rem;
          background: rgba(8, 13, 23, 0.85);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid rgba(255,255,255,0.06);
          z-index: 1000;
        }

        .lp-logo {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          font-size: 1rem;
          font-weight: 700;
          color: #f8fafc;
          letter-spacing: -0.01em;
        }

        .lp-logo-icon {
          width: 28px; height: 28px;
          background: #2563eb;
          border-radius: 7px;
          display: flex; align-items: center; justify-content: center;
          font-size: 0.9rem;
        }

        .lp-nav-links {
          display: flex;
          gap: 2rem;
          list-style: none;
        }

        .lp-nav-links a {
          font-size: 0.875rem;
          font-weight: 500;
          color: #94a3b8;
          text-decoration: none;
          transition: color 0.15s;
        }
        .lp-nav-links a:hover { color: #f8fafc; }

        .lp-nav-actions {
          display: flex;
          gap: 0.75rem;
          align-items: center;
        }

        .lp-btn-ghost {
          font-size: 0.875rem;
          font-weight: 500;
          color: #94a3b8;
          background: none;
          border: none;
          cursor: pointer;
          padding: 0.5rem 0.75rem;
          border-radius: 6px;
          transition: color 0.15s, background 0.15s;
        }
        .lp-btn-ghost:hover { color: #f8fafc; background: rgba(255,255,255,0.05); }

        .lp-btn-primary {
          font-size: 0.875rem;
          font-weight: 600;
          color: #fff;
          background: #2563eb;
          border: none;
          cursor: pointer;
          padding: 0.5rem 1.1rem;
          border-radius: 6px;
          transition: background 0.15s, transform 0.1s;
        }
        .lp-btn-primary:hover { background: #1d4ed8; }
        .lp-btn-primary:active { transform: scale(0.985); }

        /* --- HERO --- */
        .lp-hero {
          padding: 160px 2rem 100px;
          max-width: 820px;
          margin: 0 auto;
          text-align: center;
        }

        .lp-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.8rem;
          font-weight: 600;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: #2563eb;
          background: rgba(37,99,235,0.08);
          border: 1px solid rgba(37,99,235,0.2);
          padding: 0.35rem 0.9rem;
          border-radius: 99px;
          margin-bottom: 2rem;
        }

        .lp-hero h1 {
          font-size: clamp(2.5rem, 5vw, 4rem);
          font-weight: 800;
          line-height: 1.1;
          letter-spacing: -0.04em;
          color: #f8fafc;
          margin-bottom: 1.5rem;
        }

        .lp-hero h1 em {
          font-style: normal;
          color: #2563eb;
        }

        .lp-hero p {
          font-size: 1.1rem;
          line-height: 1.75;
          color: #64748b;
          max-width: 560px;
          margin: 0 auto 2.5rem;
        }

        .lp-hero-actions {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .lp-btn-hero {
          font-size: 0.95rem;
          font-weight: 600;
          color: #fff;
          background: #2563eb;
          border: none;
          cursor: pointer;
          padding: 0.75rem 1.75rem;
          border-radius: 8px;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          transition: background 0.15s;
        }
        .lp-btn-hero:hover { background: #1d4ed8; }

        .lp-btn-outline {
          font-size: 0.95rem;
          font-weight: 500;
          color: #94a3b8;
          background: transparent;
          border: 1px solid rgba(255,255,255,0.1);
          cursor: pointer;
          padding: 0.75rem 1.75rem;
          border-radius: 8px;
          transition: border-color 0.15s, color 0.15s;
        }
        .lp-btn-outline:hover { border-color: rgba(255,255,255,0.25); color: #f8fafc; }

        .lp-hero-note {
          margin-top: 1.25rem;
          font-size: 0.8rem;
          color: #475569;
        }

        /* --- DIVIDER --- */
        .lp-divider {
          border: none;
          border-top: 1px solid rgba(255,255,255,0.05);
        }

        /* --- SOCIAL PROOF --- */
        .lp-proof {
          padding: 3rem 2rem;
          text-align: center;
        }
        .lp-proof p {
          font-size: 0.8rem;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #334155;
          font-weight: 600;
          margin-bottom: 2rem;
        }
        .lp-proof-logos {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 3rem;
          flex-wrap: wrap;
          opacity: 0.35;
          filter: grayscale(1);
        }
        .lp-proof-logo {
          font-size: 0.95rem;
          font-weight: 700;
          color: #94a3b8;
          letter-spacing: -0.01em;
        }

        /* --- FEATURES --- */
        .lp-features {
          padding: 6rem 2rem;
          max-width: 1100px;
          margin: 0 auto;
        }

        .lp-section-label {
          font-size: 0.8rem;
          font-weight: 600;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: #2563eb;
          margin-bottom: 1rem;
        }

        .lp-section-heading {
          font-size: clamp(1.75rem, 3vw, 2.5rem);
          font-weight: 800;
          letter-spacing: -0.03em;
          color: #f1f5f9;
          line-height: 1.2;
          margin-bottom: 1rem;
          max-width: 500px;
        }

        .lp-section-sub {
          font-size: 1rem;
          color: #475569;
          line-height: 1.7;
          max-width: 440px;
          margin-bottom: 3.5rem;
        }

        .lp-features-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.05);
          border-radius: 12px;
          overflow: hidden;
        }

        .lp-feat {
          background: #080d17;
          padding: 2rem;
          transition: background 0.2s;
        }
        .lp-feat:hover { background: #0d1422; }

        .lp-feat-icon {
          font-size: 1.35rem;
          color: #2563eb;
          margin-bottom: 1.25rem;
          display: block;
        }

        .lp-feat h3 {
          font-size: 0.95rem;
          font-weight: 700;
          color: #f1f5f9;
          margin-bottom: 0.5rem;
          letter-spacing: -0.01em;
        }

        .lp-feat p {
          font-size: 0.875rem;
          color: #475569;
          line-height: 1.65;
        }

        /* --- HOW IT WORKS --- */
        .lp-how {
          padding: 6rem 2rem;
          background: #0a101c;
          border-top: 1px solid rgba(255,255,255,0.05);
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .lp-how-inner {
          max-width: 1100px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 5rem;
          align-items: start;
        }
        .lp-steps {
          display: flex;
          flex-direction: column;
          gap: 2rem;
          margin-top: 1rem;
        }
        .lp-step {
          display: flex;
          gap: 1.25rem;
          align-items: flex-start;
        }
        .lp-step-num {
          min-width: 28px;
          height: 28px;
          border-radius: 50%;
          background: rgba(37,99,235,0.1);
          border: 1px solid rgba(37,99,235,0.25);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
          font-weight: 700;
          color: #2563eb;
        }
        .lp-step-content h4 {
          font-size: 0.95rem;
          font-weight: 700;
          color: #e2e8f0;
          margin-bottom: 0.35rem;
        }
        .lp-step-content p {
          font-size: 0.875rem;
          color: #475569;
          line-height: 1.65;
        }

        /* --- CTA --- */
        .lp-cta {
          padding: 8rem 2rem;
          text-align: center;
          max-width: 640px;
          margin: 0 auto;
        }

        .lp-cta h2 {
          font-size: clamp(2rem, 3vw, 3rem);
          font-weight: 800;
          letter-spacing: -0.03em;
          color: #f8fafc;
          margin-bottom: 1rem;
        }

        .lp-cta p {
          font-size: 1.05rem;
          color: #475569;
          margin-bottom: 2.5rem;
          line-height: 1.7;
        }

        /* --- FOOTER --- */
        .lp-footer {
          padding: 2.5rem 2rem;
          border-top: 1px solid rgba(255,255,255,0.05);
          display: flex;
          justify-content: space-between;
          align-items: center;
          max-width: 1100px;
          margin: 0 auto;
        }
        .lp-footer-copy {
          font-size: 0.815rem;
          color: #334155;
        }
        .lp-footer-links {
          display: flex;
          gap: 1.75rem;
        }
        .lp-footer-links a {
          font-size: 0.815rem;
          color: #334155;
          text-decoration: none;
          transition: color 0.15s;
        }
        .lp-footer-links a:hover { color: #64748b; }

        /* --- RESPONSIVE --- */
        @media (max-width: 900px) {
          .lp-features-grid { grid-template-columns: repeat(2, 1fr); }
          .lp-how-inner { grid-template-columns: 1fr; gap: 3rem; }
          .lp-nav-links { display: none; }
        }
        @media (max-width: 600px) {
          .lp-features-grid { grid-template-columns: 1fr; }
          .lp-hero { padding: 120px 1.5rem 60px; }
          .lp-footer { flex-direction: column; gap: 1.5rem; text-align: center; }
          .lp-footer-links { flex-wrap: wrap; justify-content: center; }
          .lp-nav-actions .lp-btn-ghost { display: none; }
        }
      </style>

      <div class="lp">

        <!-- Navbar -->
        <nav class="lp-nav">
          <div class="lp-logo">
            <div class="lp-logo-icon"><i class="ph-bold ph-buildings" style="color:white;font-size:0.85rem;"></i></div>
            Industrial ERP
          </div>
          <ul class="lp-nav-links">
            <li><a href="#features">Features</a></li>
            <li><a href="#how">How it works</a></li>
            <li><a href="#pricing">Pricing</a></li>
          </ul>
          <div class="lp-nav-actions">
            <button class="lp-btn-ghost" id="btnNavLogin">Sign in</button>
            <button class="lp-btn-primary" id="btnNavSignup">Get Started</button>
          </div>
        </nav>

        <!-- Hero -->
        <section class="lp-hero">
          <div class="lp-eyebrow">
            <i class="ph-bold ph-sparkle"></i> Built for resilient operations
          </div>
          <h1>The business platform for <em>emerging markets</em></h1>
          <p>An offline-first ERP that connects your sales, inventory, finances, and supply chain — without the enterprise complexity or price tag.</p>
          <div class="lp-hero-actions">
            <button class="lp-btn-hero" id="btnHeroSignup">Start for free <i class="ph-bold ph-arrow-right"></i></button>
            <button class="lp-btn-outline" id="btnHeroLogin">Sign in to your account</button>
          </div>
          <p class="lp-hero-note">No credit card required &nbsp;·&nbsp; Works offline &nbsp;·&nbsp; Runs on any device</p>
        </section>

        <hr class="lp-divider">

        <!-- Social proof -->
        <div class="lp-proof">
          <p>Trusted by businesses across the region</p>
          <div class="lp-proof-logos">
            <span class="lp-proof-logo">SHOPRITE SPAZA</span>
            <span class="lp-proof-logo">DURBAN WAREHOUSE CO.</span>
            <span class="lp-proof-logo">METRO TRADERS</span>
            <span class="lp-proof-logo">EASTGATE MILLS</span>
            <span class="lp-proof-logo">KASI FRESH</span>
          </div>
        </div>

        <hr class="lp-divider">

        <!-- Features -->
        <section id="features" class="lp-features">
          <p class="lp-section-label">Everything in one place</p>
          <h2 class="lp-section-heading">Every tool your business needs to operate</h2>
          <p class="lp-section-sub">From the sales counter to the storeroom, Industrial ERP connects every part of your operation in a single platform.</p>

          <div class="lp-features-grid">
            <div class="lp-feat">
              <span class="lp-feat-icon"><i class="ph-duotone ph-storefront"></i></span>
              <h3>Point of Sale</h3>
              <p>Fast offline checkout, barcode scanning, receipt printing, and VAT calculation that keeps working when the internet does not.</p>
            </div>
            <div class="lp-feat">
              <span class="lp-feat-icon"><i class="ph-duotone ph-archive-box"></i></span>
              <h3>PoolStock Inventory</h3>
              <p>Real-time stock levels, low-inventory alerts, purchase orders, and a full audit trail of every item in and out.</p>
            </div>
            <div class="lp-feat">
              <span class="lp-feat-icon"><i class="ph-duotone ph-notebook"></i></span>
              <h3>PocketBooks</h3>
              <p>Automatic profit & loss, cash flow tracking, and expense management — accountant-quality reporting, zero accounting knowledge required.</p>
            </div>
            <div class="lp-feat">
              <span class="lp-feat-icon"><i class="ph-duotone ph-factory"></i></span>
              <h3>SmartShift Manufacturing</h3>
              <p>Track raw materials, manage bills of materials, plan production runs, and monitor machine utilisation — all from one view.</p>
            </div>
            <div class="lp-feat">
              <span class="lp-feat-icon"><i class="ph-duotone ph-handshake"></i></span>
              <h3>TrustCircle Syndicates</h3>
              <p>Pool orders with other businesses you trust to unlock bulk-buy pricing and supplier credit that neither of you could access alone.</p>
            </div>
            <div class="lp-feat">
              <span class="lp-feat-icon"><i class="ph-duotone ph-cloud-slash"></i></span>
              <h3>Local-First Architecture</h3>
              <p>Your data is stored on-device and syncs to the cloud in the background. Full functionality whether you are online or offline.</p>
            </div>
          </div>
        </section>

        <!-- How it works -->
        <section id="how" class="lp-how">
          <div class="lp-how-inner">
            <div>
              <p class="lp-section-label">How it works</p>
              <h2 class="lp-section-heading">Up and running in minutes, not months</h2>
              <p class="lp-section-sub">No implementation consultants. No lengthy onboarding. You choose your business type and the platform configures itself.</p>
            </div>
            <div class="lp-steps">
              <div class="lp-step">
                <div class="lp-step-num">1</div>
                <div class="lp-step-content">
                  <h4>Create your account</h4>
                  <p>Sign up with Google, Apple, or email. Select your business type — shop, warehouse, or factory — and your workspace is configured automatically.</p>
                </div>
              </div>
              <div class="lp-step">
                <div class="lp-step-num">2</div>
                <div class="lp-step-content">
                  <h4>Load your data</h4>
                  <p>Import existing inventory from a spreadsheet or start fresh. Our onboarding wizard walks you through every step in under five minutes.</p>
                </div>
              </div>
              <div class="lp-step">
                <div class="lp-step-num">3</div>
                <div class="lp-step-content">
                  <h4>Operate with confidence</h4>
                  <p>Sell, restock, track expenses, and review performance from any device. The platform syncs automatically whenever you have a connection.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- Final CTA -->
        <section class="lp-cta">
          <h2>Start running a tighter operation today</h2>
          <p>Join businesses that replaced disconnected spreadsheets and paper records with a single, reliable platform.</p>
          <div class="lp-hero-actions">
            <button class="lp-btn-hero" id="btnCtaSignup">Create a free account <i class="ph-bold ph-arrow-right"></i></button>
          </div>
          <p class="lp-hero-note" style="margin-top:1rem;">Setup takes less than 5 minutes</p>
        </section>

        <!-- Footer -->
        <footer>
          <div class="lp-footer">
            <p class="lp-footer-copy">&copy; ${new Date().getFullYear()} Industrial ERP. All rights reserved.</p>
            <div class="lp-footer-links">
              <a href="#">Privacy</a>
              <a href="#">Terms</a>
              <a href="#">Security</a>
              <a href="#">Status</a>
            </div>
          </div>
        </footer>

      </div><!-- /.lp -->
    `;

    // Route all CTA buttons to the Auth screen
    const goToAuth = () => {
      window.history.pushState({}, '', '/app');
      window.dispatchEvent(new Event('popstate'));
    };

    ['btnNavLogin', 'btnNavSignup', 'btnHeroSignup', 'btnHeroLogin', 'btnCtaSignup'].forEach(id => {
      const el = container.querySelector('#' + id);
      if (el) el.addEventListener('click', goToAuth);
    });
  }
}

export default new LandingUI();

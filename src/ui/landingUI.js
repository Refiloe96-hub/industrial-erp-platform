class LandingUI {
  render(container) {
    container.innerHTML = `
      <style>
        .landing-container {
          min-height: 100vh;
          font-family: inherit;
          color: var(--text-primary);
        }

        /* --- NAVIGATION --- */
        .landing-nav {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.5rem 5%;
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          z-index: 1000;
          background: rgba(15, 23, 42, 0.7);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .l-brand {
          font-size: 1.5rem;
          font-weight: 800;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          letter-spacing: -0.02em;
        }

        .l-nav-links {
          display: flex;
          gap: 2.5rem;
          align-items: center;
        }

        .l-nav-links a {
          color: var(--text-secondary);
          text-decoration: none;
          font-weight: 500;
          font-size: 0.95rem;
          transition: color 0.2s;
        }
        .l-nav-links a:hover {
          color: var(--text-primary);
        }

        .l-actions {
          display: flex;
          gap: 1rem;
          align-items: center;
        }

        .btn-l-outline {
          padding: 0.6rem 1.25rem;
          border: 1px solid rgba(255,255,255,0.2);
          border-radius: 99px;
          color: white;
          background: transparent;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-l-outline:hover {
          background: rgba(255,255,255,0.05);
          border-color: rgba(255,255,255,0.3);
        }

        .btn-l-primary {
          padding: 0.6rem 1.5rem;
          border: none;
          border-radius: 99px;
          background: white;
          color: #0f172a;
          font-weight: 700;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
          box-shadow: 0 4px 15px rgba(255,255,255,0.1);
        }
        .btn-l-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(255,255,255,0.2);
        }

        /* --- HERO SECTION --- */
        .l-hero {
          padding: 12rem 5% 8rem;
          text-align: center;
          position: relative;
          overflow: hidden;
        }

        /* Decorative Grid Background */
        .l-hero::before {
          content: '';
          position: absolute;
          inset: -100px;
          background-image: 
            linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
          background-size: 50px 50px;
          mask-image: radial-gradient(ellipse at center, black 40%, transparent 70%);
          -webkit-mask-image: radial-gradient(ellipse at center, black 40%, transparent 70%);
          z-index: -1;
        }

        .l-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          background: rgba(37, 99, 235, 0.1);
          border: 1px solid rgba(37, 99, 235, 0.3);
          color: #60a5fa;
          padding: 0.4rem 1rem;
          border-radius: 99px;
          font-size: 0.85rem;
          font-weight: 600;
          margin-bottom: 2rem;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }

        .l-hero h1 {
          font-size: 4.5rem;
          font-weight: 800;
          line-height: 1.1;
          margin-bottom: 1.5rem;
          letter-spacing: -0.03em;
          background: linear-gradient(135deg, #ffffff 0%, #a1a1aa 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          max-width: 900px;
          margin-inline: auto;
        }

        .l-hero p {
          font-size: 1.25rem;
          color: var(--text-secondary);
          max-width: 600px;
          margin: 0 auto 3rem;
          line-height: 1.7;
        }

        .l-hero-cta {
          display: flex;
          justify-content: center;
          gap: 1rem;
        }

        .l-hero-cta .btn-large {
          padding: 1rem 2.5rem;
          font-size: 1.1rem;
        }

        /* --- DASHBOARD PREVIEW --- */
        .l-preview {
          position: relative;
          max-width: 1000px;
          margin: -2rem auto 8rem;
          border-radius: 20px;
          padding: 10px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.05);
          box-shadow: 0 30px 60px rgba(0,0,0,0.5);
        }
        
        .l-preview-inner {
          background: #0f172a;
          border-radius: 12px;
          overflow: hidden;
          aspect-ratio: 16/9;
          position: relative;
          border: 1px solid rgba(255,255,255,0.1);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        /* Fake UI Elements for Preview */
        .l-fake-sidebar {
          width: 200px;
          height: 100%;
          border-right: 1px solid rgba(255,255,255,0.1);
          padding: 2rem 1rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .l-fake-nav { height: 20px; border-radius: 4px; background: rgba(255,255,255,0.05); width: 100%; }
        
        .l-fake-main {
          flex: 1;
          height: 100%;
          padding: 2rem;
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }
        .l-fake-header { height: 30px; border-radius: 6px; background: rgba(255,255,255,0.1); width: 40%;}
        .l-fake-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; }
        .l-fake-card { height: 100px; border-radius: 12px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05);}
        .l-fake-chart { flex:1; border-radius: 12px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05);}


        /* --- FEATURES GRID --- */
        .l-features {
          padding: 6rem 5%;
          max-width: 1200px;
          margin: 0 auto;
        }

        .l-section-title {
          text-align: center;
          margin-bottom: 4rem;
        }

        .l-section-title h2 {
          font-size: 2.5rem;
          font-weight: 800;
          margin-bottom: 1rem;
        }

        .l-section-title p {
          color: var(--text-secondary);
          font-size: 1.1rem;
        }

        .l-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
          gap: 2rem;
        }

        .l-card {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.05);
          padding: 2.5rem;
          border-radius: 24px;
          transition: transform 0.3s, background 0.3s;
        }
        
        .l-card:hover {
          transform: translateY(-5px);
          background: rgba(255,255,255,0.04);
          border-color: rgba(255,255,255,0.1);
        }

        .l-card-icon {
          width: 50px;
          height: 50px;
          border-radius: 12px;
          background: rgba(37, 99, 235, 0.1);
          color: #60a5fa;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          margin-bottom: 1.5rem;
        }

        .l-card h3 {
          font-size: 1.25rem;
          margin-bottom: 1rem;
          font-weight: 700;
        }

        .l-card p {
          color: var(--text-secondary);
          line-height: 1.6;
          font-size: 0.95rem;
        }

        /* --- CALL TO ACTION --- */
        .l-cta {
          padding: 8rem 5%;
          text-align: center;
          background: linear-gradient(180deg, transparent, rgba(37,99,235,0.05));
          border-top: 1px solid rgba(255,255,255,0.05);
        }

        .l-cta h2 {
          font-size: 3rem;
          font-weight: 800;
          margin-bottom: 1.5rem;
        }

        .l-cta p {
          font-size: 1.2rem;
          color: var(--text-secondary);
          margin-bottom: 3rem;
        }

        /* --- FOOTER --- */
        .l-footer {
          padding: 4rem 5%;
          border-top: 1px solid rgba(255,255,255,0.05);
          display: flex;
          justify-content: space-between;
          align-items: center;
          color: var(--text-secondary);
          font-size: 0.9rem;
        }

        @media (max-width: 768px) {
          .l-nav-links { display: none; }
          .l-hero h1 { font-size: 3rem; }
          .l-hero p { font-size: 1.1rem; }
          .l-hero-cta { flex-direction: column; }
          .l-preview { display: none; }
          .l-footer { flex-direction: column; gap: 1rem; text-align: center; }
        }
      </style>

      <div class="landing-container">
        
        <!-- Navbar -->
        <nav class="landing-nav">
          <div class="l-brand">
            <i class="ph-duotone ph-buildings" style="color: #60a5fa;"></i>
            Industrial ERP
          </div>
          <div class="l-nav-links">
            <a href="#features">Features</a>
            <a href="#how-it-works">How it works</a>
            <a href="#pricing">Pricing</a>
          </div>
          <div class="l-actions">
            <button class="btn-l-outline" id="btn-land-login">Sign In</button>
            <button class="btn-l-primary" id="btn-land-signup">Get Started</button>
          </div>
        </nav>

        <!-- Hero -->
        <section class="l-hero">
          <div class="l-badge">
            <i class="ph-fill ph-sparkle"></i> V1.0 Now in Beta
          </div>
          <h1>The Operating System for Emerging Markets</h1>
          <p>Local-first inventory, automated financials, and offline POS built specifically for shops, warehouses, and factories.</p>
          
          <div class="l-hero-cta">
            <button class="btn-l-primary btn-large" id="btn-hero-signup">Start Free Trial ➔</button>
            <button class="btn-l-outline btn-large" id="btn-hero-demo">View Demo</button>
          </div>
        </section>

        <!-- Preview Mockup -->
        <div class="l-preview">
            <div class="l-preview-inner">
                <div class="l-fake-sidebar">
                    <div class="l-brand" style="margin-bottom:2rem;font-size:1.1rem">
                        <i class="ph-duotone ph-buildings" style="color: #60a5fa;"></i> Dashboard
                    </div>
                    <div class="l-fake-nav" style="opacity: 0.6"></div>
                    <div class="l-fake-nav" style="opacity: 0.4"></div>
                    <div class="l-fake-nav" style="opacity: 0.2"></div>
                </div>
                <div class="l-fake-main">
                    <div class="l-fake-header"></div>
                    <div class="l-fake-cards">
                        <div class="l-fake-card"></div>
                        <div class="l-fake-card"></div>
                        <div class="l-fake-card"></div>
                    </div>
                    <div class="l-fake-chart"></div>
                </div>
            </div>
        </div>

        <!-- Features -->
        <section id="features" class="l-features">
          <div class="l-section-title">
            <h2>Everything you need to scale</h2>
            <p>We replaced five different subscriptions with one unified database.</p>
          </div>

          <div class="l-grid">
            <div class="l-card">
              <div class="l-card-icon"><i class="ph-duotone ph-storefront"></i></div>
              <h3>Point of Sale (POS)</h3>
              <p>Lightning-fast offline checkout, receipt printing, and barcode scanning that works even when the internet drops.</p>
            </div>
            
            <div class="l-card">
              <div class="l-card-icon" style="background: rgba(16, 185, 129, 0.1); color: #34d399;"><i class="ph-duotone ph-database"></i></div>
              <h3>PoolStock Inventory</h3>
              <p>Real-time stock tracking with low-level alerts, supplier management, and automated purchase orders.</p>
            </div>

            <div class="l-card">
              <div class="l-card-icon" style="background: rgba(139, 92, 246, 0.1); color: #a78bfa;"><i class="ph-duotone ph-wallet"></i></div>
              <h3>PocketBooks Ledgers</h3>
              <p>Automated profit & loss statements, expense tracking, and cash flow generation without needing an accountant.</p>
            </div>

            <div class="l-card">
              <div class="l-card-icon" style="background: rgba(245, 158, 11, 0.1); color: #fbbf24;"><i class="ph-duotone ph-factory"></i></div>
              <h3>SmartShift Manufacturing</h3>
              <p>Manage raw materials, production BOMs, employee shifts, and machine utilization efficiently.</p>
            </div>

            <div class="l-card">
              <div class="l-card-icon" style="background: rgba(236, 72, 153, 0.1); color: #f472b6;"><i class="ph-duotone ph-users-three"></i></div>
              <h3>TrustCircle Syndicates</h3>
              <p>Collaborative B2B buying groups. Combine orders with other businesses to unlock bulk supplier discounts.</p>
            </div>

            <div class="l-card">
              <div class="l-card-icon" style="background: rgba(14, 165, 233, 0.1); color: #38bdf8;"><i class="ph-duotone ph-wifi-slash"></i></div>
              <h3>Local-First Architecture</h3>
              <p>Data is stored locally on your device and continuously background-synced to the cloud. Total privacy, zero latency.</p>
            </div>
          </div>
        </section>

        <!-- CTA -->
        <section class="l-cta">
          <h2>Ready to upgrade your operations?</h2>
          <p>Join businesses scaling faster with AI-augmented tools.</p>
          <button class="btn-l-primary btn-large" id="btn-cta-signup" style="font-size:1.1rem; padding:1rem 3rem">Create Free Account</button>
        </section>

        <!-- Footer -->
        <footer class="l-footer">
          <div>
            <div class="l-brand" style="font-size:1.2rem; margin-bottom:0.5rem">
              <i class="ph-duotone ph-buildings" style="color: #60a5fa;"></i> Industrial ERP
            </div>
            <p>Built for the resilient economy.</p>
          </div>
          <div>
            &copy; ${new Date().getFullYear()} Industrial ERP. All rights reserved.
          </div>
        </footer>

      </div> <!-- /.landing-container -->
    `;

    // Attach Routing Handlers for Landing Page CTAs
    const goAuth = () => {
        // We will trigger a hash change or a pushState to /login
        window.history.pushState({}, '', '/app');
        window.dispatchEvent(new Event('popstate'));
    };

    container.querySelector('#btn-land-login').addEventListener('click', goAuth);
    container.querySelector('#btn-land-signup').addEventListener('click', goAuth);
    container.querySelector('#btn-hero-signup').addEventListener('click', goAuth);
    container.querySelector('#btn-hero-demo').addEventListener('click', goAuth);
    container.querySelector('#btn-cta-signup').addEventListener('click', goAuth);
  }
}

export default new LandingUI();

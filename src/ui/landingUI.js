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

        /* --- MARQUEE / TICKER --- */
        .lp-proof {
          padding: 3.5rem 0;
          text-align: center;
          overflow: hidden;
        }
        .lp-proof-label {
          font-size: 0.8rem;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #334155;
          font-weight: 600;
          margin-bottom: 2rem;
        }
        /* Track wrapper — clips the logos */
        .lp-marquee-outer {
          position: relative;
          overflow: hidden;
          /* Fade edges using a mask */
          -webkit-mask-image: linear-gradient(
            to right,
            transparent 0%,
            black 12%,
            black 88%,
            transparent 100%
          );
          mask-image: linear-gradient(
            to right,
            transparent 0%,
            black 12%,
            black 88%,
            transparent 100%
          );
        }
        /* Scrolling track */
        .lp-marquee-track {
          display: flex;
          width: max-content;
          animation: lp-marquee 28s linear infinite;
        }
        .lp-marquee-track:hover {
          animation-play-state: paused;
        }
        @keyframes lp-marquee {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        /* Individual logo item */
        .lp-marquee-item {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          padding: 0 3rem;
          white-space: nowrap;
          font-size: 0.875rem;
          font-weight: 700;
          letter-spacing: 0.03em;
          color: #334155;
          text-transform: uppercase;
          transition: color 0.2s;
        }
        .lp-marquee-item:hover { color: #64748b; }
        /* Dot separator between names */
        .lp-marquee-dot {
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: #1e293b;
          flex-shrink: 0;
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

        /* --- STATS BAR --- */
        .lp-stats {
          padding: 3rem 2rem;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .lp-stats-inner {
          max-width: 900px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 2rem;
          text-align: center;
        }
        .lp-stat-num {
          font-size: 2.25rem;
          font-weight: 800;
          letter-spacing: -0.04em;
          color: #f1f5f9;
          display: block;
          line-height: 1;
          margin-bottom: 0.4rem;
        }
        .lp-stat-label {
          font-size: 0.8rem;
          color: #475569;
          font-weight: 500;
        }

        /* --- PRICING --- */
        .lp-pricing {
          padding: 6rem 2rem;
          max-width: 1100px;
          margin: 0 auto;
        }
        .lp-pricing-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1.5rem;
          margin-top: 3.5rem;
          align-items: start;
        }
        .lp-plan {
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 16px;
          padding: 2rem;
          background: #080d17;
          transition: border-color 0.2s;
        }
        .lp-plan:hover { border-color: rgba(255,255,255,0.14); }
        .lp-plan.lp-plan--featured {
          border-color: #2563eb;
          background: #0c1427;
          position: relative;
        }
        .lp-plan-badge {
          position: absolute;
          top: -13px;
          left: 50%;
          transform: translateX(-50%);
          background: #2563eb;
          color: white;
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          padding: 0.25rem 0.9rem;
          border-radius: 99px;
        }
        .lp-plan-name {
          font-size: 0.85rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: #64748b;
          margin-bottom: 1.25rem;
        }
        .lp-plan-name.featured-name { color: #60a5fa; }
        .lp-plan-price {
          font-size: 2.75rem;
          font-weight: 800;
          letter-spacing: -0.04em;
          color: #f1f5f9;
          line-height: 1;
          margin-bottom: 0.25rem;
        }
        .lp-plan-price sup {
          font-size: 1.2rem;
          font-weight: 600;
          vertical-align: super;
          letter-spacing: 0;
        }
        .lp-plan-price sub {
          font-size: 0.9rem;
          font-weight: 500;
          letter-spacing: 0;
          color: #64748b;
        }
        .lp-plan-desc {
          font-size: 0.875rem;
          color: #475569;
          line-height: 1.6;
          margin-bottom: 1.75rem;
        }
        .lp-plan-divider {
          border: none;
          border-top: 1px solid rgba(255,255,255,0.05);
          margin-bottom: 1.5rem;
        }
        .lp-plan-features {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          margin-bottom: 2rem;
        }
        .lp-plan-features li {
          font-size: 0.875rem;
          color: #94a3b8;
          display: flex;
          align-items: flex-start;
          gap: 0.6rem;
          line-height: 1.5;
        }
        .lp-plan-features li i { color: #2563eb; margin-top: 2px; flex-shrink: 0; }
        .lp-plan-btn {
          width: 100%;
          padding: 0.75rem;
          border-radius: 8px;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.15s, color 0.15s;
        }
        .lp-plan-btn.outline {
          background: transparent;
          border: 1px solid rgba(255,255,255,0.12);
          color: #94a3b8;
        }
        .lp-plan-btn.outline:hover { background: rgba(255,255,255,0.05); color: #f1f5f9; }
        .lp-plan-btn.primary {
          background: #2563eb;
          border: none;
          color: white;
        }
        .lp-plan-btn.primary:hover { background: #1d4ed8; }

        /* --- SCROLL ANIMATIONS --- */
        .lp-animate {
          opacity: 0;
          transform: translateY(24px);
          transition: opacity 0.55s ease, transform 0.55s ease;
        }
        .lp-animate.lp-visible {
          opacity: 1;
          transform: translateY(0);
        }
        /* Stagger children in a grid */
        .lp-stagger > * { transition-delay: calc(var(--i, 0) * 80ms); }

        /* --- RESPONSIVE --- */
        @media (max-width: 900px) {
          .lp-features-grid { grid-template-columns: repeat(2, 1fr); }
          .lp-how-inner { grid-template-columns: 1fr; gap: 3rem; }
          .lp-nav-links { display: none; }
          .lp-stats-inner { grid-template-columns: repeat(2, 1fr); }
          .lp-pricing-grid { grid-template-columns: 1fr; max-width: 440px; margin-inline: auto; }
        }
        @media (max-width: 600px) {
          .lp-features-grid { grid-template-columns: 1fr; }
          .lp-hero { padding: 120px 1.5rem 60px; }
          .lp-footer { flex-direction: column; gap: 1.5rem; text-align: center; }
          .lp-footer-links { flex-wrap: wrap; justify-content: center; }
          .lp-nav-actions .lp-btn-ghost { display: none; }
          .lp-stats-inner { grid-template-columns: repeat(2, 1fr); }
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

        <!-- Stats Bar -->
        <div class="lp-stats lp-animate">
          <div class="lp-stats-inner">
            <div>
              <span class="lp-stat-num">2,400+</span>
              <span class="lp-stat-label">Businesses active</span>
            </div>
            <div>
              <span class="lp-stat-num">14</span>
              <span class="lp-stat-label">Countries</span>
            </div>
            <div>
              <span class="lp-stat-num">99.8%</span>
              <span class="lp-stat-label">Uptime SLA</span>
            </div>
            <div>
              <span class="lp-stat-num">&lt; 400ms</span>
              <span class="lp-stat-label">Avg. response time</span>
            </div>
          </div>
        </div>

        <hr class="lp-divider">

        <!-- Social proof marquee -->
        <div class="lp-proof">
          <p class="lp-proof-label">Trusted by businesses across the region</p>
          <div class="lp-marquee-outer">
            <!-- The track is duplicated so the loop is seamless -->
            <div class="lp-marquee-track">
              <!-- Set 1 -->
              <div class="lp-marquee-item"><span>SHOPRITE SPAZA</span><span class="lp-marquee-dot"></span></div>
              <div class="lp-marquee-item"><span>DURBAN WAREHOUSE CO.</span><span class="lp-marquee-dot"></span></div>
              <div class="lp-marquee-item"><span>METRO TRADERS</span><span class="lp-marquee-dot"></span></div>
              <div class="lp-marquee-item"><span>EASTGATE MILLS</span><span class="lp-marquee-dot"></span></div>
              <div class="lp-marquee-item"><span>KASI FRESH</span><span class="lp-marquee-dot"></span></div>
              <div class="lp-marquee-item"><span>SOWETO BULK DEPOT</span><span class="lp-marquee-dot"></span></div>
              <div class="lp-marquee-item"><span>CAPE GRAIN TRADERS</span><span class="lp-marquee-dot"></span></div>
              <div class="lp-marquee-item"><span>TEMBISA TOOLS</span><span class="lp-marquee-dot"></span></div>
              <!-- Set 2 — exact duplicate for seamless loop -->
              <div class="lp-marquee-item"><span>SHOPRITE SPAZA</span><span class="lp-marquee-dot"></span></div>
              <div class="lp-marquee-item"><span>DURBAN WAREHOUSE CO.</span><span class="lp-marquee-dot"></span></div>
              <div class="lp-marquee-item"><span>METRO TRADERS</span><span class="lp-marquee-dot"></span></div>
              <div class="lp-marquee-item"><span>EASTGATE MILLS</span><span class="lp-marquee-dot"></span></div>
              <div class="lp-marquee-item"><span>KASI FRESH</span><span class="lp-marquee-dot"></span></div>
              <div class="lp-marquee-item"><span>SOWETO BULK DEPOT</span><span class="lp-marquee-dot"></span></div>
              <div class="lp-marquee-item"><span>CAPE GRAIN TRADERS</span><span class="lp-marquee-dot"></span></div>
              <div class="lp-marquee-item"><span>TEMBISA TOOLS</span><span class="lp-marquee-dot"></span></div>
            </div>
          </div>
        </div>

        <hr class="lp-divider">

        <!-- Features -->
        <section id="features" class="lp-features lp-animate">
          <p class="lp-section-label">Everything in one place</p>
          <h2 class="lp-section-heading">Every tool your business needs to operate</h2>
          <p class="lp-section-sub">From the sales counter to the storeroom, Industrial ERP connects every part of your operation in a single platform.</p>

          <div class="lp-features-grid lp-stagger">
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

        <!-- Pricing -->
        <section id="pricing" class="lp-pricing lp-animate">
          <p class="lp-section-label">Simple, transparent pricing</p>
          <h2 class="lp-section-heading">Pick the plan that fits your operation</h2>
          <p class="lp-section-sub">No hidden fees. No long-term contracts. Cancel or upgrade any time.</p>

          <div class="lp-pricing-grid">
            <!-- Free -->
            <div class="lp-plan">
              <p class="lp-plan-name">Starter</p>
              <div class="lp-plan-price">Free</div>
              <p class="lp-plan-desc">Everything you need to get started. No credit card required.</p>
              <hr class="lp-plan-divider">
              <ul class="lp-plan-features">
                <li><i class="ph-bold ph-check"></i> 1 business location</li>
                <li><i class="ph-bold ph-check"></i> POS &amp; basic inventory</li>
                <li><i class="ph-bold ph-check"></i> PocketBooks ledger</li>
                <li><i class="ph-bold ph-check"></i> Up to 500 products</li>
                <li><i class="ph-bold ph-check"></i> Local-only storage (no cloud sync)</li>
              </ul>
              <button class="lp-plan-btn outline lp-cta-btn">Get started free</button>
            </div>

            <!-- Pro (featured) -->
            <div class="lp-plan lp-plan--featured">
              <div class="lp-plan-badge">Most popular</div>
              <p class="lp-plan-name featured-name">Pro</p>
              <div class="lp-plan-price"><sup>R</sup>399<sub>/mo</sub></div>
              <p class="lp-plan-desc">For growing businesses that need cloud sync and advanced modules.</p>
              <hr class="lp-plan-divider">
              <ul class="lp-plan-features">
                <li><i class="ph-bold ph-check"></i> Everything in Starter</li>
                <li><i class="ph-bold ph-check"></i> Cloud sync &amp; backup</li>
                <li><i class="ph-bold ph-check"></i> Unlimited products</li>
                <li><i class="ph-bold ph-check"></i> SmartShift manufacturing</li>
                <li><i class="ph-bold ph-check"></i> TrustCircle syndicates</li>
                <li><i class="ph-bold ph-check"></i> Up to 5 team members</li>
                <li><i class="ph-bold ph-check"></i> Priority support</li>
              </ul>
              <button class="lp-plan-btn primary lp-cta-btn">Start free 14-day trial</button>
            </div>

            <!-- Enterprise -->
            <div class="lp-plan">
              <p class="lp-plan-name">Enterprise</p>
              <div class="lp-plan-price" style="font-size:1.75rem;padding-top:0.5rem">Custom</div>
              <p class="lp-plan-desc">Multi-location deployments, dedicated support, and custom integrations.</p>
              <hr class="lp-plan-divider">
              <ul class="lp-plan-features">
                <li><i class="ph-bold ph-check"></i> Everything in Pro</li>
                <li><i class="ph-bold ph-check"></i> Unlimited locations &amp; team members</li>
                <li><i class="ph-bold ph-check"></i> Custom API integrations</li>
                <li><i class="ph-bold ph-check"></i> SSO &amp; full audit logs</li>
                <li><i class="ph-bold ph-check"></i> Dedicated account manager</li>
                <li><i class="ph-bold ph-check"></i> SLA guarantee</li>
              </ul>
              <button class="lp-plan-btn outline lp-cta-btn">Contact sales</button>
            </div>
          </div>
        </section>

        <!-- Final CTA -->
        <section class="lp-cta lp-animate">
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

    // Pricing plan buttons also route to auth
    container.querySelectorAll('.lp-cta-btn').forEach(btn => btn.addEventListener('click', goToAuth));

    // --- Scroll-triggered animations via IntersectionObserver ---
    const animEls = container.querySelectorAll('.lp-animate');
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('lp-visible');
          io.unobserve(entry.target); // fire once
        }
      });
    }, { threshold: 0.1 });
    animEls.forEach(el => io.observe(el));

    // Stagger grid children
    container.querySelectorAll('.lp-stagger').forEach(grid => {
      [...grid.children].forEach((child, i) => {
        child.style.setProperty('--i', i);
        child.classList.add('lp-animate');
        io.observe(child);
      });
    });
  }
}

export default new LandingUI();

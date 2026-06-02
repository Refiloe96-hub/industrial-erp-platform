// Legal pages — Privacy Policy, Terms & Conditions, Support
// Rendered as standalone pages accessible from the landing page footer and sidebar.

const CONTACT_EMAIL = 'jujutsutech832@gmail.com';
const COMPANY_NAME  = 'Industrial ERP';
const EFFECTIVE_DATE = '1 June 2026';

function pageShell(title, bodyHTML) {
  return `
    <div style="min-height:100vh;background:#0d0d0f;color:#e2e8f0;font-family:'Inter',-apple-system,BlinkMacSystemFont,sans-serif;-webkit-font-smoothing:antialiased;">
      <nav style="position:sticky;top:0;background:rgba(13,13,15,0.9);backdrop-filter:blur(12px);border-bottom:1px solid rgba(255,255,255,0.06);padding:0 2rem;height:56px;display:flex;align-items:center;justify-content:space-between;z-index:100;">
        <a href="/" style="font-size:0.9375rem;font-weight:700;color:#f4f4f5;text-decoration:none;display:flex;align-items:center;gap:0.5rem;">
          <span style="width:24px;height:24px;background:rgba(37,99,235,0.15);border:1px solid rgba(37,99,235,0.2);border-radius:5px;display:flex;align-items:center;justify-content:center;font-size:0.75rem;color:#60a5fa;">E</span>
          ${COMPANY_NAME}
        </a>
        <a href="/" style="font-size:0.875rem;color:#60a5fa;text-decoration:none;">← Back to home</a>
      </nav>
      <div style="max-width:760px;margin:0 auto;padding:3rem 2rem 5rem;">
        <h1 style="font-size:1.875rem;font-weight:800;letter-spacing:-0.03em;color:#f4f4f5;margin:0 0 0.5rem;">${title}</h1>
        <p style="font-size:0.875rem;color:#52525b;margin:0 0 3rem;">Effective date: ${EFFECTIVE_DATE}</p>
        <div style="line-height:1.75;color:#a1a1aa;font-size:0.9375rem;">
          ${bodyHTML}
        </div>
      </div>
      <footer style="border-top:1px solid rgba(255,255,255,0.05);padding:1.5rem 2rem;text-align:center;font-size:0.8rem;color:#334155;">
        ${COMPANY_NAME} · Questions? <a href="mailto:${CONTACT_EMAIL}" style="color:#60a5fa;">${CONTACT_EMAIL}</a>
      </footer>
    </div>
  `;
}

function h2(text) {
  return `<h2 style="font-size:1.125rem;font-weight:700;color:#f4f4f5;margin:2.5rem 0 0.75rem;letter-spacing:-0.01em;">${text}</h2>`;
}
function p(text) { return `<p style="margin:0 0 1rem;">${text}</p>`; }
function ul(items) {
  return `<ul style="margin:0 0 1rem;padding-left:1.5rem;display:flex;flex-direction:column;gap:0.375rem;">${items.map(i=>`<li>${i}</li>`).join('')}</ul>`;
}

// ── Privacy Policy ───────────────────────────────────────────────────────────
export function renderPrivacy() {
  return pageShell('Privacy Policy', `
    ${p(`${COMPANY_NAME} ("we", "our", "us") is committed to protecting your personal information in accordance with the Protection of Personal Information Act (POPIA) of South Africa. This policy explains what data we collect, how we use it, and your rights.`)}

    ${h2('1. Information We Collect')}
    ${p('When you use Industrial ERP we may collect:')}
    ${ul([
      '<strong>Account information</strong> — your name, email address, business name, and business type when you register.',
      '<strong>Business data</strong> — inventory items, sales transactions, financial records, customer contacts, and supplier details that you enter into the platform.',
      '<strong>Device data</strong> — browser type, operating system, and anonymous usage patterns to improve the service.',
      '<strong>Payment information</strong> — we do not store card numbers. Payments are handled by third-party processors.',
    ])}

    ${h2('2. How We Store Your Data')}
    ${p('<strong>Local (offline-first):</strong> All business data is stored first in your browser\'s IndexedDB on your device. This data stays on your device and is accessible without an internet connection.')}
    ${p('<strong>Cloud sync:</strong> If you enable cloud features, data is synchronised to our Supabase backend (hosted on AWS infrastructure). Supabase complies with GDPR and SOC 2 Type II standards.')}
    ${p('<strong>No third-party advertising:</strong> We do not sell or share your data with advertisers.')}

    ${h2('3. How We Use Your Information')}
    ${ul([
      'To provide and improve the Industrial ERP service.',
      'To send operational notifications (low stock alerts, sync confirmations).',
      'To send the daily business summary notification if you opt in.',
      'To respond to support requests.',
      'To comply with legal obligations.',
    ])}

    ${h2('4. Data Retention')}
    ${p('Local data remains on your device until you clear your browser storage or uninstall the app. Cloud data is retained for the duration of your account. You can export and delete your data at any time from Settings → Data & Storage.')}

    ${h2('5. Your Rights Under POPIA')}
    ${p('You have the right to:')}
    ${ul([
      'Access the personal information we hold about you.',
      'Request correction of inaccurate information.',
      'Request deletion of your account and associated data.',
      'Object to the processing of your personal information.',
      'Lodge a complaint with the Information Regulator of South Africa.',
    ])}
    ${p(`To exercise any of these rights, contact us at <a href="mailto:${CONTACT_EMAIL}" style="color:#60a5fa;">${CONTACT_EMAIL}</a>.`)}

    ${h2('6. Cookies and Local Storage')}
    ${p('We use browser localStorage to store your session token and preferences (theme, currency). We do not use tracking cookies.')}

    ${h2('7. Changes to This Policy')}
    ${p('We may update this policy from time to time. We will notify registered users by email for material changes. Continued use of the service after changes constitutes acceptance.')}

    ${h2('8. Contact')}
    ${p(`If you have any questions about this privacy policy, please contact us at <a href="mailto:${CONTACT_EMAIL}" style="color:#60a5fa;">${CONTACT_EMAIL}</a>.`)}
  `);
}

// ── Terms & Conditions ───────────────────────────────────────────────────────
export function renderTerms() {
  return pageShell('Terms & Conditions', `
    ${p(`These Terms and Conditions govern your use of ${COMPANY_NAME} ("the Service"). By accessing or using the Service, you agree to be bound by these terms.`)}

    ${h2('1. Acceptance of Terms')}
    ${p('By creating an account or using the Service, you confirm that you are at least 18 years old, have the authority to bind the business entity you represent, and agree to these Terms.')}

    ${h2('2. Description of Service')}
    ${p(`${COMPANY_NAME} is an offline-first business management platform (ERP) designed for small and medium enterprises in Southern Africa. It provides point-of-sale, inventory management, financial ledger, CRM, and related tools.`)}

    ${h2('3. Account Responsibility')}
    ${ul([
      'You are responsible for maintaining the confidentiality of your account credentials.',
      'You are responsible for all activity that occurs under your account.',
      'You must notify us immediately of any unauthorised use of your account.',
      'Accounts are device-specific by default. Local data may be lost if browser storage is cleared; we recommend enabling cloud sync.',
    ])}

    ${h2('4. Acceptable Use')}
    ${p('You agree not to:')}
    ${ul([
      'Use the Service for any unlawful purpose or in violation of any regulations.',
      'Attempt to reverse-engineer, decompile, or extract the source code.',
      'Use the Service to store or transmit malware or harmful content.',
      'Resell or sublicense access to the Service without written permission.',
      'Use the Service to infringe third-party intellectual property rights.',
    ])}

    ${h2('5. Data and Privacy')}
    ${p('Your use of data within the Service is governed by our Privacy Policy. You retain ownership of all business data you enter. We do not claim rights over your business data.')}

    ${h2('6. Free Tier and Paid Plans')}
    ${p('The Starter plan is provided free of charge with limited features. Paid plans (Growth at R149/mo, Business at R349/mo) provide additional features. Pricing is subject to change with 30 days\' notice to active subscribers.')}
    ${p('Payments are processed monthly. Cancellation takes effect at the end of the current billing period. No refunds are issued for partial months unless required by the Consumer Protection Act.')}

    ${h2('7. Service Availability')}
    ${p('The Service is provided "as is." We do not guarantee 100% uptime. The offline-first architecture means core features remain available without an internet connection even if our servers are unavailable.')}

    ${h2('8. Limitation of Liability')}
    ${p(`To the maximum extent permitted by South African law, ${COMPANY_NAME} shall not be liable for any indirect, incidental, special, or consequential damages, including loss of data or business interruption, arising from your use of the Service. Our total liability shall not exceed the amount you paid us in the 12 months preceding the claim.`)}

    ${h2('9. Termination')}
    ${p('You may terminate your account at any time from Settings. We reserve the right to suspend or terminate accounts that violate these Terms, with reasonable notice except in cases of serious breach.')}

    ${h2('10. Governing Law')}
    ${p('These Terms are governed by the laws of the Republic of South Africa. Disputes shall be resolved in the courts of South Africa.')}

    ${h2('11. Changes to Terms')}
    ${p('We may update these Terms. We will provide notice of material changes. Your continued use of the Service after changes constitutes acceptance.')}

    ${h2('12. Contact')}
    ${p(`For questions about these Terms, contact us at <a href="mailto:${CONTACT_EMAIL}" style="color:#60a5fa;">${CONTACT_EMAIL}</a>.`)}
  `);
}

// ── Support ──────────────────────────────────────────────────────────────────
export function renderSupport() {
  return pageShell('Support', `
    ${p('Need help with Industrial ERP? Here\'s everything you need to get unstuck.')}

    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:1rem;margin:0 0 2.5rem;">
      ${[
        { icon:'📧', title:'Email support', body:`Send us a message at <a href="mailto:${CONTACT_EMAIL}" style="color:#60a5fa;">${CONTACT_EMAIL}</a>. We aim to respond within 1 business day.` },
        { icon:'📚', title:'Documentation', body:'Find step-by-step guides for every module in the Settings → Support section inside the app.' },
        { icon:'🐛', title:'Report a bug', body:`Email us with the module name and what you were doing when it went wrong. Screenshots help.` },
      ].map(c => `
        <div style="background:#18181b;border:1px solid rgba(255,255,255,0.06);border-radius:8px;padding:1.25rem;">
          <div style="font-size:1.5rem;margin-bottom:0.5rem;">${c.icon}</div>
          <h3 style="margin:0 0 0.375rem;font-size:0.9375rem;font-weight:700;color:#f4f4f5;">${c.title}</h3>
          <p style="margin:0;font-size:0.8125rem;color:#a1a1aa;line-height:1.6;">${c.body}</p>
        </div>
      `).join('')}
    </div>

    ${h2('Frequently Asked Questions')}

    ${[
      ['Why does the app say my account wasn\'t found?',
       'Account data is stored in your browser\'s local storage. If you switch browsers, clear browser data, or use a different device, the app won\'t find your local account. Entering your email and password again will log you in via Supabase cloud — or create a new account if you never enabled cloud sync.'],
      ['Does the app work during load shedding?',
       'Yes. Industrial ERP is offline-first — all core features (POS, inventory, ledger) work without an internet connection. Your data syncs automatically when you\'re back online.'],
      ['How do I get my data back after clearing my browser?',
       'If you registered with a real email and had cloud sync enabled, log in with the same email and password — your account will be restored from Supabase. If you used a local-only account, that data is gone. Always enable cloud sync to protect your data.'],
      ['How do I export my data?',
       'Go to Settings → Data & Storage → Download Backup (JSON). This downloads a full export of all your business data. You can also export transactions and inventory to CSV from PocketBooks and PoolStock respectively.'],
      ['How do I add staff members?',
       'Go to Settings → Team → Add Team Member. You can set a 4-digit POS PIN for each staff member so they can switch users at the till without entering a full password.'],
      ['The QR payment button isn\'t working.',
       'You need to set your Merchant ID first. Go to Settings → Financials → Mobile Money / QR Merchant ID and enter your M-Pesa, Capitec Pay, or SnapScan merchant number.'],
      ['Can I use the app on my phone?',
       'Yes — the app is a Progressive Web App (PWA). Open it in your phone\'s browser and tap "Add to Home Screen" to install it as an app icon. The search (magnifying glass icon in the top bar) and all features work on mobile.'],
      ['How does loyalty points work?',
       'Customers earn 1 point for every R10 spent. At the POS, when you select a customer, their points balance shows. Tap "Redeem" to apply points as a discount (10 points = R1 off). Points are automatically awarded after each sale.'],
    ].map(([q, a]) => `
      <div style="border-bottom:1px solid rgba(255,255,255,0.05);padding:1.25rem 0;">
        <h3 style="margin:0 0 0.5rem;font-size:0.9375rem;font-weight:700;color:#f4f4f5;">${q}</h3>
        <p style="margin:0;color:#a1a1aa;line-height:1.65;font-size:0.875rem;">${a}</p>
      </div>
    `).join('')}

    ${h2('Contact Us')}
    ${p(`For anything not covered here, email us at <a href="mailto:${CONTACT_EMAIL}" style="color:#60a5fa;">${CONTACT_EMAIL}</a>. Please include your business name and a brief description of the issue.`)}
  `);
}

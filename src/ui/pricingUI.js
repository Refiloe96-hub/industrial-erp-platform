export default class PricingUI {
  static async render(container, currentUser) {
    const businessType = currentUser?.businessType || 'shopowner';
    const businessName = currentUser?.businessName || 'Your Business';

    // Pricing Data per Business Type
    const PRICING_DATA = {
      // 🏪 SHOP OWNER (Informal / Spaza)
      shopowner: [
        {
          id: 'starter',
          name: 'Spaza Starter',
          price: 'Free',
          period: 'forever',
          description: 'Essentials for running a single shop.',
          features: [
            '<i class="ph-duotone ph-notebook"></i> Digital Cash Book',
            '<i class="ph-duotone ph-chart-bar"></i> Daily Sales Reports',
            '<i class="ph-duotone ph-wifi-slash"></i> Offline Access',
            '<i class="ph-duotone ph-user"></i> 1 User Limit'
          ],
          btnClass: 'btn-secondary',
          highlight: false
        },
        {
          id: 'pro',
          name: 'Spaza Pro',
          price: 'R89',
          period: 'per month',
          description: 'Grow your profits with smart insights.',
          features: [
            '<i class="ph-duotone ph-chart-line-up"></i> Profit/Loss Analytics',
            '<i class="ph-duotone ph-shopping-bag"></i> Top Selling Items',
            '<i class="ph-duotone ph-receipt"></i> Digital Receipts',
            '<i class="ph-duotone ph-users"></i> 2 Staff Logins'
          ],
          btnClass: 'btn-white',
          highlight: true,
          tag: 'MOST POPULAR'
        },
        {
          id: 'chain',
          name: 'Super Spaza',
          price: 'R199',
          period: 'per month',
          description: 'Manage multiple locations easily.',
          features: [
            '<i class="ph-duotone ph-link"></i> Multi-Branch Support',
            '<i class="ph-duotone ph-package"></i> Central Inventory',
            '<i class="ph-duotone ph-truck"></i> Supplier Management',
            '<i class="ph-duotone ph-shield-check"></i> Theft Protection'
          ],
          btnClass: 'btn-white',
          highlight: false
        }
      ],

      // 📦 TRADER (Wholesaler / Distributor)
      trader: [
        {
          id: 'starter',
          name: 'Depot Starter',
          price: 'Free',
          period: 'forever',
          description: 'Basic stock tracking for small depots.',
          features: [
            '<i class="ph-duotone ph-package"></i> PoolStock Basic',
            '<i class="ph-duotone ph-clipboard-text"></i> Order Management',
            '<i class="ph-duotone ph-device-mobile"></i> 1 Device',
            '<i class="ph-duotone ph-warning-circle"></i> Stock Level Alerts'
          ],
          btnClass: 'btn-secondary',
          highlight: false
        },
        {
          id: 'pro',
          name: 'Trader Pro',
          price: 'R250',
          period: 'per month',
          description: 'Advanced logistics for busy traders.',
          features: [
            '<i class="ph-duotone ph-truck"></i> Fleet Tracking',
            '<i class="ph-duotone ph-trend-down"></i> Bulk Discount Engine',
            '<i class="ph-duotone ph-file-text"></i> Invoicing & Waybills',
            '<i class="ph-duotone ph-users"></i> 5 Staff Logins'
          ],
          btnClass: 'btn-primary',
          highlight: true,
          tag: 'RECOMMENDED'
        },
        {
          id: 'enterprise',
          name: 'National Hub',
          price: 'R950',
          period: 'per month',
          description: 'Full scale distribution network.',
          features: [
            '<i class="ph-duotone ph-globe"></i> Regional Analytics',
            '<i class="ph-duotone ph-handshake"></i> B2B Syndicate Portal',
            '<i class="ph-duotone ph-credit-card"></i> PocketWallet API',
            '<i class="ph-duotone ph-factory"></i> Unlimited Warehouses'
          ],
          btnClass: 'btn-white',
          highlight: false
        }
      ],

      // 🏭 WAREHOUSE
      warehouse: [
        {
          id: 'starter',
          name: 'Storage Basic',
          price: 'R150',
          period: 'per month',
          description: 'Digitalize your stock sheets.',
          features: [
            '<i class="ph-duotone ph-map-pin"></i> Bin Location Tracking',
            '<i class="ph-duotone ph-arrows-left-right"></i> Stock In/Out Logs',
            '<i class="ph-duotone ph-barcode"></i> Barcode Scanning',
            '<i class="ph-duotone ph-users"></i> 3 Users'
          ],
          btnClass: 'btn-white',
          highlight: false
        },
        {
          id: 'pro',
          name: 'Smart Warehouse',
          price: 'R450',
          period: 'per month',
          description: 'Optimize space and flow.',
          features: [
            '<i class="ph-duotone ph-brain"></i> AI Demand Forecasting',
            '<i class="ph-duotone ph-gear-six"></i> Automated Reordering',
            '<i class="ph-duotone ph-calendar-x"></i> Expiry Date Alerts',
            '<i class="ph-duotone ph-truck"></i> Dispatch Management'
          ],
          btnClass: 'btn-primary',
          highlight: true,
          tag: 'AI POWERED'
        },
        {
          id: 'enterprise',
          name: 'Logistics Center',
          price: 'Custom',
          period: 'contact us',
          description: 'Complex 3PL operations.',
          features: [
            '<i class="ph-duotone ph-plugs-connected"></i> ERP Integrations',
            '<i class="ph-duotone ph-robot"></i> Robotics API',
            '<i class="ph-duotone ph-shield-check"></i> Advanced Security',
            '<i class="ph-duotone ph-headset"></i> 24/7 Support'
          ],
          btnClass: 'btn-white',
          highlight: false
        }
      ],

      // ⚙️ MANUFACTURER
      manufacturer: [
        {
          id: 'starter',
          name: 'Workshop',
          price: 'Free',
          period: 'forever',
          description: 'Track production for small workshops.',
          features: [
            '<i class="ph-duotone ph-gear"></i> SmartShift Basic',
            '<i class="ph-duotone ph-hammer"></i> Job Cards',
            '<i class="ph-duotone ph-timer"></i> Time Tracking',
            '<i class="ph-duotone ph-clipboard-text"></i> Output Logs'
          ],
          btnClass: 'btn-secondary',
          highlight: false
        },
        {
          id: 'pro',
          name: 'Factory Ops',
          price: 'R750',
          period: 'per month',
          description: 'Optimize lines and reduce downtime.',
          features: [
            '<i class="ph-duotone ph-warning-circle"></i> AI Maintenance Alerts',
            '<i class="ph-duotone ph-trend-down"></i> Cost Per Unit Analysis',
            '<i class="ph-duotone ph-lightning"></i> Energy Monitoring',
            '<i class="ph-duotone ph-factory"></i> Unlimited Shifts'
          ],
          btnClass: 'btn-primary',
          highlight: true,
          tag: 'BEST VALUE'
        },
        {
          id: 'enterprise',
          name: 'Industrial',
          price: 'Custom',
          period: 'contact us',
          description: 'For large scale production facilities.',
          features: [
            '<i class="ph-duotone ph-globe"></i> Supply Chain Tower',
            '<i class="ph-duotone ph-cpu"></i> IoT Machine Integration',
            '<i class="ph-duotone ph-clipboard-check"></i> Compliance Audits',
            '<i class="ph-duotone ph-handshake"></i> Syndicate Sourcing'
          ],
          btnClass: 'btn-white',
          highlight: false
        }
      ]
    };

    // Default to 'shopowner' if type not found, or merge trader/warehouse if needed
    // The user explicitly asked for 'warehouse' specific pricing.
    let plans = PRICING_DATA[businessType] || PRICING_DATA['shopowner'];

    // Helper to determine button state
    // For now, since these are tiers WITHIN a type, we assume "Current Plan" is tracked by 'planLevel' or similar in user object.
    // simpler: If price is 'Free', it's likely current. 
    // REALITY: We need to store 'planId' in user object.
    const currentPlanId = currentUser?.planId || 'starter';

    const getBtnState = (plan) => {
      if (plan.price === 'Custom') return { text: 'Contact Sales', disabled: false, action: 'contact' };
      if (plan.id === currentPlanId) return { text: 'Current Plan', disabled: true, action: 'none' };

      // Simple hierarchy: starter < pro < enterprise/chain
      const levels = ['starter', 'pro', 'chain', 'enterprise'];
      const currentIdx = levels.indexOf(currentPlanId);
      const planIdx = levels.indexOf(plan.id);

      if (planIdx > currentIdx) return { text: `Upgrade`, disabled: false, action: 'upgrade' };
      if (planIdx < currentIdx && planIdx !== -1) return { text: 'Downgrade', disabled: false, action: 'downgrade' };

      return { text: 'Select Plan', disabled: false, action: 'upgrade' };
    };

    container.innerHTML = `
      <div class="pricing-container fade-in">
        <div class="pricing-header">
          <button class="btn btn-sm btn-outline-light back-btn">
            ← Back to Dashboard
          </button>
          <h1>Plans for ${businessType.charAt(0).toUpperCase() + businessType.slice(1)}s</h1>
          <p>Tailored tools for <strong>${businessName}</strong> to scale efficiently.</p>
        </div>
        
        <div class="pricing-grid">
          ${plans.map(plan => {
      const state = getBtnState(plan);
      return `
            <div class="pricing-card ${plan.highlight ? 'highlight' : ''} ${plan.id === currentPlanId ? 'current-plan' : ''}">
              ${plan.tag ? `<div class="pricing-tag">${plan.tag}</div>` : ''}
              <h3 class="plan-name">${plan.name}</h3>
              <div class="plan-price">
                <span class="currency">${plan.price === 'Free' || plan.price === 'Custom' ? '' : ''}</span>
                <span class="amount">${plan.price}</span>
                <span class="period">/${plan.period}</span>
              </div>
              <p class="plan-desc">${plan.description}</p>
              
              <button class="btn ${plan.btnClass} btn-block plan-btn" 
                data-id="${plan.id}" 
                data-action="${state.action}"
                ${state.disabled ? 'disabled' : ''}>
                ${state.text}
              </button>
              
              <div class="plan-features">
                ${plan.features.map(feature => `
                  <div class="feature-item">
                    <span class="check"><i class="ph-fill ph-check-circle"></i></span>
                    <span>${feature}</span>
                  </div>
                `).join('')}
              </div>
            </div>
            `;
    }).join('')}
        </div>
        
        <div style="text-align: center; margin-top: 3rem; color: #6b7280;">
            <p>Need a different business type? <a href="#" id="change-biz-type" style="color: #6366f1;">Contact Support</a> to switch vertical.</p>
        </div>
      </div>
      ${this.renderSupportModal(businessType)}
      
      <style>
        .pricing-container {
          padding: 2rem;
          color: var(--text-primary);
          max-width: 1600px;
          margin: 0 auto;
        }

        .pricing-header {
          text-align: center;
          margin-bottom: 3rem;
        }

        .pricing-header h1 {
          font-size: 2.5rem;
          margin-bottom: 1rem;
          background: linear-gradient(to right, #fff, #94a3b8);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .pricing-header p {
          color: #94a3b8;
          font-size: 1.1rem;
        }

        .pricing-grid {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 1.5rem;
        }

        .pricing-card {
          flex: 1 1 260px;
          max-width: 350px;
          background: var(--bg-primary);
          border: 1px solid var(--border-color);
          border-radius: 16px;
          padding: 2rem;
          display: flex;
          flex-direction: column;
          position: relative;
          transition: transform 0.2s, border-color 0.2s;
        }

        .pricing-card:hover {
          transform: translateY(-5px);
          border-color: #6366f1;
        }

        .plan-btn {
          cursor: pointer;
        }

        .pricing-card.highlight {
          background: linear-gradient(145deg, #1e293b, #0f172a);
          border: 1px solid #6366f1;
          box-shadow: 0 0 20px rgba(99, 102, 241, 0.2);
        }

        .pricing-tag {
          position: absolute;
          top: -12px;
          right: 20px;
          background: #6366f1;
          color: white;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: bold;
          text-transform: uppercase;
        }

        .plan-name {
          font-size: 1.25rem;
          font-weight: 600;
          margin-bottom: 1rem;
          color: var(--text-primary);
        }

        .plan-price {
          display: flex;
          align-items: baseline;
          margin-bottom: 0.5rem;
        }

        .amount {
          font-size: 2.5rem;
          font-weight: 700;
          color: var(--text-primary);
        }

        .period {
          color: #94a3b8;
          margin-left: 0.5rem;
          font-size: 0.9rem;
        }

        .plan-desc {
          color: var(--text-secondary);
          margin-bottom: 2rem;
          font-size: 0.9rem;
          line-height: 1.5;
        }

        .plan-features {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          margin-top: 2rem;
        }

        .feature-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-size: 0.9rem;
          color: var(--text-secondary);
        }

        .check {
          color: #6366f1;
        }

        .btn-white {
          background: white;
          color: black;
        }

        .btn-white:hover {
          background: #f1f5f9;
        }

        .btn-secondary {
          background: #334155;
          color: white;
        }

        .btn-secondary:hover {
          background: #475569;
        }

        @media (max-width: 768px) {
          .pricing-grid {
            grid-template-columns: 1fr;
          }
        }

        .fade-in {
          animation: fadeIn 0.3s ease-in;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      </style>
    `;

    // Wire up back button
    container.querySelector('.back-btn').addEventListener('click', () => {
      document.dispatchEvent(new CustomEvent('navigate-to', { detail: 'dashboard' }));
    });

    // Wire up Support Modal
    const supportModal = container.querySelector('#pricing-support-modal');
    const closeSupport = container.querySelector('#close-pricing-support');

    container.querySelector('#change-biz-type')?.addEventListener('click', (e) => {
      e.preventDefault();
      supportModal.style.display = 'flex';
    });

    closeSupport?.addEventListener('click', () => {
      supportModal.style.display = 'none';
    });

    container.querySelector('#pricing-support-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const msg = container.querySelector('#pricing-support-msg').value;
      const targetType = container.querySelector('#pricing-target-type').value;
      alert(`📧 Support request sent for migration to ${targetType}! We'll be in touch.`);
      supportModal.style.display = 'none';
    });

  }

  /**
   * NOTE: Styles for pricing are in HTML template above
   */
  static renderStyles() {
    // Styles are handled inline in the template
    return '';
  }

  static renderSupportModal(currentType) {
    return `
      <div id="pricing-support-modal" class="modal" style="display: none; position: fixed; inset: 0; z-index: 2100; align-items: center; justify-content: center;">
    <div class="modal-content" style="width: 90%; max-width: 450px;">
      <div class="modal-header">
        <h2 style="color: var(--text-primary);"><i class="ph-duotone ph-headset"></i> Contact Support</h2>
        <button class="btn-icon" id="close-pricing-support"><i class="ph-bold ph-x"></i></button>
      </div>
      <div class="modal-body">
        <p class="text-sm text-muted mb-4">To switch your business vertical (e.g. from Shop to Warehouse), please let us know below. This requires a manual account migration.</p>
        <form id="pricing-support-form">
          <div class="form-group">
            <label style="color: var(--text-primary);">Current Type</label>
            <input type="text" value="${currentType}" disabled class="bg-gray-100" style="width: 100%; padding: 0.5rem; border: 1px solid #ccc; border-radius: 4px;">
          </div>
          <div class="form-group">
            <label style="color: var(--text-primary);">Requested Type</label>
            <select id="pricing-target-type" style="width: 100%; padding: 0.5rem; border: 1px solid #ccc; border-radius: 4px;">
              <option>Spaza Shop / Retail</option>
              <option>Warehouse / Distribution</option>
              <option>Manufacturing / Factory</option>
            </select>
          </div>
          <div class="form-group">
            <label style="color: var(--text-primary);">Message</label>
            <textarea id="pricing-support-msg" rows="3" style="width: 100%; padding: 0.5rem; border: 1px solid #ccc; border-radius: 4px;" placeholder="Please migrate my account..."></textarea>
          </div>
          <button type="submit" class="btn btn-primary w-100" style="margin-top: 1rem;">Send Request</button>
        </form>
      </div>
      </div>
    </div>
    `;
  }
}

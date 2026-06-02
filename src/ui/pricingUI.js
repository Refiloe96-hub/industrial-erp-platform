export default class PricingUI {
  static async render(container, currentUser) {
    const businessType = currentUser?.businessType || 'shopowner';
    const businessName = currentUser?.businessName || 'Your Business';

    // Unified pricing tiers — same price points across all business types,
    // different feature descriptions per type.
    const TIER_PRICES = {
      starter: { price: 'Free',  period: 'forever',   tag: null,          btnClass: 'btn-secondary', highlight: false },
      growth:  { price: 'R149',  period: 'per month',  tag: 'MOST POPULAR', btnClass: 'btn-primary',   highlight: true  },
      business:{ price: 'R349',  period: 'per month',  tag: null,          btnClass: 'btn-white',     highlight: false },
    };

    const PRICING_DATA = {
      // Spaza / Shop Owner
      shopowner: [
        {
          id: 'starter', ...TIER_PRICES.starter,
          name: 'Starter',
          description: 'Core tools to run your shop offline — no internet required.',
          features: [
            '<i class="ph-duotone ph-storefront"></i> POS & daily sales',
            '<i class="ph-duotone ph-notebook"></i> PocketBooks ledger',
            '<i class="ph-duotone ph-wifi-slash"></i> Works offline (load shedding)',
            '<i class="ph-duotone ph-package"></i> Up to 200 products',
          ],
        },
        {
          id: 'growth', ...TIER_PRICES.growth,
          name: 'Growth',
          description: 'Cloud backup and richer tools as your shop expands.',
          features: [
            '<i class="ph-duotone ph-cloud-arrow-up"></i> Cloud sync & daily backup',
            '<i class="ph-duotone ph-package"></i> Unlimited products',
            '<i class="ph-duotone ph-star"></i> Loyalty & credit tracking',
            '<i class="ph-duotone ph-users"></i> Up to 3 staff members',
          ],
        },
        {
          id: 'business', ...TIER_PRICES.business,
          name: 'Business',
          description: 'Full platform for shops running multiple staff and suppliers.',
          features: [
            '<i class="ph-duotone ph-handshake"></i> TrustCircle syndicates',
            '<i class="ph-duotone ph-truck"></i> Supplier management',
            '<i class="ph-duotone ph-users-three"></i> Unlimited staff + PIN login',
            '<i class="ph-duotone ph-trend-up"></i> Advanced reports & exports',
          ],
        },
      ],

      // Trader / Wholesaler / Distributor
      trader: [
        {
          id: 'starter', ...TIER_PRICES.starter,
          name: 'Starter',
          description: 'Basic stock tracking to get your depot digital.',
          features: [
            '<i class="ph-duotone ph-package"></i> PoolStock inventory',
            '<i class="ph-duotone ph-clipboard-text"></i> Purchase orders',
            '<i class="ph-duotone ph-wifi-slash"></i> Offline access',
            '<i class="ph-duotone ph-warning-circle"></i> Low-stock alerts',
          ],
        },
        {
          id: 'growth', ...TIER_PRICES.growth,
          name: 'Growth',
          description: 'Sync across devices and start managing customers.',
          features: [
            '<i class="ph-duotone ph-cloud-arrow-up"></i> Cloud sync & backup',
            '<i class="ph-duotone ph-receipt"></i> Invoicing & waybills',
            '<i class="ph-duotone ph-star"></i> Customer credit tracking',
            '<i class="ph-duotone ph-users"></i> Up to 3 staff members',
          ],
        },
        {
          id: 'business', ...TIER_PRICES.business,
          name: 'Business',
          description: 'Scale your distribution with syndicates and advanced tools.',
          features: [
            '<i class="ph-duotone ph-handshake"></i> TrustCircle bulk buying',
            '<i class="ph-duotone ph-truck"></i> Supplier & fleet management',
            '<i class="ph-duotone ph-users-three"></i> Unlimited team members',
            '<i class="ph-duotone ph-trend-up"></i> Full financial reports',
          ],
        },
      ],

      // Warehouse
      warehouse: [
        {
          id: 'starter', ...TIER_PRICES.starter,
          name: 'Starter',
          description: 'Replace paper stock sheets with a digital system.',
          features: [
            '<i class="ph-duotone ph-package"></i> Stock in/out tracking',
            '<i class="ph-duotone ph-barcode"></i> Barcode scanning',
            '<i class="ph-duotone ph-wifi-slash"></i> Offline access',
            '<i class="ph-duotone ph-warning-circle"></i> Reorder alerts',
          ],
        },
        {
          id: 'growth', ...TIER_PRICES.growth,
          name: 'Growth',
          description: 'Cloud sync and full procurement management.',
          features: [
            '<i class="ph-duotone ph-cloud-arrow-up"></i> Cloud sync & backup',
            '<i class="ph-duotone ph-clipboard-text"></i> Purchase orders',
            '<i class="ph-duotone ph-chart-line-up"></i> Demand forecasting',
            '<i class="ph-duotone ph-users"></i> Up to 3 staff members',
          ],
        },
        {
          id: 'business', ...TIER_PRICES.business,
          name: 'Business',
          description: 'Full warehouse operations with suppliers and team.',
          features: [
            '<i class="ph-duotone ph-truck"></i> Supplier management',
            '<i class="ph-duotone ph-handshake"></i> TrustCircle syndicates',
            '<i class="ph-duotone ph-users-three"></i> Unlimited team members',
            '<i class="ph-duotone ph-trend-up"></i> Advanced analytics & exports',
          ],
        },
      ],

      // Manufacturer
      manufacturer: [
        {
          id: 'starter', ...TIER_PRICES.starter,
          name: 'Starter',
          description: 'Track production runs for small workshops.',
          features: [
            '<i class="ph-duotone ph-gear"></i> SmartShift production',
            '<i class="ph-duotone ph-hammer"></i> Job cards & output logs',
            '<i class="ph-duotone ph-wifi-slash"></i> Offline access',
            '<i class="ph-duotone ph-timer"></i> Time tracking',
          ],
        },
        {
          id: 'growth', ...TIER_PRICES.growth,
          name: 'Growth',
          description: 'Cloud backup and machine management for growing factories.',
          features: [
            '<i class="ph-duotone ph-cloud-arrow-up"></i> Cloud sync & backup',
            '<i class="ph-duotone ph-factory"></i> Machine health tracking',
            '<i class="ph-duotone ph-trend-down"></i> Cost per unit analysis',
            '<i class="ph-duotone ph-users"></i> Up to 3 staff members',
          ],
        },
        {
          id: 'business', ...TIER_PRICES.business,
          name: 'Business',
          description: 'Full operations with suppliers, shifts, and team management.',
          features: [
            '<i class="ph-duotone ph-truck"></i> Raw material suppliers',
            '<i class="ph-duotone ph-handshake"></i> TrustCircle sourcing',
            '<i class="ph-duotone ph-users-three"></i> Unlimited team + PIN login',
            '<i class="ph-duotone ph-trend-up"></i> Advanced reports & exports',
          ],
        },
      ],
    };

    // Default to 'shopowner' if type not found, or merge trader/warehouse if needed
    // The user explicitly asked for 'warehouse' specific pricing.
    let plans = PRICING_DATA[businessType] || PRICING_DATA['shopowner'];

    // Helper to determine button state
    // For now, since these are tiers WITHIN a type, we assume "Current Plan" is tracked by 'planLevel' or similar in user object.
    const currentPlanId = currentUser?.planId || 'starter';
    const TIER_ORDER = ['starter', 'growth', 'business'];

    const getBtnState = (plan) => {
      if (plan.id === currentPlanId) return { text: 'Current Plan', disabled: true, action: 'none' };
      const currentIdx = TIER_ORDER.indexOf(currentPlanId);
      const planIdx    = TIER_ORDER.indexOf(plan.id);
      if (planIdx > currentIdx) return { text: 'Upgrade', disabled: false, action: 'upgrade' };
      if (planIdx < currentIdx) return { text: 'Downgrade', disabled: false, action: 'downgrade' };

      return { text: 'Select Plan', disabled: false, action: 'upgrade' };
    };

    container.innerHTML = `
      <div class="pricing-container fade-in">
        <div class="pricing-header">
          <button class="btn btn-sm btn-outline-light back-btn">
            ← Back to Dashboard
          </button>
          <h1>Simple, transparent pricing</h1>
          <p>Plans for <strong>${businessName}</strong> — upgrade or downgrade any time.</p>
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
            <p>Need a different business type? <a href="#" id="change-biz-type" style="color: #2563eb;">Contact Support</a> to switch vertical.</p>
        </div>
      </div>
      ${this.renderSupportModal(businessType)}
      
      <style>
        .pricing-container {
          padding: 2rem;
          color: var(--text-primary);
          max-width: 1200px;
          margin: 0 auto;
        }

        .pricing-header {
          text-align: center;
          margin-bottom: 3rem;
        }

        .pricing-header h1 {
          font-size: 2.5rem;
          margin-bottom: 1rem;
          background: linear-gradient(to right, #ffffff, rgba(255,255,255,0.6));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .pricing-header p {
          color: var(--text-secondary);
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
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-lg);
          padding: 2.5rem 2rem;
          display: flex;
          flex-direction: column;
          position: relative;
          transition: transform 0.2s, border-color 0.2s, box-shadow 0.2s;
          box-shadow: var(--shadow-md);
        }

        .pricing-card:hover {
          transform: translateY(-5px);
          border-color: var(--accent-primary);
        }

        .plan-btn {
          cursor: pointer;
          border-radius: var(--radius-full);
          padding: 0.75rem 1.5rem;
          font-weight: 500;
          transition: all 0.2s;
        }

        .pricing-card.highlight {
          background: linear-gradient(145deg, rgba(37, 99, 235, 0.05), rgba(0, 0, 0, 0.2));
          border: 1px solid var(--accent-primary);
          box-shadow: 0 0 30px rgba(37, 99, 235, 0.15);
        }

        .pricing-card.highlight:hover {
          box-shadow: 0 0 40px rgba(37, 99, 235, 0.25);
        }

        .pricing-tag {
          position: absolute;
          top: -12px;
          right: 20px;
          background: var(--accent-primary);
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
          color: var(--text-secondary);
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
          color: var(--accent-primary);
        }

        .btn-white {
          background: rgba(255, 255, 255, 0.9);
          color: #000;
          border: none;
        }

        .btn-white:hover { background: #f1f5f9; }

        .btn-primary {
          background: var(--accent-primary);
          color: #fff;
          border: none;
        }

        .btn-primary:hover {
          background: var(--accent-hover);
          transform: translateY(-1px);
        }

        .btn-secondary {
          background: rgba(255, 255, 255, 0.1);
          color: var(--text-primary);
          border: 1px solid var(--border-color);
          backdrop-filter: blur(8px);
        }

        .btn-secondary:hover {
          background: rgba(255, 255, 255, 0.15);
          border-color: rgba(255, 255, 255, 0.3);
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

    // Wire up plan buttons (Upgrade / Downgrade / Select Plan)
    container.querySelectorAll('.plan-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const planId = btn.dataset.id;
        const action = btn.dataset.action;
        if (!planId || action === 'none') return;

        const plan = plans.find(p => p.id === planId);
        if (!plan) return;

        // Confirm downgrade
        if (action === 'downgrade') {
          const ok = confirm(`Downgrade to ${plan.name}? You may lose access to features on your current plan.`);
          if (!ok) return;
        }

        // Persist the new plan
        try {
          // Update localStorage user
          const userData = (() => { try { return JSON.parse(localStorage.getItem('currentUser')) ?? {}; } catch { return {}; } })();
          userData.planId = planId;
          userData.planName = plan.name;
          localStorage.setItem('currentUser', JSON.stringify(userData));

          // Also update IndexedDB if db is available
          try {
            const { default: db } = await import('../db/index.js');
            const users = await db.getAll('users');
            const me = users.find(u => u.username === userData.username || u.id === userData.id);
            if (me) {
              me.planId = planId;
              me.planName = plan.name;
              await db.put('users', me);
            }
          } catch (dbErr) {
            console.warn('DB plan update skipped:', dbErr.message);
          }

          // Visual feedback: show toast
          const toast = document.createElement('div');
          toast.style.cssText = 'position:fixed;bottom:1.5rem;left:50%;transform:translateX(-50%);background:#16a34a;color:#fff;padding:0.75rem 1.5rem;border-radius:8px;font-weight:600;z-index:9999;box-shadow:0 4px 12px rgba(0,0,0,0.2);transition:opacity 0.3s;';
          toast.textContent = `✓ ${action === 'downgrade' ? 'Downgraded' : 'Upgraded'} to ${plan.name}`;
          document.body.appendChild(toast);
          setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 2500);

          // Re-render the pricing page to update button states
          await PricingUI.render(container, { ...currentUser, planId, planName: plan.name });

        } catch (err) {
          alert('Could not save plan change. Please try again. (' + err.message + ')');
          console.error('Plan change error:', err);
        }
      });
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
      alert(`Support request sent. We'll be in touch about your migration to ${targetType}.`);
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
        <h2 style="color:var(--text-primary);font-size:1rem;font-weight:700;margin:0 0 1rem;">Contact Support</h2>
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

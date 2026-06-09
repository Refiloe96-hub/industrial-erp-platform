import { getSession } from '../utils/safeJson.js';
import sales from '../modules/Sales.js';
import Customers from '../modules/Customers.js';
import PoolStock from '../modules/PoolStock.js';
import PocketBooks from '../modules/PocketBooks.js';
import PaymentService from '../services/payments.js';
import HardwareService from '../services/HardwareService.js';
import db, { STORES } from '../db/index.js';

class SalesUI {
  constructor() {
    this.salesModule = sales;
    this.inventory = new PoolStock();
    this.finance = new PocketBooks();
    this.customers = [];
    this.selectedCustomer = null;
  }

  async render(container) {
    const todaySummary = await this.salesModule.getDailySummary();
    const inventory = await this.inventory.getInventory();
    this.customers = await Customers.getAllCustomers();
    
    const config = await db.get('settings', 'config') || {};
    const currency = config.currency || 'ZAR';
    const symArr = { ZAR: 'R ', KES: 'KSh ', NGN: '₦ ', USD: '$', EUR: '€ ' };
    const sym = symArr[currency] || 'R ';
    this.currencySym = sym;

    container.innerHTML = `
      <div class="sales-container">
        ${this.renderStyles()}

        <header class="module-header">
          <div>
            <h1>Point of Sale</h1>
            <p>Sales, checkout &amp; receipts</p>
          </div>
          <div style="display:flex;gap:0.5rem;align-items:center;flex-wrap:wrap">
            <button id="switch-user-btn" class="btn btn-secondary" title="Switch cashier with PIN">
              <i class="ph ph-user-switch"></i> Switch User
            </button>
            <button id="till-reconcile-btn" class="btn btn-secondary">
              <i class="ph ph-calculator"></i> Till Count
            </button>
            <button id="sales-ai-btn" class="btn btn-secondary" style="border:1px solid #2563eb;color:#2563eb">
              Insights
            </button>
          </div>
        </header>

        <!-- Sales summary strip -->
        <div class="fin-bar">
          <div class="fin-bar-item">
            <span class="fin-bar-label">Today's revenue</span>
            <span class="fin-bar-value" style="color:var(--success);">${sym}${todaySummary.revenue.toLocaleString()}</span>
          </div>
          <div class="fin-bar-sep"></div>
          <div class="fin-bar-item">
            <span class="fin-bar-label">Sales</span>
            <span class="fin-bar-value">${todaySummary.totalSales}</span>
          </div>
          <div class="fin-bar-sep"></div>
          <div class="fin-bar-item">
            <span class="fin-bar-label">Avg sale</span>
            <span class="fin-bar-value">${sym}${todaySummary.avgSale.toLocaleString('en-ZA', {maximumFractionDigits: 0})}</span>
          </div>
          <div class="fin-bar-sep"></div>
          <div class="fin-bar-item">
            <span class="fin-bar-label">Products</span>
            <span class="fin-bar-value">${inventory.length}</span>
          </div>
        </div>

        <div class="pos-layout">
          <!-- Left: Product Grid -->
          <div class="product-section">
            <div class="product-toolbar">
              <input type="text" id="product-search" placeholder="Search products…"
                style="flex:1;min-width:0;padding:0.375rem 0.75rem;border:1px solid var(--border);border-radius:6px;background:rgba(255,255,255,0.04);color:var(--text-primary);font-size:0.875rem;font-family:inherit;">
              <button id="sales-scan-btn" class="btn-icon scan-btn" title="Scan Barcode to find product">
                <i class="ph ph-barcode"></i>
              </button>
            </div>
            <div class="category-filters" id="category-filters" style="margin-bottom:0.75rem;">
              <button class="cat-btn active" data-cat="all">All</button>
              ${[...new Set(inventory.map(i => i.category).filter(Boolean))].map(cat => `
                <button class="cat-btn" data-cat="${cat}">${cat}</button>
              `).join('')}
            </div>

            <div class="product-grid" id="product-grid">
              ${this.renderProductGrid(inventory)}
            </div>
          </div>

          <!-- Right: Cart & Checkout -->
          <div class="cart-section">
            <div class="card cart-card">
              <div class="card-header">
                <h3>Current Sale</h3>
                <button id="clear-cart" class="btn-text text-danger">Clear</button>
              </div>
              <div class="card-body">
                <!-- Customer Selector -->
                <div class="customer-selector mb-3">
                  <select id="sale-customer">
                    <option value="">Walk-in customer</option>
                    ${this.customers.map(c => `<option value="${c.id}" data-points="${c.loyaltyPoints||0}">${c.name}${c.loyaltyPoints ? ` · ${c.loyaltyPoints}pts` : ''}</option>`).join('')}
                  </select>
                </div>

                <!-- Loyalty Points Redemption -->
                <div id="loyalty-section" style="display:none;margin-bottom:0.75rem;padding:0.625rem 0.75rem;background:rgba(16,185,129,0.06);border:1px solid rgba(16,185,129,0.15);border-radius:8px;">
                  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.25rem;">
                    <div style="font-size:0.8125rem;">
                      <span style="color:var(--text-muted);">Points balance:</span>
                      <strong id="loyalty-pts-bal" style="color:#34d399;margin-left:0.25rem;">0</strong>
                      <span style="color:var(--text-muted);font-size:0.75rem;"> (10pts = R1)</span>
                    </div>
                    <button id="toggle-redeem-btn" class="btn-text" style="font-size:0.75rem;color:#2563eb;">Redeem</button>
                  </div>
                  <div id="redeem-row" style="display:none;margin-top:0.5rem;display:flex;gap:0.5rem;align-items:center;">
                    <input type="number" id="redeem-pts-input" min="0" step="10" placeholder="Points to redeem"
                      style="flex:1;font-size:0.8125rem;padding:0.3rem 0.5rem;border:1px solid var(--border);border-radius:6px;background:rgba(255,255,255,0.04);color:var(--text-primary);">
                    <button id="apply-redeem-btn" class="btn btn-secondary" style="font-size:0.75rem;padding:0.3rem 0.75rem;white-space:nowrap;">Apply</button>
                    <button id="clear-redeem-btn" class="btn-text text-danger" style="font-size:0.75rem;">✕</button>
                  </div>
                  <p id="redeem-applied-msg" style="display:none;font-size:0.75rem;color:#34d399;margin:0.375rem 0 0;">
                    <i class="ph ph-check"></i> <span id="redeem-applied-text"></span>
                  </p>
                </div>

                <div class="cart-items" id="cart-items">
                  <p class="text-muted text-center" id="empty-cart-msg">Tap items to add</p>
                </div>

                <div class="cart-summary">
                  <div class="summary-row subtotal-row">
                    <span>Subtotal:</span>
                    <span id="cart-subtotal">${sym}0.00</span>
                  </div>
                  <div class="summary-row vat-row">
                    <span>Includes VAT (${config.taxRate || 15}%):</span>
                    <span id="cart-vat">${sym}0.00</span>
                  </div>
                  <div class="summary-row" id="loyalty-discount-row" style="display:none;color:#34d399;">
                    <span>Loyalty discount:</span>
                    <span id="cart-loyalty">-${sym}0.00</span>
                  </div>
                  <div class="summary-row total-row">
                    <span>Total:</span>
                    <span id="cart-total">${sym}0.00</span>
                  </div>
                </div>

                <div class="payment-methods">
                  <label class="payment-option">
                    <input type="radio" name="payment" value="cash" checked>
                    <i class="ph-duotone ph-money"></i>
                    <span class="pay-label">Cash</span>
                  </label>
                  <label class="payment-option">
                    <input type="radio" name="payment" value="card">
                    <i class="ph-duotone ph-credit-card"></i>
                    <span class="pay-label">Card</span>
                  </label>
                  <label class="payment-option">
                    <input type="radio" name="payment" value="mobile">
                    <i class="ph-duotone ph-device-mobile"></i>
                    <span class="pay-label">Mobile</span>
                  </label>
                  <label class="payment-option">
                    <input type="radio" name="payment" value="mpesa">
                    <i class="ph-duotone ph-qr-code"></i>
                    <span class="pay-label">QR</span>
                  </label>
                  <label class="payment-option" id="credit-payment-option" style="display:none;">
                    <input type="radio" name="payment" value="credit">
                    <i class="ph-duotone ph-hand-coins"></i>
                    <span class="pay-label">Credit</span>
                  </label>
                </div>

                <div id="mpesa-qr-container" style="display: none; text-align: center; margin-bottom: 1rem; border: 1px dashed var(--border-strong); padding: 1rem; border-radius: 8px;">
                  ${config.mpesaMerchantId
                    ? `<p style="margin-bottom:0.5rem;font-weight:600;">Scan to Pay</p>
                       <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(config.mpesaMerchantId)}" alt="QR Code" style="width:150px;height:150px;border-radius:6px;">
                       <p style="font-size:0.75rem;color:var(--text-muted);margin-top:0.5rem;">Merchant: ${config.mpesaMerchantId}</p>`
                    : `<p style="font-size:0.875rem;color:var(--text-muted);">Set your Merchant ID in <strong>Settings → Financials</strong> to enable QR payments.</p>`
                  }
                </div>

                <button id="checkout-btn" class="btn btn-primary btn-lg btn-block" disabled>
                  Charge ${sym}0
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    this.attachHandlers(container, inventory);
  }

  renderProductGrid(items) {
    const sorted = [...items].sort((a, b) => (b.reorderLevel || 0) - (a.reorderLevel || 0));

    const openItemBtn = `
      <button class="product-card open-item-btn" style="border-left: 4px solid #2563eb;">
        <div class="prod-name" style="color: var(--text-primary);">Open Item</div>
        <div class="prod-price" style="font-size: 1rem; color: #2563eb;">Enter Price</div>
        <div class="prod-stock">Custom Sale</div>
      </button>
    `;

    const modal = `
      <dialog id="open-item-modal" style="border: none; border-radius: 12px; padding: 2rem; box-shadow: 0 10px 25px rgba(0,0,0,0.4); width: 300px; background: var(--bg-primary, #1e293b); color: var(--text-primary, #f8fafc);">
        <h3 style="margin-top: 0; color: var(--text-primary, #f8fafc);">Open Item</h3>
        <input type="text" id="open-item-name" placeholder="Item Name (Optional)" style="width: 100%; padding: 0.75rem; border: 1px solid var(--border, #334155); border-radius: 8px; margin-bottom: 1rem; box-sizing: border-box; background: var(--bg-secondary, #0f172a); color: var(--text-primary, #f8fafc); font-size: 0.95rem;">
        <input type="number" id="open-item-price" placeholder="Price (${this.currencySym})" style="width: 100%; padding: 0.75rem; border: 1px solid var(--border, #334155); border-radius: 8px; margin-bottom: 1rem; font-size: 1.5rem; text-align: center; box-sizing: border-box; background: var(--bg-secondary, #0f172a); color: var(--text-primary, #f8fafc);" step="0.01">
        <div style="display: flex; gap: 0.5rem;">
          <button id="cancel-open-item" style="flex: 1; padding: 0.75rem; border: 1px solid var(--border, #334155); background: var(--bg-secondary, #0f172a); color: var(--text-primary, #f8fafc); border-radius: 8px; cursor: pointer; font-size: 0.95rem;">Cancel</button>
          <button id="add-open-item" style="flex: 1; padding: 0.75rem; border: none; background: #2563eb; color: white; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 0.95rem;">Add</button>
        </div>
      </dialog>
    `;

    const existing = document.getElementById('open-item-modal');
    if (existing) existing.remove();
    document.body.insertAdjacentHTML('beforeend', modal);

    return openItemBtn + sorted.map(item => {
      const price = item.unitPrice || item.unitCost || 0;
      return `
      <button class="product-card" data-sku="${item.sku}" data-price="${price}" data-name="${item.name}" style="border-left: 4px solid ${item.color || '#ccc'}">
        <div class="prod-name">${item.name}</div>
        <div class="prod-price">${this.currencySym}${price}</div>
        <div class="prod-stock ${item.quantity === 0 ? 'out-of-stock' : ''}">
          ${item.quantity} left
        </div>
      </button>
    `}).join('');
  }

  attachHandlers(container, inventory) {
    const grid = container.querySelector('#product-grid');
    const cartItemsContainer = container.querySelector('#cart-items');
    const clearBtn = container.querySelector('#clear-cart');
    const checkoutBtn = container.querySelector('#checkout-btn');
    const categoryFilters = container.querySelector('#category-filters');

    let cart = [];

    // Switch User via PIN
    container.querySelector('#switch-user-btn')?.addEventListener('click', async () => {
      await this.showPINSwitcher();
    });

    // Till Reconciliation
    container.querySelector('#till-reconcile-btn')?.addEventListener('click', async () => {
      await this.showTillReconciliation();
    });

    // AI Insights Button
    container.querySelector('#sales-ai-btn')?.addEventListener('click', async () => {
      const { default: aiEngine } = await import('../services/aiEngine.js');
      const { showDetailPanel, dpKV, dpBar } = await import('./panelHelper.js');
      const salesHistory = await db.getAll(STORES.transactions);
      const inventoryItems = await db.getAll(STORES.inventory);
      const result = aiEngine.analyzeSales(salesHistory, inventoryItems);

      const sevColors = { critical: '#ef4444', warning: '#f59e0b', good: '#10b981' };

      const apiKey = aiEngine.getApiKey();
      const insights = await aiEngine.getNLInsights(
        { finance: { score: 50 }, inventory: { score: 50 }, production: { score: 50 }, syndicate: { score: 50 }, sales: result, overallScore: result.score },
        apiKey
      );

      showDetailPanel({
        title: 'Sales Insights',
        subtitle: `Sales Momentum: ${result.score}/100`,
        bodyHTML: `
          <div class="dp-section">
            <div class="dp-section-title">Revenue Trends</div>
            <div class="dp-kv-grid">
              ${dpKV('7-Day Revenue', this.currencySym + Math.round(result.revenueThisWeek).toLocaleString())}
              ${dpKV('Prior 7 Days', this.currencySym + Math.round(result.revenuePriorWeek).toLocaleString())}
              ${dpKV('Trend', result.revenueTrend, parseFloat(result.revTrendPct) >= 0)}
              ${dpKV('Peak Day', result.peakDay)}
            </div>
          </div>
          <div class="dp-section">
            <div class="dp-section-title">AI Advisor</div>
            <ul class="dp-list" style="gap:0.75rem;">
              ${insights.map(ins => `
                <li style="background:var(--bg-secondary); padding:0.75rem; border-radius:8px; border-left:3px solid ${sevColors[ins.severity] || '#2563eb'}">
                  <span style="display:block; font-size:0.95rem;">${ins.text}</span>
                </li>
              `).join('')}
            </ul>
          </div>
          <div class="dp-section">
            <div class="dp-section-title">Top Sellers (7 Days)</div>
            ${result.topItems.length ? result.topItems.map(item =>
          dpBar(item.name, item.revenue, result.topItems[0].revenue, '#10b981', v => this.currencySym + Math.round(v).toLocaleString())
        ).join('') : '<div class="dp-empty">Not enough recent sales data</div>'}
          </div>
          <div class="dp-section">
            <div class="dp-section-title">Slow Movers</div>
            ${result.slowMovers.length ? result.slowMovers.map(item =>
          dpBar(item.name, item.revenue, result.topItems[0]?.revenue || 1, '#ef4444', v => this.currencySym + Math.round(v).toLocaleString())
        ).join('') : '<div class="dp-empty">Not enough recent sales data</div>'}
          </div>
        `
      });
    });

    // Loyalty state
    let loyaltyDiscount = 0;   // in Rand
    let loyaltyPointsToDeduct = 0;
    let selectedCustomerData = null;

    // Loyalty: show/hide section when customer changes
    const customerSelect = container.querySelector('#sale-customer');
    customerSelect?.addEventListener('change', () => {
      const opt = customerSelect.options[customerSelect.selectedIndex];
      const pts = parseInt(opt?.dataset?.points || '0');
      const section = container.querySelector('#loyalty-section');
      const creditOpt = container.querySelector('#credit-payment-option');
      const hasCustomer = !!customerSelect.value;

      // Show credit option only when a named customer is selected
      if (creditOpt) creditOpt.style.display = hasCustomer ? 'flex' : 'none';

      if (hasCustomer && pts > 0) {
        section.style.display = 'block';
        container.querySelector('#loyalty-pts-bal').textContent = pts;
        selectedCustomerData = this.customers.find(c => c.id == customerSelect.value) || null;
      } else {
        section.style.display = 'none';
        loyaltyDiscount = 0; loyaltyPointsToDeduct = 0;
        selectedCustomerData = null;
        updateCart();
      }
      // If credit was selected but customer cleared, switch to cash
      const checkedMethod = container.querySelector('input[name="payment"]:checked');
      if (checkedMethod?.value === 'credit' && !hasCustomer) {
        const cash = container.querySelector('input[name="payment"][value="cash"]');
        if (cash) cash.checked = true;
      }
      // Reset loyalty discount on customer change
      loyaltyDiscount = 0; loyaltyPointsToDeduct = 0;
      container.querySelector('#loyalty-discount-row').style.display = 'none';
      container.querySelector('#redeem-applied-msg').style.display = 'none';
    });

    container.querySelector('#toggle-redeem-btn')?.addEventListener('click', () => {
      const row = container.querySelector('#redeem-row');
      row.style.display = row.style.display === 'none' ? 'flex' : 'none';
    });

    container.querySelector('#apply-redeem-btn')?.addEventListener('click', () => {
      const input = container.querySelector('#redeem-pts-input');
      const pts = parseInt(input?.value || '0');
      if (!pts || pts <= 0) return;
      const maxPts = parseInt(container.querySelector('#loyalty-pts-bal')?.textContent || '0');
      const clamped = Math.min(pts, maxPts);
      const discount = clamped / 10; // 10 pts = R1
      loyaltyDiscount = discount;
      loyaltyPointsToDeduct = clamped;
      container.querySelector('#redeem-row').style.display = 'none';
      const msg = container.querySelector('#redeem-applied-msg');
      container.querySelector('#redeem-applied-text').textContent = `${clamped} points → R${discount.toFixed(2)} off`;
      msg.style.display = 'block';
      updateCart();
    });

    container.querySelector('#clear-redeem-btn')?.addEventListener('click', () => {
      loyaltyDiscount = 0; loyaltyPointsToDeduct = 0;
      container.querySelector('#redeem-row').style.display = 'none';
      container.querySelector('#redeem-applied-msg').style.display = 'none';
      container.querySelector('#loyalty-discount-row').style.display = 'none';
      container.querySelector('#redeem-pts-input').value = '';
      updateCart();
    });

    // Helper: Update Cart UI
    const updateCart = () => {
      cartItemsContainer.innerHTML = '';

      if (cart.length === 0) {
        cartItemsContainer.innerHTML = '<p class="text-muted text-center" id="empty-cart-msg">Tap items to add</p>';
        checkoutBtn.disabled = true;
        checkoutBtn.textContent = `Charge ${this.currencySym}0.00`;
        container.querySelector('#cart-subtotal').textContent = `${this.currencySym}0.00`;
        container.querySelector('#cart-vat').textContent = `${this.currencySym}0.00`;
        container.querySelector('#cart-total').textContent = `${this.currencySym}0.00`;
        container.querySelector('#loyalty-discount-row').style.display = 'none';
        return;
      }

      let subtotal = 0;

      cart.forEach((item, index) => {
        const itemTotal = item.price * item.quantity;
        subtotal += itemTotal;

        const row = document.createElement('div');
        row.className = 'cart-item-row';
        row.innerHTML = `
          <div class="cart-item-info">
            <span class="cart-item-name">${item.name}</span>
            <span class="cart-item-price">${this.currencySym}${item.price.toFixed(2)} x ${item.quantity}</span>
          </div>
          <div class="cart-item-total">${this.currencySym}${itemTotal.toFixed(2)}</div>
          <button class="btn-remove-item" data-index="${index}">✕</button>
        `;
        cartItemsContainer.appendChild(row);
      });

      const grossTotal = subtotal; // VAT inclusive
      const effectiveTotal = Math.max(0, grossTotal - loyaltyDiscount);
      const vatAmount = effectiveTotal - (effectiveTotal / 1.15);
      const exVatSubtotal = effectiveTotal - vatAmount;

      container.querySelector('#cart-subtotal').textContent = `${this.currencySym}${exVatSubtotal.toFixed(2)}`;
      container.querySelector('#cart-vat').textContent = `${this.currencySym}${vatAmount.toFixed(2)}`;
      container.querySelector('#cart-total').textContent = `${this.currencySym}${effectiveTotal.toFixed(2)}`;
      checkoutBtn.textContent = `Charge ${this.currencySym}${effectiveTotal.toFixed(2)}`;
      checkoutBtn.disabled = false;

      const discRow = container.querySelector('#loyalty-discount-row');
      if (loyaltyDiscount > 0) {
        discRow.style.display = 'flex';
        container.querySelector('#cart-loyalty').textContent = `-${this.currencySym}${loyaltyDiscount.toFixed(2)}`;
      } else {
        discRow.style.display = 'none';
      }

      container.querySelectorAll('.btn-remove-item').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const idx = parseInt(e.target.dataset.index);
          cart.splice(idx, 1);
          updateCart();
        });
      });
    };

    // Payment method toggle
    const paymentRadios = container.querySelectorAll('input[name="payment"]');
    const qrContainer = container.querySelector('#mpesa-qr-container');

    const toggleQR = () => {
      const selected = container.querySelector('input[name="payment"]:checked');
      qrContainer.style.display = (selected && selected.value === 'mpesa') ? 'block' : 'none';
    };

    paymentRadios.forEach(radio => radio.addEventListener('change', toggleQR));
    toggleQR();

    // Product search + category filter (shared state)
    let activeCategory = 'all';
    let searchQuery = '';

    const applyFilters = () => {
      let filtered = inventory;
      if (activeCategory !== 'all') filtered = filtered.filter(i => i.category === activeCategory);
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        filtered = filtered.filter(i =>
          (i.name || '').toLowerCase().includes(q) ||
          (i.sku || '').toLowerCase().includes(q)
        );
      }
      grid.innerHTML = this.renderProductGrid(filtered);
    };

    // Category filter
    categoryFilters.addEventListener('click', (e) => {
      if (e.target.classList.contains('cat-btn')) {
        container.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        activeCategory = e.target.dataset.cat;
        applyFilters();
      }
    });

    // Product name search
    const productSearch = container.querySelector('#product-search');
    productSearch?.addEventListener('input', (e) => {
      searchQuery = e.target.value.trim();
      // Reset category filter when searching
      if (searchQuery) {
        container.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
        container.querySelector('.cat-btn[data-cat="all"]')?.classList.add('active');
        activeCategory = 'all';
      }
      applyFilters();
    });

    // Add to Cart (Delegation)

    // Hardware Integration: HID Barcode Scanner (The Speed Moat)
    if (window._salesBarcodeListener) {
      document.removeEventListener('keydown', window._salesBarcodeListener);
    }
    if (window._posKeyHandler) {
      document.removeEventListener('keydown', window._posKeyHandler);
      window._posKeyHandler = null;
    }

    let barcodeBuffer = '';
    let barcodeTimeout = null;

    window._salesBarcodeListener = (e) => {
      // Ignore if typing in an input field (search, quantity, etc)
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;

      if (e.key === 'Enter') {
        if (barcodeBuffer.length >= 3) {
          e.preventDefault();
          const sku = barcodeBuffer.trim();
          const item = inventory.find(i => i.sku.toLowerCase() === sku.toLowerCase());

          if (item) {
            // Beep feedback
            try {
              const ctx = new (window.AudioContext || window.webkitAudioContext)();
              const osc = ctx.createOscillator();
              osc.connect(ctx.destination);
              osc.frequency.value = 800;
              osc.start();
              osc.stop(ctx.currentTime + 0.1);
            } catch (err) { }

            const existing = cart.find(i => i.sku === item.sku);
            if (existing) {
              existing.quantity++;
            } else {
              cart.push({ sku: item.sku, name: item.name, price: item.unitPrice || item.unitCost || 0, quantity: 1 });
            }
            updateCart();
            // Optional: flash screen or show subtle toast
            console.log(`⚡ Barcode scanned: ${sku}`);
          } else {
            console.warn(`Scanned barcode not in inventory: ${sku}`);
          }
        }
        barcodeBuffer = '';
        return;
      }

      if (e.key.length === 1) {
        barcodeBuffer += e.key;
        clearTimeout(barcodeTimeout);
        // HID Scanners type >10x faster than humans. 50ms timeout ensures we only capture scanner bursts.
        barcodeTimeout = setTimeout(() => {
          barcodeBuffer = '';
        }, 50);
      }
    };
    document.addEventListener('keydown', window._salesBarcodeListener);

    // Hardware Integration: Listen for live scale readings
    window.addEventListener('scale-reading', (e) => {
      const modal = document.getElementById('open-item-modal');
      if (modal && modal.open) {
        // Auto-fill the name to indicate it's weighed
        const nameInput = document.getElementById('open-item-name');
        if (!nameInput.value || nameInput.value === 'Open Item') {
          nameInput.value = `Weighed Item (${e.detail.weight}kg)`;
        }
        // If we had a base price per kg, we could auto-calculate price here
        // e.g. priceInput.value = (basePrice * e.detail.weight).toFixed(2);
      }
    });

    grid.addEventListener('click', (e) => {
      if (e.target.closest('.open-item-btn')) {
        const modal = document.getElementById('open-item-modal');
        const priceInput = document.getElementById('open-item-price');
        const nameInput = document.getElementById('open-item-name');

        nameInput.value = '';
        priceInput.value = '';
        modal.showModal();

        // If the scale simulator is active, grab a fake weight immediately
        if (HardwareService.simulatorMode) {
          HardwareService.getSimulatedWeight();
        }

        priceInput.focus();

        const confirmBtn = document.getElementById('add-open-item');
        const cancelBtn = document.getElementById('cancel-open-item');
        const newConfirm = confirmBtn.cloneNode(true);
        const newCancel = cancelBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirm, confirmBtn);
        cancelBtn.parentNode.replaceChild(newCancel, cancelBtn);

        newCancel.addEventListener('click', () => modal.close());
        newConfirm.addEventListener('click', () => {
          const price = parseFloat(priceInput.value);
          const name = nameInput.value || 'Open Item';
          if (price && price > 0) {
            cart.push({ sku: `OPEN-${Date.now()}`, name, price, quantity: 1, isOpenItem: true });
            updateCart();
            modal.close();
          } else {
            alert('Please enter a valid price');
          }
        });
        return;
      }

      const card = e.target.closest('.product-card');
      if (!card) return;

      card.classList.add('active');
      setTimeout(() => card.classList.remove('active'), 100);

      const sku = card.dataset.sku;
      const name = card.dataset.name;
      const price = parseFloat(card.dataset.price);

      const existing = cart.find(i => i.sku === sku);
      if (existing) {
        existing.quantity++;
      } else {
        cart.push({ sku, name, price, quantity: 1 });
      }
      updateCart();
    });

    // Clear Cart
    clearBtn.addEventListener('click', () => {
      cart = [];
      updateCart();
    });

    // ── POS Keyboard Shortcuts ──────────────────────────────────────────
    // Only active when the POS is mounted (removed with content-area clone on navigate)
    const posKeyHandler = (e) => {
      // Ignore when typing in an input
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT')) return;

      switch (e.key) {
        case 'Escape':
          // Clear search / close modal
          const searchInput = container.querySelector('.category-filters input');
          if (searchInput) { searchInput.value = ''; }
          break;
        case 'Enter':
          // Trigger checkout if cart has items
          if (!checkoutBtn.disabled && cart.length > 0) checkoutBtn.click();
          break;
        case 'Delete':
        case 'Backspace':
          // Remove last cart item
          if (!e.target.value && cart.length > 0) {
            cart.pop();
            updateCart();
          }
          break;
        case '1': case '2': case '3': case '4':
          // Switch payment method: 1=cash 2=card 3=mobile 4=mpesa
          if (!e.ctrlKey && !e.metaKey) {
            const methods = ['cash','card','mobile','mpesa'];
            const radio = container.querySelector(`input[name="payment"][value="${methods[parseInt(e.key)-1]}"]`);
            if (radio) { radio.checked = true; radio.dispatchEvent(new Event('change')); }
          }
          break;
      }
    };
    document.addEventListener('keydown', posKeyHandler);
    // Stored so the barcode cleanup logic can also remove this handler on navigate
    window._posKeyHandler = posKeyHandler;

    // Checkout
    checkoutBtn.addEventListener('click', async () => {
      const btn = checkoutBtn;
      if (cart.length === 0) return;

      const paymentMethod = container.querySelector('input[name="payment"]:checked').value;
      const grandTotal = cart.reduce((sum, i) => sum + (i.price * i.quantity), 0);
      const totalItems = cart.reduce((sum, i) => sum + i.quantity, 0);
      
      const customerSelect = container.querySelector('#sale-customer');
      const customerName = customerSelect.value ? customerSelect.options[customerSelect.selectedIndex].text : 'Walk-in';

      // Inject Confirmation Modal HTML
      let modal = document.getElementById('checkout-confirm-modal');
      if (!modal) {
        modal = document.createElement('dialog');
        modal.id = 'checkout-confirm-modal';
        modal.className = 'scanner-modal'; // recycle scanner-modal styling
        document.body.appendChild(modal);
      }

      modal.innerHTML = `
        <div class="scanner-content">
          <h3 style="margin-bottom:0.5rem;"><i class="ph-duotone ph-shopping-cart"></i> Confirm Checkout</h3>
          <p style="color:var(--text-secondary); margin-bottom:1.5rem;">Please review the order details before charging.</p>
          
          <div style="background:var(--bg-secondary); padding:1rem; border-radius:8px; margin-bottom:1.5rem;">
            <div style="display:flex;justify-content:space-between;margin-bottom:0.5rem;">
              <span style="color:var(--text-secondary)">Total Items:</span>
              <span style="font-weight:600;color:var(--text-primary)">${totalItems}</span>
            </div>
            <div style="display:flex;justify-content:space-between;margin-bottom:0.5rem;">
              <span style="color:var(--text-secondary)">Customer:</span>
              <span style="font-weight:600;color:var(--text-primary)">${customerName}</span>
            </div>
            <div style="display:flex;justify-content:space-between;margin-bottom:0.5rem;">
              <span style="color:var(--text-secondary)">Payment:</span>
              <span style="font-weight:600;color:var(--text-primary);text-transform:capitalize;">${paymentMethod}</span>
            </div>
            <div style="display:flex;justify-content:space-between;margin-top:1rem;padding-top:1rem;border-top:1px dashed var(--border);">
              <span style="color:var(--text-secondary)">Grand Total:</span>
              <span style="font-size:1.4rem;font-weight:700;color:var(--accent-primary)">R ${grandTotal.toFixed(2)}</span>
            </div>
          </div>
          
          <div style="display:flex;gap:0.75rem;">
            <button id="cancel-checkout-btn" class="btn btn-secondary" style="flex:1">Go Back</button>
            <button id="confirm-checkout-btn" class="btn btn-primary" style="flex:1">Confirm & Charge</button>
          </div>
        </div>
      `;

      modal.showModal();

      modal.querySelector('#cancel-checkout-btn').addEventListener('click', () => modal.close());

      modal.querySelector('#confirm-checkout-btn').addEventListener('click', async () => {
        const confirmBtn = modal.querySelector('#confirm-checkout-btn');
        confirmBtn.disabled = true;
        confirmBtn.textContent = 'Processing...';
        btn.disabled = true;

        try {
        const paymentMethod = container.querySelector('input[name="payment"]:checked').value;
        const grossTotal = cart.reduce((sum, i) => sum + (i.price * i.quantity), 0);
        const grandTotal = Math.max(0, grossTotal - loyaltyDiscount); // Apply loyalty discount
        const vatAmount = grandTotal - (grandTotal / 1.15);
        const subtotal = grandTotal - vatAmount;

        const session = getSession() ?? {};
        const cashierName = session.name || session.username || 'Admin User';
        const customerId = customerSelect.value ? parseInt(customerSelect.value) : null;

        if (paymentMethod === 'card') {
          btn.textContent = 'Waiting for Card Tap...';
          await PaymentService.initializeTerminal();
          const result = await PaymentService.processCardPayment(grandTotal, `order_${Date.now()}`);
          console.log('Payment Gateway Txn:', result.transactionId);
        } else if (paymentMethod === 'mobile' || paymentMethod === 'mpesa') {
          btn.textContent = 'Awaiting Phone Prompt...';
          const result = await PaymentService.processMobileMoney(grandTotal, '0821234567');
          console.log('Mobile Money Txn:', result.transactionId);
        }

        btn.textContent = 'Saving to Database...';

        const saleItems = cart.map(i => ({
          sku: i.sku,
          quantity: i.quantity,
          unitPrice: i.price,
          total: i.quantity * i.price,
          name: i.name
        }));

        const sale = await this.salesModule.recordSale({
          items: saleItems,
          subtotal,
          discount: loyaltyDiscount,
          vatAmount,
          vat: 0.15,
          total: grandTotal,
          paymentMethod,
          customerId,
          customerName,
          cashierName
        });

        // Post-sale: update loyalty points and credit balance
        if (customerId) {
          try {
            const custFresh = await Customers.getCustomer(customerId);
            if (custFresh) {
              const updates = {};
              // Deduct redeemed loyalty points
              if (loyaltyPointsToDeduct > 0) {
                updates.loyaltyPoints = Math.max(0, (custFresh.loyaltyPoints || 0) - loyaltyPointsToDeduct);
              }
              // Record credit sale — add to customer's outstanding balance with timestamp
              if (paymentMethod === 'credit') {
                updates.creditBalance = (custFresh.creditBalance || 0) + grandTotal;
                // Track oldest unpaid credit date for aging reports
                if (!custFresh.creditIssuedAt) updates.creditIssuedAt = Date.now();
              }
              if (Object.keys(updates).length) {
                await Customers.updateCustomer(customerId, updates);
              }
            }
            await Customers.recordVisit(customerId, grossTotal); // awards 1pt per R10
          } catch (e) { console.warn('Post-sale customer update failed:', e.message); }
        }

        // Reset loyalty state
        loyaltyDiscount = 0; loyaltyPointsToDeduct = 0;
        cart = [];
        updateCart();
        modal.close();
        this.showInvoiceModal(sale, customerName, paymentMethod);

      } catch (err) {
        console.error(err);
        alert('Sale failed: ' + err.message);
        modal.close();
        btn.disabled = false;
        btn.textContent = `Charge R ${grandTotal.toFixed(2)}`;
      }
      });
    });

    // Barcode scan — find product by SKU
    const salesScanBtn = container.querySelector('#sales-scan-btn');
    if (salesScanBtn) {
      salesScanBtn.addEventListener('click', () => {
        this.scanBarcode((value) => {
          const match = inventory.find(i => i.sku === value || i.barcode === value);
          if (match) {
            const existing = cart.find(i => i.sku === match.sku);
            if (existing) {
              existing.quantity++;
            } else {
              const price = match.unitPrice || match.unitCost || 0;
              cart.push({ sku: match.sku, name: match.name, price, quantity: 1 });
            }
            updateCart();
          } else {
            alert(`No product found for barcode: ${value}`);
          }
        });
      });
    }
  }

  async showInvoiceModal(sale, customerName, paymentMethod) {
    const session = getSession() ?? {};
    const businessName = session.businessName || 'My Business';
    const invoiceDate = new Date(sale.timestamp || Date.now()).toLocaleString('en-ZA');
    const invoiceNo = sale.id ? sale.id.replace('sale_', 'INV-') : `INV-${Date.now()}`;

    // Load full settings for receipt customisation
    let cfg = {};
    try { cfg = await db.get('settings', 'config') || {}; } catch {}
    const logo        = cfg.businessLogo    || session.businessLogo    || null;
    const tagline     = cfg.businessTagline || '';
    const vatNumber   = cfg.vatNumber       || '';
    const address     = cfg.businessAddress || '';
    const phone       = cfg.businessPhone   || '';
    const email       = cfg.businessEmail   || '';

    const linesHtml = (sale.items || []).map(item => `
      <tr>
        <td>${item.name || item.sku}</td>
        <td style="text-align:center">${item.quantity}</td>
        <td style="text-align:right">R ${(item.unitPrice || 0).toFixed(2)}</td>
        <td style="text-align:right">R ${(item.total || 0).toFixed(2)}</td>
      </tr>
    `).join('');

    const payBadge = { cash: '#10b981', card: '#2563eb', mobile: '#f59e0b', mpesa: '#16a34a', credit: '#f59e0b' }[paymentMethod] || '#6b7280';

    const modal = document.createElement('dialog');
    modal.className = 'invoice-modal';
    modal.innerHTML = `
      <div class="invoice-content">
        <div class="invoice-header">
          ${logo ? `<img src="${logo}" alt="${businessName}" style="max-height:56px;max-width:180px;object-fit:contain;margin-bottom:0.5rem;display:block;">` : ''}
          <h2>${businessName}</h2>
          ${tagline ? `<p style="margin:0.125rem 0 0;font-size:0.8125rem;color:#94a3b8;">${tagline}</p>` : ''}
          ${address ? `<p style="margin:0.25rem 0 0;font-size:0.75rem;color:#94a3b8;">${address}</p>` : ''}
          ${phone || email ? `<p style="margin:0.125rem 0 0;font-size:0.75rem;color:#94a3b8;">${[phone, email].filter(Boolean).join(' · ')}</p>` : ''}
          <p style="margin:0.5rem 0 0;font-size:0.8125rem;font-weight:600;letter-spacing:0.04em;color:#94a3b8;">TAX INVOICE</p>
          ${vatNumber ? `<p style="margin:0.125rem 0 0;font-size:0.75rem;color:#94a3b8;">VAT Reg: ${vatNumber}</p>` : ''}
        </div>
        <div class="invoice-meta">
          <div><strong>Invoice #:</strong> ${invoiceNo}</div>
          <div><strong>Date:</strong> ${invoiceDate}</div>
          <div><strong>Customer:</strong> ${customerName}</div>
          <div><strong>Cashier:</strong> ${sale.cashierName || 'System'}</div>
          <div style="grid-column: span 2; margin-top: 0.25rem;">
            <span style="background:${payBadge};color:white;padding:2px 10px;border-radius:12px;font-size:0.8rem;text-transform:capitalize">${paymentMethod}</span>
          </div>
        </div>
        <table class="invoice-table">
          <thead>
            <tr>
              <th>Item</th>
              <th style="text-align:center">Qty</th>
              <th style="text-align:right">Unit</th>
              <th style="text-align:right">Total</th>
            </tr>
          </thead>
          <tbody>${linesHtml}</tbody>
        </table>
        <div class="invoice-totals">
          <div class="inv-row"><span>Subtotal (Excl. VAT)</span><span>R ${(sale.subtotal || 0).toFixed(2)}</span></div>
          <div class="inv-row"><span>VAT (15%)</span><span>R ${(sale.vatAmount || 0).toFixed(2)}</span></div>
          <div class="inv-row inv-grand"><span>Total</span><span>R ${(sale.total || 0).toFixed(2)}</span></div>
        </div>
        </div>
        <div class="invoice-actions" style="margin-top: 1.5rem; display: flex; flex-wrap: wrap; gap: 0.5rem; justify-content: center;">
          <button id="print-invoice-btn" class="btn btn-secondary"><i class="ph ph-printer"></i> Print</button>
          <button id="wa-invoice-btn" class="btn" style="background:#10b981; color:white; border:none"><i class="ph ph-whatsapp-logo"></i> WhatsApp</button>
          <button id="coc-invoice-btn" class="btn btn-secondary" title="Enterprise QA: Generate Certificate of Conformance"><i class="ph ph-file-pdf"></i> QA CoC</button>
          <button id="close-invoice-btn" class="btn btn-primary">New Sale</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    modal.showModal();

    modal.querySelector('#wa-invoice-btn').addEventListener('click', () => {
      let waText = `*${businessName}*\n_Tax Invoice: ${invoiceNo}_\nDate: ${invoiceDate}\nCustomer: ${customerName}\n\n*Items:*\n`;
      sale.items.forEach(item => {
        waText += `- ${item.name} (x${item.quantity}) = R ${(item.quantity * item.unitPrice).toFixed(2)}\n`;
      });
      waText += `\n*Subtotal:* R ${(sale.subtotal || 0).toFixed(2)}\n*VAT (15%):* R ${(sale.vatAmount || 0).toFixed(2)}\n*Total:* R ${(sale.total || 0).toFixed(2)}\n\n_Thank you for your business!_`;

      const encodedText = encodeURIComponent(waText);
      window.open(`https://wa.me/?text=${encodedText}`, '_blank');
    });

    modal.querySelector('#coc-invoice-btn').addEventListener('click', async (e) => {
      try {
        const btnHtml = e.currentTarget.innerHTML;
        e.currentTarget.innerHTML = '<i class="ph ph-spinner ph-spin"></i>';

        // Dynamically load SmartShift to avoid circular deps if needed
        const { default: SmartShift } = await import('../modules/SmartShift.js');
        const smartShiftInstance = new SmartShift(null, null);

        // Find if any item in the sale has a traceable production order
        // In a real system, products would link to their specific production batch IDs.
        // For the demo moat, we just look up any completed production order that matches the sold product name.
        const orders = await smartShiftInstance.getProductionOrders({ status: 'completed' });

        let foundOrderId = null;
        for (const line of sale.items) {
          const match = orders.find(o => o.product === line.name);
          if (match) {
            foundOrderId = match.id;
            break;
          }
        }

        if (foundOrderId) {
          await smartShiftInstance.generateCoC(foundOrderId);
        } else {
          alert('Enterprise QA: No traceable manufacturing genealogy found for the items in this invoice.');
        }
        e.currentTarget.innerHTML = btnHtml;
      } catch (err) {
        console.error('CoC Generation failed:', err);
        alert('Failed to generate Certificate of Conformance.');
        e.currentTarget.innerHTML = '<i class="ph ph-file-pdf"></i> QA CoC';
      }
    });

    modal.querySelector('#print-invoice-btn').addEventListener('click', async () => {
      // The Moat: Print directly to connected Bluetooth thermal printer instead of standard browser print dialog
      await HardwareService.printReceipt(sale);
    });

    modal.querySelector('#close-invoice-btn').addEventListener('click', () => {
      modal.close();
      modal.remove();
    });
  }

  async scanBarcode(onResult) {
    if (!('BarcodeDetector' in window)) {
      alert('Barcode scanning requires Chrome or Edge browser.');
      return;
    }
    const detector = new BarcodeDetector({ formats: ['ean_13', 'ean_8', 'code_128', 'qr_code', 'upc_a', 'upc_e'] });

    const modal = document.createElement('dialog');
    modal.className = 'scanner-modal';
    modal.innerHTML = `
      <div class="scanner-content">
        <h3><i class="ph ph-barcode"></i> Scan Barcode</h3>
        <video id="sales-scanner-video" autoplay playsinline style="width:100%;border-radius:8px;"></video>
        <p style="text-align:center;color:var(--text-muted);font-size:0.8125rem;margin-top:0.5rem;">Point camera at barcode</p>
        <button id="close-sales-scanner" class="btn btn-secondary" style="width:100%">Cancel</button>
      </div>
    `;
    document.body.appendChild(modal);
    modal.showModal();

    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      modal.querySelector('#sales-scanner-video').srcObject = stream;
    } catch {
      alert('Camera access denied.');
      modal.close(); modal.remove();
      return;
    }

    const cleanup = () => {
      clearInterval(interval);
      if (stream) stream.getTracks().forEach(t => t.stop());
      modal.close();
      modal.remove();
    };

    const interval = setInterval(async () => {
      const video = modal.querySelector('#sales-scanner-video');
      if (!video || video.readyState < 2) return;
      try {
        const barcodes = await detector.detect(video);
        if (barcodes.length > 0) {
          cleanup();
          onResult(barcodes[0].rawValue);
        }
      } catch { /* continue */ }
    }, 200);

    modal.querySelector('#close-sales-scanner').addEventListener('click', cleanup);
    modal.addEventListener('click', (e) => { if (e.target === modal) cleanup(); });
  }

  async showPINSwitcher() {
    let allUsers = [];
    try { allUsers = await db.getAll(STORES.users ?? 'users'); } catch {}
    const pinUsers = allUsers.filter(u => u.posPin);

    if (pinUsers.length === 0) {
      alert('No staff members have a POS PIN set.\n\nGo to Settings → Team, add a team member and set their 4-digit PIN.');
      return;
    }

    const modal = document.createElement('dialog');
    modal.style.cssText = 'border:none;padding:0;background:var(--bg-primary);border:1px solid var(--border);border-radius:12px;box-shadow:0 24px 48px rgba(0,0,0,0.5);width:min(340px,96vw);color:var(--text-primary);';
    modal.innerHTML = `
      <div style="padding:1.125rem 1.25rem;border-bottom:1px solid var(--border);text-align:center;">
        <h2 style="margin:0;font-size:1rem;font-weight:700;">Switch Cashier</h2>
        <p style="margin:0.25rem 0 0;font-size:0.8125rem;color:var(--text-muted);">Select your name and enter your PIN</p>
      </div>
      <div style="padding:1.25rem;">
        <select id="pin-user-select" style="width:100%;margin-bottom:1rem;padding:0.5rem 0.75rem;border:1px solid var(--border);border-radius:8px;background:rgba(255,255,255,0.04);color:var(--text-primary);font-size:0.875rem;">
          ${pinUsers.map(u => `<option value="${u.username}">${u.ownerName || u.username} (${u.role})</option>`).join('')}
        </select>

        <!-- PIN pad -->
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:0.5rem;margin-bottom:1rem;" id="pin-display">
          ${[0,1,2,3].map(() => '<div style="height:12px;border-radius:50%;width:12px;background:var(--border);margin:auto;"></div>').join('')}
        </div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:0.5rem;margin-bottom:1rem;">
          ${[1,2,3,4,5,6,7,8,9,'',0,'⌫'].map(d => `
            <button class="pin-key" data-digit="${d}" style="padding:0.875rem;font-size:1.25rem;font-weight:600;border:1px solid var(--border);border-radius:8px;background:var(--bg-elevated,#232326);color:var(--text-primary);cursor:pointer;transition:background 0.1s;${d===''?'pointer-events:none;opacity:0;':''}">${d}</button>
          `).join('')}
        </div>
        <div style="display:flex;gap:0.625rem;">
          <button id="pin-cancel" class="btn btn-secondary" style="flex:1;">Cancel</button>
          <button id="pin-confirm" class="btn btn-primary" style="flex:1;" disabled>Unlock</button>
        </div>
        <p id="pin-error" style="display:none;color:var(--danger);font-size:0.8125rem;text-align:center;margin:0.5rem 0 0;">Incorrect PIN. Try again.</p>
      </div>
    `;
    document.body.appendChild(modal);
    modal.showModal();

    let pinEntry = '';
    const dots = modal.querySelectorAll('#pin-display > div');
    const confirmBtn = modal.querySelector('#pin-confirm');
    const errorMsg = modal.querySelector('#pin-error');

    const updateDots = () => {
      dots.forEach((d, i) => {
        d.style.background = i < pinEntry.length ? 'var(--accent,#2563eb)' : 'var(--border)';
      });
      confirmBtn.disabled = pinEntry.length !== 4;
    };

    modal.querySelectorAll('.pin-key').forEach(btn => {
      btn.addEventListener('click', () => {
        const d = btn.dataset.digit;
        if (d === '⌫') { pinEntry = pinEntry.slice(0, -1); }
        else if (d !== '' && pinEntry.length < 4) { pinEntry += d; }
        errorMsg.style.display = 'none';
        updateDots();
      });
    });

    const close = () => { modal.close(); modal.remove(); };
    modal.querySelector('#pin-cancel').addEventListener('click', close);

    confirmBtn.addEventListener('click', async () => {
      const username = modal.querySelector('#pin-user-select').value;
      const user = pinUsers.find(u => u.username === username);
      if (!user?.posPin) { close(); return; }

      // Hash the entered PIN and compare
      const pinBuf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pinEntry));
      const enteredHash = Array.from(new Uint8Array(pinBuf)).map(b => b.toString(16).padStart(2,'0')).join('');

      if (enteredHash !== user.posPin) {
        pinEntry = '';
        updateDots();
        errorMsg.style.display = 'block';
        return;
      }

      // Success — switch active session
      const newSession = {
        ...user,
        lastLogin: Date.now(),
        // Preserve business context from current session
        businessName: getSession()?.businessName || user.businessName,
        businessType: getSession()?.businessType || user.businessType,
      };
      localStorage.setItem('erp_session', JSON.stringify(newSession));
      close();
      // Reload POS to reflect new cashier name
      window.location.reload();
    });
  }

  async showTillReconciliation() {
    // Get today's POS totals
    const now = Date.now();
    const dayStart = new Date().setHours(0,0,0,0);
    let txs = [];
    try { txs = await db.getAll(STORES.transactions); } catch {}

    const todaySales = txs.filter(t => t.date >= dayStart && t.date <= now && t.type === 'income');
    const expectedCash = todaySales.filter(t => t.paymentMethod === 'cash').reduce((s, t) => s + (t.amount || 0), 0);
    const expectedCard = todaySales.filter(t => t.paymentMethod === 'card').reduce((s, t) => s + (t.amount || 0), 0);
    const expectedMobile = todaySales.filter(t => ['mobile','mpesa'].includes(t.paymentMethod)).reduce((s, t) => s + (t.amount || 0), 0);
    const totalExpected = todaySales.reduce((s, t) => s + (t.amount || 0), 0);

    const DENOMINATIONS = [
      { label: 'R 200', value: 200 },
      { label: 'R 100', value: 100 },
      { label: 'R 50',  value: 50  },
      { label: 'R 20',  value: 20  },
      { label: 'R 10',  value: 10  },
      { label: 'R 5',   value: 5   },
      { label: 'R 2',   value: 2   },
      { label: 'R 1',   value: 1   },
      { label: '50c',   value: 0.5 },
    ];

    const modal = document.createElement('dialog');
    modal.style.cssText = 'border:none;padding:0;background:var(--bg-primary);border:1px solid var(--border);border-radius:12px;box-shadow:0 24px 48px rgba(0,0,0,0.5);width:min(520px,96vw);max-height:90vh;overflow-y:auto;color:var(--text-primary);';
    modal.innerHTML = `
      <div style="padding:1.25rem 1.5rem;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;">
        <div>
          <h2 style="margin:0;font-size:1rem;font-weight:700;">End-of-Day Till Count</h2>
          <p style="margin:0.125rem 0 0;font-size:0.75rem;color:var(--text-muted);">${new Date().toLocaleDateString('en-ZA', { weekday:'long', day:'numeric', month:'long' })}</p>
        </div>
        <button id="close-till-btn" style="background:none;border:none;cursor:pointer;color:var(--text-muted);font-size:1.25rem;padding:0.25rem;"><i class="ph ph-x"></i></button>
      </div>

      <div style="padding:1.25rem 1.5rem;">
        <!-- System totals -->
        <div style="background:var(--bg-elevated,#232326);border-radius:8px;padding:1rem;margin-bottom:1.25rem;display:grid;grid-template-columns:1fr 1fr 1fr;gap:0.75rem;text-align:center;">
          <div>
            <p style="margin:0;font-size:0.6875rem;text-transform:uppercase;letter-spacing:0.06em;color:var(--text-muted);">Cash (POS)</p>
            <p style="margin:0.25rem 0 0;font-size:1.125rem;font-weight:700;color:var(--text-primary);">R ${expectedCash.toFixed(2)}</p>
          </div>
          <div>
            <p style="margin:0;font-size:0.6875rem;text-transform:uppercase;letter-spacing:0.06em;color:var(--text-muted);">Card / Mobile</p>
            <p style="margin:0.25rem 0 0;font-size:1.125rem;font-weight:700;color:var(--text-primary);">R ${(expectedCard + expectedMobile).toFixed(2)}</p>
          </div>
          <div>
            <p style="margin:0;font-size:0.6875rem;text-transform:uppercase;letter-spacing:0.06em;color:var(--text-muted);">Total Revenue</p>
            <p style="margin:0.25rem 0 0;font-size:1.125rem;font-weight:700;color:#34d399;">R ${totalExpected.toFixed(2)}</p>
          </div>
        </div>

        <!-- Denomination count -->
        <p style="font-size:0.75rem;text-transform:uppercase;letter-spacing:0.06em;color:var(--text-muted);margin:0 0 0.625rem;">Count physical cash in drawer</p>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem;margin-bottom:1.25rem;" id="denom-grid">
          ${DENOMINATIONS.map(d => `
            <div style="display:flex;align-items:center;gap:0.625rem;background:var(--bg-elevated,#232326);border-radius:6px;padding:0.5rem 0.75rem;">
              <span style="font-size:0.875rem;font-weight:600;color:var(--text-secondary);min-width:44px;">${d.label}</span>
              <span style="color:var(--text-muted);font-size:0.75rem;">×</span>
              <input type="number" class="denom-input" data-value="${d.value}" min="0" value="0"
                style="width:64px;text-align:center;background:var(--bg-primary);border:1px solid var(--border);border-radius:6px;padding:0.25rem 0.375rem;color:var(--text-primary);font-size:0.875rem;font-weight:600;">
              <span class="denom-sub" data-value="${d.value}" style="margin-left:auto;font-size:0.8125rem;color:var(--text-muted);min-width:64px;text-align:right;">R 0.00</span>
            </div>
          `).join('')}
        </div>

        <!-- Totals comparison -->
        <div style="border-top:1px solid var(--border);padding-top:1rem;">
          <div style="display:flex;justify-content:space-between;margin-bottom:0.5rem;font-size:0.875rem;">
            <span style="color:var(--text-secondary);">Physical cash counted</span>
            <span id="till-counted" style="font-weight:700;color:var(--text-primary);">R 0.00</span>
          </div>
          <div style="display:flex;justify-content:space-between;margin-bottom:0.5rem;font-size:0.875rem;">
            <span style="color:var(--text-secondary);">Cash expected (POS)</span>
            <span style="font-weight:600;color:var(--text-secondary);">R ${expectedCash.toFixed(2)}</span>
          </div>
          <div style="display:flex;justify-content:space-between;padding-top:0.625rem;border-top:1px solid var(--border);">
            <span style="font-size:1rem;font-weight:700;color:var(--text-primary);">Variance</span>
            <span id="till-variance" style="font-size:1.125rem;font-weight:700;color:var(--text-muted);">R 0.00</span>
          </div>
        </div>
      </div>

      <div style="padding:1rem 1.5rem;border-top:1px solid var(--border);display:flex;gap:0.75rem;justify-content:flex-end;">
        <button id="cancel-till-btn" class="btn btn-secondary">Cancel</button>
        <button id="save-till-btn" class="btn btn-primary"><i class="ph ph-check"></i> Save Reconciliation</button>
      </div>
    `;

    document.body.appendChild(modal);
    modal.showModal();

    const updateTotals = () => {
      let counted = 0;
      modal.querySelectorAll('.denom-input').forEach(input => {
        const qty = parseFloat(input.value) || 0;
        const val = parseFloat(input.dataset.value);
        const sub = modal.querySelector(`.denom-sub[data-value="${val}"]`);
        const lineTotal = qty * val;
        counted += lineTotal;
        if (sub) sub.textContent = `R ${lineTotal.toFixed(2)}`;
      });
      const variance = counted - expectedCash;
      const varEl = modal.querySelector('#till-variance');
      const countEl = modal.querySelector('#till-counted');
      if (countEl) countEl.textContent = `R ${counted.toFixed(2)}`;
      if (varEl) {
        varEl.textContent = `${variance >= 0 ? '+' : ''}R ${variance.toFixed(2)}`;
        varEl.style.color = Math.abs(variance) < 0.01 ? '#34d399' : variance > 0 ? '#fbbf24' : '#f87171';
      }
      return { counted, variance };
    };

    modal.querySelectorAll('.denom-input').forEach(input => input.addEventListener('input', updateTotals));

    const close = () => { modal.close(); modal.remove(); };
    modal.querySelector('#close-till-btn').addEventListener('click', close);
    modal.querySelector('#cancel-till-btn').addEventListener('click', close);

    modal.querySelector('#save-till-btn').addEventListener('click', async () => {
      const { counted, variance } = updateTotals();
      try {
        await db.add(STORES.transactions, {
          id: `till_${Date.now()}`,
          type: 'internal',
          description: `Till reconciliation — counted R ${counted.toFixed(2)}, variance ${variance >= 0 ? '+' : ''}R ${variance.toFixed(2)}`,
          amount: 0,
          date: Date.now(),
          category: 'Till Count',
          paymentMethod: 'internal',
          cashierName: getSession()?.username || 'Admin'
        });
      } catch {}
      close();
      alert(`Till count saved.\nCash counted: R ${counted.toFixed(2)}\nExpected: R ${expectedCash.toFixed(2)}\nVariance: ${variance >= 0 ? '+' : ''}R ${variance.toFixed(2)}`);
    });
  }

  renderStyles() {
    return `
      <style>
        .sales-container { padding: 1rem; max-width: 1200px; margin: 0 auto; overflow-x: hidden; }

        .badge.cash { background: #10b981; color: white; }
        .badge.card { background: #2563eb; color: white; }
        .badge.mobile { background: #f59e0b; color: white; }
        .badge.mpesa { background: #16a34a; color: white; }

        .pos-layout {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 1.25rem;
          height: calc(100vh - 190px);
          min-height: 0;
        }

        /* ── Product Section ── */
        .product-section {
          display: flex;
          flex-direction: column;
          min-height: 0;
          overflow: hidden;
        }

        .product-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
          gap: 0.5rem;
          overflow-y: auto;
          padding-right: 0.25rem;
          flex: 1;
          min-height: 0;
          align-content: start;
        }

        .product-card {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          background: var(--bg-primary);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 0.75rem;
          cursor: pointer;
          text-align: left;
          transition: background 0.12s, border-color 0.12s;
          min-height: 90px;
          position: relative;
          overflow: hidden;
        }
        .product-card:hover { background: var(--bg-elevated); border-color: var(--border-strong); }
        .product-card.active { background: rgba(37,99,235,0.08); border-color: rgba(37,99,235,0.3); }
        .product-card.out-of-stock { opacity: 0.5; pointer-events: none; }
        .product-card .prod-name {
          font-size: 0.8125rem;
          font-weight: 600;
          color: var(--text-primary);
          line-height: 1.3;
          margin-bottom: auto;
          word-break: break-word;
        }
        .product-card .prod-price {
          font-size: 0.9375rem;
          font-weight: 700;
          color: var(--text-primary);
          margin-top: 0.5rem;
          letter-spacing: -0.01em;
        }
        .product-card .prod-stock {
          font-size: 0.6875rem;
          color: var(--text-muted);
          margin-top: 0.125rem;
        }
        .product-card .prod-stock.out-of-stock { color: var(--danger); }

        /* ── Cart Section ── */
        .cart-section {
          display: flex;
          flex-direction: column;
          min-height: 0;
          overflow: hidden;
        }
        .cart-card {
          display: flex;
          flex-direction: column;
          height: 100%;
          overflow: hidden;
        }
        .cart-card .card-header {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .cart-card .card-body {
          flex: 1;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 0;
        }
        .cart-items {
          flex: 1;
          overflow-y: auto;
          min-height: 0;
        }
        .cart-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.625rem 0;
          border-bottom: 1px solid var(--border);
          gap: 0.5rem;
          font-size: 0.8125rem;
        }
        .cart-item:last-child { border-bottom: none; }
        .cart-item-name { flex: 1; color: var(--text-primary); font-weight: 500; }
        .cart-item-qty {
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }
        .cart-item-qty button {
          width: 22px; height: 22px;
          border-radius: 4px;
          border: 1px solid var(--border);
          background: transparent;
          color: var(--text-primary);
          cursor: pointer;
          font-size: 0.875rem;
          display: flex; align-items: center; justify-content: center;
        }
        .cart-item-qty button:hover { background: var(--bg-hover); }
        .cart-item-qty .qty-display {
          min-width: 24px;
          text-align: center;
          font-weight: 600;
          font-size: 0.8125rem;
        }
        .cart-item-price {
          font-weight: 600;
          color: var(--text-primary);
          white-space: nowrap;
        }

        /* ── Cart rows ── */
        .cart-item-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.5rem 0;
          border-bottom: 1px solid var(--border);
          gap: 0.5rem;
        }
        .cart-item-row:last-child { border-bottom: none; }
        .cart-item-info {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 0.125rem;
        }
        .cart-item-name {
          font-size: 0.8125rem;
          font-weight: 600;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .cart-item-price {
          font-size: 0.75rem;
          color: var(--text-muted);
        }
        .cart-item-total {
          font-size: 0.875rem;
          font-weight: 700;
          color: var(--text-primary);
          white-space: nowrap;
        }
        .btn-remove-item {
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          font-size: 0.75rem;
          padding: 0.25rem;
          border-radius: 4px;
          flex-shrink: 0;
          transition: color 0.12s;
        }
        .btn-remove-item:hover { color: var(--danger); }

        /* ── Payment methods ── */
        .payment-methods {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 0.875rem;
        }

        /* ── Checkout button ── */
        #checkout-btn {
          width: 100%;
          padding: 0.75rem;
          font-size: 1rem;
          font-weight: 700;
          letter-spacing: -0.01em;
        }
        #checkout-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        /* ── Mobile POS Layout ── */
        @media (max-width: 768px) {
          .sales-container { padding: 0.5rem; width: 100%; box-sizing: border-box; }

          .module-header {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 0.5rem !important;
            padding-bottom: 0.75rem !important;
            width: 100%;
          }
          .module-header h1 { font-size: 1.1rem !important; }
          .module-header > div:last-child { width: 100%; }
          .module-header > div:last-child .btn { width: 100%; justify-content: center; }

          .fin-bar-item { padding: 0.625rem 0.875rem; min-width: 80px; }
          .fin-bar-value { font-size: 0.9rem; }

          .pos-layout {
            display: flex;
            flex-direction: column;
            height: auto;
            gap: 1rem;
            width: 100%;
            overflow: hidden;
          }

          /* Products first on mobile, cart below */
          .product-section { order: 1; width: 100%; max-width: 100vw; }
          .cart-section { order: 2; position: static; width: 100%; max-width: 100vw; }

          /* Category filters – horizontal scroll */
          .category-filters {
            flex-wrap: nowrap;
            -webkit-overflow-scrolling: touch;
          }
          .cat-btn {
            padding: 0.5rem 0.875rem;
            font-size: 0.8rem;
            min-height: 36px;
          }

          /* Bigger tap target for scan button */
          .scan-btn {
            min-width: 44px;
            min-height: 44px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.4rem;
          }

          /* Product grid: 2 columns on mobile */
          .product-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 0.5rem !important;
          }
          .product-card {
            padding: 0.75rem 0.5rem !important;
            min-height: 80px !important;
          }
          .prod-name { font-size: 0.8rem !important; }
          .prod-price { font-size: 0.9rem !important; }
          .prod-stock { font-size: 0.7rem !important; }

          /* Cart card – no fixed height */
          .cart-card { max-height: none !important; overflow: visible !important; width: 100%; box-sizing: border-box; }
          .cart-items {
            max-height: 300px;
            overflow-y: auto;
            overflow-x: hidden;
          }

          /* Payment options – bigger touch targets with label */
          .payment-methods {
            gap: 0.4rem !important;
          }
          .payment-option {
            padding: 0.6rem 0.25rem !important;
            font-size: 1rem !important;
            flex-direction: column;
            gap: 0.2rem;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .payment-option input[type="radio"] { display: none; }
          .pay-label {
            font-size: 0.65rem;
            color: inherit;
            display: block;
          }

          /* Checkout button – full width, tall */
          #checkout-btn {
            font-size: 1rem !important;
            padding: 1rem !important;
            min-height: 52px;
          }
        }

        .category-filters {
          display: flex;
          gap: 0.5rem;
          overflow-x: auto;
          padding-bottom: 0.5rem;
          margin-bottom: 1rem;
          scrollbar-width: none;
        }
        .cat-btn {
          padding: 0.375rem 0.875rem;
          background: transparent;
          border: 1px solid var(--border);
          border-radius: 6px;
          white-space: nowrap;
          cursor: pointer;
          transition: border-color 0.15s, background 0.15s, color 0.15s;
          color: var(--text-secondary);
          font-size: 0.8125rem;
          font-weight: 500;
        }
        .cat-btn:hover { border-color: var(--border-strong); color: var(--text-primary); }
        .cat-btn.active {
          background: rgba(37,99,235,0.12);
          color: #93c5fd;
          border-color: rgba(37,99,235,0.3);
        }

        .payment-option {
          flex: 1;
          text-align: center;
          padding: 0.625rem 0.375rem;
          border: 1px solid var(--border);
          background: transparent;
          border-radius: 8px;
          cursor: pointer;
          font-size: 1.1rem;
          color: var(--text-secondary);
          transition: border-color 0.15s, background 0.15s, color 0.15s;
        }
        .payment-option:has(input:checked) {
          background: rgba(37,99,235,0.1);
          border-color: rgba(37,99,235,0.4);
          color: #93c5fd;
        }

        .cart-summary { margin-bottom: 1rem; }
        .summary-row {
          display: flex;
          justify-content: space-between;
          padding: 0.25rem 0;
          font-size: 0.95rem;
          color: var(--text-secondary);
        }
        .summary-row.vat-row { color: var(--text-secondary); font-size: 0.875rem; }
        .summary-row.total-row {
          font-size: 1.4rem;
          font-weight: 700;
          color: var(--text-primary);
          padding-top: 0.75rem;
          margin-top: 0.5rem;
          border-top: 1px solid var(--border);
        }

        .product-toolbar {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 1rem;
        }
        .product-toolbar .category-filters { flex: 1; margin-bottom: 0; }
        .scan-btn {
          flex-shrink: 0;
          background: rgba(255, 255, 255, 0.05); /* Ghost button */
          border: 1px solid var(--border);
          border-radius: var(--radius-md); /* Pill shape */
          padding: 0.5rem 0.75rem;
          font-size: 1.25rem;
          cursor: pointer;
          color: var(--text-secondary);
          transition: background 0.2s;
        }
        .scan-btn:hover { background: rgba(255,255,255,0.1); color: var(--text-primary); }

        .customer-selector select {
          background: rgba(255,255,255,0.04);
          border: 1px solid var(--border);
          color: var(--text-primary);
          border-radius: 8px;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          width: 100%;
        }

        .invoice-modal {
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 0;
          box-shadow: 0 24px 48px rgba(0,0,0,0.6);
          width: 420px;
          max-width: 95vw;
          background: var(--bg-primary);
          color: var(--text-primary);
        }
        .invoice-modal::backdrop { background: rgba(0,0,0,0.7); }
        .invoice-content { padding: 2.5rem; }
        .invoice-header { text-align: center; margin-bottom: 1.5rem; }
        .invoice-header h2 { margin: 0 0 0.25rem; font-size: 1.75rem; color: var(--text-primary); }
        .invoice-meta {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.5rem;
          font-size: 0.875rem;
          margin-bottom: 1.5rem;
          padding-bottom: 1rem;
          border-bottom: 1px dashed var(--border);
          color: var(--text-secondary);
        }
        .invoice-table { width: 100%; border-collapse: collapse; font-size: 0.875rem; margin-bottom: 1rem; }
        .invoice-table th { background: rgba(255,255,255,0.05); padding: 0.75rem 0.5rem; text-align: left; font-weight: 600; color: var(--text-primary); }
        .invoice-table td { padding: 0.75rem 0.5rem; border-bottom: 1px solid var(--border); color: var(--text-primary); }
        .invoice-totals { border-top: 1px solid var(--border); padding-top: 1rem; margin-bottom: 1.5rem; }
        .inv-row { display: flex; justify-content: space-between; padding: 0.25rem 0; color: var(--text-secondary); font-size: 0.9rem; }
        .inv-grand { font-size: 1.25rem; font-weight: 700; color: var(--text-primary); padding-top: 0.75rem; margin-top: 0.5rem; border-top: 1px solid var(--border); }
        .invoice-actions { display: flex; gap: 1rem; }
        .invoice-actions .btn { flex: 1; }

        .scanner-modal {
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 0;
          box-shadow: 0 24px 48px rgba(0,0,0,0.6);
          width: 380px;
          max-width: 95vw;
          background: var(--bg-primary);
          color: var(--text-primary);
        }
        .scanner-modal::backdrop { background: rgba(0,0,0,0.6); }
        .scanner-content { padding: 1.5rem; }
        .scanner-content h3 { margin: 0 0 1rem; display: flex; align-items: center; gap: 0.5rem; color: var(--text-primary); }

        #open-item-modal {
          background: var(--bg-primary) !important;
          color: var(--text-primary) !important;
          border: 1px solid var(--border, #334155);
        }
        #open-item-modal::backdrop { background: rgba(0,0,0,0.6); }
        #open-item-modal input {
          background: var(--bg-secondary) !important;
          color: var(--text-primary) !important;
          border-color: var(--border, #334155) !important;
        }
        #open-item-modal input::placeholder { color: var(--text-secondary, #94a3b8); }
        #open-item-modal #cancel-open-item {
          background: var(--bg-secondary) !important;
          color: var(--text-primary) !important;
          border-color: var(--border, #334155) !important;
        }

        #mpesa-qr-container {
          background: var(--bg-secondary, #f8fafc) !important;
          border-color: var(--border, #e5e7eb) !important;
          color: var(--text-primary);
        }

        @media print {
          body > *:not(.invoice-modal) { display: none !important; }
          .invoice-modal { box-shadow: none; }
          .invoice-actions { display: none !important; }
        }
      </style>
    `;
  }
}

export default new SalesUI();

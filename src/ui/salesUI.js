import sales from '../modules/Sales.js';
import PoolStock from '../modules/PoolStock.js';
import PocketBooks from '../modules/PocketBooks.js';
import Customers from '../modules/Customers.js';
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

        <header class="module-header" style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:1rem; padding-bottom: 1rem;">
          <div>
            <h1 style="margin:0; font-size:1.5rem; display:flex; align-items:center; gap:0.5rem;"><i class="ph-duotone ph-shopping-cart"></i> Point of Sale</h1>
            <p style="margin:0; color:var(--text-secondary); font-size:0.9rem;">Sales, checkout, and receipt printing</p>
          </div>
          <div style="display:flex;gap:0.5rem;align-items:center;flex-wrap:wrap">
            <button id="sales-ai-btn" class="btn btn-secondary" style="border:1px solid #6366f1;color:#6366f1">
              <i class="ph-duotone ph-robot"></i> AI Insights
            </button>
          </div>
        </header>

        <!-- Sales Stats (Compact) -->
        <div class="sales-stats">
          <div class="stat-card today-revenue">
            <div class="stat-content">
              <p class="stat-label">Revenue</p>
              <h2 class="stat-value">${sym}${todaySummary.revenue.toLocaleString()}</h2>
            </div>
          </div>
          <div class="stat-card">
             <div class="stat-content">
              <p class="stat-label">Sales</p>
              <h2 class="stat-value">${todaySummary.totalSales}</h2>
            </div>
          </div>
        </div>

        <div class="pos-layout">
          <!-- Left: Product Grid -->
          <div class="product-section">
            <div class="product-toolbar">
              <div class="category-filters" id="category-filters">
                <button class="cat-btn active" data-cat="all">All</button>
                ${[...new Set(inventory.map(i => i.category))].map(cat => `
                  <button class="cat-btn" data-cat="${cat}">${cat}</button>
                `).join('')}
              </div>
              <button id="sales-scan-btn" class="btn-icon scan-btn" title="Scan Barcode to find product">
                <i class="ph ph-barcode"></i>
              </button>
            </div>

            <div class="product-grid" id="product-grid">
              ${this.renderProductGrid(inventory)}
            </div>
          </div>

          <!-- Right: Cart & Checkout -->
          <div class="cart-section">
            <div class="card cart-card">
              <div class="card-header">
                <h3><i class="ph-duotone ph-shopping-cart"></i> Current Sale</h3>
                <button id="clear-cart" class="btn-text text-danger">Clear</button>
              </div>
              <div class="card-body">
                <!-- Customer Selector -->
                <div class="customer-selector mb-3">
                    <select id="sale-customer" class="form-select">
                        <option value=""><i class="ph ph-user"></i> Guest (Walk-in)</option>
                        ${this.customers.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
                    </select>
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
                </div>

                <div id="mpesa-qr-container" style="display: none; text-align: center; margin-bottom: 1rem; border: 2px dashed #e5e7eb; padding: 1rem; border-radius: 8px;">
                  <p style="margin-bottom: 0.5rem; font-weight: 600;">Scan to Pay with M-Pesa</p>
                  <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=M-PESA-MERCHANT-123456" alt="M-Pesa QR Code" style="width: 150px; height: 150px;">
                  <p style="font-size: 0.8rem; color: #6b7280; margin-top: 0.5rem;">Merchant ID: 123456</p>
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
      <button class="product-card open-item-btn" style="border-left: 4px solid #6366f1;">
        <div class="prod-name" style="color: var(--text-primary);">Open Item</div>
        <div class="prod-price" style="font-size: 1rem; color: #6366f1;">Enter Price</div>
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
          <button id="add-open-item" style="flex: 1; padding: 0.75rem; border: none; background: #6366f1; color: white; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 0.95rem;">Add</button>
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
        title: '📈 Sales AI Insights',
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
                <li style="background:var(--bg-secondary); padding:0.75rem; border-radius:8px; border-left:3px solid ${sevColors[ins.severity] || '#6366f1'}">
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

      const grandTotal = subtotal; // Prices are already VAT inclusive
      const vatAmount = grandTotal - (grandTotal / 1.15); // Extract 15% VAT from the inclusive total
      const exVatSubtotal = grandTotal - vatAmount; // The true subtotal before VAT

      container.querySelector('#cart-subtotal').textContent = `${this.currencySym}${exVatSubtotal.toFixed(2)}`;
      container.querySelector('#cart-vat').textContent = `${this.currencySym}${vatAmount.toFixed(2)}`;
      container.querySelector('#cart-total').textContent = `${this.currencySym}${grandTotal.toFixed(2)}`;
      checkoutBtn.textContent = `Charge ${this.currencySym}${grandTotal.toFixed(2)}`;
      checkoutBtn.disabled = false;

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

    // Filter Items
    categoryFilters.addEventListener('click', (e) => {
      if (e.target.classList.contains('cat-btn')) {
        container.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        const cat = e.target.dataset.cat;
        const filtered = cat === 'all' ? inventory : inventory.filter(i => i.category === cat);
        grid.innerHTML = this.renderProductGrid(filtered);
      }
    });

    // Add to Cart (Delegation)

    // Hardware Integration: HID Barcode Scanner (The Speed Moat)
    if (window._salesBarcodeListener) {
      document.removeEventListener('keydown', window._salesBarcodeListener);
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
            <div style="display:flex;justify-content:space-between;margin-top:1rem;padding-top:1rem;border-top:1px dashed var(--border-color);">
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
        const grandTotal = cart.reduce((sum, i) => sum + (i.price * i.quantity), 0); // Inclusive of VAT
        const vatAmount = grandTotal - (grandTotal / 1.15); // Extract 15% VAT
        const subtotal = grandTotal - vatAmount; // True subtotal before VAT

        const session = JSON.parse(localStorage.getItem('erp_session') || '{}');
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
          discount: 0,
          vatAmount,
          vat: 0.15,
          total: grandTotal,
          paymentMethod,
          customerId,
          customerName,
          cashierName
        });

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

  showInvoiceModal(sale, customerName, paymentMethod) {
    const session = JSON.parse(localStorage.getItem('erp_session') || '{}');
    const businessName = session.businessName || 'My Business';
    const invoiceDate = new Date(sale.timestamp).toLocaleString();
    const invoiceNo = sale.id ? sale.id.replace('sale_', 'INV-') : `INV-${Date.now()}`;

    const linesHtml = (sale.items || []).map(item => `
      <tr>
        <td>${item.name || item.sku}</td>
        <td style="text-align:center">${item.quantity}</td>
        <td style="text-align:right">R ${(item.unitPrice || 0).toFixed(2)}</td>
        <td style="text-align:right">R ${(item.total || 0).toFixed(2)}</td>
      </tr>
    `).join('');

    const payBadge = { cash: '#10b981', card: '#6366f1', mobile: '#f59e0b', mpesa: '#16a34a' }[paymentMethod] || '#6b7280';

    const modal = document.createElement('dialog');
    modal.className = 'invoice-modal';
    modal.innerHTML = `
      <div class="invoice-content">
        <div class="invoice-header">
          <h2>${businessName}</h2>
          <p style="color:#6b7280;margin:0">Tax Invoice</p>
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
        <p style="text-align:center;color:#6b7280;margin-top:0.5rem">Point camera at barcode or QR code</p>
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

  renderStyles() {
    return `
      <style>
        .sales-container { padding: 1rem; max-width: 1200px; margin: 0 auto; overflow-x: hidden; }

        .sales-stats {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
          margin-bottom: 1rem;
        }
        .stat-card {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid var(--border-color);
          padding: 1rem;
          border-radius: var(--radius-lg);
          box-shadow: 0 4px 6px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
        }
        .badge.cash { background: #10b981; color: white; }
        .badge.card { background: #6366f1; color: white; }
        .badge.mobile { background: #f59e0b; color: white; }
        .badge.mpesa { background: #16a34a; color: white; }
        .today-revenue { border-left: 4px solid #10b981; }
        .today-revenue .stat-value { color: #10b981; }
        .stat-value { font-size: 1.5rem; font-weight: 700; margin: 0; color: var(--text-primary); }
        .stat-label { font-size: 0.8rem; margin: 0; color: var(--text-secondary); }

        .pos-layout {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 1.5rem;
          height: calc(100vh - 200px);
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

          .sales-stats {
            grid-template-columns: 1fr 1fr;
            gap: 0.5rem;
            margin-bottom: 0.75rem;
          }
          .stat-card { padding: 0.75rem; }
          .stat-value { font-size: 1.2rem !important; }

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
          padding: 0.5rem 1rem;
          background: rgba(255, 255, 255, 0.05); /* Ghost base */
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md); /* Pill shape */
          white-space: nowrap;
          cursor: pointer;
          transition: all 0.2s;
          color: var(--text-secondary);
          font-size: 0.875rem;
        }
        .cat-btn:hover { border-color: var(--accent-primary); color: var(--accent-primary); background: rgba(255,255,255,0.1); }
        .cat-btn.active {
          background: var(--accent-primary);
          color: #000;
          border-color: var(--accent-primary);
        }

        .payment-option {
          flex: 1;
          text-align: center;
          padding: 0.75rem;
          border: 1px solid var(--border-color);
          background: rgba(255, 255, 255, 0.03);
          border-radius: var(--radius-md); /* Pill shape */
          cursor: pointer;
          font-size: 1.25rem;
          color: var(--text-secondary);
          transition: border-color 0.15s, background 0.15s;
        }
        .payment-option:has(input:checked) {
          background: rgba(255, 255, 255, 0.1);
          border-color: var(--accent-primary);
          color: var(--accent-primary);
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
          border-top: 1px solid var(--border-color);
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
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md); /* Pill shape */
          padding: 0.5rem 0.75rem;
          font-size: 1.25rem;
          cursor: pointer;
          color: var(--text-secondary);
          transition: background 0.2s;
        }
        .scan-btn:hover { background: rgba(255,255,255,0.1); color: var(--text-primary); }

        .customer-selector select {
          background: rgba(255,255,255,0.05);
          border: 1px solid var(--border-color);
          color: var(--text-primary);
          border-radius: var(--radius-md);
        }

        .invoice-modal {
          border: 1px solid var(--border-color);
          border-radius: var(--radius-lg);
          padding: 0;
          box-shadow: var(--shadow-lg);
          width: 420px;
          max-width: 95vw;
          background: var(--bg-primary);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
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
          border-bottom: 1px dashed var(--border-color);
          color: var(--text-secondary);
        }
        .invoice-table { width: 100%; border-collapse: collapse; font-size: 0.875rem; margin-bottom: 1rem; }
        .invoice-table th { background: rgba(255,255,255,0.05); padding: 0.75rem 0.5rem; text-align: left; font-weight: 600; color: var(--text-primary); }
        .invoice-table td { padding: 0.75rem 0.5rem; border-bottom: 1px solid var(--border-color); color: var(--text-primary); }
        .invoice-totals { border-top: 1px solid var(--border-color); padding-top: 1rem; margin-bottom: 1.5rem; }
        .inv-row { display: flex; justify-content: space-between; padding: 0.25rem 0; color: var(--text-secondary); font-size: 0.9rem; }
        .inv-grand { font-size: 1.25rem; font-weight: 700; color: var(--text-primary); padding-top: 0.75rem; margin-top: 0.5rem; border-top: 1px solid var(--border-color); }
        .invoice-actions { display: flex; gap: 1rem; }
        .invoice-actions .btn { flex: 1; }

        .scanner-modal {
          border: none;
          border-radius: 16px;
          padding: 0;
          box-shadow: 0 20px 50px rgba(0,0,0,0.5);
          width: 380px;
          max-width: 95vw;
          background: var(--bg-primary, rgba(15, 23, 42, 0.95));
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
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

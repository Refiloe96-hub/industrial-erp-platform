// Sales UI - Point of Sale interface for shop owners
import sales from '../modules/Sales.js';
import PoolStock from '../modules/PoolStock.js';
import PocketBooks from '../modules/PocketBooks.js';
import Customers from '../modules/Customers.js';
import PaymentService from '../services/payments.js';

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

    container.innerHTML = `
      <div class="sales-container">
        ${this.renderStyles()}
        
        <!-- Sales Stats (Compact) -->
        <div class="sales-stats">
          <div class="stat-card today-revenue">
            <div class="stat-content">
              <p class="stat-label">Revenue</p>
              <h2 class="stat-value">R ${todaySummary.revenue.toLocaleString()}</h2>
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
                    <span id="cart-subtotal">R 0.00</span>
                  </div>
                  <div class="summary-row vat-row">
                    <span>VAT (15%):</span>
                    <span id="cart-vat">R 0.00</span>
                  </div>
                  <div class="summary-row total-row">
                    <span>Total:</span>
                    <span id="cart-total">R 0.00</span>
                  </div>
                </div>

                <div class="payment-methods">
                  <label class="payment-option">
                    <input type="radio" name="payment" value="cash" checked> <i class="ph-duotone ph-money"></i>
                  </label>
                  <label class="payment-option">
                    <input type="radio" name="payment" value="card"> <i class="ph-duotone ph-credit-card"></i>
                  </label>
                  <label class="payment-option">
                    <input type="radio" name="payment" value="mobile"> <i class="ph-duotone ph-device-mobile"></i>
                  </label>
                  <label class="payment-option">
                    <input type="radio" name="payment" value="mpesa"> <i class="ph-duotone ph-qr-code"></i>
                  </label>
                </div>

                <div id="mpesa-qr-container" style="display: none; text-align: center; margin-bottom: 1rem; border: 2px dashed #e5e7eb; padding: 1rem; border-radius: 8px;">
                  <p style="margin-bottom: 0.5rem; font-weight: 600;">Scan to Pay with M-Pesa</p>
                  <!-- Placeholder QR Code -->
                  <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=M-PESA-MERCHANT-123456" alt="M-Pesa QR Code" style="width: 150px; height: 150px;">
                  <p style="font-size: 0.8rem; color: #6b7280; margin-top: 0.5rem;">Merchant ID: 123456</p>
                </div>

                <button id="checkout-btn" class="btn btn-primary btn-lg btn-block" disabled>
                  Charge R 0
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
    // Sort: High frequency items first (simulated by reorderLevel for now)
    // In real app, we'd use sales history frequency
    const sorted = [...items].sort((a, b) => (b.reorderLevel || 0) - (a.reorderLevel || 0));

    const openItemBtn = `
      <button class="product-card open-item-btn" style="border-left: 4px solid #6366f1; background: #eef2ff;">
        <div class="prod-name">Open Item</div>
        <div class="prod-price" style="font-size: 1rem; color: #6366f1;">Enter Price</div>
        <div class="prod-stock">Custom Sale</div>
      </button>
    `;

    // Modal for Open Item
    const modal = `
      <dialog id="open-item-modal" style="border: none; border-radius: 12px; padding: 2rem; box-shadow: 0 10px 25px rgba(0,0,0,0.2); width: 300px;">
        <h3 style="margin-top: 0;">Open Item</h3>
        <input type="text" id="open-item-name" placeholder="Item Name (Optional)" style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 8px; margin-bottom: 1rem; box-sizing: border-box;">
        <input type="number" id="open-item-price" placeholder="Price (R)" style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 8px; margin-bottom: 1rem; font-size: 1.5rem; text-align: center; box-sizing: border-box;" step="0.01">
        <div style="display: flex; gap: 0.5rem;">
          <button id="cancel-open-item" style="flex: 1; padding: 0.75rem; border: 1px solid #ddd; background: white; border-radius: 8px; cursor: pointer;">Cancel</button>
          <button id="add-open-item" style="flex: 1; padding: 0.75rem; border: none; background: #6366f1; color: white; border-radius: 8px; font-weight: bold; cursor: pointer;">Add</button>
        </div>
      </dialog>
    `;

    // Append modal to body if not exists
    if (!document.getElementById('open-item-modal')) {
      document.body.insertAdjacentHTML('beforeend', modal);
    }

    return openItemBtn + sorted.map(item => {
      const price = item.unitPrice || item.unitCost || 0;
      return `
      <button class="product-card" data-sku="${item.sku}" data-price="${price}" data-name="${item.name}" style="border-left: 4px solid ${item.color || '#ccc'}">
        <div class="prod-name">${item.name}</div>
        <div class="prod-price">R ${price}</div>
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

    // Helper: Update Cart UI
    const updateCart = () => {
      cartItemsContainer.innerHTML = '';

      if (cart.length === 0) {
        cartItemsContainer.innerHTML = '<p class="text-muted text-center" id="empty-cart-msg">Tap items to add</p>';
        checkoutBtn.disabled = true;
        checkoutBtn.textContent = 'Charge R 0.00';
        container.querySelector('#cart-subtotal').textContent = 'R 0.00';
        container.querySelector('#cart-vat').textContent = 'R 0.00';
        container.querySelector('#cart-total').textContent = 'R 0.00';
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
            <span class="cart-item-price">R ${item.price.toFixed(2)} x ${item.quantity}</span>
          </div>
          <div class="cart-item-total">R ${itemTotal.toFixed(2)}</div>
          <button class="btn-remove-item" data-index="${index}">✕</button>
        `;
        cartItemsContainer.appendChild(row);
      });

      const vatAmount = subtotal * 0.15;
      const grandTotal = subtotal + vatAmount;

      container.querySelector('#cart-subtotal').textContent = `R ${subtotal.toFixed(2)}`;
      container.querySelector('#cart-vat').textContent = `R ${vatAmount.toFixed(2)}`;
      container.querySelector('#cart-total').textContent = `R ${grandTotal.toFixed(2)}`;
      checkoutBtn.textContent = `Charge R ${grandTotal.toFixed(2)}`;
      checkoutBtn.disabled = false;

      // Remove handlers
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
      if (selected && selected.value === 'mpesa') {
        qrContainer.style.display = 'block';
      } else {
        qrContainer.style.display = 'none';
      }
    };

    paymentRadios.forEach(radio => {
      radio.addEventListener('change', toggleQR);
    });

    // Initial check
    toggleQR();

    // Filter Items
    categoryFilters.addEventListener('click', (e) => {
      if (e.target.classList.contains('cat-btn')) {
        // Active state
        container.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');

        const cat = e.target.dataset.cat;
        const filtered = cat === 'all'
          ? inventory
          : inventory.filter(i => i.category === cat);

        grid.innerHTML = this.renderProductGrid(filtered);
      }
    });

    // Add to Cart (Delegation)
    grid.addEventListener('click', (e) => {
      // Handle Open Item Click
      if (e.target.closest('.open-item-btn')) {
        const modal = document.getElementById('open-item-modal');
        const priceInput = document.getElementById('open-item-price');
        const nameInput = document.getElementById('open-item-name');

        nameInput.value = '';
        priceInput.value = '';
        modal.showModal();
        priceInput.focus();

        // Handle Add
        const confirmBtn = document.getElementById('add-open-item');
        const cancelBtn = document.getElementById('cancel-open-item');

        // Remove old listeners to prevent duplicates
        const newConfirm = confirmBtn.cloneNode(true);
        const newCancel = cancelBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirm, confirmBtn);
        cancelBtn.parentNode.replaceChild(newCancel, cancelBtn);

        newCancel.addEventListener('click', () => modal.close());

        newConfirm.addEventListener('click', () => {
          const price = parseFloat(priceInput.value);
          const name = nameInput.value || 'Open Item';

          if (price && price > 0) {
            cart.push({
              sku: `OPEN-${Date.now()}`,
              name: name,
              price: price,
              quantity: 1,
              isOpenItem: true
            });
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

      // Animation feedback
      card.classList.add('active');
      setTimeout(() => card.classList.remove('active'), 100);

      const sku = card.dataset.sku;
      const name = card.dataset.name;
      const price = parseFloat(card.dataset.price);

      // Check existing
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
      btn.disabled = true;
      btn.textContent = 'Processing...';

      try {
        const paymentMethod = container.querySelector('input[name="payment"]:checked').value;
        const subtotal = cart.reduce((sum, i) => sum + (i.price * i.quantity), 0);
        const vatAmount = subtotal * 0.15;
        const grandTotal = subtotal + vatAmount;

        const customerSelect = container.querySelector('#sale-customer');
        const customerId = customerSelect.value ? parseInt(customerSelect.value) : null;
        const customerName = customerSelect.value ? customerSelect.options[customerSelect.selectedIndex].text : 'Walk-in';

        // Wait for terminal process (Phase 13 Integration)
        if (paymentMethod === 'card') {
          btn.textContent = 'Waiting for Card Tap...';
          await PaymentService.initializeTerminal();
          const result = await PaymentService.processCardPayment(grandTotal, `order_${Date.now()}`);
          console.log('Payment Gateway Txn:', result.transactionId);
        } else if (paymentMethod === 'mobile' || paymentMethod === 'mpesa') {
          btn.textContent = 'Awaiting Phone Prompt...';
          // Mock standard phone number 
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
          customerName
        });

        cart = [];
        updateCart();
        this.showInvoiceModal(sale, customerName, paymentMethod);

      } catch (err) {
        console.error(err);
        alert('Sale failed: ' + err.message);
        const sub = cart.reduce((s, i) => s + (i.price * i.quantity), 0);
        btn.disabled = false;
        btn.textContent = `Charge R ${(sub * 1.15).toFixed(2)}`;
      }
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
          <div>
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
          <div class="inv-row"><span>Subtotal</span><span>R ${(sale.subtotal || 0).toFixed(2)}</span></div>
          <div class="inv-row"><span>VAT (15%)</span><span>R ${(sale.vatAmount || 0).toFixed(2)}</span></div>
          <div class="inv-row inv-grand"><span>Total</span><span>R ${(sale.total || 0).toFixed(2)}</span></div>
        </div>
        <div class="invoice-actions">
          <button id="print-invoice-btn" class="btn btn-secondary"><i class="ph ph-printer"></i> Print</button>
          <button id="close-invoice-btn" class="btn btn-primary">New Sale</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    modal.showModal();

    modal.querySelector('#print-invoice-btn').addEventListener('click', () => window.print());
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
        .sales-container { padding: 1rem; max-width: 1200px; margin: 0 auto; }
        
        /* Stats */
        .sales-stats { 
          display: grid; 
          grid-template-columns: 1fr 1fr; 
          gap: 1rem; 
          margin-bottom: 1rem; 
        }
        .stat-card {
          background: var(--bg-primary);
          border: 1px solid var(--border, #e5e7eb);
          padding: 1rem;
          border-radius: 12px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.06);
          display: flex;
          align-items: center;
        }
        .badge.cash { background: #10b981; color: white; }
        .badge.card { background: #6366f1; color: white; }
        .badge.mobile { background: #f59e0b; color: white; }
        .badge.mpesa { background: #16a34a; color: white; }
        .today-revenue { 
          border-left: 4px solid #10b981;
        }
        .today-revenue .stat-value { color: #10b981; }
        .stat-value { font-size: 1.5rem; font-weight: 700; margin: 0; color: var(--text-primary); }
        .stat-label { font-size: 0.8rem; margin: 0; color: var(--text-secondary); }

        /* Layout */
        .pos-layout {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 1.5rem;
          height: calc(100vh - 200px);
        }

        @media (max-width: 768px) {
          .pos-layout { grid-template-columns: 1fr; height: auto; }
          .cart-section { order: -1; position: sticky; top: 0; z-index: 10; margin-bottom: 1rem; }
        }

        /* Product Grid */
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
          background: var(--bg-secondary, #f8fafc);
          border: 1px solid var(--border, #e5e7eb);
          border-radius: 20px;
          white-space: nowrap;
          cursor: pointer;
          transition: all 0.2s;
          color: var(--text-secondary);
          font-size: 0.875rem;
        }
        .cat-btn:hover { border-color: var(--accent-primary, #f97316); color: var(--accent-primary, #f97316); }
        .cat-btn.active {
          background: var(--accent-primary, #2563eb);
          color: white;
          border-color: var(--accent-primary, #2563eb);
        }

        .product-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
          gap: 1rem;
          overflow-y: auto;
          max-height: calc(100vh - 280px);
          padding-right: 0.5rem;
        }

        .product-card {
          background: var(--bg-primary);
          border: 1px solid var(--border, #e5e7eb);
          border-radius: 12px;
          padding: 1rem;
          text-align: left;
          box-shadow: 0 2px 4px rgba(0,0,0,0.06);
          cursor: pointer;
          transition: transform 0.1s, border-color 0.15s;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          height: 120px;
          position: relative;
        }
        .product-card:hover { border-color: var(--accent-primary, #f97316); }
        .product-card:active { transform: scale(0.96); }
        .prod-name { font-weight: 600; font-size: 1rem; line-height: 1.2; color: var(--text-primary); }
        .prod-price { font-size: 1.25rem; font-weight: 700; color: var(--accent-primary, #2563eb); margin-top: auto; }
        .prod-stock { font-size: 0.75rem; color: var(--text-secondary); }
        .prod-stock.out-of-stock { color: #ef4444; font-weight: bold; }

        /* Cart */
        .cart-card { 
          height: 100%; 
          display: flex; 
          flex-direction: column; 
          border-radius: 12px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
          background: var(--bg-primary);
          border: 1px solid var(--border, #e5e7eb);
        }
        .cart-body { 
          flex: 1; 
          display: flex; 
          flex-direction: column; 
          overflow: hidden; 
        }
        .cart-items { flex: 1; overflow-y: auto; padding-right: 0.5rem; margin-bottom: 1rem; }
        
        .cart-item-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.75rem 0;
          border-bottom: 1px solid var(--border, #f3f4f6);
        }
        .cart-item-name { display: block; font-weight: 500; color: var(--text-primary); }
        .cart-item-price { font-size: 0.8rem; color: var(--text-secondary); }
        .cart-item-total { font-weight: 600; color: var(--text-primary); }
        
        .btn-remove-item {
          background: none;
          border: none;
          color: #ef4444;
          font-weight: bold;
          cursor: pointer;
          padding: 0.5rem;
        }

        .payment-methods {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1rem;
        }
        .payment-option {
          flex: 1;
          text-align: center;
          padding: 0.75rem;
          border: 1px solid var(--border, #e5e7eb);
          border-radius: 8px;
          cursor: pointer;
          font-size: 1.25rem;
          color: var(--text-secondary);
          transition: border-color 0.15s, background 0.15s;
        }
        .payment-option:has(input:checked) {
          background: rgba(var(--accent-rgb, 37,99,235), 0.08);
          border-color: var(--accent-primary, #2563eb);
          color: var(--accent-primary, #2563eb);
        }

        /* Cart summary rows */
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
          border-top: 2px solid var(--border, #f3f4f6);
        }

        /* Product toolbar (filters + scan btn) */
        .product-toolbar {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 1rem;
        }
        .product-toolbar .category-filters { flex: 1; margin-bottom: 0; }
        .scan-btn {
          flex-shrink: 0;
          background: var(--bg-secondary, #f8fafc);
          border: 1px solid var(--border, #e5e7eb);
          border-radius: 8px;
          padding: 0.5rem 0.75rem;
          font-size: 1.25rem;
          cursor: pointer;
          color: var(--text-secondary);
          transition: background 0.2s;
        }
        .scan-btn:hover { background: var(--bg-primary); border-color: var(--accent-primary, #f97316); }

        /* Search bar */
        .product-search {
          background: var(--bg-secondary, #f8fafc);
          border: 1px solid var(--border, #e5e7eb);
          border-radius: 8px;
          padding: 0.5rem 0.75rem;
          color: var(--text-primary);
          font-size: 0.875rem;
        }
        .product-search::placeholder { color: var(--text-secondary); }

        /* Customer selector */
        .customer-selector select {
          background: var(--bg-secondary, #f8fafc);
          border: 1px solid var(--border, #e5e7eb);
          color: var(--text-primary);
        }

        /* Invoice modal */
        .invoice-modal {
          border: none;
          border-radius: 16px;
          padding: 0;
          box-shadow: 0 20px 50px rgba(0,0,0,0.25);
          width: 420px;
          max-width: 95vw;
          background: var(--bg-primary);
          color: var(--text-primary);
        }
        .invoice-modal::backdrop { background: rgba(0,0,0,0.5); }
        .invoice-content { padding: 2rem; }
        .invoice-header { text-align: center; margin-bottom: 1.5rem; }
        .invoice-header h2 { margin: 0 0 0.25rem; font-size: 1.5rem; color: var(--text-primary); }
        .invoice-meta {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.5rem;
          font-size: 0.875rem;
          margin-bottom: 1.5rem;
          padding-bottom: 1rem;
          border-bottom: 1px dashed var(--border, #e5e7eb);
          color: var(--text-secondary);
        }
        .invoice-table { width: 100%; border-collapse: collapse; font-size: 0.875rem; margin-bottom: 1rem; }
        .invoice-table th { background: var(--bg-secondary, #f9fafb); padding: 0.5rem; text-align: left; font-weight: 600; color: var(--text-primary); }
        .invoice-table td { padding: 0.5rem; border-bottom: 1px solid var(--border, #f3f4f6); color: var(--text-primary); }
        .invoice-totals { border-top: 2px solid var(--border, #e5e7eb); padding-top: 1rem; margin-bottom: 1.5rem; }
        .inv-row { display: flex; justify-content: space-between; padding: 0.25rem 0; color: var(--text-secondary); font-size: 0.9rem; }
        .inv-grand { font-size: 1.25rem; font-weight: 700; color: var(--text-primary); padding-top: 0.5rem; margin-top: 0.25rem; border-top: 1px solid var(--border, #e5e7eb); }
        .invoice-actions { display: flex; gap: 1rem; }
        .invoice-actions .btn { flex: 1; }

        /* Scanner modal */
        .scanner-modal {
          border: none;
          border-radius: 16px;
          padding: 0;
          box-shadow: 0 20px 50px rgba(0,0,0,0.3);
          width: 380px;
          max-width: 95vw;
          background: var(--bg-primary);
          color: var(--text-primary);
        }
        .scanner-modal::backdrop { background: rgba(0,0,0,0.6); }
        .scanner-content { padding: 1.5rem; }
        .scanner-content h3 { margin: 0 0 1rem; display: flex; align-items: center; gap: 0.5rem; color: var(--text-primary); }

        /* M-Pesa QR container */
        #mpesa-qr-container {
          background: var(--bg-secondary, #f8fafc) !important;
          border-color: var(--border, #e5e7eb) !important;
          color: var(--text-primary);
        }

        /* Print styles — hide everything except the invoice */
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

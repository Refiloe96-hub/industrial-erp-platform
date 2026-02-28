
import PoolStock from '../modules/PoolStock.js';
import db, { STORES } from '../db/index.js';

class PoolStockUI {
    constructor(container) {
        this.container = container;
        this.module = new PoolStock(db);
        this.filters = { category: 'all', stockLevel: 'all' };
    }

    async render() {
        await this.loadDashboard();
    }

    async loadDashboard() {
        this.container.innerHTML = '<div class="loading">Loading PoolStock...</div>';

        try {
            const inventory = await this.module.getInventory();
            const categories = [...new Set(inventory.map(i => i.category).filter(Boolean))];

            // Calculate stats
            const totalItems = inventory.length;
            const lowStockItems = inventory.filter(i => i.quantity <= (i.reorderLevel || 10));
            const outOfStock = inventory.filter(i => i.quantity === 0);
            const totalValue = inventory.reduce((sum, i) => sum + (i.quantity * (i.unitPrice || 0)), 0);

            this.container.innerHTML = `
                <div class="poolstock-ui">
                    <header class="module-header">
                        <div>
                            <h1><i class="ph-duotone ph-package"></i> PoolStock</h1>
                            <p>Inventory & Procurement Management</p>
                        </div>
                        <button id="add-item-btn" class="btn btn-primary"><i class="ph ph-plus"></i> Add Item</button>
                    </header>

                    <!-- Tab Navigation -->
                    <div class="ps-tab-bar">
                        <button class="ps-tab active" data-tab="inventory"><i class="ph ph-package"></i> Inventory</button>
                        <button class="ps-tab" data-tab="purchase-orders"><i class="ph ph-clipboard-text"></i> Purchase Orders</button>
                    </div>

                    <!-- Stats Cards -->
                    <div class="stats-grid">
                        <div class="stat-card primary">
                            <div class="stat-icon"><i class="ph-duotone ph-package"></i></div>
                            <div class="stat-content">
                                <span class="stat-label">Total Items</span>
                                <span class="stat-value">${totalItems}</span>
                            </div>
                        </div>
                        <div class="stat-card warning">
                            <div class="stat-icon"><i class="ph-duotone ph-warning-circle"></i></div>
                            <div class="stat-content">
                                <span class="stat-label">Low Stock</span>
                                <span class="stat-value">${lowStockItems.length}</span>
                            </div>
                        </div>
                        <div class="stat-card danger">
                            <div class="stat-icon"><i class="ph-duotone ph-prohibit"></i></div>
                            <div class="stat-content">
                                <span class="stat-label">Out of Stock</span>
                                <span class="stat-value">${outOfStock.length}</span>
                            </div>
                        </div>
                        <div class="stat-card success">
                            <div class="stat-icon"><i class="ph-duotone ph-currency-dollar"></i></div>
                            <div class="stat-content">
                                <span class="stat-label">Inventory Value</span>
                                <span class="stat-value">R ${totalValue.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Filters -->
                    <div class="filters-bar">
                        <div class="filter-group">
                            <label>Category:</label>
                            <select id="category-filter">
                                <option value="all">All Categories</option>
                                ${categories.map(c => `<option value="${c}">${c}</option>`).join('')}
                            </select>
                        </div>
                        <div class="filter-group">
                            <label>Stock Level:</label>
                            <select id="stock-filter">
                                <option value="all">All Levels</option>
                                <option value="low">Low Stock</option>
                                <option value="out">Out of Stock</option>
                                <option value="healthy">Healthy Stock</option>
                            </select>
                        </div>
                        <div class="filter-group search">
                            <label>Search:</label>
                            <div class="search-with-scan">
                                <input type="text" id="search-filter" placeholder="Search by name or SKU...">
                                <button id="barcode-scan-btn" class="btn-icon scan-btn" title="Scan Barcode"><i class="ph ph-barcode"></i></button>
                            </div>
                        </div>
                    </div>

                    <!-- Inventory Table -->
                    <div class="inventory-section">
                        <div class="table-container">
                            <table class="data-table" id="inventory-table">
                                <thead>
                                    <tr>
                                        <th>Image</th>
                                        <th>SKU</th>
                                        <th>Name</th>
                                        <th>Category</th>
                                        <th>Quantity</th>
                                        <th>Reorder Level</th>
                                        <th>Unit Price</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${this.renderInventoryRows(inventory)}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            `;

            this.attachEventListeners();
            this.injectStyles();

        } catch (err) {
            console.error('Error loading PoolStock:', err);
            this.container.innerHTML = `<p class="error">Error: ${err.message}</p>`;
        }
    }

    renderInventoryRows(inventory) {
        if (!inventory.length) {
            return '<tr><td colspan="9" class="empty-state">No inventory items. Click "Add Item" or use Seed Data.</td></tr>';
        }

        return inventory.map(item => {
            const status = this.getStockStatus(item);
            return `
                <tr class="inventory-row ${status.class}">
                    <td class="item-image">
                        ${item.image ?
                    `<img src="${item.image}" alt="${item.name}" class="product-thumb">` :
                    `<div class="product-thumb-placeholder"><i class="ph-duotone ph-package"></i></div>`
                }
                    </td>
                    <td class="sku">${item.sku}</td>
                    <td><strong>${item.name}</strong></td>
                    <td><span class="badge category">${item.category || 'Uncategorized'}</span></td>
                    <td class="quantity ${status.class}">${item.quantity}</td>
                    <td>${item.reorderLevel || 10}</td>
                    <td>R ${(item.unitPrice || 0).toLocaleString()}</td>
                    <td><span class="badge ${status.class}">${status.label}</span></td>
                    <td class="actions">
                        <button class="btn-icon" onclick="window.poolStockUI.editItem('${item.sku}')" title="Edit"><i class="ph-duotone ph-pencil-simple"></i></button>
                        <button class="btn-icon" onclick="window.poolStockUI.adjustStock('${item.sku}')" title="Adjust Stock"><i class="ph-duotone ph-archive-box"></i></button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    getStockStatus(item) {
        const qty = item.quantity;
        const reorder = item.reorderLevel || 10;

        if (qty === 0) return { label: 'Out of Stock', class: 'danger' };
        if (qty <= reorder) return { label: 'Low Stock', class: 'warning' };
        return { label: 'In Stock', class: 'success' };
    }

    attachEventListeners() {
        // Make instance globally available for inline handlers
        window.poolStockUI = this;

        // Add Item Button
        this.container.querySelector('#add-item-btn').addEventListener('click', () => {
            this.showAddItemModal();
        });

        // Tab navigation
        this.container.querySelectorAll('.ps-tab').forEach(btn => {
            btn.addEventListener('click', () => {
                if (btn.dataset.tab === 'purchase-orders') {
                    this.loadPurchaseOrders();
                } else {
                    this.loadDashboard();
                }
            });
        });

        // Filters
        this.container.querySelector('#category-filter').addEventListener('change', () => this.applyFilters());
        this.container.querySelector('#stock-filter').addEventListener('change', () => this.applyFilters());
        this.container.querySelector('#search-filter').addEventListener('input', () => this.applyFilters());

        // Barcode scan
        this.container.querySelector('#barcode-scan-btn').addEventListener('click', () => {
            this.scanBarcode((value) => {
                const searchInput = this.container.querySelector('#search-filter');
                if (searchInput) {
                    searchInput.value = value;
                    this.applyFilters();
                }
            });
        });
    }

    async applyFilters() {
        const categoryFilter = this.container.querySelector('#category-filter').value;
        const stockFilter = this.container.querySelector('#stock-filter').value;
        const searchFilter = this.container.querySelector('#search-filter').value.toLowerCase();

        let inventory = await this.module.getInventory();

        // Apply category filter
        if (categoryFilter !== 'all') {
            inventory = inventory.filter(i => i.category === categoryFilter);
        }

        // Apply stock level filter
        if (stockFilter === 'low') {
            inventory = inventory.filter(i => i.quantity > 0 && i.quantity <= (i.reorderLevel || 10));
        } else if (stockFilter === 'out') {
            inventory = inventory.filter(i => i.quantity === 0);
        } else if (stockFilter === 'healthy') {
            inventory = inventory.filter(i => i.quantity > (i.reorderLevel || 10));
        }

        // Apply search filter
        if (searchFilter) {
            inventory = inventory.filter(i =>
                i.name.toLowerCase().includes(searchFilter) ||
                i.sku.toLowerCase().includes(searchFilter)
            );
        }

        const tbody = this.container.querySelector('#inventory-table tbody');
        tbody.innerHTML = this.renderInventoryRows(inventory);
    }

    showAddItemModal(existingItem = null) {
        const isEdit = !!existingItem;
        const modal = document.createElement('dialog');
        modal.className = 'item-modal';
        modal.innerHTML = `
            <form id="item-form">
                <h2>${isEdit ? 'Edit Item' : 'Add New Item'}</h2>
                
                <div class="form-row">
                    <div class="form-group">
                        <label>SKU *</label>
                        <input type="text" name="sku" value="${existingItem?.sku || ''}" ${isEdit ? 'readonly' : 'required'} placeholder="e.g., WIDGET-001">
                    </div>
                    <div class="form-group">
                        <label>Category</label>
                        <select name="category">
                            <option value="Raw Materials" ${existingItem?.category === 'Raw Materials' ? 'selected' : ''}>Raw Materials</option>
                            <option value="Components" ${existingItem?.category === 'Components' ? 'selected' : ''}>Components</option>
                            <option value="Finished Goods" ${existingItem?.category === 'Finished Goods' ? 'selected' : ''}>Finished Goods</option>
                            <option value="Packaging" ${existingItem?.category === 'Packaging' ? 'selected' : ''}>Packaging</option>
                            <option value="Consumables" ${existingItem?.category === 'Consumables' ? 'selected' : ''}>Consumables</option>
                        </select>
                    </div>
                </div>

                <div class="form-group">
                    <label>Item Name *</label>
                    <input type="text" name="name" value="${existingItem?.name || ''}" required placeholder="e.g., Steel Widget">
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label>Quantity</label>
                        <input type="number" name="quantity" value="${existingItem?.quantity || 0}" min="0">
                    </div>
                    <div class="form-group">
                        <label>Reorder Level</label>
                        <input type="number" name="reorderLevel" value="${existingItem?.reorderLevel || 10}" min="0">
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label>Unit Price (R)</label>
                        <input type="number" name="unitPrice" value="${existingItem?.unitPrice || 0}" min="0" step="0.01">
                    </div>
                    <div class="form-group">
                        <label>Supplier</label>
                        <input type="text" name="supplier" value="${existingItem?.supplier || ''}" placeholder="Supplier name">
                    </div>
                </div>

                <div class="form-group">
                    <label>Location</label>
                    <input type="text" name="location" value="${existingItem?.location || ''}" placeholder="e.g., Warehouse A, Shelf 3">
                </div>

                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" id="cancel-modal">Cancel</button>
                    <button type="submit" class="btn btn-primary">${isEdit ? 'Update' : 'Add'} Item</button>
                </div>
            </form>
        `;

        document.body.appendChild(modal);
        modal.showModal();

        // Close on backdrop click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.close();
                modal.remove();
            }
        });

        // Close on Escape key
        modal.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                modal.close();
                modal.remove();
            }
        });

        modal.querySelector('#cancel-modal').addEventListener('click', () => {
            modal.close();
            modal.remove();
        });

        modal.querySelector('#item-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);

            try {
                const itemData = {
                    sku: formData.get('sku'),
                    name: formData.get('name'),
                    category: formData.get('category'),
                    quantity: parseInt(formData.get('quantity')) || 0,
                    reorderLevel: parseInt(formData.get('reorderLevel')) || 10,
                    unitPrice: parseFloat(formData.get('unitPrice')) || 0,
                    supplier: formData.get('supplier'),
                    location: formData.get('location')
                };

                if (isEdit) {
                    await this.module.updateInventory(itemData);
                } else {
                    await this.module.updateInventory(itemData);
                }

                modal.close();
                modal.remove();
                this.loadDashboard();
            } catch (err) {
                alert('Failed to save item: ' + err.message);
            }
        });
    }

    async editItem(sku) {
        const inventory = await this.module.getInventory();
        const item = inventory.find(i => i.sku === sku);
        if (item) {
            this.showAddItemModal(item);
        }
    }

    async adjustStock(sku) {
        const adjustment = prompt('Enter stock adjustment (positive to add, negative to subtract):');
        if (adjustment === null) return;

        const qty = parseInt(adjustment);
        if (isNaN(qty)) {
            alert('Please enter a valid number');
            return;
        }

        try {
            const inventory = await this.module.getInventory();
            const item = inventory.find(i => i.sku === sku);
            if (item) {
                const newQty = Math.max(0, item.quantity + qty);
                await this.module.updateInventory({ ...item, quantity: newQty });
                this.loadDashboard();
            }
        } catch (err) {
            alert('Failed to adjust stock: ' + err.message);
        }
    }

    // ─── PURCHASE ORDERS ──────────────────────────────────────────────────────

    async loadPurchaseOrders() {
        this.container.innerHTML = '<div class="loading">Loading Purchase Orders...</div>';
        try {
            const orders = await this.module.getPurchaseOrders();
            const suppliers = await this.module.getSuppliers();
            const supplierMap = Object.fromEntries(suppliers.map(s => [s.id, s.name]));

            const statusBadge = (s) => ({ pending: 'warning', received: 'success', cancelled: 'danger' }[s] || 'secondary');

            this.container.innerHTML = `
                <div class="poolstock-ui">
                    <header class="module-header">
                        <div>
                            <h1><i class="ph-duotone ph-package"></i> PoolStock</h1>
                            <p>Inventory & Procurement Management</p>
                        </div>
                        <button id="create-po-btn" class="btn btn-primary"><i class="ph ph-plus"></i> Create PO</button>
                    </header>

                    <div class="ps-tab-bar">
                        <button class="ps-tab" data-tab="inventory"><i class="ph ph-package"></i> Inventory</button>
                        <button class="ps-tab active" data-tab="purchase-orders"><i class="ph ph-clipboard-text"></i> Purchase Orders</button>
                    </div>

                    <section class="po-section">
                        ${orders.length === 0 ? `
                            <div class="empty-state">
                                <i class="ph-duotone ph-clipboard-text" style="font-size:3rem;opacity:.4"></i>
                                <p>No purchase orders yet. Create one to start managing procurement.</p>
                            </div>
                        ` : `
                            <div class="table-container">
                                <table class="data-table">
                                    <thead>
                                        <tr>
                                            <th>PO #</th>
                                            <th>Supplier</th>
                                            <th>Items</th>
                                            <th>Total</th>
                                            <th>Order Date</th>
                                            <th>Expected</th>
                                            <th>Status</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${orders.map(o => `
                                            <tr>
                                                <td class="mono">PO-${o.id}</td>
                                                <td>${supplierMap[o.supplierId] || `Supplier #${o.supplierId}`}</td>
                                                <td>${(o.items || []).length} item(s)</td>
                                                <td><strong>R ${(o.totalAmount || 0).toLocaleString()}</strong></td>
                                                <td>${new Date(o.orderDate).toLocaleDateString()}</td>
                                                <td>${o.expectedDate ? new Date(o.expectedDate).toLocaleDateString() : '—'}</td>
                                                <td><span class="badge ${statusBadge(o.status)}">${o.status}</span></td>
                                                <td>
                                                    ${o.status === 'pending' ? `<button class="btn btn-sm btn-outline receive-po-btn" data-id="${o.id}"><i class="ph ph-package"></i> Receive</button>` : ''}
                                                </td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        `}
                    </section>
                </div>
            `;

            this.container.querySelector('#create-po-btn').addEventListener('click', () => this.showCreatePOModal());

            this.container.querySelectorAll('.ps-tab').forEach(btn => {
                btn.addEventListener('click', () => {
                    if (btn.dataset.tab === 'inventory') this.loadDashboard();
                });
            });

            this.container.querySelectorAll('.receive-po-btn').forEach(btn => {
                btn.addEventListener('click', () => this.showReceivePOModal(parseInt(btn.dataset.id)));
            });

            this.injectStyles();
        } catch (err) {
            this.container.innerHTML = `<p class="error">Error: ${err.message}</p>`;
        }
    }

    async showCreatePOModal() {
        const inventory = await this.module.getInventory();
        const suppliers = await this.module.getSuppliers();
        const currentUser = JSON.parse(localStorage.getItem('erp_session'));

        const modal = document.createElement('dialog');
        modal.className = 'po-modal';
        modal.innerHTML = `
            <form id="po-form">
                <h2><i class="ph-duotone ph-clipboard-text"></i> Create Purchase Order</h2>

                <div class="form-row">
                    <div class="form-group">
                        <label>Supplier *</label>
                        <select name="supplierId" required>
                            <option value="">Select supplier...</option>
                            ${suppliers.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
                            ${suppliers.length === 0 ? '<option value="0">No suppliers — add via Seed Data</option>' : ''}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Expected Delivery Date</label>
                        <input type="date" name="expectedDate">
                    </div>
                </div>

                <div class="po-items-section">
                    <div class="po-items-header">
                        <h4>Line Items</h4>
                        <button type="button" id="add-po-line" class="btn btn-sm btn-outline"><i class="ph ph-plus"></i> Add Line</button>
                    </div>
                    <table class="data-table po-lines-table">
                        <thead>
                            <tr><th>SKU / Item</th><th>Qty</th><th>Unit Cost (R)</th><th>Line Total</th><th></th></tr>
                        </thead>
                        <tbody id="po-lines">
                            <tr class="po-line-row">
                                <td>
                                    <select name="sku[]" class="po-sku-select">
                                        <option value="">Select SKU...</option>
                                        ${inventory.map(i => `<option value="${i.sku}" data-cost="${i.unitCost || i.unitPrice || 0}">${i.sku} — ${i.name}</option>`).join('')}
                                    </select>
                                </td>
                                <td><input type="number" name="qty[]" min="1" value="1" class="po-qty" style="width:70px"></td>
                                <td><input type="number" name="cost[]" min="0" step="0.01" class="po-cost" style="width:90px" placeholder="0.00"></td>
                                <td class="po-line-total">R 0.00</td>
                                <td><button type="button" class="btn-icon remove-po-line">✕</button></td>
                            </tr>
                        </tbody>
                    </table>
                    <div class="po-total-row">
                        <strong>Total: <span id="po-grand-total">R 0.00</span></strong>
                    </div>
                </div>

                <div class="form-group">
                    <label>Notes</label>
                    <textarea name="notes" rows="2" placeholder="Optional notes..."></textarea>
                </div>

                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" id="cancel-modal">Cancel</button>
                    <button type="submit" class="btn btn-primary"><i class="ph ph-paper-plane-tilt"></i> Create Order</button>
                </div>
            </form>
        `;
        document.body.appendChild(modal);
        modal.showModal();

        // Modal close helpers
        modal.addEventListener('click', (e) => { if (e.target === modal) { modal.close(); modal.remove(); } });
        modal.querySelector('#cancel-modal').addEventListener('click', () => { modal.close(); modal.remove(); });

        // Auto-fill cost when SKU selected
        const updateLineTotals = () => {
            let grand = 0;
            modal.querySelectorAll('.po-line-row').forEach(row => {
                const qty = parseFloat(row.querySelector('.po-qty')?.value) || 0;
                const cost = parseFloat(row.querySelector('.po-cost')?.value) || 0;
                const lineTotal = qty * cost;
                grand += lineTotal;
                const totalCell = row.querySelector('.po-line-total');
                if (totalCell) totalCell.textContent = `R ${lineTotal.toFixed(2)}`;
            });
            modal.querySelector('#po-grand-total').textContent = `R ${grand.toFixed(2)}`;
        };

        const attachLineHandlers = (row) => {
            const skuSelect = row.querySelector('.po-sku-select');
            const costInput = row.querySelector('.po-cost');
            if (skuSelect) {
                skuSelect.addEventListener('change', () => {
                    const opt = skuSelect.selectedOptions[0];
                    if (opt && costInput) {
                        costInput.value = opt.dataset.cost || '';
                        updateLineTotals();
                    }
                });
            }
            row.querySelector('.po-qty')?.addEventListener('input', updateLineTotals);
            row.querySelector('.po-cost')?.addEventListener('input', updateLineTotals);
            row.querySelector('.remove-po-line')?.addEventListener('click', () => {
                if (modal.querySelectorAll('.po-line-row').length > 1) {
                    row.remove();
                    updateLineTotals();
                }
            });
        };

        modal.querySelectorAll('.po-line-row').forEach(attachLineHandlers);

        modal.querySelector('#add-po-line').addEventListener('click', () => {
            const newRow = document.createElement('tr');
            newRow.className = 'po-line-row';
            newRow.innerHTML = `
                <td>
                    <select name="sku[]" class="po-sku-select">
                        <option value="">Select SKU...</option>
                        ${inventory.map(i => `<option value="${i.sku}" data-cost="${i.unitCost || i.unitPrice || 0}">${i.sku} — ${i.name}</option>`).join('')}
                    </select>
                </td>
                <td><input type="number" name="qty[]" min="1" value="1" class="po-qty" style="width:70px"></td>
                <td><input type="number" name="cost[]" min="0" step="0.01" class="po-cost" style="width:90px" placeholder="0.00"></td>
                <td class="po-line-total">R 0.00</td>
                <td><button type="button" class="btn-icon remove-po-line">✕</button></td>
            `;
            modal.querySelector('#po-lines').appendChild(newRow);
            attachLineHandlers(newRow);
        });

        modal.querySelector('#po-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const fd = new FormData(e.target);
            const skus = fd.getAll('sku[]');
            const qtys = fd.getAll('qty[]');
            const costs = fd.getAll('cost[]');

            const items = skus.map((sku, i) => ({
                sku,
                quantity: parseInt(qtys[i]) || 0,
                unitPrice: parseFloat(costs[i]) || 0
            })).filter(item => item.sku && item.quantity > 0);

            if (items.length === 0) {
                alert('Please add at least one line item with a SKU and quantity.');
                return;
            }

            try {
                await this.module.createPurchaseOrder({
                    supplierId: parseInt(fd.get('supplierId')) || 0,
                    items,
                    expectedDate: fd.get('expectedDate') ? new Date(fd.get('expectedDate')).getTime() : null,
                    notes: fd.get('notes'),
                    createdBy: currentUser?.username || 'unknown'
                });
                modal.close();
                modal.remove();
                this.loadPurchaseOrders();
            } catch (err) {
                alert('Failed to create purchase order: ' + err.message);
            }
        });
    }

    async showReceivePOModal(orderId) {
        const orders = await this.module.getPurchaseOrders();
        const order = orders.find(o => o.id === orderId);
        if (!order) { alert('Order not found'); return; }

        const modal = document.createElement('dialog');
        modal.className = 'po-modal';
        modal.innerHTML = `
            <form id="receive-po-form">
                <h2><i class="ph-duotone ph-package"></i> Receive PO-${orderId}</h2>
                <p class="text-muted">Confirm quantities received. Inventory will be updated accordingly.</p>
                <table class="data-table">
                    <thead>
                        <tr><th>SKU</th><th>Ordered</th><th>Qty Received</th></tr>
                    </thead>
                    <tbody>
                        ${(order.items || []).map((item, idx) => `
                            <tr>
                                <td class="mono">${item.sku}</td>
                                <td>${item.quantity}</td>
                                <td>
                                    <input type="hidden" name="sku[]" value="${item.sku}">
                                    <input type="number" name="received[]" value="${item.quantity}" min="0" style="width:80px">
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                <div class="form-actions" style="margin-top:1rem">
                    <button type="button" class="btn btn-secondary" id="cancel-modal">Cancel</button>
                    <button type="submit" class="btn btn-primary"><i class="ph ph-check"></i> Confirm Receipt</button>
                </div>
            </form>
        `;
        document.body.appendChild(modal);
        modal.showModal();
        modal.addEventListener('click', (e) => { if (e.target === modal) { modal.close(); modal.remove(); } });
        modal.querySelector('#cancel-modal').addEventListener('click', () => { modal.close(); modal.remove(); });

        modal.querySelector('#receive-po-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const fd = new FormData(e.target);
            const skus = fd.getAll('sku[]');
            const received = fd.getAll('received[]');
            const receivedItems = skus.map((sku, i) => ({
                sku,
                quantity: parseInt(received[i]) || 0
            })).filter(item => item.quantity > 0);

            try {
                await this.module.receivePurchaseOrder(orderId, receivedItems);
                modal.close();
                modal.remove();
                alert(`✅ PO-${orderId} received. Inventory updated.`);
                this.loadPurchaseOrders();
            } catch (err) {
                alert('Failed to receive order: ' + err.message);
            }
        });
    }

    // ─── BARCODE SCANNING ─────────────────────────────────────────────────────

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
                <video id="scanner-video" autoplay playsinline style="width:100%;border-radius:8px;background:#000;max-height:300px"></video>
                <p class="scanner-hint" style="text-align:center;margin:.5rem 0;color:var(--text-secondary)">Point camera at barcode or QR code</p>
                <button id="close-scanner" class="btn btn-secondary" style="width:100%">Cancel</button>
            </div>
        `;
        document.body.appendChild(modal);
        modal.showModal();

        let stream, interval;
        try {
            stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            const video = modal.querySelector('#scanner-video');
            video.srcObject = stream;

            interval = setInterval(async () => {
                try {
                    const barcodes = await detector.detect(video);
                    if (barcodes.length > 0) {
                        clearInterval(interval);
                        stream.getTracks().forEach(t => t.stop());
                        modal.close();
                        modal.remove();
                        onResult(barcodes[0].rawValue);
                    }
                } catch {}
            }, 200);
        } catch (err) {
            modal.close();
            modal.remove();
            alert('Camera access denied or unavailable.');
            return;
        }

        const cleanup = () => {
            clearInterval(interval);
            stream?.getTracks().forEach(t => t.stop());
            modal.close();
            modal.remove();
        };
        modal.querySelector('#close-scanner').addEventListener('click', cleanup);
        modal.addEventListener('click', (e) => { if (e.target === modal) cleanup(); });
    }

    injectStyles() {
        if (document.getElementById('poolstock-styles')) return;

        const style = document.createElement('style');
        style.id = 'poolstock-styles';
        style.textContent = `
            .poolstock-ui .module-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 2rem;
            }

            .poolstock-ui .module-header h1 {
                margin: 0;
                font-size: 1.75rem;
            }

            .poolstock-ui .module-header p {
                margin: 0.25rem 0 0;
                color: var(--text-secondary);
            }

            /* Stats */
            /* Stats */
            .stat-card.primary { border-left-color: #6366f1; }
            .stat-card.warning { 
                border-left-color: #f59e0b; 
                background: linear-gradient(135deg, rgba(245, 158, 11, 0.05) 0%, var(--bg-primary) 100%); 
            }
            .stat-card.danger { 
                border-left-color: #ef4444; 
                background: linear-gradient(135deg, rgba(239, 68, 68, 0.05) 0%, var(--bg-primary) 100%); 
            }
            .stat-card.success { 
                border-left-color: #10b981; 
                background: linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, var(--bg-primary) 100%); 
            }

            .stat-card.warning .stat-value { color: #f59e0b; }
            .stat-card.danger .stat-value { color: #ef4444; }
            .stat-card.success .stat-value { color: #10b981; }

            /* Filters */
            .filter-group.search input {
                padding: 0.5rem 1rem;
                border: 1px solid var(--border-color);
                border-radius: 6px;
                min-width: 200px;
                background: var(--bg-secondary);
                color: var(--text-primary);
            }

            /* Inventory Table */
            .inventory-section table {
                background: transparent !important;
                border-collapse: collapse;
            }

            .inventory-row {
                background: transparent;
                color: var(--text-primary);
                border-bottom: 1px solid var(--border-color);
            }

            .sku {
                font-family: monospace;
                font-size: 0.85rem;
                color: var(--text-secondary);
            }

            .quantity.danger { color: #dc2626; font-weight: 700; }
            .quantity.warning { color: #d97706; font-weight: 600; }
            .quantity.success { color: #059669; }

            .badge.danger { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
            .badge.warning { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
            .badge.success { background: rgba(16, 185, 129, 0.1); color: #10b981; }
            .badge.category { background: rgba(99, 102, 241, 0.1); color: #818cf8; }

            .inventory-row:hover { background: var(--bg-secondary) !important; }

            .actions {
                display: flex;
                gap: 0.5rem;
            }

            .btn-icon {
                background: none;
                border: none;
                padding: 0.25rem;
                cursor: pointer;
                font-size: 1rem;
                opacity: 0.7;
                transition: opacity 0.2s;
            }

            .btn-icon:hover { opacity: 1; }

            /* Modal */
            .item-modal {
                max-width: 550px;
                width: 95%;
                padding: 2rem;
                border-radius: 12px;
                background: var(--bg-primary);
                color: var(--text-primary);
                border: 1px solid var(--border-color);
            }

            .item-modal h2 {
                margin: 0 0 1.5rem;
            }

            .item-modal input[readonly] {
                background: var(--bg-secondary);
                color: var(--text-secondary);
            }

            /* Product Images */
            .product-thumb {
                width: 40px;
                height: 40px;
                object-fit: cover;
                border-radius: 6px;
                border: 1px solid var(--border-color);
            }

            .product-thumb-placeholder {
                width: 40px;
                height: 40px;
                background: var(--bg-secondary);
                border-radius: 6px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 1.25rem;
                color: var(--text-secondary);
            }

            .item-image {
                width: 50px;
            }

            /* Tab Bar */
            .ps-tab-bar {
                display: flex;
                gap: 0;
                border-bottom: 2px solid var(--border-color);
                margin-bottom: 1.5rem;
            }
            .ps-tab {
                padding: .6rem 1.25rem;
                background: none;
                border: none;
                border-bottom: 2px solid transparent;
                margin-bottom: -2px;
                cursor: pointer;
                font-size: .95rem;
                color: var(--text-secondary);
                display: flex;
                align-items: center;
                gap: .4rem;
                transition: color .2s, border-color .2s;
            }
            .ps-tab.active { color: var(--accent, #6366f1); border-bottom-color: var(--accent, #6366f1); font-weight: 600; }
            .ps-tab:hover { color: var(--text-primary); }

            /* Search with scan */
            .search-with-scan { display: flex; gap: .4rem; align-items: center; }
            .search-with-scan input { flex: 1; }
            .scan-btn { font-size: 1.2rem; padding: .3rem .5rem; }

            /* PO Modal */
            .po-modal {
                max-width: 680px;
                width: 95%;
                padding: 2rem;
                border-radius: 12px;
                background: var(--bg-primary);
                color: var(--text-primary);
                border: 1px solid var(--border-color);
            }
            .po-items-section { margin: 1.5rem 0; }
            .po-items-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: .75rem; }
            .po-total-row { text-align: right; margin-top: .75rem; font-size: 1.1rem; }
            .po-lines-table select, .po-lines-table input { background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 4px; padding: .25rem .5rem; color: var(--text-primary); }

            /* Scanner Modal */
            .scanner-modal { padding: 1.5rem; border-radius: 12px; background: var(--bg-primary); border: 1px solid var(--border-color); max-width: 400px; width: 95%; }
            .scanner-content { display: flex; flex-direction: column; gap: .75rem; }

            /* Misc */
            .mono { font-family: monospace; font-size: .85rem; }
            .text-success { color: #10b981; }
            .text-danger { color: #ef4444; }
            .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
            .empty-state { text-align: center; padding: 3rem 1rem; color: var(--text-secondary); }
        `;
        document.head.appendChild(style);
    }
}

export default PoolStockUI;

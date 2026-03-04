
import PoolStock from '../modules/PoolStock.js';
import db, { STORES } from '../db/index.js';
import { showDetailPanel, dpBar, dpKV } from './panelHelper.js';

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
                        <button class="ps-tab" data-tab="forecast"><i class="ph ph-chart-line-up"></i> Forecast 🤖</button>
                    </div>

                    <!-- Stats Cards -->
                    <div class="stats-grid">
                        <div class="stat-card primary" data-card="items" style="cursor:pointer" title="Click for breakdown">
                            <div class="stat-icon"><i class="ph-duotone ph-package"></i></div>
                            <div class="stat-content">
                                <span class="stat-label">Total Items</span>
                                <span class="stat-value">${totalItems}</span>
                            </div>
                        </div>
                        <div class="stat-card warning" data-card="low" style="cursor:pointer" title="Click to see low stock items">
                            <div class="stat-icon"><i class="ph-duotone ph-warning-circle"></i></div>
                            <div class="stat-content">
                                <span class="stat-label">Low Stock</span>
                                <span class="stat-value">${lowStockItems.length}</span>
                            </div>
                        </div>
                        <div class="stat-card danger" data-card="out" style="cursor:pointer" title="Click to see out of stock items">
                            <div class="stat-icon"><i class="ph-duotone ph-prohibit"></i></div>
                            <div class="stat-content">
                                <span class="stat-label">Out of Stock</span>
                                <span class="stat-value">${outOfStock.length}</span>
                            </div>
                        </div>
                        <div class="stat-card success" data-card="value" style="cursor:pointer" title="Click for value breakdown">
                            <div class="stat-icon"><i class="ph-duotone ph-currency-dollar"></i></div>
                            <div class="stat-content">
                                <span class="stat-label">Inventory Value</span>
                                <span class="stat-value">R ${totalValue.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Interactive Analytics Chart (Phase 7) -->
                    <div class="card" style="margin-bottom: 2rem; background: var(--bg-primary); border: 1px solid var(--border); overflow: hidden;">
                        <div class="card-header" style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border); padding: 1rem 1.5rem;">
                            <h3 style="margin: 0; display: flex; align-items: center; gap: 0.5rem; font-size: 1.1rem; color: var(--text-primary);"><i class="ph-duotone ph-trend-up"></i> Total Inventory Value Over Time</h3>
                            <div class="chart-controls" style="display: flex; gap: 0.5rem;">
                                <button class="btn btn-secondary chart-range-btn active" data-days="7" style="padding: 0.25rem 0.75rem; font-size: 0.8rem; border-radius: 999px;">1W</button>
                                <button class="btn btn-secondary chart-range-btn" data-days="30" style="padding: 0.25rem 0.75rem; font-size: 0.8rem; border-radius: 999px;">1M</button>
                                <button class="btn btn-secondary chart-range-btn" data-days="90" style="padding: 0.25rem 0.75rem; font-size: 0.8rem; border-radius: 999px;">3M</button>
                            </div>
                        </div>
                        <div class="card-body" style="padding: 0;">
                            <div id="inventory-mountain-chart" style="width: 100%; min-height: 350px;"></div>
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
            await this.renderMountainChart(30); // Default to 30 days
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
                <tr class="inventory-row ${status.class}" data-sku="${item.sku}" style="cursor:pointer;">
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
                    <td class="actions" onclick="event.stopPropagation()">
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

    async showStatPanel(card) {
        const inventory = await this.module.getInventory();
        const totalValue = inventory.reduce((s, i) => s + (i.quantity * (i.unitPrice || 0)), 0);
        const lowStock = inventory.filter(i => i.quantity > 0 && i.quantity <= (i.reorderLevel || 10));
        const outOfStock = inventory.filter(i => i.quantity === 0);

        const byCategory = {};
        inventory.forEach(i => {
            const cat = i.category || 'Uncategorized';
            if (!byCategory[cat]) byCategory[cat] = { count: 0, value: 0 };
            byCategory[cat].count++;
            byCategory[cat].value += i.quantity * (i.unitPrice || 0);
        });
        const maxCat = Math.max(...Object.values(byCategory).map(c => c.count), 1);
        const maxVal = Math.max(...Object.values(byCategory).map(c => c.value), 1);

        const listItems = (items, color) => items.length
            ? `<ul class="dp-list">${items.map(i => `<li>
                <span>${i.name} <small style="color:var(--text-secondary,#9ca3af);">(${i.sku})</small></span>
                <span style="color:${color};font-weight:600">${i.quantity} units</span>
              </li>`).join('')}</ul>`
            : '<div class="dp-empty">None ✓</div>';

        const panels = {
            items: {
                title: 'Inventory Overview',
                subtitle: `${inventory.length} SKUs across ${Object.keys(byCategory).length} categories`,
                bodyHTML: `
                    <div class="dp-section">
                        <div class="dp-section-title">Items by Category</div>
                        ${Object.entries(byCategory).sort((a, b) => b[1].count - a[1].count).map(([cat, d]) =>
                    dpBar(cat, d.count, maxCat, '#6366f1')).join('')}
                    </div>
                    <div class="dp-section">
                        <div class="dp-section-title">Stock Health</div>
                        <div class="dp-kv-grid">
                            ${dpKV('In Stock', inventory.filter(i => i.quantity > (i.reorderLevel || 10)).length + ' items')}
                            ${dpKV('Low Stock', lowStock.length + ' items')}
                            ${dpKV('Out of Stock', outOfStock.length + ' items')}
                            ${dpKV('Total Value', 'R ' + totalValue.toLocaleString())}
                        </div>
                    </div>`
            },
            low: {
                title: 'Low Stock Items',
                subtitle: `${lowStock.length} items at or below their reorder level`,
                bodyHTML: `<div class="dp-section"><div class="dp-section-title">Items Needing Attention</div>${listItems(lowStock, '#d97706')}</div>`
            },
            out: {
                title: 'Out of Stock Items',
                subtitle: `${outOfStock.length} items with zero quantity`,
                bodyHTML: `<div class="dp-section"><div class="dp-section-title">Requires Immediate Restock</div>${listItems(outOfStock, '#dc2626')}</div>`
            },
            value: {
                title: 'Inventory Value Breakdown',
                subtitle: `Total: R ${totalValue.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
                bodyHTML: `
                    <div class="dp-section">
                        <div class="dp-section-title">Value by Category</div>
                        ${Object.entries(byCategory).sort((a, b) => b[1].value - a[1].value).map(([cat, d]) =>
                    dpBar(cat, d.value, maxVal, '#16a34a', v => 'R ' + v.toLocaleString())).join('')}
                    </div>`
            }
        };
        showDetailPanel(panels[card]);
    }

    showItemDetail(item) {
        document.querySelector('.item-detail-panel')?.remove();
        document.querySelector('.item-detail-overlay')?.remove();

        const status = this.getStockStatus(item);
        const totalValue = (item.quantity || 0) * (item.unitPrice || 0);
        const reorderLevel = item.reorderLevel || 10;
        const maxBar = Math.max(item.quantity, reorderLevel) * 1.3 || 1;
        const qtyPct = Math.min((item.quantity / maxBar) * 100, 100);
        const reorderPct = Math.min((reorderLevel / maxBar) * 100, 100);

        const statusColors = { success: '#16a34a', warning: '#d97706', danger: '#dc2626' };
        const statusBg = { success: '#dcfce7', warning: '#fef3c7', danger: '#fee2e2' };
        const color = statusColors[status.class] || '#6b7280';
        const bg = statusBg[status.class] || '#f3f4f6';

        const overlay = document.createElement('div');
        overlay.className = 'item-detail-overlay';
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.35);z-index:1200;backdrop-filter:blur(2px);';

        const panel = document.createElement('div');
        panel.className = 'item-detail-panel';
        panel.style.cssText = 'position:fixed;top:0;right:0;height:100%;width:min(460px,100vw);background:var(--bg-primary,#fff);z-index:1201;box-shadow:-4px 0 24px rgba(0,0,0,0.15);display:flex;flex-direction:column;overflow:hidden;animation:slideInRight 0.25s ease;';

        panel.innerHTML = `
            <style>
                @keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
                .ip-header { padding: 1.25rem 1.5rem; border-bottom: 1px solid var(--border,#e5e7eb); display:flex; align-items:center; justify-content:space-between; }
                .ip-header h2 { font-size: 1rem; font-weight: 600; margin: 0; color: var(--text-primary,#111); }
                .ip-body { flex:1; overflow-y:auto; padding: 1.5rem; }
                .ip-hero { display:flex; align-items:center; gap:1rem; padding-bottom:1.25rem; border-bottom:1px solid var(--border,#e5e7eb); margin-bottom:1.25rem; }
                .ip-hero-icon { width:56px; height:56px; border-radius:12px; background:var(--bg-secondary,#f8fafc); display:flex; align-items:center; justify-content:center; font-size:1.75rem; flex-shrink:0; }
                .ip-hero-name { font-size:1.125rem; font-weight:700; color:var(--text-primary,#111); }
                .ip-hero-sub { font-size:0.8rem; color:var(--text-secondary,#6b7280); margin-top:0.2rem; font-family:monospace; }
                .ip-status-badge { display:inline-flex; align-items:center; padding:0.2rem 0.65rem; border-radius:999px; font-size:0.7rem; font-weight:600; text-transform:uppercase; letter-spacing:0.05em; background:${bg}; color:${color}; margin-top:0.4rem; }
                .ip-section-title { font-size:0.7rem; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:var(--text-secondary,#9ca3af); margin-bottom:0.75rem; }
                .ip-chart-wrap { margin-bottom:1.5rem; }
                .ip-chart-row { display:flex; align-items:center; gap:0.75rem; margin-bottom:0.5rem; }
                .ip-chart-label { font-size:0.75rem; color:var(--text-secondary,#6b7280); width:100px; flex-shrink:0; }
                .ip-bar-track { flex:1; height:10px; background:var(--bg-secondary,#f0f0f0); border-radius:999px; overflow:hidden; }
                .ip-bar-fill { height:100%; border-radius:999px; transition:width 0.6s ease; }
                .ip-bar-val { font-size:0.8rem; font-weight:600; color:var(--text-primary,#111); width:40px; text-align:right; flex-shrink:0; }
                .ip-field-grid { display:grid; grid-template-columns:1fr 1fr; gap:0.75rem; margin-bottom:1.5rem; }
                .ip-field { background:var(--bg-secondary,#f8fafc); border-radius:8px; padding:0.75rem 1rem; }
                .ip-field .fl { font-size:0.67rem; font-weight:600; text-transform:uppercase; letter-spacing:0.07em; color:var(--text-secondary,#9ca3af); margin-bottom:0.2rem; }
                .ip-field .fv { font-size:0.925rem; font-weight:600; color:var(--text-primary,#111); }
                .ip-field.full { grid-column:1/-1; }
                .ip-footer { padding:1rem 1.5rem; border-top:1px solid var(--border,#e5e7eb); display:flex; gap:0.75rem; }
                .ip-btn { flex:1; padding:0.6rem; border:1px solid var(--border,#e5e7eb); background:transparent; border-radius:8px; cursor:pointer; font-size:0.875rem; color:var(--text-secondary,#6b7280); }
                .ip-btn:hover { background:var(--bg-secondary,#f8fafc); }
                .ip-btn-primary { background:#f97316; color:#fff; border-color:#f97316; font-weight:600; }
                .ip-btn-primary:hover { background:#ea580c; }
            </style>
            <div class="ip-header">
                <h2>Item Details</h2>
                <button id="close-ip" style="background:none;border:none;cursor:pointer;color:var(--text-secondary,#6b7280);font-size:1.25rem;">✕</button>
            </div>
            <div class="ip-body">
                <div class="ip-hero">
                    <div class="ip-hero-icon">${item.image ? `<img src="${item.image}" style="width:100%;height:100%;object-fit:cover;border-radius:12px;">` : '<i class="ph-duotone ph-package"></i>'}</div>
                    <div>
                        <div class="ip-hero-name">${item.name}</div>
                        <div class="ip-hero-sub">${item.sku}</div>
                        <div class="ip-status-badge">${status.label}</div>
                    </div>
                </div>

                <div class="ip-chart-wrap">
                    <div class="ip-section-title">Stock Level</div>
                    <div class="ip-chart-row">
                        <span class="ip-chart-label">Current Stock</span>
                        <div class="ip-bar-track">
                            <div class="ip-bar-fill" style="width:${qtyPct}%; background:${color};"></div>
                        </div>
                        <span class="ip-bar-val">${item.quantity}</span>
                    </div>
                    <div class="ip-chart-row">
                        <span class="ip-chart-label">Reorder Level</span>
                        <div class="ip-bar-track">
                            <div class="ip-bar-fill" style="width:${reorderPct}%; background:#94a3b8;"></div>
                        </div>
                        <span class="ip-bar-val">${reorderLevel}</span>
                    </div>
                    ${item.quantity <= reorderLevel ? `<p style="font-size:0.8rem;color:${color};margin-top:0.5rem;font-weight:500;">⚠ Stock is at or below reorder level. Consider restocking.</p>` : ''}
                </div>

                <div class="ip-section-title">Product Information</div>
                <div class="ip-field-grid">
                    <div class="ip-field">
                        <div class="fl">Category</div>
                        <div class="fv">${item.category || '—'}</div>
                    </div>
                    <div class="ip-field">
                        <div class="fl">Unit Price</div>
                        <div class="fv">R ${(item.unitPrice || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</div>
                    </div>
                    <div class="ip-field">
                        <div class="fl">Total Value</div>
                        <div class="fv" style="color:${color};">R ${totalValue.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</div>
                    </div>
                    <div class="ip-field">
                        <div class="fl">Reorder Level</div>
                        <div class="fv">${reorderLevel} units</div>
                    </div>
                    ${item.supplier ? `<div class="ip-field full"><div class="fl">Supplier</div><div class="fv">${item.supplier}</div></div>` : ''}
                    ${item.description ? `<div class="ip-field full"><div class="fl">Description</div><div class="fv">${item.description}</div></div>` : ''}
                    <div class="ip-field">
                        <div class="fl">SKU</div>
                        <div class="fv" style="font-family:monospace;font-size:0.8rem;">${item.sku}</div>
                    </div>
                    <div class="ip-field">
                        <div class="fl">Last Updated</div>
                        <div class="fv">${item.updatedAt ? new Date(item.updatedAt).toLocaleDateString('en-ZA') : '—'}</div>
                    </div>
                </div>
            </div>
            <div class="ip-footer">
                <button class="ip-btn" id="close-ip-footer">Close</button>
                <button class="ip-btn ip-btn-primary" onclick="window.poolStockUI.adjustStock('${item.sku}'); document.querySelector('.item-detail-panel')?.remove(); document.querySelector('.item-detail-overlay')?.remove();">Adjust Stock</button>
            </div>
        `;

        document.body.appendChild(overlay);
        document.body.appendChild(panel);

        const close = () => { panel.remove(); overlay.remove(); };
        panel.querySelector('#close-ip').addEventListener('click', close);
        panel.querySelector('#close-ip-footer').addEventListener('click', close);
        overlay.addEventListener('click', close);
    }

    attachEventListeners() {
        // Make instance globally available for inline handlers
        window.poolStockUI = this;

        // HID Barcode Scanner Integration (The Speed Moat)
        if (window._poolStockBarcodeListener) {
            document.removeEventListener('keydown', window._poolStockBarcodeListener);
        }

        let barcodeBuffer = '';
        let barcodeTimeout = null;

        window._poolStockBarcodeListener = async (e) => {
            if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;

            if (e.key === 'Enter') {
                if (barcodeBuffer.length >= 3) {
                    e.preventDefault();
                    const sku = barcodeBuffer.trim();
                    const all = await this.module.getInventory();
                    const item = all.find(i => i.sku.toLowerCase() === sku.toLowerCase());

                    if (item) {
                        try {
                            const ctx = new (window.AudioContext || window.webkitAudioContext)();
                            const osc = ctx.createOscillator();
                            osc.connect(ctx.destination);
                            osc.frequency.value = 800;
                            osc.start();
                            osc.stop(ctx.currentTime + 0.1);
                        } catch (err) { }

                        console.log(`⚡ Barcode scanned: ${sku}`);
                        this.showItemDetail(item);
                    } else {
                        alert(`Scanned barcode not found in inventory: ${sku}`);
                    }
                }
                barcodeBuffer = '';
                return;
            }

            if (e.key.length === 1) {
                barcodeBuffer += e.key;
                clearTimeout(barcodeTimeout);
                barcodeTimeout = setTimeout(() => {
                    barcodeBuffer = '';
                }, 50);
            }
        };
        document.addEventListener('keydown', window._poolStockBarcodeListener);

        // Add Item Button
        this.container.querySelector('#add-item-btn').addEventListener('click', () => {
            this.showAddItemModal();
        });

        // Row click → detail panel (but not on action buttons)
        this.container.querySelector('#inventory-table tbody').addEventListener('click', async (e) => {
            if (e.target.closest('.actions')) return;
            const row = e.target.closest('tr[data-sku]');
            if (!row) return;
            const all = await this.module.getInventory();
            const item = all.find(x => x.sku === row.dataset.sku);
            if (item) this.showItemDetail(item);
        });

        // Stat card click → drill-down panel
        this.container.querySelectorAll('.stat-card[data-card]').forEach(card => {
            card.addEventListener('click', () => this.showStatPanel(card.dataset.card));
        });

        // Tab navigation
        this.container.querySelectorAll('.ps-tab').forEach(btn => {
            btn.addEventListener('click', () => {
                if (btn.dataset.tab === 'purchase-orders') {
                    this.loadPurchaseOrders();
                } else if (btn.dataset.tab === 'forecast') {
                    this.loadForecastView();
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

        // Chart Range Buttons
        this.container.querySelectorAll('.chart-range-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                this.container.querySelectorAll('.chart-range-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                const days = parseInt(e.target.dataset.days);
                await this.renderMountainChart(days);
            });
        });
    }

    async renderMountainChart(days) {
        if (!window.ApexCharts) {
            console.warn("ApexCharts not loaded yet. Skipping chart render.");
            return;
        }

        const chartContainer = this.container.querySelector('#inventory-mountain-chart');
        if (!chartContainer) return;

        chartContainer.innerHTML = '<div style="display:flex;justify-content:center;align-items:center;height:350px;color:var(--text-secondary);"><i class="ph ph-spinner ph-spin" style="margin-right:8px;"></i> Loading Chart Data...</div>';

        try {
            const timeSeriesData = await this.module.getHistoricalInventoryValue(days);

            // Format for ApexCharts: [[timestamp, value], ...]
            const seriesData = timeSeriesData.map(point => [point[0], parseFloat(point[1].toFixed(2))]);

            // Determine min/max for tighter y-axis fitting (makes the mountain look taller)
            const values = seriesData.map(p => p[1]);
            const minVal = Math.max(0, Math.min(...values) * 0.95);

            const isDarkMode = true; // Our app uses a dark theme by default

            const options = {
                series: [{
                    name: 'Total Inventory Value',
                    data: seriesData
                }],
                chart: {
                    type: 'area',
                    height: 350,
                    fontFamily: 'Inter, sans-serif',
                    background: 'transparent',
                    toolbar: { show: false },
                    animations: { enabled: true, easing: 'easeinout', speed: 800 },
                    parentHeightOffset: 0
                },
                colors: ['#10a37f'], // OpenAI green/teal core brand color
                fill: {
                    type: 'gradient',
                    gradient: {
                        shadeIntensity: 1,
                        opacityFrom: 0.6,
                        opacityTo: 0.05,
                        stops: [0, 90, 100]
                    }
                },
                dataLabels: { enabled: false },
                stroke: {
                    curve: 'smooth',
                    width: 2
                },
                xaxis: {
                    type: 'datetime',
                    tooltip: { enabled: false }, // We use universal tooltip instead
                    axisBorder: { show: false },
                    axisTicks: { show: false },
                    labels: {
                        style: { colors: '#9ca3af', fontSize: '12px' },
                        datetimeFormatter: {
                            year: 'yyyy',
                            month: "MMM 'yy",
                            day: 'dd MMM',
                            hour: 'HH:mm'
                        }
                    }
                },
                yaxis: {
                    min: minVal,
                    tickAmount: 4,
                    labels: {
                        style: { colors: '#9ca3af', fontSize: '12px' },
                        formatter: (value) => {
                            if (value >= 1000) return 'R ' + (value / 1000).toFixed(1) + 'k';
                            return 'R ' + value.toFixed(0);
                        }
                    }
                },
                grid: {
                    borderColor: 'rgba(255, 255, 255, 0.05)',
                    strokeDashArray: 4,
                    xaxis: { lines: { show: true } },
                    yaxis: { lines: { show: true } },
                    padding: { top: 0, right: 0, bottom: 0, left: 10 }
                },
                tooltip: {
                    theme: isDarkMode ? 'dark' : 'light',
                    y: {
                        formatter: function (val) {
                            return "R " + val.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                        }
                    },
                    marker: { show: false }
                },
                theme: {
                    mode: isDarkMode ? 'dark' : 'light'
                }
            };

            chartContainer.innerHTML = ''; // clear loading state

            if (this.mountainChart) {
                this.mountainChart.destroy();
            }

            this.mountainChart = new ApexCharts(chartContainer, options);
            this.mountainChart.render();

        } catch (err) {
            console.error("Failed to render mountain chart", err);
            chartContainer.innerHTML = `<div style="text-align:center;padding:2rem;color:var(--danger);"><i class="ph ph-warning-circle"></i> Error loading chart data</div>`;
        }
    }

    async loadForecastView() {
        this.container.innerHTML = '<div class="loading">🤖 Generating forecast...</div>';
        try {
            const { default: aiEngine } = await import('../services/aiEngine.js');
            const [items, movements] = await Promise.all([
                this.module.getInventory(),
                db.getAll('stockMovements').catch(() => [])
            ]);

            const result = aiEngine.analyzePoolStock(items, movements);
            const apiKey = aiEngine.getApiKey();

            const urgRow = (item) => {
                const colors = { critical: '#ef4444', high: '#f97316', medium: '#f59e0b', low: '#10b981' };
                const col = colors[item.urgency] || '#6b7280';
                const daysText = item.urgency === 'critical' ? 'Out now' : `${item.daysToStockout}d`;
                // Mini sparkline SVG for forecast
                const max = Math.max(...item.forecastSeries, 1);
                const bars = item.forecastSeries.slice(0, 7).map((v, i) => {
                    const h = Math.round((v / max) * 24);
                    const x = i * 10 + 2;
                    return `<rect x="${x}" y="${28 - h}" width="7" height="${h}" rx="2" fill="${col}" opacity="0.7"/>`;
                }).join('');
                const spark = `<svg width="72" height="30" viewBox="0 0 72 30">${bars}</svg>`;
                return `<tr>
                    <td style="font-weight:500">${item.name}</td>
                    <td><span style="background:${col};color:#fff;padding:0.2rem 0.5rem;border-radius:4px;font-size:0.75rem;font-weight:600">${item.urgency.toUpperCase()}</span></td>
                    <td style="font-weight:700;color:${col}">${daysText}</td>
                    <td style="color:var(--text-secondary)">${item.avgDailyDemand}/day</td>
                    <td>${spark}</td>
                    <td style="font-size:0.8rem;color:var(--text-secondary)">${item.preferredSupplier}</td>
                </tr>`;
            };

            // Parallel: request NL insights while rendering
            const insightsPromise = aiEngine.getNLInsights(
                { finance: { score: 50 }, inventory: result, production: { score: 50 }, syndicate: { score: 50 }, sales: { score: 50, status: 'no_data' }, overallScore: result.score },
                apiKey
            );

            const sevColors = { critical: '#ef4444', warning: '#f59e0b', good: '#10b981' };
            this.container.innerHTML = `
                <div class="poolstock-ui">
                    <header class="module-header">
                        <div>
                            <h1><i class="ph-duotone ph-chart-line-up"></i> Demand Forecast</h1>
                            <p>AI-powered stockout prediction (${aiEngine.getHorizon()}-day horizon)</p>
                        </div>
                        <button id="back-to-inv" class="btn btn-secondary"><i class="ph ph-arrow-left"></i> Back</button>
                    </header>

                    ${result.status === 'no_data' ? `
                        <div style="text-align:center;padding:3rem 1rem;">
                            <i class="ph ph-package" style="font-size:3rem;color:var(--text-secondary)"></i>
                            <p style="color:var(--text-secondary);margin-top:1rem">No inventory data yet. Add items and record stock movements to see forecasts.</p>
                        </div>` : `

                    <div class="card" style="margin-bottom:1rem;border-left:4px solid #6366f1">
                        <div class="card-header"><h3>📊 Urgency Ranking — ${result.urgencyList.length} SKUs</h3>
                            <span style="font-size:0.8rem;color:var(--text-secondary)">Score: <strong style="color:${result.score >= 70 ? '#10b981' : result.score >= 40 ? '#f59e0b' : '#ef4444'}">${result.score}/100</strong></span>
                        </div>
                        <div class="table-container">
                            <table class="data-table">
                                <thead><tr><th>Item</th><th>Risk</th><th>Stockout</th><th>Demand</th><th>7-Day Trend</th><th>Supplier</th></tr></thead>
                                <tbody>${result.urgencyList.map(urgRow).join('')}</tbody>
                            </table>
                        </div>
                    </div>

                    <div class="card" id="forecast-insights-card" style="border-left:4px solid #6366f1">
                        <div class="card-header"><i class="ph-duotone ph-robot" style="color:#6366f1"></i> <h3 style="display:inline;margin-left:0.5rem">AI Inventory Insights</h3></div>
                        <div class="card-body" id="forecast-insights">
                            <div style="color:var(--text-secondary);font-size:0.875rem;display:flex;align-items:center;gap:0.4rem">
                                <i class="ph ph-circle-notch" style="animation:spin 1s linear infinite"></i> Generating insights...
                            </div>
                        </div>
                    </div>`}
                </div>`;

            this.container.querySelector('#back-to-inv')?.addEventListener('click', () => this.loadDashboard());

            // Await insights then render
            insightsPromise.then(insights => {
                const el = this.container.querySelector('#forecast-insights');
                if (!el) return;
                el.innerHTML = insights.map(ins => `
                    <div style="display:flex;align-items:flex-start;gap:0.6rem;padding:0.5rem 0.75rem;border-radius:8px;
                        background:var(--bg-secondary);border-left:3px solid ${sevColors[ins.severity] || '#6366f1'};margin-bottom:0.5rem">
                        <span style="font-size:0.875rem;line-height:1.5;color:var(--text-primary)">${ins.text}</span>
                    </div>`).join('');
                if (!apiKey) {
                    el.insertAdjacentHTML('beforeend', '<p style="margin:0.5rem 0 0;font-size:0.7rem;color:var(--text-secondary)">💡 Add a Groq API key in Settings → AI for smarter insights.</p>');
                }
            }).catch(() => { });

        } catch (err) {
            this.container.innerHTML = `<p class="error">Forecast error: ${err.message}</p>`;
        }
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
                                                    ${o.status === 'pending' ? `<button class="btn btn-sm btn-outline receive-po-btn" style="margin-right: 0.5rem;" data-id="${o.id}"><i class="ph ph-package"></i> Receive</button>` : ''}
                                                    <button class="btn btn-sm btn-outline wa-share-po-btn" style="color:var(--success, #10b981); border-color:var(--success, #10b981)" data-id="${o.id}"><i class="ph ph-whatsapp-logo"></i> Share</button>
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

            this.container.querySelectorAll('.wa-share-po-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const o = orders.find(order => order.id === parseInt(btn.dataset.id));
                    if (!o) return;

                    const supplierName = supplierMap[o.supplierId] || `Supplier #${o.supplierId}`;
                    const currentUser = JSON.parse(localStorage.getItem('erp_session'));
                    const myBiz = currentUser?.businessName || 'Our Business';

                    let waText = `*Purchase Order: PO-${o.id}*\n_From: ${myBiz}_\n_To: ${supplierName}_\nDate: ${new Date(o.orderDate).toLocaleDateString()}\n\n*Items Ordered:*\n`;
                    (o.items || []).forEach(item => {
                        waText += `- ${item.sku} (x${item.quantity}) @ R ${(item.unitPrice || 0).toFixed(2)}\n`;
                    });
                    waText += `\n*Expected Total:* R ${(o.totalAmount || 0).toFixed(2)}\n`;
                    if (o.notes) waText += `\n*Notes:* ${o.notes}\n`;
                    waText += `\n_Generated via Platform_`;

                    window.open(`https://wa.me/?text=${encodeURIComponent(waText)}`, '_blank');
                });
            });

            this.injectStyles();
        } catch (err) {
            this.container.innerHTML = `<p class="error">Error: ${err.message}</p>`;
        }
    }

    async showCreatePOModal() {
        const inventory = await this.module.getInventory();

        const localSuppliers = await this.module.getSuppliers();
        const networkSuppliers = await this.module.getNetworkSuppliers();

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
                            <optgroup label="🌐 TrustCircle B2B Network">
                                ${networkSuppliers.map(s => `<option value="${s.id}">🔵 ${s.name} (${s.type})</option>`).join('')}
                            </optgroup>
                            <optgroup label="📋 My Local Suppliers">
                                ${localSuppliers.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
                                ${localSuppliers.length === 0 ? '<option value="" disabled>No local suppliers added</option>' : ''}
                            </optgroup>
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
                const supplierVal = fd.get('supplierId');

                // Route to B2B network if it's a network supplier
                if (supplierVal.startsWith('net_')) {
                    await this.module.sendNetworkOrder(
                        supplierVal,
                        items,
                        fd.get('notes')
                    );
                    alert('🌐 Order successfully routed through the B2B Network!');
                } else {
                    await this.module.createPurchaseOrder({
                        supplierId: parseInt(supplierVal) || 0,
                        items,
                        expectedDate: fd.get('expectedDate') ? new Date(fd.get('expectedDate')).getTime() : null,
                        notes: fd.get('notes'),
                        createdBy: currentUser?.username || 'unknown'
                    });
                }

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
                } catch { }
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
            .stat-card {
                background: rgba(255, 255, 255, 0.03);
                backdrop-filter: blur(16px);
                -webkit-backdrop-filter: blur(16px);
                border-radius: var(--radius-lg);
                padding: 1.5rem;
                display: flex;
                align-items: center;
                gap: 1rem;
                box-shadow: 0 4px 6px rgba(0,0,0,0.3);
                border: 1px solid var(--border-color);
                border-left: 4px solid var(--border-color);
                transition: transform 0.2s, border-color 0.2s;
            }
            .stat-card:hover { border-color: var(--accent-primary); transform: translateY(-2px); }

            .stat-card.primary { border-left-color: #6366f1; }
            .stat-card.warning { border-left-color: #f59e0b; }
            .stat-card.danger { border-left-color: #ef4444; }
            .stat-card.success { border-left-color: #10a37f; }

            .stat-content {
                display: flex;
                flex-direction: column;
            }

            .stat-label {
                font-size: 0.875rem;
                color: var(--text-secondary);
            }

            .stat-value {
                font-size: 1.6rem;
                font-weight: 700;
                color: var(--text-primary);
            }

            .stat-card.warning .stat-value { color: #f59e0b; }
            .stat-card.danger .stat-value { color: #ef4444; }
            .stat-card.success .stat-value { color: #10a37f; }
            
            .stat-icon {
                font-size: 2.5rem;
                color: var(--text-primary);
            }

            /* Filters */
            .filter-group.search input {
                padding: 0.5rem 1rem;
                border: 1px solid var(--border-color);
                border-radius: var(--radius-md);
                min-width: 200px;
                background: rgba(255, 255, 255, 0.05);
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
                padding: 2.5rem;
                border-radius: var(--radius-lg);
                background: var(--bg-primary);
                backdrop-filter: blur(16px);
                -webkit-backdrop-filter: blur(16px);
                color: var(--text-primary);
                border: 1px solid var(--border-color);
                box-shadow: var(--shadow-lg);
            }

            .item-modal::backdrop {
                background: rgba(0,0,0,0.7);
            }

            .item-modal h2 {
                margin: 0 0 1.5rem;
            }

            .item-modal input[readonly] {
                background: rgba(255, 255, 255, 0.05); /* Ghost base */
                color: var(--text-secondary);
            }

            /* Product Images */
            .product-thumb {
                width: 40px;
                height: 40px;
                object-fit: cover;
                border-radius: var(--radius-sm);
                border: 1px solid var(--border-color);
            }

            .product-thumb-placeholder {
                width: 40px;
                height: 40px;
                background: rgba(255, 255, 255, 0.05);
                border-radius: var(--radius-sm);
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
            .ps-tab.active { color: var(--accent-primary); border-bottom-color: var(--accent-primary); font-weight: 600; }
            .ps-tab:hover { color: var(--text-primary); }

            /* Search with scan */
            .search-with-scan { display: flex; gap: .4rem; align-items: center; }
            .search-with-scan input { flex: 1; }
            .scan-btn { font-size: 1.2rem; padding: .3rem .5rem; }

            /* PO Modal */
            .po-modal {
                max-width: 680px;
                width: 95%;
                padding: 2.5rem;
                border-radius: var(--radius-lg);
                background: var(--bg-primary);
                backdrop-filter: blur(16px);
                -webkit-backdrop-filter: blur(16px);
                color: var(--text-primary);
                border: 1px solid var(--border-color);
                box-shadow: var(--shadow-lg);
            }
            .po-modal::backdrop {
                background: rgba(0,0,0,0.7);
            }
            .po-items-section { margin: 1.5rem 0; }
            .po-items-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: .75rem; }
            .po-total-row { text-align: right; margin-top: .75rem; font-size: 1.1rem; }
            .po-lines-table select, .po-lines-table input { background: rgba(255, 255, 255, 0.05); border: 1px solid var(--border-color); border-radius: 4px; padding: .25rem .5rem; color: var(--text-primary); }

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

// Reports UI - Analytics and reporting for all business types
import db from '../db/index.js';
import PocketBooks from '../modules/PocketBooks.js';
import { sym } from '../utils/safeJson.js';
import PoolStock from '../modules/PoolStock.js';

class ReportsUI {
  constructor() {
    this.dateRange = 'week'; // week, month, custom
    this.activeFilter = { type: 'all', value: null }; // { type: 'all' | 'category' | 'sku', value: string }
    this.poolStock = new PoolStock();
    this.currentView = 'financials'; // 'financials' or 'traceability'
  }

  async render(container) {
    this.container = container; // save reference for re-renders
    if (this.currentView === 'financials') {
      await this.renderFinancials(container);
    } else if (this.currentView === 'traceability') {
      await this.renderTraceability(container);
    }
  }

  async renderFinancials(container) {
    const { startDate, endDate } = this.getDateRange();

    // Fetch inventory for mapping SKUs to Categories
    const inventory = await this.poolStock.getInventory();
    const inventoryMap = new Map(inventory.map(i => [i.sku, i]));

    // Apply filters to inventory data for stats
    let filteredInventory = inventory;
    if (this.activeFilter.type === 'category') {
      filteredInventory = inventory.filter(i => i.category === this.activeFilter.value);
    } else if (this.activeFilter.type === 'sku') {
      filteredInventory = inventory.filter(i => i.sku === this.activeFilter.value);
    }

    const financialData = await this.getFinancialReport(startDate, endDate, inventoryMap);
    const inventoryData = await this.getInventoryReport(filteredInventory);
    const advancedStats = await this.poolStock.getAdvancedStats(filteredInventory);
    const abcData = await this.getABCAnalysis(startDate, endDate);

    container.innerHTML = `
      <div class="reports-container">
        ${this.renderStyles()}

        <header class="module-header">
          <div>
            <h1>Reports</h1>
            <p>Business analytics &amp; financial summaries</p>
          </div>
          <div style="display:flex;gap:0.5rem;flex-wrap:wrap;">
            <button id="export-pdf-btn" class="btn btn-secondary"><i class="ph-duotone ph-file-pdf"></i> Export PDF</button>
            <select id="export-type" class="form-select">
              <option value="">Export CSV...</option>
              <option value="all">Everything (CSV)</option>
              <option value="mpesa">M-Pesa Sales</option>
              <option value="cash">Cash Sales</option>
              <option value="card">Card Sales</option>
            </select>
          </div>
        </header>

        <div class="tab-bar">
          <button class="tab-btn active" data-view="financials"><i class="ph-duotone ph-chart-line-up"></i> Financials &amp; KPIs</button>
          <button class="tab-btn" data-view="traceability"><i class="ph-duotone ph-tree-structure"></i> QC Traceability</button>
        </div>
        
        <!-- Date Range Selector -->
        <div class="report-controls">
          <div class="date-range-selector">
            <button class="btn ${this.dateRange === 'week' ? 'btn-primary' : 'btn-secondary'}" data-range="week">This Week</button>
            <button class="btn ${this.dateRange === 'month' ? 'btn-primary' : 'btn-secondary'}" data-range="month">This Month</button>
            <button class="btn ${this.dateRange === 'year' ? 'btn-primary' : 'btn-secondary'}" data-range="year">This Year</button>
          </div>
          
          <div class="filter-controls">
            <select id="filter-type" class="form-select">
                <option value="all" ${this.activeFilter.type === 'all' ? 'selected' : ''}>All Items</option>
                <option value="category" ${this.activeFilter.type === 'category' ? 'selected' : ''}>By Category</option>
                <option value="sku" ${this.activeFilter.type === 'sku' ? 'selected' : ''}>By Product</option>
            </select>
            
            ${this.activeFilter.type !== 'all' ? `
                <select id="filter-value" class="form-select">
                    ${this.renderFilterOptions(inventory, this.activeFilter.type)}
                </select>
            ` : ''}
          </div>
        </div>

        <!-- Financial summary strip -->
        <div class="fin-bar">
          <div class="fin-bar-item">
            <span class="fin-bar-label">Income</span>
            <span class="fin-bar-value" style="color:var(--success);">${sym()}${financialData.totalIncome.toLocaleString()}</span>
          </div>
          <div class="fin-bar-sep"></div>
          <div class="fin-bar-item">
            <span class="fin-bar-label">Expenses</span>
            <span class="fin-bar-value" style="color:var(--danger);">${sym()}${financialData.totalExpenses.toLocaleString()}</span>
          </div>
          <div class="fin-bar-sep"></div>
          <div class="fin-bar-item">
            <span class="fin-bar-label">Net Profit</span>
            <span class="fin-bar-value" style="color:${financialData.profit >= 0 ? 'var(--success)' : 'var(--danger)'};">${sym()}${financialData.profit.toLocaleString()}</span>
          </div>
          <div class="fin-bar-sep"></div>
          <div class="fin-bar-item">
            <span class="fin-bar-label">Stock Value</span>
            <span class="fin-bar-value">${sym()}${inventoryData.totalValue.toLocaleString()}</span>
          </div>
          <div class="fin-bar-sep"></div>
          <div class="fin-bar-item">
            <span class="fin-bar-label">SKUs</span>
            <span class="fin-bar-value">${inventoryData.totalItems}</span>
          </div>
          <div class="fin-bar-sep"></div>
          <div class="fin-bar-item">
            <span class="fin-bar-label">Low stock</span>
            <span class="fin-bar-value" style="color:${inventoryData.lowStockItems > 0 ? 'var(--warning)' : 'inherit'};">${inventoryData.lowStockItems}</span>
          </div>
          <div class="fin-bar-sep"></div>
          <div class="fin-bar-item">
            <span class="fin-bar-label">Out of stock</span>
            <span class="fin-bar-value" style="color:${inventoryData.outOfStock > 0 ? 'var(--danger)' : 'inherit'};">${inventoryData.outOfStock}</span>
          </div>
        </div>

        <!-- Supply Chain KPIs -->
        <div class="rpt-section">
          <div class="rpt-section-hd">Supply Chain</div>
          ${this.renderAdvancedDashboard(advancedStats)}
        </div>

        <!-- ABC Analysis -->
        <div class="rpt-section">
          <div class="rpt-section-hd">Product Performance (ABC Analysis)</div>
          ${this.renderABCAnalysis(abcData, inventoryMap)}
        </div>

        <!-- Breakdown tables -->
        <div class="rpt-grid">
          <div class="rpt-block">
            <div class="rpt-block-hd">Income by Category</div>
            ${Object.keys(financialData.incomeByCategory).length > 0 ? `
              <table class="data-table">
                <thead><tr><th>Category</th><th>Amount</th><th>Share</th></tr></thead>
                <tbody>
                  ${Object.entries(financialData.incomeByCategory).map(([cat, amt]) => `
                    <tr>
                      <td>${cat}</td>
                      <td>${sym()}${amt.toLocaleString()}</td>
                      <td>
                        <div class="tbl-bar-wrap"><div class="tbl-bar-fill" style="width:${((amt/financialData.totalIncome)*100).toFixed(0)}%;background:var(--success);"></div></div>
                        <span class="tbl-pct">${((amt/financialData.totalIncome)*100).toFixed(1)}%</span>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            ` : '<p class="rpt-empty">No income recorded in this period</p>'}
          </div>

          <div class="rpt-block">
            <div class="rpt-block-hd">Expenses by Category</div>
            ${Object.keys(financialData.expensesByCategory).length > 0 ? `
              <table class="data-table">
                <thead><tr><th>Category</th><th>Amount</th><th>Share</th></tr></thead>
                <tbody>
                  ${Object.entries(financialData.expensesByCategory).map(([cat, amt]) => `
                    <tr>
                      <td>${cat}</td>
                      <td>${sym()}${amt.toLocaleString()}</td>
                      <td>
                        <div class="tbl-bar-wrap"><div class="tbl-bar-fill" style="width:${((amt/financialData.totalExpenses)*100).toFixed(0)}%;background:var(--danger);"></div></div>
                        <span class="tbl-pct">${((amt/financialData.totalExpenses)*100).toFixed(1)}%</span>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            ` : '<p class="rpt-empty">No expenses recorded in this period</p>'}
          </div>
        </div>
      </div>
    `;

    this.attachHandlers(container, financialData, inventoryData, advancedStats);
  }

  async renderTraceability(container) {
    container.innerHTML = `
      <div class="reports-container">
        ${this.renderStyles()}

        <header class="module-header">
          <div>
            <h1>Reports</h1>
            <p>Business analytics &amp; financial summaries</p>
          </div>
        </header>

        <div class="tab-bar">
          <button class="tab-btn" data-view="financials"><i class="ph-duotone ph-chart-line-up"></i> Financials &amp; KPIs</button>
          <button class="tab-btn active" data-view="traceability"><i class="ph-duotone ph-tree-structure"></i> QC Traceability</button>
        </div>

        <div class="rpt-block" style="margin-bottom:1.5rem;">
          <div class="rpt-block-hd">Product Genealogy Search</div>
          <div style="display:flex;gap:0.75rem;align-items:flex-end;flex-wrap:wrap;">
            <div style="flex:1;min-width:160px;">
              <label style="display:block;margin-bottom:0.375rem;font-size:0.8125rem;color:var(--text-muted);">Production Order ID</label>
              <input type="number" id="trace-order-id" placeholder="e.g. 1"
                style="width:100%;padding:0.4375rem 0.625rem;border:1px solid var(--border);border-radius:6px;background:var(--bg-elevated,rgba(255,255,255,0.04));color:var(--text-primary);font-size:0.875rem;font-family:inherit;" />
            </div>
            <button id="btn-trace" class="btn btn-primary" style="white-space:nowrap;">Trace history</button>
          </div>
        </div>

        <div id="trace-results">
          <div class="empty-state">
            <i class="ph-duotone ph-barcode"></i>
            <h3>No trace yet</h3>
            <p>Enter a production order ID above to trace its manufacturing history.</p>
          </div>
        </div>

      </div>
    `;

    this.attachTraceHandlers(container);
  }

  attachTraceHandlers(container) {
    // Shared Navigation
    container.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.currentView = e.currentTarget.dataset.view;
        this.render(this.container);
      });
    });

    const btnTrace = container.querySelector('#btn-trace');
    const inputOrder = container.querySelector('#trace-order-id');
    const resultsDiv = container.querySelector('#trace-results');

    if (btnTrace) {
      btnTrace.addEventListener('click', async () => {
        const orderId = parseInt(inputOrder.value, 10);
        if (!orderId) return;

        btnTrace.innerHTML = '<i class="ph-bold ph-spinner ph-spin"></i> Tracing...';
        btnTrace.disabled = true;

        try {
          // Dynamic import of SmartShift to avoid circular deps if they exist, or just import it at top
          const { default: SmartShift } = await import('../modules/SmartShift.js');
          const shiftModule = new SmartShift();
          const data = await shiftModule.traceProduct(orderId);

          resultsDiv.innerHTML = this.renderTraceTimeline(data);
        } catch (err) {
          resultsDiv.innerHTML = `
            <div class="alert alert-danger" style="padding: 1rem; background: #fee2e2; color: #991b1b; border-radius: 6px;">
              <i class="ph-fill ph-warning-circle"></i> Error tracing product: ${err.message}
            </div>
          `;
        } finally {
          btnTrace.innerHTML = '<i class="ph-bold ph-arrow-right"></i> Trace History';
          btnTrace.disabled = false;
        }
      });
    }
  }

  renderTraceTimeline(trace) {
    if (!trace || trace.shifts.length === 0) {
      return `
        <div class="alert" style="padding: 1rem; background: var(--bg-secondary); border-radius: 6px;">
          Product has no completed manufacturing history yet.
        </div>
      `;
    }

    return `
      <div class="rpt-block">
        <div class="rpt-block-hd">Traceability Passport</div>
        <div class="trace-meta">
          <span><span class="trace-meta-l">Product</span> <strong>${trace.product} — Order #${trace.orderNumber}</strong></span>
          <span><span class="trace-meta-l">QA Approved</span> <strong>${trace.quantityProduced} units</strong></span>
          <span><span class="trace-meta-l">Total Labor</span> <strong>${trace.totalLaborHours.toFixed(2)} hrs</strong></span>
        </div>
        <div class="trace-timeline">
          ${trace.shifts.map(s => `
            <div class="trace-step">
              <div class="trace-dot"></div>
              <div class="trace-step-body">
                <div class="trace-step-hd">
                  <span class="trace-step-title">${s.machineEmployed}</span>
                  <span class="trace-step-date">${s.date}</span>
                </div>
                <p class="trace-step-desc">Operated by <strong>${s.workerEmployed}</strong> · ${s.durationHours} hrs · ${s.outputGenerated} units</p>
                <div class="trace-batches">
                  <span class="trace-batches-l">Materials</span>
                  ${s.rawMaterialBatches && s.rawMaterialBatches.length > 0
                    ? s.rawMaterialBatches.map(b => `<code class="trace-batch">${b}</code>`).join('')
                    : '<span style="font-size:0.75rem;color:var(--text-muted);">No batch numbers logged</span>'
                  }
                </div>
              </div>
            </div>
          `).join('')}
          <div class="trace-step trace-step-final">
            <div class="trace-dot trace-dot-ok"></div>
            <span style="font-size:0.875rem;font-weight:600;color:var(--success);">Manufacturing complete</span>
          </div>
        </div>
      </div>
    `;
  }

  getDateRange() {
    const now = new Date();
    let startDate, endDate = now.toISOString().split('T')[0];

    switch (this.dateRange) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    }

    return { startDate, endDate };
  }

  async getFinancialReport(startDate, endDate, inventoryMap) {
    const startTime = new Date(startDate).getTime();
    const endTime = new Date(endDate).getTime() + 24 * 60 * 60 * 1000;
    // Only load transactions within date range — avoids full table scan
    const allTxs = await db.getAll('transactions');
    // Filter by date range up front — avoids processing thousands of records
    const transactions = allTxs.filter(t => {
      const d = t.date || t.timestamp || t.createdAt || 0;
      return d >= startTime && d <= endTime;
    });
    const filtered = transactions; // already date-filtered above

    const incomeByCategory = {};
    const expensesByCategory = {};
    let totalIncome = 0;
    let totalExpenses = 0;

    // Advanced Filtering Logic
    if (this.activeFilter.type === 'all') {
      // GLOBAL VIEW: Use 'income' and 'expense'. Ignore 'sale' to prevent double counting.
      filtered.forEach(t => {
        if (t.type === 'income') {
          const cat = t.category || 'Other Income';
          incomeByCategory[cat] = (incomeByCategory[cat] || 0) + (t.amount || 0);
          totalIncome += (t.amount || 0);
        } else if (t.type === 'expense') {
          const cat = t.category || 'Other Expenses';
          expensesByCategory[cat] = (expensesByCategory[cat] || 0) + Math.abs(t.amount || 0);
          totalExpenses += Math.abs(t.amount || 0);
        }
      });
    } else {
      // FILTERED VIEW: Use 'sale' records to dig into line items.
      filtered.forEach(t => {
        // Processing Sales
        if (t.type === 'sale' && t.items) {
          t.items.forEach(item => {
            let match = false;
            const itemData = inventoryMap.get(item.sku);
            const itemCategory = itemData ? itemData.category : 'Unknown';

            if (this.activeFilter.type === 'category' && itemCategory === this.activeFilter.value) {
              match = true;
            }
            if (this.activeFilter.type === 'sku' && item.sku === this.activeFilter.value) {
              match = true;
            }

            if (match) {
              const cat = itemCategory;
              incomeByCategory[cat] = (incomeByCategory[cat] || 0) + item.total;
              totalIncome += item.total;
            }
          });
        }
      });

      // Disable expenses for product-level views for now as they aren't linked to products typically
      totalExpenses = 0;
    }

    return {
      totalIncome,
      totalExpenses,
      profit: totalIncome - totalExpenses,
      incomeByCategory,
      expensesByCategory,
      transactionCount: filtered.length
    };
  }

  async getInventoryReport(inventory = null) {
    if (!inventory) {
      inventory = await this.poolStock.getInventory();
    }

    const totalItems = inventory.length;
    const totalValue = inventory.reduce((sum, item) =>
      sum + ((item.quantity || 0) * (item.unitPrice || 0)), 0);
    const lowStockItems = inventory.filter(item =>
      item.quantity > 0 && item.quantity <= (item.reorderLevel || 10)).length;
    const outOfStock = inventory.filter(item => (item.quantity || 0) === 0).length;
    const categories = [...new Set(inventory.map(i => i.category))].length;

    return {
      totalItems,
      totalValue,
      lowStockItems,
      outOfStock,
      categories
    };
  }

  attachHandlers(container, financialData, inventoryData, advancedStats) {
    // Wire KPI card click handlers
    if (advancedStats) this.setupKPIClickHandlers(advancedStats);

    // Date range buttons
    container.querySelectorAll('.date-range-selector button').forEach(btn => {
      btn.addEventListener('click', () => {
        this.dateRange = btn.dataset.range;
        this.render(container);
      });
    });

    // PDF Export Handler
    const exportPdfBtn = container.querySelector('#export-pdf-btn');
    if (exportPdfBtn) {
      exportPdfBtn.addEventListener('click', () => {
        this.exportToPDF(container);
      });
    }

    // Export Handler
    const exportSelect = container.querySelector('#export-type');
    if (exportSelect) {
      exportSelect.addEventListener('change', (e) => {
        const type = e.target.value;
        if (type) {
          this.exportToCSV(type);
          e.target.value = ''; // Reset dropdown
        }
      });
    }

    // Filter Type Change
    const filterTypeSelect = container.querySelector('#filter-type');
    if (filterTypeSelect) {
      filterTypeSelect.addEventListener('change', (e) => {
        this.activeFilter.type = e.target.value;
        // Reset value on type change
        if (this.activeFilter.type === 'category') {
          // Default to first category if available or let user pick
          // Ideally we re-render and let renderFilterOptions pick/default
          this.activeFilter.value = null;
        } else if (this.activeFilter.type === 'sku') {
          this.activeFilter.value = null;
        } else {
          this.activeFilter.value = null;
        }
        this.render(container);
      });
    }

    // Filter Value Change
    const filterValueSelect = container.querySelector('#filter-value');
    if (filterValueSelect) {
      // If value was null (first render of filtered view), set it to the first option automatically?
      // Actually, renderFilterOptions sets 'selected' if matches. If null, select box picks first.
      // We should sync state.
      if (!this.activeFilter.value && filterValueSelect.options.length > 0) {
        this.activeFilter.value = filterValueSelect.options[0].value;
        // Re-render to apply this default filter immediately? 
        // Or just let the user change it. 
        // If we don't re-render, the stats won't reflect the default first option until changed.
        // Better to set it and re-render.
        this.render(container);
        return; // Stop here to avoid double binding or issues
      }

      filterValueSelect.addEventListener('change', (e) => {
        this.activeFilter.value = e.target.value;
        this.render(container);
      });
    }
  }

  async exportToPDF(container) {
    const btn = container.querySelector('#export-pdf-btn');
    const originalText = btn.innerHTML;
    btn.innerHTML = 'Generating...';
    btn.disabled = true;

    try {
      const { startDate, endDate } = this.getDateRange();

      const element = document.createElement('div');
      element.innerHTML = container.innerHTML;

      // Remove interactive parts
      const controls = element.querySelector('.report-controls');
      if (controls) controls.remove();

      // Add a header for the PDF
      const title = document.createElement('div');
      title.innerHTML = `
        <h1 style="color:#111; margin-bottom:0.5rem;">Business Status Report</h1>
        <p style="color:#444; margin-top:0; margin-bottom:2rem;">Period: ${startDate} to ${endDate}</p>
      `;
      element.insertBefore(title, element.firstChild);

      // Force print styles for PDF rendering
      const style = document.createElement('style');
      style.innerHTML = `
        .reports-container { padding: 20px; font-family: sans-serif; background: white !important; }
        .report-stats { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 10px; margin-bottom: 20px; }
        .stat-card { flex: 1; min-width: 130px; background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; }
        .reports-grid { display: flex; flex-direction: column; gap: 20px; }
        .card { background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; break-inside: avoid; margin-bottom: 20px; }
        .card-header { padding: 10px 15px; background: #f1f5f9; border-bottom: 1px solid #e2e8f0; font-weight: bold; }
        .card-body { padding: 15px; }
        table { width: 100%; border-collapse: collapse; page-break-inside: avoid; }
        th, td { padding: 8px; text-align: left; border-bottom: 1px solid #e2e8f0; }
        .advanced-stats-grid { display: flex; flex-wrap: wrap; gap: 10px; }
        .kpi-card { flex: 1; min-width: 150px; padding: 15px; border: 1px solid #e2e8f0; border-radius: 8px; }
        .progress-bar-bg { width: 100%; height: 8px; background: #e2e8f0; border-radius: 4px; overflow: hidden; margin-top:5px; }
        .progress-bar-fill { height: 100%; }
      `;
      element.appendChild(style);

      const opt = {
        margin: 10,
        filename: `business_report_${startDate}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      if (window.html2pdf) {
        await window.html2pdf().set(opt).from(element).save();
      } else {
        alert('PDF generation library not ready. Please try again.');
      }
    } catch (err) {
      console.error('PDF Export Error:', err);
      alert('Failed to generate PDF.');
    } finally {
      btn.innerHTML = originalText;
      btn.disabled = false;
    }
  }

  async exportToCSV(type = 'all') {
    const { startDate, endDate } = this.getDateRange();
    const allTransactions = await db.getAll('transactions');

    // Filter by date
    let filtered = allTransactions.filter(t => {
      const d = t.date; // YYYY-MM-DD
      return d >= startDate && d <= endDate;
    });

    // Filter by type
    if (type !== 'all') {
      filtered = filtered.filter(t => t.paymentMethod === type);
    }

    // Generate CSV Content
    // Columns: Date, ID, Type, Category, Description, Amount, Payment Method, Status
    const headers = ['Date', 'Transaction ID', 'Type', 'Category', 'Description', 'Amount', 'Payment Method', 'Status'];
    const rows = filtered.map(t => [
      t.date,
      t.id,
      t.type,
      t.category || '',
      `"${(t.description || '').replace(/"/g, '""')}"`, // Escape quotes
      t.amount || t.total || 0,
      t.paymentMethod || 'N/A',
      t.status || 'completed'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `export_${type}_${startDate}_to_${endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    URL.revokeObjectURL(url);
  }

  async getABCAnalysis(startDate, endDate) {
    const startMs = new Date(startDate).getTime();
    const endMs   = new Date(endDate).getTime() + 86400000;
    const transactions = await db.getAll('transactions');
    const filtered = transactions.filter(t => {
      const d = t.date || t.timestamp || t.createdAt || 0;
      const ds = typeof d === 'string' ? new Date(d).getTime() : d;
      return t.type === 'sale' && ds >= startMs && ds <= endMs;
    });

    const skuRevenue = {};
    filtered.forEach(t => {
      if (t.items) {
        t.items.forEach(i => {
          if (i.sku) skuRevenue[i.sku] = (skuRevenue[i.sku] || 0) + (i.total || 0);
        });
      }
    });

    const totalRevenue = Object.values(skuRevenue).reduce((a, b) => a + b, 0);
    const sorted = Object.entries(skuRevenue).sort(([, a], [, b]) => b - a);

    const classified = { a: [], b: [], c: [] };
    let cumulative = 0;

    sorted.forEach(([sku, rev]) => {
      cumulative += rev;
      const pct = totalRevenue > 0 ? (cumulative / totalRevenue) * 100 : 0;
      if (pct <= 80) classified.a.push({ sku, rev });
      else if (pct <= 95) classified.b.push({ sku, rev });
      else classified.c.push({ sku, rev });
    });

    return { classified, totalRevenue };
  }

  renderABCAnalysis(data, inventoryMap) {
    const { classified, totalRevenue } = data;
    const getProductName = (sku) => {
      const item = inventoryMap.get(sku);
      return item ? item.name : sku;
    };

    return `
      <div class="rpt-grid">
        <div class="rpt-block">
          <div class="rpt-block-hd">Top performers — Class A <span class="rpt-badge rpt-badge-ok">${classified.a.length} items · 80% revenue</span></div>
          <table class="data-table">
            <thead><tr><th>Product</th><th>Revenue</th><th>Share</th></tr></thead>
            <tbody>
              ${(() => {
                const totalRev = classified.a.reduce((s,i)=>s+i.rev,0) || 1;
                return classified.a.slice(0,5).map(i => `
                  <tr>
                    <td>${getProductName(i.sku)}</td>
                    <td>${sym()}${i.rev.toLocaleString()}</td>
                    <td>
                      <div class="tbl-bar-wrap"><div class="tbl-bar-fill" style="width:${Math.round(i.rev/totalRev*100)}%;background:var(--success);"></div></div>
                      <span class="tbl-pct">${Math.round(i.rev/totalRev*100)}%</span>
                    </td>
                  </tr>
                `).join('');
              })()}
              ${classified.a.length === 0 ? '<tr><td colspan="3" class="rpt-empty">No Class A items yet</td></tr>' : ''}
            </tbody>
          </table>
        </div>

        <div class="rpt-block">
          <div class="rpt-block-hd">Slow movers — Class C <span class="rpt-badge rpt-badge-warn">${classified.c.length} items · bottom 5%</span></div>
          <table class="data-table">
            <thead><tr><th>Product</th><th>Revenue</th><th>Action</th></tr></thead>
            <tbody>
              ${classified.c.slice(0,5).map(i => `
                <tr>
                  <td>${getProductName(i.sku)}</td>
                  <td>${sym()}${i.rev.toLocaleString()}</td>
                  <td style="font-size:0.75rem;color:var(--danger);font-weight:600;">Consider clearance</td>
                </tr>
              `).join('')}
              ${classified.c.length === 0 ? '<tr><td colspan="3" class="rpt-empty">No Class C items yet</td></tr>' : ''}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  renderAdvancedDashboard(stats) {
    // ... existing code ...
    // Note: I will just paste the method end and add the new one
    // But since I don't have the full context of renderAdvancedDashboard here, I'll append it before renderStyles
    // actually I should put it after renderAdvancedDashboard
    const slColor = stats.serviceLevel >= 95 ? '#10b981' : stats.serviceLevel >= 85 ? '#f59e0b' : '#ef4444';
    const roiColor = stats.roi >= 100 ? '#10b981' : stats.roi >= 0 ? '#f59e0b' : '#ef4444';

    return `
      <table class="kpi-table">
        <thead>
          <tr>
            <th>Metric</th>
            <th>Value</th>
            <th style="width:40%;">Progress</th>
          </tr>
        </thead>
        <tbody>
          <tr class="kpi-row" data-kpi="roi" style="cursor:pointer;" title="Click for details">
            <td>ROI</td>
            <td style="font-weight:700;color:${roiColor};">${stats.roi.toFixed(1)}%</td>
            <td>
              <div class="tbl-bar-wrap"><div class="tbl-bar-fill" style="width:${Math.min(stats.roi,100)}%;background:${roiColor};"></div></div>
            </td>
          </tr>
          <tr class="kpi-row" data-kpi="serviceLevel" style="cursor:pointer;" title="Click for details">
            <td>Service Level</td>
            <td style="font-weight:700;color:${slColor};">${stats.serviceLevel.toFixed(1)}%</td>
            <td>
              <div class="tbl-bar-wrap"><div class="tbl-bar-fill" style="width:${stats.serviceLevel}%;background:${slColor};"></div></div>
            </td>
          </tr>
          <tr class="kpi-row" data-kpi="stockTurns" style="cursor:pointer;" title="Click for details">
            <td>Stock Turns</td>
            <td style="font-weight:700;">${stats.stockTurns.toFixed(1)}×/yr</td>
            <td>
              <div class="tbl-bar-wrap"><div class="tbl-bar-fill" style="width:${Math.min(stats.stockTurns/12*100,100)}%;background:var(--accent);"></div></div>
            </td>
          </tr>
        </tbody>
      </table>
    `;
  }

  setupKPIClickHandlers(stats) {
    import('./panelHelper.js').then(({ showDetailPanel, dpBar, dpKV }) => {
      const panels = {
        roi: {
          title: 'Return on Investment (ROI)',
          subtitle: `Currently ${stats.roi.toFixed(1)}% — ${stats.roi >= 100 ? 'Excellent' : stats.roi >= 0 ? 'Positive' : 'Negative'}`,
          bodyHTML: `
            <div class="dp-section">
              <div class="dp-section-title">What is ROI?</div>
              <p style="font-size:0.875rem;color:var(--text-secondary);line-height:1.6;">
                ROI measures how much profit your inventory investment generates. A higher ROI means your stock is working harder for you.
              </p>
              <p style="font-size:0.8rem;font-family:monospace;background:var(--bg-secondary,#111113);padding:0.75rem;border-radius:8px;margin-top:0.75rem;">
                ROI = (Total Revenue − Cost) ÷ Inventory Value × 100
              </p>
            </div>
            <div class="dp-section">
              <div class="dp-section-title">Current Performance</div>
              <div class="dp-kv-grid">
                ${dpKV('ROI', stats.roi.toFixed(1) + '%')}
                ${dpKV('Rating', stats.roi >= 100 ? '<span style="color:#34d399">Excellent</span>' : stats.roi >= 0 ? '<span style="color:#fbbf24">Positive</span>' : '<span style="color:#f87171">Negative</span>')}
                ${dpKV('Benchmark', '> 100% is excellent for retail', true)}
              </div>
            </div>
            <div class="dp-section">
              <div class="dp-section-title">How to Improve</div>
              <ul class="dp-list">
                <li><span>Reduce slow-moving inventory</span></li>
                <li><span>Negotiate better supplier pricing</span></li>
                <li><span>Increase prices on high-demand items</span></li>
              </ul>
            </div>`
        },
        serviceLevel: {
          title: 'Service Level (Availability)',
          subtitle: `${stats.serviceLevel.toFixed(1)}% of your inventory is in stock`,
          bodyHTML: `
            <div class="dp-section">
              <div class="dp-section-title">What is Service Level?</div>
              <p style="font-size:0.875rem;color:var(--text-secondary);line-height:1.6;">
                Service Level is the percentage of your SKUs that are in stock (above their reorder level). High service levels mean fewer stockouts and better customer satisfaction.
              </p>
            </div>
            <div class="dp-section">
              <div class="dp-section-title">Current Performance</div>
              <div class="dp-kv-grid">
                ${dpKV('Service Level', stats.serviceLevel.toFixed(1) + '%')}
                ${dpKV('Rating', stats.serviceLevel >= 95 ? '<span style="color:#34d399">Excellent</span>' : stats.serviceLevel >= 85 ? '<span style="color:#fbbf24">Good</span>' : '<span style="color:#f87171">Needs Work</span>')}
                ${dpKV('Target', '≥ 95% is the industry standard', true)}
              </div>
              ${dpBar('Availability', stats.serviceLevel, 100, stats.serviceLevel >= 95 ? '#16a34a' : stats.serviceLevel >= 85 ? '#f59e0b' : '#dc2626', v => v.toFixed(1) + '%')}
            </div>
            <div class="dp-section">
              <div class="dp-section-title">How to Improve</div>
              <ul class="dp-list">
                <li><span>Review and restock items below reorder level</span></li>
                <li><span>Set more accurate reorder levels per item</span></li>
                <li><span>Set up purchase orders ahead of time</span></li>
              </ul>
            </div>`
        },
        stockTurns: {
          title: 'Stock Turnover Rate',
          subtitle: `Your inventory turns over ${stats.stockTurns.toFixed(1)} times per year`,
          bodyHTML: `
            <div class="dp-section">
              <div class="dp-section-title">What is Stock Turnover?</div>
              <p style="font-size:0.875rem;color:var(--text-secondary);line-height:1.6;">
                Stock turns measures how many times your entire inventory is sold and replaced in a year. Higher is generally better — it means your stock is moving fast and your cash isn't tied up.
              </p>
              <p style="font-size:0.8rem;font-family:monospace;background:var(--bg-secondary,#111113);padding:0.75rem;border-radius:8px;margin-top:0.75rem;">
                Stock Turns = Cost of Goods Sold ÷ Average Inventory Value
              </p>
            </div>
            <div class="dp-section">
              <div class="dp-section-title">Current Performance</div>
              <div class="dp-kv-grid">
                ${dpKV('Stock Turns', stats.stockTurns.toFixed(1) + 'x / year')}
                ${dpKV('Industry Benchmark', '4–8x is typical for retail')}
                ${dpKV('Interpretation', stats.stockTurns >= 6 ? '<span style="color:#34d399">Fast-moving</span>' : stats.stockTurns >= 3 ? '<span style="color:#fbbf24">Moderate pace</span>' : '<span style="color:#f87171">Slow — consider clearance</span>', true)}
              </div>
            </div>`
        }
      };

      document.querySelectorAll('.kpi-row[data-kpi]').forEach(row => {
        row.addEventListener('click', () => {
          const p = panels[row.dataset.kpi];
          if (p) showDetailPanel(p);
        });
      });
    }).catch(e => console.warn('KPI panel wiring skipped:', e));
  }

  renderFilterOptions(inventory, type) {
    if (type === 'category') {
      const categories = [...new Set(inventory.map(i => i.category))];
      return categories.map(c => `<option value="${c}" ${this.activeFilter.value === c ? 'selected' : ''}>${c}</option>`).join('');
    } else if (type === 'sku') {
      return inventory.map(i => `<option value="${i.sku}" ${this.activeFilter.value === i.sku ? 'selected' : ''}>${i.name}</option>`).join('');
    }
    return '';
  }

  renderStyles() {
    return `
      <style>
        .reports-container { padding: 0; }

        /* Controls bar */
        .report-controls {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.625rem 1.5rem;
          border-bottom: 1px solid var(--border);
          flex-wrap: wrap;
          gap: 0.75rem;
          background: var(--bg-secondary);
        }
        .date-range-selector { display: flex; gap: 0.375rem; }
        .date-range-selector .btn { font-size: 0.8125rem; padding: 0.3rem 0.75rem; }
        .filter-controls { display: flex; gap: 0.5rem; align-items: center; }
        .form-select {
          padding: 0.375rem 0.625rem;
          border: 1px solid var(--border);
          border-radius: 6px;
          background: var(--bg-elevated, rgba(255,255,255,0.04));
          color: var(--text-primary);
          font-size: 0.8125rem;
          font-family: inherit;
          min-width: 120px;
        }

        /* Financial summary strip */
        .fin-bar {
          display: flex;
          align-items: stretch;
          border-bottom: 1px solid var(--border);
          background: var(--bg-secondary);
          overflow-x: auto;
        }
        .fin-bar-item {
          display: flex;
          flex-direction: column;
          padding: 0.875rem 1.25rem;
          gap: 2px;
          flex: 1;
          min-width: 100px;
        }
        .fin-bar-label {
          font-size: 0.6875rem;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: var(--text-muted);
        }
        .fin-bar-value {
          font-size: 1rem;
          font-weight: 700;
          letter-spacing: -0.01em;
          color: var(--text-primary);
        }
        .fin-bar-sep {
          width: 1px;
          background: var(--border);
          align-self: stretch;
          flex-shrink: 0;
        }

        /* Section wrappers */
        .rpt-section {
          padding: 1.25rem 1.5rem;
          border-bottom: 1px solid var(--border);
        }
        .rpt-section-hd {
          font-size: 0.6875rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.07em;
          color: var(--text-muted);
          margin-bottom: 0.875rem;
        }

        /* Block: flat section with a heading above a table */
        .rpt-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(min(100%, 340px), 1fr));
          gap: 0;
          border-bottom: 1px solid var(--border);
        }
        .rpt-block {
          padding: 1.25rem 1.5rem;
          border-right: 1px solid var(--border);
        }
        .rpt-block:last-child { border-right: none; }
        .rpt-block-hd {
          font-size: 0.8125rem;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: 0.75rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .rpt-empty { font-size: 0.8125rem; color: var(--text-muted); margin: 0; padding: 0.5rem 0; }

        /* Badges inside headings */
        .rpt-badge {
          font-size: 0.6875rem;
          font-weight: 500;
          padding: 0.15rem 0.5rem;
          border-radius: 4px;
        }
        .rpt-badge-ok   { background: rgba(16,185,129,0.12); color: #34d399; }
        .rpt-badge-warn { background: rgba(239,68,68,0.1);   color: #f87171; }

        /* KPI table (Supply Chain) */
        .kpi-table { width: 100%; border-collapse: collapse; }
        .kpi-table th {
          font-size: 0.6875rem;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: var(--text-muted);
          padding: 0 0 0.5rem;
          text-align: left;
          border-bottom: 1px solid var(--border);
        }
        .kpi-row td {
          padding: 0.625rem 0;
          border-bottom: 1px solid var(--border);
          font-size: 0.875rem;
          vertical-align: middle;
        }
        .kpi-row:last-child td { border-bottom: none; }
        .kpi-row:hover td { background: rgba(255,255,255,0.02); }

        /* Inline bar used in tables */
        .tbl-bar-wrap {
          height: 5px;
          background: var(--border);
          border-radius: 3px;
          overflow: hidden;
          margin-bottom: 2px;
        }
        .tbl-bar-fill {
          height: 100%;
          border-radius: 3px;
          transition: width 0.4s ease;
        }
        .tbl-pct { font-size: 0.6875rem; color: var(--text-muted); }

        /* Traceability timeline */
        .trace-meta {
          display: flex;
          gap: 1.5rem;
          flex-wrap: wrap;
          font-size: 0.875rem;
          margin-bottom: 1.25rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid var(--border);
        }
        .trace-meta-l { color: var(--text-muted); font-size: 0.75rem; display: block; }

        .trace-timeline {
          position: relative;
          margin-left: 0.75rem;
          border-left: 2px solid var(--border);
          padding-left: 1.5rem;
        }
        .trace-step { position: relative; margin-bottom: 1.5rem; }
        .trace-step:last-child { margin-bottom: 0; }
        .trace-dot {
          position: absolute;
          left: -1.9rem;
          top: 3px;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: var(--accent);
          border: 2px solid var(--bg-primary);
        }
        .trace-dot-ok { background: var(--success); }
        .trace-step-body {
          background: var(--bg-elevated, rgba(255,255,255,0.03));
          border: 1px solid var(--border);
          border-radius: 6px;
          padding: 0.75rem 1rem;
        }
        .trace-step-hd {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          margin-bottom: 0.25rem;
        }
        .trace-step-title { font-size: 0.875rem; font-weight: 700; }
        .trace-step-date  { font-size: 0.75rem; color: var(--text-muted); }
        .trace-step-desc  { margin: 0 0 0.625rem; font-size: 0.8125rem; color: var(--text-secondary); }
        .trace-batches    { display: flex; gap: 0.375rem; flex-wrap: wrap; align-items: center; }
        .trace-batches-l  { font-size: 0.6875rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-right: 0.25rem; }
        .trace-batch {
          font-family: monospace;
          font-size: 0.75rem;
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: 3px;
          padding: 0.1rem 0.375rem;
          color: var(--text-primary);
        }
        .trace-step-final { display: flex; align-items: center; gap: 0.5rem; }

        @media (max-width: 640px) {
          .report-controls { flex-direction: column; align-items: stretch; }
          .filter-controls  { flex-direction: column; }
          .date-range-selector { flex-wrap: wrap; }
          .date-range-selector .btn { flex: 1; }
          .fin-bar { flex-wrap: wrap; }
          .fin-bar-sep { display: none; }
          .fin-bar-item { flex: 0 0 calc(50% - 1px); border-bottom: 1px solid var(--border); }
          .rpt-grid { grid-template-columns: 1fr; }
          .rpt-block { border-right: none; border-bottom: 1px solid var(--border); }
          .rpt-block:last-child { border-bottom: none; }
        }
      </style>
    `;
  }
}

export default new ReportsUI();

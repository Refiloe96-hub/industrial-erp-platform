// Reports UI - Analytics and reporting for all business types
import db from '../db/index.js';
import PocketBooks from '../modules/PocketBooks.js';
import PoolStock from '../modules/PoolStock.js';

class ReportsUI {
  constructor() {
    this.dateRange = 'week'; // week, month, custom
    this.activeFilter = { type: 'all', value: null }; // { type: 'all' | 'category' | 'sku', value: string }
    this.poolStock = new PoolStock();
  }

  async render(container) {
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
          
          <div class="export-controls">
            <select id="export-type" class="form-select">
                <option value=""><i class="ph-duotone ph-download-simple"></i> Export Report...</option>
                <option value="all">Everything (CSV)</option>
                <option value="mpesa">M-Pesa Sales</option>
                <option value="cash">Cash Sales</option>
                <option value="card">Card Sales</option>
            </select>
          </div>
        </div>

        <!-- Advanced Supply Chain Analytics (Phase 4) -->
        <div class="section-header">
            <h3><i class="ph-duotone ph-factory"></i> Supply Chain Health</h3>
        </div>
        ${this.renderAdvancedDashboard(advancedStats)}

        <!-- ABC Analysis (Phase 5) -->
        <div class="section-header">
            <h3><i class="ph-duotone ph-chart-polar"></i> Product Performance (ABC Analysis)</h3>
        </div>
        ${this.renderABCAnalysis(abcData, inventoryMap)}

        <div class="section-header">
            <h3><i class="ph-duotone ph-briefcase"></i> Financial Overview</h3>
        </div>

        <!-- Summary Cards -->
        <div class="report-stats">
          <div class="stat-card revenue">
            <div class="stat-icon"><i class="ph-duotone ph-money"></i></div>
            <div class="stat-content">
              <p class="stat-label">Total Income</p>
              <h2 class="stat-value">R ${financialData.totalIncome.toLocaleString()}</h2>
            </div>
          </div>
          
          <div class="stat-card expenses">
            <div class="stat-icon"><i class="ph-duotone ph-trend-down"></i></div>
            <div class="stat-content">
              <p class="stat-label">Total Expenses</p>
              <h2 class="stat-value">R ${financialData.totalExpenses.toLocaleString()}</h2>
            </div>
          </div>
          
          <div class="stat-card profit ${financialData.profit >= 0 ? 'positive' : 'negative'}">
            <div class="stat-icon">${financialData.profit >= 0 ? '<i class="ph-duotone ph-trend-up"></i>' : '<i class="ph-duotone ph-trend-down"></i>'}</div>
            <div class="stat-content">
              <p class="stat-label">Net Profit</p>
              <h2 class="stat-value">R ${financialData.profit.toLocaleString()}</h2>
            </div>
          </div>
          
          <div class="stat-card">
            <div class="stat-icon"><i class="ph-duotone ph-package"></i></div>
            <div class="stat-content">
              <p class="stat-label">Inventory Value</p>
              <h2 class="stat-value">R ${inventoryData.totalValue.toLocaleString()}</h2>
            </div>
          </div>
        </div>

        <!-- Detailed Reports -->
        <div class="reports-grid">
          <!-- Income by Category -->
          <div class="card">
            <div class="card-header">
              <h3><i class="ph-duotone ph-chart-bar"></i> Income by Category</h3>
            </div>
            <div class="card-body">
              ${Object.keys(financialData.incomeByCategory).length > 0 ? `
                <div class="table-container">
                  <table class="data-table">
                    <thead>
                      <tr>
                        <th>Category</th>
                        <th>Amount</th>
                        <th>%</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${Object.entries(financialData.incomeByCategory).map(([cat, amt]) => `
                        <tr>
                          <td>${cat}</td>
                          <td>R ${amt.toLocaleString()}</td>
                          <td>${((amt / financialData.totalIncome) * 100).toFixed(1)}%</td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                </div>
              ` : '<p class="text-muted">No income recorded in this period</p>'}
            </div>
          </div>

          <!-- Expenses by Category -->
          <div class="card">
            <div class="card-header">
              <h3><i class="ph-duotone ph-chart-bar"></i> Expenses by Category</h3>
            </div>
            <div class="card-body">
              ${Object.keys(financialData.expensesByCategory).length > 0 ? `
                <div class="table-container">
                  <table class="data-table">
                    <thead>
                      <tr>
                        <th>Category</th>
                        <th>Amount</th>
                        <th>%</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${Object.entries(financialData.expensesByCategory).map(([cat, amt]) => `
                        <tr>
                          <td>${cat}</td>
                          <td>R ${amt.toLocaleString()}</td>
                          <td>${((amt / financialData.totalExpenses) * 100).toFixed(1)}%</td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                </div>
              ` : '<p class="text-muted">No expenses recorded in this period</p>'}
            </div>
          </div>

          <!-- Inventory Summary -->
          <div class="card full-width">
            <div class="card-header">
              <h3><i class="ph-duotone ph-package"></i> Inventory Summary</h3>
            </div>
            <div class="card-body">
              <div class="inventory-summary">
                <div class="summary-item">
                  <span class="label">Total Items:</span>
                  <span class="value">${inventoryData.totalItems}</span>
                </div>
                <div class="summary-item">
                  <span class="label">Low Stock Items:</span>
                  <span class="value warning">${inventoryData.lowStockItems}</span>
                </div>
                <div class="summary-item">
                  <span class="label">Out of Stock:</span>
                  <span class="value danger">${inventoryData.outOfStock}</span>
                </div>
                <div class="summary-item">
                  <span class="label">Categories:</span>
                  <span class="value">${inventoryData.categories}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    this.attachHandlers(container, financialData, inventoryData);
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
    const transactions = await db.getAll('transactions');
    const startTime = new Date(startDate).getTime();
    const endTime = new Date(endDate).getTime() + 24 * 60 * 60 * 1000;

    const filtered = transactions.filter(t => {
      const txTime = t.date || t.timestamp;
      return txTime >= startTime && txTime <= endTime;
    });

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

  attachHandlers(container, financialData, inventoryData) {
    // Date range buttons
    container.querySelectorAll('.date-range-selector button').forEach(btn => {
      btn.addEventListener('click', () => {
        this.dateRange = btn.dataset.range;
        this.render(container);
      });
    });

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
    const transactions = await db.getAll('transactions');
    const filtered = transactions.filter(t =>
      t.type === 'sale' && t.date >= startDate && t.date <= endDate
    );

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
      <div class="reports-grid mb-4">
        <div class="card">
            <div class="card-header">
                <h3><i class="ph-duotone ph-trophy"></i> Winning Products (Class A)</h3>
                <span class="badge success">${classified.a.length} Items (80% Revenue)</span>
            </div>
            <div class="card-body">
                <div class="table-container">
                    <table class="data-table">
                        <thead><tr><th>Product</th><th>Revenue</th><th>Wait</th></tr></thead>
                        <tbody>
                            ${classified.a.slice(0, 5).map(i => `
                                <tr>
                                    <td>${getProductName(i.sku)}</td>
                                    <td>R ${i.rev.toLocaleString()}</td>
                                    <td><div class="progress-bar-bg" style="width: 50px; height: 4px;"><div class="progress-bar-fill" style="width: 100%; background: var(--success)"></div></div></td>
                                </tr>
                            `).join('')}
                            ${classified.a.length === 0 ? '<tr><td colspan="3" class="text-muted">No Class A items yet</td></tr>' : ''}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

         <div class="card">
            <div class="card-header">
                <h3><i class="ph-duotone ph-warning-circle"></i> Slow Movers (Class C)</h3>
                 <span class="badge danger">${classified.c.length} Items (Bottom 5%)</span>
            </div>
            <div class="card-body">
                 <div class="table-container">
                    <table class="data-table">
                        <thead><tr><th>Product</th><th>Revenue</th><th>Action</th></tr></thead>
                        <tbody>
                            ${classified.c.slice(0, 5).map(i => `
                                <tr>
                                    <td>${getProductName(i.sku)}</td>
                                    <td>R ${i.rev.toLocaleString()}</td>
                                    <td><span class="text-xs text-danger">Review</span></td>
                                </tr>
                            `).join('')}
                             ${classified.c.length === 0 ? '<tr><td colspan="3" class="text-muted">No Class C items yet</td></tr>' : ''}
                        </tbody>
                    </table>
                </div>
            </div>
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
      <div class="advanced-stats-grid">
        <!-- ROI Widget -->
        <div class="kpi-card">
           <div class="kpi-header">
              <span><i class="ph-duotone ph-rocket"></i> ROI</span>
              <span class="info-icon" title="Return on Investment = (Margin / Inventory Value)"><i class="ph-duotone ph-info"></i></span>
           </div>
           <div class="kpi-body">
             <div class="kpi-value" style="color: ${roiColor}">${stats.roi.toFixed(1)}%</div>
             <p class="kpi-sub">Potential Return</p>
             <div class="progress-bar-bg">
               <div class="progress-bar-fill" style="width: ${Math.min(stats.roi, 100)}%; background: ${roiColor}"></div>
             </div>
           </div>
        </div>

        <!-- Service Level Widget -->
        <div class="kpi-card">
           <div class="kpi-header">
              <span><i class="ph-duotone ph-target"></i> Service Level</span>
              <span class="info-icon" title="Percentage of items in stock"><i class="ph-duotone ph-info"></i></span>
           </div>
           <div class="kpi-body">
             <div class="kpi-value" style="color: ${slColor}">${stats.serviceLevel.toFixed(1)}%</div>
             <p class="kpi-sub">Availability</p>
             <div class="progress-bar-bg">
               <div class="progress-bar-fill" style="width: ${stats.serviceLevel}%; background: ${slColor}"></div>
             </div>
           </div>
        </div>

        <!-- Stock Turns Widget -->
        <div class="kpi-card">
           <div class="kpi-header">
              <span><i class="ph-duotone ph-arrows-clockwise"></i> Stock Turns</span>
              <span class="info-icon" title="How many times you sell out your stock per year"><i class="ph-duotone ph-info"></i></span>
           </div>
           <div class="kpi-body">
             <div class="kpi-value">${stats.stockTurns.toFixed(1)}x</div>
             <p class="kpi-sub">Per Year</p>
             <div class="stat-badge">
               High Speed Flow
             </div>
           </div>
        </div>
      </div>
    `;
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
        .reports-container {
          padding: 1rem;
        }

        .report-controls {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .filter-controls {
            display: flex;
            gap: 0.5rem;
            align-items: center;
        }

        .form-select {
            padding: 0.5rem;
            border: 1px solid var(--border-color);
            border-radius: 6px;
            background-color: var(--bg-primary);
            color: var(--text-primary);
            font-size: 0.875rem;
            min-width: 120px;
        }

        .section-header {
            margin: 1.5rem 0 1rem;
            border-bottom: 1px solid #e5e7eb;
            padding-bottom: 0.5rem;
        }
        
        .section-header h3 {
            margin: 0;
            color: var(--text-primary);
            font-size: 1.1rem;
        }

        /* Advanced Stats Grid */
        .advanced-stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr));
            gap: 1rem;
            margin-bottom: 2rem;
        }

        .kpi-card {
            background: var(--bg-primary);
            border-radius: 12px;
            padding: 1.5rem;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            border: 1px solid var(--border-color);
        }

        .kpi-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1rem;
            color: var(--text-secondary);
            font-weight: 500;
        }

        .kpi-value {
            font-size: 2.5rem;
            font-weight: 800;
            margin-bottom: 0.25rem;
            line-height: 1;
        }

        .kpi-sub {
            margin: 0 0 1rem 0;
            font-size: 0.875rem;
            color: #9ca3af;
        }

        .progress-bar-bg {
            height: 8px;
            background: var(--bg-secondary);
            border-radius: 4px;
            overflow: hidden;
        }

        .progress-bar-fill {
            height: 100%;
            border-radius: 4px;
            transition: width 0.5s ease;
        }

        .stat-badge {
            display: inline-block;
            padding: 0.25rem 0.75rem;
            background: #e0e7ff;
            color: #4f46e5;
            border-radius: 999px;
            font-size: 0.75rem;
            font-weight: 600;
        }

        .date-range-selector {
          display: flex;
          gap: 0.5rem;
        }

        .report-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(min(100%, 200px), 1fr));
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .stat-card.revenue {
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
        }

        .stat-card.expenses {
          background: linear-gradient(135deg, #ef4444, #dc2626);
          color: white;
        }

        .stat-card.profit.positive {
          background: linear-gradient(135deg, #6366f1, #4f46e5);
          color: white;
        }

        .stat-card.profit.negative {
          background: linear-gradient(135deg, #f59e0b, #d97706);
          color: white;
        }

        .stat-card.revenue .stat-label,
        .stat-card.expenses .stat-label,
        .stat-card.profit .stat-label {
          color: rgba(255,255,255,0.8);
        }

        .reports-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(min(100%, 400px), 1fr));
          gap: 1.5rem;
        }

        .full-width {
          grid-column: 1 / -1;
        }

        .inventory-summary {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(min(100%, 150px), 1fr));
          gap: 1rem;
        }

        .summary-item {
          display: flex;
          flex-direction: column;
          padding: 1rem;
          background: var(--bg-secondary);
          border-radius: 8px;
        }

        .summary-item .label {
          font-size: 0.875rem;
          color: #6b7280;
        }

        .summary-item .value {
          font-size: 1.5rem;
          font-weight: 700;
        }

        .summary-item .value.warning {
          color: #f59e0b;
        }

        .summary-item .value.danger {
          color: #ef4444;
        }

        .summary-item .value.danger {
          color: #ef4444;
        }

        /* Ensure tables in reports are transparent to pick up card background */
        .reports-grid table {
          background: transparent !important;
        }
        
        .reports-grid tr {
          background: transparent;
          color: var(--text-primary);
        }
        
        .reports-grid td {
          border-bottom: 1px solid var(--border-color);
        }

        @media (max-width: 768px) {
          /* All grids: single column on mobile */
          .reports-grid,
          .advanced-stats-grid,
          .report-stats {
            grid-template-columns: 1fr !important;
            gap: 0.75rem !important;
          }

          /* Inventory summary: 2-col on mobile is fine */
          .inventory-summary {
            grid-template-columns: 1fr 1fr !important;
            gap: 0.5rem !important;
          }

          /* Controls: stack vertically */
          .report-controls {
            flex-direction: column !important;
            align-items: stretch !important;
          }

          .filter-controls {
            flex-direction: column !important;
            width: 100% !important;
          }

          .filter-controls .form-select,
          .export-controls .form-select {
            width: 100% !important;
          }

          .date-range-selector {
            width: 100%;
            display: flex;
          }

          .date-range-selector button {
            flex: 1;
            font-size: 0.8rem;
            padding: 0.4rem 0.5rem;
          }

          /* ABC analysis cards: full width */
          .reports-grid.mb-4 {
            grid-template-columns: 1fr !important;
          }

          /* KPI value smaller on mobile */
          .kpi-value {
            font-size: 1.75rem !important;
          }
        }
      </style>
    `;
  }
}

export default new ReportsUI();

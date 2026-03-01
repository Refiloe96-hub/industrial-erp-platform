
import PocketBooks from '../modules/PocketBooks.js';
import { showDetailPanel, dpBar, dpKV } from './panelHelper.js';

class PocketBooksUI {
    constructor(container) {
        this.container = container;
        this.module = new PocketBooks();
        this.currentFilter = 'all';
        this.dateRange = 30; // Last 30 days
    }

    async render() {
        await this.loadDashboard();
    }

    async loadDashboard() {
        this.container.innerHTML = '<div class="loading">Loading PocketBooks...</div>';

        try {
            const transactions = await this.module.getTransactions();
            const cashFlow = await this.module.calculateCashFlow();

            this.container.innerHTML = `
                <div class="pocketbooks-ui">
                    <header class="module-header">
                        <div>
                            <h1><i class="ph-duotone ph-wallet"></i> PocketBooks</h1>
                            <p>Financial Ledger & Cash Flow Management</p>
                        </div>
                        <button id="add-transaction-btn" class="btn btn-primary"><i class="ph ph-plus"></i> Add Transaction</button>
                    </header>

                    <!-- Stats Cards -->
                    <div class="stats-grid">
                        <div class="stat-card income" data-card="income" style="cursor:pointer" title="Click for breakdown">
                            <div class="stat-icon"><i class="ph-duotone ph-trend-up"></i></div>
                            <div class="stat-content">
                                <span class="stat-label">Total Income</span>
                                <span class="stat-value">R ${cashFlow.income.toLocaleString()}</span>
                            </div>
                        </div>
                        <div class="stat-card expense" data-card="expenses" style="cursor:pointer" title="Click for breakdown">
                            <div class="stat-icon"><i class="ph-duotone ph-trend-down"></i></div>
                            <div class="stat-content">
                                <span class="stat-label">Total Expenses</span>
                                <span class="stat-value">R ${cashFlow.expenses.toLocaleString()}</span>
                            </div>
                        </div>
                        <div class="stat-card ${cashFlow.netCashFlow >= 0 ? 'positive' : 'negative'}" data-card="net" style="cursor:pointer" title="Click for breakdown">
                            <div class="stat-icon"><i class="ph-duotone ph-money"></i></div>
                            <div class="stat-content">
                                <span class="stat-label">Net Cash Flow</span>
                                <span class="stat-value">${cashFlow.netCashFlow >= 0 ? '+' : ''}R ${cashFlow.netCashFlow.toLocaleString()}</span>
                            </div>
                        </div>
                        <div class="stat-card neutral" data-card="count" style="cursor:pointer" title="Click for breakdown">
                            <div class="stat-icon"><i class="ph-duotone ph-list-numbers"></i></div>
                            <div class="stat-content">
                                <span class="stat-label">Transactions</span>
                                <span class="stat-value">${transactions.length}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Filters -->
                    <div class="filters-bar">
                        <div class="filter-group">
                            <label>Category:</label>
                            <select id="category-filter">
                                <option value="all">All Categories</option>
                                <option value="Sales">Sales</option>
                                <option value="Expenses">Expenses</option>
                                <option value="Supplies">Supplies</option>
                                <option value="Services">Services</option>
                                <option value="Salary">Salary</option>
                                <option value="Utilities">Utilities</option>
                                <option value="Bank">Bank</option>
                                <option value="Labor">Labor</option>
                            </select>
                        </div>
                        <div class="filter-group">
                            <label>Type:</label>
                            <select id="type-filter">
                                <option value="all">All Types</option>
                                <option value="income">Income</option>
                                <option value="expense">Expense</option>
                            </select>
                        </div>
                        <div class="filter-group">
                            <label>Period:</label>
                            <select id="period-filter">
                                <option value="7">Last 7 Days</option>
                                <option value="30" selected>Last 30 Days</option>
                                <option value="90">Last 90 Days</option>
                                <option value="365">Last Year</option>
                                <option value="0">All Time</option>
                            </select>
                        </div>
                    </div>

                    <!-- Transactions Table -->
                    <div class="transactions-section">
                        <h3>Transaction History</h3>
                        <div class="table-container">
                            <table class="data-table" id="transactions-table">
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Description</th>
                                        <th>Category</th>
                                        <th>Reference</th>
                                        <th class="text-right">Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${this.renderTransactionRows(transactions)}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            `;

            this.attachEventListeners();
            this.injectStyles();

        } catch (err) {
            console.error('Error loading PocketBooks:', err);
            this.container.innerHTML = `<p class="error">Error: ${err.message}</p>`;
        }
    }

    renderTransactionRows(transactions) {
        if (!transactions.length) {
            return '<tr><td colspan="5" class="empty-state">No transactions found. Click "Add Transaction" or use Seed Data.</td></tr>';
        }

        return transactions.map(t => `
            <tr class="transaction-row ${t.type}" data-id="${t.id}" style="cursor:pointer;">
                <td>${new Date(t.date).toLocaleDateString('en-ZA')}</td>
                <td>${t.description}</td>
                <td><span class="badge ${t.category?.toLowerCase()}">${t.category}</span></td>
                <td class="reference">${t.reference || '-'}</td>
                <td class="amount ${t.type}">
                    ${t.type === 'income' ? '+' : '-'} R ${(t.amount || 0).toLocaleString()}
                </td>
            </tr>
        `).join('');
    }

    attachEventListeners() {
        // Add Transaction Button
        this.container.querySelector('#add-transaction-btn').addEventListener('click', () => {
            this.showAddTransactionModal();
        });

        // Row click → detail panel
        this.container.querySelector('#transactions-table tbody').addEventListener('click', async (e) => {
            const row = e.target.closest('tr[data-id]');
            if (!row) return;
            const all = await this.module.getTransactions();
            const t = all.find(x => String(x.id) === row.dataset.id);
            if (t) this.showTransactionDetail(t);
        });

        // Stat card click → drill-down panel
        this.container.querySelectorAll('.stat-card[data-card]').forEach(card => {
            card.addEventListener('click', () => this.showStatPanel(card.dataset.card));
        });

        // Filters
        this.container.querySelector('#category-filter').addEventListener('change', () => this.applyFilters());
        this.container.querySelector('#type-filter').addEventListener('change', () => this.applyFilters());
        this.container.querySelector('#period-filter').addEventListener('change', (e) => {
            this.dateRange = parseInt(e.target.value);
            this.loadDashboard();
        });
    }

    async applyFilters() {
        const categoryFilter = this.container.querySelector('#category-filter').value;
        const typeFilter = this.container.querySelector('#type-filter').value;

        const filters = {};
        if (categoryFilter !== 'all') filters.category = categoryFilter;
        if (typeFilter !== 'all') filters.type = typeFilter;

        const transactions = await this.module.getTransactions(filters);
        const tbody = this.container.querySelector('#transactions-table tbody');
        tbody.innerHTML = this.renderTransactionRows(transactions);
    }

    async showStatPanel(card) {
        const transactions = await this.module.getTransactions();
        const cashFlow = await this.module.calculateCashFlow();

        const incomeByCategory = {};
        const expenseByCategory = {};
        transactions.forEach(t => {
            if (t.type === 'income') incomeByCategory[t.category || 'Other'] = (incomeByCategory[t.category || 'Other'] || 0) + (t.amount || 0);
            if (t.type === 'expense') expenseByCategory[t.category || 'Other'] = (expenseByCategory[t.category || 'Other'] || 0) + (t.amount || 0);
        });
        const incomeCount = transactions.filter(t => t.type === 'income').length;
        const expenseCount = transactions.filter(t => t.type === 'expense').length;
        const maxIncome = Math.max(...Object.values(incomeByCategory), 1);
        const maxExpense = Math.max(...Object.values(expenseByCategory), 1);

        const panels = {
            income: {
                title: 'Total Income Breakdown',
                subtitle: `R ${cashFlow.income.toLocaleString()} across ${incomeCount} income entries`,
                bodyHTML: Object.keys(incomeByCategory).length ? `
                    <div class="dp-section">
                        <div class="dp-section-title">Income by Category</div>
                        ${Object.entries(incomeByCategory).sort((a, b) => b[1] - a[1]).map(([cat, amt]) =>
                    dpBar(cat, amt, maxIncome, '#16a34a', v => `R ${v.toLocaleString()}`)).join('')}
                    </div>` : '<div class="dp-empty">No income recorded yet.</div>'
            },
            expenses: {
                title: 'Total Expenses Breakdown',
                subtitle: `R ${cashFlow.expenses.toLocaleString()} across ${expenseCount} expense entries`,
                bodyHTML: Object.keys(expenseByCategory).length ? `
                    <div class="dp-section">
                        <div class="dp-section-title">Expenses by Category</div>
                        ${Object.entries(expenseByCategory).sort((a, b) => b[1] - a[1]).map(([cat, amt]) =>
                    dpBar(cat, amt, maxExpense, '#dc2626', v => `R ${v.toLocaleString()}`)).join('')}
                    </div>` : '<div class="dp-empty">No expenses recorded yet.</div>'
            },
            net: {
                title: 'Net Cash Flow',
                subtitle: cashFlow.netCashFlow >= 0 ? 'Positive — you are earning more than you spend' : 'Negative — expenses exceed income',
                bodyHTML: `
                    <div class="dp-section">
                        <div class="dp-section-title">Overview</div>
                        <div class="dp-kv-grid">
                            ${dpKV('Total Income', 'R ' + cashFlow.income.toLocaleString())}
                            ${dpKV('Total Expenses', 'R ' + cashFlow.expenses.toLocaleString())}
                            ${dpKV('Net Cash Flow', (cashFlow.netCashFlow >= 0 ? '+' : '') + 'R ' + cashFlow.netCashFlow.toLocaleString(), true)}
                        </div>
                    </div>
                    <div class="dp-section">
                        <div class="dp-section-title">Comparison</div>
                        ${dpBar('Income', cashFlow.income, Math.max(cashFlow.income, cashFlow.expenses, 1), '#16a34a', v => 'R ' + v.toLocaleString())}
                        ${dpBar('Expenses', cashFlow.expenses, Math.max(cashFlow.income, cashFlow.expenses, 1), '#dc2626', v => 'R ' + v.toLocaleString())}
                    </div>`
            },
            count: {
                title: 'Transaction Summary',
                subtitle: `${transactions.length} total entries`,
                bodyHTML: `
                    <div class="dp-section">
                        <div class="dp-section-title">By Type</div>
                        ${dpBar('Income', incomeCount, Math.max(incomeCount, expenseCount, 1), '#16a34a')}
                        ${dpBar('Expenses', expenseCount, Math.max(incomeCount, expenseCount, 1), '#dc2626')}
                    </div>
                    <div class="dp-section">
                        <div class="dp-section-title">Recent 5 Transactions</div>
                        <ul class="dp-list">
                            ${transactions.slice(0, 5).map(t => `<li>
                                <span>${t.description || t.category}</span>
                                <span style="color:${t.type === 'income' ? '#16a34a' : '#dc2626'};font-weight:600">${t.type === 'income' ? '+' : '-'}R ${(t.amount || 0).toLocaleString()}</span>
                            </li>`).join('') || '<li>No transactions yet.</li>'}
                        </ul>
                    </div>`
            }
        };
        showDetailPanel(panels[card]);
    }

    showTransactionDetail(t) {
        // Remove existing panel if open
        document.querySelector('.tx-detail-panel')?.remove();
        document.querySelector('.tx-detail-overlay')?.remove();

        const isIncome = t.type === 'income';
        const amountColor = isIncome ? '#16a34a' : '#dc2626';
        const dateStr = new Date(t.date).toLocaleDateString('en-ZA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

        const overlay = document.createElement('div');
        overlay.className = 'tx-detail-overlay';
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.35);z-index:1200;backdrop-filter:blur(2px);';

        const panel = document.createElement('div');
        panel.className = 'tx-detail-panel';
        panel.style.cssText = 'position:fixed;top:0;right:0;height:100%;width:min(420px,100vw);background:var(--bg-primary,#fff);z-index:1201;box-shadow:-4px 0 24px rgba(0,0,0,0.15);display:flex;flex-direction:column;overflow:hidden;animation:slideInRight 0.25s ease;';

        panel.innerHTML = `
            <style>
                @keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
                .tx-detail-header { padding: 1.25rem 1.5rem; border-bottom: 1px solid var(--border,#e5e7eb); display:flex; align-items:center; justify-content:space-between; }
                .tx-detail-header h2 { font-size: 1rem; font-weight: 600; color: var(--text-primary,#111); margin:0; }
                .tx-detail-body { flex:1; overflow-y:auto; padding:1.5rem; }
                .tx-amount-hero { text-align:center; padding: 2rem 0 1.5rem; }
                .tx-amount-hero .amount { font-size: 2.5rem; font-weight: 700; letter-spacing:-1px; color:${amountColor}; }
                .tx-amount-hero .type-badge { display:inline-block; padding:0.25rem 0.75rem; border-radius:999px; font-size:0.75rem; font-weight:600; text-transform:uppercase; letter-spacing:0.05em; background:${isIncome ? '#dcfce7' : '#fee2e2'}; color:${amountColor}; margin-top:0.5rem; }
                .tx-field-grid { display:grid; grid-template-columns:1fr 1fr; gap:1rem; margin-top:1.5rem; }
                .tx-field { background:var(--bg-secondary,#f8fafc); border-radius:8px; padding:0.875rem 1rem; }
                .tx-field .field-label { font-size:0.7rem; font-weight:600; text-transform:uppercase; letter-spacing:0.06em; color:var(--text-secondary,#6b7280); margin-bottom:0.25rem; }
                .tx-field .field-value { font-size:0.95rem; font-weight:500; color:var(--text-primary,#111); word-break:break-word; }
                .tx-field.full-span { grid-column:1/-1; }
                .tx-detail-footer { padding:1rem 1.5rem; border-top:1px solid var(--border,#e5e7eb); display:flex; gap:0.75rem; }
                .btn-close-panel { flex:1; padding:0.6rem; border:1px solid var(--border,#e5e7eb); background:transparent; border-radius:8px; cursor:pointer; font-size:0.875rem; color:var(--text-secondary,#6b7280); }
                .btn-close-panel:hover { background:var(--bg-secondary,#f8fafc); }
            </style>
            <div class="tx-detail-header">
                <h2>Transaction Details</h2>
                <button id="close-tx-panel" style="background:none;border:none;cursor:pointer;color:var(--text-secondary,#6b7280);font-size:1.25rem;">✕</button>
            </div>
            <div class="tx-detail-body">
                <div class="tx-amount-hero">
                    <div class="amount">${isIncome ? '+' : '-'} R ${(t.amount || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</div>
                    <div class="type-badge">${t.type}</div>
                </div>
                <div class="tx-field-grid">
                    <div class="tx-field">
                        <div class="field-label">Date</div>
                        <div class="field-value">${dateStr}</div>
                    </div>
                    <div class="tx-field">
                        <div class="field-label">Category</div>
                        <div class="field-value">${t.category || '—'}</div>
                    </div>
                    <div class="tx-field full-span">
                        <div class="field-label">Description</div>
                        <div class="field-value">${t.description || '—'}</div>
                    </div>
                    <div class="tx-field">
                        <div class="field-label">Reference</div>
                        <div class="field-value">${t.reference || '—'}</div>
                    </div>
                    <div class="tx-field">
                        <div class="field-label">Payment Method</div>
                        <div class="field-value">${t.paymentMethod || '—'}</div>
                    </div>
                    ${t.notes ? `<div class="tx-field full-span"><div class="field-label">Notes</div><div class="field-value">${t.notes}</div></div>` : ''}
                    <div class="tx-field">
                        <div class="field-label">Transaction ID</div>
                        <div class="field-value" style="font-family:monospace;font-size:0.8rem;">${t.id || '—'}</div>
                    </div>
                    <div class="tx-field">
                        <div class="field-label">Status</div>
                        <div class="field-value">${t.status || 'Completed'}</div>
                    </div>
                </div>
            </div>
            <div class="tx-detail-footer">
                <button class="btn-close-panel" id="close-tx-panel-footer">Close</button>
            </div>
        `;

        document.body.appendChild(overlay);
        document.body.appendChild(panel);

        const close = () => { panel.remove(); overlay.remove(); };
        panel.querySelector('#close-tx-panel').addEventListener('click', close);
        panel.querySelector('#close-tx-panel-footer').addEventListener('click', close);
        overlay.addEventListener('click', close);
    }

    showAddTransactionModal() {
        const modal = document.createElement('dialog');
        modal.className = 'transaction-modal';
        modal.innerHTML = `
            <form id="add-transaction-form">
                <h2>Add Transaction</h2>
                
                <div class="form-row">
                    <div class="form-group">
                        <label>Type</label>
                        <select name="type" required>
                            <option value="income">Income</option>
                            <option value="expense">Expense</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Amount (R)</label>
                        <input type="number" name="amount" step="0.01" min="0.01" required placeholder="0.00">
                    </div>
                </div>

                <div class="form-group">
                    <label>Description</label>
                    <input type="text" name="description" required placeholder="e.g., Invoice payment from Client X">
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label>Category</label>
                        <select name="category" required>
                            <option value="Sales">Sales</option>
                            <option value="Services">Services</option>
                            <option value="Expenses">Expenses</option>
                            <option value="Supplies">Supplies</option>
                            <option value="Salary">Salary</option>
                            <option value="Utilities">Utilities</option>
                            <option value="Bank">Bank</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Date</label>
                        <input type="date" name="date" value="${new Date().toISOString().split('T')[0]}" required>
                    </div>
                </div>

                <div class="form-group">
                    <label>Reference (Optional)</label>
                    <input type="text" name="reference" placeholder="e.g., INV-001">
                </div>

                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" id="cancel-modal">Cancel</button>
                    <button type="submit" class="btn btn-primary">Save Transaction</button>
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

        modal.querySelector('#add-transaction-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);

            try {
                await this.module.recordTransaction({
                    type: formData.get('type'),
                    amount: parseFloat(formData.get('amount')),
                    description: formData.get('description'),
                    category: formData.get('category'),
                    date: new Date(formData.get('date')).getTime(),
                    reference: formData.get('reference') || null
                });

                modal.close();
                modal.remove();
                this.loadDashboard(); // Refresh
            } catch (err) {
                alert('Failed to save transaction: ' + err.message);
            }
        });
    }

    injectStyles() {
        if (document.getElementById('pocketbooks-styles')) return;

        const style = document.createElement('style');
        style.id = 'pocketbooks-styles';
        style.textContent = `
            .pocketbooks-ui {
                padding: 0;
            }

            .pocketbooks-ui .module-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 2rem;
            }

            .pocketbooks-ui .module-header h1 {
                margin: 0;
                font-size: 1.75rem;
            }

            .pocketbooks-ui .module-header p {
                margin: 0.25rem 0 0;
                color: var(--text-secondary);
            }

            /* Stats Grid */
            .stats-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 1.5rem;
                margin-bottom: 2rem;
            }

            .stat-card {
                background: var(--bg-primary);
                border-radius: 12px;
                padding: 1.5rem;
                display: flex;
                align-items: center;
                gap: 1rem;
                box-shadow: 0 2px 8px rgba(0,0,0,0.08);
                border-left: 4px solid var(--border-color);
            }

            .stat-card.income { border-left-color: #10b981; }
            .stat-card.expense { border-left-color: #ef4444; }
            /* Use transparent gradients so they look good on both light (white bg) and dark (dark bg) */
            .stat-card.positive { 
                border-left-color: #10b981; 
                background: linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, var(--bg-primary) 100%); 
            }
            .stat-card.negative { 
                border-left-color: #ef4444; 
                background: linear-gradient(135deg, rgba(239, 68, 68, 0.05) 0%, var(--bg-primary) 100%); 
            }
            .stat-card.neutral { border-left-color: #6366f1; }

            .stat-icon {
                font-size: 2rem;
            }

            .stat-content {
                display: flex;
                flex-direction: column;
            }

            .stat-label {
                font-size: 0.875rem;
                color: var(--text-secondary);
            }

            .stat-value {
                font-size: 1.5rem;
                font-weight: 700;
            }

            .stat-card.positive .stat-value { color: #059669; }
            .stat-card.negative .stat-value { color: #dc2626; }

            /* Filters */
            .filters-bar {
                display: flex;
                gap: 1.5rem;
                flex-wrap: wrap;
                padding: 1rem 1.5rem;
                background: var(--bg-primary);
                border-radius: 8px;
                margin-bottom: 1.5rem;
                box-shadow: 0 1px 3px rgba(0,0,0,0.05);
            }

            .filter-group {
                display: flex;
                align-items: center;
                gap: 0.5rem;
            }

            .filter-group label {
                font-weight: 500;
                color: var(--text-secondary);
                font-size: 0.875rem;
            }

            .filter-group select {
                padding: 0.5rem 1rem;
                border: 1px solid var(--border-color);
                border-radius: 6px;
                background: var(--bg-secondary);
                color: var(--text-primary);
                font-size: 0.875rem;
            }

            /* Transactions Table */
            .transactions-section h3 {
                margin-bottom: 1rem;
            }

            .table-container {
                background: var(--bg-primary);
                border-radius: 12px;
                overflow: hidden;
                box-shadow: 0 2px 8px rgba(0,0,0,0.08);
            }

            .transaction-row.income { background: rgba(16, 185, 129, 0.03); }
            .transaction-row.expense { background: rgba(239, 68, 68, 0.03); }

            .amount {
                font-weight: 600;
                text-align: right;
            }

            .amount.income { color: #10b981; } /* Brighter green for dark mode visibility */
            .amount.expense { color: #ef4444; } /* Brighter red */

            .transactions-section table {
                background: transparent !important;
            }
            
            .transactions-section td, 
            .transactions-section th {
                background: transparent !important;
                border-color: var(--border-color);
            }

            .reference {
                font-family: monospace;
                color: var(--text-secondary);
                font-size: 0.85rem;
            }

            .empty-state {
                text-align: center;
                padding: 3rem !important;
                color: var(--text-secondary);
            }

            .text-right { text-align: right; }

            /* Modal Styles */
            .transaction-modal {
                max-width: 500px;
                width: 95%;
                padding: 2rem;
                border-radius: 12px;
                background: var(--bg-primary);
                color: var(--text-primary);
                border: 1px solid var(--border-color);
            }

            .transaction-modal h2 {
                margin: 0 0 1.5rem;
            }

            .form-row {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 1rem;
            }

            .form-group {
                margin-bottom: 1rem;
            }

            .form-group label {
                display: block;
                margin-bottom: 0.5rem;
                font-weight: 500;
            }

            .form-group input,
            .form-group select {
                width: 100%;
                padding: 0.75rem;
                border: 1px solid var(--border-color);
                border-radius: 6px;
                font-size: 1rem;
                background: var(--bg-secondary);
                color: var(--text-primary);
            }

            .form-actions {
                display: flex;
                justify-content: flex-end;
                gap: 1rem;
                margin-top: 1.5rem;
            }
        `;
        document.head.appendChild(style);
    }
}

export default PocketBooksUI;


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
                        <div style="display:flex;gap:0.5rem;align-items:center;flex-wrap:wrap">
                            <button id="pb-ai-btn" class="btn btn-secondary" style="border:1px solid #6366f1;color:#6366f1">
                                <i class="ph-duotone ph-robot"></i> AI Insights
                            </button>
                            <button id="export-pl-btn" class="btn btn-secondary" style="border:1px solid #3b82f6;color:#3b82f6">
                                <i class="ph-duotone ph-file-text"></i> P&L
                            </button>
                            <button id="export-cf-btn" class="btn btn-secondary" style="border:1px solid #3b82f6;color:#3b82f6">
                                <i class="ph-duotone ph-arrows-left-right"></i> Cash Flow
                            </button>
                            <button id="export-bs-btn" class="btn btn-secondary" style="border:1px solid #3b82f6;color:#3b82f6">
                                <i class="ph-duotone ph-scales"></i> Balance Sheet
                            </button>
                            <button id="export-tax-btn" class="btn btn-secondary" style="border:1px solid var(--success, #10b981);color:var(--success, #10b981)">
                                <i class="ph-duotone ph-file-pdf"></i> Tax Export
                            </button>
                            <button id="add-transaction-btn" class="btn btn-primary"><i class="ph ph-plus"></i> Add Transaction</button>
                        </div>
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

    async exportTaxReport() {
        try {
            const transactions = await this.module.getTransactions();

            // Basic aggregation for tax
            let totalIncome = 0;
            let totalVatableIncome = 0;
            let totalExpenses = 0;

            // Assume "Sales" category is vatable
            transactions.forEach(t => {
                if (t.type === 'income') {
                    totalIncome += t.amount;
                    if (t.category === 'Sales') totalVatableIncome += t.amount;
                } else {
                    totalExpenses += t.amount;
                }
            });

            // VAT calculation (assuming South African 15% standard rate for moat demonstration)
            const vatCollected = totalVatableIncome * 0.15;
            const period = this.dateRange === 0 ? 'All Time' : `Last ${this.dateRange} Days`;

            const currentUser = JSON.parse(localStorage.getItem('erp_session')) || {};
            const businessName = currentUser.businessName || 'My Business';
            const ownerName = currentUser.ownerName || 'Owner';

            const printWindow = window.open('', '_blank');
            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Tax Export - ${businessName}</title>
                    <style>
                        body { font-family: 'Inter', sans-serif; padding: 2rem; color: #111; max-width: 800px; margin: auto; }
                        h1 { font-size: 1.5rem; margin-bottom: 0.2rem; }
                        h2 { font-size: 1.2rem; margin-top: 2rem; border-bottom: 2px solid #000; padding-bottom: 0.5rem; }
                        .meta { color: #555; font-size: 0.9rem; margin-bottom: 2rem; }
                        table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
                        th, td { padding: 0.75rem; border-bottom: 1px solid #e5e7eb; text-align: left; }
                        th { background: #f9fafb; font-weight: 600; }
                        .right { text-align: right; }
                        .totals-box { margin-top: 2rem; padding: 1.5rem; border: 2px solid #111; border-radius: 8px; background: #fafafa; }
                        .tot-row { display: flex; justify-content: space-between; margin-bottom: 0.5rem; font-size: 1.1rem; }
                        .tot-row.grand { font-weight: bold; font-size: 1.3rem; border-top: 1px solid #ccc; padding-top: 0.5rem; margin-top: 0.5rem; }
                        @media print {
                            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                            button { display: none !important; }
                        }
                    </style>
                </head>
                <body>
                    <h1>${businessName} - VAT/Tax Report</h1>
                    <div class="meta">
                        Owner: ${ownerName} <br>
                        Period: ${period} <br>
                        Generated: ${new Date().toLocaleString('en-ZA')}
                    </div>

                    <div class="totals-box">
                        <div class="tot-row"><span>Total Gross Income:</span> <span>R ${totalIncome.toFixed(2)}</span></div>
                        <div class="tot-row"><span>Total Expenses:</span> <span>R ${totalExpenses.toFixed(2)}</span></div>
                        <div class="tot-row"><span>Taxable Sales:</span> <span>R ${totalVatableIncome.toFixed(2)}</span></div>
                        <div class="tot-row grand"><span>Estimated VAT Collected (15%):</span> <span>R ${vatCollected.toFixed(2)}</span></div>
                    </div>

                    <h2>Transaction Log</h2>
                    <table>
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Category</th>
                                <th>Description</th>
                                <th class="right">Amount (ZAR)</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${transactions.map(t => `
                                <tr>
                                    <td>${new Date(t.date).toLocaleDateString('en-ZA')}</td>
                                    <td>${t.category}</td>
                                    <td>${t.description}</td>
                                    <td class="right">${t.type === 'income' ? '+' : '-'} ${t.amount.toFixed(2)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>

                    <div style="margin-top: 3rem; text-align: center;">
                        <button onclick="window.print()" style="padding: 10px 20px; font-size: 16px; background: #000; color: #fff; border: none; border-radius: 8px; cursor: pointer;">Print / Save PDF</button>
                    </div>
                </body>
                </html>
            `);
            printWindow.document.close();
            // Optional: Auto-print
            // setTimeout(() => { printWindow.print(); }, 500);
        } catch (err) {
            console.error('Failed to export tax report:', err);
            alert('Failed to generate Tax Export: ' + err.message);
        }
    }

    _getReportStyles() {
        return `
            <style>
                body { font-family: 'Inter', sans-serif; padding: 2rem; color: #111; max-width: 800px; margin: auto; }
                h1 { font-size: 1.5rem; margin-bottom: 0.2rem; }
                h2 { font-size: 1.2rem; margin-top: 2rem; border-bottom: 2px solid #000; padding-bottom: 0.5rem; margin-bottom: 1rem; }
                .meta { color: #555; font-size: 0.9rem; margin-bottom: 2rem; }
                table { width: 100%; border-collapse: collapse; margin-top: 0.5rem; margin-bottom: 1.5rem; }
                th, td { padding: 0.5rem 0.25rem; border-bottom: 1px solid #e5e7eb; text-align: left; }
                th { background: #f9fafb; font-weight: 600; font-size: 0.9rem; color:#4b5563; }
                .right { text-align: right; }
                .indent { padding-left: 2rem; color: #4b5563; }
                .subtotal { font-weight: 600; background: #f9fafb; border-top: 1px solid #ccc; }
                .grand-total { font-weight: bold; font-size: 1.1rem; border-top: 2px solid #000; border-bottom: 2px double #000; }
                @media print {
                    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    button { display: none !important; }
                }
            </style>
        `;
    }

    _getBusinessContext() {
        const currentUser = JSON.parse(localStorage.getItem('erp_session')) || {};
        return {
            businessType: currentUser.businessType || 'shopowner',
            businessName: currentUser.businessName || 'My Business',
            ownerName: currentUser.ownerName || 'Owner',
            period: this.dateRange === 0 ? 'All Time' : `Last ${this.dateRange} Days`,
            generated: new Date().toLocaleString('en-ZA')
        };
    }

    async exportProfitAndLoss() {
        try {
            const ctx = this._getBusinessContext();
            const pl = await this.module.generateProfitAndLoss(this.dateRange === 0 ? { startDate: new Date(0), endDate: new Date() } : undefined, ctx.businessType);

            const printWindow = window.open('', '_blank');
            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Profit & Loss - ${ctx.businessName}</title>
                    ${this._getReportStyles()}
                </head>
                <body>
                    <h1>${ctx.businessName} - Profit & Loss Statement</h1>
                    <div class="meta">Period: ${ctx.period} | Generated: ${ctx.generated} <br/> Business Profile: ${ctx.businessType.toUpperCase()}</div>
                    
                    <table>
                        <tr><th colspan="2">${pl.labels.revenue}</th></tr>
                        ${Object.entries(pl.revenueBreakdown).map(([k, v]) => `<tr><td class="indent">${k}</td><td class="right">${v.toFixed(2)}</td></tr>`).join('')}
                        <tr class="subtotal"><td>Total ${pl.labels.revenue}</td><td class="right">R ${pl.revenue.toFixed(2)}</td></tr>
                        
                        <tr><th colspan="2">${pl.labels.cogs}</th></tr>
                        ${Object.entries(pl.cogsBreakdown).map(([k, v]) => `<tr><td class="indent">${k}</td><td class="right">${v.toFixed(2)}</td></tr>`).join('')}
                        <tr class="subtotal"><td>Total ${pl.labels.cogs.split(' (')[0]}</td><td class="right">R ${pl.costOfGoodsSold.toFixed(2)}</td></tr>
                        
                        <tr class="grand-total"><td>Gross Profit</td><td class="right">R ${pl.grossProfit.toFixed(2)}</td></tr>
                        
                        <tr><th colspan="2">Operating Expenses</th></tr>
                        ${Object.entries(pl.opexBreakdown).map(([k, v]) => `<tr><td class="indent">${k}</td><td class="right">${v.toFixed(2)}</td></tr>`).join('')}
                        <tr class="subtotal"><td>Total Operating Expenses</td><td class="right">R ${pl.operatingExpenses.toFixed(2)}</td></tr>
                        
                        <tr class="grand-total"><td style="padding-top:1rem;padding-bottom:1rem;">Net Income</td><td class="right" style="padding-top:1rem;padding-bottom:1rem;">R ${pl.netIncome.toFixed(2)}</td></tr>
                    </table>
                    
                    <div style="margin-top: 3rem; text-align: center;">
                        <button onclick="window.print()" style="padding: 10px 20px; font-size: 16px; background: #000; color: #fff; border: none; border-radius: 8px; cursor: pointer;">Print / Save PDF</button>
                    </div>
                </body>
                </html>
            `);
            printWindow.document.close();
        } catch (err) { alert('Failed to generate P&L: ' + err.message); }
    }

    async exportCashFlowStatement() {
        try {
            const ctx = this._getBusinessContext();
            const cf = await this.module.generateCashFlowStatement(this.dateRange === 0 ? { startDate: new Date(0), endDate: new Date() } : undefined, ctx.businessType);

            const printWindow = window.open('', '_blank');
            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Statement of Cash Flows - ${ctx.businessName}</title>
                    ${this._getReportStyles()}
                </head>
                <body>
                    <h1>${ctx.businessName} - Statement of Cash Flows</h1>
                    <div class="meta">Period: ${ctx.period} | Generated: ${ctx.generated} <br/> Business Profile: ${ctx.businessType.toUpperCase()}</div>
                    
                    <table>
                        <tr><th colspan="2">Cash Flows from Operating Activities</th></tr>
                        <tr><td class="indent">Cash Inflows from Customers</td><td class="right">${cf.operatingActivities.inflow.toFixed(2)}</td></tr>
                        <tr><td class="indent">Cash Outflows to Suppliers/Expenses</td><td class="right">(${cf.operatingActivities.outflow.toFixed(2)})</td></tr>
                        <tr class="subtotal"><td>Net Cash from Operating Activities</td><td class="right">R ${cf.operatingActivities.net.toFixed(2)}</td></tr>
                        
                        <tr><th colspan="2">Cash Flows from Investing Activities</th></tr>
                        <tr><td class="indent">Cash Inflows from Asset Sales</td><td class="right">${cf.investingActivities.inflow.toFixed(2)}</td></tr>
                        <tr><td class="indent">Cash Outflows for Asset Purchases</td><td class="right">(${cf.investingActivities.outflow.toFixed(2)})</td></tr>
                        <tr class="subtotal"><td>Net Cash from Investing Activities</td><td class="right">R ${cf.investingActivities.net.toFixed(2)}</td></tr>
                        
                        <tr><th colspan="2">Cash Flows from Financing Activities</th></tr>
                        <tr><td class="indent">Cash Inflows from Loans/Capital</td><td class="right">${cf.financingActivities.inflow.toFixed(2)}</td></tr>
                        <tr><td class="indent">Cash Outflows for Repayments</td><td class="right">(${cf.financingActivities.outflow.toFixed(2)})</td></tr>
                        <tr class="subtotal"><td>Net Cash from Financing Activities</td><td class="right">R ${cf.financingActivities.net.toFixed(2)}</td></tr>
                        
                        <tr class="grand-total"><td style="padding-top:1rem;padding-bottom:1rem;">Net Increase (Decrease) in Cash</td><td class="right" style="padding-top:1rem;padding-bottom:1rem;">R ${cf.netIncreaseInCash.toFixed(2)}</td></tr>
                    </table>
                    
                    <div style="margin-top: 3rem; text-align: center;">
                        <button onclick="window.print()" style="padding: 10px 20px; font-size: 16px; background: #000; color: #fff; border: none; border-radius: 8px; cursor: pointer;">Print / Save PDF</button>
                    </div>
                </body>
                </html>
            `);
            printWindow.document.close();
        } catch (err) { alert('Failed to generate Cash Flow: ' + err.message); }
    }

    async exportBalanceSheet() {
        try {
            const ctx = this._getBusinessContext();
            const bs = await this.module.generateBalanceSheet(ctx.businessType);

            const printWindow = window.open('', '_blank');
            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Balance Sheet - ${ctx.businessName}</title>
                    ${this._getReportStyles()}
                </head>
                <body>
                    <h1>${ctx.businessName} - Balance Sheet</h1>
                    <div class="meta">As of: ${ctx.generated} <br/> Business Profile: ${ctx.businessType.toUpperCase()}</div>
                    
                    <table>
                        <tr><th colspan="2">ASSETS</th></tr>
                        <tr><td class="indent">Cash and Cash Equivalents</td><td class="right">${bs.assets.cashAndEquivalents.toFixed(2)}</td></tr>
                        <tr><td class="indent">${bs.labels.inventory}</td><td class="right">${bs.assets.inventory.toFixed(2)}</td></tr>
                        <tr class="subtotal"><td>Total Assets</td><td class="right">R ${bs.assets.total.toFixed(2)}</td></tr>
                        
                        <tr><th colspan="2">LIABILITIES</th></tr>
                        <tr><td class="indent">Loans / Notes Payable</td><td class="right">${bs.liabilities.loansPayable.toFixed(2)}</td></tr>
                        <tr class="subtotal"><td>Total Liabilities</td><td class="right">R ${bs.liabilities.total.toFixed(2)}</td></tr>
                        
                        <tr><th colspan="2">EQUITY</th></tr>
                        <tr><td class="indent">Retained Earnings / Capital</td><td class="right">${bs.equity.retainedEarnings.toFixed(2)}</td></tr>
                        <tr class="subtotal"><td>Total Equity</td><td class="right">R ${bs.equity.total.toFixed(2)}</td></tr>
                        
                        <tr class="grand-total"><td style="padding-top:1rem;padding-bottom:1rem;">Total Liabilities and Equity</td><td class="right" style="padding-top:1rem;padding-bottom:1rem;">R ${(bs.liabilities.total + bs.equity.total).toFixed(2)}</td></tr>
                    </table>
                    
                    <div style="margin-top: 3rem; text-align: center;">
                        <button onclick="window.print()" style="padding: 10px 20px; font-size: 16px; background: #000; color: #fff; border: none; border-radius: 8px; cursor: pointer;">Print / Save PDF</button>
                    </div>
                </body>
                </html>
            `);
            printWindow.document.close();
        } catch (err) { alert('Failed to generate Balance Sheet: ' + err.message); }
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

        // Financial Statements Exports
        this.container.querySelector('#export-pl-btn')?.addEventListener('click', () => {
            this.exportProfitAndLoss();
        });

        this.container.querySelector('#export-cf-btn')?.addEventListener('click', () => {
            this.exportCashFlowStatement();
        });

        this.container.querySelector('#export-bs-btn')?.addEventListener('click', () => {
            this.exportBalanceSheet();
        });

        // The Compliance Moat: Automated Tax Export
        this.container.querySelector('#export-tax-btn').addEventListener('click', () => {
            this.exportTaxReport();
        });

        // AI Insights Button
        this.container.querySelector('#pb-ai-btn')?.addEventListener('click', async () => {
            const { default: aiEngine } = await import('../services/aiEngine.js');
            const { showDetailPanel, dpKV } = await import('./panelHelper.js');
            const transactions = await this.module.getTransactions();
            const result = aiEngine.analyzePocketBooks(transactions);

            const sevColors = { critical: '#ef4444', warning: '#f59e0b', good: '#10b981' };

            // Forecast bar SVG (14-day)
            const maxFc = Math.max(...result.forecast, 1);
            const fcBars = result.forecast.slice(0, 14).map((v, i) => {
                const h = Math.round((v / maxFc) * 40);
                return `<rect x="${i * 14 + 2}" y="${44 - h}" width="11" height="${h}" rx="2" fill="#6366f1" opacity="0.7"/>`;
            }).join('');
            const fcSvg = `<svg width="210" height="46" viewBox="0 0 210 46" style="display:block;margin:0.5rem 0">${fcBars}</svg>`;

            // NL Insights
            const apiKey = aiEngine.getApiKey();
            const insights = await aiEngine.getNLInsights(
                { finance: result, inventory: { score: 50 }, production: { score: 50 }, syndicate: { score: 50 }, sales: { score: 50, status: 'no_data' }, overallScore: result.score },
                apiKey
            );

            showDetailPanel({
                title: '💰 PocketBooks AI Insights',
                subtitle: `Financial score: ${result.score}/100 — ${result.trend} trend`,
                bodyHTML: `
                    <div class="dp-section">
                        <div class="dp-section-title">Financial Health</div>
                        <div class="dp-kv-grid">
                            ${dpKV('Net Cash Flow', (result.netCashFlow >= 0 ? '+' : '') + 'R ' + Math.round(result.netCashFlow).toLocaleString(), result.netCashFlow >= 0)}
                            ${dpKV('Savings Rate', result.savingsRate + '%')}
                            ${dpKV('Daily Burn Rate', 'R ' + result.burnRate)}
                            ${dpKV('Anomalies Detected', result.anomalyCount)}
                            ${dpKV('Top Expense Category', result.topExpenseCategory)}
                        </div>
                    </div>
                    <div class="dp-section">
                        <div class="dp-section-title">14-Day Cash Flow Forecast</div>
                        ${fcSvg}
                        <small style="color:var(--text-secondary)">Projected daily net (income trend using Holt's smoothing)</small>
                    </div>
                    <div class="dp-section">
                        <div class="dp-section-title">AI Insights</div>
                        ${insights.map(ins => `<div style="padding:0.5rem 0.75rem;border-radius:8px;background:var(--bg-secondary);border-left:3px solid ${sevColors[ins.severity] || '#6366f1'};margin-bottom:0.5rem;font-size:0.875rem;">${ins.text}</div>`).join('')}
                    </div>
                `
            });
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

            .stat-card.income { border-left-color: #10a37f; }
            .stat-card.expense { border-left-color: #ef4444; }
            .stat-card.positive { border-left-color: #10a37f; }
            .stat-card.negative { border-left-color: #ef4444; }
            .stat-card.neutral { border-left-color: #f59e0b; }

            .stat-icon {
                font-size: 2.5rem;
                color: var(--text-primary);
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
                font-size: 1.6rem;
                font-weight: 700;
                color: var(--text-primary);
            }

            .stat-card.positive .stat-value { color: #10a37f; }
            .stat-card.negative .stat-value { color: #ef4444; }

            /* Filters */
            .filters-bar {
                display: flex;
                gap: 1.5rem;
                flex-wrap: wrap;
                padding: 1rem 1.5rem;
                background: rgba(255, 255, 255, 0.03);
                backdrop-filter: blur(16px);
                -webkit-backdrop-filter: blur(16px);
                border: 1px solid var(--border-color);
                border-radius: var(--radius-lg);
                margin-bottom: 1.5rem;
                box-shadow: 0 4px 6px rgba(0,0,0,0.3);
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
                background: rgba(255, 255, 255, 0.03);
                backdrop-filter: blur(16px);
                -webkit-backdrop-filter: blur(16px);
                border: 1px solid var(--border-color);
                border-radius: var(--radius-lg);
                overflow: hidden;
                box-shadow: 0 4px 6px rgba(0,0,0,0.3);
            }

            .transaction-row.income { background: rgba(16, 163, 127, 0.03); } /* #10a37f */
            .transaction-row.expense { background: rgba(239, 68, 68, 0.03); }

            .amount {
                font-weight: 600;
                text-align: right;
            }

            .amount.income { color: #10a37f; } /* Brighter green for dark mode visibility */
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
                padding: 2.5rem;
                border-radius: var(--radius-lg);
                background: var(--bg-primary); /* Inherited body gradient or set manually */
                backdrop-filter: blur(16px);
                -webkit-backdrop-filter: blur(16px);
                color: var(--text-primary);
                border: 1px solid var(--border-color);
                box-shadow: var(--shadow-lg);
            }

            .transaction-modal::backdrop {
                background: rgba(0,0,0,0.7);
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

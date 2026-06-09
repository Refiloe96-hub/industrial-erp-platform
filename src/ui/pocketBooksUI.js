
import { getSession, sym } from '../utils/safeJson.js';
import PocketBooks from '../modules/PocketBooks.js';
import { showDetailPanel, dpBar, dpKV } from './panelHelper.js';
import { downloadCSV, fmtDate } from '../utils/csvExport.js';

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
                            <h1>PocketBooks</h1>
                            <p>Financial ledger &amp; cash flow</p>
                        </div>
                        <div style="display:flex;gap:0.5rem;align-items:center;flex-wrap:wrap">
                            <button id="pb-export-btn" class="btn btn-secondary"><i class="ph ph-download-simple"></i> Export CSV</button>
                            <button id="pb-ai-btn" class="btn btn-secondary" style="border:1px solid #2563eb;color:#2563eb">Insights</button>
                            <button id="add-transaction-btn" class="btn btn-primary"><i class="ph ph-plus"></i> Add Transaction</button>
                        </div>
                    </header>

                    <!-- Summary strip -->
                    <div class="fin-bar">
                        <div class="fin-bar-item" data-card="income" style="cursor:pointer" title="Click for breakdown">
                            <span class="fin-bar-label">Income</span>
                            <span class="fin-bar-value" style="color:var(--success);">${sym()}${cashFlow.income.toLocaleString()}</span>
                        </div>
                        <div class="fin-bar-sep"></div>
                        <div class="fin-bar-item" data-card="expenses" style="cursor:pointer" title="Click for breakdown">
                            <span class="fin-bar-label">Expenses</span>
                            <span class="fin-bar-value" style="color:var(--danger);">${sym()}${cashFlow.expenses.toLocaleString()}</span>
                        </div>
                        <div class="fin-bar-sep"></div>
                        <div class="fin-bar-item" data-card="net" style="cursor:pointer" title="Click for breakdown">
                            <span class="fin-bar-label">Net Cash Flow</span>
                            <span class="fin-bar-value" style="color:${cashFlow.netCashFlow >= 0 ? 'var(--success)' : 'var(--danger)'};">${cashFlow.netCashFlow >= 0 ? '+' : ''}${sym()}${cashFlow.netCashFlow.toLocaleString()}</span>
                        </div>
                        <div class="fin-bar-sep"></div>
                        <div class="fin-bar-item" data-card="count" style="cursor:pointer" title="Click for breakdown">
                            <span class="fin-bar-label">Transactions</span>
                            <span class="fin-bar-value">${transactions.length}</span>
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

                    <!-- Financial Statements Panel -->
                    <div class="financial-reports-panel">
                        <div class="reports-header">
                            <div>
                                <h3>Financial Documents</h3>
                                <p>Standardized reports configured for your business profile.</p>
                            </div>
                        </div>
                        <div class="reports-grid">
                            <div class="report-card" id="export-pl-btn">
                                <div class="report-icon pl"><i class="ph-duotone ph-chart-line-up"></i></div>
                                <div class="report-info">
                                    <h4>Profit & Loss</h4>
                                    <span>Income vs Expenses</span>
                                </div>
                            </div>
                            <div class="report-card" id="export-cf-btn">
                                <div class="report-icon cf"><i class="ph-duotone ph-arrows-left-right"></i></div>
                                <div class="report-info">
                                    <h4>Cash Flow</h4>
                                    <span>Operating, Investing, Financing</span>
                                </div>
                            </div>
                            <div class="report-card" id="export-bs-btn">
                                <div class="report-icon bs"><i class="ph-duotone ph-scales"></i></div>
                                <div class="report-info">
                                    <h4>Balance Sheet</h4>
                                    <span>Assets, Liabilities, Equity</span>
                                </div>
                            </div>
                            <div class="report-card" id="export-tax-btn">
                                <div class="report-icon tax"><i class="ph-duotone ph-file-pdf"></i></div>
                                <div class="report-info">
                                    <h4>Tax Ledger</h4>
                                    <span>Formatted Itemized Export</span>
                                </div>
                            </div>
                        </div>
                    </div>
            `;

            this.attachEventListeners();
            this.injectStyles();

        } catch (err) {
            console.error('Error loading PocketBooks:', err);
            this.container.textContent = `Error: ${err.message}`; this.container.className = 'error';
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

            const currentUser = getSession() ?? {};
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
                        <div class="tot-row"><span>Total Gross Income:</span> <span>${sym()}${totalIncome.toFixed(2)}</span></div>
                        <div class="tot-row"><span>Total Expenses:</span> <span>${sym()}${totalExpenses.toFixed(2)}</span></div>
                        <div class="tot-row"><span>Taxable Sales:</span> <span>${sym()}${totalVatableIncome.toFixed(2)}</span></div>
                        <div class="tot-row grand"><span>Estimated VAT Collected (15%):</span> <span>${sym()}${vatCollected.toFixed(2)}</span></div>
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
                                    <td class="right">${t.type === 'income' ? '+' : '-'} ${Number(t.amount || 0).toFixed(2)}</td>
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
        const currentUser = getSession() ?? {};
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
                        <tr class="subtotal"><td>Total ${pl.labels.revenue}</td><td class="right">${sym()}${pl.revenue.toFixed(2)}</td></tr>
                        
                        <tr><th colspan="2">${pl.labels.cogs}</th></tr>
                        ${Object.entries(pl.cogsBreakdown).map(([k, v]) => `<tr><td class="indent">${k}</td><td class="right">${v.toFixed(2)}</td></tr>`).join('')}
                        <tr class="subtotal"><td>Total ${pl.labels.cogs.split(' (')[0]}</td><td class="right">${sym()}${pl.costOfGoodsSold.toFixed(2)}</td></tr>
                        
                        <tr class="grand-total"><td>Gross Profit</td><td class="right">${sym()}${pl.grossProfit.toFixed(2)}</td></tr>
                        
                        <tr><th colspan="2">Operating Expenses</th></tr>
                        ${Object.entries(pl.opexBreakdown).map(([k, v]) => `<tr><td class="indent">${k}</td><td class="right">${v.toFixed(2)}</td></tr>`).join('')}
                        <tr class="subtotal"><td>Total Operating Expenses</td><td class="right">${sym()}${pl.operatingExpenses.toFixed(2)}</td></tr>
                        
                        <tr class="grand-total"><td style="padding-top:1rem;padding-bottom:1rem;">Net Income</td><td class="right" style="padding-top:1rem;padding-bottom:1rem;">${sym()}${pl.netIncome.toFixed(2)}</td></tr>
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
                        <tr class="subtotal"><td>Net Cash from Operating Activities</td><td class="right">${sym()}${cf.operatingActivities.net.toFixed(2)}</td></tr>
                        
                        <tr><th colspan="2">Cash Flows from Investing Activities</th></tr>
                        <tr><td class="indent">Cash Inflows from Asset Sales</td><td class="right">${cf.investingActivities.inflow.toFixed(2)}</td></tr>
                        <tr><td class="indent">Cash Outflows for Asset Purchases</td><td class="right">(${cf.investingActivities.outflow.toFixed(2)})</td></tr>
                        <tr class="subtotal"><td>Net Cash from Investing Activities</td><td class="right">${sym()}${cf.investingActivities.net.toFixed(2)}</td></tr>
                        
                        <tr><th colspan="2">Cash Flows from Financing Activities</th></tr>
                        <tr><td class="indent">Cash Inflows from Loans/Capital</td><td class="right">${cf.financingActivities.inflow.toFixed(2)}</td></tr>
                        <tr><td class="indent">Cash Outflows for Repayments</td><td class="right">(${cf.financingActivities.outflow.toFixed(2)})</td></tr>
                        <tr class="subtotal"><td>Net Cash from Financing Activities</td><td class="right">${sym()}${cf.financingActivities.net.toFixed(2)}</td></tr>
                        
                        <tr class="grand-total"><td style="padding-top:1rem;padding-bottom:1rem;">Net Increase (Decrease) in Cash</td><td class="right" style="padding-top:1rem;padding-bottom:1rem;">${sym()}${cf.netIncreaseInCash.toFixed(2)}</td></tr>
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
                        <tr class="subtotal"><td>Total Assets</td><td class="right">${sym()}${bs.assets.total.toFixed(2)}</td></tr>
                        
                        <tr><th colspan="2">LIABILITIES</th></tr>
                        <tr><td class="indent">Loans / Notes Payable</td><td class="right">${bs.liabilities.loansPayable.toFixed(2)}</td></tr>
                        <tr class="subtotal"><td>Total Liabilities</td><td class="right">${sym()}${bs.liabilities.total.toFixed(2)}</td></tr>
                        
                        <tr><th colspan="2">EQUITY</th></tr>
                        <tr><td class="indent">Retained Earnings / Capital</td><td class="right">${bs.equity.retainedEarnings.toFixed(2)}</td></tr>
                        <tr class="subtotal"><td>Total Equity</td><td class="right">${sym()}${bs.equity.total.toFixed(2)}</td></tr>
                        
                        <tr class="grand-total"><td style="padding-top:1rem;padding-bottom:1rem;">Total Liabilities and Equity</td><td class="right" style="padding-top:1rem;padding-bottom:1rem;">${sym()}${(bs.liabilities.total + bs.equity.total).toFixed(2)}</td></tr>
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
                    ${t.type === 'income' ? '+' : '-'} ${sym()}${(t.amount || 0).toLocaleString()}
                </td>
            </tr>
                `).join('');
    }

    attachEventListeners() {
        // Export CSV
        this.container.querySelector('#pb-export-btn')?.addEventListener('click', async () => {
            const btn = this.container.querySelector('#pb-export-btn');
            const orig = btn.innerHTML;
            btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Exporting...';
            btn.disabled = true;
            try {
                const txs = await this.module.getTransactions();
                const session = getSession() ?? {};
                const biz = session.businessName || 'Business';
                const headers = ['Date','Type','Category','Description','Amount (R)','Payment Method','VAT (R)'];
                const rows = txs.map(t => [
                    fmtDate(t.date || t.createdAt),
                    t.type || '',
                    t.category || '',
                    t.description || '',
                    Number(t.amount || 0).toFixed(2),
                    t.paymentMethod || '',
                    Number(t.vatAmount || 0).toFixed(2),
                ]);
                downloadCSV(headers, rows, `${biz}_transactions`);
            } catch (err) { alert('Export failed: ' + err.message); }
            finally { btn.innerHTML = orig; btn.disabled = false; }
        });

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
                return `<rect x="${i * 14 + 2}" y="${44 - h}" width="11" height="${h}" rx="2" fill="#2563eb" opacity="0.7"/>`;
            }).join('');
            const fcSvg = `<svg width="210" height="46" viewBox="0 0 210 46" style="display:block;margin:0.5rem 0">${fcBars}</svg>`;

            // NL Insights
            const apiKey = aiEngine.getApiKey();
            const insights = await aiEngine.getNLInsights(
                { finance: result, inventory: { score: 50 }, production: { score: 50 }, syndicate: { score: 50 }, sales: { score: 50, status: 'no_data' }, overallScore: result.score },
                apiKey
            );

            showDetailPanel({
                title: 'PocketBooks Insights',
                subtitle: `Financial score: ${result.score}/100 — ${result.trend} trend`,
                bodyHTML: `
                    <div class="dp-section">
                        <div class="dp-section-title">Financial Health</div>
                        <div class="dp-kv-grid">
                            ${dpKV('Net Cash Flow', (result.netCashFlow >= 0 ? '+' : '') + sym() + Math.round(result.netCashFlow).toLocaleString(), result.netCashFlow >= 0)}
                            ${dpKV('Savings Rate', result.savingsRate + '%')}
                            ${dpKV('Daily Burn Rate', sym() + result.burnRate)}
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
                        ${insights.map(ins => `<div style="padding:0.5rem 0.75rem;border-radius:8px;background:var(--bg-secondary);border-left:3px solid ${sevColors[ins.severity] || '#2563eb'};margin-bottom:0.5rem;font-size:0.875rem;">${ins.text}</div>`).join('')}
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

        // Stat item click → drill-down panel
        this.container.querySelectorAll('.fin-bar-item[data-card]').forEach(card => {
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
                subtitle: `${sym()}${cashFlow.income.toLocaleString()} across ${incomeCount} income entries`,
                bodyHTML: Object.keys(incomeByCategory).length ? `
                    <div class="dp-section">
                        <div class="dp-section-title">Income by Category</div>
                        ${Object.entries(incomeByCategory).sort((a, b) => b[1] - a[1]).map(([cat, amt]) =>
                    dpBar(cat, amt, maxIncome, '#16a34a', v => `${sym()}${v.toLocaleString()}`)).join('')}
                    </div>` : '<div class="dp-empty">No income recorded yet.</div>'
            },
            expenses: {
                title: 'Total Expenses Breakdown',
                subtitle: `${sym()}${cashFlow.expenses.toLocaleString()} across ${expenseCount} expense entries`,
                bodyHTML: Object.keys(expenseByCategory).length ? `
                    <div class="dp-section">
                        <div class="dp-section-title">Expenses by Category</div>
                        ${Object.entries(expenseByCategory).sort((a, b) => b[1] - a[1]).map(([cat, amt]) =>
                    dpBar(cat, amt, maxExpense, '#dc2626', v => `${sym()}${v.toLocaleString()}`)).join('')}
                    </div>` : '<div class="dp-empty">No expenses recorded yet.</div>'
            },
            net: {
                title: 'Net Cash Flow',
                subtitle: cashFlow.netCashFlow >= 0 ? 'Positive — you are earning more than you spend' : 'Negative — expenses exceed income',
                bodyHTML: `
                    <div class="dp-section">
                        <div class="dp-section-title">Overview</div>
                        <div class="dp-kv-grid">
                            ${dpKV('Total Income', sym() + cashFlow.income.toLocaleString())}
                            ${dpKV('Total Expenses', sym() + cashFlow.expenses.toLocaleString())}
                            ${dpKV('Net Cash Flow', (cashFlow.netCashFlow >= 0 ? '+' : '') + sym() + cashFlow.netCashFlow.toLocaleString(), true)}
                        </div>
                    </div>
                    <div class="dp-section">
                        <div class="dp-section-title">Comparison</div>
                        ${dpBar('Income', cashFlow.income, Math.max(cashFlow.income, cashFlow.expenses, 1), '#16a34a', v => sym() + v.toLocaleString())}
                        ${dpBar('Expenses', cashFlow.expenses, Math.max(cashFlow.income, cashFlow.expenses, 1), '#dc2626', v => sym() + v.toLocaleString())}
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
                                <span style="color:${t.type === 'income' ? '#16a34a' : '#dc2626'};font-weight:600">${t.type === 'income' ? '+' : '-'}${sym()}${(t.amount || 0).toLocaleString()}</span>
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
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:1200;backdrop-filter:blur(8px);';

        const panel = document.createElement('div');
        panel.className = 'tx-detail-panel';
        panel.style.cssText = 'position:fixed;top:0;right:0;height:100%;width:min(420px,100vw);background:var(--bg-secondary,#111113);z-index:1201;box-shadow:-2px 0 24px rgba(0,0,0,0.5);display:flex;flex-direction:column;overflow:hidden;animation:slideInRight 0.2s ease;border-left:1px solid rgba(255,255,255,0.08);';

        panel.innerHTML = `
            <style>
                @keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
                .tx-detail-header { padding: 1.25rem 1.5rem; border-bottom: 1px solid var(--border,#e5e7eb); display:flex; align-items:center; justify-content:space-between; }
                .tx-detail-header h2 { font-size: 1rem; font-weight: 600; color: var(--text-primary,#111); margin:0; }
                .tx-detail-body { flex:1; overflow-y:auto; padding:1.5rem; }
                .tx-amount-hero { text-align:center; padding: 2rem 0 1.5rem; }
                .tx-amount-hero .amount { font-size: 2.5rem; font-weight: 700; letter-spacing:-1px; color:${amountColor}; }
                .tx-amount-hero .type-badge { display:inline-block; padding:0.2rem 0.625rem; border-radius:4px; font-size:0.6875rem; font-weight:600; text-transform:uppercase; letter-spacing:0.06em; background:${isIncome ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)'}; color:${amountColor}; margin-top:0.5rem; }
                .tx-field-grid { display:grid; grid-template-columns:1fr 1fr; gap:1rem; margin-top:1.5rem; }
                .tx-field { background:rgba(255,255,255,0.05); border-radius:8px; padding:0.875rem 1rem; border:1px solid rgba(255,255,255,0.07); }
                .tx-field .field-label { font-size:0.7rem; font-weight:600; text-transform:uppercase; letter-spacing:0.06em; color:var(--text-secondary,#94a3b8); margin-bottom:0.25rem; }
                .tx-field .field-value { font-size:0.95rem; font-weight:500; color:var(--text-primary,#f1f5f9); word-break:break-word; }
                .tx-field.full-span { grid-column:1/-1; }
                .tx-detail-footer { padding:1rem 1.5rem; border-top:1px solid rgba(255,255,255,0.06); display:flex; gap:0.75rem; }
                .btn-close-panel { flex:1; padding:0.6rem; border:1px solid rgba(255,255,255,0.12); background:transparent; border-radius:8px; cursor:pointer; font-size:0.875rem; color:var(--text-secondary,#94a3b8); }
                .btn-close-panel:hover { background:rgba(255,255,255,0.06); }
            </style>
            <div class="tx-detail-header">
                <h2>Transaction Details</h2>
                <button id="close-tx-panel" style="background:none;border:none;cursor:pointer;color:var(--text-secondary,#6b7280);font-size:1.25rem;">✕</button>
            </div>
            <div class="tx-detail-body">
                <div class="tx-amount-hero">
                    <div class="amount">${isIncome ? '+' : '-'} ${sym()}${(t.amount || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</div>
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

                // Brief toast confirmation
                const toast = document.createElement('div');
                toast.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:var(--bg-elevated,#232326);border:1px solid rgba(16,185,129,0.3);color:#34d399;padding:0.5rem 1rem;border-radius:8px;font-size:0.8125rem;font-weight:600;z-index:9999;animation:none;';
                toast.textContent = 'Transaction saved';
                document.body.appendChild(toast);
                setTimeout(() => toast.remove(), 2000);

                this.loadDashboard();
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
            /* Filters */
            .filters-bar {
                display: flex;
                gap: 1rem;
                flex-wrap: wrap;
                padding: 0.75rem 1rem;
                background: var(--bg-primary);
                border: 1px solid var(--border);
                border-radius: 8px;
                margin-bottom: 1.25rem;
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
                border: 1px solid var(--border);
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
                border: 1px solid var(--border);
                border-radius: 8px;
                overflow: hidden;
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
                border-color: var(--border);
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
                background: var(--bg-primary, rgba(15, 23, 42, 0.95)); /* Add strong opaque fallback */
                backdrop-filter: blur(24px); /* Increase from 16px to 24px */
                -webkit-backdrop-filter: blur(24px);
                color: var(--text-primary);
                border: 1px solid var(--border);
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
                border: 1px solid var(--border);
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

            /* Financial Reports Panel Styles */
            .financial-reports-panel {
                margin: 2rem 0;
                padding: 1.5rem;
                background: rgba(255, 255, 255, 0.02);
                border: 1px solid var(--border);
                border-radius: var(--radius-lg);
            }
            .reports-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 1.5rem;
            }
            .reports-header h3 {
                margin: 0;
                display: flex;
                align-items: center;
                gap: 0.5rem;
                font-size: 1.25rem;
            }
            .reports-header p {
                margin: 0.25rem 0 0;
                color: var(--text-secondary);
                font-size: 0.875rem;
            }
            .reports-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
                gap: 1rem;
            }
            .report-card {
                background: var(--bg-elevated, #232326);
                border: 1px solid var(--border);
                border-radius: var(--radius-md);
                padding: 1rem;
                display: flex;
                align-items: center;
                gap: 1rem;
                transition: all 0.2s ease;
                text-align: left;
                width: 100%;
                cursor: pointer;
            }
            .report-card:hover {
                border-color: var(--border-strong);
                background: var(--bg-elevated, #232326);
            }
            .report-icon {
                width: 40px;
                height: 40px;
                border-radius: 8px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 1.25rem;
                flex-shrink: 0;
            }
            .report-icon.pl { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
            .report-icon.cf { background: rgba(16, 185, 129, 0.1); color: #10b981; }
            .report-icon.bs { background: rgba(37, 99, 235, 0.1); color: #60a5fa; }
            .report-icon.tax { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
            
            .report-info h4 {
                margin: 0 0 0.25rem 0;
                font-size: 0.95rem;
                color: var(--text-primary);
            }
            .report-info span {
                font-size: 0.75rem;
                color: var(--text-secondary);
                display: block;
            }
        `;
        document.head.appendChild(style);
    }
}

export default PocketBooksUI;

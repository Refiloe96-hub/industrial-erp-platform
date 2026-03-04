// PocketBooks Module - Financial Ledger
// Purpose: Track money with auditability, not vibes
// Role: Accountant

import db, { STORES } from '../db/index.js';

class PocketBooks {
  constructor() {
    this.currentPeriod = this.getCurrentPeriod();
  }

  getCurrentPeriod() {
    const now = new Date();
    return {
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      startDate: new Date(now.getFullYear(), now.getMonth(), 1),
      endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0)
    };
  }

  // Record transaction
  async recordTransaction(data) {
    const transaction = {
      type: data.type, // 'income' | 'expense' | 'transfer'
      category: data.category,
      amount: data.amount,
      description: data.description,
      date: data.date || Date.now(),
      accountId: data.accountId,
      supplierId: data.supplierId,
      customerId: data.customerId,
      reference: data.reference,
      paymentMethod: data.paymentMethod,
      status: 'completed',
      createdAt: Date.now()
    };

    const id = await db.add(STORES.transactions, transaction);
    console.log('✅ Transaction recorded:', id);

    return { id, ...transaction };
  }

  // Get all transactions
  async getTransactions(filters = {}) {
    let transactions = await db.getAll(STORES.transactions);

    // Apply filters
    if (filters.type) {
      transactions = transactions.filter(t => t.type === filters.type);
    }

    if (filters.category) {
      transactions = transactions.filter(t => t.category === filters.category);
    }

    if (filters.startDate) {
      transactions = transactions.filter(t => t.date >= filters.startDate);
    }

    if (filters.endDate) {
      transactions = transactions.filter(t => t.date <= filters.endDate);
    }

    // Sort by date descending
    transactions.sort((a, b) => b.date - a.date);

    return transactions;
  }

  // Calculate cash flow
  async calculateCashFlow(period = this.currentPeriod) {
    const transactions = await this.getTransactions({
      startDate: period.startDate.getTime(),
      endDate: period.endDate.getTime()
    });

    const income = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const expenses = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    const netCashFlow = income - expenses;

    return {
      period,
      income,
      expenses,
      netCashFlow,
      profitable: netCashFlow > 0,
      transactions: transactions.length
    };
  }

  // Get accounts summary
  async getAccountsSummary() {
    const accounts = await db.getAll(STORES.accounts);
    const transactions = await db.getAll(STORES.transactions);

    return accounts.map(account => {
      const accountTransactions = transactions.filter(t => t.accountId === account.id);

      const balance = accountTransactions.reduce((sum, t) => {
        return t.type === 'income' ? sum + t.amount : sum - t.amount;
      }, account.initialBalance || 0);

      return {
        ...account,
        balance,
        lastTransaction: accountTransactions[0]?.date
      };
    });
  }

  // Get supplier payments summary
  async getSupplierPayments() {
    const transactions = await this.getTransactions({ type: 'expense' });

    const supplierPayments = transactions
      .filter(t => t.supplierId)
      .reduce((acc, t) => {
        if (!acc[t.supplierId]) {
          acc[t.supplierId] = {
            supplierId: t.supplierId,
            totalPaid: 0,
            transactions: []
          };
        }

        acc[t.supplierId].totalPaid += t.amount;
        acc[t.supplierId].transactions.push(t);

        return acc;
      }, {});

    return Object.values(supplierPayments);
  }

  // Generate financial report
  async generateReport(period = this.currentPeriod) {
    const cashFlow = await this.calculateCashFlow(period);
    const accounts = await this.getAccountsSummary();
    const transactions = await this.getTransactions({
      startDate: period.startDate.getTime(),
      endDate: period.endDate.getTime()
    });

    // Category breakdown
    const categoryBreakdown = transactions.reduce((acc, t) => {
      const key = `${t.type}_${t.category}`;

      if (!acc[key]) {
        acc[key] = {
          type: t.type,
          category: t.category,
          amount: 0,
          count: 0
        };
      }

      acc[key].amount += t.amount;
      acc[key].count += 1;

      return acc;
    }, {});

    return {
      period,
      cashFlow,
      accounts,
      categoryBreakdown: Object.values(categoryBreakdown),
      insights: this.generateInsights(cashFlow, transactions)
    };
  }

  generateInsights(cashFlow, transactions) {
    const insights = [];

    // Profitability insight
    if (cashFlow.profitable) {
      insights.push({
        type: 'success',
        message: `Profitable period: ${cashFlow.netCashFlow.toLocaleString()} net cash flow`,
        action: null
      });
    } else {
      insights.push({
        type: 'warning',
        message: `Loss period: ${Math.abs(cashFlow.netCashFlow).toLocaleString()} deficit`,
        action: 'Review expenses and improve revenue'
      });
    }

    // Cash flow ratio
    const cashFlowRatio = cashFlow.income > 0 ? cashFlow.netCashFlow / cashFlow.income : 0;

    if (cashFlowRatio < 0.1 && cashFlow.income > 0) {
      insights.push({
        type: 'warning',
        message: 'Tight margins detected',
        action: 'Optimize costs or increase prices'
      });
    }

    // Transaction velocity
    const avgDailyTransactions = transactions.length / 30;

    if (avgDailyTransactions < 1) {
      insights.push({
        type: 'info',
        message: 'Low transaction volume',
        action: 'Ensure all transactions are being recorded'
      });
    }

    return insights;
  }

  // Proprietary Local Engine: Time-series anomaly detection (Z-score)
  detectAnomalies(transactions, threshold = 2.0) {
    const expenseTx = transactions.filter(t => t.type === 'expense' && typeof t.amount === 'number');
    if (expenseTx.length < 4) return [];

    const amounts = expenseTx.map(t => t.amount);
    const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const std = Math.sqrt(amounts.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / amounts.length) || 1;

    return expenseTx.map(t => ({
      ...t,
      zScore: Math.abs((t.amount - mean) / std)
    })).filter(t => t.zScore > threshold);
  }

  // Proprietary Local Engine: Holt's Double Exponential Smoothing Forecast
  forecastCashflow(transactions, horizon = 14, alpha = 0.3, beta = 0.1) {
    if (transactions.length === 0) return { forecastedRevenue: [], forecastedExpenses: [] };

    // Group transactions by day
    const dailyMap = {};
    transactions.forEach(t => {
      const d = new Date(t.date || t.createdAt);
      const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (!dailyMap[day]) dailyMap[day] = { income: 0, expense: 0 };
      if (t.type === 'income') dailyMap[day].income += t.amount;
      if (t.type === 'expense') dailyMap[day].expense += t.amount;
    });

    const sortedDays = Object.keys(dailyMap).sort();
    const incomeSeries = sortedDays.map(d => dailyMap[d].income);
    const expenseSeries = sortedDays.map(d => dailyMap[d].expense);

    const holtForecast = (series) => {
      if (series.length < 2) return Array(horizon).fill(series[0] || 0);
      let L = series[0];
      let T = series[1] - series[0];
      for (let i = 1; i < series.length; i++) {
        const prevL = L;
        L = alpha * series[i] + (1 - alpha) * (L + T);
        T = beta * (L - prevL) + (1 - beta) * T;
      }
      return Array.from({ length: horizon }, (_, h) => Math.max(0, L + (h + 1) * T));
    };

    return {
      forecastedRevenue: holtForecast(incomeSeries),
      forecastedExpenses: holtForecast(expenseSeries)
    };
  }

  // Phase 9 & 10: Industry Standard & Business-Type Specific Financial Statements
  async generateProfitAndLoss(period = this.currentPeriod, businessType = 'shopowner') {
    const transactions = await this.getTransactions({
      startDate: period.startDate.getTime(),
      endDate: period.endDate.getTime()
    });

    let revenue = 0;
    let costOfGoodsSold = 0;
    let operatingExpenses = 0;

    const revenueBreakdown = {};
    const cogsBreakdown = {};
    const opexBreakdown = {};

    transactions.forEach(t => {
      if (t.type === 'income') {
        revenue += t.amount;
        revenueBreakdown[t.category] = (revenueBreakdown[t.category] || 0) + t.amount;
      } else if (t.type === 'expense') {
        // Business Profile specific logic for what constitutes Cost of Goods Sold vs Operating Expenses
        let isCogs = false;

        switch (businessType) {
          case 'manufacturer':
            // Manufacturers track Direct Labor, Raw Materials, and Manufacturing Overhead (Utilities) as COGS
            isCogs = ['Raw Materials', 'Supplies', 'Inventory', 'Labor', 'Utilities'].includes(t.category);
            break;
          case 'warehouse':
          case 'trader':
            // Distributors/Warehouses track Freight/Logistics and Inventory purchases as COGS
            isCogs = ['Inventory', 'Logistics', 'Freight', 'Supplies'].includes(t.category);
            break;
          case 'shopowner':
          default:
            // Retailers track finished merchandise (Inventory) and direct shrink/supplies
            isCogs = ['Inventory', 'Merchandise', 'Supplies'].includes(t.category);
        }

        if (isCogs) {
          costOfGoodsSold += t.amount;
          cogsBreakdown[t.category] = (cogsBreakdown[t.category] || 0) + t.amount;
        } else {
          operatingExpenses += t.amount;
          opexBreakdown[t.category] = (opexBreakdown[t.category] || 0) + t.amount;
        }
      }
    });

    const grossProfit = revenue - costOfGoodsSold;
    const netIncome = grossProfit - operatingExpenses;

    // Define business-specific labels
    const labels = {
      revenue: businessType === 'warehouse' ? 'Service Revenue & Fees' : 'Sales Revenue',
      cogs: businessType === 'manufacturer' ? 'Cost of Goods Manufactured (COGM)' :
        (businessType === 'warehouse' ? 'Cost of Services' : 'Cost of Goods Sold (COGS)'),
      gross: grossProfit
    };

    return {
      period,
      labels,
      revenue,
      revenueBreakdown,
      costOfGoodsSold,
      cogsBreakdown,
      grossProfit,
      operatingExpenses,
      opexBreakdown,
      netIncome
    };
  }

  async generateCashFlowStatement(period = this.currentPeriod, businessType = 'shopowner') {
    const transactions = await this.getTransactions({
      startDate: period.startDate.getTime(),
      endDate: period.endDate.getTime()
    });

    let operatingInflow = 0;
    let operatingOutflow = 0;
    let investingInflow = 0;
    let investingOutflow = 0;
    let financingInflow = 0;
    let financingOutflow = 0;

    transactions.forEach(t => {
      const isIncome = t.type === 'income';

      // Categorize into Operating, Investing, Financing
      if (['Equipment', 'Assets', 'Machinery', 'Real Estate'].includes(t.category)) {
        if (isIncome) investingInflow += t.amount;
        else investingOutflow += t.amount;
      } else if (['Loan', 'Capital', 'Syndicate', 'Dividend', 'Equity'].includes(t.category)) {
        if (isIncome) financingInflow += t.amount;
        else financingOutflow += t.amount;
      } else {
        // Default to Operating (Sales, Inventory, Labor, Utilities, etc)
        if (isIncome) operatingInflow += t.amount;
        else operatingOutflow += t.amount;
      }
    });

    const netOperatingCashFlow = operatingInflow - operatingOutflow;
    const netInvestingCashFlow = investingInflow - investingOutflow;
    const netFinancingCashFlow = financingInflow - financingOutflow;
    const netIncreaseInCash = netOperatingCashFlow + netInvestingCashFlow + netFinancingCashFlow;

    return {
      period,
      operatingActivities: { inflow: operatingInflow, outflow: operatingOutflow, net: netOperatingCashFlow },
      investingActivities: { inflow: investingInflow, outflow: investingOutflow, net: netInvestingCashFlow },
      financingActivities: { inflow: financingInflow, outflow: financingOutflow, net: netFinancingCashFlow },
      netIncreaseInCash
    };
  }

  async generateBalanceSheet(businessType = 'shopowner') {
    // A balance sheet is a snapshot at a point in time (now)
    const accounts = await this.getAccountsSummary();

    // Assets
    const cashAndEquivalents = accounts.reduce((sum, a) => sum + (a.balance || 0), 0);

    // Get Inventory Value from PoolStock (if available)
    let inventoryAssetValue = 0;
    try {
      const poolStockData = await db.getAll(STORES.inventory);
      if (poolStockData && poolStockData.length) {
        inventoryAssetValue = poolStockData.reduce((sum, item) => sum + ((item.quantity || 0) * (item.costPrice || 0)), 0);
      }
    } catch (e) {
      console.warn('Could not fetch inventory asset value for balance sheet', e);
    }

    const totalAssets = cashAndEquivalents + inventoryAssetValue;

    // Liabilities (Simplified: searching through transactions for outstanding loans - in a real system we'd have a liabilities store)
    // For this conceptual model, let's assume Syndicate/Loan income that hasn't been repaid is a liability
    const transactions = await this.getTransactions();
    const loanIncome = transactions.filter(t => t.type === 'income' && t.category === 'Loan').reduce((sum, t) => sum + t.amount, 0);
    const loanRepayments = transactions.filter(t => t.type === 'expense' && t.category === 'Loan').reduce((sum, t) => sum + t.amount, 0);

    const totalLiabilities = Math.max(0, loanIncome - loanRepayments);

    // Equity (Assets = Liabilities + Equity)
    const totalEquity = totalAssets - totalLiabilities;

    // Line labels adapted by business type
    let inventoryLabel = 'Merchandise Inventory';
    if (businessType === 'manufacturer') inventoryLabel = 'Work-in-Progress / Raw Materials';
    else if (businessType === 'warehouse') inventoryLabel = 'Warehouse Consumables';

    return {
      date: new Date(),
      labels: {
        inventory: inventoryLabel
      },
      assets: {
        cashAndEquivalents,
        inventory: inventoryAssetValue,
        total: totalAssets
      },
      liabilities: {
        loansPayable: totalLiabilities,
        total: totalLiabilities
      },
      equity: {
        retainedEarnings: totalEquity,
        total: totalEquity
      }
    };
  }

  // Create account
  async createAccount(data) {
    const account = {
      name: data.name,
      type: data.type, // 'cash', 'bank', 'mobile_money'
      currency: data.currency || 'ZAR',
      initialBalance: data.initialBalance || 0,
      createdAt: Date.now()
    };

    const id = await db.add(STORES.accounts, account);
    return { id, ...account };
  }
}

export default PocketBooks;

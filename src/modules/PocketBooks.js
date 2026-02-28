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

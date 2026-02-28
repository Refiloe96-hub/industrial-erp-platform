// PocketWallet Module - Payment Rails (Infrastructure)
// Purpose: Move money, don't become the product
// Role: Bank (Invisible)
// NOT: Consumer UX bloat or gamification

import db, { STORES } from '../db/index.js';

class PocketWallet {
  constructor(pocketBooks) {
    this.transactionFee = 0.01; // 1% transaction fee
    this.pocketBooks = pocketBooks;
  }

  // Initialize wallet for business
  async createWallet(data) {
    const wallet = {
      businessId: data.businessId,
      businessName: data.businessName,
      balance: 0,
      currency: data.currency || 'ZAR',
      status: 'active', // active, suspended, closed
      accountNumber: this.generateAccountNumber(),
      createdAt: Date.now()
    };

    const id = await db.add('wallets', wallet);
    console.log('✅ Wallet created:', id);

    return { id, ...wallet };
  }

  generateAccountNumber() {
    // Generate unique account number
    return `ERP${Date.now()}${Math.floor(Math.random() * 1000)}`;
  }

  // Process payment
  async processPayment(data) {
    const payment = {
      type: data.type, // 'b2b', 'supplier', 'syndicate', 'payroll'
      fromWallet: data.fromWallet,
      toWallet: data.toWallet,
      amount: data.amount,
      currency: data.currency || 'ZAR',
      description: data.description,
      reference: data.reference,
      status: 'pending', // pending, processing, completed, failed
      fee: this.calculateFee(data.amount),
      initiatedBy: data.initiatedBy,
      initiatedAt: Date.now()
    };

    // Validate balance
    const fromWalletData = await db.get('wallets', data.fromWallet);

    if (!fromWalletData) {
      throw new Error('Source wallet not found');
    }

    if (fromWalletData.balance < (payment.amount + payment.fee)) {
      throw new Error('Insufficient balance');
    }

    const id = await db.add(STORES.payments, payment);

    // Process payment asynchronously
    setTimeout(() => this.completePayment(id), 1000);

    console.log('✅ Payment initiated:', id);
    return { id, ...payment };
  }

  async completePayment(paymentId) {
    const payment = await db.get(STORES.payments, paymentId);

    if (!payment) {
      console.error('Payment not found:', paymentId);
      return;
    }

    try {
      payment.status = 'processing';
      await db.update(STORES.payments, payment);

      // Debit from wallet
      await this.updateWalletBalance(
        payment.fromWallet,
        -(payment.amount + payment.fee)
      );

      // Credit to wallet
      await this.updateWalletBalance(
        payment.toWallet,
        payment.amount
      );

      // Record transactions
      await this.recordWalletTransaction({
        walletId: payment.fromWallet,
        type: 'debit',
        amount: payment.amount + payment.fee,
        description: `Payment to ${payment.toWallet}`,
        reference: paymentId
      });

      await this.recordWalletTransaction({
        walletId: payment.toWallet,
        type: 'credit',
        amount: payment.amount,
        description: `Payment from ${payment.fromWallet}`,
        reference: paymentId
      });

      payment.status = 'completed';
      payment.completedAt = Date.now();
      await db.update(STORES.payments, payment);

      console.log('✅ Payment completed:', paymentId);

    } catch (error) {
      console.error('Payment failed:', error);
      payment.status = 'failed';
      payment.error = error.message;
      await db.update(STORES.payments, payment);
    }
  }

  async updateWalletBalance(walletId, amount) {
    const wallet = await db.get('wallets', walletId);

    if (!wallet) {
      throw new Error('Wallet not found');
    }

    wallet.balance += amount;
    wallet.lastUpdated = Date.now();

    await db.update('wallets', wallet);
    return wallet;
  }

  async recordWalletTransaction(data) {
    const transaction = {
      walletId: data.walletId,
      type: data.type, // 'credit', 'debit'
      amount: data.amount,
      description: data.description,
      reference: data.reference,
      date: Date.now()
    };

    const id = await db.add(STORES.walletTransactions, transaction);

    // Integration: Record to PocketBooks Ledger
    if (this.pocketBooks) {
      await this.pocketBooks.recordTransaction({
        type: data.type === 'credit' ? 'income' : 'expense',
        category: 'Bank',
        amount: data.amount,
        description: `Wallet: ${data.description}`,
        date: Date.now(),
        reference: `WAL-${id}`
      });
    }

    return { id, ...transaction };
  }

  calculateFee(amount) {
    // Simple percentage fee
    return Math.round(amount * this.transactionFee * 100) / 100;
  }

  // Get wallet
  async getWallet(walletId) {
    return await db.get('wallets', walletId);
  }

  // Get wallet by business
  async getWalletByBusiness(businessId) {
    const wallets = await db.getAll('wallets');
    return wallets.find(w => w.businessId === businessId);
  }

  // Get payment history
  async getPayments(filters = {}) {
    let payments = await db.getAll(STORES.payments);

    if (filters.walletId) {
      payments = payments.filter(p =>
        p.fromWallet === filters.walletId || p.toWallet === filters.walletId
      );
    }

    if (filters.type) {
      payments = payments.filter(p => p.type === filters.type);
    }

    if (filters.status) {
      payments = payments.filter(p => p.status === filters.status);
    }

    return payments.sort((a, b) => b.initiatedAt - a.initiatedAt);
  }

  // Get transaction history
  async getTransactionHistory(walletId) {
    return await db.query(STORES.walletTransactions, 'walletId', walletId);
  }

  // Deposit to wallet (from external source)
  async deposit(data) {
    const wallet = await this.getWallet(data.walletId);

    if (!wallet) {
      throw new Error('Wallet not found');
    }

    await this.updateWalletBalance(data.walletId, data.amount);

    await this.recordWalletTransaction({
      walletId: data.walletId,
      type: 'credit',
      amount: data.amount,
      description: data.description || 'Deposit',
      reference: data.reference || `DEP-${Date.now()}`
    });

    console.log('✅ Deposit processed:', data.walletId, data.amount);
    return wallet;
  }

  // Withdraw from wallet (to external account)
  async withdraw(data) {
    const wallet = await this.getWallet(data.walletId);

    if (!wallet) {
      throw new Error('Wallet not found');
    }

    if (wallet.balance < data.amount) {
      throw new Error('Insufficient balance');
    }

    await this.updateWalletBalance(data.walletId, -data.amount);

    await this.recordWalletTransaction({
      walletId: data.walletId,
      type: 'debit',
      amount: data.amount,
      description: data.description || 'Withdrawal',
      reference: data.reference || `WTH-${Date.now()}`
    });

    console.log('✅ Withdrawal processed:', data.walletId, data.amount);
    return wallet;
  }

  // Supplier settlement (bulk payment)
  async settleSupplier(data) {
    const payments = [];

    for (const item of data.items) {
      const payment = await this.processPayment({
        type: 'supplier',
        fromWallet: data.fromWallet,
        toWallet: item.supplierWallet,
        amount: item.amount,
        description: `Supplier payment: ${item.supplierName}`,
        reference: `SUP-${Date.now()}-${item.supplierId}`,
        initiatedBy: data.initiatedBy
      });

      payments.push(payment);
    }

    console.log(`✅ Supplier settlement initiated: ${payments.length} payments`);
    return payments;
  }

  // Syndicate distribution (distribute funds to members)
  async distributeSyndicateFunds(data) {
    const distributions = [];

    for (const member of data.members) {
      const payment = await this.processPayment({
        type: 'syndicate',
        fromWallet: data.syndicateWallet,
        toWallet: member.wallet,
        amount: member.share,
        description: `Syndicate distribution: ${data.syndicateName}`,
        reference: `SYN-${Date.now()}-${member.memberId}`,
        initiatedBy: data.initiatedBy
      });

      distributions.push(payment);
    }

    console.log(`✅ Syndicate distribution initiated: ${distributions.length} payments`);
    return distributions;
  }

  // Payroll processing
  async processPayroll(data) {
    const payrollPayments = [];

    for (const employee of data.employees) {
      const payment = await this.processPayment({
        type: 'payroll',
        fromWallet: data.fromWallet,
        toWallet: employee.wallet,
        amount: employee.salary,
        description: `Payroll: ${employee.name} - ${data.period}`,
        reference: `PAY-${Date.now()}-${employee.employeeId}`,
        initiatedBy: data.initiatedBy
      });

      payrollPayments.push(payment);
    }

    console.log(`✅ Payroll processed: ${payrollPayments.length} payments`);
    return payrollPayments;
  }

  // Wallet analytics
  async getWalletAnalytics(walletId, period = 30) {
    const startDate = Date.now() - (period * 24 * 60 * 60 * 1000);

    const wallet = await this.getWallet(walletId);
    const transactions = await this.getTransactionHistory(walletId);
    const periodTransactions = transactions.filter(t => t.date >= startDate);

    const credits = periodTransactions.filter(t => t.type === 'credit');
    const debits = periodTransactions.filter(t => t.type === 'debit');

    const totalIn = credits.reduce((sum, t) => sum + t.amount, 0);
    const totalOut = debits.reduce((sum, t) => sum + t.amount, 0);

    const payments = await this.getPayments({ walletId });
    const periodPayments = payments.filter(p => p.initiatedAt >= startDate);

    return {
      wallet,
      period: `${period} days`,
      balance: wallet.balance,
      totalTransactions: periodTransactions.length,
      totalIn,
      totalOut,
      netFlow: totalIn - totalOut,
      payments: {
        total: periodPayments.length,
        completed: periodPayments.filter(p => p.status === 'completed').length,
        pending: periodPayments.filter(p => p.status === 'pending').length,
        failed: periodPayments.filter(p => p.status === 'failed').length
      },
      avgTransactionSize: periodTransactions.length > 0
        ? Math.round((totalIn + totalOut) / periodTransactions.length)
        : 0,
      insights: this.generateWalletInsights(wallet, totalIn, totalOut)
    };
  }

  generateWalletInsights(wallet, totalIn, totalOut) {
    const insights = [];

    if (wallet.balance < 1000) {
      insights.push({
        type: 'warning',
        message: 'Low wallet balance',
        action: 'Consider depositing funds to ensure payment processing'
      });
    }

    if (totalOut > totalIn * 1.2) {
      insights.push({
        type: 'warning',
        message: 'Outflow exceeds inflow',
        action: 'Monitor cash flow and ensure adequate funding'
      });
    }

    if (wallet.status !== 'active') {
      insights.push({
        type: 'error',
        message: 'Wallet is not active',
        action: 'Contact support to reactivate wallet'
      });
    }

    return insights;
  }
}

export default PocketWallet;

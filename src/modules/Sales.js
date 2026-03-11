// Sales/POS Module - Quick sales recording for shop owners
import db from '../db/index.js';
import PoolStock from './PoolStock.js';
import Customers from './Customers.js';

class Sales {
    constructor() {
        this.storeName = 'sales';
        this.inventory = new PoolStock();
    }

    async init() {
        // Check if sales store exists, if not we'll handle it gracefully
        console.log('✅ Sales module initialized');
    }

    // Record a new sale
    async recordSale(saleData) {
        const sale = {
            id: `sale_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: Date.now(),
            date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
            items: saleData.items || [],
            subtotal: saleData.subtotal || 0,
            discount: saleData.discount || 0,
            vat: saleData.vat || 0.15,
            vatAmount: saleData.vatAmount || 0,
            total: saleData.total || 0,
            paymentMethod: saleData.paymentMethod || 'cash',
            customerId: saleData.customerId || null,
            customerName: saleData.customerName || 'Walk-in',
            cashierName: saleData.cashierName || 'System',
            notes: saleData.notes || ''
        };

        try {
            // Deduct Stock
            if (sale.items && sale.items.length > 0) {
                console.log('📉 Deducting stock for sale...');
                for (const item of sale.items) {
                    if (item.sku && !item.sku.startsWith('OPEN-')) {
                        await this.inventory.updateStockLevel(item.sku, -item.quantity);
                    }
                }
            }

            // Update Customer Loyalty
            if (sale.customerId) {
                console.log('🌟 Updating loyalty points for customer:', sale.customerId);
                await Customers.recordVisit(parseInt(sale.customerId), sale.total);
            }

            // Store in general 'transactions' since we don't have a dedicated sales store
            await db.add('transactions', {
                ...sale,
                type: 'sale',
                category: 'Sales Revenue'
            });

            // Also record in PocketBooks as income
            await db.add('transactions', {
                id: `income_${sale.id}`,
                type: 'income',
                category: 'Sales Revenue',
                description: `Sale (${sale.paymentMethod}): ${sale.items.length} items`,
                amount: sale.total,
                date: sale.timestamp,
                status: 'completed',
                reference: sale.id
            });

            return sale;
        } catch (err) {
            console.error('Failed to record sale:', err);
            throw err;
        }
    }

    // Get today's sales
    async getTodaySales() {
        const today = new Date().toISOString().split('T')[0];
        const allTransactions = await db.getAll('transactions');
        return allTransactions.filter(t =>
            t.type === 'sale' &&
            t.date === today
        );
    }

    // Get sales by date range
    async getSalesByDateRange(startDate, endDate) {
        const allTransactions = await db.getAll('transactions');
        return allTransactions.filter(t => {
            if (t.type !== 'sale') return false;
            const saleDate = t.date;
            return saleDate >= startDate && saleDate <= endDate;
        });
    }

    // Get daily summary
    async getDailySummary(date = new Date().toISOString().split('T')[0]) {
        const allTransactions = await db.getAll('transactions');
        const daySales = allTransactions.filter(t =>
            t.type === 'sale' &&
            t.date === date
        );

        return {
            date,
            totalSales: daySales.length,
            revenue: daySales.reduce((sum, s) => sum + (s.total || 0), 0),
            avgSale: daySales.length > 0
                ? daySales.reduce((sum, s) => sum + (s.total || 0), 0) / daySales.length
                : 0,
            cashSales: daySales.filter(s => s.paymentMethod === 'cash').length,
            cardSales: daySales.filter(s => s.paymentMethod === 'card').length,
            mobileSales: daySales.filter(s => s.paymentMethod === 'mobile').length
        };
    }

    // Get weekly summary
    async getWeeklySummary() {
        const today = new Date();
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        const startDate = weekAgo.toISOString().split('T')[0];
        const endDate = today.toISOString().split('T')[0];

        const sales = await this.getSalesByDateRange(startDate, endDate);

        // Group by date
        const byDate = sales.reduce((acc, sale) => {
            acc[sale.date] = acc[sale.date] || { sales: 0, revenue: 0 };
            acc[sale.date].sales++;
            acc[sale.date].revenue += sale.total || 0;
            return acc;
        }, {});

        return {
            startDate,
            endDate,
            totalSales: sales.length,
            totalRevenue: sales.reduce((sum, s) => sum + (s.total || 0), 0),
            byDate
        };
    }

    // Get recent sales
    async getRecentSales(limit = 10) {
        const allTransactions = await db.getAll('transactions');
        return allTransactions
            .filter(t => t.type === 'sale')
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, limit);
    }

    // Quick sale from inventory item
    async quickSale(sku, quantity, unitPrice) {
        return this.recordSale({
            items: [{ sku, quantity, unitPrice, total: quantity * unitPrice }],
            subtotal: quantity * unitPrice,
            total: quantity * unitPrice,
            paymentMethod: 'cash'
        });
    }
}

export default new Sales();

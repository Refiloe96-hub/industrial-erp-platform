
// Notification Service - AI-Powered Business Alerts
// Generates contextual alerts based on business data analysis

import db from '../db/index.js';

class NotificationService {
    constructor() {
        this.notifications = [];
        this.checkInterval = null;
        this.readIds = new Set(JSON.parse(localStorage.getItem('erp_read_notifications') || '[]'));
    }

    async init() {
        // Check for alerts every 5 minutes when app is active
        await this.checkAllAlerts();
        this.checkInterval = setInterval(() => this.checkAllAlerts(), 5 * 60 * 1000);
    }

    async checkAllAlerts() {
        this.notifications = [];

        await Promise.all([
            this.checkLowStock(),
            this.checkOverdueOrders(),
            this.checkPaymentReminders(),
            this.checkMachineAlerts(),
            this.checkSyndicateAlerts()
        ]);

        // Sort by priority (critical first)
        this.notifications.sort((a, b) => {
            const priority = { critical: 0, warning: 1, info: 2 };
            return priority[a.type] - priority[b.type];
        });

        return this.notifications;
    }

    // 1. LOW STOCK ALERTS
    async checkLowStock() {
        try {
            const inventory = await db.getAll('inventory');

            // Critical: Out of stock
            const outOfStock = inventory.filter(i => i.quantity === 0);
            for (const item of outOfStock) {
                this.addNotification({
                    type: 'critical',
                    category: 'inventory',
                    title: '🚫 Out of Stock',
                    message: `${item.name} (${item.sku}) is completely out of stock`,
                    action: { label: 'View PoolStock', module: 'poolstock' },
                    data: { sku: item.sku },
                    id: `stock-out-${item.sku}`
                });
            }

            // Warning: Below reorder level
            const lowStock = inventory.filter(i => i.quantity > 0 && i.quantity <= (i.reorderLevel || 10));
            if (lowStock.length > 0) {
                this.addNotification({
                    type: 'warning',
                    category: 'inventory',
                    title: '⚠️ Low Stock Alert',
                    message: `${lowStock.length} item(s) below reorder level`,
                    details: lowStock.map(i => `${i.name}: ${i.quantity} remaining`).slice(0, 5),
                    action: { label: 'Reorder Now', module: 'poolstock' },
                    id: `stock-low-${lowStock.length}`
                });
            }
        } catch (err) {
            console.warn('Failed to check low stock:', err);
        }
    }

    // 2. OVERDUE ORDERS
    async checkOverdueOrders() {
        try {
            const orders = await db.getAll('productionOrders');
            const now = Date.now();

            // Overdue production orders
            const overdueOrders = orders.filter(o =>
                o.status !== 'completed' &&
                o.dueDate &&
                o.dueDate < now
            );

            if (overdueOrders.length > 0) {
                this.addNotification({
                    type: 'critical',
                    category: 'production',
                    title: '⏰ Overdue Orders',
                    message: `${overdueOrders.length} production order(s) past due date`,
                    details: overdueOrders.map(o => `Order #${o.id}: ${o.productName || 'Unknown'}`).slice(0, 5),
                    action: { label: 'View SmartShift', module: 'smartshift' },
                    id: `order-overdue-${overdueOrders.length}-${overdueOrders[0]?.id}`
                });
            }

            // Orders due today
            const dayMs = 24 * 60 * 60 * 1000;
            const todayEnd = new Date().setHours(23, 59, 59, 999);
            const dueToday = orders.filter(o =>
                o.status !== 'completed' &&
                o.dueDate &&
                o.dueDate > now &&
                o.dueDate <= todayEnd
            );

            if (dueToday.length > 0) {
                this.addNotification({
                    type: 'warning',
                    category: 'production',
                    title: '📅 Orders Due Today',
                    message: `${dueToday.length} order(s) due today`,
                    action: { label: 'View Orders', module: 'smartshift' },
                    id: `order-due-${dueToday.length}`
                });
            }
        } catch (err) {
            console.warn('Failed to check overdue orders:', err);
        }
    }

    // 3. PAYMENT REMINDERS
    async checkPaymentReminders() {
        try {
            const transactions = await db.getAll('transactions');
            const now = Date.now();
            const dayMs = 24 * 60 * 60 * 1000;
            const last7Days = now - (7 * dayMs);

            // Check cash flow trend
            const recentTxs = transactions.filter(t => t.date >= last7Days);
            const income = recentTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
            const expenses = recentTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
            const netFlow = income - expenses;

            if (netFlow < 0) {
                this.addNotification({
                    type: 'warning',
                    category: 'finance',
                    title: '💸 Negative Cash Flow',
                    message: `Expenses exceeded income by R ${Math.abs(netFlow).toLocaleString()} this week`,
                    action: { label: 'Review Finances', module: 'pocketbooks' },
                    id: `cashflow-neg-${Math.floor(Math.abs(netFlow))}`
                });
            }

            // Check for large pending payments
            const payments = await db.getAll('payments');
            const pendingPayments = payments.filter(p => p.status === 'pending');

            if (pendingPayments.length > 0) {
                const totalPending = pendingPayments.reduce((s, p) => s + (p.amount || 0), 0);
                this.addNotification({
                    type: 'info',
                    category: 'finance',
                    title: '💳 Pending Payments',
                    message: `${pendingPayments.length} payment(s) pending (R ${totalPending.toLocaleString()})`,
                    action: { label: 'View Wallet', module: 'pocketwallet' },
                    id: `payment-pending-${pendingPayments.length}`
                });
            }
        } catch (err) {
            console.warn('Failed to check payment reminders:', err);
        }
    }

    // 4. MACHINE ALERTS
    async checkMachineAlerts() {
        try {
            const machines = await db.getAll('machines');

            // Machines needing maintenance
            const maintenance = machines.filter(m => m.status === 'maintenance');
            if (maintenance.length > 0) {
                this.addNotification({
                    type: 'warning',
                    category: 'production',
                    title: '🔧 Machines in Maintenance',
                    message: `${maintenance.length} machine(s) currently in maintenance`,
                    details: maintenance.map(m => m.name),
                    action: { label: 'View Machines', module: 'smartshift' },
                    id: `machine-maint-${maintenance.length}`
                });
            }

            // Machines offline
            const offline = machines.filter(m => m.status === 'offline');
            if (offline.length > 0) {
                this.addNotification({
                    type: 'critical',
                    category: 'production',
                    title: '🚨 Machines Offline',
                    message: `${offline.length} machine(s) are offline`,
                    details: offline.map(m => m.name),
                    action: { label: 'Check Status', module: 'smartshift' },
                    id: `machine-offline-${offline.length}`
                });
            }
        } catch (err) {
            console.warn('Failed to check machine alerts:', err);
        }
    }

    // 5. SYNDICATE ALERTS
    async checkSyndicateAlerts() {
        try {
            const contributions = await db.getAll('contributions');
            const syndicates = await db.getAll('syndicates');

            // Late contributions
            const lateContributions = contributions.filter(c => c.status === 'late');
            if (lateContributions.length > 0) {
                this.addNotification({
                    type: 'warning',
                    category: 'syndicate',
                    title: '⏳ Late Contributions',
                    message: `${lateContributions.length} contribution(s) are overdue`,
                    action: { label: 'View TrustCircle', module: 'trustcircle' },
                    id: `syndicate-late-${lateContributions.length}`
                });
            }

            // Syndicates needing payout
            const activeSyndicates = syndicates.filter(s => s.status === 'active');
            for (const syndicate of activeSyndicates) {
                const syndicateContributions = contributions.filter(c => c.syndicateId === syndicate.id);
                const completedCount = syndicateContributions.filter(c => c.status === 'completed').length;
                const targetCount = (syndicate.members || []).length;

                if (targetCount > 0 && completedCount >= targetCount) {
                    this.addNotification({
                        type: 'info',
                        category: 'syndicate',
                        title: '🎉 Payout Ready',
                        message: `Syndicate "${syndicate.name}" has collected all contributions`,
                        action: { label: 'Process Payout', module: 'trustcircle' },
                        id: `syndicate-payout-${syndicate.id}`
                    });
                }
            }
        } catch (err) {
            console.warn('Failed to check syndicate alerts:', err);
        }
    }

    // Helper to add notification
    addNotification(notification) {
        // Deterministic ID fallback
        const id = notification.id || `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // Check if already read
        if (this.readIds.has(id)) {
            return; // Skip if read
        }

        // Check if already exists in current list (avoid dupes during same session)
        if (this.notifications.some(n => n.id === id)) {
            return;
        }

        this.notifications.push({
            id,
            timestamp: Date.now(),
            read: false,
            ...notification
        });
    }

    // Get unread count
    getUnreadCount() {
        return this.notifications.filter(n => !n.read).length;
    }

    // Mark as read
    markAsRead(id) {
        const notification = this.notifications.find(n => n.id === id);
        if (notification) {
            notification.read = true;
            this.readIds.add(id);
            this.saveReadState();

            // Remove from list so it "disappears" if desired, or keep as read
            // User asked: "if I read them all, shouldn't show any". 
            // So we should filter them out next time getUnread is called, 
            // or just rely on 'read' status.
            // Let's keep them in memory but marked read for history, 
            // but UI filters them if needed.
        }
    }

    saveReadState() {
        localStorage.setItem('erp_read_notifications', JSON.stringify([...this.readIds]));
    }

    // Mark all as read
    markAllAsRead() {
        this.notifications.forEach(n => {
            n.read = true;
            this.readIds.add(n.id);
        });
        this.saveReadState();
    }

    // Get notifications by type
    getByType(type) {
        return this.notifications.filter(n => n.type === type);
    }

    // Get all notifications
    getAll() {
        return this.notifications;
    }

    // Cleanup
    destroy() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
        }
    }
}

// Singleton instance
const notificationService = new NotificationService();
export default notificationService;

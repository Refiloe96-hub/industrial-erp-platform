// Customers Module - CRM for tracking loyal shoppers
import db, { STORES } from '../db/index.js';

class Customers {
    constructor() {
        this.storeName = STORES.customers;
    }

    async addCustomer(data) {
        const customer = {
            name: data.name,
            phone: data.phone || '',
            email: data.email || '',
            notes: data.notes || '',
            loyaltyPoints: 0,
            totalSpent: 0,
            createdAt: Date.now(),
            lastVisit: Date.now()
        };

        const id = await db.add(this.storeName, customer);
        return { id, ...customer };
    }

    async updateCustomer(id, updates) {
        const customer = await db.get(this.storeName, id);
        if (!customer) throw new Error('Customer not found');

        const updated = { ...customer, ...updates, updatedAt: Date.now() };
        await db.update(this.storeName, updated);
        return updated;
    }

    async getCustomer(id) {
        return await db.get(this.storeName, id);
    }

    async getAllCustomers() {
        return await db.getAll(this.storeName);
    }

    async searchCustomers(query) {
        const all = await this.getAllCustomers();
        const lowerQ = query.toLowerCase();
        return all.filter(c =>
            c.name.toLowerCase().includes(lowerQ) ||
            c.phone.includes(query)
        );
    }

    // Record a visit/sale to update stats
    async recordVisit(customerId, amount) {
        const customer = await this.getCustomer(customerId);
        if (!customer) return;

        // Simple Loyalty Logic: 1 point per R10 spent
        const pointsEarned = Math.floor(amount / 10);

        customer.totalSpent = (customer.totalSpent || 0) + amount;
        customer.loyaltyPoints = (customer.loyaltyPoints || 0) + pointsEarned;
        customer.lastVisit = Date.now();

        await db.update(this.storeName, customer);
    }
}

export default new Customers();

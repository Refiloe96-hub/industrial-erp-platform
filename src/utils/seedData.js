
import db, { STORES } from '../db/index.js';

class SeedData {
    static async init() {
        if (!confirm('Warning: This will CLEAR all existing data and populate sample data. Continue?')) {
            return;
        }

        console.log('Starting Seed Data Generation...');

        // Clear all stores
        for (const store of Object.values(STORES)) {
            try {
                await db.clear(store);
            } catch (e) {
                console.warn(`Could not clear ${store}`, e);
            }
        }

        console.log('Database cleared.');

        // --- 1. PocketBooks (Financials) ---
        const accounts = [
            { name: 'Business Check Account', type: 'bank', balance: 50000, currency: 'ZAR' },
            { name: 'Petty Cash', type: 'cash', balance: 2000, currency: 'ZAR' }
        ];

        const accountIds = [];
        for (const acc of accounts) {
            const id = await db.add(STORES.accounts, { ...acc, createdAt: Date.now() });
            accountIds.push(id);
        }

        // Transactions
        const categories = ['Sales', 'Consulting', 'Raw Materials', 'Rent', 'Utilities', 'Labor', 'Equipment'];
        for (let i = 0; i < 30; i++) {
            const isIncome = Math.random() > 0.6;
            await db.add(STORES.transactions, {
                type: isIncome ? 'income' : 'expense',
                category: isIncome ? categories[Math.floor(Math.random() * 2)] : categories[Math.floor(Math.random() * 5) + 2],
                amount: Math.round(Math.random() * 5000) + 500,
                description: `Sample Transaction #${i + 1}`,
                date: Date.now() - (Math.random() * 30 * 24 * 60 * 60 * 1000), // Last 30 days
                accountId: accountIds[0],
                status: 'completed'
            });
        }
        console.log('PocketBooks seeded.');

        // --- 2. PoolStock (Inventory) ---
        const suppliers = [
            { name: 'Durban Steelworks', contact: 'Johan', email: 'johan@steel.co.za', leadTime: 5 },
            { name: 'TechComponents SA', contact: 'Thabo', email: 'orders@techsource.co.za', leadTime: 3 },
            { name: 'Global Textiles', contact: 'Sarah', email: 'sarah@global.com', leadTime: 14 }
        ];

        for (const sup of suppliers) {
            await db.add(STORES.suppliers, { ...sup, createdAt: Date.now() });
        }

        const inventory = [
            { sku: 'RAW-001', name: 'Steel Sheets (2mm)', category: 'Raw Materials', quantity: 120, unit: 'sheets', reorderLevel: 50, unitCost: 450, supplier: 'Durban Steelworks' },
            { sku: 'RAW-002', name: 'Aluminium Tubing', category: 'Raw Materials', quantity: 45, unit: 'meters', reorderLevel: 100, unitCost: 120, supplier: 'Durban Steelworks' },
            { sku: 'CMP-101', name: 'Microcontroller Unit', category: 'Components', quantity: 500, unit: 'units', reorderLevel: 200, unitCost: 85, supplier: 'TechComponents SA' },
            { sku: 'FAB-550', name: 'Canvas Fabric', category: 'Textiles', quantity: 30, unit: 'rolls', reorderLevel: 20, unitCost: 1200, supplier: 'Global Textiles' },
            { sku: 'PRD-900', name: 'Finished Widget X', category: 'Finished Goods', quantity: 15, unit: 'units', reorderLevel: 10, unitCost: 800, supplier: 'Internal' }
        ];

        for (const item of inventory) {
            await db.add(STORES.inventory, { ...item, lastUpdated: Date.now() });
        }
        console.log('PoolStock seeded.');

        // --- 3. SmartShift (MES) ---
        const machines = [
            { name: 'CNC Cutter A', type: 'Cutting', status: 'operational', utilization: 75, powerConsumption: 4.5 },
            { name: 'Welding Station 1', type: 'Assembly', status: 'operational', utilization: 40, powerConsumption: 2.2 },
            { name: 'Packaging Unit', type: 'Packaging', status: 'maintenance', utilization: 0, powerConsumption: 1.0 }
        ];

        const machineIds = [];
        for (const mach of machines) {
            const id = await db.add(STORES.machines, { ...mach, lastMaintenance: Date.now() - 10000000 });
            machineIds.push(id);
        }

        const workers = [
            { name: 'Sipho Nkosi', role: 'Operator', hourlyRate: 45, skills: ['Cutting', 'Welding'], status: 'active' },
            { name: 'Jane Smith', role: 'Supervisor', hourlyRate: 85, skills: ['Management', 'Quality Check'], status: 'active' },
            { name: 'Mike Johnson', role: 'Packer', hourlyRate: 35, skills: ['Packaging'], status: 'active' }
        ];

        for (const w of workers) {
            await db.add(STORES.workers, { ...w, joinedDate: Date.now() - 500000000 });
        }

        // Production Orders
        for (let i = 1; i <= 5; i++) {
            await db.add(STORES.productionOrders, {
                productName: `Widget Batch #${i}`,
                quantity: 100 * i,
                status: i === 1 ? 'in_progress' : i === 2 ? 'completed' : 'pending',
                priority: i === 3 ? 'high' : 'normal',
                dueDate: Date.now() + (i * 24 * 60 * 60 * 1000),
                progress: i === 1 ? 45 : i === 2 ? 100 : 0
            });
        }
        console.log('SmartShift seeded.');

        // --- 4. TrustCircle (Syndicates) ---
        const syndicateId = await db.add(STORES.syndicates, {
            name: 'KZN Manufacturers Group',
            type: 'group_buying',
            maxMembers: 10,
            currentMembers: 4,
            minContribution: 5000,
            contributionFrequency: 'monthly',
            totalPool: 20000,
            status: 'active'
        });

        const members = [
            { businessName: 'AutoParts KZN', riskScore: 95, paymentRate: 100 },
            { businessName: 'Durban Textiles', riskScore: 88, paymentRate: 98 },
            { businessName: 'Coastal Logistics', riskScore: 72, paymentRate: 85 },
            { businessName: 'New Era Tech', riskScore: 45, paymentRate: 60 } // Risky member
        ];

        for (const m of members) {
            await db.add(STORES.members, {
                syndicateId,
                ...m,
                joinedDate: Date.now() - 100000000,
                status: 'active'
            });
        }
        console.log('TrustCircle seeded.');

        // --- 5. PocketWallet (Pixels) ---
        const walletId = await db.add('wallets', {
            businessId: 'current-user',
            balance: 15450.00,
            currency: 'ZAR',
            status: 'active',
            accountNumber: 'ERP8829103'
        });

        await db.add(STORES.walletTransactions, {
            walletId,
            type: 'credit',
            amount: 20000,
            description: 'Initial Capital',
            date: Date.now() - 10000000
        });

        await db.add(STORES.walletTransactions, {
            walletId,
            type: 'debit',
            amount: 4550,
            description: 'Supplier Payment: Durban Steelworks',
            date: Date.now() - 500000
        });

        console.log('PocketWallet seeded.');

        alert('Seed Data Generation Complete! The page will now reload.');
        window.location.reload();
    }
}

export default SeedData;

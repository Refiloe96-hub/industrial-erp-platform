
import db from '../db/index.js';

class DataImportService {
    constructor() {
        this.templates = {
            'shop': {
                inventory: [
                    { name: "Sample Item", category: "General", price: 10.00, cost: 5.00, quantity: 100, reorderLevel: 10 }
                ],
                accounts: [
                    { name: "Cash", type: "asset", balance: 0 },
                    { name: "Sales", type: "income", balance: 0 }
                ]
            },
            'warehouse': {
                inventory: [
                    { name: "Pallet A", category: "Storage", price: 500.00, cost: 200.00, quantity: 50, reorderLevel: 5, location: "A1" }
                ],
                suppliers: [
                    { name: "Big Supplier Co", contact: "John Doe", email: "john@bigsupply.com" }
                ]
            },
            'manufacturer': {
                machines: [
                    { name: "Machine 1", status: "operational", type: "Assembly" }
                ],
                inventory: [
                    { name: "Raw Material X", category: "Raw", cost: 20.00, quantity: 1000, unit: "kg" }
                ]
            }
        };
    }

    // Get a template for a specific business type
    getTemplate(businessType) {
        return this.templates[businessType] || this.templates['shop'];
    }

    // Generate a downloadable JSON file
    generateTemplateFile(businessType) {
        const template = this.getTemplate(businessType);
        const json = JSON.stringify(template, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        return URL.createObjectURL(blob);
    }

    // Parse and Import Data
    async importData(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    await this.processImport(data);
                    resolve({ success: true, count: Object.keys(data).length });
                } catch (err) {
                    reject(err);
                }
            };
            reader.onerror = () => reject(new Error("Failed to read file"));
            reader.readAsText(file);
        });
    }

    async processImport(data) {
        // Validate structure (basic check)
        if (typeof data !== 'object') throw new Error("Invalid JSON format");

        // Iterate over stores (inventory, accounts, etc.)
        for (const [storeName, items] of Object.entries(data)) {
            if (!Array.isArray(items)) continue; // Skip if not an array

            // Process each item
            for (const item of items) {
                // Enhancements can go here (e.g. generating IDs if missing)
                if (!item.id && storeName === 'inventory') item.sku = item.sku || `SKU-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

                // Use upsert
                await db.update(storeName, item);
            }
        }
    }
}

export default new DataImportService();

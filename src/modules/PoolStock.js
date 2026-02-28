// PoolStock Module - Procurement & Inventory Intelligence
// Purpose: Ensure stock availability with minimal tied-up cash
// Role: Procurement Officer

import db, { STORES } from '../db/index.js';

class PoolStock {
  constructor(aiEngine) {
    this.aiEngine = aiEngine;
  }

  // Helper: Get color for category
  getCategoryColor(category) {
    const colors = {
      'Food': '#ef4444',      // Red
      'Beverage': '#3b82f6',  // Blue
      'Household': '#10b981', // Green
      'Airtime': '#f59e0b',   // Yellow
      'Tobacco': '#8b5cf6',   // Purple
      'Bakery': '#d97706',    // Amber
      'default': '#6b7280'    // Grey
    };
    return colors[category] || colors['default'];
  }

  // Add/Update inventory item
  async updateInventory(data) {
    const item = {
      sku: data.sku,
      name: data.name,
      category: data.category,
      quantity: data.quantity,
      unit: data.unit,
      location: data.location,
      unitCost: data.unitCost,
      unitPrice: data.unitPrice,
      reorderLevel: data.reorderLevel,
      reorderQuantity: data.reorderQuantity,
      preferredSupplier: data.preferredSupplier,
      color: data.color || this.getCategoryColor(data.category),
      lastUpdated: Date.now()
    };

    await db.update(STORES.inventory, item);
    console.log('✅ Inventory updated:', item.sku);

    // Check if reorder needed
    if (item.quantity <= item.reorderLevel) {
      await this.createReorderAlert(item);
    }

    return item;
  }

  // Get all inventory
  async getInventory(filters = {}) {
    let items = await db.getAll(STORES.inventory);

    if (filters.category) {
      items = items.filter(i => i.category === filters.category);
    }

    if (filters.location) {
      items = items.filter(i => i.location === filters.location);
    }

    if (filters.lowStock) {
      items = items.filter(i => i.quantity <= i.reorderLevel);
    }

    return items;
  }

  // Get single item by SKU
  async getItem(sku) {
    return await db.get(STORES.inventory, sku);
  }

  // Record stock movement
  async recordMovement(data) {
    const item = await this.getItem(data.sku);

    if (!item) {
      throw new Error(`Item ${data.sku} not found`);
    }

    // Update quantity
    const newQuantity = data.type === 'in'
      ? item.quantity + data.quantity
      : item.quantity - data.quantity;

    if (newQuantity < 0) {
      throw new Error('Insufficient stock');
    }

    item.quantity = newQuantity;
    item.lastUpdated = Date.now();

    await db.update(STORES.inventory, item);

    // Log movement in transactions
    await db.add('stockMovements', {
      sku: data.sku,
      type: data.type,
      quantity: data.quantity,
      reference: data.reference,
      notes: data.notes,
      timestamp: Date.now()
    });

    console.log(`✅ Stock movement: ${data.type} ${data.quantity} ${item.unit} of ${item.name}`);

    return item;
  }

  // Alias for Sales module integration
  async updateStockLevel(sku, quantityChange) {
    // quantityChange is negative for sales
    const type = quantityChange > 0 ? 'in' : 'out';
    const quantity = Math.abs(quantityChange);

    return this.recordMovement({
      sku,
      type,
      quantity,
      reference: 'SALE',
      notes: 'Sale recorded via Sales module'
    });
  }

  // Create reorder alert
  async createReorderAlert(item) {
    console.log(`⚠️ Low stock alert: ${item.name}`);

    // This would trigger notification in production
    return {
      type: 'reorder_needed',
      item,
      message: `${item.name} is at ${item.quantity} ${item.unit} (reorder level: ${item.reorderLevel})`,
      recommendation: `Order ${item.reorderQuantity} ${item.unit} from ${item.preferredSupplier}`,
      urgency: item.quantity === 0 ? 'critical' : 'high'
    };
  }

  // Get suppliers
  async getSuppliers() {
    return await db.getAll(STORES.suppliers);
  }

  // Add supplier
  async addSupplier(data) {
    const supplier = {
      name: data.name,
      contact: data.contact,
      email: data.email,
      phone: data.phone,
      address: data.address,
      categories: data.categories || [],
      leadTime: data.leadTime, // in days
      minOrderValue: data.minOrderValue,
      paymentTerms: data.paymentTerms,
      rating: data.rating || 0,
      createdAt: Date.now()
    };

    const id = await db.add(STORES.suppliers, supplier);
    return { id, ...supplier };
  }

  // Create purchase order
  async createPurchaseOrder(data) {
    const po = {
      supplierId: data.supplierId,
      items: data.items, // [{ sku, quantity, unitPrice }]
      totalAmount: data.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0),
      orderDate: Date.now(),
      expectedDate: data.expectedDate,
      status: 'pending',
      notes: data.notes,
      createdBy: data.createdBy
    };

    const id = await db.add(STORES.purchaseOrders, po);
    console.log('✅ Purchase order created:', id);

    return { id, ...po };
  }

  // Get purchase orders
  async getPurchaseOrders(filters = {}) {
    let orders = await db.getAll(STORES.purchaseOrders);

    if (filters.status) {
      orders = orders.filter(o => o.status === filters.status);
    }

    if (filters.supplierId) {
      orders = orders.filter(o => o.supplierId === filters.supplierId);
    }

    return orders.sort((a, b) => b.orderDate - a.orderDate);
  }

  // Receive purchase order
  async receivePurchaseOrder(orderId, receivedItems) {
    const order = await db.get(STORES.purchaseOrders, orderId);

    if (!order) {
      throw new Error('Purchase order not found');
    }

    // Update inventory for received items
    for (const received of receivedItems) {
      await this.recordMovement({
        sku: received.sku,
        type: 'in',
        quantity: received.quantity,
        reference: `PO-${orderId}`,
        notes: 'Purchase order received'
      });
    }

    // Update order status
    order.status = 'received';
    order.receivedDate = Date.now();
    await db.update(STORES.purchaseOrders, order);

    console.log('✅ Purchase order received:', orderId);
    return order;
  }

  // AI: Demand forecasting
  async forecastDemand(sku, daysAhead = 30) {
    if (!this.aiEngine) {
      console.warn('AI Engine not available');
      return null;
    }

    // Get historical sales data
    const historicalData = []; // Would fetch from sales/movements history

    const forecast = await this.aiEngine.forecastDemand(sku, historicalData);
    return forecast;
  }

  // AI: Overstock detection
  async detectOverstock() {
    const items = await this.getInventory();
    const alerts = [];

    for (const item of items) {
      // Calculate days of supply
      const averageDailyDemand = item.averageDemand || 1;
      const daysOfSupply = item.quantity / averageDailyDemand;

      if (daysOfSupply > 90) { // More than 3 months supply
        alerts.push({
          item,
          daysOfSupply: Math.round(daysOfSupply),
          capitalTied: item.quantity * item.unitCost,
          recommendation: 'Consider reducing next order or group-buy discount'
        });
      }
    }

    return alerts;
  }

  // Group buy opportunity detection
  async detectGroupBuyOpportunities() {
    const items = await this.getInventory({ lowStock: true });

    // This would check syndicate members' needs
    // For Phase 11, return placeholder
    const opportunities = [];

    for (const item of items) {
      // Simulate checking if other businesses need this item
      const otherBusinessesNeed = Math.random() > 0.7; // 30% chance

      if (otherBusinessesNeed) {
        opportunities.push({
          sku: item.sku,
          name: item.name,
          potentialParticipants: Math.floor(Math.random() * 5) + 2,
          estimatedSavings: item.unitCost * 0.15 * item.reorderQuantity, // 15% bulk discount
          recommendation: 'Coordinate with TrustCircle syndicate for group purchase'
        });
      }
    }

    return opportunities;
  }

  // Inventory health report
  async getHealthReport() {
    const items = await this.getInventory();

    const lowStock = items.filter(i => i.quantity <= i.reorderLevel);
    const outOfStock = items.filter(i => i.quantity === 0);
    const overstock = await this.detectOverstock();

    const totalValue = items.reduce((sum, i) => sum + (i.quantity * i.unitCost), 0);
    const averageTurnover = 30; // days - would calculate from actual data

    return {
      totalItems: items.length,
      totalValue,
      lowStock: lowStock.length,
      outOfStock: outOfStock.length,
      overstock: overstock.length,
      averageTurnover,
      healthScore: this.calculateHealthScore(items, lowStock, outOfStock, overstock),
      insights: [
        {
          type: lowStock.length > 0 ? 'warning' : 'success',
          message: `${lowStock.length} items need reordering`,
          action: lowStock.length > 0 ? 'Review and create purchase orders' : null
        },
        {
          type: overstock.length > 0 ? 'info' : 'success',
          message: `${overstock.length} items overstocked`,
          action: overstock.length > 0 ? 'Consider group-buy or reduce orders' : null
        }
      ]
    };
  }

  calculateHealthScore(items, lowStock, outOfStock, overstock) {
    let score = 100;
    score -= (outOfStock.length / items.length) * 30;
    score -= (lowStock.length / items.length) * 20;
    score -= (overstock.length / items.length) * 15;
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  // Phase 4: Advanced Supply Chain Metrics
  async getAdvancedStats(items = null) {
    if (!items) {
      items = await this.getInventory();
    }

    // 1. Service Level (Availability)
    // Formula: (Total Items - Out of Stock) / Total Items * 100
    const totalItems = items.length;
    const outOfStockCount = items.filter(i => i.quantity <= 0).length;
    const serviceLevel = totalItems > 0
      ? ((totalItems - outOfStockCount) / totalItems) * 100
      : 100;

    // 2. Inventory ROI (GMROI approximation)
    // Formula: Gross Margin / Avg Inventory Investment
    // Simulation: Assume 30% margin on current inventory value for "potential" ROI
    const inventoryValue = items.reduce((sum, i) => sum + (i.quantity * i.unitCost), 0);
    const potentialRevenue = items.reduce((sum, i) => sum + (i.quantity * (i.unitPrice || (i.unitCost * 1.5))), 0);
    const potentialProfit = potentialRevenue - inventoryValue;
    const roi = inventoryValue > 0 ? (potentialProfit / inventoryValue) * 100 : 0;

    // 3. Stock Turns (Simulated)
    // Formula: Annual COGS / Avg Inventory
    // Ideally requires historical data. We will simulate "months of supply" to infer turns.
    // If average items have 2 months of supply, turns = 6 per year.
    let totalTurns = 0;
    let turnCount = 0;

    items.forEach(i => {
      const dailyUsage = i.averageDemand || 1; // Default to 1 if unknown
      const daysSupply = i.quantity / dailyUsage;
      const annualTurns = 365 / Math.max(daysSupply, 1); // Avoid div by zero
      totalTurns += annualTurns;
      turnCount++;
    });

    const averageTurns = turnCount > 0 ? (totalTurns / turnCount) : 0;

    return {
      serviceLevel, // Percentage (e.g., 95.5)
      roi,          // Percentage (e.g., 150.0 for 50% margin)
      stockTurns: averageTurns, // Times per year (e.g., 12)
      inventoryValue,
      potentialProfit
    };
  }
}

export default PoolStock;

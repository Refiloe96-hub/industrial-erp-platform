// IndexedDB Manager - Local-First Data Storage
// Handles all offline data persistence and sync queue

const DB_NAME = 'IndustrialERP';
const DB_VERSION = 11;

const STORES = {
  // PocketBooks - Financial Ledger
  transactions: 'transactions',
  accounts: 'accounts',
  users: 'users',
  customers: 'customers',

  // PoolStock - Inventory & Procurement
  inventory: 'inventory',
  suppliers: 'suppliers',
  purchaseOrders: 'purchaseOrders',
  stockMovements: 'stockMovements',

  // SmartShift - Manufacturing Execution
  productionOrders: 'productionOrders',
  machines: 'machines',
  shifts: 'shifts',
  workers: 'workers',

  // TrustCircle - B2B Syndicates
  syndicates: 'syndicates',
  members: 'members',
  contributions: 'contributions',
  groupBuys: 'groupBuys',
  fundingRequests: 'fundingRequests',

  // PocketWallet - Payment Rails
  wallets: 'wallets',
  payments: 'payments',
  walletTransactions: 'walletTransactions',

  // Sync Queue
  syncQueue: 'syncQueue',

  // Settings & Metadata
  settings: 'settings',
  metadata: 'metadata'
};

class DatabaseManager {
  constructor() {
    this.db = null;
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        console.log('✅ IndexedDB initialized');
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        console.log('🔧 Upgrading database schema...');

        // Create object stores with indexes
        this.createStores(db, event);
      };
    });
  }

  createStores(db, event) {
    // PocketBooks - Transactions
    if (!db.objectStoreNames.contains(STORES.transactions)) {
      const txStore = db.createObjectStore(STORES.transactions, {
        keyPath: 'id',
        autoIncrement: true
      });
      txStore.createIndex('date', 'date');
      txStore.createIndex('type', 'type');
      txStore.createIndex('category', 'category');
      txStore.createIndex('synced', 'synced');
    }

    // PocketBooks - Accounts
    if (!db.objectStoreNames.contains(STORES.accounts)) {
      db.createObjectStore(STORES.accounts, {
        keyPath: 'id',
        autoIncrement: true
      });
    }

    // Platform - Users
    if (!db.objectStoreNames.contains(STORES.users)) {
      const userStore = db.createObjectStore(STORES.users, {
        keyPath: 'username'
      });
      userStore.createIndex('role', 'role');
      userStore.createIndex('businessType', 'businessType');
    }

    // PoolStock - Inventory
    if (!db.objectStoreNames.contains(STORES.inventory)) {
      const invStore = db.createObjectStore(STORES.inventory, {
        keyPath: 'sku'
      });
      invStore.createIndex('category', 'category');
      invStore.createIndex('location', 'location');
      invStore.createIndex('quantity', 'quantity');
      invStore.createIndex('reorderLevel', 'reorderLevel');
    }

    // PoolStock - Suppliers
    if (!db.objectStoreNames.contains(STORES.suppliers)) {
      const supStore = db.createObjectStore(STORES.suppliers, {
        keyPath: 'id',
        autoIncrement: true
      });
      supStore.createIndex('name', 'name');
      supStore.createIndex('rating', 'rating');
    }

    // PoolStock - Purchase Orders
    if (!db.objectStoreNames.contains(STORES.purchaseOrders)) {
      const poStore = db.createObjectStore(STORES.purchaseOrders, {
        keyPath: 'id',
        autoIncrement: true
      });
      poStore.createIndex('status', 'status');
      poStore.createIndex('supplierId', 'supplierId');
      poStore.createIndex('expectedDate', 'expectedDate');
    }

    // PoolStock - Stock Movements
    if (!db.objectStoreNames.contains(STORES.stockMovements)) {
      const movStore = db.createObjectStore(STORES.stockMovements, {
        keyPath: 'id',
        autoIncrement: true
      });
      movStore.createIndex('sku', 'sku');
      movStore.createIndex('type', 'type');
      movStore.createIndex('timestamp', 'timestamp');
    }

    // SmartShift - Production Orders
    if (!db.objectStoreNames.contains(STORES.productionOrders)) {
      const prodStore = db.createObjectStore(STORES.productionOrders, {
        keyPath: 'id',
        autoIncrement: true
      });
      prodStore.createIndex('status', 'status');
      prodStore.createIndex('dueDate', 'dueDate');
      prodStore.createIndex('priority', 'priority');
    }

    // SmartShift - Machines
    if (!db.objectStoreNames.contains(STORES.machines)) {
      const machStore = db.createObjectStore(STORES.machines, {
        keyPath: 'id',
        autoIncrement: true
      });
      machStore.createIndex('status', 'status');
      machStore.createIndex('utilization', 'utilization');
    }

    // SmartShift - Shifts
    if (!db.objectStoreNames.contains(STORES.shifts)) {
      const shiftStore = db.createObjectStore(STORES.shifts, {
        keyPath: 'id',
        autoIncrement: true
      });
      shiftStore.createIndex('date', 'date');
      shiftStore.createIndex('machineId', 'machineId');
      shiftStore.createIndex('workerId', 'workerId');
    }

    // SmartShift - Workers
    if (!db.objectStoreNames.contains(STORES.workers)) {
      const workerStore = db.createObjectStore(STORES.workers, {
        keyPath: 'id',
        autoIncrement: true
      });
      workerStore.createIndex('skills', 'skills', { multiEntry: true });
      workerStore.createIndex('availability', 'availability');
    }

    // TrustCircle - Syndicates
    if (!db.objectStoreNames.contains(STORES.syndicates)) {
      const syndStore = db.createObjectStore(STORES.syndicates, {
        keyPath: 'id',
        autoIncrement: true
      });
      syndStore.createIndex('type', 'type');
      syndStore.createIndex('status', 'status');
    }

    // TrustCircle - Members
    if (!db.objectStoreNames.contains(STORES.members)) {
      const memStore = db.createObjectStore(STORES.members, {
        keyPath: 'id',
        autoIncrement: true
      });
      memStore.createIndex('syndicateId', 'syndicateId');
      memStore.createIndex('riskScore', 'riskScore');
    }

    // TrustCircle - Contributions
    if (!db.objectStoreNames.contains(STORES.contributions)) {
      const contStore = db.createObjectStore(STORES.contributions, {
        keyPath: 'id',
        autoIncrement: true
      });
      contStore.createIndex('syndicateId', 'syndicateId');
      contStore.createIndex('memberId', 'memberId');
      contStore.createIndex('date', 'date');
    }

    // TrustCircle - Group Buys
    if (!db.objectStoreNames.contains(STORES.groupBuys)) {
      const gbStore = db.createObjectStore(STORES.groupBuys, { keyPath: 'id', autoIncrement: true });
      gbStore.createIndex('syndicateId', 'syndicateId');
      gbStore.createIndex('status', 'status');
      gbStore.createIndex('deadline', 'deadline');
    }

    // TrustCircle - Funding Requests
    if (!db.objectStoreNames.contains(STORES.fundingRequests)) {
      const frStore = db.createObjectStore(STORES.fundingRequests, { keyPath: 'id', autoIncrement: true });
      frStore.createIndex('syndicateId', 'syndicateId');
      frStore.createIndex('memberId', 'memberId');
      frStore.createIndex('status', 'status');
    }

    // PocketWallet - Wallets
    if (!db.objectStoreNames.contains(STORES.wallets)) {
      const walletsStore = db.createObjectStore(STORES.wallets, {
        keyPath: 'id',
        autoIncrement: true
      });
      walletsStore.createIndex('businessId', 'businessId');
      walletsStore.createIndex('status', 'status');
    }

    // PocketWallet - Payments
    if (!db.objectStoreNames.contains(STORES.payments)) {
      const payStore = db.createObjectStore(STORES.payments, {
        keyPath: 'id',
        autoIncrement: true
      });
      payStore.createIndex('status', 'status');
      payStore.createIndex('type', 'type');
      payStore.createIndex('date', 'date');
    }

    // PocketWallet - Wallet Transactions
    if (!db.objectStoreNames.contains(STORES.walletTransactions)) {
      const walletStore = db.createObjectStore(STORES.walletTransactions, {
        keyPath: 'id',
        autoIncrement: true
      });
      walletStore.createIndex('walletId', 'walletId');
      walletStore.createIndex('date', 'date');
      walletStore.createIndex('type', 'type');
    } else {
      // Add missing walletId index to existing store (schema migration)
      const tx = event.target.transaction;
      if (tx) {
        try {
          const store = tx.objectStore(STORES.walletTransactions);
          if (!store.indexNames.contains('walletId')) {
            store.createIndex('walletId', 'walletId');
            console.log('✅ Added walletId index to walletTransactions');
          }
        } catch (e) {
          console.warn('Could not add walletId index:', e);
        }
      }
    }

    // Sync Queue
    if (!db.objectStoreNames.contains(STORES.syncQueue)) {
      const syncStore = db.createObjectStore(STORES.syncQueue, {
        keyPath: 'id',
        autoIncrement: true
      });
      syncStore.createIndex('timestamp', 'timestamp');
      syncStore.createIndex('status', 'status');
      syncStore.createIndex('priority', 'priority');
    }

    // Settings
    if (!db.objectStoreNames.contains(STORES.settings)) {
      db.createObjectStore(STORES.settings, { keyPath: 'key' });
    }

    // Customers (CRM)
    if (!db.objectStoreNames.contains(STORES.customers)) {
      const custStore = db.createObjectStore(STORES.customers, {
        keyPath: 'id',
        autoIncrement: true
      });
      custStore.createIndex('phone', 'phone', { unique: false });
      custStore.createIndex('name', 'name');
    }

    // Metadata
    if (!db.objectStoreNames.contains(STORES.metadata)) {
      db.createObjectStore(STORES.metadata, { keyPath: 'key' });
    }
  }

  // Helper to promisify IDB parameters
  _promisify(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Generic CRUD operations
  async add(storeName, data) {
    const tx = this.db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);

    // Add sync flag for offline writes
    const dataWithMeta = {
      ...data,
      synced: false,
      localTimestamp: Date.now()
    };

    const result = await this._promisify(store.add(dataWithMeta));

    // Add to sync queue
    await this.addToSyncQueue({
      action: 'create',
      store: storeName,
      data: dataWithMeta,
      localId: result
    });

    return result;
  }

  async get(storeName, key) {
    const tx = this.db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    return this._promisify(store.get(key));
  }

  async getAll(storeName) {
    const tx = this.db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    return this._promisify(store.getAll());
  }

  async update(storeName, data) {
    const tx = this.db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);

    // The Moat: CRDT Base State Tracking
    const existing = await this.get(storeName, data.id || data.sku || data.key || data.username);

    const dataWithMeta = {
      ...data,
      synced: false,
      localTimestamp: Date.now()
    };

    // If making an offline mutation to a synced record, save the original state to calculate Deltas
    if (existing) {
      // Inventory Quantity
      if (storeName === STORES.inventory && dataWithMeta.quantity !== undefined && existing.synced) {
        dataWithMeta._offlineOriginalQuantity = existing.quantity;
      }
      // Account/Wallet Balances
      if ((storeName === STORES.accounts || storeName === STORES.wallets) && dataWithMeta.balance !== undefined && existing.synced) {
        dataWithMeta._offlineOriginalBalance = existing.balance;
      }

      // Preserve original state if making subsequent offline edits before a sync
      if (existing._offlineOriginalQuantity !== undefined && !existing.synced) {
        dataWithMeta._offlineOriginalQuantity = existing._offlineOriginalQuantity;
      }
      if (existing._offlineOriginalBalance !== undefined && !existing.synced) {
        dataWithMeta._offlineOriginalBalance = existing._offlineOriginalBalance;
      }
    }

    const result = await this._promisify(store.put(dataWithMeta));

    await this.addToSyncQueue({
      action: 'update',
      store: storeName,
      data: dataWithMeta
    });

    return result;
  }

  async delete(storeName, key) {
    const tx = this.db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);

    await this._promisify(store.delete(key));

    await this.addToSyncQueue({
      action: 'delete',
      store: storeName,
      key: key
    });

    return true;
  }

  async clear(storeName) {
    const tx = this.db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    return this._promisify(store.clear());
  }

  async query(storeName, indexName, value) {
    const tx = this.db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const index = store.index(indexName);
    return this._promisify(index.getAll(value));
  }

  // Sync Queue Management
  async addToSyncQueue(operation) {
    const tx = this.db.transaction(STORES.syncQueue, 'readwrite');
    const store = tx.objectStore(STORES.syncQueue);

    return this._promisify(store.add({
      ...operation,
      timestamp: Date.now(),
      status: 'pending',
      priority: operation.priority || 5,
      retries: 0
    }));
  }

  async getPendingSyncItems() {
    const tx = this.db.transaction(STORES.syncQueue, 'readonly');
    const store = tx.objectStore(STORES.syncQueue);
    const index = store.index('status');
    // Ensure we handle the case where the index might be empty or errors out gracefully
    try {
      return await this._promisify(index.getAll('pending'));
    } catch (e) {
      console.warn("No pending items or error fetching pending items", e);
      return [];
    }
  }

  async markSynced(syncId) {
    const tx = this.db.transaction(STORES.syncQueue, 'readwrite');
    const store = tx.objectStore(STORES.syncQueue);

    // We need to fetch it first to update it
    try {
      const item = await this._promisify(store.get(syncId));
      if (item) {
        item.status = 'synced';
        item.syncedAt = Date.now();
        await this._promisify(store.put(item));
      }
    } catch (e) {
      console.error("Failed to mark item as synced", syncId, e);
    }
  }

  async clearSyncedItems() {
    const tx = this.db.transaction(STORES.syncQueue, 'readwrite');
    const store = tx.objectStore(STORES.syncQueue);
    const index = store.index('status');

    try {
      const syncedItems = await this._promisify(index.getAllKeys('synced'));
      for (const key of syncedItems) {
        await this._promisify(store.delete(key));
      }
    } catch (e) {
      console.error("Failed to clear synced items", e);
    }
  }
}

// Export singleton instance
const db = new DatabaseManager();
export default db;
export { STORES };

// Sync Manager - Background Data Synchronization
// Handles eventual consistency between local IndexedDB and remote server

import db, { STORES } from '../db/index.js';
import { supabaseClient, isSupabaseEnabled } from '../services/supabase.js';

class SyncManager {
  constructor() {
    this.isSyncing = false;
    this.syncInterval = null;
    this.failedAttempts = 0;
    this.maxRetries = 3;
    this.channel = null;
  }

  init() {
    console.log('🔄 Initializing Sync Manager...');

    // Listen for online/offline events
    window.addEventListener('online', () => this.onOnline());
    window.addEventListener('offline', () => this.onOffline());

    // Start periodic sync if online
    if (navigator.onLine) {
      this.startPeriodicSync();
    }

    // Connect real-time listeners if Supabase is available
    if (isSupabaseEnabled()) {
      this.subscribeToRealtime();
    }

    // Register background sync if supported
    if ('serviceWorker' in navigator && 'sync' in navigator.serviceWorker) {
      this.registerBackgroundSync();
    }

    console.log('✅ Sync Manager ready');
  }

  startPeriodicSync() {
    // Sync every 5 minutes when online
    this.syncInterval = setInterval(() => {
      this.sync();
    }, 5 * 60 * 1000);

    // Initial sync
    this.sync();
  }

  stopPeriodicSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  onOnline() {
    console.log('📡 Connection restored - initiating sync');
    this.failedAttempts = 0;
    this.startPeriodicSync();
  }

  onOffline() {
    console.log('📡 Connection lost - queueing changes for sync');
    this.stopPeriodicSync();
  }

  async registerBackgroundSync() {
    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.sync.register('sync-data');
      console.log('✅ Background sync registered');
    } catch (error) {
      console.warn('Background sync not supported:', error);
    }
  }

  async sync() {
    if (this.isSyncing) {
      console.log('⏳ Sync already in progress');
      return;
    }

    if (!navigator.onLine) {
      console.log('📡 Offline - sync deferred');
      return;
    }

    this.isSyncing = true;
    console.log('🔄 Starting sync...');

    try {
      // Get pending sync items
      const result = await db.getPendingSyncItems();
      const pendingItems = Array.isArray(result) ? result : [];

      console.log(`📦 ${pendingItems.length} items to sync`);

      if (pendingItems.length === 0) {
        console.log('✅ Nothing to sync');
        this.isSyncing = false;
        return;
      }

      // Sort by priority and timestamp
      pendingItems.sort((a, b) => {
        if (a.priority !== b.priority) return b.priority - a.priority;
        return a.timestamp - b.timestamp;
      });

      // Process each item
      let syncedCount = 0;
      let failedCount = 0;

      for (const item of pendingItems) {
        try {
          const result = await this.syncItem(item);

          if (result.success) {
            await db.markSynced(item.id);
            syncedCount++;
          } else {
            failedCount++;

            // Increment retry counter
            item.retries = (item.retries || 0) + 1;

            // If max retries reached, mark as failed
            if (item.retries >= this.maxRetries) {
              console.error(`❌ Max retries reached for item ${item.id}`);
              // Could mark as 'failed' and notify user
            }
          }
        } catch (error) {
          console.error(`❌ Sync failed for item ${item.id}:`, error);
          failedCount++;
        }
      }

      console.log(`✅ Sync complete: ${syncedCount} synced, ${failedCount} failed`);

      // Clean up synced items
      await db.clearSyncedItems();

      this.failedAttempts = 0;

    } catch (error) {
      console.error('❌ Sync error:', error);
      this.failedAttempts++;

      // Exponential backoff
      if (this.failedAttempts >= 3) {
        console.warn('⚠️ Multiple sync failures - backing off');
        this.stopPeriodicSync();

        // Retry after 15 minutes
        setTimeout(() => {
          this.failedAttempts = 0;
          this.startPeriodicSync();
        }, 15 * 60 * 1000);
      }
    } finally {
      this.isSyncing = false;
    }
  }

  // Map IndexedDB store names → Supabase table names
  storeToTable(store) {
    const map = {
      [STORES.transactions]: 'transactions',
      [STORES.accounts]: 'accounts',
      [STORES.users]: 'profiles',
      [STORES.customers]: 'customers',
      [STORES.inventory]: 'inventory',
      [STORES.suppliers]: 'suppliers',
      [STORES.purchaseOrders]: 'purchase_orders',
      [STORES.stockMovements]: 'stock_movements',
      [STORES.productionOrders]: 'production_orders',
      [STORES.machines]: 'machines',
      [STORES.shifts]: 'shifts',
      [STORES.workers]: 'workers',
      [STORES.syndicates]: 'syndicates',
      [STORES.members]: 'syndicate_members',
      [STORES.contributions]: 'contributions',
      [STORES.groupBuys]: 'group_buys',
      [STORES.fundingRequests]: 'funding_requests',
      [STORES.wallets]: 'wallets',
      [STORES.payments]: 'payments',
      [STORES.walletTransactions]: 'wallet_transactions',
    };
    return map[store] || store;
  }

  tableToStore(table) {
    const map = {
      'transactions': STORES.transactions,
      'accounts': STORES.accounts,
      'profiles': STORES.users,
      'customers': STORES.customers,
      'inventory': STORES.inventory,
      'suppliers': STORES.suppliers,
      'purchase_orders': STORES.purchaseOrders,
      'stock_movements': STORES.stockMovements,
      'production_orders': STORES.productionOrders,
      'machines': STORES.machines,
      'shifts': STORES.shifts,
      'workers': STORES.workers,
      'syndicates': STORES.syndicates,
      'syndicate_members': STORES.members,
      'contributions': STORES.contributions,
      'group_buys': STORES.groupBuys,
      'funding_requests': STORES.fundingRequests,
      'wallets': STORES.wallets,
      'payments': STORES.payments,
      'wallet_transactions': STORES.walletTransactions,
    };
    return map[table] || table;
  }

  subscribeToRealtime() {
    console.log('🔌 Connecting to Real-Time events...');
    // Clean up existing channel if connected
    if (this.channel) {
      supabaseClient.removeChannel(this.channel);
    }

    this.channel = supabaseClient
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
        },
        async (payload) => {
          console.log('⚡ Real-time update received:', payload.table, payload.eventType);
          const storeName = this.tableToStore(payload.table);

          try {
            if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
              // Add/Update the incoming record into our IndexedDB
              // We set synced: true so we don't accidentally push it back up.
              const incomingData = { ...payload.new, synced: true };
              // Map Supabase IDs back to IndexedDB conventions if necessary, 
              // but Supabase uses 'id' just like IndexedDB does.

              const existing = await db.get(storeName, incomingData.id || incomingData.sku);
              if (existing) {
                await db.update(storeName, incomingData);
              } else {
                await db.add(storeName, incomingData);
              }

              // Dispatch custom event so the UI can update
              window.dispatchEvent(new CustomEvent('data-refreshed', {
                detail: { store: storeName, action: payload.eventType, data: incomingData }
              }));

            } else if (payload.eventType === 'DELETE') {
              await db.delete(storeName, payload.old.id || payload.old.sku);
              window.dispatchEvent(new CustomEvent('data-refreshed', {
                detail: { store: storeName, action: 'DELETE', key: payload.old.id || payload.old.sku }
              }));
            }
          } catch (error) {
            console.error(`❌ Failed to apply real-time update to ${storeName}:`, error);
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Real-Time Sync Active');
        }
      });
  }

  async simulateSync(item) {
    return new Promise((resolve) => {
      setTimeout(() => {
        const success = Math.random() > 0.1;
        resolve({
          success,
          timestamp: Date.now(),
          serverId: success ? `srv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` : null
        });
      }, 100 + Math.random() * 200);
    });
  }

  async syncItem(item) {
    console.log(`🔄 Syncing: ${item.action} on ${item.store}`);

    if (!isSupabaseEnabled()) {
      // No backend configured — use simulation
      return this.simulateSync(item);
    }

    try {
      const tableName = this.storeToTable(item.store);

      // We do not sync local browser settings to Supabase
      if (item.store === STORES.settings || tableName === 'settings') {
        return { success: true, timestamp: Date.now() }; // bypass safely
      }

      if (item.action === 'create' || item.action === 'update') {
        // --- OFFLINE CONFLICT RESOLUTION (Phase 13) ---
        // Before blindly overwriting the server, fetch the row to see if it changed while we were offline
        const { data: serverRecord } = await supabaseClient
          .from(tableName)
          .select('*')
          .eq(item.store === STORES.inventory ? 'sku' : 'id', item.store === STORES.inventory ? item.data.sku : item.data.id)
          .single();

        let finalData = { ...item.data };

        // Handle user -> profile column mapping (camelCase to snake_case)
        if (tableName === 'profiles') {
          if (finalData.businessName) finalData.business_name = finalData.businessName;
          if (finalData.businessType) finalData.business_type = finalData.businessType;
          if (finalData.ownerName) finalData.owner_name = finalData.ownerName;
          if (finalData.createdAt) finalData.created_at = new Date(finalData.createdAt).toISOString();

          delete finalData.businessName;
          delete finalData.businessType;
          delete finalData.ownerName;
          delete finalData.createdAt;
          delete finalData.passkeyId; // Passkeys are for local device IDB only
          delete finalData.password; // Never sync local password hash back to Supabase auth/profiles
        }

        if (serverRecord && serverRecord.local_timestamp > item.data.local_timestamp) {
          console.log(`⚠️ Conflict Detected on ${tableName}! Server is newer than local offline edit.`);
          // Basic CRDT-like merge for numbers (Inventory/Balances)
          if (tableName === 'inventory') {
            // If local quantity changed during offline, we apply the *difference* to the new server quantity
            // rather than overwriting the whole record.
            const localDifference = item.data.quantity - (item.data._offlineOriginalQuantity || 0); // Requires tracking original, but fallback to direct replace if missing
            if (item.data._offlineOriginalQuantity !== undefined) {
              finalData.quantity = Number(serverRecord.quantity) + localDifference;
              console.log(`🧮 Resolved inventory conflict. New QTY: ${finalData.quantity}`);
            }
          } else if (tableName === 'accounts' || tableName === 'wallets') {
            const localDifference = item.data.balance - (item.data._offlineOriginalBalance || 0);
            if (item.data._offlineOriginalBalance !== undefined) {
              finalData.balance = Number(serverRecord.balance) + localDifference;
              console.log(`🧮 Resolved financial conflict. New Balance: ${finalData.balance}`);
            }
          }
        }

        // Remove tracking keys before sending to server
        delete finalData._offlineOriginalQuantity;
        delete finalData._offlineOriginalBalance;

        const { error } = await supabaseClient.from(tableName).upsert(finalData);
        if (error) throw error;

      } else if (item.action === 'delete') {
        const { error } = await supabaseClient.from(tableName).delete().eq('id', item.key);
        if (error) throw error;
      }

      return { success: true, timestamp: Date.now() };
    } catch (err) {
      console.error(`❌ Supabase sync error (${item.store}):`, err.message);
      return { success: false, error: err.message };
    }
  }

  // Force immediate sync (called by user action)
  async forceSyncNow() {
    console.log('🔄 Force sync requested');

    if (!navigator.onLine) {
      return {
        success: false,
        message: 'Cannot sync while offline'
      };
    }

    await this.sync();

    return {
      success: true,
      message: 'Sync completed'
    };
  }

  // Get sync status
  async getStatus() {
    const pendingItems = await db.getPendingSyncItems();

    return {
      online: navigator.onLine,
      syncing: this.isSyncing,
      pendingItems: pendingItems.length,
      lastSyncAttempt: this.lastSyncAttempt || null,
      failedAttempts: this.failedAttempts
    };
  }
}

// Export singleton instance
const syncManager = new SyncManager();

export function initSync() {
  syncManager.init();
}

export function getSyncStatus() {
  return syncManager.getStatus();
}

export function forceSync() {
  return syncManager.forceSyncNow();
}

export default syncManager;

// src/utils/storage/indexeddb-manager.ts

/**
 * IndexedDB Manager
 *
 * Manages IndexedDB database operations with type-safe API.
 * Handles database initialization, transactions, and CRUD operations.
 */

import {
  DB_NAME,
  DB_VERSION,
  StoreNames,
  SESSION_INDEXES,
  MEMORY_CARD_INDEXES,
  MEMORY_LAYER_INDEXES,
  type IndexDefinition,
  type QueryOptions,
  type TransactionOptions,
} from '../../types/storage/indexeddb.types';

export class IndexedDBManager {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<IDBDatabase> | null = null;

  /**
   * Initialize IndexedDB
   *
   * Creates database and object stores if they don't exist
   */
  async init(): Promise<void> {
    if (this.db) {
      return; // Already initialized
    }

    if (this.initPromise) {
      await this.initPromise;
      return;
    }

    this.initPromise = this.openDatabase();
    this.db = await this.initPromise;
    this.initPromise = null;
  }

  /**
   * Open database connection
   */
  private openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        reject(new Error(`Failed to open IndexedDB: ${request.error?.message}`));
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        this.upgradeDatabase(db, event.oldVersion, event.newVersion || DB_VERSION);
      };
    });
  }

  /**
   * Upgrade database schema
   */
  private upgradeDatabase(db: IDBDatabase, oldVersion: number, newVersion: number): void {
    console.log(`📊 Upgrading IndexedDB from version ${oldVersion} to ${newVersion}`);

    // Create object stores if they don't exist
    if (!db.objectStoreNames.contains(StoreNames.SESSIONS)) {
      const sessionStore = db.createObjectStore(StoreNames.SESSIONS, { keyPath: 'id' });
      this.createIndexes(sessionStore, SESSION_INDEXES);
      console.log('  ✅ Created sessions store');
    }

    if (!db.objectStoreNames.contains(StoreNames.MEMORY_CARDS)) {
      const memoryCardStore = db.createObjectStore(StoreNames.MEMORY_CARDS, { keyPath: 'id' });
      this.createIndexes(memoryCardStore, MEMORY_CARD_INDEXES);
      console.log('  ✅ Created memoryCards store');
    }

    if (!db.objectStoreNames.contains(StoreNames.MEMORY_LAYERS)) {
      const memoryLayerStore = db.createObjectStore(StoreNames.MEMORY_LAYERS, { keyPath: 'id' });
      this.createIndexes(memoryLayerStore, MEMORY_LAYER_INDEXES);
      console.log('  ✅ Created memoryLayers store');
    }

    if (!db.objectStoreNames.contains(StoreNames.METADATA)) {
      db.createObjectStore(StoreNames.METADATA);
      console.log('  ✅ Created metadata store');
    }
  }

  /**
   * Create indexes for object store
   */
  private createIndexes(store: IDBObjectStore, indexes: IndexDefinition[]): void {
    for (const index of indexes) {
      store.createIndex(index.name, index.keyPath, index.options);
    }
  }

  /**
   * Get item by key
   */
  async get<T>(storeName: StoreNames, key: string): Promise<T | null> {
    await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onsuccess = () => {
        resolve(request.result as T || null);
      };

      request.onerror = () => {
        reject(new Error(`Failed to get item: ${request.error?.message}`));
      };
    });
  }

  /**
   * Put (insert or update) item
   */
  async put<T>(storeName: StoreNames, item: T): Promise<void> {
    await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(item);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(new Error(`Failed to put item: ${request.error?.message}`));
      };
    });
  }

  /**
   * Delete item by key
   */
  async delete(storeName: StoreNames, key: string): Promise<void> {
    await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(new Error(`Failed to delete item: ${request.error?.message}`));
      };
    });
  }

  /**
   * Get all items from store
   */
  async getAll<T>(storeName: StoreNames, options?: QueryOptions): Promise<T[]> {
    await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);

      let source: IDBObjectStore | IDBIndex = store;
      if (options?.index) {
        source = store.index(options.index);
      }

      const request = options?.range
        ? source.getAll(options.range, options?.limit)
        : source.getAll(undefined, options?.limit);

      request.onsuccess = () => {
        resolve(request.result as T[]);
      };

      request.onerror = () => {
        reject(new Error(`Failed to get all items: ${request.error?.message}`));
      };
    });
  }

  /**
   * Query items with cursor
   *
   * More flexible than getAll for large datasets
   */
  async query<T>(
    storeName: StoreNames,
    options: QueryOptions,
    callback: (item: T) => boolean | void
  ): Promise<T[]> {
    await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const results: T[] = [];
      const transaction = this.db!.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);

      let source: IDBObjectStore | IDBIndex = store;
      if (options.index) {
        source = store.index(options.index);
      }

      const request = source.openCursor(options.range, options.direction);
      let count = 0;
      let skipped = 0;

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;

        if (!cursor) {
          resolve(results);
          return;
        }

        // Skip offset
        if (options.offset && skipped < options.offset) {
          skipped++;
          cursor.continue();
          return;
        }

        // Check limit
        if (options.limit && count >= options.limit) {
          resolve(results);
          return;
        }

        const item = cursor.value as T;
        const shouldContinue = callback(item);

        if (shouldContinue !== false) {
          results.push(item);
          count++;
        }

        cursor.continue();
      };

      request.onerror = () => {
        reject(new Error(`Query failed: ${request.error?.message}`));
      };
    });
  }

  /**
   * Count items in store
   */
  async count(storeName: StoreNames, query?: IDBKeyRange): Promise<number> {
    await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = query ? store.count(query) : store.count();

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(new Error(`Count failed: ${request.error?.message}`));
      };
    });
  }

  /**
   * Clear all items from store
   */
  async clear(storeName: StoreNames): Promise<void> {
    await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(new Error(`Clear failed: ${request.error?.message}`));
      };
    });
  }

  /**
   * Batch put operations
   */
  async putBatch<T>(storeName: StoreNames, items: T[]): Promise<void> {
    await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);

      let completed = 0;
      let failed = false;

      for (const item of items) {
        const request = store.put(item);

        request.onsuccess = () => {
          completed++;
          if (completed === items.length && !failed) {
            resolve();
          }
        };

        request.onerror = () => {
          if (!failed) {
            failed = true;
            reject(new Error(`Batch put failed: ${request.error?.message}`));
          }
        };
      }
    });
  }

  /**
   * Ensure database is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.db) {
      await this.init();
    }
  }

  /**
   * Close database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  /**
   * Delete database (for testing/cleanup)
   */
  static async deleteDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase(DB_NAME);

      request.onsuccess = () => {
        console.log('🗑️  IndexedDB deleted');
        resolve();
      };

      request.onerror = () => {
        reject(new Error(`Failed to delete database: ${request.error?.message}`));
      };
    });
  }
}

/**
 * Singleton instance
 */
let managerInstance: IndexedDBManager | null = null;

export function getIndexedDBManager(): IndexedDBManager {
  if (!managerInstance) {
    managerInstance = new IndexedDBManager();
  }
  return managerInstance;
}

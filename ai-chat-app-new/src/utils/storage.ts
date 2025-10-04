/**
 * Unified Storage Management Utility
 * Consolidates storage-cleanup.ts, storage-cleaner.ts, storage-manager.ts
 */

interface SessionEntry {
  updatedAt?: number;
  createdAt?: number;
  isPinned?: boolean;
}

interface GroupSessionEntry {
  updated_at?: number;
  created_at?: number;
}

interface MemoryItem {
  timestamp?: number;
}

interface StorageData {
  state?: {
    sessions?: { _type: string; value: Array<[string, SessionEntry]> };
    groupSessions?: { _type: string; value: Array<[string, GroupSessionEntry]> };
    memoryCards?: MemoryItem[];
    memories?: MemoryItem[];
    [key: string]: unknown;
  };
  version?: number;
}

export class StorageManager {
  private static readonly STORAGE_KEY = 'ai-chat-v3-storage';
  private static readonly MAX_SESSIONS = 30;
  private static readonly MAX_GROUP_SESSIONS = 10;
  private static readonly MAX_MEMORY_CARDS = 50;
  private static readonly MAX_STORAGE_SIZE_MB = 4.5;

  /**
   * Get current storage usage information
   */
  static getStorageInfo(): {
    totalSize: number;
    sizeInMB: number;
    itemCount: number;
    mainStorageSize: number;
    percentage: number;
    isWarning: boolean;
    isCritical: boolean;
  } {
    if (typeof window === 'undefined' || !localStorage) {
      return {
        totalSize: 0,
        sizeInMB: 0,
        itemCount: 0,
        mainStorageSize: 0,
        percentage: 0,
        isWarning: false,
        isCritical: false
      };
    }

    let totalSize = 0;
    let mainStorageSize = 0;
    let itemCount = 0;

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const value = localStorage.getItem(key);
        if (value) {
          const size = new Blob([value]).size;
          totalSize += size;
          itemCount++;

          if (key === this.STORAGE_KEY) {
            mainStorageSize = size;
          }
        }
      }
    }

    const sizeInMB = totalSize / (1024 * 1024);
    const percentage = (sizeInMB / this.MAX_STORAGE_SIZE_MB) * 100;

    return {
      totalSize,
      sizeInMB,
      itemCount,
      mainStorageSize,
      percentage,
      isWarning: sizeInMB >= this.MAX_STORAGE_SIZE_MB * 0.7,
      isCritical: sizeInMB >= this.MAX_STORAGE_SIZE_MB
    };
  }

  /**
   * Smart cleanup with pinned session preservation
   */
  static cleanupLocalStorage(): void {
    if (typeof window === 'undefined' || !localStorage) return;

    try {
      const info = this.getStorageInfo();

      if (info.sizeInMB > this.MAX_STORAGE_SIZE_MB) {
        // Remove old ai-chat-v3 keys
        const keysToDelete: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('ai-chat-v3-') && key !== this.STORAGE_KEY) {
            keysToDelete.push(key);
          }
        }

        keysToDelete.forEach(key => localStorage.removeItem(key));

        // Compress main storage
        const mainData = localStorage.getItem(this.STORAGE_KEY);
        if (mainData) {
          try {
            const parsed: StorageData = JSON.parse(mainData);

            // Sessions: keep pinned + recent (max 30)
            if (parsed?.state?.sessions) {
              const sessions = parsed.state.sessions;
              if (sessions._type === 'map' && sessions.value) {
                const pinnedSessions = sessions.value.filter(s => s[1]?.isPinned);
                const unpinnedSessions = sessions.value
                  .filter(s => !s[1]?.isPinned)
                  .sort((a, b) => {
                    const aTime = a[1]?.updatedAt || a[1]?.createdAt || 0;
                    const bTime = b[1]?.updatedAt || b[1]?.createdAt || 0;
                    return bTime - aTime;
                  });

                const maxUnpinned = Math.max(this.MAX_SESSIONS - pinnedSessions.length, 10);
                sessions.value = [...pinnedSessions, ...unpinnedSessions.slice(0, maxUnpinned)];
              }
            }

            // Group sessions: keep recent (max 10)
            if (parsed?.state?.groupSessions) {
              const groupSessions = parsed.state.groupSessions;
              if (groupSessions._type === 'map' && groupSessions.value) {
                groupSessions.value = groupSessions.value
                  .sort((a, b) => {
                    const aTime = a[1]?.updated_at || a[1]?.created_at || 0;
                    const bTime = b[1]?.updated_at || b[1]?.created_at || 0;
                    return bTime - aTime;
                  })
                  .slice(0, this.MAX_GROUP_SESSIONS);
              }
            }

            // Memory cards: keep recent (max 50)
            if (parsed?.state?.memoryCards && Array.isArray(parsed.state.memoryCards)) {
              parsed.state.memoryCards = parsed.state.memoryCards
                .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
                .slice(0, this.MAX_MEMORY_CARDS);
            }

            // Memories: keep recent (max 50)
            if (parsed?.state?.memories && Array.isArray(parsed.state.memories)) {
              parsed.state.memories = parsed.state.memories
                .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
                .slice(0, this.MAX_MEMORY_CARDS);
            }

            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(parsed));
          } catch (error) {
            // Silent fail for JSON parse errors
          }
        }
      }
    } catch (error) {
      // Silent fail for storage errors
    }
  }

  /**
   * Clean up old data
   */
  static cleanupOldData(): boolean {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return true;

      const data: StorageData = JSON.parse(stored);
      let cleaned = false;

      // Clean up sessions
      if (data?.state?.sessions) {
        const sessions = data.state.sessions;
        if (sessions._type === 'map' && sessions.value) {
          if (sessions.value.length > this.MAX_SESSIONS) {
            const sortedSessions = sessions.value
              .sort((a, b) => {
                const aTime = a[1]?.updatedAt || a[1]?.createdAt || 0;
                const bTime = b[1]?.updatedAt || b[1]?.createdAt || 0;
                return bTime - aTime;
              })
              .slice(0, this.MAX_SESSIONS);

            data.state.sessions.value = sortedSessions;
            cleaned = true;
          }
        }
      }

      // Clean up group sessions
      if (data?.state?.groupSessions) {
        const groupSessions = data.state.groupSessions;
        if (groupSessions._type === 'map' && groupSessions.value) {
          if (groupSessions.value.length > this.MAX_GROUP_SESSIONS) {
            const sortedGroupSessions = groupSessions.value
              .sort((a, b) => {
                const aTime = a[1]?.updated_at || a[1]?.created_at || 0;
                const bTime = b[1]?.updated_at || b[1]?.created_at || 0;
                return bTime - aTime;
              })
              .slice(0, this.MAX_GROUP_SESSIONS);

            data.state.groupSessions.value = sortedGroupSessions;
            cleaned = true;
          }
        }
      }

      // Clean up memory cards
      if (data?.state?.memoryCards && Array.isArray(data.state.memoryCards)) {
        if (data.state.memoryCards.length > this.MAX_MEMORY_CARDS) {
          data.state.memoryCards = data.state.memoryCards
            .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
            .slice(0, this.MAX_MEMORY_CARDS);
          cleaned = true;
        }
      }

      // Clean up memories
      if (data?.state?.memories && Array.isArray(data.state.memories)) {
        if (data.state.memories.length > this.MAX_MEMORY_CARDS) {
          data.state.memories = data.state.memories
            .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
            .slice(0, this.MAX_MEMORY_CARDS);
          cleaned = true;
        }
      }

      if (cleaned) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Emergency reset - clear all data
   */
  static emergencyReset(): void {
    if (typeof window === 'undefined' || !localStorage) return;

    const keysToPreserve = [this.STORAGE_KEY];
    const keysToDelete: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('ai-chat-v3-') && !keysToPreserve.includes(key)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => localStorage.removeItem(key));
  }

  /**
   * Force clear all application data
   */
  static clearAllData(): boolean {
    try {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && key.startsWith('ai-chat-v3')) {
          localStorage.removeItem(key);
        }
      }
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if storage is approaching quota limit
   */
  static isStorageNearLimit(): boolean {
    const info = this.getStorageInfo();
    return info.sizeInMB > this.MAX_STORAGE_SIZE_MB * 0.8;
  }

  /**
   * Get storage usage report
   */
  static getUsageReport(): string {
    const info = this.getStorageInfo();
    return `ストレージ使用量: ${info.sizeInMB.toFixed(2)}MB / ${info.itemCount}項目
メインアプリデータ: ${(info.mainStorageSize / (1024 * 1024)).toFixed(2)}MB
制限値: ${this.MAX_STORAGE_SIZE_MB}MB`;
  }
}

// Auto-cleanup in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  setTimeout(() => {
    StorageManager.cleanupLocalStorage();
  }, 1000);

  setInterval(() => {
    StorageManager.cleanupLocalStorage();
  }, 5 * 60 * 1000);
}

// Global helper functions
if (typeof window !== 'undefined') {
  (window as typeof window & {
    clearAIChatStorage?: () => void;
    checkAIChatStorage?: () => ReturnType<typeof StorageManager.getStorageInfo>;
  }).clearAIChatStorage = () => {
    if (confirm('すべてのチャット履歴と設定が削除されます。続行しますか?')) {
      StorageManager.clearAllData();
      window.location.reload();
    }
  };

  (window as typeof window & {
    checkAIChatStorage?: () => ReturnType<typeof StorageManager.getStorageInfo>;
  }).checkAIChatStorage = () => {
    return StorageManager.getStorageInfo();
  };
}

// Legacy exports for compatibility
export const StorageCleaner = StorageManager;

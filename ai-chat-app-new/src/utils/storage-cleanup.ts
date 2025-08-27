// Storage cleanup utilities for managing localStorage quota
export class StorageManager {
  private static readonly STORAGE_KEY = 'ai-chat-v3-storage';
  private static readonly MAX_SESSIONS = 10;
  private static readonly MAX_MEMORY_CARDS = 100;
  private static readonly MAX_STORAGE_SIZE_MB = 4;

  /**
   * Get current storage usage information
   */
  static getStorageInfo(): {
    totalSize: number;
    sizeInMB: number;
    itemCount: number;
    mainStorageSize: number;
  } {
    if (typeof window === 'undefined' || !localStorage) {
      return { totalSize: 0, sizeInMB: 0, itemCount: 0, mainStorageSize: 0 };
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

    return {
      totalSize,
      sizeInMB: totalSize / (1024 * 1024),
      itemCount,
      mainStorageSize
    };
  }

  /**
   * Clean up old sessions and memory cards
   */
  static cleanupOldData(): boolean {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return true;

      const data = JSON.parse(stored);
      let cleaned = false;

      // Clean up sessions
      if (data?.state?.sessions) {
        const sessions = data.state.sessions;
        if (sessions._type === 'map' && sessions.value) {
          if (sessions.value.length > this.MAX_SESSIONS) {
            const sortedSessions = sessions.value
              .sort((a: any, b: any) => {
                const aTime = a[1]?.updatedAt || a[1]?.createdAt || 0;
                const bTime = b[1]?.updatedAt || b[1]?.createdAt || 0;
                return bTime - aTime;
              })
              .slice(0, this.MAX_SESSIONS);
            
            data.state.sessions.value = sortedSessions;
            cleaned = true;
            console.log(`🧹 Cleaned sessions: ${sessions.value.length} → ${sortedSessions.length}`);
          }
        }
      }

      // Clean up group sessions
      if (data?.state?.groupSessions) {
        const groupSessions = data.state.groupSessions;
        if (groupSessions._type === 'map' && groupSessions.value) {
          if (groupSessions.value.length > this.MAX_SESSIONS) {
            const sortedGroupSessions = groupSessions.value
              .sort((a: any, b: any) => {
                const aTime = a[1]?.updatedAt || a[1]?.createdAt || 0;
                const bTime = b[1]?.updatedAt || b[1]?.createdAt || 0;
                return bTime - aTime;
              })
              .slice(0, this.MAX_SESSIONS);
            
            data.state.groupSessions.value = sortedGroupSessions;
            cleaned = true;
            console.log(`🧹 Cleaned group sessions: ${groupSessions.value.length} → ${sortedGroupSessions.length}`);
          }
        }
      }

      // Clean up memory cards
      if (data?.state?.memoryCards && Array.isArray(data.state.memoryCards)) {
        if (data.state.memoryCards.length > this.MAX_MEMORY_CARDS) {
          data.state.memoryCards = data.state.memoryCards
            .sort((a: any, b: any) => (b.timestamp || 0) - (a.timestamp || 0))
            .slice(0, this.MAX_MEMORY_CARDS);
          cleaned = true;
          console.log(`🧹 Cleaned memory cards: → ${this.MAX_MEMORY_CARDS}`);
        }
      }

      // Clean up memories
      if (data?.state?.memories && Array.isArray(data.state.memories)) {
        if (data.state.memories.length > this.MAX_MEMORY_CARDS) {
          data.state.memories = data.state.memories
            .sort((a: any, b: any) => (b.timestamp || 0) - (a.timestamp || 0))
            .slice(0, this.MAX_MEMORY_CARDS);
          cleaned = true;
          console.log(`🧹 Cleaned memories: → ${this.MAX_MEMORY_CARDS}`);
        }
      }

      if (cleaned) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
        console.log('✅ Storage cleanup completed');
      }

      return true;
    } catch (error) {
      console.error('❌ Storage cleanup failed:', error);
      return false;
    }
  }

  /**
   * Force clear all application data (nuclear option)
   */
  static clearAllData(): boolean {
    try {
      // Remove all ai-chat-v3 related keys
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && key.startsWith('ai-chat-v3')) {
          localStorage.removeItem(key);
          console.log(`🗑️ Removed: ${key}`);
        }
      }
      
      console.log('✅ All application data cleared');
      return true;
    } catch (error) {
      console.error('❌ Failed to clear data:', error);
      return false;
    }
  }

  /**
   * Check if storage is approaching quota limit
   */
  static isStorageNearLimit(): boolean {
    const info = this.getStorageInfo();
    return info.sizeInMB > this.MAX_STORAGE_SIZE_MB * 0.8; // 80% of limit
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

// Global cleanup function for emergency use
(window as any).clearAIChatStorage = () => {
  if (confirm('すべてのチャット履歴と設定が削除されます。続行しますか？')) {
    StorageManager.clearAllData();
    window.location.reload();
  }
};

// Add storage monitoring to console
(window as any).checkAIChatStorage = () => {
  console.log(StorageManager.getUsageReport());
  return StorageManager.getStorageInfo();
};
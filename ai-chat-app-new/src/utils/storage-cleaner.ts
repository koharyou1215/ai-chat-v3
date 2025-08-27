/**
 * ストレージクリーナー
 * LocalStorageの容量問題を解決するためのユーティリティ
 */

export class StorageCleaner {
  /**
   * LocalStorageをクリーンアップ
   */
  static cleanupLocalStorage(): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    
    try {
      // 現在のストレージサイズを計算
      let totalSize = 0;
      for (const key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          totalSize += localStorage[key].length + key.length;
        }
      }
      
      const sizeInMB = totalSize / (1024 * 1024);
      console.log(`📊 Current localStorage size: ${sizeInMB.toFixed(2)}MB`);
      
      // 2MB以上の場合はクリーンアップ
      if (sizeInMB > 2) {
        console.log('🧹 Starting emergency cleanup...');
        
        // 古いai-chat-v3関連のデータを削除
        const keysToDelete: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('ai-chat-v3-') && key !== 'ai-chat-v3-storage') {
            keysToDelete.push(key);
          }
        }
        
        keysToDelete.forEach(key => {
          localStorage.removeItem(key);
          console.log(`🗑️ Removed: ${key}`);
        });
        
        // メインストレージのデータを圧縮
        const mainKey = 'ai-chat-v3-storage';
        const mainData = localStorage.getItem(mainKey);
        if (mainData) {
          try {
            const parsed = JSON.parse(mainData);
            
            // セッションを最新3件のみに制限
            if (parsed?.state?.sessions) {
              const sessions = parsed.state.sessions;
              if (sessions._type === 'map' && sessions.value) {
                sessions.value = sessions.value
                  .sort((a: [string, unknown], b: [string, unknown]) => {
                    const aTime = (a[1] as { updatedAt?: number; createdAt?: number })?.updatedAt || (a[1] as { updatedAt?: number; createdAt?: number })?.createdAt || 0;
                    const bTime = (b[1] as { updatedAt?: number; createdAt?: number })?.updatedAt || (b[1] as { updatedAt?: number; createdAt?: number })?.createdAt || 0;
                    return bTime - aTime;
                  })
                  .slice(0, 3);
              }
            }
            
            // グループセッションを最新2件のみに制限
            if (parsed?.state?.groupSessions) {
              const groupSessions = parsed.state.groupSessions;
              if (groupSessions._type === 'map' && groupSessions.value) {
                groupSessions.value = groupSessions.value
                  .sort((a: [string, unknown], b: [string, unknown]) => {
                    const aTime = (a[1] as { updated_at?: number; created_at?: number })?.updated_at || (a[1] as { updated_at?: number; created_at?: number })?.created_at || 0;
                    const bTime = (b[1] as { updated_at?: number; created_at?: number })?.updated_at || (b[1] as { updated_at?: number; created_at?: number })?.created_at || 0;
                    return bTime - aTime;
                  })
                  .slice(0, 2);
              }
            }
            
            // メモリカードを最新30件のみに制限
            if (parsed?.state?.memoryCards && Array.isArray(parsed.state.memoryCards)) {
              parsed.state.memoryCards = parsed.state.memoryCards
                .sort((a: { timestamp?: number }, b: { timestamp?: number }) => (b.timestamp || 0) - (a.timestamp || 0))
                .slice(0, 30);
            }
            
            // 保存
            const compressed = JSON.stringify(parsed);
            localStorage.setItem(mainKey, compressed);
            
            const newSize = compressed.length / (1024 * 1024);
            console.log(`✅ Cleanup complete: ${sizeInMB.toFixed(2)}MB → ${newSize.toFixed(2)}MB`);
          } catch (error) {
            console.error('Failed to compress storage:', error);
          }
        }
      }
    } catch (error) {
      console.error('Storage cleanup error:', error);
    }
  }
  
  /**
   * 完全にリセット（緊急時のみ）
   */
  static emergencyReset(): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    
    const keysToPreserve = ['ai-chat-v3-storage'];
    const keysToDelete: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('ai-chat-v3-') && !keysToPreserve.includes(key)) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => localStorage.removeItem(key));
    console.log('🔥 Emergency reset complete');
  }
}

// 自動クリーンアップ（開発環境のみ）
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  // ページ読み込み時にクリーンアップ
  setTimeout(() => {
    StorageCleaner.cleanupLocalStorage();
  }, 1000);
  
  // 定期的にクリーンアップ（5分ごと）
  setInterval(() => {
    StorageCleaner.cleanupLocalStorage();
  }, 5 * 60 * 1000);
}
/**
 * ローカルストレージ管理ユーティリティ
 * 容量監視と自動クリーンアップ機能を提供
 */

export class StorageManager {
  private static readonly STORAGE_KEY = 'ai-chat-v3-storage';
  private static readonly MAX_SIZE_MB = 2; // 最大2MB
  private static readonly WARNING_SIZE_MB = 1.5; // 1.5MBで警告
  
  /**
   * ストレージの使用状況を取得
   */
  static getStorageInfo(): {
    used: number;
    usedMB: number;
    percentage: number;
    isWarning: boolean;
    isCritical: boolean;
  } {
    try {
      let totalSize = 0;
      
      // 全てのローカルストレージアイテムのサイズを計算
      for (const key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          const item = localStorage.getItem(key);
          if (item) {
            totalSize += new Blob([item]).size;
          }
        }
      }
      
      const usedMB = totalSize / (1024 * 1024);
      const percentage = (usedMB / this.MAX_SIZE_MB) * 100;
      
      return {
        used: totalSize,
        usedMB,
        percentage,
        isWarning: usedMB >= this.WARNING_SIZE_MB,
        isCritical: usedMB >= this.MAX_SIZE_MB
      };
    } catch (error) {
      console.error('Failed to get storage info:', error);
      return {
        used: 0,
        usedMB: 0,
        percentage: 0,
        isWarning: false,
        isCritical: false
      };
    }
  }
  
  /**
   * 古いデータをクリーンアップ
   */
  static cleanupOldData(): boolean {
    try {
      const item = localStorage.getItem(this.STORAGE_KEY);
      if (!item) return false;
      
      const parsed = JSON.parse(item);
      if (!parsed?.state) return false;
      
      let cleaned = false;
      
      // 古いセッションを削除（最新5件のみ保持）
      if (parsed.state.sessions) {
        const sessions = this.parseMapData(parsed.state.sessions);
        if (sessions.length > 5) {
          parsed.state.sessions = this.formatMapData(
            sessions
              .sort((a, b) => (b[1]?.updatedAt || 0) - (a[1]?.updatedAt || 0))
              .slice(0, 5)
          );
          cleaned = true;
        }
      }
      
      // 古いメモリカードを削除（最新30件のみ保持）
      if (parsed.state.memoryCards && parsed.state.memoryCards.length > 30) {
        parsed.state.memoryCards = parsed.state.memoryCards
          .sort((a: { timestamp?: number }, b: { timestamp?: number }) => (b.timestamp || 0) - (a.timestamp || 0))
          .slice(0, 30);
        cleaned = true;
      }
      
      // 古いグループセッションを削除（最新3件のみ保持）
      if (parsed.state.groupSessions) {
        const groupSessions = this.parseMapData(parsed.state.groupSessions);
        if (groupSessions.length > 3) {
          parsed.state.groupSessions = this.formatMapData(
            groupSessions
              .sort((a, b) => (b[1]?.updated_at || 0) - (a[1]?.updated_at || 0))
              .slice(0, 3)
          );
          cleaned = true;
        }
      }
      
      // 古いチャット履歴を削除（30日以上前のものを削除）
      const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
      if (parsed.state.sessions) {
        const sessions = this.parseMapData(parsed.state.sessions);
        const filteredSessions = sessions.filter(([_, session]: [string, unknown]) => {
          const sessionTime = (session as { updatedAt?: number; createdAt?: number })?.updatedAt || (session as { updatedAt?: number; createdAt?: number })?.createdAt || 0;
          return sessionTime > thirtyDaysAgo;
        });
        
        if (filteredSessions.length < sessions.length) {
          parsed.state.sessions = this.formatMapData(filteredSessions);
          cleaned = true;
        }
      }
      
      if (cleaned) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(parsed));
        console.log('🧹 Storage cleaned up successfully');
      }
      
      return cleaned;
    } catch (error) {
      console.error('Failed to cleanup storage:', error);
      return false;
    }
  }
  
  /**
   * キャッシュをクリア（設定は保持）
   */
  static clearCache(): void {
    try {
      const item = localStorage.getItem(this.STORAGE_KEY);
      if (!item) return;
      
      const parsed = JSON.parse(item);
      if (!parsed?.state) return;
      
      // 設定関連のデータのみ保持
      const preservedState = {
        apiConfig: parsed.state.apiConfig,
        voice: parsed.state.voice,
        systemPrompts: parsed.state.systemPrompts,
        characters: parsed.state.characters,
        personas: parsed.state.personas,
        selectedCharacterId: parsed.state.selectedCharacterId,
        selectedPersonaId: parsed.state.selectedPersonaId
      };
      
      // 最小限のデータで再構築
      const newState = {
        ...preservedState,
        sessions: { _type: 'map', value: [] },
        groupSessions: { _type: 'map', value: [] },
        memoryCards: [],
        trackers: { _type: 'map', value: [] }
      };
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify({ 
        state: newState,
        version: parsed.version || 0
      }));
      
      console.log('🗑️ Cache cleared successfully (settings preserved)');
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  }
  
  /**
   * 完全リセット（全データ削除）
   */
  static fullReset(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
      console.log('💥 All data cleared');
    } catch (error) {
      console.error('Failed to reset storage:', error);
    }
  }
  
  // ヘルパー関数
  private static parseMapData(data: unknown): Array<[string, unknown]> {
    if (data instanceof Map) {
      return Array.from(data.entries());
    }
    if (data?._type === 'map' && data.value) {
      return data.value;
    }
    return [];
  }
  
  private static formatMapData(entries: Array<[string, unknown]>): { _type: string; value: Array<[string, unknown]> } {
    return { _type: 'map', value: entries };
  }
}
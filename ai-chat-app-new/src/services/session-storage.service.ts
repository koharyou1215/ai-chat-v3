import { UUID, TrackerInstance, MemoryCard, UnifiedChatSession, Character, TrackerHistoryEntry, TrackerDefinition } from '@/types';

/**
 * セッションストレージサービス
 * セッションごとのトラッカー値とメモリーカードを管理し、
 * マスターキャラクター定義への上書きを防ぐ
 */
export class SessionStorageService {
  private static instance: SessionStorageService;
  private sessionTrackers: Map<UUID, Map<UUID, TrackerInstance>>;
  private sessionMemoryCards: Map<UUID, Map<UUID, MemoryCard>>;
  private readonly STORAGE_PREFIX = 'ai-chat-session-data';

  private constructor() {
    this.sessionTrackers = new Map();
    this.sessionMemoryCards = new Map();
    this.loadFromLocalStorage();
  }

  static getInstance(): SessionStorageService {
    if (!SessionStorageService.instance) {
      SessionStorageService.instance = new SessionStorageService();
    }
    return SessionStorageService.instance;
  }

  /**
   * セッション用のトラッカーインスタンスを取得
   */
  getSessionTrackers(sessionId: UUID): Map<UUID, TrackerInstance> {
    if (!this.sessionTrackers.has(sessionId)) {
      this.sessionTrackers.set(sessionId, new Map());
    }
    return this.sessionTrackers.get(sessionId)!;
  }

  /**
   * セッション用のメモリーカードを取得
   */
  getSessionMemoryCards(sessionId: UUID): Map<UUID, MemoryCard> {
    if (!this.sessionMemoryCards.has(sessionId)) {
      this.sessionMemoryCards.set(sessionId, new Map());
    }
    return this.sessionMemoryCards.get(sessionId)!;
  }

  /**
   * トラッカーインスタンスを保存（セッション固有）
   */
  saveTrackerInstance(sessionId: UUID, tracker: TrackerInstance): void {
    const sessionTrackers = this.getSessionTrackers(sessionId);
    sessionTrackers.set(tracker.id, tracker);
    this.saveToLocalStorage();
  }

  /**
   * メモリーカードを保存（セッション固有）
   */
  saveMemoryCard(sessionId: UUID, memoryCard: MemoryCard): void {
    const sessionMemoryCards = this.getSessionMemoryCards(sessionId);
    sessionMemoryCards.set(memoryCard.id, memoryCard);
    this.saveToLocalStorage();
  }

  /**
   * トラッカーインスタンスを更新（セッション固有）
   */
  updateTrackerValue(sessionId: UUID, instanceId: UUID, newValue: unknown, reason?: string): void {
    const sessionTrackers = this.getSessionTrackers(sessionId);
    const instance = sessionTrackers.get(instanceId);

    if (!instance) {
      console.warn(`Tracker instance ${instanceId} not found in session ${sessionId}`);
      return;
    }

    // インスタンスを更新
    instance.current_value = newValue;
    instance.updated_at = new Date().toISOString();
    instance.version = instance.version + 1;

    // 履歴に追加（必要に応じて）
    if (instance.history) {
      const historyEntry: TrackerHistoryEntry = {
        id: `history-${Date.now()}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        version: 1,
        timestamp: new Date().toISOString(),
        value: newValue,
        changed_by: 'user',
        reason: reason || '手動更新',
        metadata: {}
      };
      instance.history.push(historyEntry);
    }

    sessionTrackers.set(instanceId, instance);
    this.saveToLocalStorage();
  }

  /**
   * セッションデータをクリア
   */
  clearSessionData(sessionId: UUID): void {
    this.sessionTrackers.delete(sessionId);
    this.sessionMemoryCards.delete(sessionId);
    this.saveToLocalStorage();
  }

  /**
   * セッションデータをマージ（インポート用）
   */
  mergeSessionData(sessionId: UUID, data: {
    trackers?: TrackerInstance[],
    memoryCards?: MemoryCard[]
  }): void {
    if (data.trackers) {
      const sessionTrackers = this.getSessionTrackers(sessionId);
      data.trackers.forEach(tracker => {
        sessionTrackers.set(tracker.id, tracker);
      });
    }

    if (data.memoryCards) {
      const sessionMemoryCards = this.getSessionMemoryCards(sessionId);
      data.memoryCards.forEach(card => {
        sessionMemoryCards.set(card.id, card);
      });
    }

    this.saveToLocalStorage();
  }

  /**
   * セッションデータをエクスポート
   */
  exportSessionData(sessionId: UUID): {
    trackers: TrackerInstance[],
    memoryCards: MemoryCard[]
  } {
    const trackers = Array.from(this.getSessionTrackers(sessionId).values());
    const memoryCards = Array.from(this.getSessionMemoryCards(sessionId).values());

    return {
      trackers,
      memoryCards
    };
  }

  /**
   * キャラクター定義からトラッカー定義のみを抽出
   * （実行時の値は含まない）
   */
  extractTrackerDefinitions(character: Character): Record<string, unknown>[] {
    if (!character.trackers || !Array.isArray(character.trackers)) {
      return [];
    }

    return character.trackers.map((tracker: TrackerDefinition) => {
      // current_value、value、履歴などの実行時データを除外
      const { current_value, value, history, last_updated, ...definition } = tracker as TrackerDefinition & { current_value?: unknown; value?: unknown; history?: unknown; last_updated?: unknown };
      return definition;
    });
  }

  /**
   * ローカルストレージから読み込み
   */
  private loadFromLocalStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem(`${this.STORAGE_PREFIX}-data`);
      if (stored) {
        const data = JSON.parse(stored);

        // トラッカーデータを復元
        if (data.trackers) {
          this.sessionTrackers = new Map(
            Object.entries(data.trackers).map(([sessionId, trackers]) => [
              sessionId,
              new Map(Object.entries(trackers as Record<string, TrackerInstance>))
            ])
          );
        }

        // メモリーカードデータを復元
        if (data.memoryCards) {
          this.sessionMemoryCards = new Map(
            Object.entries(data.memoryCards).map(([sessionId, cards]) => [
              sessionId,
              new Map(Object.entries(cards as Record<string, MemoryCard>))
            ])
          );
        }

        console.log('✅ Session storage loaded successfully');
      }
    } catch (error) {
      console.error('Failed to load session storage:', error);
    }
  }

  /**
   * ローカルストレージに保存
   */
  private saveToLocalStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      const data = {
        trackers: Object.fromEntries(
          Array.from(this.sessionTrackers.entries()).map(([sessionId, trackers]) => [
            sessionId,
            Object.fromEntries(trackers)
          ])
        ),
        memoryCards: Object.fromEntries(
          Array.from(this.sessionMemoryCards.entries()).map(([sessionId, cards]) => [
            sessionId,
            Object.fromEntries(cards)
          ])
        ),
        savedAt: new Date().toISOString()
      };

      localStorage.setItem(`${this.STORAGE_PREFIX}-data`, JSON.stringify(data));
      console.log('✅ Session storage saved successfully');
    } catch (error) {
      console.error('Failed to save session storage:', error);
    }
  }

  /**
   * セッションごとの統計情報を取得
   */
  getSessionStatistics(sessionId: UUID): {
    trackerCount: number,
    memoryCardCount: number,
    lastUpdated: string | null
  } {
    const trackers = this.getSessionTrackers(sessionId);
    const memoryCards = this.getSessionMemoryCards(sessionId);

    let lastUpdated: string | null = null;

    // 最終更新日時を取得
    trackers.forEach(tracker => {
      if (!lastUpdated || tracker.updated_at > lastUpdated) {
        lastUpdated = tracker.updated_at;
      }
    });

    memoryCards.forEach(card => {
      if (!lastUpdated || card.updated_at > lastUpdated) {
        lastUpdated = card.updated_at;
      }
    });

    return {
      trackerCount: trackers.size,
      memoryCardCount: memoryCards.size,
      lastUpdated
    };
  }

  /**
   * すべてのセッションIDを取得
   */
  getAllSessionIds(): UUID[] {
    const trackerSessionIds = Array.from(this.sessionTrackers.keys());
    const memorySessionIds = Array.from(this.sessionMemoryCards.keys());

    // 重複を除いたセッションIDのリストを返す
    return Array.from(new Set([...trackerSessionIds, ...memorySessionIds]));
  }

  /**
   * 古いセッションデータをクリーンアップ
   */
  cleanupOldSessions(daysToKeep: number = 30): void {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    const cutoffTimestamp = cutoffDate.toISOString();

    const sessionIds = this.getAllSessionIds();
    let cleanedCount = 0;

    sessionIds.forEach(sessionId => {
      const stats = this.getSessionStatistics(sessionId);

      if (stats.lastUpdated && stats.lastUpdated < cutoffTimestamp) {
        this.clearSessionData(sessionId);
        cleanedCount++;
      }
    });

    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned up ${cleanedCount} old sessions`);
      this.saveToLocalStorage();
    }
  }
}

// シングルトンインスタンスをエクスポート
export const sessionStorageService = SessionStorageService.getInstance();
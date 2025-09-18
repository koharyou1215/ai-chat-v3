import { StateCreator } from "zustand";
import { UUID, Character } from "@/types";
import { AppStore } from "@/store";
import { TrackerManager } from "@/services/tracker/tracker-manager";

export interface TrackerIntegration {
  trackerManagers: Map<UUID, TrackerManager>;
  
  // トラッカー管理操作
  initializeTrackerForCharacter: (character: Character) => Promise<void>;
  getTrackerManager: (characterId: UUID) => TrackerManager | undefined;
  updateTrackerValues: (characterId: UUID, updates: Record<string, number>) => void;
  resetTrackerForCharacter: (characterId: UUID) => void;
  cleanupUnusedTrackers: (activeCharacterIds: UUID[]) => void;
}

/**
 * トラッカー統合モジュール
 * 🔧 修正: キャラクターIDベースで統一管理
 * - セッションごとではなく、キャラクターごとにトラッカーを管理
 * - 同一キャラクターの複数セッション間でトラッカー状態を共有
 */
export const createTrackerIntegration: StateCreator<
  AppStore,
  [],
  [],
  TrackerIntegration
> = (set, get) => ({
  trackerManagers: new Map(),

  /**
   * キャラクターのトラッカーを初期化
   */
  initializeTrackerForCharacter: async (character: Character) => {
    const trackerManagers = get().trackerManagers;
    
    // 既に初期化済みの場合はスキップ
    if (trackerManagers.has(character.id)) {
      console.log(`✅ Tracker already initialized for character: ${character.name}`);
      return;
    }

    try {
      // TrackerManagerの動的インポート
      const { TrackerManager } = await import(
        "@/services/tracker/tracker-manager"
      );
      
      const trackerManager = new TrackerManager();
      
      // キャラクターのトラッカー設定を初期化
      if (character.trackers && character.trackers.length > 0) {
        trackerManager.initializeTrackerSet(character.id, character.trackers);
        console.log(
          `🎯 Initialized ${character.trackers.length} trackers for character: ${character.name}`
        );
      } else {
        console.log(
          `ℹ️ No trackers defined for character: ${character.name}`
        );
      }
      
      // Mapに追加
      trackerManagers.set(character.id, trackerManager);
      
      // ストアを更新
      set({
        trackerManagers: new Map(trackerManagers),
      });
      
    } catch (error) {
      console.error(
        `❌ Failed to initialize tracker for character ${character.name}:`,
        error
      );
    }
  },

  /**
   * 指定されたキャラクターIDのトラッカーマネージャーを取得
   */
  getTrackerManager: (characterId: UUID): TrackerManager | undefined => {
    const trackerManagers = get().trackerManagers;
    
    if (trackerManagers instanceof Map) {
      return trackerManagers.get(characterId);
    } else if (typeof trackerManagers === "object") {
      // 後方互換性のため、オブジェクト形式もサポート
      return (trackerManagers as any)[characterId];
    }
    
    return undefined;
  },

  /**
   * トラッカーの値を更新
   */
  updateTrackerValues: (characterId: UUID, updates: Record<string, number>) => {
    const trackerManager = get().getTrackerManager(characterId);
    
    if (!trackerManager) {
      console.warn(`⚠️ No tracker manager found for character: ${characterId}`);
      return;
    }
    
    // 各トラッカーの値を更新
    Object.entries(updates).forEach(([trackerName, value]) => {
      try {
        const trackerSet = trackerManager.getTrackerSet(characterId);
        const currentValue = trackerSet?.getValue(trackerName);
        
        if (currentValue !== undefined) {
          const numericValue = typeof value === 'number' ? value : 0;
          const numericCurrent = typeof currentValue === 'number' ? currentValue : 0;
          trackerManager.updateTracker(
            characterId,
            trackerName,
            { numeric: numericValue - numericCurrent } as TrackerValue // 差分を計算して更新
          );
          console.log(
            `📊 Updated tracker "${trackerName}" for character ${characterId}: ${currentValue} → ${value}`
          );
        } else {
          console.warn(
            `⚠️ Tracker "${trackerName}" not found for character ${characterId}`
          );
        }
      } catch (error) {
        console.error(
          `❌ Failed to update tracker "${trackerName}":`,
          error
        );
      }
    });
    
    // ストアを更新して再レンダリングをトリガー
    set({
      trackerManagers: new Map(get().trackerManagers),
    });
  },

  /**
   * キャラクターのトラッカーをリセット
   */
  resetTrackerForCharacter: (characterId: UUID) => {
    const sessions = get().sessions;
    let character: Character | undefined;
    
    // セッションからキャラクター情報を取得
    for (const session of sessions.values()) {
      const foundCharacter = session.participants.characters.find(
        (c) => c.id === characterId
      );
      if (foundCharacter) {
        character = foundCharacter;
        break;
      }
    }
    
    if (!character) {
      console.warn(`⚠️ Character not found: ${characterId}`);
      return;
    }
    
    const trackerManager = get().getTrackerManager(characterId);
    
    if (trackerManager && character.trackers) {
      // 全てのトラッカーを初期値にリセット
      trackerManager.initializeTrackerSet(characterId, character.trackers);
      console.log(`🔄 Reset all trackers for character: ${character.name}`);
      
      // ストアを更新
      set({
        trackerManagers: new Map(get().trackerManagers),
      });
    }
  },

  /**
   * 使用されていないトラッカーをクリーンアップ
   * メモリリーク防止のため、アクティブでないキャラクターのトラッカーを削除
   */
  cleanupUnusedTrackers: (activeCharacterIds: UUID[]) => {
    const trackerManagers = get().trackerManagers;
    const activeSet = new Set(activeCharacterIds);
    const beforeSize = trackerManagers.size;
    
    // アクティブでないキャラクターのトラッカーを削除
    for (const characterId of trackerManagers.keys()) {
      if (!activeSet.has(characterId)) {
        trackerManagers.delete(characterId);
        console.log(`🧹 Cleaned up tracker for inactive character: ${characterId}`);
      }
    }
    
    const cleanedCount = beforeSize - trackerManagers.size;
    if (cleanedCount > 0) {
      console.log(
        `📊 Tracker cleanup: Removed ${cleanedCount} inactive trackers (${trackerManagers.size} remaining)`
      );
      
      // ストアを更新
      set({
        trackerManagers: new Map(trackerManagers),
      });
    }
  },
});

/**
 * トラッカー統合ヘルパー関数
 */
export class TrackerIntegrationHelper {
  /**
   * プロンプト用のトラッカー情報を取得
   */
  static getTrackersForPrompt(
    trackerManager: TrackerManager | undefined,
    characterId: UUID
  ): string | null {
    if (!trackerManager) return null;
    
    try {
      // 詳細版を試行、失敗したら軽量版にフォールバック
      let trackerInfo = trackerManager.getDetailedTrackersForPrompt?.(characterId);
      
      if (!trackerInfo) {
        trackerInfo = TrackerIntegrationHelper.getEssentialTrackerInfo(
          trackerManager,
          characterId
        );
      }
      
      return trackerInfo;
    } catch (error) {
      console.warn("Failed to get tracker info for prompt:", error);
      return null;
    }
  }
  
  /**
   * 軽量トラッカー情報取得 - 重要な関係値のみ抽出
   */
  static getEssentialTrackerInfo(
    trackerManager: TrackerManager,
    characterId: string
  ): string | null {
    try {
      const trackers = trackerManager.getTrackersForPrompt(characterId);
      if (!trackers) return null;

      // 重要な関係性トラッカーのみ抽出（パフォーマンス優先）
      const essentialPatterns = [
        /好感度|affection|liking/i,
        /信頼度|trust/i,
        /親密度|intimacy/i,
        /恋愛度|romance/i,
        /友情|friendship/i,
        /mood|気分|機嫌/i,
      ];

      const lines = trackers.split("\n");
      const essentialLines = lines.filter((line) =>
        essentialPatterns.some((pattern) => pattern.test(line))
      );

      return essentialLines.length > 0 ? essentialLines.join("\n") : null;
    } catch (error) {
      console.warn("Error getting essential tracker info:", error);
      return null;
    }
  }
  
  /**
   * メッセージからトラッカー更新を分析
   */
  static async analyzeMessageForTrackerUpdate(
    trackerManager: TrackerManager,
    message: any,
    characterId: UUID
  ): Promise<Array<{ name: string; change: number }>> {
    if (!trackerManager) return [];
    
    try {
      const updates = await trackerManager.analyzeMessageForTrackerUpdates(
        message,
        characterId
      );
      
      if (updates && updates.length > 0) {
        console.log(
          `🎯 Found ${updates.length} tracker updates from message analysis`
        );
      }
      
      return updates || [];
    } catch (error) {
      console.error("Failed to analyze message for tracker updates:", error);
      return [];
    }
  }
}
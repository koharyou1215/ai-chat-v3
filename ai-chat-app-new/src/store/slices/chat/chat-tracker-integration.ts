import { StateCreator } from "zustand";
import { UUID, Character, UnifiedMessage, TrackerDefinition } from "@/types";
import { AppStore } from "@/store";
import { TrackerManager } from "@/services/tracker/tracker-manager";

// Internal Tracker type matching TrackerManager's internal type
type Tracker = TrackerDefinition & {
  current_value: string | number | boolean;
};

export interface TrackerIntegration {
  // 🔧 修正: キャラクター単位からセッション単位に変更
  trackerManagers: Map<UUID, TrackerManager>;  // sessionId → TrackerManager

  // トラッカー管理操作（セッション単位）
  initializeTrackerForSession: (sessionId: UUID, character: Character) => Promise<void>;
  getTrackerManager: (sessionId: UUID) => TrackerManager | undefined;
  updateTrackerValues: (sessionId: UUID, updates: Record<string, number>) => void;
  resetTrackerForSession: (sessionId: UUID) => void;
  cleanupUnusedTrackers: (activeSessionIds: UUID[]) => void;
}

/**
 * トラッカー統合モジュール
 * 🔧 修正: セッションIDベースで統一管理
 * - キャラクターごとではなく、セッションごとにトラッカーを管理
 * - 同一キャラクターの複数セッション間でトラッカー状態を独立
 * - 新しいセッション作成時に必ず initial_value にリセット
 */
export const createTrackerIntegration: StateCreator<
  AppStore,
  [],
  [],
  TrackerIntegration
> = (set, get) => ({
  trackerManagers: new Map(),

  /**
   * セッションのトラッカーを初期化
   * 🔧 修正: セッションIDで管理、同じキャラクターでも新しいセッションなら新規作成
   * 🔧 修正: 既存のTrackerManagerがある場合は保護（永続化データを保持）
   */
  initializeTrackerForSession: async (sessionId: UUID, character: Character) => {
    const trackerManagers = get().trackerManagers;

    // 既に初期化済みの場合はスキップ
    if (trackerManagers.has(sessionId)) {
      const existing = trackerManagers.get(sessionId);

      // 既存のTrackerManagerが有効なデータを持っているかチェック
      if (existing && typeof existing.getTrackerSet === 'function') {
        const trackerSet = existing.getTrackerSet(character.id);
        const hasTrackers = trackerSet && trackerSet.trackers && trackerSet.trackers.size > 0;

        console.log(`✅ Tracker already initialized for session: ${sessionId}`, {
          hasValidTrackerSet: !!trackerSet,
          trackerCount: trackerSet?.trackers?.size || 0,
          willPreserve: hasTrackers
        });

        // 有効なトラッカーデータがある場合は保持
        if (hasTrackers) {
          return;
        }

        // 空のTrackerManagerの場合は再初期化
        console.log(`⚠️ TrackerManager exists but empty, re-initializing for session: ${sessionId}`);
      }
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
          `🎯 Initialized ${character.trackers.length} trackers for session: ${sessionId} (character: ${character.name})`
        );
      } else {
        console.log(
          `ℹ️ No trackers defined for session: ${sessionId} (character: ${character.name})`
        );
      }

      // Mapに追加（sessionIdで保存）
      trackerManagers.set(sessionId, trackerManager);

      // ストアを更新
      set({
        trackerManagers: new Map(trackerManagers),
      });

    } catch (error) {
      console.error(
        `❌ Failed to initialize tracker for session ${sessionId}:`,
        error
      );
    }
  },

  /**
   * 指定されたセッションIDのトラッカーマネージャーを取得
   * 🔧 修正: characterId → sessionId
   */
  getTrackerManager: (sessionId: UUID): TrackerManager | undefined => {
    const trackerManagers = get().trackerManagers;

    if (trackerManagers instanceof Map) {
      return trackerManagers.get(sessionId);
    } else if (typeof trackerManagers === "object") {
      // 後方互換性のため、オブジェクト形式もサポート
      return (trackerManagers as Record<UUID, TrackerManager>)[sessionId];
    }

    return undefined;
  },

  /**
   * トラッカーの値を更新
   * 🔧 修正: sessionIdからcharacterIdを取得
   */
  updateTrackerValues: (sessionId: UUID, updates: Record<string, number>) => {
    const trackerManager = get().getTrackerManager(sessionId);

    if (!trackerManager) {
      console.warn(`⚠️ No tracker manager found for session: ${sessionId}`);
      return;
    }

    // セッションからキャラクターIDを取得
    const session = get().sessions.get(sessionId);
    if (!session || session.participants.characters.length === 0) {
      console.warn(`⚠️ No character found in session: ${sessionId}`);
      return;
    }

    const characterId = session.participants.characters[0].id;

    // 各トラッカーの値を更新
    Object.entries(updates).forEach(([trackerName, value]) => {
      try {
        const trackerSet = trackerManager.getTrackerSet(characterId);
        let tracker: Tracker | null = null;
        let currentValue: unknown = undefined;

        // Mapをイテレートして特定のトラッカーを探す
        if (trackerSet?.trackers instanceof Map) {
          trackerSet.trackers.forEach((t: Tracker, key: string) => {
            if (key === trackerName || t.name === trackerName) {
              tracker = t;
              currentValue = t.current_value;
            }
          });
        }

        if (currentValue !== undefined) {
          const numericValue = typeof value === 'number' ? value : 0;
          const numericCurrent = typeof currentValue === 'number' ? currentValue : 0;
          trackerManager.updateTracker(
            characterId,
            trackerName,
            numericValue - numericCurrent // 差分を計算して更新
          );
          console.log(
            `📊 Updated tracker "${trackerName}" for session ${sessionId}: ${currentValue} → ${value}`
          );
        } else {
          console.warn(
            `⚠️ Tracker "${trackerName}" not found in session ${sessionId}`
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
   * セッションのトラッカーをリセット
   * 🔧 修正: sessionId → characterを取得 → リセット
   */
  resetTrackerForSession: (sessionId: UUID) => {
    const session = get().sessions.get(sessionId);

    if (!session || session.participants.characters.length === 0) {
      console.warn(`⚠️ Session or character not found: ${sessionId}`);
      return;
    }

    const character = session.participants.characters[0];
    const trackerManager = get().getTrackerManager(sessionId);

    if (trackerManager && character.trackers) {
      // 全てのトラッカーを初期値にリセット
      trackerManager.initializeTrackerSet(character.id, character.trackers);
      console.log(`🔄 Reset all trackers for session: ${sessionId} (character: ${character.name})`);

      // ストアを更新
      set({
        trackerManagers: new Map(get().trackerManagers),
      });
    }
  },

  /**
   * 使用されていないトラッカーをクリーンアップ
   * 🔧 修正: アクティブでないセッションのトラッカーを削除
   */
  cleanupUnusedTrackers: (activeSessionIds: UUID[]) => {
    const trackerManagers = get().trackerManagers;
    const activeSet = new Set(activeSessionIds);
    const beforeSize = trackerManagers.size;

    // アクティブでないセッションのトラッカーを削除
    for (const sessionId of trackerManagers.keys()) {
      if (!activeSet.has(sessionId)) {
        trackerManagers.delete(sessionId);
        console.log(`🧹 Cleaned up tracker for inactive session: ${sessionId}`);
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
      let trackerInfo: string | null = trackerManager.getDetailedTrackersForPrompt?.(characterId) || null;

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
    message: UnifiedMessage,
    characterId: UUID
  ): Promise<Array<{ name: string; change: number }>> {
    if (!trackerManager) return [];

    try {
      const internalUpdates = await trackerManager.analyzeMessageForTrackerUpdates(
        message,
        characterId
      );

      // InternalTrackerUpdateを{ name: string; change: number }に変換
      const updates = internalUpdates.map(update => ({
        name: update.tracker_name,
        change: typeof update.new_value === 'number' && typeof update.old_value === 'number'
          ? update.new_value - update.old_value
          : 0
      }));

      if (updates && updates.length > 0) {
        console.log(
          `🎯 Found ${updates.length} tracker updates from message analysis`
        );
      }

      return updates;
    } catch (error) {
      console.error("Failed to analyze message for tracker updates:", error);
      return [];
    }
  }
}
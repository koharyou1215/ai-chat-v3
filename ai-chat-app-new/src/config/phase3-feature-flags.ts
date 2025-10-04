/**
 * Phase 3: Chat Operations リファクタリング用 Feature Flags
 *
 * 既存機能を保護しながら新実装を段階的にロールアウトするための設定
 */

export interface Phase3FeatureFlags {
  /**
   * Phase 3.4: 新しい Send Handler を使用するかどうか
   *
   * - true: operations/message-send-handler.ts を使用
   * - false: 既存の sendMessage 実装を使用
   *
   * @default false (安全のため)
   */
  USE_NEW_SEND_HANDLER: boolean;

  /**
   * デバッグモード: 両方の実装を比較
   *
   * - true: 新旧両方を実行し、結果を比較（開発環境のみ）
   * - false: 通常動作
   *
   * @default false
   */
  DEBUG_COMPARE_IMPLEMENTATIONS: boolean;

  /**
   * パフォーマンスロギング
   *
   * - true: 実行時間をコンソールに出力
   * - false: ロギングなし
   *
   * @default false
   */
  ENABLE_PERFORMANCE_LOGGING: boolean;
}

/**
 * Phase 3 Feature Flags のデフォルト設定
 */
export const PHASE3_FEATURE_FLAGS: Phase3FeatureFlags = {
  USE_NEW_SEND_HANDLER: true, // Phase 3.5完了: 新実装をデフォルトで使用
  DEBUG_COMPARE_IMPLEMENTATIONS: false,
  ENABLE_PERFORMANCE_LOGGING: false,
};

/**
 * Feature Flag の状態をログ出力（開発環境のみ）
 */
export const logFeatureFlagStatus = (): void => {
  if (process.env.NODE_ENV === 'development') {
    console.log('🚩 Phase 3 Feature Flags:', PHASE3_FEATURE_FLAGS);
  }
};

/**
 * Feature Flag を動的に変更（開発環境のみ）
 */
export const updateFeatureFlag = <K extends keyof Phase3FeatureFlags>(
  key: K,
  value: Phase3FeatureFlags[K]
): void => {
  if (process.env.NODE_ENV === 'development') {
    PHASE3_FEATURE_FLAGS[key] = value;
    console.log(`🚩 Feature Flag updated: ${key} = ${value}`);
  } else {
    console.warn('⚠️ Feature flags can only be changed in development mode');
  }
};

/**
 * ブラウザコンソールからアクセス可能にする（開発環境のみ）
 */
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).PHASE3_FLAGS = {
    get: () => PHASE3_FEATURE_FLAGS,
    set: updateFeatureFlag,
    log: logFeatureFlagStatus,
  };
  console.log('💡 Feature Flags available: window.PHASE3_FLAGS.get()');
}

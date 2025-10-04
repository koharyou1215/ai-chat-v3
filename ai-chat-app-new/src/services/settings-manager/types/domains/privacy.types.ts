/**
 * プライバシー設定型定義
 * Privacy Settings Type Definitions
 *
 * データ保存、分析、Cookie、感情知能エンジンに関する型定義
 *
 * @module PrivacyTypes
 * @version Phase 2.2
 */

// ═══════════════════════════════════════════════════════════════════
// プライバシー設定型
// ═══════════════════════════════════════════════════════════════════

/**
 * プライバシー設定
 *
 * データ保存、分析、Cookie等のプライバシー関連設定
 */
export interface PrivacySettings {
  /** 履歴保存 */
  saveHistory: boolean;

  /** 分析データ共有 */
  shareAnalytics: boolean;

  /** Cookie許可 */
  allowCookies: boolean;
}

// ═══════════════════════════════════════════════════════════════════
// 感情知能エンジン設定型
// ═══════════════════════════════════════════════════════════════════

/**
 * 感情分析レイヤー設定
 *
 * Phase 2.2で統合された多層感情分析管理構造
 */
export interface EmotionalAnalysisSettings {
  /** 基本感情分析 */
  basic: boolean;

  /** 文脈分析 */
  contextual: boolean;

  /** 予測分析 */
  predictive: boolean;

  /** 多層分析 */
  multiLayer: boolean;
}

/**
 * 感情知能エンジン設定
 *
 * Phase 2.2: 感情知能エンジンの統合設定
 * 分析レイヤー、メモリー、パフォーマンス設定を管理
 */
export interface EmotionalIntelligenceSettings {
  /** マスタースイッチ - 感情知能エンジン全体の有効化 */
  enabled: boolean;

  /** 分析レイヤー設定 */
  analysis: EmotionalAnalysisSettings;

  /** メモリー機能有効化 - 感情履歴の記憶 */
  memoryEnabled: boolean;

  /** アダプティブパフォーマンス - 負荷に応じた自動調整 */
  adaptivePerformance: boolean;

  /** セーフモード - エラー時の安全な動作 */
  safeMode: boolean;

  /** パフォーマンス監視 - 性能メトリクスの記録 */
  performanceMonitoring: boolean;

  /** デバッグモード - 詳細ログ出力 */
  debugMode: boolean;

  /** レガシーフォールバック - 旧システムへの自動切り替え */
  fallbackToLegacy: boolean;

  // ═══════════════════════════════════
  // 🔄 Phase 2.2: 後方互換性（非推奨）
  // ═══════════════════════════════════

  /** @deprecated Phase 2.2: analysis.basic を使用してください */
  emotionAnalysisEnabled?: boolean;

  /** @deprecated Phase 2.2: memoryEnabled を使用してください */
  emotionalMemoryEnabled?: boolean;

  /** @deprecated Phase 2.2: REMOVED - displayMode を使用してください */
  basicEffectsEnabled?: boolean;

  /** @deprecated Phase 2.2: analysis.contextual を使用してください */
  contextualAnalysisEnabled?: boolean;

  /** @deprecated Phase 2.2: adaptivePerformance を使用してください (same field) */
  adaptivePerformanceEnabled?: boolean;

  /** @deprecated Phase 2.2: REMOVED - displayMode を使用してください */
  visualEffectsEnabled?: boolean;

  /** @deprecated Phase 2.2: analysis.predictive を使用してください */
  predictiveAnalysisEnabled?: boolean;

  /** @deprecated Phase 2.2: REMOVED - displayMode を使用してください */
  advancedEffectsEnabled?: boolean;

  /** @deprecated Phase 2.2: analysis.multiLayer を使用してください */
  multiLayerAnalysisEnabled?: boolean;
}

/**
 * 統一設定型定義
 * Unified Settings Type Definitions
 *
 * すべての設定の型定義を集約したファイル
 * このファイルは型定義のみを含み、実装ロジックは含まない
 *
 * @module UnifiedSettingsTypes
 * @version Phase 2.2
 *
 * @deprecated Phase 2.2.1: このファイルは後方互換性のために残されています
 * 新しいコードでは domains/index.ts から直接インポートしてください
 *
 * @example
 * ```typescript
 * // 新しい推奨方法
 * import type { UnifiedSettings, APISettings } from './domains';
 *
 * // 非推奨（後方互換性のため動作はします）
 * import type { UnifiedSettings, APISettings } from './unified-settings.types';
 * ```
 */

// ═══════════════════════════════════════════════════════════════════
// ドメイン型定義の再エクスポート
// Phase 2.2.1: 型定義をドメインごとに分割し、保守性を向上
// ═══════════════════════════════════════════════════════════════════

export type {
  // API設定型
  APIProvider,
  APISettings,
  PromptSettings,
  // UI/外観設定型
  Theme,
  Language,
  FontSize,
  FontWeight,
  LineHeight,
  LayoutDensity,
  MessageSpacing,
  MessageBorderRadius,
  ChatMaxWidth,
  SidebarWidth,
  BackgroundType,
  TransitionDuration,
  TimeFormat,
  UISettings,
  // エフェクト設定型
  EffectQuality,
  TextFormatting,
  EffectsGlowIntensity,
  ThreeDEffectsSettings,
  EmotionDisplayMode,
  EmotionSettings,
  EffectSettings,
  // チャット設定型
  ResponseFormat,
  ChatGlowIntensity,
  MemoryLimits,
  ProgressiveMode,
  ChatSettings,
  // 音声設定型
  VoiceProvider,
  VoicevoxSettings,
  ElevenLabsSettings,
  SystemVoiceSettings,
  VoiceAdvancedSettings,
  VoiceSettings,
  // 画像生成設定型
  ImageGenerationProvider,
  RunwareSettings,
  StableDiffusionSettings,
  ImageGenerationSettings,
  // プライバシー設定型
  PrivacySettings,
  EmotionalAnalysisSettings,
  EmotionalIntelligenceSettings,
  // 統合設定型
  UnifiedSettings,
} from './domains';

// ═══════════════════════════════════════════════════════════════════
// 後方互換性のための型エイリアス
// GlowIntensity型は複数のドメインで使用されているため、エイリアスを提供
// ═══════════════════════════════════════════════════════════════════

export type { ChatGlowIntensity as GlowIntensity } from './domains';

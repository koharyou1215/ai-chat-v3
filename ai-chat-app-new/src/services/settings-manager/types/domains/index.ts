/**
 * ドメイン型定義バレルエクスポート
 * Domain Type Definitions Barrel Export
 *
 * すべてのドメイン型定義を単一のエントリーポイントから再エクスポート
 * 後方互換性を維持するためのインデックスファイル
 *
 * @module DomainTypes
 * @version Phase 2.2
 */

// ═══════════════════════════════════════════════════════════════════
// API設定型
// ═══════════════════════════════════════════════════════════════════

export type { APIProvider, APISettings, PromptSettings } from './api.types';

// ═══════════════════════════════════════════════════════════════════
// UI/外観設定型
// ═══════════════════════════════════════════════════════════════════

export type {
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
} from './ui.types';

// ═══════════════════════════════════════════════════════════════════
// エフェクト設定型
// ═══════════════════════════════════════════════════════════════════

export type {
  EffectQuality,
  TextFormatting,
  GlowIntensity as EffectsGlowIntensity,
  ThreeDEffectsSettings,
  EmotionDisplayMode,
  EmotionSettings,
  EffectSettings,
} from './effects.types';

// ═══════════════════════════════════════════════════════════════════
// チャット設定型
// ═══════════════════════════════════════════════════════════════════

export type {
  ResponseFormat,
  GlowIntensity as ChatGlowIntensity,
  MemoryLimits,
  ProgressiveMode,
  ChatSettings,
} from './chat.types';

// ═══════════════════════════════════════════════════════════════════
// 音声設定型
// ═══════════════════════════════════════════════════════════════════

export type {
  VoiceProvider,
  VoicevoxSettings,
  ElevenLabsSettings,
  SystemVoiceSettings,
  VoiceAdvancedSettings,
  VoiceSettings,
} from './voice.types';

// ═══════════════════════════════════════════════════════════════════
// 画像生成設定型
// ═══════════════════════════════════════════════════════════════════

export type {
  ImageGenerationProvider,
  RunwareSettings,
  StableDiffusionSettings,
  ImageGenerationSettings,
} from './image.types';

// ═══════════════════════════════════════════════════════════════════
// プライバシー設定型
// ═══════════════════════════════════════════════════════════════════

export type {
  PrivacySettings,
  EmotionalAnalysisSettings,
  EmotionalIntelligenceSettings,
} from './privacy.types';

// ═══════════════════════════════════════════════════════════════════
// 統合設定型（メインインターフェース）
// ═══════════════════════════════════════════════════════════════════

import type { APISettings, PromptSettings } from './api.types';
import type { UISettings } from './ui.types';
import type { EffectSettings } from './effects.types';
import type { ChatSettings } from './chat.types';
import type { VoiceSettings } from './voice.types';
import type { ImageGenerationSettings } from './image.types';
import type { PrivacySettings, EmotionalIntelligenceSettings } from './privacy.types';

/**
 * 統合設定
 *
 * すべての設定の単一の真実の源（Single Source of Truth）
 *
 * このインターフェースはアプリケーション全体の設定を統合管理し、
 * 各カテゴリーごとに分類された設定を提供します。
 *
 * @example
 * ```typescript
 * const settings: UnifiedSettings = {
 *   api: { provider: 'openrouter', temperature: 0.7, ... },
 *   prompts: { system: '...', enableSystemPrompt: true, ... },
 *   ui: { theme: 'dark', fontSize: 'medium', ... },
 *   effects: { colorfulBubbles: true, threeDEffects: { ... }, ... },
 *   chat: { enterToSend: true, responseFormat: 'normal', ... },
 *   voice: { enabled: true, provider: 'voicevox', ... },
 *   imageGeneration: { provider: 'runware', ... },
 *   privacy: { saveHistory: true, ... },
 *   emotionalIntelligence: { enabled: false, analysis: { ... }, ... }
 * };
 * ```
 */
export interface UnifiedSettings {
  /** API設定 - LLMプロバイダー、認証、パラメータ */
  api: APISettings;

  /** プロンプト設定 - システムプロンプト、各種プロンプトテンプレート */
  prompts: PromptSettings;

  /** UI/外観設定 - テーマ、レイアウト、カラー、背景 */
  ui: UISettings;

  /** エフェクト設定 - 視覚効果、3Dエフェクト、感情表示 */
  effects: EffectSettings;

  /** チャット設定 - 動作、通知、レスポンス形式 */
  chat: ChatSettings;

  /** 音声設定 - 音声合成、プロバイダー、詳細設定 */
  voice: VoiceSettings;

  /** 画像生成設定 - 画像生成プロバイダーと設定 */
  imageGeneration: ImageGenerationSettings;

  /** プライバシー設定 - データ保存、分析、Cookie */
  privacy: PrivacySettings;

  /** 感情知能エンジン設定 - 分析、メモリー、パフォーマンス */
  emotionalIntelligence: EmotionalIntelligenceSettings;
}

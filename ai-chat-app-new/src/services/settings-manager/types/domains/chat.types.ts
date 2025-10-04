/**
 * チャット設定型定義
 * Chat Settings Type Definitions
 *
 * チャット動作、通知、レスポンス形式に関する型定義
 *
 * @module ChatTypes
 * @version Phase 2.2
 */

// ═══════════════════════════════════════════════════════════════════
// チャット設定型
// ═══════════════════════════════════════════════════════════════════

/**
 * レスポンス形式
 */
export type ResponseFormat = 'normal' | 'roleplay' | 'formal';

/**
 * グロー強度
 */
export type GlowIntensity = 'none' | 'soft' | 'medium' | 'strong';

/**
 * メモリー制限設定
 */
export interface MemoryLimits {
  /** ワーキングメモリ最大数 */
  maxWorkingMemory: number;

  /** メモリーカード最大数 */
  maxMemoryCards: number;

  /** 関連メモリー最大数 */
  maxRelevantMemories: number;

  /** プロンプト最大トークン数 */
  maxPromptTokens: number;

  /** コンテキスト最大メッセージ数 */
  maxContextMessages: number;
}

/**
 * プログレッシブモード設定
 */
export interface ProgressiveMode {
  /** プログレッシブモード有効化 */
  enabled: boolean;

  /** インジケーター表示 */
  showIndicators: boolean;

  /** 変更箇所ハイライト */
  highlightChanges: boolean;

  /** グロー強度 */
  glowIntensity: GlowIntensity;

  /** ステージ遅延設定 */
  stageDelays: {
    /** Reflexステージ遅延 (ms) */
    reflex: number;
    /** Contextステージ遅延 (ms) */
    context: number;
    /** Intelligenceステージ遅延 (ms) */
    intelligence: number;
  };
}

/**
 * チャット設定
 *
 * チャット動作、通知、レスポンス形式など
 * チャット機能に関する設定を管理
 */
export interface ChatSettings {
  /** Enterキーで送信 */
  enterToSend: boolean;

  /** タイピングインジケーター表示 */
  showTypingIndicator: boolean;

  /** メッセージグルーピング */
  messageGrouping: boolean;

  /** 自動スクロール */
  autoScroll: boolean;

  /** サウンド有効化 */
  soundEnabled: boolean;

  /** 通知有効化 */
  notificationsEnabled: boolean;

  /** レスポンス形式 */
  responseFormat: ResponseFormat;

  /** メモリー容量 - 保持する会話数 */
  memoryCapacity: number;

  /** 生成候補数 - 複数候補生成時の数 */
  generationCandidates: number;

  /** メモリー制限設定 */
  memoryLimits: MemoryLimits;

  /** プログレッシブモード設定 */
  progressiveMode: ProgressiveMode;
}

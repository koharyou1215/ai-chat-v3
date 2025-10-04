/**
 * 音声設定型定義
 * Voice Settings Type Definitions
 *
 * 音声合成、プロバイダー、詳細設定に関する型定義
 *
 * @module VoiceTypes
 * @version Phase 2.2
 */

// ═══════════════════════════════════════════════════════════════════
// 音声設定型
// ═══════════════════════════════════════════════════════════════════

/**
 * 音声プロバイダー
 */
export type VoiceProvider = 'voicevox' | 'elevenlabs' | 'system';

/**
 * VOICEVOX設定
 */
export interface VoicevoxSettings {
  /** スピーカーID */
  speaker: number;

  /** 速度 (0-2) */
  speed: number;

  /** ピッチ (-1 to 1) */
  pitch: number;

  /** イントネーション (0-2) */
  intonation: number;

  /** 音量 (0-2) */
  volume: number;
}

/**
 * ElevenLabs設定
 */
export interface ElevenLabsSettings {
  /** 音声ID */
  voiceId: string;

  /** 安定性 (0-1) */
  stability: number;

  /** 類似性 (0-1) */
  similarity: number;
}

/**
 * システム音声設定
 */
export interface SystemVoiceSettings {
  /** 音声名 */
  voice: string;

  /** 速度 (0-2) */
  rate: number;

  /** ピッチ (0-2) */
  pitch: number;

  /** 音量 (0-2) */
  volume: number;
}

/**
 * 音声詳細設定
 */
export interface VoiceAdvancedSettings {
  /** バッファサイズ */
  bufferSize: number;

  /** クロスフェード有効化 */
  crossfade: boolean;

  /** 正規化有効化 */
  normalization: boolean;

  /** ノイズリダクション有効化 */
  noiseReduction: boolean;

  /** エコーキャンセル有効化 */
  echoCancellation: boolean;
}

/**
 * 音声設定
 *
 * 音声合成、プロバイダー選択、詳細設定など
 * 音声機能に関する設定を管理
 */
export interface VoiceSettings {
  /** 音声機能有効化 */
  enabled: boolean;

  /** 使用するプロバイダー */
  provider: VoiceProvider;

  /** 自動再生 */
  autoPlay: boolean;

  /** VOICEVOX設定 */
  voicevox: VoicevoxSettings;

  /** ElevenLabs設定 */
  elevenlabs: ElevenLabsSettings;

  /** システム音声設定 */
  system: SystemVoiceSettings;

  /** 詳細設定 */
  advanced: VoiceAdvancedSettings;
}

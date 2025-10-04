/**
 * 画像生成設定型定義
 * Image Generation Settings Type Definitions
 *
 * 画像生成プロバイダーとその設定に関する型定義
 *
 * @module ImageTypes
 * @version Phase 2.2
 */

// ═══════════════════════════════════════════════════════════════════
// 画像生成設定型
// ═══════════════════════════════════════════════════════════════════

/**
 * 画像生成プロバイダー
 */
export type ImageGenerationProvider = 'runware' | 'stable-diffusion';

/**
 * Runware設定
 */
export interface RunwareSettings {
  /** モデルID */
  modelId: string;

  /** LoRAモデル */
  lora: string;

  /** 幅 (ピクセル) */
  width: number;

  /** 高さ (ピクセル) */
  height: number;

  /** ステップ数 - 生成の反復回数 */
  steps: number;

  /** CFGスケール - プロンプト遵守度 */
  cfgScale: number;

  /** サンプラー種類 */
  sampler: string;

  /** シード値 - 再現性のための乱数シード */
  seed: number;

  /** カスタム品質タグ */
  customQualityTags: string;
}

/**
 * Stable Diffusion設定
 */
export interface StableDiffusionSettings {
  /** モデルID */
  modelId: string;

  /** 幅 (ピクセル) */
  width: number;

  /** 高さ (ピクセル) */
  height: number;

  /** ステップ数 - 生成の反復回数 */
  steps: number;

  /** CFGスケール - プロンプト遵守度 */
  cfgScale: number;

  /** サンプラー種類 */
  sampler: string;

  /** シード値 - 再現性のための乱数シード */
  seed: number;
}

/**
 * 画像生成設定
 *
 * 画像生成プロバイダーとその設定を管理
 */
export interface ImageGenerationSettings {
  /** 使用するプロバイダー */
  provider: ImageGenerationProvider;

  /** Runware設定 */
  runware: RunwareSettings;

  /** Stable Diffusion設定 */
  stableDiffusion: StableDiffusionSettings;
}

/**
 * Emotion Text Processor
 *
 * 括弧内テキスト（「」）の感情検出とエフェクト適用を統合
 *
 * @module emotion-text-processor
 */

import type { EmotionColorSettings } from '@/services/settings-manager/types/domains/effects.types';

/**
 * 感情パターン定義
 */
export const EMOTION_PATTERNS = {
  positive: /愛|好き|うれしい|楽しい|幸せ|最高|素晴らしい|ありがとう|嬉しい|ドキドキ|ワクワク|キラキラ/,
  negative: /悲しい|寂しい|つらい|苦しい|嫌い|最悪|うざい|むかつく|怒り|泣き/,
  surprise: /えっ|まさか|すごい|びっくり|驚き|興奮|ドキドキ|ハラハラ/,
  question: /？|\?|なんで|なぜ|どうして|どう|何|どれ|いつ|どこ|誰/,
  general: /！|!|〜|ー|…|\.\.\./,
} as const;

/**
 * 感情タイプ
 */
export type EmotionType = keyof typeof EMOTION_PATTERNS | 'default';

/**
 * デフォルト感情色設定
 *
 * Phase 1: 後方互換性のため、ハードコードされた色をデフォルト値として保持
 */
export const DEFAULT_EMOTION_COLORS: EmotionColorSettings = {
  positive: '#ff99c2',
  negative: '#70b8ff',
  surprise: '#ffd93d',
  question: '#00d9ff',
  general: '#ff9999',
  default: '#ffffff',
};

/**
 * 感情スタイル定義（非推奨 - 後方互換性のため残存）
 *
 * @deprecated Phase 1で非推奨化: getEmotionStyles() を使用してください
 */
export const EMOTION_STYLES: Record<EmotionType, string> = {
  positive: "color: #ff99c2; text-shadow: 0 0 10px rgba(255, 153, 194, 0.6); font-weight: bold;",
  negative: "color: #70b8ff; text-shadow: 0 0 10px rgba(112, 184, 255, 0.6); font-weight: bold;",
  surprise: "color: #ffd93d; text-shadow: 0 0 10px rgba(255, 217, 61, 0.6); font-weight: bold; animation: pulse 1s infinite;",
  question: "color: #00d9ff; text-shadow: 0 0 12px rgba(0, 217, 255, 0.8); font-style: italic; font-weight: bold;",
  general: "color: #ff9999; text-shadow: 0 0 12px rgba(255, 153, 153, 0.7); font-weight: bold;",
  default: "color: #ffffff; text-shadow: 0 0 8px rgba(255, 255, 255, 0.6); font-weight: bold;",
} as const;

/**
 * テキストから感情を検出
 *
 * @param text - 検出対象のテキスト
 * @returns 検出された感情タイプ
 */
function detectEmotion(text: string): EmotionType {
  for (const [emotion, pattern] of Object.entries(EMOTION_PATTERNS)) {
    if (pattern.test(text)) {
      return emotion as EmotionType;
    }
  }
  return 'default';
}

/**
 * 感情色設定からスタイルオブジェクトを生成
 *
 * @param colors - 感情色設定
 * @returns 感情タイプごとのスタイル文字列
 */
export function getEmotionStyles(colors: EmotionColorSettings): Record<EmotionType, string> {
  return {
    positive: `color: ${colors.positive}; text-shadow: 0 0 10px ${hexToRgba(colors.positive, 0.6)}; font-weight: bold;`,
    negative: `color: ${colors.negative}; text-shadow: 0 0 10px ${hexToRgba(colors.negative, 0.6)}; font-weight: bold;`,
    surprise: `color: ${colors.surprise}; text-shadow: 0 0 10px ${hexToRgba(colors.surprise, 0.6)}; font-weight: bold; animation: pulse 1s infinite;`,
    question: `color: ${colors.question}; text-shadow: 0 0 12px ${hexToRgba(colors.question, 0.8)}; font-style: italic; font-weight: bold;`,
    general: `color: ${colors.general}; text-shadow: 0 0 12px ${hexToRgba(colors.general, 0.7)}; font-weight: bold;`,
    default: `color: ${colors.default}; text-shadow: 0 0 8px ${hexToRgba(colors.default, 0.6)}; font-weight: bold;`,
  };
}

/**
 * HEXカラーをRGBA形式に変換
 *
 * @param hex - HEXカラーコード (#rrggbb)
 * @param alpha - 透明度 (0-1)
 * @returns RGBA文字列
 */
function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * 括弧内テキスト（「」）に感情エフェクトを適用
 *
 * @param text - 処理対象のテキスト
 * @param emotionColors - 感情色設定（オプション、未指定時はデフォルト値を使用）
 * @returns エフェクトが適用されたHTML文字列
 *
 * @example
 * ```typescript
 * // デフォルト色を使用
 * const result1 = processEmotionalText('今日は「楽しい」ね！');
 *
 * // カスタム色を使用
 * const customColors = { positive: '#ff0000', ... };
 * const result2 = processEmotionalText('今日は「楽しい」ね！', customColors);
 * ```
 */
export function processEmotionalText(
  text: string,
  emotionColors?: EmotionColorSettings
): string {
  if (!text) return text;

  // 感情色が指定されていない場合はデフォルト値を使用
  const colors = emotionColors || DEFAULT_EMOTION_COLORS;
  const styles = getEmotionStyles(colors);

  return text.replace(/「([^」]+)」/g, (match, innerText) => {
    const emotion = detectEmotion(innerText);
    const style = styles[emotion];
    const effectClass = `${emotion}-emotion`;

    return `<span class="${effectClass}" style="${style}">「${innerText}」</span>`;
  });
}

/**
 * 感情エフェクトのクラス名を取得
 *
 * @param text - 検出対象のテキスト
 * @returns 感情に対応するクラス名
 */
export function getEmotionClass(text: string): string {
  const emotion = detectEmotion(text);
  return `${emotion}-emotion`;
}

/**
 * 感情エフェクトのスタイルを取得
 *
 * @param text - 検出対象のテキスト
 * @returns 感情に対応するスタイル文字列
 */
export function getEmotionStyle(text: string): string {
  const emotion = detectEmotion(text);
  return EMOTION_STYLES[emotion];
}

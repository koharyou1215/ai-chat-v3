/**
 * Emotion Text Processor
 *
 * 括弧内テキスト（「」）の感情検出とエフェクト適用を統合
 *
 * @module emotion-text-processor
 */

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
 * 感情スタイル定義
 */
export const EMOTION_STYLES: Record<EmotionType, string> = {
  positive: "color: #ff6b9d; text-shadow: 0 0 10px rgba(255, 107, 157, 0.6); font-weight: bold;",
  negative: "color: #4a90e2; text-shadow: 0 0 10px rgba(74, 144, 226, 0.6); font-weight: bold;",
  surprise: "color: #f39c12; text-shadow: 0 0 10px rgba(243, 156, 18, 0.6); font-weight: bold; animation: pulse 1s infinite;",
  question: "color: #c084fc; text-shadow: 0 0 12px rgba(192, 132, 252, 0.8); font-style: italic; font-weight: bold;",
  general: "color: #ff6666; text-shadow: 0 0 12px rgba(255, 102, 102, 0.7); font-weight: bold;",
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
 * 括弧内テキスト（「」）に感情エフェクトを適用
 *
 * @param text - 処理対象のテキスト
 * @returns エフェクトが適用されたHTML文字列
 *
 * @example
 * ```typescript
 * const result = processEmotionalText('今日は「楽しい」ね！');
 * // → '今日は<span class="positive-emotion" style="...">「楽しい」</span>ね！'
 * ```
 */
export function processEmotionalText(text: string): string {
  if (!text) return text;

  return text.replace(/「([^」]+)」/g, (match, innerText) => {
    const emotion = detectEmotion(innerText);
    const style = EMOTION_STYLES[emotion];
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

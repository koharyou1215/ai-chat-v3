/**
 * Model Validation Utility
 * Gemini 2.5モデルの検証のみ（自動変換なし）
 */

// 有効なGemini 2.5モデルのみ
export const VALID_GEMINI_MODELS = {
  'gemini-2.5-pro': true,
  'gemini-2.5-flash': true,
  'gemini-2.5-flash-light': true,
  // Gemini 1.5モデルも追加（暫定対応）
  'gemini-1.5-flash': true,
  'gemini-1.5-flash-8b': true,
  'gemini-1.5-pro': true,
};

/**
 * モデル名が有効なGemini 2.5モデルかチェック
 * 自動変換は行わない - 無効なモデルはエラーを返す
 */
export function validateGeminiModel(modelName: string): boolean {
  if (!modelName) {
    return false;
  }

  // google/プレフィックスを除去してチェック
  const cleanModel = modelName.startsWith('google/')
    ? modelName.substring(7)
    : modelName;

  return VALID_GEMINI_MODELS[cleanModel as keyof typeof VALID_GEMINI_MODELS] || false;
}

/**
 * プロバイダー別のモデル名フォーマット
 * 自動変換なし - 有効なモデルのみ処理
 */
export function formatModelForProvider(model: string, provider: 'openrouter' | 'gemini'): string | null {
  // Geminiモデルの場合のみ処理
  if (!model.includes('gemini')) {
    return model; // Non-Gemini models pass through
  }

  // 有効性チェック
  if (!validateGeminiModel(model)) {
    console.error(`❌ Invalid Gemini model: ${model}. Only 2.5 series allowed.`);
    return null;
  }

  const cleanModel = model.startsWith('google/')
    ? model.substring(7)
    : model;

  if (provider === 'openrouter') {
    // OpenRouter向けにはgoogle/プレフィックスを追加
    return `google/${cleanModel}`;
  }

  // 直接Gemini APIの場合はプレフィックスなし
  return cleanModel;
}
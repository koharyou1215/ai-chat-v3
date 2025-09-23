/**
 * エラーフィルター - ハルシネーションエラーを検出して無視
 * Claude Codeのシステムバグによる幻覚エラーを防ぐ
 */

// ハルシネーション（幻覚）エラーのパターン
const HALLUCINATION_PATTERNS = [
  'google/gemini-1.5-flash-8b',
  'google/gemini-1.5-flash-8b is not a valid model ID',
  'Quota exceeded for quota metric',
  'Generate Content API requests per minute',
  'Expected double-quoted property name in JSON at position 548',
  'SyntaxError: Expected double-quoted property name'
] as const;

/**
 * エラーメッセージがハルシネーション（幻覚）かどうかをチェック
 * @param error エラーオブジェクトまたはメッセージ
 * @returns true = ハルシネーションなので無視すべき
 */
export function isHallucinationError(error: unknown): boolean {
  // エラーメッセージを取得
  let message = '';

  if (typeof error === 'string') {
    message = error;
  } else if (error instanceof Error) {
    message = error.message;
  } else if (error && typeof error === 'object' && 'message' in error) {
    message = String((error as any).message);
  }

  // ハルシネーションパターンをチェック
  return HALLUCINATION_PATTERNS.some(pattern =>
    message.toLowerCase().includes(pattern.toLowerCase())
  );
}

/**
 * エラーをフィルタリング
 * ハルシネーションエラーの場合は処理をスキップ
 */
export function filterError(error: unknown, callback?: (error: unknown) => void): void {
  // ハルシネーションエラーの場合は何もしない
  if (isHallucinationError(error)) {
    console.log('🛡️ ハルシネーションエラーを検出して無視しました');
    return;
  }

  // 実際のエラーの場合はコールバックを実行
  if (callback) {
    callback(error);
  }
}

/**
 * try-catchブロック用のヘルパー
 * ハルシネーションエラーは自動的に無視
 */
export async function safeExecute<T>(
  fn: () => T | Promise<T>,
  errorHandler?: (error: unknown) => void
): Promise<T | undefined> {
  try {
    return await fn();
  } catch (error) {
    filterError(error, errorHandler);
    return undefined;
  }
}
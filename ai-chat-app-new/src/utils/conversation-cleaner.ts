/**
 * 会話履歴のクリーニングユーティリティ
 * Base64画像データなどの大きなデータを適切に処理
 */

/**
 * Base64画像データを検出してプレースホルダーに置換
 */
export function cleanImageDataFromContent(content: string): string {
  // Base64画像データのパターンを検出
  // data:image/xxx;base64, で始まる文字列を検出
  const base64ImagePattern = /data:image\/[^;]+;base64,[A-Za-z0-9+/]+=*/g;

  // Base64画像をプレースホルダーに置換
  return content.replace(base64ImagePattern, '[画像]');
}

/**
 * メッセージ内容から大きなデータを削除
 */
export function cleanMessageContent(content: string): string {
  // まずBase64画像データをクリーニング
  let cleaned = cleanImageDataFromContent(content);

  // 極端に長いコンテンツの場合は切り詰める（バックアップとして）
  const MAX_CONTENT_LENGTH = 10000; // 10KB程度
  if (cleaned.length > MAX_CONTENT_LENGTH) {
    cleaned = cleaned.substring(0, MAX_CONTENT_LENGTH) + '...[内容省略]';
  }

  return cleaned;
}

/**
 * 会話履歴配列をクリーニング
 */
export function cleanConversationHistory<T extends { role: string; content: string }>(
  history: T[]
): T[] {
  return history.map(message => ({
    ...message,
    content: cleanMessageContent(message.content)
  }));
}

/**
 * 画像URLが含まれているかチェック
 */
export function hasImageUrl(message: any): boolean {
  return !!(message.image_url || message.imageUrl || message.image_urls);
}

/**
 * メッセージに画像が含まれている場合、適切な表示テキストを追加
 */
export function formatMessageWithImage(content: string, hasImage: boolean): string {
  if (hasImage && !content.includes('[画像]')) {
    // 画像がある場合は明示的に表示
    return content + '\n[画像添付]';
  }
  return content;
}
/**
 * Phase 2.3: Context Management
 *
 * 会話履歴構築ロジックを統一するユーティリティ
 *
 * 目的:
 * - Mem0を使用した会話履歴の構築ロジックを統合
 * - 3つのハンドラー（send, continuation, regeneration）での重複コード削減
 * - フォールバック処理の一貫性確保
 *
 * 削減見込み: 50-70行
 */

import { UnifiedMessage } from "@/types";

/**
 * 会話履歴エントリー型
 */
export interface ConversationHistoryEntry {
  role: "user" | "assistant";
  content: string;
}

/**
 * 会話履歴構築オプション
 */
export interface BuildConversationHistoryOptions {
  /** セッションID */
  sessionId: string;
  /** 最大コンテキストメッセージ数 */
  maxContextMessages: number;
  /** 最小保持メッセージ数（最近のメッセージ） */
  minRecentMessages?: number;
}

/**
 * 会話履歴を構築
 *
 * Mem0を使用した会話履歴の構築を行い、Mem0が利用できない場合は
 * フォールバックロジックを使用します。
 *
 * @param messages - セッションのメッセージ配列
 * @param options - 構築オプション
 * @returns 会話履歴エントリー配列
 */
export function buildConversationHistory(
  messages: UnifiedMessage[],
  options: BuildConversationHistoryOptions
): ConversationHistoryEntry[] {
  const { sessionId, maxContextMessages, minRecentMessages } = options;

  // 削除されていないメッセージのみをフィルタリング
  const activeMessages = messages.filter((m) => !m.is_deleted);

  try {
    // Mem0を使用した会話履歴構築
    const { Mem0 } = require("@/services/mem0/core");

    const history = Mem0.getCandidateHistory(activeMessages, {
      sessionId,
      maxContextMessages,
      minRecentMessages: minRecentMessages || Math.max(5, Math.floor(maxContextMessages / 4)),
    });

    return history;
  } catch (error) {
    // Mem0が利用できない場合のフォールバック処理
    console.warn("Mem0 is not available, using fallback conversation history", error);

    // 最近のメッセージを取得
    const recentMessages = activeMessages.slice(-maxContextMessages);

    // 重複排除しながら会話履歴を構築
    const deduplicatedHistory: ConversationHistoryEntry[] = [];

    for (const msg of recentMessages) {
      // user または assistant のメッセージのみを含める
      if (msg.role === "user" || msg.role === "assistant") {
        const historyEntry: ConversationHistoryEntry = {
          role: msg.role as "user" | "assistant",
          content: msg.content,
        };

        // 重複チェック
        const isDuplicate = deduplicatedHistory.some(
          (existing) =>
            existing.role === historyEntry.role &&
            existing.content === historyEntry.content
        );

        // 空のコンテンツや重複を除外
        if (!isDuplicate && historyEntry.content.trim()) {
          deduplicatedHistory.push(historyEntry);
        }
      }
    }

    // 最大コンテキストの半分までに制限（フォールバック時の安全策）
    return deduplicatedHistory.slice(-Math.floor(maxContextMessages / 2));
  }
}

/**
 * デフォルトの最大コンテキストメッセージ数
 */
export const DEFAULT_MAX_CONTEXT_MESSAGES = 40;

/**
 * デフォルトの最小保持メッセージ数計算
 */
export function calculateMinRecentMessages(maxContextMessages: number): number {
  return Math.max(5, Math.floor(maxContextMessages / 4));
}

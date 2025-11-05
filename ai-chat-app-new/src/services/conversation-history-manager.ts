/**
 * Conversation History Manager
 * 会話履歴取得の統一管理サービス
 *
 * Purpose:
 * - Mem0との統合による最適化された会話履歴取得
 * - フォールバックロジックの統一
 * - キャッシュ機構によるパフォーマンス改善
 */

import { UnifiedMessage, UnifiedChatSession } from "@/types";
import { logger } from "@/utils/logger";

export interface ConversationHistoryOptions {
  /** セッションID */
  sessionId: string;
  /** 最大コンテキストメッセージ数 */
  maxContextMessages?: number;
  /** 最小最近メッセージ数（保証） */
  minRecentMessages?: number;
  /** 簡易フォーマット（role + content のみ） */
  simpleFormat?: boolean;
}

export interface HistoryMessage {
  role: "user" | "assistant";
  content: string;
}

export class ConversationHistoryManager {
  private static cache = new Map<string, { messages: HistoryMessage[], timestamp: number }>();
  private static CACHE_DURATION = 5000; // 5秒間キャッシュ

  /**
   * キャッシュをクリア
   */
  static clearCache(sessionId?: string): void {
    if (sessionId) {
      this.cache.delete(sessionId);
      logger.debug(`🧹 [HistoryManager] Cleared cache for session: ${sessionId}`);
    } else {
      this.cache.clear();
      logger.debug(`🧹 [HistoryManager] Cleared all cache`);
    }
  }

  /**
   * 最適化された会話履歴を取得
   * Mem0を優先的に使用し、フォールバック時は最新メッセージを返す
   */
  static getHistory(
    session: UnifiedChatSession,
    options: ConversationHistoryOptions
  ): HistoryMessage[] {
    const {
      sessionId,
      maxContextMessages = 20,
      minRecentMessages = 5,
      simpleFormat = true,
    } = options;

    // キャッシュチェック
    const cached = this.cache.get(sessionId);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      logger.debug(`✅ [HistoryManager] Cache hit for session: ${sessionId}`);
      return cached.messages;
    }

    let messages: HistoryMessage[];

    try {
      // Mem0の最適化された履歴取得を試行
      const { Mem0 } = require("@/services/mem0/core");

      logger.debug(
        `🔍 [HistoryManager] Using Mem0.getCandidateHistory (max: ${maxContextMessages}, min: ${minRecentMessages})`
      );

      messages = Mem0.getCandidateHistory(session.messages, {
        sessionId,
        maxContextMessages,
        minRecentMessages,
      });

      logger.debug(`✅ [HistoryManager] Mem0 returned ${messages.length} messages`);
    } catch (error) {
      // フォールバック: 最新メッセージを取得
      logger.warn(
        `⚠️ [HistoryManager] Mem0 unavailable, using fallback (last ${minRecentMessages} messages)`,
        error
      );

      messages = session.messages
        .slice(-minRecentMessages)
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        }));

      logger.debug(`✅ [HistoryManager] Fallback returned ${messages.length} messages`);
    }

    // キャッシュに保存
    this.cache.set(sessionId, {
      messages,
      timestamp: Date.now(),
    });

    return messages;
  }

  /**
   * 通常モード用の会話履歴取得
   * maxContextMessages: 40 (デフォルト)
   */
  static getHistoryForNormalMode(
    session: UnifiedChatSession,
    maxContextMessages: number = 40
  ): HistoryMessage[] {
    return this.getHistory(session, {
      sessionId: session.id,
      maxContextMessages,
      minRecentMessages: Math.min(10, maxContextMessages),
    });
  }

  /**
   * プログレッシブモード Stage 2用の会話履歴取得
   * maxContextMessages: 20 (軽量)
   */
  static getHistoryForStage2(session: UnifiedChatSession): HistoryMessage[] {
    return this.getHistory(session, {
      sessionId: session.id,
      maxContextMessages: 20,
      minRecentMessages: 5,
    });
  }

  /**
   * プログレッシブモード Stage 3用の会話履歴取得
   * maxContextMessages: 10 (最新のみ)
   */
  static getHistoryForStage3(session: UnifiedChatSession): HistoryMessage[] {
    return this.getHistory(session, {
      sessionId: session.id,
      maxContextMessages: 10,
      minRecentMessages: 5,
    });
  }
}

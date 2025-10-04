/**
 * Session Update Helper
 * セッション更新処理の共通化（重複コード削減）
 *
 * 使用箇所:
 * - sendMessage
 * - regenerateLastMessage
 * - continueLastMessage
 * - addMessage
 * - deleteMessage
 * - rollbackSession
 */

import { UnifiedChatSession, UnifiedMessage, UUID } from "@/types";
import { createMapSafely } from "./map-helpers";

export interface SessionUpdateOptions {
  /**
   * メッセージを追加
   */
  addMessage?: UnifiedMessage;

  /**
   * メッセージを削除
   */
  removeMessageId?: UUID;

  /**
   * メッセージを置換
   */
  replaceMessage?: {
    messageId: UUID;
    newMessage: UnifiedMessage;
  };

  /**
   * カスタム更新関数
   */
  customUpdate?: (session: UnifiedChatSession) => UnifiedChatSession;

  /**
   * updatedAtを更新するか
   */
  updateTimestamp?: boolean;
}

/**
 * セッションを安全に更新して新しいMapを返す
 *
 * @example
 * ```ts
 * set({
 *   sessions: updateSessionSafely(get().sessions, sessionId, {
 *     addMessage: newMessage,
 *     updateTimestamp: true
 *   })
 * });
 * ```
 */
export function updateSessionSafely(
  sessions: Map<UUID, UnifiedChatSession> | Record<UUID, UnifiedChatSession>,
  sessionId: UUID,
  options: SessionUpdateOptions
): Map<UUID, UnifiedChatSession> {
  const sessionsMap = createMapSafely(sessions);
  const session = sessionsMap.get(sessionId);

  if (!session) {
    console.error(`[SessionUpdateHelper] Session not found: ${sessionId}`);
    return sessionsMap;
  }

  let updatedSession = { ...session };

  // メッセージ追加
  if (options.addMessage) {
    updatedSession = {
      ...updatedSession,
      messages: [...updatedSession.messages, options.addMessage],
    };
  }

  // メッセージ削除
  if (options.removeMessageId) {
    updatedSession = {
      ...updatedSession,
      messages: updatedSession.messages.filter(
        (msg) => msg.id !== options.removeMessageId
      ),
    };
  }

  // メッセージ置換
  if (options.replaceMessage) {
    updatedSession = {
      ...updatedSession,
      messages: updatedSession.messages.map((msg) =>
        msg.id === options.replaceMessage?.messageId
          ? options.replaceMessage.newMessage
          : msg
      ),
    };
  }

  // カスタム更新
  if (options.customUpdate) {
    updatedSession = options.customUpdate(updatedSession);
  }

  // タイムスタンプ更新
  if (options.updateTimestamp !== false) {
    updatedSession = {
      ...updatedSession,
      updated_at: new Date().toISOString(),
    };
  }

  // 新しいMapを作成して返す
  const newSessions = new Map(sessionsMap);
  newSessions.set(sessionId, updatedSession);

  return newSessions;
}

/**
 * 複数のセッション更新を一度に実行
 */
export function updateMultipleSessionsSafely(
  sessions: Map<UUID, UnifiedChatSession> | Record<UUID, UnifiedChatSession>,
  updates: Array<{ sessionId: UUID; options: SessionUpdateOptions }>
): Map<UUID, UnifiedChatSession> {
  let currentSessions = createMapSafely(sessions);

  for (const { sessionId, options } of updates) {
    currentSessions = updateSessionSafely(currentSessions, sessionId, options);
  }

  return currentSessions;
}

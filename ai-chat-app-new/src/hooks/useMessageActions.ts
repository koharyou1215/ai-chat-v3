/**
 * useMessageActions Hook
 *
 * メッセージアクション（再生成、続き生成、削除など）を統合
 *
 * @module useMessageActions
 */

import { useState, useCallback } from "react";
import { useAppStore } from "@/store";
import type { ProgressiveMessage } from "@/types/progressive-message.types";

/**
 * メッセージアクションオプション
 */
export interface MessageActionsOptions {
  /**
   * メッセージ
   */
  message: ProgressiveMessage;

  /**
   * 最新メッセージかどうか
   */
  isLatest?: boolean;

  /**
   * グループチャットかどうか
   */
  isGroupChat?: boolean;

  /**
   * 表示されているコンテンツ（コピー用）
   */
  displayedContent?: string;
}

/**
 * メッセージアクションの戻り値
 */
export interface MessageActionsResult {
  /**
   * 再生成中かどうか
   */
  isRegenerating: boolean;

  /**
   * 続き生成中かどうか
   */
  isContinuing: boolean;

  /**
   * 編集中かどうか
   */
  isEditing: boolean;

  /**
   * 再生成処理
   */
  handleRegenerate: () => Promise<void>;

  /**
   * 続き生成処理
   */
  handleContinue: () => Promise<void>;

  /**
   * コピー処理
   */
  handleCopy: () => void;

  /**
   * 削除処理
   */
  handleDelete: () => Promise<void>;

  /**
   * ロールバック処理
   */
  handleRollback: () => Promise<void>;

  /**
   * 編集処理
   */
  handleEdit: () => void;

  /**
   * 編集状態をトグル
   */
  setIsEditing: (editing: boolean) => void;
}

/**
 * メッセージアクションフック
 *
 * @param options - メッセージアクションオプション
 * @returns メッセージアクションの状態と関数
 *
 * @example
 * ```typescript
 * const {
 *   isRegenerating,
 *   handleRegenerate,
 *   handleCopy,
 *   handleDelete,
 * } = useMessageActions({
 *   message,
 *   isLatest,
 *   displayedContent,
 * });
 * ```
 */
export function useMessageActions(
  options: MessageActionsOptions
): MessageActionsResult {
  const { message, isLatest = false, displayedContent } = options;

  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isContinuing, setIsContinuing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const {
    is_group_mode,
    regenerateLastMessage,
    regenerateLastGroupMessage,
    continueLastMessage,
    continueLastGroupMessage,
    deleteMessage,
    rollbackSession,
  } = useAppStore();

  // 再生成処理
  const handleRegenerate = useCallback(async () => {
    setIsRegenerating(true);
    try {
      if (is_group_mode) {
        await regenerateLastGroupMessage();
      } else {
        await regenerateLastMessage();
      }
    } catch (error) {
      console.error("再生成に失敗しました:", error);
    } finally {
      setIsRegenerating(false);
    }
  }, [is_group_mode, regenerateLastMessage, regenerateLastGroupMessage]);

  // 続き生成処理
  const handleContinue = useCallback(async () => {
    setIsContinuing(true);
    try {
      if (is_group_mode) {
        await continueLastGroupMessage();
      } else {
        await continueLastMessage();
      }
    } catch (error) {
      console.error("続きの生成に失敗しました:", error);
    } finally {
      setIsContinuing(false);
    }
  }, [is_group_mode, continueLastMessage, continueLastGroupMessage]);

  // コピー処理
  const handleCopy = useCallback(() => {
    const contentToCopy = displayedContent || message.content;
    navigator.clipboard.writeText(contentToCopy);
  }, [displayedContent, message.content]);

  // 削除処理
  const handleDelete = useCallback(async () => {
    if (!confirm("このメッセージを削除しますか？")) return;
    try {
      deleteMessage(message.id);
    } catch (error) {
      console.error("メッセージの削除に失敗しました:", error);
    }
  }, [message.id, deleteMessage]);

  // ロールバック処理
  const handleRollback = useCallback(async () => {
    if (!confirm("この地点まで会話をロールバックしますか？")) return;
    try {
      await rollbackSession(message.id);
    } catch (error) {
      console.error("ロールバックに失敗しました:", error);
    }
  }, [message.id, rollbackSession]);

  // 編集処理
  const handleEdit = useCallback(() => {
    setIsEditing((prev) => !prev);
    // TODO: 編集機能の実装
  }, []);

  return {
    isRegenerating,
    isContinuing,
    isEditing,
    handleRegenerate,
    handleContinue,
    handleCopy,
    handleDelete,
    handleRollback,
    handleEdit,
    setIsEditing,
  };
}

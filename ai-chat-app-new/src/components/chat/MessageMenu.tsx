/**
 * MessageMenu Component
 *
 * メッセージバブルのコンテキストメニュー
 * アシスタント/ユーザーメッセージに応じた適切なアクションを表示
 *
 * @module MessageMenu
 */

"use client";

import React from "react";
import {
  RefreshCw,
  Copy,
  Trash2,
  RotateCcw,
  Edit,
  MessageSquare,
  Volume2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProgressiveMessage } from "@/types/progressive-message.types";

/**
 * MessageMenuProps
 */
export interface MessageMenuProps {
  /**
   * メッセージ
   */
  message: ProgressiveMessage;

  /**
   * メニューが開いているか
   */
  isOpen: boolean;

  /**
   * メニュー要素へのref
   */
  menuRef: React.RefObject<HTMLDivElement>;

  /**
   * メニューアイテムクリック時の共通処理
   */
  onMenuItemClick: (
    action: () => void | Promise<void>
  ) => (e: React.MouseEvent) => Promise<void>;

  /**
   * アクションハンドラー
   */
  actions: {
    handleRegenerate?: () => Promise<void>;
    handleContinue?: () => Promise<void>;
    handleCopy?: () => void;
    handleDelete?: () => Promise<void>;
    handleRollback?: () => Promise<void>;
    handleEdit?: () => void;
    handleSpeak?: () => void;
  };

  /**
   * 状態フラグ
   */
  state: {
    isRegenerating?: boolean;
    isContinuing?: boolean;
    isSpeaking?: boolean;
    generateIsActive?: boolean;
    displayedContent?: string;
  };

  /**
   * 音声再生設定
   */
  voice?: {
    autoPlay: boolean;
  };

  /**
   * カスタムクラス名
   */
  className?: string;

  /**
   * キャラクターアイコンURL（スタイル用）
   */
  characterIconUrl?: string;
}

/**
 * MessageMenu Component
 *
 * メッセージに対するアクション（再生成、削除など）を提供するメニュー
 *
 * @example
 * ```tsx
 * <MessageMenu
 *   message={message}
 *   isOpen={showMenu}
 *   menuRef={menuRef}
 *   onMenuItemClick={handleMenuItemClick}
 *   actions={{
 *     handleRegenerate,
 *     handleCopy,
 *     handleDelete,
 *   }}
 *   state={{
 *     isRegenerating,
 *     generateIsActive,
 *   }}
 * />
 * ```
 */
export const MessageMenu: React.FC<MessageMenuProps> = ({
  message,
  isOpen,
  menuRef,
  onMenuItemClick,
  actions,
  state,
  voice,
  className,
  characterIconUrl,
}) => {
  if (!isOpen) {
    return null;
  }

  const {
    handleRegenerate,
    handleContinue,
    handleCopy,
    handleDelete,
    handleRollback,
    handleEdit,
    handleSpeak,
  } = actions;

  const {
    isRegenerating = false,
    isContinuing = false,
    isSpeaking = false,
    generateIsActive = false,
    displayedContent = "",
  } = state;

  return (
    <div
      ref={menuRef}
      className={cn(
        "menu-container absolute bottom-full right-0 mb-2",
        "min-w-[180px] z-[9999]",
        "bg-gray-900/95 border border-gray-700 rounded-md",
        "backdrop-blur-sm shadow-2xl",
        "animate-in slide-in-from-bottom-2 fade-in-0 duration-200",
        className
      )}
      style={
        {
          "--character-icon": characterIconUrl
            ? `url(${characterIconUrl})`
            : `url(/default-avatar.png)`,
        } as React.CSSProperties
      }>
      {/* アシスタントメッセージ用メニュー */}
      {message.role === "assistant" && (
        <>
          {handleRollback && (
            <button
              className="menu-item w-full px-3 py-2 text-left text-sm hover:bg-gray-800 flex items-center gap-2 first:rounded-t-md"
              data-action="rollback"
              onClick={onMenuItemClick(handleRollback)}>
              <RotateCcw className="menu-icon h-4 w-4" />
              ロールバック
            </button>
          )}

          {handleContinue && (
            <button
              className="menu-item w-full px-3 py-2 text-left text-sm hover:bg-gray-800 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              data-action="continue"
              onClick={onMenuItemClick(handleContinue)}
              disabled={isContinuing || generateIsActive}>
              <MessageSquare className="menu-icon h-4 w-4" />
              続きを生成
            </button>
          )}

          {handleRegenerate && (
            <button
              className="menu-item w-full px-3 py-2 text-left text-sm hover:bg-gray-800 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              data-action="regenerate"
              onClick={onMenuItemClick(handleRegenerate)}
              disabled={isRegenerating || generateIsActive}>
              <RefreshCw className="menu-icon h-4 w-4" />
              再生成
            </button>
          )}

          {handleCopy && (
            <button
              className="menu-item w-full px-3 py-2 text-left text-sm hover:bg-gray-800 flex items-center gap-2"
              data-action="copy"
              onClick={onMenuItemClick(handleCopy)}>
              <Copy className="menu-icon h-4 w-4" />
              コピー
            </button>
          )}

          {voice?.autoPlay && handleSpeak && (
            <button
              className="menu-item w-full px-3 py-2 text-left text-sm hover:bg-gray-800 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              data-action="speak"
              onClick={onMenuItemClick(handleSpeak)}
              disabled={!displayedContent || !displayedContent.trim()}>
              <Volume2
                className={cn(
                  "menu-icon h-4 w-4",
                  isSpeaking && "animate-pulse text-blue-500"
                )}
              />
              {isSpeaking ? "読み上げ中..." : "読み上げ"}
            </button>
          )}

          {handleDelete && (
            <button
              className="menu-item w-full px-3 py-2 text-left text-sm hover:bg-gray-800 flex items-center gap-2 text-red-400 last:rounded-b-md"
              data-action="delete"
              onClick={onMenuItemClick(handleDelete)}>
              <Trash2 className="menu-icon h-4 w-4" />
              削除
            </button>
          )}
        </>
      )}

      {/* ユーザーメッセージ用メニュー */}
      {message.role === "user" && (
        <>
          {handleEdit && (
            <button
              className="menu-item w-full px-3 py-2 text-left text-sm hover:bg-gray-800 flex items-center gap-2 first:rounded-t-md"
              data-action="edit"
              onClick={onMenuItemClick(handleEdit)}>
              <Edit className="menu-icon h-4 w-4" />
              編集
            </button>
          )}

          {handleCopy && (
            <button
              className="menu-item w-full px-3 py-2 text-left text-sm hover:bg-gray-800 flex items-center gap-2"
              data-action="copy"
              onClick={onMenuItemClick(handleCopy)}>
              <Copy className="menu-icon h-4 w-4" />
              コピー
            </button>
          )}

          {handleDelete && (
            <button
              className="menu-item w-full px-3 py-2 text-left text-sm hover:bg-gray-800 flex items-center gap-2 text-red-400 last:rounded-b-md"
              data-action="delete"
              onClick={onMenuItemClick(handleDelete)}>
              <Trash2 className="menu-icon h-4 w-4" />
              削除
            </button>
          )}
        </>
      )}
    </div>
  );
};

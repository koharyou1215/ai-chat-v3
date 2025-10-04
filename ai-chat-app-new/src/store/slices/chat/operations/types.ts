// src/store/slices/chat/operations/types.ts

import { StateCreator } from "zustand";
import { AppStore } from "@/store";
import { UnifiedMessage, UUID } from "@/types";

export interface MessageLifecycleOperations {
  addMessage: (message: UnifiedMessage) => Promise<void>;
  deleteMessage: (message_id: UUID) => void;
  rollbackSession: (message_id: UUID) => void;
  resetGeneratingState: () => void;
}

export interface MessageContinuationHandler {
  continueLastMessage: () => Promise<void>;
}

export interface MessageRegenerationHandler {
  regenerateLastMessage: () => Promise<void>;
}

/**
 * sendMessage 専用の戻り値型
 */
export interface SendMessageResult {
  success: boolean;
  userMessage?: UnifiedMessage;
  aiMessage?: UnifiedMessage;
  error?: string;
}

/**
 * sendMessage のオプション設定
 */
export interface SendMessageOptions {
  /**
   * 感情分析を実行するか
   * @default true
   */
  enableEmotionAnalysis?: boolean;

  /**
   * トラッカー自動更新を実行するか
   * @default true
   */
  enableTrackerUpdate?: boolean;

  /**
   * Mem0統合を実行するか
   * @default true
   */
  enableMem0Integration?: boolean;

  /**
   * バックグラウンド処理を実行するか
   * @default true
   */
  enableBackgroundProcessing?: boolean;
}

/**
 * SendHandler の作成関数の型
 */
export interface MessageSendHandler {
  sendMessage: (
    content: string,
    imageUrl?: string,
    options?: SendMessageOptions
  ) => Promise<SendMessageResult>;
}

export type MessageLifecycleSlice = MessageLifecycleOperations;
export type MessageContinuationSlice = MessageContinuationHandler;
export type MessageRegenerationSlice = MessageRegenerationHandler;
export type MessageSendSlice = MessageSendHandler;

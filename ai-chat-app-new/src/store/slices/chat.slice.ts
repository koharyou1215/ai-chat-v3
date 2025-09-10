import { StateCreator } from "zustand";
import {
  UnifiedChatSession,
  UnifiedMessage,
  UUID,
  Character,
  Persona,
} from "@/types";
import { AppStore } from "..";

// Import TrackerManager type
import { TrackerManager } from "@/services/tracker/tracker-manager";

// Import extracted modules
import { MessageOperations, createMessageOperations } from "./chat/chat-message-operations";
import { SessionManagement, createSessionManagement } from "./chat/chat-session-management";
import { TrackerIntegration, createTrackerIntegration } from "./chat/chat-tracker-integration";
import { ProgressiveHandler, createProgressiveHandler } from "./chat/chat-progressive-handler";

// Combine all chat slice interfaces
export interface ChatSlice extends 
  MessageOperations,
  SessionManagement,
  TrackerIntegration,
  ProgressiveHandler {
  // Core state (TrackerIntegration includes trackerManagers)
  sessions: Map<UUID, UnifiedChatSession>;
  active_session_id: UUID | null;
  active_character_id: UUID | null;
  is_generating: boolean;
  showSettingsModal: boolean;
  currentInputText: string;
  lastError?: {
    type: "regeneration" | "continue" | "send" | "memory" | "general";
    message: string;
    timestamp: string;
    details?: string;
  };

  // UI state management
  setShowSettingsModal: (show: boolean) => void;
  setCurrentInputText: (text: string) => void;
}

/**
 * Chat Slice - リファクタリング完了版
 * 
 * このファイルは以下のモジュールに分割されました：
 * - chat-message-operations.ts: メッセージ送信、再生成、続き生成
 * - chat-session-management.ts: セッション管理、履歴管理
 * - chat-tracker-integration.ts: トラッカー統合管理
 * - chat-progressive-handler.ts: プログレッシブメッセージ処理
 * 
 * 修正内容：
 * - メモリーカードの即時読み込み
 * - 会話履歴上限の設定値使用
 * - ペルソナ情報の正確な処理
 * - トラッカー管理の統一化（キャラクターIDベース）
 */
export const createChatSlice: StateCreator<AppStore, [], [], ChatSlice> = (
  set,
  get
) => ({
  // Core state initialization
  sessions: new Map(),
  active_session_id: null,
  active_character_id: null,
  is_generating: false,
  showSettingsModal: false,
  currentInputText: "",

  // UI state management methods
  setShowSettingsModal: (show) => {
    set({ showSettingsModal: show });
  },

  setCurrentInputText: (text) => {
    set({ currentInputText: text });
  },

  // Spread methods from extracted modules
  ...createMessageOperations(set, get),
  ...createSessionManagement(set, get),
  ...createTrackerIntegration(set, get),
  ...createProgressiveHandler(set, get),
});
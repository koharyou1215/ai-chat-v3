// src/store/slices/chat/operations/message-lifecycle-operations.ts

import { StateCreator } from "zustand";
import { AppStore } from "@/store";
import { UnifiedMessage, UUID } from "@/types";
import { MessageLifecycleSlice } from "./types";
import { updateSessionSafely } from "@/utils/chat/session-update-helper";
import { ingestMessageToMem0Safely } from "@/utils/chat/mem0-integration-helper";
import { getSessionSafely } from "@/utils/chat/map-helpers";
import { promptBuilderService } from "@/services/prompt-builder.service";

// Helper function to safely get tracker manager from Map or Object
const getTrackerManagerSafely = (
  trackerManagers: any,
  key: string
): any | undefined => {
  if (!trackerManagers || !key) return undefined;
  if (trackerManagers instanceof Map) {
    return trackerManagers.get(key);
  } else if (typeof trackerManagers === "object") {
    return trackerManagers[key];
  }
  return undefined;
};

export const createMessageLifecycleOperations: StateCreator<
  AppStore,
  [],
  [],
  MessageLifecycleSlice
> = (set, get) => ({
  addMessage: async (message) => {
    const state = get() as any;
    const activeSessionId = state.active_session_id;

    if (!activeSessionId) {
      console.error("❌ No active session to add message");
      return;
    }

    const session = getSessionSafely(state.sessions, activeSessionId);
    if (!session) {
      console.error("❌ Session not found:", activeSessionId);
      return;
    }

    // セッション更新（共通ヘルパー使用）
    set({
      sessions: updateSessionSafely(state.sessions, activeSessionId, {
        addMessage: message,
        updateTimestamp: true,
      }),
    });

    // 🧠 Mem0にメッセージを取り込む（共通ヘルパー使用）
    await ingestMessageToMem0Safely(message, "addMessage");

    console.log("✅ Message added to session:", message.id);
  },

  deleteMessage: (message_id) => {
    const state = get() as any;
    const activeSessionId = state.active_session_id;

    if (!activeSessionId) {
      console.error("❌ [deleteMessage] No active session ID");
      return;
    }

    set({
      sessions: updateSessionSafely(state.sessions, activeSessionId, {
        removeMessageId: message_id,
        updateTimestamp: true,
      }),
    });
  },

  rollbackSession: (message_id) => {
    const state = get() as any;
    const activeSessionId = state.active_session_id;

    if (!activeSessionId) {
      console.error("❌ [rollbackSession] No active session ID");
      return;
    }

    const session = getSessionSafely(state.sessions, activeSessionId);
    if (!session) return;

    const messageIndex = session.messages.findIndex(
      (m: any) => m.id === message_id
    );

    if (messageIndex === -1) {
      console.error("Rollback failed: message not found");
      return;
    }

    // 1. チャット履歴を切り詰める
    const rollbackMessages = session.messages.slice(0, messageIndex + 1);

    set({
      sessions: updateSessionSafely(state.sessions, activeSessionId, {
        customUpdate: (session) => ({
          ...session,
          messages: rollbackMessages,
        }),
        updateTimestamp: true,
      }),
    });

    // 2. ConversationManagerのキャッシュをクリア
    promptBuilderService.clearManagerCache(activeSessionId);

    // 3. トラッカーをリセット
    const characterId = session.participants.characters[0]?.id;
    if (characterId) {
      const trackerManager = getTrackerManagerSafely(
        state.trackerManagers,
        characterId
      );
      if (trackerManager) {
        // 全てのトラッカーを初期値にリセット
        trackerManager.initializeTrackerSet(
          characterId,
          session.participants.characters[0]?.trackers || []
        );
      }
    }
  },

  resetGeneratingState: () => {
    set({ is_generating: false });
  },
});

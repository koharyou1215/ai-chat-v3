import { StateCreator } from "zustand";
import { UnifiedMessage, UUID } from "@/types";
import { AppStore } from "@/store";
import { createMessageLifecycleOperations } from "./operations/message-lifecycle-operations";
import { createMessageContinuationHandler } from "./operations/message-continuation-handler";
import { createMessageRegenerationHandler } from "./operations/message-regeneration-handler";
import { createMessageSendHandler } from "./operations/message-send-handler";

export interface MessageOperations {
  sendMessage: (content: string, imageUrl?: string) => Promise<void>;
  regenerateLastMessage: () => Promise<void>;
  continueLastMessage: () => Promise<void>;
  deleteMessage: (message_id: UUID) => void;
  rollbackSession: (message_id: UUID) => void;
  resetGeneratingState: () => void;
  addMessage: (message: UnifiedMessage) => Promise<void>;
}

/**
 * Phase 3: Message Operations Orchestrator
 *
 * このファイルは純粋なオーケストレーターとして機能し、
 * 各操作を専用ハンドラーに委譲します。
 *
 * アーキテクチャ:
 * - Phase 3.1: Lifecycle Operations (addMessage, deleteMessage, rollbackSession, resetGeneratingState)
 * - Phase 3.2: Continuation Handler (continueLastMessage)
 * - Phase 3.3: Regeneration Handler (regenerateLastMessage)
 * - Phase 3.4: Send Handler (sendMessage)
 */
export const createMessageOperations: StateCreator<
  AppStore,
  [],
  [],
  MessageOperations
> = (set, get, api) => {
  // Phase 3.4: Send handler
  const sendHandler = createMessageSendHandler(set, get, api);

  return {
    // Phase 3.1: Lifecycle operations
    ...createMessageLifecycleOperations(set, get, api),

    // Phase 3.2: Continuation handler
    ...createMessageContinuationHandler(set, get, api),

    // Phase 3.3: Regeneration handler
    ...createMessageRegenerationHandler(set, get, api),

    // Phase 3.4-3.5: Send handler (orchestrator)
    sendMessage: async (content, imageUrl) => {
      const result = await sendHandler.sendMessage(content, imageUrl);
      if (!result.success) {
        console.error("❌ [sendMessage] Failed:", result.error);
      }
    },
  };
};

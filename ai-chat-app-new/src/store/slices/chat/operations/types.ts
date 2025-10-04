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

export type MessageLifecycleSlice = MessageLifecycleOperations;
export type MessageContinuationSlice = MessageContinuationHandler;

/**
 * Memory System Section (Orchestrator)
 *
 * Phase 1 Extension: Refactored to use 4 subsections
 * Strategy: Delegate to focused subsections while maintaining exact output
 * Purpose: Build memory cards and message context
 */

import type { Character } from '@/types';
import type { ConversationManager } from '@/services/memory/conversation-manager';
import {
  PinnedMemoryCardsSubsection,
  RelevantMemoryCardsSubsection,
  PinnedMessagesSubsection,
  RelevantMessagesSubsection,
} from './memory-system';

export interface SearchResult {
  message: {
    sender: string;
    content: string;
  };
}

export interface MemorySystemContext {
  conversationManager: ConversationManager;
  userInput: string;
  processedCharacter?: Character;
  relevantMemories: SearchResult[];
  pinnedMessages: Array<{ role: string; content: string }>;
}

export class MemorySystemSection {
  // Initialize all subsections
  private pinnedMemoryCards = new PinnedMemoryCardsSubsection();
  private relevantMemoryCards = new RelevantMemoryCardsSubsection();
  private pinnedMessages = new PinnedMessagesSubsection();
  private relevantMessages = new RelevantMessagesSubsection();

  /**
   * Build memory system section
   *
   * Phase 1 Extension: Orchestrates 4 subsections to build memory prompt
   * Maintains exact output as original version
   */
  async build(context: MemorySystemContext): Promise<string> {
    const {
      conversationManager,
      userInput,
      processedCharacter,
      relevantMemories,
      pinnedMessages,
    } = context;

    let prompt = "";

    // Delegate to subsections in exact same order as original
    // 1. Pinned Memory Cards (lines 46-67)
    prompt += await this.pinnedMemoryCards.build({ conversationManager });

    // 2. Relevant Memory Cards (lines 69-98)
    prompt += await this.relevantMemoryCards.build({
      conversationManager,
      userInput,
      processedCharacter,
    });

    // 3. Pinned Messages (lines 100-107)
    prompt += this.pinnedMessages.build({ pinnedMessages });

    // 4. Relevant Messages & Session Summary (lines 109-125)
    prompt += this.relevantMessages.build({
      conversationManager,
      relevantMemories,
    });

    return prompt;
  }
}

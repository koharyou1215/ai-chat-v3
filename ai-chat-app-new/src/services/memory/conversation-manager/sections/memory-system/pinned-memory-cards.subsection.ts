/**
 * Pinned Memory Cards Subsection
 *
 * 🔒 Exact copy from memory-system.section.ts lines 46-67
 * Strategy: Character-by-character preservation
 * Purpose: Build pinned memory cards section
 */

import type { MemoryCard } from '@/types';
import type { ConversationManager } from '@/services/memory/conversation-manager';

// Internal type extension for accessing private methods
type ConversationManagerInternal = {
  getPinnedMemoryCards: () => Promise<MemoryCard[]>;
};

export interface PinnedMemoryCardsContext {
  conversationManager: ConversationManager;
}

export class PinnedMemoryCardsSubsection {
  /**
   * Build pinned memory cards section
   *
   * 🔒 EXACT COPY from memory-system.section.ts lines 46-67
   */
  async build(context: PinnedMemoryCardsContext): Promise<string> {
    const { conversationManager } = context;
    const internal = conversationManager as unknown as ConversationManagerInternal;
    let prompt = "";

    // 🔒 lines 46-67 - exact copy
    // 6a. ピン留めメモリーカード（最優先）
    const pinnedMemoryCards = await internal.getPinnedMemoryCards();
    console.log(
      "📌 [ConversationManager] Pinned memory cards found:",
      pinnedMemoryCards.length
    );
    if (pinnedMemoryCards.length > 0) {
      console.log(
        "📌 [ConversationManager] Adding pinned memory cards to prompt:",
        pinnedMemoryCards.map((c) => c.title)
      );
      prompt += "<pinned_memory_cards>\n";
      pinnedMemoryCards.forEach((card) => {
        prompt += `[${card.category}] ${card.title}: ${card.summary}\n`;
        if (card.keywords.length > 0) {
          prompt += `Keywords: ${card.keywords.join(", ")}\n`;
        }
      });
      prompt += "</pinned_memory_cards>\n\n";
    } else {
      console.log("📌 [ConversationManager] No pinned memory cards found");
    }

    return prompt;
  }
}

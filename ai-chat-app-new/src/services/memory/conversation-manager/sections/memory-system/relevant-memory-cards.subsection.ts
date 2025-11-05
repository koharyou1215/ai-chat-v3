/**
 * Relevant Memory Cards Subsection
 *
 * 🔒 Exact copy from memory-system.section.ts lines 69-98
 * Strategy: Character-by-character preservation
 * Purpose: Build relevant memory cards section
 */

import type { Character, MemoryCard } from '@/types';
import type { ConversationManager } from '@/services/memory/conversation-manager';

// Internal type extension for accessing private methods
type ConversationManagerInternal = {
  getRelevantMemoryCards: (
    userInput: string,
    character?: Character
  ) => Promise<MemoryCard[]>;
};

export interface RelevantMemoryCardsContext {
  conversationManager: ConversationManager;
  userInput: string;
  processedCharacter?: Character;
}

export class RelevantMemoryCardsSubsection {
  /**
   * Build relevant memory cards section
   *
   * 🔒 EXACT COPY from memory-system.section.ts lines 69-98
   */
  async build(context: RelevantMemoryCardsContext): Promise<string> {
    const { conversationManager, userInput, processedCharacter } = context;
    const internal = conversationManager as unknown as ConversationManagerInternal;
    let prompt = "";

    // 🔒 lines 69-98 - exact copy
    // 6b. 関連メモリーカード（スマート選択版）
    const relevantMemoryCards = await internal.getRelevantMemoryCards(
      userInput,
      processedCharacter
    );
    console.log(
      "🔍 [ConversationManager] Relevant memory cards found:",
      relevantMemoryCards.length,
      "for input:",
      userInput.substring(0, 30) + "..."
    );
    if (relevantMemoryCards.length > 0) {
      console.log(
        "🔍 [ConversationManager] Adding relevant memory cards to prompt:",
        relevantMemoryCards.map((c) => c.title)
      );
      prompt += "<relevant_memory_cards>\n";
      relevantMemoryCards.forEach((card) => {
        prompt += `[${card.category}] ${card.title}: ${card.summary}\n`;
        // キーワードも含めてコンテキストを豊富に
        if (card.keywords.length > 0) {
          prompt += `Keywords: ${card.keywords.slice(0, 3).join(", ")}\n`;
        }
      });
      prompt += "</relevant_memory_cards>\n\n";
    } else {
      console.log(
        "🔍 [ConversationManager] No relevant memory cards found for input"
      );
    }

    return prompt;
  }
}

/**
 * Memory System Section
 *
 * 🔒 Exact copy from conversation-manager.ts line 605-684
 * Strategy: Character-by-character preservation
 * Purpose: Build memory cards and message context
 */

import type { Character } from '@/types';
import type { ConversationManager } from '@/services/memory/conversation-manager';

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
  /**
   * Build memory system section
   *
   * 🔒 EXACT COPY from conversation-manager.ts line 605-684
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

    // 🔒 line 605-684 - exact copy
    // 6. Memory System Information

    // 6a. ピン留めメモリーカード（最優先）
    const pinnedMemoryCards = await (conversationManager as any).getPinnedMemoryCards();
    console.log(
      "📌 [ConversationManager] Pinned memory cards found:",
      pinnedMemoryCards.length
    );
    if (pinnedMemoryCards.length > 0) {
      console.log(
        "📌 [ConversationManager] Adding pinned memory cards to prompt:",
        pinnedMemoryCards.map((c: any) => c.title)
      );
      prompt += "<pinned_memory_cards>\n";
      pinnedMemoryCards.forEach((card: any) => {
        prompt += `[${card.category}] ${card.title}: ${card.summary}\n`;
        if (card.keywords.length > 0) {
          prompt += `Keywords: ${card.keywords.join(", ")}\n`;
        }
      });
      prompt += "</pinned_memory_cards>\n\n";
    } else {
      console.log("📌 [ConversationManager] No pinned memory cards found");
    }

    // 6b. 関連メモリーカード（スマート選択版）
    const relevantMemoryCards = await (conversationManager as any).getRelevantMemoryCards(
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
        relevantMemoryCards.map((c: any) => c.title)
      );
      prompt += "<relevant_memory_cards>\n";
      relevantMemoryCards.forEach((card: any) => {
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

    // 6c. ピン留めメッセージ（従来機能）
    if (pinnedMessages.length > 0) {
      prompt += "<pinned_messages>\n";
      pinnedMessages.forEach((msg) => {
        prompt += `${msg.role}: ${msg.content}\n`;
      });
      prompt += "</pinned_messages>\n\n";
    }

    // 6d. 関連メッセージ（従来機能、設定上限まで）
    if (relevantMemories.length > 0) {
      prompt += "<relevant_messages>\n";
      relevantMemories
        .slice(0, (conversationManager as any).config.maxRelevantMemories)
        .forEach((result: SearchResult) => {
          const role = result.message.sender === "user" ? "User" : "AI";
          prompt += `${role}: ${result.message.content}\n`;
        });
      prompt += "</relevant_messages>\n\n";
    }

    if ((conversationManager as any).sessionSummary) {
      prompt += `<session_summary>\n${(conversationManager as any).sessionSummary}\n</session_summary>\n\n`;
    }

    return prompt;
  }
}

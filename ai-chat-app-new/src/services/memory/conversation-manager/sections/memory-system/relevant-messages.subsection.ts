/**
 * Relevant Messages & Session Summary Subsection
 *
 * 🔒 Exact copy from memory-system.section.ts lines 109-125
 * Strategy: Character-by-character preservation
 * Purpose: Build relevant messages and session summary sections
 */

import type { ConversationManager } from '@/services/memory/conversation-manager';

export interface SearchResult {
  message: {
    sender: string;
    content: string;
  };
}

export interface RelevantMessagesContext {
  conversationManager: ConversationManager;
  relevantMemories: SearchResult[];
}

export class RelevantMessagesSubsection {
  /**
   * Build relevant messages and session summary sections
   *
   * 🔒 EXACT COPY from memory-system.section.ts lines 109-125
   */
  build(context: RelevantMessagesContext): string {
    const { conversationManager, relevantMemories } = context;
    let prompt = "";

    // 🔒 lines 109-125 - exact copy
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

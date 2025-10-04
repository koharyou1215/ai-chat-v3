/**
 * Recent Conversation Section
 *
 * 🔒 Exact copy from conversation-manager.ts line 704-710
 * Strategy: Character-by-character preservation
 * Purpose: Build recent message history
 */

import { replaceVariables, type VariableContext } from '@/utils/variable-replacer';

export interface RecentConversationContext {
  recent_messages: Array<{ role: string; content: string }>;
  variableContext: VariableContext;
}

export class RecentConversationSection {
  /**
   * Build recent conversation section
   *
   * 🔒 EXACT COPY from conversation-manager.ts line 704-710
   */
  build(context: RecentConversationContext): string {
    const { recent_messages, variableContext } = context;
    let prompt = "";

    // 🔒 line 704-710 - exact copy
    // 8. Chat History (Working Memory)
    prompt += "<recent_conversation>\n";
    recent_messages.forEach((msg) => {
      const role = msg.role === "user" ? "User" : "AI";
      prompt += `${role}: ${replaceVariables(msg.content, variableContext)}\n`;
    });
    prompt += "</recent_conversation>\n\n";

    return prompt;
  }
}

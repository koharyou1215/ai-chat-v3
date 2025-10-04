/**
 * Pinned Messages Subsection
 *
 * 🔒 Exact copy from memory-system.section.ts lines 100-107
 * Strategy: Character-by-character preservation
 * Purpose: Build pinned messages section
 */

export interface PinnedMessagesContext {
  pinnedMessages: Array<{ role: string; content: string }>;
}

export class PinnedMessagesSubsection {
  /**
   * Build pinned messages section
   *
   * 🔒 EXACT COPY from memory-system.section.ts lines 100-107
   */
  build(context: PinnedMessagesContext): string {
    const { pinnedMessages } = context;
    let prompt = "";

    // 🔒 lines 100-107 - exact copy
    // 6c. ピン留めメッセージ（従来機能）
    if (pinnedMessages.length > 0) {
      prompt += "<pinned_messages>\n";
      pinnedMessages.forEach((msg) => {
        prompt += `${msg.role}: ${msg.content}\n`;
      });
      prompt += "</pinned_messages>\n\n";
    }

    return prompt;
  }
}

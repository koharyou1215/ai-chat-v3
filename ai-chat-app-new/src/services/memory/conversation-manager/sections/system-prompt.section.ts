/**
 * System Prompt Section
 *
 * 🔒 Exact copy from conversation-manager.ts line 360-373
 * Strategy: Character-by-character preservation
 * Purpose: Build system instructions with optional custom prompts
 */

import { DEFAULT_SYSTEM_PROMPT } from '@/constants/prompts';

export interface SystemPromptContext {
  systemSettings?: {
    systemPrompts: {
      system?: string;
      jailbreak?: string;
    };
    enableSystemPrompt: boolean;
    enableJailbreakPrompt: boolean;
  };
}

export class SystemPromptSection {
  /**
   * Build system prompt section
   *
   * 🔒 EXACT COPY from conversation-manager.ts line 360-373
   */
  build(context: SystemPromptContext): string {
    // 🔒 line 361 - exact copy
    let systemPromptContent = DEFAULT_SYSTEM_PROMPT;

    // 🔒 line 363-371 - exact copy
    // カスタムプロンプトが有効で内容がある場合は追加
    if (
      context.systemSettings?.enableSystemPrompt &&
      context.systemSettings.systemPrompts?.system &&
      context.systemSettings.systemPrompts.system.trim() !==
        DEFAULT_SYSTEM_PROMPT.trim()
    ) {
      systemPromptContent += `\n\n## 追加指示\n${context.systemSettings.systemPrompts.system}`;
    }

    // 🔒 line 373 - exact copy
    return `<system_instructions>\n${systemPromptContent}\n</system_instructions>\n\n`;
  }
}

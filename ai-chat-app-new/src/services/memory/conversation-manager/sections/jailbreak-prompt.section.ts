/**
 * Jailbreak Prompt Section
 *
 * 🔒 Exact copy from conversation-manager.ts line 717-727
 * Strategy: Character-by-character preservation
 * Purpose: Build custom jailbreak instructions
 */

import { DEFAULT_JAILBREAK_PROMPT } from '@/constants/prompts';

export interface JailbreakPromptContext {
  systemSettings?: {
    systemPrompts: {
      system?: string;
      jailbreak?: string;
    };
    enableSystemPrompt: boolean;
    enableJailbreakPrompt: boolean;
  };
}

export class JailbreakPromptSection {
  /**
   * Build jailbreak prompt section
   *
   * 🔒 EXACT COPY from conversation-manager.ts line 717-727
   */
  build(context: JailbreakPromptContext): string {
    const { systemSettings } = context;
    let prompt = "";

    // 🔒 line 717-727 - exact copy
    // 10. Jailbreak Prompt (制限回避) - DEFAULT_SYSTEM_PROMPTに既に含まれているため、カスタムのみ追加
    if (
      systemSettings?.enableJailbreakPrompt &&
      systemSettings.systemPrompts?.jailbreak &&
      systemSettings.systemPrompts.jailbreak.trim() !==
        DEFAULT_JAILBREAK_PROMPT.trim()
    ) {
      // カスタム脱獄プロンプトのみ追加（DEFAULT_SYSTEM_PROMPTと重複しない場合）
      prompt += `<jailbreak_instructions>\n${systemSettings.systemPrompts.jailbreak}\n</jailbreak_instructions>\n\n`;
    }
    // DEFAULT_JAILBREAK_PROMPTは送信しない（DEFAULT_SYSTEM_PROMPTに既に含まれているため）

    return prompt;
  }
}

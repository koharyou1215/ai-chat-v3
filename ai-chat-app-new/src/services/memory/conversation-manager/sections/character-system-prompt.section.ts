/**
 * Character System Prompt Section
 *
 * 🔒 Exact copy from conversation-manager.ts line 712-715
 * Strategy: Character-by-character preservation
 * Purpose: Build character-specific system prompt
 */

import type { Character } from '@/types';

export interface CharacterSystemPromptContext {
  processedCharacter?: Character;
}

export class CharacterSystemPromptSection {
  /**
   * Build character system prompt section
   *
   * 🔒 EXACT COPY from conversation-manager.ts line 712-715
   */
  build(context: CharacterSystemPromptContext): string {
    const { processedCharacter } = context;
    let prompt = "";

    // 🔒 line 712-715 - exact copy
    // 9. Character System Prompt (キャラクター固有のシステムプロンプト)
    if (processedCharacter?.system_prompt) {
      prompt += `<character_system_prompt>\n${processedCharacter.system_prompt}\n</character_system_prompt>\n\n`;
    }

    return prompt;
  }
}

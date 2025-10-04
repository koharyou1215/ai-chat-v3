/**
 * Personality Subsection
 *
 * 🔒 Exact copy from character-info.section.ts lines 52-59
 * Strategy: Character-by-character preservation
 * Purpose: Build character personality details (Overall, External, Internal)
 */

import type { Character } from '@/types';

export interface PersonalityContext {
  processedCharacter: Character;
}

export class PersonalitySubsection {
  /**
   * Build personality section
   *
   * 🔒 EXACT COPY from character-info.section.ts lines 52-59
   */
  build(context: PersonalityContext): string {
    const { processedCharacter } = context;
    let prompt = "";

    // 🔒 lines 52-59 - exact copy
    // 性格詳細
    prompt += `\n## Personality\n`;
    if (processedCharacter.personality)
      prompt += `Overall: ${processedCharacter.personality}\n`;
    if (processedCharacter.external_personality)
      prompt += `External (How others see them): ${processedCharacter.external_personality}\n`;
    if (processedCharacter.internal_personality)
      prompt += `Internal (True feelings): ${processedCharacter.internal_personality}\n`;

    return prompt;
  }
}

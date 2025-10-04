/**
 * Communication Style Subsection
 *
 * 🔒 Exact copy from character-info.section.ts lines 120-138
 * Strategy: Character-by-character preservation
 * Purpose: Build character speaking style and verbal patterns
 */

import type { Character } from '@/types';

export interface CommunicationStyleContext {
  processedCharacter: Character;
}

export class CommunicationStyleSubsection {
  /**
   * Build communication style section
   *
   * 🔒 EXACT COPY from character-info.section.ts lines 120-138
   */
  build(context: CommunicationStyleContext): string {
    const { processedCharacter } = context;
    let prompt = "";

    // 🔒 lines 120-138 - exact copy
    // 話し方・言語スタイル
    prompt += `\n## Communication Style\n`;
    if (processedCharacter.speaking_style)
      prompt += `Speaking Style: ${processedCharacter.speaking_style}\n`;
    if (processedCharacter.first_person)
      prompt += `First Person: ${processedCharacter.first_person}\n`;
    if (processedCharacter.second_person)
      prompt += `Second Person: ${processedCharacter.second_person}\n`;
    if (
      processedCharacter.verbal_tics &&
      (Array.isArray(processedCharacter.verbal_tics)
        ? processedCharacter.verbal_tics.length > 0
        : processedCharacter.verbal_tics)
    ) {
      const verbal_tics = Array.isArray(processedCharacter.verbal_tics)
        ? processedCharacter.verbal_tics
        : `${processedCharacter.verbal_tics}`.split(",").map((s) => s.trim());
      prompt += `Verbal Tics: ${verbal_tics.join(", ")}\n`;
    }

    return prompt;
  }
}

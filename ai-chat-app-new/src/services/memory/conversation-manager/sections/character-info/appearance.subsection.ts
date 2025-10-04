/**
 * Appearance Subsection
 *
 * 🔒 Exact copy from character-info.section.ts lines 46-50
 * Strategy: Character-by-character preservation
 * Purpose: Build character appearance description
 */

import type { Character } from '@/types';

export interface AppearanceContext {
  processedCharacter: Character;
}

export class AppearanceSubsection {
  /**
   * Build appearance section
   *
   * 🔒 EXACT COPY from character-info.section.ts lines 46-50
   */
  build(context: AppearanceContext): string {
    const { processedCharacter } = context;
    let prompt = "";

    // 🔒 lines 46-50 - exact copy
    // 外見
    if (processedCharacter.appearance) {
      prompt += `\n## Appearance\n`;
      prompt += `${processedCharacter.appearance}\n`;
    }

    return prompt;
  }
}

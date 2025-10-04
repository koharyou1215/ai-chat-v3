/**
 * Traits Subsection
 *
 * 🔒 Exact copy from character-info.section.ts lines 61-83
 * Strategy: Character-by-character preservation
 * Purpose: Build character strengths and weaknesses
 */

import type { Character } from '@/types';

export interface TraitsContext {
  processedCharacter: Character;
}

export class TraitsSubsection {
  /**
   * Build traits section (strengths and weaknesses)
   *
   * 🔒 EXACT COPY from character-info.section.ts lines 61-83
   */
  build(context: TraitsContext): string {
    const { processedCharacter } = context;
    let prompt = "";

    // 🔒 lines 61-83 - exact copy
    // 長所・短所
    if (
      processedCharacter.strengths &&
      (Array.isArray(processedCharacter.strengths)
        ? processedCharacter.strengths.length > 0
        : processedCharacter.strengths)
    ) {
      const strengths = Array.isArray(processedCharacter.strengths)
        ? processedCharacter.strengths
        : `${processedCharacter.strengths}`.split(",").map((s) => s.trim());
      prompt += `Strengths: ${strengths.join(", ")}\n`;
    }
    if (
      processedCharacter.weaknesses &&
      (Array.isArray(processedCharacter.weaknesses)
        ? processedCharacter.weaknesses.length > 0
        : processedCharacter.weaknesses)
    ) {
      const weaknesses = Array.isArray(processedCharacter.weaknesses)
        ? processedCharacter.weaknesses
        : `${processedCharacter.weaknesses}`.split(",").map((s) => s.trim());
      prompt += `Weaknesses: ${weaknesses.join(", ")}\n`;
    }

    return prompt;
  }
}

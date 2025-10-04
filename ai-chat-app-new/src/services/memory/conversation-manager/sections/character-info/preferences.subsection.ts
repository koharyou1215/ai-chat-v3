/**
 * Preferences Subsection
 *
 * 🔒 Exact copy from character-info.section.ts lines 85-118
 * Strategy: Character-by-character preservation
 * Purpose: Build character hobbies, likes, and dislikes
 */

import type { Character } from '@/types';

export interface PreferencesContext {
  processedCharacter: Character;
}

export class PreferencesSubsection {
  /**
   * Build preferences section (hobbies, likes, dislikes)
   *
   * 🔒 EXACT COPY from character-info.section.ts lines 85-118
   */
  build(context: PreferencesContext): string {
    const { processedCharacter } = context;
    let prompt = "";

    // 🔒 lines 85-118 - exact copy
    // 趣味・好み
    if (
      processedCharacter.hobbies &&
      (Array.isArray(processedCharacter.hobbies)
        ? processedCharacter.hobbies.length > 0
        : processedCharacter.hobbies)
    ) {
      const hobbies = Array.isArray(processedCharacter.hobbies)
        ? processedCharacter.hobbies
        : `${processedCharacter.hobbies}`.split(",").map((s) => s.trim());
      prompt += `Hobbies: ${hobbies.join(", ")}\n`;
    }
    if (
      processedCharacter.likes &&
      (Array.isArray(processedCharacter.likes)
        ? processedCharacter.likes.length > 0
        : processedCharacter.likes)
    ) {
      const likes = Array.isArray(processedCharacter.likes)
        ? processedCharacter.likes
        : `${processedCharacter.likes}`.split(",").map((s) => s.trim());
      prompt += `Likes: ${likes.join(", ")}\n`;
    }
    if (
      processedCharacter.dislikes &&
      (Array.isArray(processedCharacter.dislikes)
        ? processedCharacter.dislikes.length > 0
        : processedCharacter.dislikes)
    ) {
      const dislikes = Array.isArray(processedCharacter.dislikes)
        ? processedCharacter.dislikes
        : `${processedCharacter.dislikes}`.split(",").map((s) => s.trim());
      prompt += `Dislikes: ${dislikes.join(", ")}\n`;
    }

    return prompt;
  }
}

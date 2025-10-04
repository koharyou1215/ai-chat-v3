/**
 * Basic Information Subsection
 *
 * 🔒 Exact copy from character-info.section.ts lines 31-44
 * Strategy: Character-by-character preservation
 * Purpose: Build basic character information (Name, Age, Occupation, Catchphrase, Tags)
 */

import type { Character } from '@/types';

export interface BasicInfoContext {
  processedCharacter: Character;
}

export class BasicInfoSubsection {
  /**
   * Build basic information
   *
   * 🔒 EXACT COPY from character-info.section.ts lines 31-44
   */
  build(context: BasicInfoContext): string {
    const { processedCharacter } = context;
    let prompt = "";

    // 🔒 lines 31-44 - exact copy
    // 基本情報
    prompt += `## Basic Information\n`;
    prompt += `Name: ${processedCharacter.name}\n`;
    if (processedCharacter.age) prompt += `Age: ${processedCharacter.age}\n`;
    if (processedCharacter.occupation)
      prompt += `Occupation: ${processedCharacter.occupation}\n`;
    if (processedCharacter.catchphrase)
      prompt += `Catchphrase: "${processedCharacter.catchphrase}"\n`;
    if (
      processedCharacter.tags &&
      Array.isArray(processedCharacter.tags) &&
      processedCharacter.tags.length > 0
    ) {
      prompt += `Tags: ${processedCharacter.tags.join(", ")}\n`;
    }

    return prompt;
  }
}

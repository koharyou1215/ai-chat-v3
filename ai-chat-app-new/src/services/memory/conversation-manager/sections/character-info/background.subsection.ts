/**
 * Background Subsection
 *
 * 🔒 Exact copy from character-info.section.ts lines 140-151
 * Strategy: Character-by-character preservation
 * Purpose: Build character background, scenario, and first message
 */

import type { Character } from '@/types';

export interface BackgroundContext {
  processedCharacter: Character;
}

export class BackgroundSubsection {
  /**
   * Build background section
   *
   * 🔒 EXACT COPY from character-info.section.ts lines 140-151
   */
  build(context: BackgroundContext): string {
    const { processedCharacter } = context;
    let prompt = "";

    // 🔒 lines 140-151 - exact copy
    // 背景・シナリオ
    if (processedCharacter.background) {
      prompt += `\n## Background\n${processedCharacter.background}\n`;
    }
    if (processedCharacter.scenario) {
      prompt += `\n## Current Scenario\n${processedCharacter.scenario}\n`;
    }

    // 初回メッセージ（参考として）
    if (processedCharacter.first_message) {
      prompt += `\n## Reference First Message\n"${processedCharacter.first_message}"\n`;
    }

    return prompt;
  }
}

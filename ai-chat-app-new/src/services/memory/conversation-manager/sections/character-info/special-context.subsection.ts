/**
 * Special Context Subsection
 *
 * 🔒 Exact copy from character-info.section.ts lines 153-195
 * Strategy: Character-by-character preservation
 * Purpose: Build NSFW profile and special context information
 */

import type { Character } from '@/types';

export interface SpecialContextContext {
  processedCharacter: Character;
}

export class SpecialContextSubsection {
  /**
   * Build special context section (NSFW profile)
   *
   * 🔒 EXACT COPY from character-info.section.ts lines 153-195
   */
  build(context: SpecialContextContext): string {
    const { processedCharacter } = context;
    let prompt = "";

    // 🔒 lines 153-195 - exact copy
    // NSFW設定（適切に処理）
    if (processedCharacter.nsfw_profile) {
      const nsfw = processedCharacter.nsfw_profile;
      let hasNsfwContent = false;

      prompt += `\n## Special Context\n`;

      // persona フィールド (CharacterFormで使用)
      if (nsfw.persona && nsfw.persona.trim()) {
        prompt += `Context Profile: ${nsfw.persona}\n`;
        hasNsfwContent = true;
      }

      // libido_level フィールド (CharacterFormで使用)
      if (nsfw.libido_level && nsfw.libido_level.trim()) {
        prompt += `Libido Level: ${nsfw.libido_level}\n`;
        hasNsfwContent = true;
      }

      // 従来のフィールドも保持（後方互換性） - persona field has been moved to persona_profile
      if (nsfw.situation && nsfw.situation.trim()) {
        prompt += `Situation: ${nsfw.situation}\n`;
        hasNsfwContent = true;
      }
      if (nsfw.mental_state && nsfw.mental_state.trim()) {
        prompt += `Mental State: ${nsfw.mental_state}\n`;
        hasNsfwContent = true;
      }

      // kinks配列の処理
      if (Array.isArray(nsfw.kinks) && nsfw.kinks.length > 0) {
        const validKinks = nsfw.kinks.filter((k) => k && k.trim());
        if (validKinks.length > 0) {
          prompt += `Preferences: ${validKinks.join(", ")}\n`;
          hasNsfwContent = true;
        }
      }

      // Special Contextセクションが空の場合は削除
      if (!hasNsfwContent) {
        prompt = prompt.replace(/\n## Special Context\n$/, "");
      }
    }

    return prompt;
  }
}

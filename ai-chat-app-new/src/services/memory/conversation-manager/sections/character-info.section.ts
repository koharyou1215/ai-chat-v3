/**
 * Character Information Section
 *
 * 🔒 Exact copy from conversation-manager.ts line 375-547
 * Strategy: Character-by-character preservation
 * Purpose: Build comprehensive character context
 */

import type { Character } from '@/types';

export interface CharacterInfoContext {
  processedCharacter?: Character;
}

export class CharacterInfoSection {
  /**
   * Build character information section
   *
   * 🔒 EXACT COPY from conversation-manager.ts line 375-547
   */
  build(context: CharacterInfoContext): string {
    const { processedCharacter } = context;
    let prompt = "";

    // 🔒 line 376-547 - exact copy
    // 4. Character Information (Enhanced)
    if (processedCharacter) {
      prompt += "<character_information>\n";

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

      // 外見
      if (processedCharacter.appearance) {
        prompt += `\n## Appearance\n`;
        prompt += `${processedCharacter.appearance}\n`;
      }

      // 性格詳細
      prompt += `\n## Personality\n`;
      if (processedCharacter.personality)
        prompt += `Overall: ${processedCharacter.personality}\n`;
      if (processedCharacter.external_personality)
        prompt += `External (How others see them): ${processedCharacter.external_personality}\n`;
      if (processedCharacter.internal_personality)
        prompt += `Internal (True feelings): ${processedCharacter.internal_personality}\n`;

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

      prompt += "</character_information>\n\n";
    }

    return prompt;
  }
}

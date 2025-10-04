/**
 * Character Information Section (Orchestrator)
 *
 * Phase 2: Refactored to use 8 subsections
 * Strategy: Delegate to focused subsections while maintaining exact output
 * Purpose: Build comprehensive character context
 */

import type { Character } from '@/types';
import {
  BasicInfoSubsection,
  AppearanceSubsection,
  PersonalitySubsection,
  TraitsSubsection,
  PreferencesSubsection,
  CommunicationStyleSubsection,
  BackgroundSubsection,
  SpecialContextSubsection,
} from './character-info';

export interface CharacterInfoContext {
  processedCharacter?: Character;
}

export class CharacterInfoSection {
  // Initialize all subsections
  private basicInfo = new BasicInfoSubsection();
  private appearance = new AppearanceSubsection();
  private personality = new PersonalitySubsection();
  private traits = new TraitsSubsection();
  private preferences = new PreferencesSubsection();
  private communicationStyle = new CommunicationStyleSubsection();
  private background = new BackgroundSubsection();
  private specialContext = new SpecialContextSubsection();

  /**
   * Build character information section
   *
   * Phase 2: Orchestrates 8 subsections to build character prompt
   * Maintains exact output as Phase 1 version
   */
  build(context: CharacterInfoContext): string {
    const { processedCharacter } = context;

    // Early return if no character
    if (!processedCharacter) {
      return "";
    }

    // Opening tag
    let prompt = "<character_information>\n";

    // Delegate to subsections in exact same order as original
    // 1. Basic Information (lines 31-44)
    prompt += this.basicInfo.build({ processedCharacter });

    // 2. Appearance (lines 46-50)
    prompt += this.appearance.build({ processedCharacter });

    // 3. Personality (lines 52-59)
    prompt += this.personality.build({ processedCharacter });

    // 4. Traits - Strengths & Weaknesses (lines 61-83)
    prompt += this.traits.build({ processedCharacter });

    // 5. Preferences - Hobbies, Likes, Dislikes (lines 85-118)
    prompt += this.preferences.build({ processedCharacter });

    // 6. Communication Style (lines 120-138)
    prompt += this.communicationStyle.build({ processedCharacter });

    // 7. Background & Scenario (lines 140-151)
    prompt += this.background.build({ processedCharacter });

    // 8. Special Context - NSFW Profile (lines 153-195)
    prompt += this.specialContext.build({ processedCharacter });

    // Closing tag
    prompt += "</character_information>\n\n";

    return prompt;
  }
}

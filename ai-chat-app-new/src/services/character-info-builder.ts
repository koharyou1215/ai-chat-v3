/**
 * Character Info Builder
 *
 * Handles both Mem0Character and standard Character formats
 * and produces a unified prompt-facing character section.
 */

import { Character } from '@/types';
import { logger } from '@/utils/logger';

/**
 * Core Mem0 character payload used for prompt generation.
 */
export interface Mem0CharacterCore {
  identity: {
    name: string;
    age?: string;
    occupation?: string;
    role?: string;
  };
  personality: {
    external: string;
    internal: string;
    traits: string[];
  };
  communication: {
    speaking_style: string;
    first_person: string;
    second_person: string;
    verbal_tics: string[];
  };
  principles: string[];
}

/**
 * Normalized intermediate character structure for legacy prompt formatting.
 */
interface NormalizedCharacter {
  name: string;
  age?: string;
  occupation?: string;
  role?: string;
  catchphrase?: string;
  personality?: string;
  external_personality?: string;
  internal_personality?: string;
  traits?: string[];
  strengths?: string[];
  weaknesses?: string[];
  likes?: string[];
  dislikes?: string[];
  hobbies?: string[];
  appearance?: string;
  speaking_style?: string;
  first_person?: string;
  second_person?: string;
  verbal_tics?: string[];
  principles?: string[];
  background?: string;
  scenario?: string;
  nsfw_profile?: {
    persona?: string;
    libido_mechanism?: string;
    libido_level?: string;
    situation?: string;
    mental_state?: string;
    kinks?: string[];
    body_betrayal_patterns?: string[];
    anatomical_vocabulary?: {
      preferred_terms?: string[];
      prohibited_euphemisms?: string[];
    };
  };
}

/**
 * Character Info Builder
 */
export class CharacterInfoBuilder {
  /**
   * Build prompt-ready character information from either Character or Mem0 core.
   */
  static build(source: Character | Mem0CharacterCore): string {
    if (this.hasAdvancedFormat(source)) {
      logger.debug('[CharacterInfoBuilder] Using PList + Ali:Chat advanced format');
      return this.buildFromAdvancedFormat(source);
    }

    logger.debug('[CharacterInfoBuilder] Using legacy format');

    const normalized = this.normalize(source);
    return this.buildPrompt(normalized);
  }

  private static isMem0CharacterCore(source: Character | Mem0CharacterCore): source is Mem0CharacterCore {
    const candidate = source as Partial<Mem0CharacterCore>;

    return (
      typeof candidate.identity === 'object' &&
      candidate.identity !== null &&
      typeof candidate.identity.name === 'string' &&
      typeof candidate.communication === 'object' &&
      candidate.communication !== null &&
      Array.isArray(candidate.principles)
    );
  }

  private static hasAdvancedFormat(source: Character | Mem0CharacterCore): source is Character {
    return !this.isMem0CharacterCore(source) && !!(source.plist_profile && source.ali_chat_examples);
  }

  private static buildFromAdvancedFormat(character: Character): string {
    const sections: string[] = [];

    sections.push(`## Basic Information\nName: ${character.name}`);
    if (character.age) sections.push(`Age: ${character.age}`);
    if (character.occupation) sections.push(`Occupation: ${character.occupation}`);
    if (character.catchphrase) sections.push(`Catchphrase: "${character.catchphrase}"`);

    if (character.plist_profile) {
      sections.push(`## Character Profile (PList Format)\n\n${character.plist_profile}`);
    }

    if (character.ali_chat_examples) {
      sections.push(`## Dynamic Performance (Ali:Chat)\n\n${character.ali_chat_examples}`);
    }

    if (character.advanced_first_message) {
      sections.push(`## First Message\n\n${character.advanced_first_message}`);
    }

    if (character.nsfw_profile) {
      const nsfwInfo: string[] = [];
      if (character.nsfw_profile.persona) nsfwInfo.push(`Persona: ${character.nsfw_profile.persona}`);
      const libidoInfo = character.nsfw_profile.libido_mechanism || character.nsfw_profile.libido_level;
      if (libidoInfo) nsfwInfo.push(`Libido Mechanism: ${libidoInfo}`);
      if (character.nsfw_profile.situation) nsfwInfo.push(`Situation: ${character.nsfw_profile.situation}`);
      if (character.nsfw_profile.mental_state) nsfwInfo.push(`Mental State: ${character.nsfw_profile.mental_state}`);
      if (character.nsfw_profile.kinks && character.nsfw_profile.kinks.length > 0) {
        nsfwInfo.push(`Kinks: ${character.nsfw_profile.kinks.join(', ')}`);
      }
      if (character.nsfw_profile.body_betrayal_patterns && character.nsfw_profile.body_betrayal_patterns.length > 0) {
        nsfwInfo.push(`Body Betrayal Patterns: ${character.nsfw_profile.body_betrayal_patterns.join('\n- ')}`);
      }
      if (character.nsfw_profile.anatomical_vocabulary) {
        if (character.nsfw_profile.anatomical_vocabulary.preferred_terms && character.nsfw_profile.anatomical_vocabulary.preferred_terms.length > 0) {
          nsfwInfo.push(`Anatomical Vocabulary (Preferred): ${character.nsfw_profile.anatomical_vocabulary.preferred_terms.join(', ')}`);
        }
        if (character.nsfw_profile.anatomical_vocabulary.prohibited_euphemisms && character.nsfw_profile.anatomical_vocabulary.prohibited_euphemisms.length > 0) {
          nsfwInfo.push(`Anatomical Vocabulary (Prohibited): ${character.nsfw_profile.anatomical_vocabulary.prohibited_euphemisms.join(', ')}`);
        }
      }

      if (nsfwInfo.length > 0) {
        sections.push(`## NSFW Profile\n${nsfwInfo.join('\n')}`);
      }
    }

    const contextInfo: string[] = [];
    if (character.background) contextInfo.push(`Background: ${character.background}`);
    if (character.scenario) contextInfo.push(`Current Scenario: ${character.scenario}`);

    if (contextInfo.length > 0) {
      sections.push(`## Context\n${contextInfo.join('\n')}`);
    }

    return sections.join('\n\n');
  }

  /**
   * Normalize source data into a legacy prompt-friendly structure.
   */
  private static normalize(source: Character | Mem0CharacterCore): NormalizedCharacter {
    if (this.isMem0CharacterCore(source)) {
      return {
        name: source.identity.name,
        age: source.identity.age,
        occupation: source.identity.occupation,
        role: source.identity.role,
        external_personality: source.personality.external,
        internal_personality: source.personality.internal,
        traits: source.personality.traits,
        speaking_style: source.communication.speaking_style,
        first_person: source.communication.first_person,
        second_person: source.communication.second_person,
        verbal_tics: source.communication.verbal_tics,
        principles: source.principles,
      };
    }

    return {
      name: source.name,
      age: source.age,
      occupation: source.occupation,
      catchphrase: source.catchphrase,
      personality: source.personality,
      external_personality: source.external_personality,
      internal_personality: source.internal_personality,
      strengths: source.strengths,
      weaknesses: source.weaknesses,
      likes: source.likes,
      dislikes: source.dislikes,
      hobbies: source.hobbies,
      appearance: source.appearance,
      speaking_style: source.speaking_style,
      first_person: source.first_person,
      second_person: source.second_person,
      verbal_tics: source.verbal_tics,
      background: source.background,
      scenario: source.scenario,
      nsfw_profile: source.nsfw_profile,
    };
  }

  /**
   * Build the legacy prompt format.
   */
  private static buildPrompt(char: NormalizedCharacter): string {
    const sections: string[] = [];

    const basicInfo: string[] = [`Name: ${char.name}`];
    if (char.age) basicInfo.push(`Age: ${char.age}`);
    if (char.occupation) basicInfo.push(`Occupation: ${char.occupation}`);
    if (char.role) basicInfo.push(`Role: ${char.role}`);
    if (char.catchphrase) basicInfo.push(`Catchphrase: "${char.catchphrase}"`);

    sections.push(`## Basic Information\n${basicInfo.join('\n')}`);

    const personalityInfo: string[] = [];
    if (char.personality) personalityInfo.push(`Personality: ${char.personality}`);
    if (char.external_personality) personalityInfo.push(`External: ${char.external_personality}`);
    if (char.internal_personality) personalityInfo.push(`Internal: ${char.internal_personality}`);
    if (char.traits && char.traits.length > 0) personalityInfo.push(`Traits: ${char.traits.join(', ')}`);
    if (char.strengths && char.strengths.length > 0) personalityInfo.push(`Strengths: ${char.strengths.join(', ')}`);
    if (char.weaknesses && char.weaknesses.length > 0) personalityInfo.push(`Weaknesses: ${char.weaknesses.join(', ')}`);

    if (personalityInfo.length > 0) {
      sections.push(`## Personality & Traits\n${personalityInfo.join('\n')}`);
    }

    const preferencesInfo: string[] = [];
    if (char.likes && char.likes.length > 0) preferencesInfo.push(`Likes: ${char.likes.join(', ')}`);
    if (char.dislikes && char.dislikes.length > 0) preferencesInfo.push(`Dislikes: ${char.dislikes.join(', ')}`);
    if (char.hobbies && char.hobbies.length > 0) preferencesInfo.push(`Hobbies: ${char.hobbies.join(', ')}`);

    if (preferencesInfo.length > 0) {
      sections.push(`## Preferences & Style\n${preferencesInfo.join('\n')}`);
    }

    if (char.appearance) {
      sections.push(`## Appearance\n${char.appearance}`);
    }

    const commInfo: string[] = [];
    if (char.speaking_style) commInfo.push(`Speaking Style: ${char.speaking_style}`);
    if (char.first_person) commInfo.push(`First Person: ${char.first_person}`);
    if (char.second_person) commInfo.push(`Second Person: ${char.second_person}`);
    if (char.verbal_tics && char.verbal_tics.length > 0) commInfo.push(`Verbal Tics: ${char.verbal_tics.join(', ')}`);

    if (commInfo.length > 0) {
      sections.push(`## Communication Style\n${commInfo.join('\n')}`);
    }

    if (char.principles && char.principles.length > 0) {
      sections.push(`## Behavioral Principles\n${char.principles.map((principle) => `- ${principle}`).join('\n')}`);
    }

    if (char.nsfw_profile) {
      const nsfwInfo: string[] = [];
      if (char.nsfw_profile.persona) nsfwInfo.push(`Persona: ${char.nsfw_profile.persona}`);
      const libidoInfo = char.nsfw_profile.libido_mechanism || char.nsfw_profile.libido_level;
      if (libidoInfo) nsfwInfo.push(`Libido Mechanism: ${libidoInfo}`);
      if (char.nsfw_profile.situation) nsfwInfo.push(`Situation: ${char.nsfw_profile.situation}`);
      if (char.nsfw_profile.mental_state) nsfwInfo.push(`Mental State: ${char.nsfw_profile.mental_state}`);
      if (char.nsfw_profile.kinks && char.nsfw_profile.kinks.length > 0) {
        nsfwInfo.push(`Kinks: ${char.nsfw_profile.kinks.join(', ')}`);
      }
      if (char.nsfw_profile.body_betrayal_patterns && char.nsfw_profile.body_betrayal_patterns.length > 0) {
        nsfwInfo.push(`Body Betrayal Patterns: ${char.nsfw_profile.body_betrayal_patterns.join('\n- ')}`);
      }
      if (char.nsfw_profile.anatomical_vocabulary) {
        if (char.nsfw_profile.anatomical_vocabulary.preferred_terms && char.nsfw_profile.anatomical_vocabulary.preferred_terms.length > 0) {
          nsfwInfo.push(`Anatomical Vocabulary (Preferred): ${char.nsfw_profile.anatomical_vocabulary.preferred_terms.join(', ')}`);
        }
        if (char.nsfw_profile.anatomical_vocabulary.prohibited_euphemisms && char.nsfw_profile.anatomical_vocabulary.prohibited_euphemisms.length > 0) {
          nsfwInfo.push(`Anatomical Vocabulary (Prohibited): ${char.nsfw_profile.anatomical_vocabulary.prohibited_euphemisms.join(', ')}`);
        }
      }

      if (nsfwInfo.length > 0) {
        sections.push(`## NSFW Profile\n${nsfwInfo.join('\n')}`);
      }
    }

    const contextInfo: string[] = [];
    if (char.background) contextInfo.push(`Background: ${char.background}`);
    if (char.scenario) contextInfo.push(`Current Scenario: ${char.scenario}`);

    if (contextInfo.length > 0) {
      sections.push(`## Context\n${contextInfo.join('\n')}`);
    }

    return sections.join('\n\n');
  }
}

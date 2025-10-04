/**
 * Phase 1 Section Validation Test
 *
 * Purpose: Validate individual prompt sections produce expected output
 * Strategy: Test each section independently without full ConversationManager
 */

import { describe, it, expect } from '@jest/globals';
import {
  SystemDefinitionsSection,
  SystemPromptSection,
  CharacterInfoSection,
  PersonaInfoSection,
  CurrentInputSection,
} from '@/services/memory/conversation-manager/sections';
import type { Character, Persona } from '@/types';

describe('Phase 1: Prompt Section Validation', () => {
  describe('SystemDefinitionsSection', () => {
    it('should produce exact expected output', () => {
      const section = new SystemDefinitionsSection();
      const result = section.build({});

      expect(result).toBe('AI={{char}}, User={{user}}\n\n');
      expect(result.length).toBe('AI={{char}}, User={{user}}\n\n'.length);
    });
  });

  describe('SystemPromptSection', () => {
    it('should include default system prompt', () => {
      const section = new SystemPromptSection();
      const result = section.build({});

      expect(result).toContain('<system_instructions>');
      expect(result).toContain('</system_instructions>');
    });

    it('should include custom system prompt when enabled', () => {
      const section = new SystemPromptSection();
      const customPrompt = 'カスタムシステムプロンプト';

      const result = section.build({
        systemSettings: {
          systemPrompts: {
            system: customPrompt,
            jailbreak: '',
          },
          enableSystemPrompt: true,
          enableJailbreakPrompt: false,
        },
      });

      expect(result).toContain(customPrompt);
      expect(result).toContain('追加指示');
    });

    it('should not duplicate default prompt', () => {
      const section = new SystemPromptSection();
      const result = section.build({});

      // Should only appear once
      const matches = result.match(/<system_instructions>/g);
      expect(matches?.length).toBe(1);
    });
  });

  describe('CharacterInfoSection', () => {
    const testCharacter: Character = {
      id: 'test-char',
      name: 'テストキャラクター',
      description: 'テスト用',
      personality: '親切',
      scenario: 'カフェ',
      first_mes: 'こんにちは',
      mes_example: 'Example',
      avatar_url: '/test.png',
      background_url: '/bg.png',
      creator: 'tester',
      character_version: '1.0',
      tags: ['test'],
      spec: 'chara_card_v3',
      spec_version: '3.0',
      data: {
        name: 'テストキャラクター',
        description: 'テスト用',
        personality: '親切',
        scenario: 'カフェ',
        first_mes: 'こんにちは',
        mes_example: 'Example',
        creator_notes: '',
        tags: ['test'],
        creator: 'tester',
        character_version: '1.0',
        alternate_greetings: [],
        extensions: {},
      },
    };

    it('should produce character section with proper tags', () => {
      const section = new CharacterInfoSection();
      const result = section.build({ processedCharacter: testCharacter });

      expect(result).toContain('<character_information>');
      expect(result).toContain('</character_information>');
      expect(result).toContain('テストキャラクター');
      expect(result).toContain('## Basic Information');
    });

    it('should handle empty character gracefully', () => {
      const section = new CharacterInfoSection();
      const result = section.build({});

      expect(result).toBe('');
    });

    it('should include all character properties', () => {
      const section = new CharacterInfoSection();
      const result = section.build({ processedCharacter: testCharacter });

      expect(result).toContain('Name: テストキャラクター');
      expect(result).toContain('## Personality');
    });
  });

  describe('PersonaInfoSection', () => {
    const testPersona: Persona = {
      id: 'test-persona',
      name: 'テストユーザー',
      description: 'テスト',
      role: 'user',
      avatar_url: '/user.png',
      other_settings: 'カジュアル',
    };

    it('should produce persona section with proper tags', () => {
      const section = new PersonaInfoSection();
      const result = section.build({ persona: testPersona });

      expect(result).toContain('<persona_information>');
      expect(result).toContain('</persona_information>');
      expect(result).toContain('テストユーザー');
    });

    it('should log warning when persona is missing', () => {
      const section = new PersonaInfoSection();
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      section.build({});

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('No persona provided')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('CurrentInputSection', () => {
    it('should format user input correctly', () => {
      const section = new CurrentInputSection();
      const result = section.build({
        userInput: 'こんにちは',
        variableContext: {},
      });

      expect(result).toContain('User: こんにちは');
      expect(result).toContain('AI: ');
    });

    it('should handle variable replacement', () => {
      const section = new CurrentInputSection();
      const result = section.build({
        userInput: 'Hello {{char}}',
        variableContext: {
          character: {
            name: 'TestChar',
          } as Character,
        },
      });

      expect(result).toContain('TestChar');
    });
  });

  describe('Section Integration', () => {
    it('should produce consistent output across multiple builds', () => {
      const section = new SystemDefinitionsSection();

      const result1 = section.build({});
      const result2 = section.build({});
      const result3 = section.build({});

      expect(result1).toBe(result2);
      expect(result2).toBe(result3);
    });

    it('should maintain exact character count', () => {
      const section = new SystemDefinitionsSection();
      const result = section.build({});

      // Exact character count should be consistent
      expect(result.length).toBe(27); // "AI={{char}}, User={{user}}\n\n"
    });
  });
});

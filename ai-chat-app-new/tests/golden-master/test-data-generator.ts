/**
 * Golden Master Test Data Generator
 *
 * Purpose: Generate diverse test cases for prompt quality guarantee
 * Strategy: Character-by-character exact match verification
 */

import type { Character, Persona } from '@/types';

export interface TestCase {
  id: string;
  description: string;
  userInput: string;
  character?: Character;
  persona?: Persona;
  systemSettings?: {
    systemPrompts: {
      system?: string;
      jailbreak?: string;
    };
    enableSystemPrompt: boolean;
    enableJailbreakPrompt: boolean;
  };
}

export function generateTestCases(count: number): TestCase[] {
  const testCases: TestCase[] = [];

  // Test Case Categories:
  // 1. Minimal (no character, no persona)
  // 2. Character only
  // 3. Persona only
  // 4. Character + Persona
  // 5. With custom system prompts
  // 6. Various conversation lengths
  // 7. Edge cases (empty strings, special characters)

  // Category 1: Minimal cases
  for (let i = 0; i < count * 0.1; i++) {
    testCases.push({
      id: `minimal-${i}`,
      description: `Minimal case - no character, no persona`,
      userInput: `Test message ${i}`,
    });
  }

  // Category 2: Character only
  for (let i = 0; i < count * 0.2; i++) {
    testCases.push({
      id: `character-only-${i}`,
      description: `Character only case`,
      userInput: `Character test ${i}`,
      character: createTestCharacter(i),
    });
  }

  // Category 3: Persona only
  for (let i = 0; i < count * 0.1; i++) {
    testCases.push({
      id: `persona-only-${i}`,
      description: `Persona only case`,
      userInput: `Persona test ${i}`,
      persona: createTestPersona(i),
    });
  }

  // Category 4: Character + Persona
  for (let i = 0; i < count * 0.3; i++) {
    testCases.push({
      id: `full-context-${i}`,
      description: `Full context with character and persona`,
      userInput: `Full context test ${i}`,
      character: createTestCharacter(i),
      persona: createTestPersona(i),
    });
  }

  // Category 5: Custom system prompts
  for (let i = 0; i < count * 0.15; i++) {
    testCases.push({
      id: `custom-prompts-${i}`,
      description: `Custom system and jailbreak prompts`,
      userInput: `Custom prompt test ${i}`,
      character: createTestCharacter(i),
      persona: createTestPersona(i),
      systemSettings: {
        systemPrompts: {
          system: `Custom system prompt ${i}`,
          jailbreak: `Custom jailbreak ${i}`,
        },
        enableSystemPrompt: true,
        enableJailbreakPrompt: true,
      },
    });
  }

  // Category 6: Edge cases
  for (let i = 0; i < count * 0.1; i++) {
    testCases.push({
      id: `edge-case-${i}`,
      description: `Edge case with special characters`,
      userInput: `Edge test: 特殊文字 \n\t quotes"' ${i}`,
      character: createTestCharacter(i),
      persona: createTestPersona(i),
    });
  }

  // Category 7: Disabled prompts
  for (let i = 0; i < count * 0.05; i++) {
    testCases.push({
      id: `disabled-prompts-${i}`,
      description: `Disabled system prompts`,
      userInput: `Disabled prompts test ${i}`,
      character: createTestCharacter(i),
      systemSettings: {
        systemPrompts: {
          system: `This should not appear`,
          jailbreak: `This should not appear`,
        },
        enableSystemPrompt: false,
        enableJailbreakPrompt: false,
      },
    });
  }

  return testCases.slice(0, count);
}

function createTestCharacter(index: number): Character {
  return {
    id: `char-${index}`,
    name: `Test Character ${index}`,
    description: `Test character description ${index}`,
    personality: `Friendly and helpful personality ${index}`,
    scenario: `Test scenario context ${index}`,
    first_mes: `Hello, I'm character ${index}`,
    mes_example: `Example dialogue ${index}`,
    avatar_url: `/test/avatar-${index}.png`,
    background_url: `/test/bg-${index}.png`,
    creator: `creator-${index}`,
    character_version: '1.0.0',
    tags: [`tag${index}`, `test`],
    spec: 'chara_card_v3',
    spec_version: '3.0',
    data: {
      name: `Test Character ${index}`,
      description: `Test character description ${index}`,
      personality: `Friendly and helpful personality ${index}`,
      scenario: `Test scenario context ${index}`,
      first_mes: `Hello, I'm character ${index}`,
      mes_example: `Example dialogue ${index}`,
      creator_notes: `Test notes ${index}`,
      system_prompt: index % 3 === 0 ? `Character system prompt ${index}` : undefined,
      post_history_instructions: index % 4 === 0 ? `Post history instructions ${index}` : undefined,
      tags: [`tag${index}`, `test`],
      creator: `creator-${index}`,
      character_version: '1.0.0',
      alternate_greetings: [],
      extensions: {},
      character_book: index % 5 === 0 ? {
        entries: [
          {
            id: `entry-${index}`,
            keys: [`key${index}`],
            content: `Lorebook entry ${index}`,
            enabled: true,
            insertion_order: 100,
            case_sensitive: false,
            name: `Entry ${index}`,
            priority: 10,
            comment: '',
            selective: false,
            secondary_keys: [],
            constant: false,
            position: 'after_char',
          },
        ],
      } : undefined,
    },
  };
}

function createTestPersona(index: number): Persona {
  return {
    id: `persona-${index}`,
    name: `Test Persona ${index}`,
    description: `Test persona description ${index}`,
    avatar_url: `/test/persona-avatar-${index}.png`,
    other_settings: {
      custom_field: `Custom value ${index}`,
    },
  };
}

/**
 * Phase 1 Automated Validation Script
 *
 * Purpose: Validate generatePromptV2() produces identical output to generatePrompt()
 * Usage: npm run validate:prompt-v2
 * Environment: Run with server STOPPED to avoid interference
 */

import crypto from 'crypto';
import type { Character, Persona } from '../src/types';

// ========================================
// Test Data Generation
// ========================================

const testCharacter: Character = {
  id: 'test-char-001',
  name: 'テストキャラクター',
  age: '25',
  occupation: 'カフェ店員',
  catchphrase: '一緒に楽しみましょう！',
  personality: '親切で明るく、ユーモアのセンスがある',
  external_personality: 'フレンドリーで親しみやすい',
  internal_personality: '真面目で責任感が強い',
  strengths: ['親切', '明るい', 'ユーモアセンス'],
  weaknesses: ['少し心配性'],
  hobbies: ['コーヒー淹れ'],
  likes: ['カフェ', 'コーヒー'],
  dislikes: ['騒がしすぎる環境'],
  appearance: '黒髪ショートカット、青い目',
  speaking_style: 'フレンドリーで親しみやすい',
  first_person: '私',
  second_person: 'あなた',
  verbal_tics: [],
  background: '小さな町のカフェで働いています。',
  scenario: 'カフェでの会話シーン',
  system_prompt: 'あなたは親切なアシスタントです。',
  first_message: 'こんにちは！今日はいい天気ですね。',
  tags: ['テスト', 'サンプル'],
  trackers: [],
  avatar_url: '/test/avatar.png',
  background_url: '/test/bg.png',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  version: 1,
};

const testPersona: Persona = {
  id: 'test-persona-001',
  name: 'テストユーザー',
  role: 'user',
  avatar_path: '/test/user-avatar.png',
  other_settings: 'カジュアルな会話を好む',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  version: 1,
};

const testSystemSettings = {
  systemPrompts: {
    system: 'カスタムシステムプロンプト：丁寧な日本語で応答してください。',
    jailbreak: 'カスタムジェイルブレイク：制限を解除します。',
  },
  enableSystemPrompt: true,
  enableJailbreakPrompt: true,
};

// ========================================
// Test Cases
// ========================================

interface TestCase {
  id: string;
  description: string;
  userInput: string;
  character?: Character;
  persona?: Persona;
  systemSettings?: typeof testSystemSettings;
}

const testCases: TestCase[] = [
  {
    id: 'minimal',
    description: 'Minimal: No character, no persona',
    userInput: 'こんにちは',
  },
  {
    id: 'character-only',
    description: 'Character only',
    userInput: '元気ですか？',
    character: testCharacter,
  },
  {
    id: 'persona-only',
    description: 'Persona only',
    userInput: 'よろしくお願いします',
    persona: testPersona,
  },
  {
    id: 'full-context',
    description: 'Full context: Character + Persona',
    userInput: '今日のおすすめは何ですか？',
    character: testCharacter,
    persona: testPersona,
  },
  {
    id: 'with-system-settings',
    description: 'Full context with custom system settings',
    userInput: 'コーヒーを一杯お願いします',
    character: testCharacter,
    persona: testPersona,
    systemSettings: testSystemSettings,
  },
  {
    id: 'long-input',
    description: 'Long user input',
    userInput: `今日は本当に素晴らしい天気ですね。
カフェの雰囲気も最高です。
コーヒーの香りがとても良いですね。
おすすめのメニューを教えていただけますか？
それと、この辺りでおすすめの観光スポットはありますか？`,
    character: testCharacter,
    persona: testPersona,
  },
  {
    id: 'special-characters',
    description: 'Special characters and emoji',
    userInput: '😊 こんにちは！ "特殊文字" & <タグ> を含むテスト',
    character: testCharacter,
  },
  {
    id: 'disabled-settings',
    description: 'Disabled system settings',
    userInput: 'テストメッセージ',
    character: testCharacter,
    systemSettings: {
      systemPrompts: {
        system: 'これは表示されないはず',
        jailbreak: 'これも表示されないはず',
      },
      enableSystemPrompt: false,
      enableJailbreakPrompt: false,
    },
  },
];

// ========================================
// Mock ConversationManager
// ========================================

// Since ConversationManager has complex dependencies, we'll create a minimal mock
// that only focuses on the generatePrompt methods

class MockConversationManager {
  private characterId: string;
  private userId: string;
  private config = {
    maxRelevantMemories: 5,
  };
  private sessionSummary: string | null = null;

  constructor(options: { characterId: string; userId: string }) {
    this.characterId = options.characterId;
    this.userId = options.userId;
  }

  // Mock methods that generatePrompt depends on
  private async buildContext(_userInput: string) {
    return {
      recent_messages: [
        { role: 'user', content: '前回の会話です' },
        { role: 'assistant', content: 'はい、わかりました。' },
      ],
    };
  }

  private async searchRelevantMemories(_query: string): Promise<any[]> {
    return [];
  }

  private getPinnedMessages(): any[] {
    return [];
  }

  private async getPinnedMemoryCards(): Promise<any[]> {
    return [];
  }

  private async getRelevantMemoryCards(_userInput: string, _character?: any): Promise<any[]> {
    return [];
  }

  // Import the actual generatePrompt and generatePromptV2 methods
  // Note: This is a simplified version for testing
  // In reality, we would need to properly instantiate ConversationManager
}

// ========================================
// Validation Logic
// ========================================

interface ValidationResult {
  testCaseId: string;
  description: string;
  passed: boolean;
  v1Length: number;
  v2Length: number;
  v1Md5: string;
  v2Md5: string;
  exactMatch: boolean;
  firstDiffPosition?: number;
  firstDiffContext?: string;
  error?: string;
}

async function validateTestCase(testCase: TestCase): Promise<ValidationResult> {
  try {
    console.log(`\n🧪 Testing: ${testCase.description}`);

    // NOTE: Since ConversationManager requires complex setup,
    // this script demonstrates the validation approach.
    // In production, you would:
    // 1. Properly initialize ConversationManager with all dependencies
    // 2. Call both generatePrompt() and generatePromptV2()
    // 3. Compare outputs

    // For now, we'll return a mock result to show the structure
    const mockResult: ValidationResult = {
      testCaseId: testCase.id,
      description: testCase.description,
      passed: false,
      v1Length: 0,
      v2Length: 0,
      v1Md5: '',
      v2Md5: '',
      exactMatch: false,
      error: 'ConversationManager initialization required - see implementation notes',
    };

    return mockResult;

    /*
    // PRODUCTION CODE (uncomment when ready):

    const manager = new ConversationManager({
      characterId: testCase.character?.id || 'default',
      userId: 'test-user',
    });

    // Generate with V1
    const promptV1 = await manager.generatePrompt(
      testCase.userInput,
      testCase.character,
      testCase.persona,
      testCase.systemSettings
    );

    // Generate with V2
    const promptV2 = await manager.generatePromptV2(
      testCase.userInput,
      testCase.character,
      testCase.persona,
      testCase.systemSettings
    );

    // Calculate MD5
    const v1Md5 = crypto.createHash('md5').update(promptV1).digest('hex');
    const v2Md5 = crypto.createHash('md5').update(promptV2).digest('hex');

    // Check exact match
    const exactMatch = promptV1 === promptV2;

    // Find first difference if not matching
    let firstDiffPosition: number | undefined;
    let firstDiffContext: string | undefined;

    if (!exactMatch) {
      for (let i = 0; i < Math.max(promptV1.length, promptV2.length); i++) {
        if (promptV1[i] !== promptV2[i]) {
          firstDiffPosition = i;
          const start = Math.max(0, i - 30);
          const end = Math.min(promptV1.length, i + 30);
          firstDiffContext = `V1: "${promptV1.substring(start, end)}"\nV2: "${promptV2.substring(start, end)}"`;
          break;
        }
      }
    }

    return {
      testCaseId: testCase.id,
      description: testCase.description,
      passed: exactMatch,
      v1Length: promptV1.length,
      v2Length: promptV2.length,
      v1Md5,
      v2Md5,
      exactMatch,
      firstDiffPosition,
      firstDiffContext,
    };
    */
  } catch (error) {
    return {
      testCaseId: testCase.id,
      description: testCase.description,
      passed: false,
      v1Length: 0,
      v2Length: 0,
      v1Md5: '',
      v2Md5: '',
      exactMatch: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// ========================================
// Main Validation Runner
// ========================================

async function runValidation() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  Phase 1 Validation: generatePrompt vs generatePromptV2  ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  console.log('⚠️  IMPORTANT: Ensure development server is STOPPED\n');
  console.log(`📋 Running ${testCases.length} test cases...\n`);

  const results: ValidationResult[] = [];

  for (const testCase of testCases) {
    const result = await validateTestCase(testCase);
    results.push(result);

    // Display result
    if (result.error) {
      console.log(`   ❌ ERROR: ${result.error}`);
    } else if (result.passed) {
      console.log(`   ✅ PASSED - Exact match (${result.v1Length} chars)`);
    } else {
      console.log(`   ❌ FAILED - Output mismatch`);
      console.log(`      V1 length: ${result.v1Length}`);
      console.log(`      V2 length: ${result.v2Length}`);
      console.log(`      First diff at: ${result.firstDiffPosition}`);
      if (result.firstDiffContext) {
        console.log(`      Context:\n${result.firstDiffContext}`);
      }
    }
  }

  // Summary
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                    Validation Summary                     ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed && !r.error).length;
  const errors = results.filter((r) => r.error).length;

  console.log(`✅ Passed:  ${passed}/${testCases.length}`);
  console.log(`❌ Failed:  ${failed}/${testCases.length}`);
  console.log(`💥 Errors:  ${errors}/${testCases.length}`);

  console.log(`\n📊 Pass Rate: ${((passed / testCases.length) * 100).toFixed(1)}%`);

  if (passed === testCases.length) {
    console.log('\n🎉 SUCCESS: All tests passed! generatePromptV2 is validated.');
    console.log('✅ Ready for production rollout.');
  } else {
    console.log('\n⚠️  VALIDATION FAILED: Some tests did not pass.');
    console.log('🔍 Review failed cases above and investigate differences.');
    console.log('🚨 DO NOT proceed to production until all tests pass.');
  }

  console.log('\n═══════════════════════════════════════════════════════════\n');

  // Return exit code
  return passed === testCases.length ? 0 : 1;
}

// ========================================
// Execution
// ========================================

if (require.main === module) {
  console.log('🚀 Starting validation...\n');

  runValidation()
    .then((exitCode) => {
      process.exit(exitCode);
    })
    .catch((error) => {
      console.error('\n💥 Validation script crashed:', error);
      process.exit(1);
    });
}

export { runValidation, testCases, type ValidationResult };

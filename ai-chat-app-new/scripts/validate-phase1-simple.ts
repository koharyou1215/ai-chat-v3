/**
 * Phase 1 Simple Validation Script
 *
 * ConversationManagerの generatePrompt() と generatePromptV2() を直接比較します。
 * サーバーを停止した状態で実行してください。
 *
 * 実行方法:
 * npx tsx scripts/validate-phase1-simple.ts
 */

import { ConversationManager } from '../src/services/memory/conversation-manager';
import { Character, Persona, UnifiedMessage } from '../src/types';
import crypto from 'crypto';

// MD5ハッシュ計算用ヘルパー
function md5(content: string): string {
  return crypto.createHash('md5').update(content, 'utf8').digest('hex');
}

// テストデータ生成
function createTestCharacter(): Character {
  return {
    id: 'test-character-001',
    name: 'テストキャラクター',
    age: '25',
    occupation: 'テスター',
    catchphrase: 'テストは大事！',
    personality: '親切で協力的な性格',
    external_personality: '明るく親しみやすい',
    internal_personality: '真面目で几帳面',
    strengths: ['親切', '協力的'],
    weaknesses: ['心配性'],
    hobbies: ['読書'],
    likes: ['コーヒー'],
    dislikes: ['騒がしい場所'],
    appearance: '黒髪ショート',
    speaking_style: 'フレンドリー',
    first_person: '私',
    second_person: 'あなた',
    verbal_tics: [],
    background: 'テスト用キャラクター',
    scenario: 'カフェでリラックスした会話',
    system_prompt: 'あなたは親切なテストキャラクターです',
    first_message: 'こんにちは！今日はどんなお話をしましょうか？',
    tags: ['test', 'validation'],
    trackers: [],
    avatar_url: '/test-avatar.png',
    background_url: '/test-bg.png',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    version: 1,
  } as Character;
}

function createTestPersona(): Persona {
  return {
    id: 'test-persona-001',
    name: 'テストユーザー',
    role: 'user',
    avatar_path: '/test-user-avatar.png',
    other_settings: 'カジュアルな口調',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    version: 1,
  };
}

// メインの検証関数
async function validatePhase1() {
  console.log('🚀 Phase 1 Validation - Simple Direct Comparison');
  console.log('='.repeat(60));
  console.log('');

  // テストケース配列
  const testCases = [
    {
      name: 'Minimal (no character, no persona)',
      userInput: 'こんにちは',
      character: undefined,
      persona: undefined,
      systemSettings: undefined,
    },
    {
      name: 'With Character Only',
      userInput: '今日はいい天気ですね',
      character: createTestCharacter(),
      persona: undefined,
      systemSettings: undefined,
    },
    {
      name: 'With Character and Persona',
      userInput: '最近どうですか？',
      character: createTestCharacter(),
      persona: createTestPersona(),
      systemSettings: undefined,
    },
    {
      name: 'With Custom System Prompt',
      userInput: 'おすすめの本を教えてください',
      character: createTestCharacter(),
      persona: createTestPersona(),
      systemSettings: {
        systemPrompts: {
          system: 'あなたは親切な司書です。本について詳しく教えてください。',
          jailbreak: '',
        },
        enableSystemPrompt: true,
        enableJailbreakPrompt: false,
      },
    },
    {
      name: 'Long Input (100+ characters)',
      userInput: 'あ'.repeat(100) + ' とても長いメッセージです。',
      character: createTestCharacter(),
      persona: createTestPersona(),
      systemSettings: undefined,
    },
    {
      name: 'Special Characters',
      userInput: '「こんにちは！」😊🎉✨ #test @user <tag>',
      character: createTestCharacter(),
      persona: createTestPersona(),
      systemSettings: undefined,
    },
  ];

  let totalTests = testCases.length;
  let passedTests = 0;
  let failedTests = 0;

  // 各テストケースを実行
  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    console.log(`Test ${i + 1}/${totalTests}: ${testCase.name}`);
    console.log('-'.repeat(60));

    try {
      // ConversationManagerインスタンスを作成
      const manager = new ConversationManager([], undefined);

      // V1: 既存のgeneratePrompt()
      const v1Start = performance.now();
      const v1Output = await manager.generatePrompt(
        testCase.userInput,
        testCase.character,
        testCase.persona,
        testCase.systemSettings
      );
      const v1Time = performance.now() - v1Start;

      // V2: 新しいgeneratePromptV2()
      const v2Start = performance.now();
      const v2Output = await manager.generatePromptV2(
        testCase.userInput,
        testCase.character,
        testCase.persona,
        testCase.systemSettings
      );
      const v2Time = performance.now() - v2Start;

      // 比較
      const exactMatch = v1Output === v2Output;
      const lengthMatch = v1Output.length === v2Output.length;
      const md5V1 = md5(v1Output);
      const md5V2 = md5(v2Output);
      const hashMatch = md5V1 === md5V2;

      // 結果表示
      console.log('  V1 Length:', v1Output.length, 'characters');
      console.log('  V2 Length:', v2Output.length, 'characters');
      console.log('  V1 Time:', v1Time.toFixed(2), 'ms');
      console.log('  V2 Time:', v2Time.toFixed(2), 'ms');
      console.log('  V1 MD5:', md5V1);
      console.log('  V2 MD5:', md5V2);
      console.log('');

      if (exactMatch && lengthMatch && hashMatch) {
        console.log('  ✅ PASS - Complete Match');
        passedTests++;
      } else {
        console.log('  ❌ FAIL - Mismatch Detected');
        failedTests++;

        // 差分を詳細に表示
        console.log('');
        console.log('  🔍 Difference Analysis:');
        if (!lengthMatch) {
          console.log('    Length mismatch:', v1Output.length, 'vs', v2Output.length);
        }
        if (!hashMatch) {
          console.log('    Hash mismatch:', md5V1, 'vs', md5V2);
        }

        // 最初の不一致位置を特定
        for (let pos = 0; pos < Math.max(v1Output.length, v2Output.length); pos++) {
          if (v1Output[pos] !== v2Output[pos]) {
            console.log('    First difference at position:', pos);
            console.log('    V1 context:', v1Output.substring(Math.max(0, pos - 20), pos + 20));
            console.log('    V2 context:', v2Output.substring(Math.max(0, pos - 20), pos + 20));
            break;
          }
        }
      }

      console.log('');
    } catch (error) {
      console.log('  ❌ ERROR:', error instanceof Error ? error.message : String(error));
      console.log('');
      failedTests++;
    }
  }

  // 最終サマリー
  console.log('='.repeat(60));
  console.log('📊 Validation Summary');
  console.log('='.repeat(60));
  console.log('Total Tests:', totalTests);
  console.log('Passed:', passedTests, '✅');
  console.log('Failed:', failedTests, '❌');
  console.log('Pass Rate:', ((passedTests / totalTests) * 100).toFixed(1) + '%');
  console.log('');

  if (failedTests === 0) {
    console.log('✅✅✅ ALL TESTS PASSED ✅✅✅');
    console.log('');
    console.log('Phase 1 Implementation is VALIDATED');
    console.log('generatePromptV2() produces identical output to generatePrompt()');
    console.log('');
    console.log('✅ Ready for production deployment');
  } else {
    console.log('❌ VALIDATION FAILED');
    console.log('');
    console.log('Please review the differences above and fix the implementation');
  }

  console.log('');
  console.log('📝 Next Steps:');
  if (failedTests === 0) {
    console.log('  1. Document validation results in claudedocs/PHASE1_VALIDATION_RESULTS.md');
    console.log('  2. Consider gradual rollout (10% → 25% → 50% → 100%)');
    console.log('  3. Monitor for any edge cases in production');
  } else {
    console.log('  1. Review the difference analysis above');
    console.log('  2. Check section files in src/services/memory/conversation-manager/sections/');
    console.log('  3. Verify character-by-character copy accuracy');
    console.log('  4. Re-run validation after fixes');
  }

  console.log('');
  console.log('🎯 Validation Complete');
  console.log('');

  // Exit with appropriate code
  process.exit(failedTests === 0 ? 0 : 1);
}

// 実行
validatePhase1().catch((error) => {
  console.error('🚨 Validation script crashed:', error);
  process.exit(1);
});

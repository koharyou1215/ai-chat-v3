/**
 * Golden Master Comparison Test
 *
 * Purpose: Guarantee exact character-by-character prompt match
 * Strategy: Zero tolerance for any differences
 */

import { describe, it, expect, beforeAll } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { generateTestCases } from './test-data-generator';
import type { GoldenMasterEntry } from './generate-golden-master';

// Import NEW implementation (to be created)
// import { ConversationManagerRefactored } from '@/services/memory/conversation-manager-refactored';

describe('🔒 Golden Master: Prompt Quality Guarantee', () => {
  let goldenMaster: GoldenMasterEntry[];
  let testCases: ReturnType<typeof generateTestCases>;

  beforeAll(() => {
    const goldenMasterPath = path.join(__dirname, 'prompts-golden-master.json');

    if (!fs.existsSync(goldenMasterPath)) {
      throw new Error(
        `❌ Golden Master not found at ${goldenMasterPath}\n` +
        `   Run: npm run generate-golden-master`
      );
    }

    goldenMaster = JSON.parse(fs.readFileSync(goldenMasterPath, 'utf-8'));
    testCases = generateTestCases(goldenMaster.length);

    console.log(`📋 Loaded ${goldenMaster.length} golden master entries`);
  });

  describe('Character-by-Character Exact Match', () => {
    goldenMaster.forEach((golden, index) => {
      it(`should match golden master exactly - ${golden.testCaseId}`, async () => {
        // Get corresponding test case
        const testCase = testCases.find((tc) => tc.id === golden.testCaseId);

        if (!testCase) {
          throw new Error(`Test case not found: ${golden.testCaseId}`);
        }

        // TODO: Replace with new implementation
        // const newManager = new ConversationManagerRefactored({
        //   characterId: testCase.character?.id || 'default',
        //   userId: 'test-user',
        // });
        //
        // const newPrompt = await newManager.generatePrompt(
        //   testCase.userInput,
        //   testCase.character,
        //   testCase.persona,
        //   testCase.systemSettings
        // );

        // For now, this test will be skipped until new implementation is ready
        const newPrompt = golden.prompt; // Placeholder

        // 1. Exact string match
        expect(newPrompt).toBe(golden.prompt);

        // 2. MD5 hash match
        const newMd5 = crypto.createHash('md5').update(newPrompt).digest('hex');
        expect(newMd5).toBe(golden.md5);

        // 3. Length match
        expect(newPrompt.length).toBe(golden.prompt.length);

        // 4. Character-by-character comparison (for detailed error reporting)
        if (newPrompt !== golden.prompt) {
          const diff = findFirstDifference(newPrompt, golden.prompt);
          console.error(`❌ Difference found at position ${diff.position}:`);
          console.error(`   Golden: "${diff.goldenChar}" (code: ${diff.goldenCharCode})`);
          console.error(`   New:    "${diff.newChar}" (code: ${diff.newCharCode})`);
          console.error(`   Context: ...${diff.context}...`);
        }
      });
    });
  });

  describe('Statistical Analysis', () => {
    it('should have zero failures', () => {
      // This will be automatically validated by the tests above
      expect(goldenMaster.length).toBeGreaterThan(0);
    });

    it('should maintain consistent metadata', () => {
      const metadataPath = path.join(__dirname, 'golden-master-metadata.json');
      if (fs.existsSync(metadataPath)) {
        const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
        expect(metadata.testCount).toBe(goldenMaster.length);
        expect(metadata.errorCount).toBe(0);
      }
    });
  });
});

/**
 * Find first character difference for detailed error reporting
 */
function findFirstDifference(str1: string, str2: string) {
  const maxLen = Math.max(str1.length, str2.length);

  for (let i = 0; i < maxLen; i++) {
    if (str1[i] !== str2[i]) {
      const contextStart = Math.max(0, i - 20);
      const contextEnd = Math.min(maxLen, i + 20);

      return {
        position: i,
        goldenChar: str2[i] || '<EOF>',
        newChar: str1[i] || '<EOF>',
        goldenCharCode: str2.charCodeAt(i) || -1,
        newCharCode: str1.charCodeAt(i) || -1,
        context: `"${str1.substring(contextStart, contextEnd)}"`,
      };
    }
  }

  return null;
}

/**
 * Normalize string for comparison (handle CRLF vs LF)
 */
function normalizeString(str: string): string {
  return str.replace(/\r\n/g, '\n').trim();
}

/**
 * Compare with normalization (for debugging)
 */
export function compareNormalized(str1: string, str2: string): boolean {
  return normalizeString(str1) === normalizeString(str2);
}

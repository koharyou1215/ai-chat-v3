/**
 * Golden Master Generator
 *
 * Purpose: Generate baseline prompts from current implementation
 * Usage: npm run generate-golden-master
 * Output: tests/golden-master/prompts-golden-master.json
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { ConversationManager } from '@/services/memory/conversation-manager';
import { generateTestCases, type TestCase } from './test-data-generator';

interface GoldenMasterEntry {
  testCaseId: string;
  description: string;
  prompt: string;
  md5: string;
  characterId?: string;
  personaId?: string;
  timestamp: number;
}

async function generateGoldenMaster(testCount: number = 1000) {
  console.log(`🎯 Generating Golden Master with ${testCount} test cases...`);

  const testCases = generateTestCases(testCount);
  const results: GoldenMasterEntry[] = [];

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];

    try {
      // Initialize ConversationManager
      // Note: Using mock store since we only need prompt generation
      const manager = new ConversationManager({
        characterId: testCase.character?.id || 'default',
        userId: 'test-user',
      });

      // Generate prompt
      const prompt = await manager.generatePrompt(
        testCase.userInput,
        testCase.character,
        testCase.persona,
        testCase.systemSettings
      );

      // Calculate MD5 hash
      const md5Hash = crypto.createHash('md5').update(prompt).digest('hex');

      results.push({
        testCaseId: testCase.id,
        description: testCase.description,
        prompt: prompt,
        md5: md5Hash,
        characterId: testCase.character?.id,
        personaId: testCase.persona?.id,
        timestamp: Date.now(),
      });

      successCount++;

      if ((i + 1) % 100 === 0) {
        console.log(`✅ Progress: ${i + 1}/${testCases.length} (${Math.round((i + 1) / testCases.length * 100)}%)`);
      }
    } catch (error) {
      console.error(`❌ Error generating test case ${testCase.id}:`, error);
      errorCount++;
    }
  }

  // Save golden master
  const outputPath = path.join(__dirname, 'prompts-golden-master.json');
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2), 'utf-8');

  console.log(`\n📊 Golden Master Generation Complete:`);
  console.log(`   ✅ Success: ${successCount}`);
  console.log(`   ❌ Errors: ${errorCount}`);
  console.log(`   📁 Output: ${outputPath}`);
  console.log(`   💾 File Size: ${(fs.statSync(outputPath).size / 1024 / 1024).toFixed(2)} MB`);

  // Save metadata
  const metadataPath = path.join(__dirname, 'golden-master-metadata.json');
  fs.writeFileSync(
    metadataPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        testCount: testCases.length,
        successCount,
        errorCount,
        nodeVersion: process.version,
        commitHash: process.env.GIT_COMMIT || 'unknown',
      },
      null,
      2
    ),
    'utf-8'
  );

  console.log(`   📝 Metadata: ${metadataPath}`);

  return results;
}

// Run if executed directly
if (require.main === module) {
  const testCount = parseInt(process.argv[2] || '1000', 10);
  generateGoldenMaster(testCount)
    .then(() => {
      console.log('\n✅ Golden Master generation successful!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Golden Master generation failed:', error);
      process.exit(1);
    });
}

export { generateGoldenMaster, type GoldenMasterEntry };

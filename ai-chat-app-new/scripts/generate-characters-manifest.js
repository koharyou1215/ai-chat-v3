#!/usr/bin/env node

/**
 * Characters Manifest Generator
 *
 * このスクリプトはpublic/characters/内のすべてのキャラクターJSONファイルを読み取り、
 * manifest.jsonを生成します。本番環境でのキャッシュ問題を解決するために使用されます。
 *
 * Usage:
 *   node scripts/generate-characters-manifest.js
 *
 * ビルドプロセスの一部として自動実行されます。
 */

const fs = require('fs');
const path = require('path');

const CHARACTERS_DIR = path.join(process.cwd(), 'public', 'characters');
const MANIFEST_PATH = path.join(CHARACTERS_DIR, 'manifest.json');

/**
 * メイン処理
 */
function generateManifest() {
  console.log('🔄 Generating characters manifest...');

  // ディレクトリの存在確認
  if (!fs.existsSync(CHARACTERS_DIR)) {
    console.error(`❌ Characters directory not found: ${CHARACTERS_DIR}`);
    process.exit(1);
  }

  // JSONファイルを取得（manifest.json以外）
  const files = fs.readdirSync(CHARACTERS_DIR);
  const jsonFiles = files.filter(file =>
    file.endsWith('.json') &&
    !file.startsWith('.') &&
    file !== 'manifest.json' &&
    file !== 'CHARACTER_MANAGEMENT_GUIDE.json'
  );

  console.log(`📂 Found ${jsonFiles.length} character files`);

  // ファイル名をアルファベット順にソート
  jsonFiles.sort();

  // 各ファイルを検証（オプション）
  const validFiles = [];
  for (const file of jsonFiles) {
    const filePath = path.join(CHARACTERS_DIR, file);
    try {
      let fileContent = fs.readFileSync(filePath, 'utf8');
      // Remove BOM if present
      if (fileContent.charCodeAt(0) === 0xfeff) {
        fileContent = fileContent.slice(1);
      }
      const characterData = JSON.parse(fileContent);

      if (characterData.name) {
        validFiles.push(file);
        console.log(`  ✅ ${characterData.name} (${file})`);
      } else {
        console.warn(`  ⚠️  Missing 'name' field: ${file}`);
      }
    } catch (error) {
      console.error(`  ❌ Invalid JSON: ${file}`, error.message);
    }
  }

  // manifest.jsonを書き込み（ファイル名のリストのみ）
  const manifestContent = JSON.stringify(validFiles, null, 2);
  fs.writeFileSync(MANIFEST_PATH, manifestContent, 'utf8');

  console.log(`✅ Manifest generated successfully!`);
  console.log(`📝 Total characters: ${validFiles.length}`);
  console.log(`📁 Manifest location: ${MANIFEST_PATH}`);
  console.log(`⏱️  Generated at: ${new Date().toISOString()}`);
}

// スクリプト実行
try {
  generateManifest();
} catch (error) {
  console.error('❌ Fatal error:', error);
  process.exit(1);
}

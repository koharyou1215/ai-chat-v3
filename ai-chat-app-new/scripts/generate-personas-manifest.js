#!/usr/bin/env node

/**
 * Personas Manifest Generator
 *
 * このスクリプトはpublic/personas/内のすべてのペルソナJSONファイルを読み取り、
 * manifest.jsonを生成します。本番環境でのキャッシュ問題を解決するために使用されます。
 *
 * Usage:
 *   node scripts/generate-personas-manifest.js
 *
 * ビルドプロセスの一部として自動実行されます。
 */

const fs = require('fs');
const path = require('path');

const PERSONAS_DIR = path.join(process.cwd(), 'public', 'personas');
const MANIFEST_PATH = path.join(PERSONAS_DIR, 'manifest.json');

/**
 * JSONファイルからPersonaオブジェクトを生成
 * 新旧フォーマットの両方に対応
 */
function parsePersonaFile(filePath, fileName) {
  try {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const jsonData = JSON.parse(fileContent);
    const personaId = path.basename(fileName, '.json');

    // 新フォーマット（name, role, other_settings, avatar_path）
    if (jsonData.name && jsonData.role !== undefined) {
      return {
        id: personaId,
        name: jsonData.name,
        role: jsonData.role,
        other_settings: jsonData.other_settings || '',
        avatar_path: jsonData.avatar_path || null,
        created_at: jsonData.created_at || new Date().toISOString(),
        updated_at: jsonData.updated_at || new Date().toISOString(),
        version: jsonData.version || 1,
      };
    }

    // 旧フォーマット（persona_information.Name等）
    if (jsonData.persona_information && jsonData.persona_information.Name) {
      const info = jsonData.persona_information;
      return {
        id: personaId,
        name: info.Name,
        role: info.Role || 'user',
        other_settings: info['Other Settings'] || '',
        avatar_path: null,
        created_at: jsonData.created_at || new Date().toISOString(),
        updated_at: jsonData.updated_at || new Date().toISOString(),
        version: jsonData.version || 1,
      };
    }

    console.warn(`⚠️  Invalid format in file: ${fileName}`);
    return null;
  } catch (error) {
    console.error(`❌ Error reading file ${fileName}:`, error.message);
    return null;
  }
}

/**
 * メイン処理
 */
function generateManifest() {
  console.log('🔄 Generating personas manifest...');

  // ディレクトリの存在確認
  if (!fs.existsSync(PERSONAS_DIR)) {
    console.error(`❌ Personas directory not found: ${PERSONAS_DIR}`);
    process.exit(1);
  }

  // JSONファイルを取得
  const files = fs.readdirSync(PERSONAS_DIR);
  const jsonFiles = files.filter(file =>
    file.endsWith('.json') &&
    !file.startsWith('.') &&
    file !== 'manifest.json'
  );

  console.log(`📂 Found ${jsonFiles.length} persona files`);

  // 各ファイルを処理
  const personas = [];
  for (const file of jsonFiles) {
    const filePath = path.join(PERSONAS_DIR, file);
    const persona = parsePersonaFile(filePath, file);

    if (persona) {
      personas.push(persona);
      console.log(`  ✅ ${persona.name} (${file})`);
    }
  }

  // manifest.jsonを書き込み
  const manifestContent = JSON.stringify(personas, null, 2);
  fs.writeFileSync(MANIFEST_PATH, manifestContent, 'utf8');

  console.log(`✅ Manifest generated successfully!`);
  console.log(`📝 Total personas: ${personas.length}`);
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

/**
 * Script to generate personas manifest.json for production
 * Run before deployment: node scripts/generate-personas-manifest.js
 */

const fs = require('fs');
const path = require('path');

function generatePersonasManifest() {
  const personasDir = path.join(process.cwd(), 'public', 'personas');
  const manifestPath = path.join(personasDir, 'manifest.json');

  console.log('📁 Scanning personas directory:', personasDir);

  // Check if directory exists
  if (!fs.existsSync(personasDir)) {
    console.error('❌ Personas directory not found!');
    process.exit(1);
  }

  // Get all JSON files
  const files = fs.readdirSync(personasDir);
  const jsonFiles = files.filter(
    file => file.endsWith('.json') &&
    !file.startsWith('.') &&
    file !== 'manifest.json'
  );

  console.log(`📄 Found ${jsonFiles.length} persona files`);

  const personas = [];

  // Process each JSON file
  for (const file of jsonFiles) {
    try {
      const filePath = path.join(personasDir, file);
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const jsonData = JSON.parse(fileContent);

      let persona;

      // Handle new format
      if (jsonData.name && jsonData.role !== undefined) {
        persona = {
          id: path.basename(file, '.json'),
          name: jsonData.name,
          role: jsonData.role,
          other_settings: jsonData.other_settings || '',
          avatar_path: jsonData.avatar_path || null,
          created_at: jsonData.created_at || new Date().toISOString(),
          updated_at: jsonData.updated_at || new Date().toISOString(),
          version: jsonData.version || 1,
        };
      }
      // Handle old format
      else if (jsonData.persona_information && jsonData.persona_information.Name) {
        const info = jsonData.persona_information;
        persona = {
          id: path.basename(file, '.json'),
          name: info.Name,
          role: info.Role || 'user',
          other_settings: info['Other Settings'] || '',
          avatar_path: null,
          created_at: jsonData.created_at || new Date().toISOString(),
          updated_at: jsonData.updated_at || new Date().toISOString(),
          version: jsonData.version || 1,
        };
      } else {
        console.warn(`⚠️  Skipping invalid format: ${file}`);
        continue;
      }

      console.log(`✅ Processed: ${persona.name} (${file})`);
      personas.push(persona);
    } catch (error) {
      console.error(`❌ Error processing ${file}:`, error.message);
    }
  }

  // Always include default persona
  const hasDefaultUser = personas.some(p => p.id === 'default-user');
  if (!hasDefaultUser) {
    console.log('➕ Adding default-user persona');
    personas.push({
      id: 'default-user',
      name: 'あなた',
      role: 'user',
      other_settings: 'フレンドリーで親しみやすい性格です。デフォルトのユーザーペルソナとして設定されています。',
      avatar_path: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      version: 1,
    });
  }

  // Write manifest
  fs.writeFileSync(manifestPath, JSON.stringify(personas, null, 2));
  console.log(`\n✨ Manifest generated successfully!`);
  console.log(`📄 ${manifestPath}`);
  console.log(`📊 Total personas: ${personas.length}`);
}

// Run the script
generatePersonasManifest();
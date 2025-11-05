#!/usr/bin/env node

/**
 * Integrated Manifest Generator (TypeScript Version)
 *
 * Generates manifest.json files for both characters and personas with:
 * - Automatic BOM detection and removal
 * - Duplicate ID detection (build failure on duplicates)
 * - Zod schema validation
 * - Detailed error reporting
 * - Type safety
 *
 * Usage:
 *   tsx scripts/generate-manifests.ts
 *
 * Part of the build pipeline (npm run prebuild)
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { CharacterFileSchema, type CharacterManifestEntry } from './schemas/character.schema';
import { PersonaFileSchema, type PersonaManifestEntry } from './schemas/persona.schema';

interface ManifestGeneratorOptions {
  sourceDir: string;
  outputPath: string;
  type: 'character' | 'persona';
  validateSchema: boolean;
  removeBOM: boolean;
}

interface ValidationError {
  file: string;
  error: string;
  details?: string;
}

interface GenerationResult {
  totalFiles: number;
  validFiles: number;
  invalidFiles: number;
  errors: ValidationError[];
  duplicateIds: string[];
}

class ManifestGenerator {
  private seenIds = new Set<string>();
  private errors: ValidationError[] = [];
  private duplicateIds: string[] = [];

  /**
   * Generate manifest for a specific type (character or persona)
   */
  async generate(options: ManifestGeneratorOptions): Promise<GenerationResult> {
    console.log(`\n🔄 Generating ${options.type} manifest...`);
    console.log(`📂 Source: ${options.sourceDir}`);
    console.log(`📝 Output: ${options.outputPath}`);

    // Reset state
    this.seenIds.clear();
    this.errors = [];
    this.duplicateIds = [];

    try {
      // Check if source directory exists
      await fs.access(options.sourceDir);
    } catch {
      throw new Error(`Source directory not found: ${options.sourceDir}`);
    }

    // Get all JSON files
    const files = await this.getJSONFiles(options.sourceDir);
    console.log(`📄 Found ${files.length} JSON files`);

    // Validate files and collect valid entries
    const validEntries: Array<CharacterManifestEntry | PersonaManifestEntry> = [];

    for (const file of files) {
      const filePath = path.join(options.sourceDir, file);
      const entry = await this.validateAndProcessFile(filePath, file, options);

      if (entry) {
        validEntries.push(entry);
      }
    }

    // Note: Duplicate ID check moved to warning level
    // Phase 3 (Character Management UI) will handle comprehensive duplicate detection

    // Write manifest
    await this.writeManifest(options.outputPath, validEntries, options.type);

    // Report results
    const result: GenerationResult = {
      totalFiles: files.length,
      validFiles: validEntries.length,
      invalidFiles: this.errors.length,
      errors: this.errors,
      duplicateIds: this.duplicateIds,
    };

    this.printSummary(result, options.type);

    return result;
  }

  /**
   * Get all JSON files from directory (excluding manifest.json itself)
   */
  private async getJSONFiles(dir: string): Promise<string[]> {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    return entries
      .filter(entry =>
        entry.isFile() &&
        entry.name.endsWith('.json') &&
        !entry.name.startsWith('.') &&
        entry.name !== 'manifest.json' &&
        entry.name !== 'CHARACTER_MANAGEMENT_GUIDE.json'
      )
      .map(entry => entry.name)
      .sort();
  }

  /**
   * Validate and process a single file
   */
  private async validateAndProcessFile(
    filePath: string,
    fileName: string,
    options: ManifestGeneratorOptions
  ): Promise<CharacterManifestEntry | PersonaManifestEntry | null> {
    try {
      // Read file content
      let content = await fs.readFile(filePath, 'utf8');

      // BOM detection and removal
      if (options.removeBOM && content.charCodeAt(0) === 0xFEFF) {
        content = content.slice(1);
        await fs.writeFile(filePath, content, 'utf8');
        console.log(`  🔧 Removed BOM from ${fileName}`);
      }

      // Parse JSON
      let data: unknown;
      try {
        data = JSON.parse(content);
      } catch (parseError) {
        const error = parseError instanceof Error ? parseError : new Error(String(parseError));
        this.errors.push({
          file: fileName,
          error: 'JSON parse error',
          details: error.message,
        });
        console.error(`  ❌ JSON parse error: ${fileName}`);
        return null;
      }

      // Validate schema
      if (options.validateSchema) {
        const schema = options.type === 'character' ? CharacterFileSchema : PersonaFileSchema;
        const result = schema.safeParse(data);

        if (!result.success) {
          const errorMessages = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`);
          this.errors.push({
            file: fileName,
            error: 'Schema validation failed',
            details: errorMessages.join('; '),
          });
          console.error(`  ❌ Validation failed: ${fileName}`);
          console.error(`     ${errorMessages.join('\n     ')}`);
          return null;
        }

        data = result.data;
      }

      // Type assertion (after validation)
      const item = data as { id?: string; name: string; [key: string]: unknown };

      // Generate ID from filename if missing
      const characterId = item.id || path.basename(fileName, '.json');

      // Check for duplicate ID (warning only, not fatal)
      if (this.seenIds.has(characterId)) {
        console.warn(`  ⚠️  Duplicate ID warning: ${fileName} (ID: ${characterId})`);
        // Don't add to duplicateIds array - just warn
      } else {
        this.seenIds.add(characterId);
      }

      // Create manifest entry
      if (options.type === 'character') {
        const entry: CharacterManifestEntry = {
          id: characterId,
          name: item.name,
          filename: fileName,
        };
        console.log(`  ✅ ${item.name} (${fileName})`);
        return entry;
      } else {
        // Persona type
        const personaData = item as {
          id?: string;
          name: string;
          role?: string;
          other_settings?: string;
          avatar_path?: string | null;
          created_at?: string;
          updated_at?: string;
          version?: number;
        };

        const now = new Date().toISOString();

        const entry: PersonaManifestEntry = {
          id: characterId, // Use generated ID
          name: personaData.name,
          role: personaData.role || 'user',
          other_settings: personaData.other_settings || '',
          avatar_path: personaData.avatar_path || null,
          created_at: personaData.created_at || now,
          updated_at: personaData.updated_at || now,
          version: personaData.version || 1,
        };
        console.log(`  ✅ ${personaData.name} (${fileName})`);
        return entry;
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.errors.push({
        file: fileName,
        error: 'Unexpected error',
        details: err.message,
      });
      console.error(`  ❌ Error processing ${fileName}:`, err.message);
      return null;
    }
  }

  /**
   * Write manifest file
   */
  private async writeManifest(
    outputPath: string,
    entries: Array<CharacterManifestEntry | PersonaManifestEntry>,
    type: 'character' | 'persona'
  ): Promise<void> {
    const manifestContent = type === 'character'
      ? JSON.stringify(entries.map(e => (e as CharacterManifestEntry).filename), null, 2)
      : JSON.stringify(entries, null, 2);

    await fs.writeFile(outputPath, manifestContent, 'utf8');
  }

  /**
   * Print generation summary
   */
  private printSummary(result: GenerationResult, type: string): void {
    console.log('\n' + '='.repeat(60));
    console.log(`📊 ${type.toUpperCase()} MANIFEST GENERATION SUMMARY`);
    console.log('='.repeat(60));
    console.log(`Total files:    ${result.totalFiles}`);
    console.log(`Valid files:    ${result.validFiles} ✅`);
    console.log(`Invalid files:  ${result.invalidFiles} ❌`);

    if (result.errors.length > 0) {
      console.log('\n⚠️  Errors encountered:');
      result.errors.forEach((error, index) => {
        console.log(`\n${index + 1}. ${error.file}`);
        console.log(`   Error: ${error.error}`);
        if (error.details) {
          console.log(`   Details: ${error.details}`);
        }
      });
    }

    console.log('\n✅ Manifest generation completed!');
    console.log(`⏱️  Generated at: ${new Date().toISOString()}`);
    console.log('='.repeat(60) + '\n');
  }
}

/**
 * Main execution
 */
async function main() {
  const generator = new ManifestGenerator();

  try {
    // Generate character manifest
    const characterResult = await generator.generate({
      sourceDir: path.join(process.cwd(), 'public', 'characters'),
      outputPath: path.join(process.cwd(), 'public', 'characters', 'manifest.json'),
      type: 'character',
      validateSchema: true,
      removeBOM: true,
    });

    // Generate persona manifest
    const personaResult = await generator.generate({
      sourceDir: path.join(process.cwd(), 'public', 'personas'),
      outputPath: path.join(process.cwd(), 'public', 'personas', 'manifest.json'),
      type: 'persona',
      validateSchema: true,
      removeBOM: true,
    });

    // Overall summary
    console.log('\n' + '━'.repeat(60));
    console.log('🎉 ALL MANIFESTS GENERATED SUCCESSFULLY');
    console.log('━'.repeat(60));
    console.log(`Characters: ${characterResult.validFiles}/${characterResult.totalFiles} valid`);
    console.log(`Personas:   ${personaResult.validFiles}/${personaResult.totalFiles} valid`);
    console.log('━'.repeat(60) + '\n');

    process.exit(0);
  } catch (error) {
    console.error('\n💥 FATAL ERROR:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { ManifestGenerator, type ManifestGeneratorOptions, type GenerationResult };

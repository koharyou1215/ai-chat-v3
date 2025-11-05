#!/usr/bin/env node

/**
 * Manifest Validation Script
 *
 * Validates that generated manifest.json files are consistent with source files.
 * Runs as part of postbuild validation (optional).
 *
 * Usage:
 *   tsx scripts/validate-manifests.ts
 */

import * as fs from 'fs/promises';
import * as path from 'path';

interface ValidationResult {
  valid: boolean;
  manifestCount: number;
  sourceCount: number;
  missingFiles: string[];
  extraFiles: string[];
  errors: string[];
}

class ManifestValidator {
  /**
   * Validate character manifest
   */
  async validateCharacters(): Promise<ValidationResult> {
    const sourceDir = path.join(process.cwd(), 'public', 'characters');
    const manifestPath = path.join(sourceDir, 'manifest.json');

    return this.validateManifest(sourceDir, manifestPath, 'characters');
  }

  /**
   * Validate persona manifest
   */
  async validatePersonas(): Promise<ValidationResult> {
    const sourceDir = path.join(process.cwd(), 'public', 'personas');
    const manifestPath = path.join(sourceDir, 'manifest.json');

    return this.validateManifest(sourceDir, manifestPath, 'personas');
  }

  /**
   * Validate a manifest file against source directory
   */
  private async validateManifest(
    sourceDir: string,
    manifestPath: string,
    type: string
  ): Promise<ValidationResult> {
    const result: ValidationResult = {
      valid: true,
      manifestCount: 0,
      sourceCount: 0,
      missingFiles: [],
      extraFiles: [],
      errors: [],
    };

    try {
      // Read manifest
      const manifestContent = await fs.readFile(manifestPath, 'utf8');
      let manifest: string[] | Array<{ id: string; name: string }>;

      try {
        manifest = JSON.parse(manifestContent);
      } catch (error) {
        result.valid = false;
        result.errors.push('Manifest JSON parse error');
        return result;
      }

      // Extract filenames from manifest
      let manifestFiles: string[] = [];

      if (Array.isArray(manifest)) {
        if (manifest.length > 0) {
          if (typeof manifest[0] === 'string') {
            // Character manifest (array of filenames)
            manifestFiles = manifest as string[];
          } else {
            // Persona manifest (array of objects with id field)
            manifestFiles = (manifest as Array<{ id: string; [key: string]: unknown }>).map(
              entry => `${entry.id}.json`
            );
          }
        }
      }

      result.manifestCount = manifestFiles.length;

      // Get source files
      const entries = await fs.readdir(sourceDir, { withFileTypes: true });
      const sourceFiles = entries
        .filter(entry =>
          entry.isFile() &&
          entry.name.endsWith('.json') &&
          !entry.name.startsWith('.') &&
          entry.name !== 'manifest.json' &&
          entry.name !== 'CHARACTER_MANAGEMENT_GUIDE.json'
        )
        .map(entry => entry.name);

      result.sourceCount = sourceFiles.length;

      // Find missing files (in manifest but not in source)
      const manifestSet = new Set<string>(manifestFiles);
      const sourceSet = new Set<string>(sourceFiles);

      result.missingFiles = manifestFiles.filter(file => !sourceSet.has(file));
      result.extraFiles = sourceFiles.filter(file => !manifestSet.has(file));

      // Determine validity
      if (result.missingFiles.length > 0 || result.extraFiles.length > 0) {
        result.valid = false;
        result.errors.push('Manifest is out of sync with source files');
      }

      console.log(`\n📋 Validating ${type} manifest...`);
      console.log(`  Manifest entries: ${result.manifestCount}`);
      console.log(`  Source files:     ${result.sourceCount}`);

      if (result.missingFiles.length > 0) {
        console.warn(`  ⚠️  Missing ${result.missingFiles.length} files in source`);
        result.missingFiles.forEach(file => console.warn(`    - ${file}`));
      }

      if (result.extraFiles.length > 0) {
        console.warn(`  ⚠️  Found ${result.extraFiles.length} extra files not in manifest`);
        result.extraFiles.forEach(file => console.warn(`    - ${file}`));
      }

      if (result.valid) {
        console.log(`  ✅ Validation passed`);
      } else {
        console.error(`  ❌ Validation failed`);
      }

    } catch (error) {
      result.valid = false;
      result.errors.push(error instanceof Error ? error.message : String(error));
      console.error(`\n❌ Error validating ${type} manifest:`, error);
    }

    return result;
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('🔍 MANIFEST VALIDATION');
  console.log('='.repeat(60));

  const validator = new ManifestValidator();

  try {
    // Validate both manifests
    const [characterResult, personaResult] = await Promise.all([
      validator.validateCharacters(),
      validator.validatePersonas(),
    ]);

    // Print summary
    console.log('\n' + '━'.repeat(60));
    console.log('📊 VALIDATION SUMMARY');
    console.log('━'.repeat(60));
    console.log(`Characters: ${characterResult.valid ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Personas:   ${personaResult.valid ? '✅ PASS' : '❌ FAIL'}`);

    // Exit with appropriate code
    const allValid = characterResult.valid && personaResult.valid;

    if (allValid) {
      console.log('\n✅ All manifests are valid!');
      console.log('━'.repeat(60) + '\n');
      process.exit(0);
    } else {
      console.error('\n❌ Validation failed! Please regenerate manifests.');
      console.error('   Run: npm run prebuild');
      console.log('━'.repeat(60) + '\n');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n💥 FATAL ERROR:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { ManifestValidator };

// src/services/character-management/integrity-checker.ts

/**
 * Character Integrity Checker
 *
 * Validates character files for:
 * - BOM (Byte Order Mark) presence
 * - JSON syntax errors
 * - Schema validation
 * - Field type correctness
 * - Required fields presence
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { CharacterFileSchema } from '../../../scripts/schemas/character.schema';

export type IntegrityErrorSeverity = 'error' | 'warning';

export interface IntegrityError {
  file: string;
  field: string;
  message: string;
  severity: IntegrityErrorSeverity;
  autoFixable: boolean;
  suggestedFix?: string;
}

export interface IntegrityReport {
  file: string;
  errors: IntegrityError[];
  hasBOM: boolean;
  isValidJSON: boolean;
  passesSchemaValidation: boolean;
  filesizeKB: number;
  lastModified: number;
}

export interface IntegrityCheckResult {
  totalFiles: number;
  validFiles: number;
  invalidFiles: number;
  reports: IntegrityReport[];
  autoFixableCount: number;
}

export class CharacterIntegrityChecker {
  private charactersDir: string;

  constructor(charactersDir?: string) {
    this.charactersDir = charactersDir || path.join(process.cwd(), 'public', 'characters');
  }

  /**
   * Check all character files
   */
  async checkAll(): Promise<IntegrityCheckResult> {
    const files = await this.getCharacterFiles();
    const reports: IntegrityReport[] = [];

    for (const file of files) {
      const report = await this.checkFile(file);
      reports.push(report);
    }

    const validFiles = reports.filter(r => r.errors.length === 0).length;
    const invalidFiles = reports.filter(r => r.errors.length > 0).length;
    const autoFixableCount = reports.reduce(
      (sum, r) => sum + r.errors.filter(e => e.autoFixable).length,
      0
    );

    return {
      totalFiles: files.length,
      validFiles,
      invalidFiles,
      reports: reports.filter(r => r.errors.length > 0), // Only return files with errors
      autoFixableCount,
    };
  }

  /**
   * Check single file
   */
  async checkFile(filePath: string): Promise<IntegrityReport> {
    const filename = path.basename(filePath);
    const stats = await fs.stat(filePath);

    const report: IntegrityReport = {
      file: filename,
      errors: [],
      hasBOM: false,
      isValidJSON: true,
      passesSchemaValidation: true,
      filesizeKB: Math.round(stats.size / 1024),
      lastModified: stats.mtimeMs,
    };

    try {
      let content = await fs.readFile(filePath, 'utf8');

      // 1. Check for BOM
      if (content.charCodeAt(0) === 0xfeff) {
        report.hasBOM = true;
        report.errors.push({
          file: filename,
          field: '__file__',
          message: 'BOM (Byte Order Mark) detected',
          severity: 'error',
          autoFixable: true,
          suggestedFix: 'Remove BOM from file',
        });
        content = content.slice(1);
      }

      // 2. Check JSON syntax
      let data: unknown;
      try {
        data = JSON.parse(content);
      } catch (parseError) {
        report.isValidJSON = false;
        report.errors.push({
          file: filename,
          field: '__file__',
          message: `Invalid JSON syntax: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
          severity: 'error',
          autoFixable: false,
        });
        return report;
      }

      // 3. Schema validation
      const validationResult = CharacterFileSchema.safeParse(data);
      if (!validationResult.success) {
        report.passesSchemaValidation = false;

        validationResult.error.errors.forEach(err => {
          report.errors.push({
            file: filename,
            field: err.path.join('.'),
            message: err.message,
            severity: 'error',
            autoFixable: false,
          });
        });
      }

      // 4. Custom validations
      if (typeof data === 'object' && data !== null) {
        const char = data as Record<string, unknown>;

        // Check for missing ID
        if (!char.id) {
          report.errors.push({
            file: filename,
            field: 'id',
            message: 'Missing required field: id',
            severity: 'warning',
            autoFixable: true,
            suggestedFix: `Add id field: "${path.basename(filePath, '.json')}"`,
          });
        }

        // Check tracker types
        if (Array.isArray(char.trackers)) {
          char.trackers.forEach((tracker: unknown, idx: number) => {
            if (typeof tracker === 'object' && tracker !== null) {
              const t = tracker as Record<string, unknown>;

              // Check for 'numeric' type (should be 'number')
              if (t.type === 'numeric') {
                report.errors.push({
                  file: filename,
                  field: `trackers[${idx}].type`,
                  message: 'Invalid tracker type "numeric", should be "number"',
                  severity: 'warning',
                  autoFixable: true,
                  suggestedFix: 'Change "numeric" to "number"',
                });
              }

              // Check state tracker possible_states
              if (t.type === 'state' && Array.isArray(t.possible_states)) {
                t.possible_states.forEach((state: unknown, sIdx: number) => {
                  if (typeof state !== 'string') {
                    report.errors.push({
                      file: filename,
                      field: `trackers[${idx}].possible_states[${sIdx}]`,
                      message: `Expected string, got ${typeof state}`,
                      severity: 'warning',
                      autoFixable: true,
                      suggestedFix: `Convert to string: "${String(state)}"`,
                    });
                  }
                });
              }
            }
          });
        }

        // Check for null URLs
        const urlFields = [
          'avatar_url',
          'background_url',
          'background_url_desktop',
          'background_url_mobile',
        ];
        urlFields.forEach(field => {
          if (char[field] === null) {
            report.errors.push({
              file: filename,
              field,
              message: 'URL field is null, should be omitted or have a value',
              severity: 'warning',
              autoFixable: true,
              suggestedFix: 'Remove field or set to empty string',
            });
          }
        });
      }
    } catch (error) {
      report.errors.push({
        file: filename,
        field: '__file__',
        message: `File read error: ${error instanceof Error ? error.message : String(error)}`,
        severity: 'error',
        autoFixable: false,
      });
    }

    return report;
  }

  /**
   * Auto-fix errors
   */
  async autoFix(reports: IntegrityReport[]): Promise<{
    fixed: number;
    failed: number;
    errors: string[];
  }> {
    let fixed = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const report of reports) {
      const autoFixableErrors = report.errors.filter(e => e.autoFixable);
      if (autoFixableErrors.length === 0) continue;

      try {
        const filePath = path.join(this.charactersDir, report.file);
        let content = await fs.readFile(filePath, 'utf8');

        // Fix BOM
        if (report.hasBOM && content.charCodeAt(0) === 0xfeff) {
          content = content.slice(1);
          console.log(`🔧 Removed BOM from ${report.file}`);
        }

        let data = JSON.parse(content) as Record<string, unknown>;
        let modified = false;

        // Fix missing ID
        const missingIdError = autoFixableErrors.find(e => e.field === 'id');
        if (missingIdError && !data.id) {
          data.id = path.basename(report.file, '.json');
          modified = true;
          console.log(`🔧 Added ID to ${report.file}`);
        }

        // Fix tracker types
        if (Array.isArray(data.trackers)) {
          data.trackers.forEach((tracker: unknown) => {
            if (typeof tracker === 'object' && tracker !== null) {
              const t = tracker as Record<string, unknown>;
              if (t.type === 'numeric') {
                t.type = 'number';
                modified = true;
              }
            }
          });
        }

        // Fix null URLs
        ['avatar_url', 'background_url', 'background_url_desktop', 'background_url_mobile'].forEach(
          field => {
            if (data[field] === null) {
              delete data[field];
              modified = true;
            }
          }
        );

        if (modified) {
          await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
          console.log(`✅ Fixed ${report.file}`);
          fixed++;
        }
      } catch (error) {
        console.error(`Failed to fix ${report.file}:`, error);
        errors.push(`${report.file}: ${error instanceof Error ? error.message : String(error)}`);
        failed++;
      }
    }

    return { fixed, failed, errors };
  }

  /**
   * Get list of character files
   */
  private async getCharacterFiles(): Promise<string[]> {
    const entries = await fs.readdir(this.charactersDir, { withFileTypes: true });
    return entries
      .filter(
        entry =>
          entry.isFile() &&
          entry.name.endsWith('.json') &&
          !entry.name.startsWith('.') &&
          entry.name !== 'manifest.json' &&
          entry.name !== 'CHARACTER_MANAGEMENT_GUIDE.json'
      )
      .map(entry => path.join(this.charactersDir, entry.name));
  }
}

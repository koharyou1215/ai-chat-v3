// src/services/character-management/duplicate-detector.ts

/**
 * Character Duplicate Detector
 *
 * Detects duplicate characters by:
 * - ID duplication (critical error)
 * - Name duplication (warning)
 * - Content hash duplication (auto-fixable warning)
 */

import * as fs from 'fs/promises';
import * as path from 'path';

export type DuplicateType = 'id' | 'name' | 'content-hash';
export type DuplicateSeverity = 'error' | 'warning';
export type SuggestedAction = 'delete-duplicate' | 'merge' | 'rename' | 'manual-review';

export interface DuplicateFile {
  filename: string;
  path: string;
  filesize: number;
  lastModified: number;
}

export interface DuplicateReport {
  type: DuplicateType;
  severity: DuplicateSeverity;
  value: string; // The duplicated value (ID, name, or hash)
  files: DuplicateFile[];
  autoFixable: boolean;
  suggestedAction: SuggestedAction;
  details?: string;
}

export interface DuplicateDetectionResult {
  totalFiles: number;
  duplicatesFound: number;
  reports: DuplicateReport[];
  criticalCount: number;
  warningCount: number;
}

export class CharacterDuplicateDetector {
  private charactersDir: string;

  constructor(charactersDir?: string) {
    this.charactersDir = charactersDir || path.join(process.cwd(), 'public', 'characters');
  }

  /**
   * Detect all types of duplicates
   */
  async detectAll(): Promise<DuplicateDetectionResult> {
    const files = await this.getCharacterFiles();

    const reports: DuplicateReport[] = [];

    // ID duplicates
    const idDuplicates = await this.detectIdDuplicates(files);
    reports.push(...idDuplicates);

    // Name duplicates
    const nameDuplicates = await this.detectNameDuplicates(files);
    reports.push(...nameDuplicates);

    // Content hash duplicates
    const contentDuplicates = await this.detectContentDuplicates(files);
    reports.push(...contentDuplicates);

    const criticalCount = reports.filter(r => r.severity === 'error').length;
    const warningCount = reports.filter(r => r.severity === 'warning').length;

    return {
      totalFiles: files.length,
      duplicatesFound: reports.length,
      reports,
      criticalCount,
      warningCount,
    };
  }

  /**
   * Detect ID duplicates (critical)
   */
  private async detectIdDuplicates(files: string[]): Promise<DuplicateReport[]> {
    const idMap = new Map<string, DuplicateFile[]>();
    const reports: DuplicateReport[] = [];

    for (const file of files) {
      try {
        const data = await this.readCharacterFile(file);
        const id = (typeof data.id === 'string' ? data.id : null) || path.basename(file, '.json');

        const fileInfo = await this.getFileInfo(file);
        const existing = idMap.get(id) || [];
        existing.push(fileInfo);
        idMap.set(id, existing);
      } catch (error) {
        console.error(`Error reading ${file}:`, error);
      }
    }

    // Find duplicates
    idMap.forEach((fileInfos, id) => {
      if (fileInfos.length > 1) {
        reports.push({
          type: 'id',
          severity: 'error',
          value: id,
          files: fileInfos,
          autoFixable: false,
          suggestedAction: 'manual-review',
          details: `Multiple files share the same ID: "${id}". This can cause data conflicts.`,
        });
      }
    });

    return reports;
  }

  /**
   * Detect name duplicates (warning)
   */
  private async detectNameDuplicates(files: string[]): Promise<DuplicateReport[]> {
    const nameMap = new Map<string, DuplicateFile[]>();
    const reports: DuplicateReport[] = [];

    for (const file of files) {
      try {
        const data = await this.readCharacterFile(file);
        if (!data.name || typeof data.name !== 'string') continue;

        const fileInfo = await this.getFileInfo(file);
        const existing = nameMap.get(data.name) || [];
        existing.push(fileInfo);
        nameMap.set(data.name, existing);
      } catch (error) {
        console.error(`Error reading ${file}:`, error);
      }
    }

    // Find duplicates
    nameMap.forEach((fileInfos, name) => {
      if (fileInfos.length > 1) {
        reports.push({
          type: 'name',
          severity: 'warning',
          value: name,
          files: fileInfos,
          autoFixable: false,
          suggestedAction: 'rename',
          details: `Multiple files share the same name: "${name}". Consider using unique names or adding descriptors.`,
        });
      }
    });

    return reports;
  }

  /**
   * Detect content hash duplicates (auto-fixable)
   */
  private async detectContentDuplicates(files: string[]): Promise<DuplicateReport[]> {
    const hashMap = new Map<string, DuplicateFile[]>();
    const reports: DuplicateReport[] = [];

    for (const file of files) {
      try {
        const data = await this.readCharacterFile(file);

        // Hash only core content (ignore metadata like created_at, updated_at)
        const normalized = {
          name: data.name,
          role: data.role || data.occupation,
          personality: data.personality,
          description: data.description,
          system_prompt: data.system_prompt,
        };

        const hash = this.computeHash(normalized);
        const fileInfo = await this.getFileInfo(file);
        const existing = hashMap.get(hash) || [];
        existing.push(fileInfo);
        hashMap.set(hash, existing);
      } catch (error) {
        console.error(`Error reading ${file}:`, error);
      }
    }

    // Find duplicates
    hashMap.forEach((fileInfos, hash) => {
      if (fileInfos.length > 1) {
        // Sort by modification date (keep newest)
        const sorted = [...fileInfos].sort((a, b) => b.lastModified - a.lastModified);

        reports.push({
          type: 'content-hash',
          severity: 'warning',
          value: hash,
          files: sorted,
          autoFixable: true,
          suggestedAction: 'delete-duplicate',
          details: `${sorted.length} files have identical content. Recommend keeping "${sorted[0].filename}" (newest) and deleting others.`,
        });
      }
    });

    return reports;
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

  /**
   * Read and parse character file
   */
  private async readCharacterFile(filePath: string): Promise<Record<string, unknown>> {
    let content = await fs.readFile(filePath, 'utf8');

    // Remove BOM if present
    if (content.charCodeAt(0) === 0xfeff) {
      content = content.slice(1);
    }

    return JSON.parse(content) as Record<string, unknown>;
  }

  /**
   * Get file metadata
   */
  private async getFileInfo(filePath: string): Promise<DuplicateFile> {
    const stats = await fs.stat(filePath);
    return {
      filename: path.basename(filePath),
      path: filePath,
      filesize: stats.size,
      lastModified: stats.mtimeMs,
    };
  }

  /**
   * Compute simple hash for content comparison
   */
  private computeHash(obj: unknown): string {
    const str = JSON.stringify(obj, Object.keys(obj as object).sort());
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(16);
  }

  /**
   * Auto-fix duplicates (delete older duplicates)
   */
  async autoFixDuplicates(reports: DuplicateReport[]): Promise<{
    fixed: number;
    failed: number;
    errors: string[];
  }> {
    const fixableReports = reports.filter(r => r.autoFixable);
    let fixed = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const report of fixableReports) {
      // Keep the first file (newest), delete the rest
      const toDelete = report.files.slice(1);

      for (const file of toDelete) {
        try {
          await fs.unlink(file.path);
          console.log(`🗑️  Deleted duplicate: ${file.filename}`);
          fixed++;
        } catch (error) {
          console.error(`Failed to delete ${file.filename}:`, error);
          errors.push(`${file.filename}: ${error instanceof Error ? error.message : String(error)}`);
          failed++;
        }
      }
    }

    return { fixed, failed, errors };
  }
}

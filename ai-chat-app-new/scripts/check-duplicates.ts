#!/usr/bin/env node

/**
 * Character Duplicate Checker
 *
 * Checks for duplicate IDs and names in character files
 */

import * as fs from 'fs/promises';
import * as path from 'path';

interface DuplicateReport {
  duplicateIds: Map<string, string[]>;
  duplicateNames: Map<string, string[]>;
  filesWithoutId: string[];
  totalFiles: number;
}

async function checkDuplicates(): Promise<DuplicateReport> {
  const charactersDir = path.join(process.cwd(), 'public', 'characters');

  const report: DuplicateReport = {
    duplicateIds: new Map(),
    duplicateNames: new Map(),
    filesWithoutId: [],
    totalFiles: 0,
  };

  const files = await fs.readdir(charactersDir);
  const jsonFiles = files.filter(f =>
    f.endsWith('.json') &&
    !f.startsWith('.') &&
    f !== 'manifest.json' &&
    f !== 'CHARACTER_MANAGEMENT_GUIDE.json'
  );

  report.totalFiles = jsonFiles.length;

  const idMap = new Map<string, string[]>();
  const nameMap = new Map<string, string[]>();

  for (const file of jsonFiles) {
    try {
      const content = await fs.readFile(path.join(charactersDir, file), 'utf8');
      const data = JSON.parse(content.charCodeAt(0) === 0xFEFF ? content.slice(1) : content);

      // Check ID
      const id = data.id || path.basename(file, '.json');
      const idFiles = idMap.get(id) || [];
      idFiles.push(file);
      idMap.set(id, idFiles);

      if (!data.id) {
        report.filesWithoutId.push(file);
      }

      // Check Name
      if (data.name) {
        const nameFiles = nameMap.get(data.name) || [];
        nameFiles.push(file);
        nameMap.set(data.name, nameFiles);
      }
    } catch (error) {
      console.error(`Error reading ${file}:`, error);
    }
  }

  // Find duplicates
  idMap.forEach((files, id) => {
    if (files.length > 1) {
      report.duplicateIds.set(id, files);
    }
  });

  nameMap.forEach((files, name) => {
    if (files.length > 1) {
      report.duplicateNames.set(name, files);
    }
  });

  return report;
}

async function main() {
  console.log('🔍 Checking for duplicate characters...\n');

  const report = await checkDuplicates();

  console.log(`📊 Total character files: ${report.totalFiles}`);
  console.log(`⚠️  Files without ID field: ${report.filesWithoutId.length}`);
  console.log(`🔴 Duplicate IDs found: ${report.duplicateIds.size}`);
  console.log(`🟡 Duplicate names found: ${report.duplicateNames.size}\n`);

  if (report.duplicateIds.size > 0) {
    console.log('━'.repeat(60));
    console.log('🔴 DUPLICATE IDs:');
    console.log('━'.repeat(60));
    report.duplicateIds.forEach((files, id) => {
      console.log(`\nID: "${id}"`);
      files.forEach(f => console.log(`  - ${f}`));
    });
  }

  if (report.duplicateNames.size > 0) {
    console.log('\n' + '━'.repeat(60));
    console.log('🟡 DUPLICATE NAMES:');
    console.log('━'.repeat(60));
    report.duplicateNames.forEach((files, name) => {
      console.log(`\nName: "${name}"`);
      files.forEach(f => console.log(`  - ${f}`));
    });
  }

  if (report.filesWithoutId.length > 0) {
    console.log('\n' + '━'.repeat(60));
    console.log('⚠️  FILES WITHOUT ID FIELD:');
    console.log('━'.repeat(60));
    report.filesWithoutId.slice(0, 10).forEach(f => console.log(`  - ${f}`));
    if (report.filesWithoutId.length > 10) {
      console.log(`  ... and ${report.filesWithoutId.length - 10} more`);
    }
  }

  console.log('\n' + '━'.repeat(60));
  if (report.duplicateIds.size === 0 && report.duplicateNames.size === 0) {
    console.log('✅ No duplicates found!');
  } else {
    console.log('⚠️  Duplicates detected! Use Phase 3 Character Management UI to resolve.');
  }
  console.log('━'.repeat(60));
}

main();

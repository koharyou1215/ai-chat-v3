// src/app/api/admin/characters/diagnostics/route.ts

/**
 * Character Diagnostics API
 *
 * GET  /api/admin/characters/diagnostics - Run full diagnostics
 * POST /api/admin/characters/diagnostics - Auto-fix issues
 */

import { NextRequest, NextResponse } from 'next/server';
import { CharacterDuplicateDetector } from '@/services/character-management/duplicate-detector';
import { CharacterIntegrityChecker } from '@/services/character-management/integrity-checker';

export const dynamic = 'force-dynamic';

/**
 * GET - Run diagnostics
 */
export async function GET() {
  try {
    console.log('🔍 Running character diagnostics...');

    // Run duplicate detection
    const duplicateDetector = new CharacterDuplicateDetector();
    const duplicateResult = await duplicateDetector.detectAll();

    // Run integrity check
    const integrityChecker = new CharacterIntegrityChecker();
    const integrityResult = await integrityChecker.checkAll();

    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        totalFiles: duplicateResult.totalFiles,
        duplicatesFound: duplicateResult.duplicatesFound,
        integrityIssues: integrityResult.invalidFiles,
        criticalIssues: duplicateResult.criticalCount + integrityResult.reports.filter(r =>
          r.errors.some(e => e.severity === 'error')
        ).length,
        warningIssues: duplicateResult.warningCount + integrityResult.reports.filter(r =>
          r.errors.some(e => e.severity === 'warning')
        ).length,
        autoFixableCount: integrityResult.autoFixableCount + duplicateResult.reports.filter(r => r.autoFixable).length,
      },
      duplicates: {
        ...duplicateResult,
      },
      integrity: {
        ...integrityResult,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('❌ Diagnostics failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST - Auto-fix issues
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      fixDuplicates?: boolean;
      fixIntegrity?: boolean;
    };

    console.log('🔧 Running auto-fix...', body);

    const results = {
      success: true,
      timestamp: new Date().toISOString(),
      duplicates: {
        fixed: 0,
        failed: 0,
        errors: [] as string[],
      },
      integrity: {
        fixed: 0,
        failed: 0,
        errors: [] as string[],
      },
    };

    // Fix duplicates
    if (body.fixDuplicates) {
      const duplicateDetector = new CharacterDuplicateDetector();
      const duplicateResult = await duplicateDetector.detectAll();
      const fixResult = await duplicateDetector.autoFixDuplicates(duplicateResult.reports);
      results.duplicates = fixResult;
    }

    // Fix integrity issues
    if (body.fixIntegrity) {
      const integrityChecker = new CharacterIntegrityChecker();
      const integrityResult = await integrityChecker.checkAll();
      const fixResult = await integrityChecker.autoFix(integrityResult.reports);
      results.integrity = fixResult;
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error('❌ Auto-fix failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

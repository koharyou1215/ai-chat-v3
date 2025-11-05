// src/app/api/admin/characters/manifest/route.ts

/**
 * Character Manifest API
 *
 * POST /api/admin/characters/manifest - Regenerate manifest files
 */

import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export const dynamic = 'force-dynamic';

/**
 * POST - Regenerate manifest files
 */
export async function POST() {
  try {
    console.log('🔄 Regenerating manifest files...');

    // Run the manifest generation script
    const { stdout, stderr } = await execAsync('npx tsx scripts/generate-manifests.ts');

    console.log(stdout);
    if (stderr) {
      console.error(stderr);
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      message: 'Manifest files regenerated successfully',
      output: stdout,
    });
  } catch (error) {
    console.error('❌ Manifest regeneration failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        details: error instanceof Error && 'stderr' in error ? (error as { stderr?: string }).stderr : undefined,
      },
      { status: 500 }
    );
  }
}

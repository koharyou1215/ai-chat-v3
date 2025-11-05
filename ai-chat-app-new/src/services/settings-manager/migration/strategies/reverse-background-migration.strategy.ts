/**
 * Reverse Background Settings Migration Strategy
 *
 * Phase 3 Rollback: Migrates hierarchical background settings back to flat structure
 *
 * New Structure → Old Structure:
 * - ui.background.type → ui.backgroundType
 * - ui.background.image.url → ui.backgroundImage
 * - ui.background.image.blur → ui.backgroundBlur
 * - ui.background.image.blurEnabled → ui.backgroundBlurEnabled
 * - ui.background.image.opacity → ui.backgroundOpacity
 * - ui.background.gradient.value → ui.backgroundGradient
 * - ui.background.pattern → ui.backgroundPattern
 * - ui.background.patternOpacity → ui.backgroundPatternOpacity
 *
 * @module services/settings-manager/migration/strategies
 */

import type { MigrationStrategy } from './base-migration.strategy';
import type { UnifiedSettings } from '../../../settings-manager';

/**
 * Reverse Background Settings Migration Strategy
 *
 * Handles Phase 3 rollback from hierarchical structure to flat background settings
 * Used for emergency rollback or backward compatibility scenarios
 */
export class ReverseBackgroundMigrationStrategy implements MigrationStrategy {
  readonly name = 'Phase 3 Rollback: Background Settings Flat Structure Migration';

  /**
   * Checks if background settings need reverse migration
   *
   * Detection Logic:
   * - Checks if new hierarchical structure exists
   * - Returns true if rollback to flat structure is needed
   */
  canMigrate(settings: UnifiedSettings): boolean {
    const ui = settings.ui as Record<string, unknown>;
    // 階層構造が存在する場合に逆マイグレーション
    return ui.background !== undefined;
  }

  /**
   * Migrates background settings back to flat structure
   *
   * Process:
   * 1. Extract values from hierarchical structure
   * 2. Map nested fields back to flat fields
   * 3. Preserve existing values or use defaults
   * 4. Delete hierarchical structure
   */
  migrate(settings: UnifiedSettings): boolean {
    if (!this.canMigrate(settings)) {
      return false;
    }

    console.log(`🔄 [${this.name}] Rolling back background settings to flat structure...`);

    try {
      const ui = settings.ui as Record<string, unknown>;
      // Type assertion for migration: background structure exists but isn't in type definition
      type BackgroundStructure = Record<string, unknown> & {
        type?: string;
        image?: Record<string, unknown>;
        gradient?: Record<string, unknown>;
        pattern?: string;
        patternOpacity?: number;
      };
      const bg = ui.background as BackgroundStructure | undefined;
      if (!bg) return false;

      // 階層構造からフラット構造に戻す
      settings.ui.backgroundType = (bg.type || 'gradient') as string;
      settings.ui.backgroundImage = ((bg.image as Record<string, unknown>)?.url || '') as string;
      settings.ui.backgroundBlur = ((bg.image as Record<string, unknown>)?.blur || 10) as number;
      settings.ui.backgroundBlurEnabled = ((bg.image as Record<string, unknown>)?.blurEnabled ?? false) as boolean;
      settings.ui.backgroundOpacity = ((bg.image as Record<string, unknown>)?.opacity || 100) as number;
      settings.ui.backgroundGradient = ((bg.gradient as Record<string, unknown>)?.value || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)') as string;

      if (bg.pattern !== undefined) {
        settings.ui.backgroundPattern = bg.pattern;
      }
      if (bg.patternOpacity !== undefined) {
        settings.ui.backgroundPatternOpacity = bg.patternOpacity;
      }

      // 階層構造を削除
      delete ui.background;

      console.log(`✅ [${this.name}] Background settings rollback complete`);
      return true;
    } catch (error) {
      console.error(`❌ [${this.name}] Rollback failed:`, error);
      return false;
    }
  }
}

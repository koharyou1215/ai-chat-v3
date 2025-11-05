/**
 * Background Settings Migration Strategy
 *
 * Phase 3: Migrates legacy flat background settings to hierarchical structure
 *
 * Old Structure → New Structure:
 * - ui.backgroundType → ui.background.type
 * - ui.backgroundImage → ui.background.image.url
 * - ui.backgroundBlur → ui.background.image.blur
 * - ui.backgroundBlurEnabled → ui.background.image.blurEnabled
 * - ui.backgroundOpacity → ui.background.image.opacity
 * - ui.backgroundGradient → ui.background.gradient.value
 * - ui.backgroundPattern → ui.background.pattern
 * - ui.backgroundPatternOpacity → ui.background.patternOpacity
 *
 * @module services/settings-manager/migration/strategies
 */

import type { MigrationStrategy } from './base-migration.strategy';
import type { UnifiedSettings } from '../../../settings-manager';

/**
 * Background Settings Migration Strategy
 *
 * Handles Phase 3 migration from flat background settings to hierarchical structure
 */
export class BackgroundMigrationStrategy implements MigrationStrategy {
  readonly name = 'Phase 3: Background Settings Hierarchical Structure Migration';

  /**
   * Checks if background settings need migration
   *
   * Detection Logic:
   * - Checks for deprecated flat fields (backgroundType, backgroundImage, etc.)
   * - Returns false if new background structure already exists
   */
  canMigrate(settings: UnifiedSettings): boolean {
    const ui = settings.ui as Record<string, unknown>;
    // フラット構造が存在し、階層構造が存在しない場合にマイグレーション
    return (
      settings.ui.backgroundType !== undefined &&
      ui.background === undefined
    );
  }

  /**
   * Migrates background settings to new hierarchical structure
   *
   * Process:
   * 1. Create background hierarchy
   * 2. Map old flat fields to new nested structure
   * 3. Preserve existing values or use defaults
   * 4. Delete deprecated fields
   */
  migrate(settings: UnifiedSettings): boolean {
    if (!this.canMigrate(settings)) {
      return false;
    }

    console.log(`🔄 [${this.name}] Migrating background settings to hierarchical structure...`);

    try {
      // フラット構造から値を取得
      const type = settings.ui.backgroundType || 'gradient';
      const imageUrl = settings.ui.backgroundImage || '';
      const blur = settings.ui.backgroundBlur || 10;
      const blurEnabled = settings.ui.backgroundBlurEnabled ?? false;
      const opacity = settings.ui.backgroundOpacity || 100;
      const gradientValue = settings.ui.backgroundGradient || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
      const pattern = settings.ui.backgroundPattern;
      const patternOpacity = settings.ui.backgroundPatternOpacity;

      // 階層構造を作成
      const ui = settings.ui as Record<string, unknown>;
      ui.background = {
        type,
        image: {
          url: imageUrl,
          blur,
          blurEnabled,
          opacity,
        },
        gradient: {
          value: gradientValue,
        },
        ...(pattern !== undefined && { pattern }),
        ...(patternOpacity !== undefined && { patternOpacity }),
      };

      // 古いフラット構造を削除
      this.cleanupDeprecatedFields(settings);

      console.log(`✅ [${this.name}] Background settings migration complete`);
      return true;
    } catch (error) {
      console.error(`❌ [${this.name}] Migration failed:`, error);
      return false;
    }
  }

  /**
   * Removes deprecated flat background fields from settings object
   * @private
   */
  private cleanupDeprecatedFields(settings: UnifiedSettings): void {
    delete settings.ui.backgroundType;
    delete settings.ui.backgroundImage;
    delete settings.ui.backgroundBlur;
    delete settings.ui.backgroundBlurEnabled;
    delete settings.ui.backgroundOpacity;
    delete settings.ui.backgroundGradient;
    delete settings.ui.backgroundPattern;
    delete settings.ui.backgroundPatternOpacity;
  }
}

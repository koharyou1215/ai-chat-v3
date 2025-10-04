/**
 * 3D Settings Migration Strategy
 *
 * Phase 2.1: Migrates legacy 3D effects settings to hierarchical structure
 *
 * Old Structure → New Structure:
 * - effects.enable3DEffects → effects.threeDEffects.enabled
 * - effects.hologramMessages → effects.threeDEffects.hologram.enabled
 * - effects.hologramIntensity → effects.threeDEffects.hologram.intensity
 * - effects.particleText → effects.threeDEffects.particleText.enabled
 * - effects.particleTextIntensity → effects.threeDEffects.particleText.intensity
 * - effects.rippleEffects → effects.threeDEffects.ripple.enabled
 * - effects.rippleIntensity → effects.threeDEffects.ripple.intensity
 * - effects.backgroundParticles → effects.threeDEffects.backgroundParticles.enabled
 * - effects.backgroundParticlesIntensity → effects.threeDEffects.backgroundParticles.intensity
 * - effects.depthEffects → effects.threeDEffects.depth.enabled
 * - effects.effectQuality → effects.threeDEffects.quality
 *
 * @module services/settings-manager/migration/strategies
 */

import type { MigrationStrategy } from './base-migration.strategy';
import type { UnifiedSettings } from '../../../settings-manager';

/**
 * 3D Effects Settings Migration Strategy
 *
 * Handles Phase 2.1 migration from flat 3D settings to hierarchical structure
 */
export class ThreeDMigrationStrategy implements MigrationStrategy {
  readonly name = 'Phase 2.1: 3D Settings Migration';

  /**
   * Checks if 3D settings need migration
   *
   * Detection Logic:
   * - Checks for deprecated flat fields (enable3DEffects, hologramMessages, etc.)
   * - Returns false if new threeDEffects structure already exists
   */
  canMigrate(settings: UnifiedSettings): boolean {
    const effects = settings.effects;

    // Check for old flat fields
    const hasOldFields =
      effects.enable3DEffects !== undefined ||
      effects.hologramMessages !== undefined ||
      effects.particleText !== undefined ||
      effects.rippleEffects !== undefined ||
      effects.backgroundParticles !== undefined ||
      effects.depthEffects !== undefined;

    // Already migrated if new structure exists and no old fields
    if (!hasOldFields && effects.threeDEffects) {
      return false;
    }

    return hasOldFields;
  }

  /**
   * Migrates 3D settings to new hierarchical structure
   *
   * Process:
   * 1. Create threeDEffects hierarchy
   * 2. Map old flat fields to new nested structure
   * 3. Preserve existing values or use defaults
   * 4. Delete deprecated fields
   */
  migrate(settings: UnifiedSettings): boolean {
    if (!this.canMigrate(settings)) {
      return false;
    }

    console.log(`🔄 [${this.name}] Migrating 3D settings to new structure...`);

    const effects = settings.effects;

    // Migrate to new hierarchical structure
    settings.effects.threeDEffects = {
      enabled: effects.enable3DEffects ?? settings.effects.threeDEffects.enabled,
      hologram: {
        enabled: effects.hologramMessages ?? settings.effects.threeDEffects.hologram.enabled,
        intensity: effects.hologramIntensity ?? settings.effects.threeDEffects.hologram.intensity,
      },
      particleText: {
        enabled: effects.particleText ?? settings.effects.threeDEffects.particleText.enabled,
        intensity: effects.particleTextIntensity ?? settings.effects.threeDEffects.particleText.intensity,
      },
      ripple: {
        enabled: effects.rippleEffects ?? settings.effects.threeDEffects.ripple.enabled,
        intensity: effects.rippleIntensity ?? settings.effects.threeDEffects.ripple.intensity,
      },
      backgroundParticles: {
        enabled: effects.backgroundParticles ?? settings.effects.threeDEffects.backgroundParticles.enabled,
        intensity: effects.backgroundParticlesIntensity ?? settings.effects.threeDEffects.backgroundParticles.intensity,
      },
      depth: {
        enabled: effects.depthEffects ?? settings.effects.threeDEffects.depth.enabled,
      },
      quality: effects.effectQuality || settings.effects.threeDEffects.quality,
    };

    // Delete deprecated fields
    this.cleanupDeprecatedFields(settings);

    console.log(`✅ [${this.name}] 3D settings migration complete`);
    return true;
  }

  /**
   * Removes deprecated flat 3D fields from settings object
   * @private
   */
  private cleanupDeprecatedFields(settings: UnifiedSettings): void {
    delete settings.effects.enable3DEffects;
    delete settings.effects.hologramMessages;
    delete settings.effects.particleText;
    delete settings.effects.rippleEffects;
    delete settings.effects.backgroundParticles;
    delete settings.effects.depthEffects;
    delete settings.effects.hologramIntensity;
    delete settings.effects.particleTextIntensity;
    delete settings.effects.rippleIntensity;
    delete settings.effects.backgroundParticlesIntensity;
  }
}

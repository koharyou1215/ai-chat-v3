/**
 * Settings Migrator (Refactored with Strategy Pattern)
 *
 * Orchestrates settings migration from legacy formats to UnifiedSettings structure
 *
 * Design Pattern: Strategy Pattern + Composite Pattern
 * - Each migration strategy encapsulates a specific migration algorithm
 * - Orchestrator composes strategies and executes them in sequence
 * - Easy to add new migration strategies without modifying orchestrator
 * - Follows Open/Closed Principle (open for extension, closed for modification)
 *
 * Migration Execution Order:
 * 1. Phase 2.1: 3D Settings (hierarchical structure)
 * 2. Phase 2.2: Emotion Settings (hierarchical structure)
 * 3. LocalStorage: Legacy effect-settings and API keys
 * 4. Zustand Persist: Full settings migration from old store
 *
 * Example: Adding a New Migration
 * ```typescript
 * // 1. Create strategy class implementing MigrationStrategy
 * export class NewFeatureMigrationStrategy implements MigrationStrategy {
 *   readonly name = 'New Feature Migration';
 *
 *   canMigrate(settings: UnifiedSettings): boolean {
 *     return settings.oldField !== undefined;
 *   }
 *
 *   migrate(settings: UnifiedSettings): boolean {
 *     settings.newField = settings.oldField;
 *     delete settings.oldField;
 *     return true;
 *   }
 * }
 *
 * // 2. Add to SettingsMigrator.strategies array
 * private readonly strategies: MigrationStrategy[] = [
 *   new ThreeDMigrationStrategy(),
 *   new EmotionMigrationStrategy(),
 *   new LocalStorageMigrationStrategy(),
 *   new ZustandMigrationStrategy(),
 *   new NewFeatureMigrationStrategy(), // Add here
 * ];
 * ```
 *
 * @module services/settings-manager/migration
 */

import type { UnifiedSettings } from '../../settings-manager';
import {
  ThreeDMigrationStrategy,
  EmotionMigrationStrategy,
  BackgroundMigrationStrategy,
  LocalStorageMigrationStrategy,
  ZustandMigrationStrategy,
  type MigrationStrategy,
} from './strategies';

/**
 * Settings Migration Orchestrator
 *
 * Manages execution of all migration strategies using the Strategy Pattern
 */
export class SettingsMigrator {
  /**
   * Registered migration strategies
   * Executed in array order (sequential execution)
   */
  private readonly strategies: MigrationStrategy[] = [
    new ThreeDMigrationStrategy(), // Phase 2.1
    new EmotionMigrationStrategy(), // Phase 2.2
    new BackgroundMigrationStrategy(), // Phase 3
    new LocalStorageMigrationStrategy(), // Legacy storage
    new ZustandMigrationStrategy(), // Zustand persist
  ];

  /**
   * Executes all registered migration strategies
   *
   * Process:
   * 1. Iterate through strategies in order
   * 2. Check if migration is needed (canMigrate)
   * 3. Execute migration if applicable
   * 4. Track if any migrations were executed
   *
   * @param settings - Settings object to migrate (mutated in-place)
   * @returns true if any migration was executed, false otherwise
   */
  public migrateAll(settings: UnifiedSettings): boolean {
    if (typeof window === 'undefined') return false;

    let hasChanges = false;

    // Execute each strategy sequentially
    for (const strategy of this.strategies) {
      if (strategy.canMigrate(settings)) {
        const migrated = strategy.migrate(settings);
        if (migrated) {
          hasChanges = true;
        }
      }
    }

    // Log completion if any migrations were executed
    if (hasChanges) {
      console.log('✅ [SettingsMigrator] Migration completed successfully');
    }

    return hasChanges;
  }

  /**
   * Backward compatibility: Static method wrapper
   *
   * Maintains existing API for consumers using static methods
   * @deprecated Use instance.migrateAll() instead
   */
  static migrateAll(settings: UnifiedSettings): boolean {
    const migrator = new SettingsMigrator();
    return migrator.migrateAll(settings);
  }
}

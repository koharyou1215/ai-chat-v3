/**
 * Base Migration Strategy Interface
 *
 * Defines the contract for all migration strategies using the Strategy Pattern.
 * Each migration strategy is responsible for detecting and migrating a specific
 * type of settings transformation.
 *
 * @module services/settings-manager/migration/strategies
 */

import type { UnifiedSettings } from '../../../settings-manager';

/**
 * Migration Strategy Interface
 *
 * Implements the Strategy Pattern for settings migration.
 * Each concrete strategy handles a specific migration concern.
 *
 * Design Pattern: Strategy Pattern
 * - Encapsulates migration algorithms as interchangeable strategies
 * - Enables Open/Closed Principle (easy to add new migrations)
 * - Separates migration logic from orchestration
 */
export interface MigrationStrategy {
  /**
   * Human-readable name for logging and debugging
   * @example "Phase 2.1: 3D Settings Migration"
   */
  readonly name: string;

  /**
   * Checks if migration is applicable to the given settings
   *
   * @param settings - Settings object to check
   * @returns true if migration is needed, false if already migrated
   */
  canMigrate(settings: UnifiedSettings): boolean;

  /**
   * Executes the migration on the settings object
   *
   * Side Effects:
   * - Mutates the settings object in-place
   * - May delete deprecated fields
   * - Logs migration progress to console
   *
   * @param settings - Settings object to migrate (mutated in-place)
   * @returns true if migration was executed, false if skipped
   */
  migrate(settings: UnifiedSettings): boolean;
}

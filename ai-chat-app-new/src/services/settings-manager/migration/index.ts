/**
 * Migration module entry point
 *
 * Exports:
 * - SettingsMigrator: Main orchestrator class
 * - All migration strategies for advanced usage
 *
 * @module services/settings-manager/migration
 */

export { SettingsMigrator } from './settings-migrator';
export type { MigrationStrategy } from './strategies';
export {
  EmotionMigrationStrategy,
  ThreeDMigrationStrategy,
  LocalStorageMigrationStrategy,
  ZustandMigrationStrategy,
} from './strategies';

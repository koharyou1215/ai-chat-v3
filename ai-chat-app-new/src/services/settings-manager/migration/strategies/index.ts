/**
 * Migration Strategies Barrel Export
 *
 * Exports all migration strategies for easy consumption
 *
 * @module services/settings-manager/migration/strategies
 */

export type { MigrationStrategy } from './base-migration.strategy';
export { EmotionMigrationStrategy } from './emotion-migration.strategy';
export { ThreeDMigrationStrategy } from './threed-migration.strategy';
export { LocalStorageMigrationStrategy } from './localstorage-migration.strategy';
export { ZustandMigrationStrategy } from './zustand-migration.strategy';

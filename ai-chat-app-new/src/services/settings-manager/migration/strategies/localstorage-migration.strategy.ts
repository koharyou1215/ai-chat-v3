/**
 * LocalStorage Migration Strategy
 *
 * Migrates legacy settings from localStorage to UnifiedSettings structure
 *
 * Migration Sources:
 * - effect-settings: Legacy effect configuration
 * - simple-api-manager-v2: API keys (OPENAI_API_KEY, ANTHROPIC_API_KEY, etc.)
 *
 * Post-Migration:
 * - Removes migrated keys from localStorage to prevent re-migration
 * - Logs migration progress for debugging
 *
 * @module services/settings-manager/migration/strategies
 */

import type { MigrationStrategy } from './base-migration.strategy';
import type { UnifiedSettings } from '../../../settings-manager';

/**
 * LocalStorage Legacy Settings Migration Strategy
 *
 * Migrates settings stored directly in localStorage to UnifiedSettings
 */
export class LocalStorageMigrationStrategy implements MigrationStrategy {
  readonly name = 'LocalStorage Legacy Migration';

  /**
   * LocalStorage keys to API setting keys mapping
   */
  private readonly API_KEY_MAPPING = {
    'OPENAI_API_KEY': 'openaiApiKey',
    'ANTHROPIC_API_KEY': 'anthropicApiKey',
    'GROQ_API_KEY': 'groqApiKey',
    'GEMINI_API_KEY': 'geminiApiKey',
    'OPENROUTER_API_KEY': 'openrouterApiKey',
  } as const;

  /**
   * Checks if localStorage migration is needed
   *
   * Detection Logic:
   * - Checks for existence of 'effect-settings' key
   * - Checks for any API key in localStorage
   * - Returns false in non-browser environment
   */
  canMigrate(settings: UnifiedSettings): boolean {
    if (typeof window === 'undefined') return false;

    // Check for effect settings
    const hasEffectSettings = localStorage.getItem('effect-settings') !== null;

    // Check for API keys
    const hasApiKeys = Object.keys(this.API_KEY_MAPPING).some(
      key => localStorage.getItem(key) !== null
    );

    return hasEffectSettings || hasApiKeys;
  }

  /**
   * Migrates settings from localStorage to UnifiedSettings
   *
   * Process:
   * 1. Migrate effect-settings JSON blob
   * 2. Migrate individual API keys
   * 3. Remove migrated keys from localStorage
   * 4. Log migration progress
   */
  migrate(settings: UnifiedSettings): boolean {
    if (typeof window === 'undefined') return false;

    let hasChanges = false;

    // Migrate effect settings
    hasChanges = this.migrateEffectSettings(settings) || hasChanges;

    // Migrate API keys
    hasChanges = this.migrateApiKeys(settings) || hasChanges;

    return hasChanges;
  }

  /**
   * Migrates effect-settings from localStorage
   * @private
   */
  private migrateEffectSettings(settings: UnifiedSettings): boolean {
    const effectSettings = localStorage.getItem('effect-settings');
    if (!effectSettings) return false;

    try {
      const parsed = JSON.parse(effectSettings);
      settings.effects = { ...settings.effects, ...parsed };
      localStorage.removeItem('effect-settings');
      console.log(`🔄 [${this.name}] Migrated effect-settings from localStorage`);
      return true;
    } catch (error) {
      console.error(`❌ [${this.name}] Failed to migrate effect settings:`, error);
      return false;
    }
  }

  /**
   * Migrates API keys from simple-api-manager-v2 format
   * @private
   */
  private migrateApiKeys(settings: UnifiedSettings): boolean {
    let hasChanges = false;

    Object.entries(this.API_KEY_MAPPING).forEach(([storageKey, settingKey]) => {
      const value = localStorage.getItem(storageKey);
      if (value) {
        (settings.api as any)[settingKey] = value;
        hasChanges = true;
        localStorage.removeItem(storageKey);
        console.log(`🔄 [${this.name}] Migrated ${storageKey} from localStorage`);
      }
    });

    return hasChanges;
  }
}

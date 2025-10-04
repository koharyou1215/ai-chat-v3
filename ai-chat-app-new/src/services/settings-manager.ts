/**
 * 統一設定管理サービス
 * すべての設定の単一の真実の源として機能
 *
 * Refactored in Phase 1: Type definitions, schema, defaults, and storage
 * are now in separate modules for better maintainability.
 */

import * as React from 'react';

// ═══════════════════════════════════════════════════
// Module Imports
// ═══════════════════════════════════════════════════

// Type definitions
import type { UnifiedSettings } from './settings-manager/types/unified-settings.types';

// Validation schema
import { settingsSchema } from './settings-manager/validation/settings.schema';

// Default settings
import { DEFAULT_SETTINGS } from './settings-manager/defaults/settings.defaults';

// Storage handler
import { SettingsStorage } from './settings-manager/storage/settings-storage';

// Migration handler
import { SettingsMigrator } from './settings-manager/migration/settings-migrator';

// ═══════════════════════════════════════════════════
// Re-export types and defaults for compatibility
// ═══════════════════════════════════════════════════

export type { UnifiedSettings };
export { settingsSchema, DEFAULT_SETTINGS };

// ═══════════════════════════════════════════════════
// Settings Manager Core Class
// ═══════════════════════════════════════════════════

class SettingsManager {
  private static instance: SettingsManager;
  private settings: UnifiedSettings;
  private listeners: Set<(settings: UnifiedSettings) => void> = new Set();
  private storage = new SettingsStorage();

  private constructor() {
    this.settings = this.storage.loadSettings(DEFAULT_SETTINGS);
    this.migrateOldSettings();

    // 🔧 CRITICAL FIX: 初期化時にlocalStorageへ保存（Phase 0対応）
    if (typeof window !== 'undefined' && !this.storage.hasStoredSettings()) {
      this.storage.saveSettings(this.settings);
      console.log('✅ [SettingsManager] Initialized unified-settings with defaults');
    }
  }

  static getInstance(): SettingsManager {
    if (!SettingsManager.instance) {
      SettingsManager.instance = new SettingsManager();
    }
    return SettingsManager.instance;
  }

  /**
   * 設定を取得
   */
  getSettings(): UnifiedSettings {
    return { ...this.settings };
  }

  /**
   * 部分的な設定を取得
   */
  getSetting<K extends keyof UnifiedSettings>(key: K): UnifiedSettings[K] {
    return { ...this.settings[key] };
  }

  /**
   * 設定を更新
   */
  updateSettings(updates: Partial<UnifiedSettings>): void {
    const newSettings = { ...this.settings, ...updates };

    // 🔧 FIX: 無効なbackgroundTypeを自動修正
    if (newSettings.ui?.backgroundType &&
        !['color', 'gradient', 'image', 'animated'].includes(newSettings.ui.backgroundType)) {
      console.warn(`Invalid background type '${newSettings.ui.backgroundType}', falling back to 'gradient'`);
      newSettings.ui.backgroundType = 'gradient';
    }

    // バリデーション
    try {
      settingsSchema.parse(newSettings);
    } catch (error) {
      console.error('Settings validation failed:', error);
      return;
    }

    this.settings = newSettings;
    this.storage.saveSettings(this.settings);
    this.notifyListeners();
  }

  /**
   * カテゴリ単位で設定を更新
   */
  updateCategory<K extends keyof UnifiedSettings>(
    category: K,
    updates: Partial<UnifiedSettings[K]>
  ): void {
    this.updateSettings({
      [category]: { ...this.settings[category], ...updates },
    } as Partial<UnifiedSettings>);

    // サイドエフェクト: API設定が更新された場合は関連サービスに通知
    if (category === 'api') {
      this.notifyAPIChange();
    }
  }

  /**
   * API設定変更時のサイドエフェクト処理
   */
  private notifyAPIChange(): void {
    // simpleAPIManagerV2への通知は settings.slice.ts で行う
    // ここでは設定の永続化のみを担当
    // Note: simpleAPIManagerV2への通知は、settings.sliceのupdateCategory経由で行われる
  }

  /**
   * 設定をリセット
   */
  resetSettings(category?: keyof UnifiedSettings): void {
    if (category) {
      this.updateSettings({
        [category]: DEFAULT_SETTINGS[category],
      } as Partial<UnifiedSettings>);
    } else {
      this.settings = { ...DEFAULT_SETTINGS };
      this.storage.saveSettings(this.settings);
      this.notifyListeners();
    }
  }

  /**
   * リスナーを登録
   */
  subscribe(listener: (settings: UnifiedSettings) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * リスナーに通知
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener({ ...this.settings }));
  }

  /**
   * 古い設定を移行
   * SettingsMigratorクラスに委譲
   */
  private migrateOldSettings(): void {
    if (typeof window === 'undefined') return;

    // SettingsMigratorにすべての移行処理を委譲
    const hasChanges = SettingsMigrator.migrateAll(this.settings);

    // 変更があれば保存
    if (hasChanges) {
      this.storage.saveSettings(this.settings);
      console.log('✅ [SettingsManager] Migration completed and saved');
    }
  }
}

// ═══════════════════════════════════════════════════
// Singleton Instance Export
// ═══════════════════════════════════════════════════

export const settingsManager = SettingsManager.getInstance();

// ═══════════════════════════════════════════════════
// React Hook
// ═══════════════════════════════════════════════════

export function useUnifiedSettings() {
  const [settings, setSettings] = React.useState<UnifiedSettings>(
    settingsManager.getSettings()
  );

  React.useEffect(() => {
    const unsubscribe = settingsManager.subscribe(setSettings);
    return unsubscribe;
  }, []);

  return {
    settings,
    updateSettings: (updates: Partial<UnifiedSettings>) =>
      settingsManager.updateSettings(updates),
    updateCategory: <K extends keyof UnifiedSettings>(
      category: K,
      updates: Partial<UnifiedSettings[K]>
    ) => settingsManager.updateCategory(category, updates),
    resetSettings: (category?: keyof UnifiedSettings) =>
      settingsManager.resetSettings(category),
  };
}

// ═══════════════════════════════════════════════════
// Default Export (Compatibility)
// ═══════════════════════════════════════════════════

export default settingsManager;

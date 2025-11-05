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

  /**
   * クライアントサイドでの明示的な初期化
   * 本番環境のSSR後のハイドレーション対策
   */
  public ensurePersistence(): void {
    if (typeof window === 'undefined') return;

    // 設定が存在しない場合は現在の設定を保存
    if (!this.storage.hasStoredSettings()) {
      this.storage.saveSettings(this.settings);
      console.log('🔧 [SettingsManager] Ensured persistence on client side');
    } else {
      // 設定が存在する場合は読み込み直す
      const storedSettings = this.storage.loadSettings(DEFAULT_SETTINGS);
      this.settings = storedSettings;
      this.notifyListeners();
      console.log('🔄 [SettingsManager] Reloaded settings from storage');
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
    console.log(`🔧 [SettingsManager.updateCategory] category="${category}"`, updates);
    console.log(`🔧 [SettingsManager.updateCategory] Current listeners count: ${this.listeners.size}`);

    // 🔧 FIX: ui.background のディープマージ対応
    let mergedCategory = { ...this.settings[category], ...updates };

    if (category === 'ui' && updates && typeof updates === 'object') {
      const uiUpdates = updates as Partial<UnifiedSettings['ui']>;
      const currentUI = this.settings.ui;

      // background のディープマージ
      if (uiUpdates.background) {
        const currentBackground = currentUI.background;
        const updatesBackground = uiUpdates.background;

        // 🔧 FIX: image と gradient を除外してスプレッド
        const { image: _image, gradient: _gradient, ...restUpdates } = updatesBackground;

        mergedCategory = {
          ...mergedCategory,
          background: {
            ...(currentBackground || {}),
            ...restUpdates,
            // image のディープマージ
            ...(updatesBackground.image && {
              image: {
                ...(currentBackground?.image || {}),
                ...updatesBackground.image,
              }
            }),
            // gradient のディープマージ
            ...(updatesBackground.gradient && {
              gradient: {
                ...(currentBackground?.gradient || {}),
                ...updatesBackground.gradient,
              }
            }),
          }
        } as UnifiedSettings[K];
      }
    }

    this.updateSettings({
      [category]: mergedCategory,
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
    console.log(`📢 [SettingsManager.notifyListeners] Notifying ${this.listeners.size} listeners`);
    this.listeners.forEach(listener => {
      console.log(`📢 [SettingsManager.notifyListeners] Calling listener with settings`);
      listener({ ...this.settings });
    });
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

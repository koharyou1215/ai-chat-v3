/**
 * 設定ストレージクラス
 * LocalStorageとの永続化を担当
 */

import type { UnifiedSettings } from '../../settings-manager';
import { settingsSchema } from '../../settings-manager';

export class SettingsStorage {
  private readonly storageKey = 'unified-settings';

  /**
   * 設定をlocalStorageから読み込む
   * @returns 読み込んだ設定、またはデフォルト設定
   */
  loadSettings(defaultSettings: UnifiedSettings): UnifiedSettings {
    if (typeof window === 'undefined') {
      return { ...defaultSettings };
    }

    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);

        // 🔧 FIX: 無効なbackgroundTypeを自動修正
        if (parsed.ui?.backgroundType &&
            !['color', 'gradient', 'image', 'animated'].includes(parsed.ui.backgroundType)) {
          console.warn(`[SettingsStorage] Invalid background type '${parsed.ui.backgroundType}' detected, falling back to 'gradient'`);
          parsed.ui.backgroundType = 'gradient';
        }

        const validated = settingsSchema.parse(parsed);
        return validated as UnifiedSettings;
      }
    } catch (error) {
      console.error('[SettingsStorage] Failed to load settings:', error);
    }

    return { ...defaultSettings };
  }

  /**
   * 設定をlocalStorageに保存
   * @param settings 保存する設定
   */
  saveSettings(settings: UnifiedSettings): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(this.storageKey, JSON.stringify(settings));
    } catch (error) {
      console.error('[SettingsStorage] Failed to save settings:', error);
    }
  }

  /**
   * 設定がlocalStorageに存在するか確認
   * @returns 設定が存在する場合true
   */
  hasStoredSettings(): boolean {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(this.storageKey) !== null;
  }

  /**
   * 設定をlocalStorageから削除
   */
  clearSettings(): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.removeItem(this.storageKey);
      console.log('[SettingsStorage] Settings cleared from localStorage');
    } catch (error) {
      console.error('[SettingsStorage] Failed to clear settings:', error);
    }
  }

  /**
   * ストレージキーを取得
   * @returns ストレージキー
   */
  getStorageKey(): string {
    return this.storageKey;
  }
}

// シングルトンインスタンスをエクスポート
export const settingsStorage = new SettingsStorage();

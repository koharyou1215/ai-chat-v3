/**
 * 統一設定管理サービス
 * すべての設定の単一の真実の源として機能
 */

import * as React from 'react';
import { z } from 'zod';

// 型定義
export interface UnifiedSettings {
  // API設定
  api: {
    provider: 'openrouter' | 'openai' | 'anthropic' | 'google' | 'groq' | 'gemini';
    openaiApiKey?: string;
    anthropicApiKey?: string;
    groqApiKey?: string;
    geminiApiKey?: string;
    openrouterApiKey?: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
  };

  // UI設定
  ui: {
    theme: 'light' | 'dark' | 'auto';
    language: 'ja' | 'en';
    fontSize: 'small' | 'medium' | 'large';
    background?: {
      type: 'color' | 'gradient' | 'image';
      value: string;
    };
  };

  // エフェクト設定
  effects: {
    // メッセージエフェクト
    colorfulBubbles: boolean;
    fontEffects: boolean;
    particleEffects: boolean;
    typewriterEffect: boolean;

    // エフェクト強度
    colorfulBubblesIntensity: number;
    fontEffectsIntensity: number;
    particleEffectsIntensity: number;
    typewriterIntensity: number;

    // 外観設定
    bubbleOpacity: number;
    bubbleBlur: boolean;

    // 3D機能
    hologramMessages: boolean;
    particleText: boolean;
    rippleEffects: boolean;
    backgroundParticles: boolean;

    // 3Dエフェクト強度
    hologramIntensity: number;
    particleTextIntensity: number;
    rippleIntensity: number;
    backgroundParticlesIntensity: number;

    // 感情分析
    realtimeEmotion: boolean;
    emotionBasedStyling: boolean;
    autoReactions: boolean;
    emotionStylingIntensity: number;

    // トラッカー
    autoTrackerUpdate: boolean;
    showTrackers: boolean;

    // パフォーマンス
    effectQuality: 'low' | 'medium' | 'high';
    animationSpeed: number;

    // テキスト整形
    textFormatting: 'readable' | 'compact' | 'expanded';
  };

  // チャット設定
  chat: {
    enterToSend: boolean;
    showTypingIndicator: boolean;
    messageGrouping: boolean;
    autoScroll: boolean;
    soundEnabled: boolean;
    notificationsEnabled: boolean;
  };

  // プライバシー設定
  privacy: {
    saveHistory: boolean;
    shareAnalytics: boolean;
    allowCookies: boolean;
  };
}

// バリデーションスキーマ
const settingsSchema = z.object({
  api: z.object({
    provider: z.enum(['openrouter', 'openai', 'anthropic', 'google', 'groq', 'gemini']),
    openaiApiKey: z.string().optional(),
    anthropicApiKey: z.string().optional(),
    groqApiKey: z.string().optional(),
    geminiApiKey: z.string().optional(),
    openrouterApiKey: z.string().optional(),
    model: z.string().optional(),
    temperature: z.number().min(0).max(2).optional(),
    maxTokens: z.number().positive().optional(),
  }),
  ui: z.object({
    theme: z.enum(['light', 'dark', 'auto']),
    language: z.enum(['ja', 'en']),
    fontSize: z.enum(['small', 'medium', 'large']),
    background: z.object({
      type: z.enum(['color', 'gradient', 'image']),
      value: z.string(),
    }).optional(),
  }),
  effects: z.object({
    colorfulBubbles: z.boolean(),
    fontEffects: z.boolean(),
    particleEffects: z.boolean(),
    typewriterEffect: z.boolean(),
    colorfulBubblesIntensity: z.number().min(0).max(100),
    fontEffectsIntensity: z.number().min(0).max(100),
    particleEffectsIntensity: z.number().min(0).max(100),
    typewriterIntensity: z.number().min(0).max(100),
    bubbleOpacity: z.number().min(0).max(100),
    bubbleBlur: z.boolean(),
    hologramMessages: z.boolean(),
    particleText: z.boolean(),
    rippleEffects: z.boolean(),
    backgroundParticles: z.boolean(),
    hologramIntensity: z.number().min(0).max(100),
    particleTextIntensity: z.number().min(0).max(100),
    rippleIntensity: z.number().min(0).max(100),
    backgroundParticlesIntensity: z.number().min(0).max(100),
    realtimeEmotion: z.boolean(),
    emotionBasedStyling: z.boolean(),
    autoReactions: z.boolean(),
    emotionStylingIntensity: z.number().min(0).max(100),
    autoTrackerUpdate: z.boolean(),
    showTrackers: z.boolean(),
    effectQuality: z.enum(['low', 'medium', 'high']),
    animationSpeed: z.number().min(0).max(2),
    textFormatting: z.enum(['readable', 'compact', 'expanded']),
  }),
  chat: z.object({
    enterToSend: z.boolean(),
    showTypingIndicator: z.boolean(),
    messageGrouping: z.boolean(),
    autoScroll: z.boolean(),
    soundEnabled: z.boolean(),
    notificationsEnabled: z.boolean(),
  }),
  privacy: z.object({
    saveHistory: z.boolean(),
    shareAnalytics: z.boolean(),
    allowCookies: z.boolean(),
  }),
});

// デフォルト設定
const DEFAULT_SETTINGS: UnifiedSettings = {
  api: {
    provider: 'openrouter',
    temperature: 0.7,
    maxTokens: 2048,
  },
  ui: {
    theme: 'dark',
    language: 'ja',
    fontSize: 'medium',
  },
  effects: {
    colorfulBubbles: true,
    fontEffects: true,
    particleEffects: false,
    typewriterEffect: true,
    colorfulBubblesIntensity: 50,
    fontEffectsIntensity: 50,
    particleEffectsIntensity: 30,
    typewriterIntensity: 70,
    bubbleOpacity: 85,
    bubbleBlur: true,
    hologramMessages: false,
    particleText: false,
    rippleEffects: false,
    backgroundParticles: false,
    hologramIntensity: 40,
    particleTextIntensity: 35,
    rippleIntensity: 60,
    backgroundParticlesIntensity: 25,
    realtimeEmotion: true,
    emotionBasedStyling: false,
    autoReactions: false,
    emotionStylingIntensity: 45,
    autoTrackerUpdate: true,
    showTrackers: true,
    effectQuality: 'medium',
    animationSpeed: 0.5,
    textFormatting: 'readable',
  },
  chat: {
    enterToSend: true,
    showTypingIndicator: true,
    messageGrouping: true,
    autoScroll: true,
    soundEnabled: false,
    notificationsEnabled: false,
  },
  privacy: {
    saveHistory: true,
    shareAnalytics: false,
    allowCookies: true,
  },
};

class SettingsManager {
  private static instance: SettingsManager;
  private settings: UnifiedSettings;
  private listeners: Set<(settings: UnifiedSettings) => void> = new Set();
  private storageKey = 'unified-settings';

  private constructor() {
    this.settings = this.loadSettings();
    this.migrateOldSettings();
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

    // バリデーション
    try {
      settingsSchema.parse(newSettings);
    } catch (error) {
      console.error('Settings validation failed:', error);
      return;
    }

    this.settings = newSettings;
    this.saveSettings();
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
      this.saveSettings();
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
   * 設定を読み込む
   */
  private loadSettings(): UnifiedSettings {
    if (typeof window === 'undefined') {
      return { ...DEFAULT_SETTINGS };
    }

    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        const validated = settingsSchema.parse(parsed);
        return validated as UnifiedSettings;
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }

    return { ...DEFAULT_SETTINGS };
  }

  /**
   * 設定を保存
   */
  private saveSettings(): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.settings));
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  }

  /**
   * リスナーに通知
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener({ ...this.settings }));
  }

  /**
   * 古い設定を移行
   */
  private migrateOldSettings(): void {
    if (typeof window === 'undefined') return;

    let hasChanges = false;

    // エフェクト設定の移行
    const effectSettings = localStorage.getItem('effect-settings');
    if (effectSettings) {
      try {
        const parsed = JSON.parse(effectSettings);
        this.settings.effects = { ...this.settings.effects, ...parsed };
        hasChanges = true;
        localStorage.removeItem('effect-settings');
      } catch (error) {
        console.error('Failed to migrate effect settings:', error);
      }
    }

    // simple-api-manager-v2から移行
    const apiKeys = {
      'OPENAI_API_KEY': 'openaiApiKey',
      'ANTHROPIC_API_KEY': 'anthropicApiKey',
      'GROQ_API_KEY': 'groqApiKey',
      'GEMINI_API_KEY': 'geminiApiKey',
      'OPENROUTER_API_KEY': 'openrouterApiKey',
    };

    Object.entries(apiKeys).forEach(([storageKey, settingKey]) => {
      const value = localStorage.getItem(storageKey);
      if (value) {
        (this.settings.api as any)[settingKey] = value;
        hasChanges = true;
        localStorage.removeItem(storageKey);
      }
    });

    // 変更があれば保存
    if (hasChanges) {
      this.saveSettings();
      console.log('✅ Migrated old settings to unified settings');
    }
  }
}

// シングルトンインスタンスをエクスポート
export const settingsManager = SettingsManager.getInstance();

// React Hook
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

// For compatibility with existing code
export default settingsManager;